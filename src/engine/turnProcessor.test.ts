import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processTurnStart } from './turnProcessor';
import { createInitialGameState, recalculatePlayerEffects } from './gameState';
import type { CampaignBundle } from './dataLoader';

describe('Food Spoilage (processTurnStart)', () => {
  beforeEach(() => {
    // Mock Math.random to avoid random events like market crashes or appliance breakages from affecting the tests.
    // 0.99 ensures that events with lower probability do not fire.
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
  });

  const mockCampaign = {
    weekends: {
      ticketWeekends: {},
      durableWeekends: {},
      randomWeekends: []
    },
    items: [
      { id: 'refrigerator', name: 'Fridge', category: 'appliance', tags: ['refrigerator'] },
      { id: 'freezer', name: 'Freezer', category: 'appliance', tags: ['freezer'] },
    ],
    synergies: [
      {
        id: 'base_refrigeration',
        name: 'Base',
        requires: ['tag:refrigerator'],
        effects: [{ type: 'set_food_storage', value: 6, operation: 'MAX' }]
      },
      {
        id: 'full_refrigeration',
        name: 'Full',
        requires: ['tag:refrigerator', 'tag:freezer'],
        effects: [{ type: 'set_food_storage', value: 12, operation: 'MAX' }]
      }
    ]
  } as unknown as CampaignBundle;

  it('spoils all food if no refrigerator', () => {
    let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
    state.turn = 1; // Turn must be > 0 for logic to run
    state.players[0].inventory.freshFoodUnits = 5; // Starts with 5, eats 1 => 4 left. All 4 should spoil.
    state.players[0] = recalculatePlayerEffects(state.players[0], mockCampaign);

    const nextState = processTurnStart(state, mockCampaign);
    expect(nextState.players[0].inventory.freshFoodUnits).toBe(0);
  });

  it('spoils excess food with only a refrigerator (capacity 6)', () => {
    let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
    state.turn = 1;
    state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
    
    // Start with 9. Turn processor consumes 1 -> 8. Capacity is 6. So it should drop to 6.
    state.players[0].inventory.freshFoodUnits = 9;
    state.players[0] = recalculatePlayerEffects(state.players[0], mockCampaign);

    const nextState = processTurnStart(state, mockCampaign);
    expect(nextState.players[0].inventory.freshFoodUnits).toBe(6);
  });

  it('keeps up to 12 food with both refrigerator and freezer', () => {
    let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
    state.turn = 1;
    state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
    state.players[0].inventory.appliances.push({ id: 'freezer', purchasePrice: 500, purchaseSource: 'socket_city' });
    
    // Start with 13. Turn processor consumes 1 -> 12. Capacity is 12. Should remain 12.
    state.players[0].inventory.freshFoodUnits = 13; 
    state.players[0] = recalculatePlayerEffects(state.players[0], mockCampaign);

    const nextState = processTurnStart(state, mockCampaign);
    expect(nextState.players[0].inventory.freshFoodUnits).toBe(12);
  });

  it('spoils all food if only freezer (no refrigerator)', () => {
    let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
    state.turn = 1;
    state.players[0].inventory.appliances.push({ id: 'freezer', purchasePrice: 500, purchaseSource: 'socket_city' });
    
    // Starts with 5, eats 1 -> 4. No fridge, so all 4 spoil.
    state.players[0].inventory.freshFoodUnits = 5; 
    state.players[0] = recalculatePlayerEffects(state.players[0], mockCampaign);

    const nextState = processTurnStart(state, mockCampaign);
    expect(nextState.players[0].inventory.freshFoodUnits).toBe(0);
  });
});
