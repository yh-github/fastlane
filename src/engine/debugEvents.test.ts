import { describe, it, expect } from 'vitest';
import { checkEventPreconditions, type DebugQueuedEvent } from './debugEvents';
import { createInitialGameState } from './gameState';
import { processTurnStart } from './turnProcessor';
import { type CampaignBundle } from './dataLoader';

const mockCampaign: CampaignBundle = {
  config: {
    name: 'test_campaign',
    startingMoney: 200,
    timeRules: {
      hoursPerTurn: 60,
      workSessionCost: 8,
      studySessionCost: 10,
      relaxCost: 6,
      relaxGain: 3,
      brokerCost: 1,
      loanCost: 1,
      newspaperCost: 1,
      cleaningServiceCost: 1,
      socializeCost: 6,
      doctorPenalty: 6,
      starvationPenalty: 6,
      buildingEntryCost: 0,
    },
    statRules: {
      startingHappiness: 50,
      startingRelaxation: 16,
      relaxationDecayRate: 1,
      relaxationDoctorChance: 0.2,
      physicalDoctorThreshold: 10,
      lowSpiritsThreshold: 10,
    },
    eventRules: {
      willyRobberyStartWeek: 4,
      marketCrashDivisor: 30,
      charity: {
        maxCash: 0,
        maxWealth: 200,
        wealthMetric: 'durableValue',
      },
    },
    winConditions: [],
  },
  housing: [
    { id: 'low_cost', name: 'Low Cost Apt', baseRent: 325, lifestyleValue: 10 },
    { id: 'security', name: 'La Security', baseRent: 475, lifestyleValue: 30 },
  ],
  jobs: [],
  education: [],
  items: [
    { id: 'tv', name: 'Color TV', category: 'appliance', basePrice: 400 },
    { id: 'computer', name: 'Personal Computer', category: 'appliance', basePrice: 900, effects: [{ stat: 'computer_income_chance' as any, value: 1, trigger: 'turn_start' }] },
  ],
  synergies: [],
  weekends: { ticketWeekends: {}, durableWeekends: {}, randomWeekends: [] },
  map: { nodes: [] },
  messages: {},
  stocks: [],
};

describe('Debug Events Precondition Logic', () => {
  it('market_crash requires turn >= 8 and economicIndex >= 80', () => {
    const state = createInitialGameState(mockCampaign, [{ name: 'P1', isAi: false, goals: {} }], 'node_low_cost');
    state.turn = 5;
    state.economicIndex = 85;
    expect(checkEventPreconditions('market_crash', state, mockCampaign).allowed).toBe(false);

    state.turn = 8;
    state.economicIndex = 50;
    expect(checkEventPreconditions('market_crash', state, mockCampaign).allowed).toBe(false);

    state.turn = 8;
    state.economicIndex = 80;
    expect(checkEventPreconditions('market_crash', state, mockCampaign).allowed).toBe(true);
  });

  it('market_boom requires turn >= 8 and economicIndex >= 0', () => {
    const state = createInitialGameState(mockCampaign, [{ name: 'P1', isAi: false, goals: {} }], 'node_low_cost');
    state.turn = 8;
    state.economicIndex = -10;
    expect(checkEventPreconditions('market_boom', state, mockCampaign).allowed).toBe(false);

    state.economicIndex = 0;
    expect(checkEventPreconditions('market_boom', state, mockCampaign).allowed).toBe(true);
  });

  it('apartment_robbery forbids La Security and requires owned appliances', () => {
    const state = createInitialGameState(mockCampaign, [{ name: 'P1', isAi: false, goals: {} }], 'node_low_cost');
    const p = state.players[0];

    // No appliances
    expect(checkEventPreconditions('apartment_robbery', state, mockCampaign, p).allowed).toBe(false);

    // Has appliance, living in low_cost
    p.inventory.appliances.push({ id: 'tv', purchasePrice: 400, purchaseSource: 'socket_city' });
    expect(checkEventPreconditions('apartment_robbery', state, mockCampaign, p).allowed).toBe(true);

    // Living in security
    p.currentHousingId = 'security';
    expect(checkEventPreconditions('apartment_robbery', state, mockCampaign, p).allowed).toBe(false);
  });

  it('lottery_win requires lottery tickets', () => {
    const state = createInitialGameState(mockCampaign, [{ name: 'P1', isAi: false, goals: {} }], 'node_low_cost');
    const p = state.players[0];
    expect(checkEventPreconditions('lottery_win', state, mockCampaign, p).allowed).toBe(false);

    p.inventory.lotteryTickets = 2;
    expect(checkEventPreconditions('lottery_win', state, mockCampaign, p).allowed).toBe(true);
  });

  it('appliance_break requires appliances', () => {
    const state = createInitialGameState(mockCampaign, [{ name: 'P1', isAi: false, goals: {} }], 'node_low_cost');
    const p = state.players[0];
    expect(checkEventPreconditions('appliance_break', state, mockCampaign, p).allowed).toBe(false);

    p.inventory.appliances.push({ id: 'tv', purchasePrice: 400, purchaseSource: 'socket_city' });
    expect(checkEventPreconditions('appliance_break', state, mockCampaign, p).allowed).toBe(true);
  });
});

describe('Turn Processor consuming debugQueue', () => {
  it('guarantees lottery win when queued', () => {
    const state = createInitialGameState(mockCampaign, [{ name: 'P1', isAi: false, goals: {} }], 'node_low_cost');
    state.turn = 1;
    state.players[0].inventory.lotteryTickets = 1;
    state.players[0].money = 100;
    state.debugQueue = [
      {
        id: 'lottery_test',
        type: 'lottery_win',
        playerId: state.players[0].id,
        lotteryTier: 'large',
      },
    ];

    const nextState = processTurnStart(state, mockCampaign);
    const weekendCost = nextState.players[0].weekendResult?.cost || 0;
    expect(nextState.players[0].money).toBe(100 - weekendCost + 5000);
    expect(nextState.players[0].inventory.lotteryTickets).toBe(0);
    expect(nextState.players[0].turnEvents.some(e => e.key === 'events.lottery')).toBe(true);
  });

  it('notifies cancellation if queued event preconditions are not met at turn start', () => {
    const state = createInitialGameState(mockCampaign, [{ name: 'P1', isAi: false, goals: {} }], 'node_low_cost');
    state.turn = 1;
    state.players[0].inventory.lotteryTickets = 0; // Precondition broken
    state.debugQueue = [
      {
        id: 'lottery_test',
        type: 'lottery_win',
        playerId: state.players[0].id,
      },
    ];

    const nextState = processTurnStart(state, mockCampaign);
    expect(nextState.players[0].turnEvents.some(e => e.key === 'debug.event_cancelled')).toBe(true);
  });

  it('triggers market crash with chosen severity when queued', () => {
    const state = createInitialGameState(mockCampaign, [{ name: 'P1', isAi: false, goals: {} }], 'node_low_cost');
    state.turn = 8;
    state.economicIndex = 85;
    state.debugQueue = [
      {
        id: 'crash_test',
        type: 'market_crash',
        crashSeverity: 'major',
      },
    ];

    const nextState = processTurnStart(state, mockCampaign);
    expect(nextState.players[0].newspaperHeadline?.key).toBe('newspaper.crash_major');
  });
});
