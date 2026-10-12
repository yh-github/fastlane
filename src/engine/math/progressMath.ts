import type { PlayerState } from '../gameState';

/**
 * Calculate current Wealth stat (0-100) based on Liquid Assets.
 * `$10,000` = 100 Wealth.
 * Starts at 0 until the player earns income or advances past the initial start.
 */
export function calcWealthProgress(liquidAssets: number, hasEarnedIncome: boolean = true): number {
  if (!hasEarnedIncome) return 0;
  return Math.min(100, Math.floor(liquidAssets / 100));
}

/**
 * Calculate current Education stat (0-100) based on Degrees.
 * 11 Degrees = 100 Education.
 * Strictly 0 when no degrees have been earned.
 */
export function calcEducationProgress(numDegrees: number): number {
  if (numDegrees <= 0) return 0;
  return Math.min(100, Math.round((numDegrees / 11) * 100));
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
