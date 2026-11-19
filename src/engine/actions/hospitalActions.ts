import type { PlayerState, StatModification } from '../gameState';
import type { ReducerContext, ActionHandlerResult } from './types';
import { spendHours } from '../timeManager';
import { calcEconomyPrice } from '../economyEngine';
import { calcMaxMental } from '../statMath';
import { requireAdvancedStatRules, requireConfig } from '../rules';

export function handleHospitalUrgentCareAction(
  player: PlayerState,
  _action: { type: 'hospital_urgent_care' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  const costHours = 6;

  if (nextPlayer.hoursRemaining < costHours) {
    return {
      nextPlayer,
      actionLog: { key: 'action.error.notEnoughTimeHospital' }
    };
  }

  const isHospitalStaff = Boolean(
    context.rules.hospitalEmployeeHealthcare && nextPlayer.currentJobId?.startsWith('hospital_')
  );
  const baseFee = isHospitalStaff ? 40 : 80;
  const price = calcEconomyPrice(baseFee, context.economicIndex);

  if (nextPlayer.money < price) {
    return {
      nextPlayer,
      actionLog: { key: 'action.error.notEnoughMoneyHospital' }
    };
  }

  nextPlayer = spendHours(nextPlayer, costHours);
  nextPlayer.money -= price;

  const mods: StatModification[] = [{ stat: 'money', diff: -price }];

  if (context.rules.usePhysicalMentalConditions) {
    const statRules = requireAdvancedStatRules(context.campaign.config.statRules);
    const initMaxPhys = requireConfig(statRules.initialPhysicalMax, 'statRules.initialPhysicalMax');
    const startingPhys = requireConfig(statRules.startingPhysicalCondition, 'statRules.startingPhysicalCondition');
    const curPhys = nextPlayer.physicalCondition ?? startingPhys;
    const maxPhys = nextPlayer.physicalConditionMax ?? initMaxPhys;
    let physGain = 1;
    let maxPhysGain = 0;
    let tierKey = 'action.hospital.urgentCareHealthy';

    if (curPhys < 20) {
      // Critical emergency triage: lifts condition to at least 20 (+8 to +12 gain)
      tierKey = 'action.hospital.urgentCareCritical';
      const targetPhys = Math.max(curPhys + 8, 20);
      physGain = Math.min(12, Math.max(8, targetPhys - curPhys));

      // Repair damaged max physical ceiling if below initial baseline cap
      if (maxPhys < initMaxPhys) {
        maxPhysGain = 1;
        nextPlayer.physicalConditionMax = Math.min(initMaxPhys, maxPhys + 1);
        mods.push({ stat: 'maxPhysical', diff: 1 });
      }
    } else if (curPhys < 35) {
      // Worn down: routine restorative care
      tierKey = 'action.hospital.urgentCareModerate';
      physGain = 5;
    } else {
      // Healthy: minimal triage benefit
      tierKey = 'action.hospital.urgentCareHealthy';
      physGain = 1;
    }

    const effectiveMaxPhys = nextPlayer.physicalConditionMax ?? initMaxPhys;
    const oldPhys = curPhys;
    nextPlayer.physicalCondition = Math.min(effectiveMaxPhys, curPhys + physGain);
    const actualPhysGain = nextPlayer.physicalCondition - oldPhys;

    if (actualPhysGain > 0) {
      mods.push({ stat: 'physical', diff: actualPhysGain });
    }

    return {
      nextPlayer,
      actionLog: {
        key: tierKey,
        params: { cost: price, gain: actualPhysGain, maxGain: maxPhysGain },
        modifications: mods
      }
    };
  }

  // Classic rules fallback (happiness / relaxation)
  const relGain = 10;
  nextPlayer.relaxation = Math.min(100, (nextPlayer.relaxation ?? 0) + relGain);
  mods.push({ stat: 'relaxation', diff: relGain });

  return {
    nextPlayer,
    actionLog: {
      key: 'action.hospital.urgentCareSuccess',
      params: { cost: price },
      modifications: mods
    }
  };
}

export function handleHospitalTherapyAction(
  player: PlayerState,
  _action: { type: 'hospital_therapy' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  const costHours = 6;

  if (nextPlayer.hoursRemaining < costHours) {
    return {
      nextPlayer,
      actionLog: { key: 'action.error.notEnoughTimeHospital' }
    };
  }

  const isHospitalStaff = Boolean(
    context.rules.hospitalEmployeeHealthcare && nextPlayer.currentJobId?.startsWith('hospital_')
  );
  const baseFee = isHospitalStaff ? 60 : 120;
  const price = calcEconomyPrice(baseFee, context.economicIndex);

  if (nextPlayer.money < price) {
    return {
      nextPlayer,
      actionLog: { key: 'action.error.notEnoughMoneyHospital' }
    };
  }

  nextPlayer = spendHours(nextPlayer, costHours);
  nextPlayer.money -= price;

  const mods: StatModification[] = [{ stat: 'money', diff: -price }];

  if (context.rules.usePhysicalMentalConditions) {
    const statRules = requireAdvancedStatRules(context.campaign.config.statRules);

    // Expand / repair resilience bonus (+1 Max Mental)
    nextPlayer.resilienceBonus = (nextPlayer.resilienceBonus || 0) + 1;

    // Recalculate max mental with the new resilience bonus
    const currentSocial = context.rules.trackSocial ? (nextPlayer.social ?? statRules.startingSocial) : 0;
    const newMaxMental = calcMaxMental(
      nextPlayer.mess || 0,
      currentSocial,
      nextPlayer.resilienceBonus,
      nextPlayer,
      statRules,
      context.campaign
    );
    nextPlayer.mentalConditionMax = newMaxMental;

    // Boost current mental condition (+3, capped at new max)
    const oldMental = nextPlayer.mentalCondition ?? statRules.startingMentalCondition;
    nextPlayer.mentalCondition = Math.min(newMaxMental, oldMental + 3);
    const mentalGain = nextPlayer.mentalCondition - oldMental;

    if (mentalGain > 0) {
      mods.push({ stat: 'mental', diff: mentalGain });
    }
    mods.push({ stat: 'maxMental', diff: 1 });

    return {
      nextPlayer,
      actionLog: {
        key: 'action.hospital.therapySuccess',
        params: { cost: price, newMax: newMaxMental, gain: mentalGain },
        modifications: mods
      }
    };
  }

  // Classic rules fallback (happiness)
  const hapGain = 5;
  nextPlayer.happiness = Math.min(100, (nextPlayer.happiness ?? 0) + hapGain);
  mods.push({ stat: 'happiness', diff: hapGain });

  return {
    nextPlayer,
    actionLog: {
      key: 'action.hospital.therapySuccess',
      params: { cost: price },
      modifications: mods
    }
  };
}

export function handleHospitalDonateBloodAction(
  player: PlayerState,
  _action: { type: 'hospital_donate_blood' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  const costHours = 2;

  if (nextPlayer.hoursRemaining < costHours) {
    return {
      nextPlayer,
      actionLog: { key: 'action.error.notEnoughTimeHospital' }
    };
  }

  if (nextPlayer.turnFlags?.donatedBloodThisTurn) {
    return {
      nextPlayer,
      actionLog: { key: 'action.hospital.alreadyDonatedBlood' }
    };
  }

  const advStatRules = context.rules.usePhysicalMentalConditions
    ? requireAdvancedStatRules(context.campaign.config.statRules)
    : undefined;
  const startingPhys = advStatRules
    ? requireConfig(advStatRules.startingPhysicalCondition, 'statRules.startingPhysicalCondition')
    : 50;
  const curPhys = nextPlayer.physicalCondition ?? startingPhys;
  if (context.rules.usePhysicalMentalConditions && curPhys < 20) {
    return {
      nextPlayer,
      actionLog: { key: 'action.hospital.bloodDonationTooWeak' }
    };
  }

  nextPlayer = spendHours(nextPlayer, costHours);
  nextPlayer.turnFlags = {
    ...nextPlayer.turnFlags,
    donatedBloodThisTurn: true
  };

  const cashReward = 40;
  nextPlayer.money += cashReward;
  const mods: StatModification[] = [{ stat: 'money', diff: cashReward }];

  if (context.rules.usePhysicalMentalConditions && advStatRules) {
    // Net -3 physical (-4 whole blood drawn, +1 free orange juice & cookies snack)
    const minPhys = requireConfig(advStatRules.minPhysicalCondition, 'statRules.minPhysicalCondition');
    nextPlayer.physicalCondition = Math.max(minPhys, curPhys - 3);
    mods.push({ stat: 'physical', diff: -3 });

    if (context.rules.trackSocial) {
      const maxSocial = requireConfig(advStatRules.maxSocial, 'statRules.maxSocial');
      const startingSocial = requireConfig(advStatRules.startingSocial, 'statRules.startingSocial');
      nextPlayer.social = Math.min(maxSocial, (nextPlayer.social ?? startingSocial) + 1);
      mods.push({ stat: 'social', diff: 1 });
    }
  } else {
    // Classic rules
    nextPlayer.relaxation = Math.max(0, (nextPlayer.relaxation ?? 20) - 5);
    nextPlayer.happiness = Math.min(100, (nextPlayer.happiness ?? 0) + 2);
    mods.push({ stat: 'relaxation', diff: -5 }, { stat: 'happiness', diff: 2 });
  }

  return {
    nextPlayer,
    actionLog: {
      key: 'action.hospital.bloodDonationSuccess',
      params: { reward: cashReward },
      modifications: mods
    }
  };
}

export function handleHospitalCafeteriaAction(
  player: PlayerState,
  _action: { type: 'hospital_cafeteria' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  const costHours = 1;

  if (nextPlayer.hoursRemaining < costHours) {
    return {
      nextPlayer,
      actionLog: { key: 'action.error.notEnoughTimeHospital' }
    };
  }

  const isHospitalStaff = Boolean(
    context.rules.hospitalEmployeeHealthcare && nextPlayer.currentJobId?.startsWith('hospital_')
  );

  if (!isHospitalStaff) {
    return {
      nextPlayer,
      actionLog: { key: 'action.error.hospitalStaffOnly' }
    };
  }

  const baseFee = 40;
  const price = calcEconomyPrice(baseFee, context.economicIndex);

  if (nextPlayer.money < price) {
    return {
      nextPlayer,
      actionLog: { key: 'action.error.notEnoughMoneyHospital' }
    };
  }

  nextPlayer = spendHours(nextPlayer, costHours);
  nextPlayer.money -= price;

  nextPlayer.turnFlags = {
    ...nextPlayer.turnFlags,
    ateHospitalCafeteriaThisTurn: true,
    hasEaten: true
  };
  if (context.rules.enableCookingSystem) {
    nextPlayer.nutritionTier = 'fast_food';
    nextPlayer.turnFlags.mealPreparedThisTurn = 'fast_food';
  }

  // Add 1 fast food meal to inventory (consumed at turn start to prevent starvation)
  nextPlayer.inventory.fastFoodItems = [
    ...(nextPlayer.inventory.fastFoodItems || []),
    { itemId: 'hospital_tray', happinessBonus: 0 }
  ];

  const mods: StatModification[] = [{ stat: 'money', diff: -price }];

  if (context.rules.usePhysicalMentalConditions) {
    const statRules = requireAdvancedStatRules(context.campaign.config.statRules);
    const initMaxPhys = requireConfig(statRules.initialPhysicalMax, 'statRules.initialPhysicalMax');
    const startingPhys = requireConfig(statRules.startingPhysicalCondition, 'statRules.startingPhysicalCondition');
    const startingMental = requireConfig(statRules.startingMentalCondition, 'statRules.startingMentalCondition');
    const minMental = requireConfig(statRules.minMentalCondition, 'statRules.minMentalCondition');

    // Caloric nourishment: +1 Physical
    const maxPhys = nextPlayer.physicalConditionMax ?? initMaxPhys;
    nextPlayer.physicalCondition = Math.min(maxPhys, (nextPlayer.physicalCondition ?? startingPhys) + 1);
    mods.push({ stat: 'physical', diff: 1 });

    // Bland institutional mystery meat: -2 Mental
    nextPlayer.mentalCondition = Math.max(minMental, (nextPlayer.mentalCondition ?? startingMental) - 2);
    mods.push({ stat: 'mental', diff: -2 });
  } else {
    // Classic rules
    nextPlayer.happiness = Math.max(0, (nextPlayer.happiness ?? 0) - 1);
    mods.push({ stat: 'happiness', diff: -1 });
  }

  return {
    nextPlayer,
    actionLog: {
      key: 'action.hospital.cafeteriaSuccess',
      params: { cost: price },
      modifications: mods
    }
  };
}
