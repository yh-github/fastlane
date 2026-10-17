import {
  type PlayerState,
  collectItemEffects
} from '../gameState';
import {
  type StatRules,
  type GameRules,
  type EconomyRules,
  requireAdvancedStatRules,
  requireAdvancedEconomyRules
} from '../rules';
import type { CampaignBundle } from '../dataLoader';

/**
 * Calculate mess growth based on current mess.
 * Formula: mess_growth(current_mess) = Math.floor(0.2 * (current_mess + 1)) + 1
 */
export function messGrowth(currentMess: number): number {
  return Math.floor(0.2 * (currentMess + 1)) + 1;
}

/**
 * Calculate moving fee when changing housing.
 * Formula: Moving_Fee = Math.max(0, current_mess - threshold) * messRate + (num_of_durables_owned * durableRate)
 */
export function calcMovingFee(
  currentMess: number,
  numOfDurablesOwned: number,
  economyRules: EconomyRules
): number {
  const er = requireAdvancedEconomyRules(economyRules);
  return Math.max(0, currentMess - er.moveFeeMessThreshold) * er.moveFeeMessRate + (numOfDurablesOwned * er.moveFeeDurableRate);
}

/**
 * Calculate dynamic housing Mess limit considering Hot Tub (+5 MAX_MESS bonus).
 */
export function calcMaxMess(player: PlayerState, statRules: StatRules, campaign?: CampaignBundle): number {
  const sr = requireAdvancedStatRules(statRules);
  let baseMax = sr.lowCostMessMax;
  if (player.currentHousingId === 'penthouse') {
    baseMax = sr.globalMessMax;
  } else if (player.currentHousingId === 'security') {
    baseMax = sr.securityMessMax;
  }

  if (campaign) {
    const continuousEffects = collectItemEffects(player, campaign, 'continuous');
    baseMax += continuousEffects.get('mess_max') || 0;
  } else if (player.inventory.appliances.some(a => a.id === 'hot_tub')) {
    baseMax += sr.hotTubMaxMessBonus;
  }

  return Math.min(baseMax, sr.globalMessMax);
}

/**
 * Calculate space occupied by durables and mess.
 */
export function calcUsedSpace(player: PlayerState, campaign?: CampaignBundle, includeMess: boolean = true): number {
  let used = 0;
  // Appliances
  for (const app of (player.inventory?.appliances || [])) {
    const def = campaign?.items?.find(i => i.id === app.id);
    used += def?.space ?? 0;
  }
  // Books
  for (const bookId of (player.inventory?.books || [])) {
    const def = campaign?.items?.find(i => i.id === bookId);
    used += def?.space ?? (bookId === 'encyclopedia' ? 20 : 10);
  }
  // Knick-knacks and curios (2 space each)
  used += (player.inventory?.knickKnacks || 0) * 2;
  used += (player.inventory?.uninspectedKnickKnacks || 0) * 2;
  used += (player.inventory?.spareParts || 0) * 2;
  // Mess (1:1 with space)
  if (includeMess && player.mess && player.mess > 0) {
    used += player.mess;
  }
  return used;
}

/**
 * Get the max space capacity for player's current housing.
 */
export function calcHousingSpaceCap(player: PlayerState, campaign?: CampaignBundle): number {
  const housingDef = campaign?.housing.find(h => h.id === player.currentHousingId);
  return housingDef?.spaceCap ?? 999999;
}

export interface LandlordStandingBreakdown {
  label: string;
  value: number;
}

export function calcLandlordStanding(
  player: PlayerState,
  rules: GameRules,
  currentTurn: number = 1
): { standing: number; breakdown: LandlordStandingBreakdown[] } {
  let baseline = 35;
  let baselineLabel = 'Baseline';
  if (player.currentHousingId === 'penthouse') {
    baseline = 70;
    baselineLabel = 'Penthouse Luxury Baseline';
  } else if (player.currentHousingId === 'security') {
    baseline = 55;
    baselineLabel = 'Security Apartment Baseline';
  } else if (player.currentHousingId === 'street') {
    baseline = 20;
    baselineLabel = 'Homelessness Baseline';
  }

  let standing = baseline;
  const breakdown: LandlordStandingBreakdown[] = [
    { label: baselineLabel, value: baseline }
  ];

  // Bonus for successful rent payments (+3 each, capped at +15)
  const payments = player.rentPaymentsMade || 0;
  if (payments > 0) {
    const paymentBonus = Math.min(15, payments * 3);
    standing += paymentBonus;
    breakdown.push({ label: `Payment History (${payments})`, value: paymentBonus });
  }

  // Bonus for paying ahead (+5 per 4-week month in advance, capped at +15)
  const weeksAhead = Math.max(0, (player.rentPaidUntilWeek || 0) - currentTurn);
  const monthsAhead = Math.floor(weeksAhead / 4);
  if (monthsAhead >= 1) {
    const advanceBonus = Math.min(15, monthsAhead * 5);
    standing += advanceBonus;
    breakdown.push({ label: `Paid in Advance (${monthsAhead} mo)`, value: advanceBonus });
  }

  // Penalty for asking concessions: extensions (-5 each)
  const extensionsAsked = player.rentExtensionsAsked ?? player.rentExtensionsReceived ?? 0;
  if (extensionsAsked > 0) {
    const penalty = -extensionsAsked * 5;
    standing += penalty;
    breakdown.push({ label: `Extensions Requested (${extensionsAsked})`, value: penalty });
  }

  // Penalty for asking concessions: rent renegotiations (-5 each)
  const renegotiationsAsked = player.rentRenegotiationsAsked ?? 0;
  if (renegotiationsAsked > 0) {
    const penalty = -renegotiationsAsked * 5;
    standing += penalty;
    breakdown.push({ label: `Rent Reductions Requested (${renegotiationsAsked})`, value: penalty });
  }

  if (player.rentDebt > 0) {
    standing -= 25;
    breakdown.push({ label: 'Outstanding Rent Debt', value: -25 });
  }

  const defaults = player.timesDefaulted || 0;
  if (defaults > 0) {
    const penalty = -defaults * 20;
    standing += penalty;
    breakdown.push({ label: `Past Evictions/Defaults (${defaults})`, value: penalty });
  }

  if (rules.trackMess && player.mess !== undefined) {
    if (player.mess <= 2) {
      standing += 5;
      breakdown.push({ label: 'Clean & Tidy Apartment', value: 5 });
    } else {
      const messPenalty = -Math.min(30, Math.floor(player.mess * 1.5));
      standing += messPenalty;
      breakdown.push({ label: `Apartment Mess (${player.mess})`, value: messPenalty });
    }
  }

  if (rules.trackSocial && player.social !== undefined) {
    const social = player.social;
    if (social > 25) {
      const socialBonus = Math.min(15, Math.floor((social - 25) / 5));
      if (socialBonus > 0) {
        standing += socialBonus;
        breakdown.push({ label: `Social Standing (${social})`, value: socialBonus });
      }
    }
  }

  const dependability = player.dependability || 0;
  if (dependability > 25) {
    const depBonus = Math.min(10, Math.floor((dependability - 25) / 5));
    if (depBonus > 0) {
      standing += depBonus;
      breakdown.push({ label: `Dependability (${dependability})`, value: depBonus });
    }
  }

  standing = Math.max(0, Math.min(100, standing));
  return { standing, breakdown };
}
