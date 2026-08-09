/**
 * economyEngine.ts — Economic index simulation and price scaling.
 *
 * Handles fluctuating economy, stock prices, market crashes,
 * and rent debt garnishment.
 */

import { type PlayerState, type GameRules, type StatRules } from './gameState';
import type { Random } from '../utils/rng';
import { applyHappinessChange } from './statEffects';
import type { CampaignBundle } from './dataLoader';
import { resolveDecision, type ReplayContext } from './replayTypes';

/**
 * Calculates a player's true Liquid Assets, including cash, bank savings, and stocks.
 * 
 * @param player The player state
 * @param campaign The current campaign bundle (to resolve stock prices)
 * @param economicIndex The current economic index
 * @param turn The current turn
 * @returns Total liquid assets in dollars
 */
export function calcLiquidAssets(
  player: PlayerState,
  campaign: CampaignBundle | undefined,
  economicIndex: number,
  turn: number
): number {
  let assets = player.money + player.bankSavings;
  assets -= (player.loanDebt || 0);

  assets += (player.inventory.stocks.tBills || 0) * 100;

  if (campaign && campaign.stocks) {
    for (const stock of campaign.stocks) {
      if (stock.id === 'tbills') continue; // handled above

      const owned = player.inventory.stocks.holdings[stock.id] || 0;
      if (owned > 0) {
        let price = stock.basePrice;
        if (stock.type === 'fluctuating') {
          const seed = turn * 997 + stock.id.charCodeAt(0) * 31;
          price = calcStockPrice(stock.basePrice, economicIndex, seed);
        }
        assets += owned * price;
      }
    }
  }

  return assets;
}

/**
 * Calculate an economy-adjusted price.
 * Formula: Price = Base + (Base * EconomicIndex) / 60
 *
 * @param basePrice     — The base price of the item
 * @param economicIndex — Current index (-30 to +90)
 * @param isFixedPrice  — If true, returns basePrice without economic adjustment
 */
export function calcEconomyPrice(basePrice: number, economicIndex: number, isFixedPrice?: boolean): number {
  if (isFixedPrice) return basePrice;
  return Math.floor(basePrice + (basePrice * economicIndex) / 60);
}

/**
 * Calculate price for an item definition or item-like object.
 */
export function calcItemPrice(item: { basePrice: number; isFixedPrice?: boolean }, economicIndex: number): number {
  return calcEconomyPrice(item.basePrice, economicIndex, item.isFixedPrice);
}

/**
 * Fluctuates the economic index for the next turn.
 * Random walk within the bounds of -30 (depression) to +90 (boom).
 *
 * @param currentIndex — Current economic index
 * @returns              New economic index
 */
export function fluctuateEconomy(currentIndex: number, rng: Random, replay?: ReplayContext): number {
  // Simplified random walk for the economic index
  // A real implementation would likely have momentum or trend mechanics
  const change = resolveDecision(replay, `fluctuate_economy`, () => Math.floor(rng.next() * 21) - 10); // -10 to +10
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
  player: PlayerState,
  severity: 'minor' | 'moderate' | 'major',
  rng: Random,
  replay?: ReplayContext,
  rules?: GameRules,
  statRules?: StatRules
): PlayerState {
  let updated = { ...player };
  updated.turnEvents = updated.turnEvents ? [...updated.turnEvents] : [];

  // Calculate total stock value (simplified check > $1000)
  // We don't have current stock prices here, so we assume if holdings exist, we penalize.
  // In a full implementation, we'd pass in current prices to sum value.
  const hasSignificantStocks = Object.keys(player.inventory.stocks.holdings).length > 0;

  if (severity === 'minor') {
    updated = applyHappinessChange(updated, hasSignificantStocks ? -2 : -1, 'market_crash', rules || ({} as any), statRules);
  } else if (severity === 'moderate') {
    updated = applyHappinessChange(updated, hasSignificantStocks ? -4 : -2, 'market_crash', rules || ({} as any), statRules);
    
    // 50% chance to lose job
    if (updated.currentJobId !== null && rng.next() < 0.5) {
      updated.turnEvents.push({ key: 'events.marketCrash.jobLost' });
      updated.currentJobId = null;
      updated.currentWage = 0;
      updated.raisesAtCurrentJob = 0;
      updated = applyHappinessChange(updated, -7, 'fired', rules || ({} as any), statRules);
    }
  } else if (severity === 'major') {
    // Lose all bank savings
    if (updated.bankSavings > 0) {
      updated.turnEvents.push({ key: 'events.marketCrash.bankSavingsLost', params: { amount: updated.bankSavings } });
      updated.bankSavings = 0;
    }
    updated = applyHappinessChange(updated, hasSignificantStocks ? -8 : -3, 'market_crash', rules || ({} as any), statRules);
    
    // 100% chance to lose job
    if (updated.currentJobId !== null) {
      updated.turnEvents.push({ key: 'events.marketCrash.jobLost' });
      updated.currentJobId = null;
      updated.currentWage = 0;
      updated.raisesAtCurrentJob = 0;
      updated = applyHappinessChange(updated, -7, 'fired', rules || ({} as any), statRules);
    }
  }

  return updated;
}

/**
 * Applies an Economic Boom to a player.
 * Gives +5 Happiness if the player has >$1000 in fluctuating stocks.
 */
export function applyEconomicBoom(
  player: PlayerState,
  campaign: CampaignBundle,
  economicIndex: number,
  turn: number,
  rules?: GameRules,
  statRules?: StatRules
): PlayerState {
  let updated = { ...player };
  updated.turnEvents = updated.turnEvents ? [...updated.turnEvents] : [];

  let stockValue = 0;
  const hasSignificantStocks = Object.keys(player.inventory.stocks.holdings).length > 0;
  if (campaign && campaign.stocks) {
    for (const stock of campaign.stocks) {
      if (stock.id === 'tbills') continue;
      const owned = player.inventory.stocks.holdings[stock.id] || 0;
      if (owned > 0) {
        const seed = turn * 997 + stock.id.charCodeAt(0) * 31;
        stockValue += owned * calcStockPrice(stock.basePrice, economicIndex, seed);
      }
    }
  }
  
  if (stockValue > 1000) {
    updated.turnEvents.push({ key: 'events.economicBoom.investorBonus' });
    updated = applyHappinessChange(updated, 5, 'economic_boom', rules || ({} as any), statRules);
  }

  return updated;
}

/**
 * Process rent debt garnishment during a work session.
 *
 * Rules:
 * - 50% of work session earnings go toward reducing rent debt.
 * - An additional $2 interest fee is deducted from the player's paycheck (cash), NOT added to rent debt.
 * - Total deduction announced by employer = debt deducted + $2 interest fee.
 * - If rent debt < 50% of earnings, only the exact rent debt amount is deducted, with NO interest fee.
 *
 * @param player     — Current player state
 * @param wageEarned — Total wage earned this session
 * @returns          Tuple of [UpdatedPlayerState, NetWageToPlayer, TotalGarnishedDeduction]
 */
export function processRentDebt(
  player: PlayerState,
  wageEarned: number
): [PlayerState, number, number] {
  if (player.rentDebt <= 0 || wageEarned <= 0) return [player, wageEarned, 0];

  const updated = { ...player };
  const halfEarned = Math.floor(wageEarned * 0.5);

  if (updated.rentDebt <= halfEarned) {
    // Paid off entirely. Final garnish has no interest fee.
    const debtDeducted = updated.rentDebt;
    updated.rentDebt = 0;
    const netWage = wageEarned - debtDeducted;
    return [updated, netWage, debtDeducted];
  } else {
    // Partial payment: 50% to debt + $2 interest fee from paycheck
    const debtDeducted = halfEarned;
    updated.rentDebt -= debtDeducted;
    const interestFee = 2;
    const netWage = Math.max(0, wageEarned - debtDeducted - interestFee);
    const totalGarnished = debtDeducted + interestFee;
    return [updated, netWage, totalGarnished];
  }
}
