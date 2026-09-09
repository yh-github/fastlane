import type { PlayerState, GameRules } from '../gameState';
import type { CampaignBundle } from '../dataLoader';
import type { ReducerContext, ActionHandlerResult } from './types';
import { spendHours } from '../timeManager';
import { calcEconomyPrice } from '../economyEngine';
import { roundToResolution, calcMaxMess, safeDecrementPhysical, safeDecrementMental } from '../statMath';
import { applyHappinessChange } from '../statEffects';
import { resolveDecision, type ReplayContext } from '../replayTypes';
import { removeApplianceCardFromDeck } from '../weekendEngine';

export interface DiySuccessChanceBreakdown {
  baseChance: number;
  techBonus: number;
  electronicsBonus: number;
  partsBonus?: number;
  totalChance: number;
}

/**
 * Calculates DIY Fix success probability based on base (40%), Tech skill (+3% per skillTech),
 * Electronics course progress (+10pp if complete, scaled proportionally if enrolled),
 * and Spare Parts (+30pp if available/used).
 */
export function calcDiySuccessChance(
  player: PlayerState,
  campaign?: CampaignBundle,
  rules?: GameRules,
  useSpareParts?: boolean
): DiySuccessChanceBreakdown {
  const baseChance = 40;
  const techSkill = player.skillTech || 0;
  const techBonus = Math.round(techSkill * 3 * 10) / 10;

  let electronicsProgress = 0;
  if (player.degrees?.includes('electronics')) {
    electronicsProgress = 100;
  } else if (player.enrolledClasses?.['electronics'] !== undefined) {
    if (rules?.percentageEducation) {
      electronicsProgress = player.enrolledClasses['electronics'] || 0;
    } else {
      const degreeDef = campaign?.education?.find(d => d.id === 'electronics');
      const req = degreeDef?.lessonsRequired ?? 10;
      electronicsProgress = ((player.enrolledClasses['electronics'] || 0) / req) * 100;
    }
  }

  const electronicsBonus = Math.round((electronicsProgress / 10) * 10) / 10;
  const partsBonus = (useSpareParts ?? ((player.inventory?.spareParts || 0) > 0)) ? 30 : 0;
  const totalChance = Math.min(100, Math.max(0, Math.round(baseChance + techBonus + electronicsBonus + partsBonus)));

  return {
    baseChance,
    techBonus,
    electronicsBonus,
    partsBonus,
    totalChance
  };
}

/**
 * Calculates Repairman service cost (10% of catalog base price, adjusted for economy).
 */
export function calcRepairmanCost(
  applianceId: string,
  economicIndex: number,
  campaign?: CampaignBundle
): number {
  const itemDef = campaign?.items?.find(i => i.id === applianceId);
  const catalogBasePrice = itemDef?.basePrice ?? 100;
  return calcEconomyPrice(Math.round(catalogBasePrice * 0.10), economicIndex);
}

/**
 * Calculates amount of Mess generated when throwing out an appliance (based on space footprint).
 */
export function calcThrowOutMess(
  applianceId: string,
  campaign?: CampaignBundle
): number {
  const itemDef = campaign?.items?.find(i => i.id === applianceId);
  return itemDef?.space ?? 10;
}

export function handleApplianceMaintenanceAction(
  player: PlayerState,
  action: { type: 'appliance_maintenance'; applianceId: string; option: 'diy' | 'repairman' | 'throw_out' },
  context: ReducerContext,
  replayContext?: ReplayContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  const appIndex = nextPlayer.inventory.appliances.findIndex(a => a.id === action.applianceId && a.isBroken);
  if (appIndex === -1) {
    actionLog = { key: 'action.error.applianceNotBroken' };
    return { nextPlayer, actionLog };
  }

  const app = nextPlayer.inventory.appliances[appIndex];
  const itemDef = context.campaign.items?.find(i => i.id === app.id);
  const formatItem = (id: string) => itemDef?.name || id.split('_').map(w => (w.toLowerCase() === 'tv' || w.toLowerCase() === 'vcr' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
  const applianceName = formatItem(app.id);

  if (action.option === 'diy') {
    // Costs 6 hours, -2 Physical, -1 Mental
    if (nextPlayer.hoursRemaining < 6) {
      actionLog = { key: 'action.error.notEnoughTime' };
      return { nextPlayer, actionLog };
    }

    if (context.rules.usePhysicalMentalConditions) {
      const currentPhys = nextPlayer.physicalCondition ?? 50;
      const currentMental = nextPlayer.mentalCondition ?? 50;
      if (currentPhys - 2 < 1.0 || currentMental - 1 < 1.0) {
        actionLog = { key: 'action.error.tooExhausted' };
        return { nextPlayer, actionLog };
      }
    }

    nextPlayer = spendHours(nextPlayer, 6);

    if (context.rules.usePhysicalMentalConditions) {
      const statRules = context.campaign.config.statRules;
      const minPhysical = statRules?.minPhysicalCondition ?? 1;
      const minMental = statRules?.minMentalCondition ?? 5;
      const currentPhys = nextPlayer.physicalCondition ?? 50;
      const currentMental = nextPlayer.mentalCondition ?? 50;
      nextPlayer.physicalCondition = safeDecrementPhysical(currentPhys, 2, minPhysical);
      nextPlayer.mentalCondition = safeDecrementMental(currentMental, 1, minMental);
    }

    const hasSpareParts = (nextPlayer.inventory?.spareParts || 0) > 0;
    if (hasSpareParts) {
      nextPlayer.inventory.spareParts = (nextPlayer.inventory.spareParts || 0) - 1;
    }

    const breakdown = calcDiySuccessChance(player, context.campaign, context.rules, hasSpareParts);
    const roll = resolveDecision(replayContext, `diy_fix_${nextPlayer.id}_${app.id}_${nextPlayer.hoursRemaining}`, () => Math.floor(context.rng.next() * 100));
    const isSuccess = roll < breakdown.totalChance;

    if (isSuccess) {
      nextPlayer.inventory.appliances[appIndex] = { ...app, isBroken: false, condition: 'used' };

      // Reward: +3 Mental Condition (or +1 Happiness), +0.5 skill_tech
      if (context.rules.usePhysicalMentalConditions) {
        const statRules = context.campaign.config.statRules;
        const maxMental = nextPlayer.mentalConditionMax ?? statRules?.maxMentalCondition ?? 50;
        nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? maxMental) + 3);
      } else {
        nextPlayer = applyHappinessChange(nextPlayer, 1, 'appliance_repair', context.rules, context.campaign.config.statRules);
      }

      nextPlayer.skillTech = Math.min(10, roundToResolution((nextPlayer.skillTech || 0) + 0.5, 0.05));
      actionLog = { key: 'action.appliance.diySuccess', params: { appliance: applianceName, chance: breakdown.totalChance, usedParts: hasSpareParts ? 1 : 0 } };
    } else {
      // Failure: remains broken, consolation +0.1 skill_tech
      nextPlayer.skillTech = Math.min(10, roundToResolution((nextPlayer.skillTech || 0) + 0.1, 0.05));
      actionLog = { key: 'action.appliance.diyFailure', params: { appliance: applianceName, chance: breakdown.totalChance, usedParts: hasSpareParts ? 1 : 0 } };
    }

    return { nextPlayer, actionLog };
  }

  if (action.option === 'repairman') {
    // Costs 1 hour, 10% of item's price, adjusted for economy
    if (nextPlayer.hoursRemaining < 1) {
      actionLog = { key: 'action.error.notEnoughTime' };
      return { nextPlayer, actionLog };
    }

    const repairCost = calcRepairmanCost(app.id, context.economicIndex, context.campaign);
    if (nextPlayer.money < repairCost) {
      actionLog = { key: 'action.error.notEnoughMoneyRepairman', params: { cost: repairCost } };
      return { nextPlayer, actionLog };
    }

    nextPlayer = spendHours(nextPlayer, 1);
    nextPlayer.money -= repairCost;
    nextPlayer.inventory.appliances[appIndex] = { ...app, isBroken: false, condition: 'new' };

    actionLog = { key: 'action.appliance.repairmanSuccess', params: { appliance: applianceName, cost: repairCost } };
    return { nextPlayer, actionLog };
  }

  if (action.option === 'throw_out') {
    // Costs 0 hours, 0 money. Appliance removed and turned into Mess
    nextPlayer.inventory.appliances = nextPlayer.inventory.appliances.filter((_, idx) => idx !== appIndex);

    // If deck-based weekends active and player owns no other copy of this appliance, remove card
    if (context.rules.alternativeWeekends && nextPlayer.weekendDecks) {
      const hasOtherCopy = nextPlayer.inventory.appliances.some(a => a.id === app.id && !a.isBroken);
      if (!hasOtherCopy) {
        nextPlayer = removeApplianceCardFromDeck(nextPlayer, app.id);
      }
    }

    const messGain = calcThrowOutMess(app.id, context.campaign);
    const maxMess = calcMaxMess(nextPlayer, context.campaign.config.statRules, context.campaign);
    nextPlayer.mess = Math.min(maxMess, (nextPlayer.mess || 0) + messGain);

    actionLog = { key: 'action.appliance.throwOutSuccess', params: { appliance: applianceName, mess: messGain } };
    return { nextPlayer, actionLog };
  }

  return { nextPlayer };
}
