import type { GameEvent, StatModification, GameRules } from './gameState';

/**
 * Creates a GameEvent with explicit modifications.
 */
export function createTurnEvent(
  key: string,
  params?: Record<string, string | number>,
  modifications?: StatModification[]
): GameEvent {
  return {
    key,
    params,
    ...(modifications && modifications.length > 0 ? { modifications } : {})
  };
}

/**
 * Retrieves all stat modifications for a given GameEvent.
 * If the event already has an explicit modifications array, returns it.
 * Otherwise, infers standard modifiers from the event key and parameters.
 */
export function getEventModifications(
  event: GameEvent,
  rules?: Partial<GameRules>
): StatModification[] {
  if (event.modifications && event.modifications.length > 0) {
    return event.modifications;
  }

  const mods: StatModification[] = [];
  const isAdv = Boolean(rules?.usePhysicalMentalConditions);
  const moraleStat = isAdv ? 'mental' : 'happiness';

  if (event.key.startsWith('events.foodSpoiled')) {
    const amount = Number(event.params?.amount) || 0;
    if (amount > 0) {
      mods.push({ stat: 'mess', diff: amount });
    }
    if (event.key.includes('noFridge') || event.key.includes('ateSpoiled')) {
      mods.push({ stat: moraleStat, diff: -2 });
    } else if (event.key.includes('tooMuch')) {
      mods.push({ stat: moraleStat, diff: -1 });
    }
  } else if (event.key === 'events.computerProfit') {
    const profit = Number(event.params?.profit) || 0;
    if (profit !== 0) {
      mods.push({ stat: 'money', diff: profit });
    }
    mods.push({ stat: moraleStat, diff: 3 });
    if (isAdv) {
      mods.push({ stat: 'skillTech', diff: 0.25 });
    }
  } else if (event.key === 'events.lottery') {
    const amount = Number(event.params?.amount) || 0;
    if (amount !== 0) {
      mods.push({ stat: 'money', diff: amount });
    }
    mods.push({ stat: moraleStat, diff: amount >= 5000 ? 10 : 5 });
  } else if (event.key === 'events.robbery.apartment') {
    mods.push({ stat: moraleStat, diff: -4 });
  } else if (event.key === 'events.applianceBroke') {
    const repairCost = Number(event.params?.repairCost) || 0;
    if (repairCost > 0) {
      mods.push({ stat: 'money', diff: -repairCost });
    }
    mods.push({ stat: moraleStat, diff: -1 });
  } else if (event.key === 'events.applianceBrokeNeedRepair') {
    mods.push({ stat: moraleStat, diff: -1 });
  } else if (event.key === 'events.starvation') {
    if (isAdv) {
      mods.push({ stat: 'mental', diff: -10 });
    } else {
      mods.push({ stat: 'happiness', diff: -2 });
    }
  } else if (event.key.startsWith('events.doctorVisit')) {
    const cost = Number(event.params?.cost) || 0;
    if (cost > 0) {
      mods.push({ stat: 'money', diff: -cost });
    }
    if (isAdv) {
      mods.push({ stat: 'physical', diff: 4 });
    } else {
      mods.push({ stat: 'happiness', diff: -4 });
    }
  } else if (event.key === 'events.burnout' || event.key === 'events.lowSpiritsBounceBack') {
    const amount = Number(event.params?.amount) || 0;
    if (amount > 0) {
      mods.push({ stat: 'mental', diff: amount });
    }
  } else if (event.key === 'events.curioDecor') {
    const lifestyle = Number(event.params?.lifestyle) || 0;
    if (lifestyle > 0) {
      mods.push({ stat: 'lifestyle', diff: lifestyle });
    }
  } else if (event.key === 'events.curioMental') {
    const mental = Number(event.params?.mental) || 0;
    if (mental > 0) {
      mods.push({ stat: 'mental', diff: mental });
    }
  } else if (event.key === 'events.curioCash') {
    const amount = Number(event.params?.amount) || 0;
    if (amount > 0) {
      mods.push({ stat: 'money', diff: amount });
    }
  } else if (event.key === 'events.donation') {
    const amount = Number(event.params?.amount) || 0;
    if (amount > 0) {
      mods.push({ stat: 'money', diff: amount });
    }
  } else if (event.key === 'events.rent.charged') {
    const amount = Number(event.params?.amount) || 0;
    if (amount > 0) {
      mods.push({ stat: 'rentDebt', diff: amount });
    }
  } else if (event.key === 'events.marketCrash.bankSavingsLost') {
    const amount = Number(event.params?.amount) || 0;
    if (amount > 0) {
      mods.push({ stat: 'money', diff: -amount });
    }
  }

  return mods;
}
