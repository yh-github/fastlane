import { describe, it, expect } from 'vitest';
import { buyItem } from './shoppingEngine';
import { createInitialGameState } from './gameState';
import type { ItemDef } from './dataLoader';

describe('shoppingEngine', () => {
  it('prevents purchase if not enough money', () => {
    let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
    let player = state.players[0];
    player.money = 10;
    
    const item: ItemDef = { id: 'expensive', name: 'Expensive', category: 'appliance', store: 'socket_city', basePrice: 100, happinessBonus: 0 };
    
    const result = buyItem(player, item);
    expect(result.success).toBe(false);
    expect(result.updated.money).toBe(10);
  });

  it('deducts money and adds happiness on success', () => {
    let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
    let player = state.players[0];
    player.money = 100;
    player.happiness = 50;
    
    const item: ItemDef = { id: 'cheap', name: 'Cheap', category: 'junk', store: 'z_mart', basePrice: 20, happinessBonus: 5 };
    
    const result = buyItem(player, item);
    expect(result.success).toBe(true);
    expect(result.updated.money).toBe(80);
    expect(result.updated.happiness).toBe(55);
  });

  it('caps happiness at 100', () => {
    let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
    let player = state.players[0];
    player.money = 100;
    player.happiness = 98;
    
    const item: ItemDef = { id: 'cheap', name: 'Cheap', category: 'junk', store: 'z_mart', basePrice: 20, happinessBonus: 5 };
    
    const result = buyItem(player, item);
    expect(result.updated.happiness).toBe(100);
  });

  describe('food', () => {
    it('adds to fastFoodItems if name implies fast food', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      let player = state.players[0];
      player.money = 100;
      
      const item: ItemDef = { id: 'burger', name: 'Hamburger', category: 'food', store: 'burger_palace', basePrice: 5, happinessBonus: 1 };
      const result = buyItem(player, item);
      
      expect(result.updated.inventory.fastFoodItems.length).toBe(1);
      expect(result.updated.inventory.fastFoodItems[0].itemId).toBe('burger');
    });

    it('adds units to freshFoodUnits if not fast food', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      let player = state.players[0];
      player.money = 100;
      player.inventory.freshFoodUnits = 0;
      
      const item: ItemDef = { id: 'food', name: 'Food for 1 Week', category: 'food', store: 'blacks_market', basePrice: 50, happinessBonus: 1, units: 1 };
      const result = buyItem(player, item);
      
      expect(result.updated.inventory.freshFoodUnits).toBe(1);
    });
  });

  describe('clothes', () => {
    it('adds weeks to the correct clothing type', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      let player = state.players[0];
      player.money = 1000;
      player.inventory.businessClothesWeeks = 0;
      
      const item: ItemDef = { id: 'suit', name: 'Business Suit', category: 'clothes', store: 'qt_clothing', basePrice: 300, happinessBonus: 2, weeks: 13 };
      const result = buyItem(player, item);
      
      expect(result.updated.inventory.businessClothesWeeks).toBe(13);
    });
  });

  describe('appliances', () => {
    it('adds to appliances array', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      let player = state.players[0];
      player.money = 1000;
      
      const item: ItemDef = { id: 'tv', name: 'Color TV', category: 'appliance', store: 'socket_city', basePrice: 300, happinessBonus: 2 };
      const result = buyItem(player, item);
      
      expect(result.updated.inventory.appliances.length).toBe(1);
      expect(result.updated.inventory.appliances[0].id).toBe('tv');
    });
  });

  describe('books', () => {
    it('adds to books array if not already present', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      let player = state.players[0];
      player.money = 1000;
      
      const item: ItemDef = { id: 'dict', name: 'Dictionary', category: 'book', store: 'z_mart', basePrice: 50, happinessBonus: 1 };
      
      let result = buyItem(player, item);
      expect(result.updated.inventory.books.length).toBe(1);
      
      // Buy again
      result = buyItem(result.updated, item);
      expect(result.updated.inventory.books.length).toBe(1); // Should not duplicate
    });
  });

  describe('tickets', () => {
    it('adds lottery tickets by 10', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      let player = state.players[0];
      player.money = 1000;
      
      const item: ItemDef = { id: 'lottery_tickets', name: '10 Lottery Tickets', category: 'ticket', store: 'blacks_market', basePrice: 10, happinessBonus: 2 };
      const result = buyItem(player, item);
      
      expect(result.updated.inventory.lotteryTickets).toBe(10);
    });

    it('adds event tickets by 1', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      let player = state.players[0];
      player.money = 1000;
      
      const item: ItemDef = { id: 'baseball_tickets', name: 'Baseball Tickets', category: 'ticket', store: 'z_mart', basePrice: 10, happinessBonus: 2 };
      const result = buyItem(player, item);
      
      expect(result.updated.inventory.tickets.baseball).toBe(1);
    });
  });
});
