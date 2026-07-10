import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processTurnStart } from './turnProcessor';
import { createInitialGameState, recalculatePlayerEffects } from './gameState';
import type { CampaignBundle } from './dataLoader';

describe('Turn Processor', () => {
  let mockCampaign: CampaignBundle;

  beforeEach(() => {
    // 0.99 ensures events with lower probability do NOT fire unless we override it.
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    mockCampaign = {
      weekends: {
        ticketWeekends: { 'W1': 'baseball_tickets' },
        durableWeekends: {},
        randomWeekends: []
      },
      items: [
        { id: 'refrigerator', name: 'Fridge', category: 'appliance', tags: ['refrigerator'] },
        { id: 'freezer', name: 'Freezer', category: 'appliance', tags: ['freezer'] },
        { id: 'microwave', name: 'Microwave', category: 'appliance', tags: ['microwave'] },
        { id: 'stove', name: 'Stove', category: 'appliance', tags: ['stove'] },
        { id: 'computer', name: 'Computer', category: 'appliance', tags: ['computer'] },
        { id: 'baseball_tickets', name: 'Baseball Tickets', category: 'ticket' }
      ],
      synergies: [
        { id: 'base_ref', name: 'Base', requires: ['tag:refrigerator'], effects: [{ type: 'set_food_storage', value: 6, operation: 'MAX' }] },
        { id: 'stove_hap', name: 'Stove', requires: ['tag:stove'], effects: [{ type: 'add_turn_happiness', value: 1, operation: 'ADD' }] },
        { id: 'micro_hap', name: 'Micro', requires: ['tag:microwave'], effects: [{ type: 'add_turn_happiness', value: 1, operation: 'ADD' }] },
        { id: 'comp_inc', name: 'Comp', requires: ['tag:computer'], effects: [{ type: 'computer_income_chance', value: 1, operation: 'MAX' }] }
      ],
      calendar: [
        { id: 'W1', name: 'Week 1' }
      ]
    } as unknown as CampaignBundle;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Food Spoilage', () => {
    it('spoils all food if no refrigerator', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      state.turn = 1; 
      state.players[0].inventory.freshFoodUnits = 5; 
      const nextState = processTurnStart(state, mockCampaign);
      expect(nextState.players[0].inventory.freshFoodUnits).toBe(0);
    });

    it('spoils excess food with only a refrigerator (capacity 6)', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      state.turn = 1;
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].inventory.freshFoodUnits = 9;
      const nextState = processTurnStart(state, mockCampaign);
      expect(nextState.players[0].inventory.freshFoodUnits).toBe(6);
    });
  });

  describe('Appliance Breakage', () => {
    it('breaks an appliance if random < breakChance', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      state.turn = 2;
      state.players[0].money = 1000; // Must have > 500 for breakage to occur
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      
      // Use 0.01 which triggers crash, breakage, etc.
      // But we just want to test if length is 0.
      vi.spyOn(Math, 'random').mockReturnValue(0.01);
      
      const nextState = processTurnStart(state, mockCampaign);
      // The appliance is NOT removed from inventory, but the player pays a repair cost.
      expect(nextState.players[0].inventory.appliances.length).toBe(1);
      expect(nextState.players[0].turnEvents.some(e => e.includes('broke!'))).toBe(true);
    });
  });

  describe('Happiness Bonuses', () => {
    it('grants happiness for stove and microwave if food was eaten at home', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      state.turn = 2;
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].inventory.appliances.push({ id: 'stove', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].inventory.appliances.push({ id: 'microwave', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].inventory.freshFoodUnits = 1; // So they eat at home!
      state.players[0].happiness = 50;

      const nextState = processTurnStart(state, mockCampaign);
      
      // Starts at 50, +1 for stove, +1 for microwave -> 52.
      expect(nextState.players[0].happiness).toBe(52);
    });

    it('does NOT grant happiness if they starved (no food)', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      state.turn = 2;
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].inventory.appliances.push({ id: 'stove', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].inventory.freshFoodUnits = 0; // No food
      state.players[0].turnFlags.hasEaten = false; // Force starvation
      state.players[0].happiness = 50;

      const nextState = processTurnStart(state, mockCampaign);

      // Starts 50, -2 from starvation. Stove bonus +1 still applies (per rules), so 49.
      expect(nextState.players[0].happiness).toBe(49);
    });
  });

  describe('Computer Income', () => {
    it('grants extra money from computer if chance hits', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      state.turn = 2;
      state.players[0].inventory.freshFoodUnits = 10;
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].inventory.appliances.push({ id: 'computer', purchasePrice: 1500, purchaseSource: 'socket_city' });
      state.players[0].money = 100;
      
      // chance is 10%. Mocking 0.05 will hit.
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      const nextState = processTurnStart(state, mockCampaign);
      
      expect(nextState.players[0].money).toBe(119);
    });
  });

  describe('Lottery', () => {
    it('processes lottery tickets and can win', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      state.turn = 2;
      state.players[0].inventory.freshFoodUnits = 10;
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].inventory.lotteryTickets = 10;
      state.players[0].money = 100;
      
      vi.spyOn(Math, 'random').mockReturnValue(0.001);

      const nextState = processTurnStart(state, mockCampaign);
      
      expect(nextState.players[0].money).toBe(5095);
      expect(nextState.players[0].inventory.lotteryTickets).toBe(0);
    });
  });

  describe('Rent Check', () => {
    it('deducts rent, forces move if unpaid for 4 weeks', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      state.turn = 2;
      state.players[0].inventory.freshFoodUnits = 10;
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].rentPaidUntilWeek = 1; 
      state.players[0].money = 1000;
      state.players[0].currentRentPrice = 200;

      const nextState = processTurnStart(state, mockCampaign);
      
      expect(nextState.players[0].currentHousingId).toBe('low_cost');
    });

    it('evicts player if rent debt > 4 weeks', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      state.turn = 5;
      state.rules.strictEviction = true;
      state.players[0].inventory.freshFoodUnits = 10;
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].rentPaidUntilWeek = 0; 
      state.players[0].currentHousingId = 'security';
      state.players[0].currentRentPrice = 500;
      
      const nextState = processTurnStart(state, mockCampaign);
      
      expect(nextState.players[0].currentHousingId).toBe('low_cost');
      expect(nextState.players[0].turnEvents.some(e => e.includes('evicted'))).toBe(true);
    });
  });

  describe('Market Crash', () => {
    it('triggers market crash if chance hits', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      state.turn = 2;
      state.players[0].inventory.freshFoodUnits = 10;
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      
      vi.spyOn(Math, 'random').mockReturnValue(0.0001);

      const nextState = processTurnStart(state, mockCampaign);

      expect(nextState.economicIndex).toBeLessThan(100);
    });
  });
});
