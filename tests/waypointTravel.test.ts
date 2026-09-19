import { describe, it, expect, beforeEach } from 'vitest';
import { loadCampaign } from '../src/engine/dataLoader';
import { buildAdjacencyMap, findShortestPath, buildEdgeWaypointMap, calculateTravelHours } from '../src/graphics/pathfinding';
import { handleMoveAction } from '../src/engine/actions/movementActions';
import { createInitialGameState, type GameState, type PlayerState } from '../src/engine/gameState';
import { Random } from '../src/utils/rng';

describe('Waypoint Travel & Distance Model', () => {
  let campaign: any;
  let state: GameState;
  let player: PlayerState;

  beforeEach(async () => {
    campaign = await loadCampaign('1990_classic_floppy');
    state = createInitialGameState(
      campaign,
      [{ name: 'Jones', isAi: false, goals: { wealth: 100, happiness: 100, education: 100, career: 100 } }],
      'node_low_cost',
      {},
      42
    );
    player = state.players[0];
  });

  describe('Campaign Map Topology & Waypoint Calibration', () => {
    it('contains exactly 13 edges that sum to the authentic 170-waypoint perimeter', () => {
      expect(campaign.map.edges).toBeDefined();
      expect(campaign.map.edges.length).toBe(13);

      const totalWaypoints = campaign.map.edges.reduce((sum: number, edge: any) => sum + edge.waypoints, 0);
      expect(totalWaypoints).toBe(170);
    });

    it('verifies specific authentic segment distances', () => {
      const edgeMap = buildEdgeWaypointMap(campaign.map.edges);

      // Rent Office -> Low-Cost Housing is the shortest segment (7 waypoints)
      expect(edgeMap.get('node_rent->node_low_cost')).toBe(7);
      expect(edgeMap.get('node_low_cost->node_rent')).toBe(7);

      // Hi-Tech U -> Employment Office is the longest segment (24 waypoints)
      expect(edgeMap.get('node_university->node_employment')).toBe(24);

      // Low Cost -> Pawn Shop is 13 waypoints
      expect(edgeMap.get('node_low_cost->node_pawn_shop')).toBe(13);

      // Employment -> Factory is 8 waypoints
      expect(edgeMap.get('node_employment->node_factory')).toBe(8);
    });
  });

  describe('Shortest Path & Travel Time Calculation', () => {
    it('calculates exact walking hours for all key pairs along the ring', () => {
      const adj = buildAdjacencyMap(campaign.map.nodes);
      const edgeWeights = buildEdgeWaypointMap(campaign.map.edges);

      const testPairs = [
        { from: 'node_low_cost', to: 'node_rent', expectedWaypoints: 7, expectedWalkHours: 7 / 14 },
        { from: 'node_low_cost', to: 'node_pawn_shop', expectedWaypoints: 13, expectedWalkHours: 13 / 14 },
        { from: 'node_low_cost', to: 'node_bank', expectedWaypoints: 51, expectedWalkHours: 51 / 14 },
        { from: 'node_low_cost', to: 'node_factory', expectedWaypoints: 64, expectedWalkHours: 64 / 14 },
        { from: 'node_university', to: 'node_employment', expectedWaypoints: 24, expectedWalkHours: 24 / 14 },
      ];

      for (const pair of testPairs) {
        const path = findShortestPath(adj, pair.from, pair.to, edgeWeights);
        expect(path.found).toBe(true);
        expect(path.totalWaypoints).toBe(pair.expectedWaypoints);

        const walkHours = calculateTravelHours(path, campaign.config.mapRules);
        expect(walkHours).toBeCloseTo(pair.expectedWalkHours, 4);
      }
    });

    it('deducts exact walking hours plus building entry cost in handleMoveAction', () => {
      player.hoursRemaining = 60;
      const initialHours = player.hoursRemaining;

      const context = {
        state,
        campaign,
        rules: state.rules,
        turn: state.turn,
        rng: new Random(123),
      };
      const replayContext = { playerDecisions: [] };

      // Move from Low-Cost Housing to Factory:
      // Walk: 64 waypoints / 14 = 4.5714h
      // Entry: 2.0h
      // Total: 6.5714h
      const result = handleMoveAction(player, { type: 'move', nodeId: 'node_factory' }, context as any, replayContext as any);
      expect(result.nextPlayer.position).toBe('node_factory');

      const expectedDeduction = (64 / 14) + 2.0;
      expect(initialHours - result.nextPlayer.hoursRemaining).toBeCloseTo(expectedDeduction, 4);
    });

    it('initiates move regardless if player has hoursRemaining > 0 and exhausts hours to 0', () => {
      player.position = 'node_low_cost';
      player.hoursRemaining = 0.5; // Less than walk cost (4.57h) or entry cost (2.0h)

      const context = {
        state,
        campaign,
        rules: state.rules,
        turn: state.turn,
        rng: new Random(123),
      };
      const replayContext = { playerDecisions: [] };

      const result = handleMoveAction(player, { type: 'move', nodeId: 'node_factory' }, context as any, replayContext as any);
      expect(result.nextPlayer.position).toBe('node_factory');
      expect(result.nextPlayer.hoursRemaining).toBe(0);
      expect(result.actionLog).toBeUndefined();
    });

    it('rejects move when player has 0 hours remaining', () => {
      player.position = 'node_low_cost';
      player.hoursRemaining = 0;

      const context = {
        state,
        campaign,
        rules: state.rules,
        turn: state.turn,
        rng: new Random(123),
      };
      const replayContext = { playerDecisions: [] };

      const result = handleMoveAction(player, { type: 'move', nodeId: 'node_factory' }, context as any, replayContext as any);
      expect(result.nextPlayer.position).toBe('node_low_cost');
      expect(result.nextPlayer.hoursRemaining).toBe(0);
      expect(result.actionLog).toEqual({ key: 'action.error.notEnoughTime' });
    });
  });

  describe('Reversibility via Configuration', () => {
    it('reverts cleanly to legacy hop-based movement when movementCostModel is set to hops', () => {
      const legacyCampaign = structuredClone(campaign);
      legacyCampaign.config.mapRules.movementCostModel = 'hops';
      legacyCampaign.config.mapRules.movementCostPerNode = 0.5;

      const adj = buildAdjacencyMap(legacyCampaign.map.nodes);
      const edgeWeights = buildEdgeWaypointMap(legacyCampaign.map.edges);
      const path = findShortestPath(adj, 'node_low_cost', 'node_factory', edgeWeights);

      // 5 hops * 0.5h = 2.5h walk
      const walkHours = calculateTravelHours(path, legacyCampaign.config.mapRules);
      expect(walkHours).toBe(2.5);

      player.hoursRemaining = 60;
      const context = {
        state,
        campaign: legacyCampaign,
        rules: state.rules,
        turn: state.turn,
        rng: new Random(123),
      };
      const replayContext = { playerDecisions: [] };

      const result = handleMoveAction(player, { type: 'move', nodeId: 'node_factory' }, context as any, replayContext as any);
      expect(result.nextPlayer.position).toBe('node_factory');
      // 2.5h walk + 2.0h entry = 4.5h total deduction
      expect(60 - result.nextPlayer.hoursRemaining).toBeCloseTo(4.5, 4);
    });
  });
});
