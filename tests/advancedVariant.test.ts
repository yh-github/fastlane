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
  startingPhysicalCondition: 50,
  startingMentalCondition: 50,
  minPhysicalCondition: 5,
  maxPhysicalCondition: 50,
  minMentalCondition: 5,
  maxMentalCondition: 50,
  globalMaxMentalCondition: 99,
  physicalDoctorThreshold: 10,
  physicalDoctorChancePerPoint: 0.05,
  lowSpiritsThreshold: 10,
  lowSpiritsChancePerPoint: 0.05,
  workGrindThreshold: 4,
  workGrindPhysicalCost: 1,
  workGrindMentalCost: 1,
  workPhysicalCost: 1,
  workNormalMentalCost: 0,
  workOvertimeThreshold: 8,
  workOvertimePhysicalCost: 2,
  workOvertimeMentalCost: 2,
  studyMentalCost: 1,
  studyNormalMentalCost: 1,
  studyNormalPhysicalCost: 0,
  studyGrindThreshold: 4,
  studyGrindMentalCost: 2,
  studyGrindPhysicalCost: 0,
  studyOvertimeThreshold: 8,
  studyOvertimeMentalCost: 2,
  studyOvertimePhysicalCost: 1,
  resilienceDropThreshold: 3,
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
    { id: 'degree1', name: 'Degree 1', baseTuitionFee: 100, lessonsRequired: 20, rewards: { dependability: 5, maxDependability: 5, maxExperience: 5 }, prerequisites: [] }
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

  it('should apply 3 work action tiers: Normal (1-3), Grind (4-7), and Overtime (8+)', () => {
    const rules: GameRules = { usePhysicalMentalConditions: true };
    mockCampaign.config.gameRules = rules;
    const player = createPlayerState('test_p', 'Test Player', false, { lifestyle: 100 }, mockCampaign.housing[0].homeNodeId, mockCampaign.config);
    player.currentJobId = 'clerk';
    player.hoursRemaining = 60;
    
    const context = {
      campaign: mockCampaign,
      rules,
      turn: 1,
      economicIndex: 0,
      rng: { next: () => 0.5, nextInt: (min: number, max: number) => 1 } as any,
      state: { players: [player], rules } as any
    };

    let p = player;
    // Actions 1-3 (Normal: -1 Phys, 0 Mental)
    for (let i = 1; i <= 3; i++) {
      p = gameReducer(p, { type: 'work', jobId: 'clerk' }, context).updatedPlayer;
      expect(p.physicalCondition).toBe(50 - i);
      expect(p.mentalCondition).toBe(50);
    }
    expect(p.physicalCondition).toBe(47);
    expect(p.mentalCondition).toBe(50);

    // Actions 4-7 (Grind: -1 Phys, -1 Mental)
    for (let i = 4; i <= 7; i++) {
      p = gameReducer(p, { type: 'work', jobId: 'clerk' }, context).updatedPlayer;
      expect(p.physicalCondition).toBe(47 - (i - 3) * 1);
      expect(p.mentalCondition).toBe(50 - (i - 3) * 1);
    }
    expect(p.physicalCondition).toBe(43);
    expect(p.mentalCondition).toBe(46);

    // Action 8 (Overtime: -2 Phys, -2 Mental)
    p = gameReducer(p, { type: 'work', jobId: 'clerk' }, context).updatedPlayer;
    expect(p.physicalCondition).toBe(41);
    expect(p.mentalCondition).toBe(44);

    // Action 9 (Overtime: -2 Phys, -2 Mental)
    p = gameReducer(p, { type: 'work', jobId: 'clerk' }, context).updatedPlayer;
    expect(p.physicalCondition).toBe(39);
    expect(p.mentalCondition).toBe(42);
  });

  it('should apply 3 study action tiers: Normal (1-3), Academic Grind (4-7), and Hyper-Accelerating (8+)', () => {
    const rules: GameRules = { usePhysicalMentalConditions: true };
    mockCampaign.config.gameRules = rules;
    let player = createPlayerState('test_p', 'Test Player', false, { lifestyle: 100 }, mockCampaign.housing[0].homeNodeId, mockCampaign.config);
    player.enrolledClasses = { 'degree1': 0 };
    player.hoursRemaining = 60;
    
    const context = {
      campaign: mockCampaign,
      rules,
      turn: 1,
      economicIndex: 0,
      rng: { next: () => 0.5, nextInt: (min: number, max: number) => 1 } as any,
      state: { players: [player], rules } as any
    };

    let p = player;
    // Lessons 1-3 (Normal: 0 Phys, -1 Mental)
    for (let i = 1; i <= 3; i++) {
      p = gameReducer(p, { type: 'study', degreeId: 'degree1' }, context).updatedPlayer;
      expect(p.physicalCondition).toBe(50);
      expect(p.mentalCondition).toBe(50 - i);
    }
    expect(p.physicalCondition).toBe(50);
    expect(p.mentalCondition).toBe(47);

    // Lessons 4-7 (Academic Grind: 0 Phys, -2 Mental)
    for (let i = 4; i <= 7; i++) {
      p = gameReducer(p, { type: 'study', degreeId: 'degree1' }, context).updatedPlayer;
      expect(p.physicalCondition).toBe(50);
      expect(p.mentalCondition).toBe(47 - (i - 3) * 2);
    }
    expect(p.physicalCondition).toBe(50);
    expect(p.mentalCondition).toBe(39);

    // Lesson 8 (Hyper-Accelerating: -1 Phys, -2 Mental)
    p = gameReducer(p, { type: 'study', degreeId: 'degree1' }, context).updatedPlayer;
    expect(p.physicalCondition).toBe(49);
    expect(p.mentalCondition).toBe(37);

    // Lesson 9 (Hyper-Accelerating: -1 Phys, -2 Mental)
    p = gameReducer(p, { type: 'study', degreeId: 'degree1' }, context).updatedPlayer;
    expect(p.physicalCondition).toBe(48);
    expect(p.mentalCondition).toBe(35);
  });

  it('should NOT award resilience for incremental small drops, but award for single-event drop >= 3', () => {
    const rules: GameRules = { usePhysicalMentalConditions: true };
    mockCampaign.config.gameRules = rules;
    let player = createPlayerState('test_p', 'Test Player', false, { lifestyle: 100 }, mockCampaign.housing[0].homeNodeId, mockCampaign.config);
    player.enrolledClasses = { 'degree1': 0 };
    player.hoursRemaining = 60;
    
    const context = {
      campaign: mockCampaign,
      rules,
      turn: 1,
      economicIndex: 0,
      rng: { next: () => 0.5, nextInt: (min: number, max: number) => 1 } as any,
      state: { players: [player], rules } as any
    };

    // Study 3 times = -1 Mental each (incremental -3 total)
    for (let i = 0; i < 3; i++) {
      player = gameReducer(player, { type: 'study', degreeId: 'degree1' }, context).updatedPlayer;
    }
    expect(player.mentalCondition).toBe(47);
    expect(player.resilienceBonus || 0).toBe(0); // NO resilience bonus from incremental drops!
    expect(player.mentalConditionMax).toBe(50);

    // Now simulate a single event with drop >= 3 (e.g. customized action with drop >= 3)
    const customRules = {
      ...mockStatRules,
      studyGrindMentalCost: 4 // 4th action is in Grind tier, drops 4 Mental in one single action
    };
    const customCampaign = { ...mockCampaign, config: { ...mockCampaign.config, statRules: customRules } };
    const shockContext = { ...context, campaign: customCampaign };

    player = gameReducer(player, { type: 'study', degreeId: 'degree1' }, shockContext).updatedPlayer;
    expect(player.mentalCondition).toBe(43);
    expect(player.resilienceBonus).toBe(1); // Single event shock >= 3 awards resilience!
    expect(player.mentalConditionMax).toBe(51);
  });

  it('should not drop physical/mental conditions below minimums', () => {
    const rules: GameRules = { usePhysicalMentalConditions: true };
    mockCampaign.config.gameRules = rules;
    const player = createPlayerState('test_p', 'Test Player', false, { lifestyle: 100 }, mockCampaign.housing[0].homeNodeId, mockCampaign.config);
    player.physicalCondition = 1; // Min
    player.mentalCondition = 1; // Min
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
    expect(p.physicalCondition).toBe(1);
    expect(p.mentalCondition).toBe(1);
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
    player.inventory.freshFoodUnits = 2;
    
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

  it('turnProcessor should trigger doctor visit event if physical condition is low', () => {
    const rules: GameRules = { usePhysicalMentalConditions: true, bypassDoctorIfBroke: false };
    mockCampaign.config.gameRules = rules;
    if (!mockCampaign.config.statRules) mockCampaign.config.statRules = {} as any;
    mockCampaign.config.statRules.physicalDoctorChancePerPoint = 1.0;
    const player = createPlayerState('test_p', 'Test Player', false, { lifestyle: 100 }, mockCampaign.housing[0].homeNodeId, mockCampaign.config);
    player.physicalCondition = 5; // Below 10 -> doctor visit
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
