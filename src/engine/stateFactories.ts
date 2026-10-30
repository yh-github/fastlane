import type { CampaignBundle, CampaignConfig } from './dataLoader';
import { type GameRules, isAdvancedStatRules, DEFAULT_ADVANCED_STAT_RULES } from './rules';
import { calcMaxMental } from './statMath';
import { createDefaultEconomySimulationState } from './economyEngine';
import type {
  PlayerState,
  GameState,
  TurnFlags,
  InventoryState,
  GoalAllotment,
  PlayerConfig
} from './gameState';

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
    loanPaidThisTurn: false,
    freeNewspaper: false,
    hasSeenEvents: false,
    hasSeenWeekend: false,
    relaxedThisTurn: false,
    rentExtensionRefusedThisTurn: false,
    jobsRejectedThisTurn: [],
    bookSetCompletedThisTurn: false,
    lotteryHappinessGranted: false,
    ticketHappinessGranted: false,
    ticketBonusCount: 0,
    mentalDropsThisTurn: 0,
    firedLocationsThisTurn: [],
    workMistakesThisTurn: 0,
    curioNoveltyGranted: false,
    fastFoodMealsThisTurn: 0,
  };
}

export function createDefaultInventory(config?: CampaignConfig): InventoryState {
  return {
    selectedClothes: 'casual',
    casualClothesWeeks: config?.statRules?.startingCasualClothesWeeks ?? 6,
    dressClothesWeeks: 0,
    businessClothesWeeks: 0,
    freshFoodUnits: 0,
    cannedFoodUnits: 0,
    fastFoodItems: [],
    appliances: [],
    books: [],
    tickets: { baseball: 0, theatre: 0, concert: 0 },
    lotteryTickets: 0,
    stocks: { tBills: 0, holdings: {} },
    pawnedItems: [],
    knickKnacks: 0,
    uninspectedKnickKnacks: 0,
    spareParts: 0,
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
  config: CampaignConfig,
  characterIndex: number = 0
): PlayerState {
  const rules = config.gameRules;
  return {
    id,
    name,
    isAi,
    characterIndex,
    hoursRemaining: config.timeRules?.hoursPerTurn ?? 60,
    money: config.startingMoney ?? 200,
    bankSavings: 0,
    rentDebt: 0,
    loanDebt: 0,
    timesDefaulted: 0,
    loanPaymentDeadline: 0,
    happiness: config.statRules?.startingHappiness ?? 50,
    experience: config.statRules?.startingExperience ?? 10,
    dependability: config.statRules?.startingDependability ?? 20,
    degreeExpBoost: 0,
    degreeDepBoost: 0,
    relaxation: config.statRules?.startingRelaxation ?? 16,
    currentJobId: null,
    currentWage: 0,
    raisesAtCurrentJob: 0,
    hasEarnedIncome: false,
    currentHousingId: 'low_cost',
    currentRentPrice: 325,
    rentPaidUntilWeek: 4,
    rentPaymentsAtCurrentRate: 0,
    rentExtensionActive: false,
    rentExtensionsReceived: 0,
    rentExtensionsDeniedPermanently: false,
    degrees: [],
    enrolledClasses: {},
    inventory: createDefaultInventory(config),
    nakedTurns: 0,
    position: startNode,
    goalAllotment: (() => {
      const finalGoals: GoalAllotment = { ...goals };
      if (Array.isArray(config.winConditions)) {
        for (const cond of config.winConditions) {
          if (finalGoals[cond.stat] === undefined) {
            finalGoals[cond.stat] = 50;
          }
        }
      }
      return finalGoals;
    })(),
    turnFlags: {
      ...createDefaultTurnFlags(),
      ...(rules?.clothingDecaysAll === false || rules?.clothesSwitching !== 'autoBest'
        ? { clothesWornThisTurn: [] }
        : {})
    },
    turnEvents: [],
    newspaperHeadline: null,
    activeEffects: {},
    ...(rules?.usePhysicalMentalConditions ? (() => {
      const sr = (config.statRules && isAdvancedStatRules(config.statRules))
        ? config.statRules
        : DEFAULT_ADVANCED_STAT_RULES;
      const startMess = rules.trackMess ? 3 : 0;
      const startSocial = sr.startingSocial;
      const initMaxMental = calcMaxMental(startMess, rules.trackSocial ? startSocial : 0, 0, undefined, sr);
      const initMaxPhys = sr.initialPhysicalMax;
      return {
        physicalConditionMax: initMaxPhys,
        minPhysicalCondition: sr.minPhysicalCondition,
        physicalCondition: sr.startingPhysicalCondition,
        mentalConditionMax: initMaxMental,
        mentalCondition: sr.startingMentalCondition,
        ...(rules.trackSocial ? { social: startSocial } : {}),
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
    ...(rules?.trackMess ? { mess: 3 } : {}),
  };
}

export function createInitialGameState(
  campaign: CampaignBundle,
  playersConfig: PlayerConfig[],
  startNode: string,
  rules: Partial<GameRules> | undefined,
  seed: number
): GameState {
  const finalRules: GameRules = {
    ...campaign.config.gameRules,
    ...rules
  };

  const configWithRules: CampaignConfig = {
    ...campaign.config,
    gameRules: finalRules
  };

  return {
    turn: 0,
    economicReading: 0,
    economicIndex: 0,
    economicTrend: 0,
    economySimulation: createDefaultEconomySimulationState(campaign.config.economyRules),
    gameSeed: seed,
    rngState: seed,
    pawnShopItemsForSale: [],
    players: playersConfig.map((cfg, i) =>
      createPlayerState(`player_${i + 1}`, cfg.name, cfg.isAi, cfg.goals, startNode, configWithRules, cfg.characterIndex ?? (i % 5))
    ),
    phase: 'setup',
    winnerId: null,
    campaignId: campaign.config.name,
    rules: finalRules,
  };
}
