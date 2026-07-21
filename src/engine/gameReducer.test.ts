import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Random } from '../utils/rng';
import { gameReducer, type ReducerContext } from './gameReducer';
import { createInitialGameState, type PlayerState, type GameRules } from './gameState';
import type { CampaignBundle } from './dataLoader';

describe('gameReducer', () => {
  let player: PlayerState;
  let context: ReducerContext;
  let mockCampaign: CampaignBundle;

  beforeEach(() => {
    // Lock random for predictable outcomes where needed (e.g., job application chance, loan risk)
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    mockCampaign = {
      jobs: [
        { id: 'burger_cook', title: 'Burger Cook', baseWage: 5, requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' }, locationId: 'monolith', perks: [], tags: ['auto_accept'] },
        { id: 'office_clerk', title: 'Office Clerk', baseWage: 12, requirements: { experience: 10, dependability: 50, degrees: [] }, locationId: 'office' }
      ],
      items: [
        { id: 'newspaper', name: 'Newspaper', basePrice: 1, category: 'item' },
        { id: 'bicycle', name: 'Bicycle', basePrice: 100, category: 'vehicle' },
        { id: 'refrigerator', name: 'Refrigerator', basePrice: 400, category: 'appliance', tags: ['refrigerator'] }
      ],
      education: [
        { id: 'business_admin', name: 'Business Admin', baseTuitionFee: 500, lessonsRequired: 10, prerequisites: [] }
      ],
      housing: [
        { id: 'low_cost', name: 'Low Cost Housing', baseRent: 300, upkeepCost: 0 },
        { id: 'security', name: 'Security Apartments', baseRent: 800, upkeepCost: 0 }
      ],
      messages: {
        job_apply_success: 'You got the job as {title}!'
      },
      config: {
        name: 'test',
        startingMoney: 200,
        timeRules: { hoursPerTurn: 60, workSessionCost: 6, studySessionCost: 6, jobApplicationCost: 4, relaxCost: 6, newspaperCost: 1, starvationPenalty: 20, doctorPenalty: 10, buildingEntryCost: 2, loanCost: 2, brokerCost: 2 }
      }
    } as unknown as CampaignBundle;

    const state = createInitialGameState(mockCampaign, [{ name: 'TestPlayer', isAi: false, goals: { wealth: 50, happiness: 50, education: 50, career: 50 } }], 'low_cost');
    player = state.players[0];
    
    context = {
      campaign: mockCampaign,
      rules: { classicStockMarket: true } as GameRules,
      turn: 1,
      economicIndex: 0,
      rng: new Random(1),
      state
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('apply action', () => {
    it('applies for an auto-success job (burger_cook)', () => {
      player.hoursRemaining = 40;
      const result = gameReducer(player, { type: 'apply', jobId: 'burger_cook' }, context);
      expect(result.updatedPlayer.currentJobId).toBe('burger_cook');
      expect(result.updatedPlayer.currentWage).toBe(5);
      expect(result.updatedPlayer.hoursRemaining).toBe(40 - 4); // COST_JOB_APPLICATION is 4
      expect(result.actionLog?.key).toBe('action.job.gotJob');
    });

    it('fails to apply if not enough time', () => {
      player.hoursRemaining = 2; // Needs 4
      const result = gameReducer(player, { type: 'apply', jobId: 'burger_cook' }, context);
      expect(result.updatedPlayer.currentJobId).toBeNull();
      expect(result.updatedPlayer.hoursRemaining).toBe(2);
      expect(result.actionLog?.key).toBe('action.error.notEnoughTime');
    });
  });

  describe('work action', () => {
    it('works a shift successfully', () => {
      player.currentJobId = 'burger_cook';
      player.currentWage = 5;
      player.hoursRemaining = 20;
      player.money = 500;
      const result = gameReducer(player, { type: 'work', jobId: 'burger_cook' }, context);
      expect(result.updatedPlayer.hoursRemaining).toBe(20 - 6); // COST_WORK_SESSION is 6
      expect(result.updatedPlayer.money).toBe(500 + (5 * 8)); // 500 initial + 40
      expect(result.actionLog?.key).toBe('action.job.worked');
    });
  });

  describe('buy action', () => {
    it('buys a newspaper', () => {
      player.money = 500;
      player.hoursRemaining = 10;
      const result = gameReducer(player, { type: 'buy', itemId: 'newspaper' }, context);
      expect(result.updatedPlayer.money).toBe(499);
      expect(result.updatedPlayer.hoursRemaining).toBe(9);
      expect(result.actionLog?.key).toBe('action.buy');
    });

    it('fails to buy newspaper if broke', () => {
      player.money = 0;
      player.hoursRemaining = 10;
      const result = gameReducer(player, { type: 'buy', itemId: 'newspaper' }, context);
      expect(result.updatedPlayer.money).toBe(0);
      expect(result.updatedPlayer.hoursRemaining).toBe(10);
      expect(result.actionLog?.key).toBe('action.error.notEnoughMoney');
    });

    it('buys a general item at 0 hours remaining (zero-cost action)', () => {
      player.money = 500;
      player.hoursRemaining = 0;
      const result = gameReducer(player, { type: 'buy', itemId: 'refrigerator' }, context);
      expect(result.updatedPlayer.money).toBe(100); // 500 - 400
      expect(result.updatedPlayer.hoursRemaining).toBe(0);
      expect(result.actionLog?.key).toBe('action.buy');
    });

    it('fails to buy newspaper if 0 hours remaining (costs time)', () => {
      player.money = 500;
      player.hoursRemaining = 0;
      const result = gameReducer(player, { type: 'buy', itemId: 'newspaper' }, context);
      expect(result.updatedPlayer.money).toBe(500);
      expect(result.updatedPlayer.hoursRemaining).toBe(0);
      expect(result.actionLog?.key).toBe('action.error.notEnoughTimeBuy');
    });
  });

  describe('relax action', () => {
    it('consumes relaxCost hours and adds relaxGain (3) to relaxation', () => {
      player.hoursRemaining = 10;
      const result = gameReducer(player, { type: 'relax' }, context);
      expect(result.updatedPlayer.hoursRemaining).toBe(4);
      expect(result.updatedPlayer.relaxation).toBe(19); // 16 (starting) + 3 (gain)
    });

    it('consumes remaining hours if less than relaxCost but still grants full gain', () => {
      player.hoursRemaining = 3;
      context.rules.allowPartialHours = true;
      const result = gameReducer(player, { type: 'relax' }, context);
      expect(result.updatedPlayer.hoursRemaining).toBe(0);
      expect(result.updatedPlayer.relaxation).toBe(19); // 16 (starting) + 3 (gain)
    });
  });

  describe('bank_transaction action', () => {
    it('deposits money successfully', () => {
      player.money = 100;
      player.bankSavings = 0;
      const result = gameReducer(player, { type: 'bank_transaction', amount: 50 }, context);
      expect(result.updatedPlayer.money).toBe(50);
      expect(result.updatedPlayer.bankSavings).toBe(50);
    });

    it('withdraws money successfully', () => {
      player.money = 100;
      player.bankSavings = 100;
      const result = gameReducer(player, { type: 'bank_transaction', amount: -50 }, context);
      expect(result.updatedPlayer.money).toBe(150);
      expect(result.updatedPlayer.bankSavings).toBe(50);
    });

    it('fails if trying to deposit more than owned', () => {
      player.money = 10;
      const result = gameReducer(player, { type: 'bank_transaction', amount: 50 }, context);
      expect(result.updatedPlayer.money).toBe(10);
      expect(result.actionLog?.key).toBe('action.error.notEnoughMoneyDeposit');
    });
  });

  describe('stock actions', () => {
    it('buys tbills', () => {
      player.money = 200;
      const result = gameReducer(player, { type: 'buy_stock', stockId: 'tbills', quantity: 2, cost: 100 }, context);
      expect(result.updatedPlayer.money).toBe(100);
      expect(result.updatedPlayer.inventory.stocks.tBills).toBe(2);
    });

    it('sells tbills', () => {
      player.money = 0;
      player.inventory.stocks.tBills = 5;
      const result = gameReducer(player, { type: 'sell_stock', stockId: 'tbills', quantity: 3, revenue: 150 }, context);
      expect(result.updatedPlayer.inventory.stocks.tBills).toBe(2);
      expect(result.updatedPlayer.money).toBe(150);
    });
  });

  describe('loan actions', () => {
    it('takes a loan successfully', () => {
      player.money = 0;
      player.bankSavings = 0;
      player.currentWage = 20; // Good liquidity
      player.hoursRemaining = 40;
      const result = gameReducer(player, { type: 'take_loan' }, context);
      expect(result.updatedPlayer.money).toBeGreaterThan(0);
      expect(result.updatedPlayer.loanDebt).toBeGreaterThan(0);
      expect(result.updatedPlayer.hoursRemaining).toBe(38); // 2 hours spent
      expect(result.updatedPlayer.loanPaymentDeadline).toBe(4); // Week 4
    });

    it('pays off a loan partially', () => {
      player.money = 100;
      player.loanDebt = 200;
      const result = gameReducer(player, { type: 'pay_loan' }, context);
      expect(result.updatedPlayer.money).toBe(50);
      expect(result.updatedPlayer.loanDebt).toBe(155); // 45 principal, 5 interest
      expect(result.actionLog?.key).toBe('action.loan.paidInstallment');
    });

    it('pays off a loan completely', () => {
      player.money = 100;
      player.loanDebt = 40;
      const result = gameReducer(player, { type: 'pay_loan' }, context);
      expect(result.updatedPlayer.money).toBe(60);
      expect(result.updatedPlayer.loanDebt).toBe(0);
      expect(result.actionLog?.key).toBe('action.loan.paidOff');
    });
  });

  describe('rent and housing actions', () => {
    it('pays rent and extends rentPaidUntilWeek by 4', () => {
      player.money = 500;
      player.rentPaidUntilWeek = 1;
      context.turn = 1;
      const result = gameReducer(player, { type: 'rent_transaction', amount: 300 }, context);
      expect(result.updatedPlayer.money).toBe(200);
      expect(result.updatedPlayer.rentPaidUntilWeek).toBe(5);
      expect(result.updatedPlayer.turnFlags.rentPaidThisTurn).toBe(true);
    });

    it('moves apartment successfully', () => {
      player.money = 1000;
      const result = gameReducer(player, { type: 'move_apartment', housingId: 'security', cost: 800 }, context);
      expect(result.updatedPlayer.money).toBe(200);
      expect(result.updatedPlayer.currentHousingId).toBe('security');
      expect(result.updatedPlayer.currentRentPrice).toBe(800);
      expect(result.updatedPlayer.rentPaidUntilWeek).toBe(context.turn + 4);
    });

    it('asks for rent extension successfully on first try', () => {
      player.rentPaidUntilWeek = 1;
      player.rentExtensionsReceived = 0;
      const result = gameReducer(player, { type: 'ask_rent_extension' }, context);
      expect(result.updatedPlayer.rentExtensionActive).toBe(true);
      expect(result.updatedPlayer.rentExtensionsReceived).toBe(1);
    });
  });

  describe('pawn actions', () => {
    it('pawns an item', () => {
      const fridge = { id: 'refrigerator', purchasePrice: 400, purchaseSource: 'socket_city' as const };
      player.inventory.appliances = [fridge];
      player.money = 0;
      
      const result = gameReducer(player, { type: 'pawn_item', item: fridge, value: 160 }, context);
      expect(result.updatedPlayer.inventory.appliances.length).toBe(0);
      expect(result.updatedPlayer.inventory.pawnedItems!.length).toBe(1);
      expect(result.updatedPlayer.money).toBe(160);
    });

    it('redeems a pawned item preserving its original purchaseSource', () => {
      const pawnedItem = { itemId: 'refrigerator', originalPrice: 400, redeemCost: 200, weekPawned: 1, ownerId: player.id, purchaseSource: 'socket_city' as const };
      player.inventory.pawnedItems = [pawnedItem];
      player.inventory.appliances = [];
      player.money = 500;

      const result = gameReducer(player, { type: 'redeem_item', item: pawnedItem, cost: 200 }, context);
      expect(result.updatedPlayer.money).toBe(300);
      expect(result.updatedPlayer.inventory.pawnedItems.length).toBe(0);
      expect(result.updatedPlayer.inventory.appliances.length).toBe(1);
      expect(result.updatedPlayer.inventory.appliances[0].id).toBe('refrigerator');
      expect(result.updatedPlayer.inventory.appliances[0].purchaseSource).toBe('socket_city');
    });

    it('buys a second-hand pawned item from pawnShopItemsForSale and flags purchaseSource as pawnshop', () => {
      const forSaleItem = { itemId: 'color_tv', originalPrice: 500, redeemCost: 250, weekPawned: 1, ownerId: 'other_player', purchaseSource: 'socket_city' as const };
      context.state.pawnShopItemsForSale = [forSaleItem];
      player.inventory.appliances = [];
      player.money = 300;

      const result = gameReducer(player, { type: 'buy_pawn_item', item: forSaleItem, cost: 250 }, context);
      expect(result.updatedPlayer.money).toBe(50);
      expect(result.updatedPlayer.inventory.appliances.length).toBe(1);
      expect(result.updatedPlayer.inventory.appliances[0].id).toBe('color_tv');
      expect(result.updatedPlayer.inventory.appliances[0].purchaseSource).toBe('pawnshop');
      expect(result.updatedPawnShopItemsForSale?.length).toBe(0);
    });

    it('prevents pawning if pawn shop is full (6 items)', () => {
      const itemToPawn = { id: 'microwave', purchasePrice: 300, purchaseSource: 'socket_city' as const };
      player.inventory.appliances = [itemToPawn];
      context.state.pawnShopItemsForSale = Array(6).fill(null).map((_, i) => ({
        itemId: `item_${i}`, originalPrice: 100, redeemCost: 50, weekPawned: 1, ownerId: 'p2'
      }));

      const result = gameReducer(player, { type: 'pawn_item', item: itemToPawn, value: 120 }, context);
      expect(result.actionLog?.key).toBe('action.error.pawnShopFull');
      expect(result.updatedPlayer.inventory.appliances.length).toBe(1);
    });

    it('prevents pawning duplicate item types already in pawn shop', () => {
      const itemToPawn = { id: 'refrigerator', purchasePrice: 400, purchaseSource: 'socket_city' as const };
      player.inventory.appliances = [itemToPawn];
      context.state.pawnShopItemsForSale = [{
        itemId: 'refrigerator', originalPrice: 400, redeemCost: 200, weekPawned: 1, ownerId: 'p2'
      }];

      const result = gameReducer(player, { type: 'pawn_item', item: itemToPawn, value: 160 }, context);
      expect(result.actionLog?.key).toBe('action.error.pawnShopHasDuplicate');
      expect(result.updatedPlayer.inventory.appliances.length).toBe(1);
    });
  });
});
