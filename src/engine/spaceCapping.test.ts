import { createTestPlayer } from './testFactories';
import { describe, it, expect, beforeEach } from 'vitest';
import { type PlayerState, type GameRules } from './gameState';
import { type CampaignBundle, type ItemDef } from './dataLoader';
import { calcUsedSpace, calcHousingSpaceCap } from './statMath';
import { buyItem } from './shoppingEngine';
import { gameReducer } from './gameReducer';
import { processTurnStart } from './turnProcessor';
import { DEFAULT_GAME_RULES } from './rules';
import { Random } from '../utils/rng';

const mockCampaign: CampaignBundle = {
  config: {
    name: 'Advanced Space Test',
    version: '1.0.0',
    description: 'Advanced Space Test Description',
    startingMoney: 5000,
    winConditions: [],
    gameRules: {
      ...DEFAULT_GAME_RULES,
      spaceCapping: true,
      trackMess: true,
      helpfulUI: true
    },
    timeRules: {
      hoursPerTurn: 60,
      workSessionCost: 6,
      studySessionCost: 6,
      jobApplicationCost: 4,
      relaxCost: 6,
      cleaningServiceCost: 1,
      socializeCost: 6,
      starvationPenalty: 20,
      doctorPenalty: 10,
      newspaperCost: 1,
      buildingEntryCost: 2,
      loanCost: 2,
      brokerCost: 2
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
    },
    mapRules: {
      movementCostPerNode: 1
    }
  },
  buildings: [
    { id: 'apartment_complex', name: 'Rent Office', archetype: 'housing', spritePath: '', description: '' },
    { id: 'socket_city', name: 'Socket City', archetype: 'shop', spritePath: '', description: '' },
    { id: 'pawn_shop', name: 'Pawn Shop', archetype: 'pawnshop', spritePath: '', description: '' }
  ],
  jobs: [],
  education: [],
  housing: [
    { id: 'street', name: 'The Streets', baseRent: 0, isRobberyImmune: false, homeNodeId: 'node_low_cost', description: '', spaceCap: 0, lifestyleValue: 0 },
    { id: 'low_cost', name: 'Low-Cost Housing', baseRent: 325, isRobberyImmune: false, homeNodeId: 'node_low_cost', description: '', spaceCap: 100, lifestyleValue: 10 },
    { id: 'security', name: 'Security Apartments', baseRent: 475, isRobberyImmune: true, homeNodeId: 'node_security', description: '', spaceCap: 250, lifestyleValue: 30 },
    { id: 'penthouse', name: 'Penthouse Suite', baseRent: 850, isRobberyImmune: true, homeNodeId: 'node_security', description: '', spaceCap: 500, lifestyleValue: 50 }
  ],
  items: [
    { id: 'refrigerator', name: 'Refrigerator', category: 'appliance', basePrice: 650, happinessBonus: 1, space: 40, lifestyleValue: 1 },
    { id: 'stove', name: 'Stove', category: 'appliance', basePrice: 490, happinessBonus: 1, space: 40, lifestyleValue: 1 },
    { id: 'microwave', name: 'Microwave', category: 'appliance', basePrice: 220, happinessBonus: 1, space: 20, lifestyleValue: 2 },
    { id: 'freezer', name: 'Freezer', category: 'appliance', basePrice: 513, happinessBonus: 2, space: 30, lifestyleValue: 2 },
    { id: 'color_tv', name: 'Color TV', category: 'appliance', basePrice: 349, happinessBonus: 1, space: 20, lifestyleValue: 2 },
    { id: 'vcr', name: 'VCR', category: 'appliance', basePrice: 250, happinessBonus: 1, space: 10, lifestyleValue: 2 },
    { id: 'stereo', name: 'Stereo', category: 'appliance', basePrice: 450, happinessBonus: 1, space: 20, lifestyleValue: 2 },
    { id: 'computer', name: 'Computer', category: 'appliance', basePrice: 1599, happinessBonus: 3, space: 40, lifestyleValue: 3 },
    { id: 'hot_tub', name: 'Hot Tub', category: 'appliance', basePrice: 1255, happinessBonus: 3, space: 90, lifestyleValue: 5 },
    { id: 'dictionary', name: 'Dictionary', category: 'book', basePrice: 70, happinessBonus: 1, space: 10, lifestyleValue: 1 },
    { id: 'atlas', name: 'Atlas', category: 'book', basePrice: 55, happinessBonus: 1, space: 10, lifestyleValue: 1 },
    { id: 'encyclopedia', name: 'Encyclopedia', category: 'book', basePrice: 475, happinessBonus: 1, space: 20, lifestyleValue: 1 },
    { id: 'casual_clothes', name: 'Casual Clothes', category: 'clothes', basePrice: 35, happinessBonus: 0, weeks: 9, space: 0 },
    { id: 'food_1week', name: 'Food for 1 Week', category: 'food', basePrice: 55, happinessBonus: 1, units: 1, space: 0 },
    { id: 'lottery_tickets', name: '10 Lottery Tickets', category: 'ticket', basePrice: 10, happinessBonus: 2, space: 0 }
  ],
  events: [],
  stocks: [],
  map: { width: 10, height: 10, nodes: [{ id: 'node_low_cost', buildingId: 'low_cost_housing', x: 0, y: 0, connections: [] }] },
  messages: {},
  weekends: { ticketWeekends: {}, durableWeekends: {}, randomWeekends: [] },
  synergies: []
};

describe('Space Capping Module', () => {
  let player: PlayerState;

  beforeEach(() => {
    player = createTestPlayer({
      id: 'p1',
      name: 'Player 1',
      currentHousingId: 'low_cost',
      money: 5000,
      mess: 0
    }, mockCampaign);
  });

  describe('Space Calculation (calcUsedSpace & calcHousingSpaceCap)', () => {
    it('calculates space correctly for empty inventory', () => {
      expect(calcUsedSpace(player, mockCampaign, true)).toBe(0);
      expect(calcHousingSpaceCap(player, mockCampaign)).toBe(100);
    });

    it('calculates space for appliances and books correctly', () => {
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' },
        { id: 'microwave', purchasePrice: 220, purchaseSource: 'z_mart' }
      ];
      player.inventory.books = ['dictionary', 'encyclopedia']; // 10 + 20 = 30

      // 40 (fridge) + 20 (microwave) + 10 (dict) + 20 (encyclopedia) = 90
      expect(calcUsedSpace(player, mockCampaign, false)).toBe(90);
      expect(calcUsedSpace(player, mockCampaign, true)).toBe(90);
    });

    it('calculates mess space directly 1:1', () => {
      player.inventory.appliances = [{ id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' }]; // 40 space

      player.mess = 0;
      expect(calcUsedSpace(player, mockCampaign, true)).toBe(40);

      player.mess = 1; // 1 space
      expect(calcUsedSpace(player, mockCampaign, true)).toBe(41);

      player.mess = 10; // 10 space
      expect(calcUsedSpace(player, mockCampaign, true)).toBe(50);

      player.mess = 15; // 15 space
      expect(calcUsedSpace(player, mockCampaign, true)).toBe(55);

      player.mess = 25; // 25 space
      expect(calcUsedSpace(player, mockCampaign, true)).toBe(65);
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
      const fridge = mockCampaign.items.find((i: ItemDef) => i.id === 'refrigerator')!;
      const result = buyItem(player, fridge, mockCampaign.config.gameRules, mockCampaign);

      expect(result.success).toBe(true);
      expect(result.updated.inventory.appliances.some(a => a.id === 'refrigerator')).toBe(true);
    });

    it('rejects purchasing durables when space cap would be exceeded', () => {
      // Fill to 80 space: Fridge (40) + Stove (40) = 80
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' },
        { id: 'stove', purchasePrice: 490, purchaseSource: 'z_mart' }
      ];

      // Try to buy Freezer (30 space) -> 80 + 30 = 110 > 100
      const freezer = mockCampaign.items.find((i: ItemDef) => i.id === 'freezer')!;
      const result = buyItem(player, freezer, mockCampaign.config.gameRules, mockCampaign);

      expect(result.success).toBe(false);
      expect(result.message.key).toBe('action.error.notEnoughSpace');
      expect(result.message.params?.item).toBe('Freezer');
    });

    it('rejects purchasing books when space cap is reached', () => {
      // Fill to 90 space: Fridge (40) + Stove (40) + VCR (10) = 90
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' },
        { id: 'stove', purchasePrice: 490, purchaseSource: 'z_mart' },
        { id: 'vcr', purchasePrice: 250, purchaseSource: 'z_mart' }
      ];

      // Try to buy Encyclopedia (20 space) -> 90 + 20 = 110 > 100
      const encyclopedia = mockCampaign.items.find((i: ItemDef) => i.id === 'encyclopedia')!;
      const result = buyItem(player, encyclopedia, mockCampaign.config.gameRules, mockCampaign);

      expect(result.success).toBe(false);
      expect(result.message.key).toBe('action.error.notEnoughSpace');
    });

    it('handles the Mess Trap: Clutter pushing space over cap blocks purchases until cleaned', () => {
      // 80 space of appliances
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' },
        { id: 'stove', purchasePrice: 490, purchaseSource: 'z_mart' }
      ];
      // Mess = 25 space. Total space = 80 + 25 = 105 > 100
      player.mess = 25;

      // Try to buy Dictionary (10 space)
      const dictionary = mockCampaign.items.find((i: ItemDef) => i.id === 'dictionary')!;
      const result = buyItem(player, dictionary, mockCampaign.config.gameRules, mockCampaign);

      expect(result.success).toBe(false);
      expect(result.message.key).toBe('action.error.notEnoughSpace');
    });

    it('allows buying consumables (food, clothes, tickets) even if space is full', () => {
      // Full house (100/100)
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' },
        { id: 'stove', purchasePrice: 490, purchaseSource: 'z_mart' },
        { id: 'microwave', purchasePrice: 220, purchaseSource: 'z_mart' }
      ];

      const food = mockCampaign.items.find((i: ItemDef) => i.id === 'food_1week')!;
      const result = buyItem(player, food, mockCampaign.config.gameRules, mockCampaign);

      expect(result.success).toBe(true);
      expect(result.updated.inventory.freshFoodUnits).toBe(1);
    });

    it('allows buying all items without space restriction if spaceCapping is false', () => {
      const nonCappedRules = { ...(mockCampaign.config.gameRules as GameRules), spaceCapping: false };
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' },
        { id: 'stove', purchasePrice: 490, purchaseSource: 'z_mart' },
        { id: 'microwave', purchasePrice: 220, purchaseSource: 'z_mart' }
      ];

      const hotTub = mockCampaign.items.find((i: ItemDef) => i.id === 'hot_tub')!; // 90 space
      const result = buyItem(player, hotTub, nonCappedRules, mockCampaign);

      expect(result.success).toBe(true);
    });
  });

  describe('Moving Apartments (move_apartment in gameReducer)', () => {
    it('rejects moving to smaller housing if durables exceed target space cap', () => {
      player.currentHousingId = 'security';
      // 170 space of durables
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' }, // 40
        { id: 'stove', purchasePrice: 490, purchaseSource: 'z_mart' }, // 40
        { id: 'hot_tub', purchasePrice: 1255, purchaseSource: 'socket_city' } // 90 -> total 170 space
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
      // 80 space of durables
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' }, // 40
        { id: 'stove', purchasePrice: 490, purchaseSource: 'z_mart' } // 40 -> total 80 space
      ];
      // Mess = 40 (40 space) -> would be 120 total, but mess shouldn't block move!
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
      // 80 space of durables in 100-cap Low Cost
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' }, // 40
        { id: 'stove', purchasePrice: 490, purchaseSource: 'z_mart' } // 40
      ];
      player.inventory.pawnedItems = [{
        itemId: 'freezer', // 30 space -> 80 + 30 = 110 > 100
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

    it('confirms pawned appliances do not provide space usage, synergies, lifestyle, or food storage', () => {
      // Player with Fridge and Stove
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' },
        { id: 'stove', purchasePrice: 490, purchaseSource: 'z_mart' }
      ];
      player.inventory.freshFoodUnits = 3;

      // Space is 80 (40 fridge + 40 stove)
      expect(calcUsedSpace(player, mockCampaign, false)).toBe(80);

      const context = {
        state: {
          players: [player],
          pawnShopItemsForSale: [],
          economicIndex: 0,
          turn: 1
        } as any,
        rules: mockCampaign.config.gameRules!,
        campaign: mockCampaign
      };

      // Pawn the refrigerator
      const pawnResult = gameReducer(player, {
        type: 'pawn_item',
        item: player.inventory.appliances[0],
        value: 200
      }, context as any);

      const updated = pawnResult.updatedPlayer;

      // 1. Used space drops by 40 (only Stove remains)
      expect(calcUsedSpace(updated, mockCampaign, false)).toBe(40);

      // 2. Appliances array only has Stove
      expect(updated.inventory.appliances.length).toBe(1);
      expect(updated.inventory.appliances[0].id).toBe('stove');

      // 3. Refrigerator is in pawnedItems
      expect(updated.inventory.pawnedItems?.length).toBe(1);
      expect(updated.inventory.pawnedItems?.[0].itemId).toBe('refrigerator');

      // 4. Synergies and food storage effects do not include the pawned fridge
      expect(updated.activeEffects['set_food_storage']).toBeUndefined();
    });
  });

  describe('Penthouse Suite Tier', () => {
    it('allows massive durable collection and grants high space cap (500)', () => {
      player.currentHousingId = 'penthouse';
      expect(calcHousingSpaceCap(player, mockCampaign)).toBe(500);

      // Buy full suite of items: 350 space
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

      // 40+30+40+20+20+10+20+40+90 + 10+10+20 = 350 space used
      expect(calcUsedSpace(player, mockCampaign, false)).toBe(350);
      expect(calcUsedSpace(player, mockCampaign, false) <= 500).toBe(true);
    });

    it('starts turn at the Security Building (node_security) after moving into penthouse', () => {
      // 1. Move into penthouse
      const context = {
        state: { players: [player], economicIndex: 0, turn: 1 } as any,
        rules: mockCampaign.config.gameRules!,
        campaign: mockCampaign
      };

      const moveResult = gameReducer(player, { type: 'move_apartment', housingId: 'penthouse', cost: 850 }, context as any);
      expect(moveResult.updatedPlayer.currentHousingId).toBe('penthouse');

      // 2. Process turn start for next week
      const gameState: any = {
        turn: 1,
        players: [moveResult.updatedPlayer],
        rules: mockCampaign.config.gameRules,
        economicIndex: 0,
        rngState: 12345
      };

      const nextState = processTurnStart(gameState, mockCampaign);
      expect(nextState.players[0].position).toBe('node_security');
    });
  });

  describe('Socializing & Space Integration', () => {
    it('rejects socializing if apartment has less than 10 free space', () => {
      player.currentHousingId = 'low_cost'; // Cap 100
      // 90 space of durables
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' }, // 40
        { id: 'stove', purchasePrice: 490, purchaseSource: 'z_mart' } // 40
      ];
      player.inventory.books = ['dictionary']; // 10 -> 90 durables
      player.mess = 5; // 90 + 5 = 95 -> 5 free space (< 10)

      const context = {
        state: { players: [player], economicIndex: 0, turn: 1, rngState: 12345 } as any,
        rules: { ...mockCampaign.config.gameRules!, spaceCapping: true },
        campaign: mockCampaign,
        rng: new Random(12345)
      };

      const result = gameReducer(player, { type: 'socialize_guests' }, context as any);
      const actionLog = Array.isArray(result.actionLog) ? result.actionLog[0] : result.actionLog;
      expect(actionLog?.key).toBe('action.error.noSpaceSocialize');
    });

    it('allows socializing if free space >= 10 even if mess > 25 when spaceCapping is true', () => {
      player.currentHousingId = 'penthouse'; // Cap 500
      player.mess = 35; // Mess > 25, but 35 mess + 0 durables = 35/500 (465 free space >= 10)
      player.money = 500;
      player.hoursRemaining = 30;
      player.physicalCondition = 40;
      player.mentalCondition = 40;

      const context = {
        state: { players: [player], economicIndex: 0, turn: 1, rngState: 12345 } as any,
        rules: { ...mockCampaign.config.gameRules!, spaceCapping: true, usePhysicalMentalConditions: true },
        campaign: mockCampaign,
        rng: new Random(12345)
      };

      const result = gameReducer(player, { type: 'socialize_guests' }, context as any);
      const actionLog = Array.isArray(result.actionLog) ? result.actionLog[0] : result.actionLog;
      expect(actionLog?.key).toBe('action.socialize');
      expect(result.updatedPlayer.social).toBeGreaterThan(9);
    });

    it('rolls 3d3 guests (3 to 9) in Penthouse, awards 1:1 base social reward and charges $25/guest', () => {
      player.currentHousingId = 'penthouse';
      player.mess = 0;
      player.money = 500;
      player.hoursRemaining = 30;
      player.physicalCondition = 40;
      player.mentalCondition = 40;
      player.social = 10;

      const context = {
        state: { players: [player], economicIndex: 0, turn: 1, rngState: 12345 } as any,
        rules: { ...mockCampaign.config.gameRules!, spaceCapping: true, usePhysicalMentalConditions: true },
        campaign: mockCampaign,
        rng: new Random(12345)
      };

      const result = gameReducer(player, { type: 'socialize_guests' }, context as any);
      const actionLog = Array.isArray(result.actionLog) ? result.actionLog[0] : result.actionLog;
      expect(actionLog?.key).toBe('action.socialize');
      const guests = Number(actionLog?.params?.guests); // 3 to 9
      expect(guests).toBeGreaterThanOrEqual(3);
      expect(guests).toBeLessThanOrEqual(9);
      expect(Number(actionLog?.params?.reward)).toBe(guests);
      expect(result.updatedPlayer.money).toBe(500 - (guests * 25));
    });

    it('dynamically clamps guest count based on available free space (10 space per guest)', () => {
      player.currentHousingId = 'penthouse'; // Cap 500
      // 500 cap - 460 used space = 40 free space -> max 4 guests
      player.mess = 460;
      player.money = 500;
      player.hoursRemaining = 30;
      player.physicalCondition = 40;
      player.mentalCondition = 40;
      player.social = 10;

      const context = {
        state: { players: [player], economicIndex: 0, turn: 1, rngState: 12345 } as any,
        rules: { ...mockCampaign.config.gameRules!, spaceCapping: true, usePhysicalMentalConditions: true },
        campaign: mockCampaign,
        rng: new Random(12345)
      };

      const result = gameReducer(player, { type: 'socialize_guests' }, context as any);
      const actionLog = Array.isArray(result.actionLog) ? result.actionLog[0] : result.actionLog;
      expect(actionLog?.key).toBe('action.socialize');
      const guests = Number(actionLog?.params?.guests);
      expect(guests).toBeLessThanOrEqual(4);
      expect(guests).toBeGreaterThanOrEqual(1);
      expect(result.updatedPlayer.money).toBe(500 - (guests * 25));
    });

    it('falls back to 25 mess limit when spaceCapping is false', () => {
      player.currentHousingId = 'low_cost';
      player.mess = 26; // > 25 mess
      player.money = 500;
      player.hoursRemaining = 30;

      const context = {
        state: { players: [player], economicIndex: 0, turn: 1, rngState: 12345 } as any,
        rules: { ...mockCampaign.config.gameRules!, spaceCapping: false },
        campaign: mockCampaign,
        rng: new Random(12345)
      };

      const result = gameReducer(player, { type: 'socialize_guests' }, context as any);
      const actionLog = Array.isArray(result.actionLog) ? result.actionLog[0] : result.actionLog;
      expect(actionLog?.key).toBe('action.error.messTooHighSocialize');
    });
  });

  describe('Overcrowding & Hazard Space Calculations', () => {
    it('accurately tracks overcapacity when durables + mess exceed housing capacity', () => {
      player.currentHousingId = 'low_cost'; // Cap 100
      player.inventory.appliances = [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'z_mart' }, // 40
        { id: 'stove', purchasePrice: 490, purchaseSource: 'z_mart' } // 40
      ];
      player.mess = 45; // 80 durables + 45 mess = 125 total space

      const durablesSpace = calcUsedSpace(player, mockCampaign, false);
      const totalSpace = calcUsedSpace(player, mockCampaign, true);
      const spaceCap = calcHousingSpaceCap(player, mockCampaign);

      expect(durablesSpace).toBe(80);
      expect(totalSpace).toBe(125);
      expect(spaceCap).toBe(100);

      const overflow = Math.max(0, totalSpace - spaceCap);
      const freeSpace = Math.max(0, spaceCap - totalSpace);

      expect(overflow).toBe(25);
      expect(freeSpace).toBe(0);
    });
  });
});
