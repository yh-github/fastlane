import { describe, it, expect } from 'vitest';
import { messGrowth, calcMaxMental, calcWellbeingScore, calcMovingFee } from './statMath';
import { createPlayerState } from './gameState';
import { gameReducer } from './gameReducer';
import { Random } from '../utils/rng';
import { TEST_ADVANCED_CAMPAIGN_CONFIG, TEST_ADVANCED_GAME_RULES } from './testFactories';

describe('Advanced Feature Bundle', () => {
  const mockCampaign: any = {
    config: {
      ...TEST_ADVANCED_CAMPAIGN_CONFIG,
      timeRules: { ...TEST_ADVANCED_CAMPAIGN_CONFIG.timeRules, hoursPerTurn: 60, cleaningServiceCost: 1, socializeCost: 6, cleanPhysicalCost: 1 },
      statRules: { ...TEST_ADVANCED_CAMPAIGN_CONFIG.statRules, mentalMaxBaseValue: 51, globalMessMin: 0, lowCostMessMax: 50, securityMessMax: 90, minPhysicalCondition: 3 },
      economyRules: { ...TEST_ADVANCED_CAMPAIGN_CONFIG.economyRules, cleaningServiceBasePrice: 100, socializeLowCostCashCost: 25, socializeSecurityCashCost: 50 }
    },
    housing: [{ id: 'low_cost', name: 'Low-Cost Apartment', baseRent: 325 }, { id: 'security', name: 'Security Apartment', baseRent: 475 }],
    buildings: [{ id: 'z_mart', name: 'Z-Mart' }],
    map: { nodes: [{ id: 'node_low_cost', buildingId: 'z_mart' }] },
    items: [{ id: 'fries', category: 'fast_food' }]
  };

  const mockRules: any = { ...TEST_ADVANCED_GAME_RULES, usePhysicalMentalConditions: true, trackMess: true };

  describe('1. Housing & Mess Formulas', () => {
    it('calculates messGrowth correctly', () => {
      expect(messGrowth(0)).toBe(1);
      expect(messGrowth(3)).toBe(1);
      expect(messGrowth(4)).toBe(2);
      expect(messGrowth(9)).toBe(3);
      expect(messGrowth(14)).toBe(4);
      expect(messGrowth(50)).toBe(11);
    });

    it('calculates moving fee based on mess and durables', () => {
      expect(calcMovingFee(5, 0, mockCampaign.config.economyRules)).toBe(0);
      expect(calcMovingFee(15, 0, mockCampaign.config.economyRules)).toBe(250); // (15-10) * 50
      expect(calcMovingFee(5, 2, mockCampaign.config.economyRules)).toBe(100);  // 2 * 50
      expect(calcMovingFee(15, 2, mockCampaign.config.economyRules)).toBe(350); // 250 + 100
    });
  });

  describe('2. Mental, Lifestyle & Wellbeing Math', () => {
    it('calculates dynamic MAX_MENTAL', () => {
      // 51 - mess_growth(3) [1] + floor(9/10) [0] + 0 = 50
      expect(calcMaxMental(3, 9, 0, undefined, mockCampaign.config.statRules)).toBe(50);
      // 51 - mess_growth(14) [4] + floor(20/10) [2] + 3 = 52
      expect(calcMaxMental(14, 20, 3, undefined, mockCampaign.config.statRules)).toBe(52);
    });

    it('calculates wellbeing score', () => {
      expect(calcWellbeingScore(50, 25)).toBe(38); // Math.ceil(75 / 2) = 38
      expect(calcWellbeingScore(1, 1)).toBe(1);
    });
  });

  describe('3. Game Reducer Actions', () => {

    it('handles Call Cleaning Service action', () => {
      const player = createPlayerState('p1', 'Player 1', false, {}, 'node_low_cost', mockCampaign.config);
      player.mess = 20;
      player.money = 200;
      player.hoursRemaining = 60;

      const result = gameReducer(player, { type: 'call_cleaning_service' }, {
        campaign: mockCampaign,
        rules: mockRules,
        turn: 1,
        economicIndex: 0,
        rng: new Random(123),
        state: {} as any
      });

      expect(result.updatedPlayer.mess).toBe(10);
      expect(result.updatedPlayer.money).toBe(100);
      expect(result.updatedPlayer.hoursRemaining).toBe(59);
    });

    it('handles Junk Food physical penalty on buy', () => {
      const player = createPlayerState('p1', 'Player 1', false, {}, 'node_low_cost', mockCampaign.config);
      player.physicalCondition = 50;
      player.money = 100;

      const result = gameReducer(player, { type: 'buy', itemId: 'fries' }, {
        campaign: mockCampaign,
        rules: mockRules,
        turn: 1,
        economicIndex: 0,
        rng: new Random(123),
        state: {} as any
      });

      expect(result.updatedPlayer.physicalCondition).toBe(49);
    });

    it('handles Socialize / Entertain Guests action', () => {
      const player = createPlayerState('p1', 'Player 1', false, {}, 'node_low_cost', mockCampaign.config);
      player.mess = 5;
      player.money = 200;
      player.mentalCondition = 25;
      player.social = 9;
      player.hoursRemaining = 60;

      const result = gameReducer(player, { type: 'socialize_guests' }, {
        campaign: mockCampaign,
        rules: mockRules,
        turn: 1,
        economicIndex: 0,
        rng: new Random(123),
        state: {} as any
      });

      expect(result.updatedPlayer.hoursRemaining).toBe(54);
      expect(result.updatedPlayer.physicalCondition).toBe(49);
      expect(result.updatedPlayer.social).toBeGreaterThan(9);
    });
  });
});
