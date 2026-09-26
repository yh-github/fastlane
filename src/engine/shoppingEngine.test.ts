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
    expect(result.updated.inventory.appliances[0].condition).toBe('new');
  });

  it('buys a computer and gets happiness only once', () => {
    const player = { money: 3500, happiness: 50, inventory: { appliances: [] } } as PlayerState;
    
    // First purchase gives +3 happiness
    const result1 = buyItem(player, mockComputer);
    expect(result1.updated.happiness).toBe(53);
    expect(result1.updated.inventory.appliances[0].condition).toBe('new');
    
    // Second purchase gives no happiness and fails because computer is already owned
    const result2 = buyItem(result1.updated, mockComputer);
    expect(result2.success).toBe(false);
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

  describe('Microwave Purchase Happiness', () => {
    const socketCityMicrowave: ItemDef = {
      id: 'microwave',
      name: 'Microwave',
      category: 'appliance',
      store: 'socket_city',
      basePrice: 330,
      happinessBonus: 1
    };

    const zMartMicrowave: ItemDef = {
      id: 'microwave',
      name: 'Microwave',
      category: 'appliance',
      store: 'z_mart',
      basePrice: 220,
      happinessBonus: 1
    };

    it('grants +2 happiness when purchased at Socket City if not owned', () => {
      const player = { money: 500, happiness: 50, inventory: { appliances: [] } } as PlayerState;
      const result = buyItem(player, socketCityMicrowave);
      expect(result.success).toBe(true);
      expect(result.updated.happiness).toBe(52);
    });

    it('grants +1 happiness when purchased at Z-Mart if not owned', () => {
      const player = { money: 500, happiness: 50, inventory: { appliances: [] } } as PlayerState;
      const result = buyItem(player, zMartMicrowave);
      expect(result.success).toBe(true);
      expect(result.updated.happiness).toBe(51);
    });

    it('grants 0 happiness on subsequent microwave purchases', () => {
      const player = {
        money: 1000,
        happiness: 50,
        inventory: {
          appliances: [{ id: 'microwave', purchasePrice: 220, purchaseSource: 'z_mart' }]
        }
      } as PlayerState;

      const result = buyItem(player, socketCityMicrowave);
      expect(result.success).toBe(true);
      expect(result.updated.happiness).toBe(50); // No additional happiness
    });
  });

  describe('Clothes Purchase Happiness at QT Clothing', () => {
    const qtDressClothes: ItemDef = {
      id: 'dress_clothes',
      name: 'Dress Clothes',
      category: 'clothes',
      subcategory: 'dress',
      store: 'qt_clothing',
      basePrice: 125,
      happinessBonus: 0
    };

    const zMartDressClothes: ItemDef = {
      id: 'dress_clothes',
      name: 'Dress Clothes',
      category: 'clothes',
      subcategory: 'dress',
      store: 'z_mart',
      basePrice: 90,
      happinessBonus: 0
    };

    it('grants +1 happiness when dress clothes are bought at QT Clothing', () => {
      const player = { money: 500, happiness: 50, inventory: { dressClothesWeeks: 0 } } as unknown as PlayerState;
      const result = buyItem(player, qtDressClothes);
      expect(result.success).toBe(true);
      expect(result.updated.happiness).toBe(51);
    });

    it('grants 0 happiness when dress clothes are bought at Z-Mart', () => {
      const player = { money: 500, happiness: 50, inventory: { dressClothesWeeks: 0 } } as unknown as PlayerState;
      const result = buyItem(player, zMartDressClothes);
      expect(result.success).toBe(true);
      expect(result.updated.happiness).toBe(50);
    });
  });

  describe('Fast Food Social & Time Cost', () => {
    it('grants +1 Social and costs 0 hours on first fast food purchase of the turn', () => {
      const player = {
        money: 100,
        social: 15,
        hoursRemaining: 30,
        inventory: { fastFoodItems: [] },
        turnFlags: { fastFoodMealsThisTurn: 0 }
      } as unknown as PlayerState;

      const result = buyItem(player, mockBurger);
      expect(result.success).toBe(true);
      expect(result.updated.social).toBe(16); // +1 Social
      expect(result.updated.hoursRemaining).toBe(30); // 0 hours spent on 1st buy
      expect(result.updated.turnFlags.fastFoodMealsThisTurn).toBe(1);
    });

    it('grants +1 Social and consumes 1 hour on 2nd fast food purchase of the turn', () => {
      const player = {
        money: 100,
        social: 16,
        hoursRemaining: 30,
        inventory: { fastFoodItems: [{ itemId: 'cheeseburger' }] },
        turnFlags: { fastFoodMealsThisTurn: 1 }
      } as unknown as PlayerState;

      const result = buyItem(player, mockBurger);
      expect(result.success).toBe(true);
      expect(result.updated.social).toBe(17); // +1 Social
      expect(result.updated.hoursRemaining).toBe(29); // 1 hour spent on 2nd buy
      expect(result.updated.turnFlags.fastFoodMealsThisTurn).toBe(2);
    });

    it('fails to buy 2nd fast food if player has 0 hours remaining', () => {
      const player = {
        money: 100,
        social: 16,
        hoursRemaining: 0,
        inventory: { fastFoodItems: [{ itemId: 'cheeseburger' }] },
        turnFlags: { fastFoodMealsThisTurn: 1 }
      } as unknown as PlayerState;

      const result = buyItem(player, mockBurger);
      expect(result.success).toBe(false);
      expect(result.message.key).toBe('action.error.notEnoughTimeBuy');
      expect(result.updated.money).toBe(100);
    });
  });
});
