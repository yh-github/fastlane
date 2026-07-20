import { describe, it, expect } from 'vitest';
import { createInitialGameState, GameState } from './gameState';
import { loadCampaign } from './dataLoader';
import { gameReducer, GameAction } from './gameReducer';
import { Random } from '../utils/rng';

describe('Manual Action Regression Tests', () => {
  it('processes a predefined sequence of actions deterministically', async () => {
    const campaign = await loadCampaign('qol_improved');
    const players = [
      { name: 'ManualPlayer', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }
    ];
    let state = createInitialGameState(campaign, players, 'node_low_cost', {}, 12345);
    

    
    const actions: GameAction[] = [
      // Turn 0
      { type: 'move', nodeId: 'node_department_store' },
      { type: 'buy', itemId: 'casual_clothes' },
      { type: 'move', nodeId: 'node_employment_office' },
      { type: 'apply', jobId: 'factory_janitor' },
      { type: 'end_turn' },
      // Turn 1
      { type: 'move', nodeId: 'node_grocery' },
      { type: 'buy', itemId: 'food_1week' },
      { type: 'move', nodeId: 'node_factory' },
      { type: 'work', jobId: 'factory_janitor' },
      { type: 'end_turn' },
      // Turn 2
      { type: 'work', jobId: 'factory_janitor' },
      { type: 'move', nodeId: 'node_low_cost' },
      { type: 'relax' },
      { type: 'end_turn' },
      // Turn 3
      { type: 'move', nodeId: 'node_rent_office' },
      { type: 'pay_rent' },
      { type: 'move', nodeId: 'node_bank' },
      { type: 'bank_transaction', amount: 50 },
      { type: 'end_turn' },
    ];

    for (const action of actions) {
      const rng = new Random(state.rngState);
      const context = {
        campaign,
        rules: state.rules,
        turn: state.turn,
        economicIndex: state.economicIndex,
        rng,
        state
      };
      
      let player = state.players[0];
      const result = gameReducer(player, action, context);
      state.players[0] = result.updatedPlayer;
      state.rngState = context.rng.getState();
      state.pawnShopItemsForSale = result.updatedPawnShopItemsForSale ?? state.pawnShopItemsForSale;
    }

    // Since we hardcoded the actions, this snapshot will ONLY change if the underlying engine rules change.
    // It is completely immune to AI heuristic changes.
    expect(state).toMatchSnapshot();
  });
});
