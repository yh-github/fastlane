import type { PlayerState, StatModification } from '../gameState';
import type { ReducerContext, ActionHandlerResult } from './types';
import { spendHours } from '../timeManager';

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

  if (context.rules.usePhysicalMentalConditions) {
    const maxMental = nextPlayer.mentalConditionMax ?? 50;
    nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? 50) + 2);
    nextPlayer.happiness = Math.min(100, nextPlayer.happiness + 2);
    return {
      nextPlayer,
      actionLog: {
        key: 'action.arcade.played',
        modifications: [
          { stat: 'mental', diff: 2 },
          { stat: 'happiness', diff: 2 },
          { stat: 'money', diff: -5 }
        ]
      }
    };
  }

  nextPlayer.happiness = Math.min(100, nextPlayer.happiness + 2);
  return {
    nextPlayer,
    actionLog: {
      key: 'action.arcade.played',
      modifications: [
        { stat: 'happiness', diff: 2 },
        { stat: 'money', diff: -5 }
      ]
    }
  };
}

export function handleParkStrollAction(
  player: PlayerState,
  _action: { type: 'stroll_park' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  if (nextPlayer.hoursRemaining < 1) {
    return { nextPlayer, actionLog: { key: 'action.error.notEnoughTime' } };
  }

  nextPlayer = spendHours(nextPlayer, 1);

  if (context.rules.usePhysicalMentalConditions) {
    const maxPhys = nextPlayer.physicalConditionMax ?? 50;
    const maxMental = nextPlayer.mentalConditionMax ?? 50;
    nextPlayer.physicalCondition = Math.min(maxPhys, (nextPlayer.physicalCondition ?? 50) + 1);
    nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? 50) + 1);
    return {
      nextPlayer,
      actionLog: {
        key: 'action.park.stroll',
        modifications: [
          { stat: 'physical', diff: 1 },
          { stat: 'mental', diff: 1 }
        ]
      }
    };
  }

  nextPlayer.happiness = Math.min(100, nextPlayer.happiness + 1);
  nextPlayer.relaxation = Math.min(100, nextPlayer.relaxation + 1);
  return {
    nextPlayer,
    actionLog: {
      key: 'action.park.stroll',
      modifications: [
        { stat: 'happiness', diff: 1 },
        { stat: 'relaxation', diff: 1 }
      ]
    }
  };
}

export function handleParkJogAction(
  player: PlayerState,
  _action: { type: 'jog_park' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  if (nextPlayer.hoursRemaining < 2) {
    return { nextPlayer, actionLog: { key: 'action.error.notEnoughTime' } };
  }
  if (context.rules.usePhysicalMentalConditions && (nextPlayer.physicalCondition ?? 50) <= 2) {
    return { nextPlayer, actionLog: { key: 'action.error.tooPhysicallyExhausted' } };
  }

  nextPlayer = spendHours(nextPlayer, 2);

  if (context.rules.usePhysicalMentalConditions) {
    nextPlayer.mentalCondition = Math.max(1, (nextPlayer.mentalCondition ?? 50) - 1);
    const curMax = nextPlayer.physicalConditionMax ?? 50;
    const globalMax = 50;
    let maxDiff = 0;
    if (curMax < globalMax) {
      nextPlayer.physicalConditionMax = Math.min(globalMax, curMax + 1);
      maxDiff = 1;
    }
    nextPlayer.physicalCondition = Math.min(nextPlayer.physicalConditionMax ?? 50, (nextPlayer.physicalCondition ?? 50) + 1);
    const mods: StatModification[] = [
      { stat: 'physical', diff: 1 },
      { stat: 'mental', diff: -1 }
    ];
    if (maxDiff > 0) {
      mods.push({ stat: 'maxPhysical', diff: maxDiff });
    }
    return {
      nextPlayer,
      actionLog: {
        key: 'action.park.jog',
        modifications: mods
      }
    };
  }

  nextPlayer.relaxation = Math.min(100, nextPlayer.relaxation + 2);
  return {
    nextPlayer,
    actionLog: {
      key: 'action.park.jog',
      modifications: [
        { stat: 'relaxation', diff: 2 }
      ]
    }
  };
}

export function handleParkRestAction(
  player: PlayerState,
  _action: { type: 'rest_bench' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  if (nextPlayer.hoursRemaining < 2) {
    return { nextPlayer, actionLog: { key: 'action.error.notEnoughTime' } };
  }

  nextPlayer = spendHours(nextPlayer, 2);

  if (context.rules.usePhysicalMentalConditions) {
    const maxPhys = nextPlayer.physicalConditionMax ?? 50;
    const maxMental = nextPlayer.mentalConditionMax ?? 50;
    nextPlayer.physicalCondition = Math.min(maxPhys, (nextPlayer.physicalCondition ?? 50) + 1);
    nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? 50) + 2);
    return {
      nextPlayer,
      actionLog: {
        key: 'action.park.rest',
        modifications: [
          { stat: 'physical', diff: 1 },
          { stat: 'mental', diff: 2 }
        ]
      }
    };
  }

  nextPlayer.relaxation = Math.min(100, nextPlayer.relaxation + 2);
  nextPlayer.happiness = Math.min(100, nextPlayer.happiness + 1);
  return {
    nextPlayer,
    actionLog: {
      key: 'action.park.rest',
      modifications: [
        { stat: 'relaxation', diff: 2 },
        { stat: 'happiness', diff: 1 }
      ]
    }
  };
}
