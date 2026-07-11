import { describe, it, expect } from 'vitest';
import { processTurnStart } from './turnProcessor';
import { createInitialGameState } from './gameState';
import type { CampaignBundle } from './dataLoader';

describe('Clothing Decay', () => {
  it('should unconditionally decay clothes every turn (classic rule)', () => {
    const mockCampaign = { weekends: { randomWeekends: [] }, config: { name: 'test', startingMoney: 200, timeRules: { hoursPerTurn: 60 } } } as unknown as CampaignBundle;
    let state = createInitialGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
    
    // Setup state so the turn is 1 (meaning we are transitioning from turn 0 to turn 1)
    state.turn = 1;
    let player = state.players[0];
    
    // Player has casual clothes for 10 weeks
    player.inventory.casualClothesWeeks = 10;
    
    // Player did NOT work in the previous turn
    player.turnFlags.hasWorked = false;

    // We process the turn start
    const nextState = processTurnStart(state, mockCampaign);
    
    // Even though the player didn't work, casualClothesWeeks should decay to 9
    // as per the classic unconditional decay rule.
    expect(nextState.players[0].inventory.casualClothesWeeks).toBe(9);
  });
});
