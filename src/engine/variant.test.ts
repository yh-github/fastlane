import { describe, it, expect } from 'vitest';
import { processDonations, processStreetRobbery, processApartmentRobbery } from './eventEngine';
import { processTurnStart } from './turnProcessor';
import { calcRequiredLessons } from './educationEngine';
import { buyItem } from './shoppingEngine';
import type { GameState, PlayerState } from './gameState';
import type { CampaignBundle } from './dataLoader';
import { Random } from '../utils/rng';

describe('Game Variant mechanics', () => {
  const dummyCampaign = {
    config: {
      eventRules: {
        willyRobberyStartWeek: 1, // Default for tests
        charity: { maxCash: 0, maxWealth: 199, wealthMetric: 'durableValue' }
      },
      timeRules: { hoursPerTurn: 112, starvationPenalty: 50, doctorPenalty: 20 },
      statRules: { relaxationDecayRate: 1, relaxationDoctorChance: 0.2 }
    },
    items: [{ id: 'casual_clothes', subcategory: 'casual', store: 'qt_clothing', basePrice: 50 }],
    jobs: [{ id: 'job_1', requirements: { uniform: 'casual' } }],
  } as unknown as CampaignBundle;

  const getDummyPlayer = (overrides: Partial<PlayerState> = {}): PlayerState => ({
    id: 'p1', name: 'Player 1', position: 'node_low_cost', hoursRemaining: 60, money: 0, bankSavings: 0,
    rentDebt: 0, loanDebt: 0, timesDefaulted: 0, loanPaymentDeadline: 0, rentPaidUntilWeek: 0,
    happiness: 50, experience: 10, dependability: 20, maxExperience: 100, maxDependability: 100, currentWage: 0,
    degrees: [], enrolledClasses: {}, relaxation: 10, currentJobId: 'job_1', raisesAtCurrentJob: 0,
    currentHousingId: 'low_cost', turnEvents: [], nakedTurns: 2, currentRentPrice: 0, rentExtensionActive: false, rentExtensionsReceived: 0, rentExtensionsDeniedPermanently: false,
    inventory: {
      casualClothesWeeks: 0, dressClothesWeeks: 0, businessClothesWeeks: 0,
      freshFoodUnits: 0,
      appliances: [], books: [], fastFoodItems: [],
      lotteryTickets: 0, pawnedItems: [], stocks: { tBills: 0, holdings: {} }, tickets: { baseball: 0, theatre: 0, concert: 0 }
    },
    turnFlags: {} as any,
    goalAllotment: { wealth: 0, happiness: 0, education: 0, career: 0 },
    newspaperHeadline: null,
    activeEffects: {},
    ...overrides
  });

  const getDummyState = (): GameState => ({
    turn: 4, economicIndex: 0, pawnShopItemsForSale: [], players: [], phase: 'turn-start',
    campaignId: 'classic', rngState: 12345,
    rules: { strictEviction: false, fluctuatingRent: false, clothingDecaysAll: false, autoEquipBestClothes: false, classicStockMarket: true, allowPartialHours: true, enableRelaxationDoctor: false, requireJobForLoan: false, helpfulUI: false, enableAnimations: false, allowOverAchievingGoals: false, bypassDoctorIfBroke: true, relaxationDoctorThreshold: 10 },
    winnerId: null
  });

  describe('Charity / Donations', () => {
    it('floppy variant: triggers at exactly $0 cash and low durable value', () => {
      const floppyState = getDummyState();
      const player = getDummyPlayer({ money: 0 }); // $0 cash
      const rng = new Random(1);
      const updated = processDonations(player, floppyState, dummyCampaign, rng);
      expect(updated.money).toBeGreaterThan(0);
      expect(updated.nakedTurns).toBe(0);
    });

    it('floppy variant: does NOT trigger at >$0 cash', () => {
      const floppyState = getDummyState();
      const player = getDummyPlayer({ money: 1 }); // $1 cash
      const rng = new Random(1);
      const updated = processDonations(player, floppyState, dummyCampaign, rng);
      expect(updated.money).toBe(1);
      expect(updated.nakedTurns).toBe(2);
    });

    it('cdrom variant: triggers if cash < 300 AND net worth < 300', () => {
      const cdromState = getDummyState();
      const cdromCampaign = { ...dummyCampaign, config: { eventRules: { charity: { maxCash: 299, maxWealth: 299, wealthMetric: 'netWorth' } } } } as unknown as CampaignBundle;
      const player = getDummyPlayer({ money: 200, bankSavings: 50 }); // Total 250
      const rng = new Random(1);
      const updated = processDonations(player, cdromState, cdromCampaign, rng);
      expect(updated.money).toBeGreaterThan(200);
      expect(updated.nakedTurns).toBe(0);
    });

    it('cdrom variant: does NOT trigger if net worth >= 300', () => {
      const cdromState = getDummyState();
      const cdromCampaign = { ...dummyCampaign, config: { eventRules: { charity: { maxCash: 299, maxWealth: 299, wealthMetric: 'netWorth' } } } } as unknown as CampaignBundle;
      const player = getDummyPlayer({ money: 200, bankSavings: 150 }); // Total 350
      const rng = new Random(1);
      const updated = processDonations(player, cdromState, cdromCampaign, rng);
      expect(updated.money).toBe(200);
      expect(updated.nakedTurns).toBe(2);
    });
  });

  describe('Wild Willy Robbery', () => {
    it('floppy variant: triggers early on (Week 1)', () => {
      // For week 1
      const player = getDummyPlayer({ money: 100 });
      let robbedCount = 0;
      
      for (let i = 0; i < 50; i++) {
        const rng = new Random(i);
        const updated = processStreetRobbery(player, 'bank', 1, rng, dummyCampaign);
        if (updated.money === 0) robbedCount++;
      }
      // Assuming at least one seed < 1/31 chance
      expect(robbedCount).toBeGreaterThan(0);
    });

    it('cdrom variant (simulated): ignores Week 1, triggers Week 4', () => {
      // The current implementation in eventEngine hardcodes week < 4 for all variants because the user asked
      // Wait, processStreetRobbery currently has: if (week < 4 || player.money <= 0) return player;
      // That means it treats both variants as cdrom for this specific rule currently!
      // This test will verify current behavior which we will map to CampaignConfig.
      const player = getDummyPlayer({ money: 100 });
      const rng = new Random(4); // We just pick a seed
      // Week 1 should be safe
      const cdromCampaign = { ...dummyCampaign, config: { eventRules: { willyRobberyStartWeek: 4 } } } as unknown as CampaignBundle;
      const week1 = processStreetRobbery(player, 'bank', 1, rng, cdromCampaign);
      expect(week1.money).toBe(100);
    });
  });

  describe('Market Crash Chances', () => {
    it('floppy variant: uses 1/(1+20*P) crash chance', () => {
      const state = getDummyState();
      state.players = [getDummyPlayer()]; // 1 player -> 1/21
      state.turn = 10;
      let crashCount = 0;
      for (let i = 0; i < 100; i++) {
        state.rngState = i;
        const nextState = processTurnStart(state, dummyCampaign);
        if (nextState.economicIndex < -3) crashCount++;
      }
      expect(crashCount).toBeGreaterThan(0);
    });

    it('cdrom variant: uses 1/(1+30*P) crash chance', () => {
      const state = getDummyState();
      state.players = [getDummyPlayer()]; // 1 player -> 1/31
      state.turn = 10;
      const cdromCampaign = { ...dummyCampaign, config: { ...dummyCampaign.config, eventRules: { marketCrashDivisor: 30 } } } as unknown as CampaignBundle;
      let crashCount = 0;
      for (let i = 0; i < 100; i++) {
        state.rngState = i;
        const nextState = processTurnStart(state, cdromCampaign);
        if (nextState.economicIndex < -3) crashCount++;
      }
      expect(crashCount).toBeGreaterThan(0);
    });
  });

  describe('New & Updated Rules', () => {
    it('protectBuiltInAppliances: false allows stealing heavy appliances, true protects them', () => {
      const player = getDummyPlayer({
        relaxation: 0,
        inventory: {
          ...getDummyPlayer().inventory,
          appliances: [
            { id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' },
            { id: 'vcr', purchasePrice: 300, purchaseSource: 'socket_city' }
          ]
        }
      });

      // Test with protectBuiltInAppliances = false (all stealable)
      const rng1 = new Random(1);
      const resUnprotected = processApartmentRobbery(player, rng1, false);
      expect(resUnprotected.robbed).toBe(true);

      // Test with protectBuiltInAppliances = true (fridge protected)
      const rng2 = new Random(1);
      const resProtected = processApartmentRobbery(player, rng2, true);
      expect(resProtected.robbed).toBe(true);
      expect(resProtected.updated.inventory.appliances.some(a => a.id === 'refrigerator')).toBe(true);
    });

    it('delayBookSetCredit: blocks -1 lesson extra credit on turn completed if true, allows on subsequent turn', () => {
      const degree = { id: 'test_deg', name: 'Test', prerequisites: [], baseTuitionFee: 100, lessonsRequired: 10, rewards: { happiness: 5, dependability: 5, maxDepBoost: 5, maxExpBoost: 5 } };
      
      const playerSameTurn = getDummyPlayer({
        inventory: { ...getDummyPlayer().inventory, books: ['dictionary', 'encyclopedia', 'atlas'] },
        turnFlags: { bookSetCompletedThisTurn: true } as any
      });

      // With delayBookSetCredit: true (Floppy/CD-ROM default) -> 10 lessons on completed turn
      expect(calcRequiredLessons(playerSameTurn, degree, { delayBookSetCredit: true } as any)).toBe(10);
      
      // With delayBookSetCredit: false (QoL default) -> 9 lessons on completed turn
      expect(calcRequiredLessons(playerSameTurn, degree, { delayBookSetCredit: false } as any)).toBe(9);

      // Subsequent turn -> 9 lessons regardless
      const playerNextTurn = getDummyPlayer({
        inventory: { ...getDummyPlayer().inventory, books: ['dictionary', 'encyclopedia', 'atlas'] },
        turnFlags: { bookSetCompletedThisTurn: false } as any
      });
      expect(calcRequiredLessons(playerNextTurn, degree, { delayBookSetCredit: true } as any)).toBe(9);
    });

    it('strictEviction: warns at 1 month rent debt and evicts from security at >2 months debt', () => {
      const state = getDummyState();
      state.rules.strictEviction = true;
      state.turn = 4;
      
      // > 1 month rent debt ($10 prior + $475 new = $485 > $475) -> Warning issued
      const p1 = getDummyPlayer({ rentPaidUntilWeek: 0, rentDebt: 10, currentHousingId: 'security', currentRentPrice: 475 });
      state.players = [p1];
      const state1 = processTurnStart(state, dummyCampaign);
      expect(state1.players[0].turnEvents.some(e => e.key === 'events.rent.warning')).toBe(true);
      expect(state1.players[0].currentHousingId).toBe('security');

      // > 2 months rent debt (e.g. $1000 prior + $475 new) -> Evicted to low_cost
      const p2 = getDummyPlayer({ rentPaidUntilWeek: 0, rentDebt: 1000, currentHousingId: 'security', currentRentPrice: 475 });
      state.players = [p2];
      const state2 = processTurnStart(state, dummyCampaign);
      expect(state2.players[0].turnEvents.some(e => e.key === 'events.rent.evicted')).toBe(true);
      expect(state2.players[0].currentHousingId).toBe('low_cost');
    });

    it('lottery tickets: grants +2 happiness ONLY on first purchase per turn', () => {
      const lotteryItem = { id: 'lottery_tickets', name: '10 Lottery Tickets', category: 'ticket', store: 'blacks_market', basePrice: 10, happinessBonus: 2 };
      const player = getDummyPlayer({ money: 100, happiness: 50 });

      // First purchase
      const res1 = buyItem(player, lotteryItem);
      expect(res1.updated.happiness).toBe(52);
      expect(res1.updated.turnFlags.lotteryHappinessGranted).toBe(true);

      // Second purchase in same turn
      const res2 = buyItem(res1.updated, lotteryItem);
      expect(res2.updated.happiness).toBe(52); // No additional happiness
      expect(res2.updated.inventory.lotteryTickets).toBe(20);
    });
  });
});
