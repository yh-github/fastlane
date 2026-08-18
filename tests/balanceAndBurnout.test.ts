import { createTestGameState } from '../src/engine/testFactories';
import { describe, it, expect } from 'vitest';
import { processTurnStart } from '../src/engine/turnProcessor';
import {  } from '../src/engine/gameState';
import { fluctuateEconomy, calcEconomyPrice } from '../src/engine/economyEngine';
import { applyForJob } from '../src/engine/jobEngine';
import { Random } from '../src/utils/rng';
import type { CampaignBundle } from '../src/engine/dataLoader';
import * as fs from 'fs';
import * as path from 'path';

describe('Balance, Burnout & Spoilage Tests', () => {
  const baseCampaign: CampaignBundle = {
    id: 'advanced',
    name: 'Advanced Edition',
    version: '3.0.0',
    config: {
      gameRules: {
        strictEviction: true,
        fluctuatingRent: false,
        clothingDecaysAll: false,
        autoEquipBestClothes: false,
        classicStockMarket: false,
        allowPartialHours: true,
        enableRelaxationDoctor: false,
        requireJobForLoan: true,
        helpfulUI: true,
        enableAnimations: true,
        allowOverAchievingGoals: true,
        bypassDoctorIfBroke: false,
        relaxationDoctorThreshold: 10,
        protectBuiltInAppliances: false,
        allowEmployedRentPayment: false,
        delayBookSetCredit: false,
        allowEatingSpoiledFood: true,
        reducedDegreeStatBonus: false,
        showItemImages: true,
        maxEnrolledClasses: 4,
        turnStartAtHome: true,
        useHomeTimeRobbery: true,
        usePhysicalMentalConditions: true,
        trackMess: true,
        delayRobberyFoodSpoilage: false,
      },
      timeRules: {
        hoursPerTurn: 60,
        buildingEntryCost: 1,
        workSessionCost: 6,
        studySessionCost: 5,
        jobApplicationCost: 4,
        relaxCost: 6,
        newspaperCost: 1,
        starvationPenalty: 20,
        doctorPenalty: 10,
        burnoutPenalty: 10,
        loanCost: 1,
        brokerCost: 1,
        cleaningServiceCost: 1,
        socializeCost: 6,
      },
      economyRules: {
        rentGarnishRate: 0.5,
        rentFee: 0.1,
        repairCostMin: 0.2,
        repairCostMax: 0.6,
        pawnPayoutRate: 0.4,
        pawnRedeemRate: 0.5,
        cleaningServiceBasePrice: 100,
      },
      statRules: {
        startingHappiness: 10,
        startingRelaxation: 16,
        relaxationDecayRate: 1,
        relaxationDoctorChance: 0.2,
        startingPhysicalCondition: 50,
        startingMentalCondition: 50,
        minPhysicalCondition: 5,
        maxPhysicalCondition: 100,
        minMentalCondition: 5,
        maxMentalCondition: 85,
        globalMaxPhysicalCondition: 100,
        globalMaxMentalCondition: 100,
        initialPhysicalMax: 100,
        mentalMaxBaseValue: 86,
        physicalDoctorThreshold: 10,
        physicalDoctorChancePerPoint: 0.05,
        doctorPhysicalBounceBack: 8,
        lowSpiritsThreshold: 10,
        lowSpiritsChancePerPoint: 0.05,
        lowSpiritsMentalBounceBack: 8,
      },
    },
    housing: [
      { id: 'low_cost', name: 'Low Cost', baseRent: 325, quality: 1, homeNodeId: 'node_low_cost' }
    ],
    jobs: [],
    degrees: [],
    appliances: [
      { id: 'refrigerator', name: 'Refrigerator', basePrice: 400, effects: { set_food_storage: 5 } },
      { id: 'freezer', name: 'Freezer', basePrice: 600, effects: { set_food_storage: 10 } }
    ],
    items: [
      { id: 'refrigerator', name: 'Refrigerator', type: 'appliance', basePrice: 400, tags: ['refrigerator'] },
      { id: 'freezer', name: 'Freezer', type: 'appliance', basePrice: 600, tags: ['freezer'] }
    ],
    synergies: [
      { id: 'ref_storage', name: 'Refrigerator Storage', requires: ['item:refrigerator'], effects: [{ type: 'set_food_storage', value: 5, operation: 'MAX' }] },
      { id: 'freezer_storage', name: 'Freezer Storage', requires: ['item:freezer'], effects: [{ type: 'set_food_storage', value: 10, operation: 'ADD' }] }
    ],
    buildings: [],
    messages: {},
    map: { nodes: [], edges: [] },
    weekends: {
      ticketWeekends: {},
      durableWeekends: {},
      randomWeekends: ['rest']
    }
  };

  describe('Burnout & Mental Health Leave', () => {
    it('triggers burnout leave without medical fees when mental condition is low', () => {
      const campaign = structuredClone(baseCampaign);
      campaign.config.statRules.lowSpiritsChancePerPoint = 1.0; // Guaranteed trigger

      let state = createTestGameState(campaign, [{ name: 'Player 1', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }], 'node_low_cost');
      state.turn = 2;
      state.players[0].mentalCondition = 6; // Below threshold of 10
      state.players[0].physicalCondition = 50; // Healthy physical condition
      state.players[0].money = 500;
      state.players[0].hoursRemaining = 60;

      const nextState = processTurnStart(state, campaign);
      const player = nextState.players[0];

      // Verify no doctor fee charged (only weekend cost of $18 deducted from 500 -> 482)
      expect(player.money).toBe(482);

      // Verify time penalty deducted for mental health leave (10 hours)
      expect(player.hoursRemaining).toBe(50);

      // Verify mental bounce back (+8 from 6 - 1 mess decay = 13)
      expect(player.mentalCondition).toBe(13);

      // Verify burnout event logged
      expect(player.turnEvents.some(e => e.key === 'events.burnout')).toBe(true);
      expect(player.turnEvents.some(e => e.key === 'events.doctorVisit')).toBe(false);
    });
  });

  describe('Robbery and Food Spoilage Resolution', () => {
    it('rots food immediately when refrigerator is stolen and delayRobberyFoodSpoilage is false', () => {
      const campaign = structuredClone(baseCampaign);
      campaign.config.gameRules.delayRobberyFoodSpoilage = false;

      let state = createTestGameState(campaign, [{ name: 'Player 1', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }], 'node_low_cost');
      state.turn = 4;
      state.players[0].inventory.appliances = [{ id: 'refrigerator', name: 'Refrigerator', weekBought: 1 }];
      state.players[0].inventory.freshFoodUnits = 4;
      state.players[0].activeEffects = { set_food_storage: 5 };

      // Force apartment robbery of refrigerator
      state.debugQueue = [{
        type: 'apartment_robbery',
        playerId: 'player_1',
        stolenItemIds: ['refrigerator']
      }];

      const nextState = processTurnStart(state, campaign);
      const player = nextState.players[0];

      // Refrigerator stolen
      expect(player.inventory.appliances.length).toBe(0);
      // Without delayRobberyFoodSpoilage, fresh food capacity dropped to 0 immediately, so all 4 units spoiled
      expect(player.turnEvents.some(e => e.key.startsWith('events.foodSpoiled'))).toBe(true);
    });

    it('preserves food for 1 turn grace period when delayRobberyFoodSpoilage is true', () => {
      const campaign = structuredClone(baseCampaign);
      campaign.config.gameRules.delayRobberyFoodSpoilage = true;

      let state = createTestGameState(campaign, [{ name: 'Player 1', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }], 'node_low_cost');
      state.turn = 4;
      state.players[0].inventory.appliances = [{ id: 'refrigerator', name: 'Refrigerator', weekBought: 1 }];
      state.players[0].inventory.freshFoodUnits = 4;
      state.players[0].activeEffects = { set_food_storage: 5 };

      // Force apartment robbery of refrigerator
      state.debugQueue = [{
        type: 'apartment_robbery',
        playerId: 'player_1',
        stolenItemIds: ['refrigerator']
      }];

      const nextState = processTurnStart(state, campaign);
      const player = nextState.players[0];

      // Refrigerator stolen
      expect(player.inventory.appliances.length).toBe(0);
      // With delayRobberyFoodSpoilage grace period, food did not spoil on turn of robbery (eaten 1, remaining 3)
      expect(player.turnEvents.some(e => e.key.startsWith('events.foodSpoiled'))).toBe(false);
      expect(player.inventory.freshFoodUnits).toBe(3);
    });
  });

  describe('Economic Fluctuations and Mean Reversion', () => {
    it('applies downward pressure when economy index is high (>50) and trend is positive', () => {
      const rng = new Random(42);
      // Index at 75, Trend +2 -> trend should resist growing further
      const [reading, trend] = fluctuateEconomy(75, 2, -30, rng);
      expect(trend).toBeLessThanOrEqual(2);
      expect(reading).toBeLessThanOrEqual(90);
    });

    it('applies upward pressure when economy index is low (<-10) and trend is negative', () => {
      const rng = new Random(42);
      // Index at -20, Trend -2 -> trend should resist sinking further
      const [reading, trend] = fluctuateEconomy(-20, -2, -30, rng);
      expect(trend).toBeGreaterThanOrEqual(-2);
    });
  });

  describe('Job Application Early-Turn Masking', () => {
    const mockJob = {
      id: 'exec_manager',
      title: 'Executive Manager',
      locationId: 'bank',
      baseWage: 50,
      requirements: {
        experience: 30,
        dependability: 50,
        degrees: ['degree_business'],
        requiredClothes: 'business' as const
      },
      openings: 1
    };

    it('masks missing qualifications as "no openings" on turns 1-4 when maskEarlyJobRejections is true (Classic Floppy / CD-ROM)', () => {
      const rng = new Random(1);
      const player = createTestGameState(baseCampaign, [{ name: 'P1', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }], 'node_low_cost').players[0];
      player.experience = 10; // Fails reqExperience (30)

      const classicRules = { ...baseCampaign.config.gameRules, maskEarlyJobRejections: true };

      // On turn 2 (< 5), unqualified player gets "no openings"
      const resultEarly = applyForJob(player, mockJob as any, 4, {}, undefined, rng, classicRules, 2);
      expect(resultEarly.success).toBe(false);
      expect(resultEarly.message?.key).toBe('action.job.noOpenings');

      // On turn 5 (>= 5), unqualified player gets explicit rejection reason
      const resultLate = applyForJob(player, mockJob as any, 4, {}, undefined, rng, classicRules, 5);
      expect(resultLate.success).toBe(false);
      expect(resultLate.message?.key).toBe('action.job.rejected');
      expect((resultLate.message?.params as any)?.reasons).toContain('experience');
    });

    it('shows exact missing requirement on turns 1-4 when maskEarlyJobRejections is false (QoL / Advanced)', () => {
      const rng = new Random(1);
      const player = createTestGameState(baseCampaign, [{ name: 'P1', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }], 'node_low_cost').players[0];
      player.experience = 10;

      const qolRules = { ...baseCampaign.config.gameRules, maskEarlyJobRejections: false };

      // On turn 2 with maskEarlyJobRejections false, player gets explicit reasons immediately
      const result = applyForJob(player, mockJob as any, 4, {}, undefined, rng, qolRules, 2);
      expect(result.success).toBe(false);
      expect(result.message?.key).toBe('action.job.rejected');
      expect((result.message?.params as any)?.reasons).toContain('experience');
    });
  });

  describe('Physical Doctor Visit vs Mental Burnout', () => {
    it('triggers physical doctor visit with medical bill and physical bounce back when physical condition is low', () => {
      const campaign = structuredClone(baseCampaign);
      campaign.config.statRules.physicalDoctorChancePerPoint = 1.0; // Guaranteed trigger

      let state = createTestGameState(campaign, [{ name: 'Player 1', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }], 'node_low_cost');
      state.turn = 2;
      state.players[0].physicalCondition = 5; // Below threshold of 10
      state.players[0].mentalCondition = 50; // Healthy mental condition
      state.players[0].money = 500;
      state.players[0].hoursRemaining = 60;

      const nextState = processTurnStart(state, campaign);
      const player = nextState.players[0];

      // Verify doctor fee was charged ($30–$200)
      expect(player.money).toBeLessThan(482);

      // Verify physical bounce back (+8 from processDoctorVisit: 5 - 1 mess decay + 8 = 12)
      expect(player.physicalCondition).toBe(12);

      // Verify doctor visit event logged
      expect(player.turnEvents.some(e => e.key.startsWith('events.doctorVisit'))).toBe(true);
      expect(player.turnEvents.some(e => e.key === 'events.burnout')).toBe(false);
    });
  });

  describe('Market Crash Magnitude & Penalties', () => {
    it('drops economy by 50 points and fires player on Major Market Crash', () => {
      const campaign = structuredClone(baseCampaign);
      campaign.jobs = [{ id: 'job_bank_teller', title: 'Teller', locationId: 'bank', baseWage: 12, requirements: { experience: 0, dependability: 0, degrees: [] }, openings: 1 } as any];

      let state = createTestGameState(campaign, [{ name: 'Player 1', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }], 'node_low_cost');
      state.turn = 8;
      state.economicIndex = 85;
      state.players[0].currentJobId = 'job_bank_teller';
      state.players[0].bankSavings = 1000;

      // Force major crash via debug queue
      state.debugQueue = [{
        type: 'market_crash',
        crashSeverity: 'major'
      }];

      const nextState = processTurnStart(state, campaign);
      const player = nextState.players[0];

      // Economic index dropped by 50 (fluctuated around 85 - 50 <= 40)
      expect(nextState.economicIndex).toBeLessThanOrEqual(40);
      expect(nextState.economicTrend).toBeLessThanOrEqual(-2);

      // Major crash wipes bank savings and fires job
      expect(player.bankSavings).toBe(0);
      expect(player.currentJobId).toBeNull();
      expect(player.turnEvents.some(e => e.key === 'events.marketCrash.jobLost')).toBe(true);
      expect(player.turnEvents.some(e => e.key === 'events.marketCrash.bankSavingsLost')).toBe(true);
    });
  });

  describe('Cleaning Service Dynamic Pricing', () => {
    it('calculates economy-adjusted cleaning service price', () => {
      const basePrice = 100;
      // At neutral economy (0), price is $100
      expect(calcEconomyPrice(basePrice, 0)).toBe(100);

      // At boom (+50), price increases
      expect(calcEconomyPrice(basePrice, 50)).toBeGreaterThan(100);

      // At bust (-30), price decreases
      expect(calcEconomyPrice(basePrice, -30)).toBeLessThan(100);
    });
  });

  describe('Localization Completeness', () => {
    it('contains all required keys in en.json and he.json', () => {
      const en = JSON.parse(fs.readFileSync(path.resolve('src/locales/en.json'), 'utf8'));
      const he = JSON.parse(fs.readFileSync(path.resolve('src/locales/he.json'), 'utf8'));

      expect(en.events.burnout).toBeDefined();
      expect(he.events.burnout).toBeDefined();
      expect(en.events.marketCrash.jobLost).toBeDefined();
      expect(he.events.marketCrash.jobLost).toBeDefined();
      expect(en.events.marketCrash.wageCut).toBeDefined();
      expect(he.events.marketCrash.wageCut).toBeDefined();
      expect(en.events.marketCrash.bankSavingsLost).toBeDefined();
      expect(he.events.marketCrash.bankSavingsLost).toBeDefined();
      expect(en.events.economicBoom.investorBonus).toBeDefined();
      expect(he.events.economicBoom.investorBonus).toBeDefined();
      expect(en.action.callCleaningService).toBeDefined();
      expect(he.action.callCleaningService).toBeDefined();
      expect(en.weekendScreen.mental).toBeDefined();
      expect(he.weekendScreen.mental).toBeDefined();
    });
  });
});
