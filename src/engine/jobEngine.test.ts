import { Random } from '../utils/rng';
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyForJob, workShift } from './jobEngine';
import type { PlayerState } from './gameState';
import type { JobDef } from './dataLoader';

describe('Job Engine', () => {
  const burgerCook: JobDef = {
    id: 'burger_cook',
    title: 'Burger Cook',
    locationId: 'burger_palace',
    baseWage: 5,
    perks: [],
    requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' },
    tags: ['auto_accept']
  };

  const salesManager: JobDef = {
    id: 'sales_manager',
    title: 'Sales Manager',
    locationId: 'z_mart',
    baseWage: 12,
    perks: [],
    requirements: { experience: 50, dependability: 50, degrees: ['business_admin'], uniform: 'business' }
  };

  const lowLevelJob: JobDef = {
    id: 'zmart_clerk',
    title: 'Z-Mart Clerk',
    locationId: 'z_mart',
    baseWage: 5,
    perks: [],
    requirements: { experience: 10, dependability: 10, degrees: [], uniform: 'casual' }
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('applyForJob', () => {
    it('burger cook is always accepted', () => {
      const player = { hoursRemaining: 20, experience: 0, dependability: 0, degrees: [] } as unknown as PlayerState;
      const result = applyForJob(player, burgerCook, 4, {}, undefined, new Random(1));
      expect(result.success).toBe(true);
      expect(result.updated.currentJobId).toBe('burger_cook');
      expect(result.updated.currentWage).toBe(5);
    });

    it('rejects if missing hard requirements (experience)', () => {
      const player = { hoursRemaining: 20, experience: 10, dependability: 60, degrees: ['business_admin'] } as unknown as PlayerState;
      const result = applyForJob(player, salesManager, 4, {}, undefined, new Random(1));
      expect(result.success).toBe(false);
      expect(result.message?.key).toBe('action.job.rejected');
    });

    it('rejects if missing degree', () => {
      const player = { hoursRemaining: 20, experience: 60, dependability: 60, degrees: [] } as unknown as PlayerState;
      const result = applyForJob(player, salesManager, 4, {}, undefined, new Random(1));
      expect(result.success).toBe(false);
      expect(result.message?.key).toBe('action.job.rejected');
    });

    it('rejects due to bad luck roll', () => {
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.99); // Force high roll (99)
      const player = { hoursRemaining: 20, experience: 10, dependability: 10, degrees: [] } as unknown as PlayerState;
      const result = applyForJob(player, lowLevelJob, 4, {}, undefined, new Random(1)); // Luck = 40 + 10 + 10 = 60. 99 > 60 = rejected.
      expect(result.success).toBe(false);
      expect(result.message?.key).toBe('action.job.noOpenings');
    });

    it('grants +2 experience when getting a new job', () => {
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.01); 
      const player = { hoursRemaining: 20, experience: 10, dependability: 20, degrees: [] } as unknown as PlayerState;
      const result = applyForJob(player, lowLevelJob, 4, {}, undefined, new Random(1));
      expect(result.success).toBe(true);
      expect(result.updated.experience).toBe(12);
    });

    it('resets dependability to 10 if it is below 10 when getting a new job', () => {
      const player = { hoursRemaining: 20, experience: 10, dependability: 5, degrees: [] } as unknown as PlayerState;
      // burgerCook requires 0 dep, so player won't be rejected upfront
      const result = applyForJob(player, burgerCook, 4, {}, undefined, new Random(1));
      expect(result.success).toBe(true);
      expect(result.updated.dependability).toBe(10);
    });
  });

  describe('workShift', () => {
    it('fails if no clothes matching requirement', () => {
      const player = { 
        hoursRemaining: 20, 
        currentJobId: 'sales_manager',
        inventory: { casualClothesWeeks: 10, dressClothesWeeks: 0, businessClothesWeeks: 0, selectedClothes: 'casual' }
      } as unknown as PlayerState;
      const result = workShift(player, salesManager, 6);
      expect(result.success).toBe(false);
      expect(result.message?.key).toBe('action.job.needClothes');
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
      
      const result = workShift(player, salesManager, 6);
      expect(result.success).toBe(true);
      expect(result.wagesEarned).toBe(96); // 12 * 8 hours
      expect(result.updated.money).toBe(96);
      expect(result.updated.turnFlags.hasWorked).toBe(true);
    });

    it('fires the player if dependability is 5 points below requirement', () => {
      const player = { 
        hoursRemaining: 20, 
        currentJobId: 'sales_manager',
        dependability: 45, // requirement is 50
        maxDependability: 20,
        turnFlags: { hasWorked: false },
        inventory: { businessClothesWeeks: 10, selectedClothes: 'business' }
      } as unknown as PlayerState;
      
      const result = workShift(player, salesManager, 6);
      expect(result.success).toBe(false);
      expect(result.message?.key).toBe('action.job.fired');
      expect(result.updated.currentJobId).toBeNull();
    });

    it('warns the player if dependability is 3 to 5 points below requirement', () => {
      const player = { 
        hoursRemaining: 20, 
        currentJobId: 'sales_manager',
        currentWage: 12,
        money: 0,
        rentDebt: 0,
        experience: 50,
        maxExperience: 100,
        dependability: 47, // requirement is 50
        maxDependability: 100,
        turnFlags: { hasWorked: false },
        inventory: { casualClothesWeeks: 0, dressClothesWeeks: 0, businessClothesWeeks: 10, selectedClothes: 'business' }
      } as unknown as PlayerState;
      
      const result = workShift(player, salesManager, 6);
      expect(result.success).toBe(true);
      expect(result.message?.key).toBe('action.job.warning');
    });
  });
});
