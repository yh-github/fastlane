import { describe, it, expect } from 'vitest';
import { buildAdjacencyMap, findShortestPath, getReachableNodes } from './pathfinding';
import type { MapNode } from '../engine/dataLoader';

describe('Pathfinding', () => {
  const nodes: MapNode[] = [
    { id: 'node_a', x: 0, y: 0, connections: ['node_b', 'node_c'] },
    { id: 'node_b', x: 10, y: 0, connections: ['node_a', 'node_d'] },
    { id: 'node_c', x: 0, y: 10, connections: ['node_a', 'node_d'] },
    { id: 'node_d', x: 10, y: 10, connections: ['node_b', 'node_c', 'node_e'] },
    { id: 'node_e', x: 20, y: 20, connections: ['node_d'] },
    { id: 'node_isolated', x: 100, y: 100, connections: [] },
  ];

  const adj = buildAdjacencyMap(nodes);

  describe('buildAdjacencyMap', () => {
    it('creates adjacency entries for all nodes', () => {
      expect(adj.size).toBe(6);
      expect(adj.get('node_a')).toEqual(['node_b', 'node_c']);
      expect(adj.get('node_isolated')).toEqual([]);
    });
  });

  describe('findShortestPath', () => {
    it('returns single node path with 0 steps when start equals target', () => {
      const res = findShortestPath(adj, 'node_a', 'node_a');
      expect(res.found).toBe(true);
      expect(res.path).toEqual(['node_a']);
      expect(res.steps).toBe(0);
    });

    it('finds direct 1-step path between adjacent nodes', () => {
      const res = findShortestPath(adj, 'node_a', 'node_b');
      expect(res.found).toBe(true);
      expect(res.path).toEqual(['node_a', 'node_b']);
      expect(res.steps).toBe(1);
    });

    it('finds multi-step shortest path', () => {
      const res = findShortestPath(adj, 'node_a', 'node_e');
      expect(res.found).toBe(true);
      expect(res.path.length).toBe(4); // e.g. a -> b -> d -> e or a -> c -> d -> e
      expect(res.steps).toBe(3);
      expect(res.path[0]).toBe('node_a');
      expect(res.path[3]).toBe('node_e');
    });

    it('returns found: false for unreachable isolated node', () => {
      const res = findShortestPath(adj, 'node_a', 'node_isolated');
      expect(res.found).toBe(false);
      expect(res.path).toEqual([]);
      expect(res.steps).toBe(0);
    });
  });

  describe('getReachableNodes', () => {
    it('returns empty set for 0 maxSteps', () => {
      const reachable = getReachableNodes(adj, 'node_a', 0);
      expect(reachable.size).toBe(0);
    });

    it('returns immediate neighbors for maxSteps = 1', () => {
      const reachable = getReachableNodes(adj, 'node_a', 1);
      expect(reachable).toEqual(new Set(['node_b', 'node_c']));
    });

    it('returns all reachable nodes within radius for maxSteps = 2', () => {
      const reachable = getReachableNodes(adj, 'node_a', 2);
      expect(reachable).toEqual(new Set(['node_b', 'node_c', 'node_d']));
    });

    it('does not include isolated node even with large step limit', () => {
      const reachable = getReachableNodes(adj, 'node_a', 10);
      expect(reachable.has('node_isolated')).toBe(false);
      expect(reachable.has('node_e')).toBe(true);
    });
  });
});
