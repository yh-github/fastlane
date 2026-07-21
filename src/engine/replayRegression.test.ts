import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { gameReducer } from './gameReducer';
import { processTurnStart } from './turnProcessor';
import { type ReplayData, type ReplayContext } from './replayTypes';
import { Random } from '../utils/rng';
import type { CampaignBundle } from './dataLoader';

describe('Deterministic Replay Regression', () => {
  it('replays a recorded game exactly using test_replay.json', () => {
    const replayPath = path.resolve('tests/fixtures/test_replay.json');
    if (!fs.existsSync(replayPath)) {
      console.warn('Skipping replay test: test_replay.json not found');
      return;
    }

    const replayData: ReplayData = JSON.parse(fs.readFileSync(replayPath, 'utf8'));
    let currentState = replayData.startingState;

    // Use the same mock campaign we used to generate it
    // Alternatively, we could save/load the full campaign.
    // For this test, we construct the mockCampaign as used in generate_replay.ts
    const mockCampaign: CampaignBundle = {
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

    for (const step of replayData.steps) {
      if (step.action.type === 'end_turn') {
        const replayCtx: ReplayContext = { inDecisions: step.engineDecisions || [], outDecisions: [] };
        currentState = processTurnStart(currentState, mockCampaign, replayCtx);
      } else {
        const player = currentState.players[0];
        const replayCtx: ReplayContext = { inDecisions: step.engineDecisions || [], outDecisions: [] };
        const context = {
          campaign: mockCampaign,
          rules: currentState.rules,
          turn: currentState.turn,
          economicIndex: currentState.economicIndex,
          rng: new Random(currentState.rngState),
          state: currentState,
          replayContext: replayCtx
        };
        const { updatedPlayer, updatedPawnShopItemsForSale } = gameReducer(player, step.action as any, context);
        
        currentState = {
          ...currentState,
          rngState: context.rng.getState(),
          pawnShopItemsForSale: updatedPawnShopItemsForSale ?? currentState.pawnShopItemsForSale,
          players: [updatedPlayer]
        };
      }
    }

    // Verify it matches snapshot
    expect(currentState).toMatchSnapshot();
  });
});
