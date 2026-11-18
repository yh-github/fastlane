import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { gameReducer } from './gameReducer';
import { processTurnStart } from './turnProcessor';
import { createInitialGameState } from './gameState';
import { type ReplayData, type ReplayContext, type ReplayStep } from './replayTypes';
import { Random } from '../utils/rng';
import { loadCampaign, type CampaignBundle } from './dataLoader';
import { TEST_BASE_CAMPAIGN_CONFIG, TEST_BASE_GAME_RULES } from './testFactories';

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
        ...TEST_BASE_CAMPAIGN_CONFIG,
        name: 'test_regression',
        version: '1.0',
        description: 'Test Campaign',
        startingMoney: 200,
        winConditions: [],
        timeRules: { ...TEST_BASE_CAMPAIGN_CONFIG.timeRules, hoursPerTurn: 60, workSessionCost: 6, studySessionCost: 6, jobApplicationCost: 4, relaxCost: 6, newspaperCost: 1, starvationPenalty: 20, doctorPenalty: 10, buildingEntryCost: 2, loanCost: 2, brokerCost: 2 },
        economyRules: { ...TEST_BASE_CAMPAIGN_CONFIG.economyRules, model: undefined, rentGarnishRate: 0.5, rentFee: 20, repairCostMin: 0.05, repairCostMax: 0.25, pawnPayoutRate: 0.5, pawnRedeemRate: 1.0 },
        mapRules: { ...TEST_BASE_CAMPAIGN_CONFIG.mapRules },
        statRules: { ...TEST_BASE_CAMPAIGN_CONFIG.statRules, startingHappiness: 50, startingRelaxation: 16, relaxationDecayRate: 1, relaxationDoctorChance: 0.20 },
        eventRules: { ...TEST_BASE_CAMPAIGN_CONFIG.eventRules, willyRobberyStartWeek: 4 },
        gameRules: { ...TEST_BASE_GAME_RULES, minEconomicReading: -30, classicStockMarket: true, allowPartialHours: true, autoEquipBestClothes: true, clothingDecaysAll: true, strictEviction: true }
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

  it('replays a real game using fastlane-replay-21-weeks.json', async () => {
    const replayPath = path.resolve('tests/fixtures/regression/fastlane-replay-21-weeks.json');
    if (!fs.existsSync(replayPath)) {
      console.warn('Skipping replay test: fastlane-replay-21-weeks.json not found');
      return;
    }

    const replayData: ReplayData = JSON.parse(fs.readFileSync(replayPath, 'utf8'));
    let currentState = replayData.startingState;
    const realCampaign = await loadCampaign('qol_improved');

    for (const step of replayData.steps) {
      if (step.action.type === 'end_turn') {
        const replayCtx: ReplayContext = { inDecisions: step.engineDecisions || [], outDecisions: [] };
        currentState = processTurnStart(currentState, realCampaign, replayCtx);
      } else {
        const player = currentState.players[0];
        const replayCtx: ReplayContext = { inDecisions: step.engineDecisions || [], outDecisions: [] };
        const context = {
          campaign: realCampaign,
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
  it('replays bug 1785246627881 (apartment robbery without appliances)', async () => {
    const replayPath = path.resolve('tests/fixtures/regression/fastlane-replay-1785246627881.json');
    if (!fs.existsSync(replayPath)) {
      console.warn('Skipping replay test: fastlane-replay-1785246627881.json not found');
      return;
    }

    const replayData: ReplayData = JSON.parse(fs.readFileSync(replayPath, 'utf8'));
    let currentState = replayData.startingState;
    const realCampaign = await loadCampaign('qol_improved');

    for (const step of replayData.steps) {
      if (step.action.type === 'end_turn') {
        const replayCtx: ReplayContext = { inDecisions: step.engineDecisions || [], outDecisions: [] };
        currentState = processTurnStart(currentState, realCampaign, replayCtx);
      } else {
        const player = currentState.players[0];
        const replayCtx: ReplayContext = { inDecisions: step.engineDecisions || [], outDecisions: [] };
        const context = {
          campaign: realCampaign,
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

    // After turn 1 ends (going into turn 2), the player should NOT have been robbed
    // because they had no appliances, despite the engineDecision 'apartment_robbery: true'.
    const player = currentState.players[0];
    const hasRobberyEvent = player.turnEvents.some(e => e.key === 'events.robbery.apartment' || e.key === 'events.robbery.willy');
    expect(hasRobberyEvent).toBe(false);
    expect(player.happiness).toBeGreaterThanOrEqual(10); // Specifically, should not have -4 penalty for a robbery that didn't happen

    // Verify it matches snapshot
    expect(currentState).toMatchSnapshot();
  });

  it('replays Advanced 2000 alternative weekend choices and resolve_weekend deterministically', async () => {
    const adv2000 = await loadCampaign('advanced_2000');
    let liveState = createInitialGameState(
      adv2000,
      [{ name: 'Tester', isAi: false, goals: { wealth: 50, happiness: 50, education: 50, career: 50 } }],
      'node_low_cost',
      adv2000.config.gameRules,
      987654
    );
    const startingState = structuredClone(liveState);
    const steps: ReplayStep[] = [];

    // 1. Advance Turn 0 -> Turn 1 -> Turn 2 (triggers generateWeekendChoices)
    for (let i = 0; i < 2; i++) {
      const outDecisions: any[] = [];
      const replayCtx: ReplayContext = { outDecisions };
      liveState = processTurnStart(liveState, adv2000, replayCtx);
      steps.push({ turn: liveState.turn - 1, action: { type: 'end_turn' }, engineDecisions: outDecisions });
    }

    const offered = liveState.players[0].offeredWeekendCards!;
    expect(offered.length).toBeGreaterThanOrEqual(2);

    // 2. Human selects card 1 via gameReducer (resolve_weekend)
    const chosenCardId = offered[1].id;
    const rng = new Random(liveState.rngState);
    const weekendRes = gameReducer(liveState.players[0], { type: 'resolve_weekend', cardId: chosenCardId }, {
      campaign: adv2000,
      rules: liveState.rules,
      turn: liveState.turn,
      economicIndex: liveState.economicIndex,
      rng,
      state: liveState
    });
    liveState = {
      ...liveState,
      rngState: rng.getState(),
      players: [weekendRes.updatedPlayer]
    };
    steps.push({
      turn: liveState.turn,
      action: { type: 'resolve_weekend', cardId: chosenCardId },
      engineDecisions: weekendRes.outEngineDecisions || []
    });

    // 3. Advance Turn 2 -> Turn 3 (subsequent turn's weekend deck state & cards must also match!)
    const turn3Decisions: any[] = [];
    liveState = processTurnStart(liveState, adv2000, { outDecisions: turn3Decisions });
    steps.push({ turn: 2, action: { type: 'end_turn' }, engineDecisions: turn3Decisions });

    // 4. Replay from startingState using recorded engineDecisions
    let replayedState = structuredClone(startingState);
    for (const step of steps) {
      if (step.action.type === 'end_turn') {
        replayedState = processTurnStart(replayedState, adv2000, {
          inDecisions: [...step.engineDecisions],
          outDecisions: []
        });
      } else {
        const replayRng = new Random(replayedState.rngState);
        const res = gameReducer(replayedState.players[0], step.action as any, {
          campaign: adv2000,
          rules: replayedState.rules,
          turn: replayedState.turn,
          economicIndex: replayedState.economicIndex,
          rng: replayRng,
          state: replayedState,
          engineDecisions: [...step.engineDecisions]
        });
        replayedState = {
          ...replayedState,
          rngState: replayRng.getState(),
          players: [res.updatedPlayer]
        };
      }
    }

    // All gameplay state (players, weekend cards/decks, economy, turn, events) must replay identically
    expect({ ...replayedState, rngState: liveState.rngState }).toEqual(liveState);
  });
});
