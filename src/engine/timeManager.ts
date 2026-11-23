/**
 * timeManager.ts — Turn progression and 60-hour clock management.
 *
 * Implements the 60 hours/turn economy.
 */

import { type GameState, type PlayerState, markClothesWorn } from './gameState';

// ─── Time Management Functions ──────────────────────────────────

const HOURS_PRECISION = 1e8;
export const HOURS_EPSILON = 1e-6;

/**
 * Normalize an hour quantity to eliminate IEEE-754 floating-point drift
 * (e.g. `21.999999999999993` -> `22`, `1e-14` -> `0`) while preserving
 * exact fractional waypoint costs (such as `1/7` or `1/14`).
 */
export function normalizeHours(hours: number): number {
  if (!Number.isFinite(hours) || hours <= HOURS_EPSILON) return 0;
  return Math.round(hours * HOURS_PRECISION) / HOURS_PRECISION;
}

/**
 * Check if the player has enough hours to perform an action.
 * Most actions require at least 1 hour remaining, even if they cost more
 * (e.g., you can work a 6-hour shift with only 2 hours left, for prorated pay).
 *
 * @param player     — The current player state
 * @param strictCost — Optional: If true, player must have exactly the cost amount (e.g., building entry)
 * @param cost       — The hour cost of the action
 */
export function canAffordAction(player: PlayerState, cost: number, strictCost: boolean = false): boolean {
  if (cost === 0) return true; // Zero-cost actions are always allowed
  const remaining = normalizeHours(player.hoursRemaining);
  if (strictCost) {
    return remaining + HOURS_EPSILON >= cost;
  }
  return remaining > 0; // "At least some time left" rule
}

/**
 * Consume hours from the player's turn.
 * Does not let hours drop below 0.
 *
 * @param player — Current player state
 * @param cost   — Hours to consume
 * @returns        A new player state with deducted hours, or the same state if insufficient
 */
export function spendHours(player: PlayerState, cost: number): PlayerState {
  if (cost === 0) return player;

  const remaining = normalizeHours(player.hoursRemaining);
  // If they are out of time, they can't do actions with a cost
  if (remaining <= 0) {
    return remaining === player.hoursRemaining ? player : { ...player, hoursRemaining: 0 };
  }

  const newHours = normalizeHours(remaining - cost);

  let updated: PlayerState = {
    ...player,
    hoursRemaining: newHours,
  };

  if (player.inventory?.selectedClothes && player.inventory.selectedClothes !== 'none') {
    updated = markClothesWorn(updated, player.inventory.selectedClothes);
  }

  return updated;
}

/**
 * Reset a player's clock for a new turn.
 * Applies any caffeine debt carried over from the previous turn.
 */
export function resetPlayerClock(player: PlayerState, hoursPerTurn: number): PlayerState {
  const debt = player.turnFlags?.caffeineDebt || 0;
  const startingHours = normalizeHours(hoursPerTurn - debt);
  
  return {
    ...player,
    hoursRemaining: startingHours,
    turnFlags: {
      ...player.turnFlags,
      caffeineDebt: 0, // Debt is resolved
    }
  };
}

/**
 * Check if the game has reached its time limit.
 * (Classic game often has no hard limit, or limits based on scenario)
 */
export function isGameOver(state: GameState, maxTurns: number = 0): boolean {
  if (maxTurns === 0) return false;
  return state.turn > maxTurns;
}
