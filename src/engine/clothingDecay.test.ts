import { createTestGameState } from './testFactories';
import { describe, it, expect } from 'vitest';
import { processTurnStart } from './turnProcessor';
import {  } from './gameState';
import type { CampaignBundle } from './dataLoader';

describe('Clothing Decay', () => {
  it('should unconditionally decay clothes every turn (classic rule)', () => {
    const mockCampaign = { weekends: { randomWeekends: [] }, config: { name: 'test', startingMoney: 200, timeRules: { hoursPerTurn: 60, starvationPenalty: 20, doctorPenalty: 10 } } } as unknown as CampaignBundle;
    let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
    
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

  describe('Clothing Wear Warnings (helpfulUI toggle)', () => {
    it('helpfulUI = true: warns specifically for each clothing type wearing out', () => {
      const mockCampaign = { weekends: { randomWeekends: [] }, config: { name: 'test', startingMoney: 200, timeRules: { hoursPerTurn: 60, starvationPenalty: 20, doctorPenalty: 10 } } } as unknown as CampaignBundle;
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 1;
      state.rules.helpfulUI = true;
      state.rules.clothingDecaysAll = true;
      state.players[0].inventory.casualClothesWeeks = 10;
      state.players[0].inventory.dressClothesWeeks = 2; // will decay to 1
      state.players[0].inventory.businessClothesWeeks = 0;

      const nextState = processTurnStart(state, mockCampaign);
      const events = nextState.players[0].turnEvents.map(e => e.key);
      expect(events).toContain('events.clothes.dress');
      expect(events).not.toContain('events.clothes.needNew');
    });

    it('helpfulUI = false (Authentic Sierra): suppresses warning if another clothing type has > 1 week', () => {
      const mockCampaign = { weekends: { randomWeekends: [] }, config: { name: 'test', startingMoney: 200, timeRules: { hoursPerTurn: 60, starvationPenalty: 20, doctorPenalty: 10 } } } as unknown as CampaignBundle;
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 1;
      state.rules.helpfulUI = false;
      state.rules.clothingDecaysAll = true;
      state.players[0].inventory.casualClothesWeeks = 5; // Longest-lasting > 1
      state.players[0].inventory.dressClothesWeeks = 2;  // Decays to 1
      state.players[0].inventory.businessClothesWeeks = 0;

      const nextState = processTurnStart(state, mockCampaign);
      const events = nextState.players[0].turnEvents.map(e => e.key);
      expect(events).not.toContain('events.clothes.dress');
      expect(events).not.toContain('events.clothes.needNew');
    });

    it('helpfulUI = false (Authentic Sierra): emits generic needNew clothes warning when longest-lasting clothing reaches 1 week', () => {
      const mockCampaign = { weekends: { randomWeekends: [] }, config: { name: 'test', startingMoney: 200, timeRules: { hoursPerTurn: 60, starvationPenalty: 20, doctorPenalty: 10 } } } as unknown as CampaignBundle;
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 1;
      state.rules.helpfulUI = false;
      state.rules.clothingDecaysAll = true;
      state.players[0].inventory.casualClothesWeeks = 2; // Decays to 1 (max = 1)
      state.players[0].inventory.dressClothesWeeks = 0;
      state.players[0].inventory.businessClothesWeeks = 0;

      const nextState = processTurnStart(state, mockCampaign);
      const events = nextState.players[0].turnEvents.map(e => e.key);
      expect(events).toContain('events.clothes.needNew');
      expect(events).not.toContain('events.clothes.casual');
    });

    it('prevents warning spam: does not warn when clothes sit unworn in closet at 1 week on subsequent turns', () => {
      const mockCampaign = { weekends: { randomWeekends: [] }, config: { name: 'test', startingMoney: 200, timeRules: { hoursPerTurn: 60, starvationPenalty: 20, doctorPenalty: 10 } } } as unknown as CampaignBundle;
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 1;
      state.rules.helpfulUI = true;
      state.rules.clothingDecaysAll = false;
      state.rules.clothesSwitching = 'homeOrStore';
      state.players[0].inventory.casualClothesWeeks = 10;
      state.players[0].inventory.dressClothesWeeks = 1; // Already at 1 week (unworn)
      state.players[0].inventory.businessClothesWeeks = 0;
      state.players[0].inventory.selectedClothes = 'casual';
      state.players[0].turnFlags.clothesWornThisTurn = ['casual'];

      const nextState = processTurnStart(state, mockCampaign);
      const events = nextState.players[0].turnEvents.map(e => e.key);
      // Dress clothes were not worn, so they stayed at 1 week (did not decay)
      expect(nextState.players[0].inventory.dressClothesWeeks).toBe(1);
      // Dress warning must NOT fire because it was already at 1 week (no transition from > 1)
      expect(events).not.toContain('events.clothes.dress');
    });
  });

  describe('Advanced Mode: Worn This Turn Clothing Decay', () => {
    it('decays only clothes worn this turn, protecting unworn closet items', () => {
      const mockCampaign = { weekends: { randomWeekends: [] }, config: { name: 'test', startingMoney: 200, timeRules: { hoursPerTurn: 60, starvationPenalty: 20, doctorPenalty: 10 } } } as unknown as CampaignBundle;
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 1;
      state.rules.clothingDecaysAll = false;
      state.rules.clothesSwitching = 'homeOrStore';
      state.players[0].inventory.casualClothesWeeks = 10;
      state.players[0].inventory.dressClothesWeeks = 8;
      state.players[0].inventory.businessClothesWeeks = 12;
      state.players[0].inventory.selectedClothes = 'casual';
      state.players[0].turnFlags.clothesWornThisTurn = ['casual'];

      const nextState = processTurnStart(state, mockCampaign);
      expect(nextState.players[0].inventory.casualClothesWeeks).toBe(9);
      expect(nextState.players[0].inventory.dressClothesWeeks).toBe(8); // Unworn
      expect(nextState.players[0].inventory.businessClothesWeeks).toBe(12); // Unworn
    });

    it('anti-exploit: switching clothes before turn end decays both previously worn and currently equipped clothes', () => {
      const mockCampaign = { weekends: { randomWeekends: [] }, config: { name: 'test', startingMoney: 200, timeRules: { hoursPerTurn: 60, starvationPenalty: 20, doctorPenalty: 10 } } } as unknown as CampaignBundle;
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 1;
      state.rules.clothingDecaysAll = false;
      state.rules.clothesSwitching = 'homeOrStore';
      state.players[0].inventory.casualClothesWeeks = 10;
      state.players[0].inventory.businessClothesWeeks = 12;
      // Player wore business during work shift...
      state.players[0].turnFlags.clothesWornThisTurn = ['business'];
      // ...then switched to casual at home before ending turn!
      state.players[0].inventory.selectedClothes = 'casual';

      const nextState = processTurnStart(state, mockCampaign);
      // Both business (worn during shift) and casual (equipped at turn end) must decay
      expect(nextState.players[0].inventory.businessClothesWeeks).toBe(11);
      expect(nextState.players[0].inventory.casualClothesWeeks).toBe(9);
    });
  });
});
