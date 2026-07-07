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

// ─── Core Game State ────────────────────────────────────────────

export interface GameState {
  /** Current turn (week) number, 1-indexed */
  turn: number;
  /** Global economic index: -30 (depression) to +90 (boom) */
  economicIndex: number;
  /** All player states */
  players: PlayerState[];
  /** Current game phase */
  phase: GamePhase;
  /** Campaign configuration reference */
  campaignId: string;
  /** Game variant flags */
  variant: GameVariant;
}

export type GamePhase =
  | 'setup'         // Pre-game: win condition allocation
  | 'turn-start'    // Processing turn-start events
  | 'playing'       // Player is taking actions
  | 'turn-end'      // End-of-turn processing
  | 'game-over';    // A player has won

export type GameVariant = 'floppy' | 'cdrom';

// ─── Player State ───────────────────────────────────────────────

export interface PlayerState {
  id: string;
  name: string;

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
  /** Whether the player is in a rent extension period */
  rentExtensionActive: boolean;

  // ── Education ──
  /** IDs of completed degrees */
  degrees: string[];
  /** Current degree being studied (null if not enrolled) */
  currentDegreeId: string | null;
  /** Lessons completed toward current degree */
  lessonsCompleted: number;

  // ── Inventory ──
  inventory: InventoryState;

  // ── Position ──
  /** Current map node ID */
  position: string;

  // ── Win Conditions ──
  /** Player's allotted goal targets (classic: distribute 100 points) */
  goalAllotment: GoalAllotment;

  // ── Per-Turn Flags ──
  /** Flags that reset each turn for tracking one-time-per-turn effects */
  turnFlags: TurnFlags;
}

// ─── Inventory ──────────────────────────────────────────────────

export interface InventoryState {
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
  purchaseSource: 'socket_city' | 'zmart' | 'pawnshop';
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
}

// ─── Hour Cost Constants ────────────────────────────────────────

export const HOURS_PER_TURN = 60;
export const COST_BUILDING_ENTRY = 2;
export const COST_WORK_SESSION = 6;
export const COST_STUDY_SESSION = 6;
export const COST_JOB_APPLICATION = 4;
export const COST_RELAX = 1;
export const COST_NEWSPAPER = 1;
export const COST_STARVATION_PENALTY = 20;
export const COST_DOCTOR_VISIT = 10;

// ─── Stat Constants ─────────────────────────────────────────────

export const STARTING_EXPERIENCE = 10;
export const STARTING_DEPENDABILITY = 20;
export const STARTING_HAPPINESS = 50;
export const STARTING_RELAXATION = 50;
export const STARTING_CASUAL_CLOTHES_WEEKS = 6;
export const STARTING_MONEY = 200;

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
  };
}

export function createDefaultInventory(): InventoryState {
  return {
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
  return { wealth: 25, happiness: 25, education: 25, career: 25 };
}

export function createPlayerState(id: string, name: string, startNode: string): PlayerState {
  return {
    id,
    name,
    hoursRemaining: HOURS_PER_TURN,
    money: STARTING_MONEY,
    bankSavings: 0,
    rentDebt: 0,
    happiness: STARTING_HAPPINESS,
    experience: STARTING_EXPERIENCE,
    dependability: STARTING_DEPENDABILITY,
    maxExperience: STARTING_EXPERIENCE + 10,
    maxDependability: STARTING_DEPENDABILITY + 20,
    relaxation: STARTING_RELAXATION,
    currentJobId: null,
    currentWage: 0,
    raisesAtCurrentJob: 0,
    currentHousingId: 'low_cost',
    rentPaidUntilWeek: 4,
    rentExtensionActive: false,
    degrees: [],
    currentDegreeId: null,
    lessonsCompleted: 0,
    inventory: createDefaultInventory(),
    position: startNode,
    goalAllotment: createDefaultGoalAllotment(),
    turnFlags: createDefaultTurnFlags(),
  };
}

export function createInitialGameState(
  campaignId: string,
  playerNames: string[],
  startNode: string,
  variant: GameVariant = 'cdrom'
): GameState {
  return {
    turn: 1,
    economicIndex: 0,
    players: playerNames.map((name, i) =>
      createPlayerState(`player_${i + 1}`, name, startNode)
    ),
    phase: 'setup',
    campaignId,
    variant,
  };
}
