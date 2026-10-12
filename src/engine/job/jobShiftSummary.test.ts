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
});
