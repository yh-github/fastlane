import { describe, it, expect, beforeEach } from 'vitest';
import { createPlayerState, type PlayerState, type CampaignBundle } from './gameState';
import { calcUsedSpace, calcHousingSpaceCap } from './statMath';
import { buyItem } from './shoppingEngine';
import { gameReducer } from './gameReducer';
import { DEFAULT_GAME_RULES } from './rules';

const mockCampaign: CampaignBundle = {
  config: {
    name: 'Advanced Space Test',
    version: '1.0.0',
    startingMoney: 5000,
    winConditions: [],
    gameRules: {
      ...DEFAULT_GAME_RULES,
      spaceCapping: true,
      trackMess: true,
      helpfulUI: true
    },
    statRules: {
      startingRelaxation: 50,
      relaxationDecayRate: 5,
      relaxationDoctorChance: 0.1
    },
    economyRules: {
      rentGarnishRate: 0.25,
      rentFee: 0.1,
      repairCostMin: 0.1,
      repairCostMax: 0.2,
      pawnPayoutRate: 0.4,
      pawnRedeemRate: 0.5
    }
  },
  buildings: [
    { id: 'apartment_complex', name: 'Rent Office', archetype: 'housing', description: '' },
    { id: 'socket_city', name: 'Socket City', archetype: 'shop', description: '' },
    { id: 'pawn_shop', name: 'Pawn Shop', archetype: 'pawnshop', description: '' }
  ],
  jobs: [],
  education: [],
  housing: [
    { id: 'street', name: 'The Streets', baseRent: 0, isRobberyImmune: false, homeNodeId: 'node_low_cost', description: '', spaceCap: 0, lifestyleValue: 0 },
    { id: 'low_cost', name: 'Low-Cost Housing', baseRent: 325, isRobberyImmune: false, homeNodeId: 'node_low_cost', description: '', spaceCap: 10, lifestyleValue: 10 },
    { id: 'security', name: 'Security Apartments', baseRent: 475, isRobberyImmune: true, homeNodeId: 'node_security', description: '', spaceCap: 25, lifestyleValue: 30 },
    { id: 'penthouse', name: 'Penthouse Suite', baseRent: 850, isRobberyImmune: true, homeNodeId: 'node_security', description: '', spaceCap: 75, lifestyleValue: 50 }
  ],
  items: [
    { id: 'refrigerator', name: 'Refrigerator', category: 'appliance', basePrice: 650, happinessBonus: 1, space: 4, lifestyleValue: 1 },
    { id: 'stove', name: 'Stove', category: 'appliance', basePrice: 490, happinessBonus: 1, space: 4, lifestyleValue: 1 },
    { id: 'microwave', name: 'Microwave', category: 'appliance', basePrice: 220, happinessBonus: 1, space: 2, lifestyleValue: 2 },
    { id: 'freezer', name: 'Freezer', category: 'appliance', basePrice: 513, happinessBonus: 2, space: 3, lifestyleValue: 2 },
    { id: 'color_tv', name: 'Color TV', category: 'appliance', basePrice: 349, happinessBonus: 1, space: 2, lifestyleValue: 2 },
    { id: 'vcr', name: 'VCR', category: 'appliance', basePrice: 250, happinessBonus: 1, space: 1, lifestyleValue: 2 },
    { id: 'stereo', name: 'Stereo', category: 'appliance', basePrice: 450, happinessBonus: 1, space: 2, lifestyleValue: 2 },
    { id: 'computer', name: 'Computer', category: 'appliance', basePrice: 1599, happinessBonus: 3, space: 4, lifestyleValue: 3 },
    { id: 'hot_tub', name: 'Hot Tub', category: 'appliance', basePrice: 1255, happinessBonus: 3, space: 9, lifestyleValue: 5 },
    { id: 'dictionary', name: 'Dictionary', category: 'book', basePrice: 70, happinessBonus: 1, space: 1, lifestyleValue: 1 },
    { id: 'atlas', name: 'Atlas', category: 'book', basePrice: 55, happinessBonus: 1, space: 1, lifestyleValue: 1 },
    { id: 'encyclopedia', name: 'Encyclopedia', category: 'book', basePrice: 475, happinessBonus: 1, space: 2, lifestyleValue: 1 },
    { id: 'casual_clothes', name: 'Casual Clothes', category: 'clothes', basePrice: 35, happinessBonus: 0, weeks: 9, space: 0 },
    { id: 'food_1week', name: 'Food for 1 Week', category: 'food', basePrice: 55, happinessBonus: 1, units: 1, space: 0 },
    { id: 'lottery_tickets', name: '10 Lottery Tickets', category: 'ticket', basePrice: 10, happinessBonus: 2, space: 0 }
  ],
  events: [],
  stocks: [],
  map: { width: 10, height: 10, nodes: [{ id: 'node_low_cost', name: 'Low Cost Apt', buildingId: 'low_cost_housing', x: 0, y: 0 }] },
  messages: {},
  weekends: { ticketWeekends: {}, durableWeekends: {}, randomWeekends: [] },
  synergies: []
};

describe('Space Capping Module', () => {
  let player: PlayerState;

  beforeEach(() => {
    player = {
      ...createPlayerState('p1', 'Player 1', false, 'node_low_cost', mockCampaign.config, mockCampaign.config.statRules),
      currentHousingId: 'low_cost',
      money: 5000,
      mess: 0
    };
  });

  describe('Space Calculation (calcUsedSpace & calcHousingSpaceCap)', () => {
    it('calculates space correctly for empty inventory', () => {
      expect(calcUsedSpace(player, mockCampaign, true)).toBe(0);
      expect(calcHousingSpaceCap(player, mockCampaign)).toBe(10);
    });

    it('calculates space for appliances and books correctly', () => {
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' },
        { id: 'microwave', purchasePrice: 220, purchaseSource: 'z_mart' }
      ];
      player.inventory.books = ['dictionary', 'encyclopedia']; // 1 + 2 = 3

      // 4 (fridge) + 2 (microwave) + 1 (dict) + 2 (encyclopedia) = 9
      expect(calcUsedSpace(player, mockCampaign, false)).toBe(9);
      expect(calcUsedSpace(player, mockCampaign, true)).toBe(9);
    });

    it('calculates mess space dynamically with Math.ceil(mess / 10)', () => {
      player.inventory.appliances = [{ id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' }]; // 4 space

      player.mess = 0;
      expect(calcUsedSpace(player, mockCampaign, true)).toBe(4);

      player.mess = 1; // ceil(1/10) = 1 space
      expect(calcUsedSpace(player, mockCampaign, true)).toBe(5);

      player.mess = 10; // ceil(10/10) = 1 space
      expect(calcUsedSpace(player, mockCampaign, true)).toBe(5);

      player.mess = 11; // ceil(11/10) = 2 space
      expect(calcUsedSpace(player, mockCampaign, true)).toBe(6);

      player.mess = 25; // ceil(25/10) = 3 space
      expect(calcUsedSpace(player, mockCampaign, true)).toBe(7);
    });

    it('returns 0 for non-durables (clothes, food, tickets)', () => {
      player.inventory.casualClothesWeeks = 10;
      player.inventory.freshFoodUnits = 4;
      player.inventory.lotteryTickets = 20;

      expect(calcUsedSpace(player, mockCampaign, true)).toBe(0);
    });
  });

  describe('Shopping with Space Capping (buyItem)', () => {
    it('allows purchasing durables when within space capacity', () => {
      const fridge = mockCampaign.items.find(i => i.id === 'refrigerator')!;
      const result = buyItem(player, fridge, mockCampaign.config.gameRules, mockCampaign);

      expect(result.success).toBe(true);
      expect(result.updated.inventory.appliances.some(a => a.id === 'refrigerator')).toBe(true);
    });

    it('rejects purchasing durables when space cap would be exceeded', () => {
      // Fill to 8 space: Fridge (4) + Stove (4) = 8
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' },
        { id: 'stove', purchasePrice: 490, purchaseSource: 'z_mart' }
      ];

      // Try to buy Freezer (3 space) -> 8 + 3 = 11 > 10
      const freezer = mockCampaign.items.find(i => i.id === 'freezer')!;
      const result = buyItem(player, freezer, mockCampaign.config.gameRules, mockCampaign);

      expect(result.success).toBe(false);
      expect(result.message.key).toBe('action.error.notEnoughSpace');
      expect(result.message.params?.item).toBe('Freezer');
    });

    it('rejects purchasing books when space cap is reached', () => {
      // Fill to 9 space: Fridge (4) + Stove (4) + VCR (1) = 9
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' },
        { id: 'stove', purchasePrice: 490, purchaseSource: 'z_mart' },
        { id: 'vcr', purchasePrice: 250, purchaseSource: 'z_mart' }
      ];

      // Try to buy Encyclopedia (2 space) -> 9 + 2 = 11 > 10
      const encyclopedia = mockCampaign.items.find(i => i.id === 'encyclopedia')!;
      const result = buyItem(player, encyclopedia, mockCampaign.config.gameRules, mockCampaign);

      expect(result.success).toBe(false);
      expect(result.message.key).toBe('action.error.notEnoughSpace');
    });

    it('handles the Mess Trap: Clutter pushing space over cap blocks purchases until cleaned', () => {
      // 8 space of appliances
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' },
        { id: 'stove', purchasePrice: 490, purchaseSource: 'z_mart' }
      ];
      // Mess = 25 -> 3 space. Total space = 8 + 3 = 11 > 10
      player.mess = 25;

      // Try to buy Dictionary (1 space)
      const dictionary = mockCampaign.items.find(i => i.id === 'dictionary')!;
      const result = buyItem(player, dictionary, mockCampaign.config.gameRules, mockCampaign);

      expect(result.success).toBe(false);
      expect(result.message.key).toBe('action.error.notEnoughSpace');
    });

    it('allows buying consumables (food, clothes, tickets) even if space is full', () => {
      // Full house (10/10)
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' },
        { id: 'stove', purchasePrice: 490, purchaseSource: 'z_mart' },
        { id: 'microwave', purchasePrice: 220, purchaseSource: 'z_mart' }
      ];

      const food = mockCampaign.items.find(i => i.id === 'food_1week')!;
      const result = buyItem(player, food, mockCampaign.config.gameRules, mockCampaign);

      expect(result.success).toBe(true);
      expect(result.updated.inventory.freshFoodUnits).toBe(1);
    });

    it('allows buying all items without space restriction if spaceCapping is false', () => {
      const nonCappedRules = { ...mockCampaign.config.gameRules, spaceCapping: false };
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' },
        { id: 'stove', purchasePrice: 490, purchaseSource: 'z_mart' },
        { id: 'microwave', purchasePrice: 220, purchaseSource: 'z_mart' }
      ];

      const hotTub = mockCampaign.items.find(i => i.id === 'hot_tub')!; // 9 space
      const result = buyItem(player, hotTub, nonCappedRules, mockCampaign);

      expect(result.success).toBe(true);
    });
  });

  describe('Moving Apartments (move_apartment in gameReducer)', () => {
    it('rejects moving to smaller housing if durables exceed target space cap', () => {
      player.currentHousingId = 'security';
      // 17 space of durables
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' }, // 4
        { id: 'stove', purchasePrice: 490, purchaseSource: 'z_mart' }, // 4
        { id: 'hot_tub', purchasePrice: 1255, purchaseSource: 'socket_city' } // 9 -> total 17 space
      ];

      const context = {
        state: { players: [player], economicIndex: 0, turn: 1 } as any,
        rules: mockCampaign.config.gameRules!,
        campaign: mockCampaign
      };

      const result = gameReducer(player, { type: 'move_apartment', housingId: 'low_cost', cost: 325 }, context as any);

      expect(result.updatedPlayer.currentHousingId).toBe('security');
      const actionLog = Array.isArray(result.actionLog) ? result.actionLog[0] : result.actionLog;
      expect(actionLog?.key).toBe('action.error.notEnoughSpaceMove');
      expect(actionLog?.params?.targetName).toBe('Low-Cost Housing');
    });

    it('allows moving to smaller housing if durables fit, ignoring old apartment mess', () => {
      player.currentHousingId = 'security';
      // 8 space of durables
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' }, // 4
        { id: 'stove', purchasePrice: 490, purchaseSource: 'z_mart' } // 4 -> total 8 space
      ];
      // Mess = 40 (4 space) -> would be 12 total, but mess shouldn't block move!
      player.mess = 40;

      const context = {
        state: { players: [player], economicIndex: 0, turn: 1 } as any,
        rules: mockCampaign.config.gameRules!,
        campaign: mockCampaign
      };

      const result = gameReducer(player, { type: 'move_apartment', housingId: 'low_cost', cost: 325 }, context as any);

      expect(result.updatedPlayer.currentHousingId).toBe('low_cost');
      const actionLog = Array.isArray(result.actionLog) ? result.actionLog[0] : result.actionLog;
      expect(actionLog?.key).toBe('action.rent.moved');
      // Moving resets mess to 3 + appliances.length (3 + 2 = 5)
      expect(result.updatedPlayer.mess).toBe(5);
    });
  });

  describe('Pawn Shop & Redemption Space Checking', () => {
    it('rejects redeeming an item if it would exceed space capacity', () => {
      // 8 space of durables in 10-cap Low Cost
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' }, // 4
        { id: 'stove', purchasePrice: 490, purchaseSource: 'z_mart' } // 4
      ];
      player.inventory.pawnedItems = [{
        itemId: 'freezer', // 3 space -> 8 + 3 = 11 > 10
        originalPrice: 500,
        redeemCost: 250,
        weekPawned: 1,
        ownerId: player.id
      }];

      const context = {
        state: { players: [player], economicIndex: 0, turn: 1 } as any,
        rules: mockCampaign.config.gameRules!,
        campaign: mockCampaign
      };

      const result = gameReducer(player, {
        type: 'redeem_item',
        item: player.inventory.pawnedItems[0],
        cost: 250
      }, context as any);

      const actionLog = Array.isArray(result.actionLog) ? result.actionLog[0] : result.actionLog;
      expect(actionLog?.key).toBe('action.error.notEnoughSpace');
      expect(result.updatedPlayer.inventory.appliances.length).toBe(2);
    });

    it('allows pawning beyond 6 items in Advanced mode', () => {
      const context = {
        state: {
          players: [player],
          pawnShopItemsForSale: [
            { itemId: 'tv1', originalPrice: 100, redeemCost: 50, weekPawned: 1, ownerId: 'other' },
            { itemId: 'tv2', originalPrice: 100, redeemCost: 50, weekPawned: 1, ownerId: 'other' },
            { itemId: 'tv3', originalPrice: 100, redeemCost: 50, weekPawned: 1, ownerId: 'other' },
            { itemId: 'tv4', originalPrice: 100, redeemCost: 50, weekPawned: 1, ownerId: 'other' },
            { itemId: 'tv5', originalPrice: 100, redeemCost: 50, weekPawned: 1, ownerId: 'other' },
            { itemId: 'tv6', originalPrice: 100, redeemCost: 50, weekPawned: 1, ownerId: 'other' }
          ],
          economicIndex: 0,
          turn: 1
        } as any,
        rules: mockCampaign.config.gameRules!,
        campaign: mockCampaign
      };

      player.inventory.appliances = [{ id: 'microwave', purchasePrice: 220, purchaseSource: 'z_mart' }];

      const result = gameReducer(player, {
        type: 'pawn_item',
        item: player.inventory.appliances[0],
        value: 88
      }, context as any);

      const actionLog = Array.isArray(result.actionLog) ? result.actionLog[0] : result.actionLog;
      expect(actionLog?.key).toBe('action.pawn.pawned');
      expect(result.updatedPlayer.inventory.appliances.length).toBe(0);
      expect(result.updatedPlayer.inventory.pawnedItems?.length).toBe(1);
    });
  });

  describe('Penthouse Suite Tier', () => {
    it('allows massive durable collection and grants high space cap (75)', () => {
      player.currentHousingId = 'penthouse';
      expect(calcHousingSpaceCap(player, mockCampaign)).toBe(75);

      // Buy full suite of items: 35 space
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' },
        { id: 'freezer', purchasePrice: 513, purchaseSource: 'socket_city' },
        { id: 'stove', purchasePrice: 490, purchaseSource: 'z_mart' },
        { id: 'microwave', purchasePrice: 220, purchaseSource: 'z_mart' },
        { id: 'color_tv', purchasePrice: 349, purchaseSource: 'z_mart' },
        { id: 'vcr', purchasePrice: 250, purchaseSource: 'z_mart' },
        { id: 'stereo', purchasePrice: 450, purchaseSource: 'z_mart' },
        { id: 'computer', purchasePrice: 1599, purchaseSource: 'socket_city' },
        { id: 'hot_tub', purchasePrice: 1255, purchaseSource: 'socket_city' }
      ];
      player.inventory.books = ['dictionary', 'atlas', 'encyclopedia'];

      // 4+3+4+2+2+1+2+4+9 + 1+1+2 = 35 space used
      expect(calcUsedSpace(player, mockCampaign, false)).toBe(35);
      expect(calcUsedSpace(player, mockCampaign, false) <= 75).toBe(true);
    });
  });
});
