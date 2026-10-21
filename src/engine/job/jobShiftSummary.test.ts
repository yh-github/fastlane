import { describe, it, expect } from 'vitest';
import { calcWorkShiftSummary } from './jobShiftSummary';
import type { PlayerState } from '../gameState';
import type { JobDef } from '../dataLoader';
import { TEST_ADVANCED_CAMPAIGN_CONFIG, TEST_ADVANCED_GAME_RULES } from '../testFactories';

describe('jobShiftSummary', () => {
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

    const summary = calcWorkShiftSummary(player, heavyJob, 6, TEST_ADVANCED_GAME_RULES, TEST_ADVANCED_CAMPAIGN_CONFIG.statRules);
    expect(summary.hoursToWork).toBe(6);
    expect(summary.modes.length).toBe(4);

    const workWork = summary.modes.find(m => m.id === 'work_work');
    expect(workWork?.physCost).toBe(1.5); // base 1 + heavy_physical 0.5 = 1.5
    expect(workWork?.rewardExp).toBe(0.5); // 0.5x exp gain

    const lookBusy = summary.modes.find(m => m.id === 'look_busy');
    expect(lookBusy?.physCost).toBe(0.75); // base 0.5 + heavy_physical 0.25 = 0.75
    expect(lookBusy?.rewardDep).toBe(-1); // -1 dep penalty for heavy_physical

    const faceTime = summary.modes.find(m => m.id === 'face_time');
    expect(faceTime?.disabled).toBe(true);

    const initiative = summary.modes.find(m => m.id === 'show_initiative');
    expect(initiative?.disabled).toBe(true); // Insufficient Exp (req 0 + 10 = 10, player has 0)
  });

  it('populates complete modifiers for work actions via getWorkShiftModifiers', () => {
    const techJob: JobDef = {
      id: 'job_dev',
      title: 'Developer',
      locationId: 'tech_office',
      baseWage: 30,
      requirements: { experience: 10, dependability: 10, degrees: [], uniform: 'casual' },
      tags: ['technical'],
      perks: []
    };

    const player = {
      hoursRemaining: 12,
      currentWage: 30,
      physicalCondition: 50,
      mentalCondition: 50,
      degrees: [],
      workActionsThisTurn: 8, // Overtime shift
      social: 50,
      rentDebt: 100,
      experience: 25, // eligible for initiative (needs 10+10=20)
      xpMaxBonus: 20, // effective max exp is 10 + 10 + 20 = 40, so not capped
      dependability: 30, // capped: 20 + 10 = 30
      mistakesByLocation: { tech_office: 2 }
    } as unknown as PlayerState;

    const summary = calcWorkShiftSummary(player, techJob, 6, TEST_ADVANCED_GAME_RULES, {
      ...TEST_ADVANCED_CAMPAIGN_CONFIG.statRules,
      resilienceDropThreshold: 2
    });

    const workWork = summary.modes.find(m => m.id === 'work_work');
    expect(workWork?.modifiers).toBeDefined();
    const wwLabels = workWork!.modifiers!.map(b => b.label);
    
    // Dependability capped: 0 🤝 (Cap: 30)
    expect(wwLabels).toContain('0 🤝 (Cap: 30)');
    // Experience gain: +1 👌
    expect(wwLabels).toContain('+1 👌');
    // Tech skill gain on technical job: +0.10 🔧
    expect(wwLabels).toContain('+0.10 🔧');
    // Overtime shift permanent physical drop: -0.5 MAX 💪
    expect(wwLabels).toContain('-0.5 MAX 💪');
    // Mental resilience bonus (+1 MAX 🧠) because mental cost is 2 in overtime
    expect(wwLabels).toContain('+1 MAX 🧠');
    // Debt garnishment: -$100 Debt
    expect(wwLabels).toContain('-$100 Debt');

    const faceTime = summary.modes.find(m => m.id === 'face_time');
    expect(faceTime?.modifiers).toBeDefined();
    const ftLabels = faceTime!.modifiers!.map(b => b.label);
    expect(ftLabels).toContain('-1 ⚠️ Demerit');

    const initiative = summary.modes.find(m => m.id === 'show_initiative');
    expect(initiative?.modifiers).toBeDefined();
    const initLabels = initiative!.modifiers!.map(b => b.label);
    expect(initLabels).toContain('🃏 2 Cards');
    expect(initLabels).not.toContain('-1 ⚠️ Demerit');
    expect(initLabels).toContain('+1 🌟');
    expect(initLabels).toContain('-0.5 MAX 💪');
    expect(initLabels).toContain('+1 MAX 🧠');
  });

  it('detects exhaustion warning when player condition would drop below 1.0', () => {
    const job: JobDef = {
      id: 'job_labor',
      title: 'Laborer',
      locationId: 'docks',
      baseWage: 10,
      requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' },
      tags: [],
      perks: []
    };

    const exhaustedPlayer = {
      hoursRemaining: 6,
      currentWage: 10,
      physicalCondition: 1.2, // cost is 1.0 -> 0.2 < 1.0
      mentalCondition: 50,
      degrees: [],
      workActionsThisTurn: 0,
      social: 50
    } as unknown as PlayerState;

    const summary = calcWorkShiftSummary(exhaustedPlayer, job, 6, TEST_ADVANCED_GAME_RULES, TEST_ADVANCED_CAMPAIGN_CONFIG.statRules);
    const workWork = summary.modes.find(m => m.id === 'work_work');
    const labels = workWork!.modifiers!.map(b => b.label);
    expect(labels).toContain('⛔ <1.0 💪');
  });

  it('computes executive blunder risk and detailed mistakeBreakdown for executive management jobs', () => {
    const execJob: JobDef = {
      id: 'fastfood_manager',
      title: 'Fastfood General Manager',
      locationId: 'fastfood',
      baseWage: 25,
      requirements: { experience: 20, dependability: 20, degrees: [], uniform: 'dress' },
      tags: ['executive_management'],
      perks: []
    };

    // Player with 20 Exp (0 margin over req 20).
    // Default margin is 20, rate is 0.005. Missing margin = 20 - 0 = 20. Exec risk = 20 * 0.005 = 0.10 (10%).
    const player = {
      hoursRemaining: 6,
      currentWage: 25,
      physicalCondition: 50,
      mentalCondition: 50,
      degrees: [],
      workActionsThisTurn: 0,
      social: 50,
      experience: 20
    } as unknown as PlayerState;

    const summary = calcWorkShiftSummary(player, execJob, 6, TEST_ADVANCED_GAME_RULES, TEST_ADVANCED_CAMPAIGN_CONFIG.statRules);
    const workWork = summary.modes.find(m => m.id === 'work_work');
    expect(workWork).toBeDefined();

    expect(workWork?.execMistakeChance).toBeCloseTo(0.10, 4);
    // Phys and Mental are at 50 (above 10 / 20), so their risk is 0
    expect(workWork?.physMistakeChance).toBe(0);
    expect(workWork?.mentalMistakeChance).toBe(0);
    expect(workWork?.totalMistakeChance).toBeCloseTo(0.10, 4);

    const mistakeBreakdown = workWork?.modifierBreakdown?.mistakeBreakdown;
    expect(mistakeBreakdown).toBeDefined();
    expect(mistakeBreakdown?.length).toBeGreaterThanOrEqual(3);

    const execItem = mistakeBreakdown?.find(b => b.type === 'executive');
    expect(execItem).toBeDefined();
    expect(execItem?.isTriggered).toBe(true);
    expect(execItem?.chance).toBeCloseTo(0.10, 4);
    expect(execItem?.threshold).toBe(40); // 20 req + 20 margin
    expect(execItem?.currentStat).toBe(20);
    expect(execItem?.explanation).toContain('20.0 Exp below safety buffer');

    // Safe player with 45 Exp (exceeds 20 + 20 = 40 buffer)
    const safePlayer = { ...player, experience: 45 } as unknown as PlayerState;
    const safeSummary = calcWorkShiftSummary(safePlayer, execJob, 6, TEST_ADVANCED_GAME_RULES, TEST_ADVANCED_CAMPAIGN_CONFIG.statRules);
    const safeWorkWork = safeSummary.modes.find(m => m.id === 'work_work');
    expect(safeWorkWork?.execMistakeChance).toBe(0);
    expect(safeWorkWork?.totalMistakeChance).toBe(0);

    const safeExecItem = safeWorkWork?.modifierBreakdown?.mistakeBreakdown?.find(b => b.type === 'executive');
    expect(safeExecItem?.isTriggered).toBe(false);
    expect(safeExecItem?.chance).toBe(0);
    expect(safeExecItem?.explanation).toContain('meets executive safety buffer');
  });

  it('respects config overrides for mistake thresholds and rates', () => {
    const job: JobDef = {
      id: 'job_custom',
      title: 'Custom Job',
      locationId: 'office',
      baseWage: 15,
      requirements: { experience: 10, dependability: 10, degrees: [], uniform: 'casual' },
      tags: [],
      perks: []
    };

    const player = {
      hoursRemaining: 6,
      currentWage: 15,
      physicalCondition: 25,
      mentalCondition: 25,
      degrees: [],
      workActionsThisTurn: 0,
      social: 50
    } as unknown as PlayerState;

    // Custom threshold of 30 physical (player has 25, so 5 points below) at 0.05 per point = 25% risk
    const customStatRules = {
      ...TEST_ADVANCED_CAMPAIGN_CONFIG.statRules,
      workMistakePhysicalThreshold: 30,
      workMistakePhysicalChancePerPoint: 0.05
    };

    const summary = calcWorkShiftSummary(player, job, 6, TEST_ADVANCED_GAME_RULES, customStatRules);
    const workWork = summary.modes.find(m => m.id === 'work_work');
    expect(workWork?.physMistakeChance).toBeCloseTo(0.25, 4);

    const physItem = workWork?.modifierBreakdown?.mistakeBreakdown?.find(b => b.type === 'physical');
    expect(physItem?.threshold).toBe(30);
    expect(physItem?.ratePerPoint).toBe(0.05);
    expect(physItem?.chance).toBeCloseTo(0.25, 4);
  });
});

