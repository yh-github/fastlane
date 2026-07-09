/**
 * eventEngine.ts — Random event processing.
 *
 * Handles Wild Willy robberies, Doctor visits, Starvation,
 * and map-based triggers.
 */

import { type PlayerState, COST_DOCTOR_VISIT, COST_STARVATION_PENALTY } from './gameState';
import { spendHours } from './timeManager';
import { calcRobberyChance } from './statMath';

/**
 * Attempt a Wild Willy street robbery when leaving Bank or Black's Market.
 *
 * @param player       — Current player state
 * @param buildingType — 'bank' or 'blacks_market'
 * @param week         — Current turn number
 * @returns              Updated player state (robbed or untouched)
 */
export function processStreetRobbery(
  player: PlayerState,
  buildingType: 'bank' | 'blacks_market',
  week: number
): PlayerState {
  // Happens only from Week 4 onwards (CD-ROM rule), and only if carrying cash
  if (week < 4 || player.money <= 0) return player;

  const chance = buildingType === 'bank' ? 1 / 31 : 1 / 51;
  
  if (Math.random() < chance) {
    return {
      ...player,
      money: 0,
      happiness: Math.max(10, player.happiness - 3),
    };
  }

  return player;
}

/**
 * Process starvation at start of turn.
 *
 * @param player — Current player state
 * @returns        Updated player state and boolean indicating if doctor visit triggered
 */
export function processStarvation(player: PlayerState): { updated: PlayerState; doctorTriggered: boolean } {
  let updated = spendHours(player, COST_STARVATION_PENALTY);
  updated.happiness = Math.max(10, updated.happiness - 2);
  
  // 25% chance of Doctor Visit
  const doctorTriggered = Math.random() < 0.25;
  
  return { updated, doctorTriggered };
}

/**
 * Process a doctor visit.
 *
 * @param player — Current player state
 * @returns        Updated player state
 */
export function processDoctorVisit(player: PlayerState): PlayerState {
  // Bypassed entirely if carrying $0 cash
  if (player.money <= 0) return player;

  let updated = spendHours(player, COST_DOCTOR_VISIT);
  updated.happiness = Math.max(10, updated.happiness - 4);
  
  // Cost: random between $30 and $200
  const cost = Math.floor(Math.random() * 171) + 30;
  updated.money = Math.max(0, updated.money - cost);

  return updated;
}

/**
 * Process an apartment robbery (Wild Willy breaks in).
 *
 * @param player — Current player state
 * @returns        Updated player state (stolen items removed)
 */
export function processApartmentRobbery(player: PlayerState): { updated: PlayerState; robbed: boolean } {
  // Security Apartments are immune (assuming currentHousingId 'security' signifies this)
  if (player.currentHousingId === 'security') return { updated: player, robbed: false };

  const chance = calcRobberyChance(player.relaxation);
  
  if (Math.random() < chance) {
    let updated = { ...player, inventory: { ...player.inventory }, turnEvents: [...player.turnEvents, "Wild Willy broke into your apartment!"] };
    // Filter appliances. Each stealable durable has 25% chance to be stolen.
    // Fridge, Freezer, Stove can't be stolen.
    updated.inventory.appliances = updated.inventory.appliances.filter((app) => {
      if (['refrigerator', 'freezer', 'stove'].includes(app.id)) {
        return true; // Keep
      }
      if (Math.random() < 0.25) {
        return false; // Stolen
      }
      return true; // Keep
    });

    return { updated, robbed: true };
  }

  return { updated: player, robbed: false };
}
