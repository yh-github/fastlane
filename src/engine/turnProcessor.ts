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

import { type GameState } from './gameState';
import { calcEconomyPrice } from './economyEngine';
import { calcDependabilityDecay, calcWealthProgress, calcEducationProgress, calcCareerProgress } from './statMath';
import { resetPlayerClock } from './timeManager';
import { processStarvation, processDoctorVisit, processApartmentRobbery } from './eventEngine';
import { fluctuateEconomy, applyMarketCrash } from './economyEngine';

export function processTurnStart(state: GameState): GameState {
  // 1. Fluctuate the economy for the new turn
  const newEconomy = fluctuateEconomy(state.economicIndex);

  // 2. Market Crash Roll
  let crashSeverity: 'none' | 'minor' | 'moderate' | 'major' = 'none';
  const crashChance = state.variant === 'cdrom' 
    ? 1 / (1 + (30 * state.players.length)) 
    : 1 / (1 + (20 * state.players.length));
  
  if (Math.random() < crashChance) {
    const roll = Math.random();
    if (roll < 0.6) crashSeverity = 'minor';
    else if (roll < 0.9) crashSeverity = 'moderate';
    else crashSeverity = 'major';
  }
  
  const economicBoom = crashSeverity === 'none' && newEconomy > state.economicIndex && Math.random() < 0.2;

  // Process each player
  const updatedPlayers = state.players.map(player => {
    let p = resetPlayerClock(player); // Resets hours to 60, applies caffeine debt

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
      // 1. Clothing Decay (only decay what is actually worn)
      if (p.inventory.selectedClothes === 'casual') {
        if (p.inventory.casualClothesWeeks === 1) p.turnEvents.push("Your casual clothes are worn out!");
        p.inventory.casualClothesWeeks = Math.max(0, p.inventory.casualClothesWeeks - 1);
      } else if (p.inventory.selectedClothes === 'dress') {
        if (p.inventory.dressClothesWeeks === 1) p.turnEvents.push("Your dress clothes are worn out!");
        p.inventory.dressClothesWeeks = Math.max(0, p.inventory.dressClothesWeeks - 1);
      } else if (p.inventory.selectedClothes === 'business') {
        if (p.inventory.businessClothesWeeks === 1) p.turnEvents.push("Your business suit is worn out!");
        p.inventory.businessClothesWeeks = Math.max(0, p.inventory.businessClothesWeeks - 1);
      }

      // Auto-fallback clothes if worn out
      const hasCasual = p.inventory.casualClothesWeeks > 0;
      const hasDress = p.inventory.dressClothesWeeks > 0;
      const hasBusiness = p.inventory.businessClothesWeeks > 0;
      let activeClothes: 'casual' | 'dress' | 'business' | 'none' = (p.inventory.selectedClothes as any) || 'none';

      if (activeClothes === 'business' && !hasBusiness) activeClothes = hasDress ? 'dress' : (hasCasual ? 'casual' : 'none');
      if (activeClothes === 'dress' && !hasDress) activeClothes = hasBusiness ? 'business' : (hasCasual ? 'casual' : 'none');
      if (activeClothes === 'casual' && !hasCasual) activeClothes = hasDress ? 'dress' : (hasBusiness ? 'business' : 'none');

      p.inventory.selectedClothes = activeClothes as any;

      // 2. Food Consumption & Starvation
      let doctorNeeded = false;
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
        const { updated, doctorTriggered } = processStarvation(p);
        p = updated;
        p.turnEvents.push("You didn't eat enough! You are starving.");
        if (doctorTriggered) {
          doctorNeeded = true;
        }
      }

      // 3. Food Spoilage
      const hasFridge = p.inventory.appliances.some(a => a.id === 'refrigerator');
      const hasFreezer = p.inventory.appliances.some(a => a.id === 'freezer');
      
      if (!hasFridge && p.inventory.freshFoodUnits > 0) {
        const lostFood = p.inventory.freshFoodUnits;
        p.inventory.freshFoodUnits = 0;
        p.happiness = Math.max(10, p.happiness - 2);
        p.turnEvents.push(`Without a fridge, ${lostFood} units of your food spoiled!`);
        if (p.money > 0 && Math.random() < 0.5) {
          doctorNeeded = true;
          p.turnEvents.push("Eating bad food made you sick!");
        }
      } else if (hasFridge) {
        const maxStorage = hasFreezer ? 12 : 6;
        if (p.inventory.freshFoodUnits > maxStorage) {
          p.turnEvents.push("You had too much food for your fridge, some of it spoiled!");
          p.inventory.freshFoodUnits = maxStorage;
          p.happiness = Math.max(10, p.happiness - 1);
        }
      }

      // 4. Dependability Decay
      p.dependability = calcDependabilityDecay(p.dependability);

      // 5. Appliance Breakage (simplified - 1/36 chance per appliance if cash > $500)
      if (p.money > 500) {
        for (const app of p.inventory.appliances) {
          const breakChance = app.purchaseSource === 'socket_city' ? 1/51 : 1/36;
          if (Math.random() < breakChance) {
            const repairCost = Math.floor(app.purchasePrice * (0.05 + Math.random() * 0.2));
            p.money = Math.max(0, p.money - repairCost);
            p.happiness = Math.max(10, p.happiness - 1);
            p.turnEvents.push(`Your ${app.id.replace('_', ' ')} broke! Repair cost: $${repairCost}`);
          }
        }
      }

      // 6. Appliance Happiness Bonuses
      const hasStove = p.inventory.appliances.some(a => a.id === 'stove');
      const hasMicrowave = p.inventory.appliances.some(a => a.id === 'microwave');
      if (hasStove || hasMicrowave) {
        p.happiness = Math.min(100, p.happiness + 1);
      }

      // 7. Computer Income
      if (p.inventory.appliances.some(a => a.id === 'computer')) {
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

      // 9. Event Tickets (Simplified: consumes one and triggers)
      if (p.inventory.tickets.baseball > 0) {
        p.inventory.tickets.baseball--;
        p.money = Math.max(0, p.money - 35); // Cost of event
      } else if (p.inventory.tickets.theatre > 0) {
        p.inventory.tickets.theatre--;
        p.money = Math.max(0, p.money - 35);
      } else if (p.inventory.tickets.concert > 0) {
        p.inventory.tickets.concert--;
        p.money = Math.max(0, p.money - 35);
      }

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
        currentHeadline = "INFLATION IS UP! PRICES COULD SOAR!";
      }

      // 12. Apartment Robbery
      const robberyResult = processApartmentRobbery(p);
      p = robberyResult.updated;
      if (robberyResult.robbed) {
        currentHeadline = "WILD WILLY RIPS OFF ANOTHER APARTMENT";
      }

      // 13. Relaxation Decay & Hot Tub
      const hasHotTub = p.inventory.appliances.some(a => a.id === 'hot_tub');
      if (!hasHotTub) {
        p.relaxation = Math.max(0, p.relaxation - 2); // Decay by 2 per turn
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
        p = processDoctorVisit(p);
      }

      if (currentHeadline) {
        p.newspaperHeadline = currentHeadline;
        p.turnFlags.freeNewspaper = true;
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
      winnerId = p.name;
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
