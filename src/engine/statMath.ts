/**
 * statMath.ts — Core stat formulas for the Fast Lane engine.
 *
 * Encapsulates all mathematical calculations for player stats:
 * Luck, Dependability decay/growth, Happiness modifiers, etc.
 *
 * All formulas are pure functions with no side effects, making
 * them easy to unit-test independently of game state.
 */

// ─── Stat Interfaces ────────────────────────────────────────────

export interface PlayerStats {
  money: number;
  happiness: number;
  education: number;
  career: number;
  luck: number;
  dependability: number;
}

export interface StatModifier {
  stat: keyof PlayerStats;
  delta: number;
  source: string;
}

// ─── Constants ──────────────────────────────────────────────────

/** Base dependability decay per week when player has no job */
export const DEPENDABILITY_DECAY_RATE = 0.02;

/** Happiness floor — stats can never drop below this */
export const STAT_FLOOR = 0;

/** Happiness ceiling */
export const STAT_CEILING = 100;

// ─── Pure Stat Functions ────────────────────────────────────────

/**
 * Clamp a stat value between floor and ceiling.
 */
export function clampStat(value: number): number {
  return Math.max(STAT_FLOOR, Math.min(STAT_CEILING, value));
}

/**
 * Calculate dependability decay for a given turn.
 * Dependability drops if the player skips work or misses obligations.
 *
 * @param current  — Current dependability (0–100)
 * @param hasJob   — Whether the player currently holds a job
 * @param attended — Whether the player attended work this week
 * @returns          Updated dependability value
 */
export function calcDependabilityDecay(
  current: number,
  hasJob: boolean,
  attended: boolean
): number {
  if (!hasJob) {
    return clampStat(current - DEPENDABILITY_DECAY_RATE * 100);
  }
  if (!attended) {
    return clampStat(current - DEPENDABILITY_DECAY_RATE * 200);
  }
  // Slight recovery for showing up
  return clampStat(current + 1);
}

/**
 * Calculate luck modifier for random events.
 * Luck acts as a weighted multiplier on event outcomes.
 *
 * @param baseLuck — Player's base luck stat (0–100)
 * @returns          Modifier between 0.5 and 1.5
 */
export function calcLuckModifier(baseLuck: number): number {
  return 0.5 + (clampStat(baseLuck) / 100);
}

/**
 * Apply a batch of stat modifiers to the player's stats.
 * Returns a new stats object (immutable update).
 */
export function applyModifiers(
  stats: PlayerStats,
  modifiers: StatModifier[]
): PlayerStats {
  const updated = { ...stats };
  for (const mod of modifiers) {
    updated[mod.stat] = clampStat(updated[mod.stat] + mod.delta);
  }
  return updated;
}

/**
 * Calculate initial player stats from campaign config defaults.
 */
export function createDefaultStats(overrides?: Partial<PlayerStats>): PlayerStats {
  return {
    money: 0,
    happiness: 50,
    education: 0,
    career: 0,
    luck: 50,
    dependability: 50,
    ...overrides,
  };
}
