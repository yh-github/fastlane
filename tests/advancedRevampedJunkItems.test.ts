import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerState, createPlayerState, GameRules, StatRules } from '../src/engine/gameState';
import { buyItem } from '../src/engine/shoppingEngine';
import { recalculateLifestyle, collectItemEffects } from '../src/engine/synergyEngine';
import { calcMaxMental, calcUsedSpace } from '../src/engine/statMath';
import { calcRequiredLessons } from '../src/engine/educationEngine';
import { processTurnStart } from '../src/engine/turnProcessor';
import { processDoctorVisit } from '../src/engine/eventEngine';
import { gameReducer } from '../src/engine/gameReducer';
import { Random } from '../src/utils/rng';
import type { CampaignBundle } from '../src/engine/dataLoader';

const mockStatRules: StatRules = {
  startingHappiness: 50,
  startingRelaxation: 25,
  relaxationDecayRate: 2,
  relaxationDoctorChance: 0.20,
  startingPhysicalCondition: 50,
  startingMentalCondition: 50,
  minPhysicalCondition: 1,
  maxPhysicalCondition: 100,
  minMentalCondition: 1,
  maxMentalCondition: 85,
  globalMaxMentalCondition: 100,
  mentalMaxBaseValue: 51,
  mentalMaxBookLimit: 4,
  mentalMaxBookBonus: 1,
  mentalMaxComputerBonus: 3,
  mentalMaxDegreeBonus: 1,
  physicalDoctorThreshold: 10,
  physicalDoctorChancePerPoint: 0.05,
  doctorPhysicalBounceBack: 4,
  starvationMaxPhysicalPenalty: 10,
  lowSpiritsThreshold: 10,
  lowSpiritsChancePerPoint: 0.05,
  minMaxPhysical: 10
};

const mockCampaign: CampaignBundle = {
  id: 'advanced',
  name: 'Advanced Variant',
  version: '1.0.0',
  startingCash: 500,
  config: {
    gameRules: {
      usePhysicalMentalConditions: true,
      trackMess: true,
      spaceCapping: true,
      turnStartAtHome: true,
      conditionResolution: 0.5
    },
    statRules: mockStatRules,
    timeRules: {
      hoursPerTurn: 48,
      relaxCost: 6,
      relaxGain: 3,
      studySessionCost: 6,
      workSessionCost: 6,
      socializeCost: 6,
      cleaningServiceCost: 1,
      doctorPenalty: 4,
      starvationPenalty: 20
    },
    economyRules: {
      socializeLowCostCashCost: 25,
      socializeSecurityCashCost: 50,
      socializePenthouseCashCost: 75,
      cleaningServiceBasePrice: 100
    },
    eventRules: {
      willyRobberyStartWeek: 4
    }
  },
  housing: [
    { id: 'low_cost', name: 'Low-Cost Housing', baseRent: 325, isRobberyImmune: false, homeNodeId: 'node_low_cost', spaceCap: 100, lifestyleValue: 10 }
  ],
  items: [
    {
      id: 'stereo',
      name: 'Stereo',
      category: 'appliance',
      basePrice: 450,
      space: 20,
      lifestyleValue: 2,
      effects: [{ trigger: 'on_socialize', stat: 'social', value: 1 }]
    },
    {
      id: '8track',
      name: '8-Track Player',
      category: 'appliance',
      basePrice: 75,
      space: 10,
      lifestyleValue: 1,
      mentalBonus: -1,
      effects: [{ trigger: 'on_socialize', stat: 'social', value: 0.5 }]
    },
    {
      id: 'color_tv',
      name: 'Color TV',
      category: 'appliance',
      basePrice: 349,
      space: 20,
      lifestyleValue: 2,
      effects: [{ trigger: 'on_socialize', stat: 'social', value: 2 }]
    },
    {
      id: 'bw_tv',
      name: 'Black & White TV',
      category: 'appliance',
      basePrice: 110,
      space: 20,
      effects: [{ trigger: 'on_socialize', stat: 'social', value: 1 }]
    },
    {
      id: 'dictionary',
      name: 'Dictionary',
      category: 'book',
      basePrice: 70,
      space: 10,
      lifestyleValue: 1,
      effects: [{ trigger: 'continuous', stat: 'mental_max', value: 1 }]
    },
    {
      id: 'atlas',
      name: 'Atlas',
      category: 'book',
      basePrice: 55,
      space: 10,
      lifestyleValue: 1,
      effects: [{ trigger: 'continuous', stat: 'mental_max', value: 1 }]
    },
    {
      id: 'encyclopedia',
      name: 'Encyclopedia',
      category: 'book',
      basePrice: 475,
      space: 20,
      lifestyleValue: 1,
      effects: [{ trigger: 'continuous', stat: 'mental_max', value: 1 }]
    },
    {
      id: 'capote',
      name: 'Works of Capote',
      category: 'book',
      basePrice: 100,
      space: 10,
      lifestyleValue: 1,
      mentalBonus: -1,
      effects: [{ trigger: 'continuous', stat: 'mental_max', value: 1 }]
    },
    {
      id: 'dog_food',
      name: 'Canned Mystery Meat',
      category: 'food',
      subcategory: 'canned',
      basePrice: 18,
      mentalBonus: -2.5
    }
  ],
  education: [
    {
      id: 'business_admin',
      name: 'Business Administration',
      baseTuitionFee: 300,
      lessonsRequired: 10,
      rewards: { dependability: 5, maxDependability: 5, maxExperience: 5 },
      prerequisites: []
    }
  ],
  synergies: [],
  weekends: { ticketWeekends: {}, durableWeekends: {}, randomWeekends: [] },
  jobs: [],
  events: [],
  stocks: [],
  messages: {},
  map: { width: 10, height: 10, nodes: [{ id: 'node_low_cost', name: 'Home', buildingId: 'low_cost_housing', x: 0, y: 0, connections: [] }] }
};

describe('Advanced Edition: Revamped Former Junk Items & Survival Rules', () => {
  let player: PlayerState;

  beforeEach(() => {
    player = {
      ...createPlayerState('p1', 'Player 1', false, 'node_low_cost', mockCampaign.config, mockStatRules),
      currentHousingId: 'low_cost',
      money: 1000,
      hoursRemaining: 48,
      physicalCondition: 50,
      physicalConditionMax: 50,
      mentalCondition: 50,
      mentalConditionMax: 50,
      mess: 0,
      social: 0,
      turnFlags: {},
      inventory: {
        casualClothesWeeks: 10,
        dressClothesWeeks: 0,
        businessClothesWeeks: 0,
        freshFoodUnits: 0,
        cannedFoodUnits: 0,
        fastFoodItems: [],
        lotteryTickets: 0,
        tickets: { concert: 0, theater: 0, sports: 0, movie: 0 },
        appliances: [],
        books: [],
        pawnedItems: [],
        stocks: { tBills: 0 }
      }
    };
  });

  describe('1. 8-Track Player and Stereo Superseding', () => {
    it('buying 8-track applies -1 mental penalty, uses 10 space, and adds to appliances', () => {
      const itemDef = mockCampaign.items.find(i => i.id === '8track')!;
      const res = buyItem(player, itemDef, mockCampaign.config.gameRules, mockCampaign);

      expect(res.success).toBe(true);
      expect(res.updated.money).toBe(1000 - 75);
      expect(res.updated.mentalCondition).toBe(49); // 50 - 1
      expect(res.updated.inventory.appliances.some(a => a.id === '8track')).toBe(true);
      expect(calcUsedSpace(res.updated, mockCampaign, true)).toBe(10);
    });

    it('8-track provides +1 lifestyle and +0.5 socialize bonus when owned alone', () => {
      const equipped: PlayerState = {
        ...player,
        inventory: {
          ...player.inventory,
          appliances: [{ id: '8track', purchasePrice: 75, purchaseSource: 'z_mart' }]
        }
      };

      // Housing (10) + 8track (1) = 11
      const lifestyle = recalculateLifestyle(equipped, mockCampaign);
      expect(lifestyle).toBe(11);

      const effects = collectItemEffects(equipped, mockCampaign, 'on_socialize');
      expect(effects.get('social')).toBe(0.5);
    });

    it('when Stereo is also owned, Stereo supersedes 8-track for socialize and lifestyle', () => {
      const equippedBoth: PlayerState = {
        ...player,
        inventory: {
          ...player.inventory,
          appliances: [
            { id: '8track', purchasePrice: 75, purchaseSource: 'z_mart' },
            { id: 'stereo', purchasePrice: 450, purchaseSource: 'socket_city' }
          ]
        }
      };

      // Stereo (+2 lifestyle) supersedes 8-track (+1). Total = 10 (housing) + 2 (stereo) = 12 (not 13)
      const lifestyle = recalculateLifestyle(equippedBoth, mockCampaign);
      expect(lifestyle).toBe(12);

      // Stereo (+1 social) supersedes 8-track (+0.5 social). Total = 1.0 (not 1.5)
      const effects = collectItemEffects(equippedBoth, mockCampaign, 'on_socialize');
      expect(effects.get('social')).toBe(1);
    });

    it('Color TV supersedes B&W TV for socialize bonuses', () => {
      const equippedBothTvs: PlayerState = {
        ...player,
        inventory: {
          ...player.inventory,
          appliances: [
            { id: 'bw_tv', purchasePrice: 110, purchaseSource: 'z_mart' },
            { id: 'color_tv', purchasePrice: 349, purchaseSource: 'socket_city' }
          ]
        }
      };

      // Color TV (+2) supersedes B&W TV (+1). Total = 2 (not 3)
      const effects = collectItemEffects(equippedBothTvs, mockCampaign, 'on_socialize');
      expect(effects.get('social')).toBe(2);
    });
  });

  describe('2. Works of Capote', () => {
    it('buying Capote applies -1 mental penalty, uses 10 space, and adds to books', () => {
      const itemDef = mockCampaign.items.find(i => i.id === 'capote')!;
      const res = buyItem(player, itemDef, mockCampaign.config.gameRules, mockCampaign);

      expect(res.success).toBe(true);
      expect(res.updated.money).toBe(1000 - 100);
      expect(res.updated.mentalCondition).toBe(49); // 50 - 1
      expect(res.updated.inventory.books).toContain('capote');
      expect(calcUsedSpace(res.updated, mockCampaign, true)).toBe(10);
    });

    it('Capote grants +1 lifestyle and +1 Max Mental', () => {
      const equipped: PlayerState = {
        ...player,
        inventory: {
          ...player.inventory,
          books: ['capote']
        }
      };

      const lifestyle = recalculateLifestyle(equipped, mockCampaign);
      expect(lifestyle).toBe(11); // 10 housing + 1 Capote

      const maxMental = calcMaxMental(equipped.mess || 0, equipped.social || 0, 0, equipped, mockStatRules, mockCampaign);
      const baseMaxMental = calcMaxMental(player.mess || 0, player.social || 0, 0, player, mockStatRules, mockCampaign);
      expect(maxMental).toBe(baseMaxMental + 1);
    });

    it('Capote does NOT trigger the 3-book extra credit lesson discount', () => {
      const degree = mockCampaign.education[0]; // 10 lessons base

      // Player owns Dictionary + Atlas + Capote (3 books, but not Encyclopedia)
      const capoteSetPlayer: PlayerState = {
        ...player,
        inventory: {
          ...player.inventory,
          books: ['dictionary', 'atlas', 'capote']
        }
      };
      const capoteLessons = calcRequiredLessons(capoteSetPlayer, degree, mockCampaign.config.gameRules!);
      expect(capoteLessons).toBe(10); // NO extra credit discount!

      // Player owns Dictionary + Atlas + Encyclopedia -> grants 1 lesson discount
      const classicSetPlayer: PlayerState = {
        ...player,
        inventory: {
          ...player.inventory,
          books: ['dictionary', 'atlas', 'encyclopedia']
        }
      };
      const classicLessons = calcRequiredLessons(classicSetPlayer, degree, mockCampaign.config.gameRules!);
      expect(classicLessons).toBe(9); // Extra credit discount applied!
    });
  });

  describe('3. Canned Mystery Meat (dog_food)', () => {
    it('buying Canned Mystery Meat applies -2.5 mental penalty, drops Max Physical by 3, and adds to cannedFoodUnits', () => {
      const itemDef = mockCampaign.items.find(i => i.id === 'dog_food')!;
      const res = buyItem(player, itemDef, mockCampaign.config.gameRules, mockCampaign);

      expect(res.success).toBe(true);
      expect(res.updated.money).toBe(1000 - 18);
      expect(res.updated.mentalCondition).toBe(47.5); // 50 - 2.5
      expect(res.updated.physicalConditionMax).toBe(47); // 50 - 3
      expect(res.updated.physicalCondition).toBe(47); // capped at new max
      expect(res.updated.inventory.cannedFoodUnits).toBe(1);
    });

    it('applies generic on_purchase item effects dynamically from item definition', () => {
      const customItem = {
        id: 'test_potion',
        name: 'Test Potion',
        category: 'food' as const,
        subcategory: 'fast_food',
        basePrice: 50,
        happinessBonus: 0,
        effects: [
          { trigger: 'on_purchase' as const, stat: 'physical_max' as const, value: -5 },
          { trigger: 'on_purchase' as const, stat: 'mental_max' as const, value: 5 },
          { trigger: 'on_purchase' as const, stat: 'mess' as const, value: 2 },
          { trigger: 'on_purchase' as const, stat: 'social' as const, value: 3 }
        ]
      };

      const res = buyItem(player, customItem, mockCampaign.config.gameRules, mockCampaign);
      expect(res.success).toBe(true);
      expect(res.updated.physicalConditionMax).toBe(45); // 50 - 5
      expect(res.updated.mentalConditionMax).toBe(55); // 50 + 5
      expect(res.updated.mess).toBe(2);
      expect(res.updated.social).toBe(3);
    });

    it('canned food does NOT spoil without a refrigerator at turn start', () => {
      const cannedPlayer: PlayerState = {
        ...player,
        inventory: {
          ...player.inventory,
          cannedFoodUnits: 3,
          freshFoodUnits: 0,
          appliances: [] // No refrigerator
        }
      };

      const state = {
        turn: 1,
        players: [cannedPlayer],
        rules: mockCampaign.config.gameRules!,
        economicIndex: 0,
        rngState: 12345
      };

      const nextState = processTurnStart(state as any, mockCampaign);
      const nextP = nextState.players[0];

      // 1 can was consumed for the week, 2 cans remain, 0 spoiled mess (1 base mess for week)!
      expect(nextP.inventory.cannedFoodUnits).toBe(2);
      expect(nextP.mess).toBe(1);
      expect(nextP.turnEvents.some(e => e.key === 'events.starvation')).toBe(false);
    });

    it('having canned food counts as food for relax action', () => {
      const cannedPlayer: PlayerState = {
        ...player,
        physicalCondition: 20,
        mentalCondition: 20,
        inventory: {
          ...player.inventory,
          cannedFoodUnits: 1,
          freshFoodUnits: 0
        }
      };

      const context = {
        state: { players: [cannedPlayer], economicIndex: 0, turn: 1, rules: mockCampaign.config.gameRules! } as any,
        rules: mockCampaign.config.gameRules!,
        campaign: mockCampaign,
        turn: 1,
        rng: new Random(12345)
      };

      const relaxRes = gameReducer(cannedPlayer, { type: 'relax' }, context);
      // Relax with food grants positive physical & mental gains
      expect(relaxRes.updatedPlayer.physicalCondition).toBeGreaterThan(cannedPlayer.physicalCondition!);
      expect(relaxRes.updatedPlayer.mentalCondition).toBeGreaterThan(cannedPlayer.mentalCondition!);
    });
  });

  describe('4. Survival Rule Updates', () => {
    it('starvation drops Max Physical by 10 instead of 1', () => {
      const starvingPlayer: PlayerState = {
        ...player,
        money: 0, // avoid paying for doctor if triggered
        physicalCondition: 30,
        physicalConditionMax: 50,
        inventory: {
          ...player.inventory,
          freshFoodUnits: 0,
          cannedFoodUnits: 0,
          fastFoodItems: []
        }
      };

      const state = {
        turn: 1,
        players: [starvingPlayer],
        rules: { ...mockCampaign.config.gameRules!, bypassDoctorIfBroke: true },
        economicIndex: 0,
        rngState: 12345
      };

      const nextState = processTurnStart(state as any, mockCampaign);
      const nextP = nextState.players[0];

      expect(nextP.turnEvents.some(e => e.key === 'events.starvation')).toBe(true);
      // Max physical dropped from 50 by 10 -> 40
      expect(nextP.physicalConditionMax).toBe(40);
      expect(nextP.physicalCondition).toBe(nextP.minPhysicalCondition);
    });

    it('doctor visit bounce back restores +4 physical condition instead of +8', () => {
      const sickPlayer: PlayerState = {
        ...player,
        physicalCondition: 5,
        physicalConditionMax: 50,
        money: 500
      };

      const updated = processDoctorVisit(
        sickPlayer,
        4,
        new Random(12345),
        false,
        mockCampaign.config.gameRules,
        undefined
      );

      // Physical condition restored by +4: 5 + 4 = 9
      expect(updated.physicalCondition).toBe(9);
    });
  });
});
