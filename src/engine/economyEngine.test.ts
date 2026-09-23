import { Random } from '../utils/rng';
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fluctuateEconomy,
  applyMarketCrash,
  applyEconomicBoom,
  calcEconomyPrice,
  calcItemPrice,
  processRentDebt,
  createDefaultEconomySimulationState,
  calcSectorPrice,
  stepSector,
  stepEconomySimulation,
  determineNewspaperMover,
  generatePredictiveStockTip,
  calcStockPrice,
} from './economyEngine';
import type { PlayerState } from './gameState';

describe('Economy Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('calcItemPrice and calcEconomyPrice', () => {
    it('scales normal item prices based on economic index', () => {
      // Base price 60, economicIndex 30 => 60 + (60 * 30 / 60) = 90
      expect(calcEconomyPrice(60, 30)).toBe(90);
      expect(calcItemPrice({ basePrice: 60 }, 30)).toBe(90);
    });

    it('keeps fixed-price items fixed regardless of economic index', () => {
      const fixedNewspaper = { basePrice: 1, isFixedPrice: true };
      const fixedLottery = { basePrice: 10, isFixedPrice: true };

      expect(calcItemPrice(fixedNewspaper, 90)).toBe(1);
      expect(calcItemPrice(fixedNewspaper, -30)).toBe(1);
      expect(calcItemPrice(fixedLottery, 90)).toBe(10);
      expect(calcItemPrice(fixedLottery, -30)).toBe(10);

      expect(calcEconomyPrice(10, 90, true)).toBe(10);
      expect(calcEconomyPrice(10, -30, true)).toBe(10);
    });
  });

  describe('fluctuateEconomy', () => {
    it('fluctuates economy within bounds', () => {
      // Mock math.random to return 0.5 (change 0, mult 2)
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.5);
      const newEcon = fluctuateEconomy(50, 0, -30, new Random(1));
      expect(newEcon[0]).toBe(50);

      // Mock random to return 0.99 (+1 trend, 3 mult => +3)
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.99);
      const highEcon = fluctuateEconomy(50, 0, -30, new Random(1));
      expect(highEcon[0]).toBe(53);

      // Mock random to return 0.01 (-1 trend, 1 mult => -1)
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.01);
      const lowEcon = fluctuateEconomy(50, 0, -30, new Random(1));
      expect(lowEcon[0]).toBe(49);
    });

    it('keeps economy between minReading and 90', () => {
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.01);
      const lowEcon = fluctuateEconomy(-25, -3, -30, new Random(1));
      expect(lowEcon[0]).toBeGreaterThanOrEqual(-30);

      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.99);
      const highEcon = fluctuateEconomy(85, 3, -30, new Random(1));
      expect(highEcon[0]).toBeLessThanOrEqual(90);
    });

    it('allows floppy edition to drop down to -90', () => {
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.01);
      const [newReading, newTrend] = fluctuateEconomy(-85, -3, -90, new Random(1));
      expect(newReading).toBe(-88);
      expect(newTrend).toBe(-3);

      const [clampedReading] = fluctuateEconomy(-89, -3, -90, new Random(1));
      expect(clampedReading).toBe(-90);
    });

    it('clamps trend between -3 and +3', () => {
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.99);
      const [, maxTrend] = fluctuateEconomy(0, 3, -30, new Random(1));
      expect(maxTrend).toBe(3);

      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.01);
      const [, minTrend] = fluctuateEconomy(0, -3, -30, new Random(1));
      expect(minTrend).toBe(-3);
    });
  });

  describe('applyMarketCrash', () => {
    it('applies minor crash correctly', () => {
      const player = { money: 1000, bankSavings: 1000, happiness: 50, inventory: { stocks: { tBills: 5, holdings: {} } } } as PlayerState;
      const updated = applyMarketCrash(player, 'minor', new Random(1));
      // minor crash drops happiness by 1 (no significant stocks)
      expect(updated.happiness).toBe(49);
      expect(updated.money).toBe(1000);
      expect(updated.bankSavings).toBe(1000);
    });

    it('applies moderate crash correctly and fires player when rng < 0.5', () => {
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.01); // Trigger fired
      const player = { money: 1000, bankSavings: 1000, happiness: 50, currentJobId: 'some_job', currentWage: 50, inventory: { stocks: { tBills: 5, holdings: { 'XYZ': 10 } } } } as unknown as PlayerState;
      const updated = applyMarketCrash(player, 'moderate', new Random(1));
      // moderate crash drops happiness by 4 (has stocks) + 7 (fired) = 11.
      expect(updated.happiness).toBe(39);
      expect(updated.currentJobId).toBeNull();
      expect(updated.currentWage).toBe(0);
    });

    it('applies moderate crash 20% wage cut when player is NOT fired (rng >= 0.5)', () => {
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.75); // Not fired!
      const player = { money: 1000, bankSavings: 1000, happiness: 50, currentJobId: 'some_job', currentWage: 50, inventory: { stocks: { tBills: 5, holdings: {} } } } as unknown as PlayerState;
      const updated = applyMarketCrash(player, 'moderate', new Random(1));
      // moderate crash drops happiness by 2 (no stocks), wage cut by 20% (50 * 0.8 = 40)
      expect(updated.happiness).toBe(48);
      expect(updated.currentJobId).toBe('some_job');
      expect(updated.currentWage).toBe(40);
      expect(updated.turnEvents.some(e => e.key === 'events.marketCrash.wageCut')).toBe(true);
    });

    it('applies major crash correctly and loses job and wipes savings', () => {
      const player = { money: 1000, bankSavings: 1000, happiness: 50, currentJobId: 'some_job', currentWage: 50, inventory: { stocks: { tBills: 5, holdings: {} } } } as PlayerState;
      const updated = applyMarketCrash(player, 'major', new Random(1));
      // major crash drops happiness by 3 (no stocks) + 7 (fired) = 10.
      expect(updated.happiness).toBe(40);
      expect(updated.currentJobId).toBeNull();
      expect(updated.bankSavings).toBe(0); // Bank savings wiped!
      expect(updated.money).toBe(1000); // Cash is safe
      expect(updated.turnEvents.some(e => e.key === 'events.marketCrash.bankSavingsLost')).toBe(true);
    });
  });

  describe('applyEconomicBoom', () => {
    const mockCampaign = {
      stocks: [
        { id: 'macrosoft', basePrice: 100, type: 'fluctuating' }
      ]
    } as any;

    it('grants +5 happiness to player with >$1000 in fluctuating stocks', () => {
      const player = {
        happiness: 50,
        inventory: {
          stocks: {
            tBills: 0,
            holdings: { macrosoft: 20 } // 20 * ~100 = ~2000 > 1000
          }
        }
      } as unknown as PlayerState;

      const updated = applyEconomicBoom(player, mockCampaign, 0, 8);
      expect(updated.happiness).toBe(55);
      expect(updated.turnEvents.some(e => e.key === 'events.economicBoom.investorBonus')).toBe(true);
    });

    it('does not grant happiness if stock holdings <= $1000', () => {
      const player = {
        happiness: 50,
        inventory: {
          stocks: {
            tBills: 10, // TBills don't count toward fluctuating stocks bonus
            holdings: {}
          }
        }
      } as unknown as PlayerState;

      const updated = applyEconomicBoom(player, mockCampaign, 0, 8);
      expect(updated.happiness).toBe(50);
      expect(updated.turnEvents.some(e => e.key === 'events.economicBoom.investorBonus')).toBe(false);
    });
  });

  describe('processRentDebt (Garnishment)', () => {
    it('handles partial garnishment with $2 interest fee correctly ($100 earned, $100 debt)', () => {
      const player = { rentDebt: 100 } as PlayerState;
      const [updated, netWage, totalGarnished] = processRentDebt(player, 100);

      expect(updated.rentDebt).toBe(50); // $50 deducted from debt
      expect(netWage).toBe(48); // $100 - $50 - $2 fee = $48
      expect(totalGarnished).toBe(52); // $50 debt + $2 fee = $52
    });

    it('matches the original Monolith Burgers screenshot example ($40 earned, $325 debt)', () => {
      const player = { rentDebt: 325 } as PlayerState;
      const [updated, netWage, totalGarnished] = processRentDebt(player, 40);

      expect(updated.rentDebt).toBe(305); // $20 deducted from debt
      expect(netWage).toBe(18); // $40 - $20 - $2 fee = $18
      expect(totalGarnished).toBe(22); // $20 debt + $2 fee = $22 garnished!
    });

    it('clears rent debt without interest fee when debt < 50% of earnings ($100 earned, $30 debt)', () => {
      const player = { rentDebt: 30 } as PlayerState;
      const [updated, netWage, totalGarnished] = processRentDebt(player, 100);

      expect(updated.rentDebt).toBe(0); // Debt fully cleared
      expect(netWage).toBe(70); // $100 - $30 = $70
      expect(totalGarnished).toBe(30); // No interest fee collected
    });
  });

  describe('calcSectorPrice (Sierra Script 109 math)', () => {
    it('returns exact base price when reading is at baseline 100', () => {
      expect(calcSectorPrice(100, 100)).toBe(100);
      expect(calcSectorPrice(50, 100)).toBe(50);
      expect(calcSectorPrice(250, 100)).toBe(250);
    });

    it('scales prices proportionally by 5/3 ratio for readings above and below 100', () => {
      // Reading 130: pct = 100 + floor((130-100)*5/3) = 150% -> 100 * 1.5 = 150
      expect(calcSectorPrice(100, 130)).toBe(150);
      // Reading 70: pct = 100 + floor((70-100)*5/3) = 50% -> 100 * 0.5 = 50
      expect(calcSectorPrice(100, 70)).toBe(50);
      // Reading 112: floor(12 * 5 / 3) = 20 -> 120% -> 100 * 1.2 = 120
      expect(calcSectorPrice(100, 112)).toBe(120);
    });

    it('enforces floor of 50% and ceiling of 250% by default', () => {
      // Deep depression reading 10: uncapped = -50%, capped = 50% -> 50
      expect(calcSectorPrice(100, 10)).toBe(50);
      // Massive bubble reading 220: uncapped = 300%, capped = 250% -> 250
      expect(calcSectorPrice(100, 220)).toBe(250);
    });

    it('respects custom price floor and ceiling rules', () => {
      const customRules = { priceFloorPercent: 40, priceCeilingPercent: 300 };
      expect(calcSectorPrice(100, 10, customRules)).toBe(40);
      expect(calcSectorPrice(100, 250, customRules)).toBe(300);
    });

    it('ensures prices never drop below 1 dollar', () => {
      expect(calcSectorPrice(1, 10)).toBe(1);
    });
  });

  describe('stepSector (Authentic Sierra Script 107 momentum & coupling)', () => {
    const defaultRules = {
      upwardBounceStrongThreshold: 80,
      upwardBounceModerateThreshold: 90,
      downwardBounceStrongThreshold: 160,
      downwardBounceModerateThreshold: 130,
      minReading: 70,
      maxReading: 190,
    };

    it('flags high mean-reversion when reading drops below thresholds', () => {
      const depressedSector = {
        index: 0,
        reading: 75, // < 80 -> high = 2
        high: 0,
        low: 0,
        lowerRange: -3,
        upperRange: 3,
        adjustment: 0,
      };

      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.5);
      const stepped = stepSector(depressedSector, 2, 0, defaultRules, new Random(1), false, 0, false);
      expect(stepped.high).toBe(2);
      expect(stepped.low).toBe(0);
    });

    it('flags low mean-reversion when reading rises above thresholds', () => {
      const overheatedSector = {
        index: 0,
        reading: 165, // > 160 -> low = 2
        high: 0,
        low: 0,
        lowerRange: -3,
        upperRange: 3,
        adjustment: 0,
      };

      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.5);
      const stepped = stepSector(overheatedSector, 2, 0, defaultRules, new Random(1), false, 0, false);
      expect(stepped.low).toBe(2);
      expect(stepped.high).toBe(0);
    });

    it('applies crash momentum shock and authentic proportional drop', () => {
      const sector = {
        index: 0,
        reading: 100,
        high: 0,
        low: 0,
        lowerRange: -3,
        upperRange: 3,
        adjustment: 0,
      };

      // Mock roll 0.5: with index -3, lowerRange = -9, upperRange = 3, range = 13.
      // adjustment = floor(0.5 * 13) - 9 = 6 - 9 = -3.
      // Reading before crash factor: 100 - 3 = 97.
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.5);

      // crashSeverity 3 = minor (* 19/20, ~5% drop)
      const steppedMinor = stepSector(sector, 2, 0, defaultRules, new Random(1), true, 3, false);
      expect(steppedMinor.index).toBe(-3);
      // Math.floor(97 * 19 / 20) = Math.floor(1843 / 20) = 92
      expect(steppedMinor.reading).toBe(92);

      // crashSeverity 1 = major (* 17/20, ~15% drop)
      const steppedMajor = stepSector(sector, 2, 0, defaultRules, new Random(1), true, 1, false);
      expect(steppedMajor.index).toBe(-3);
      // Math.floor(97 * 17 / 20) = Math.floor(1649 / 20) = 82
      expect(steppedMajor.reading).toBe(82);
    });

    it('applies economic boom momentum shock and authentic +10% boost', () => {
      const sector = {
        index: 0,
        reading: 100,
        high: 0,
        low: 0,
        lowerRange: -3,
        upperRange: 3,
        adjustment: 0,
      };

      // Mock roll 0.5: with index 3, lowerRange = -3, upperRange = 9, range = 13.
      // adjustment = floor(0.5 * 13) - 3 = 6 - 3 = 3.
      // Reading before boom factor: 100 + 3 = 103.
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.5);
      const steppedBoom = stepSector(sector, 2, 0, defaultRules, new Random(1), false, 0, true);
      expect(steppedBoom.index).toBe(3);
      // Math.floor(103 * 11 / 10) = Math.floor(1133 / 10) = 113
      expect(steppedBoom.reading).toBe(113);
    });

    it('incorporates parent sector index coupling (parentIndex / 3)', () => {
      const sector = {
        index: 0,
        reading: 100,
        high: 0,
        low: 0,
        lowerRange: -3,
        upperRange: 3,
        adjustment: 0,
      };

      // Force target to match index (0) so index stays 0, and adjustment roll to 0
      const steppedPositive = stepSector(sector, 0, 3, defaultRules, { next: () => 0.5 } as any, false, 0, false);
      // parentCoupling = floor(3 / 3) = +1
      const steppedNegative = stepSector(sector, 0, -3, defaultRules, { next: () => 0.5 } as any, false, 0, false);
      // parentCoupling = floor(-3 / 3) = -1

      expect(steppedPositive.reading).toBeGreaterThanOrEqual(steppedNegative.reading);
    });

    it('clamps reading within minReading and maxReading', () => {
      const nearMaxSector = {
        index: 3,
        reading: 189,
        high: 0,
        low: 0,
        lowerRange: -3,
        upperRange: 9,
        adjustment: 0,
      };

      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.99); // Max positive jump
      const stepped = stepSector(nearMaxSector, 0, 3, defaultRules, new Random(1), false, 0, false);
      expect(stepped.reading).toBeLessThanOrEqual(defaultRules.maxReading);

      const nearMinSector = {
        index: -3,
        reading: 71,
        high: 0,
        low: 0,
        lowerRange: -9,
        upperRange: 3,
        adjustment: 0,
      };

      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.01); // Max negative drop
      const steppedLow = stepSector(nearMinSector, 10, -3, defaultRules, new Random(1), false, 0, false);
      expect(steppedLow.reading).toBeGreaterThanOrEqual(defaultRules.minReading);
    });
  });

  describe('stepEconomySimulation (Hierarchical 8-Sector Engine)', () => {
    it('creates default simulation state with all 8 sectors initialized to 100', () => {
      const sim = createDefaultEconomySimulationState();
      expect(sim.main.reading).toBe(100);
      expect(sim.goods.reading).toBe(100);
      expect(sim.investments.reading).toBe(100);
      expect(sim.stocks.gold.reading).toBe(100);
      expect(sim.stocks.silver.reading).toBe(100);
      expect(sim.stocks.pork.reading).toBe(100);
      expect(sim.stocks.blueChip.reading).toBe(100);
      expect(sim.stocks.penny.reading).toBe(100);
    });

    it('advances all 8 sectors during normal step', () => {
      const sim = createDefaultEconomySimulationState();
      const stepped = stepEconomySimulation(sim, {}, new Random(42), 'none', false);

      expect(stepped.main).toBeDefined();
      expect(stepped.goods).toBeDefined();
      expect(stepped.investments).toBeDefined();
      expect(stepped.stocks.gold).toBeDefined();
      expect(stepped.stocks.silver).toBeDefined();
      expect(stepped.stocks.pork).toBeDefined();
      expect(stepped.stocks.blueChip).toBeDefined();
      expect(stepped.stocks.penny).toBeDefined();
      expect(stepped.lastCrashSeverity).toBe('none');
      expect(stepped.lastBoom).toBe(false);
    });

    it('propagates crash severity across all sectors', () => {
      const sim = createDefaultEconomySimulationState();
      const stepped = stepEconomySimulation(sim, {}, new Random(42), 'major', false);

      expect(stepped.lastCrashSeverity).toBe('major');
      expect(stepped.main.reading).toBeLessThan(100);
      expect(stepped.goods.reading).toBeLessThan(100);
      expect(stepped.stocks.gold.reading).toBeLessThan(100);
    });
  });

  describe('determineNewspaperMover', () => {
    it('returns null if all sector indices are within [-1, 1]', () => {
      const sim = createDefaultEconomySimulationState();
      sim.stocks.gold.index = 1;
      sim.stocks.silver.index = -1;
      sim.stocks.pork.index = 0;
      sim.stocks.blueChip.index = 0;
      sim.stocks.penny.index = 1;
      sim.investments.index = -1;
      sim.goods.index = 0;

      expect(determineNewspaperMover(sim)).toBeNull();
    });

    it('identifies the biggest gainer when gainer magnitude >= 2', () => {
      const sim = createDefaultEconomySimulationState();
      sim.stocks.gold.index = 3;
      sim.stocks.silver.index = 1;

      const mover = determineNewspaperMover(sim);
      expect(mover).not.toBeNull();
      expect(mover?.moverKey).toBe('newspaper.stocks.gold_up');
      expect(mover?.isUp).toBe(true);
      expect(mover?.sectorKey).toBe('gold');
    });

    it('prioritizes loser when loser drop magnitude exceeds gainer magnitude', () => {
      const sim = createDefaultEconomySimulationState();
      sim.stocks.gold.index = 2;
      sim.stocks.pork.index = -3;

      const mover = determineNewspaperMover(sim);
      expect(mover).not.toBeNull();
      expect(mover?.moverKey).toBe('newspaper.stocks.pork_down');
      expect(mover?.isUp).toBe(false);
      expect(mover?.sectorKey).toBe('pork');
    });
  });

  describe('generatePredictiveStockTip', () => {
    it('generates a strong buy tip when a stock has high mean-reversion flag set (depressed price)', () => {
      const sim = createDefaultEconomySimulationState();
      sim.stocks.gold.high = 2; // Strong bounce imminent
      sim.stocks.gold.index = 1;

      const tip = generatePredictiveStockTip(sim, new Random(1));
      expect(tip).not.toBeNull();
      expect(tip?.action).toBe('buy');
      expect(tip?.commodityId).toBe('gold');
      expect(tip?.headlineKey).toContain('gold_buy_headline');
    });

    it('generates a strong sell tip when a stock has low mean-reversion flag set (overheated price)', () => {
      const sim = createDefaultEconomySimulationState();
      sim.stocks.penny.low = 2; // Overheated, correction imminent
      sim.stocks.penny.index = -1;

      const tip = generatePredictiveStockTip(sim, new Random(1));
      expect(tip).not.toBeNull();
      expect(tip?.action).toBe('sell');
      expect(tip?.commodityId).toBe('penny_stocks');
      expect(tip?.headlineKey).toContain('penny_stocks_sell_headline');
    });

    it('generates a hold tip when all stocks are in neutral range', () => {
      const sim = createDefaultEconomySimulationState();
      // All sectors high=0, low=0, index=0
      const tip = generatePredictiveStockTip(sim, new Random(1));
      expect(tip).not.toBeNull();
      expect(tip?.action).toBe('hold');
    });
  });

  describe('calcStockPrice with authentic economy simulation', () => {
    it('calculates price from commodity sector reading when simulation is provided', () => {
      const sim = createDefaultEconomySimulationState();
      sim.stocks.gold.reading = 130; // 150% of basePrice (100) -> 150

      const price = calcStockPrice(100, 0, 12345, sim, 'gold');
      expect(price).toBe(150);
    });

    it('falls back to deterministic sine wave when economySimulation is not provided', () => {
      const price1 = calcStockPrice(100, 0, 12345, undefined, 'gold');
      expect(typeof price1).toBe('number');
      expect(price1).toBeGreaterThan(0);
    });
  });
});
