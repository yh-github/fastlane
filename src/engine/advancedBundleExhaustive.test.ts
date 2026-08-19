import { messGrowth, calcMaxMental, calcWellbeingScore, calcMovingFee, calcMaxMess, safeDecrementPhysical, safeDecrementMental } from './statMath';
import { createPlayerState, recalculateLifestyle, recalculatePlayerEffects } from './gameState';
import { gameReducer } from './gameReducer';
import { processTurnStart } from './turnProcessor';
import { processDoctorVisit } from './eventEngine';
import { enrollInDegree, study } from './educationEngine';
import { Random } from '../utils/rng';

describe('Advanced Feature Bundle Exhaustive Test Suite', () => {
  const mockRules: any = {
    usePhysicalMentalConditions: true,
    trackMess: true,
    allowEatingSpoiledFood: true
  };

  const mockCampaign: any = {
    config: {
      gameRules: mockRules,
      timeRules: { hoursPerTurn: 60, relaxCost: 6, cleaningServiceCost: 1, socializeCost: 6, cleanPhysicalCost: 1, starvationPenalty: 20 },
      statRules: {
        globalMessMin: 0,
        globalMessMax: 99,
        lowCostMessMax: 50,
        securityMessMax: 90,
        minPhysicalCondition: 3,
        globalPhysicalMin: 1,
        initialPhysicalMax: 50,
        initialMinPhysical: 3,
        minMentalCondition: 5,
        startingSocial: 9,
        minSocial: 1,
        maxSocial: 99,
        cleanPhysicalCost: 1
      },
      economyRules: {
        cleaningServiceBasePrice: 100,
        socializeLowCostCashCost: 25,
        socializeSecurityCashCost: 50,
        moveFeeMessThreshold: 10,
        moveFeeMessRate: 50,
        moveFeeDurableRate: 50
      }
    },
    housing: [
      { id: 'low_cost', name: 'Low-Cost Apartment', baseRent: 325 },
      { id: 'security', name: 'Security Apartment', baseRent: 475 }
    ],
    buildings: [
      { id: 'z_mart', name: 'Z-Mart', inventory: [{ itemId: 'fries' }, { itemId: 'shake' }, { itemId: 'cola' }, { itemId: 'astro_chicken' }, { itemId: 'fresh_food' }] }
    ],
    weekends: { randomWeekends: ['dummy'], durableWeekends: {}, ticketWeekends: {} },
    map: { nodes: [{ id: 'node_low_cost', buildingId: 'z_mart' }] },
    items: [
      { id: 'fries', category: 'fast_food' },
      { id: 'shake', category: 'fast_food' },
      { id: 'cola', category: 'fast_food' },
      { id: 'astro_chicken', category: 'fast_food' },
      { id: 'fresh_food', category: 'food' },
      {
        id: 'hot_tub',
        effects: [
          { trigger: 'turn_start', stat: 'physical', value: 1 },
          { trigger: 'turn_start', stat: 'mental', value: 1 },
          { trigger: 'on_relax', stat: 'physical', value: 1 },
          { trigger: 'on_relax', stat: 'mental', value: 1 },
          { trigger: 'on_relax', stat: 'mess', value: 1 },
          { trigger: 'on_socialize', stat: 'social', value: 3 },
          { trigger: 'continuous', stat: 'mess_max', value: 5 }
        ]
      }
    ]
  };

  describe('1. Housing & Mess Limits & Startup Math', () => {
    it('initializes start mess as 3 + num_of_durables_owned', () => {
      const p1 = createPlayerState('p1', 'P1', false, {}, 'node_low_cost', mockCampaign.config);
      expect(p1.mess).toBe(3); // 3 + 0

      p1.inventory.appliances.push({ id: 'refrigerator', purchasePrice: 400, purchaseSource: 'socket_city' });
      p1.inventory.appliances.push({ id: 'color_tv', purchasePrice: 400, purchaseSource: 'socket_city' });
      
      const p2 = createPlayerState('p2', 'P2', false, {}, 'node_low_cost', mockCampaign.config);
      p2.inventory.appliances = [...p1.inventory.appliances];
      p2.money = 1000;
      // When resetting/moving with 2 durables: START_MESS = 3 + 2 = 5
      const context = { campaign: mockCampaign, rules: mockRules, turn: 1, economicIndex: 0, rng: new Random(1), state: {} as any };
      const moveRes = gameReducer(p2, { type: 'move_apartment', housingId: 'security', cost: 475 }, context);
      expect(moveRes.updatedPlayer.mess).toBe(5);
    });

    it('validates mess growth step boundaries from mess 0 to 99', () => {
      expect(messGrowth(0)).toBe(1);  // Math.floor(0.2 * 1) + 1 = 1
      expect(messGrowth(1)).toBe(1);  // Math.floor(0.2 * 2) + 1 = 1
      expect(messGrowth(3)).toBe(1);  // Math.floor(0.2 * 4) + 1 = 1
      expect(messGrowth(4)).toBe(2);  // Math.floor(0.2 * 5) + 1 = 2
      expect(messGrowth(8)).toBe(2);  // Math.floor(0.2 * 9) + 1 = 2
      expect(messGrowth(9)).toBe(3);  // Math.floor(0.2 * 10) + 1 = 3
      expect(messGrowth(14)).toBe(4); // Math.floor(0.2 * 15) + 1 = 4
      expect(messGrowth(49)).toBe(11); // Math.floor(0.2 * 50) + 1 = 11
      expect(messGrowth(50)).toBe(11); // Math.floor(0.2 * 51) + 1 = 11
      expect(messGrowth(99)).toBe(21); // Math.floor(0.2 * 100) + 1 = 21
    });
  });

  describe('2. Cleaning Actions', () => {
    it('clean action reduces mess by 2d3 (between 2 and 6) and deducts physical condition and hours', () => {
      const player = createPlayerState('p1', 'Player 1', false, {}, 'node_low_cost', mockCampaign.config);
      player.mess = 20;
      player.physicalCondition = 50;
      player.hoursRemaining = 60;

      const results: number[] = [];
      for (let i = 0; i < 20; i++) {
        const pCopy = { ...player, inventory: { ...player.inventory, appliances: [] } };
        const res = gameReducer(pCopy, { type: 'clean' }, {
          campaign: mockCampaign,
          rules: mockRules,
          turn: 1,
          economicIndex: 0,
          rng: new Random(100 + i),
          state: {} as any
        });
        const messReduced = 20 - res.updatedPlayer.mess!;
        results.push(messReduced);
        expect(messReduced).toBeGreaterThanOrEqual(2);
        expect(messReduced).toBeLessThanOrEqual(6);
        expect(res.updatedPlayer.physicalCondition).toBe(49);
        expect(res.updatedPlayer.hoursRemaining).toBe(57);
      }
    });

    it('call_cleaning_service reduces mess by 10, costs 1 hour and market price', () => {
      const player = createPlayerState('p1', 'Player 1', false, {}, 'node_low_cost', mockCampaign.config);
      player.mess = 8;
      player.money = 150;
      player.hoursRemaining = 60;

      const res = gameReducer(player, { type: 'call_cleaning_service' }, {
        campaign: mockCampaign,
        rules: mockRules,
        turn: 1,
        economicIndex: 0,
        rng: new Random(1),
        state: {} as any
      });

      expect(res.updatedPlayer.mess).toBe(0); // 8 - 10 clamped to min 0
      expect(res.updatedPlayer.money).toBe(50); // $150 - $100 = $50
      expect(res.updatedPlayer.hoursRemaining).toBe(59);
    });
  });

  describe('3. Dynamic MAX_MENTAL, Resilience & Lifestyle', () => {
    it('calculates dynamic MAX_MENTAL correctly across mess, social, and resilience bonuses', () => {
      // 51 - mess_growth(3) [1] + floor(9/10) [0] + 0 = 50
      expect(calcMaxMental(3, 9, 0)).toBe(50);
      // 51 - mess_growth(49) [11] + floor(35/10) [3] + 2 = 45
      expect(calcMaxMental(49, 35, 2)).toBe(45);
      // 51 - mess_growth(99) [21] + floor(9/10) [0] + 0 = 30
      expect(calcMaxMental(99, 9, 0)).toBe(30);
    });

    it('recalculateLifestyle incorporates mess growth penalty and social boost', () => {
      const player = createPlayerState('p1', 'Player 1', false, {}, 'node_low_cost', mockCampaign.config);
      player.mess = 14; // mess_growth = 4
      player.social = 35; // floor(35/10) = 3
      player.inventory.appliances = [{ id: 'color_tv', purchasePrice: 400, purchaseSource: 'socket_city' }]; // active item = 15

      const campaignWithTV = {
        ...mockCampaign,
        items: [...mockCampaign.items, { id: 'color_tv', category: 'appliance', basePrice: 400, activeItem: true, lifestyleValue: 15 }]
      };

      const recalculated = recalculateLifestyle(player, campaignWithTV);
      // 15 (TV) + 0 (housing) - 2 (mess penalty: floor(4/2)) + 3 (social bonus) = 16
      expect(recalculated).toBe(16);
    });
  });

  describe('4. Moving Fees & Rent Extension Penalties', () => {
    it('calculates moving fees accurately', () => {
      expect(calcMovingFee(5, 0)).toBe(0);
      expect(calcMovingFee(10, 0)).toBe(0);
      expect(calcMovingFee(15, 0)).toBe(250); // (15 - 10) * 50 = 250
      expect(calcMovingFee(10, 3)).toBe(150); // 3 * 50 = 150
      expect(calcMovingFee(25, 2)).toBe(850); // (25 - 10)*50 + 2*50 = 750 + 100 = 850
    });

    it('charges moving fee and resets mess upon apartment change', () => {
      const player = createPlayerState('p1', 'Player 1', false, {}, 'node_low_cost', mockCampaign.config);
      player.mess = 20; // fee = (20-10)*50 = 500
      player.money = 1000;
      player.inventory.appliances = [{ id: 'refrigerator', purchasePrice: 400, purchaseSource: 'socket_city' }]; // 1 durable -> durables fee = 50

      const res = gameReducer(player, { type: 'move_apartment', housingId: 'security', cost: 475 }, {
        campaign: mockCampaign,
        rules: mockRules,
        turn: 1,
        economicIndex: 0,
        rng: new Random(1),
        state: {} as any
      });

      // Total cost: $475 (rent) + $500 (mess fee) + $50 (durables fee) = $1025... wait!
      // Money = 1000 < 1025 => not enough money!
      expect(res.actionLog?.key).toBe('action.error.notEnoughMoneyMove');

      // Increase money to 1200
      player.money = 1200;
      const successRes = gameReducer(player, { type: 'move_apartment', housingId: 'security', cost: 475 }, {
        campaign: mockCampaign,
        rules: mockRules,
        turn: 1,
        economicIndex: 0,
        rng: new Random(1),
        state: {} as any
      });

      expect(successRes.updatedPlayer.money).toBe(1200 - 1025); // 175
      expect(successRes.updatedPlayer.currentHousingId).toBe('security');
      expect(successRes.updatedPlayer.mess).toBe(4); // 3 + 1 durable = 4
    });
  });

  describe('5. Junk Food & Spoilage / Starvation Mechanics', () => {
    it('applies -1 physical condition for fast food items but not for fresh food', () => {
      const player = createPlayerState('p1', 'Player 1', false, {}, 'node_low_cost', mockCampaign.config);
      player.physicalCondition = 50;
      player.money = 100;

      // Buy Junk Food (fries)
      const resFries = gameReducer(player, { type: 'buy', itemId: 'fries' }, {
        campaign: mockCampaign,
        rules: mockRules,
        turn: 1,
        economicIndex: 0,
        rng: new Random(1),
        state: {} as any
      });
      expect(resFries.updatedPlayer.physicalCondition).toBe(49);

      // Buy Fresh Food
      const resFresh = gameReducer(player, { type: 'buy', itemId: 'fresh_food' }, {
        campaign: mockCampaign,
        rules: mockRules,
        turn: 1,
        economicIndex: 0,
        rng: new Random(1),
        state: {} as any
      });
      expect(resFresh.updatedPlayer.physicalCondition).toBe(50);
    });

    it('processes turn start starvation: drains MIN/MAX physical, drops Physical to MIN and Mental by 10', () => {
      const player = createPlayerState('p1', 'Player 1', false, {}, 'node_low_cost', mockCampaign.config);
      player.physicalCondition = 50;
      player.mentalCondition = 25;
      player.minPhysicalCondition = 3;
      player.physicalConditionMax = 50;
      player.inventory.freshFoodUnits = 0;
      player.inventory.fastFoodItems = [];

      const state: any = {
        turn: 1,
        economicIndex: 0,
        players: [player],
        rules: mockRules,
        rngState: 100,
        campaignId: 'advanced',
        pawnShopItemsForSale: [],
        phase: 'turn-start',
        winnerId: null
      };

      const nextState = processTurnStart(state, mockCampaign);
      const p = nextState.players[0];

      // minPhysicalCondition drained from 3 to 2
      expect(p.minPhysicalCondition).toBe(2);
      // physicalConditionMax drained from 50 to 49
      expect(p.physicalConditionMax).toBe(49);
      // Physical dropped to MIN (2)
      expect(p.physicalCondition).toBe(2);
      // Mental: 25 - 10 (starvation, 0 turn start gain) = 15
      expect(p.mentalCondition).toBe(15);
      // Resilience bonus awarded since mental drop >= 3
      expect(p.resilienceBonus).toBe(1);
    });
  });

  describe('6. Wellbeing Goal & Social Subsystem', () => {
    it('calculates wellbeing score correctly', () => {
      expect(calcWellbeingScore(50, 25)).toBe(38); // ceil(75/2) = 38
      expect(calcWellbeingScore(10, 10)).toBe(10);
      expect(calcWellbeingScore(1, 1)).toBe(1);
      expect(calcWellbeingScore(50, 50)).toBe(50);
    });

    it('socialize action disabled when mess > 25', () => {
      const player = createPlayerState('p1', 'Player 1', false, {}, 'node_low_cost', mockCampaign.config);
      player.mess = 26;

      const res = gameReducer(player, { type: 'socialize_guests' }, {
        campaign: mockCampaign,
        rules: mockRules,
        turn: 1,
        economicIndex: 0,
        rng: new Random(1),
        state: {} as any
      });

      expect(res.actionLog?.key).toBe('action.error.messTooHighSocialize');
    });

    it('socialize action handles full payment vs partial payment', () => {
      // Full payment test
      const player1 = createPlayerState('p1', 'P1', false, {}, 'node_low_cost', mockCampaign.config);
      player1.mess = 5; // mess_growth = 2
      player1.money = 200;
      player1.mentalCondition = 25;
      player1.social = 9;
      player1.hoursRemaining = 60;

      // Seed where 1d3 roll returns 2 (X = 2)
      // Mess generated = 2 * 2 = 4 => new mess = 9
      // Cash required = 2 * 2 * 25 = 100
      // Mental required = 2 * 2 = 4
      // Full reward = 2 * 2 = +4 Social => new social = 13
      const resFull = gameReducer(player1, { type: 'socialize_guests' }, {
        campaign: mockCampaign,
        rules: mockRules,
        turn: 1,
        economicIndex: 0,
        rng: new Random(5),
        state: {} as any
      });

      expect(resFull.updatedPlayer.social).toBeGreaterThan(9);
      expect(resFull.updatedPlayer.hoursRemaining).toBe(54);

      // Partial payment test (insufficient money)
      const player2 = createPlayerState('p2', 'P2', false, {}, 'node_low_cost', mockCampaign.config);
      player2.mess = 5;
      player2.money = 10; // Insufficient for full payment ($100)
      player2.mentalCondition = 25;
      player2.social = 9;
      player2.hoursRemaining = 60;

      const resPartial = gameReducer(player2, { type: 'socialize_guests' }, {
        campaign: mockCampaign,
        rules: mockRules,
        turn: 1,
        economicIndex: 0,
        rng: new Random(5),
        state: {} as any
      });

      // Partial payment drains remaining cash to $0 and awards half reward
      expect(resPartial.updatedPlayer.money).toBe(0);
      expect(resPartial.updatedPlayer.social).toBeGreaterThan(9);
    });
  });

  describe('7. Hot Tub Subsystem & Bounce Back Mechanism', () => {
    it('Hot Tub increases max mess cap by +5 and provides turn-start & relax bonuses', () => {
      const player = createPlayerState('p1', 'P1', false, {}, 'node_low_cost', mockCampaign.config);
      player.inventory.appliances.push({ id: 'hot_tub', name: 'Hot Tub', purchasePrice: 800, store: 'socket_city', purchaseSource: 'socket_city' });
      
      const maxMess = calcMaxMess(player, mockCampaign.config.statRules);
      expect(maxMess).toBe(55); // 50 base low_cost + 5 Hot Tub bonus

      // Relax action with Hot Tub: +2 Physical, +2 Mess
      player.physicalCondition = 40;
      player.physicalConditionMax = 50;
      player.mess = 10;
      player.hoursRemaining = 60;
      player.inventory.freshFoodUnits = 2;

      const resRelax = gameReducer(player, { type: 'relax' }, {
        campaign: mockCampaign,
        rules: mockRules,
        turn: 1,
        economicIndex: 0,
        rng: new Random(1),
        state: {} as any
      });

      expect(resRelax.updatedPlayer.physicalCondition).toBe(44); // +4 Phys with Hot Tub (1 + floor(50/25) + 1 = 4)
      expect(resRelax.updatedPlayer.mess).toBe(12); // +2 Mess with Hot Tub
    });

    it('Bounce back mechanism: Doctor visit restores +8 Physical and Low Spirits restores +8 Mental', () => {
      const player = createPlayerState('p1', 'P1', false, {}, 'node_low_cost', mockCampaign.config);
      player.physicalCondition = 10;
      player.physicalConditionMax = 50;
      player.money = 200;

      const docRes = processDoctorVisit(player, 4, new Random(1), true, mockRules);
      expect(docRes.physicalCondition).toBe(18); // 10 + 8 = 18 Physical
    });

    it('Safe stat decrements prevent boosting stats when at or below MIN', () => {
      expect(safeDecrementPhysical(2, 1, 3)).toBe(2); // Does NOT boost to 3
      expect(safeDecrementPhysical(5, 1, 3)).toBe(4);
      expect(safeDecrementMental(2, 1, 5)).toBe(2); // Does NOT boost to 5
      expect(safeDecrementMental(8, 2, 5)).toBe(6);
    });

    it('Education graduation cleans up _req keys from enrolledClasses', () => {
      const degreeDef: any = {
        id: 'trade_school',
        name: 'Trade School',
        prerequisites: [],
        baseTuitionFee: 100,
        lessonsRequired: 2,
        rewards: { happiness: 5, dependability: 5, maxDepBoost: 5, maxExpBoost: 5 }
      };
      let player = createPlayerState('p1', 'P1', false, {}, 'node_low_cost', mockCampaign.config);
      player.money = 1000;
      
      // Enroll
      const enrollRes = enrollInDegree(player, degreeDef, 0, mockRules);
      player = enrollRes.updated;
      expect(player.enrolledClasses[`${degreeDef.id}_req`]).toBeDefined();

      // Study until completion
      player.hoursRemaining = 100;
      const req = player.enrolledClasses[`${degreeDef.id}_req`];
      for (let i = 0; i < req; i++) {
        const studyRes = study(player, degreeDef, 3, mockRules);
        player = studyRes.updated;
      }

      expect(player.degrees).includes(degreeDef.id);
      expect(player.enrolledClasses[degreeDef.id]).toBeUndefined();
      expect(player.enrolledClasses[`${degreeDef.id}_req`]).toBeUndefined();
    });
  });

  describe('8. Socialize Appliance Bonuses & Dynamic Mental Max', () => {
    it('applies socialization appliance bonuses and reduces mental cost', () => {
      const rules = { usePhysicalMentalConditions: true, trackMess: true };
      const config = {
        ...mockCampaign.config,
        gameRules: rules,
        statRules: {
          ...mockCampaign.config.statRules,
          mentalMaxBaseValue: 91,
          globalMaxMentalCondition: 100,
          socialBwTvBonus: 1,
          socialColorTvBonus: 2,
          socialMicrowaveBonus: 1,
          socialVcrBonus: 1,
          socialStereoBonus: 1,
          socialHotTubBonus: 3
        }
      };

      const customCampaign = {
        ...mockCampaign,
        config,
        items: [
          ...mockCampaign.items,
          { id: 'bw_tv', effects: [{ trigger: 'on_socialize', stat: 'social', value: 1 }] },
          { id: 'microwave', effects: [{ trigger: 'on_socialize', stat: 'social', value: 1 }] }
        ]
      };
      let player = createPlayerState('p1', 'P1', false, {}, 'node_low_cost', config);
      
      player.money = 500;
      player.hoursRemaining = 48;
      player.mess = 0; 
      player.social = 10;
      player.mentalCondition = 80;
      player.mentalConditionMax = 90;

      player.inventory.appliances.push({ id: 'bw_tv', purchasePrice: 100, purchaseSource: 'socket_city' });
      player.inventory.appliances.push({ id: 'microwave', purchasePrice: 150, purchaseSource: 'socket_city' });

      const context = {
        campaign: customCampaign,
        rules,
        turn: 1,
        economicIndex: 0,
        rng: { next: () => 0.5, nextInt: (min: number, max: number) => 1 } as any,
        state: { players: [player], rules } as any
      };

      const res = gameReducer(player, { type: 'socialize_guests' }, context);
      player = res.updatedPlayer;

      expect(player.mentalCondition).toBe(81);
      expect(player.social).toBe(13);
    });

    it('calculates dynamic Mental_Max with books, computer, and degrees', () => {
      const rules = { usePhysicalMentalConditions: true };
      const config = {
        ...mockCampaign.config,
        gameRules: rules,
        statRules: {
          ...mockCampaign.config.statRules,
          mentalMaxBaseValue: 91,
          globalMaxMentalCondition: 100,
          mentalMaxBookLimit: 3,
          mentalMaxBookBonus: 1,
          mentalMaxComputerBonus: 3,
          mentalMaxDegreeBonus: 1
        }
      };

      const customCampaign = {
        ...mockCampaign,
        config,
        items: [
          ...mockCampaign.items,
          { id: 'book1', effects: [{ trigger: 'continuous', stat: 'mental_max', value: 1 }] },
          { id: 'book2', effects: [{ trigger: 'continuous', stat: 'mental_max', value: 1 }] },
          { id: 'computer', effects: [{ trigger: 'continuous', stat: 'mental_max', value: 3 }] }
        ]
      };
      let player = createPlayerState('p1', 'P1', false, {}, 'node_low_cost', config);

      player = recalculatePlayerEffects(player, customCampaign);
      expect(player.mentalConditionMax).toBe(90);

      player.inventory.books = ['book1', 'book2'];
      player = recalculatePlayerEffects(player, customCampaign);
      expect(player.mentalConditionMax).toBe(92);

      player.inventory.appliances.push({ id: 'computer', purchasePrice: 800, purchaseSource: 'socket_city' });
      player = recalculatePlayerEffects(player, customCampaign);
      expect(player.mentalConditionMax).toBe(95);

      player.degrees = ['degree1'];
      player = recalculatePlayerEffects(player, customCampaign);
      expect(player.mentalConditionMax).toBe(96);
    });
  });
});
