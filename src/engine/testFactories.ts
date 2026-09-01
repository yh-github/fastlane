/**
 * testFactories.ts — Strongly-typed factory functions for tests.
 *
 * Avoids dangerous `as unknown as PlayerState` casts by generating fully-formed,
 * valid default domain models that adhere to all TypeScript interfaces.
 */

import { type PlayerState, type GameState, type GameRules, createPlayerState, createInitialGameState } from './gameState';
import { type CampaignBundle } from './dataLoader';
import { DEFAULT_GAME_RULES } from './rules';
import type { TimeRules, StatRules, EconomyRules, EventRules } from './rules';
import type { CampaignConfig } from './dataLoader';

export type MockCampaignOverrides = Partial<Omit<CampaignBundle, 'config'>> & {
  config?: Partial<Omit<CampaignConfig, 'timeRules' | 'economyRules' | 'statRules' | 'gameRules' | 'eventRules'>> & {
    timeRules?: Partial<TimeRules>;
    economyRules?: Partial<EconomyRules>;
    statRules?: Partial<StatRules>;
    gameRules?: Partial<GameRules>;
    eventRules?: Partial<EventRules>;
  };
};

/**
 * Creates a valid, complete CampaignBundle with sensible defaults for testing.
 */
export function createMockCampaign(overrides: MockCampaignOverrides = {}): CampaignBundle {
  const defaultCampaign: CampaignBundle = {
    config: {
      name: 'test_mock_campaign',
      version: '1.0.0',
      description: 'Mock Campaign for Unit Tests',
      startingMoney: 200,
      winConditions: [],
      timeRules: {
        hoursPerTurn: 60,
        workSessionCost: 6,
        studySessionCost: 6,
        jobApplicationCost: 4,
        relaxCost: 6,
        newspaperCost: 1,
        starvationPenalty: 20,
        doctorPenalty: 10,
        buildingEntryCost: 2,
        loanCost: 2,
        brokerCost: 2,
        cleaningServiceCost: 1,
        socializeCost: 6,
      },
      economyRules: {
        rentGarnishRate: 0.5,
        rentFee: 20,
        repairCostMin: 10,
        repairCostMax: 50,
        pawnPayoutRate: 0.5,
        pawnRedeemRate: 1.0,
        cleaningServiceBasePrice: 100,
        socializeLowCostCashCost: 25,
        socializeSecurityCashCost: 50,
        moveFeeMessThreshold: 10,
        moveFeeMessRate: 50,
        moveFeeDurableRate: 50,
      },
      mapRules: {
        movementCostPerNode: 1,
      },
      statRules: {
        startingHappiness: 50,
        startingRelaxation: 16,
        relaxationDecayRate: 1,
        relaxationDoctorChance: 0.20,
        globalMessMin: 0,
        globalMessMax: 99,
        lowCostMessMax: 50,
        securityMessMax: 90,
        minPhysicalCondition: 3,
        globalPhysicalMin: 1,
        initialPhysicalMax: 50,
        initialMinPhysical: 3,
        minMentalCondition: 5,
        startingSocial: 9,
        minSocial: 1,
        maxSocial: 99,
        cleanPhysicalCost: 1,
      },
      gameRules: { ...DEFAULT_GAME_RULES },
    },
    buildings: [
      { id: 'monolith_burgers', name: 'Monolith Burgers', archetype: 'restaurant', spritePath: '', description: '' },
      { id: 'socket_city', name: 'Socket City', archetype: 'shop', spritePath: '', description: '' },
      { id: 'university', name: 'University', archetype: 'education', spritePath: '', description: '' },
      { id: 'bank', name: '1st National Bank', archetype: 'bank', spritePath: '', description: '' },
      { id: 'blacks_market', name: "Black's Market", archetype: 'shop', spritePath: '', description: '' },
      { id: 'discount_and_pawn', name: 'Discount & Pawn', archetype: 'discount_and_pawn', spritePath: '', description: '' },
      { id: 'low_cost', name: 'Low Cost Apartments', archetype: 'housing', spritePath: '', description: '' },
      { id: 'security', name: 'Security Apartments', archetype: 'housing', spritePath: '', description: '' },
    ],
    map: {
      width: 1000,
      height: 1000,
      nodes: [
        { id: 'node_low_cost', buildingId: 'low_cost', x: 100, y: 100, connections: ['node_monolith', 'node_bank'] },
        { id: 'node_monolith', buildingId: 'monolith_burgers', x: 200, y: 100, connections: ['node_low_cost', 'node_university'] },
        { id: 'node_university', buildingId: 'university', x: 300, y: 100, connections: ['node_monolith', 'node_bank'] },
        { id: 'node_bank', buildingId: 'bank', x: 200, y: 200, connections: ['node_low_cost', 'node_university', 'node_socket'] },
        { id: 'node_socket', buildingId: 'socket_city', x: 300, y: 200, connections: ['node_bank'] },
      ],
    },
    items: [
      { id: 'newspaper', name: 'Newspaper', basePrice: 1, category: 'junk', happinessBonus: 0 },
      { id: 'burger', name: 'Burger', basePrice: 5, category: 'food', subcategory: 'fast_food', happinessBonus: 1 },
      { id: 'groceries', name: 'Groceries', basePrice: 20, category: 'food', subcategory: 'fresh_food', units: 4, happinessBonus: 0 },
      { id: 'refrigerator', name: 'Refrigerator', basePrice: 400, category: 'appliance', tags: ['refrigerator'], happinessBonus: 1 },
      { id: 'color_tv', name: 'Color TV', basePrice: 350, category: 'appliance', tags: ['tv'], happinessBonus: 2 },
      { id: 'hot_tub', name: 'Hot Tub', basePrice: 1200, category: 'appliance', tags: ['hot_tub'], happinessBonus: 4 },
      { id: 'casual_clothes', name: 'Casual Clothes', basePrice: 40, category: 'clothes', subcategory: 'casual', weeks: 12, happinessBonus: 0 },
      { id: 'dress_clothes', name: 'Dress Clothes', basePrice: 120, category: 'clothes', subcategory: 'dress', weeks: 12, happinessBonus: 0 },
      { id: 'business_suit', name: 'Business Suit', basePrice: 250, category: 'clothes', subcategory: 'business', weeks: 12, happinessBonus: 0 },
    ],
    jobs: [
      {
        id: 'burger_cook',
        title: 'Burger Cook',
        baseWage: 5,
        locationId: 'monolith_burgers',
        requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' },
        perks: [],
        tags: ['always_hiring'],
      },
      {
        id: 'office_clerk',
        title: 'Office Clerk',
        baseWage: 12,
        locationId: 'bank',
        requirements: { experience: 10, dependability: 50, degrees: [], uniform: 'business' },
        perks: [],
      },
    ],
    housing: [
      {
        id: 'low_cost',
        name: 'Low Cost Apartments',
        baseRent: 300,
        isRobberyImmune: false,
        description: 'Cheap housing',
        homeNodeId: 'node_low_cost',
        lifestyleValue: 5,
      },
      {
        id: 'security',
        name: 'Security Apartments',
        baseRent: 800,
        isRobberyImmune: true,
        description: 'Safe housing',
        homeNodeId: 'node_low_cost',
        lifestyleValue: 20,
      },
    ],
    education: [
      {
        id: 'junior_college',
        name: 'Junior College Degree',
        baseTuitionFee: 200,
        lessonsRequired: 10,
        prerequisites: [],
        rewards: { happiness: 5, dependability: 10, maxDepBoost: 5, maxExpBoost: 5 },
      },
      {
        id: 'business_admin',
        name: 'Business Administration Degree',
        baseTuitionFee: 500,
        lessonsRequired: 10,
        prerequisites: ['junior_college'],
        rewards: { happiness: 10, dependability: 20, maxDepBoost: 10, maxExpBoost: 10 },
      },
    ],
    stocks: [
      { id: 'tbills', name: 'T-Bills', type: 'fixed', basePrice: 50 },
      { id: 'acme', name: 'ACME Corp', type: 'fluctuating', basePrice: 100, minPrice: 10, maxPrice: 500 },
    ],
    weekends: {
      ticketWeekends: {},
      durableWeekends: {},
      randomWeekends: ['Relaxed at the park.', 'Read a book at home.'],
    },
    events: [],
    synergies: [
      {
        id: 'base_ref',
        name: 'Refrigerator Storage',
        requires: ['tag:refrigerator'],
        effects: [{ type: 'set_food_storage', value: 6, operation: 'MAX' }],
      },
    ],
    messages: {
      job_apply_success: 'You got the job as {title}!',
    },
  };

  return {
    ...defaultCampaign,
    ...overrides,
    config: {
      ...defaultCampaign.config,
      ...(overrides.config || {}),
      timeRules: { ...defaultCampaign.config.timeRules, ...(overrides.config?.timeRules || {}) },
      economyRules: { ...defaultCampaign.config.economyRules, ...(overrides.config?.economyRules || {}) },
      statRules: { ...defaultCampaign.config.statRules, ...(overrides.config?.statRules || {}) },
      gameRules: { ...defaultCampaign.config.gameRules, ...(overrides.config?.gameRules || {}) },
      eventRules: overrides.config?.eventRules ? { ...(defaultCampaign.config.eventRules || {}), ...overrides.config.eventRules } as EventRules : defaultCampaign.config.eventRules,
    },
  };
}

/**
 * Creates a valid, complete PlayerState with sensible defaults.
 */
export function createTestPlayer(overrides: Partial<PlayerState> = {}, campaign?: CampaignBundle): PlayerState {
  const camp = campaign || createMockCampaign();
  const basePlayer = createPlayerState(
    overrides.id || 'test_player_1',
    overrides.name || 'Test Player',
    overrides.isAi ?? false,
    overrides.goalAllotment || { wealth: 25, happiness: 25, education: 25, career: 25 },
    overrides.position || camp.housing[0]?.homeNodeId || 'node_low_cost',
    camp.config
  );

  return {
    ...basePlayer,
    ...overrides,
    inventory: {
      ...basePlayer.inventory,
      ...(overrides.inventory || {}),
      stocks: {
        ...basePlayer.inventory.stocks,
        ...(overrides.inventory?.stocks || {}),
        holdings: {
          ...basePlayer.inventory.stocks.holdings,
          ...(overrides.inventory?.stocks?.holdings || {}),
        },
      },
      appliances: overrides.inventory?.appliances ?? basePlayer.inventory.appliances,
      books: overrides.inventory?.books ?? basePlayer.inventory.books,
      fastFoodItems: overrides.inventory?.fastFoodItems ?? basePlayer.inventory.fastFoodItems,
      pawnedItems: overrides.inventory?.pawnedItems ?? basePlayer.inventory.pawnedItems,
    },
    turnFlags: {
      ...basePlayer.turnFlags,
      ...(overrides.turnFlags || {}),
      jobsRejectedThisTurn: overrides.turnFlags?.jobsRejectedThisTurn ?? basePlayer.turnFlags.jobsRejectedThisTurn,
    },
    goalAllotment: {
      ...basePlayer.goalAllotment,
      ...(overrides.goalAllotment || {}),
    },
    enrolledClasses: {
      ...basePlayer.enrolledClasses,
      ...(overrides.enrolledClasses || {}),
    },
  };
}

/**
 * Creates a valid, complete GameState for testing.
 */
export function createTestGame(
  campaign?: CampaignBundle,
  playerOverrides?: Partial<PlayerState>,
  rulesOverrides?: Partial<GameRules>
): GameState {
  const camp = campaign || createMockCampaign();
  const state = createInitialGameState(
    camp,
    [{ name: 'Test Player', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }],
    camp.housing[0]?.homeNodeId || 'node_low_cost',
    rulesOverrides,
    12345
  );

  if (playerOverrides) {
    state.players[0] = createTestPlayer({ ...state.players[0], ...playerOverrides }, camp);
  }

  return state;
}

/**
 * Test wrapper for createInitialGameState that supplies a default deterministic seed (12345)
 * for test assertions.
 */
export function createTestGameState(
  campaign: CampaignBundle,
  playersConfig: Array<{ name: string; isAi: boolean; goals?: Record<string, number> }>,
  startNode: string = 'node_low_cost',
  rules?: Partial<GameRules>,
  seed: number = 12345
): GameState {
  const formattedPlayers = playersConfig.map(p => ({
    name: p.name,
    isAi: p.isAi,
    goals: p.goals || { wealth: 50, happiness: 50, education: 50, career: 50 }
  }));
  return createInitialGameState(campaign, formattedPlayers, startNode, rules, seed);
}
