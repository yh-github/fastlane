/**
 * pathfinding.ts — Click-and-walk movement logic.
 *
 * Implements graph-based pathfinding on the campaign map.
 * The map is modeled as an undirected graph of MapNodes with
 * connections. Uses BFS for shortest-path since maps are small
 * enough that A* optimization is unnecessary.
 */

import type { MapNode } from '../engine/dataLoader';

// ─── Pathfinding Types ──────────────────────────────────────────

export interface PathResult {
  /** Ordered list of node IDs from start to destination (inclusive) */
  path: string[];
  /** Total number of steps (edges traversed) */
  steps: number;
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
 * Find the shortest path between two nodes using BFS.
 *
 * @param adjacency — Pre-built adjacency map
 * @param startId   — Starting node ID
 * @param targetId  — Destination node ID
 * @returns           PathResult with the shortest path or found=false
 */
export function findShortestPath(
  adjacency: Map<string, string[]>,
  startId: string,
  targetId: string
): PathResult {
  if (startId === targetId) {
    return { path: [startId], steps: 0, found: true };
  }

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
        // Reconstruct path
        const path: string[] = [];
        let node: string | undefined = targetId;
        while (node !== undefined) {
          path.unshift(node);
          node = parent.get(node);
        }
        return { path, steps: path.length - 1, found: true };
      }

      queue.push(neighbor);
    }
  }

  return { path: [], steps: 0, found: false };
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
