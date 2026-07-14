/**
 * gameState.ts — Master game state definition.
 *
 * Central source of truth for all game state types.
 * The game uses a 60-hour turn model where each activity
 * costs a variable number of hours. Players manage money,
 * stats, inventory, housing, education, and employment
 * across weekly turns.
 *
 * Design: All state is immutable — functions return new
 * state objects rather than mutating in place.
 */

import { type CampaignBundle } from './dataLoader';

// ─── Core Game State ────────────────────────────────────────────

export interface GameEvent {
  key: string;
  params?: Record<string, string | number>;
}

export interface GameState {
  /** Current turn (week) number, 1-indexed */
  turn: number;
  /** Global economic index: -30 (depression) to +90 (boom) */
  economicIndex: number;
  /** Items that have expired and are for sale globally */
  pawnShopItemsForSale: PawnedItem[];
  /** All player states */
  players: PlayerState[];
  /** Current game phase */
  phase: GamePhase;
  /** Campaign configuration reference */
  campaignId: string;
  /** Seed/State for the deterministic random number generator */
  rngState: number;
  /** Game rules configuration */
  rules: GameRules;
  /** Winner ID */
  winnerId: string | null;
}

export interface GameRules {
  strictEviction: boolean;
  fluctuatingRent: boolean;
  clothingDecaysAll: boolean;
  autoEquipBestClothes: boolean;
  classicStockMarket: boolean;
  allowPartialHours: boolean;
  enableRelaxationDoctor: boolean;
  requireJobForLoan: boolean;
  helpfulUI: boolean;
  enableAnimations: boolean;
  allowOverAchievingGoals: boolean;
}

export type GamePhase =
  | 'setup'         // Pre-game: win condition allocation
  | 'turn-start'    // Processing turn-start events
  | 'playing'       // Player is taking actions
  | 'turn-end'      // End-of-turn processing
  | 'weekend'       // Displaying the end-of-turn summary
  | 'game-over';    // A player has won


// ─── Player State ───────────────────────────────────────────────

export interface PlayerState {
  id: string;
  name: string;
  isAi?: boolean;

  // ── Time ──
  /** Hours remaining this turn (starts at 60) */
  hoursRemaining: number;

  // ── Finances ──
  /** Cash on hand (vulnerable to robbery) */
  money: number;
  /** Cash in bank account (safe from Wild Willy, vulnerable to Major Market Crash) */
  bankSavings: number;
  /** Outstanding rent debt (garnished from wages) */
  rentDebt: number;
  /** Current bank loan debt */
  loanDebt: number;
  /** Number of times the player has defaulted on a loan */
  timesDefaulted: number;
  /** The absolute week number by which a loan payment must be made */
  loanPaymentDeadline: number;

  // ── Core Stats ──
  /** Happiness: 10–100. Drives the Happiness goal. */
  happiness: number;
  /** Experience: starts at 10. Required for job applications. Never decreases. */
  experience: number;
  /** Dependability: starts at 20. Decays −3/turn. Required for jobs. */
  dependability: number;
  /** Max experience cap (limited by current job + degrees) */
  maxExperience: number;
  /** Max dependability cap (limited by current job + degrees) */
  maxDependability: number;
  /** Relaxation: hidden stat. Affects robbery chance at home. */
  relaxation: number;

  // ── Employment ──
  /** Current job ID (null if unemployed) */
  currentJobId: string | null;
  /** Current locked-in hourly wage (set at hire, persists through economy changes) */
  currentWage: number;
  /** Number of raises received at current job (resets on job change) */
  raisesAtCurrentJob: number;

  // ── Housing ──
  /** Current housing tier ID */
  currentHousingId: string;
  /** Rent paid through this week number (4-week cycles) */
  rentPaidUntilWeek: number;
  /** The locked-in base rent price (used if fluctuatingRent is false) */
  currentRentPrice: number;
  /** Whether the player has been granted a rent extension for the current week */
  rentExtensionActive: boolean;
  /** Number of extensions received (affects approval chance) */
  rentExtensionsReceived: number;
  /** Whether rent extensions are permanently denied (due to previous debt) */
  rentExtensionsDeniedPermanently: boolean;

  // ── Education ──
  /** IDs of completed degrees */
  degrees: string[];
  /** Classes currently being studied (mapped to lessons completed) */
  enrolledClasses: Record<string, number>;

  // ── Inventory ──
  inventory: InventoryState;
  /** Number of consecutive turns the player has had no clothes to wear */
  nakedTurns: number;

  // ── Position ──
  /** Current map node ID */
  position: string;

  // ── Win Conditions ──
  /** Player's allotted goal targets (classic: distribute 100 points) */
  goalAllotment: GoalAllotment;
  /** Whether the player has won the game */
  hasWon?: boolean;

  // ── Per-Turn Flags ──
  /** Flags that reset each turn for tracking one-time-per-turn effects */
  turnFlags: TurnFlags;
  /** Notifications or events that occurred over the weekend */
  turnEvents: GameEvent[];
  /** The newspaper headline for this turn */
  newspaperHeadline: GameEvent | null;
  /** The result of the weekend activity processing */
  weekendResult?: WeekendResult;
  
  // ── Active Effects ──
  /** Calculated effects from synergies and items */
  activeEffects: Record<string, number>;
}

export interface WeekendResult {
  event: GameEvent;
  cost: number;
  happinessBonus?: number;
}

// ─── Inventory ──────────────────────────────────────────────────

export interface InventoryState {
  /** The type of clothes the player has currently selected to wear */
  selectedClothes?: 'casual' | 'dress' | 'business' | 'none';
  /** Weeks of casual clothing remaining */
  casualClothesWeeks: number;
  /** Weeks of dress clothing remaining */
  dressClothesWeeks: number;
  /** Weeks of business clothing remaining */
  businessClothesWeeks: number;
  /** Units of fresh food in storage */
  freshFoodUnits: number;
  /** Fast food items purchased this turn (consumed at turn start) */
  fastFoodItems: FastFoodEntry[];
  /** Owned appliance IDs */
  appliances: OwnedAppliance[];
  /** Owned book IDs */
  books: string[];
  /** Event tickets in inventory */
  tickets: TicketInventory;
  /** Number of lottery tickets */
  lotteryTickets: number;
  /** Stock portfolio */
  stocks: StockPortfolio;
  /** Items currently at the pawn shop */
  pawnedItems: PawnedItem[];
}

export interface FastFoodEntry {
  itemId: string;
  happinessBonus: number;
}

export interface OwnedAppliance {
  id: string;
  /** Price originally paid (affects repair costs) */
  purchasePrice: number;
  /** Where it was bought — affects breakage chance */
  purchaseSource: 'socket_city' | 'z_mart' | 'pawnshop';
}

export interface TicketInventory {
  baseball: number;
  theatre: number;
  concert: number;
}

export interface StockPortfolio {
  /** T-Bills: fixed-price, safe from crashes */
  tBills: number;
  /** Shares of each fluctuating stock (keyed by stock ID) */
  holdings: Record<string, number>;
}

export interface PawnedItem {
  itemId: string;
  originalPrice: number;
  redeemCost: number;
  weekPawned: number;
  ownerId: string;
}

// ─── Goals ──────────────────────────────────────────────────────

export interface GoalAllotment {
  /** Points allocated to Wealth goal (out of 100 total) */
  wealth: number;
  /** Points allocated to Happiness goal */
  happiness: number;
  /** Points allocated to Education goal */
  education: number;
  /** Points allocated to Career goal */
  career: number;
}

// ─── Turn Flags ─────────────────────────────────────────────────

export interface TurnFlags {
  relaxedThisTurn?: boolean;
  rentExtensionRefusedThisTurn?: boolean;
  /** Whether the player has eaten this turn (prevents starvation) */
  hasEaten: boolean;
  /** Whether the player has worked this turn (for dep/exp gain) */
  hasWorked: boolean;
  /** Whether cola/shake happiness was already granted this turn */
  drinkHappinessGranted: boolean;
  /** Whether fast food happiness bonus was already granted this turn */
  fastFoodHappinessGranted: boolean;
  /** Whether fresh food purchase happiness was granted this turn */
  freshFoodHappinessGranted: boolean;
  /** Caffeine hours borrowed from next turn */
  caffeineDebt: number;
  /** Whether the player already asked for an extension this turn */
  askedForExtension: boolean;
  /** Whether the player paid rent or moved this turn (keeps the Rent Office open in the UI) */
  rentPaidThisTurn: boolean;
  /** Whether the player receives a free newspaper this turn due to an event */
  freeNewspaper: boolean;
  /** Whether the player has viewed their weekend summary this turn */
  hasSeenWeekend: boolean;
  /** Loan default warning flag */
  loanDefaultWarning?: boolean;
  /** Loan payable warning flag */
  loanPayableWarning?: boolean;
  /** Jobs the player was rejected from this turn */
  jobsRejectedThisTurn?: string[];
}

// ─── Stat Constants ─────────────────────────────────────────────

export const STARTING_EXPERIENCE = 10;
export const STARTING_DEPENDABILITY = 20;
export const STARTING_HAPPINESS = 50;
export const STARTING_RELAXATION = 10;
export const STARTING_CASUAL_CLOTHES_WEEKS = 6;

export const MIN_HAPPINESS = 10;
export const MAX_HAPPINESS = 100;
export const DEPENDABILITY_WEEKLY_DECAY = 3;

// ─── Factory Functions ──────────────────────────────────────────

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
    hasSeenWeekend: false,
    relaxedThisTurn: false,
    rentExtensionRefusedThisTurn: false,
    jobsRejectedThisTurn: [],
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

export interface PlayerConfig {
  name: string;
  isAi: boolean;
  goals: GoalAllotment;
}

export function createPlayerState(id: string, name: string, isAi: boolean, goals: GoalAllotment, startNode: string, config: any): PlayerState {
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
    maxExperience: STARTING_EXPERIENCE + 10,
    maxDependability: STARTING_DEPENDABILITY + 20,
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
  };
}

export function createInitialGameState(
  campaign: CampaignBundle,
  playersConfig: PlayerConfig[],
  startNode: string,
  rules?: Partial<GameRules>,
  seed: number = 12345
): GameState {
  const defaultRules: GameRules = {
    strictEviction: false,
    fluctuatingRent: false,
    clothingDecaysAll: true,
    autoEquipBestClothes: true,
    classicStockMarket: true,
    allowPartialHours: true,
    enableRelaxationDoctor: true,
    requireJobForLoan: true,
    helpfulUI: false,
    enableAnimations: false,
    allowOverAchievingGoals: false
  };

  const finalRules = {
    ...defaultRules,
    ...(campaign.config.gameRules || {}),
    ...rules
  };

  return {
    turn: 0,
    economicIndex: 0,
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

export function recalculatePlayerEffects(player: PlayerState, campaign: CampaignBundle): PlayerState {
  const activeEffects: Record<string, number> = {};
  const activeTags = new Set<string>();

  // Gather tags from inventory
  // 1. Appliances
  for (const app of player.inventory.appliances) {
    activeTags.add(`item:${app.id}`);
    const itemDef = campaign.items.find(i => i.id === app.id);
    if (itemDef?.tags) {
      itemDef.tags.forEach(t => activeTags.add(`tag:${t}`));
    }
  }

  // 2. Books
  for (const bookId of player.inventory.books) {
    activeTags.add(`item:${bookId}`);
    const itemDef = campaign.items.find(i => i.id === bookId);
    if (itemDef?.tags) {
      itemDef.tags.forEach(t => activeTags.add(`tag:${t}`));
    }
  }

  // Evaluate Synergies
  for (const synergy of campaign.synergies || []) {
    const requirementsMet = synergy.requires.every(req => activeTags.has(req));
    if (requirementsMet) {
      for (const effect of synergy.effects) {
        const currentVal = activeEffects[effect.type];
        
        switch (effect.operation) {
          case 'MAX':
            activeEffects[effect.type] = currentVal === undefined ? effect.value : Math.max(currentVal, effect.value);
            break;
          case 'ADD':
            activeEffects[effect.type] = (currentVal || 0) + effect.value;
            break;
          case 'SET':
            activeEffects[effect.type] = effect.value;
            break;
        }
      }
    }
  }

  return {
    ...player,
    activeEffects
  };
}
