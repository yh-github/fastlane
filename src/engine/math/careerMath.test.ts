import { describe, it, expect } from 'vitest';
import { calcMaxSkillCap, calcAdvancedJobEmployabilityScore } from './careerMath';
import type { EducationDef } from '../dataLoader';
import type { GameRules, StatRules } from '../rules';

describe('careerMath', () => {
  const mockEducation: EducationDef[] = [
    {
      id: 'trade_school',
      name: 'Trade School',
      prerequisites: [],
      baseTuitionFee: 100,
      lessonsRequired: 10,
      rewards: { happiness: 2, dependability: 5, maxDepBoost: 5, maxExpBoost: 5, maxTechBoost: 2.5 },
      tags: ['technical']
    },
    {
      id: 'electronics',
      name: 'Electronics',
      prerequisites: ['trade_school'],
      baseTuitionFee: 200,
      lessonsRequired: 10,
      rewards: { happiness: 2, dependability: 5, maxDepBoost: 5, maxExpBoost: 5, maxTechBoost: 2.5 },
      tags: ['technical']
    },
    {
      id: 'pre_engineering',
      name: 'Pre-Engineering',
      prerequisites: ['electronics'],
      baseTuitionFee: 300,
      lessonsRequired: 10,
      rewards: { happiness: 2, dependability: 5, maxDepBoost: 5, maxExpBoost: 5, maxTechBoost: 2.5 },
      tags: ['technical']
    },
    {
      id: 'engineering',
      name: 'Engineering',
      prerequisites: ['pre_engineering'],
      baseTuitionFee: 400,
      lessonsRequired: 10,
      rewards: { happiness: 2, dependability: 5, maxDepBoost: 5, maxExpBoost: 5, maxTechBoost: 2.5 },
      tags: ['technical']
    },
    {
      id: 'junior_college',
      name: 'Junior College',
      prerequisites: [],
      baseTuitionFee: 100,
      lessonsRequired: 10,
      rewards: { happiness: 2, dependability: 5, maxDepBoost: 5, maxExpBoost: 5, maxMgmtBoost: 2.5 },
      tags: ['management']
    },
    {
      id: 'business_admin',
      name: 'Business Administration',
      prerequisites: ['junior_college'],
      baseTuitionFee: 250,
      lessonsRequired: 10,
      rewards: { happiness: 2, dependability: 5, maxDepBoost: 5, maxExpBoost: 5, maxMgmtBoost: 5.0 },
      tags: ['management']
    }
  ];

  const mockStatRules: StatRules = {
    baseSkillCap: 2.5,
    maxSkillCap: 10.0,
    baseEmployability: 45,
    employabilityMarginRate: 1.0,
    employabilityMaxMarginBonus: 40,
    maxWageCompetitionPenalty: 20,
    employabilitySkillBonusRate: 2.0,
    generalSocialEmployabilityRate: 0.1,
    socialEmployabilityBaseline: 20,
    frontlineSocialEmployabilityRate: 0.5,
    tagCompetitionModifiers: {
      heavy_physical: -5,
      high_downtime: 5
    }
  } as any;

  const dynamicRules: GameRules = {
    dynamicSkillCaps: true,
    wageScaledEmployability: true
  } as any;

  const classicRules: GameRules = {
    dynamicSkillCaps: false,
    wageScaledEmployability: false
  } as any;

  describe('calcMaxSkillCap', () => {
    it('returns flat 10.0 cap when dynamicSkillCaps rule is disabled', () => {
      const player = { degrees: [] };
      expect(calcMaxSkillCap(player, 'skillTech', mockEducation, mockStatRules, classicRules)).toBe(10.0);
      expect(calcMaxSkillCap(player, 'skillMgmt', mockEducation, mockStatRules, classicRules)).toBe(10.0);
    });

    it('returns base cap (2.5) when dynamicSkillCaps is enabled and player has no degrees', () => {
      const player = { degrees: [] };
      expect(calcMaxSkillCap(player, 'skillTech', mockEducation, mockStatRules, dynamicRules)).toBe(2.5);
      expect(calcMaxSkillCap(player, 'skillMgmt', mockEducation, mockStatRules, dynamicRules)).toBe(2.5);
    });

    it('scales technical skill cap with technical degree rewards', () => {
      // 1 degree: 2.5 + 2.5 = 5.0
      expect(calcMaxSkillCap({ degrees: ['trade_school'] }, 'skillTech', mockEducation, mockStatRules, dynamicRules)).toBe(5.0);

      // 2 degrees: 2.5 + 2.5 + 2.5 = 7.5
      expect(calcMaxSkillCap({ degrees: ['trade_school', 'electronics'] }, 'skillTech', mockEducation, mockStatRules, dynamicRules)).toBe(7.5);

      // 3 degrees: 2.5 + 7.5 = 10.0
      expect(calcMaxSkillCap({ degrees: ['trade_school', 'electronics', 'pre_engineering'] }, 'skillTech', mockEducation, mockStatRules, dynamicRules)).toBe(10.0);

      // 4 degrees clamped to maxSkillCap (10.0)
      expect(calcMaxSkillCap({ degrees: ['trade_school', 'electronics', 'pre_engineering', 'engineering'] }, 'skillTech', mockEducation, mockStatRules, dynamicRules)).toBe(10.0);

      // Management skill remains at base 2.5 when only tech degrees held
      expect(calcMaxSkillCap({ degrees: ['trade_school', 'electronics'] }, 'skillMgmt', mockEducation, mockStatRules, dynamicRules)).toBe(2.5);
    });

    it('scales management skill cap with management degree rewards', () => {
      // Junior College (+2.5): 2.5 + 2.5 = 5.0
      expect(calcMaxSkillCap({ degrees: ['junior_college'] }, 'skillMgmt', mockEducation, mockStatRules, dynamicRules)).toBe(5.0);

      // Business Admin (+5.0): 2.5 + 2.5 + 5.0 = 10.0
      expect(calcMaxSkillCap({ degrees: ['junior_college', 'business_admin'] }, 'skillMgmt', mockEducation, mockStatRules, dynamicRules)).toBe(10.0);

      // Technical skill remains at base 2.5 when only mgmt degrees held
      expect(calcMaxSkillCap({ degrees: ['junior_college', 'business_admin'] }, 'skillTech', mockEducation, mockStatRules, dynamicRules)).toBe(2.5);
    });
  });

  describe('calcAdvancedJobEmployabilityScore with wageScaledEmployability', () => {
    const minCampaignWage = 4;
    const maxCampaignWage = 25;

    it('calculates Turn 1 Z-Mart Clerk employability correctly (~55%)', () => {
      // Player: Dep 20, Exp 10, Social 20
      // Job: Req Dep 10, Req Exp 10, Base wage 4, frontline_service
      const score = calcAdvancedJobEmployabilityScore({
        dependability: 20,
        experience: 10,
        degreesCount: 0,
        jobReqDep: 10,
        jobReqExp: 10,
        jobBaseWage: 4,
        minCampaignWage,
        maxCampaignWage,
        jobTags: ['frontline_service'],
        social: 20,
        isFrontline: true,
        rules: dynamicRules,
        statRules: mockStatRules
      });

      // Base 45 + 10 margin - 0 wage competition + 0 frontline social = 55%
      expect(score).toBe(55);
    });

    it('applies normalized wage competition penalties correctly', () => {
      // $4/hr job -> 0 penalty
      const scoreLowWage = calcAdvancedJobEmployabilityScore({
        dependability: 10,
        experience: 10,
        degreesCount: 0,
        jobReqDep: 10,
        jobReqExp: 10,
        jobBaseWage: 4,
        minCampaignWage,
        maxCampaignWage,
        rules: dynamicRules,
        statRules: mockStatRules
      });
      // Base 45 + 0 margin - 0 wage comp + 0 social = 45%
      expect(scoreLowWage).toBe(45);

      // $25/hr job -> 20 penalty
      const scoreHighWage = calcAdvancedJobEmployabilityScore({
        dependability: 80,
        experience: 80,
        degreesCount: 0,
        jobReqDep: 80,
        jobReqExp: 80,
        jobBaseWage: 25,
        minCampaignWage,
        maxCampaignWage,
        rules: dynamicRules,
        statRules: mockStatRules
      });
      // Base 45 + 0 margin - 20 wage comp + 0 social = 25%
      expect(scoreHighWage).toBe(25);
    });

    it('applies tag competition modifiers (heavy_physical discount, high_downtime penalty)', () => {
      // $8/hr job with heavy_physical -> wage comp (4/21 * 20 = 4) - 5 tag modifier = 0 (clamped to 0)
      const scoreHeavy = calcAdvancedJobEmployabilityScore({
        dependability: 10,
        experience: 10,
        degreesCount: 0,
        jobReqDep: 10,
        jobReqExp: 10,
        jobBaseWage: 8,
        minCampaignWage,
        maxCampaignWage,
        jobTags: ['heavy_physical'],
        rules: dynamicRules,
        statRules: mockStatRules
      });
      // Base 45 + 0 margin - 0 wage comp = 45%
      expect(scoreHeavy).toBe(45);

      // $8/hr job with high_downtime -> wage comp 4 + 5 tag modifier = 9
      const scoreDowntime = calcAdvancedJobEmployabilityScore({
        dependability: 10,
        experience: 10,
        degreesCount: 0,
        jobReqDep: 10,
        jobReqExp: 10,
        jobBaseWage: 8,
        minCampaignWage,
        maxCampaignWage,
        jobTags: ['high_downtime'],
        rules: dynamicRules,
        statRules: mockStatRules
      });
      // Base 45 - 9 wage comp = 36%
      expect(scoreDowntime).toBe(36);
    });

    it('applies domain skill bonuses (+2.0% per skill point)', () => {
      const scoreTech = calcAdvancedJobEmployabilityScore({
        dependability: 10,
        experience: 10,
        degreesCount: 0,
        jobReqDep: 10,
        jobReqExp: 10,
        jobBaseWage: 4,
        minCampaignWage,
        maxCampaignWage,
        skillTech: 2.0,
        isTechnical: true,
        rules: dynamicRules,
        statRules: mockStatRules
      });
      // Base 45 + 0 - 0 + (2.0 * 2.0 = 4) = 49%
      expect(scoreTech).toBe(49);

      const scoreMgmt = calcAdvancedJobEmployabilityScore({
        dependability: 10,
        experience: 10,
        degreesCount: 0,
        jobReqDep: 10,
        jobReqExp: 10,
        jobBaseWage: 4,
        minCampaignWage,
        maxCampaignWage,
        skillMgmt: 3.0,
        isManagement: true,
        rules: dynamicRules,
        statRules: mockStatRules
      });
      // Base 45 + 0 - 0 + (3.0 * 2.0 = 6) = 51%
      expect(scoreMgmt).toBe(51);
    });

    it('dynamically weights frontline social standing (penalizes low social, rewards high social)', () => {
      // Social = 10 (< baseline 20): (10 - 20) * 0.5 = -5 penalty
      const scoreLowSocial = calcAdvancedJobEmployabilityScore({
        dependability: 10,
        experience: 10,
        degreesCount: 0,
        jobReqDep: 10,
        jobReqExp: 10,
        jobBaseWage: 4,
        minCampaignWage,
        maxCampaignWage,
        jobTags: ['frontline_service'],
        social: 10,
        isFrontline: true,
        rules: dynamicRules,
        statRules: mockStatRules
      });
      // Base 45 - 5 social penalty = 40%
      expect(scoreLowSocial).toBe(40);

      // Social = 40 (> baseline 20): (40 - 20) * 0.5 = +10 bonus
      const scoreHighSocial = calcAdvancedJobEmployabilityScore({
        dependability: 10,
        experience: 10,
        degreesCount: 0,
        jobReqDep: 10,
        jobReqExp: 10,
        jobBaseWage: 4,
        minCampaignWage,
        maxCampaignWage,
        jobTags: ['frontline_service'],
        social: 40,
        isFrontline: true,
        rules: dynamicRules,
        statRules: mockStatRules
      });
      // Base 45 + 10 social bonus = 55%
      expect(scoreHighSocial).toBe(55);
    });
  });
});
