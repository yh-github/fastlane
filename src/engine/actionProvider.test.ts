import { describe, it, expect, beforeEach } from 'vitest';
import { getAvailableActions } from './actionProvider';
import { loadCampaign } from './dataLoader';
import { createInitialGameState, GameState, PlayerState } from './gameState';

describe('actionProvider', () => {
  let mockCampaign: any;
  let state: GameState;
  let player: PlayerState;

  beforeEach(async () => {
    mockCampaign = await loadCampaign('1990_classic_floppy');
    state = createInitialGameState(mockCampaign, [{ name: 'Test Player', isAi: false, goals: { wealth: 100, happiness: 100, education: 100, career: 100 } }], 'node_low_cost', {}, 12345);
    player = state.players[0];
  });

  it('should generate travel actions when outside', () => {
    const actions = getAvailableActions(player, state, mockCampaign, false);
    // Should have travel options and enter building
    const enterAction = actions.find(a => a.label.includes('Enter') && a.label.includes('Low-Cost Housing'));
    expect(enterAction).toBeDefined();

    const travelAction = actions.find(a => a.action.type === 'move' && (a.action as any).nodeId === 'node_factory');
    expect(travelAction).toBeDefined();
    if (state.rules.helpfulUI) {
      expect(travelAction?.label).toContain('(-4.5h)');
    }
  });

  it('should generate building-specific actions when inside', () => {
    // Put player inside employment office
    player.position = 'node_employment';
    const actions = getAvailableActions(player, state, mockCampaign, true);
    
    // Should have exit action
    expect(actions.find(a => a.action.type === 'exit_building')).toBeDefined();
    
    // Should have apply actions
    const applyActions = actions.filter(a => a.action.type === 'apply');
    expect(applyActions.length).toBeGreaterThan(0);
    
    // If helpfulUI, should have wage info
    if (state.rules.helpfulUI) {
       expect(applyActions[0].label).toContain('Wage: $');
    }
  });

  it('should restrict relax to the player\'s home', () => {
    player.position = 'node_low_cost';
    player.currentHousingId = 'low_cost';
    
    const insideActions = getAvailableActions(player, state, mockCampaign, true);
    expect(insideActions.find(a => a.action.type === 'relax')).toBeDefined();

    // Move to security apartments
    player.position = 'node_security';
    const otherHousingActions = getAvailableActions(player, state, mockCampaign, true);
    expect(otherHousingActions.find(a => a.action.type === 'relax')).toBeUndefined();
  });
});
