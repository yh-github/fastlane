/**
 * gameState.ts — Master game state definition.
 *
 * Central source of truth for all game state types.
 * All state is immutable.
 */

import type { GameRules } from './rules';
import type { DebugQueuedEvent } from './debugEvents';

// ─── Core Game State ────────────────────────────────────────────

export interface GameEvent {
  key: string;
  params?: Record<string, string | number>;
  categories?: string[];
}

export interface GameState {
  /** Current turn (week) number, 1-indexed */
  turn: number;
  /** Global economic index: -30 (depression) to +90 (boom) */
  economicIndex: number;
  /** Global economic trend/momentum: -3 to +3 */
  economicTrend: number;
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
  /** Active debug queue for playtesting forced events */
  debugQueue?: DebugQueuedEvent[];
}

export type { DebugEventType, DebugQueuedEvent } from './debugEvents';
export type { GameRules } from './rules';

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
  /** Cumulative max experience boost from degrees */
  degreeExpBoost: number;
  /** Cumulative max dependability boost from degrees */
  degreeDepBoost: number;
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

  // --- Advanced Variation Fields ---
  lifestyle?: number;
  physicalCondition?: number;
  physicalConditionMax?: number;
  minPhysicalCondition?: number;
  mentalCondition?: number;
  mentalConditionMax?: number;
  mentalConditionMin?: number;
  resilienceBonus?: number;
  social?: number;
  mess?: number;
  homeTimeHistory?: number[];
  homeTimeThisTurn?: number;
  workActionsThisTurn?: number;
  studyActionsThisTurn?: number;
  mistakesByLocation?: Record<string, number>;
  depMaxBonus?: number;
  xpMaxBonus?: number;
  innovationCount?: number;
  innovationsByLocation?: Record<string, number>;
  workMistakesThisTurn?: number;
  skillTech?: number;
  skillMgmt?: number;
}

export interface StatModification {
  stat: 'money' | 'happiness' | 'mental' | 'physical' | 'dependability' | 'mess' | 'social' | 'relaxation' | string;
  diff: number;
  label?: string;
}

export interface WeekendResult {
  event: GameEvent;
  cost: number;
  happinessBonus?: number;
  modifications?: StatModification[];
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

export type GoalAllotment = Record<string, number>;

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
  purchaseSource?: 'socket_city' | 'z_mart' | 'pawnshop';
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
  /** Whether the player has read the newspaper this turn */
  readNewspaper?: boolean;
  readNewspaperThisTurn?: boolean;
  /** Whether the player has viewed their weekend summary this turn */
  hasSeenEvents: boolean;
  hasSeenWeekend: boolean;
  /** Loan default warning flag */
  loanDefaultWarning?: boolean;
  /** Loan payable warning flag */
  loanPayableWarning?: boolean;
  /** Jobs the player was rejected from this turn */
  jobsRejectedThisTurn?: string[];
  /** Whether the book set was completed this turn (for delayBookSetCredit rule) */
  bookSetCompletedThisTurn?: boolean;
  /** Whether lottery tickets happiness bonus (+2) was already granted this turn */
  lotteryHappinessGranted?: boolean;
  /** Whether ticket happiness bonus (+2) was already granted this turn */
  ticketHappinessGranted?: boolean;
  /** Total mental condition drops this turn */
  mentalDropsThisTurn?: number;
  /** Locations the player was fired from this turn (causes probation penalty) */
  firedLocationsThisTurn?: string[];
  /** Work mistakes made this turn */
  workMistakesThisTurn?: number;
}

export interface PlayerConfig {
  name: string;
  isAi: boolean;
  goals: GoalAllotment;
}

// ─── Re-exports ─────────────────────────────────────────────────

export * from './stateFactories';
export * from './synergyEngine';
