import type { PlayerState } from '../gameState';
import type { ReducerContext, ActionHandlerResult } from './types';
import type { ReplayContext } from '../replayTypes';
import { requireConfig } from '../rules';
import { spendHours } from '../timeManager';
import { buildAdjacencyMap, findShortestPath } from '../../graphics/pathfinding';
import { processStreetRobbery } from '../eventEngine';

export function handleMoveAction(
  player: PlayerState,
  action: { type: 'move'; nodeId: string },
  context: ReducerContext,
  replayContext: ReplayContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  const nodeId = action.nodeId;
  if (nextPlayer.position === nodeId) {
    return { nextPlayer };
  }

  const adjacencyMap = context.campaign.map?.nodes ? buildAdjacencyMap(context.campaign.map.nodes) : new Map<string, string[]>();
  const pathResult = context.campaign.map?.nodes ? findShortestPath(adjacencyMap, nextPlayer.position, nodeId) : { found: true, steps: 1, path: [] };

  if (pathResult.found) {
    const currentBuilding = context.campaign.map?.nodes?.find(n => n.id === nextPlayer.position)?.buildingId;
    if (currentBuilding === 'bank' || currentBuilding === 'blacks_market') {
      const preRobberyMoney = nextPlayer.money;
      const isForced = !!context.state.debugQueue?.some(e => e.type === 'street_robbery' && (e.playerId === nextPlayer.id || !e.playerId));
      nextPlayer = processStreetRobbery(nextPlayer, currentBuilding, context.turn, context.rng, context.campaign, replayContext, isForced);
      if (isForced && context.state.debugQueue) {
        context.state.debugQueue = context.state.debugQueue.filter(e => !(e.type === 'street_robbery' && (e.playerId === nextPlayer.id || !e.playerId)));
      }
      if (nextPlayer.money < preRobberyMoney) {
        actionLog = { key: 'log.robbery' };
      }
    }

    const movementCost = (context.campaign.config.mapRules as any)?.movementCostPerNode ?? 1;
    let requiredHours = pathResult.steps * movementCost;
    
    const destNode = context.campaign.map?.nodes?.find(n => n.id === nodeId);
    if (destNode && destNode.buildingId) {
      const buildingEntryCost = requireConfig(context.campaign.config.timeRules?.buildingEntryCost, 'timeRules.buildingEntryCost');
      requiredHours += buildingEntryCost;
    }

    if (nextPlayer.hoursRemaining >= requiredHours || context.rules.allowPartialHours) {
      nextPlayer.position = nodeId;
      nextPlayer = spendHours(nextPlayer, requiredHours);
    } else {
      actionLog = { key: 'action.error.notEnoughTime' };
    }
  }

  return { nextPlayer, actionLog };
}
