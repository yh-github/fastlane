import type { PlayerState, GameEvent, StatModification, GameRules, GameState } from './gameState';
import type { CampaignBundle } from './dataLoader';
import type { GameAction, ReducerContext } from './actions/types';
import { gameReducer } from './gameReducer';
import { diffPlayerEffects } from './effectDiff';
import { Random } from '../utils/rng';

export interface ActionPreview {
  feasible: boolean;
  blockedReason?: GameEvent;
  modifications: StatModification[];
  resultingPlayer: PlayerState;
  actionLog?: GameEvent | GameEvent[];
}

export interface PreviewContext {
  campaign?: CampaignBundle;
  rules?: GameRules;
  turn?: number;
  economicIndex?: number;
  locationId?: string;
  state?: GameState;
}

/**
 * Deterministic probe RNG that always returns benign values (e.g. 0.9999)
 * so chance-based mistake penalties do not trigger during dry-run previews.
 */
class ProbeRandom extends Random {
  constructor() {
    super(42);
  }
  override next(): number {
    return 0.9999;
  }
  override nextInt(_min: number, max: number): number {
    return max;
  }
}

/**
 * Dry-runs an action on a deep clone of the player state using the gameReducer.
 * Extracts feasibility, blocked reason (if any), and exact StatModifications.
 */
export function previewAction(
  player: PlayerState,
  action: GameAction,
  context: PreviewContext
): ActionPreview {
  const clonePlayer = structuredClone(player);
  const probeRng = new ProbeRandom();

  const syntheticRules: GameRules = context.rules || context.campaign?.config?.gameRules || ({} as GameRules);

  const syntheticState: GameState = context.state || {
    turn: context.turn ?? 1,
    economicIndex: context.economicIndex ?? 0,
    economicTrend: 0,
    rules: syntheticRules,
    campaignId: (context.campaign?.config as any)?.id || 'default',
    phase: 'playing',
    rngState: 42,
    winnerId: null,
    pawnShopItemsForSale: [],
    players: [clonePlayer]
  };

  const reducerContext: ReducerContext = {
    campaign: context.campaign || ({} as CampaignBundle),
    rules: syntheticRules,
    turn: context.turn ?? 1,
    economicIndex: context.economicIndex ?? 0,
    rng: probeRng,
    state: syntheticState
  };

  const result = gameReducer(clonePlayer, action, reducerContext);

  let blockedReason: GameEvent | undefined;
  let feasible = true;

  if (result.actionLog) {
    const events: GameEvent[] = Array.isArray(result.actionLog) ? result.actionLog : [result.actionLog];
    const rejection = events.find((e: GameEvent) => e.key && e.key.startsWith('action.error.'));
    if (rejection) {
      feasible = false;
      blockedReason = rejection;
    }
  }

  // If reducer returned rejection error, or feasible is false
  if (!feasible) {
    return {
      feasible: false,
      blockedReason,
      modifications: [],
      resultingPlayer: clonePlayer,
      actionLog: result.actionLog
    };
  }

  const modifications = diffPlayerEffects(player, result.updatedPlayer, {
    locationId: context.locationId || (action as any).locationId,
    rules: syntheticRules
  });

  return {
    feasible: true,
    modifications,
    resultingPlayer: result.updatedPlayer,
    actionLog: result.actionLog
  };
}
