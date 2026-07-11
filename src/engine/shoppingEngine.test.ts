// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buyItem } from './shoppingEngine';
import type { PlayerState } from './gameState';
import type { ItemDef } from './dataLoader';

describe('Shopping Engine', () => {
  const mockFood: ItemDef = {
    id: 'food_1_week',
    name: 'Food for 1 Week',
    category: 'food',
    store: 'blacks_market',
    basePrice: 55,
    happinessBonus: 1,
    units: 1
  };

  const mockBurger: ItemDef = {
    id: 'cheeseburger',
    name: 'Cheeseburger',
    category: 'food',
    subcategory: 'fast_food',
    store: 'monolith_burgers',
    basePrice: 89,
    happinessBonus: 1
  };

  const mockAppliance: ItemDef = {
    id: 'refrigerator',
    name: 'Refrigerator',
    category: 'appliance',
    store: 'socket_city',
    basePrice: 876
  };

  const mockComputer: ItemDef = {
    id: 'computer',
    name: 'Computer',
    category: 'appliance',
    store: 'socket_city',
    basePrice: 1599,
    happinessBonus: 3
  };

  const mockClothes: ItemDef = {
    id: 'casual_clothes',
    name: 'Casual Clothes',
    category: 'clothes',
    subcategory: 'casual',
    store: 'z_mart',
    basePrice: 35,
    weeks: 9
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fails if not enough money', () => {
    const player = { money: 10 } as PlayerState;
    const result = buyItem(player, mockFood);
    expect(result.success).toBe(false);
  });

  it('buys fresh food and grants happiness', () => {
    const player = { money: 100, happiness: 50, inventory: { freshFoodUnits: 0 } } as PlayerState;
    const result = buyItem(player, mockFood);
    expect(result.success).toBe(true);
    expect(result.updated.money).toBe(45);
    expect(result.updated.happiness).toBe(51);
    expect(result.updated.inventory.freshFoodUnits).toBe(1);
  });

  it('buys fast food (burger)', () => {
    const player = { money: 100, happiness: 50, inventory: { fastFoodItems: [] } } as PlayerState;
    const result = buyItem(player, mockBurger);
    expect(result.success).toBe(true);
    expect(result.updated.inventory.fastFoodItems.length).toBe(1);
    expect(result.updated.inventory.fastFoodItems[0].itemId).toBe('cheeseburger');
  });

  it('buys an appliance', () => {
    const player = { money: 1000, happiness: 50, inventory: { appliances: [] } } as PlayerState;
    const result = buyItem(player, mockAppliance);
    expect(result.success).toBe(true);
    expect(result.updated.inventory.appliances.length).toBe(1);
    expect(result.updated.inventory.appliances[0].id).toBe('refrigerator');
  });

  it('buys a computer and gets happiness only once', () => {
    const player = { money: 3500, happiness: 50, inventory: { appliances: [] } } as PlayerState;
    
    // First purchase gives +3 happiness
    const result1 = buyItem(player, mockComputer);
    expect(result1.updated.happiness).toBe(53);
    
    // Second purchase gives no happiness
    const result2 = buyItem(result1.updated, mockComputer);
    expect(result2.updated.happiness).toBe(53); // still 53
  });

  it('buys clothes', () => {
    const player = { money: 100, happiness: 50, inventory: { casualClothesWeeks: 0, dressClothesWeeks: 0, businessClothesWeeks: 0 } } as PlayerState;
    const result = buyItem(player, mockClothes);
    expect(result.success).toBe(true);
    expect(result.updated.inventory.casualClothesWeeks).toBe(9);
  });

  it('auto-equips clothes if rule is on', () => {
    const player = { money: 100, happiness: 50, inventory: { casualClothesWeeks: 0, dressClothesWeeks: 0, businessClothesWeeks: 0, selectedClothes: 'none' } } as PlayerState;
    const rules = { autoEquipBestClothes: true };
    const result = buyItem(player, mockClothes, rules as any);
    expect(result.updated.inventory.selectedClothes).toBe('casual');
  });
});
