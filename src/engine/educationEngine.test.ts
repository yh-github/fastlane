// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrollInDegree, study } from './educationEngine';
import type { PlayerState } from './gameState';
import type { EducationDef } from './dataLoader';

describe('Education Engine', () => {
  const mockDegree: EducationDef = {
    id: 'junior_college',
    name: 'Junior College',
    prerequisites: [],
    baseTuitionFee: 50,
    lessonsRequired: 10,
    rewards: { happiness: 5, dependability: 5, maxDepBoost: 5, maxExpBoost: 5 }
  };

  const mockAdvancedDegree: EducationDef = {
    id: 'business_admin',
    name: 'Business Admin.',
    prerequisites: ['junior_college'],
    baseTuitionFee: 50,
    lessonsRequired: 10,
    rewards: { happiness: 5, dependability: 5, maxDepBoost: 5, maxExpBoost: 5 }
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('enrollInDegree', () => {
    it('fails if prereqs missing', () => {
      const player = { degrees: [], money: 100, enrolledClasses: {} } as PlayerState;
      const result = enrollInDegree(player, mockAdvancedDegree);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Prerequisite required');
    });

    it('fails if insufficient funds', () => {
      const player = { degrees: [], money: 40, enrolledClasses: {} } as PlayerState;
      const result = enrollInDegree(player, mockDegree);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Not enough money');
    });

    it('succeeds and deducts tuition', () => {
      const player = { degrees: [], money: 100, enrolledClasses: {} } as PlayerState;
      const result = enrollInDegree(player, mockDegree);
      expect(result.success).toBe(true);
      expect(result.updated.money).toBe(50);
      expect(result.updated.enrolledClasses['junior_college']).toBe(0);
    });
  });

  describe('study', () => {
    it('fails if not enrolled or not enough hours (strict rules)', () => {
      const player = { hoursRemaining: 5, enrolledClasses: { 'junior_college': 0 }, inventory: { appliances: [], books: [] } } as PlayerState;
      const result = study(player, mockDegree, 6, { allowPartialHours: false } as any);
      expect(result.success).toBe(false); // requires 6 hours
    });

    it('succeeds with partial hours if rule is enabled', () => {
      const player = { 
        hoursRemaining: 5, 
        enrolledClasses: { 'junior_college': 0 },
        inventory: { appliances: [], books: [] }
      } as PlayerState;
      const result = study(player, mockDegree, 6, { allowPartialHours: true } as any);
      expect(result.success).toBe(true); 
      expect(result.updated.enrolledClasses['junior_college']).toBe(1);
      expect(result.updated.hoursRemaining).toBe(0);
    });

    it('fails if not enough time and allowPartialHours is false', () => {
      const player = { hoursRemaining: 2, enrolledClasses: { 'business_admin': 0 }, inventory: { appliances: [], books: [] } } as PlayerState;
      const result = study(player, mockDegree, 6, { allowPartialHours: false } as any);
      expect(result.success).toBe(false);
      expect(result.updated.enrolledClasses['business_admin']).toBe(0);
      expect(result.updated.hoursRemaining).toBe(2);
    });

    it('progresses lesson by 1', () => {
      const player = { 
        hoursRemaining: 10, 
        enrolledClasses: { 'junior_college': 0 },
        inventory: { appliances: [], books: [] }
      } as PlayerState;
      const result = study(player, mockDegree, 6);
      expect(result.success).toBe(true);
      expect(result.updated.enrolledClasses['junior_college']).toBe(1);
      expect(result.updated.hoursRemaining).toBe(4);
    });

    it('reduces required lessons if books/computer owned', () => {
      const player = { 
        hoursRemaining: 10, 
        enrolledClasses: { 'junior_college': 7 },
        happiness: 50, dependability: 50, maxDependability: 50, maxExperience: 50,
        degrees: [],
        inventory: { appliances: [{id: 'computer'}], books: ['dictionary', 'encyclopedia', 'atlas'] }
      } as PlayerState; // computer (-1), all books (-1) = 8 required
      
      const result = study(player, mockDegree, 6); // completes 8th lesson, should graduate!
      expect(result.success).toBe(true);
      expect(result.updated.degrees).toContain('junior_college');
      expect(result.updated.enrolledClasses['junior_college']).toBeUndefined();
      // Rewards: +5 happ, +5 dep, +5 maxDep, +5 maxExp
      expect(result.updated.happiness).toBe(55);
      expect(result.updated.maxDependability).toBe(55);
    });
  });
});
