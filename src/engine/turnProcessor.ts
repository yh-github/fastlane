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

  // Process each player
  const updatedPlayers = state.players.map(player => {
    let p = resetPlayerClock(player); // Resets hours to 60, applies caffeine debt

    // Reset Turn Flags
    p.turnFlags = {
      hasEaten: false,
      hasWorked: false,
      drinkHappinessGranted: false,
      fastFoodHappinessGranted: false,
      freshFoodHappinessGranted: false,
      caffeineDebt: 0,
    };

    // 1. Clothing Decay
    p.inventory.casualClothesWeeks = Math.max(0, p.inventory.casualClothesWeeks - 1);
    p.inventory.dressClothesWeeks = Math.max(0, p.inventory.dressClothesWeeks - 1);
    p.inventory.businessClothesWeeks = Math.max(0, p.inventory.businessClothesWeeks - 1);

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
      if (doctorTriggered) doctorNeeded = true;
    }

    // 3. Food Spoilage
    const hasFridge = p.inventory.appliances.some(a => a.id === 'refrigerator');
    const hasFreezer = p.inventory.appliances.some(a => a.id === 'freezer');
    
    if (!hasFridge && p.inventory.freshFoodUnits > 0) {
      p.inventory.freshFoodUnits = 0;
      p.happiness = Math.max(10, p.happiness - 2);
      if (p.money > 0 && Math.random() < 0.5) doctorNeeded = true;
    } else if (hasFridge) {
      const maxStorage = hasFreezer ? 12 : 6;
      if (p.inventory.freshFoodUnits > maxStorage) {
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

    // 10. Rent Check
    // Rent is due week 4. E.g., week 4, 8, 12.
    if (state.turn % 4 === 0 && p.rentPaidUntilWeek < state.turn) {
      // In full impl, this would trigger UI prompt.
      // We'll mark extension active for now.
      p.rentExtensionActive = true;
    }

    // 11. Apply Market Crash
    if (crashSeverity !== 'none') {
      p = applyMarketCrash(crashSeverity, p);
    }

    // 12. Apartment Robbery
    p = processApartmentRobbery(p);

    // Process delayed doctor visit
    if (doctorNeeded) {
      p = processDoctorVisit(p);
    }

    // Reset position to home at the start of the week
    // Both housing types currently share the same node on the map
    p.position = 'node_low_cost';

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
