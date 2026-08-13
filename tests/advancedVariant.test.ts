import { describe, it, expect, vi } from 'vitest';
import { processTurnStart } from '../src/engine/turnProcessor';
import { GameState, PlayerState, createPlayerState, GameRules, StatRules } from '../src/engine/gameState';
import { gameReducer } from '../src/engine/gameReducer';
import { processWeekend } from '../src/engine/weekendEngine';
import { Random } from '../src/utils/rng';

const mockStatRules: StatRules = {
  startingHappiness: 50,
  startingRelaxation: 25,
  relaxationDecayRate: 2,
  relaxationDoctorChance: 0.20,
  startingPhysicalCondition: 15,
  startingMentalCondition: 15,
  minPhysicalCondition: 5,
  maxPhysicalCondition: 30,
  minMentalCondition: 5,
  maxMentalCondition: 25,
  globalMaxMentalCondition: 99,
  physicalDoctorThreshold: 10,
  physicalDoctorChancePerPoint: 0.05,
  lowSpiritsThreshold: 10,
  lowSpiritsChancePerPoint: 0.05,
  workGrindThreshold: 4,
  workGrindMentalCost: 1,
  workPhysicalCost: 1,
  studyMentalCost: 1,
  cleanPhysicalCost: 1
};

const mockCampaign = {
  config: {
    timeRules: { hoursPerTurn: 48, relaxCost: 6, relaxGain: 3, studySessionCost: 6, workSessionCost: 6, jobApplicationCost: 4, doctorPenalty: 4, starvationPenalty: 20 },
    eventRules: { willyRobberyStartWeek: 4 },
    winConditions: [{ stat: 'lifestyle', target: 100, label: 'Lifestyle' }],
    statRules: mockStatRules
  },
  housing: [
    { id: 'low_cost', name: 'Low Cost', rent: 200, type: 'basic', homeNodeId: 'node_low_cost' }
  ],
  weekends: { randomWeekends: ['dummy'], durableWeekends: {}, ticketWeekends: {} },
  jobs: [
    { id: 'clerk', title: 'Clerk', requirements: {}, baseWage: 5 }
  ],
  items: [
    { id: 'stereo', name: 'Stereo', store: 'discount_and_pawn', basePrice: 450, category: 'appliance' }
  ],
  education: [
    { id: 'degree1', name: 'Degree 1', baseTuitionFee: 100, lessonsRequired: 5, prerequisites: [] }
  ],
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
    
    expect(player.physicalCondition).toBe(50);
    expect(player.physicalConditionMax).toBe(50);
    expect(player.mentalCondition).toBe(50);
    expect(player.mentalConditionMax).toBe(50);
    expect(player.mess).toBe(3);
    expect(player.lifestyle).toBe(0);
  });

  it('should deduct physical condition when working and mental condition on 4th shift (Grind)', () => {
    const rules: GameRules = { usePhysicalMentalConditions: true };
    mockCampaign.config.gameRules = rules;
    const player = createPlayerState('test_p', 'Test Player', false, { lifestyle: 100 }, mockCampaign.housing[0].homeNodeId, mockCampaign.config);
    player.currentJobId = 'clerk';
    
    const context = {
      campaign: mockCampaign,
      rules,
      turn: 1,
      economicIndex: 0,
      rng: { next: () => 0.5, nextInt: (min: number, max: number) => 1 } as any,
      state: { players: [player], rules } as any
    };

    let p = player;
    // Shift 1
    p = gameReducer(p, { type: 'work', jobId: 'clerk' }, context).updatedPlayer;
    expect(p.physicalCondition).toBe(49);
    expect(p.mentalCondition).toBe(50);

    // Shift 2
    p = gameReducer(p, { type: 'work', jobId: 'clerk' }, context).updatedPlayer;
    expect(p.physicalCondition).toBe(48);
    expect(p.mentalCondition).toBe(50);

    // Shift 3
    p = gameReducer(p, { type: 'work', jobId: 'clerk' }, context).updatedPlayer;
    expect(p.physicalCondition).toBe(47);
    expect(p.mentalCondition).toBe(50);

    // Shift 4 (Grind Threshold triggers!)
    p = gameReducer(p, { type: 'work', jobId: 'clerk' }, context).updatedPlayer;
    expect(p.physicalCondition).toBe(46);
    expect(p.mentalCondition).toBe(49); // Deducted!
  });

  it('should not drop physical/mental conditions below minimums', () => {
    const rules: GameRules = { usePhysicalMentalConditions: true };
    mockCampaign.config.gameRules = rules;
    const player = createPlayerState('test_p', 'Test Player', false, { lifestyle: 100 }, mockCampaign.housing[0].homeNodeId, mockCampaign.config);
    player.minPhysicalCondition = 5;
    player.physicalCondition = 5; // Min
    player.mentalCondition = 5; // Min
    player.currentJobId = 'clerk';
    
    const context = {
      campaign: mockCampaign,
      rules,
      turn: 1,
      economicIndex: 0,
      rng: { next: () => 0.5, nextInt: (min: number, max: number) => 1 } as any,
      state: { players: [player], rules } as any
    };

    let p = player;
    for (let i = 0; i < 4; i++) {
      p = gameReducer(p, { type: 'work', jobId: 'clerk' }, context).updatedPlayer;
    }
    expect(p.physicalCondition).toBe(5);
    expect(p.mentalCondition).toBe(5);
  });

  it('should increase max mental capacity if mental drops by 3+ in a single turn', () => {
    const rules: GameRules = { usePhysicalMentalConditions: true };
    mockCampaign.config.gameRules = rules;
    let player = createPlayerState('test_p', 'Test Player', false, { lifestyle: 100 }, mockCampaign.housing[0].homeNodeId, mockCampaign.config);
    player.enrolledClasses = { 'degree1': 0 };
    player.hoursRemaining = 48;
    
    const context = {
      campaign: mockCampaign,
      rules,
      turn: 1,
      economicIndex: 0,
      rng: { next: () => 0.5, nextInt: (min: number, max: number) => 1 } as any,
      state: { players: [player], rules } as any
    };

    // Study 3 times = -3 Mental
    for(let i = 0; i < 3; i++) {
        player = gameReducer(player, { type: 'study', degreeId: 'degree1' }, context).updatedPlayer;
    }

    expect(player.mentalCondition).toBe(47);
    expect(player.mentalConditionMax).toBe(51); // Increased!
    expect(player.turnFlags.mentalDropsThisTurn).toBe(0); // Reset after trigger
  });

  it('should preserve physical and mental stats on weekend without passive turn-start recovery', () => {
    const rules: GameRules = { usePhysicalMentalConditions: true };
    const player = createPlayerState('test_p', 'Test Player', false, { lifestyle: 100 }, mockCampaign.housing[0].homeNodeId, mockCampaign.config);
    player.physicalConditionMax = 30;
    player.physicalCondition = 28;
    player.mentalCondition = 10;
    
    const nextPlayer = processWeekend(player, 1, [], mockCampaign.weekends, new Random(1), rules, mockCampaign);
    expect(nextPlayer.physicalCondition).toBe(28); // 0 passive turn start gain
    expect(nextPlayer.mentalCondition).toBe(10); // 0 passive turn start gain
  });

  it('relax action should reward physical and mental correctly based on mess', () => {
    const rules: GameRules = { usePhysicalMentalConditions: true };
    mockCampaign.config.gameRules = rules;
    let player = createPlayerState('test_p', 'Test Player', false, { lifestyle: 100 }, mockCampaign.housing[0].homeNodeId, mockCampaign.config);
    player.physicalConditionMax = 50;
    player.physicalCondition = 15;
    player.mentalCondition = 15;
    player.mess = 20; // Max mess
    
    const context = {
      campaign: mockCampaign,
      rules,
      turn: 1,
      economicIndex: 0,
      rng: { next: () => 0.5, nextInt: (min: number, max: number) => 1 } as any,
      state: { players: [player], rules } as any
    };

    player = gameReducer(player, { type: 'relax' }, context).updatedPlayer;
    expect(player.physicalCondition).toBe(16);
    // Relax gain: 2 (first) + 3 (base) - floor(20/5) = 5 - 4 = 1
    expect(player.mentalCondition).toBe(16);

    player = gameReducer(player, { type: 'relax' }, context).updatedPlayer;
    expect(player.physicalCondition).toBe(17);
    // 0 (subsequent) + 3 (base) - floor(21/5) = 3 - 4 = -1 -> clamped to 0
    expect(player.mentalCondition).toBe(16);
  });

  it('turnProcessor should trigger low spirits event if mental condition is low', () => {
    const rules: GameRules = { usePhysicalMentalConditions: true, bypassDoctorIfBroke: false };
    mockCampaign.config.gameRules = rules;
    mockCampaign.config.statRules.lowSpiritsChancePerPoint = 1.0;
    const player = createPlayerState('test_p', 'Test Player', false, { lifestyle: 100 }, mockCampaign.housing[0].homeNodeId, mockCampaign.config);
    player.mentalCondition = 0; // Way below 10
    player.money = 200; // Has money to pay doctor penalty
    
    const state: GameState = {
      turn: 1,
      economicIndex: 0,
      players: [player],
      rules,
      rngState: 12345,
      campaignId: 'advanced',
      pawnShopItemsForSale: [],
      phase: 'turn-start',
      winnerId: null
    };

    const nextState = processTurnStart(state, mockCampaign);
    const p = nextState.players[0];

    expect(p.hoursRemaining).toBeLessThan(48);
  });
});
