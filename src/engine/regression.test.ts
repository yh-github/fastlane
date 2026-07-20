import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Random } from '../utils/rng';
import { gameReducer, type GameAction } from './gameReducer';
import { createInitialGameState, type PlayerState, type GameState } from './gameState';
import { processTurnStart } from './turnProcessor';
import type { CampaignBundle } from './dataLoader';

describe('Engine Integration Regression', () => {
  let mockCampaign: CampaignBundle;

  beforeEach(() => {
    // We do NOT mock Math.random here because we want to test the deterministic Random class
    // in its natural habitat based on the rngState seed.

    mockCampaign = {
      jobs: [
        { id: 'burger_cook', title: 'Burger Cook', baseWage: 5, requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' }, locationId: 'monolith', perks: [], tags: ['auto_accept'] },
        { id: 'office_clerk', title: 'Office Clerk', baseWage: 12, requirements: { experience: 10, dependability: 50, degrees: [], uniform: 'business' }, locationId: 'office', perks: [] }
      ],
      items: [
        { id: 'newspaper', name: 'Newspaper', basePrice: 1, category: 'item' },
        { id: 'bicycle', name: 'Bicycle', basePrice: 100, category: 'vehicle' },
        { id: 'refrigerator', name: 'Refrigerator', basePrice: 400, category: 'appliance', tags: ['refrigerator'] },
        { id: 'casual_clothes', name: 'Casual Clothes', basePrice: 40, category: 'clothes', subcategory: 'casual', weeks: 12 },
        { id: 'business_clothes', name: 'Business Clothes', basePrice: 250, category: 'clothes', subcategory: 'business', weeks: 12 },
        { id: 'burger', name: 'Burger', basePrice: 5, category: 'food', subcategory: 'fast_food', happinessBonus: 1 },
        { id: 'groceries', name: 'Groceries', basePrice: 20, category: 'food', subcategory: 'fresh_food', units: 4, happinessBonus: 0 }
      ],
      education: [
        { id: 'business_admin', name: 'Business Admin', baseTuitionFee: 500, lessonsRequired: 10, prerequisites: [], rewards: { happiness: 10, dependability: 20, maxDepBoost: 10, maxExpBoost: 10 } }
      ],
      housing: [
        { id: 'low_cost', name: 'Low Cost Housing', baseRent: 300, isRobberyImmune: false, description: '', homeNodeId: 'node_low_cost' },
        { id: 'security', name: 'Security Apartments', baseRent: 800, isRobberyImmune: true, description: '', homeNodeId: 'node_security' }
      ],
      stocks: [
        { id: 'tbills', name: 'T-Bills', type: 'fixed', basePrice: 50 },
        { id: 'macrosoft', name: 'Macrosoft', type: 'fluctuating', basePrice: 100, minPrice: 10, maxPrice: 500 }
      ],
      weekends: {
        ticketWeekends: {
          'baseball': { text: 'Went to a baseball game.' }
        },
        durableWeekends: {
          'bicycle': { text: 'Rode your bicycle.' }
        },
        randomWeekends: [
          'Went for a walk.',
          'Watched TV.',
          'Slept all weekend.'
        ]
      },
      events: [],
      synergies: [],
      messages: {
        job_apply_success: 'You got the job as {title}!'
      },
      config: {
        name: 'test_regression',
        version: '1.0',
        description: 'Test Campaign',
        startingMoney: 200,
        winConditions: [],
        timeRules: { hoursPerTurn: 60, workSessionCost: 6, studySessionCost: 6, jobApplicationCost: 4, relaxCost: 6, newspaperCost: 1, starvationPenalty: 20, doctorPenalty: 10, buildingEntryCost: 2, loanCost: 2, brokerCost: 2 },
        economyRules: { rentGarnishRate: 0.5, rentFee: 20, repairCostMin: 10, repairCostMax: 50, pawnPayoutRate: 0.5, pawnRedeemRate: 1.0 },
        mapRules: {},
        statRules: { startingHappiness: 50, startingRelaxation: 16, relaxationDecayRate: 1, relaxationDoctorChance: 0.20 },
        gameRules: { classicStockMarket: true, allowPartialHours: true, autoEquipBestClothes: true, clothingDecaysAll: true, strictEviction: true }
      },
      buildings: [],
      map: { width: 100, height: 100, nodes: [] }
    } as unknown as CampaignBundle;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs a deterministic full game sequence without mutating or diverging', () => {
    // 1. Setup deterministic state
    // Seed 42 for RNG
    const initialState = createInitialGameState(mockCampaign, [{ name: 'TestPlayer', isAi: false, goals: { wealth: 50, happiness: 50, education: 50, career: 50 } }], 'low_cost', {}, 42);
    
    // We will build a sequence of actions that touches various systems:
    // working, buying food, pawning, rent, moving, taking a loan, stocks, education, etc.
    type Step = GameAction | 'END_TURN';

    const sequence: Step[] = [
      // Turn 1
      { type: 'apply', jobId: 'burger_cook' },
      { type: 'work', jobId: 'burger_cook' },
      { type: 'work', jobId: 'burger_cook' },
      { type: 'buy', itemId: 'burger' },
      { type: 'buy', itemId: 'newspaper' },
      { type: 'relax' },
      { type: 'bank_transaction', amount: 50 },
      'END_TURN',
      
      // Turn 2
      { type: 'work', jobId: 'burger_cook' },
      { type: 'work', jobId: 'burger_cook' },
      { type: 'take_loan' },
      { type: 'open_broker' },
      { type: 'buy_stock', stockId: 'tbills', quantity: 2, cost: 100 },
      { type: 'buy', itemId: 'refrigerator' },
      'END_TURN',
      
      // Turn 3
      { type: 'buy', itemId: 'groceries' }, // Needs fridge, we bought one!
      { type: 'work', jobId: 'burger_cook' },
      { type: 'work', jobId: 'burger_cook' },
      { type: 'pawn_item', item: { id: 'refrigerator', purchasePrice: 400, purchaseSource: 'socket_city' }, value: 200 },
      { type: 'pay_loan' },
      { type: 'buy', itemId: 'casual_clothes' },
      'END_TURN',
      
      // Turn 4
      { type: 'rent_transaction', amount: 300 }, // Pay rent
      { type: 'enroll', degreeId: 'business_admin' },
      { type: 'study', degreeId: 'business_admin' },
      { type: 'sell_stock', stockId: 'tbills', quantity: 1, revenue: 50 },
      { type: 'work', jobId: 'burger_cook' },
      'END_TURN',
      
      // Turn 5
      { type: 'ask_rent_extension' },
      { type: 'move_apartment', housingId: 'security', cost: 800 }, // Will fail if poor, which is fine (testing error paths)
      { type: 'redeem_item', item: { itemId: 'refrigerator', originalPrice: 400, redeemCost: 200, weekPawned: 3, ownerId: 'player_1' }, cost: 200 },
      { type: 'work', jobId: 'burger_cook' },
      'END_TURN',
    ];

    let currentState = initialState;

    // Fast-forward phase to 'playing'
    currentState = { ...currentState, phase: 'playing' };

    // Execute sequence
    for (const step of sequence) {
      if (step === 'END_TURN') {
        currentState = processTurnStart(currentState, mockCampaign);
      } else {
        const player = currentState.players[0];
        const context = {
          campaign: mockCampaign,
          rules: currentState.rules,
          turn: currentState.turn,
          economicIndex: currentState.economicIndex,
          rng: new Random(currentState.rngState),
          state: currentState
        };
        const { updatedPlayer, updatedPawnShopItemsForSale } = gameReducer(player, step, context);
        
        // Advance RNG state mimicking useGameEngine
        currentState = {
          ...currentState,
          rngState: context.rng.getState(),
          pawnShopItemsForSale: updatedPawnShopItemsForSale ?? currentState.pawnShopItemsForSale,
          players: [updatedPlayer]
        };
      }
    }

    // Final Snapshot Verification
    expect(currentState).toMatchSnapshot();
  });
});
