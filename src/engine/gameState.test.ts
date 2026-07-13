import { describe, it, expect } from 'vitest';
import { createInitialGameState } from './gameState';
import { type CampaignBundle } from './dataLoader';

describe('createInitialGameState', () => {
  it('initializes players with starting relaxation of 10', () => {
    const mockCampaign = {
      config: { name: 'test', startingMoney: 200, timeRules: { hoursPerTurn: 60, starvationPenalty: 20, doctorPenalty: 10 }, economyRules: { repairCostMin: 0.05, repairCostMax: 0.25 } } as any,

      items: [],
      jobs: [],
      buildings: [],
      housing: [],
      events: []
    } as unknown as CampaignBundle;

    const state = createInitialGameState(
      mockCampaign,
      [{ name: 'TestPlayer', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }],
      'low_cost',
      'cdrom'
    );

    expect(state.players[0].relaxation).toBe(10);
  });
});
