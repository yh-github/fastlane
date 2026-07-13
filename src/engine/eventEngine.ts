/**
 * eventEngine.ts — Random event processing.
 *
 * Handles Wild Willy robberies, Doctor visits, Starvation,
 * and map-based triggers.
 */

import { type PlayerState, type GameState } from './gameState';
import { spendHours } from './timeManager';
import { calcRobberyChance, calcNetWorth, calcFloppyDurableValue } from './statMath';
import { calcEconomyPrice } from './economyEngine';
import type { Random } from '../utils/rng';
import type { CampaignBundle } from './dataLoader';

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
  week: number,
  rng: Random
): PlayerState {
  // Happens only from Week 4 onwards (CD-ROM rule), and only if carrying cash
  if (week < 4 || player.money <= 0) return player;

  const chance = buildingType === 'bank' ? 1 / 31 : 1 / 51;
  
  if (rng.next() < chance) {
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
export function processStarvation(player: PlayerState, timePenalty: number, rng: Random): { updated: PlayerState; doctorTriggered: boolean } {
  let updated = spendHours(player, timePenalty);
  updated.happiness = Math.max(10, updated.happiness - 2);
  
  // 25% chance of Doctor Visit
  const doctorTriggered = rng.next() < 0.25;
  
  return { updated, doctorTriggered };
}

/**
 * Process a doctor visit.
 *
 * @param player — Current player state
 * @returns        Updated player state
 */
export function processDoctorVisit(player: PlayerState, timePenalty: number, rng: Random): PlayerState {
  // Bypassed entirely if carrying $0 cash
  if (player.money <= 0) return player;

  let updated = spendHours(player, timePenalty);
  updated.happiness = Math.max(10, updated.happiness - 4);
  
  // Cost: random between $30 and $200
  const cost = Math.floor(rng.next() * 171) + 30;
  updated.money = Math.max(0, updated.money - cost);

  return updated;
}

/**
 * Process an apartment robbery (Wild Willy breaks in).
 *
 * @param player — Current player state
 * @returns        Updated player state (stolen items removed)
 */
export function processApartmentRobbery(player: PlayerState, rng: Random): { updated: PlayerState; robbed: boolean } {
  // Security Apartments are immune (assuming currentHousingId 'security' signifies this)
  if (player.currentHousingId === 'security') return { updated: player, robbed: false };

  const chance = calcRobberyChance(player.relaxation);
  
  if (rng.next() < chance) {
    let updated = { ...player, inventory: { ...player.inventory }, turnEvents: [...player.turnEvents, { key: 'events.robbery.willy' }] };
    // -4 Happiness penalty
    updated.happiness = Math.max(10, updated.happiness - 4);
    
    // Filter appliances. Each stealable durable has 25% chance to be stolen.
    // Fridge, Freezer, Stove can't be stolen.
    updated.inventory.appliances = updated.inventory.appliances.filter((app) => {
      if (['refrigerator', 'freezer', 'stove'].includes(app.id)) {
        return true; // Keep
      }
      if (rng.next() < 0.25) {
        return false; // Stolen
      }
      return true; // Keep
    });

    return { updated, robbed: true };
  }

  return { updated: player, robbed: false };
}

/**
 * Process Donation event at start of turn.
 * @param player - Current player state
 * @param state - The global GameState to check variant and economy
 * @param campaign - To fetch item and job definitions
 * @param rng - For calculating the random amount
 * @returns Updated player state (donated or untouched)
 */
export function processDonations(
  player: PlayerState,
  state: GameState,
  campaign: CampaignBundle,
  rng: Random
): PlayerState {
  if (player.nakedTurns < 2) return player;

  let isEligible = false;

  if (state.variant === 'cdrom') {
    const netWorth = calcNetWorth(player);
    if (player.money < 300 && netWorth < 300) {
      isEligible = true;
    }
  } else {
    // floppy
    const durableValue = calcFloppyDurableValue(player);
    if (player.money === 0 && durableValue < 200) {
      isEligible = true;
    }
  }

  if (!isEligible) return player;

  // Calculate amount
  let uniformPrice = 50;
  
  if (player.currentJobId) {
    const jobDef = campaign.jobs.find(j => j.id === player.currentJobId);
    if (jobDef) {
      const uniformSubcategory = jobDef.requirements.uniform;
      const qtItem = campaign.items.find(i => i.subcategory === uniformSubcategory && i.store === 'qt_clothing');
      if (qtItem) {
        uniformPrice = calcEconomyPrice(qtItem.basePrice, state.economicIndex);
      }
    }
  }

  const extraCash = Math.floor(rng.next() * 100) + 1; // 1 to 100
  const totalDonation = uniformPrice + extraCash;

  const updated = {
    ...player,
    money: player.money + totalDonation,
    nakedTurns: 0,
    turnEvents: [...player.turnEvents, { key: 'events.donation', params: { amount: totalDonation } }]
  };

  return updated;
}
