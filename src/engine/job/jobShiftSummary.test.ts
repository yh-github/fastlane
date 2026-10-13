import { describe, it, expect } from 'vitest';
import { calcWorkShiftSummary } from './jobShiftSummary';
import type { PlayerState } from '../gameState';
import type { JobDef } from '../dataLoader';

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

    const summary = calcWorkShiftSummary(player, heavyJob, 6, { usePhysicalMentalConditions: true } as any);
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

    const summary = calcWorkShiftSummary(player, techJob, 6, { usePhysicalMentalConditions: true } as any, {
      resilienceDropThreshold: 2
    } as any);

    const workWork = summary.modes.find(m => m.id === 'work_work');
    expect(workWork?.modifiers).toBeDefined();
    const wwLabels = workWork!.modifiers!.map(b => b.label);
    
    // Dependability capped: 0 🤝 (Cap: 30)
    expect(wwLabels).toContain('0 🤝 (Cap: 30)');
    // Experience gain: +1 👌
    expect(wwLabels).toContain('+1 👌');
    // Tech skill gain on technical job: +0.25 🔧
    expect(wwLabels).toContain('+0.25 🔧');
    // Overtime shift permanent physical drop: -0.5 MAX 💪
    expect(wwLabels).toContain('-0.5 MAX 💪');
    // Mental resilience bonus (+1 MAX 🧠) because mental cost is 2 in overtime
    expect(wwLabels).toContain('+1 MAX 🧠');
    // Debt garnishment: -$100 Debt
    expect(wwLabels).toContain('-$100 Debt');

    const initiative = summary.modes.find(m => m.id === 'show_initiative');
    expect(initiative?.modifiers).toBeDefined();
    const initLabels = initiative!.modifiers!.map(b => b.label);
    expect(initLabels).toContain('🃏 2 Cards');
    expect(initLabels).toContain('-1 ⚠️ Demerit');
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

    const summary = calcWorkShiftSummary(exhaustedPlayer, job, 6, { usePhysicalMentalConditions: true } as any);
    const workWork = summary.modes.find(m => m.id === 'work_work');
    const labels = workWork!.modifiers!.map(b => b.label);
    expect(labels).toContain('⛔ <1.0 💪');
  });
});

