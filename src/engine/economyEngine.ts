/**
 * economyEngine.ts — Economic index simulation and price scaling.
 *
 * Handles fluctuating economy, stock prices, market crashes,
 * and rent debt garnishment.
 */

import { type PlayerState, type SectorState, type EconomySimulationState } from './gameState';
import type { GameRules, StatRules, EconomyRules } from './rules';
import type { Random } from '../utils/rng';
import { applyHappinessChange } from './statEffects';
import type { CampaignBundle } from './dataLoader';
import { resolveDecision, type ReplayContext } from './replayTypes';

/**
 * Creates the initial state for the authentic 8-sector economy simulation.
 */
export function createDefaultEconomySimulationState(
  economyRules?: Partial<EconomyRules>,
  initialOffset: number = 0,
  initialTrend: number = 0
): EconomySimulationState {
  const baseline = economyRules?.baselineReading ?? 100;
  const createSector = (): SectorState => ({
    index: initialTrend,
    reading: baseline + initialOffset,
    high: 0,
    low: 0,
    lowerRange: -3,
    upperRange: 3,
    adjustment: 0,
  });

  return {
    main: createSector(),
    goods: createSector(),
    investments: createSector(),
    stocks: {
      gold: createSector(),
      silver: createSector(),
      pork: createSector(),
      blueChip: createSector(),
      penny: createSector(),
    },
    lastCrashSeverity: 'none',
    lastBoom: false,
  };
}

/**
 * Calculates a price adjusted by a specific sector's reading using Sierra Script 109 math.
 * Formula:
 *   pct = 100 + floor((reading - 100) * 5 / 3)
 *   pct = clamp(pct, minFloor, maxCeiling)
 *   price = max(1, floor(basePrice * pct / 100))
 */
export function calcSectorPrice(basePrice: number, reading: number, economyRules?: Partial<EconomyRules>): number {
  const minFloor = economyRules?.priceFloorPercent ?? 50;
  const maxCeiling = economyRules?.priceCeilingPercent ?? 250;
  let pct = 100 + Math.floor(((reading - 100) * 5) / 3);
  pct = Math.max(minFloor, Math.min(maxCeiling, pct));
  return Math.max(1, Math.floor((basePrice * pct) / 100));
}

/**
 * Calculates a player's true Liquid Assets, including cash, bank savings, and stocks.
 * 
 * @param player The player state
 * @param campaign The current campaign bundle (to resolve stock prices)
 * @param economicIndex The current economic index
 * @param turn The current turn
 * @param economySimulation Optional authentic multi-sector simulation state
 * @returns Total liquid assets in dollars
 */
export function calcLiquidAssets(
  player: PlayerState,
  campaign: CampaignBundle | undefined,
  economicIndex: number,
  turn: number,
  economySimulation?: EconomySimulationState
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
          price = calcStockPrice(stock.basePrice, economicIndex, seed, economySimulation, stock.id, campaign.config.economyRules);
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
export function calcItemPrice(item: { basePrice?: number; isFixedPrice?: boolean }, economicIndex: number): number {
  return calcEconomyPrice(item.basePrice ?? 0, economicIndex, item.isFixedPrice);
}

/**
 * Steps a single economic sector according to authentic Sierra SCI bytecode math (Script 107).
 */
export function stepSector(
  sector: SectorState,
  risk: number,
  parentIndex: number,
  rules: Partial<EconomyRules>,
  rng: Random,
  isCrash: boolean,
  crashSeverity: number,
  isBoom: boolean,
  replay?: ReplayContext,
  sectorKey = 'sector'
): SectorState {
  const upwardBounceStrong = rules.upwardBounceStrongThreshold ?? 80;
  const upwardBounceModerate = rules.upwardBounceModerateThreshold ?? 90;
  const downwardBounceStrong = rules.downwardBounceStrongThreshold ?? 160;
  const downwardBounceModerate = rules.downwardBounceModerateThreshold ?? 130;
  const minReading = rules.minReading ?? 70;
  const maxReading = rules.maxReading ?? 190;
  let newIndex = sector.index;

  // 2. Mean-reversion trigger flags
  let high = 0;
  if (sector.reading < upwardBounceStrong) {
    high = 2;
  } else if (sector.reading < upwardBounceModerate) {
    high = 1;
  }

  let low = 0;
  if (sector.reading > downwardBounceStrong) {
    low = 2;
  } else if (sector.reading > downwardBounceModerate) {
    low = 1;
  }

  // 3. Step momentum: on crash or boom apply direct shock, otherwise step toward target
  if (isCrash) {
    newIndex = crashSeverity === 1 ? -3 : -2;
  } else if (isBoom) {
    newIndex = 2;
  } else {
    const targetMin = -3 - low;
    const targetMax = 3 + high;
    const target = resolveDecision(replay, `${sectorKey}_target`, () => {
      return Math.floor(rng.next() * (targetMax - targetMin + 1)) + targetMin;
    });

    if (target < newIndex) {
      newIndex -= 1;
      if (newIndex < targetMin) newIndex = targetMin;
    } else if (target > newIndex) {
      newIndex += 1;
      if (newIndex > targetMax) newIndex = targetMax;
    }
  }

  // 4. Calculate adjustment range based on newIndex
  let lowerRange = -3;
  let upperRange = 3;
  if (newIndex < 0) {
    lowerRange = -3 + 2 * newIndex;
  } else if (newIndex > 0) {
    upperRange = 3 + 2 * newIndex;
  }

  let adjustment = resolveDecision(replay, `${sectorKey}_adjustment`, () => {
    return Math.floor(rng.next() * (upperRange - lowerRange + 1)) + lowerRange;
  });

  // Risk penalty if roll hit lowerRange
  if (adjustment === lowerRange) {
    const penalty = resolveDecision(replay, `${sectorKey}_risk_penalty`, () => {
      const maxRisk = risk * Math.abs(newIndex);
      return maxRisk > 0 ? Math.floor(rng.next() * (maxRisk + 1)) : 0;
    });
    adjustment -= penalty;
  }

  // 5. Update Reading: add adjustment and parent index coupling (parentIndex / 3)
  const parentCoupling = Math.floor(parentIndex / 3);
  let newReading = sector.reading + adjustment + parentCoupling;

  if (isCrash) {
    const crashDrop = crashSeverity === 1 ? 50 : crashSeverity === 2 ? 30 : 15;
    newReading = newReading - crashDrop;
  } else if (isBoom) {
    newReading = newReading + 6;
  }

  newReading = Math.max(minReading, Math.min(maxReading, newReading));

  return {
    index: newIndex,
    reading: newReading,
    high,
    low,
    lowerRange,
    upperRange,
    adjustment,
  };
}

/**
 * Steps the full 2-tier hierarchical economy simulation across all 8 sectors.
 */
export function stepEconomySimulation(
  sim: EconomySimulationState,
  rules: Partial<EconomyRules>,
  rng: Random,
  crashSeverity: 'none' | 'minor' | 'moderate' | 'major',
  isBoom: boolean,
  replay?: ReplayContext
): EconomySimulationState {
  const crashNum = crashSeverity === 'major' ? 1 : crashSeverity === 'moderate' ? 2 : crashSeverity === 'minor' ? 3 : 0;
  const isCrash = crashNum > 0;

  const risks = {
    main: rules.sectorRisks?.main ?? 4,
    goods: rules.sectorRisks?.goods ?? 4,
    investments: rules.sectorRisks?.investments ?? 4,
    gold: rules.sectorRisks?.gold ?? 2,
    silver: rules.sectorRisks?.silver ?? 2,
    pork: rules.sectorRisks?.pork ?? 4,
    blueChip: rules.sectorRisks?.blueChip ?? 1,
    penny: rules.sectorRisks?.penny ?? 10,
  };

  // Tier 1: Main overall economy
  const newMain = stepSector(sim.main, risks.main, 0, rules, rng, isCrash, crashNum, isBoom, replay, 'econ_main');

  // Tier 2: Consumer Goods and General Investments (driven by newMain.index)
  const newGoods = stepSector(sim.goods, risks.goods, newMain.index, rules, rng, isCrash, crashNum, isBoom, replay, 'econ_goods');
  const newInvest = stepSector(sim.investments, risks.investments, newMain.index, rules, rng, isCrash, crashNum, isBoom, replay, 'econ_invest');

  // Tier 3: Commodities & Stocks (driven by newInvest.index)
  const newGold = stepSector(sim.stocks.gold, risks.gold, newInvest.index, rules, rng, isCrash, crashNum, isBoom, replay, 'econ_gold');
  const newSilver = stepSector(sim.stocks.silver, risks.silver, newInvest.index, rules, rng, isCrash, crashNum, isBoom, replay, 'econ_silver');
  const newPork = stepSector(sim.stocks.pork, risks.pork, newInvest.index, rules, rng, isCrash, crashNum, isBoom, replay, 'econ_pork');
  const newBlueChip = stepSector(sim.stocks.blueChip, risks.blueChip, newInvest.index, rules, rng, isCrash, crashNum, isBoom, replay, 'econ_blue_chip');
  const newPenny = stepSector(sim.stocks.penny, risks.penny, newInvest.index, rules, rng, isCrash, crashNum, isBoom, replay, 'econ_penny');

  return {
    main: newMain,
    goods: newGoods,
    investments: newInvest,
    stocks: {
      gold: newGold,
      silver: newSilver,
      pork: newPork,
      blueChip: newBlueChip,
      penny: newPenny,
    },
    lastCrashSeverity: crashSeverity,
    lastBoom: isBoom,
  };
}

export interface CommodityMoverResult {
  moverKey: string;
  isUp: boolean;
  sectorKey: string;
  magnitude: number;
}

/**
 * Determines which sector had the most extreme index movement for the newspaper headline.
 * Follows Sierra SCI proc_000e logic:
 *   Tracks sector with lowest index (loser) and highest index (gainer).
 *   If |loser.index| > |gainer.index| and |loser.index| >= 2, reports negative headline.
 *   Else if |gainer.index| >= 2, reports positive headline.
 */
export function determineNewspaperMover(sim: EconomySimulationState): CommodityMoverResult | null {
  const sectors: Array<{ key: string; sector: SectorState; upKey: string; downKey: string }> = [
    { key: 'gold', sector: sim.stocks.gold, upKey: 'newspaper.stocks.gold_up', downKey: 'newspaper.stocks.gold_down' },
    { key: 'silver', sector: sim.stocks.silver, upKey: 'newspaper.stocks.silver_up', downKey: 'newspaper.stocks.silver_down' },
    { key: 'pork', sector: sim.stocks.pork, upKey: 'newspaper.stocks.pork_up', downKey: 'newspaper.stocks.pork_down' },
    { key: 'blue_chip', sector: sim.stocks.blueChip, upKey: 'newspaper.stocks.blue_chip_up', downKey: 'newspaper.stocks.blue_chip_down' },
    { key: 'penny_stocks', sector: sim.stocks.penny, upKey: 'newspaper.stocks.penny_up', downKey: 'newspaper.stocks.penny_down' },
    { key: 'investments', sector: sim.investments, upKey: 'newspaper.stocks.investments_up', downKey: 'newspaper.stocks.investments_down' },
    { key: 'goods', sector: sim.goods, upKey: 'newspaper.stocks.economy_up', downKey: 'newspaper.stocks.economy_down' },
  ];

  let loser = sectors[0];
  let gainer = sectors[0];

  for (const s of sectors) {
    if (s.sector.index < loser.sector.index) loser = s;
    if (s.sector.index > gainer.sector.index) gainer = s;
  }

  if (Math.abs(loser.sector.index) > Math.abs(gainer.sector.index) && Math.abs(loser.sector.index) >= 2) {
    return {
      moverKey: loser.downKey,
      isUp: false,
      sectorKey: loser.key,
      magnitude: Math.abs(loser.sector.index),
    };
  } else if (Math.abs(gainer.sector.index) >= 2) {
    return {
      moverKey: gainer.upKey,
      isUp: true,
      sectorKey: gainer.key,
      magnitude: Math.abs(gainer.sector.index),
    };
  }

  return null;
}

/**
 * Generates an actionable predictive stock tip based on sector momentum and mean-reversion signals.
 * Active when predictiveNewspaperStockTips is enabled (QoL & Advanced).
 */
export function generatePredictiveStockTip(
  sim: EconomySimulationState,
  rng: Random,
  replay?: ReplayContext
): NonNullable<import('./gameState').GameEvent['stockTip']> | null {
  const stockList = [
    { id: 'gold', name: 'Gold', sector: sim.stocks.gold },
    { id: 'silver', name: 'Silver', sector: sim.stocks.silver },
    { id: 'pork', name: 'Pork Bellies', sector: sim.stocks.pork },
    { id: 'blue_chip', name: 'Blue Chip', sector: sim.stocks.blueChip },
    { id: 'penny_stocks', name: 'Penny Stocks', sector: sim.stocks.penny },
  ];

  // Score each stock based on valuation, bounce signals, and momentum reversal
  // Positive score indicates undervalued/poised to surge (STRONG BUY)
  // Negative score indicates overbought/poised for correction (STRONG SELL)
  const scored = stockList.map(s => {
    let score = 0;
    // Valuation relative to baseline 100 (reading < 100 is discounted, > 100 is expensive)
    const deviation = 100 - s.sector.reading;
    score += Math.round(deviation / 3);

    // Sierra bounce flags (strong mean-reversion triggers)
    if (s.sector.high === 2) score += 6;
    else if (s.sector.high === 1) score += 3;

    if (s.sector.low === 2) score -= 6;
    else if (s.sector.low === 1) score -= 3;

    // Momentum reversal at valuation bounds:
    // If momentum dropped sharply at or below baseline, bounce is imminent
    if (s.sector.index <= -2 && s.sector.reading <= 100) score += 3;
    // If momentum surged at or above baseline, peak exhaustion is imminent
    if (s.sector.index >= 2 && s.sector.reading >= 100) score -= 3;

    return { ...s, score };
  });

  // Sort by absolute score to find the strongest conviction candidate
  scored.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  const candidate = scored[0];

  if (!candidate || candidate.score === 0) {
    const randomIdx = resolveDecision(replay, 'stock_tip_rand', () => Math.floor(rng.next() * stockList.length));
    const chosen = stockList[randomIdx];
    return {
      commodityId: chosen.id,
      action: 'hold',
      headlineKey: `newspaper.stockTips.${chosen.id}_hold_headline`,
      detailKey: `newspaper.stockTips.${chosen.id}_hold_detail`,
    };
  }

  if (candidate.score > 0) {
    return {
      commodityId: candidate.id,
      action: 'buy',
      headlineKey: `newspaper.stockTips.${candidate.id}_buy_headline`,
      detailKey: `newspaper.stockTips.${candidate.id}_buy_detail`,
    };
  } else {
    return {
      commodityId: candidate.id,
      action: 'sell',
      headlineKey: `newspaper.stockTips.${candidate.id}_sell_headline`,
      detailKey: `newspaper.stockTips.${candidate.id}_sell_detail`,
    };
  }
}

/**
 * Fluctuates the economic index for the next turn.
 * Uses a two-variable model (Trend and Reading).
 *
 * @param currentIndex — Current economic reading (-30 to +90)
 * @param currentTrend - Current economic trend/momentum (-3 to +3)
 * @param minReading   - Minimum allowed reading
 * @returns              Tuple of [newReading, newTrend]
 */
export function fluctuateEconomy(currentIndex: number, currentTrend: number, minReading: number, rng: Random, replay?: ReplayContext): [number, number] {
  // Update Trend: random step of -1, 0, +1
  const trendChange = resolveDecision(replay, `fluctuate_trend`, () => {
    let change = Math.floor(rng.next() * 3) - 1;
    // Mean reversion when economy is very high or very low
    if (currentIndex > 55 && currentTrend > 0) {
      change -= 1;
    } else if (currentIndex < -10 && currentTrend < 0) {
      change += 1;
    } else {
      if (currentTrend > 0 && rng.next() < 0.2) change += 1;
      if (currentTrend < 0 && rng.next() < 0.2) change -= 1;
    }
    return change;
  });
  const newTrend = Math.max(-3, Math.min(3, currentTrend + trendChange));

  // Update Reading: changes by Trend * [1..3]
  const readingMult = resolveDecision(replay, `fluctuate_reading_mult`, () => Math.floor(rng.next() * 3) + 1);
  const readingChange = newTrend * readingMult;
  const newReading = Math.max(minReading, Math.min(90, currentIndex + readingChange));

  return [newReading, newTrend];
}

/**
 * Calculate stock price.
 * If authentic economy simulation is active, computes price based on that commodity's sector reading.
 * Otherwise, falls back to the deterministic sine wave formula.
 */
export function calcStockPrice(
  basePrice: number,
  economicIndex: number,
  seed: number,
  economySimulation?: EconomySimulationState,
  stockId?: string,
  economyRules?: Partial<EconomyRules>
): number {
  if (economySimulation && stockId) {
    let sector: SectorState | undefined;
    if (stockId === 'gold') sector = economySimulation.stocks.gold;
    else if (stockId === 'silver') sector = economySimulation.stocks.silver;
    else if (stockId === 'pork' || stockId === 'pork_bellies') sector = economySimulation.stocks.pork;
    else if (stockId === 'blue_chip') sector = economySimulation.stocks.blueChip;
    else if (stockId === 'penny_stocks') sector = economySimulation.stocks.penny;

    if (sector) {
      return calcSectorPrice(basePrice, sector.reading, economyRules);
    }
  }

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
  _replay?: ReplayContext,
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
    
    // 50% chance to lose job, otherwise wage cut
    if (updated.currentJobId !== null) {
      if (rng.next() < 0.5) {
        updated.turnEvents.push({ key: 'events.marketCrash.jobLost' });
        updated.currentJobId = null;
        updated.currentWage = 0;
        updated.raisesAtCurrentJob = 0;
        updated = applyHappinessChange(updated, -7, 'fired', rules || ({} as any), statRules);
      } else {
        // Pay cut to 80%
        updated.turnEvents.push({ key: 'events.marketCrash.wageCut' });
        updated.currentWage = Math.floor(updated.currentWage * 0.8);
      }
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
  if (hasSignificantStocks && campaign && campaign.stocks) {
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
