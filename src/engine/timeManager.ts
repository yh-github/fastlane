/**
 * timeManager.ts — Turn progression and phase management.
 *
 * Manages the game clock: weeks, weekdays vs. weekends,
 * and the action-point economy within each phase.
 *
 * The game operates on a Week → Weekend cycle:
 *   - Weekday phase: work, education, shopping
 *   - Weekend phase: leisure, random events, social
 */

// ─── Types ──────────────────────────────────────────────────────

export type Phase = 'weekday' | 'weekend';

export interface GameTime {
  /** Current week number (1-indexed, increments each full cycle) */
  week: number;
  /** Current phase within the week */
  phase: Phase;
  /** Action points remaining in the current phase */
  actionsRemaining: number;
  /** Total weeks elapsed since game start */
  totalWeeksElapsed: number;
}

export interface TimeConfig {
  /** Number of action points per weekday phase */
  weekdayActions: number;
  /** Number of action points per weekend phase */
  weekendActions: number;
  /** Maximum weeks before game ends (0 = unlimited) */
  maxWeeks: number;
}

// ─── Constants ──────────────────────────────────────────────────

export const DEFAULT_TIME_CONFIG: TimeConfig = {
  weekdayActions: 4,
  weekendActions: 3,
  maxWeeks: 0,
};

// ─── Time Management Functions ──────────────────────────────────

/**
 * Create the initial game time state.
 */
export function createInitialTime(config?: Partial<TimeConfig>): GameTime {
  const merged = { ...DEFAULT_TIME_CONFIG, ...config };
  return {
    week: 1,
    phase: 'weekday',
    actionsRemaining: merged.weekdayActions,
    totalWeeksElapsed: 0,
  };
}

/**
 * Consume one action point. Returns null if no actions remain.
 */
export function consumeAction(time: GameTime): GameTime | null {
  if (time.actionsRemaining <= 0) return null;
  return {
    ...time,
    actionsRemaining: time.actionsRemaining - 1,
  };
}

/**
 * Advance to the next phase. Weekday → Weekend → next Week's Weekday.
 */
export function advancePhase(
  time: GameTime,
  config: TimeConfig = DEFAULT_TIME_CONFIG
): GameTime {
  if (time.phase === 'weekday') {
    return {
      ...time,
      phase: 'weekend',
      actionsRemaining: config.weekendActions,
    };
  }
  // Weekend → next week's weekday
  return {
    week: time.week + 1,
    phase: 'weekday',
    actionsRemaining: config.weekdayActions,
    totalWeeksElapsed: time.totalWeeksElapsed + 1,
  };
}

/**
 * Check if the game has reached its time limit.
 */
export function isGameOver(time: GameTime, config: TimeConfig): boolean {
  if (config.maxWeeks === 0) return false;
  return time.totalWeeksElapsed >= config.maxWeeks;
}

/**
 * Get a human-readable label for the current time state.
 */
export function getTimeLabel(time: GameTime): string {
  const phaseLabel = time.phase === 'weekday' ? 'Weekday' : 'Weekend';
  return `Week ${time.week} — ${phaseLabel} (${time.actionsRemaining} actions left)`;
}
