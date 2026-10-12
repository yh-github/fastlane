import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Random } from '../../utils/rng';
import { applyForJob } from './jobApplication';
import type { PlayerState } from '../gameState';
import type { JobDef } from '../dataLoader';

describe('jobApplication', () => {
  const burgerCook: JobDef = {
    id: 'burger_cook',
    title: 'Burger Cook',
    locationId: 'burger_palace',
    baseWage: 5,
    perks: [],
    requirements: { experience: 10, dependability: 10, degrees: [], uniform: 'casual' },
    tags: ['always_hiring']
  };

  const salesManager: JobDef = {
    id: 'sales_manager',
    title: 'Sales Manager',
    locationId: 'z_mart',
    baseWage: 12,
    perks: [],
    requirements: { experience: 50, dependability: 50, degrees: ['business_admin'], uniform: 'business' }
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('applyForJob', () => {
    it('always_hiring job is accepted when requirements are met', () => {
      const player = { hoursRemaining: 20, experience: 10, dependability: 10, degrees: [], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, burgerCook, 4, {}, undefined, new Random(1), { grantExpOnJobSwitch: true });
      expect(result.success).toBe(true);
      expect(result.updated.currentJobId).toBe('burger_cook');
      expect(result.updated.currentWage).toBe(5);
      expect(result.updated.experience).toBe(12); // With grantExpOnJobSwitch: true
    });

    it('does not grant experience on job switch if grantExpOnJobSwitch is false (Advanced)', () => {
      const player = { hoursRemaining: 20, experience: 10, dependability: 10, degrees: [], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, burgerCook, 4, {}, undefined, new Random(1), { grantExpOnJobSwitch: false });
      expect(result.success).toBe(true);
      expect(result.updated.currentJobId).toBe('burger_cook');
      expect(result.updated.experience).toBe(10);
    });

    it('always_hiring job is rejected if player does not meet hard requirements', () => {
      const player = { hoursRemaining: 20, experience: 0, dependability: 0, degrees: [], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, burgerCook, 4);
      expect(result.success).toBe(false);
      expect(result.updated.currentJobId).toBeUndefined();
    });

    it('rejects if missing hard requirements (experience)', () => {
      const player = { hoursRemaining: 20, experience: 0, dependability: 50, degrees: ['business_admin'], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, salesManager, 4);
      expect(result.success).toBe(false);
      expect(result.message.params?.reasons).toContain('Not enough experience.');
    });

    it('rejects if missing hard requirements (dependability - Poor Work History)', () => {
      const player = { hoursRemaining: 20, experience: 50, dependability: 0, degrees: ['business_admin'], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, salesManager, 4, {}, undefined, undefined, { maskEarlyJobRejections: false });
      expect(result.success).toBe(false);
      expect(result.message.params?.reasons).toContain('Poor Work History.');
    });

    it('rejects if missing degree', () => {
      const player = { hoursRemaining: 20, experience: 50, dependability: 50, degrees: [], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, salesManager, 4);
      expect(result.success).toBe(false);
      expect(result.message.params?.missingDegrees).toContain('business_admin');
    });

    it('suppresses Poor Work History on turns 1-4 when missing multiple requirements and maskEarlyJobRejections is true', () => {
      const player = { hoursRemaining: 20, experience: 0, dependability: 0, degrees: [], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, salesManager, 4, {}, undefined, undefined, { maskEarlyJobRejections: true }, 1);
      expect(result.success).toBe(false);
      expect(result.message.params?.reasons).toContain('Not enough experience.');
      expect(result.message.params?.reasons).not.toContain('Poor Work History.');
    });

    it('masks as "no openings" on turns 1-4 when dependability is the ONLY missing requirement and maskEarlyJobRejections is true', () => {
      const player = { hoursRemaining: 20, experience: 50, dependability: 0, degrees: ['business_admin'], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, salesManager, 4, {}, undefined, undefined, { maskEarlyJobRejections: true }, 1);
      expect(result.success).toBe(false);
      expect(result.message.key).toBe('action.job.noOpenings');
    });

    it('returns ALL rejection reasons together (experience, dependability, degrees) when multiple requirements are missing', () => {
      const player = { hoursRemaining: 20, experience: 0, dependability: 0, degrees: [], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, salesManager, 4, {}, undefined, undefined, { maskEarlyJobRejections: false }, 5);
      expect(result.success).toBe(false);
      expect(result.message.params?.reasons).toContain('Not enough experience.');
      expect(result.message.params?.reasons).toContain('Poor Work History.');
      expect(result.message.params?.reasons).toContain('business_admin');
    });

    it('returns "Not enough education." alongside experience and dependability when job_apply_missing_education is configured', () => {
      const player = { hoursRemaining: 20, experience: 0, dependability: 0, degrees: [], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const messages = { job_apply_missing_education: 'Not enough education.' };
      const result = applyForJob(player, salesManager, 4, messages, undefined, undefined, { maskEarlyJobRejections: false }, 5);
      expect(result.success).toBe(false);
      expect(result.message.params?.reasons).toContain('Not enough experience.');
      expect(result.message.params?.reasons).toContain('Poor Work History.');
      expect(result.message.params?.reasons).toContain('Not enough education.');
    });

    it('returns "Not enough education: missing [degrees]" when helpfulUI is true', () => {
      const player = { hoursRemaining: 20, experience: 50, dependability: 50, degrees: [], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, salesManager, 4, {}, undefined, undefined, { helpfulUI: true });
      expect(result.success).toBe(false);
      expect(result.message.params?.reasons).toContain('Not enough education: missing Business Administration.');
    });

    it('returns ALL rejection reasons in Advanced including Management Skill and Technical Skill', () => {
      const ceoJob: JobDef = {
        id: 'corp_ceo',
        title: 'Chief Executive Officer',
        locationId: 'office_corp',
        baseWage: 35,
        perks: [],
        requirements: { experience: 60, dependability: 60, degrees: ['business_admin', 'graduate_school'], uniform: 'business' },
        tags: ['executive_management']
      };
      const player = {
        hoursRemaining: 20,
        experience: 20,
        dependability: 20,
        degrees: [],
        skillMgmt: 0,
        turnFlags: { jobsRejectedThisTurn: [] }
      } as unknown as PlayerState;

      const result = applyForJob(player, ceoJob, 4, {}, undefined, undefined, { usePhysicalMentalConditions: true, maskEarlyJobRejections: false }, 5);
      expect(result.success).toBe(false);
      expect(result.message.params?.reasons).toContain('Not enough experience.');
      expect(result.message.params?.reasons).toContain('Poor Work History.');
      expect(result.message.params?.reasons).toContain('business_admin');
      expect(result.message.params?.reasons).toContain('Requires at least 6.00 Management Skill');
    });

    it('rejects due to insufficient employability roll', () => {
      const normalJob: JobDef = {
        id: 'office_clerk',
        title: 'Office Clerk',
        locationId: 'office',
        baseWage: 8,
        perks: [],
        requirements: { experience: 10, dependability: 10, degrees: [], uniform: 'casual' }
      };
      const player = {
        hoursRemaining: 20,
        experience: 10,
        dependability: 10,
        degrees: [],
        turnFlags: { jobsRejectedThisTurn: [] }
      } as unknown as PlayerState;

      const replayHighRoll = { inDecisions: [{ type: 'job_apply_luck', result: 99 }], outDecisions: [] };
      const result = applyForJob(player, normalJob, 4, {}, undefined, undefined, {}, 1, replayHighRoll);
      expect(result.success).toBe(false);
      expect(result.message.key).toBe('action.job.noOpenings');
    });

    it('grants +2 experience in classic when getting a new job', () => {
      const player = { hoursRemaining: 20, experience: 10, dependability: 10, degrees: [], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, burgerCook, 4, {}, undefined, new Random(1));
      expect(result.success).toBe(true);
      expect(result.updated.experience).toBe(12);
    });

    it('resets dependability to 10 if it is below 10 when getting a new job', () => {
      const zeroDepJob: JobDef = {
        id: 'entry_zero',
        title: 'Entry Zero',
        locationId: 'entry',
        baseWage: 5,
        perks: [],
        requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' },
        tags: ['always_hiring']
      };
      const player = { hoursRemaining: 20, experience: 10, dependability: 5, degrees: [], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, zeroDepJob, 4, {}, undefined, new Random(1));
      expect(result.success).toBe(true);
      expect(result.updated.dependability).toBe(10);
    });

    it('rejects application to heavy_physical job if physical condition < heavyPhysicalMinRequirement', () => {
      const heavyJob: JobDef = {
        id: 'factory_heavy',
        title: 'Heavy Laborer',
        locationId: 'factory',
        baseWage: 12,
        requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' },
        tags: ['heavy_physical'],
        perks: []
      };
      const weakPlayer = {
        hoursRemaining: 20,
        experience: 10,
        dependability: 20,
        degrees: [],
        physicalCondition: 15, // Below 21
        turnFlags: { jobsRejectedThisTurn: [] }
      } as unknown as PlayerState;

      const result = applyForJob(weakPlayer, heavyJob, 4, {}, undefined, undefined, { usePhysicalMentalConditions: true });
      expect(result.success).toBe(false);
      expect(result.message.params?.reasons).toContain('Requires at least 21 Physical Condition');
    });

    it('accumulates employability bonus on "No opening" rejection (+10% if unemployed, +5% if employed) and resets on hire', () => {
      const normalJob: JobDef = {
        id: 'clerk',
        title: 'Clerk',
        locationId: 'store',
        baseWage: 10,
        requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' },
        perks: []
      };
      const replayFail = {
        inDecisions: [
          { type: 'job_apply_luck', result: 99 },
          { type: 'job_apply_luck', result: 99 },
          { type: 'job_apply_luck', result: 99 }
        ],
        outDecisions: []
      };
      const unemployedPlayer = {
        id: 'p1',
        currentJobId: null,
        hoursRemaining: 20,
        experience: 10,
        dependability: 20,
        degrees: [],
        physicalCondition: 50,
        mentalCondition: 50,
        turnFlags: { jobsRejectedThisTurn: [] }
      } as unknown as PlayerState;

      // 1st rejection while unemployed: +10%
      let res = applyForJob(unemployedPlayer, normalJob, 4, {}, undefined, undefined, { usePhysicalMentalConditions: true }, 1, replayFail);
      expect(res.success).toBe(false);
      expect(res.updated.noOpeningBonus).toBe(10);

      // 2nd rejection while unemployed: +10% -> 20%
      res.updated.turnFlags.jobsRejectedThisTurn = [];
      res = applyForJob(res.updated, normalJob, 4, {}, undefined, undefined, { usePhysicalMentalConditions: true }, 1, replayFail);
      expect(res.success).toBe(false);
      expect(res.updated.noOpeningBonus).toBe(20);

      // Now with roll = 1, they succeed and get hired -> noOpeningBonus resets to 0
      const replaySuccess = {
        inDecisions: [{ type: 'job_apply_luck', result: 1 }],
        outDecisions: []
      };
      res.updated.turnFlags.jobsRejectedThisTurn = [];
      const successRes = applyForJob(res.updated, normalJob, 4, {}, undefined, undefined, { usePhysicalMentalConditions: true }, 1, replaySuccess);
      expect(successRes.success).toBe(true);
      expect(successRes.updated.noOpeningBonus).toBe(0);

      // While employed, rejection only gives +5%
      const otherJob: JobDef = {
        id: 'other_clerk',
        title: 'Other Clerk',
        locationId: 'other_store',
        baseWage: 10,
        requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' },
        perks: []
      };
      successRes.updated.turnFlags.jobsRejectedThisTurn = [];
      const  employedRes = applyForJob(successRes.updated, otherJob, 4, {}, undefined, undefined, { usePhysicalMentalConditions: true }, 1, replayFail);
      expect(employedRes.success).toBe(false);
      expect(employedRes.updated.noOpeningBonus).toBe(5);
    });

    it('applies attire modifier: -5% when underdressed, +5% when overdressed in Advanced mode', () => {
      const dressJob: JobDef = {
        id: 'bank_teller',
        title: 'Bank Teller',
        locationId: 'bank',
        baseWage: 10,
        perks: [],
        requirements: { experience: 20, dependability: 20, degrees: [], uniform: 'dress' }
      };
      const basePlayer = {
        hoursRemaining: 20,
        experience: 20,
        dependability: 20,
        degrees: [],
        currentJobId: null,
        noOpeningBonus: 0,
        turnFlags: { jobsRejectedThisTurn: [], clothesWornThisTurn: [] },
        inventory: {
          casualClothesWeeks: 5,
          dressClothesWeeks: 5,
          businessClothesWeeks: 5,
          selectedClothes: 'casual' as const
        }
      } as unknown as PlayerState;

      const advRules = { usePhysicalMentalConditions: true };

      const underdressedPlayer = { ...basePlayer, inventory: { ...basePlayer.inventory, selectedClothes: 'casual' as const } } as unknown as PlayerState;
      const replayUnder = { inDecisions: [{ type: 'job_apply_luck', result: 43 }], outDecisions: [] };
      const underRes = applyForJob(underdressedPlayer, dressJob, 4, {}, undefined, undefined, advRules, 1, replayUnder);
      expect(underRes.success).toBe(false);

      const overdressedPlayer = {
        ...basePlayer,
        turnFlags: { jobsRejectedThisTurn: [], clothesWornThisTurn: [] },
        inventory: { ...basePlayer.inventory, selectedClothes: 'business' as const }
      } as unknown as PlayerState;
      const replayOver = { inDecisions: [{ type: 'job_apply_luck', result: 43 }], outDecisions: [] };
      const overRes = applyForJob(overdressedPlayer, dressJob, 4, {}, undefined, undefined, advRules, 1, replayOver);
      expect(overRes.success).toBe(true);
      expect(overRes.updated.turnFlags?.clothesWornThisTurn).toContain('business');
    });
  });
});
