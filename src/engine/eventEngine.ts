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
import { resolveDecision, type ReplayContext } from './replayTypes';
import { applyHappinessChange } from './statEffects';

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
  rng: Random,
  campaign: CampaignBundle,
  replay?: ReplayContext
): PlayerState {
  const startWeek = campaign.config.eventRules?.willyRobberyStartWeek ?? 4;
  if (week < startWeek || player.money <= 0) return player;

  const chance = buildingType === 'bank' ? 1 / 31 : 1 / 51;
  
  const robbed = resolveDecision(replay, `street_robbery`, () => rng.next() < chance);

  if (robbed) {
    let updated = { ...player, money: 0 };
    // Fallback to empty object if rules aren't explicitly passed, but gameRules should be on campaign
    const rules = (campaign.config.gameRules || {}) as any;
    return applyHappinessChange(updated, -3, 'street_robbery', rules, campaign.config.statRules);
  }

  return player;
}

/**
 * Process starvation at start of turn.
 *
 * @param player — Current player state
 * @returns        Updated player state and boolean indicating if doctor visit triggered
 */
export function processStarvation(player: PlayerState, timePenalty: number, rng: Random, rules?: import('./gameState').GameRules, replay?: ReplayContext): { updated: PlayerState; doctorTriggered: boolean } {
  let updated = spendHours(player, timePenalty);
  
  if (rules?.usePhysicalMentalConditions) {
    updated.physicalCondition = Math.max(0, (updated.physicalCondition || 15) - 2);
  } else {
    updated.happiness = Math.max(10, updated.happiness - 2);
  }
  
  // 25% chance of Doctor Visit
  const doctorTriggered = resolveDecision(replay, `starvation_doctor`, () => rng.next() < 0.25);
  
  return { updated, doctorTriggered };
}

/**
 * Process a doctor visit.
 *
 * @param player — Current player state
 * @returns        Updated player state
 */
export function processDoctorVisit(player: PlayerState, timePenalty: number, rng: Random, bypassDoctorIfBroke: boolean = true, rules?: import('./gameState').GameRules, replay?: ReplayContext): PlayerState {
  // Bypassed entirely if carrying $0 cash (if rule is enabled)
  if (player.money <= 0 && bypassDoctorIfBroke) return player;

  let updated = spendHours(player, timePenalty);
  
  if (rules?.usePhysicalMentalConditions) {
    updated.physicalCondition = Math.max(0, (updated.physicalCondition || 15) - 2);
  } else {
    updated.happiness = Math.max(10, updated.happiness - 4);
  }
  
  // Cost: random between $30 and $200
  const cost = resolveDecision(replay, `doctor_cost`, () => Math.floor(rng.next() * 171) + 30);
  updated.money = Math.max(0, updated.money - cost);

  return updated;
}

/**
 * Process an apartment robbery (Wild Willy breaks in).
 *
 * @param player — Current player state
 * @returns        Updated player state (stolen items removed)
 */
export function processApartmentRobbery(
  player: PlayerState,
  rng: Random,
  protectBuiltInAppliances: boolean = false,
  rules?: import('./gameState').GameRules,
  turn: number = 1,
  startWeek: number = 4,
  replay?: ReplayContext
): { updated: PlayerState; robbed: boolean } {
  if (player.currentHousingId === 'security') return { updated: player, robbed: false };

  let chance = calcRobberyChance(player.relaxation);

  if (rules?.useHomeTimeRobbery) {
    if (turn < startWeek) {
      chance = 0;
    } else {
      const history = player.homeTimeHistory || [];
      const sum = history.reduce((acc, val) => acc + val, 0);
      const mean = history.length > 0 ? sum / history.length : 0;
      chance = 1 / (11 + mean);
    }
  }

  const robbed = resolveDecision(replay, `apartment_robbery`, () => rng.next() < chance);

  if (robbed) {
    let stolenCount = 0;
    const newAppliances = player.inventory.appliances.filter((app) => {
      if (protectBuiltInAppliances && ['refrigerator', 'freezer', 'stove'].includes(app.id)) {
        return true; // Keep protected heavy appliances
      }
      const itemStolen = resolveDecision(replay, `apartment_robbery_item_${app.id}`, () => rng.next() < 0.25);
      if (itemStolen) {
        stolenCount++;
        return false; // Stolen
      }
      return true; // Keep
    });

    if (stolenCount === 0) {
      return { updated: player, robbed: false };
    }

    let updated = { 
      ...player, 
      inventory: { ...player.inventory, appliances: newAppliances }, 
      turnEvents: [...player.turnEvents, { key: 'events.robbery.apartment' }] 
    };
    // -4 Happiness penalty
    updated = applyHappinessChange(updated, -4, 'apartment_robbery', (rules || {}) as any);
    
    return { updated, robbed: true };
  }

  return { updated: player, robbed: false };
}

/**
 * Process Donation event at start of turn.
 * @param player - Current player state
 * @param state - The global GameState to check economy
 * @param campaign - To fetch item and job definitions
 * @param rng - For calculating the random amount
 * @returns Updated player state (donated or untouched)
 */
export function processDonations(
  player: PlayerState,
  state: GameState,
  campaign: CampaignBundle,
  rng: Random,
  replay?: ReplayContext
): PlayerState {
  if (player.nakedTurns < 2) return player;

  let isEligible = false;

  const rules = campaign.config.eventRules?.charity;
  if (!rules) return player;

  if (rules.wealthMetric === 'netWorth') {
    const netWorth = calcNetWorth(player);
    if (player.money <= rules.maxCash && netWorth <= rules.maxWealth) {
      isEligible = true;
    }
  } else {
    const durableValue = calcFloppyDurableValue(player);
    if (player.money <= rules.maxCash && durableValue <= rules.maxWealth) {
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
        uniformPrice = calcEconomyPrice(qtItem.basePrice ?? 0, state.economicIndex);
      }
    }
  }

  const extraCash = resolveDecision(replay, `donation_extra_cash`, () => Math.floor(rng.next() * 100) + 1); // 1 to 100
  const totalDonation = uniformPrice + extraCash;

  const updated = {
    ...player,
    money: player.money + totalDonation,
    nakedTurns: 0,
    turnEvents: [...player.turnEvents, { key: 'events.donation', params: { amount: totalDonation } }]
  };

  return updated;
}
