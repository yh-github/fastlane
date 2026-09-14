import { describe, it, expect, beforeEach } from 'vitest';
import { loadCampaign, type CampaignBundle } from '../src/engine/dataLoader';
import { createInitialGameState, createDefaultGoalAllotment, type GameState } from '../src/engine/gameState';
import { processControllerAction } from '../src/engine/gameController';
import { processTurnStart } from '../src/engine/turnProcessor';

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
});
