import { describe, it, expect } from 'vitest';
import {
  calcEmployabilityScore,
  calcAdvancedJobEmployabilityScore,
  calcDependabilityDecay,
  calcMaxDependability,
  calcMaxExperience,
  calcProratedWage,
  calcRobberyChance,
  calcRaiseThreshold,
  calcCareerProgress,
  calcWealthProgress,
  calcEducationProgress,
  STAT_REGISTRY,
  getStatFilterCategories,
  calcSocializeParameters
} from './statMath';

describe('statMath', () => {
  it('calcEmployabilityScore', () => {
    expect(calcEmployabilityScore(10, 10, 0)).toBe(40); // 30 + Math.floor((10 + 10 + 10 + 0) / 3) = 40
    expect(calcEmployabilityScore(20, 20, 1)).toBe(49); // 30 + Math.floor((10 + 20 + 20 + 8) / 3) = 49
    expect(calcEmployabilityScore(20, 10, 0)).toBe(43); // 30 + Math.floor((10 + 20 + 10 + 0) / 3) = 43 (Starting Employability)
    // With Social bonus: +floor(social / 15)
    expect(calcEmployabilityScore(20, 10, 0, 0, 30)).toBe(45); // 43 + 2
    expect(calcEmployabilityScore(20, 10, 0, 0, 45)).toBe(46); // 43 + 3
    expect(calcEmployabilityScore(20, 10, 0, 5, 45)).toBe(41); // 43 + 3 - 5 mistakes = 41
  });

  it('calcAdvancedJobEmployabilityScore calculates score based on margin, innovations, degrees, social, and economic index', () => {
    // Base exact match
    expect(calcAdvancedJobEmployabilityScore({ dependability: 10, experience: 10, degreesCount: 0, jobReqDep: 10, jobReqExp: 10 })).toBe(45);

    // Overqualified
    expect(calcAdvancedJobEmployabilityScore({ dependability: 30, experience: 30, degreesCount: 0, jobReqDep: 10, jobReqExp: 10 })).toBe(65);

    // Degrees, Innovations, Social
    expect(calcAdvancedJobEmployabilityScore({ dependability: 10, experience: 10, degreesCount: 2, jobReqDep: 10, jobReqExp: 10, innovationsAtLocation: 1, social: 30 })).toBe(45 + 2 + 5 + 3);

    // Frontline service
    expect(calcAdvancedJobEmployabilityScore({ dependability: 10, experience: 10, degreesCount: 0, jobReqDep: 10, jobReqExp: 10, social: 30, isFrontline: true })).toBe(45 + 6);

    // Technical job
    expect(calcAdvancedJobEmployabilityScore({ dependability: 10, experience: 10, degreesCount: 0, jobReqDep: 10, jobReqExp: 10, skillTech: 4, isTechnical: true })).toBe(45 + 4 + 6);

    // Management job
    expect(calcAdvancedJobEmployabilityScore({ dependability: 10, experience: 10, degreesCount: 0, jobReqDep: 10, jobReqExp: 10, skillMgmt: 4, isManagement: true })).toBe(45 + 4 + 6);

    // Economic boom
    expect(calcAdvancedJobEmployabilityScore({ dependability: 10, experience: 10, degreesCount: 0, jobReqDep: 10, jobReqExp: 10, economicIndex: 60 })).toBe(51);

    // Economic recession entry job
    expect(calcAdvancedJobEmployabilityScore({ dependability: 10, experience: 10, degreesCount: 0, jobReqDep: 10, jobReqExp: 10, economicIndex: -30 })).toBe(42);

    // Economic recession high-tier job
    expect(calcAdvancedJobEmployabilityScore({ dependability: 70, experience: 70, degreesCount: 0, jobReqDep: 70, jobReqExp: 70, economicIndex: -30 })).toBe(33);

    // Mistakes at location
    expect(calcAdvancedJobEmployabilityScore({ dependability: 10, experience: 10, degreesCount: 0, jobReqDep: 10, jobReqExp: 10, mistakesAtLocation: 3 })).toBe(42);

    // Probation
    expect(calcAdvancedJobEmployabilityScore({ dependability: 30, experience: 30, degreesCount: 0, jobReqDep: 10, jobReqExp: 10, isProbation: true })).toBe(32);
  });

  const mockStatRules = { dependabilityWeeklyDecay: 3 } as any;

  it('calcDependabilityDecay decays by 3, min 0 in classic', () => {
    expect(calcDependabilityDecay(10, mockStatRules)).toBe(7);
    expect(calcDependabilityDecay(2, mockStatRules)).toBe(0);
  });

  it('calcDependabilityDecay in advanced mode with job requirements, social offset, and high downtime', () => {
    expect(calcDependabilityDecay(50, mockStatRules, 0, true, 0)).toBe(47);
    expect(calcDependabilityDecay(50, mockStatRules, 50, true, 25)).toBe(46);
    expect(calcDependabilityDecay(50, mockStatRules, 50, true, 25, true)).toBe(48);
    expect(calcDependabilityDecay(50, mockStatRules, 50, true, 75)).toBe(48);
    expect(calcDependabilityDecay(50, mockStatRules, 10, true, 99)).toBe(49);
    expect(calcDependabilityDecay(50, mockStatRules, 0, true, 99)).toBe(49);
  });

  it('calcMaxDependability', () => {
    expect(calcMaxDependability(0, 0)).toBe(20);
    expect(calcMaxDependability(10, 5)).toBe(35); // 20 + 10 + 5
    expect(calcMaxDependability(10, 5, 2)).toBe(37); // 20 + 10 + 5 + 2
  });

  it('calcMaxExperience', () => {
    expect(calcMaxExperience(0, 0)).toBe(10);
    expect(calcMaxExperience(10, 5)).toBe(25); // 10 + 10 + 5
    expect(calcMaxExperience(10, 5, 3)).toBe(28); // 10 + 10 + 5 + 3
  });

  it('calcProratedWage', () => {
    expect(calcProratedWage(10, 6)).toBe(80);
    expect(calcProratedWage(10, 3)).toBe(40);
    expect(calcProratedWage(10, 1)).toBe(13); // 10 * 8 * 1 / 6 = 13.33 => 13
  });

  it('calcRobberyChance', () => {
    expect(calcRobberyChance(0)).toBe(1);
    expect(calcRobberyChance(99)).toBe(0.01);
  });

  it('calcRaiseThreshold', () => {
    expect(calcRaiseThreshold(10, 0)).toBe(10);
    expect(calcRaiseThreshold(10, 2)).toBe(20);
    expect(calcRaiseThreshold(10, 2, 1)).toBe(15); // 1 project completed discounts 1 raise
    expect(calcRaiseThreshold(10, 2, 3)).toBe(10); // 3 projects completed discounts all raises
  });

  it('calcCareerProgress', () => {
    expect(calcCareerProgress(80, true)).toBe(100);
    expect(calcCareerProgress(40, true)).toBe(50);
    expect(calcCareerProgress(80, false)).toBe(0);
  });

  it('calcWealthProgress', () => {
    expect(calcWealthProgress(10000)).toBe(100);
    expect(calcWealthProgress(5000)).toBe(50);
    expect(calcWealthProgress(200, false)).toBe(0);
    expect(calcWealthProgress(200, true)).toBe(2);
  });

  it('calcEducationProgress', () => {
    expect(calcEducationProgress(0)).toBe(0);
    expect(calcEducationProgress(11)).toBe(100);
  });

  it('STAT_REGISTRY and getStatFilterCategories', () => {
    expect(STAT_REGISTRY.employability.isDerived).toBe(true);
    expect(STAT_REGISTRY.employability.dependencies).toContain('dependability');
    expect(STAT_REGISTRY.employability.dependencies).toContain('experience');
    expect(STAT_REGISTRY.employability.dependencies).toContain('social');

    const employabilityCategories = getStatFilterCategories('employability');
    expect(employabilityCategories.has('dependability')).toBe(true);
    expect(employabilityCategories.has('experience')).toBe(true);
    expect(employabilityCategories.has('education')).toBe(true);
    expect(employabilityCategories.has('social')).toBe(true);

    const wealthCategories = getStatFilterCategories('wealth');
    expect(wealthCategories.has('money')).toBe(true);
    expect(wealthCategories.has('wealth')).toBe(true);
  });

  describe('calcSocializeParameters', () => {
    const baseCampaign: any = {
      housing: [
        { id: 'low_cost', name: 'Low-Cost Housing', spaceCap: 100 },
        { id: 'security', name: 'Security Apartments', spaceCap: 250 },
        { id: 'penthouse', name: 'Penthouse Suite', spaceCap: 500 }
      ],
      items: [],
      config: {
        timeRules: { socializeCost: 6 },
        economyRules: { socializeLowCostCashCost: 25 }
      }
    };

    it('scales dice by housing tier: 1d3 low-cost, 2d3 security, 3d3 penthouse', () => {
      const pLow: any = { currentHousingId: 'low_cost', hoursRemaining: 10, physicalCondition: 20, money: 200, inventory: {} };
      const pSec: any = { currentHousingId: 'security', hoursRemaining: 10, physicalCondition: 20, money: 200, inventory: {} };
      const pPent: any = { currentHousingId: 'penthouse', hoursRemaining: 10, physicalCondition: 20, money: 200, inventory: {} };

      const resLow = calcSocializeParameters(pLow, baseCampaign, { spaceCapping: true } as any);
      expect(resLow.diceCount).toBe(1);
      expect(resLow.minRolledGuests).toBe(1);
      expect(resLow.maxRolledGuests).toBe(3);

      const resSec = calcSocializeParameters(pSec, baseCampaign, { spaceCapping: true } as any);
      expect(resSec.diceCount).toBe(2);
      expect(resSec.minRolledGuests).toBe(2);
      expect(resSec.maxRolledGuests).toBe(6);

      const resPent = calcSocializeParameters(pPent, baseCampaign, { spaceCapping: true } as any);
      expect(resPent.diceCount).toBe(3);
      expect(resPent.minRolledGuests).toBe(3);
      expect(resPent.maxRolledGuests).toBe(9);
    });

    it('dynamically clamps max guests when free space is restricted', () => {
      // Penthouse (500 cap) with 450 mess -> 50 free space -> max 5 guests
      const player: any = {
        currentHousingId: 'penthouse',
        hoursRemaining: 10,
        physicalCondition: 20,
        money: 500,
        mess: 450,
        inventory: {}
      };

      const res = calcSocializeParameters(player, baseCampaign, { spaceCapping: true } as any);
      expect(res.freeSpace).toBe(50);
      expect(res.maxGuestsBySpace).toBe(5);
      expect(res.effectiveMinGuests).toBe(3);
      expect(res.effectiveMaxGuests).toBe(5); // Clamped from 9 down to 5
      expect(res.isCappedBySpace).toBe(true);
      expect(res.isDisabled).toBe(false);
    });

    it('disables socialize when free space is below 10 under spaceCapping', () => {
      const player: any = {
        currentHousingId: 'low_cost',
        hoursRemaining: 10,
        physicalCondition: 20,
        money: 100,
        mess: 95, // 100 - 95 = 5 free space < 10
        inventory: {}
      };

      const res = calcSocializeParameters(player, baseCampaign, { spaceCapping: true } as any);
      expect(res.freeSpace).toBe(5);
      expect(res.isNoSpace).toBe(true);
      expect(res.isDisabled).toBe(true);
      expect(res.disabledReasonKey).toBe('noSpace');
    });

    it('detects exhaustion and insufficient time', () => {
      const exhaustedPlayer: any = {
        currentHousingId: 'low_cost',
        hoursRemaining: 10,
        physicalCondition: 1.5, // 1.5 - 1 = 0.5 < 1.0 -> exhausted
        money: 100,
        inventory: {}
      };
      const resExhausted = calcSocializeParameters(exhaustedPlayer, baseCampaign, { usePhysicalMentalConditions: true } as any);
      expect(resExhausted.isTooExhausted).toBe(true);
      expect(resExhausted.isDisabled).toBe(true);
      expect(resExhausted.disabledReasonKey).toBe('tooExhausted');

      const lowHourPlayer: any = {
        currentHousingId: 'low_cost',
        hoursRemaining: 5, // needs 6
        physicalCondition: 20,
        money: 100,
        inventory: {}
      };
      const resTime = calcSocializeParameters(lowHourPlayer, baseCampaign, {} as any);
      expect(resTime.hasTime).toBe(false);
      expect(resTime.isDisabled).toBe(true);
      expect(resTime.disabledReasonKey).toBe('notEnoughTime');
    });
  });
});
