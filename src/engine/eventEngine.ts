/**
 * eventEngine.ts — Random event processing.
 *
 * Handles Wild Willy robberies, Doctor visits, Starvation,
 * and map-based triggers.
 */

import { type PlayerState, type GameState, type StatModification } from './gameState';
import { spendHours } from './timeManager';
import { calcRobberyChance, calcNetWorth, calcFloppyDurableValue } from './statMath';
import { calcEconomyPrice } from './economyEngine';
import type { Random } from '../utils/rng';
import type { CampaignBundle } from './dataLoader';
import { resolveDecision, type ReplayContext } from './replayTypes';
import { applyMoraleEffect, applyHappinessChange } from './statEffects';
import { type GameRules, type StatRules, isAdvancedStatRules } from './rules';

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
  replay?: ReplayContext,
  forceRobbed?: boolean,
  rules?: Partial<GameRules>
): PlayerState {
  const startWeek = campaign.config.eventRules.willyRobberyStartWeek;
  if (week < startWeek || player.money <= 0) return player;

  const chance = buildingType === 'bank' ? 1 / 31 : 1 / 51;
  
  const robbed = forceRobbed ? true : resolveDecision(replay, `street_robbery`, () => rng.next() < chance);

  if (robbed) {
    const updated = { ...player, money: 0 };
    const effectiveRules = rules || campaign.config.gameRules;
    return applyHappinessChange(updated, -3, 'street_robbery', effectiveRules, campaign.config.statRules);
  }

  return player;
}

/**
 * Process starvation at start of turn.
 *
 * @param player — Current player state
 * @returns        Updated player state and boolean indicating if doctor visit triggered
 */
export function processStarvation(
  player: PlayerState,
  timePenalty: number,
  rng: Random,
  rules?: GameRules,
  replay?: ReplayContext,
  statRules?: StatRules
): { updated: PlayerState; doctorTriggered: boolean } {
  const updated = spendHours(player, timePenalty);
  
  if (rules?.usePhysicalMentalConditions) {
    const minPhys = (statRules && isAdvancedStatRules(statRules)) ? statRules.minPhysicalCondition : 0;
    updated.physicalCondition = Math.max(minPhys, (updated.physicalCondition ?? 15) - 2);
  } else {
    const minHap = statRules ? statRules.minHappiness : 0;
    updated.happiness = Math.max(minHap, updated.happiness - 2);
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
export function processDoctorVisit(
  player: PlayerState,
  timePenalty: number,
  rng: Random,
  bypassDoctorIfBroke: boolean = true,
  rules?: GameRules,
  replay?: ReplayContext,
  statRules?: StatRules
): PlayerState {
  // Bypassed entirely if carrying $0 cash (if rule is enabled)
  if (player.money <= 0 && bypassDoctorIfBroke) return player;

  const updated = spendHours(player, timePenalty);
  
  if (rules?.usePhysicalMentalConditions) {
    const maxPhys = updated.physicalConditionMax ?? ((statRules && isAdvancedStatRules(statRules)) ? statRules.initialPhysicalMax : 50);
    const physBounce = (statRules && isAdvancedStatRules(statRules)) ? statRules.doctorPhysicalBounceBack : 4;
    updated.physicalCondition = Math.min(maxPhys, (updated.physicalCondition ?? 15) + physBounce);
  } else {
    const minHap = statRules ? statRules.minHappiness : 0;
    updated.happiness = Math.max(minHap, updated.happiness - 4);
  }
  
  // Cost: random between $30 and $200
  const cost = resolveDecision(replay, `doctor_cost`, () => Math.floor(rng.next() * 171) + 30);
  if (!bypassDoctorIfBroke && rules?.usePhysicalMentalConditions) {
    if (updated.money < cost) {
      const unpaid = cost - updated.money;
      updated.money = 0;
      updated.loanDebt = (updated.loanDebt || 0) + unpaid;
    } else {
      updated.money -= cost;
    }
  } else {
    updated.money = Math.max(0, updated.money - cost);
  }

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
  rules?: GameRules,
  turn: number = 1,
  startWeek: number = 4,
  replay?: ReplayContext,
  statRules?: StatRules,
  forceRobbed?: boolean,
  forcedStolenItemIds?: string[]
): { updated: PlayerState; robbed: boolean } {
  if (player.currentHousingId === 'security' || player.currentHousingId === 'penthouse') return { updated: player, robbed: false };

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

  const robbed = forceRobbed ? true : resolveDecision(replay, `apartment_robbery`, () => rng.next() < chance);

  if (robbed) {
    const formatItem = (id: string) => id.split('_').map(w => (w.toLowerCase() === 'tv' || w.toLowerCase() === 'vcr' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
    let stolenCount = 0;
    const stolenItemNames: string[] = [];
    const newAppliances = player.inventory.appliances.filter((app) => {
      if (protectBuiltInAppliances && ['refrigerator', 'freezer', 'stove'].includes(app.id)) {
        return true; // Keep protected heavy appliances
      }
      let itemStolen = false;
      if (forcedStolenItemIds && forcedStolenItemIds.length > 0) {
        itemStolen = forcedStolenItemIds.includes(app.id);
      } else {
        itemStolen = resolveDecision(replay, `apartment_robbery_item_${app.id}`, () => rng.next() < 0.25);
      }
      if (itemStolen) {
        stolenCount++;
        stolenItemNames.push((app as any).name || formatItem(app.id));
        return false; // Stolen
      }
      return true; // Keep
    });

    if (stolenCount === 0) {
      if (forceRobbed) {
        const unprotected = player.inventory.appliances.find(
          app => !(protectBuiltInAppliances && ['refrigerator', 'freezer', 'stove'].includes(app.id))
        );
        if (unprotected) {
          const remAppliances = player.inventory.appliances.filter(a => a !== unprotected);
          const itemsStr = (unprotected as any).name || formatItem(unprotected.id);
          const aptMods: StatModification[] = [
            { stat: rules?.usePhysicalMentalConditions ? 'mental' : 'happiness', diff: -4 }
          ];
          let updated: PlayerState = {
            ...player,
            inventory: { ...player.inventory, appliances: remAppliances },
            turnEvents: [...player.turnEvents, { key: 'events.robbery.apartment', params: { items: itemsStr }, modifications: aptMods }],
            turnFlags: { ...player.turnFlags, freeNewspaper: true },
            newspaperHeadline: { key: 'newspaper.robbery' }
          };
          updated = applyMoraleEffect(updated, -4, 'apartment_robbery', rules, statRules);
          return { updated, robbed: true };
        }
      }
      return { updated: player, robbed: false };
    }

    const itemsStr = stolenItemNames.join(', ');
    const aptMods: StatModification[] = [
      { stat: rules?.usePhysicalMentalConditions ? 'mental' : 'happiness', diff: -4 }
    ];
    let updated: PlayerState = { 
      ...player, 
      inventory: { ...player.inventory, appliances: newAppliances }, 
      turnEvents: [...player.turnEvents, { key: 'events.robbery.apartment', params: { items: itemsStr }, modifications: aptMods }],
      turnFlags: { ...player.turnFlags, freeNewspaper: true },
      newspaperHeadline: { key: 'newspaper.robbery' }
    };
    updated = applyMoraleEffect(updated, -4, 'apartment_robbery', rules, statRules);
    
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

  const rules = campaign.config.eventRules.charity;

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

  let uniformPrice = 50;
  
  if (player.currentJobId) {
    const jobDef = campaign.jobs.find(j => j.id === player.currentJobId);
    if (jobDef) {
      const uniformSubcategory = jobDef.requirements.uniform;
      const qtItem = campaign.items.find(i => i.subcategory === uniformSubcategory && i.store === 'qt_clothing');
      if (qtItem && qtItem.basePrice !== undefined) {
        uniformPrice = calcEconomyPrice(qtItem.basePrice, state.economicIndex);
      }
    }
  }

  const extraCash = resolveDecision(replay, `donation_extra_cash`, () => Math.floor(rng.next() * 100) + 1);
  const totalDonation = uniformPrice + extraCash;

  const updated = {
    ...player,
    money: player.money + totalDonation,
    nakedTurns: 0,
    turnEvents: [
      ...player.turnEvents,
      {
        key: 'events.donation',
        params: { amount: totalDonation },
        modifications: [{ stat: 'money', diff: totalDonation }]
      }
    ]
  };

  return updated;
}
