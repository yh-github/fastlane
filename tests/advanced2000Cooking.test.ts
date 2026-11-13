import { describe, it, expect, beforeEach } from 'vitest';
import { loadCampaign, type CampaignBundle } from '../src/engine/dataLoader';
import { createPlayerState, createDefaultGoalAllotment } from '../src/engine/stateFactories';
import { gameReducer } from '../src/engine/gameReducer';
import { recalculatePlayerEffects, isPlayerFed } from '../src/engine/gameState';
import { processAdvancedHealthAndFood } from '../src/engine/turn/healthAndFoodPhase';
import { processTurnStart } from '../src/engine/turnProcessor';
import { buyItem } from '../src/engine/shoppingEngine';
import { buildDashboardBadges } from '../src/ui/dashboardBadges';
import { getHudAttributeInfo } from '../src/ui/hudAttributeInfo';
import { Random } from '../src/utils/rng';
import type { GameState, PlayerState } from '../src/engine/gameState';
import type { ReducerContext } from '../src/engine/actions/types';

describe('Advanced 2000 - Cooking Module', () => {
  let campaign2000: CampaignBundle;
  let campaignFloppy: CampaignBundle;

  beforeEach(async () => {
    campaign2000 = await loadCampaign('advanced_2000');
    campaignFloppy = await loadCampaign('1990_classic_floppy');
  });

  function createTestContext(player: PlayerState, campaign: CampaignBundle): { state: GameState; context: ReducerContext } {
    const state: GameState = {
      gameId: 'test-cooking',
      turn: 1,
      currentPlayerIndex: 0,
      players: [player],
      activeEffects: {},
      rules: campaign.config.gameRules,
      messages: [],
      economicIndex: 0,
      bank: { currentSavingsRate: 0.05, currentLoanRate: 0.1 },
      stocks: []
    };

    const context: ReducerContext = {
      campaign,
      rules: campaign.config.gameRules,
      turn: 1,
      economicIndex: 0,
      rng: new Random(42),
      state
    };

    return { state, context };
  }

  function makePlayer(campaign: CampaignBundle): PlayerState {
    const p = createPlayerState('p1', 'Player 1', false, createDefaultGoalAllotment(), 'board', campaign.config);
    return recalculatePlayerEffects(p, campaign);
  }

  describe('Campaign Config & Rule Gating', () => {
    it('enables enableCookingSystem in advanced_2000 config', () => {
      expect(campaign2000.config.gameRules.enableCookingSystem).toBe(true);
    });

    it('does not enable enableCookingSystem in classic campaigns', () => {
      expect(campaignFloppy.config.gameRules.enableCookingSystem).toBeFalsy();
    });
  });

  describe('Fixing the Infinite Can Exploit', () => {
    it('in advanced_2000: possessing a can in cupboard without prepping/eating causes Unfed Relaxing', () => {
      let player = makePlayer(campaign2000);
      player.currentHousingId = 'low_cost';
      player.hoursRemaining = 50;
      player.physicalCondition = 40;
      player.physicalConditionMax = 65;
      player.mentalCondition = 40;
      player.mentalConditionMax = 65;
      player.inventory.cannedFoodUnits = 1; // Owns a can, but hasn't prepped/eaten it!
      player.turnFlags.hasEaten = false;

      const { context } = createTestContext(player, campaign2000);
      const result = gameReducer(player, { type: 'relax' }, context);
      const p = result.updatedPlayer;

      // Exploit killed: Relaxing unfed applies penalties
      expect(p.physicalConditionMax).toBe(64); // -1 Max Physical penalty
      expect(p.mentalConditionMax).toBe(64); // -1 Max Mental penalty
      expect(p.inventory.cannedFoodUnits).toBe(1); // Can wasn't consumed by relaxing
    });

    it('in classic floppy: possessing food still gives classic fed relaxing', () => {
      let player = makePlayer(campaignFloppy);
      player.hoursRemaining = 50;
      player.inventory.cannedFoodUnits = 1;
      player.happiness = 50;

      const { context } = createTestContext(player, campaignFloppy);
      const result = gameReducer(player, { type: 'relax' }, context);
      const p = result.updatedPlayer;

      expect(p.happiness).toBeGreaterThan(50);
    });
  });

  describe('Weekly Meal Prep: Home Cooking (Stove & Microwave)', () => {
    it('requires a working stove to cook home meal', () => {
      let player = makePlayer(campaign2000);
      player.hoursRemaining = 50;
      player.inventory.freshFoodUnits = 2;
      player.inventory.appliances = []; // No stove!

      const { context } = createTestContext(player, campaign2000);
      const result = gameReducer(player, { type: 'prep_meal', mealType: 'home_cooked' }, context);
      const p = result.updatedPlayer;

      expect(p.turnFlags.hasEaten).toBe(false);
      expect(p.inventory.freshFoodUnits).toBe(2);
    });

    it('requires fresh groceries to cook home meal', () => {
      let player = makePlayer(campaign2000);
      player.hoursRemaining = 50;
      player.inventory.freshFoodUnits = 0; // No fresh groceries
      player.inventory.appliances = [{ id: 'stove', purchasePrice: 490, condition: 'new' }];

      const { context } = createTestContext(player, campaign2000);
      const result = gameReducer(player, { type: 'prep_meal', mealType: 'home_cooked' }, context);
      const p = result.updatedPlayer;

      expect(p.turnFlags.hasEaten).toBe(false);
    });

    it('safeguards against death spiral: prevents cooking if Physical < 1.5', () => {
      let player = makePlayer(campaign2000);
      player.hoursRemaining = 50;
      player.inventory.freshFoodUnits = 2;
      player.inventory.appliances = [{ id: 'stove', purchasePrice: 490, condition: 'new' }];
      player.physicalCondition = 1.0; // Exhausted!

      const { context } = createTestContext(player, campaign2000);
      const result = gameReducer(player, { type: 'prep_meal', mealType: 'home_cooked' }, context);
      const p = result.updatedPlayer;

      // Prevented from cooking to avoid health collapse
      expect(p.turnFlags.hasEaten).toBe(false);
      expect(p.physicalCondition).toBe(1.0);
      expect(p.inventory.freshFoodUnits).toBe(2);
    });

    it('successfully cooks home meal on stove: costs 2.5h, 1.0 Physical, yields net +1.5 Physical, +2.0 Mental, +2 Mess', () => {
      let player = makePlayer(campaign2000);
      player.hoursRemaining = 50;
      player.inventory.freshFoodUnits = 2;
      player.inventory.appliances = [
        { id: 'stove', purchasePrice: 490, condition: 'new' },
        { id: 'refrigerator', purchasePrice: 650, condition: 'new' }
      ];
      player.physicalCondition = 30;
      player.physicalConditionMax = 65;
      player.mentalCondition = 30;
      player.mentalConditionMax = 65;
      player.mess = 0;

      const { context } = createTestContext(player, campaign2000);
      const result = gameReducer(player, { type: 'prep_meal', mealType: 'home_cooked' }, context);
      const p = result.updatedPlayer;

      expect(p.hoursRemaining).toBe(47.5); // 50 - 2.5h
      expect(p.inventory.freshFoodUnits).toBe(1); // 1 consumed
      expect(p.mess).toBe(2); // +2 mess produced
      // Physical: 30 - 1.0 (prep labor) + 2.5 (eat nourishment) = 31.5 (net +1.5)
      expect(p.physicalCondition).toBe(31.5);
      // Mental: 30 + 2.0 = 32.0
      expect(p.mentalCondition).toBe(32);
      expect(p.turnFlags.hasEaten).toBe(true);
      expect(p.nutritionTier).toBe('home_cooked');
    });

    it('microwave synergy: cuts home cooking time to 1.5h and mess to +1', () => {
      let player = makePlayer(campaign2000);
      player.hoursRemaining = 50;
      player.inventory.freshFoodUnits = 2;
      player.inventory.appliances = [
        { id: 'stove', purchasePrice: 490, condition: 'new' },
        { id: 'refrigerator', purchasePrice: 650, condition: 'new' },
        { id: 'microwave', purchasePrice: 220, condition: 'new' }
      ];
      player.physicalCondition = 30;
      player.mentalCondition = 30;
      player.mess = 0;

      const { context } = createTestContext(player, campaign2000);
      const result = gameReducer(player, { type: 'prep_meal', mealType: 'home_cooked' }, context);
      const p = result.updatedPlayer;

      expect(p.hoursRemaining).toBe(48.5); // 50 - 1.5h (1 hour saved by microwave!)
      expect(p.mess).toBe(1); // only +1 mess with microwave!
      expect(p.turnFlags.hasEaten).toBe(true);
    });
  });

  describe('Standalone Freezer & Microwave Defrost Synergy', () => {
    it('activates standalone_freezer synergy: provides 6 storage units without refrigerator', () => {
      let player = makePlayer(campaign2000);
      player.inventory.appliances = [{ id: 'freezer', purchasePrice: 513, condition: 'new' }];
      player = recalculatePlayerEffects(player, campaign2000);

      // Verify activeEffects has set_food_storage: 6
      expect(player.activeEffects['set_food_storage']).toBe(6);

      player.inventory.freshFoodUnits = 6;
      player.turnFlags.hasEaten = true; // Already ate so no food consumed

      const { state } = createTestContext(player, campaign2000);
      const preRobberyStorage = player.activeEffects['set_food_storage'] || 0;
      // Process end of turn food phase
      const after = processAdvancedHealthAndFood(player, state, campaign2000, new Random(1), undefined, preRobberyStorage);

      // With standalone freezer, 6 fresh food units do NOT spoil!
      expect(after.inventory.freshFoodUnits).toBe(6);
    });

    it('freezer without fridge or microwave incurs +1.0h thawing penalty (3.5h total)', () => {
      let player = makePlayer(campaign2000);
      player.hoursRemaining = 50;
      player.inventory.freshFoodUnits = 2;
      player.inventory.appliances = [
        { id: 'stove', purchasePrice: 490, condition: 'new' },
        { id: 'freezer', purchasePrice: 513, condition: 'new' }
        // No fridge, no microwave
      ];
      player.physicalCondition = 30;

      const { context } = createTestContext(player, campaign2000);
      const result = gameReducer(player, { type: 'prep_meal', mealType: 'home_cooked' }, context);
      const p = result.updatedPlayer;

      // Base 2.5h + 1.0h thaw delay = 3.5h
      expect(p.hoursRemaining).toBe(46.5);
      expect(p.turnFlags.hasEaten).toBe(true);
    });

    it('microwave eliminates freezer thaw penalty and cuts cooking time to 1.5h', () => {
      let player = makePlayer(campaign2000);
      player.hoursRemaining = 50;
      player.inventory.freshFoodUnits = 2;
      player.inventory.appliances = [
        { id: 'stove', purchasePrice: 490, condition: 'new' },
        { id: 'freezer', purchasePrice: 513, condition: 'new' },
        { id: 'microwave', purchasePrice: 220, condition: 'new' }
      ];
      player.physicalCondition = 30;

      const { context } = createTestContext(player, campaign2000);
      const result = gameReducer(player, { type: 'prep_meal', mealType: 'home_cooked' }, context);
      const p = result.updatedPlayer;

      // Instant microwave defrost + prep boost = 1.5h
      expect(p.hoursRemaining).toBe(48.5);
      expect(p.turnFlags.hasEaten).toBe(true);
    });
  });

  describe('Weekly Meal Prep: Microwave & Cold Groceries (No Stove Required)', () => {
    it('heats fresh groceries in microwave: 1.0h, 0 Physical labor, +1 mess, yields +0.5 Physical, +1.0 Mental', () => {
      let player = makePlayer(campaign2000);
      player.hoursRemaining = 50;
      player.inventory.freshFoodUnits = 2;
      player.inventory.appliances = [
        { id: 'microwave', purchasePrice: 220, condition: 'new' } // No stove!
      ];
      player.physicalCondition = 30;
      player.physicalConditionMax = 65;
      player.mentalCondition = 30;
      player.mentalConditionMax = 65;
      player.mess = 0;

      const { context } = createTestContext(player, campaign2000);
      const result = gameReducer(player, { type: 'prep_meal', mealType: 'microwave' }, context);
      const p = result.updatedPlayer;

      expect(p.turnFlags.hasEaten).toBe(true);
      expect(p.turnFlags.mealPreparedThisTurn).toBe('microwave');
      expect(p.nutritionTier).toBe('microwave');
      expect(p.hoursRemaining).toBe(49.0); // 1.0h deducted
      expect(p.inventory.freshFoodUnits).toBe(1); // 1 consumed
      expect(p.physicalCondition).toBe(30.5); // +0.5 Physical
      expect(p.mentalCondition).toBe(31.0); // +1.0 Mental
      expect(p.mess).toBe(1); // +1 mess
    });

    it('requires a microwave appliance to use microwave meal prep', () => {
      let player = makePlayer(campaign2000);
      player.hoursRemaining = 50;
      player.inventory.freshFoodUnits = 2;
      player.inventory.appliances = []; // No microwave!

      const { context } = createTestContext(player, campaign2000);
      const result = gameReducer(player, { type: 'prep_meal', mealType: 'microwave' }, context);
      const p = result.updatedPlayer;

      expect(p.turnFlags.hasEaten).toBe(false);
      expect(p.inventory.freshFoodUnits).toBe(2);
    });

    it('eats cold groceries (sandwich/salad) with zero appliances: 0.5h, 0 Physical, 0 mess, yields +0.5 Mental and feeds player', () => {
      let player = makePlayer(campaign2000);
      player.hoursRemaining = 50;
      player.inventory.freshFoodUnits = 1;
      player.inventory.appliances = []; // Zero appliances!
      player.physicalCondition = 20;
      player.mentalCondition = 30;
      player.mess = 0;

      const { context } = createTestContext(player, campaign2000);
      const result = gameReducer(player, { type: 'prep_meal', mealType: 'cold_meal' }, context);
      const p = result.updatedPlayer;

      expect(p.turnFlags.hasEaten).toBe(true);
      expect(p.turnFlags.mealPreparedThisTurn).toBe('cold_meal');
      expect(p.nutritionTier).toBe('cold_meal');
      expect(p.hoursRemaining).toBe(49.5); // 0.5h deducted
      expect(p.inventory.freshFoodUnits).toBe(0); // 1 consumed
      expect(p.physicalCondition).toBe(20); // 0 Physical cost / gain
      expect(p.mentalCondition).toBe(30.5); // +0.5 Mental
      expect(p.mess).toBe(0); // 0 mess
    });

    it('unlocks fed relaxing after preparing a cold meal or microwave meal', () => {
      let player = makePlayer(campaign2000);
      player.hoursRemaining = 50;
      player.inventory.freshFoodUnits = 1;
      player.inventory.appliances = [];
      player.physicalCondition = 40;
      player.physicalConditionMax = 65;
      player.mentalCondition = 40;
      player.mentalConditionMax = 65;

      const { context } = createTestContext(player, campaign2000);
      // 1. Prepare cold meal
      const cookResult = gameReducer(player, { type: 'prep_meal', mealType: 'cold_meal' }, context);
      expect(cookResult.updatedPlayer.turnFlags.hasEaten).toBe(true);

      // 2. Relax
      const relaxResult = gameReducer(cookResult.updatedPlayer, { type: 'relax' }, context);
      const p = relaxResult.updatedPlayer;

      // Unlocks fed relaxing: no starvation penalties, condition max intact
      expect(p.physicalConditionMax).toBe(65);
      expect(p.mentalConditionMax).toBe(65);
      expect(p.physicalCondition).toBeGreaterThan(40);
    });
  });

  describe('Weekly Meal Prep: Canned Food (Low Effort Survival Fallback)', () => {
    it('heats canned rations: costs 1.0h without microwave, 0.0 Physical, produces +1 mess, lowers Mental by 1.5', () => {
      let player = makePlayer(campaign2000);
      player.hoursRemaining = 50;
      player.inventory.cannedFoodUnits = 2;
      player.physicalCondition = 1.0; // Exhausted
      player.mentalCondition = 40;
      player.mess = 0;

      const { context } = createTestContext(player, campaign2000);
      const result = gameReducer(player, { type: 'prep_meal', mealType: 'canned' }, context);
      const p = result.updatedPlayer;

      expect(p.hoursRemaining).toBe(49.0); // 1 hour prep
      expect(p.physicalCondition).toBe(1.0); // 0 Physical cost: safe from exhaustion!
      expect(p.mentalCondition).toBe(38.5); // -1.5 Mental (salty mystery meat)
      expect(p.mess).toBe(1);
      expect(p.inventory.cannedFoodUnits).toBe(1);
      expect(p.turnFlags.hasEaten).toBe(true);
      expect(p.consecutiveCannedWeeks).toBe(1);
    });

    it('microwave cuts canned prep time to 0.5h and produces 0 mess', () => {
      let player = makePlayer(campaign2000);
      player.hoursRemaining = 50;
      player.inventory.cannedFoodUnits = 2;
      player.inventory.appliances = [{ id: 'microwave', purchasePrice: 220, condition: 'new' }];
      player.mess = 0;

      const { context } = createTestContext(player, campaign2000);
      const result = gameReducer(player, { type: 'prep_meal', mealType: 'canned' }, context);
      const p = result.updatedPlayer;

      expect(p.hoursRemaining).toBe(49.5); // 0.5h
      expect(p.mess).toBe(0); // 0 mess
      expect(p.turnFlags.hasEaten).toBe(true);
    });

    it('eating canned food multiple weeks in a row degrades physicalConditionMax by 1', () => {
      let player = makePlayer(campaign2000);
      player.hoursRemaining = 50;
      player.inventory.cannedFoodUnits = 2;
      player.physicalConditionMax = 65;
      player.consecutiveCannedWeeks = 1; // Already lived on canned rations last week

      const { context } = createTestContext(player, campaign2000);
      const result = gameReducer(player, { type: 'prep_meal', mealType: 'canned' }, context);
      const p = result.updatedPlayer;

      expect(p.physicalConditionMax).toBe(64); // Malnutrition penalty applied!
      expect(p.consecutiveCannedWeeks).toBe(2);
    });
  });

  describe('Weekly Meal Prep: Fast Food', () => {
    it('consumes fast food meal at home: 0h, 0 Physical, +1 Mental, +1 Social', () => {
      let player = makePlayer(campaign2000);
      player.hoursRemaining = 50;
      player.inventory.fastFoodItems = [{ itemId: 'kraken_burger', happinessBonus: 0 }];
      player.mentalCondition = 30;
      player.social = 10;
      player.consecutiveCannedWeeks = 3;

      const { context } = createTestContext(player, campaign2000);
      const result = gameReducer(player, { type: 'prep_meal', mealType: 'fast_food' }, context);
      const p = result.updatedPlayer;

      expect(p.hoursRemaining).toBe(50); // 0h
      expect(p.inventory.fastFoodItems.length).toBe(0);
      expect(p.mentalCondition).toBe(31); // +1 Mental
      expect(p.social).toBe(11); // +1 Social
      expect(p.turnFlags.hasEaten).toBe(true);
      expect(p.consecutiveCannedWeeks).toBe(0); // Resets canned streak!
    });
  });

  describe('Relaxing Fed after Cooking', () => {
    it('cooking home meal unlocks full Fed Relaxing and Max Physical rehabilitation', () => {
      let player = makePlayer(campaign2000);
      player.currentHousingId = 'low_cost';
      player.hoursRemaining = 50;
      player.inventory.freshFoodUnits = 1;
      player.inventory.appliances = [{ id: 'stove', purchasePrice: 490, condition: 'new' }];
      player.physicalCondition = 50;
      player.physicalConditionMax = 50; // Damaged max (global max is 65)
      player.mentalCondition = 50;
      player.mentalConditionMax = 65;

      const { context } = createTestContext(player, campaign2000);
      // 1. Cook meal
      const resultAfterCook = gameReducer(player, { type: 'prep_meal', mealType: 'home_cooked' }, context);
      expect(resultAfterCook.updatedPlayer.turnFlags.hasEaten).toBe(true);

      // 2. Relax at home
      const resultAfterRelax = gameReducer(resultAfterCook.updatedPlayer, { type: 'relax' }, context);
      const p = resultAfterRelax.updatedPlayer;

      // Relaxing at full health while Fed rehabilitates physicalConditionMax!
      expect(p.physicalConditionMax).toBeGreaterThan(50);
    });
  });

  describe('End-of-Turn Deductions & Spoilage', () => {
    it('does not double-deduct food units at turn end if player already prepped/ate during the turn', () => {
      let player = makePlayer(campaign2000);
      player.inventory.appliances = [{ id: 'refrigerator', purchasePrice: 650, condition: 'new' }];
      player = recalculatePlayerEffects(player, campaign2000);
      player.inventory.freshFoodUnits = 3;
      player.turnFlags.hasEaten = true; // Prepped meal during the turn

      const { state } = createTestContext(player, campaign2000);
      const preRobberyStorage = player.activeEffects['set_food_storage'] || 0;
      const after = processAdvancedHealthAndFood(player, state, campaign2000, new Random(1), undefined, preRobberyStorage);

      // Fresh food is preserved at 3 units, NOT reduced to 2!
      expect(after.inventory.freshFoodUnits).toBe(3);
    });

    it('auto-consumes fallback food at turn end if player forgot to cook', () => {
      let player = makePlayer(campaign2000);
      player.inventory.appliances = [{ id: 'refrigerator', purchasePrice: 650, condition: 'new' }];
      player = recalculatePlayerEffects(player, campaign2000);
      player.inventory.freshFoodUnits = 3;
      player.turnFlags.hasEaten = false; // Forgot to cook!

      const { state } = createTestContext(player, campaign2000);
      const preRobberyStorage = player.activeEffects['set_food_storage'] || 0;
      const after = processAdvancedHealthAndFood(player, state, campaign2000, new Random(1), undefined, preRobberyStorage);

      // Fallback consumes 1 fresh food unit so player does not starve
      expect(after.inventory.freshFoodUnits).toBe(2);
      expect(after.turnFlags.hasEaten).toBe(true);
    });
  });

  describe('Deferred on_purchase Food Modifiers', () => {
    it('buying fresh food or canned mystery meat in advanced_2000 does not apply on_purchase stat mods at store checkout', () => {
      let player = makePlayer(campaign2000);
      player.money = 200;
      player.physicalCondition = 50;
      player.physicalConditionMax = 65;

      const cannedItem = campaign2000.items.find(i => i.id === 'dog_food')!;
      const result = buyItem(player, cannedItem, campaign2000.config.gameRules, campaign2000);

      // Canned food purchased: -3 physicalConditionMax was NOT applied at checkout!
      expect(result.updated.physicalConditionMax).toBe(65);
    });
  });

  describe('Cross-Turn Food Reset & Red Pirate Fast Food', () => {
    it('buying fast food at Red Pirate while unfed immediately feeds the player for Turn 1', () => {
      let player = makePlayer(campaign2000);
      player.money = 100;
      player.turnFlags.hasEaten = false;
      const burger = campaign2000.items.find(i => i.id === 'pirate_burger' || i.subcategory === 'fast_food')!;

      const result = buyItem(player, burger, campaign2000.config.gameRules, campaign2000);
      expect(result.success).toBe(true);
      expect(result.updated.turnFlags.hasEaten).toBe(true);
      expect(result.updated.nutritionTier).toBe('fast_food');
      // Meal was eaten immediately, so inventory is empty
      expect(result.updated.inventory.fastFoodItems.length).toBe(0);
    });

    it('buying extra fast food while already fed is consumed on the spot without creating takeout in pantry', () => {
      let player = makePlayer(campaign2000);
      player.money = 100;
      player.turnFlags.hasEaten = true; // Already ate!
      const burger = campaign2000.items.find(i => i.id === 'pirate_burger' || i.subcategory === 'fast_food')!;

      const result = buyItem(player, burger, campaign2000.config.gameRules, campaign2000);
      expect(result.success).toBe(true);
      expect(result.updated.turnFlags.hasEaten).toBe(true);
      expect(result.updated.inventory.fastFoodItems.length).toBe(0);
    });

    it('player who bought food at Red Pirate in Turn 1 starts Turn 2 UNFED and cannot relax fed without new food', () => {
      let player = makePlayer(campaign2000);
      player.money = 100;
      player.turnFlags.hasEaten = false;
      const burger = campaign2000.items.find(i => i.id === 'pirate_burger' || i.subcategory === 'fast_food')!;

      // 1. Buy burger in Turn 1 -> eaten immediately
      const buyRes = buyItem(player, burger, campaign2000.config.gameRules, campaign2000);
      let turn1Player = buyRes.updated;
      expect(turn1Player.turnFlags.hasEaten).toBe(true);

      // 2. Advance to Turn 2 via processTurnStart
      const { state: state1 } = createTestContext(turn1Player, campaign2000);
      state1.turn = 1;
      const state2 = processTurnStart(state1, campaign2000);

      const turn2Player = state2.players[0];
      // Critical check: Turn 2 player MUST start with hasEaten = false!
      expect(turn2Player.turnFlags.hasEaten).toBe(false);

      // 3. Relaxing at turn start of Turn 2 results in Unfed Relaxing (-1 Max Phys, -1 Max Mental)!
      const context2: ReducerContext = {
        campaign: campaign2000,
        rules: campaign2000.config.gameRules,
        turn: 2,
        economicIndex: 0,
        rng: new Random(42),
        state: state2
      };
      const relaxRes = gameReducer(turn2Player, { type: 'relax' }, context2);
      expect(relaxRes.actionLog?.params?.stats).toContain('-1 Max Physical, -1 Max Mental');
    });
  });

  describe('Dashboard Status & Nutrition Indicator', () => {
    it('shows stat-nutrition badge as binary Unfed with warning (no floating badge) when player has not eaten', () => {
      const player = makePlayer(campaign2000);
      player.turnFlags.hasEaten = false;
      player.inventory.freshFoodUnits = 3; // Has food in pantry, but hasn't eaten!

      const badges = buildDashboardBadges({
        player,
        rules: campaign2000.config.gameRules,
        campaign: campaign2000,
        turn: 1,
        t: (k: string, opts?: any) => opts?.defaultValue || k
      });

      const nutritionBadge = badges.lifeBadges.find(b => b.id === 'stat-nutrition');
      expect(nutritionBadge).toBeDefined();
      expect(nutritionBadge?.label).toBe('Food');
      expect(nutritionBadge?.value).toBe('Unfed');
      expect(nutritionBadge?.warning).toBe(true);
      expect(nutritionBadge?.badge).toBeUndefined();
      expect(nutritionBadge?.icon).toBe('🍽️');
    });

    it('shows stat-nutrition badge as binary Fed without floating badge when player has cooked and eaten', () => {
      const player = makePlayer(campaign2000);
      player.turnFlags.hasEaten = true;
      player.nutritionTier = 'home_cooked';

      const badges = buildDashboardBadges({
        player,
        rules: campaign2000.config.gameRules,
        campaign: campaign2000,
        turn: 1,
        t: (k: string, opts?: any) => opts?.defaultValue || k
      });

      const nutritionBadge = badges.lifeBadges.find(b => b.id === 'stat-nutrition');
      expect(nutritionBadge).toBeDefined();
      expect(nutritionBadge?.label).toBe('Food');
      expect(nutritionBadge?.value).toBe('Fed');
      expect(nutritionBadge?.warning).toBeFalsy();
      expect(nutritionBadge?.badge).toBeUndefined();
      expect(nutritionBadge?.icon).toBe('🥗');
    });

    it('returns detailed attribute info when inspecting nutrition / diet', () => {
      const player = makePlayer(campaign2000);
      player.turnFlags.hasEaten = false;

      const info = getHudAttributeInfo({
        attributeId: 'nutrition',
        player,
        rules: campaign2000.config.gameRules,
        campaign: campaign2000,
        turn: 1,
        t: (k: string, opts?: any) => opts?.defaultValue || k
      });

      expect(info.id).toBe('nutrition');
      expect(info.name).toContain('Food');
      expect(info.currentValue).toBe('Unfed');
      expect(info.statusBadge).toContain('Unfed');
      expect(info.description).toContain('Advanced 2000');
      expect(info.decreases.some(d => d.includes('Unfed Relaxing'))).toBe(true);
    });

    it('treats Hospital Cafeteria meals as fed for Home Relaxing (single source of truth) and allows repeat purchases', () => {
      const staff = makePlayer(campaign2000);
      staff.currentJobId = 'hospital_custodian';
      staff.hoursRemaining = 20;
      staff.money = 120;
      staff.physicalCondition = 30;
      staff.mentalCondition = 30;

      expect(isPlayerFed(staff, campaign2000.config.gameRules)).toBe(false);

      // 1st cafeteria meal sets hasEaten = true and counts as fed
      const { state: s1, context: c1 } = createTestContext(staff, campaign2000);
      const afterCafe1 = gameReducer(staff, { type: 'hospital_cafeteria' }, c1);
      expect(afterCafe1.updatedPlayer.turnFlags.ateHospitalCafeteriaThisTurn).toBe(true);
      expect(afterCafe1.updatedPlayer.turnFlags.hasEaten).toBe(true);
      expect(isPlayerFed(afterCafe1.updatedPlayer, campaign2000.config.gameRules)).toBe(true);

      // Relaxing at home right after eating at Hospital Cafeteria grants full fed bonuses (no Max penalty)
      const { context: cRelax } = createTestContext(afterCafe1.updatedPlayer, campaign2000);
      const afterRelax = gameReducer(afterCafe1.updatedPlayer, { type: 'relax' }, cRelax);
      expect(afterRelax.actionLog?.key).toBe('action.relax');
      expect(afterRelax.actionLog?.params?.stats).not.toContain('-1 Max Physical');

      // 2nd cafeteria meal is still allowed if staff has money and hours
      const { context: c2 } = createTestContext(afterRelax.updatedPlayer, campaign2000);
      const afterCafe2 = gameReducer(afterRelax.updatedPlayer, { type: 'hospital_cafeteria' }, c2);
      expect(afterCafe2.actionLog?.key).toBe('action.hospital.cafeteriaSuccess');
      expect(afterCafe2.updatedPlayer.money).toBe(40); // 120 - 40 - 40
    });
  });
});
