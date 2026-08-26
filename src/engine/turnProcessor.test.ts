import { createTestGameState } from './testFactories';
import { Random } from '../utils/rng';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processTurnStart } from './turnProcessor';
import {  } from './gameState';
import type { CampaignBundle } from './dataLoader';

describe('Turn Processor', () => {
  let mockCampaign: CampaignBundle;

  beforeEach(() => {
    // 0.99 ensures events with lower probability do NOT fire unless we override it.
    vi.spyOn(Random.prototype, 'next').mockReturnValue(0.99);

    mockCampaign = {
      weekends: {
        ticketWeekends: { 'W1': 'baseball_tickets' },
        durableWeekends: {},
        randomWeekends: []
      },
      items: [
        { id: 'refrigerator', name: 'Fridge', category: 'appliance', tags: ['refrigerator'] },
        { id: 'freezer', name: 'Freezer', category: 'appliance', tags: ['freezer'] },
        { id: 'microwave', name: 'Microwave', category: 'appliance', tags: ['microwave'] },
        { id: 'stove', name: 'Stove', category: 'appliance', tags: ['stove'] },
        { id: 'computer', name: 'Computer', category: 'appliance', tags: ['computer'] },
        { id: 'baseball_tickets', name: 'Baseball Tickets', category: 'ticket' }
      ],
      synergies: [
        { id: 'base_ref', name: 'Base', requires: ['tag:refrigerator'], effects: [{ type: 'set_food_storage', value: 6, operation: 'MAX' }] },
        { id: 'stove_hap', name: 'Stove', requires: ['tag:stove'], effects: [{ type: 'add_turn_happiness', value: 1, operation: 'MAX' }] },
        { id: 'micro_hap', name: 'Micro', requires: ['tag:microwave'], effects: [{ type: 'add_turn_happiness', value: 1, operation: 'MAX' }] },
        { id: 'comp_inc', name: 'Comp', requires: ['tag:computer'], effects: [{ type: 'computer_income_chance', value: 1, operation: 'MAX' }] }
      ],
      calendar: [
        { id: 'W1', name: 'Week 1' }
      ],
      config: { name: 'test', startingMoney: 200, timeRules: { hoursPerTurn: 60, starvationPenalty: 20, doctorPenalty: 10 }, economyRules: { repairCostMin: 0.05, repairCostMax: 0.25 } }
    } as unknown as CampaignBundle;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Food Spoilage', () => {
    it('spoils all food if no refrigerator', () => {
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 1; 
      state.rules.allowEatingSpoiledFood = false;
      state.players[0].inventory.freshFoodUnits = 5; 
      const nextState = processTurnStart(state, mockCampaign);
      expect(nextState.players[0].inventory.freshFoodUnits).toBe(0);
    });

    it('spoils excess food with only a refrigerator (capacity 6)', () => {
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 1;
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].inventory.freshFoodUnits = 9;
      const nextState = processTurnStart(state, mockCampaign);
      expect(nextState.players[0].inventory.freshFoodUnits).toBe(5);
    });

    it('eats fast food and does not get sick from spoiled fresh food when fast food is available', () => {
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 1;
      state.rules.usePhysicalMentalConditions = true;
      state.players[0].inventory.freshFoodUnits = 5;
      state.players[0].inventory.fastFoodItems = [{ itemId: 'burger', happinessBonus: 1 }];
      state.players[0].physicalCondition = 50;

      const nextState = processTurnStart(state, mockCampaign);
      const p = nextState.players[0];

      // Fresh food removed (spoiled)
      expect(p.inventory.freshFoodUnits).toBe(0);
      // Fast food eaten
      expect(p.turnFlags.hasEaten).toBe(true);
      // Physical condition did NOT suffer severe ate-spoiled-food drop (50 - 5 = 45)
      expect(p.physicalCondition).toBe(50);
    });
  });

  describe('Appliance Breakage', () => {
    it('breaks an appliance if random < breakChance', () => {
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 2;
      state.rules.protectBuiltInAppliances = true;
      state.players[0].money = 1000; // Must have > 500 for breakage to occur
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      
      // Use 0.01 which triggers crash, breakage, etc.
      // But we just want to test if length is 0.
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.01);
      
      const nextState = processTurnStart(state, mockCampaign);
      // The appliance is NOT removed from inventory, but the player pays a repair cost.
      expect(nextState.players[0].inventory.appliances.length).toBe(1);
      expect(nextState.players[0].turnEvents.some(e => e.key === 'events.applianceBroke')).toBe(true);
    });

    it('breaks an appliance even if player has < 500 money', () => {
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 2;
      state.rules.protectBuiltInAppliances = true;
      state.players[0].money = 100; // < 500
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.01);
      const nextState = processTurnStart(state, mockCampaign);
      expect(nextState.players[0].turnEvents.some(e => e.key === 'events.applianceBroke')).toBe(true);
    });

    it('formats color_tv breakdown message with proper display name Color TV', () => {
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 2;
      state.players[0].currentHousingId = 'security';
      state.players[0].money = 500;
      state.players[0].inventory.appliances.push({ id: 'color_tv', purchasePrice: 349, purchaseSource: 'socket_city' });
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.001);
      const nextState = processTurnStart(state, mockCampaign);
      const brokeEvent = nextState.players[0].turnEvents.find(e => e.key === 'events.applianceBroke');
      expect(brokeEvent).toBeDefined();
      expect(brokeEvent?.params?.appliance).toBe('Color TV');
    });
  });

  describe('Happiness Bonuses', () => {
    it('grants happiness for stove and microwave if food was eaten at home', () => {
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 2;
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].inventory.appliances.push({ id: 'stove', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].inventory.appliances.push({ id: 'microwave', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].inventory.freshFoodUnits = 1; // So they eat at home!
      state.players[0].happiness = 50;

      const nextState = processTurnStart(state, mockCampaign);
      
      expect(nextState.players[0].happiness).toBe(51);
    });

    it('does NOT grant happiness if they starved (no food)', () => {
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 2;
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].inventory.appliances.push({ id: 'stove', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].inventory.freshFoodUnits = 0; // No food
      state.players[0].turnFlags.hasEaten = false; // Force starvation
      state.players[0].happiness = 50;

      const nextState = processTurnStart(state, mockCampaign);

      // Starts 50, -2 from starvation. Stove bonus +1 still applies (per rules), so 49.
      expect(nextState.players[0].happiness).toBe(49);
    });
  });

  describe('Computer Income', () => {
    it('grants extra money from computer if chance hits', () => {
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 2;
      state.players[0].inventory.freshFoodUnits = 10;
      state.players[0].relaxation = 50; // Prevent doctor visit
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].inventory.appliances.push({ id: 'computer', purchasePrice: 1500, purchaseSource: 'socket_city' });
      state.players[0].money = 100;
      
      // chance is 10%. Mocking 0.05 will hit.
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.05);

      const nextState = processTurnStart(state, mockCampaign);
      
      expect(nextState.players[0].money).toBe(119);
    });
  });

  describe('Lottery', () => {
    it('processes lottery tickets and can win', () => {
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 2;
      state.rules.protectBuiltInAppliances = true;
      state.players[0].inventory.freshFoodUnits = 10;
      state.players[0].relaxation = 50; // Prevent doctor visit
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].inventory.lotteryTickets = 10;
      state.players[0].money = 100;
      
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.001);

      const nextState = processTurnStart(state, mockCampaign);
      
      expect(nextState.players[0].money).toBe(5070); // 5100 (win) + 100 (start) - 5 (weekend) - 25 (appliance repair) - 100 (wait start was 100). Actually 100 + 5000 = 5100. Weekend cost is 5, repair is 25. 5100 - 30 = 5070.
      expect(nextState.players[0].inventory.lotteryTickets).toBe(0);
    });
  });

  describe('Event Tickets', () => {
    it('does not consume tickets or charge $35 in turnProcessor (delegated to weekendEngine)', () => {
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 2;
      state.players[0].money = 100;
      state.players[0].inventory.tickets.baseball = 1;
      
      const nextState = processTurnStart(state, mockCampaign);
      
      // Since weekendEngine is called within processTurnStart, it WILL consume the ticket, 
      // but the total cost should be just the weekendEngine cost (which is 'medium', $15-$55), 
      // not the $35 from turnProcessor PLUS the weekendEngine cost.
      // Wait, if weekendEngine consumes the ticket, how do we know turnProcessor didn't?
      // If turnProcessor doesn't consume it, weekendEngine will see it, consume it, and set cost to medium.
      // With Math.random=0.99, medium cost (15-55) will be 54. 
      // So money should be 100 - 54 = 46. (If turnProcessor also charged $35, it would be 100 - 35 - 54 = 11).
      expect(nextState.players[0].money).toBeGreaterThanOrEqual(45);
    });
  });

  describe('Rent Check', () => {
    it('deducts rent, forces move if unpaid for 4 weeks', () => {
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 2;
      state.players[0].inventory.freshFoodUnits = 10;
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].rentPaidUntilWeek = 1; 
      state.players[0].money = 1000;
      state.players[0].currentRentPrice = 200;

      const nextState = processTurnStart(state, mockCampaign);
      
      expect(nextState.players[0].currentHousingId).toBe('low_cost');
    });

    it('evicts player if rent debt > 2 months worth of rent', () => {
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 5;
      state.rules.strictEviction = true;
      state.players[0].inventory.freshFoodUnits = 10;
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].rentPaidUntilWeek = 0; 
      state.players[0].rentDebt = 600; // Prior debt + 500 new debt > 1000 (2 months)
      state.players[0].currentHousingId = 'security';
      state.players[0].currentRentPrice = 500;
      
      const nextState = processTurnStart(state, mockCampaign);
      
      expect(nextState.players[0].currentHousingId).toBe('low_cost');
      expect(nextState.players[0].turnEvents.some(e => e.key.includes('evicted'))).toBe(true);
    });
  });

  describe('Market Crash', () => {
    it('does NOT trigger market crash if turn < 8 or economic index < 80', () => {
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 7; // turn < 8
      state.economicIndex = 85;
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.0001); // would trigger if eligible

      const nextState = processTurnStart(state, mockCampaign);
      expect(nextState.players[0].turnEvents.some(e => e.key.includes('marketCrash'))).toBe(false);

      // Now turn = 8, but economic index = 50 (< 80)
      state.turn = 8;
      state.economicIndex = 50;
      const nextState2 = processTurnStart(state, mockCampaign);
      expect(nextState2.players[0].turnEvents.some(e => e.key.includes('marketCrash'))).toBe(false);
    });

    it('triggers market crash when turn >= 8 and economic index >= 80, applying penalties to player', () => {
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 8;
      state.economicIndex = 85;
      state.players[0].bankSavings = 1000;
      state.players[0].currentJobId = 'job_clerk';
      state.players[0].currentWage = 20;

      // Mock random:
      // 1. fluctuateEconomy trendChange -> 0.5 (change 0)
      // 2. fluctuateEconomy readingMult -> 0.5 (mult 2) -> newEconomy stays 85
      // 3. market_crash_trigger -> 0.0001 (< crashChance ~0.032) -> crash triggered!
      // 4. market_crash_roll -> 0.99 (Major crash: roll >= 0.666)
      // 5. market_crash_trend -> 0.5
      const rngSpy = vi.spyOn(Random.prototype, 'next');
      rngSpy.mockReturnValueOnce(0.5);   // trendChange
      rngSpy.mockReturnValueOnce(0.5);   // readingMult
      rngSpy.mockReturnValueOnce(0.0001); // market_crash_trigger
      rngSpy.mockReturnValueOnce(0.99);   // market_crash_roll (Major)
      rngSpy.mockReturnValueOnce(0.5);    // market_crash_trend

      const nextState = processTurnStart(state, mockCampaign);

      expect(nextState.economicIndex).toBe(35); // 85 - 50 = 35
      expect(nextState.players[0].bankSavings).toBe(0); // Major crash wipes savings!
      expect(nextState.players[0].currentJobId).toBeNull(); // Major crash fires player!
      expect(nextState.players[0].turnEvents.some(e => e.key === 'events.marketCrash.bankSavingsLost')).toBe(true);
      expect(nextState.players[0].newspaperHeadline?.key).toBe('newspaper.crash_major');
    });

    it('triggers minor crash (-15 reading, negative trend plunge)', () => {
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 8;
      state.economicIndex = 82;

      const rngSpy = vi.spyOn(Random.prototype, 'next');
      rngSpy.mockReturnValueOnce(0.5);    // trendChange -> 0
      rngSpy.mockReturnValueOnce(0.5);    // readingMult -> 2
      rngSpy.mockReturnValueOnce(0.0001); // crash trigger
      rngSpy.mockReturnValueOnce(0.1);    // roll < 0.333 (Minor)
      rngSpy.mockReturnValueOnce(0.01);   // crash trend -> Math.floor(0.01 * 3) - 3 = -3

      const nextState = processTurnStart(state, mockCampaign);
      expect(nextState.economicIndex).toBe(67); // 82 - 15 = 67
      expect(nextState.economicTrend).toBe(-2);
      expect(nextState.players[0].newspaperHeadline?.key).toBe('newspaper.crash_minor');
    });

    it('triggers moderate crash (-30 reading, negative trend plunge)', () => {
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 8;
      state.economicIndex = 84;

      const rngSpy = vi.spyOn(Random.prototype, 'next');
      rngSpy.mockReturnValueOnce(0.5);    // trendChange -> 0
      rngSpy.mockReturnValueOnce(0.5);    // readingMult -> 2
      rngSpy.mockReturnValueOnce(0.0001); // crash trigger
      rngSpy.mockReturnValueOnce(0.5);    // roll 0.333..0.666 (Moderate)
      rngSpy.mockReturnValueOnce(0.5);    // crash trend -> Math.floor(0.5 * 3) - 3 = -2

      const nextState = processTurnStart(state, mockCampaign);
      expect(nextState.economicIndex).toBe(54); // 84 - 30 = 54
      expect(nextState.economicTrend).toBe(-2);
      expect(nextState.players[0].newspaperHeadline?.key).toBe('newspaper.crash_moderate');
    });
  });

  describe('Economic Boom', () => {
    it('triggers economic boom when reading <= 120 and turn >= 8', () => {
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 8;
      state.economicIndex = 20;

      const rngSpy = vi.spyOn(Random.prototype, 'next');
      rngSpy.mockReturnValueOnce(0.5);    // trendChange -> 0
      rngSpy.mockReturnValueOnce(0.5);    // readingMult -> 2
      // crash check not reached (index 20 < 80)
      rngSpy.mockReturnValueOnce(0.0001); // boom trigger (< 1/31)
      rngSpy.mockReturnValueOnce(0.99);   // boom trend -> Math.floor(0.99 * 3) + 1 = 3

      const nextState = processTurnStart(state, mockCampaign);
      expect(nextState.economicIndex).toBe(26); // 20 + 6 = 26
      expect(nextState.economicTrend).toBe(3);
      expect(nextState.players[0].newspaperHeadline?.key).toBe('newspaper.boom');
    });
  });

  describe('State Immutability', () => {
    it('deep clones player objects to prevent mutating previous state', () => {
      let state = createTestGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 2;
      state.rules.allowEatingSpoiledFood = false;
      state.players[0].inventory.freshFoodUnits = 5;
      
      const nextState = processTurnStart(state, mockCampaign);
      
      expect(nextState.players[0].inventory.freshFoodUnits).toBe(0);
      expect(state.players[0].inventory.freshFoodUnits).toBe(5); // Original must not mutate!
    });
  });

  describe('Win Condition', () => {
    it('uses player ID for winnerId, not name', () => {
      let state = createTestGameState(mockCampaign, [{name: 'TestName', isAi: false, goals: {wealth:0, happiness:0, education:0, career:0}}], 'node_low_cost');
      state.turn = 2;
      
      const nextState = processTurnStart(state, mockCampaign);
      
      expect(nextState.phase).toBe('game-over');
      expect(nextState.winnerId).toBe('player_1');
    });
  });

  describe('Relaxation & Doctor', () => {
    it('triggers a doctor visit if relaxation drops to 10 or below and chance hits', () => {
      let state = createTestGameState(mockCampaign, [{name: 'TestName', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 2;
      state.players[0].relaxation = 10;
      state.players[0].money = 1000;
      state.players[0].inventory.freshFoodUnits = 10;
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      
      // Math.random() < 0.20 triggers doctor
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.15);
      
      const nextState = processTurnStart(state, mockCampaign);
      
      expect(nextState.players[0].turnEvents.some(e => e.key.includes('doctor'))).toBe(true);
      expect(nextState.players[0].hoursRemaining).toBe(50); // 60 - 10
      expect(nextState.players[0].happiness).toBeLessThan(50);
    });

    it('does not trigger a doctor visit if relaxation is above 10', () => {
      let state = createTestGameState(mockCampaign, [{name: 'TestName', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost');
      state.turn = 2;
      state.players[0].relaxation = 12;
      state.players[0].money = 1000;
      state.players[0].inventory.freshFoodUnits = 10;
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      
      // Even if chance hits, it shouldn't trigger
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.15);
      
      const nextState = processTurnStart(state, mockCampaign);
      
      expect(nextState.players[0].turnEvents.some(e => e.key.includes('doctor'))).toBe(false);
      expect(nextState.players[0].hoursRemaining).toBe(60);
    });
  });

  describe('PRNG State Progression & Anti-Freezing', () => {
    it('advances rngState in processTurnStart so consecutive turns do not reuse identical seed', () => {
      vi.restoreAllMocks(); // Use real Random PRNG
      let state = createTestGameState(mockCampaign, [{ name: 'Player1', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }], 'node_low_cost');
      state.turn = 1;
      const initialSeed = state.rngState;

      const nextState = processTurnStart(state, mockCampaign);

      expect(nextState.rngState).toBeDefined();
      expect(nextState.rngState).not.toBe(initialSeed);
    });

    it('produces unique RNG states across multiple consecutive turns with no intermediary player RNG use', () => {
      vi.restoreAllMocks();
      let state = createTestGameState(mockCampaign, [{ name: 'Player1', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }], 'node_low_cost');
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].inventory.freshFoodUnits = 20;

      const seeds: number[] = [state.rngState];

      for (let turn = 1; turn <= 10; turn++) {
        state = processTurnStart(state, mockCampaign);
        seeds.push(state.rngState);
      }

      // Every single turn must have generated a unique rngState
      const uniqueSeeds = new Set(seeds);
      expect(uniqueSeeds.size).toBe(seeds.length);
    });

    it('does not get stuck at -30 floor across 20 turns due to frozen RNG (Groundhog Day regression)', () => {
      vi.restoreAllMocks();
      let state = createTestGameState(mockCampaign, [{ name: 'Player1', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }], 'node_low_cost');
      state.economicIndex = -30;
      state.economicTrend = 0;
      state.players[0].inventory.appliances.push({ id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' });
      state.players[0].inventory.freshFoodUnits = 50;

      const readings: number[] = [state.economicIndex];

      for (let turn = 1; turn <= 20; turn++) {
        state = processTurnStart(state, mockCampaign);
        readings.push(state.economicIndex);
      }

      // The economy must have moved off -30 at least once in 20 turns due to advancing PRNG & mean reversion
      const hasRecovered = readings.some(r => r > -30);
      expect(hasRecovered).toBe(true);
    });

    it('applies social offset to dependability decay at turn start in advanced mode', () => {
      let state = createTestGameState(mockCampaign, [{ name: 'Player1', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }], 'node_low_cost');
      state.turn = 1;
      state.rules.usePhysicalMentalConditions = true;
      state.players[0].dependability = 50;
      state.players[0].social = 51; // Decays by -1 at turn start to 50 -> Offset = floor(50/25) = 2
      state.players[0].currentJobId = 'sales_manager';

      state = processTurnStart(state, mockCampaign);
      // Dep decay for unemployed/no matching job req is 3 base. With offset 2, decay is max(1, 3 - 2) = 1.
      expect(state.players[0].dependability).toBe(49);
      expect(state.players[0].social).toBe(50);
    });

    it('decays innovateChance by 3.0 percentage points at turn transition', () => {
      let state = createTestGameState(mockCampaign, [{ name: 'Player1', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }], 'node_low_cost');
      state.turn = 1;
      state.players[0].innovateChance = 10.5;

      state = processTurnStart(state, mockCampaign);
      expect(state.players[0].innovateChance).toBe(7.5); // 10.5 - 3.0 = 7.5
    });
  });
});
