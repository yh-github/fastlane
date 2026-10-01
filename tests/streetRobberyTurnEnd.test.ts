import { describe, it, expect, beforeEach } from 'vitest';
import { loadCampaign, type CampaignBundle } from '../src/engine/dataLoader';
import { createInitialGameState, createDefaultGoalAllotment, type GameState } from '../src/engine/gameState';
import { processControllerAction } from '../src/engine/gameController';
import { processTurnStart } from '../src/engine/turnProcessor';
import { gameReducer } from '../src/engine/gameReducer';
import { Random } from '../src/utils/rng';

describe('streetRobberyOnTurnEnd optional rule', () => {
  let campaign: CampaignBundle;

  beforeEach(async () => {
    campaign = await loadCampaign('qol_improved');
  });

  function createTestState(seed = 12345): GameState {
    const goals = createDefaultGoalAllotment();
    const housingNode = campaign.housing[0]?.homeNodeId || campaign.map.nodes[0].id;
    let state = createInitialGameState(campaign, [{ name: 'Player 1', isAi: false, goals }], housingNode, {}, seed);
    state.phase = 'playing';
    state = processTurnStart(state, campaign);
    return state;
  }

  it('triggers street robbery on turn end when player is at the Bank and rule is enabled (default)', () => {
    const state = createTestState();
    const bankNode = campaign.map.nodes.find(n => n.buildingId === 'bank')?.id;
    expect(bankNode).toBeDefined();

    const player = state.players[0];
    player.position = bankNode!;
    player.money = 500;
    state.turn = 4; // Meets willyRobberyStartWeek (turn 4 for CD-ROM / QoL)
    state.rules.streetRobberyOnTurnEnd = true;
    state.debugQueue = [{ type: 'street_robbery', playerId: player.id }];

    const result = processControllerAction(state, campaign, 0, true, { type: 'end_turn' });

    expect(result.turnAdvanced).toBe(true);
    // Player was robbed of cash
    const endPlayer = result.state.players[0];
    expect(endPlayer.money).toBe(0);
    // Debug queue item consumed
    expect(Boolean(result.state.debugQueue?.some(e => e.type === 'street_robbery'))).toBe(false);
  });

  it('bypasses street robbery on turn end when streetRobberyOnTurnEnd is false', () => {
    const state = createTestState();
    const bankNode = campaign.map.nodes.find(n => n.buildingId === 'bank')?.id;
    expect(bankNode).toBeDefined();

    const player = state.players[0];
    player.position = bankNode!;
    player.money = 500;
    state.turn = 4;
    state.rules.streetRobberyOnTurnEnd = false;
    state.debugQueue = [{ type: 'street_robbery', playerId: player.id }];

    const result = processControllerAction(state, campaign, 0, true, { type: 'end_turn' });

    expect(result.turnAdvanced).toBe(true);
    const endPlayer = result.state.players[0];
    // Cash was not mugged on the street
    expect(endPlayer.money).toBeGreaterThan(0);
    // Debug queue item was not consumed by turn end street robbery
    expect(Boolean(result.state.debugQueue?.some(e => e.type === 'street_robbery'))).toBe(true);
  });

  it('does not trigger street robbery on turn end when player is at a non-mugging location (e.g. Home or Rent Office)', () => {
    const state = createTestState();
    const rentNode = campaign.map.nodes.find(n => n.buildingId === 'apartment_complex')?.id;
    expect(rentNode).toBeDefined();

    const player = state.players[0];
    player.position = rentNode!;
    player.money = 500;
    state.turn = 4;
    state.rules.streetRobberyOnTurnEnd = true;
    state.debugQueue = [{ type: 'street_robbery', playerId: player.id }];

    const result = processControllerAction(state, campaign, 0, true, { type: 'end_turn' });

    expect(result.turnAdvanced).toBe(true);
    const endPlayer = result.state.players[0];
    expect(endPlayer.money).toBeGreaterThan(0);
    // Debug queue item was not consumed
    expect(Boolean(result.state.debugQueue?.some(e => e.type === 'street_robbery'))).toBe(true);
  });

  it('triggers street robbery on turn end when player is at Black\'s Market', () => {
    const state = createTestState();
    const marketNode = campaign.map.nodes.find(n => n.buildingId === 'blacks_market')?.id;
    expect(marketNode).toBeDefined();

    const player = state.players[0];
    player.position = marketNode!;
    player.money = 600;
    state.turn = 4;
    state.rules.streetRobberyOnTurnEnd = true;
    state.debugQueue = [{ type: 'street_robbery', playerId: player.id }];

    const result = processControllerAction(state, campaign, 0, true, { type: 'end_turn' });

    expect(result.turnAdvanced).toBe(true);
    const endPlayer = result.state.players[0];
    expect(endPlayer.money).toBe(0);
    expect(Boolean(result.state.debugQueue?.some(e => e.type === 'street_robbery'))).toBe(false);
  });

  it('does NOT trigger street robbery when player arrives outside Bank with 0 hours without entering (insideBuilding is false)', () => {
    const state = createTestState();
    const bankNode = campaign.map.nodes.find(n => n.buildingId === 'bank')?.id;
    expect(bankNode).toBeDefined();

    const player = state.players[0];
    player.position = bankNode!;
    player.money = 500;
    player.hoursRemaining = 0;
    if (player.turnFlags) {
      delete player.turnFlags.enteredBuildingThisTurn;
    }
    state.turn = 4;
    state.rules.streetRobberyOnTurnEnd = true;
    state.debugQueue = [{ type: 'street_robbery', playerId: player.id }];

    // Ending turn outside the building (insideBuilding = false, enteredBuildingThisTurn = null)
    const result = processControllerAction(state, campaign, 0, false, { type: 'end_turn' });

    expect(result.turnAdvanced).toBe(true);
    const endPlayer = result.state.players[0];
    // Player is spared from street mugging because they never entered the building
    expect(endPlayer.money).toBeGreaterThan(0);
    // Robbery event remains in queue
    expect(Boolean(result.state.debugQueue?.some(e => e.type === 'street_robbery'))).toBe(true);
  });

  it('triggers street robbery on exit_building in Classic mode (reenterCurrentLocationCost: true)', () => {
    const state = createTestState();
    const bankNode = campaign.map.nodes.find(n => n.buildingId === 'bank')?.id;
    expect(bankNode).toBeDefined();

    state.rules.reenterCurrentLocationCost = true;
    const player = state.players[0];
    player.position = bankNode!;
    player.money = 500;
    player.hoursRemaining = 10;
    if (player.turnFlags) {
      player.turnFlags.enteredBuildingThisTurn = 'bank';
    }
    state.turn = 4;
    state.debugQueue = [{ type: 'street_robbery', playerId: player.id }];

    // In Classic mode, closing/exiting the building triggers the departure mugging check
    const result = processControllerAction(state, campaign, 0, true, { type: 'exit_building' });

    expect(result.insideBuilding).toBe(false);
    expect(result.turnAdvanced).toBe(false);
    const endPlayer = result.state.players[0];
    expect(endPlayer.money).toBe(0);
    expect(Boolean(result.state.debugQueue?.some(e => e.type === 'street_robbery'))).toBe(false);
    expect(endPlayer.turnFlags?.enteredBuildingThisTurn).toBeFalsy();
  });

  it('spares player from street robbery on exit_building when hoursRemaining <= 0 and streetRobberyOnTurnEnd is false in Classic mode', () => {
    const state = createTestState();
    const bankNode = campaign.map.nodes.find(n => n.buildingId === 'bank')?.id;
    expect(bankNode).toBeDefined();

    state.rules.reenterCurrentLocationCost = true;
    state.rules.streetRobberyOnTurnEnd = false;
    const player = state.players[0];
    player.position = bankNode!;
    player.money = 500;
    player.hoursRemaining = 0;
    if (player.turnFlags) {
      player.turnFlags.enteredBuildingThisTurn = 'bank';
    }
    state.turn = 4;
    state.debugQueue = [{ type: 'street_robbery', playerId: player.id }];

    const result = processControllerAction(state, campaign, 0, true, { type: 'exit_building' });

    expect(result.insideBuilding).toBe(false);
    const endPlayer = result.state.players[0];
    expect(endPlayer.money).toBe(500);
    expect(Boolean(result.state.debugQueue?.some(e => e.type === 'street_robbery'))).toBe(true);
  });

  it('does NOT trigger street robbery on move action when player was never inside the bank', () => {
    const state = createTestState();
    const bankNode = campaign.map.nodes.find(n => n.buildingId === 'bank')?.id;
    expect(bankNode).toBeDefined();

    const edge = campaign.map.edges.find(e => e.from === bankNode || e.to === bankNode);
    expect(edge).toBeDefined();
    const targetNode = edge!.from === bankNode ? edge!.to : edge!.from;

    const player = state.players[0];
    player.position = bankNode!;
    player.money = 500;
    player.hoursRemaining = 10;
    if (player.turnFlags) {
      delete player.turnFlags.enteredBuildingThisTurn;
    }
    state.turn = 4;
    state.debugQueue = [{ type: 'street_robbery', playerId: player.id }];

    const context = {
      state,
      campaign,
      turn: state.turn,
      rng: new Random(state.rngState),
    };

    const actionResult = gameReducer(player, { type: 'move', nodeId: targetNode }, context);

    expect(actionResult.updatedPlayer.position).toBe(targetNode);
    expect(actionResult.updatedPlayer.money).toBe(500);
    expect(Boolean(state.debugQueue?.some(e => e.type === 'street_robbery'))).toBe(true);
  });

  it('triggers street robbery on move action when player departs after being inside the bank', () => {
    const state = createTestState();
    const bankNode = campaign.map.nodes.find(n => n.buildingId === 'bank')?.id;
    expect(bankNode).toBeDefined();

    const edge = campaign.map.edges.find(e => e.from === bankNode || e.to === bankNode);
    expect(edge).toBeDefined();
    const targetNode = edge!.from === bankNode ? edge!.to : edge!.from;

    const player = state.players[0];
    player.position = bankNode!;
    player.money = 500;
    player.hoursRemaining = 10;
    if (player.turnFlags) {
      player.turnFlags.enteredBuildingThisTurn = 'bank';
    }
    state.turn = 4;
    state.debugQueue = [{ type: 'street_robbery', playerId: player.id }];

    const context = {
      state,
      campaign,
      turn: state.turn,
      rng: new Random(state.rngState),
    };

    const actionResult = gameReducer(player, { type: 'move', nodeId: targetNode }, context);

    expect(actionResult.updatedPlayer.position).toBe(targetNode);
    expect(actionResult.updatedPlayer.money).toBe(0);
    expect(actionResult.actionLog?.key).toBe('log.robbery');
    expect(actionResult.updatedPlayer.turnFlags?.enteredBuildingThisTurn).not.toBe('bank');
  });
});
