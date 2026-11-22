import { describe, it, expect, beforeEach } from 'vitest';
import { loadCampaign, type CampaignBundle } from '../src/engine/dataLoader';
import { createPlayerState, createDefaultGoalAllotment } from '../src/engine/stateFactories';
import { gameReducer } from '../src/engine/gameReducer';
import { recalculatePlayerEffects, isPlayerFed } from '../src/engine/gameState';
import { processAdvancedHealthAndFood } from '../src/engine/turn/healthAndFoodPhase';
import { processTurnStart } from '../src/engine/turnProcessor';
import { buyItem } from '../src/engine/shoppingEngine';
import { getItemImagePath } from '../src/utils/itemUtils';
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

    it('microwave speeds up standalone freezer defrost for stove cooking (2.0h vs 1.5h with fridge)', () => {
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

      // Base 1.5h (Stove + Micro) + 0.5h standalone freezer defrost = 2.0h (longer than with a Fridge)
      expect(p.hoursRemaining).toBe(48.0);
      expect(p.turnFlags.hasEaten).toBe(true);
    });

    it('standalone freezer cold meal takes 3.0h counter-thaw without microwave and 1.0h with microwave', () => {
      // 1. Standalone freezer only -> 3.0h counter thaw
      let playerNoMicro = makePlayer(campaign2000);
      playerNoMicro.hoursRemaining = 50;
      playerNoMicro.inventory.freshFoodUnits = 1;
      playerNoMicro.inventory.appliances = [{ id: 'freezer', purchasePrice: 513, condition: 'new' }];

      const { context: c1 } = createTestContext(playerNoMicro, campaign2000);
      const resNoMicro = gameReducer(playerNoMicro, { type: 'prep_meal', mealType: 'cold_meal' }, c1);
      expect(resNoMicro.updatedPlayer.hoursRemaining).toBe(47.0); // 50 - 3.0h
      expect(resNoMicro.updatedPlayer.turnFlags.hasEaten).toBe(true);

      // 2. Standalone freezer + microwave -> 1.0h defrost
      let playerWithMicro = makePlayer(campaign2000);
      playerWithMicro.hoursRemaining = 50;
      playerWithMicro.inventory.freshFoodUnits = 1;
      playerWithMicro.inventory.appliances = [
        { id: 'freezer', purchasePrice: 513, condition: 'new' },
        { id: 'microwave', purchasePrice: 220, condition: 'new' }
      ];

      const { context: c2 } = createTestContext(playerWithMicro, campaign2000);
      const resWithMicro = gameReducer(playerWithMicro, { type: 'prep_meal', mealType: 'cold_meal' }, c2);
      expect(resWithMicro.updatedPlayer.hoursRemaining).toBe(49.0); // 50 - 1.0h
      expect(resWithMicro.updatedPlayer.turnFlags.hasEaten).toBe(true);
    });

    it('standalone freezer microwave meal takes 1.5h (+0.5h defrost vs 1.0h with fridge)', () => {
      let player = makePlayer(campaign2000);
      player.hoursRemaining = 50;
      player.inventory.freshFoodUnits = 1;
      player.inventory.appliances = [
        { id: 'freezer', purchasePrice: 513, condition: 'new' },
        { id: 'microwave', purchasePrice: 220, condition: 'new' }
      ];

      const { context } = createTestContext(player, campaign2000);
      const result = gameReducer(player, { type: 'prep_meal', mealType: 'microwave' }, context);
      expect(result.updatedPlayer.hoursRemaining).toBe(48.5); // 50 - 1.5h
      expect(result.updatedPlayer.turnFlags.hasEaten).toBe(true);
    });

    it('fridge + freezer eliminates standalone thaw penalty (1.5h stove+micro, 1.0h micro, 0.5h cold)', () => {
      let player = makePlayer(campaign2000);
      player.hoursRemaining = 50;
      player.inventory.freshFoodUnits = 3;
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, condition: 'new' },
        { id: 'freezer', purchasePrice: 513, condition: 'new' },
        { id: 'stove', purchasePrice: 490, condition: 'new' },
        { id: 'microwave', purchasePrice: 220, condition: 'new' }
      ];

      const { context } = createTestContext(player, campaign2000);
      const resStove = gameReducer(player, { type: 'prep_meal', mealType: 'home_cooked' }, context);
      expect(resStove.updatedPlayer.hoursRemaining).toBe(48.5); // 1.5h

      const resMicro = gameReducer(player, { type: 'prep_meal', mealType: 'microwave' }, context);
      expect(resMicro.updatedPlayer.hoursRemaining).toBe(49.0); // 1.0h

      const resCold = gameReducer(player, { type: 'prep_meal', mealType: 'cold_meal' }, context);
      expect(resCold.updatedPlayer.hoursRemaining).toBe(49.5); // 0.5h
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
    it('heats canned rations: costs 1.0h without microwave, -1 Max Physical, produces +1 mess, lowers Mental by 1', () => {
      let player = makePlayer(campaign2000);
      player.hoursRemaining = 50;
      player.inventory.cannedFoodUnits = 2;
      player.physicalCondition = 1.0; // Exhausted
      player.physicalConditionMax = 65;
      player.mentalCondition = 40;
      player.mess = 0;

      const { context } = createTestContext(player, campaign2000);
      const result = gameReducer(player, { type: 'prep_meal', mealType: 'canned' }, context);
      const p = result.updatedPlayer;

      expect(p.hoursRemaining).toBe(49.0); // 1 hour prep
      expect(p.physicalCondition).toBe(1.0); // 0 immediate labor cost
      expect(p.physicalConditionMax).toBe(64); // -1 Max Physical upon eating canned rations
      expect(p.mentalCondition).toBe(39); // -1 Mental
      expect(p.mess).toBe(1);
      expect(p.inventory.cannedFoodUnits).toBe(1);
      expect(p.turnFlags.hasEaten).toBe(true);
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

    it('applies exact -1 Max Physical and -1 Mental every time canned food is eaten (no consecutive-weeks streak rule)', () => {
      let player = makePlayer(campaign2000);
      player.hoursRemaining = 50;
      player.inventory.cannedFoodUnits = 3;
      player.physicalConditionMax = 65;
      player.mentalCondition = 40;
      player.consecutiveCannedWeeks = 0;

      const { context } = createTestContext(player, campaign2000);
      const res1 = gameReducer(player, { type: 'prep_meal', mealType: 'canned' }, context);
      expect(res1.updatedPlayer.physicalConditionMax).toBe(64);
      expect(res1.updatedPlayer.mentalCondition).toBe(39);

      const res2 = gameReducer(res1.updatedPlayer, { type: 'prep_meal', mealType: 'canned' }, context);
      expect(res2.updatedPlayer.physicalConditionMax).toBe(63);
      expect(res2.updatedPlayer.mentalCondition).toBe(38);
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
      player.physicalConditionMax = 50; // Damaged max (initial max is 65, global max is 100)
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

      const cannedItem = campaign2000.items.find(i => i.id === 'canned_food')!;
      const result = buyItem(player, cannedItem, campaign2000.config.gameRules, campaign2000);

      // Canned food purchased: no physicalConditionMax penalty applied!
      expect(result.updated.physicalConditionMax).toBe(65);
    });
  });

  describe('Cross-Turn Food Reset & Red Pirate Fast Food', () => {
    it('buying fast food at Red Pirate while unfed immediately feeds the player for Turn 1 and adds to inventory', () => {
      let player = makePlayer(campaign2000);
      player.money = 100;
      player.turnFlags.hasEaten = false;
      const burger = campaign2000.items.find(i => i.id === 'pirate_burger' || i.subcategory === 'fast_food')!;

      const result = buyItem(player, burger, campaign2000.config.gameRules, campaign2000);
      expect(result.success).toBe(true);
      expect(result.updated.turnFlags.hasEaten).toBe(true);
      expect(result.updated.nutritionTier).toBe('fast_food');
      // Fast food appears in inventory as fastfood
      expect(result.updated.inventory.fastFoodItems.length).toBe(1);
      expect(result.updated.inventory.fastFoodItems[0].itemId).toBe(burger.id);
    });

    it('buying extra fast food while already fed adds takeout meal to inventory', () => {
      let player = makePlayer(campaign2000);
      player.money = 100;
      player.turnFlags.hasEaten = true; // Already ate!
      const burger = campaign2000.items.find(i => i.id === 'pirate_burger' || i.subcategory === 'fast_food')!;

      const result = buyItem(player, burger, campaign2000.config.gameRules, campaign2000);
      expect(result.success).toBe(true);
      expect(result.updated.turnFlags.hasEaten).toBe(true);
      expect(result.updated.inventory.fastFoodItems.length).toBe(1);
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

    it('treats Hospital Cafeteria meals as fed for Home Relaxing (single source of truth) and allows repeat purchases (Scrubs)', async () => {
      const scrubs = await loadCampaign('scrubs');
      const staff = makePlayer(scrubs);
      staff.currentJobId = 'hospital_custodian';
      staff.hoursRemaining = 20;
      staff.money = 120;
      staff.physicalCondition = 30;
      staff.mentalCondition = 30;

      expect(isPlayerFed(staff, scrubs.config.gameRules)).toBe(false);

      // 1st cafeteria meal sets hasEaten = true and counts as fed
      const { context: c1 } = createTestContext(staff, scrubs);
      const afterCafe1 = gameReducer(staff, { type: 'hospital_cafeteria' }, c1);
      expect(afterCafe1.updatedPlayer.turnFlags.ateHospitalCafeteriaThisTurn).toBe(true);
      expect(afterCafe1.updatedPlayer.turnFlags.hasEaten).toBe(true);
      expect(isPlayerFed(afterCafe1.updatedPlayer, scrubs.config.gameRules)).toBe(true);

      // Relaxing at home right after eating at Hospital Cafeteria grants full fed bonuses (no Max penalty)
      const { context: cRelax } = createTestContext(afterCafe1.updatedPlayer, scrubs);
      const afterRelax = gameReducer(afterCafe1.updatedPlayer, { type: 'relax' }, cRelax);
      expect(afterRelax.actionLog?.key).toBe('action.relax');
      expect(afterRelax.actionLog?.params?.stats).not.toContain('-1 Max Physical');

      // 2nd cafeteria meal is still allowed if staff has money and hours
      const { context: c2 } = createTestContext(afterRelax.updatedPlayer, scrubs);
      const afterCafe2 = gameReducer(afterRelax.updatedPlayer, { type: 'hospital_cafeteria' }, c2);
      expect(afterCafe2.actionLog?.key).toBe('action.hospital.cafeteriaSuccess');
      expect(afterCafe2.updatedPlayer.money).toBe(40); // 120 - 40 - 40
    });
  });

  describe('Dishwasher & Robot Vacuum (Advanced 2000 Exclusives)', () => {
    it('keeps dishwasher and robot_vacuum scoped to advanced_2000 (and scrubs), with calibrated space and price', async () => {
      const advanced90s = await loadCampaign('advanced');
      const scrubs = await loadCampaign('scrubs');

      const dw = campaign2000.items.find(i => i.id === 'dishwasher');
      const rv = campaign2000.items.find(i => i.id === 'robot_vacuum');
      expect(dw).toBeDefined();
      expect(dw?.space).toBe(40);
      expect(rv).toBeDefined();
      expect(rv?.basePrice).toBe(680);
      expect(scrubs.items.find(i => i.id === 'dishwasher')).toBeDefined();
      expect(scrubs.items.find(i => i.id === 'robot_vacuum')).toBeDefined();

      expect(advanced90s.items.find(i => i.id === 'dishwasher')).toBeUndefined();
      expect(advanced90s.items.find(i => i.id === 'robot_vacuum')).toBeUndefined();
      expect(campaignFloppy.items.find(i => i.id === 'dishwasher')).toBeUndefined();
      expect(campaignFloppy.items.find(i => i.id === 'robot_vacuum')).toBeUndefined();
    });

    it('dishwasher eliminates mess on home_cooked, microwave, and canned meals unless broken', () => {
      let player = makePlayer(campaign2000);
      player.hoursRemaining = 50;
      player.inventory.freshFoodUnits = 3;
      player.inventory.cannedFoodUnits = 2;
      player.inventory.appliances = [
        { id: 'stove', purchasePrice: 490, condition: 'new' },
        { id: 'microwave', purchasePrice: 220, condition: 'new' },
        { id: 'dishwasher', purchasePrice: 350, condition: 'new' }
      ];
      player.physicalCondition = 40;
      player.mess = 0;

      const { context } = createTestContext(player, campaign2000);
      const rHome = gameReducer(player, { type: 'prep_meal', mealType: 'home_cooked' }, context);
      expect(rHome.updatedPlayer.mess).toBe(0);

      const rMicro = gameReducer(player, { type: 'prep_meal', mealType: 'microwave' }, context);
      expect(rMicro.updatedPlayer.mess).toBe(0);

      // Even without microwave, canned meal generates 0 mess with dishwasher
      let noMicroPlayer = makePlayer(campaign2000);
      noMicroPlayer.hoursRemaining = 50;
      noMicroPlayer.inventory.cannedFoodUnits = 1;
      noMicroPlayer.inventory.appliances = [{ id: 'dishwasher', purchasePrice: 350, condition: 'new' }];
      noMicroPlayer.mess = 0;
      const { context: cNoMicro } = createTestContext(noMicroPlayer, campaign2000);
      const rCanned = gameReducer(noMicroPlayer, { type: 'prep_meal', mealType: 'canned' }, cNoMicro);
      expect(rCanned.updatedPlayer.mess).toBe(0);

      // Broken dishwasher no longer eliminates cooking mess
      let brokenPlayer = structuredClone(player);
      brokenPlayer.inventory.appliances[2].isBroken = true;
      const { context: cBroken } = createTestContext(brokenPlayer, campaign2000);
      const rBroken = gameReducer(brokenPlayer, { type: 'prep_meal', mealType: 'home_cooked' }, cBroken);
      expect(rBroken.updatedPlayer.mess).toBe(1); // Stove + Microwave default
    });

    it('dishwasher cuts party mess from socialize_guests by ~1/3 (min -1)', () => {
      let basePlayer = makePlayer(campaign2000);
      basePlayer.hoursRemaining = 50;
      basePlayer.money = 500;
      basePlayer.physicalCondition = 40;
      basePlayer.mentalCondition = 40;
      basePlayer.mess = 5; // messGrowth(5) = floor(0.2*6)+1 = 2; 3 guests -> +6 raw mess

      let dwPlayer = structuredClone(basePlayer);
      dwPlayer.inventory.appliances = [{ id: 'dishwasher', purchasePrice: 350, condition: 'new' }];

      const { context: cBase } = createTestContext(basePlayer, campaign2000);
      const resBase = gameReducer(basePlayer, { type: 'socialize_guests' }, {
        ...cBase,
        engineDecisions: [{ type: 'socialize_guests_roll_p1', result: 3 }]
      });
      const baseAdded = (resBase.updatedPlayer.mess || 0) - 5;
      expect(baseAdded).toBe(6);

      const { context: cDw } = createTestContext(dwPlayer, campaign2000);
      const resDw = gameReducer(dwPlayer, { type: 'socialize_guests' }, {
        ...cDw,
        engineDecisions: [{ type: 'socialize_guests_roll_p1', result: 3 }]
      });
      const dwAdded = (resDw.updatedPlayer.mess || 0) - 5;
      expect(dwAdded).toBe(4); // 6 - round(6/3) = 4
    });

    it('robot vacuum auto-cleans up to 4 mess at turn start when pre-turn mess <= 20', () => {
      let player = makePlayer(campaign2000);
      player.currentHousingId = 'security';
      player.inventory.freshFoodUnits = 3;
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, condition: 'new' },
        { id: 'robot_vacuum', purchasePrice: 480, condition: 'new' }
      ];
      player.mess = 10; // growth = floor(0.2 * 11) + 1 = 3 -> 13; vacuum cleans 4 -> 9

      const { state } = createTestContext(player, campaign2000);
      state.turn = 1;
      const nextState = processTurnStart(state, campaign2000);
      const nextP = nextState.players[0];

      expect(nextP.mess).toBe(9);
      expect(nextP.turnEvents.some(e => e.key === 'events.robotVacuumStuck')).toBe(false);
    });

    it('robot vacuum stalls on clutter when pre-turn mess > 20 or when broken', () => {
      let clutteredPlayer = makePlayer(campaign2000);
      clutteredPlayer.currentHousingId = 'security';
      clutteredPlayer.inventory.freshFoodUnits = 3;
      clutteredPlayer.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, condition: 'new' },
        { id: 'robot_vacuum', purchasePrice: 480, condition: 'new' }
      ];
      clutteredPlayer.mess = 21; // > 20 clutter threshold; growth = floor(0.2 * 22) + 1 = 5 -> 26

      const { state: s1 } = createTestContext(clutteredPlayer, campaign2000);
      s1.turn = 1;
      const next1 = processTurnStart(s1, campaign2000);
      expect(next1.players[0].mess).toBe(26);
      expect(next1.players[0].turnEvents.some(e => e.key === 'events.robotVacuumStuck')).toBe(true);

      // Broken robot vacuum neither cleans nor triggers clutter stuck event
      let brokenPlayer = structuredClone(clutteredPlayer);
      brokenPlayer.mess = 10;
      brokenPlayer.inventory.appliances[1].isBroken = true;
      const { state: s2 } = createTestContext(brokenPlayer, campaign2000);
      s2.turn = 1;
      const next2 = processTurnStart(s2, campaign2000);
      expect(next2.players[0].mess).toBe(13); // 10 + 3 growth, 0 vacuum clean
      expect(next2.players[0].turnEvents.some(e => e.key === 'events.robotVacuumStuck')).toBe(false);
    });

    it('robot vacuum requires >= 5 free space under spaceCapping even when mess <= 20', () => {
      // Low-cost housing spaceCap = 100.
      // refrigerator (40) + stove (40) + robot_vacuum (10) = 90 durables space.
      // With mess = 6 -> usedSpace = 96 -> freeSpace = 4 (< 5) -> vacuum stalls!
      let crampedPlayer = makePlayer(campaign2000);
      crampedPlayer.currentHousingId = 'low_cost';
      crampedPlayer.inventory.freshFoodUnits = 3;
      crampedPlayer.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, condition: 'new' },
        { id: 'stove', purchasePrice: 490, condition: 'new' },
        { id: 'robot_vacuum', purchasePrice: 680, condition: 'new' }
      ];
      crampedPlayer.mess = 6; // <= 20 mess, but only 4 free space! growth(6) = floor(0.2*7)+1 = 2 -> 8

      const { state: sCramped } = createTestContext(crampedPlayer, campaign2000);
      sCramped.turn = 1;
      const nextCramped = processTurnStart(sCramped, campaign2000);
      expect(nextCramped.players[0].mess).toBe(8);
      expect(nextCramped.players[0].turnEvents.some(e => e.key === 'events.robotVacuumStuck')).toBe(true);

      // With mess = 5 -> usedSpace = 95 -> freeSpace = 5 (>= 5) -> vacuum operates!
      let spaciousPlayer = structuredClone(crampedPlayer);
      spaciousPlayer.mess = 5; // growth(5) = floor(0.2*6)+1 = 2 -> 7, minus 4 = 3
      const { state: sSpacious } = createTestContext(spaciousPlayer, campaign2000);
      sSpacious.turn = 1;
      const nextSpacious = processTurnStart(sSpacious, campaign2000);
      expect(nextSpacious.players[0].mess).toBe(3);
      expect(nextSpacious.players[0].turnEvents.some(e => e.key === 'events.robotVacuumStuck')).toBe(false);
    });

    it('maps Red Pirate fast food placeholders, plasma_tv, and drip_coffee image paths cleanly', () => {
      expect(getItemImagePath('scurvy_slaw')).toBe('/assets/raw_images/fries.png');
      expect(getItemImagePath('buccaneer_stew')).toBe('/assets/raw_images/cheeseburger.png');
      expect(getItemImagePath('kraken_burger')).toBe('/assets/raw_images/astro_chicken.png');
      expect(getItemImagePath('plasma_tv')).toBe('/assets/raw_images/plasma_tv.png');
      expect(getItemImagePath('drip_coffee')).toBe('/assets/raw_images/drip_coffee.png');
    });
  });
});
