import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { loadCampaign, type CampaignBundle } from '../src/engine/dataLoader';
import { buyItem } from '../src/engine/shoppingEngine';
import { handleHospitalCafeteriaAction } from '../src/engine/actions/hospitalActions';
import { handlePrepMealAction } from '../src/engine/actions/homeActions';
import { processTurnStart } from '../src/engine/turnProcessor';
import { ItemCardModal } from '../src/ui/buildings/home/DurableCardModal';
import { PantryDetailsModal } from '../src/ui/buildings/home/PantryDetailsModal';
import { createPlayerState, createDefaultGoalAllotment } from '../src/engine/stateFactories';
import { recalculatePlayerEffects } from '../src/engine/gameState';
import type { PlayerState } from '../src/engine/gameState';

let campaign2000: CampaignBundle;

beforeEach(async () => {
  campaign2000 = await loadCampaign('advanced_2000');
});

function createPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  const p = createPlayerState('p1', 'Player 1', false, createDefaultGoalAllotment(), 'board', campaign2000.config);
  const base = recalculatePlayerEffects(p, campaign2000);
  return {
    ...base,
    money: 500,
    hoursRemaining: 50,
    physicalCondition: 40,
    mentalCondition: 40,
    turnFlags: {
      ...base.turnFlags,
      hasEaten: false,
      caffeineIntake: 0,
      fastFoodMealsThisTurn: 0
    },
    ...overrides
  };
}

describe('Red Pirate Food & Coffee - Engine & Inventory Integration', () => {
  it('purchasing Scurvy Slaw applies -1 Max Physical, +1 Social, marks player fed, and adds to inventory', () => {
    const player = createPlayer({ money: 200, physicalCondition: 50, physicalConditionMax: 50, social: 10 });
    const slaw = campaign2000.items.find(i => i.id === 'scurvy_slaw')!;
    expect(slaw).toBeDefined();

    const result = buyItem(player, slaw, campaign2000.config.gameRules, campaign2000);
    expect(result.success).toBe(true);
    // 1. Max Physical reduced by 1 (-1 Max_Physical on fast food), clamping current physical
    expect(result.updated.physicalConditionMax).toBe(49);
    expect(result.updated.physicalCondition).toBe(49);
    // 2. Social boosted by 1
    expect(result.updated.social).toBe(11);
    // 3. Fed status secured
    expect(result.updated.turnFlags.hasEaten).toBe(true);
    expect(result.updated.nutritionTier).toBe('fast_food');
    // 4. Meal appears in player inventory as fast food
    expect(result.updated.inventory.fastFoodItems.length).toBe(1);
    expect(result.updated.inventory.fastFoodItems[0].itemId).toBe('scurvy_slaw');
  });

  it('purchasing Kraken Burger applies +2 Mental, +1 Social, marks player fed, and adds to inventory', () => {
    const player = createPlayer({ money: 200, mentalCondition: 45, mentalConditionMax: 50, social: 10 });
    const burger = campaign2000.items.find(i => i.id === 'kraken_burger')!;
    expect(burger).toBeDefined();

    const result = buyItem(player, burger, campaign2000.config.gameRules, campaign2000);
    expect(result.success).toBe(true);
    expect(result.updated.mentalCondition).toBe(47);
    expect(result.updated.social).toBe(11);
    expect(result.updated.turnFlags.hasEaten).toBe(true);
    expect(result.updated.inventory.fastFoodItems.length).toBe(1);
    expect(result.updated.inventory.fastFoodItems[0].itemId).toBe('kraken_burger');
  });

  it('Hospital cafeteria meal marks player fed and stores hospital_tray as fast food in inventory (Scrubs)', async () => {
    const scrubs = await loadCampaign('scrubs');
    const player = {
      ...createPlayer({ money: 200, physicalCondition: 45, mentalCondition: 50, currentJobId: 'hospital_orderly' }),
    };
    const context = {
      rules: scrubs.config.gameRules,
      campaign: scrubs,
      economicIndex: 0
    } as any;

    const result = handleHospitalCafeteriaAction(player, { type: 'hospital_cafeteria' }, context);
    expect(result.actionLog.key).toBe('action.hospital.cafeteriaSuccess');
    expect(result.nextPlayer.turnFlags.hasEaten).toBe(true);
    expect(result.nextPlayer.nutritionTier).toBe('fast_food');
    expect(result.nextPlayer.inventory.fastFoodItems.length).toBe(1);
    expect(result.nextPlayer.inventory.fastFoodItems[0].itemId).toBe('hospital_tray');
  });

  it('eating fast food at home from inventory feeds the player and consumes 1 meal', () => {
    const player = createPlayer({
      inventory: {
        freshFoodUnits: 0,
        cannedFoodUnits: 0,
        appliances: [],
        books: [],
        fastFoodItems: [{ itemId: 'scurvy_slaw', happinessBonus: 0 }]
      } as any
    });
    const context = {
      rules: campaign2000.config.gameRules,
      campaign: campaign2000
    } as any;

    const result = handlePrepMealAction(player, { type: 'prep_meal', mealType: 'fast_food' }, context);
    expect(result.nextPlayer.turnFlags.hasEaten).toBe(true);
    expect(result.nextPlayer.inventory.fastFoodItems.length).toBe(0);
    expect(result.actionLog?.key).toBe('action.cook.fast_food');
  });
});

describe('Red Pirate Food & Coffee - Item Card Modal Clean-Up', () => {
  it('inspecting Scurvy Slaw card renders clean stat pills (-1 💪, +1 👥) without duplicate text or mixed labels', () => {
    const player = createPlayer();
    const slaw = campaign2000.items.find(i => i.id === 'scurvy_slaw')!;

    render(
      <ItemCardModal
        item={slaw}
        player={player}
        campaign={campaign2000}
        rules={campaign2000.config.gameRules}
        economicIndex={0}
        mode="shop"
        onClose={vi.fn()}
      />
    );

    // 1. StatModifierPills renders the engine-derived stat pills
    const pills = screen.getByTestId('stat-modifier-pills');
    expect(pills).toBeInTheDocument();
    expect(pills.textContent).toContain('-1');
    expect(pills.textContent).toContain('💪');
    expect(pills.textContent).toContain('+1');
    expect(pills.textContent).toContain('👥');

    // 2. No duplicate raw text "-1 Physical" or mixed "💪 -1 Physical"
    expect(screen.queryByText(/-\b1 Physical\b/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+1 on buy/i)).not.toBeInTheDocument();

    // 3. Fast meal descriptor exists
    expect(screen.getByText(/Fast meal/i)).toBeInTheDocument();
  });

  it('inspecting Fresh Drip Coffee shows 1st-cup Comfort Boost without overdose penalty or duplicate buy text', () => {
    const player = createPlayer({ turnFlags: { hasEaten: false, caffeineIntake: 0, coffeeCupsThisTurn: 0, fastFoodMealsThisTurn: 0 } });
    const dripCoffee = campaign2000.items.find(i => i.id === 'drip_coffee')!;

    render(
      <ItemCardModal
        item={dripCoffee}
        player={player}
        campaign={campaign2000}
        rules={campaign2000.config.gameRules}
        economicIndex={0}
        mode="shop"
        onClose={vi.fn()}
      />
    );

    // 1. Stat pills show 1st-cup +1 💪 and +2 🧠 without any Max penalty
    const pills = screen.getByTestId('stat-modifier-pills');
    expect(pills).toBeInTheDocument();
    expect(pills.textContent).toContain('+1');
    expect(pills.textContent).toContain('💪');
    expect(pills.textContent).toContain('+2');
    expect(pills.textContent).toContain('🧠');
    expect(pills.textContent).not.toContain('Max 💪');

    // 2. Drinks immediately badge is shown
    expect(screen.getByText(/Drinks immediately \(Not food\)/i)).toBeInTheDocument();

    // 3. No redundant "+2 on buy" text underneath pills
    expect(screen.queryByText(/\+2 on buy/i)).not.toBeInTheDocument();
  });
});

describe('Pantry Details Modal - Fast Food Takeout Display', () => {
  it('displays fast food takeout and Hospital Cafeteria meal with pretty name and 1-click eat button', () => {
    const player = createPlayer({
      inventory: {
        freshFoodUnits: 0,
        cannedFoodUnits: 0,
        appliances: [],
        books: [],
        fastFoodItems: [
          { itemId: 'scurvy_slaw', happinessBonus: 0 },
          { itemId: 'hospital_tray', happinessBonus: 0 }
        ]
      } as any
    });

    const handleAction = vi.fn().mockResolvedValue({ key: 'action.cook.fast_food' });

    render(
      <PantryDetailsModal
        player={player}
        campaign={campaign2000}
        rules={campaign2000.config.gameRules}
        onClose={vi.fn()}
        onAction={handleAction}
      />
    );

    // 1. Shows Fast Food Takeout header and both items
    expect(screen.getByText(/Fast Food Takeout:/i)).toBeInTheDocument();
    expect(screen.getByText(/Scurvy Slaw/i)).toBeInTheDocument();
    expect(screen.getByText(/Hospital Cafeteria Meal/i)).toBeInTheDocument();

    // 2. Does NOT show "Pantry is empty" warning when player has takeout
    expect(screen.queryByText(/Pantry is empty/i)).not.toBeInTheDocument();

    // 3. Does NOT show Eat Takeout button in Weekly Meal Prep (fast food is consumed on purchase, not at home)
    expect(screen.queryByTestId('btn-cook-fast-food')).not.toBeInTheDocument();
  });

  it('clears fastFoodItems across turn transition even when player has a fridge and already ate', () => {
    const basePlayer = createPlayer();
    const player = createPlayer({
      turnFlags: {
        ...basePlayer.turnFlags,
        hasEaten: true,
        caffeineIntake: 0,
        fastFoodMealsThisTurn: 1
      },
      activeEffects: { set_food_storage: 6 },
      inventory: {
        ...basePlayer.inventory,
        appliances: ['refrigerator'],
        fastFoodItems: [{ itemId: 'kraken_burger', happinessBonus: 0 }]
      }
    });

    const nextState = processTurnStart(
      {
        turn: 1,
        players: [player],
        economicIndex: 100,
        rules: campaign2000.config.gameRules,
        pawnShopItemsForSale: [],
        rngState: 42,
        phase: 'playing'
      },
      campaign2000
    );

    expect(nextState.players[0].inventory.fastFoodItems).toEqual([]);
  });
});
