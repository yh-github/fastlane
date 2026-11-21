import type { PlayerState } from '../gameState';
import { collectItemEffects, markClothesWorn, isPlayerFed } from '../gameState';
import type { ReducerContext, ActionHandlerResult } from './types';
import { requireConfig, requireAdvancedStatRules, requireAdvancedTimeRules, requireAdvancedEconomyRules, getClothesSwitchingRule } from '../rules';
import { spendHours } from '../timeManager';
import { calcEconomyPrice } from '../economyEngine';
import { roundToResolution, calcMaxMess, messGrowth, safeDecrementPhysical, safeDecrementMental, calcSocializeParameters } from '../statMath';
import { resolveDecision, type ReplayContext } from '../replayTypes';

export function handleRelaxAction(
  player: PlayerState,
  _action: { type: 'relax' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  const relaxCost = requireConfig(context.campaign.config.timeRules.relaxCost, 'timeRules.relaxCost');
  const relaxGain = context.campaign.config.timeRules.relaxGain;
  if (nextPlayer.hoursRemaining <= 0 || (nextPlayer.hoursRemaining < relaxCost && !context.rules.allowPartialHours && !context.rules.proportionalDivisibleActions)) {
    actionLog = { key: 'action.error.notEnoughTimeRelax' };
    return { nextPlayer, actionLog };
  }
  
  const actualHours = Math.min(relaxCost, nextPlayer.hoursRemaining);
  const ratio = actualHours / relaxCost;
  nextPlayer = spendHours(nextPlayer, actualHours);
  
  let statsStr = '';
  if (context.rules.usePhysicalMentalConditions) {
    const statRules = requireAdvancedStatRules(context.campaign.config.statRules);
    const initMaxPhys = requireConfig(statRules.initialPhysicalMax, 'statRules.initialPhysicalMax');
    const globalMaxPhys = requireConfig(statRules.globalMaxPhysicalCondition, 'statRules.globalMaxPhysicalCondition');
    const maxPhysical = nextPlayer.physicalConditionMax ?? initMaxPhys;
    const defaultMaxMental = requireConfig(statRules.maxMentalCondition, 'statRules.maxMentalCondition');
    const maxMental = nextPlayer.mentalConditionMax ?? defaultMaxMental;
    const startingMental = requireConfig(statRules.startingMentalCondition, 'statRules.startingMentalCondition');
    const conditionRes = context.rules.conditionResolution;

    const isFed = isPlayerFed(nextPlayer, context.rules);

    if (isFed) {
      const relaxEffects = collectItemEffects(nextPlayer, context.campaign, 'on_relax');
      const physBonus = relaxEffects.get('physical') || 0;
      const mentalBonus = relaxEffects.get('mental') || 0;
      const extraMess = relaxEffects.get('mess') || 0;

      const homeRelaxes = (nextPlayer.turnFlags.homeRelaxesThisTurn || 0) + 1;
      nextPlayer.turnFlags.homeRelaxesThisTurn = homeRelaxes;

      const mentalStat = nextPlayer.mentalCondition ?? startingMental;
      const rawPhysGain = 1 + Math.floor(mentalStat / 25) + physBonus;
      const physGain = (context.rules.proportionalDivisibleActions && actualHours < relaxCost)
        ? Math.max(0.5, roundToResolution(rawPhysGain * ratio, conditionRes))
        : rawPhysGain;

      const curPhys = nextPlayer.physicalCondition ?? maxPhysical;
      let actualPhysGain = 0;
      let actualMaxPhysGain = 0;

      if (curPhys >= maxPhysical && maxPhysical < globalMaxPhys) {
        // Relaxing at full health: rehabilitate Max_Physical by half of normal physGain up to globalMaxPhys
        const rawMaxPhysGain = roundToResolution(physGain * 0.5, conditionRes);
        const newMaxPhys = Math.min(globalMaxPhys, roundToResolution(maxPhysical + rawMaxPhysGain, conditionRes));
        actualMaxPhysGain = roundToResolution(newMaxPhys - maxPhysical, conditionRes);
        if (actualMaxPhysGain > 0) {
          nextPlayer.physicalConditionMax = newMaxPhys;
          // Current physicalCondition remains at old value (so player is now below max, needing a second relax to fill)
        }
      } else {
        const newPhys = Math.min(maxPhysical, roundToResolution(curPhys + physGain, conditionRes));
        actualPhysGain = roundToResolution(newPhys - curPhys, conditionRes);
        nextPlayer.physicalCondition = newPhys;
      }

      const firstBonus = nextPlayer.turnFlags.relaxedThisTurn ? 0 : 2;
      const messPenalty = Math.floor((nextPlayer.mess || 0) / 5);
      const socialMentalBonus = Math.floor((nextPlayer.social || 0) / 15);
      const rawMentalGain = Math.max(0, firstBonus + 3 - messPenalty) + mentalBonus + socialMentalBonus;
      const mentalGain = (context.rules.proportionalDivisibleActions && actualHours < relaxCost)
        ? Math.max(0.5, roundToResolution(rawMentalGain * ratio, conditionRes))
        : rawMentalGain;
      const curMental = nextPlayer.mentalCondition ?? maxMental;
      const newMental = Math.min(maxMental, roundToResolution(curMental + mentalGain, conditionRes));
      const actualMentalGain = roundToResolution(newMental - curMental, conditionRes);
      nextPlayer.mentalCondition = newMental;

      if (context.rules.trackMess) {
        const baseRelaxMess = statRules.relaxMessIncrease;
        const relaxMess = baseRelaxMess + extraMess;
        const scaledMess = (context.rules.proportionalDivisibleActions && actualHours < relaxCost)
          ? Math.max(1, Math.round(relaxMess * ratio))
          : relaxMess;
        const maxCap = calcMaxMess(nextPlayer, statRules, context.campaign);
        nextPlayer.mess = Math.min(maxCap, (nextPlayer.mess || 0) + scaledMess);
      }

      nextPlayer.homeTimeThisTurn = (nextPlayer.homeTimeThisTurn || 0) + actualHours;
      const statParts: string[] = [];
      if (actualMaxPhysGain > 0) statParts.push(`+${actualMaxPhysGain} Max Physical`);
      else if (actualPhysGain > 0) statParts.push(`+${actualPhysGain} Physical`);
      if (actualMentalGain > 0) statParts.push(`+${actualMentalGain} Mental`);
      statsStr = statParts.length > 0 ? ` (${statParts.join(', ')})` : '';
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
        const baseRelaxMess = statRules.relaxMessIncrease;
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
  context: ReducerContext,
  replayContext?: ReplayContext
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
  const conditionRes = context.rules.conditionResolution;

  let cleanCost = 0;
  if (context.rules.usePhysicalMentalConditions) {
    const statRules = requireAdvancedStatRules(context.campaign.config.statRules);
    const rawCleanCost = statRules.cleanPhysicalCost;
    cleanCost = (context.rules.proportionalDivisibleActions && actualHours < 3)
      ? Math.max(0.5, roundToResolution(rawCleanCost * ratio, conditionRes))
      : rawCleanCost;
    const currentPhys = nextPlayer.physicalCondition ?? statRules.initialPhysicalMax;
    if (currentPhys - cleanCost < 1.0) {
      actionLog = { key: 'action.error.tooExhausted' };
      return { nextPlayer, actionLog };
    }
  }
  nextPlayer = spendHours(nextPlayer, actualHours);
  let cleanStatsStr = '';
  if (context.rules.usePhysicalMentalConditions) {
    const statRules = requireAdvancedStatRules(context.campaign.config.statRules);
    const minPhysical = statRules.minPhysicalCondition;

    const currentPhys = nextPlayer.physicalCondition ?? statRules.initialPhysicalMax;
    nextPlayer.physicalCondition = safeDecrementPhysical(currentPhys, cleanCost, minPhysical);
    nextPlayer.homeTimeThisTurn = (nextPlayer.homeTimeThisTurn || 0) + actualHours;
    cleanStatsStr = ` (-${cleanCost} Physical)`;
  }
  if (context.rules.trackMess) {
    const statRules = requireAdvancedStatRules(context.campaign.config.statRules);
    const effectiveReplay: ReplayContext = replayContext ?? {
      inDecisions: context.engineDecisions || [],
      outDecisions: []
    };
    const rawReduction = resolveDecision(
      effectiveReplay,
      `clean_mess_roll_${nextPlayer.id}`,
      () => context.rng.nextInt(1, 3) + context.rng.nextInt(1, 3)
    );
    const reduction = (context.rules.proportionalDivisibleActions && actualHours < 3)
      ? Math.max(1, Math.round(rawReduction * ratio))
      : rawReduction;
    const minMess = statRules.globalMessMin;
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
  const timeRules = requireAdvancedTimeRules(context.campaign.config.timeRules);
  const timeCost = timeRules.cleaningServiceCost;
  if (nextPlayer.hoursRemaining < timeCost) {
    actionLog = { key: 'action.error.notEnoughTimeClean' };
    return { nextPlayer, actionLog };
  }
  const economyRules = requireAdvancedEconomyRules(context.campaign.config.economyRules);
  const basePrice = economyRules.cleaningServiceBasePrice;
  const price = calcEconomyPrice(basePrice, context.economicIndex);
  if (nextPlayer.money < price) {
    actionLog = { key: 'action.error.notEnoughMoneyCleanService' };
    return { nextPlayer, actionLog };
  }
  nextPlayer = spendHours(nextPlayer, timeCost);
  nextPlayer.money -= price;
  const statRules = requireAdvancedStatRules(context.campaign.config.statRules);
  const minMess = statRules.globalMessMin;
  nextPlayer.mess = Math.max(minMess, (nextPlayer.mess || 0) - 10);
  actionLog = { key: 'action.callCleaningService', params: { cost: price } };

  return { nextPlayer, actionLog };
}

export function handleSocializeAction(
  player: PlayerState,
  _action: { type: 'socialize_guests' },
  context: ReducerContext,
  replayContext?: ReplayContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  const params = calcSocializeParameters(nextPlayer, context.campaign, context.rules);

  if (!params.hasTime) {
    actionLog = { key: 'action.error.notEnoughTimeSocialize' };
    return { nextPlayer, actionLog };
  }
  if (params.isNoSpace) {
    if (context.rules.spaceCapping) {
      actionLog = { key: 'action.error.noSpaceSocialize' };
    } else {
      actionLog = { key: 'action.error.messTooHighSocialize' };
    }
    return { nextPlayer, actionLog };
  }
  if (params.isTooExhausted) {
    actionLog = { key: 'action.error.tooExhausted' };
    return { nextPlayer, actionLog };
  }

  nextPlayer = spendHours(nextPlayer, params.timeCost);

  const statRules = requireAdvancedStatRules(context.campaign.config.statRules);
  const minPhysical = nextPlayer.minPhysicalCondition ?? requireConfig(statRules.initialMinPhysical, 'statRules.initialMinPhysical');
  const currentPhys = nextPlayer.physicalCondition ?? requireConfig(statRules.startingPhysicalCondition, 'statRules.startingPhysicalCondition');
  nextPlayer.physicalCondition = safeDecrementPhysical(currentPhys, 1, minPhysical);

  // Roll guests based on housing tier dice (1d3 low-cost, 2d3 security, 3d3 penthouse)
  const rawRoll = resolveDecision(replayContext, `socialize_guests_roll_${nextPlayer.id}`, () => {
    let total = 0;
    for (let i = 0; i < params.diceCount; i++) {
      total += context.rng.nextInt(1, 3);
    }
    return total;
  });

  // Dynamic space capping: clamp guests to available room (10 free space per guest)
  const X = context.rules.spaceCapping
    ? Math.max(1, Math.min(rawRoll, params.maxGuestsBySpace))
    : rawRoll;

  const growth = messGrowth(nextPlayer.mess || 0);
  const messGen = X * growth;
  const maxMess = calcMaxMess(nextPlayer, statRules, context.campaign);
  nextPlayer.mess = Math.min(maxMess, (nextPlayer.mess || 0) + messGen);

  const mentalCost = X * growth;
  const finalMentalCost = mentalCost - params.appBonus;

  const cashCost = X * params.cashRate;
  const fullReward = X; // 1:1 base social reward per guest

  const currentMental = nextPlayer.mentalCondition ?? requireConfig(statRules.startingMentalCondition, 'statRules.startingMentalCondition');
  const minMental = requireConfig(statRules.minMentalCondition, 'statRules.minMentalCondition');
  const maxMental = nextPlayer.mentalConditionMax ?? requireConfig(statRules.maxMentalCondition, 'statRules.maxMentalCondition');
  const hasFullCash = nextPlayer.money >= cashCost;
  const hasFullMental = finalMentalCost <= 0 || currentMental >= finalMentalCost;

  let actualReward = fullReward + params.appBonus;
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
    actualReward = Math.floor(fullReward / 2) + params.appBonus;
  }

  const maxSocial = requireConfig(statRules.maxSocial, 'statRules.maxSocial');
  const startingSocial = requireConfig(statRules.startingSocial, 'statRules.startingSocial');
  nextPlayer.social = Math.min(maxSocial, (nextPlayer.social ?? startingSocial) + actualReward);

  actionLog = { key: 'action.socialize', params: { reward: actualReward, guests: X } };
  return { nextPlayer, actionLog };
}

export function handleChangeClothesAction(
  player: PlayerState,
  action: { type: 'change_clothes'; clothes: 'casual' | 'dress' | 'business' | 'none' },
  context?: ReducerContext
): ActionHandlerResult {
  // 1. Ownership check (unless 'none')
  if (action.clothes === 'casual' && (player.inventory.casualClothesWeeks || 0) <= 0) {
    return { nextPlayer: player, actionLog: { key: 'action.clothes.notOwned', params: { clothes: action.clothes } } };
  }
  if (action.clothes === 'dress' && (player.inventory.dressClothesWeeks || 0) <= 0) {
    return { nextPlayer: player, actionLog: { key: 'action.clothes.notOwned', params: { clothes: action.clothes } } };
  }
  if (action.clothes === 'business' && (player.inventory.businessClothesWeeks || 0) <= 0) {
    return { nextPlayer: player, actionLog: { key: 'action.clothes.notOwned', params: { clothes: action.clothes } } };
  }

  // 2. Location & Policy checks
  if (context?.rules) {
    const rule = getClothesSwitchingRule(context.rules);
    if (rule === 'autoBest') {
      return { nextPlayer: player, actionLog: { key: 'action.clothes.autoEquipActive' } };
    }

    if (rule === 'homeOnly' || rule === 'homeOrStore') {
      const currentNode = context.campaign.map?.nodes?.find(n => n.id === player.position);
      const currentBuildingId = currentNode?.buildingId;
      const currentHousing = context.campaign.housing?.find(h => h.id === player.currentHousingId);
      const isAtHome = currentBuildingId === 'home' || Boolean(currentHousing?.homeNodeId && player.position === currentHousing.homeNodeId);

      const isAtClothingStore = currentBuildingId === 'qt_clothing' ||
        currentBuildingId === 'z_mart' ||
        Boolean(context.campaign.items?.some(i => i.category === 'clothes' && i.store === currentBuildingId));

      if (rule === 'homeOnly' && !isAtHome) {
        return { nextPlayer: player, actionLog: { key: 'action.clothes.homeOnly' } };
      }
      if (rule === 'homeOrStore' && !isAtHome && !isAtClothingStore) {
        return { nextPlayer: player, actionLog: { key: 'action.clothes.homeOrStoreOnly' } };
      }
    }
  }

  let nextPlayer = structuredClone(player);
  nextPlayer.inventory.selectedClothes = action.clothes;

  // If actions have already been performed this turn, mark newly equipped clothes as worn
  const hoursPerTurn = context?.campaign?.config?.timeRules?.hoursPerTurn ?? 60;
  if (action.clothes !== 'none' && nextPlayer.hoursRemaining < hoursPerTurn) {
    nextPlayer = markClothesWorn(nextPlayer, action.clothes);
  }

  const actionLog = { key: 'action.clothes.changed', params: { clothes: action.clothes } };
  return { nextPlayer, actionLog };
}

export function handlePrepMealAction(
  player: PlayerState,
  action: { type: 'prep_meal'; mealType: 'home_cooked' | 'microwave' | 'cold_meal' | 'canned' | 'fast_food' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  const statRules = requireAdvancedStatRules(context.campaign.config.statRules);
  const maxPhysical = nextPlayer.physicalConditionMax ?? requireConfig(statRules.initialPhysicalMax, 'statRules.initialPhysicalMax');
  const maxMental = nextPlayer.mentalConditionMax ?? requireConfig(statRules.maxMentalCondition, 'statRules.maxMentalCondition');

  const hasStove = nextPlayer.inventory.appliances?.some(
    a => (a.id === 'stove' || context.campaign.items.find(i => i.id === a.id)?.tags?.includes('stove')) && !a.isBroken
  );
  const hasMicrowave = nextPlayer.inventory.appliances?.some(
    a => (a.id === 'microwave' || context.campaign.items.find(i => i.id === a.id)?.tags?.includes('microwave')) && !a.isBroken
  );
  const hasFridge = nextPlayer.inventory.appliances?.some(
    a => (a.id === 'refrigerator' || context.campaign.items.find(i => i.id === a.id)?.tags?.includes('refrigerator')) && !a.isBroken
  );
  const hasFreezer = nextPlayer.inventory.appliances?.some(
    a => (a.id === 'freezer' || context.campaign.items.find(i => i.id === a.id)?.tags?.includes('freezer')) && !a.isBroken
  );

  if (action.mealType === 'home_cooked') {
    if ((nextPlayer.inventory.freshFoodUnits || 0) < 1) {
      return { nextPlayer, actionLog: { key: 'action.error.noFreshFood' } };
    }
    if (!hasStove) {
      return { nextPlayer, actionLog: { key: 'action.error.needStove' } };
    }

    // Exhaustion safeguard: player must have >= 1.5 Physical to cook on stove
    const currentPhys = nextPlayer.physicalCondition ?? maxPhysical;
    if (currentPhys < 1.5) {
      return { nextPlayer, actionLog: { key: 'action.error.tooExhaustedToCook' } };
    }

    // Time: Base 2.5h, 1.5h with microwave
    // If standalone freezer without fridge and without microwave: +1.0h thaw delay
    let timeNeeded = hasMicrowave ? 1.5 : 2.5;
    if (hasFreezer && !hasFridge && !hasMicrowave) {
      timeNeeded += 1.0;
    }

    if (nextPlayer.hoursRemaining < timeNeeded) {
      return { nextPlayer, actionLog: { key: 'action.error.notEnoughTimeCook' } };
    }

    // Deduct time
    nextPlayer = spendHours(nextPlayer, timeNeeded);

    // Consume 1 fresh food unit
    nextPlayer.inventory.freshFoodUnits--;

    // Labor cost: 1.0 Physical
    const minPhysical = nextPlayer.minPhysicalCondition ?? statRules.initialMinPhysical;
    nextPlayer.physicalCondition = safeDecrementPhysical(nextPlayer.physicalCondition ?? maxPhysical, 1.0, minPhysical);

    // Mess produced: 2 mess (1 with microwave)
    const messAdded = hasMicrowave ? 1 : 2;
    if (context.rules.trackMess) {
      const maxCap = calcMaxMess(nextPlayer, statRules, context.campaign);
      nextPlayer.mess = Math.min(maxCap, (nextPlayer.mess || 0) + messAdded);
    }

    // Immediate yield: +2.5 Physical (net +1.5 Physical), +2.0 Mental
    const physGain = 2.5;
    const mentalGain = 2.0;
    nextPlayer.physicalCondition = Math.min(maxPhysical, (nextPlayer.physicalCondition ?? maxPhysical) + physGain);
    nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? maxMental) + mentalGain);

    nextPlayer.turnFlags.hasEaten = true;
    nextPlayer.turnFlags.mealPreparedThisTurn = 'home_cooked';
    nextPlayer.nutritionTier = 'home_cooked';
    nextPlayer.consecutiveCannedWeeks = 0;

    actionLog = {
      key: 'action.cook.home_cooked',
      params: { time: timeNeeded, physGain: 1.5, mentalGain: 2.0, mess: messAdded }
    };
    return { nextPlayer, actionLog };
  }

  if (action.mealType === 'microwave') {
    if ((nextPlayer.inventory.freshFoodUnits || 0) < 1) {
      return { nextPlayer, actionLog: { key: 'action.error.noFreshFood' } };
    }
    if (!hasMicrowave) {
      return { nextPlayer, actionLog: { key: 'action.error.needMicrowave' } };
    }

    const timeNeeded = 1.0;
    if (nextPlayer.hoursRemaining < timeNeeded) {
      return { nextPlayer, actionLog: { key: 'action.error.notEnoughTimeCook' } };
    }

    nextPlayer = spendHours(nextPlayer, timeNeeded);
    nextPlayer.inventory.freshFoodUnits--;

    const messAdded = 1;
    if (context.rules.trackMess) {
      const maxCap = calcMaxMess(nextPlayer, statRules, context.campaign);
      nextPlayer.mess = Math.min(maxCap, (nextPlayer.mess || 0) + messAdded);
    }

    const physGain = 0.5;
    const mentalGain = 1.0;
    nextPlayer.physicalCondition = Math.min(maxPhysical, (nextPlayer.physicalCondition ?? maxPhysical) + physGain);
    nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? maxMental) + mentalGain);

    nextPlayer.turnFlags.hasEaten = true;
    nextPlayer.turnFlags.mealPreparedThisTurn = 'microwave';
    nextPlayer.nutritionTier = 'microwave';
    nextPlayer.consecutiveCannedWeeks = 0;

    actionLog = {
      key: 'action.cook.microwave',
      params: { time: timeNeeded, physGain: 0.5, mentalGain: 1.0, mess: messAdded }
    };
    return { nextPlayer, actionLog };
  }

  if (action.mealType === 'cold_meal') {
    if ((nextPlayer.inventory.freshFoodUnits || 0) < 1) {
      return { nextPlayer, actionLog: { key: 'action.error.noFreshFood' } };
    }

    let timeNeeded = 0.5;
    if (hasFreezer && !hasFridge && !hasMicrowave) {
      timeNeeded += 1.0; // frozen without microwave requires thaw delay
    }

    if (nextPlayer.hoursRemaining < timeNeeded) {
      return { nextPlayer, actionLog: { key: 'action.error.notEnoughTimePrep' } };
    }

    nextPlayer = spendHours(nextPlayer, timeNeeded);
    nextPlayer.inventory.freshFoodUnits--;

    const mentalGain = 0.5;
    nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? maxMental) + mentalGain);

    nextPlayer.turnFlags.hasEaten = true;
    nextPlayer.turnFlags.mealPreparedThisTurn = 'cold_meal';
    nextPlayer.nutritionTier = 'cold_meal';
    nextPlayer.consecutiveCannedWeeks = 0;

    actionLog = {
      key: 'action.cook.cold_meal',
      params: { time: timeNeeded, mentalGain: 0.5 }
    };
    return { nextPlayer, actionLog };
  }

  if (action.mealType === 'canned') {
    if ((nextPlayer.inventory.cannedFoodUnits || 0) < 1) {
      return { nextPlayer, actionLog: { key: 'action.error.noCannedFood' } };
    }

    const timeNeeded = hasMicrowave ? 0.5 : 1.0;
    if (nextPlayer.hoursRemaining < timeNeeded) {
      return { nextPlayer, actionLog: { key: 'action.error.notEnoughTimePrep' } };
    }

    // Deduct time
    nextPlayer = spendHours(nextPlayer, timeNeeded);

    // Consume 1 canned food unit
    nextPlayer.inventory.cannedFoodUnits = (nextPlayer.inventory.cannedFoodUnits || 0) - 1;

    // Mess: 1 mess without microwave, 0 with microwave
    const messAdded = hasMicrowave ? 0 : 1;
    if (context.rules.trackMess && messAdded > 0) {
      const maxCap = calcMaxMess(nextPlayer, statRules, context.campaign);
      nextPlayer.mess = Math.min(maxCap, (nextPlayer.mess || 0) + messAdded);
    }

    // Mental penalty: -1 Mental
    const minMental = nextPlayer.mentalConditionMin ?? statRules.minMentalCondition;
    nextPlayer.mentalCondition = safeDecrementMental(nextPlayer.mentalCondition ?? maxMental, 1, minMental);

    // Physical penalty: -1 Max Physical upon eating canned rations
    const minPhys = nextPlayer.minPhysicalCondition ?? statRules.initialMinPhysical;
    nextPlayer.physicalConditionMax = Math.max(minPhys, (nextPlayer.physicalConditionMax ?? maxPhysical) - 1);
    nextPlayer.physicalCondition = Math.min(nextPlayer.physicalConditionMax, nextPlayer.physicalCondition ?? maxPhysical);
    nextPlayer.consecutiveCannedWeeks = 0;

    nextPlayer.turnFlags.hasEaten = true;
    nextPlayer.turnFlags.mealPreparedThisTurn = 'canned';
    nextPlayer.nutritionTier = 'canned';

    actionLog = {
      key: 'action.cook.canned',
      params: { time: timeNeeded }
    };
    return { nextPlayer, actionLog };
  }

  if (action.mealType === 'fast_food') {
    if (!nextPlayer.inventory.fastFoodItems || nextPlayer.inventory.fastFoodItems.length === 0) {
      return { nextPlayer, actionLog: { key: 'action.error.noFastFood' } };
    }

    // Consume 1 fast food meal
    const eatenMeal = nextPlayer.inventory.fastFoodItems[0];
    nextPlayer.inventory.fastFoodItems = nextPlayer.inventory.fastFoodItems.slice(1);

    // Immediate yield: +1 Mental, +1 Social
    nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? maxMental) + 1);
    if (context.rules.trackSocial) {
      nextPlayer.social = Math.min(statRules.maxSocial, (nextPlayer.social || 0) + 1);
    }

    nextPlayer.turnFlags.hasEaten = true;
    nextPlayer.turnFlags.mealPreparedThisTurn = 'fast_food';
    nextPlayer.nutritionTier = 'fast_food';
    nextPlayer.consecutiveCannedWeeks = 0;

    const itemDef = context.campaign.items.find(i => i.id === eatenMeal.itemId);
    const itemName = itemDef?.name || eatenMeal.itemId;

    actionLog = {
      key: 'action.cook.fast_food',
      params: { item: itemName }
    };
    return { nextPlayer, actionLog };
  }

  return { nextPlayer };
}
