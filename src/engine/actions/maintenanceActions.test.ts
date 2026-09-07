import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calcDiySuccessChance,
  calcRepairmanCost,
  calcThrowOutMess,
  handleApplianceMaintenanceAction
} from './maintenanceActions';
import { gameReducer, type ReducerContext } from '../gameReducer';
import { type PlayerState, type GameRules } from '../gameState';
import type { CampaignBundle } from '../dataLoader';
import { Random } from '../../utils/rng';
import { createTestGameState } from '../testFactories';

const getLogKey = (log?: any) => Array.isArray(log) ? log[0]?.key : log?.key;

describe('maintenanceActions', () => {
  let player: PlayerState;
  let context: ReducerContext;
  let mockCampaign: CampaignBundle;

  beforeEach(() => {
    mockCampaign = {
      items: [
        { id: 'refrigerator', name: 'Refrigerator', basePrice: 500, category: 'appliance', space: 20, tags: ['refrigerator'] },
        { id: 'microwave', name: 'Microwave', basePrice: 150, category: 'appliance', space: 5, tags: ['microwave'] },
        { id: 'color_tv', name: 'Color TV', basePrice: 350, category: 'appliance', space: 15 }
      ],
      education: [
        { id: 'electronics', name: 'Electronics Degree', baseTuitionFee: 400, lessonsRequired: 10, prerequisites: [] }
      ],
      housing: [
        { id: 'low_cost', name: 'Low Cost Housing', baseRent: 300, upkeepCost: 0 }
      ],
      config: {
        name: 'test',
        startingMoney: 500,
        timeRules: { hoursPerTurn: 60 },
        statRules: {
          minPhysicalCondition: 1,
          maxPhysicalCondition: 50,
          minMentalCondition: 1,
          maxMentalCondition: 50,
          lowCostMessMax: 50
        }
      }
    } as unknown as CampaignBundle;

    const state = createTestGameState(mockCampaign, [{ name: 'TestPlayer', isAi: false }], 'low_cost');
    player = state.players[0];
    player.hoursRemaining = 40;
    player.physicalCondition = 30;
    player.mentalCondition = 30;
    player.skillTech = 0;
    player.degrees = [];
    player.enrolledClasses = {};
    player.money = 500;
    player.inventory.appliances = [];

    context = {
      campaign: mockCampaign,
      rules: {
        advancedMaintenance: true,
        usePhysicalMentalConditions: true
      } as GameRules,
      turn: 1,
      economicIndex: 0,
      rng: new Random(1),
      state
    };
  });

  describe('calcDiySuccessChance', () => {
    it('returns base 40% when no tech skill and no education', () => {
      const breakdown = calcDiySuccessChance(player, mockCampaign, context.rules);
      expect(breakdown.baseChance).toBe(40);
      expect(breakdown.techBonus).toBe(0);
      expect(breakdown.electronicsBonus).toBe(0);
      expect(breakdown.totalChance).toBe(40);
    });

    it('adds +3% per skillTech point', () => {
      player.skillTech = 5;
      const breakdown = calcDiySuccessChance(player, mockCampaign, context.rules);
      expect(breakdown.techBonus).toBe(15);
      expect(breakdown.totalChance).toBe(55);
    });

    it('adds +10pp if electronics degree is completed', () => {
      player.degrees = ['electronics'];
      const breakdown = calcDiySuccessChance(player, mockCampaign, context.rules);
      expect(breakdown.electronicsBonus).toBe(10);
      expect(breakdown.totalChance).toBe(50);
    });

    it('scales electronics bonus proportionally when enrolled (lesson-based)', () => {
      // 5 out of 10 lessons completed = 50% progress -> +5pp bonus
      player.enrolledClasses = { electronics: 5 };
      const breakdown = calcDiySuccessChance(player, mockCampaign, context.rules);
      expect(breakdown.electronicsBonus).toBe(5);
      expect(breakdown.totalChance).toBe(45);
    });

    it('scales electronics bonus proportionally when enrolled (percentage-based rules)', () => {
      const rules = { ...context.rules, percentageEducation: true };
      player.enrolledClasses = { electronics: 70 }; // 70%
      const breakdown = calcDiySuccessChance(player, mockCampaign, rules);
      expect(breakdown.electronicsBonus).toBe(7);
      expect(breakdown.totalChance).toBe(47);
    });

    it('clamps chance at 100% maximum', () => {
      player.skillTech = 25; // 25 * 3 = 75%
      player.degrees = ['electronics']; // +10% -> 40 + 75 + 10 = 125% -> clamped to 100%
      const breakdown = calcDiySuccessChance(player, mockCampaign, context.rules);
      expect(breakdown.totalChance).toBe(100);
    });
  });

  describe('calcRepairmanCost', () => {
    it('calculates 10% of basePrice adjusted for neutral economy', () => {
      // Refrigerator basePrice = 500, 10% = 50
      const cost = calcRepairmanCost('refrigerator', 0, mockCampaign);
      expect(cost).toBe(50);
    });

    it('adjusts repair cost for economic index', () => {
      // With high economic index, prices are higher
      const baseCost = calcRepairmanCost('refrigerator', 0, mockCampaign);
      const boomCost = calcRepairmanCost('refrigerator', 50, mockCampaign);
      expect(boomCost).toBeGreaterThan(baseCost);
    });
  });

  describe('calcThrowOutMess', () => {
    it('returns space requirement from item definition', () => {
      expect(calcThrowOutMess('refrigerator', mockCampaign)).toBe(20);
      expect(calcThrowOutMess('microwave', mockCampaign)).toBe(5);
    });

    it('defaults to 10 if item space is not specified', () => {
      expect(calcThrowOutMess('color_tv', mockCampaign)).toBe(15);
      expect(calcThrowOutMess('unknown_item', mockCampaign)).toBe(10);
    });
  });

  describe('handleApplianceMaintenanceAction', () => {
    it('returns error if appliance is not found or not broken', () => {
      player.inventory.appliances = [{ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city', condition: 'new' }];
      const result = handleApplianceMaintenanceAction(
        player,
        { type: 'appliance_maintenance', applianceId: 'refrigerator', option: 'diy' },
        context
      );
      expect(result.actionLog).toEqual({ key: 'action.error.applianceNotBroken' });
    });

    describe('DIY Fix option', () => {
      beforeEach(() => {
        player.inventory.appliances = [
          { id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city', condition: 'new', isBroken: true }
        ];
      });

      it('fails validation if hours remaining < 6', () => {
        player.hoursRemaining = 5;
        const result = handleApplianceMaintenanceAction(
          player,
          { type: 'appliance_maintenance', applianceId: 'refrigerator', option: 'diy' },
          context
        );
        expect(result.actionLog).toEqual({ key: 'action.error.notEnoughTime' });
      });

      it('fails validation if physical condition < 2', () => {
        player.physicalCondition = 1;
        const result = handleApplianceMaintenanceAction(
          player,
          { type: 'appliance_maintenance', applianceId: 'refrigerator', option: 'diy' },
          context
        );
        expect(result.actionLog).toEqual({ key: 'action.error.tooExhausted' });
      });

      it('fails validation if mental condition < 1', () => {
        player.mentalCondition = 0;
        const result = handleApplianceMaintenanceAction(
          player,
          { type: 'appliance_maintenance', applianceId: 'refrigerator', option: 'diy' },
          context
        );
        expect(result.actionLog).toEqual({ key: 'action.error.tooExhausted' });
      });

      it('handles DIY success: restores appliance to used, +3 Mental, +0.5 skillTech', () => {
        // RNG returns 0.2 -> 20, which is <= 40% chance -> success
        context.rng = { next: vi.fn().mockReturnValue(0.2) } as unknown as Random;

        const result = handleApplianceMaintenanceAction(
          player,
          { type: 'appliance_maintenance', applianceId: 'refrigerator', option: 'diy' },
          context
        );

        expect(result.nextPlayer.hoursRemaining).toBe(40 - 6);
        expect(result.nextPlayer.physicalCondition).toBe(30 - 2);
        // Consumed 1 mental, gained +3 mental on success -> net +2
        expect(result.nextPlayer.mentalCondition).toBe(30 - 1 + 3);
        expect(result.nextPlayer.skillTech).toBe(0.5);

        const app = result.nextPlayer.inventory.appliances.find(a => a.id === 'refrigerator');
        expect(app?.isBroken).toBeFalsy();
        expect(app?.condition).toBe('used');
        expect(getLogKey(result.actionLog)).toBe('action.appliance.diySuccess');
      });

      it('handles DIY failure: consumes resources, remains broken, +0.1 skillTech consolation', () => {
        // RNG returns 0.8 -> 80, which is > 40% chance -> failure
        context.rng = { next: vi.fn().mockReturnValue(0.8) } as unknown as Random;

        const result = handleApplianceMaintenanceAction(
          player,
          { type: 'appliance_maintenance', applianceId: 'refrigerator', option: 'diy' },
          context
        );

        expect(result.nextPlayer.hoursRemaining).toBe(40 - 6);
        expect(result.nextPlayer.physicalCondition).toBe(30 - 2);
        expect(result.nextPlayer.mentalCondition).toBe(30 - 1);
        expect(result.nextPlayer.skillTech).toBe(0.1);

        const app = result.nextPlayer.inventory.appliances.find(a => a.id === 'refrigerator');
        expect(app?.isBroken).toBe(true);
        expect(getLogKey(result.actionLog)).toBe('action.appliance.diyFailure');
      });
    });

    describe('Call Repairman option', () => {
      beforeEach(() => {
        player.inventory.appliances = [
          { id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city', condition: 'used', isBroken: true }
        ];
      });

      it('fails validation if hours remaining < 1', () => {
        player.hoursRemaining = 0;
        const result = handleApplianceMaintenanceAction(
          player,
          { type: 'appliance_maintenance', applianceId: 'refrigerator', option: 'repairman' },
          context
        );
        expect(result.actionLog).toEqual({ key: 'action.error.notEnoughTime' });
      });

      it('fails validation if player lacks funds for repair', () => {
        player.money = 20; // Refrigerator repair is $50
        const result = handleApplianceMaintenanceAction(
          player,
          { type: 'appliance_maintenance', applianceId: 'refrigerator', option: 'repairman' },
          context
        );
        expect(result.actionLog).toEqual({
          key: 'action.error.notEnoughMoneyRepairman',
          params: { cost: 50 }
        });
      });

      it('repairs appliance to new condition, costs 1h and 10% price', () => {
        player.money = 100;

        const result = handleApplianceMaintenanceAction(
          player,
          { type: 'appliance_maintenance', applianceId: 'refrigerator', option: 'repairman' },
          context
        );

        expect(result.nextPlayer.hoursRemaining).toBe(40 - 1);
        expect(result.nextPlayer.money).toBe(100 - 50);

        const app = result.nextPlayer.inventory.appliances.find(a => a.id === 'refrigerator');
        expect(app?.isBroken).toBeFalsy();
        expect(app?.condition).toBe('new');
        expect(getLogKey(result.actionLog)).toBe('action.appliance.repairmanSuccess');
      });
    });

    describe('Throw Out option', () => {
      it('removes appliance for 0h and free, adds mess equal to space footprint', () => {
        player.inventory.appliances = [
          { id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city', condition: 'used', isBroken: true },
          { id: 'microwave', purchasePrice: 150, purchaseSource: 'socket_city', condition: 'new', isBroken: false }
        ];
        player.mess = 5;

        const result = handleApplianceMaintenanceAction(
          player,
          { type: 'appliance_maintenance', applianceId: 'refrigerator', option: 'throw_out' },
          context
        );

        expect(result.nextPlayer.hoursRemaining).toBe(40);
        expect(result.nextPlayer.money).toBe(500);
        expect(result.nextPlayer.inventory.appliances.length).toBe(1);
        expect(result.nextPlayer.inventory.appliances[0].id).toBe('microwave');
        expect(result.nextPlayer.mess).toBe(5 + 20); // 20 mess added
        expect(getLogKey(result.actionLog)).toBe('action.appliance.throwOutSuccess');
      });
    });
  });

  describe('gameReducer integration', () => {
    it('processes appliance_maintenance action through gameReducer', () => {
      player.inventory.appliances = [
        { id: 'microwave', purchasePrice: 150, purchaseSource: 'socket_city', condition: 'used', isBroken: true }
      ];

      const result = gameReducer(
        player,
        { type: 'appliance_maintenance', applianceId: 'microwave', option: 'repairman' },
        context
      );

      expect(result.updatedPlayer.inventory.appliances[0].isBroken).toBeFalsy();
      expect(result.updatedPlayer.inventory.appliances[0].condition).toBe('new');
      expect(result.updatedPlayer.hoursRemaining).toBe(39);
      expect(getLogKey(result.actionLog)).toBe('action.appliance.repairmanSuccess');
    });
  });
});
