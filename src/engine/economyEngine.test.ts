import { Random } from '../utils/rng';
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fluctuateEconomy, applyMarketCrash, applyEconomicBoom, calcEconomyPrice, calcItemPrice, processRentDebt } from './economyEngine';
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
});
