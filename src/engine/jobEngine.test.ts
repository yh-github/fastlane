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
      const player = { hoursRemaining: 20, experience: 0, dependability: 0, degrees: [], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, burgerCook, 4, {}, undefined, new Random(1));
      expect(result.success).toBe(true);
      expect(result.updated.currentJobId).toBe('burger_cook');
      expect(result.updated.currentWage).toBe(5);
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
    });

    it('rejects due to insufficient employability roll', () => {
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.99); // Force high roll (99)
      const player = { hoursRemaining: 20, experience: 10, dependability: 10, degrees: [], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, lowLevelJob, 4, {}, undefined, new Random(1)); // Employability = 40 + 10 + 10 = 60. 99 > 60 = rejected.
      expect(result.success).toBe(false);
      expect(result.message?.key).toBe('action.job.noOpenings');
    });

    it('grants +2 experience when getting a new job', () => {
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.01); 
      const player = { hoursRemaining: 20, experience: 10, dependability: 20, degrees: [], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
      const result = applyForJob(player, lowLevelJob, 4, {}, undefined, new Random(1));
      expect(result.success).toBe(true);
      expect(result.updated.experience).toBe(12);
    });

    it('resets dependability to 10 if it is below 10 when getting a new job', () => {
      const player = { hoursRemaining: 20, experience: 10, dependability: 5, degrees: [], turnFlags: { jobsRejectedThisTurn: [] } } as unknown as PlayerState;
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
    });
  });
});


