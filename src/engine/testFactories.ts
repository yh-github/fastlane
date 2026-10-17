/**
 * testFactories.ts — Strongly-typed factory functions for tests.
 *
 * Generates complete, validated default domain models for unit tests.
 */

import { type PlayerState, type GameState, type GameRules, createPlayerState, createInitialGameState } from './gameState';
import { type CampaignBundle, type CampaignConfig, type BaseCampaignConfig, type AdvancedCampaignConfig } from './dataLoader';
import type { AdvancedTimeRules, AdvancedStatRules, AdvancedEconomyRules, EventRules, MapRules } from './rules';
import floppyConfigJson from '../../public/campaigns/1990_classic_floppy/config.json';
import cdromConfigJson from '../../public/campaigns/1990_classic_cdrom/config.json';
import qolConfigJson from '../../public/campaigns/qol_improved/config.json';
import advancedConfigJson from '../../public/campaigns/advanced/config.json';

export const TEST_BASE_GAME_RULES: GameRules = {
  ...(floppyConfigJson.gameRules as GameRules),
};

export const TEST_BASE_CAMPAIGN_CONFIG: BaseCampaignConfig = floppyConfigJson as unknown as BaseCampaignConfig;

export const TEST_ADVANCED_GAME_RULES: GameRules = {
  ...(floppyConfigJson.gameRules as GameRules),
  ...(cdromConfigJson.gameRules as Partial<GameRules>),
  ...(qolConfigJson.gameRules as Partial<GameRules>),
  ...(advancedConfigJson.gameRules as Partial<GameRules>),
  versionClass: 'advanced',
};

export const TEST_ADVANCED_CAMPAIGN_CONFIG: AdvancedCampaignConfig = {
  ...(floppyConfigJson as unknown as AdvancedCampaignConfig),
  ...(cdromConfigJson as unknown as Partial<AdvancedCampaignConfig>),
  ...(qolConfigJson as unknown as Partial<AdvancedCampaignConfig>),
  ...(advancedConfigJson as unknown as Partial<AdvancedCampaignConfig>),
  versionClass: 'advanced',
  timeRules: {
    ...floppyConfigJson.timeRules,
    ...advancedConfigJson.timeRules,
  },
  economyRules: {
    ...(floppyConfigJson.economyRules as unknown as AdvancedEconomyRules),
    ...((qolConfigJson as any).economyRules || {}),
    ...advancedConfigJson.economyRules,
  },
  mapRules: {
    ...floppyConfigJson.mapRules,
    ...((qolConfigJson as any).mapRules || {}),
  } as MapRules,
  statRules: {
    ...floppyConfigJson.statRules,
    ...((qolConfigJson as any).statRules || {}),
    ...advancedConfigJson.statRules,
  } as AdvancedStatRules,
  eventRules: {
    ...(floppyConfigJson.eventRules as EventRules),
    ...((cdromConfigJson as any).eventRules || {}),
    charity: {
      ...floppyConfigJson.eventRules.charity,
      ...(((cdromConfigJson as any).eventRules || {}).charity || {}),
    },
  },
  gameRules: TEST_ADVANCED_GAME_RULES,
};

export type MockCampaignOverrides = Partial<Omit<CampaignBundle, 'config'>> & {
  config?: Partial<Omit<CampaignConfig, 'timeRules' | 'economyRules' | 'statRules' | 'gameRules' | 'eventRules' | 'mapRules'>> & {
    timeRules?: Partial<AdvancedTimeRules>;
    economyRules?: Partial<AdvancedEconomyRules>;
    statRules?: Partial<AdvancedStatRules>;
    gameRules?: Partial<GameRules>;
    eventRules?: Partial<EventRules>;
    mapRules?: Partial<MapRules>;
  };
};

/**
 * Creates a valid, complete CampaignBundle with sensible defaults for testing.
 */
export function createMockCampaign(overrides: MockCampaignOverrides = {}): CampaignBundle {
  const defaultTimeRules: AdvancedTimeRules = {
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
    relaxGain: 3,
    burnoutPenalty: 15,
  };

  const defaultEconomyRules: AdvancedEconomyRules = {
    model: 'authentic_sectors',
    rentGarnishRate: 0.5,
    rentFee: 20,
    repairCostMin: 0.05,
    repairCostMax: 0.25,
    pawnPayoutRate: 0.5,
    pawnRedeemRate: 1.0,
    cleaningServiceBasePrice: 100,
    socializeLowCostCashCost: 25,
    socializeSecurityCashCost: 50,
    socializePenthouseCashCost: 100,
    moveFeeMessThreshold: 10,
    moveFeeMessRate: 5,
    moveFeeDurableRate: 10,
    bankTransactionIncrementSmall: 50,
    bankTransactionIncrementLarge: 500,
    loanPaymentAmount: 50,
    loanInterestAmount: 5,
    loanPrincipalAmount: 45,
    baselineReading: 100,
    minReading: 10,
    maxReading: 190,
    priceFloorPercent: 50,
    priceCeilingPercent: 250,
    upwardBounceStrongThreshold: 40,
    upwardBounceModerateThreshold: 70,
    downwardBounceStrongThreshold: 160,
    downwardBounceModerateThreshold: 130,
    sectorRisks: {
      main: 4,
      goods: 4,
      investments: 4,
      gold: 2,
      silver: 2,
      pork: 4,
      blueChip: 1,
      penny: 10,
    },
  };

  const defaultMapRules: MapRules = {
    allowDiagonalMovement: false,
    movementCostModel: 'waypoints',
    movementCostPerNode: 1,
    stepsPerHour: 14,
  };

  const defaultStatRules: AdvancedStatRules = {
    startingHappiness: 0,
    minHappiness: 0,
    maxHappiness: 100,
    startingRelaxation: 25,
    minRelaxation: 10,
    maxRelaxation: 50,
    relaxationDecayRate: 1,
    relaxMessIncrease: 1,
    relaxationDoctorChance: 0.20,
    enableAdvancedStats: true,
    mentalWarningThreshold: 15,
    physicalWarningThreshold: 15,
    startingPhysicalCondition: 50,
    startingMentalCondition: 50,
    minPhysicalCondition: 3,
    maxPhysicalCondition: 50,
    minMentalCondition: 3,
    maxMentalCondition: 50,
    globalMaxMentalCondition: 99,
    physicalDoctorThreshold: 10,
    physicalDoctorChancePerPoint: 0.1,
    doctorVisitPhysicalThreshold: 10,
    doctorVisitPhysicalChancePerPoint: 0.1,
    hotTubMaxMessBonus: 5,
    lowSpiritsThreshold: 15,
    lowSpiritsChancePerPoint: 0.05,
    workGrindThreshold: 3,
    workGrindMentalCost: 2,
    workGrindPhysicalCost: 2,
    workPhysicalCost: 1,
    workNormalMentalCost: 1,
    workOvertimeThreshold: 8,
    workOvertimePhysicalCost: 2,
    workOvertimeMentalCost: 2,
    studyMentalCost: 1,
    studyNormalMentalCost: 1,
    studyNormalPhysicalCost: 0,
    studyGrindThreshold: 3,
    studyGrindMentalCost: 2,
    studyGrindPhysicalCost: 1,
    studyOvertimeThreshold: 8,
    studyOvertimeMentalCost: 2,
    studyOvertimePhysicalCost: 2,
    resilienceDropThreshold: 3,
    cleanPhysicalCost: 1,
    initialPhysicalMax: 50,
    initialMinPhysical: 3,
    globalPhysicalMin: 3,
    minMaxPhysical: 50,
    globalMessMax: 100,
    lowCostMessMax: 30,
    securityMessMax: 100,
    initialMessMin: 0,
    globalMessMin: 0,
    startingSocial: 20,
    minSocial: 0,
    maxSocial: 99,
    doctorPhysicalBounceBack: 20,
    starvationMaxPhysicalPenalty: 15,
    lowSpiritsMentalBounceBack: 10,
    globalMaxPhysicalCondition: 99,
    heavyPhysicalMinRequirement: 21,
    mentalMaxBaseValue: 50,
    mentalMaxDegreeBonus: 5,
    mentalMaxBookLimit: 3,
    mentalMaxBookBonus: 1,
    mentalMaxComputerBonus: 3,
    baseSkillCap: 2.5,
    maxSkillCap: 10.0,
    baseEmployability: 45,
    employabilityMarginRate: 1.0,
    employabilityMaxMarginBonus: 40,
    maxWageCompetitionPenalty: 20,
    employabilitySkillBonusRate: 2.0,
    generalSocialEmployabilityRate: 0.1,
    socialEmployabilityBaseline: 20,
    frontlineSocialEmployabilityRate: 0.5,
    tagCompetitionModifiers: {
      heavy_physical: -5,
      high_downtime: 5,
    },
    startingExperience: 10,
    startingDependability: 20,
    startingCasualClothesWeeks: 6,
    maxExperience: 99,
    maxDependability: 99,
    dependabilityWeeklyDecay: 3,
  };

  const defaultEventRules: EventRules = {
    marketCrashDivisor: 2,
    marketCrashThreshold: 80,
    marketCrashStartWeek: 8,
    economicBoomDivisor: 50,
    economicBoomStartWeek: 8,
    economicBoomThreshold: 120,
    willyRobberyStartWeek: 5,
    applianceBreakStartWeek: 2,
    charity: {
      maxCash: 500,
      maxWealth: 2000,
      wealthMetric: 'netWorth',
    },
  };

  const mergedGameRules: GameRules = {
    ...TEST_BASE_GAME_RULES,
    ...(overrides.config?.gameRules || {}),
  };
  if (overrides.config?.versionClass && !overrides.config?.gameRules?.versionClass) {
    mergedGameRules.versionClass = overrides.config.versionClass;
  } else if (overrides.config?.gameRules?.usePhysicalMentalConditions && !overrides.config?.versionClass && !overrides.config?.gameRules?.versionClass) {
    mergedGameRules.versionClass = 'advanced';
  }
  const versionClass = overrides.config?.versionClass ?? mergedGameRules.versionClass;
  mergedGameRules.versionClass = versionClass;

  const defaultCampaign: CampaignBundle = {
    config: {
      versionClass,
      name: 'test_mock_campaign',
      version: '1.0.0',
      description: 'Mock Campaign for Unit Tests',
      supportedGuiStyles: ['generated', 'authentic'],
      startingMoney: 200,
      winConditions: [],
      timeRules: defaultTimeRules,
      economyRules: defaultEconomyRules,
      mapRules: defaultMapRules,
      statRules: defaultStatRules,
      eventRules: defaultEventRules,
      gameRules: mergedGameRules,
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
        requirements: { experience: 10, dependability: 10, degrees: [], uniform: 'casual' },
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

  const items = overrides.items || defaultCampaign.items;
  const hasCannedFood = overrides.hasCannedFood ??
    overrides.config?.hasCannedFood ??
    items.some(item => item.subcategory === 'canned');

  return {
    ...defaultCampaign,
    ...overrides,
    hasCannedFood,
    config: {
      ...defaultCampaign.config,
      ...(overrides.config || {}),
      versionClass,
      timeRules: { ...defaultTimeRules, ...(overrides.config?.timeRules || {}) },
      economyRules: { ...defaultEconomyRules, ...(overrides.config?.economyRules || {}) },
      mapRules: { ...defaultMapRules, ...(overrides.config?.mapRules || {}) },
      statRules: { ...defaultStatRules, ...(overrides.config?.statRules || {}) },
      gameRules: mergedGameRules,
      eventRules: overrides.config?.eventRules
        ? {
            ...defaultEventRules,
            ...overrides.config.eventRules,
            charity: {
              ...defaultEventRules.charity,
              ...(overrides.config.eventRules.charity || {}),
            },
          }
        : defaultEventRules,
    } as CampaignConfig,
  };
}

/**
 * Ensures any partial mock CampaignBundle constructed in legacy tests has complete validated config fields.
 */
function ensureCompleteTestCampaign(campaign: CampaignBundle, rules?: Partial<GameRules>): CampaignBundle {
  const merged = createMockCampaign({
    ...campaign,
    config: {
      ...(campaign.config || {}),
      gameRules: {
        ...(campaign.config?.gameRules || {}),
        ...(rules || {}),
      },
    },
  });
  // Populate in-place on the passed mock reference so subsequent calls like processTurnStart(state, mockCampaign)
  // in unit tests also see a complete config.
  campaign.config = merged.config;
  if (!campaign.buildings) campaign.buildings = merged.buildings;
  if (!campaign.items) campaign.items = merged.items;
  if (!campaign.jobs) campaign.jobs = merged.jobs;
  if (!campaign.housing) {
    campaign.housing = [
      { ...merged.housing[0], baseRent: 325 },
      { ...merged.housing[1], baseRent: 475, homeNodeId: 'node_security' },
    ];
  }
  if (!campaign.education) campaign.education = merged.education;
  if (!campaign.stocks) campaign.stocks = merged.stocks;
  if (!campaign.weekends) campaign.weekends = merged.weekends;
  if (!campaign.events) campaign.events = merged.events;
  if (!campaign.synergies) campaign.synergies = merged.synergies;
  if (!campaign.messages) campaign.messages = merged.messages;
  if (!campaign.map) campaign.map = merged.map;
  return campaign;
}

/**
 * Creates a valid, complete PlayerState with sensible defaults.
 */
export function createTestPlayer(overrides: Partial<PlayerState> = {}, campaign?: CampaignBundle): PlayerState {
  const camp = campaign ? ensureCompleteTestCampaign(campaign) : createMockCampaign();
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
  const camp = campaign ? ensureCompleteTestCampaign(campaign, rulesOverrides) : createMockCampaign({ config: { gameRules: rulesOverrides } });
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
  const completeCampaign = ensureCompleteTestCampaign(campaign, rules);
  const formattedPlayers = playersConfig.map(p => ({
    name: p.name,
    isAi: p.isAi,
    goals: p.goals || { wealth: 50, happiness: 50, education: 50, career: 50 }
  }));
  return createInitialGameState(completeCampaign, formattedPlayers, startNode, rules, seed);
}
