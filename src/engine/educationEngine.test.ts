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
      const player = { degrees: [], money: 100 } as PlayerState;
      const result = enrollInDegree(player, mockAdvancedDegree);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Prerequisite required');
    });

    it('fails if insufficient funds', () => {
      const player = { degrees: [], money: 40 } as PlayerState;
      const result = enrollInDegree(player, mockDegree);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Not enough money');
    });

    it('succeeds and deducts tuition', () => {
      const player = { degrees: [], money: 100 } as PlayerState;
      const result = enrollInDegree(player, mockDegree);
      expect(result.success).toBe(true);
      expect(result.updated.money).toBe(50);
      expect(result.updated.currentDegreeId).toBe('junior_college');
    });
  });

  describe('study', () => {
    it('fails if not enrolled or not enough hours', () => {
      const player = { hoursRemaining: 5, currentDegreeId: 'junior_college' } as PlayerState;
      const result = study(player, mockDegree);
      expect(result.success).toBe(false); // requires 6 hours
    });

    it('progresses lesson by 1', () => {
      const player = { 
        hoursRemaining: 10, 
        currentDegreeId: 'junior_college', 
        lessonsCompleted: 0,
        inventory: { appliances: [], books: [] }
      } as PlayerState;
      const result = study(player, mockDegree);
      expect(result.success).toBe(true);
      expect(result.updated.lessonsCompleted).toBe(1);
      expect(result.updated.hoursRemaining).toBe(4);
    });

    it('reduces required lessons if books/computer owned', () => {
      const player = { 
        hoursRemaining: 10, 
        currentDegreeId: 'junior_college', 
        lessonsCompleted: 7,
        happiness: 50, dependability: 50, maxDependability: 50, maxExperience: 50,
        degrees: [],
        inventory: { appliances: [{id: 'computer'}], books: ['dictionary', 'encyclopedia', 'atlas'] }
      } as PlayerState; // computer (-1), all books (-1) = 8 required
      
      const result = study(player, mockDegree); // completes 8th lesson, should graduate!
      expect(result.success).toBe(true);
      expect(result.updated.degrees).toContain('junior_college');
      expect(result.updated.currentDegreeId).toBeNull();
      // Rewards: +5 happ, +5 dep, +5 maxDep, +5 maxExp
      expect(result.updated.happiness).toBe(55);
      expect(result.updated.maxDependability).toBe(55);
    });
  });
});
