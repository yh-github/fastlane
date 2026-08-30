import { describe, it, expect, beforeEach } from 'vitest';
import { createPlayerState, type PlayerState, type GameRules, type GameState } from './gameState';
import { DEFAULT_GAME_RULES } from './rules';
import { gameReducer, type ReducerContext } from './gameReducer';
import { type CampaignBundle } from './dataLoader';
import { Random } from '../utils/rng';
import { calcDependabilityDecay, calcEmployabilityScore } from './statMath';
import { workShift } from './jobEngine';
import { processDoctorVisit } from './eventEngine';

describe('Advanced Physical & Mental Condition Overhaul', () => {
  let campaign: CampaignBundle;
  let rules: GameRules;
  let player: PlayerState;
  let context: ReducerContext;

  beforeEach(() => {
    campaign = {
      config: {
        name: 'Advanced Physical Mental',
        version: '1.0.0',
        description: 'Advanced Physical & Mental rules',
        startingMoney: 1000,
        winConditions: [],
        gameRules: {
          ...DEFAULT_GAME_RULES,
          usePhysicalMentalConditions: true,
          trackMess: true,
          allowPartialHours: false
        },
        statRules: {
          minPhysicalCondition: 1,
          minMentalCondition: 1,
          initialPhysicalMax: 50,
          workPhysicalCost: 1,
          workNormalMentalCost: 0,
          workGrindThreshold: 4,
          workGrindPhysicalCost: 1,
          workGrindMentalCost: 1,
          workOvertimeThreshold: 8,
          workOvertimePhysicalCost: 2,
          workOvertimeMentalCost: 2,
          cleanPhysicalCost: 1,
          studyMentalCost: 1,
          studyNormalPhysicalCost: 0,
          relaxMessIncrease: 1,
          globalMessMin: 0
        },
        timeRules: {
          hoursPerTurn: 60,
          workSessionCost: 6,
          studySessionCost: 6,
          relaxCost: 6,
          relaxGain: 3,
          jobApplicationCost: 4,
          newspaperCost: 1,
          cleaningServiceCost: 1,
          socializeCost: 6,
          starvationPenalty: 20,
          doctorPenalty: 10,
          buildingEntryCost: 0,
          loanCost: 2,
          brokerCost: 2
        },
        economyRules: {
          rentGarnishRate: 0.5,
          rentFee: 20,
          repairCostMin: 10,
          repairCostMax: 50,
          pawnPayoutRate: 0.5,
          pawnRedeemRate: 1.0,
          cleaningServiceBasePrice: 100
        },
        eventRules: {
          willyRobberyStartWeek: 4,
          doctorCost: 500,
          lowSpiritsThreshold: 10
        }
      } as any,
      items: [
        { id: 'stove', name: 'Stove', category: 'appliance', basePrice: 200, happinessBonus: 1, effects: [{ trigger: 'on_relax', stat: 'physical', value: 1 }] },
        { id: 'microwave', name: 'Microwave', category: 'appliance', basePrice: 100, happinessBonus: 1, effects: [{ trigger: 'on_relax', stat: 'physical', value: 1 }] },
        { id: 'fries', name: 'Fries', category: 'food', subcategory: 'fast_food', basePrice: 5, happinessBonus: 0 },
        { id: 'hamburger', name: 'Hamburgers', category: 'food', subcategory: 'fast_food', basePrice: 10, happinessBonus: 1 },
        { id: 'fresh_groceries', name: 'Fresh Food', category: 'food', subcategory: 'fresh', basePrice: 20, happinessBonus: 0 }
      ],
      jobs: [
        {
          id: 'dev_job',
          title: 'Software Developer',
          locationId: 'tech_hq',
          baseWage: 20,
          requirements: { dependability: 50, experience: 20, degrees: [], uniform: 'casual' },
          perks: []
        },
        {
          id: 'cook_job',
          title: 'Line Cook',
          locationId: 'diner',
          baseWage: 10,
          requirements: { dependability: 15, experience: 0, degrees: [], uniform: 'casual' },
          perks: []
        }
      ],
      education: [
        {
          id: 'cs_degree',
          name: 'Computer Science Degree',
          lessonsRequired: 5,
          baseTuitionFee: 100,
          prerequisites: [],
          rewards: { dependability: 5, happiness: 5, maxDepBoost: 5, maxExpBoost: 5 }
        }
      ],
      buildings: [
        {
          id: 'diner',
          name: 'Diner',
          archetype: 'shop',
          spritePath: '',
          description: '',
          inventory: [{ itemId: 'fries', priceOverride: 5 }, { itemId: 'hamburger', priceOverride: 10 }]
        },
        {
          id: 'grocery_store',
          name: 'Supermarket',
          archetype: 'shop',
          spritePath: '',
          description: '',
          inventory: [{ itemId: 'fresh_groceries', priceOverride: 20 }]
        }
      ],
      housing: [
        {
          id: 'studio',
          name: 'Studio Apartment',
          baseRent: 100,
          lifestyleValue: 10,
          isRobberyImmune: false,
          homeNodeId: 'node_home',
          description: ''
        }
      ],
      map: {
        width: 1000,
        height: 1000,
        nodes: [
          { id: 'node_home', buildingId: 'home', x: 0, y: 0, connections: [] },
          { id: 'node_tech', buildingId: 'tech_hq', x: 100, y: 0, connections: [] },
          { id: 'node_diner', buildingId: 'diner', x: 200, y: 0, connections: [] },
          { id: 'node_grocery', buildingId: 'grocery_store', x: 300, y: 0, connections: [] }
        ]
      },
      messages: {},
      weekends: { ticketWeekends: {}, durableWeekends: {}, randomWeekends: [] },
      synergies: [],
      stocks: [],
      events: []
    };

    rules = {
      ...DEFAULT_GAME_RULES,
      usePhysicalMentalConditions: true,
      trackMess: true,
      allowPartialHours: false
    };

    player = createPlayerState('P1', 'Hero', false, { wealth: 1000, happiness: 50, education: 1, career: 1 }, 'node_home', campaign.config);
    player.physicalCondition = 50;
    player.physicalConditionMax = 50;
    player.mentalCondition = 50;
    player.mentalConditionMax = 50;
    player.hoursRemaining = 60;
    player.money = 1000;
    player.position = 'node_home';

    context = {
      campaign,
      rules,
      turn: 1,
      economicIndex: 0,
      rng: new Random(12345),
      state: {} as GameState,
      engineDecisions: []
    };
  });

  describe('Strict Stat Floor Check', () => {
    it('blocks work when physical condition would fall below 1.0', () => {
      player.currentJobId = 'dev_job';
      player.currentWage = 20;
      player.dependability = 50;
      player.physicalCondition = 1.0;
      player.mentalCondition = 20;

      const { updatedPlayer: nextPlayer, actionLog: log } = gameReducer(player, { type: 'work', jobId: 'dev_job', mode: 'work_work' }, context);
      expect(nextPlayer.physicalCondition).toBe(1.0);
      expect(nextPlayer.hoursRemaining).toBe(60);
      expect(log).toEqual({ key: 'action.error.tooPhysicallyExhausted' });
    });

    it('blocks study when mental condition would fall below 1.0', () => {
      player.mentalCondition = 1.0;
      player.enrolledClasses = { cs_degree: 0 };

      const { updatedPlayer: nextPlayer, actionLog: log } = gameReducer(player, { type: 'study', degreeId: 'cs_degree' }, context);
      expect(nextPlayer.mentalCondition).toBe(1.0);
      expect(nextPlayer.hoursRemaining).toBe(60);
      expect(log).toEqual({ key: 'action.error.tooExhausted' });
    });

    it('blocks clean when physical condition would fall below 1.0', () => {
      player.physicalCondition = 1.0;
      player.mess = 10;

      const { updatedPlayer: nextPlayer, actionLog: log } = gameReducer(player, { type: 'clean' }, context);
      expect(nextPlayer.physicalCondition).toBe(1.0);
      expect((log as any).key).toBe('action.error.tooExhausted');
    });
  });

  describe('Relaxing Mechanics & Unfed Penalties', () => {
    it('applies fed formula 1 + floor(Mental/25) + cooking bonuses when player has food', () => {
      player.mentalCondition = 50;
      player.physicalCondition = 30;
      player.inventory.freshFoodUnits = 2;
      player.inventory.appliances = [
        { id: 'stove', purchasePrice: 200, purchaseSource: 'socket_city' },
        { id: 'microwave', purchasePrice: 100, purchaseSource: 'socket_city' }
      ];

      // Math: 1 + floor(50 / 25) = 1 + 2 = 3 + 2 (stove + microwave) = 5
      const { updatedPlayer: nextPlayer } = gameReducer(player, { type: 'relax' }, context);
      expect(nextPlayer.physicalCondition).toBe(35);
      // Mental gain: 2 (first bonus) + 3 = 5, capped at mentalConditionMax (49 from mess)
      expect(nextPlayer.mentalCondition).toBe(49);
    });

    it('grants additional mental recovery based on floor(social / 15)', () => {
      player.mentalCondition = 30;
      player.mentalConditionMax = 50;
      player.physicalCondition = 30;
      player.social = 30; // +2 bonus
      player.mess = 0;
      player.inventory.freshFoodUnits = 2;

      const { updatedPlayer: nextPlayer } = gameReducer(player, { type: 'relax' }, context);
      // Mental gain: 2 (first bonus) + 3 (base) - 0 (mess) + 0 (appliance) + 2 (social) = 7
      expect(nextPlayer.mentalCondition).toBe(37);
    });

    it('applies unfed penalty (+1/+1, -1 Max Phys, -1 Max Mental) when relaxing without food', () => {
      player.physicalCondition = 20;
      player.physicalConditionMax = 50;
      player.mentalCondition = 20;
      player.mentalConditionMax = 50;
      player.inventory.freshFoodUnits = 0;
      player.inventory.fastFoodItems = [];

      const { updatedPlayer: nextPlayer, actionLog: log } = gameReducer(player, { type: 'relax' }, context);
      expect(nextPlayer.physicalCondition).toBe(21);
      expect(nextPlayer.mentalCondition).toBe(21);
      expect(nextPlayer.physicalConditionMax).toBe(49);
      expect(nextPlayer.mentalConditionMax).toBe(48);
      expect((log as any).key).toBe('action.relax_unfed');
    });
  });

  describe('Food Purchases', () => {
    it('hamburger does not reduce physical condition or max physical condition (stays at 0 physical change)', () => {
      player.position = 'node_diner';
      player.physicalCondition = 40;
      player.physicalConditionMax = 50;

      const { updatedPlayer: nextPlayer } = gameReducer(player, { type: 'buy', itemId: 'hamburger' }, context);
      expect(nextPlayer.physicalCondition).toBe(40);
      expect(nextPlayer.physicalConditionMax).toBe(50);
    });

    it('fast food (fries/shakes/colas) reduces physical condition and max physical condition by 1', () => {
      player.position = 'node_diner';
      player.physicalCondition = 40;
      player.physicalConditionMax = 50;

      const { updatedPlayer: nextPlayer } = gameReducer(player, { type: 'buy', itemId: 'fries' }, context);
      expect(nextPlayer.physicalCondition).toBe(39);
      expect(nextPlayer.physicalConditionMax).toBe(49);
    });

    it('fresh food grants +1 Mental and +1 Physical once per turn', () => {
      player.position = 'node_grocery';
      player.physicalCondition = 30;
      player.mentalCondition = 30;

      const { updatedPlayer: nextPlayer } = gameReducer(player, { type: 'buy', itemId: 'fresh_groceries' }, context);
      expect(nextPlayer.physicalCondition).toBe(31);
      expect(nextPlayer.mentalCondition).toBe(31);
      expect(nextPlayer.turnFlags.freshFoodHappinessGranted).toBe(true);

      // Buying a second unit in same turn does not double stat bonus
      const { updatedPlayer: secondPlayer } = gameReducer(nextPlayer, { type: 'buy', itemId: 'fresh_groceries' }, context);
      expect(secondPlayer.physicalCondition).toBe(31);
      expect(secondPlayer.mentalCondition).toBe(31);
    });
  });

  describe('Work Modes & Shifts', () => {
    beforeEach(() => {
      player.currentJobId = 'dev_job';
      player.currentWage = 20;
      player.dependability = 50;
      player.position = 'node_tech';
    });

    it('Look Busy: 0.5x Phys/Mental cost, normal wage, +0 Dep', () => {
      player.physicalCondition = 40;
      player.mentalCondition = 40;

      const { updatedPlayer: nextPlayer } = gameReducer(player, { type: 'work', jobId: 'dev_job', mode: 'look_busy' }, context);
      expect(nextPlayer.physicalCondition).toBe(39.5);
      expect(nextPlayer.mentalCondition).toBe(40);
      expect(nextPlayer.money).toBe(1000 + 20 * 8);
      expect(nextPlayer.dependability).toBe(50);
    });

    it('Work Work: 1.0x Phys/Mental cost, normal wage, +1 Dep', () => {
      player.physicalCondition = 40;
      player.mentalCondition = 40;

      const { updatedPlayer: nextPlayer } = gameReducer(player, { type: 'work', jobId: 'dev_job', mode: 'work_work' }, context);
      expect(nextPlayer.physicalCondition).toBe(39);
      expect(nextPlayer.mentalCondition).toBe(40);
      expect(nextPlayer.money).toBe(1000 + 20 * 8);
      expect(nextPlayer.dependability).toBe(51);
    });

    it('Face Time: 0.5x Phys cost, +2 Mental cost, $0 wage, scaled Dep, smooth Social', () => {
      player.physicalCondition = 40;
      player.mentalCondition = 40;
      player.social = 9;
      const initialExp = player.experience;

      const { updatedPlayer: nextPlayer } = gameReducer(player, { type: 'work', jobId: 'dev_job', mode: 'face_time' }, context);
      expect(nextPlayer.physicalCondition).toBe(39.5);
      expect(nextPlayer.mentalCondition).toBe(38); // 0 base + 2 face_time = 2
      expect(nextPlayer.money).toBe(1000); // $0 wage
      expect(nextPlayer.dependability).toBe(51.5); // 50 + 1 + ceil(9/25)/2 = 51.5
      expect(nextPlayer.experience).toBe(initialExp); // No XP gain for Face Time

      // High social (50) gives +1.0 extra Dep (total +2.0 Dep)
      player.social = 50;
      player.dependability = 50;
      const { updatedPlayer: highSocialPlayer } = gameReducer(player, { type: 'work', jobId: 'dev_job', mode: 'face_time' }, context);
      expect(highSocialPlayer.dependability).toBe(52); // 50 + 1 + ceil(50/25)/2 = 52
    });

    it('Innovate: 1.0x Phys, +2 Mental cost, 0.5x wage, rolls 2d2-2 Dep/Exp, requires degree', () => {
      player.degrees = ['cs_degree'];
      player.physicalCondition = 40;
      player.mentalCondition = 40;

      const { updatedPlayer: nextPlayer } = gameReducer(player, { type: 'work', jobId: 'dev_job', mode: 'innovate' }, context);
      expect(nextPlayer.physicalCondition).toBe(39); // 1 base
      expect(nextPlayer.mentalCondition).toBe(38); // 0 base + 2 innovate = 2
      expect(nextPlayer.money).toBe(1000 + 20 * 4); // 80 earned (0.5x wage rate)
      expect(nextPlayer.dependability + nextPlayer.experience).toBe(50 + 10 + 2); // 2 total stat points gained from 2d2-2 roll
    });
  });

  describe('Fatigue & Mistakes', () => {
    it('fatigue adds +1 Mental cost to work when physical condition is below 10', () => {
      player.currentJobId = 'dev_job';
      player.currentWage = 20;
      player.dependability = 50;
      player.physicalCondition = 8;
      player.mentalCondition = 40;

      const { updatedPlayer: nextPlayer } = gameReducer(player, { type: 'work', jobId: 'dev_job', mode: 'work_work' }, context);
      expect(nextPlayer.physicalCondition).toBe(7);
      expect(nextPlayer.mentalCondition).toBe(39); // 0 base + 1 fatigue = 1
    });

    it('work mistakes reduce dependability, increment location mistake counter, and lower max stats', () => {
      const job = campaign.jobs[0];
      player.currentJobId = job.id;
      player.currentWage = job.baseWage;
      player.physicalCondition = 2; // high chance of mistake: (10-2)*2.5% = 20%
      player.mentalCondition = 50;
      player.dependability = 50;

      // Force mistake decision
      const replay = {
        inDecisions: [{ type: `work_phys_mistake_${player.id}_1`, result: true }],
        outDecisions: []
      };
      const result = workShift(player, job, 6, rules, campaign.config.statRules, 'work_work', new Random(1), replay);

      expect(result.success).toBe(true);
      expect(result.updated.mistakesByLocation?.['tech_hq']).toBe(1);
      expect(result.updated.physicalConditionMax).toBe(49);
      expect(result.updated.dependability).toBe(50); // 0 penalty on first mistake (curMistakes was 0)
    });

    it('location mistakes apply employability penalty when applying for jobs at that location', () => {
      player.mistakesByLocation = { tech_hq: 2 };
      player.dependability = 50;
      player.experience = 20;
      player.degrees = [];

      // Tech HQ job application with 2 mistakes
      const scoreWithMistakes = calcEmployabilityScore(player.dependability, player.experience, 0, player.mistakesByLocation['tech_hq']);
      const scoreNormal = calcEmployabilityScore(player.dependability, player.experience, 0, 0);

      expect(scoreWithMistakes).toBe(scoreNormal - 2);
    });

    it('innovate mistake halts progress and penalizes stats when mental condition is below 10', () => {
      const job = campaign.jobs[0];
      player.currentJobId = job.id;
      player.currentWage = job.baseWage;
      player.physicalCondition = 50;
      player.mentalCondition = 8; // below 10 -> mistake risk
      player.dependability = 50;
      player.experience = 10;
      player.degrees = ['cs_degree'];

      // Force innovate mental mistake
      const replay = {
        inDecisions: [
          { type: `work_mental_mistake_${player.id}_1`, result: true }
        ],
        outDecisions: []
      };

      const result = workShift(player, job, 6, rules, campaign.config.statRules, 'innovate', new Random(1), replay);
      expect(result.updated.mentalConditionMax).toBe(49);
      expect(result.updated.experience).toBe(10); // no XP gain on mistake
    });

    it('study mistake halts lesson progress and reduces max stat', () => {
      player.enrolledClasses = { cs_degree: 2 };
      player.physicalCondition = 50;
      player.mentalCondition = 5; // below 10 -> mistake risk

      // Force study mental mistake
      context.engineDecisions = [{ type: `study_mental_mistake_${player.id}_1`, result: true }];

      const { updatedPlayer: nextPlayer, actionLog: log } = gameReducer(player, { type: 'study', degreeId: 'cs_degree' }, context);
      expect(nextPlayer.enrolledClasses['cs_degree']).toBe(2); // no lesson progress
      expect(nextPlayer.mentalConditionMax).toBe(49);
      expect((log as any).key).toBe('action.education.mistake');
    });
  });

  describe('Dependability Decay & Doctor Emergency Loans', () => {
    it('calcDependabilityDecay uses ceil(D_REQ / 10) for current job requirement', () => {
      // Dev job req is 50 -> ceil(50 / 10) = 5 loss -> 50 - 5 = 45
      expect(calcDependabilityDecay(50, 50, true)).toBe(45);
      // Cook job req is 15 -> ceil(15 / 10) = 2 loss -> 50 - 2 = 48
      expect(calcDependabilityDecay(50, 15, true)).toBe(48);
      // Unemployed D_REQ = 0 -> default 3 loss -> 50 - 3 = 47
      expect(calcDependabilityDecay(50, 0, true)).toBe(47);
    });

    it('doctor visits trigger on Physical < 10 and unpaid bills convert to loan debt', () => {
      player.physicalCondition = 5;
      player.money = 100; // cannot afford $500 doctor bill
      player.loanDebt = 0;

      const replay = {
        inDecisions: [{ type: 'doctor_cost', result: 500 }],
        outDecisions: []
      };

      const updated = processDoctorVisit(player, 0, context.rng, false, rules, replay);
      expect(updated.physicalCondition).toBeGreaterThanOrEqual(10);
      expect(updated.money).toBe(0);
      expect(updated.loanDebt).toBe(400); // 500 - 100 paid = 400 loan debt
    });
  });
});
