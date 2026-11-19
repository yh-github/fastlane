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
    happinessBonus: 1,
    effects: [{ trigger: 'on_purchase', stat: 'social', value: 1 }]
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
    it('grants +1 Social and costs 0 hours on first fast food purchase of the turn when trackSocial is enabled', () => {
      const player = {
        money: 100,
        social: 15,
        hoursRemaining: 30,
        inventory: { fastFoodItems: [] },
        turnFlags: { fastFoodMealsThisTurn: 0 }
      } as unknown as PlayerState;

      const result = buyItem(player, mockBurger, { trackSocial: true });
      expect(result.success).toBe(true);
      expect(result.updated.social).toBe(16); // +1 Social
      expect(result.updated.hoursRemaining).toBe(30); // 0 hours spent on 1st buy
      expect(result.updated.turnFlags.fastFoodMealsThisTurn).toBe(1);
    });

    it('does NOT track social when trackSocial is disabled (base mode)', () => {
      const player = {
        money: 100,
        social: 15,
        hoursRemaining: 30,
        inventory: { fastFoodItems: [] },
        turnFlags: { fastFoodMealsThisTurn: 0 }
      } as unknown as PlayerState;

      const result = buyItem(player, mockBurger);
      expect(result.success).toBe(true);
      expect(result.updated.social).toBe(15); // Unchanged in base mode
      expect(result.updated.hoursRemaining).toBe(30);
    });

    it('grants +1 Social and consumes 1 hour on 2nd fast food purchase of the turn', () => {
      const player = {
        money: 100,
        social: 16,
        hoursRemaining: 30,
        inventory: { fastFoodItems: [{ itemId: 'cheeseburger' }] },
        turnFlags: { fastFoodMealsThisTurn: 1 }
      } as unknown as PlayerState;

      const result = buyItem(player, mockBurger, { trackSocial: true });
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

      const result = buyItem(player, mockBurger, { trackSocial: true });
      expect(result.success).toBe(false);
      expect(result.message.key).toBe('action.error.notEnoughTimeBuy');
      expect(result.updated.money).toBe(100);
    });

    it('does NOT consume time on 2nd fast food purchase in base mode (trackSocial disabled)', () => {
      const player = {
        money: 100,
        social: 15,
        hoursRemaining: 30,
        inventory: { fastFoodItems: [{ itemId: 'cheeseburger' }] },
        turnFlags: { fastFoodMealsThisTurn: 1 }
      } as unknown as PlayerState;

      const result = buyItem(player, mockBurger);
      expect(result.success).toBe(true);
      expect(result.updated.social).toBe(15);
      expect(result.updated.hoursRemaining).toBe(30); // 0 hours spent on 2nd buy in base mode
    });

    it('succeeds to buy 2nd fast food in base mode even if player has 0 hours remaining', () => {
      const player = {
        money: 100,
        social: 15,
        hoursRemaining: 0,
        inventory: { fastFoodItems: [{ itemId: 'cheeseburger' }] },
        turnFlags: { fastFoodMealsThisTurn: 1 }
      } as unknown as PlayerState;

      const result = buyItem(player, mockBurger);
      expect(result.success).toBe(true);
      expect(result.updated.hoursRemaining).toBe(0);
    });

    it('does NOT consume time on 2nd fast food purchase if item lacks social modifier even with trackSocial enabled', () => {
      const mockPlainBurger: ItemDef = {
        id: 'plain_burger',
        name: 'Plain Burger',
        category: 'food',
        subcategory: 'fast_food',
        store: 'monolith_burgers',
        basePrice: 50,
        happinessBonus: 1
      };

      const player = {
        money: 100,
        social: 15,
        hoursRemaining: 0,
        inventory: { fastFoodItems: [{ itemId: 'plain_burger' }] },
        turnFlags: { fastFoodMealsThisTurn: 1 }
      } as unknown as PlayerState;

      const result = buyItem(player, mockPlainBurger, { trackSocial: true });
      expect(result.success).toBe(true);
      expect(result.updated.hoursRemaining).toBe(0);
    });

    it('supports fast food card eatMode choices: quick (0h, minimal nutrition) vs dine_in (1h, full bonuses)', () => {
      const meal: ItemDef = {
        id: 'kraken_burger',
        name: 'Kraken Double Melt',
        category: 'food',
        subcategory: 'fast_food',
        basePrice: 120,
        happinessBonus: 0,
        mentalBonus: 2,
        effects: [
          { trigger: 'on_purchase', stat: 'physical_max', value: -1 },
          { trigger: 'on_purchase', stat: 'physical', value: 2 },
          { trigger: 'on_purchase', stat: 'social', value: 1 }
        ]
      };

      const rules = { usePhysicalMentalConditions: true, trackSocial: true, enableCookingSystem: true };

      // 1. Grab & Go ('quick'): 0h time, feeds player, -1 Max Phys, skips positive Phys/Mental/Social bonuses
      const quickPlayer = {
        money: 200,
        hoursRemaining: 0,
        physicalCondition: 40,
        physicalConditionMax: 50,
        mentalCondition: 40,
        mentalConditionMax: 50,
        social: 15,
        inventory: { fastFoodItems: [] },
        turnFlags: { fastFoodMealsThisTurn: 0 }
      } as unknown as PlayerState;

      const quickRes = buyItem(quickPlayer, meal, rules, undefined, 1, 'quick');
      expect(quickRes.success).toBe(true);
      expect(quickRes.updated.hoursRemaining).toBe(0);
      expect(quickRes.updated.turnFlags.hasEaten).toBe(true);
      expect(quickRes.updated.physicalConditionMax).toBe(49);
      expect(quickRes.updated.physicalCondition).toBe(40); // No +2 bonus
      expect(quickRes.updated.mentalCondition).toBe(40); // No +2 bonus
      expect(quickRes.updated.social).toBe(15); // No +1 bonus

      // 2. Sit-Down ('dine_in'): requires and spends 1h, grants full +2 Phys, +2 Mental, +1 Social + -1 Max Phys
      const dinePlayer = {
        ...quickPlayer,
        hoursRemaining: 5
      } as unknown as PlayerState;

      const dineRes = buyItem(dinePlayer, meal, rules, undefined, 1, 'dine_in');
      expect(dineRes.success).toBe(true);
      expect(dineRes.updated.hoursRemaining).toBe(4);
      expect(dineRes.updated.turnFlags.hasEaten).toBe(true);
      expect(dineRes.updated.physicalConditionMax).toBe(49);
      expect(dineRes.updated.physicalCondition).toBe(42);
      expect(dineRes.updated.mentalCondition).toBe(42);
      expect(dineRes.updated.social).toBe(16);

      // 3. Sit-Down fails cleanly when < 1h remaining
      const noTimeDine = buyItem(quickPlayer, meal, rules, undefined, 1, 'dine_in');
      expect(noTimeDine.success).toBe(false);
      expect(noTimeDine.message.key).toBe('action.error.notEnoughTimeBuy');
    });
  });

  describe('Clothes Purchasing & Durability', () => {
    it('applies custom weeks durability from item definition', () => {
      const player = {
        money: 500,
        inventory: { casualClothesWeeks: 0, dressClothesWeeks: 0, businessClothesWeeks: 0 },
        turnFlags: {}
      } as unknown as PlayerState;

      // Used Casual Clothes: 7 weeks
      const usedCasual: ItemDef = {
        id: 'casual_clothes',
        name: 'Used Casual Clothes',
        category: 'clothes',
        subcategory: 'casual',
        basePrice: 35,
        weeks: 7
      };
      const r1 = buyItem(player, usedCasual);
      expect(r1.success).toBe(true);
      expect(r1.updated.money).toBe(465);
      expect(r1.updated.inventory.casualClothesWeeks).toBe(7);

      // Used Business Suit: 3 weeks
      const usedSuit: ItemDef = {
        id: 'business_suit',
        name: 'Used Business Suit',
        category: 'clothes',
        subcategory: 'business',
        basePrice: 100,
        weeks: 3
      };
      const r2 = buyItem(r1.updated, usedSuit);
      expect(r2.success).toBe(true);
      expect(r2.updated.money).toBe(365);
      expect(r2.updated.inventory.businessClothesWeeks).toBe(3);
    });
  });
});
