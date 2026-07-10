import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fluctuateEconomy, applyMarketCrash } from './economyEngine';
import type { PlayerState } from './gameState';

describe('Economy Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('fluctuateEconomy', () => {
    it('fluctuates economy within bounds', () => {
      // Mock math.random to return 0.5 (no change)
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const newEcon = fluctuateEconomy(50);
      expect(newEcon).toBe(50);

      // Mock random to return 0.99 (+10)
      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      const highEcon = fluctuateEconomy(50);
      expect(highEcon).toBe(60);

      // Mock random to return 0.01 (-10)
      vi.spyOn(Math, 'random').mockReturnValue(0.01);
      const lowEcon = fluctuateEconomy(50);
      expect(lowEcon).toBe(40);
    });

    it('keeps economy between -30 and 90', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01);
      const lowEcon = fluctuateEconomy(-25);
      expect(lowEcon).toBeGreaterThanOrEqual(-30);

      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      const highEcon = fluctuateEconomy(85);
      expect(highEcon).toBeLessThanOrEqual(90);
    });
  });

  describe('applyMarketCrash', () => {
    it('applies minor crash correctly', () => {
      const player = { money: 1000, bankSavings: 1000, happiness: 50, inventory: { stocks: { tBills: 5, holdings: {} } } } as PlayerState;
      const updated = applyMarketCrash('minor', player);
      // minor crash drops happiness by 1 (no significant stocks)
      expect(updated.happiness).toBe(49);
      expect(updated.money).toBe(1000);
      expect(updated.bankSavings).toBe(1000);
    });

    it('applies moderate crash correctly', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01); // Trigger fired
      const player = { money: 1000, bankSavings: 1000, happiness: 50, currentJobId: 'some_job', currentWage: 50, inventory: { stocks: { tBills: 5, holdings: { 'XYZ': 10 } } } } as PlayerState;
      const updated = applyMarketCrash('moderate', player);
      // moderate crash drops happiness by 4 (has stocks) + 7 (fired) = 11.
      expect(updated.happiness).toBe(39);
      expect(updated.currentJobId).toBeNull();
      expect(updated.currentWage).toBe(0);
    });

    it('applies major crash correctly and loses job', () => {
      const player = { money: 1000, bankSavings: 1000, happiness: 50, currentJobId: 'some_job', currentWage: 50, inventory: { stocks: { tBills: 5, holdings: {} } } } as PlayerState;
      const updated = applyMarketCrash('major', player);
      // major crash drops happiness by 3 (no stocks) + 7 (fired) = 10.
      expect(updated.happiness).toBe(40);
      expect(updated.currentJobId).toBeNull();
      expect(updated.bankSavings).toBe(0); // Bank savings wiped!
      expect(updated.money).toBe(1000); // Cash is safe
    });
  });
});
