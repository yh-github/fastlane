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
  type PlayerState
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
 * Must have a job to have a Career stat > 0.
 */
export function calcCareerProgress(dependability: number, hasJob: boolean): number {
  if (!hasJob) return 0;
  return Math.min(100, Math.floor(1.25 * dependability));
}

/**
 * Calculate current Wealth stat (0-100) based on Liquid Assets.
 * $10,000 = 100 Wealth.
 */
export function calcWealthProgress(liquidAssets: number): number {
  return Math.min(100, Math.floor(liquidAssets / 100));
}

/**
 * Calculate current Education stat (0-100) based on Degrees.
 * 11 Degrees = 100 Education.
 */
export function calcEducationProgress(numDegrees: number): number {
  return Math.min(100, 1 + 9 * numDegrees);
}

/**
 * Calculate the durable value for the Floppy Disk version of donations.
 * "The value of each type of Durable is calculated by the price the player paid for the last instance of that Durable they had purchased."
 * Pawned items are NOT included in this specific calculation.
 */
export function calcFloppyDurableValue(player: PlayerState): number {
  const lastPrices = new Map<string, number>();
  const counts = new Map<string, number>();

  for (const app of player.inventory.appliances) {
    counts.set(app.id, (counts.get(app.id) || 0) + 1);
    // Assuming appliances are appended in chronological order of purchase
    lastPrices.set(app.id, app.purchasePrice);
  }

  let totalValue = 0;
  for (const [id, count] of counts.entries()) {
    const lastPrice = lastPrices.get(id) || 0;
    totalValue += count * lastPrice;
  }

  return totalValue;
}

/**
 * Calculate total Net Worth.
 * Net Worth = Cash + Bank Savings + Value of all Durables (including pawned).
 * Uses the exact same durable valuation math as the Floppy check.
 */
export function calcNetWorth(player: PlayerState): number {
  const liquid = player.money + player.bankSavings;
  
  const lastPrices = new Map<string, number>();
  const counts = new Map<string, number>();

  // Regular appliances
  for (const app of player.inventory.appliances) {
    counts.set(app.id, (counts.get(app.id) || 0) + 1);
    lastPrices.set(app.id, app.purchasePrice);
  }
  
  // Pawned appliances
  for (const pawned of player.inventory.pawnedItems) {
    counts.set(pawned.itemId, (counts.get(pawned.itemId) || 0) + 1);
    lastPrices.set(pawned.itemId, pawned.originalPrice);
  }

  let durableValue = 0;
  for (const [id, count] of counts.entries()) {
    const lastPrice = lastPrices.get(id) || 0;
    durableValue += count * lastPrice;
  }

  return liquid + durableValue;
}
