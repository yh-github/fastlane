import {
  type PlayerState,
  collectItemEffects
} from '../gameState';
import type { CampaignBundle } from '../dataLoader';
import {
  type GameRules,
  type StatRules,
  requireAdvancedStatRules,
  requireAdvancedTimeRules,
  requireAdvancedEconomyRules,
  requireConfig
} from '../rules';
import { messGrowth, calcUsedSpace, calcHousingSpaceCap } from './housingMath';

/**
 * Clamp a stat value between its floor and ceiling from StatRules.
 */
export function clampHappiness(value: number, statRules: { minHappiness: number; maxHappiness: number }): number {
  return Math.max(statRules.minHappiness, Math.min(statRules.maxHappiness, value));
}

/**
 * Clamp a generic value to a minimum of 0.
 */
export function clampZero(value: number): number {
  return Math.max(0, value);
}

/**
 * Safely decrement Physical Condition without boosting when current <= min.
 */
export function safeDecrementPhysical(current: number, cost: number, minPhysical: number): number {
  if (current <= minPhysical) return current;
  return Math.max(minPhysical, current - cost);
}

/**
 * Safely decrement Mental Condition without boosting when current <= min.
 */
export function safeDecrementMental(current: number, cost: number, minMental: number): number {
  if (current <= minMental) return current;
  return Math.max(minMental, current - cost);
}

/**
 * Calculate Wellbeing score.
 * Formula: Wellbeing_Score = Math.ceil((Physical + Mental) / 2)
 */
export function calcWellbeingScore(physical: number, mental: number): number {
  return Math.ceil((physical + mental) / 2);
}

/**
 * Rounds a number to a specific step resolution (e.g. 0.5 for half points, 0.1 for decimals).
 */
export function roundToResolution(value: number, resolution: number): number {
  if (resolution <= 0) return value;
  const factor = 1 / resolution;
  return Math.round(value * factor) / factor;
}

export function calcMaxMental(
  currentMess: number,
  social: number,
  resilienceBonus: number,
  player: PlayerState | undefined,
  statRules: StatRules,
  campaign?: CampaignBundle
): number {
  const sr = requireAdvancedStatRules(statRules);
  const baseVal = sr.mentalMaxBaseValue;
  const globalMax = sr.globalMaxMentalCondition;
  
  let bonus = resilienceBonus;
  
  if (player) {
    if (campaign) {
      const continuousEffects = collectItemEffects(player, campaign, 'continuous');
      bonus += continuousEffects.get('mental_max') || 0;
    } else {
      const numBooks = player.inventory.books.length;
      const maxBookBonus = sr.mentalMaxBookLimit;
      const bookBonusVal = sr.mentalMaxBookBonus;
      bonus += Math.min(maxBookBonus, numBooks * bookBonusVal);
      
      if (player.inventory.appliances.some(a => a.id === 'computer')) {
        bonus += sr.mentalMaxComputerBonus;
      }
    }
    
    const numDegrees = player.degrees.length;
    const degreeBonusVal = sr.mentalMaxDegreeBonus;
    bonus += numDegrees * degreeBonusVal;
  }
  
  return Math.max(10, Math.min(globalMax, baseVal - messGrowth(currentMess) + Math.floor(social / 10) + bonus));
}

export interface SocializeParameters {
  diceCount: number;
  minRolledGuests: number;
  maxRolledGuests: number;
  freeSpace: number;
  maxGuestsBySpace: number;
  effectiveMinGuests: number;
  effectiveMaxGuests: number;
  isCappedBySpace: boolean;
  isNoSpace: boolean;
  timeCost: number;
  hasTime: boolean;
  isTooExhausted: boolean;
  isDisabled: boolean;
  disabledReasonKey?: 'notEnoughTime' | 'noSpace' | 'messTooHigh' | 'tooExhausted';
  cashRate: number;
  appBonus: number;
  minCashNeeded: number;
  maxCashNeeded: number;
  isHalfRewardExpected: boolean;
  minReward: number;
  maxReward: number;
}

/**
 * Centralized calculation of socialize action parameters, cost, constraints, and rewards.
 * Shared across game engine and UI to ensure calculations stay DRY and consistent.
 */
export function calcSocializeParameters(
  player: PlayerState,
  campaign: CampaignBundle,
  rules: GameRules
): SocializeParameters {
  const isPenthouse = player.currentHousingId === 'penthouse';
  const isSecurity = player.currentHousingId === 'security';

  const diceCount = isPenthouse ? 3 : isSecurity ? 2 : 1;
  const minRolledGuests = diceCount * 1;
  const maxRolledGuests = diceCount * 3;

  let freeSpace = 0;
  let maxGuestsBySpace = Infinity;
  let isNoSpace = false;
  let disabledReasonKey: 'notEnoughTime' | 'noSpace' | 'messTooHigh' | 'tooExhausted' | undefined;

  if (rules.spaceCapping) {
    const usedSpace = calcUsedSpace(player, campaign, true);
    const spaceCap = calcHousingSpaceCap(player, campaign);
    freeSpace = Math.max(0, spaceCap - usedSpace);
    maxGuestsBySpace = Math.floor(freeSpace / 10);
    if (freeSpace < 10) {
      isNoSpace = true;
      disabledReasonKey = 'noSpace';
    }
  } else {
    if ((player.mess || 0) > 25) {
      isNoSpace = true;
      disabledReasonKey = 'messTooHigh';
    }
  }

  const effectiveMaxGuests = Math.max(0, Math.min(maxRolledGuests, maxGuestsBySpace));
  const effectiveMinGuests = Math.max(0, Math.min(minRolledGuests, effectiveMaxGuests));
  const isCappedBySpace = !!rules.spaceCapping && maxGuestsBySpace < maxRolledGuests;

  const timeRules = requireAdvancedTimeRules(campaign.config.timeRules);
  const economyRules = requireAdvancedEconomyRules(campaign.config.economyRules);

  const timeCost = requireConfig(timeRules.socializeCost, 'timeRules.socializeCost');
  const hasTime = player.hoursRemaining >= timeCost;
  if (!hasTime && !disabledReasonKey) {
    disabledReasonKey = 'notEnoughTime';
  }

  const currentPhys = player.physicalCondition ?? 0;
  const isTooExhausted = !!rules.usePhysicalMentalConditions && (currentPhys - 1 < 1.0);
  if (isTooExhausted && !disabledReasonKey) {
    disabledReasonKey = 'tooExhausted';
  }

  const isDisabled = isNoSpace || !hasTime || isTooExhausted;

  let appBonus = 0;
  if (rules.usePhysicalMentalConditions) {
    const socializeEffects = collectItemEffects(player, campaign, 'on_socialize');
    appBonus += socializeEffects.get('social') || 0;
    appBonus += player.activeEffects?.['vcr_social_bonus'] || 0;
  }

  const cashRate = requireConfig(economyRules.socializeLowCostCashCost, 'economyRules.socializeLowCostCashCost');
  const minCashNeeded = effectiveMinGuests * cashRate;
  const maxCashNeeded = effectiveMaxGuests * cashRate;

  const currentMental = player.mentalCondition ?? 0;
  const hasSufficientCash = player.money >= minCashNeeded;
  const hasSufficientMental = currentMental >= 5;
  const isHalfRewardExpected = !hasSufficientCash || !hasSufficientMental;

  const minReward = (isHalfRewardExpected ? Math.floor(effectiveMinGuests / 2) : effectiveMinGuests) + appBonus;
  const maxReward = (isHalfRewardExpected ? Math.floor(effectiveMaxGuests / 2) : effectiveMaxGuests) + appBonus;

  return {
    diceCount,
    minRolledGuests,
    maxRolledGuests,
    freeSpace,
    maxGuestsBySpace,
    effectiveMinGuests,
    effectiveMaxGuests,
    isCappedBySpace,
    isNoSpace,
    timeCost,
    hasTime,
    isTooExhausted,
    isDisabled,
    disabledReasonKey,
    cashRate,
    appBonus,
    minCashNeeded,
    maxCashNeeded,
    isHalfRewardExpected,
    minReward,
    maxReward
  };
}
