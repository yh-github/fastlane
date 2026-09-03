import type { CampaignBundle } from './dataLoader';
import { type GameRules, DEFAULT_GAME_RULES } from './rules';
import { calcMaxMental } from './statMath';
import type {
  PlayerState,
  GameState,
  TurnFlags,
  InventoryState,
  GoalAllotment,
  PlayerConfig
} from './gameState';

export const STARTING_EXPERIENCE = 10;
export const STARTING_DEPENDABILITY = 20;
export const STARTING_HAPPINESS = 50;
export const STARTING_RELAXATION = 16;
export const STARTING_CASUAL_CLOTHES_WEEKS = 6;

export const MIN_HAPPINESS = 10;
export const MAX_HAPPINESS = 100;
export const DEPENDABILITY_WEEKLY_DECAY = 3;

export function createDefaultTurnFlags(): TurnFlags {
  return {
    hasEaten: false,
    hasWorked: false,
    drinkHappinessGranted: false,
    fastFoodHappinessGranted: false,
    freshFoodHappinessGranted: false,
    caffeineDebt: 0,
    askedForExtension: false,
    rentPaidThisTurn: false,
    freeNewspaper: false,
    hasSeenEvents: false,
    hasSeenWeekend: false,
    relaxedThisTurn: false,
    rentExtensionRefusedThisTurn: false,
    jobsRejectedThisTurn: [],
    bookSetCompletedThisTurn: false,
    lotteryHappinessGranted: false,
    ticketHappinessGranted: false,
    mentalDropsThisTurn: 0,
    firedLocationsThisTurn: [],
    workMistakesThisTurn: 0,
  };
}

export function createDefaultInventory(): InventoryState {
  return {
    selectedClothes: 'casual',
    casualClothesWeeks: STARTING_CASUAL_CLOTHES_WEEKS,
    dressClothesWeeks: 0,
    businessClothesWeeks: 0,
    freshFoodUnits: 0,
    fastFoodItems: [],
    appliances: [],
    books: [],
    tickets: { baseball: 0, theatre: 0, concert: 0 },
    lotteryTickets: 0,
    stocks: { tBills: 0, holdings: {} },
    pawnedItems: [],
  };
}

export function createDefaultGoalAllotment(): GoalAllotment {
  return { wealth: 50, happiness: 50, education: 50, career: 50 };
}

export function createPlayerState(
  id: string,
  name: string,
  isAi: boolean,
  goals: GoalAllotment,
  startNode: string,
  config: any
): PlayerState {
  return {
    id,
    name,
    isAi,
    hoursRemaining: config.timeRules?.hoursPerTurn || 60,
    money: config.startingMoney || 200,
    bankSavings: 0,
    rentDebt: 0,
    loanDebt: 0,
    timesDefaulted: 0,
    loanPaymentDeadline: 0,
    happiness: config.statRules?.startingHappiness ?? STARTING_HAPPINESS,
    experience: STARTING_EXPERIENCE,
    dependability: STARTING_DEPENDABILITY,
    degreeExpBoost: 0,
    degreeDepBoost: 0,
    relaxation: config.statRules?.startingRelaxation ?? STARTING_RELAXATION,
    currentJobId: null,
    currentWage: 0,
    raisesAtCurrentJob: 0,
    currentHousingId: 'low_cost',
    currentRentPrice: 325, // Default base for low_cost
    rentPaidUntilWeek: 4,
    rentExtensionActive: false,
    rentExtensionsReceived: 0,
    rentExtensionsDeniedPermanently: false,
    degrees: [],
    enrolledClasses: {},
    inventory: createDefaultInventory(),
    nakedTurns: 0,
    position: startNode,
    goalAllotment: goals,
    turnFlags: createDefaultTurnFlags(),
    turnEvents: [],
    newspaperHeadline: null,
    activeEffects: {},
    ...(config.gameRules?.usePhysicalMentalConditions ? (() => {
      const startMess = config.gameRules?.trackMess ? 3 : 0;
      const startSocial = config.statRules?.startingSocial ?? 9;
      const initMaxMental = calcMaxMental(startMess, startSocial, 0, undefined, config.statRules);
      const initMaxPhys = config.statRules?.initialPhysicalMax ?? 50;
      return {
        physicalConditionMax: initMaxPhys,
        minPhysicalCondition: config.statRules?.initialMinPhysical ?? config.statRules?.minPhysicalCondition ?? 3,
        physicalCondition: config.statRules?.startingPhysicalCondition ?? initMaxPhys,
        mentalConditionMax: initMaxMental,
        mentalCondition: config.statRules?.startingMentalCondition ?? initMaxMental,
        social: startSocial,
        resilienceBonus: 0,
        lifestyle: 0,
        mistakesByLocation: {},
        depMaxBonus: 0,
        xpMaxBonus: 0,
        innovationCount: 0,
        skillTech: 0,
        skillMgmt: 0
      };
    })() : {}),
    ...(config.gameRules?.trackMess ? { mess: 3 } : {}),
  };
}

export function createInitialGameState(
  campaign: CampaignBundle,
  playersConfig: PlayerConfig[],
  startNode: string,
  rules: Partial<GameRules> | undefined,
  seed: number
): GameState {
  const defaultRules = DEFAULT_GAME_RULES;

  const finalRules = {
    ...defaultRules,
    ...(campaign.config.gameRules || {}),
    ...rules
  };

  return {
    turn: 0,
    economicIndex: 0,
    economicTrend: 0,
    rngState: seed,
    pawnShopItemsForSale: [],
    players: playersConfig.map((cfg, i) =>
      createPlayerState(`player_${i + 1}`, cfg.name, cfg.isAi, cfg.goals, startNode, campaign.config)
    ),
    phase: 'setup',
    winnerId: null,
    campaignId: campaign.config.name,
    rules: finalRules,
  };
}
