/**
 * economyEngine.ts — Economic index simulation and price scaling.
 *
 * Handles fluctuating economy, stock prices, market crashes,
 * and rent debt garnishment.
 */

import type { PlayerState } from './gameState';

/**
 * Calculate an economy-adjusted price.
 * Formula: Price = Base + (Base * EconomicIndex) / 60
 *
 * @param basePrice     — The base price of the item
 * @param economicIndex — Current index (-30 to +90)
 */
export function calcEconomyPrice(basePrice: number, economicIndex: number): number {
  return Math.floor(basePrice + (basePrice * economicIndex) / 60);
}

/**
 * Fluctuates the economic index for the next turn.
 * Random walk within the bounds of -30 (depression) to +90 (boom).
 *
 * @param currentIndex — Current economic index
 * @returns              New economic index
 */
export function fluctuateEconomy(currentIndex: number): number {
  // Simplified random walk for the economic index
  // A real implementation would likely have momentum or trend mechanics
  const change = Math.floor(Math.random() * 21) - 10; // -10 to +10
  return Math.max(-30, Math.min(90, currentIndex + change));
}

/**
 * Calculate stock price.
 * More volatile than standard economy prices.
 * (Simplified 3-iteration approximation based on wiki)
 *
 * @param basePrice     — Base price of the stock
 * @param economicIndex — Current economic index
 */
export function calcStockPrice(basePrice: number, economicIndex: number, seed: number): number {
  const econPrice = calcEconomyPrice(basePrice, economicIndex);
  const x = Math.sin(seed) * 10000;
  const pseudoRandom = x - Math.floor(x);
  const volatility = 0.8 + pseudoRandom * 0.4;
  
  const minPrice = Math.floor(basePrice * 0.5);
  const maxPrice = Math.floor(basePrice * 2.5);
  
  return Math.max(minPrice, Math.min(maxPrice, Math.floor(econPrice * volatility)));
}

/**
 * Applies a Market Crash to a player.
 *
 * @param severity — 'minor', 'moderate', or 'major'
 * @param player   — The player state
 * @returns          Updated player state
 */
export function applyMarketCrash(
  severity: 'minor' | 'moderate' | 'major',
  player: PlayerState
): PlayerState {
  let updated = { ...player };

  // Calculate total stock value (simplified check > $1000)
  // We don't have current stock prices here, so we assume if holdings exist, we penalize.
  // In a full implementation, we'd pass in current prices to sum value.
  const hasSignificantStocks = Object.keys(player.inventory.stocks.holdings).length > 0;

  if (severity === 'minor') {
    updated.happiness -= hasSignificantStocks ? 2 : 1;
  } else if (severity === 'moderate') {
    updated.happiness -= hasSignificantStocks ? 4 : 2;
    // 50% chance to be fired, or wage cut
    if (updated.currentJobId && Math.random() < 0.5) {
      updated.currentJobId = null; // Fired
      updated.currentWage = 0;
      updated.raisesAtCurrentJob = 0;
      updated.happiness -= 7; // Penalty for lost job
    } else if (updated.currentWage > 0) {
      updated.currentWage = Math.floor(updated.currentWage * 0.8); // 80% wage cut
    }
  } else if (severity === 'major') {
    updated.happiness -= hasSignificantStocks ? 8 : 3;
    // 100% fired
    if (updated.currentJobId) {
      updated.currentJobId = null;
      updated.currentWage = 0;
      updated.raisesAtCurrentJob = 0;
      updated.happiness -= 7;
    }
    // Wipe bank savings ONLY
    updated.bankSavings = 0;
  }

  // Ensure happiness doesn't drop below 10
  updated.happiness = Math.max(10, updated.happiness);
  return updated;
}

/**
 * Applies an Economic Boom to a player.
 * Gives +5 Happiness if the player has significant stock investments.
 */
export function applyEconomicBoom(player: PlayerState): PlayerState {
  let updated = { ...player };
  const hasSignificantStocks = Object.keys(player.inventory.stocks.holdings).length > 0;
  
  if (hasSignificantStocks) {
    updated.happiness += 5;
  }

  return updated;
}

/**
 * Process rent debt garnishment during a work session.
 * Garnishes 50% of the wage + $2 fee, applied to rent debt.
 *
 * @param player     — Current player state
 * @param wageEarned — Total wage earned this session
 * @returns          Tuple of [UpdatedPlayerState, NetWageToPlayer]
 */
export function processRentDebt(
  player: PlayerState,
  wageEarned: number
): [PlayerState, number] {
  if (player.rentDebt <= 0) return [player, wageEarned];

  const updated = { ...player };
  const garnished = Math.floor(wageEarned * 0.5);
  
  if (garnished >= updated.rentDebt) {
    // Paid off entirely. Final garnish has no interest fee.
    const actualGarnish = updated.rentDebt;
    updated.rentDebt = 0;
    return [updated, wageEarned - actualGarnish];
  } else {
    // Partial payment + $2 fee
    updated.rentDebt -= garnished;
    updated.rentDebt += 2; // Interest fee added back to debt
    return [updated, wageEarned - garnished];
  }
}
