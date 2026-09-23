import type { PlayerState } from '../gameState';
import type { ReducerContext, ActionHandlerResult } from './types';
import type { ReplayContext } from '../replayTypes';
import { requireConfig } from '../rules';
import { spendHours } from '../timeManager';
import { buildAdjacencyMap, findShortestPath, buildEdgeWaypointMap, calculateTravelHours } from '../../graphics/pathfinding';
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
    const destNode = context.campaign.map?.nodes?.find(n => n.id === nodeId);
    if (destNode && destNode.buildingId && context.rules?.reenterCurrentLocationCost) {
      const buildingEntryCost = requireConfig(context.campaign.config.timeRules?.buildingEntryCost, 'timeRules.buildingEntryCost');
      if (nextPlayer.hoursRemaining > 0) {
        nextPlayer = spendHours(nextPlayer, buildingEntryCost);
      } else {
        actionLog = { key: 'action.error.notEnoughTime' };
      }
    }
    return { nextPlayer, actionLog };
  }

  const adjacencyMap = context.campaign.map?.nodes ? buildAdjacencyMap(context.campaign.map.nodes) : new Map<string, string[]>();
  const edgeWeights = context.campaign.map?.edges ? buildEdgeWaypointMap(context.campaign.map.edges) : undefined;
  const pathResult = context.campaign.map?.nodes
    ? findShortestPath(adjacencyMap, nextPlayer.position, nodeId, edgeWeights)
    : { found: true, steps: 1, totalWaypoints: 1, path: [] };

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

    const walkHours = calculateTravelHours(pathResult, context.campaign.config.mapRules);
    let requiredHours = walkHours;
    
    const destNode = context.campaign.map?.nodes?.find(n => n.id === nodeId);
    if (destNode && destNode.buildingId) {
      const buildingEntryCost = requireConfig(context.campaign.config.timeRules?.buildingEntryCost, 'timeRules.buildingEntryCost');
      requiredHours += buildingEntryCost;
    }

    if (nextPlayer.hoursRemaining > 0) {
      nextPlayer.position = nodeId;
      nextPlayer = spendHours(nextPlayer, requiredHours);
    } else {
      actionLog = { key: 'action.error.notEnoughTime' };
    }
  }

  return { nextPlayer, actionLog };
}
