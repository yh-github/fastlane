import { describe, it, expect, vi } from 'vitest';
import { processTurnStart } from '../src/engine/turnProcessor';
import { GameState, PlayerState, createPlayerState, GameRules } from '../src/engine/gameState';
import { gameReducer } from '../src/engine/gameReducer';

const mockCampaign = {
  config: {
    timeRules: { hoursPerTurn: 48 },
    eventRules: { willyRobberyStartWeek: 4 },
    winConditions: [{ stat: 'lifestyle', target: 100, label: 'Lifestyle' }]
  },
  housing: [
    { id: 'low_cost', name: 'Low Cost', rent: 200, type: 'basic', homeNodeId: 'node_low_cost' }
  ],
  weekends: { randomWeekends: [] },
  jobs: [
    { id: 'clerk', title: 'Clerk', requirements: {}, baseWage: 5 }
  ],
  items: [
    { id: 'stereo', name: 'Stereo', store: 'discount_and_pawn', basePrice: 450, category: 'appliance' }
  ],
  education: [],
  map: { nodes: [{ id: 'node_low_cost' }] }
} as any;

describe('Advanced Variation Mechanics', () => {
  it('should initialize player correctly with advanced rules', () => {
    const rules: GameRules = {
      usePhysicalMentalConditions: true,
      trackMess: true,
      turnStartAtHome: true,
      useHomeTimeRobbery: true
    };
    mockCampaign.config.gameRules = rules;
    const player = createPlayerState('test_p', 'Test Player', false, { lifestyle: 100 }, mockCampaign.housing[0].homeNodeId, mockCampaign.config);
    
    expect(player.physicalCondition).toBe(15);
    expect(player.physicalConditionMax).toBe(30);
    expect(player.mentalCondition).toBe(15);
    expect(player.mentalConditionMax).toBe(25);
    expect(player.mess).toBe(0);
    expect(player.lifestyle).toBe(0);
  });

  it('should increase mess and track homeTimeHistory at turn start', () => {
    const rules: GameRules = { trackMess: true, useHomeTimeRobbery: true };
    mockCampaign.config.gameRules = rules;
    const player = createPlayerState('test_p', 'Test Player', false, { lifestyle: 100 }, mockCampaign.housing[0].homeNodeId, mockCampaign.config);
    player.homeTimeThisTurn = 10;
    
    const state: GameState = {
      turn: 1,
      economicIndex: 0,
      players: [player],
      rules,
      seed: 'test',
      rngState: 'test'
    };

    const nextState = processTurnStart(state, mockCampaign);
    const p = nextState.players[0];

    expect(p.mess).toBe(3);
    expect(p.homeTimeHistory).toEqual([10]);
    expect(p.homeTimeThisTurn).toBe(0);
  });

  it('should deduct physical/mental condition when working', () => {
    const rules: GameRules = { usePhysicalMentalConditions: true };
    mockCampaign.config.gameRules = rules;
    const player = createPlayerState('test_p', 'Test Player', false, { lifestyle: 100 }, mockCampaign.housing[0].homeNodeId, mockCampaign.config);
    player.currentJobId = 'clerk';
    
    const context = {
      campaign: mockCampaign,
      rules,
      turn: 1,
      economicIndex: 0,
      rng: { next: () => 0.5 } as any,
      state: { players: [player], rules } as any
    };

    let p = player;
    // Work 3 times
    for (let i = 0; i < 3; i++) {
      const res = gameReducer(p, { type: 'work', jobId: 'clerk' }, context);
      p = res.updatedPlayer;
    }

    // Physical drops by 1 each time
    expect(p.physicalCondition).toBe(12);
    // Mental drops by 1 on the 3rd time
    expect(p.mentalCondition).toBe(14);
  });
});
