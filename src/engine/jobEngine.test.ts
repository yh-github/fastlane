// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyForJob, workShift } from './jobEngine';
import type { PlayerState } from './gameState';
import type { JobDef } from './dataLoader';

describe('Job Engine', () => {
  const burgerCook: JobDef = {
    id: 'burger_cook',
    title: 'Burger Cook',
    baseWage: 5,
    requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' }
  };

  const salesManager: JobDef = {
    id: 'sales_manager',
    title: 'Sales Manager',
    baseWage: 12,
    requirements: { experience: 50, dependability: 50, degrees: ['business_admin'], uniform: 'business' }
  };

  const lowLevelJob: JobDef = {
    id: 'zmart_clerk',
    title: 'Z-Mart Clerk',
    baseWage: 5,
    requirements: { experience: 10, dependability: 10, degrees: [], uniform: 'casual' }
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('applyForJob', () => {
    it('burger cook is always accepted', () => {
      const player = { hoursRemaining: 20, experience: 0, dependability: 0, degrees: [] } as PlayerState;
      const result = applyForJob(player, burgerCook);
      expect(result.success).toBe(true);
      expect(result.updated.currentJobId).toBe('burger_cook');
      expect(result.updated.currentWage).toBe(5);
    });

    it('rejects if missing hard requirements (experience)', () => {
      const player = { hoursRemaining: 20, experience: 10, dependability: 60, degrees: ['business_admin'] } as PlayerState;
      const result = applyForJob(player, salesManager);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Not enough experience');
    });

    it('rejects if missing degree', () => {
      const player = { hoursRemaining: 20, experience: 60, dependability: 60, degrees: [] } as PlayerState;
      const result = applyForJob(player, salesManager);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing required degree: business_admin');
    });

    it('rejects due to bad luck roll', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99); // Force high roll (99)
      const player = { hoursRemaining: 20, experience: 10, dependability: 10, degrees: [] } as PlayerState;
      const result = applyForJob(player, lowLevelJob); // Luck = 40 + 10 + 10 = 60. 99 > 60 = rejected.
      expect(result.success).toBe(false);
      expect(result.message).toContain('bad luck');
    });
  });

  describe('workShift', () => {
    it('fails if no clothes matching requirement', () => {
      const player = { 
        hoursRemaining: 20, 
        currentJobId: 'sales_manager',
        inventory: { casualClothesWeeks: 10, dressClothesWeeks: 0, businessClothesWeeks: 0, selectedClothes: 'casual' }
      } as unknown as PlayerState;
      const result = workShift(player, salesManager);
      expect(result.success).toBe(false);
      expect(result.message).toContain('need business clothes');
    });

    it('succeeds with correct clothes and pays wage', () => {
      const player = { 
        hoursRemaining: 20, 
        currentJobId: 'sales_manager',
        currentWage: 12,
        money: 0,
        rentDebt: 0,
        experience: 50,
        maxExperience: 100,
        dependability: 50,
        maxDependability: 100,
        turnFlags: { hasWorked: false },
        inventory: { casualClothesWeeks: 0, dressClothesWeeks: 0, businessClothesWeeks: 10, selectedClothes: 'business' }
      } as unknown as PlayerState;
      
      const result = workShift(player, salesManager);
      expect(result.success).toBe(true);
      expect(result.wagesEarned).toBe(96); // 12 * 8 hours
      expect(result.updated.money).toBe(96);
      expect(result.updated.turnFlags.hasWorked).toBe(true);
    });
  });
});
