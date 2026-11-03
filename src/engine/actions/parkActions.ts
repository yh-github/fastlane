import type { PlayerState, StatModification, GameEvent } from '../gameState';
import type { ReducerContext, ActionHandlerResult } from './types';
import { spendHours } from '../timeManager';
import { requireAdvancedStatRules } from '../rules';
import { resolveDecision, type ReplayContext } from '../replayTypes';

export function handlePlayArcadeAction(
  player: PlayerState,
  _action: { type: 'play_arcade' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  if (nextPlayer.hoursRemaining < 1) {
    return { nextPlayer, actionLog: { key: 'action.error.notEnoughTime' } };
  }
  if (nextPlayer.money < 5) {
    return { nextPlayer, actionLog: { key: 'action.error.notEnoughMoney' } };
  }

  nextPlayer = spendHours(nextPlayer, 1);
  nextPlayer.money -= 5;

  const playsThisTurn = nextPlayer.turnFlags?.arcadePlaysThisTurn || 0;
  nextPlayer.turnFlags = {
    ...nextPlayer.turnFlags,
    arcadePlaysThisTurn: playsThisTurn + 1
  };

  if (context.rules.usePhysicalMentalConditions) {
    const modifications: StatModification[] = [{ stat: 'money', diff: -5 }];

    if (playsThisTurn < 2) {
      // Plays 1 & 2: Good for mental health (+2) and social (+1)
      const maxMental = nextPlayer.mentalConditionMax ?? 50;
      nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? 50) + 2);
      modifications.push({ stat: 'mental', diff: 2 });

      if (context.rules.trackSocial) {
        nextPlayer.social = Math.min(100, (nextPlayer.social ?? 0) + 1);
        modifications.push({ stat: 'social', diff: 1 });
      }
    } else if (playsThisTurn === 2) {
      // Play 3: Diminishing returns (+1 mental, 0 social)
      const maxMental = nextPlayer.mentalConditionMax ?? 50;
      nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? 50) + 1);
      modifications.push({ stat: 'mental', diff: 1 });
    } else {
      // Play 4+: Playing all day causes physical fatigue / eye strain (-1 physical)
      nextPlayer.physicalCondition = Math.max(1, (nextPlayer.physicalCondition ?? 50) - 1);
      modifications.push({ stat: 'physical', diff: -1 });
    }

    return {
      nextPlayer,
      actionLog: {
        key: 'action.arcade.played',
        modifications
      }
    };
  }

  // Classic rules (usePhysicalMentalConditions is false)
  const modifications: StatModification[] = [{ stat: 'money', diff: -5 }];
  if (playsThisTurn < 2) {
    nextPlayer.happiness = Math.min(100, nextPlayer.happiness + 2);
    modifications.push({ stat: 'happiness', diff: 2 });
  } else if (playsThisTurn === 2) {
    nextPlayer.happiness = Math.min(100, nextPlayer.happiness + 1);
    modifications.push({ stat: 'happiness', diff: 1 });
  }

  return {
    nextPlayer,
    actionLog: {
      key: 'action.arcade.played',
      modifications
    }
  };
}

function resolveParkEncounter(
  player: PlayerState,
  activity: 'stroll' | 'bench' | 'jog',
  context: ReducerContext
): { nextPlayer: PlayerState; extraEvents: GameEvent[] } {
  let nextPlayer = structuredClone(player);
  const extraEvents: GameEvent[] = [];

  const enableEncounters = context.rules.enableParkSystem ?? context.rules.usePhysicalMentalConditions;
  if (!enableEncounters) {
    return { nextPlayer, extraEvents };
  }

  const rng = context.rng;
  const replayContext: ReplayContext = { inDecisions: context.engineDecisions || [], outDecisions: [] };
  const actionCounter = (nextPlayer.turnFlags?.parkStrollsThisTurn || 0) +
                        (nextPlayer.turnFlags?.parkBenchesThisTurn || 0) +
                        (nextPlayer.turnFlags?.parkJogsThisTurn || 0);

  // 1. Street Pickpocketing / Mugging Risk if holding significant unbanked cash
  if (nextPlayer.money >= 150) {
    const baseTheftChance = activity === 'bench' ? 0.25 : (activity === 'stroll' ? 0.12 : 0.08);
    const theftBonus = nextPlayer.money >= 300 ? 0.10 : 0;
    const theftChance = baseTheftChance + theftBonus;
    const theftRoll = resolveDecision(
      replayContext,
      `park_theft_${nextPlayer.id}_${context.turn}_${actionCounter}`,
      () => rng.next()
    );

    if (theftRoll < theftChance) {
      const rate = activity === 'bench' ? 0.20 : 0.15;
      const stolen = Math.min(100, Math.max(25, Math.floor(nextPlayer.money * rate)));
      nextPlayer.money = Math.max(0, nextPlayer.money - stolen);
      const mentalLoss = activity === 'bench' ? 2 : 1;
      const mods: StatModification[] = [{ stat: 'money', diff: -stolen }];
      if (context.rules.usePhysicalMentalConditions) {
        nextPlayer.mentalCondition = Math.max(1, (nextPlayer.mentalCondition ?? 50) - mentalLoss);
        mods.push({ stat: 'mental', diff: -mentalLoss });
      } else {
        nextPlayer.happiness = Math.max(0, nextPlayer.happiness - 2);
        mods.push({ stat: 'happiness', diff: -2 });
      }

      extraEvents.push({
        key: 'events.park.pickpocket',
        params: { stolen, loss: stolen },
        modifications: mods
      });
      return { nextPlayer, extraEvents };
    }
  }

  // 2. Outdoor Environmental & Social Encounters (~35% chance)
  const encounterChance = activity === 'bench' ? 0.40 : 0.35;
  const encounterRoll = resolveDecision(
    replayContext,
    `park_event_trigger_${nextPlayer.id}_${context.turn}_${actionCounter}`,
    () => rng.next()
  );

  if (encounterRoll >= encounterChance) {
    return { nextPlayer, extraEvents };
  }

  const poolRoll = resolveDecision(
    replayContext,
    `park_event_pick_${nextPlayer.id}_${context.turn}_${actionCounter}`,
    () => Math.floor(rng.next() * 6)
  );

  if (poolRoll === 0) {
    // Sunny breeze / peaceful weather
    if (context.rules.usePhysicalMentalConditions) {
      const maxPhys = nextPlayer.physicalConditionMax ?? 50;
      const maxMental = nextPlayer.mentalConditionMax ?? 50;
      nextPlayer.physicalCondition = Math.min(maxPhys, (nextPlayer.physicalCondition ?? 50) + 1);
      nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? 50) + 1);
      extraEvents.push({
        key: 'events.park.sunnyBreeze',
        modifications: [{ stat: 'physical', diff: 1 }, { stat: 'mental', diff: 1 }]
      });
    } else {
      nextPlayer.happiness = Math.min(100, nextPlayer.happiness + 2);
      extraEvents.push({
        key: 'events.park.sunnyBreeze',
        modifications: [{ stat: 'happiness', diff: 2 }]
      });
    }
  } else if (poolRoll === 1) {
    // Street busker music
    if (context.rules.usePhysicalMentalConditions) {
      const maxMental = nextPlayer.mentalConditionMax ?? 50;
      nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? 50) + 2);
      extraEvents.push({
        key: 'events.park.busker',
        modifications: [{ stat: 'mental', diff: 2 }]
      });
    } else {
      nextPlayer.happiness = Math.min(100, nextPlayer.happiness + 2);
      extraEvents.push({
        key: 'events.park.busker',
        modifications: [{ stat: 'happiness', diff: 2 }]
      });
    }
  } else if (poolRoll === 2) {
    // Friendly dog
    const mods: StatModification[] = [];
    if (context.rules.trackSocial) {
      nextPlayer.social = Math.min(99, (nextPlayer.social ?? 50) + 1);
      mods.push({ stat: 'social', diff: 1 });
    }
    if (context.rules.usePhysicalMentalConditions) {
      const maxMental = nextPlayer.mentalConditionMax ?? 50;
      nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? 50) + 1);
      mods.push({ stat: 'mental', diff: 1 });
    } else {
      nextPlayer.happiness = Math.min(100, nextPlayer.happiness + 1);
      mods.push({ stat: 'happiness', diff: 1 });
    }
    extraEvents.push({
      key: 'events.park.friendlyDog',
      modifications: mods
    });
  } else if (poolRoll === 3) {
    // Found loose cash
    nextPlayer.money += 5;
    const mods: StatModification[] = [{ stat: 'money', diff: 5 }];
    if (context.rules.usePhysicalMentalConditions) {
      const maxMental = nextPlayer.mentalConditionMax ?? 50;
      nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? 50) + 1);
      mods.push({ stat: 'mental', diff: 1 });
    } else {
      nextPlayer.happiness = Math.min(100, nextPlayer.happiness + 1);
      mods.push({ stat: 'happiness', diff: 1 });
    }
    extraEvents.push({
      key: 'events.park.foundMoney',
      modifications: mods
    });
  } else if (poolRoll === 4) {
    // Sudden rainstorm
    if (context.rules.usePhysicalMentalConditions) {
      nextPlayer.physicalCondition = Math.max(1, (nextPlayer.physicalCondition ?? 50) - 1);
      extraEvents.push({
        key: 'events.park.suddenRain',
        modifications: [{ stat: 'physical', diff: -1 }]
      });
    } else {
      nextPlayer.relaxation = Math.max(0, nextPlayer.relaxation - 1);
      extraEvents.push({
        key: 'events.park.suddenRain',
        modifications: [{ stat: 'relaxation', diff: -1 }]
      });
    }
  } else {
    // Pushy solicitor / aggressive petitioner
    const mods: StatModification[] = [];
    if (context.rules.usePhysicalMentalConditions) {
      nextPlayer.mentalCondition = Math.max(1, (nextPlayer.mentalCondition ?? 50) - 1);
      mods.push({ stat: 'mental', diff: -1 });
    } else {
      nextPlayer.happiness = Math.max(0, nextPlayer.happiness - 1);
      mods.push({ stat: 'happiness', diff: -1 });
    }
    if (context.rules.trackSocial) {
      nextPlayer.social = Math.max(1, (nextPlayer.social ?? 50) - 1);
      mods.push({ stat: 'social', diff: -1 });
    }
    extraEvents.push({
      key: 'events.park.solicitor',
      modifications: mods
    });
  }

  return { nextPlayer, extraEvents };
}

export function handleParkStrollAction(
  player: PlayerState,
  _action: { type: 'stroll_park' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  const strollCost = 2;
  if (nextPlayer.hoursRemaining < strollCost) {
    return { nextPlayer, actionLog: { key: 'action.error.notEnoughTime' } };
  }

  nextPlayer = spendHours(nextPlayer, strollCost);

  const strolls = nextPlayer.turnFlags?.parkStrollsThisTurn || 0;
  nextPlayer.turnFlags = {
    ...nextPlayer.turnFlags,
    parkStrollsThisTurn: strolls + 1,
    hasFreshAir: true
  };

  const actionLogs: GameEvent[] = [];

  if (context.rules.usePhysicalMentalConditions) {
    const maxPhys = nextPlayer.physicalConditionMax ?? 50;
    const maxMental = nextPlayer.mentalConditionMax ?? 50;
    let physGain = 0;
    let mentalGain = 0;

    if (strolls === 0) {
      // First stroll: Full refresh (+1 Phys, +1 Mental)
      physGain = 1;
      mentalGain = 1;
    } else if (strolls === 1) {
      // Second stroll: Moderate mental refresh (+0 Phys, +1 Mental)
      mentalGain = 1;
    } else {
      // 3rd+ stroll: Diminishing returns (+0, +0)
      physGain = 0;
      mentalGain = 0;
    }

    if (physGain > 0) {
      nextPlayer.physicalCondition = Math.min(maxPhys, (nextPlayer.physicalCondition ?? 50) + physGain);
    }
    if (mentalGain > 0) {
      nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? 50) + mentalGain);
    }

    const mods: StatModification[] = [];
    if (physGain > 0) mods.push({ stat: 'physical', diff: physGain });
    if (mentalGain > 0) mods.push({ stat: 'mental', diff: mentalGain });

    actionLogs.push({
      key: strolls < 2 ? 'action.park.stroll' : 'action.park.strollDiminished',
      modifications: mods
    });
  } else {
    // Classic rules
    let hapGain = 0;
    let relGain = 0;
    if (strolls === 0) {
      hapGain = 1;
      relGain = 1;
    } else if (strolls === 1) {
      relGain = 1;
    }

    if (hapGain > 0) nextPlayer.happiness = Math.min(100, nextPlayer.happiness + hapGain);
    if (relGain > 0) nextPlayer.relaxation = Math.min(100, nextPlayer.relaxation + relGain);

    const mods: StatModification[] = [];
    if (hapGain > 0) mods.push({ stat: 'happiness', diff: hapGain });
    if (relGain > 0) mods.push({ stat: 'relaxation', diff: relGain });

    actionLogs.push({
      key: strolls < 2 ? 'action.park.stroll' : 'action.park.strollDiminished',
      modifications: mods
    });
  }

  // Outdoor random encounter
  const encounterRes = resolveParkEncounter(nextPlayer, 'stroll', context);
  nextPlayer = encounterRes.nextPlayer;
  if (encounterRes.extraEvents.length > 0) {
    actionLogs.push(...encounterRes.extraEvents);
  }

  return {
    nextPlayer,
    actionLog: actionLogs.length === 1 ? actionLogs[0] : actionLogs
  };
}

export function handleParkJogAction(
  player: PlayerState,
  _action: { type: 'jog_park' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  const jogCost = 3;
  if (nextPlayer.hoursRemaining < jogCost) {
    return { nextPlayer, actionLog: { key: 'action.error.notEnoughTime' } };
  }
  if (context.rules.usePhysicalMentalConditions && (nextPlayer.physicalCondition ?? 50) < 15) {
    return { nextPlayer, actionLog: { key: 'action.error.tooPhysicallyExhausted' } };
  }

  nextPlayer = spendHours(nextPlayer, jogCost);

  const jogs = nextPlayer.turnFlags?.parkJogsThisTurn || 0;
  nextPlayer.turnFlags = {
    ...nextPlayer.turnFlags,
    parkJogsThisTurn: jogs + 1,
    hasFreshAir: true
  };

  const actionLogs: GameEvent[] = [];

  if (context.rules.usePhysicalMentalConditions) {
    const statRules = requireAdvancedStatRules(context.campaign.config.statRules);
    const globalMax = statRules.initialPhysicalMax ?? 100;
    const curMax = nextPlayer.physicalConditionMax ?? 50;

    if (jogs === 0) {
      // First jog: Builds athletic endurance (+1 Physical, +1 Max Phys, -2 Mental)
      nextPlayer.mentalCondition = Math.max(1, (nextPlayer.mentalCondition ?? 50) - 2);
      let maxDiff = 0;
      if (curMax < globalMax) {
        nextPlayer.physicalConditionMax = Math.min(globalMax, curMax + 1);
        maxDiff = 1;
      }
      nextPlayer.physicalCondition = Math.min(nextPlayer.physicalConditionMax ?? 50, (nextPlayer.physicalCondition ?? 50) + 1);

      const mods: StatModification[] = [
        { stat: 'physical', diff: 1 },
        { stat: 'mental', diff: -2 }
      ];
      if (maxDiff > 0) {
        mods.push({ stat: 'maxPhysical', diff: maxDiff });
      }

      actionLogs.push({
        key: 'action.park.jog',
        modifications: mods
      });
    } else {
      // 2nd+ jog: Overexertion & muscle strain (-2 Physical, -1 Mental)
      nextPlayer.physicalCondition = Math.max(1, (nextPlayer.physicalCondition ?? 50) - 2);
      nextPlayer.mentalCondition = Math.max(1, (nextPlayer.mentalCondition ?? 50) - 1);

      actionLogs.push({
        key: 'action.park.jogOverexertion',
        modifications: [
          { stat: 'physical', diff: -2 },
          { stat: 'mental', diff: -1 }
        ]
      });
    }
  } else {
    // Classic rules
    if (jogs === 0) {
      nextPlayer.relaxation = Math.min(100, nextPlayer.relaxation + 2);
      nextPlayer.happiness = Math.max(0, nextPlayer.happiness - 1);
      actionLogs.push({
        key: 'action.park.jog',
        modifications: [
          { stat: 'relaxation', diff: 2 },
          { stat: 'happiness', diff: -1 }
        ]
      });
    } else {
      nextPlayer.relaxation = Math.max(0, nextPlayer.relaxation - 1);
      actionLogs.push({
        key: 'action.park.jogOverexertion',
        modifications: [
          { stat: 'relaxation', diff: -1 }
        ]
      });
    }
  }

  // Outdoor random encounter
  const encounterRes = resolveParkEncounter(nextPlayer, 'jog', context);
  nextPlayer = encounterRes.nextPlayer;
  if (encounterRes.extraEvents.length > 0) {
    actionLogs.push(...encounterRes.extraEvents);
  }

  return {
    nextPlayer,
    actionLog: actionLogs.length === 1 ? actionLogs[0] : actionLogs
  };
}

export function handleParkRestAction(
  player: PlayerState,
  _action: { type: 'rest_bench' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  const restCost = 3;
  if (nextPlayer.hoursRemaining < restCost) {
    return { nextPlayer, actionLog: { key: 'action.error.notEnoughTime' } };
  }

  nextPlayer = spendHours(nextPlayer, restCost);

  const rests = nextPlayer.turnFlags?.parkBenchesThisTurn || 0;
  nextPlayer.turnFlags = {
    ...nextPlayer.turnFlags,
    parkBenchesThisTurn: rests + 1
  };

  const actionLogs: GameEvent[] = [];

  if (context.rules.usePhysicalMentalConditions) {
    const maxPhys = nextPlayer.physicalConditionMax ?? 50;
    const maxMental = nextPlayer.mentalConditionMax ?? 50;

    if (rests === 0) {
      // 1st Bench Rest: (+2 Physical, +1 Mental). Safe free rest without food or mess!
      nextPlayer.physicalCondition = Math.min(maxPhys, (nextPlayer.physicalCondition ?? 50) + 2);
      nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? 50) + 1);
      actionLogs.push({
        key: 'action.park.rest',
        modifications: [
          { stat: 'physical', diff: 2 },
          { stat: 'mental', diff: 1 }
        ]
      });
    } else if (rests === 1) {
      // 2nd Bench Rest: (+1 Physical, +0 Mental)
      nextPlayer.physicalCondition = Math.min(maxPhys, (nextPlayer.physicalCondition ?? 50) + 1);
      actionLogs.push({
        key: 'action.park.restDiminished',
        modifications: [
          { stat: 'physical', diff: 1 }
        ]
      });
    } else {
      // 3rd+ Bench Rest: Sleeping on hard benches all day causes stiff neck (-1 Mental)
      nextPlayer.mentalCondition = Math.max(1, (nextPlayer.mentalCondition ?? 50) - 1);
      actionLogs.push({
        key: 'action.park.restStiff',
        modifications: [
          { stat: 'mental', diff: -1 }
        ]
      });
    }
  } else {
    // Classic rules
    if (rests === 0) {
      nextPlayer.relaxation = Math.min(100, nextPlayer.relaxation + 2);
      nextPlayer.happiness = Math.min(100, nextPlayer.happiness + 1);
      actionLogs.push({
        key: 'action.park.rest',
        modifications: [
          { stat: 'relaxation', diff: 2 },
          { stat: 'happiness', diff: 1 }
        ]
      });
    } else if (rests === 1) {
      nextPlayer.relaxation = Math.min(100, nextPlayer.relaxation + 1);
      actionLogs.push({
        key: 'action.park.restDiminished',
        modifications: [
          { stat: 'relaxation', diff: 1 }
        ]
      });
    } else {
      actionLogs.push({
        key: 'action.park.restStiff',
        modifications: []
      });
    }
  }

  // Outdoor random encounter (higher risk on bench)
  const encounterRes = resolveParkEncounter(nextPlayer, 'bench', context);
  nextPlayer = encounterRes.nextPlayer;
  if (encounterRes.extraEvents.length > 0) {
    actionLogs.push(...encounterRes.extraEvents);
  }

  return {
    nextPlayer,
    actionLog: actionLogs.length === 1 ? actionLogs[0] : actionLogs
  };
}
