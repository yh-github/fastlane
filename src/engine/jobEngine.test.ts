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

      it('only work_work gains standard shift experience; look_busy and face_time do not', () => {
        const basePlayer = {
          hoursRemaining: 20,
          currentJobId: 'sales_manager',
          currentWage: 12,
          money: 0,
          experience: 50,
          dependability: 50,
          physicalCondition: 50,
          mentalCondition: 50,
          turnFlags: {},
          inventory: { businessClothesWeeks: 10, selectedClothes: 'business' }
        } as unknown as PlayerState;

        const resWork = workShift(basePlayer, salesManager, 6, advRules, undefined, 'work_work');
        expect(resWork.updated.experience).toBe(51);

        const resLookBusy = workShift(basePlayer, salesManager, 6, advRules, undefined, 'look_busy');
        expect(resLookBusy.updated.experience).toBe(50);

        const resFaceTime = workShift(basePlayer, salesManager, 6, advRules, undefined, 'face_time');
        expect(resFaceTime.updated.experience).toBe(50);
        expect(resFaceTime.updated.dependability).toBe(52);
        expect(resFaceTime.updated.social).toBeGreaterThanOrEqual(1); // 1d3 Social gained

        // With high social (e.g. 50 -> +2 extra dep)
        const socialPlayer = { ...basePlayer, social: 50 };
        const resFaceTimeSocial = workShift(socialPlayer, salesManager, 6, advRules, undefined, 'face_time');
        expect(resFaceTimeSocial.updated.dependability).toBe(54); // +2 base + 2 social bonus = +4
        expect(resFaceTimeSocial.updated.social).toBeGreaterThanOrEqual(51);
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

      it('innovate accumulates breakthrough chance and escrow with surplus XP, mental, and computer', () => {
        const player = {
          id: 'p1',
          hoursRemaining: 20,
          currentJobId: 'sales_manager',
          currentWage: 12,
          experience: 60, // req is 50 -> +10 surplus -> +2% bonus
          dependability: 50,
          degrees: ['business_admin'],
          physicalCondition: 50,
          mentalCondition: 60, // ceil(60/25) = 3% bonus
          innovateChance: 0,
          innovateEscrow: 0,
          innovateProjectsCompleted: 0,
          turnFlags: {},
          inventory: {
            businessClothesWeeks: 10,
            selectedClothes: 'business',
            appliances: [{ id: 'computer' }] // Computer -> +3% bonus
          }
        } as unknown as PlayerState;

        // Base 10 + surplus XP 2 + mental 3 + computer 3 = 18%
        // Force breakthrough roll to miss (roll 99 > 18)
        const replay = {
          inDecisions: [
            { type: `innovate_serendipity_${player.id}_1`, result: false },
            { type: `innovate_roll_${player.id}_1`, result: 99 }
          ],
          outDecisions: []
        };

        const result = workShift(player, salesManager, 6, advRules, undefined, 'innovate', new Random(1), replay);
        expect(result.success).toBe(true);
        expect(result.wagesEarned).toBe(0); // 0 upfront wage
        expect(result.updated.innovateChance).toBe(18); // 18% accumulated
        expect(result.updated.innovateEscrow).toBe(96); // 12 * 8 = 96 in escrow
      });

      it('innovate triggers breakthrough when roll <= chance, paying out pure escrow and boosting stats', () => {
        const player = {
          id: 'p1',
          hoursRemaining: 20,
          currentJobId: 'sales_manager',
          currentWage: 10,
          money: 500,
          degrees: ['business_admin'],
          physicalCondition: 50,
          mentalCondition: 50,
          innovateChance: 40,
          innovateEscrow: 240, // accumulated 3 previous shifts of $80
          innovateProjectsCompleted: 0,
          dependability: 50,
          depMaxBonus: 0,
          xpMaxBonus: 0,
          experience: 50,
          turnFlags: {},
          inventory: { businessClothesWeeks: 10, selectedClothes: 'business', appliances: [] }
        } as unknown as PlayerState;

        // This shift adds $80 to escrow (total 320) and increases chance to ~52%.
        // Force breakthrough roll to succeed (roll 10 <= 52)
        const replay = {
          inDecisions: [
            { type: `innovate_serendipity_${player.id}_1`, result: false },
            { type: `innovate_roll_${player.id}_1`, result: 10 }
          ],
          outDecisions: []
        };

        const result = workShift(player, salesManager, 6, advRules, undefined, 'innovate', new Random(1), replay);
        expect(result.success).toBe(true);
        expect(result.updated.innovateChance).toBe(0); // reset after breakthrough
        expect(result.updated.innovateEscrow).toBe(0); // reset after payout
        expect(result.updated.innovateProjectsCompleted).toBe(1); // 1 project completed
        expect(result.updated.money).toBe(500 + 320); // 500 + 320 full escrow payout = 820
        expect(result.updated.depMaxBonus).toBe(3); // +3 Max Dep
        expect(result.updated.xpMaxBonus).toBe(3); // +3 Max Exp
        expect(result.updated.dependability).toBe(55); // +5 Dep
        expect(result.updated.experience).toBe(53); // +3 Exp
      });

      it('completed innovation projects discount raises and provide extra firing protection', () => {
        const player = {
          hoursRemaining: 20,
          currentJobId: 'sales_manager',
          currentWage: 12,
          raisesAtCurrentJob: 2,
          innovateProjectsCompleted: 1, // 1 completed project discounts 1 raise (effective raises = 1)
          dependability: 55, // req 50 + (1 * 5) = 55 (with 0 projects, would have needed 60)
          degrees: ['business_admin'],
          experience: 60,
          turnFlags: { jobsRejectedThisTurn: [] }
        } as unknown as PlayerState;

        const raiseResult = applyForJob(player, salesManager, 4, {}, 14, new Random(1), advRules);
        expect(raiseResult.success).toBe(true);
        expect(raiseResult.updated.currentWage).toBe(14);
        expect(raiseResult.updated.raisesAtCurrentJob).toBe(3);

        // Firing protection: with 1 project, fire threshold is req (50) - (5 + 1*2) = 43
        // At dependability 44 (which is 6 below req 50), player is NOT fired!
        const protectedPlayer = {
          ...raiseResult.updated,
          dependability: 44,
          inventory: { businessClothesWeeks: 10, selectedClothes: 'business' }
        };
        const workResult = workShift(protectedPlayer, salesManager, 6, advRules);
        expect(workResult.success).toBe(true); // not fired
      });

      it('innovate prorates chance gain and escrow when working partial hours', () => {
        const player = {
          id: 'p1',
          hoursRemaining: 3, // only 3 hours (half shift)
          currentJobId: 'sales_manager',
          currentWage: 10,
          experience: 50,
          dependability: 50,
          degrees: ['business_admin'],
          physicalCondition: 50,
          mentalCondition: 50, // mental bonus = ceil(50/25) = 2
          innovateChance: 0,
          innovateEscrow: 0,
          innovateProjectsCompleted: 0,
          turnFlags: {},
          inventory: { businessClothesWeeks: 10, selectedClothes: 'business', appliances: [] }
        } as unknown as PlayerState;

        // Base 10 + mental 2 = 12. Fraction = 3/6 = 0.5. Gain = 12 * 0.5 = 6%.
        // Escrow = 10 * 8 * 0.5 = $40.
        const replay = {
          inDecisions: [
            { type: `innovate_serendipity_${player.id}_1`, result: false },
            { type: `innovate_roll_${player.id}_1`, result: 99 }
          ],
          outDecisions: []
        };

        const result = workShift(player, salesManager, 6, advRules, undefined, 'innovate', new Random(1), replay);
        expect(result.success).toBe(true);
        expect(result.updated.hoursRemaining).toBe(0);
        expect(result.updated.innovateChance).toBe(6);
        expect(result.updated.innovateEscrow).toBe(40);
      });

      it('innovate hard-caps banked chance at 85%', () => {
        const player = {
          id: 'p1',
          hoursRemaining: 20,
          currentJobId: 'sales_manager',
          currentWage: 10,
          experience: 75,
          dependability: 50,
          degrees: ['business_admin'],
          physicalCondition: 50,
          mentalCondition: 75,
          innovateChance: 80, // already at 80%
          innovateEscrow: 500,
          innovateProjectsCompleted: 0,
          turnFlags: {},
          inventory: { businessClothesWeeks: 10, selectedClothes: 'business', appliances: [{ id: 'computer' }] }
        } as unknown as PlayerState;

        const replay = {
          inDecisions: [
            { type: `innovate_serendipity_${player.id}_1`, result: false },
            { type: `innovate_roll_${player.id}_1`, result: 99 }
          ],
          outDecisions: []
        };

        const result = workShift(player, salesManager, 6, advRules, undefined, 'innovate', new Random(1), replay);
        expect(result.success).toBe(true);
        expect(result.updated.innovateChance).toBe(85); // capped at 85%
      });

      it('innovate scales difficulty across multiple completed projects', () => {
        const player = {
          id: 'p1',
          hoursRemaining: 20,
          currentJobId: 'sales_manager',
          currentWage: 10,
          experience: 50,
          dependability: 50,
          degrees: ['business_admin'],
          physicalCondition: 50,
          mentalCondition: 50, // mental bonus = 2
          innovateChance: 0,
          innovateEscrow: 0,
          innovateProjectsCompleted: 2, // 2 completed projects -> divisor = 1 + 2 * 0.5 = 2.0
          turnFlags: {},
          inventory: { businessClothesWeeks: 10, selectedClothes: 'business', appliances: [] }
        } as unknown as PlayerState;

        // Base 10 + mental 2 = 12. Divisor 2.0 -> gain = 6.0%.
        const replay = {
          inDecisions: [
            { type: `innovate_serendipity_${player.id}_1`, result: false },
            { type: `innovate_roll_${player.id}_1`, result: 99 }
          ],
          outDecisions: []
        };

        const result = workShift(player, salesManager, 6, advRules, undefined, 'innovate', new Random(1), replay);
        expect(result.success).toBe(true);
        expect(result.updated.innovateChance).toBe(6);
      });

      it('innovate serendipity triggers grant bonus max dependability or experience', () => {
        const player = {
          id: 'p1',
          hoursRemaining: 20,
          currentJobId: 'sales_manager',
          currentWage: 10,
          experience: 50,
          dependability: 50,
          degrees: ['business_admin'],
          physicalCondition: 50,
          mentalCondition: 50,
          depMaxBonus: 0,
          innovateChance: 0,
          innovateEscrow: 0,
          innovateProjectsCompleted: 0,
          turnFlags: {},
          inventory: { businessClothesWeeks: 10, selectedClothes: 'business', appliances: [] }
        } as unknown as PlayerState;

        // Serendipity type 1: grants +1 depMaxBonus
        const replay1 = {
          inDecisions: [
            { type: `innovate_serendipity_${player.id}_1`, result: true },
            { type: `innovate_serendipity_type_${player.id}_1`, result: 1 },
            { type: `innovate_roll_${player.id}_1`, result: 99 }
          ],
          outDecisions: []
        };

        const result1 = workShift(player, salesManager, 6, advRules, undefined, 'innovate', new Random(1), replay1);
        expect(result1.updated.depMaxBonus).toBe(1);

        // Serendipity type 2: grants +1 experience
        const replay2 = {
          inDecisions: [
            { type: `innovate_serendipity_${player.id}_1`, result: true },
            { type: `innovate_serendipity_type_${player.id}_1`, result: 2 },
            { type: `innovate_roll_${player.id}_1`, result: 99 }
          ],
          outDecisions: []
        };

        const result2 = workShift(player, salesManager, 6, advRules, undefined, 'innovate', new Random(1), replay2);
        expect(result2.updated.experience).toBe(51);
      });

      it('breakthrough grant garnishes rent debt properly', () => {
        const player = {
          id: 'p1',
          hoursRemaining: 20,
          currentJobId: 'sales_manager',
          currentWage: 10,
          money: 0,
          rentDebt: 100, // $100 rent debt
          experience: 50,
          degrees: ['business_admin'],
          physicalCondition: 50,
          mentalCondition: 50,
          innovateChance: 50,
          innovateEscrow: 200,
          innovateProjectsCompleted: 0,
          dependability: 50,
          turnFlags: {},
          inventory: { businessClothesWeeks: 10, selectedClothes: 'business', appliances: [] }
        } as unknown as PlayerState;

        // This shift adds $80 to escrow (total 280).
        // Debt is $100. Payout pays off $100 debt -> leaves $180 money and $0 debt.
        const replay = {
          inDecisions: [
            { type: `innovate_serendipity_${player.id}_1`, result: false },
            { type: `innovate_roll_${player.id}_1`, result: 1 } // breakthrough!
          ],
          outDecisions: []
        };

        const result = workShift(player, salesManager, 6, advRules, undefined, 'innovate', new Random(1), replay);
        expect(result.success).toBe(true);
        expect(result.updated.rentDebt).toBe(0);
        expect(result.updated.money).toBe(180);
      });

      it('switching jobs resets innovation progress, chance, escrow, and completed projects', () => {
        const player = {
          hoursRemaining: 20,
          currentJobId: 'sales_manager',
          currentWage: 12,
          experience: 10,
          dependability: 20,
          degrees: ['business_admin'],
          innovateChance: 45,
          innovateEscrow: 300,
          innovateProjectsCompleted: 2,
          turnFlags: { jobsRejectedThisTurn: [] }
        } as unknown as PlayerState;

        const replay = {
          inDecisions: [{ type: 'job_apply_luck', result: 1 }],
          outDecisions: []
        };

        const result = applyForJob(player, lowLevelJob, 4, {}, undefined, new Random(1), advRules, 1, replay);
        expect(result.success).toBe(true);
        expect(result.updated.currentJobId).toBe('zmart_clerk');
        expect(result.updated.innovateChance).toBe(0);
        expect(result.updated.innovateEscrow).toBe(0);
        expect(result.updated.innovateProjectsCompleted).toBe(0);
      });
    });
  });
});
