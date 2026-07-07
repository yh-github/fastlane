/**
 * statMath.ts — Core stat formulas for the Fast Lane engine.
 *
 * Implements the exact formulas defined in the GDD and Wiki
 * for the classic 1990 game engine.
 *
 * All formulas are pure functions with no side effects.
 */

import {
  MIN_HAPPINESS,
  MAX_HAPPINESS,
  DEPENDABILITY_WEEKLY_DECAY,
} from './gameState';

// ─── Stat Math ──────────────────────────────────────────────────

/**
 * Clamp a stat value between its floor and ceiling.
 */
export function clampHappiness(value: number): number {
  return Math.max(MIN_HAPPINESS, Math.min(MAX_HAPPINESS, value));
}

/**
 * Clamp a generic value to a minimum of 0.
 */
export function clampZero(value: number): number {
  return Math.max(0, value);
}

/**
 * The Luck/Rejection Formula.
 * Used when applying for a job. The player rolls 1-100.
 * If the roll is > Luck Score, the application fails.
 *
 * @param dependability — Current dependability stat
 * @param experience    — Current experience stat
 * @param numDegrees    — Total number of degrees completed
 * @returns               The threshold for a successful application roll (40-100+)
 */
export function calcLuckScore(
  dependability: number,
  experience: number,
  numDegrees: number
): number {
  return 40 + dependability + experience + 8 * numDegrees;
}

/**
 * Calculate dependability decay for the start of a turn.
 * Always flat -3 per turn.
 */
export function calcDependabilityDecay(current: number): number {
  return clampZero(current - DEPENDABILITY_WEEKLY_DECAY);
}

/**
 * Calculate the maximum possible dependability.
 * Capped by the job's requirement plus degree bonuses.
 *
 * @param jobRequiredDep — The dependability required by the current job (0 if unemployed)
 * @param numDegrees     — Number of degrees completed
 */
export function calcMaxDependability(jobRequiredDep: number, numDegrees: number): number {
  return 20 + jobRequiredDep + numDegrees * 5;
}

/**
 * Calculate the maximum possible experience.
 * Capped by the job's requirement plus degree bonuses.
 *
 * @param jobRequiredExp — The experience required by the current job (0 if unemployed)
 * @param numDegrees     — Number of degrees completed
 */
export function calcMaxExperience(jobRequiredExp: number, numDegrees: number): number {
  return 10 + jobRequiredExp + numDegrees * 5;
}

/**
 * Calculate prorated wage if working a partial shift (less than 6 hours).
 *
 * @param baseWage       — The locked-in hourly wage
 * @param hoursRemaining — Hours remaining in the turn (1 to 5)
 */
export function calcProratedWage(baseWage: number, hoursRemaining: number): number {
  return Math.floor((baseWage * 8 * hoursRemaining) / 6);
}

/**
 * Calculate the chance of getting robbed at home.
 *
 * @param relaxation — Current relaxation stat
 * @returns            Probability (0.0 to 1.0)
 */
export function calcRobberyChance(relaxation: number): number {
  return 1 / (relaxation + 1);
}

/**
 * Calculate the dependability required to get a raise at the current job.
 *
 * @param jobRequiredDep — Base dependability required for the job
 * @param raisesReceived — Number of raises already received at this job
 */
export function calcRaiseThreshold(jobRequiredDep: number, raisesReceived: number): number {
  return jobRequiredDep + 5 * raisesReceived;
}

// ─── Goal Progress ──────────────────────────────────────────────

/**
 * Calculate current Career stat (0-100) based on Dependability.
 * 80 Dependability = 100 Career.
 */
export function calcCareerProgress(dependability: number): number {
  return Math.floor(1.25 * dependability);
}

/**
 * Calculate current Wealth stat (0-100) based on Liquid Assets.
 * $10,000 = 100 Wealth.
 */
export function calcWealthProgress(liquidAssets: number): number {
  return Math.floor(liquidAssets / 100);
}

/**
 * Calculate current Education stat (0-100) based on Degrees.
 * 11 Degrees = 100 Education.
 */
export function calcEducationProgress(numDegrees: number): number {
  return 1 + 9 * numDegrees;
}
