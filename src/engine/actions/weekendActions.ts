import type { PlayerState } from '../gameState';
import type { ReducerContext, ActionHandlerResult } from './types';
import type { ReplayContext } from '../replayTypes';
import { resolveWeekendChoice } from '../weekendEngine';

export function handleResolveWeekendAction(
  player: PlayerState,
  action: { type: 'resolve_weekend'; cardId: string },
  context: ReducerContext,
  replayContext?: ReplayContext
): ActionHandlerResult {
  const resolvedPlayer = resolveWeekendChoice(
    player,
    action.cardId,
    context.rng,
    context.rules,
    context.campaign.config.statRules,
    context.campaign,
    context.turn,
    replayContext
  );

  return {
    nextPlayer: resolvedPlayer,
    actionLog: resolvedPlayer.weekendResult?.event
  };
}
