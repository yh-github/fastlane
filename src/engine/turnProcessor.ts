/**
 * turnProcessor.ts — Orchestrates the turn-start event sequence.
 */
import { type GameState, type GameEvent, recalculatePlayerEffects } from './gameState';
import { type CampaignBundle } from './dataLoader';
import { calcEconomyPrice, applyMarketCrash, applyEconomicBoom, calcLiquidAssets } from './economyEngine';
import { calcDependabilityDecay, calcWealthProgress, calcEducationProgress, calcCareerProgress } from './statMath';
import { resetPlayerClock } from './timeManager';
import { processStarvation, processDoctorVisit, processApartmentRobbery, processDonations } from './eventEngine';
import { fluctuateEconomy } from './economyEngine';
import { processWeekend } from './weekendEngine';
import { Random } from '../utils/rng';
import { resolveDecision, type ReplayContext } from './replayTypes';

export function processTurnStart(state: GameState, campaign: CampaignBundle, replay?: ReplayContext): GameState {
  const rng = new Random(state.rngState);

  // 1. Economic Changes
  let newEconomy = fluctuateEconomy(state.economicIndex, rng, replay);

  // 16. Market Crash & Economic Boom Roll (Determined here, applied later)
  let crashSeverity: 'none' | 'minor' | 'moderate' | 'major' = 'none';
  let economicBoom = false;
  let currentHeadline: GameEvent | null = null;
  
  if (state.turn >= 8) {
    if (newEconomy > -30) {
      const crashDivisor = campaign.config.eventRules?.marketCrashDivisor ?? 30;
      const crashChance = 1 / (1 + (crashDivisor * state.players.length));
      
      const crashTriggered = resolveDecision(replay, `market_crash_trigger`, () => rng.next() < crashChance);
      if (crashTriggered) {
        const roll = resolveDecision(replay, `market_crash_roll`, () => rng.next());
        if (roll < 0.333) {
          crashSeverity = 'minor';
          newEconomy = Math.max(-30, newEconomy - 3);
          currentHeadline = { key: 'newspaper.crash_minor' };
        } else if (roll < 0.666) {
          crashSeverity = 'moderate';
          newEconomy = Math.max(-30, newEconomy - 6);
          currentHeadline = { key: 'newspaper.crash_moderate' };
        } else {
          crashSeverity = 'major';
          newEconomy = Math.max(-30, newEconomy - 12);
          currentHeadline = { key: 'newspaper.crash_major' };
        }
      }
    }

    if (crashSeverity === 'none' && newEconomy >= 0) {
      const boomChance = 1 / (1 + (30 * state.players.length));
      const boomTriggered = resolveDecision(replay, `market_boom_trigger`, () => rng.next() < boomChance);
      if (boomTriggered) {
        economicBoom = true;
        newEconomy = Math.min(90, newEconomy + 6);
        currentHeadline = { key: 'newspaper.boom' };
      }
    }
  }

  const previousPlayerWeekends: string[] = [];

  // Process each player
  let newPawnShopItemsForSale = [...(state.pawnShopItemsForSale || [])];

  const updatedPlayers = state.players.map(player => {
    let p = resetPlayerClock(structuredClone(player), campaign.config.timeRules.hoursPerTurn);
    p = recalculatePlayerEffects(p, campaign); 

    p.turnFlags = {
      hasEaten: false,
      hasWorked: false,
      drinkHappinessGranted: false,
      fastFoodHappinessGranted: false,
      freshFoodHappinessGranted: false,
      caffeineDebt: p.turnFlags?.caffeineDebt || 0,
      askedForExtension: false,
      rentPaidThisTurn: false,
      freeNewspaper: false,
      hasSeenEvents: state.turn === 0,
      hasSeenWeekend: state.turn === 0,
      loanDefaultWarning: false,
      loanPayableWarning: false
    };
    p.turnEvents = [];
    p.newspaperHeadline = null;

    if (state.turn > 0) {
      // 2. Cooking Bonus
      const hasStoveOrMicrowave = p.inventory.appliances.some(a => a.id === 'stove' || a.id === 'microwave');
      if (hasStoveOrMicrowave) {
        p.happiness = Math.min(100, p.happiness + 1);
      }

      // 3. Winner Check
      const wealth = calcWealthProgress(calcLiquidAssets(p, campaign, state.economicIndex, state.turn));
      const education = calcEducationProgress(p.degrees.length);
      const career = calcCareerProgress(p.dependability, p.currentJobId !== null);

      if (
        wealth >= p.goalAllotment.wealth &&
        p.happiness >= p.goalAllotment.happiness &&
        education >= p.goalAllotment.education &&
        career >= p.goalAllotment.career
      ) {
        p.hasWon = true;
      }

      // 4. Weekend
      const weekendResult = processWeekend(p, state.turn, previousPlayerWeekends, campaign.weekends, rng);
      p = weekendResult;
      if (p.weekendResult) {
        previousPlayerWeekends.push(p.weekendResult.event.key);
      }

      // 5. Lottery
      if (p.inventory.lotteryTickets > 0) {
        const r = resolveDecision(replay, `lottery_roll_${p.id}`, () => Math.floor(rng.next() * 501));
        const t = p.inventory.lotteryTickets;
        if (r < t) {
          if (r <= t / 20) { p.money += 5000; p.happiness = Math.min(100, p.happiness + 10); p.turnEvents.push({ key: 'events.lottery', params: { amount: 5000 } }); }
          else if (r <= t / 5) { p.money += 500; p.happiness = Math.min(100, p.happiness + 5); p.turnEvents.push({ key: 'events.lottery', params: { amount: 500 } }); }
          else { p.money += 200; p.happiness = Math.min(100, p.happiness + 5); p.turnEvents.push({ key: 'events.lottery', params: { amount: 200 } }); }
        }
        p.inventory.lotteryTickets = 0;
      }

      // 6. Computer Profits
      const computerIncomeChance = p.activeEffects['computer_income_chance'] || 0;
      if (computerIncomeChance > 0) {
        const compProfitTrigger = resolveDecision(replay, `computer_profit_trigger_${p.id}`, () => rng.next() < (1/7));
        if (compProfitTrigger) {
          const profit = resolveDecision(replay, `computer_profit_amount_${p.id}`, () => Math.floor(rng.next() * 81) + 20);
          p.money += profit; 
          p.happiness = Math.min(100, p.happiness + 3);
          p.turnEvents.push({ key: 'events.computerProfit', params: { profit } });
        }
      }

      // 7. Degrade Relaxation (and Dependability decay)
      const preventRelaxationDecay = p.activeEffects['prevent_relaxation_decay'] || 0;
      if (!preventRelaxationDecay) {
        const decay = campaign.config.statRules?.relaxationDecayRate ?? 1;
        const threshold = state.rules.relaxationDoctorThreshold ?? 10;
        p.relaxation = Math.max(threshold, p.relaxation - decay);
      }
      p.dependability = calcDependabilityDecay(p.dependability); 

      // 8. Apartment Robbery
      const robberyResult = processApartmentRobbery(p, rng, state.rules.protectBuiltInAppliances, replay);
      p = robberyResult.updated;

      // 9. Spoiled Food
      const maxStorage = p.activeEffects['set_food_storage'] || 0;
      let doctorNeeded = false;
      let doctorReasons: string[] = [];
      if (maxStorage === 0 && p.inventory.freshFoodUnits > 0) {
        const allowSpoiled = state.rules.allowEatingSpoiledFood ?? true;
        if (!allowSpoiled) {
          const lostFood = p.inventory.freshFoodUnits;
          p.inventory.freshFoodUnits = 0;
          p.happiness = Math.max(10, p.happiness - 2);
          p.turnEvents.push({ key: 'events.foodSpoiled.noFridge', params: { amount: lostFood } });
          if (p.money > 0) {
            const sickTrigger = resolveDecision(replay, `spoiled_food_sick_1_${p.id}`, () => rng.next() < 0.5);
            if (sickTrigger) {
              doctorNeeded = true;
              doctorReasons.push('Spoiled food');
              p.turnEvents.push({ key: 'events.foodSpoiled.sick' });
            }
          }
        } else {
          p.happiness = Math.max(10, p.happiness - 2);
          p.turnEvents.push({ key: 'events.foodSpoiled.ateSpoiled' });
          if (p.money > 0) {
            const sickTrigger = resolveDecision(replay, `spoiled_food_sick_2_${p.id}`, () => rng.next() < 0.5);
            if (sickTrigger) {
              doctorNeeded = true;
              doctorReasons.push('Spoiled food');
              p.turnEvents.push({ key: 'events.foodSpoiled.sick' });
            }
          }
        }
      } else if (maxStorage > 0) {
        if (p.inventory.freshFoodUnits > maxStorage) {
          p.turnEvents.push({ key: 'events.foodSpoiled.tooMuch' });
          p.inventory.freshFoodUnits = maxStorage;
          p.happiness = Math.max(10, p.happiness - 1);
        }
      }

      // 10. Starvation
      let hasEatenFastFood = p.inventory.fastFoodItems.length > 0;
      p.inventory.fastFoodItems = [];

      if (hasEatenFastFood) {
        p.turnFlags.hasEaten = true;
      } else if (p.inventory.freshFoodUnits > 0) {
        p.inventory.freshFoodUnits--;
        p.turnFlags.hasEaten = true;
      } else {
        const { updated, doctorTriggered } = processStarvation(p, campaign.config.timeRules.starvationPenalty, rng, replay);
        p = updated;
        p.turnEvents.push({ key: 'events.starvation' });
        if (doctorTriggered) {
          doctorNeeded = true;
          doctorReasons.push('Starvation');
        }
      }

      // 11. Doctor Visit
      if (state.rules.enableRelaxationDoctor) {
        const threshold = state.rules.relaxationDoctorThreshold ?? 10;
        const chance = campaign.config.statRules?.relaxationDoctorChance ?? 0.20;
        if (p.relaxation <= threshold) {
          const lowRelaxSickTrigger = resolveDecision(replay, `low_relax_sick_${p.id}`, () => rng.next() < chance);
          if (lowRelaxSickTrigger) {
            doctorNeeded = true;
            doctorReasons.push('Relaxation critically low');
          }
        }
      }

      if (doctorNeeded) {
        const moneyBefore = p.money;
        p = processDoctorVisit(p, campaign.config.timeRules.doctorPenalty, rng, state.rules.bypassDoctorIfBroke, replay);
        if (moneyBefore > p.money || !state.rules.bypassDoctorIfBroke) {
          const evtParams: any = { cost: moneyBefore - p.money };
          let key = 'events.doctorVisit';
          if (state.rules.helpfulUI && doctorReasons.length > 0) {
            evtParams.reasons = doctorReasons.join(', ');
            key = 'events.doctorVisit_reasons';
          }
          p.turnEvents.push({ key, params: evtParams });
        }
      }

      // 12. Rent Notice
      if (p.rentPaidUntilWeek <= state.turn) {
        if (p.rentExtensionActive) {
          p.rentExtensionActive = false;
          p.turnEvents.push({ key: 'events.rent.extensionExpired' });
        } else {
          p.rentExtensionsDeniedPermanently = true; 
          const baseRent = p.currentHousingId === 'security' ? 475 : 325;
          const debtAmount = state.rules.fluctuatingRent ? calcEconomyPrice(baseRent, state.economicIndex) : p.currentRentPrice;
          p.rentDebt += debtAmount;
          p.rentPaidUntilWeek = state.turn + 4; 
          p.turnEvents.push({ key: 'events.rent.charged', params: { amount: debtAmount } });

          // Strict eviction: warning if debt > 1 month rent, eviction to low_cost if debt > 2 months rent
          if (state.rules.strictEviction) {
            const monthRent = debtAmount;
            if (p.rentDebt > 2 * monthRent) {
              if (p.currentHousingId !== 'low_cost') {
                p.currentHousingId = 'low_cost';
                p.currentRentPrice = 325;
                p.turnEvents.push({ key: 'events.rent.evicted' });
              }
            } else if (p.rentDebt > monthRent) {
              p.turnEvents.push({ key: 'events.rent.warning' });
            }
          }
        }
      } else if (p.rentPaidUntilWeek <= state.turn + 1) { 
        if (p.rentExtensionsDeniedPermanently) {
          p.turnEvents.push({ key: 'events.rent.due_nodenied' });
        } else {
          p.turnEvents.push({ key: 'events.rent.due' });
        }
      }

      // 13. Buy New Clothes
      if (state.rules.clothingDecaysAll) {
        if (p.inventory.casualClothesWeeks > 0) {
          p.inventory.casualClothesWeeks--;
          if (p.inventory.casualClothesWeeks === 1) p.turnEvents.push({ key: 'events.clothes.casual' });
        }
        if (p.inventory.dressClothesWeeks > 0) {
          p.inventory.dressClothesWeeks--;
          if (p.inventory.dressClothesWeeks === 1) p.turnEvents.push({ key: 'events.clothes.dress' });
        }
        if (p.inventory.businessClothesWeeks > 0) {
          p.inventory.businessClothesWeeks--;
          if (p.inventory.businessClothesWeeks === 1) p.turnEvents.push({ key: 'events.clothes.business' });
        }
      } else {
        if (p.inventory.selectedClothes === 'casual' && p.inventory.casualClothesWeeks > 0) {
          p.inventory.casualClothesWeeks--;
          if (p.inventory.casualClothesWeeks === 1) p.turnEvents.push({ key: 'events.clothes.casual' });
        } else if (p.inventory.selectedClothes === 'dress' && p.inventory.dressClothesWeeks > 0) {
          p.inventory.dressClothesWeeks--;
          if (p.inventory.dressClothesWeeks === 1) p.turnEvents.push({ key: 'events.clothes.dress' });
        } else if (p.inventory.selectedClothes === 'business' && p.inventory.businessClothesWeeks > 0) {
          p.inventory.businessClothesWeeks--;
          if (p.inventory.businessClothesWeeks === 1) p.turnEvents.push({ key: 'events.clothes.business' });
        }
      }

      const hasCasual = p.inventory.casualClothesWeeks > 0;
      const hasDress = p.inventory.dressClothesWeeks > 0;
      const hasBusiness = p.inventory.businessClothesWeeks > 0;
      let activeClothes: 'casual' | 'dress' | 'business' | 'none' = (p.inventory.selectedClothes as any) || 'none';

      if (state.rules.autoEquipBestClothes) {
        if (hasBusiness) activeClothes = 'business';
        else if (hasDress) activeClothes = 'dress';
        else if (hasCasual) activeClothes = 'casual';
        else activeClothes = 'none';
      } else {
        if (activeClothes === 'business' && !hasBusiness) activeClothes = hasDress ? 'dress' : (hasCasual ? 'casual' : 'none');
        if (activeClothes === 'dress' && !hasDress) activeClothes = hasBusiness ? 'business' : (hasCasual ? 'casual' : 'none');
        if (activeClothes === 'casual' && !hasCasual) activeClothes = hasDress ? 'dress' : (hasBusiness ? 'business' : 'none');
      }
      p.inventory.selectedClothes = activeClothes as any;

      if (activeClothes === 'none') {
        p.nakedTurns++;
      } else {
        p.nakedTurns = 0;
      }

      // 14. Loan Payments
      if (p.loanDebt > 0) {
        if (state.turn % 4 === 1) { 
          if (p.loanPaymentDeadline < state.turn) {
            p.timesDefaulted += 1;
            p.turnFlags.loanDefaultWarning = true;
            p.happiness = Math.max(10, p.happiness - 1);
          }
        } else if (state.turn % 4 === 0) { 
          if (p.loanPaymentDeadline <= state.turn) {
            p.turnFlags.loanPayableWarning = true;
            p.turnEvents.push({ key: 'events.loan.due' });
          }
        }
      }

      // 15. Appliance Repair
      for (const app of p.inventory.appliances) {
        const breakChance = app.purchaseSource === 'socket_city' ? 1/51 : 1/36;
        const breakTrigger = resolveDecision(replay, `appliance_break_${p.id}_${app.id}`, () => rng.next() < breakChance);
        if (breakTrigger) {
          const repairCost = resolveDecision(replay, `appliance_repair_${p.id}_${app.id}`, () => Math.floor(app.purchasePrice * (0.05 + rng.next() * 0.2)));
          p.money = Math.max(0, p.money - repairCost);
          p.happiness = Math.max(10, p.happiness - 1);
          p.turnEvents.push({ key: 'events.applianceBroke', params: { appliance: app.id, repairCost } });
        }
      }

      // 16. Economic Events
      if (crashSeverity !== 'none') {
        p = applyMarketCrash(p, crashSeverity, rng, replay);
      } else if (economicBoom) {
        p = applyEconomicBoom(p, campaign, newEconomy, state.turn);
      }

      if (currentHeadline) {
        p.newspaperHeadline = currentHeadline;
        p.turnFlags.freeNewspaper = true;
      }

      // 17. Donations
      p = processDonations(p, state, campaign, rng, replay);

      // Pawn Shop Expiration
      if (p.inventory.pawnedItems && p.inventory.pawnedItems.length > 0) {
        const newTurn = state.turn + 1;
        const expired = p.inventory.pawnedItems.filter(item => newTurn - item.weekPawned >= 3);
        if (expired.length > 0) {
          p.turnEvents.push({ key: 'events.pawnExpired' });
          newPawnShopItemsForSale.push(...expired);
          p.inventory.pawnedItems = p.inventory.pawnedItems.filter(item => newTurn - item.weekPawned < 3);
        }
      }
    }

    // 18. Player Control (Set Newspaper if none)
    if (!p.newspaperHeadline) {
      const randomHeadlines = [
        "newspaper.random.1",
        "newspaper.random.2",
        "newspaper.random.3",
        "newspaper.random.4"
      ];
      const headlineIdx = resolveDecision(replay, `newspaper_headline_${p.id}`, () => Math.floor(rng.next() * randomHeadlines.length));
      p.newspaperHeadline = { key: randomHeadlines[headlineIdx] };
    }

    p.position = p.currentHousingId === 'security' ? 'node_security' : 'node_low_cost';

    return p;
  });

  // Check Game Over
  let phase = state.phase;
  let winnerId = state.winnerId;

  const winner = updatedPlayers.find(p => p.hasWon);
  if (winner) {
    phase = 'game-over';
    winnerId = winner.id;
  }

  return {
    ...state,
    economicIndex: newEconomy,
    pawnShopItemsForSale: newPawnShopItemsForSale,
    players: updatedPlayers,
    turn: state.turn + 1,
    phase,
    winnerId,
  };
}
