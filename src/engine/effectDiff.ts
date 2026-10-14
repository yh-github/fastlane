import type { PlayerState, StatModification, GameRules } from './gameState';

export interface DiffOptions {
  locationId?: string;
  rules?: Partial<GameRules>;
}

/**
 * Calculates the exact stat differences between two player states.
 * Produces standard StatModification records for consumption by UI pills,
 * logs, animation engines, and AI evaluation.
 */
export function diffPlayerEffects(
  before: PlayerState,
  after: PlayerState,
  options?: DiffOptions
): StatModification[] {
  const mods: StatModification[] = [];

  // 1. Currency & Time
  const moneyDiff = (after.money ?? 0) - (before.money ?? 0);
  if (moneyDiff !== 0) {
    mods.push({ stat: 'money', diff: moneyDiff });
  }

  const timeDiff = (after.hoursRemaining ?? 0) - (before.hoursRemaining ?? 0);
  if (timeDiff !== 0) {
    mods.push({ stat: 'time', diff: timeDiff });
  }

  // 2. Core Well-Being & Morale
  const hapDiff = (after.happiness ?? 0) - (before.happiness ?? 0);
  if (hapDiff !== 0) {
    mods.push({ stat: 'happiness', diff: hapDiff });
  }

  if (before.mentalCondition !== undefined || after.mentalCondition !== undefined) {
    const mentalDiff = (after.mentalCondition ?? 50) - (before.mentalCondition ?? 50);
    if (mentalDiff !== 0) {
      mods.push({ stat: 'mental', diff: mentalDiff });
    }
  }

  if (before.mentalConditionMax !== undefined || after.mentalConditionMax !== undefined) {
    const mentalMaxDiff = (after.mentalConditionMax ?? 50) - (before.mentalConditionMax ?? 50);
    if (mentalMaxDiff !== 0) {
      mods.push({ stat: 'mentalMax', diff: mentalMaxDiff });
    }
  }

  if (before.physicalCondition !== undefined || after.physicalCondition !== undefined) {
    const physDiff = (after.physicalCondition ?? 50) - (before.physicalCondition ?? 50);
    if (physDiff !== 0) {
      mods.push({ stat: 'physical', diff: physDiff });
    }
  }

  if (before.physicalConditionMax !== undefined || after.physicalConditionMax !== undefined) {
    const physMaxDiff = (after.physicalConditionMax ?? 50) - (before.physicalConditionMax ?? 50);
    if (physMaxDiff !== 0) {
      mods.push({ stat: 'physicalMax', diff: physMaxDiff });
    }
  }

  // 3. Career & Skills
  const depDiff = (after.dependability ?? 0) - (before.dependability ?? 0);
  if (depDiff !== 0) {
    mods.push({ stat: 'dependability', diff: depDiff });
  }

  const expDiff = (after.experience ?? 0) - (before.experience ?? 0);
  if (expDiff !== 0) {
    mods.push({ stat: 'experience', diff: expDiff });
  }

  const techDiff = Math.round(((after.skillTech ?? 0) - (before.skillTech ?? 0)) * 100) / 100;
  if (techDiff !== 0) {
    mods.push({ stat: 'skillTech', diff: techDiff });
  }

  const mgmtDiff = Math.round(((after.skillMgmt ?? 0) - (before.skillMgmt ?? 0)) * 100) / 100;
  if (mgmtDiff !== 0) {
    mods.push({ stat: 'skillMgmt', diff: mgmtDiff });
  }

  // 4. Social & Living Conditions
  const socialDiff = (after.social ?? 0) - (before.social ?? 0);
  if (socialDiff !== 0) {
    mods.push({ stat: 'social', diff: socialDiff });
  }

  const messDiff = (after.mess ?? 0) - (before.mess ?? 0);
  if (messDiff !== 0) {
    mods.push({ stat: 'mess', diff: messDiff });
  }

  const lifeDiff = (after.lifestyle ?? 0) - (before.lifestyle ?? 0);
  if (lifeDiff !== 0) {
    mods.push({ stat: 'lifestyle', diff: lifeDiff });
  }

  const relaxDiff = (after.relaxation ?? 0) - (before.relaxation ?? 0);
  if (relaxDiff !== 0) {
    mods.push({ stat: 'relaxation', diff: relaxDiff });
  }

  // 5. Financial Obligations
  const loanDiff = (after.loanDebt ?? 0) - (before.loanDebt ?? 0);
  if (loanDiff !== 0) {
    mods.push({ stat: 'loanDebt', diff: loanDiff });
  }

  const rentDebtDiff = (after.rentDebt ?? 0) - (before.rentDebt ?? 0);
  if (rentDebtDiff !== 0) {
    mods.push({ stat: 'rentDebt', diff: rentDebtDiff });
  }

  // 6. Location Standing & Demerits
  const locationId = options?.locationId;
  if (locationId) {
    const standingDiff = (after.initiativesByLocation?.[locationId] ?? 0) - (before.initiativesByLocation?.[locationId] ?? 0);
    if (standingDiff !== 0) {
      mods.push({ stat: 'standing', diff: standingDiff });
    }

    const demeritDiff = (after.mistakesByLocation?.[locationId] ?? 0) - (before.mistakesByLocation?.[locationId] ?? 0);
    if (demeritDiff !== 0) {
      mods.push({ stat: 'demerit', diff: demeritDiff });
    }
  }

  return mods;
}
