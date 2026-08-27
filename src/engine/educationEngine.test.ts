// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enrollInDegree, study, formatDegreeProgress } from './educationEngine';
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
      expect(result.message?.key).toBe('action.error.missingPrereq');
    });

    it('fails if insufficient funds', () => {
      const player = { degrees: [], money: 40, enrolledClasses: {} } as PlayerState;
      const result = enrollInDegree(player, mockDegree);
      expect(result.success).toBe(false);
      expect(result.message?.key).toBe('action.error.notEnoughMoneyTuition');
    });

    it('succeeds and deducts tuition', () => {
      const player = { degrees: [], money: 100, enrolledClasses: {} } as PlayerState;
      const result = enrollInDegree(player, mockDegree);
      expect(result.success).toBe(true);
      expect(result.updated.money).toBe(50);
      expect(result.updated.enrolledClasses['junior_college']).toBe(0);
    });

    it('fails if max enrolled classes limit is reached', () => {
      const player = { degrees: [], money: 500, enrolledClasses: { 'c1': 0, 'c2': 0, 'c3': 0, 'c4': 0 } } as PlayerState;
      const result = enrollInDegree(player, mockDegree);
      expect(result.success).toBe(false);
      expect(result.message?.key).toBe('action.error.maxEnrolledClasses');
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
        happiness: 50, dependability: 50, degreeDepBoost: 50, degreeExpBoost: 50,
        degrees: [],
        inventory: { appliances: [{id: 'computer'}], books: ['dictionary', 'encyclopedia', 'atlas'] }
      } as PlayerState; // computer (-1), all books (-1) = 8 required
      
      const result = study(player, mockDegree, 6); // completes 8th lesson, should graduate!
      expect(result.success).toBe(true);
      expect(result.updated.degrees).toContain('junior_college');
      expect(result.updated.enrolledClasses['junior_college']).toBeUndefined();
      // Rewards: +5 happ, +5 dep, +5 maxDep, +5 maxExp
      expect(result.updated.happiness).toBe(55);
      expect(result.updated.degreeDepBoost).toBe(55);
      expect(result.updated.degreeExpBoost).toBe(55);
    });

    it('reduces degree rewards if reducedDegreeStatBonus rule is enabled', () => {
      const player = { 
        hoursRemaining: 10, 
        enrolledClasses: { 'junior_college': 7 },
        happiness: 50, dependability: 50, degreeDepBoost: 50, degreeExpBoost: 50,
        degrees: [],
        inventory: { appliances: [{id: 'computer'}], books: ['dictionary', 'encyclopedia', 'atlas'] },
      } as unknown as PlayerState;
      const rules = { reducedDegreeStatBonus: true } as any;
      
      const result = study(player, mockDegree, 6, rules);
      expect(result.success).toBe(true);
      expect(result.updated.degrees).toContain('junior_college');
      // Rewards should be +5 happ, +2 dep, +2 maxDep, +2 maxExp because of the rule
      expect(result.updated.happiness).toBe(55); // happiness is unchanged by this rule
      expect(result.updated.dependability).toBe(52);
      expect(result.updated.degreeDepBoost).toBe(52);
      expect(result.updated.degreeExpBoost).toBe(52);
    });

    it('percentageEducation tracks continuous 0-100% progress and prorates partial sessions', () => {
      
      const rules = {
        percentageEducation: true,
        proportionalDivisibleActions: true,
        allowPartialHours: true,
        educationResolution: 0.1
      } as any;

      const player = {
        hoursRemaining: 3, // Partial session (3 hours out of standard 6)
        enrolledClasses: { 'junior_college': 40.0 },
        inventory: { appliances: [], books: [] }
      } as unknown as PlayerState;

      // 10 lessons required * 6h = 60h total. 3 hours = 3/60 * 100 = 5.0%
      const result = study(player, mockDegree, 6, rules);
      expect(result.success).toBe(true);
      expect(result.updated.enrolledClasses['junior_college']).toBe(45.0);
      expect(result.updated.hoursRemaining).toBe(0);

      // Verify graduation on reaching >= 99.0%
      const graduatingPlayer = {
        hoursRemaining: 6,
        enrolledClasses: { 'junior_college': 95.0 },
        happiness: 50, dependability: 50, degreeDepBoost: 50, degreeExpBoost: 50,
        degrees: [],
        inventory: { appliances: [], books: [] }
      } as unknown as PlayerState;

      const gradResult = study(graduatingPlayer, mockDegree, 6, rules);
      expect(gradResult.success).toBe(true);
      expect(gradResult.updated.degrees).toContain('junior_college');
      expect(gradResult.updated.enrolledClasses['junior_college']).toBeUndefined();

      // Verify computer discount 9 lessons (11.1% per session -> 88.8% on 8th session, 9th session finishes at 99.9% -> graduates!)
      const computerPlayer = {
        hoursRemaining: 6,
        enrolledClasses: { 'junior_college': 88.8, 'junior_college_req': 9 },
        happiness: 50, dependability: 50, degreeDepBoost: 50, degreeExpBoost: 50,
        degrees: [],
        inventory: { appliances: [{ id: 'computer', name: 'Computer' }], books: [] }
      } as unknown as PlayerState;

      const compResult = study(computerPlayer, mockDegree, 6, rules);
      expect(compResult.success).toBe(true);
      expect(compResult.updated.degrees).toContain('junior_college');

      // Verify proportional hours spent when near completion
      const nearDonePlayer = {
        hoursRemaining: 6,
        enrolledClasses: { 'junior_college': 98.0 },
        happiness: 50, dependability: 50, degreeDepBoost: 50, degreeExpBoost: 50,
        degrees: [],
        inventory: { appliances: [], books: [] }
      } as unknown as PlayerState;

      const nearDoneResult = study(nearDonePlayer, mockDegree, 6, rules);
      expect(nearDoneResult.success).toBe(true);
      expect(nearDoneResult.updated.degrees).toContain('junior_college');
      // 2% of 60h is 1.2h -> spends only ~1.5h, not 6h!
      expect(nearDoneResult.updated.hoursRemaining).toBeGreaterThanOrEqual(4);

      // Format degree progress tests
      expect(formatDegreeProgress(45.5, true)).toBe('45.5%');
      expect(formatDegreeProgress(50.0, true)).toBe('50%');
      expect(formatDegreeProgress(99.9, true)).toBe('100%');
      expect(formatDegreeProgress(4, false)).toBe('4');
    });
  });
});

