/**
 * timeManager.ts — Turn progression and 60-hour clock management.
 *
 * Implements the 60 hours/turn economy.
 */

import { GameState, PlayerState, HOURS_PER_TURN } from './gameState';

// ─── Time Management Functions ──────────────────────────────────

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
  if (strictCost) {
    return player.hoursRemaining >= cost;
  }
  return player.hoursRemaining >= 1; // "At least 1 hour" rule for most activities
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
  // If they don't even have 1 hour, they can't do anything
  if (player.hoursRemaining <= 0) return player;

  const newHours = Math.max(0, player.hoursRemaining - cost);

  return {
    ...player,
    hoursRemaining: newHours,
  };
}

/**
 * Reset a player's clock for a new turn.
 * Applies any caffeine debt carried over from the previous turn.
 */
export function resetPlayerClock(player: PlayerState): PlayerState {
  const startingHours = Math.max(0, HOURS_PER_TURN - player.turnFlags.caffeineDebt);
  
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
