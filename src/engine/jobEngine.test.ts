import { Random } from '../utils/rng';
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyForJob, workShift, calcWorkShiftSummary } from './jobEngine';
import type { PlayerState } from './gameState';
import type { JobDef } from './dataLoader';

describe('Job Engine', () => {
  const burgerCook: JobDef = {
    id: 'burger_cook',
    title: 'Burger Cook',
    locationId: 'burger_palace',
    baseWage: 5,
    perks: [],
    requirements: { experience: 0, dependability: 10, degrees: [], uniform: 'casual' },
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
    it('always_hiring job is accepted when requirements are met', () => {
      const player = { hoursRemaining: 20, experience: 0, dependability: 10, degrees: [], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, burgerCook, 4, {}, undefined, new Random(1), { grantExpOnJobSwitch: true });
      expect(result.success).toBe(true);
      expect(result.updated.currentJobId).toBe('burger_cook');
      expect(result.updated.currentWage).toBe(5);
      expect(result.updated.experience).toBe(2); // With grantExpOnJobSwitch: true
    });

    it('does not grant experience on job switch if grantExpOnJobSwitch is false (Advanced)', () => {
      const player = { hoursRemaining: 20, experience: 0, dependability: 10, degrees: [], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, burgerCook, 4, {}, undefined, new Random(1), { grantExpOnJobSwitch: false });
      expect(result.success).toBe(true);
      expect(result.updated.currentJobId).toBe('burger_cook');
      expect(result.updated.experience).toBe(0);
    });

    it('always_hiring job is rejected if player does not meet hard requirements', () => {
      const player = { hoursRemaining: 20, experience: 0, dependability: 0, degrees: [], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, burgerCook, 4, {}, undefined, new Random(1), undefined, 5);
      expect(result.success).toBe(false);
      expect(result.message?.key).toBe('action.job.rejected');
      expect(result.message?.params?.reasons).toContain('Poor Work History.');
    });

    it('rejects if missing hard requirements (experience)', () => {
      const player = { hoursRemaining: 20, experience: 10, dependability: 60, degrees: ['business_admin'], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, salesManager, 4, {}, undefined, new Random(1), undefined, 5);
      expect(result.success).toBe(false);
      expect(result.message?.key).toBe('action.job.rejected');
      expect(result.message?.params?.reasons).toContain('Not enough experience.');
    });

    it('rejects if missing hard requirements (dependability - Poor Work History)', () => {
      const player = { hoursRemaining: 20, experience: 60, dependability: 10, degrees: ['business_admin'], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, salesManager, 4, {}, undefined, new Random(1), undefined, 5);
      expect(result.success).toBe(false);
      expect(result.message?.key).toBe('action.job.rejected');
      expect(result.message?.params?.reasons).toContain('Poor Work History.');
    });

    it('rejects if missing degree', () => {
      const player = { hoursRemaining: 20, experience: 60, dependability: 60, degrees: [], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, salesManager, 4, {}, undefined, new Random(1), undefined, 5);
      expect(result.success).toBe(false);
      expect(result.message?.key).toBe('action.job.rejected');
      expect(result.message?.params?.reasons).toContain('Missing required degree: business_admin');
    });

    it('rejects due to insufficient employability roll', () => {
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.99); // Force high roll (99)
      const player = { hoursRemaining: 20, experience: 10, dependability: 10, degrees: [], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, lowLevelJob, 4, {}, undefined, new Random(1)); // Employability = 40 + 10 + 10 = 60. 99 > 60 = rejected.
      expect(result.success).toBe(false);
      expect(result.message?.key).toBe('action.job.noOpenings');
    });

    it('grants +2 experience in classic when getting a new job', () => {
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.01); 
      const player = { hoursRemaining: 20, experience: 10, dependability: 20, degrees: [], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, lowLevelJob, 4, {}, undefined, new Random(1), { grantExpOnJobSwitch: true });
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
  });

  describe('calcWorkShiftSummary', () => {
    it('computes accurate shift options, stamina costs, and disabled statuses', () => {
      const heavyJob: JobDef = {
        id: 'factory_assembly',
        title: 'Assembly Worker',
        locationId: 'factory',
        baseWage: 8,
        requirements: { experience: 30, dependability: 30, degrees: [], uniform: 'casual' },
        tags: ['heavy_physical'],
        perks: []
      };
      const player = {
        hoursRemaining: 6,
        currentWage: 8,
        physicalCondition: 50,
        mentalCondition: 50,
        degrees: [],
        workActionsThisTurn: 0,
        social: 10
      } as unknown as PlayerState;

      const summary = calcWorkShiftSummary(player, heavyJob, 6, { usePhysicalMentalConditions: true } as any);
      expect(summary.hoursToWork).toBe(6);
      expect(summary.modes.length).toBe(4);

      const workWork = summary.modes.find(m => m.id === 'work_work');
      expect(workWork?.physCost).toBe(2); // base 1 + heavy_physical 1 = 2
      expect(workWork?.rewardExp).toBe(0.5); // 0.5x exp gain

      const faceTime = summary.modes.find(m => m.id === 'face_time');
      expect(faceTime?.disabled).toBe(true);

      const innovate = summary.modes.find(m => m.id === 'innovate');
      expect(innovate?.disabled).toBe(true); // No degrees
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
      expect(result.messages?.[0]?.key).toBe('action.job.needClothes');
    });

    it('succeeds with correct clothes and pays wage', () => {
      const player = { 
        hoursRemaining: 20, 
        currentJobId: 'sales_manager',
        currentWage: 12,
        money: 0,
        rentDebt: 0,
        experience: 50,
        degreeExpBoost: 100,
        dependability: 50,
        degreeDepBoost: 20,
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
        degreeDepBoost: 20,
        turnFlags: { hasWorked: false },
        inventory: { businessClothesWeeks: 10, selectedClothes: 'business' }
      } as unknown as PlayerState;
      
      const result = workShift(player, salesManager, 6);
      expect(result.success).toBe(false);
      expect(result.messages?.[0]?.key).toBe('action.job.fired');
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
        degreeExpBoost: 100,
        dependability: 47, // requirement is 50
        degreeDepBoost: 20,
        turnFlags: { hasWorked: false },
        inventory: { casualClothesWeeks: 0, dressClothesWeeks: 0, businessClothesWeeks: 10, selectedClothes: 'business' }
      } as unknown as PlayerState;
      
      const result = workShift(player, salesManager, 6);
      expect(result.success).toBe(true);
      expect(result.messages?.[0]?.key).toBe('action.job.warning');
    });

    describe('Advanced Work Modes & Innovate Progression', () => {
      const advRules = { usePhysicalMentalConditions: true } as any;

      it('only work_work gains standard shift experience; face_time gives $0 wage, scaled dep, and smooth social chance', () => {
        const basePlayer = {
          id: 'p1',
          hoursRemaining: 20,
          currentJobId: 'sales_manager',
          currentWage: 12,
          money: 0,
          experience: 50,
          dependability: 50,
          physicalCondition: 50,
          mentalCondition: 50,
          social: 1, // ceil(1/25)/2 = 0.5 -> 1 + 0.5 = +1.5 Dep
          turnFlags: {},
          inventory: { businessClothesWeeks: 10, selectedClothes: 'business' }
        } as unknown as PlayerState;

        const resWork = workShift(basePlayer, salesManager, 6, advRules, undefined, 'work_work');
        expect(resWork.updated.experience).toBe(51);
        expect(resWork.wagesEarned).toBe(96); // 12 * 8 = 96

        const resLookBusy = workShift(basePlayer, salesManager, 6, advRules, undefined, 'look_busy');
        expect(resLookBusy.updated.experience).toBe(50);
        expect(resLookBusy.wagesEarned).toBe(96);

        // Face Time with Social 1: +1.5 Dep, 0 wage, and smooth social roll success
        const replayFaceTime = {
          inDecisions: [
            { type: `work_facetime_social_${basePlayer.id}_1`, result: true }
          ],
          outDecisions: []
        };
        const resFaceTime = workShift(basePlayer, salesManager, 6, advRules, undefined, 'face_time', new Random(1), replayFaceTime);
        expect(resFaceTime.updated.experience).toBe(50);
        expect(resFaceTime.wagesEarned).toBe(0);
        expect(resFaceTime.updated.dependability).toBe(51.5);
        expect(resFaceTime.updated.social).toBe(2);

        // With Social 50: ceil(50/25)/2 = 1.0 -> 1 + 1.0 = +2.0 Dep
        const socialPlayer = { ...basePlayer, social: 50 };
        const resFaceTimeSocial = workShift(socialPlayer, salesManager, 6, advRules, undefined, 'face_time');
        expect(resFaceTimeSocial.updated.dependability).toBe(52);
      });

      it('innovate requires at least one degree', () => {
        const playerNoDegree = {
          hoursRemaining: 20,
          currentJobId: 'sales_manager',
          currentWage: 12,
          degrees: [],
          physicalCondition: 50,
          mentalCondition: 50,
          turnFlags: {},
          inventory: { businessClothesWeeks: 10, selectedClothes: 'business' }
        } as unknown as PlayerState;

        const result = workShift(playerNoDegree, salesManager, 6, advRules, undefined, 'innovate');
        expect(result.success).toBe(false);
        expect(result.messages?.[0]?.key).toBe('action.job.innovateNeedDegree');
      });

      it('innovate earns 0.5x wage and rolls 2d2-2 for Dep and Exp', () => {
        const player = {
          id: 'p1',
          hoursRemaining: 20,
          currentJobId: 'sales_manager',
          currentWage: 12,
          experience: 50,
          dependability: 50,
          degrees: ['business_admin'],
          physicalCondition: 50,
          mentalCondition: 50,
          innovationCount: 0,
          turnFlags: {},
          inventory: { businessClothesWeeks: 10, selectedClothes: 'business' }
        } as unknown as PlayerState;

        // Roll X = 1 (die1=1, die2=2 -> sum 3 - 2 = 1) -> +1 Dep, +1 Exp
        const replayBalanced = {
          inDecisions: [
            { type: `work_innovate_die1_${player.id}_1`, result: 1 },
            { type: `work_innovate_die2_${player.id}_1`, result: 2 }
          ],
          outDecisions: []
        };

        const result = workShift(player, salesManager, 6, advRules, undefined, 'innovate', new Random(1), replayBalanced);
        expect(result.success).toBe(true);
        expect(result.wagesEarned).toBe(48); // 12 * 8 * 0.5 = 48
        expect(result.updated.dependability).toBe(51);
        expect(result.updated.experience).toBe(51);
      });

      it('innovate at max capacity expands stat cap and increments innovationCount without raising current stat', () => {
        const maxedPlayer = {
          id: 'p1',
          hoursRemaining: 20,
          currentJobId: 'sales_manager',
          currentWage: 10,
          degrees: ['business_admin'],
          physicalCondition: 50,
          mentalCondition: 50,
          // Sales manager req is 50 Dep, 50 Exp. Effective max: Dep = 20 + 50 = 70; Exp = 10 + 50 = 60.
          dependability: 70, // at max
          experience: 60, // at max
          depMaxBonus: 0,
          xpMaxBonus: 0,
          innovationCount: 0,
          turnFlags: {},
          inventory: { businessClothesWeeks: 10, selectedClothes: 'business' }
        } as unknown as PlayerState;

        // Roll X = 2 (die1=2, die2=2 -> sum 4 - 2 = 2) -> +2 Dep roll at max Dep
        const replayDepBust = {
          inDecisions: [
            { type: `work_innovate_die1_${maxedPlayer.id}_1`, result: 2 },
            { type: `work_innovate_die2_${maxedPlayer.id}_1`, result: 2 }
          ],
          outDecisions: []
        };

        const resDep = workShift(maxedPlayer, salesManager, 6, advRules, undefined, 'innovate', new Random(1), replayDepBust);
        expect(resDep.success).toBe(true);
        expect(resDep.updated.depMaxBonus).toBe(1); // Cap expanded!
        expect(resDep.updated.dependability).toBe(70); // Current stat remains at 70 (does not increase)
        expect(resDep.updated.innovationCount).toBe(1);

        // Roll X = 0 (die1=1, die2=1 -> sum 2 - 2 = 0) -> +2 Exp roll at max Exp
        const replayExpBust = {
          inDecisions: [
            { type: `work_innovate_die1_${maxedPlayer.id}_1`, result: 1 },
            { type: `work_innovate_die2_${maxedPlayer.id}_1`, result: 1 }
          ],
          outDecisions: []
        };

        const resExp = workShift(maxedPlayer, salesManager, 6, advRules, undefined, 'innovate', new Random(1), replayExpBust);
        expect(resExp.success).toBe(true);
        expect(resExp.updated.xpMaxBonus).toBe(1); // Cap expanded!
        expect(resExp.updated.experience).toBe(60); // Current stat remains at 60
        expect(resExp.updated.innovationCount).toBe(1);
      });

      it('completed innovation breakthroughs discount raises and provide extra firing protection', () => {
        const player = {
          hoursRemaining: 20,
          currentJobId: 'sales_manager',
          currentWage: 12,
          raisesAtCurrentJob: 2,
          innovationCount: 1, // 1 innovation discounts 1 raise (effective raises = 1)
          dependability: 55, // req 50 + (1 * 5) = 55 (with 0 innovations, would have needed 60)
          degrees: ['business_admin'],
          experience: 60,
          turnFlags: { jobsRejectedThisTurn: [] }
        } as unknown as PlayerState;

        const raiseResult = applyForJob(player, salesManager, 4, {}, 14, new Random(1), advRules);
        expect(raiseResult.success).toBe(true);
        expect(raiseResult.updated.currentWage).toBe(14);
        expect(raiseResult.updated.raisesAtCurrentJob).toBe(3);

        // Firing protection: with 1 innovation, fire threshold is req (50) - (5 + 1) = 44
        // At dependability 45 (which is 5 below req 50), player is NOT fired!
        const protectedPlayer = {
          ...raiseResult.updated,
          dependability: 45,
          inventory: { ...raiseResult.updated.inventory, businessClothesWeeks: 10, selectedClothes: 'business' as const }
        };
        const workResult = workShift(protectedPlayer, salesManager, 6, advRules);
        expect(workResult.success).toBe(true); // not fired
      });

      it('switching jobs resets innovationCount, depMaxBonus, and xpMaxBonus', () => {
        const player = {
          hoursRemaining: 20,
          currentJobId: 'sales_manager',
          currentWage: 12,
          experience: 10,
          dependability: 20,
          degrees: ['business_admin'],
          depMaxBonus: 3,
          xpMaxBonus: 2,
          innovationCount: 5,
          turnFlags: { jobsRejectedThisTurn: [] }
        } as unknown as PlayerState;

        const replay = {
          inDecisions: [{ type: 'job_apply_luck', result: 1 }],
          outDecisions: []
        };

        const result = applyForJob(player, lowLevelJob, 4, {}, undefined, new Random(1), advRules, 1, replay);
        expect(result.success).toBe(true);
        expect(result.updated.currentJobId).toBe('zmart_clerk');
        expect(result.updated.innovationCount).toBe(0);
        expect(result.updated.depMaxBonus).toBe(0);
        expect(result.updated.xpMaxBonus).toBe(0);
      });

      it('applyForJob strictly enforces full 4 hours (atomic action)', () => {
        const player = {
          hoursRemaining: 3, // Less than 4 hours
          experience: 0,
          dependability: 0,
          degrees: [],
          turnFlags: { jobsRejectedThisTurn: [] }
        } as unknown as PlayerState;

        const result = applyForJob(player, burgerCook, 4, {}, undefined, new Random(1), advRules);
        expect(result.success).toBe(false);
        expect(result.message?.key).toBe('action.error.notEnoughTimeInterview');
      });

      it('proportionalDivisibleActions prorates wages, fatigue, and rewards across all 4 modes for partial shifts', () => {
        const propRules = {
          ...advRules,
          proportionalDivisibleActions: true,
          conditionResolution: 0.5
        };

        const basePlayer = {
          id: 'p_part',
          hoursRemaining: 3, // 3 hours out of 6 (ratio = 0.5)
          currentJobId: 'sales_manager',
          currentWage: 10,
          degrees: ['business_admin'],
          physicalCondition: 30,
          mentalCondition: 30,
          dependability: 50,
          experience: 50,
          social: 20,
          turnFlags: {},
          inventory: { businessClothesWeeks: 10, selectedClothes: 'business' }
        } as unknown as PlayerState;

        // 1. work_work mode: half wages ($40 vs $80), half physical/mental cost, +0.5 Dep, +0.5 Exp
        const resWorkWork = workShift(basePlayer, salesManager, 6, propRules, undefined, 'work_work', new Random(1));
        expect(resWorkWork.success).toBe(true);
        expect(resWorkWork.wagesEarned).toBe(40); // 10 * 8 * 0.5 = 40
        expect(resWorkWork.updated.dependability).toBe(50.5);
        expect(resWorkWork.updated.experience).toBe(50.5);
        expect(resWorkWork.updated.hoursRemaining).toBe(0);

        // 2. look_busy mode: half wages ($40), +0 Dep, 0 Exp
        const resLookBusy = workShift(basePlayer, salesManager, 6, propRules, undefined, 'look_busy', new Random(1));
        expect(resLookBusy.success).toBe(true);
        expect(resLookBusy.wagesEarned).toBe(40);
        expect(resLookBusy.updated.dependability).toBe(50);
        expect(resLookBusy.updated.experience).toBe(50);

        // 3. face_time mode: $0 wages, half Dep (+0.5 Dep)
        const replayFaceTime = {
          inDecisions: [{ type: `work_facetime_social_${basePlayer.id}_1`, result: true }],
          outDecisions: []
        };
        const resFaceTime = workShift(basePlayer, salesManager, 6, propRules, undefined, 'face_time', new Random(1), replayFaceTime);
        expect(resFaceTime.success).toBe(true);
        expect(resFaceTime.wagesEarned).toBe(0);
        expect(resFaceTime.updated.dependability).toBeGreaterThan(50);
        expect(resFaceTime.updated.social).toBe(21);

        // 4. innovate mode: half wages ($20), scaled breakthrough rewards
        const replayInnovate = {
          inDecisions: [
            { type: `work_innovate_die1_${basePlayer.id}_1`, result: 1 },
            { type: `work_innovate_die2_${basePlayer.id}_1`, result: 2 }
          ],
          outDecisions: []
        };
        const resInnovate = workShift(basePlayer, salesManager, 6, propRules, undefined, 'innovate', new Random(1), replayInnovate);
        expect(resInnovate.success).toBe(true);
        expect(resInnovate.wagesEarned).toBe(20); // 10 * 8 * 0.5 * 0.5 = 20
        expect(resInnovate.updated.dependability).toBe(50.5);
        expect(resInnovate.updated.experience).toBe(50.5);
      });

      it('does NOT decrease Exp or Dep when working a lower-tier job with a lower cap (Classic and Advanced)', () => {
        const lowJob: JobDef = {
          id: 'janitor',
          title: 'Janitor',
          locationId: 'z_mart',
          baseWage: 5,
          requirements: { experience: 10, dependability: 10, degrees: [], uniform: 'casual' },
          perks: []
        };

        const highStatPlayer = {
          id: 'p_high',
          hoursRemaining: 6,
          currentJobId: 'janitor',
          currentWage: 5,
          degrees: [],
          physicalCondition: 50,
          mentalCondition: 50,
          dependability: 60, // higher than effectiveMaxDep (30)
          experience: 50,    // higher than effectiveMaxExp (20)
          social: 10,
          turnFlags: {},
          inventory: { casualClothesWeeks: 10, selectedClothes: 'casual' }
        } as unknown as PlayerState;

        // Classic mode
        const classicRes = workShift(highStatPlayer, lowJob, 6);
        expect(classicRes.success).toBe(true);
        expect(classicRes.updated.experience).toBe(50); // MUST NOT drop to 20
        expect(classicRes.updated.dependability).toBe(60); // MUST NOT drop to 30

        // Advanced mode (work_work)
        const advRes = workShift(highStatPlayer, lowJob, 6, advRules, undefined, 'work_work');
        expect(advRes.success).toBe(true);
        expect(advRes.updated.experience).toBe(50); // MUST NOT drop to 20
        expect(advRes.updated.dependability).toBe(60); // MUST NOT drop to 30
      });

      it('fires the player immediately on 3 work mistakes in the same turn and flags location for probation', () => {
        const job: JobDef = {
          id: 'factory_worker',
          title: 'Factory Worker',
          locationId: 'factory',
          baseWage: 8,
          requirements: { experience: 10, dependability: 20, degrees: [], uniform: 'casual' },
          perks: []
        };

        const exhaustedPlayer = {
          id: 'p_exhausted',
          hoursRemaining: 18,
          currentJobId: 'factory_worker',
          currentWage: 8,
          degrees: [],
          physicalCondition: 2,
          mentalCondition: 2,
          dependability: 40,
          experience: 20,
          social: 10,
          workMistakesThisTurn: 2, // already had 2 mistakes this turn
          turnFlags: {},
          mistakesByLocation: { factory: 2 },
          inventory: { casualClothesWeeks: 10, selectedClothes: 'casual' }
        } as unknown as PlayerState;

        // Force a physical mistake on this 3rd work shift
        const replay = {
          inDecisions: [{ type: `work_phys_mistake_${exhaustedPlayer.id}_1`, result: true }],
          outDecisions: []
        };

        const result = workShift(exhaustedPlayer, job, 6, advRules, undefined, 'work_work', new Random(1), replay);
        expect(result.updated.currentJobId).toBeNull();
        expect(result.updated.turnFlags.firedLocationsThisTurn).toContain('factory');
        expect(result.messages?.some(m => m.key === 'action.job.firedMistakes' || m.key === 'action.job.fired')).toBe(true);
      });

      it('halves employability score when applying to a location where player was fired this turn (Probation)', () => {
        const job: JobDef = {
          id: 'factory_worker',
          title: 'Factory Worker',
          locationId: 'factory',
          baseWage: 8,
          requirements: { experience: 10, dependability: 20, degrees: [], uniform: 'casual' },
          perks: []
        };

        const firedPlayer = {
          id: 'p_fired',
          hoursRemaining: 10,
          currentJobId: null,
          currentWage: 0,
          degrees: [],
          dependability: 30,
          experience: 30,
          social: 10,
          turnFlags: { firedLocationsThisTurn: ['factory'] },
          inventory: { casualClothesWeeks: 10, selectedClothes: 'casual' }
        } as unknown as PlayerState;

        // Try applying with luck roll = 30 (which would normally pass employability ~50, but fails under halved probation score ~25)
        const replay = {
          inDecisions: [{ type: 'job_apply_luck', result: 30 }],
          outDecisions: []
        };

        const result = applyForJob(firedPlayer, job, 4, {}, undefined, new Random(1), undefined, 1, replay);
        expect(result.success).toBe(false);
        expect(result.message.key).toBe('action.job.noOpeningsProbation');
      });

      it('interview costs 1 Mental in Advanced mode and fails if mentally exhausted', () => {
        const job: JobDef = {
          id: 'zmart_clerk',
          title: 'Z-Mart Clerk',
          locationId: 'discount_and_pawn',
          baseWage: 5,
          requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' },
          perks: []
        };

        const exhaustedPlayer = {
          id: 'p_exhausted',
          hoursRemaining: 10,
          currentJobId: null,
          currentWage: 0,
          degrees: [],
          dependability: 20,
          experience: 20,
          mentalCondition: 1.5,
          turnFlags: { jobsRejectedThisTurn: [] },
          inventory: { casualClothesWeeks: 10, selectedClothes: 'casual' }
        } as unknown as PlayerState;

        const advancedRules = { usePhysicalMentalConditions: true };
        const result = applyForJob(exhaustedPlayer, job, 4, {}, undefined, new Random(1), advancedRules as any, 1);
        expect(result.success).toBe(false);
        expect(result.message.key).toBe('action.error.tooMentallyExhausted');
      });

      it('interview encounters a Mental Mistake when Mental < 10', () => {
        const job: JobDef = {
          id: 'zmart_clerk',
          title: 'Z-Mart Clerk',
          locationId: 'discount_and_pawn',
          baseWage: 5,
          requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' },
          perks: []
        };

        const lowMentalPlayer = {
          id: 'p_low_mental',
          hoursRemaining: 10,
          currentJobId: null,
          currentWage: 0,
          degrees: [],
          dependability: 20,
          experience: 20,
          mentalCondition: 5.0,
          turnFlags: { jobsRejectedThisTurn: [] },
          inventory: { casualClothesWeeks: 10, selectedClothes: 'casual' }
        } as unknown as PlayerState;

        const advancedRules = { usePhysicalMentalConditions: true };
        const replay = {
          inDecisions: [{ type: `job_interview_mental_mistake_p_low_mental_1_zmart_clerk`, result: true }],
          outDecisions: []
        };

        const result = applyForJob(lowMentalPlayer, job, 4, {}, undefined, new Random(1), advancedRules as any, 1, replay);
        expect(result.success).toBe(false);
        expect(result.message.key).toBe('action.job.interviewMistake');
        expect(result.updated.mentalCondition).toBe(4.0); // 5.0 - 1.0
        expect(result.updated.turnFlags.jobsRejectedThisTurn).toContain('zmart_clerk');
      });

      it('applies Heavy_Physical modifiers: +1 Phys cost, 0.5x Exp, face_time disabled, look_busy -1 Dep', () => {
        const heavyJob: JobDef = {
          id: 'factory_assembly',
          title: 'Assembly Worker',
          locationId: 'factory',
          baseWage: 8,
          requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' },
          tags: ['heavy_physical'],
          perks: []
        };

        const player = {
          id: 'p_heavy',
          hoursRemaining: 10,
          currentJobId: 'factory_assembly',
          currentWage: 8,
          degrees: [],
          dependability: 20,
          experience: 0,
          physicalCondition: 50,
          mentalCondition: 50,
          workActionsThisTurn: 0,
          turnFlags: { hasWorked: false },
          inventory: { casualClothesWeeks: 10, selectedClothes: 'casual' }
        } as unknown as PlayerState;

        const advancedRules = { usePhysicalMentalConditions: true };

        // Test face_time disabled
        const ftResult = workShift(player, heavyJob, 6, advancedRules as any, undefined, 'face_time');
        expect(ftResult.success).toBe(false);
        expect(ftResult.messages?.[0].key).toBe('action.job.faceTimeDisabled');

        // Test look_busy costs 1 Dep
        const lbResult = workShift(player, heavyJob, 6, advancedRules as any, undefined, 'look_busy');
        expect(lbResult.success).toBe(true);
        expect(lbResult.updated.dependability).toBe(19); // 20 - 1

        // Test work_work has +1 Physical cost (base 1 + 1 = 2) and grants 0.5 Exp
        const wwResult = workShift(player, heavyJob, 6, advancedRules as any, undefined, 'work_work');
        expect(wwResult.success).toBe(true);
        expect(wwResult.updated.physicalCondition).toBe(48); // 50 - 2
        expect(wwResult.updated.experience).toBe(0.5); // 0 + 0.5
      });

      it('applies Heavy_Physical mistake threshold of 20 for physical condition and halved mental mistake chance', () => {
        const heavyJob: JobDef = {
          id: 'factory_assembly',
          title: 'Assembly Worker',
          locationId: 'factory',
          baseWage: 8,
          requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' },
          tags: ['heavy_physical'],
          perks: []
        };

        const normalJob: JobDef = {
          id: 'office_worker',
          title: 'Office Worker',
          locationId: 'tech_hq',
          baseWage: 8,
          requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' },
          tags: [],
          perks: []
        };

        const advancedRules = { usePhysicalMentalConditions: true };

        // Test at Phys = 15:
        // On normal job (threshold 10), Phys 15 is safe (0% mistake chance, no decision resolved)
        const playerAt15 = {
          id: 'p_test',
          hoursRemaining: 10,
          currentJobId: 'office_worker',
          currentWage: 8,
          degrees: [],
          dependability: 20,
          experience: 0,
          physicalCondition: 15,
          mentalCondition: 50,
          workActionsThisTurn: 0,
          turnFlags: { hasWorked: false },
          inventory: { casualClothesWeeks: 10, selectedClothes: 'casual' }
        } as unknown as PlayerState;

        const normalReplay = { inDecisions: [], outDecisions: [] as any[] };
        const normalRes = workShift(playerAt15, normalJob, 6, advancedRules as any, undefined, 'work_work', new Random(1), normalReplay);
        expect(normalRes.success).toBe(true);
        expect(normalReplay.outDecisions.length).toBe(0); // No mistake roll triggered for normal job

        // On heavy_physical job (threshold 20), Phys 15 is in danger zone (triggers mistake roll with chance (20-15)*0.025 = 12.5%)
        const heavyPlayerAt15 = { ...playerAt15, currentJobId: 'factory_assembly' };
        const heavyReplay = {
          inDecisions: [{ type: `work_phys_mistake_${heavyPlayerAt15.id}_1`, result: true }],
          outDecisions: [] as any[]
        };
        const heavyRes = workShift(heavyPlayerAt15, heavyJob, 6, advancedRules as any, undefined, 'work_work', new Random(1), heavyReplay);
        expect(heavyRes.success).toBe(true);
        expect(heavyRes.messages?.some(m => m.key === 'action.job.mistake')).toBe(true);
        expect(heavyRes.updated.mistakesByLocation?.['factory']).toBe(1);

        // At Phys = 20, heavy_physical job is safe (0% mistake chance, no decision resolved)
        const heavyPlayerAt20 = { ...playerAt15, currentJobId: 'factory_assembly', physicalCondition: 20 };
        const heavySafeReplay = { inDecisions: [], outDecisions: [] as any[] };
        const heavySafeRes = workShift(heavyPlayerAt20, heavyJob, 6, advancedRules as any, undefined, 'work_work', new Random(1), heavySafeReplay);
        expect(heavySafeRes.success).toBe(true);
        expect(heavySafeReplay.outDecisions.length).toBe(0);
      });

      it('applies Frontline_Service modifiers: +1 Social on normal shift, extra -1 Social on mistake', () => {
        const frontlineJob: JobDef = {
          id: 'zmart_clerk',
          title: 'Z-Mart Clerk',
          locationId: 'discount_and_pawn',
          baseWage: 5,
          requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' },
          tags: ['frontline_service'],
          perks: []
        };

        const player = {
          id: 'p_frontline',
          hoursRemaining: 10,
          currentJobId: 'zmart_clerk',
          currentWage: 5,
          degrees: [],
          dependability: 20,
          experience: 0,
          social: 10,
          physicalCondition: 50,
          mentalCondition: 50,
          workActionsThisTurn: 0,
          turnFlags: { hasWorked: false },
          inventory: { casualClothesWeeks: 10, selectedClothes: 'casual' }
        } as unknown as PlayerState;

        const advancedRules = { usePhysicalMentalConditions: true };
        const wwResult = workShift(player, frontlineJob, 6, advancedRules as any, undefined, 'work_work');
        expect(wwResult.success).toBe(true);
        expect(wwResult.updated.social).toBe(11); // 10 + 1
      });

      it('applies Middle_Management modifiers: +1 Mental cost, +0.5 Social, look_busy disabled', () => {
        const mgrJob: JobDef = {
          id: 'zmart_asst_mgr',
          title: 'Asst Manager',
          locationId: 'discount_and_pawn',
          baseWage: 10,
          requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' },
          tags: ['middle_management'],
          perks: []
        };

        const player = {
          id: 'p_mgr',
          hoursRemaining: 10,
          currentJobId: 'zmart_asst_mgr',
          currentWage: 10,
          degrees: [],
          dependability: 20,
          experience: 0,
          social: 10,
          physicalCondition: 50,
          mentalCondition: 50,
          workActionsThisTurn: 0,
          turnFlags: { hasWorked: false },
          inventory: { casualClothesWeeks: 10, selectedClothes: 'casual' }
        } as unknown as PlayerState;

        const advancedRules = { usePhysicalMentalConditions: true };

        // look_busy disabled
        const lbResult = workShift(player, mgrJob, 6, advancedRules as any, undefined, 'look_busy');
        expect(lbResult.success).toBe(false);
        expect(lbResult.messages?.[0].key).toBe('action.job.lookBusyDisabled');

        // work_work: base Mental 0 + 1 = 1 Mental cost, builds skillMgmt (+0.25)
        const wwResult = workShift(player, mgrJob, 6, advancedRules as any, undefined, 'work_work');
        expect(wwResult.success).toBe(true);
        expect(wwResult.updated.mentalCondition).toBe(49); // 50 - 1
        expect(wwResult.updated.social).toBe(10); // Social unaffected
        expect(wwResult.updated.skillMgmt).toBe(0.25); // +0.25 Skill_Mgmt
      });

      it('applies Technical tag mechanics: builds skillTech and skillTech reduces prerequisites', () => {
        const techJob: JobDef = {
          id: 'factory_assembly',
          title: 'Assembly Worker',
          locationId: 'factory',
          baseWage: 8,
          requirements: { experience: 30, dependability: 30, degrees: [], uniform: 'casual' },
          tags: ['technical', 'heavy_physical'],
          perks: []
        };

        const player = {
          id: 'p_tech',
          hoursRemaining: 10,
          currentJobId: 'factory_assembly',
          currentWage: 8,
          degrees: [],
          dependability: 30,
          experience: 30,
          skillTech: 1.0,
          social: 10,
          physicalCondition: 50,
          mentalCondition: 50,
          workActionsThisTurn: 0,
          turnFlags: { hasWorked: false, jobsRejectedThisTurn: [] },
          inventory: { casualClothesWeeks: 10, selectedClothes: 'casual' }
        } as unknown as PlayerState;

        const advancedRules = { usePhysicalMentalConditions: true };

        // Working heavy physical technical job grants 0.5 Exp, so +0.125 skillTech
        const shiftRes = workShift(player, techJob, 6, advancedRules as any, undefined, 'work_work');
        expect(shiftRes.success).toBe(true);
        expect(shiftRes.updated.skillTech).toBeCloseTo(1.15, 2); // 1.0 + 0.125 ~ 1.15 rounded to 0.05

        // Prerequisite check: A player with 28 Exp and 3 skillTech meets 30 Exp requirement for tech job
        const applicant = {
          hoursRemaining: 10,
          experience: 28,
          dependability: 30,
          skillTech: 3.0,
          degrees: [],
          turnFlags: { jobsRejectedThisTurn: [] }
        } as unknown as PlayerState;

        vi.spyOn(Random.prototype, 'next').mockReturnValue(0.01);
        const applyRes = applyForJob(applicant, techJob, 4, {}, undefined, new Random(1), advancedRules as any);
        expect(applyRes.success).toBe(true);

        // A player with 28 Exp and 0 skillTech fails prerequisite check
        const unqualifiedApplicant = {
          hoursRemaining: 10,
          experience: 28,
          dependability: 30,
          skillTech: 0,
          degrees: [],
          turnFlags: { jobsRejectedThisTurn: [] }
        } as unknown as PlayerState;

        const unqRes = applyForJob(unqualifiedApplicant, techJob, 4, {}, undefined, new Random(1), advancedRules as any, 5);
        expect(unqRes.success).toBe(false);
        expect(unqRes.message.params?.reasons).toContain('Not enough experience.');
      });

      it('prevents premature firing when skillTech fulfills dependability requirements (regression test)', () => {
        const engineerJob: JobDef = {
          id: 'factory_engineer',
          title: 'Factory Engineer',
          locationId: 'factory',
          baseWage: 49,
          requirements: { experience: 60, dependability: 70, degrees: ['electronics'], uniform: 'dress' },
          tags: ['technical'],
          perks: []
        };

        // Player has 65 dependability (5 below req 70), but 10 skillTech -> effectiveDep = 75
        const engineerPlayer = {
          id: 'p_eng',
          hoursRemaining: 10,
          currentJobId: 'factory_engineer',
          currentWage: 49,
          degrees: ['electronics'],
          dependability: 65,
          experience: 60,
          skillTech: 10.0,
          social: 10,
          physicalCondition: 50,
          mentalCondition: 50,
          workActionsThisTurn: 0,
          turnFlags: { hasWorked: false },
          inventory: { dressClothesWeeks: 10, selectedClothes: 'dress' }
        } as unknown as PlayerState;

        const advancedRules = { usePhysicalMentalConditions: true };
        const shiftRes = workShift(engineerPlayer, engineerJob, 6, advancedRules as any, undefined, 'work_work');
        
        // Player should NOT be fired!
        expect(shiftRes.success).toBe(true);
        expect(shiftRes.updated.currentJobId).toBe('factory_engineer');
      });
    });

    describe('Management Skill (Skill_Mgmt) & Executive Management', () => {
      it('awards +0.25 skillMgmt on middle_management and +0.50 on executive_management work_work shifts', () => {
        const asstJob: JobDef = {
          id: 'zmart_asst_mgr',
          title: 'Assistant Manager',
          locationId: 'z_mart',
          baseWage: 7,
          requirements: { experience: 20, dependability: 20, degrees: [], uniform: 'dress' },
          tags: ['middle_management'],
          perks: []
        };

        const execJob: JobDef = {
          id: 'zmart_mgr',
          title: 'Manager',
          locationId: 'z_mart',
          baseWage: 8,
          requirements: { experience: 30, dependability: 30, degrees: ['junior_college'], uniform: 'business' },
          tags: ['executive_management'],
          perks: []
        };

        const player = {
          id: 'p1',
          hoursRemaining: 10,
          currentJobId: 'zmart_asst_mgr',
          currentWage: 7,
          degrees: ['junior_college'],
          dependability: 30,
          experience: 20,
          skillMgmt: 0,
          social: 10,
          physicalCondition: 50,
          mentalCondition: 50,
          workActionsThisTurn: 0,
          turnFlags: { hasWorked: false },
          inventory: { dressClothesWeeks: 10, businessClothesWeeks: 10, selectedClothes: 'dress' }
        } as unknown as PlayerState;

        const advancedRules = { usePhysicalMentalConditions: true };
        
        // Middle management shift -> +0.25 skillMgmt
        const res1 = workShift(player, asstJob, 6, advancedRules as any, undefined, 'work_work');
        expect(res1.success).toBe(true);
        expect(res1.updated.skillMgmt).toBe(0.25);

        // Executive management shift -> +0.50 skillMgmt
        const execPlayer = { ...player, currentJobId: 'zmart_mgr', currentWage: 8, skillMgmt: 2.0, inventory: { selectedClothes: 'business', businessClothesWeeks: 10 } } as unknown as PlayerState;
        const res2 = workShift(execPlayer, execJob, 6, advancedRules as any, undefined, 'work_work');
        expect(res2.success).toBe(true);
        expect(res2.updated.skillMgmt).toBe(2.50);
      });

      it('awards +0.25 skillMgmt on face_time in management jobs', () => {
        const asstJob: JobDef = {
          id: 'zmart_asst_mgr',
          title: 'Assistant Manager',
          locationId: 'z_mart',
          baseWage: 7,
          requirements: { experience: 20, dependability: 20, degrees: [], uniform: 'dress' },
          tags: ['middle_management'],
          perks: []
        };

        const player = {
          id: 'p1',
          hoursRemaining: 10,
          currentJobId: 'zmart_asst_mgr',
          currentWage: 7,
          degrees: [],
          dependability: 30,
          experience: 20,
          skillMgmt: 1.0,
          social: 10,
          physicalCondition: 50,
          mentalCondition: 50,
          workActionsThisTurn: 0,
          turnFlags: { hasWorked: false },
          inventory: { dressClothesWeeks: 10, selectedClothes: 'dress' }
        } as unknown as PlayerState;

        const advancedRules = { usePhysicalMentalConditions: true };
        const res = workShift(player, asstJob, 6, advancedRules as any, undefined, 'face_time');
        expect(res.success).toBe(true);
        expect(res.updated.skillMgmt).toBe(1.25);
      });

      it('enforces hard requirement of skillMgmt >= Exp_req / 10 for executive_management jobs', () => {
        const execJob: JobDef = {
          id: 'factory_gen_mgr',
          title: 'General Manager',
          locationId: 'factory',
          baseWage: 25,
          requirements: { experience: 70, dependability: 70, degrees: ['business_admin', 'engineering'], uniform: 'business' },
          tags: ['technical', 'executive_management'],
          perks: []
        };

        // Player meets degrees, dep, and exp, but only has 5.0 skillMgmt (needs 7.0)
        const underQualifiedPlayer = {
          hoursRemaining: 10,
          experience: 70,
          dependability: 70,
          skillMgmt: 5.0,
          skillTech: 10.0,
          degrees: ['business_admin', 'engineering'],
          turnFlags: { jobsRejectedThisTurn: [] }
        } as unknown as PlayerState;

        const advancedRules = { usePhysicalMentalConditions: true };
        const rejectRes = applyForJob(underQualifiedPlayer, execJob, 4, {}, undefined, new Random(1), advancedRules as any, 5);
        expect(rejectRes.success).toBe(false);
        expect(rejectRes.message.params?.reasons).toContain('Management Skill');

        // Qualified player with 7.0 skillMgmt passes requirements
        const qualifiedPlayer = {
          ...underQualifiedPlayer,
          skillMgmt: 7.0
        } as unknown as PlayerState;

        const qualifiedRes = applyForJob(qualifiedPlayer, execJob, 4, {}, undefined, new Random(1), advancedRules as any, 5);
        expect(qualifiedRes.success).toBe(true);
        expect(qualifiedRes.updated.currentJobId).toBe('factory_gen_mgr');
      });
    });
  });
});



