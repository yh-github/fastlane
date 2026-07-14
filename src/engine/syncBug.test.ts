import { describe, it, expect, vi } from 'vitest';
import { Random } from '../utils/rng';
import { processTurnStart } from './turnProcessor';
import { createInitialGameState, recalculatePlayerEffects } from './gameState';
import type { CampaignBundle } from './dataLoader';

describe('Robbery and Synergy Sync Bug', () => {
  it('computer income effect should disappear the turn after a computer is stolen if no actions were taken', () => {

    
    const mockCampaign = {
      synergies: [
        { name: "Computer Income", requires: ["tag:computer"], effects: [{ type: 'computer_income_chance', value: 1, operation: 'MAX' }] }
      ],
      items: [
        { id: 'computer', tags: ['computer'] }
      ],
      weekends: { randomWeekends: [], durableWeekends: {} },
      config: { name: 'test', startingMoney: 200, timeRules: { hoursPerTurn: 60, starvationPenalty: 20, doctorPenalty: 10 } }
    } as unknown as CampaignBundle;

    let state = createInitialGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');

    let player = state.players[0];
    
    // Player has a computer
    player.inventory.appliances.push({ id: 'computer', purchasePrice: 1500, purchaseSource: 'socket_city' });
    
    // Initial sync (happens when they buy it)
    player = recalculatePlayerEffects(player, mockCampaign);
    state.players[0] = player;

    // Force Wild Willy to steal the refrigerator.
    // relaxation = 0 means 100% chance of robbery.
    player.relaxation = 0;
    // Mock random so robbery succeeds (chance is 1.0) and steal appliance (random < 0.25).
    vi.spyOn(Random.prototype, 'next').mockReturnValue(0.01); 

    state.turn = 1;

    // Turn 1: processTurnStart happens.
    // At step 12, Wild Willy steals the computer.
    state = processTurnStart(state, mockCampaign);
    
    // Verify it was stolen!
    expect(state.players[0].inventory.appliances.length).toBe(0);

    // Player takes NO actions during Turn 1, so handleAction is never called.
    
    // Turn 2: processTurnStart happens again.
    state = processTurnStart(state, mockCampaign);

    // Because of the fix, recalculatePlayerEffects runs at the START of turn 2.
    // It should strip the computer_income_chance effect since the computer is gone.
    expect(state.players[0].activeEffects['computer_income_chance']).toBeUndefined();
  });
});
