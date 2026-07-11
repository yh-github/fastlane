/**
 * turnProcessor.ts — Orchestrates the turn-start event sequence.
 *
 * This file ties together time, events, economy, and stats to
 * process everything that happens when a new week begins.
 *
 * Sequence order is critical:
 * 1. Clothing decay
 * 2. Food consumption & starvation check
 * 3. Food spoilage
 * 4. Dependability decay
 * 5. Appliance breakage
 * 6. Happiness bonuses (Stove, Microwave)
 * 7. Computer income
 * 8. Lottery
 * 9. Event Tickets
 * 10. Rent Check
 * 11. Market Crash (chance)
 * 12. Apartment Robbery
 */

import { type GameState, recalculatePlayerEffects } from './gameState';
import { type CampaignBundle } from './dataLoader';
import { calcEconomyPrice } from './economyEngine';
import { calcDependabilityDecay, calcWealthProgress, calcEducationProgress, calcCareerProgress } from './statMath';
import { resetPlayerClock } from './timeManager';
import { processStarvation, processDoctorVisit, processApartmentRobbery } from './eventEngine';
import { fluctuateEconomy, applyMarketCrash, applyEconomicBoom } from './economyEngine';
import { processWeekend } from './weekendEngine';

export function processTurnStart(state: GameState, campaign: CampaignBundle): GameState {
  // 1. Fluctuate the economy for the new turn
  const newEconomy = fluctuateEconomy(state.economicIndex);

  // 2. Market Crash & Economic Boom Roll (Only Week 8 onwards)
  let crashSeverity: 'none' | 'minor' | 'moderate' | 'major' = 'none';
  let economicBoom = false;
  
  if (state.turn >= 8) {
    // Check for Market Crash
    if (newEconomy > -30) {
      const crashChance = state.variant === 'cdrom' 
        ? 1 / (1 + (30 * state.players.length)) 
        : 1 / (1 + (20 * state.players.length));
      
      if (Math.random() < crashChance) {
        const roll = Math.random();
        if (roll < 0.333) {
          crashSeverity = 'minor';
          newEconomy = Math.max(-30, newEconomy - 3);
        } else if (roll < 0.666) {
          crashSeverity = 'moderate';
          newEconomy = Math.max(-30, newEconomy - 6);
        } else {
          crashSeverity = 'major';
          newEconomy = Math.max(-30, newEconomy - 12);
        }
      }
    }

    // Check for Economic Boom
    if (crashSeverity === 'none' && newEconomy >= 0) {
      const boomChance = 1 / (1 + (30 * state.players.length));
      if (Math.random() < boomChance) {
        economicBoom = true;
        newEconomy = Math.min(90, newEconomy + 6);
      }
    }
  }

  const previousPlayerWeekends: string[] = [];

  // Process each player
  const updatedPlayers = state.players.map(player => {
    let p = resetPlayerClock(structuredClone(player), campaign.config.timeRules.hoursPerTurn); // Resets hours to 60, applies caffeine debt
    p = recalculatePlayerEffects(p, campaign); // Sync effects with current inventory

    let doctorNeeded = false;

    // Check for Relaxation-triggered doctor visit
    if (state.rules.enableRelaxationDoctor) {
      const threshold = campaign.config.statRules?.relaxationDoctorThreshold ?? 10;
      const chance = campaign.config.statRules?.relaxationDoctorChance ?? 0.20;
      if (p.relaxation <= threshold && Math.random() < chance) {
        doctorNeeded = true;
      }
    }

    p.turnFlags = {
      hasEaten: false,
      hasWorked: false,
      drinkHappinessGranted: false,
      fastFoodHappinessGranted: false,
      freshFoodHappinessGranted: false,
      caffeineDebt: p.turnFlags?.caffeineDebt || 0,
      askedForExtension: false,
      rentPaidThisTurn: false,
      freeNewspaper: false
    };
    p.turnEvents = [];

    if (state.turn > 0) {
      // 1. Clothing Decay (either all or just the selected one)
      if (state.rules.clothingDecaysAll) {
        if (p.inventory.casualClothesWeeks > 0) {
          if (p.inventory.casualClothesWeeks === 1) p.turnEvents.push("Your casual clothes are worn out!");
          p.inventory.casualClothesWeeks--;
        }
        if (p.inventory.dressClothesWeeks > 0) {
          if (p.inventory.dressClothesWeeks === 1) p.turnEvents.push("Your dress clothes are worn out!");
          p.inventory.dressClothesWeeks--;
        }
        if (p.inventory.businessClothesWeeks > 0) {
          if (p.inventory.businessClothesWeeks === 1) p.turnEvents.push("Your business suit is worn out!");
          p.inventory.businessClothesWeeks--;
        }
      } else {
        if (p.inventory.selectedClothes === 'casual') {
          if (p.inventory.casualClothesWeeks === 1) p.turnEvents.push("Your casual clothes are worn out!");
          if (p.inventory.casualClothesWeeks > 0) p.inventory.casualClothesWeeks--;
        } else if (p.inventory.selectedClothes === 'dress') {
          if (p.inventory.dressClothesWeeks === 1) p.turnEvents.push("Your dress clothes are worn out!");
          if (p.inventory.dressClothesWeeks > 0) p.inventory.dressClothesWeeks--;
        } else if (p.inventory.selectedClothes === 'business') {
          if (p.inventory.businessClothesWeeks === 1) p.turnEvents.push("Your business suit is worn out!");
          if (p.inventory.businessClothesWeeks > 0) p.inventory.businessClothesWeeks--;
        }
      }

      // Auto-fallback clothes if worn out, or auto-equip best if rule is on
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

      // 2. Food Consumption & Starvation
      let hasEatenFastFood = p.inventory.fastFoodItems.length > 0;
      
      // Fast food is consumed immediately.
      p.inventory.fastFoodItems = [];

      if (hasEatenFastFood) {
        p.turnFlags.hasEaten = true;
        // Note: Fast food doesn't stop fresh food from spoiling or being consumed wastefully
        if (p.inventory.freshFoodUnits > 0) {
          p.inventory.freshFoodUnits--;
        }
      } else if (p.inventory.freshFoodUnits > 0) {
        p.inventory.freshFoodUnits--;
        p.turnFlags.hasEaten = true;
      } else {
        // Starvation
        const { updated, doctorTriggered } = processStarvation(p, campaign.config.timeRules.starvationPenalty);
        p = updated;
        p.turnEvents.push("You didn't eat enough! You are starving.");
        if (doctorTriggered) {
          doctorNeeded = true;
        }
      }

      // 3. Food Spoilage
      const maxStorage = p.activeEffects['set_food_storage'] || 0;
      
      if (maxStorage === 0 && p.inventory.freshFoodUnits > 0) {
        const lostFood = p.inventory.freshFoodUnits;
        p.inventory.freshFoodUnits = 0;
        p.happiness = Math.max(10, p.happiness - 2);
        p.turnEvents.push(`Without a fridge, ${lostFood} units of your food spoiled!`);
        if (p.money > 0 && Math.random() < 0.5) {
          doctorNeeded = true;
          p.turnEvents.push("Eating bad food made you sick!");
        }
      } else if (maxStorage > 0) {
        if (p.inventory.freshFoodUnits > maxStorage) {
          p.turnEvents.push("You had too much food for your fridge, some of it spoiled!");
          p.inventory.freshFoodUnits = maxStorage;
          p.happiness = Math.max(10, p.happiness - 1);
        }
      }

      // 4. Dependability Decay
      p.dependability = calcDependabilityDecay(p.dependability);

      // 5. Appliance Breakage (simplified - 1/36 chance per appliance)
      for (const app of p.inventory.appliances) {
        const breakChance = app.purchaseSource === 'socket_city' ? 1/51 : 1/36;
        if (Math.random() < breakChance) {
          const repairCost = Math.floor(app.purchasePrice * (0.05 + Math.random() * 0.2));
          p.money = Math.max(0, p.money - repairCost);
          p.happiness = Math.max(10, p.happiness - 1);
          p.turnEvents.push(`Your ${app.id.replaceAll('_', ' ')} broke! Repair cost: $${repairCost}`);
        }
      }

      // 6. Appliance Happiness Bonuses
      const addHappiness = p.activeEffects['add_turn_happiness'] || 0;
      if (addHappiness > 0) {
        p.happiness = Math.min(100, p.happiness + addHappiness);
      }

      // 7. Computer Income
      const computerIncomeChance = p.activeEffects['computer_income_chance'] || 0;
      if (computerIncomeChance > 0) {
        if (Math.random() < (1/7)) {
          p.money += Math.floor(Math.random() * 81) + 20; // $20-$100
          p.happiness = Math.min(100, p.happiness + 3);
        }
      }

      // 8. Lottery
      if (p.inventory.lotteryTickets > 0) {
        const r = Math.floor(Math.random() * 501);
        const t = p.inventory.lotteryTickets;
        if (r < t) {
          if (r <= t / 20) { p.money += 5000; p.happiness = Math.min(100, p.happiness + 10); }
          else if (r <= t / 5) { p.money += 500; p.happiness = Math.min(100, p.happiness + 5); }
          else { p.money += 200; p.happiness = Math.min(100, p.happiness + 5); }
        }
        p.inventory.lotteryTickets = 0;
      }

      // 9. Event Tickets (Handled by weekendEngine to prevent double consumption)
      // Removed ticket consumption here.

      // 10. Loan Checks
      if (p.loanDebt > 0) {
        if (state.turn % 4 === 1) { // Week 1 of month
          if (p.loanPaymentDeadline < state.turn) {
            // Missed payment
            p.timesDefaulted += 1;
            if (p.loanPaymentDeadline < state.turn - 4) {
              p.happiness = Math.max(10, p.happiness - 1);
              p.turnFlags.loanDefaultWarning = true;
            } else {
              p.turnFlags.loanDefaultWarning = true;
            }
          }
        } else if (state.turn % 4 === 0) { // Week 4 of month
          if (p.loanPaymentDeadline <= state.turn) {
            p.turnFlags.loanPayableWarning = true;
          }
        }
      }

      // 11. Rent Check
      if (p.rentPaidUntilWeek <= state.turn) {
        if (p.rentExtensionActive) {
          // They asked for an extension this turn and were approved. The extension expires now.
          p.rentExtensionActive = false;
          p.turnEvents.push("Your rent extension expired. You must pay rent or get another extension this week!");
        } else {
          // They owe rent, and did not get an extension. They enter rent debt immediately.
          p.rentExtensionsDeniedPermanently = true; // Permanently denied future extensions

          if (p.currentHousingId === 'security' && state.rules.strictEviction) {
            p.currentHousingId = 'low_cost';
            p.currentRentPrice = 325; // Reset to low cost base
            p.rentPaidUntilWeek = state.turn + 1; // Mark as paid via debt? Or we still charge debt?
            // If evicted, they don't get rent debt for the old place, they just get evicted.
            // Wait, actually, let's still charge them the low cost rent debt so they owe *something* for the month?
            // The wiki says classic doesn't evict. With strict eviction, maybe they just lose the apartment and enter low cost.
            p.turnEvents.push("You were evicted from your security apartment for failing to pay rent!");
          } else {
            const baseRent = p.currentHousingId === 'security' ? 475 : 325;
            const debtAmount = state.rules.fluctuatingRent ? calcEconomyPrice(baseRent, state.economicIndex) : p.currentRentPrice;
            p.rentDebt += debtAmount;
            p.rentPaidUntilWeek = state.turn + 4; // Debt covers them for 4 weeks
            p.turnEvents.push(`You were charged $${debtAmount} in rent debt for failing to pay!`);
          }
        }
      }

      // Check if rent is due for the UPCOMING turn (state.turn + 1)
      if (p.rentPaidUntilWeek <= state.turn + 1) {
        if (p.rentExtensionsDeniedPermanently) {
          p.turnEvents.push("Rent is due this week! Pay at the Rent Office to avoid additional rent debt.");
        } else {
          p.turnEvents.push("Rent is due this week! You must visit the Rent Office to pay or ask for an extension.");
        }
      }

      // 11. Apply Market Crash & Economy Headline
      let currentHeadline = null;
      if (crashSeverity !== 'none') {
        p = applyMarketCrash(crashSeverity, p);
        if (crashSeverity === 'minor') currentHeadline = "MORE S & L'S FAIL! ECONOMY SUFFERS";
        else if (crashSeverity === 'moderate') currentHeadline = "SCANDAL ON WALL ST. ECONOMY DROPS! UNEMPLOYMENT RISES";
        else currentHeadline = "BANKS FALTER! SAVINGS LOST! JOBS LOST!";
      } else if (economicBoom) {
        p = applyEconomicBoom(p);
        currentHeadline = "INFLATION IS UP! PRICES COULD SOAR!";
      }

      // 12. Apartment Robbery
      const robberyResult = processApartmentRobbery(p);
      p = robberyResult.updated;
      if (robberyResult.robbed) {
        currentHeadline = "WILD WILLY RIPS OFF ANOTHER APARTMENT";
      }

      // 13. Relaxation Decay & Hot Tub
      const preventRelaxationDecay = p.activeEffects['prevent_relaxation_decay'] || 0;
      if (!preventRelaxationDecay) {
        const decay = campaign.config.statRules?.relaxationDecayRate ?? 1;
        const threshold = campaign.config.statRules?.relaxationDoctorThreshold ?? 10;
        p.relaxation = Math.max(threshold, p.relaxation - decay);
      }

      // 14. Pawn Shop Expiration
      if (p.inventory.pawnedItems && p.inventory.pawnedItems.length > 0) {
        const newTurn = state.turn + 1;
        const expired = p.inventory.pawnedItems.filter(item => newTurn - item.weekPawned >= 3);
        if (expired.length > 0) {
          p.turnEvents.push("The pawn shop sold off your unredeemed items!");
          p.inventory.pawnedItems = p.inventory.pawnedItems.filter(item => newTurn - item.weekPawned < 3);
        }
      }

      // Process delayed doctor visit
      if (doctorNeeded) {
        p = processDoctorVisit(p, campaign.config.timeRules.doctorPenalty);
        p.turnEvents.push("You got sick and had to visit the doctor!");
      }

      if (currentHeadline) {
        p.newspaperHeadline = currentHeadline;
        p.turnFlags.freeNewspaper = true;
      }
      
      // Process Weekend Activity
      p = processWeekend(p, state.turn + 1, previousPlayerWeekends, campaign.weekends);
      if (p.weekendResult) {
        previousPlayerWeekends.push(p.weekendResult.text);
      }
    }

    // Generate fallback headline if no specific event
    if (!p.newspaperHeadline) {
      const randomHeadlines = [
        "PRESIDENT HATES BROCCOLI",
        "MORE FAST FOOD PLACES USING SOYBEANS",
        "SCIENTISTS DISCOVER NEW PLANET",
        "LOCAL SPORTS TEAM WINS CHAMPIONSHIP"
      ];
      p.newspaperHeadline = randomHeadlines[Math.floor(Math.random() * randomHeadlines.length)];
    }

    // Reset position to home at the start of the week
    p.position = p.currentHousingId === 'security' ? 'node_security' : 'node_low_cost';

    return p;
  });

  // Check Win Conditions
  let phase = state.phase;
  let winnerId = state.winnerId;

  for (const p of updatedPlayers) {
    const wealth = calcWealthProgress(p.money + p.bankSavings);
    const education = calcEducationProgress(p.degrees.length);
    const career = calcCareerProgress(p.dependability);

    if (
      wealth >= p.goalAllotment.wealth &&
      p.happiness >= p.goalAllotment.happiness &&
      education >= p.goalAllotment.education &&
      career >= p.goalAllotment.career
    ) {
      phase = 'game-over';
      winnerId = p.id;
      break;
    }
  }

  return {
    ...state,
    economicIndex: newEconomy,
    players: updatedPlayers,
    turn: state.turn + 1,
    phase,
    winnerId,
  };
}
