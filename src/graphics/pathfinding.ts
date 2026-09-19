/**
 * pathfinding.ts — Click-and-walk movement logic.
 *
 * Implements graph-based pathfinding on the campaign map.
 * The map is modeled as an undirected graph of MapNodes with
 * connections. Uses BFS for shortest-path since maps are small
 * enough that A* optimization is unnecessary.
 */

import type { MapNode, MapEdge } from '../engine/dataLoader';
import type { MapRules } from '../engine/rules';

// ─── Pathfinding Types ──────────────────────────────────────────

export interface PathResult {
  /** Ordered list of node IDs from start to destination (inclusive) */
  path: string[];
  /** Total number of steps (edges traversed) */
  steps: number;
  /** Total number of waypoints traversed along the path */
  totalWaypoints?: number;
  /** Whether a valid path was found */
  found: boolean;
}

// ─── Graph Operations ───────────────────────────────────────────

/**
 * Build an adjacency map from the raw node list for efficient lookups.
 */
export function buildAdjacencyMap(
  nodes: MapNode[]
): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const node of nodes) {
    adj.set(node.id, node.connections);
  }
  return adj;
}

/**
 * Standard edge key generator for bidirectional lookup.
 */
export function getEdgeKey(fromId: string, toId: string): string {
  return `${fromId}->${toId}`;
}

/**
 * Build an edge waypoint lookup map from map edges.
 */
export function buildEdgeWaypointMap(edges?: MapEdge[]): Map<string, number> {
  const map = new Map<string, number>();
  if (!edges) return map;
  for (const edge of edges) {
    map.set(getEdgeKey(edge.from, edge.to), edge.waypoints);
    map.set(getEdgeKey(edge.to, edge.from), edge.waypoints);
  }
  return map;
}

/**
 * Find the shortest path between two nodes.
 * If edgeWeights is provided, uses Dijkstra's algorithm to minimize total waypoints.
 * Otherwise, uses standard BFS to minimize hop steps.
 *
 * @param adjacency   — Pre-built adjacency map
 * @param startId     — Starting node ID
 * @param targetId    — Destination node ID
 * @param edgeWeights — Optional edge weights (waypoints)
 * @returns             PathResult with the shortest path or found=false
 */
export function findShortestPath(
  adjacency: Map<string, string[]>,
  startId: string,
  targetId: string,
  edgeWeights?: Map<string, number>
): PathResult {
  if (startId === targetId) {
    return { path: [startId], steps: 0, totalWaypoints: 0, found: true };
  }

  // If no edgeWeights are provided, run standard BFS
  if (!edgeWeights || edgeWeights.size === 0) {
    const visited = new Set<string>([startId]);
    const parent = new Map<string, string>();
    const queue: string[] = [startId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjacency.get(current) ?? [];

      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        parent.set(neighbor, current);

        if (neighbor === targetId) {
          const path: string[] = [];
          let node: string | undefined = targetId;
          while (node !== undefined) {
            path.unshift(node);
            node = parent.get(node);
          }
          return { path, steps: path.length - 1, totalWaypoints: path.length - 1, found: true };
        }

        queue.push(neighbor);
      }
    }

    return { path: [], steps: 0, totalWaypoints: 0, found: false };
  }

  // Dijkstra algorithm for weighted graph (minimizing total waypoints)
  const dist = new Map<string, number>();
  const parent = new Map<string, string>();
  const visited = new Set<string>();

  dist.set(startId, 0);

  while (true) {
    let closestNode: string | null = null;
    let closestDist = Infinity;

    for (const [nodeId, d] of dist.entries()) {
      if (!visited.has(nodeId) && d < closestDist) {
        closestDist = d;
        closestNode = nodeId;
      }
    }

    if (closestNode === null || closestDist === Infinity) {
      break;
    }

    if (closestNode === targetId) {
      break;
    }

    visited.add(closestNode);
    const neighbors = adjacency.get(closestNode) ?? [];

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      const weight = edgeWeights.get(getEdgeKey(closestNode, neighbor)) ?? 1;
      const newDist = closestDist + weight;

      if (newDist < (dist.get(neighbor) ?? Infinity)) {
        dist.set(neighbor, newDist);
        parent.set(neighbor, closestNode);
      }
    }
  }

  if (!dist.has(targetId) || dist.get(targetId) === Infinity) {
    return { path: [], steps: 0, totalWaypoints: 0, found: false };
  }

  const path: string[] = [];
  let node: string | undefined = targetId;
  while (node !== undefined) {
    path.unshift(node);
    node = parent.get(node);
  }

  return {
    path,
    steps: path.length - 1,
    totalWaypoints: dist.get(targetId),
    found: true,
  };
}

/**
 * Calculate the travel time in hours for a path result based on campaign mapRules.
 */
export function calculateTravelHours(
  pathResult: PathResult,
  mapRules?: MapRules | Record<string, unknown>
): number {
  if (!pathResult.found || pathResult.path.length <= 1) {
    return 0;
  }

  const rules = mapRules as MapRules | undefined;
  const model = rules?.movementCostModel ?? (rules?.stepsPerHour ? 'waypoints' : 'hops');

  if (model === 'waypoints' && pathResult.totalWaypoints !== undefined) {
    const stepsPerHour = rules?.stepsPerHour ?? 14;
    return pathResult.totalWaypoints / stepsPerHour;
  }

  const costPerHop = rules?.movementCostPerNode ?? 0.5;
  return pathResult.steps * costPerHop;
}

/**
 * Get all nodes reachable within a given number of steps.
 *
 * @param adjacency — Pre-built adjacency map
 * @param startId   — Starting node ID
 * @param maxSteps  — Maximum number of edges to traverse
 * @returns           Set of reachable node IDs (excluding start)
 */
export function getReachableNodes(
  adjacency: Map<string, string[]>,
  startId: string,
  maxSteps: number
): Set<string> {
  const reachable = new Set<string>();
  const visited = new Set<string>([startId]);
  let frontier: string[] = [startId];

  for (let step = 0; step < maxSteps; step++) {
    const nextFrontier: string[] = [];
    for (const node of frontier) {
      const neighbors = adjacency.get(node) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          reachable.add(neighbor);
          nextFrontier.push(neighbor);
        }
      }
    }
    frontier = nextFrontier;
    if (frontier.length === 0) break;
  }

  return reachable;
}
