import type { PlayerState } from '../gameState';
import { collectItemEffects } from '../gameState';
import type { ReducerContext, ActionHandlerResult } from './types';
import { requireConfig } from '../rules';
import { spendHours } from '../timeManager';
import { calcEconomyPrice } from '../economyEngine';
import { roundToResolution, calcMaxMess, messGrowth, safeDecrementPhysical, safeDecrementMental, calcUsedSpace, calcHousingSpaceCap } from '../statMath';

export function handleRelaxAction(
  player: PlayerState,
  _action: { type: 'relax' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  const relaxCost = requireConfig(context.campaign.config.timeRules?.relaxCost, 'timeRules.relaxCost');
  const relaxGain = context.campaign.config.timeRules.relaxGain ?? 3;
  if (nextPlayer.hoursRemaining <= 0 || (nextPlayer.hoursRemaining < relaxCost && !context.rules.allowPartialHours && !context.rules.proportionalDivisibleActions)) {
    actionLog = { key: 'action.error.notEnoughTimeRelax' };
    return { nextPlayer, actionLog };
  }
  
  const actualHours = Math.min(relaxCost, nextPlayer.hoursRemaining);
  const ratio = actualHours / relaxCost;
  nextPlayer = spendHours(nextPlayer, actualHours);
  
  let statsStr = '';
  if (context.rules.usePhysicalMentalConditions) {
    const statRules = context.campaign.config.statRules;
    const maxPhysical = nextPlayer.physicalConditionMax ?? statRules?.initialPhysicalMax ?? 50;
    const maxMental = nextPlayer.mentalConditionMax ?? 50;
    const conditionRes = context.rules.conditionResolution ?? 0.5;

    const hasFood = (nextPlayer.inventory?.freshFoodUnits || 0) > 0 || (nextPlayer.inventory?.fastFoodItems?.length || 0) > 0;

    if (hasFood) {
      const relaxEffects = collectItemEffects(nextPlayer, context.campaign, 'on_relax');
      const physBonus = relaxEffects.get('physical') || 0;
      const mentalBonus = relaxEffects.get('mental') || 0;
      const extraMess = relaxEffects.get('mess') || 0;

      const mentalStat = nextPlayer.mentalCondition ?? 50;
      const rawPhysGain = 1 + Math.floor(mentalStat / 25) + physBonus;
      const physGain = (context.rules.proportionalDivisibleActions && actualHours < relaxCost)
        ? Math.max(0.5, roundToResolution(rawPhysGain * ratio, conditionRes))
        : rawPhysGain;

      const globalMaxPhys = statRules?.initialPhysicalMax ?? 50;
      const curPhys = nextPlayer.physicalCondition ?? maxPhysical;
      let maxPhysGain = 0;

      if (curPhys >= maxPhysical && maxPhysical < globalMaxPhys) {
        // Relaxing at full health: rehabilitate Max_Physical by half of normal physGain
        maxPhysGain = roundToResolution(physGain * 0.5, conditionRes);
        if (maxPhysGain > 0) {
          nextPlayer.physicalConditionMax = Math.min(globalMaxPhys, roundToResolution(maxPhysical + maxPhysGain, conditionRes));
          // Current physicalCondition remains at old value (so player is now below max, needing a second relax to fill)
        }
      } else {
        nextPlayer.physicalCondition = Math.min(maxPhysical, curPhys + physGain);
      }

      const firstBonus = nextPlayer.turnFlags.relaxedThisTurn ? 0 : 2;
      const messPenalty = Math.floor((nextPlayer.mess || 0) / 5);
      const socialMentalBonus = Math.floor((nextPlayer.social || 0) / 15);
      const rawMentalGain = Math.max(0, firstBonus + 3 - messPenalty) + mentalBonus + socialMentalBonus;
      const mentalGain = (context.rules.proportionalDivisibleActions && actualHours < relaxCost)
        ? Math.max(0.5, roundToResolution(rawMentalGain * ratio, conditionRes))
        : rawMentalGain;
      nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? maxMental) + mentalGain);

      if (context.rules.trackMess) {
        const baseRelaxMess = statRules?.relaxMessIncrease ?? 1;
        const relaxMess = baseRelaxMess + extraMess;
        const scaledMess = (context.rules.proportionalDivisibleActions && actualHours < relaxCost)
          ? Math.max(1, Math.round(relaxMess * ratio))
          : relaxMess;
        const maxCap = calcMaxMess(nextPlayer, statRules, context.campaign);
        nextPlayer.mess = Math.min(maxCap, (nextPlayer.mess || 0) + scaledMess);
      }

      nextPlayer.homeTimeThisTurn = (nextPlayer.homeTimeThisTurn || 0) + actualHours;
      const physDesc = maxPhysGain > 0 ? `+${maxPhysGain} Max Physical` : `+${physGain} Physical`;
      statsStr = ` (${physDesc}, +${mentalGain} Mental)`;
      actionLog = { key: 'action.relax', params: { stats: statsStr } };
    } else {
      // Unfed Relaxing
      const rawPhysGain = 1;
      const rawMentalGain = 1;
      const physGain = (context.rules.proportionalDivisibleActions && actualHours < relaxCost)
        ? Math.max(0.5, roundToResolution(rawPhysGain * ratio, conditionRes))
        : rawPhysGain;
      const mentalGain = (context.rules.proportionalDivisibleActions && actualHours < relaxCost)
        ? Math.max(0.5, roundToResolution(rawMentalGain * ratio, conditionRes))
        : rawMentalGain;

      nextPlayer.physicalCondition = Math.min(maxPhysical, (nextPlayer.physicalCondition ?? maxPhysical) + physGain);
      nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? maxMental) + mentalGain);

      nextPlayer.resilienceBonus = (nextPlayer.resilienceBonus || 0) - 1;
      nextPlayer.physicalConditionMax = Math.max(1, (nextPlayer.physicalConditionMax ?? maxPhysical) - 1);
      nextPlayer.mentalConditionMax = Math.max(1, (nextPlayer.mentalConditionMax ?? maxMental) - 1);

      nextPlayer.physicalCondition = Math.min(nextPlayer.physicalConditionMax, nextPlayer.physicalCondition);
      nextPlayer.mentalCondition = Math.min(nextPlayer.mentalConditionMax, nextPlayer.mentalCondition);

      if (context.rules.trackMess) {
        const baseRelaxMess = statRules?.relaxMessIncrease ?? 1;
        const maxCap = calcMaxMess(nextPlayer, statRules, context.campaign);
        nextPlayer.mess = Math.min(maxCap, (nextPlayer.mess || 0) + baseRelaxMess);
      }

      nextPlayer.homeTimeThisTurn = (nextPlayer.homeTimeThisTurn || 0) + actualHours;
      statsStr = ` (+${physGain} Physical, +${mentalGain} Mental, -1 Max Physical, -1 Max Mental)`;
      actionLog = { key: 'action.relax_unfed', params: { stats: statsStr } };
    }
  } else {
    const scaledGain = (context.rules.proportionalDivisibleActions && actualHours < relaxCost)
      ? Math.max(1, Math.round(relaxGain * ratio))
      : relaxGain;
    nextPlayer.relaxation = Math.min(50, nextPlayer.relaxation + scaledGain);
    if (!nextPlayer.turnFlags.relaxedThisTurn) {
      nextPlayer.happiness = Math.min(100, nextPlayer.happiness + 2);
    }
    actionLog = { key: 'action.relax', params: { stats: statsStr } };
  }
  
  nextPlayer.turnFlags.relaxedThisTurn = true;
  return { nextPlayer, actionLog };
}

export function handleCleanAction(
  player: PlayerState,
  _action: { type: 'clean' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  if ((nextPlayer.mess || 0) <= 0) {
    actionLog = { key: 'action.error.alreadyClean' };
    return { nextPlayer, actionLog };
  }
  if (nextPlayer.hoursRemaining <= 0 || (nextPlayer.hoursRemaining < 3 && !context.rules.allowPartialHours && !context.rules.proportionalDivisibleActions)) {
    actionLog = { key: 'action.error.notEnoughTimeClean' };
    return { nextPlayer, actionLog };
  }
  const actualHours = Math.min(3, nextPlayer.hoursRemaining);
  const ratio = actualHours / 3;
  const conditionRes = context.rules.conditionResolution ?? 0.5;

  let cleanCost = 0;
  if (context.rules.usePhysicalMentalConditions) {
    const statRules = context.campaign.config.statRules;
    const rawCleanCost = statRules?.cleanPhysicalCost ?? 1;
    cleanCost = (context.rules.proportionalDivisibleActions && actualHours < 3)
      ? Math.max(0.5, roundToResolution(rawCleanCost * ratio, conditionRes))
      : rawCleanCost;
    const currentPhys = nextPlayer.physicalCondition ?? (statRules?.initialPhysicalMax ?? 50);
    if (currentPhys - cleanCost < 1.0) {
      actionLog = { key: 'action.error.tooExhausted' };
      return { nextPlayer, actionLog };
    }
  }
  nextPlayer = spendHours(nextPlayer, actualHours);
  let cleanStatsStr = '';
  if (context.rules.usePhysicalMentalConditions) {
    const statRules = context.campaign.config.statRules;
    const minPhysical = statRules?.minPhysicalCondition ?? 1;

    const currentPhys = nextPlayer.physicalCondition ?? (statRules?.initialPhysicalMax ?? 50);
    nextPlayer.physicalCondition = safeDecrementPhysical(currentPhys, cleanCost, minPhysical);
    nextPlayer.homeTimeThisTurn = (nextPlayer.homeTimeThisTurn || 0) + actualHours;
    cleanStatsStr = ` (-${cleanCost} Physical)`;
  }
  if (context.rules.trackMess || context.rules.usePhysicalMentalConditions) {
    const d3_1 = context.rng.nextInt(1, 3);
    const d3_2 = context.rng.nextInt(1, 3);
    const rawReduction = d3_1 + d3_2;
    const reduction = (context.rules.proportionalDivisibleActions && actualHours < 3)
      ? Math.max(1, Math.round(rawReduction * ratio))
      : rawReduction;
    const minMess = context.campaign.config.statRules?.globalMessMin ?? 0;
    nextPlayer.mess = Math.max(minMess, (nextPlayer.mess || 0) - reduction);
  }
  actionLog = { key: 'action.clean', params: { stats: cleanStatsStr } };

  return { nextPlayer, actionLog };
}

export function handleCleaningServiceAction(
  player: PlayerState,
  _action: { type: 'call_cleaning_service' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  if ((nextPlayer.mess || 0) <= 0) {
    actionLog = { key: 'action.error.alreadyClean' };
    return { nextPlayer, actionLog };
  }
  const timeCost = context.campaign.config.timeRules?.cleaningServiceCost ?? 1;
  if (nextPlayer.hoursRemaining < timeCost) {
    actionLog = { key: 'action.error.notEnoughTimeClean' };
    return { nextPlayer, actionLog };
  }
  const basePrice = context.campaign.config.economyRules?.cleaningServiceBasePrice ?? 100;
  const price = calcEconomyPrice(basePrice, context.economicIndex);
  if (nextPlayer.money < price) {
    actionLog = { key: 'action.error.notEnoughMoneyCleanService' };
    return { nextPlayer, actionLog };
  }
  nextPlayer = spendHours(nextPlayer, timeCost);
  nextPlayer.money -= price;
  const minMess = context.campaign.config.statRules?.globalMessMin ?? 0;
  nextPlayer.mess = Math.max(minMess, (nextPlayer.mess || 0) - 10);
  actionLog = { key: 'action.callCleaningService', params: { cost: price } };

  return { nextPlayer, actionLog };
}

export function handleSocializeAction(
  player: PlayerState,
  _action: { type: 'socialize_guests' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  const timeCost = context.campaign.config.timeRules?.socializeCost ?? 6;
  if (nextPlayer.hoursRemaining < timeCost) {
    actionLog = { key: 'action.error.notEnoughTimeSocialize' };
    return { nextPlayer, actionLog };
  }
  if (context.rules.spaceCapping) {
    const usedSpace = calcUsedSpace(nextPlayer, context.campaign, true);
    const spaceCap = calcHousingSpaceCap(nextPlayer, context.campaign);
    if (spaceCap - usedSpace < 10) {
      actionLog = { key: 'action.error.noSpaceSocialize' };
      return { nextPlayer, actionLog };
    }
  } else if ((nextPlayer.mess || 0) > 25) {
    actionLog = { key: 'action.error.messTooHighSocialize' };
    return { nextPlayer, actionLog };
  }
  if (context.rules.usePhysicalMentalConditions) {
    const currentPhys = nextPlayer.physicalCondition ?? 50;
    if (currentPhys - 1 < 1.0) {
      actionLog = { key: 'action.error.tooExhausted' };
      return { nextPlayer, actionLog };
    }
  }
  nextPlayer = spendHours(nextPlayer, timeCost);

  const minPhysical = nextPlayer.minPhysicalCondition ?? 1;
  const currentPhys = nextPlayer.physicalCondition ?? 50;
  nextPlayer.physicalCondition = safeDecrementPhysical(currentPhys, 1, minPhysical);

  const statRules = context.campaign.config.statRules;

  let appBonus = 0;
  if (context.rules.usePhysicalMentalConditions) {
    const socializeEffects = collectItemEffects(nextPlayer, context.campaign, 'on_socialize');
    appBonus += socializeEffects.get('social') || 0;
    appBonus += nextPlayer.activeEffects?.['vcr_social_bonus'] || 0;
  }

  const X = context.rng.nextInt(1, 3);
  const growth = messGrowth(nextPlayer.mess || 0);
  const messGen = X * growth;
  const maxMess = calcMaxMess(nextPlayer, statRules, context.campaign);
  nextPlayer.mess = Math.min(maxMess, (nextPlayer.mess || 0) + messGen);

  const mentalCost = X * growth;
  const finalMentalCost = mentalCost - appBonus;

  let cashRate = context.campaign.config.economyRules?.socializeLowCostCashCost ?? 25;
  let socialMultiplier = 1;
  if (nextPlayer.currentHousingId === 'penthouse') {
    cashRate = context.campaign.config.economyRules?.socializePenthouseCashCost ?? 75;
    socialMultiplier = 3;
  } else if (nextPlayer.currentHousingId === 'security') {
    cashRate = context.campaign.config.economyRules?.socializeSecurityCashCost ?? 50;
    socialMultiplier = 2;
  }
  const cashCost = X * cashRate;
  const fullReward = socialMultiplier * X;

  const currentMental = nextPlayer.mentalCondition ?? 25;
  const minMental = statRules?.minMentalCondition ?? 5;
  const maxMental = nextPlayer.mentalConditionMax ?? 90;
  const hasFullCash = nextPlayer.money >= cashCost;
  const hasFullMental = finalMentalCost <= 0 || currentMental >= finalMentalCost;

  let actualReward = fullReward + appBonus;
  if (hasFullCash && hasFullMental) {
    nextPlayer.money -= cashCost;
    if (finalMentalCost >= 0) {
      nextPlayer.mentalCondition = safeDecrementMental(currentMental, finalMentalCost, minMental);
    } else {
      nextPlayer.mentalCondition = Math.min(maxMental, currentMental - finalMentalCost);
    }
  } else {
    nextPlayer.money = Math.max(0, nextPlayer.money - cashCost);
    if (finalMentalCost >= 0) {
      nextPlayer.mentalCondition = safeDecrementMental(currentMental, finalMentalCost, minMental);
    } else {
      nextPlayer.mentalCondition = Math.min(maxMental, currentMental - finalMentalCost);
    }
    actualReward = Math.floor(fullReward / 2) + appBonus;
  }

  const maxSocial = statRules?.maxSocial ?? 99;
  nextPlayer.social = Math.min(maxSocial, (nextPlayer.social ?? 9) + actualReward);

  actionLog = { key: 'action.socialize', params: { reward: actualReward, guests: X } };
  return { nextPlayer, actionLog };
}

export function handleChangeClothesAction(
  player: PlayerState,
  action: { type: 'change_clothes'; clothes: 'casual' | 'dress' | 'business' | 'none' }
): ActionHandlerResult {
  const nextPlayer = structuredClone(player);
  nextPlayer.inventory.selectedClothes = action.clothes;
  const actionLog = { key: 'action.clothes.changed', params: { clothes: action.clothes } };
  return { nextPlayer, actionLog };
}
