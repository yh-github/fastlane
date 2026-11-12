import { describe, it, expect, beforeEach } from 'vitest';
import { loadCampaign, type CampaignBundle } from '../src/engine/dataLoader';
import { createPlayerState, createDefaultGoalAllotment } from '../src/engine/stateFactories';
import { processTurnStart } from '../src/engine/turnProcessor';
import { processDoctorVisit } from '../src/engine/eventEngine';
import { workShift } from '../src/engine/job/jobShiftExecution';
import { calcLandlordStanding } from '../src/engine/statMath';
import { gameReducer } from '../src/engine/gameReducer';
import { buyItem } from '../src/engine/shoppingEngine';
import { generateWeekendChoices, resolveWeekendChoice } from '../src/engine/weekendEngine';
import { calcWorkShiftSummary } from '../src/engine/job/jobShiftSummary';
import { Random } from '../src/utils/rng';
import type { GameState, PlayerState } from '../src/engine/gameState';

describe('Advanced 2000 Campaign Features', () => {
  let campaign2000: CampaignBundle;
  let floppyCampaign: CampaignBundle;

  beforeEach(async () => {
    campaign2000 = await loadCampaign('advanced_2000');
    floppyCampaign = await loadCampaign('1990_classic_floppy');
  });

  describe('Campaign Loading & Isolation', () => {
    it('loads advanced_2000 with standalone configs and custom rules enabled', () => {
      expect(campaign2000.config.name).toBe('The Fast Lane — Advanced 2000');
      expect(campaign2000.config.gameRules.enableCaffeineSystem).toBe(true);
      expect(campaign2000.config.gameRules.enableBusyWeeks).toBe(true);
      expect(campaign2000.config.gameRules.hospitalEmployeeHealthcare).toBe(true);
      expect(campaign2000.config.gameRules.enableArcade).toBe(true);
    });

    it('confirms classic floppy and advanced 90s do not have advanced 2000 rules enabled', async () => {
      expect(floppyCampaign.config.gameRules.enableCaffeineSystem).toBe(false);
      expect(floppyCampaign.config.gameRules.enableBusyWeeks).toBe(false);
      expect(floppyCampaign.config.gameRules.hospitalEmployeeHealthcare).toBe(false);
      expect(floppyCampaign.config.gameRules.enableArcade).toBe(false);

      const advanced90s = await loadCampaign('advanced');
      expect(advanced90s.config.gameRules.enableCaffeineSystem).toBe(false);
      expect(advanced90s.config.gameRules.enableBusyWeeks).toBe(false);
      expect(advanced90s.config.gameRules.hospitalEmployeeHealthcare).toBe(false);
      expect(advanced90s.config.gameRules.enableArcade).toBe(false);
    });

    it('initializes advanced_2000 players with 65 Max Physical, 65 base Max Mental, and 50 condition', () => {
      expect(campaign2000.config.statRules?.initialPhysicalMax).toBe(65);
      expect(campaign2000.config.statRules?.mentalMaxBaseValue).toBe(65);
      expect(campaign2000.config.statRules?.startingPhysicalCondition).toBe(50);
      expect(campaign2000.config.statRules?.startingMentalCondition).toBe(50);

      const p2000 = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_park_campus', campaign2000.config);
      expect(p2000.physicalConditionMax).toBe(65);
      // Base 65 - messGrowth(3)=1 + socialBonus(floor(20/10))=2 => 66 initial max mental
      expect(p2000.mentalConditionMax).toBe(66);
      expect(p2000.physicalCondition).toBe(50);
      expect(p2000.mentalCondition).toBe(50);

      // Verify classic floppy uses happiness/relaxation
      const pClassic = createPlayerState('p2', 'Jordan', false, createDefaultGoalAllotment(), 'node_low_cost', floppyCampaign.config);
      expect(pClassic.physicalConditionMax).toBeUndefined();
    });

    it('contains Hospital, Red Pirate, and 3 Park nodes on the map', () => {
      const bIds = campaign2000.buildings.map(b => b.id);
      expect(bIds).toContain('hospital');
      expect(bIds).toContain('red_pirate');
      expect(bIds).toContain('campus_park');
      expect(bIds).toContain('west_green');
      expect(bIds).toContain('eastside_park');

      const nodeIds = campaign2000.map.nodes.map(n => n.id);
      expect(nodeIds).toContain('node_park_campus');
      expect(nodeIds).toContain('node_park_west');
      expect(nodeIds).toContain('node_park_east');
    });

    it('contains progressive healthcare education degrees in Life Sciences track', () => {
      const degIds = campaign2000.education.map(d => d.id);
      expect(degIds).toContain('life_sciences');
      expect(degIds).toContain('physiology');
      expect(degIds).toContain('biochemistry');
      expect(degIds).toContain('medical_school');

      const medSchool = campaign2000.education.find(d => d.id === 'medical_school')!;
      expect(medSchool.prerequisites).toEqual(['physiology', 'biochemistry']);
    });

    it('preserves standard clothing durability in QT Clothing (9w/9w/13w) and used overrides in Z-Mart (7w/7w/3w)', () => {
      const casual = campaign2000.items.find(i => i.id === 'casual_clothes')!;
      const dress = campaign2000.items.find(i => i.id === 'dress_clothes')!;
      const suit = campaign2000.items.find(i => i.id === 'business_suit')!;
      expect(casual.weeks).toBe(9);
      expect(dress.weeks).toBe(9);
      expect(suit.weeks).toBe(13);

      const zMart = campaign2000.buildings.find(b => b.id === 'z_mart')!;
      expect(zMart.inventory?.find(i => i.itemId === 'casual_clothes')?.weeksOverride).toBe(7);
      expect(zMart.inventory?.find(i => i.itemId === 'dress_clothes')?.weeksOverride).toBe(7);
      expect(zMart.inventory?.find(i => i.itemId === 'business_suit')?.weeksOverride).toBe(3);
    });

    it('includes base refrigeration synergy so refrigerator preserves fresh food in advanced_2000', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_security', campaign2000.config);
      player.currentHousingId = 'security';
      player.inventory.appliances = [{
        id: 'refrigerator',
        purchasePrice: 650,
        purchaseSource: 'z_mart',
        condition: 'used'
      }];
      player.inventory.freshFoodUnits = 2;

      const state: GameState = {
        turn: 10,
        players: [player],
        economicIndex: 100,
        rules: campaign2000.config.gameRules,
        pawnShopItemsForSale: [],
        rngState: 42,
        phase: 'playing',
      };

      const nextState = processTurnStart(state, campaign2000);
      const nextP = nextState.players[0];
      expect(nextP.activeEffects['set_food_storage']).toBe(6);
      // 2 units -> 1 eaten, 1 preserved (0 spoiled)
      expect(nextP.inventory.freshFoodUnits).toBe(1);
      expect(nextP.turnEvents.some(e => e.key.startsWith('events.foodSpoiled'))).toBe(false);
    });

    it('removes lottery tickets from store inventory in advanced_2000', () => {
      const blacksMarket = campaign2000.buildings.find(b => b.id === 'blacks_market');
      expect(blacksMarket).toBeDefined();
      const hasLottery = blacksMarket?.inventory?.some(inv => inv.itemId === 'lottery_tickets');
      expect(hasLottery).toBe(false);
    });

    it('turn transition clears any leftover pendingMiniGame or pendingAppraisalDilemma so next turn is never softlocked', () => {
      const player = createPlayerState('p1', 'Player 1', 1, 0, 0, createDefaultGoalAllotment(), 'advanced');
      player.pendingMiniGame = {
        title: 'Park Encounter',
        gameType: 'park_encounter',
        tier: 1,
        options: []
      } as any;
      player.pendingAppraisalDilemma = {
        itemTitle: 'Appraisal',
        options: []
      } as any;

      const state: GameState = {
        turn: 19,
        players: [player],
        economicIndex: 100,
        rules: campaign2000.config.gameRules,
        pawnShopItemsForSale: [],
        rngState: 42,
        phase: 'playing',
      };

      const nextState = processTurnStart(state, campaign2000);
      const nextP = nextState.players[0];
      expect(nextP.pendingMiniGame).toBeNull();
      expect(nextP.pendingAppraisalDilemma).toBeNull();
    });
  });

  describe('Coffee Subsystem & Caffeine Tolerance', () => {
    function createTestState(initialTolerance: number = 0): { player: PlayerState; state: GameState } {
      const player = createPlayerState(
        'p1',
        'Alex',
        false,
        createDefaultGoalAllotment(),
        'node_low_cost',
        campaign2000.config
      );
      player.caffeineTolerance = initialTolerance;
      player.physicalCondition = 40;
      player.mentalCondition = 40;
      player.money = 500;
      // Supply canned food so neither starvation nor food spoilage triggers in healthAndFoodPhase
      player.inventory.cannedFoodUnits = 4;

      const state: GameState = {
        turn: 1,
        players: [player],
        economicIndex: 100,
        rules: campaign2000.config.gameRules,
        pawnShopItemsForSale: [],
        rngState: 42,
        phase: 'playing',
      };
      return { player, state };
    }

    it('drinking coffee accumulates caffeineIntake and provides comfort boost on 1st purchase only', () => {
      const { player } = createTestState(0);
      const dripDef = campaign2000.items.find(i => i.id === 'drip_coffee')!;

      // 1st cup of the week: provides comfort boost (+1 Phys, +2 Mental) and 10 caffeine units
      const result1 = buyItem(player, dripDef, campaign2000.config.gameRules, campaign2000, 1);
      expect(result1.updated.turnFlags.caffeineIntake).toBe(10);
      expect(result1.updated.physicalCondition).toBe(41);
      expect(result1.updated.mentalCondition).toBe(42);
      expect(result1.updated.inventory.cannedFoodUnits).toBe(4);
      expect(result1.updated.inventory.freshFoodUnits).toBe(0);

      // 2nd cup in the same week: adds 10 caffeine units (total 20), but no additional comfort boost
      const result2 = buyItem(result1.updated, dripDef, campaign2000.config.gameRules, campaign2000, 1);
      expect(result2.updated.turnFlags.caffeineIntake).toBe(20);
      expect(result2.updated.physicalCondition).toBe(41);
      expect(result2.updated.mentalCondition).toBe(42);
    });

    it('overdose triggers when caffeineIntake exceeds 20, immediately docking Max Physical and Max Mental', () => {
      const { player } = createTestState(0);
      player.physicalConditionMax = 50;
      player.mentalConditionMax = 50;
      player.resilienceBonus = 0;
      const doubleDef = campaign2000.items.find(i => i.id === 'double_shot')!; // 28 units

      const result = buyItem(player, doubleDef, campaign2000.config.gameRules, campaign2000, 1);
      expect(result.updated.turnFlags.caffeineIntake).toBe(28);
      // Overdose penalty: -1 Max Phys, -1 Max Mental (and resilienceBonus -1)
      expect(result.updated.physicalConditionMax).toBe(49);
      expect(result.updated.mentalConditionMax).toBe(49);
      expect(result.updated.resilienceBonus).toBe(-1);
      const odEvent = result.updated.turnEvents.find(e => e.key === 'events.caffeine_overdose');
      expect(odEvent).toBeDefined();
    });

    it('caffeine buffer reduces work mistake chance without directly healing underlying fatigue', () => {
      const { player } = createTestState(0);
      const cookJob = campaign2000.jobs.find(j => j.id === 'pirate_cook')!;
      player.currentJobId = cookJob.id;
      player.physicalCondition = 8;
      player.mentalCondition = 8;

      // Without caffeine (Intake = 0, Buffer = 0): mistakes are possible
      const unbuffered = calcWorkShiftSummary(player, cookJob, 8, campaign2000.config.gameRules, campaign2000.config.statRules, 0);
      const unbufferedWork = unbuffered.modes.find(o => o.id === 'work_work')!;
      expect(unbufferedWork.modifierBreakdown?.mistakeBreakdown?.some(m => m.chance > 0)).toBe(true);

      // With Espresso (Intake = 18, Buffer = 18 against Tol 0):
      player.turnFlags = { ...player.turnFlags, caffeineIntake: 18 };
      const buffered = calcWorkShiftSummary(player, cookJob, 8, campaign2000.config.gameRules, campaign2000.config.statRules, 0);
      const bufferedWork = buffered.modes.find(o => o.id === 'work_work')!;
      // Effective phys: 8 + 18 = 26 (exceeds safety threshold 10), eliminating fatigue mistake chance
      const physMistake = bufferedWork.modifierBreakdown?.mistakeBreakdown?.find(m => m.type === 'physical');
      expect(physMistake?.chance).toBe(0);
      // Underlying physical condition remains completely unhealed at 8
      expect(player.physicalCondition).toBe(8);
    });

    it('redline burnout docks max condition when working a shift with actual condition < 15 on caffeine', () => {
      const { player } = createTestState(0);
      const cookJob = campaign2000.jobs.find(j => j.id === 'pirate_cook')!;
      player.currentJobId = cookJob.id;
      player.currentWage = cookJob.baseWage;
      player.hoursRemaining = 40;
      player.physicalCondition = 12; // < 15 triggers redline phys
      player.mentalCondition = 12;   // < 15 triggers redline mental
      player.physicalConditionMax = 50;
      player.mentalConditionMax = 50;
      player.resilienceBonus = 0;
      player.turnFlags = { ...player.turnFlags, caffeineIntake: 10 };

      const result = workShift(player, cookJob, 8, campaign2000.config.gameRules, campaign2000.config.statRules, 'work_work');
      expect(result.success).toBe(true);
      expect(result.updated.physicalConditionMax).toBe(49.5); // -0.5 Max Phys
      expect(result.updated.mentalConditionMax).toBe(49);   // -1 Max Mental
    });

    it('calibrates mistake thresholds: normal jobs trigger below 18 while heavy_physical and executive_management trigger below 28', () => {
      const { player } = createTestState(0);
      const cookJob = campaign2000.jobs.find(j => j.id === 'pirate_cook')!; // normal job (threshold 18)
      const orderlyJob = campaign2000.jobs.find(j => j.id === 'hospital_custodian')!; // heavy_physical (threshold 28)
      const brokerJob = campaign2000.jobs.find(j => j.id === 'bank_broker')!; // executive_management (threshold 28)

      // Test at Condition 22:
      // 1. Normal job: Phys 22 meets threshold 18 -> 0% risk
      player.physicalCondition = 22;
      player.mentalCondition = 22;
      player.experience = 100; // prevent executive experience blunder
      const cookSummary = calcWorkShiftSummary(player, cookJob, 8, campaign2000.config.gameRules, campaign2000.config.statRules, 0);
      const cookWork = cookSummary.modes.find(o => o.id === 'work_work')!;
      const cookPhysMistake = cookWork.modifierBreakdown?.mistakeBreakdown?.find(m => m.type === 'physical');
      expect(cookPhysMistake?.chance).toBe(0);

      // 2. Heavy Physical job: Phys 22 is 6 pts below threshold 28 -> (28 - 22) * 0.025 = 15.0% risk
      const orderlySummary = calcWorkShiftSummary(player, orderlyJob, 8, campaign2000.config.gameRules, campaign2000.config.statRules, 0);
      const orderlyWork = orderlySummary.modes.find(o => o.id === 'work_work')!;
      const orderlyPhysMistake = orderlyWork.modifierBreakdown?.mistakeBreakdown?.find(m => m.type === 'physical');
      expect(orderlyPhysMistake?.chance).toBeCloseTo(0.15, 3);

      // 3. Executive Management job: Mental 22 is 6 pts below threshold 28 -> (28 - 22) * 0.025 = 15.0% risk
      const brokerSummary = calcWorkShiftSummary(player, brokerJob, 8, campaign2000.config.gameRules, campaign2000.config.statRules, 0);
      const brokerWork = brokerSummary.modes.find(o => o.id === 'work_work')!;
      const brokerMentalMistake = brokerWork.modifierBreakdown?.mistakeBreakdown?.find(m => m.type === 'mental');
      expect(brokerMentalMistake?.chance).toBeCloseTo(0.15, 3);

      // 4. Caffeine Sweet Spot: Consuming Drip Coffee (+10 buffer) buffers effective condition to 32 (>= 28)
      player.turnFlags = { ...player.turnFlags, caffeineIntake: 10 };
      const bufferedOrderly = calcWorkShiftSummary(player, orderlyJob, 8, campaign2000.config.gameRules, campaign2000.config.statRules, 0);
      const bufferedOrderlyWork = bufferedOrderly.modes.find(o => o.id === 'work_work')!;
      const bufPhysMistake = bufferedOrderlyWork.modifierBreakdown?.mistakeBreakdown?.find(m => m.type === 'physical');
      expect(bufPhysMistake?.chance).toBe(0);

      // Because actual condition 22 >= 15, working this shift does NOT inflict Redline Burnout
      player.currentJobId = orderlyJob.id;
      player.currentWage = orderlyJob.baseWage;
      player.hoursRemaining = 20;
      player.physicalConditionMax = 50;
      player.mentalConditionMax = 50;
      const orderlyShiftRes = workShift(player, orderlyJob, 8, campaign2000.config.gameRules, campaign2000.config.statRules, 'work_work');
      expect(orderlyShiftRes.success).toBe(true);
      expect(orderlyShiftRes.updated.physicalConditionMax).toBe(50); // No redline penalty
      expect(orderlyShiftRes.updated.mentalConditionMax).toBe(50);
    });

    it('triggers caffeine withdrawal upon detoxing (0 intake with tolerance >= 3)', () => {
      // 1. Severe crash at high tolerance (>= 6) with 0 intake: -1 Phys, -2 Mental
      const { player: pSevere, state: sSevere } = createTestState(6);
      pSevere.turnFlags.caffeineIntake = 0;
      pSevere.physicalCondition = 40;
      pSevere.mentalCondition = 40;
      const nextSevere = processTurnStart({ ...sSevere, players: [pSevere] }, campaign2000);
      expect(nextSevere.players[0].caffeineTolerance).toBe(3); // floor(6/2)
      expect(nextSevere.players[0].physicalCondition).toBe(39); // -1
      expect(nextSevere.players[0].mentalCondition).toBe(38);  // -2
      expect(nextSevere.players[0].turnEvents.some(e => e.key === 'events.caffeine_withdrawal_severe')).toBe(true);

      // 2. Moderate withdrawal at mid tolerance (>= 3, < 6) with 0 intake: -1 Mental
      const { player: pMod, state: sMod } = createTestState(4);
      pMod.turnFlags.caffeineIntake = 0;
      pMod.physicalCondition = 40;
      pMod.mentalCondition = 40;
      const nextMod = processTurnStart({ ...sMod, players: [pMod] }, campaign2000);
      expect(nextMod.players[0].caffeineTolerance).toBe(2); // floor(4/2)
      expect(nextMod.players[0].physicalCondition).toBe(40); // untouched
      expect(nextMod.players[0].mentalCondition).toBe(39);  // -1
      expect(nextMod.players[0].turnEvents.some(e => e.key === 'events.caffeine_withdrawal')).toBe(true);

      // 3. No withdrawal when coffee was consumed (intake > 0)
      const { player: pDrank, state: sDrank } = createTestState(6);
      pDrank.turnFlags.caffeineIntake = 10;
      pDrank.physicalCondition = 40;
      pDrank.mentalCondition = 40;
      const nextDrank = processTurnStart({ ...sDrank, players: [pDrank] }, campaign2000);
      expect(nextDrank.players[0].caffeineTolerance).toBe(8); // floor((6+10)/2)
      expect(nextDrank.players[0].turnEvents.some(e => e.key.includes('withdrawal'))).toBe(false);

      // 4. No withdrawal when tolerance was negligible (< 3)
      const { player: pLow, state: sLow } = createTestState(2);
      pLow.turnFlags.caffeineIntake = 0;
      pLow.physicalCondition = 40;
      pLow.mentalCondition = 40;
      const nextLow = processTurnStart({ ...sLow, players: [pLow] }, campaign2000);
      expect(nextLow.players[0].caffeineTolerance).toBe(1); // floor(2/2)
      expect(nextLow.players[0].physicalCondition).toBe(40);
      expect(nextLow.players[0].mentalCondition).toBe(40);
      expect(nextLow.players[0].turnEvents.some(e => e.key.includes('withdrawal'))).toBe(false);
    });

    it('updates tolerance at turn maintenance via pharmacokinetic half-life formula: floor((tol + intake) / 2)', () => {
      // 0 intake -> detox decay: floor((6 + 0) / 2) = 3
      const { player: pDetox, state: sDetox } = createTestState(6);
      pDetox.turnFlags.caffeineIntake = 0;
      const nextDetox = processTurnStart({ ...sDetox, players: [pDetox] }, campaign2000);
      expect(nextDetox.players[0].caffeineTolerance).toBe(3);

      // Low intake (10) on low tolerance (2): floor((2 + 10) / 2) = 6
      const { player: pLow, state: sLow } = createTestState(2);
      pLow.turnFlags.caffeineIntake = 10;
      const nextLow = processTurnStart({ ...sLow, players: [pLow] }, campaign2000);
      expect(nextLow.players[0].caffeineTolerance).toBe(6);

      // Moderate intake (10) on tolerance (6): floor((6 + 10) / 2) = 8
      const { player: pMid, state: sMid } = createTestState(6);
      pMid.turnFlags.caffeineIntake = 10;
      const nextMid = processTurnStart({ ...sMid, players: [pMid] }, campaign2000);
      expect(nextMid.players[0].caffeineTolerance).toBe(8);

      // High intake (28) on tolerance (8): floor((8 + 28) / 2) = 18 -> capped at 10
      const { player: pHigh, state: sHigh } = createTestState(8);
      pHigh.turnFlags.caffeineIntake = 28;
      const nextHigh = processTurnStart({ ...sHigh, players: [pHigh] }, campaign2000);
      expect(nextHigh.players[0].caffeineTolerance).toBe(10);
    });

    it('generates high-caffeine weekend sprint cards when intake >= 18 or buffer >= 12, and resolves them correctly', () => {
      const { player } = createTestState(0);
      player.turnFlags.caffeineIntake = 18;
      player.caffeineTolerance = 0;
      player.currentJobId = 'pirate_cook';
      const rng = new Random(42);

      // 1. Overtime Grind sprint card generation (player has job, no classes)
      const { cards } = generateWeekendChoices(player, 1, campaign2000.weekends, rng, campaign2000, campaign2000.config.gameRules, player);
      const grindCard = cards.find(c => c.id === 'weekend_overtime_grind');
      expect(grindCard).toBeDefined();

      // Resolve overtime grind: costs $50, 4 Phys, 2 Mental; awards +1 Exp, +1 Dep
      player.money = 100;
      player.experience = 5;
      player.dependability = 50;
      player.physicalCondition = 40;
      player.mentalCondition = 40;
      player.offeredWeekendCards = cards;
      const grindResult = resolveWeekendChoice(player, 'weekend_overtime_grind', rng, campaign2000.config.gameRules, campaign2000.config.statRules, campaign2000);
      expect(grindResult.money).toBe(50);
      expect(grindResult.experience).toBe(6);
      expect(grindResult.dependability).toBe(51);
      expect(grindResult.physicalCondition).toBe(36);
      expect(grindResult.mentalCondition).toBe(38);

      // 2. Cramming Sprint when enrolled in degree (no job)
      const enrolledPlayer = { ...player, currentJobId: null, enrolledClasses: { cert_tech: 0 } };
      const { cards: cramChoices } = generateWeekendChoices(enrolledPlayer, 1, campaign2000.weekends, rng, campaign2000, campaign2000.config.gameRules, enrolledPlayer);
      const cramCard = cramChoices.find(c => c.id === 'weekend_cramming_sprint');
      expect(cramCard).toBeDefined();

      // Resolve cramming sprint: advances enrolled course by 1 lesson worth
      enrolledPlayer.offeredWeekendCards = cramChoices;
      const cramResult = resolveWeekendChoice(enrolledPlayer, 'weekend_cramming_sprint', rng, campaign2000.config.gameRules, campaign2000.config.statRules, campaign2000);
      expect(cramResult.enrolledClasses['cert_tech']).toBeGreaterThan(0);
    });
  });

  describe('The Red Pirate & Busy Weeks', () => {
    it('Red Pirate food menu matches Monolith Burger balancing', () => {
      const slaw = campaign2000.items.find(i => i.id === 'scurvy_slaw')!;
      const burger = campaign2000.items.find(i => i.id === 'kraken_burger')!;
      const stew = campaign2000.items.find(i => i.id === 'buccaneer_stew')!;

      expect(slaw.basePrice).toBe(65);
      expect(slaw.mentalBonus).toBe(0);
      expect(slaw.effects?.some(e => e.stat === 'social')).toBe(true);

      expect(burger.basePrice).toBe(120);
      expect(burger.happinessBonus).toBe(0);
      expect(burger.mentalBonus).toBe(2); // +2 Mental, like Astro Chicken

      expect(stew.name).toBe('Buccaneer Grog Stew & Biscuit');
      expect(stew.basePrice).toBe(85);
      expect(stew.mentalBonus).toBe(1);
    });

    it('All Red Pirate jobs have high_downtime tag', () => {
      const pirateJobs = campaign2000.jobs.filter(j => j.locationId === 'red_pirate');
      expect(pirateJobs.length).toBeGreaterThanOrEqual(4);
      for (const j of pirateJobs) {
        expect(j.tags).toContain('high_downtime');
      }
    });

    it('generates a 4-card bag with 1 busy week and prevents consecutive busy weeks', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_low_cost', campaign2000.config);
      let state: GameState = {
        turn: 0,
        players: [player],
        economicIndex: 100,
        rules: campaign2000.config.gameRules,
        pawnShopItemsForSale: [],
        rngState: 100,
        phase: 'playing',
      };

      const busyHistory: boolean[] = [];
      for (let i = 0; i < 16; i++) {
        state = processTurnStart(state, campaign2000);
        const isBusy = Boolean(state.busyLocations?.['red_pirate']);
        busyHistory.push(isBusy);
      }

      // In 16 weeks, exactly 4 busy weeks should occur (1 per 4-week bag)
      const busyCount = busyHistory.filter(Boolean).length;
      expect(busyCount).toBe(4);

      // Verify no two consecutive busy weeks
      for (let i = 0; i < busyHistory.length - 1; i++) {
        if (busyHistory[i]) {
          expect(busyHistory[i + 1]).toBe(false);
        }
      }
    });

    it('surge shift pays 1.5x wage and grants bonus dep/exp and stamina drain on work_work', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_low_cost', campaign2000.config);
      const cookJob = campaign2000.jobs.find(j => j.id === 'pirate_cook')!;
      player.currentJobId = cookJob.id;
      player.currentWage = 10;
      player.hoursRemaining = 40;
      player.money = 0;
      player.physicalCondition = 40;
      player.dependability = 20;
      player.experience = 10;

      // Normal shift
      const normalRes = workShift(
        player,
        cookJob,
        6,
        campaign2000.config.gameRules,
        campaign2000.config.statRules,
        'work_work',
        new Random(1),
        undefined,
        campaign2000.education,
        campaign2000,
        false // not busy
      );

      // Busy surge shift
      const busyRes = workShift(
        player,
        cookJob,
        6,
        campaign2000.config.gameRules,
        campaign2000.config.statRules,
        'work_work',
        new Random(1),
        undefined,
        campaign2000.education,
        campaign2000,
        true // busy
      );

      expect(busyRes.wagesEarned).toBe(Math.floor(normalRes.wagesEarned * 1.15));
      expect(busyRes.updated.dependability).toBeGreaterThan(normalRes.updated.dependability);
      expect(busyRes.updated.experience).toBeGreaterThan(normalRes.updated.experience);
      expect(busyRes.updated.physicalCondition).toBeLessThan(normalRes.updated.physicalCondition ?? 50);
    });

    it('penalizes employees who work 0 shifts during a busy week (-4 Dep and reprimand)', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_low_cost', campaign2000.config);
      player.currentJobId = 'pirate_cook';
      player.jobTenure = 1;
      player.dependability = 50;
      player.turnFlags.hasWorked = false;
      player.workActionsThisTurn = 0;
      player.inventory.freshFoodUnits = 4;

      const state: GameState = {
        turn: 2,
        players: [player],
        economicIndex: 100,
        rules: campaign2000.config.gameRules,
        pawnShopItemsForSale: [],
        rngState: 42,
        phase: 'playing',
        busyLocations: { red_pirate: true }
      };

      const nextState = processTurnStart(state, campaign2000);
      const nextP = nextState.players[0];

      const reprimandEvt = nextP.turnEvents.find(e => e.key === 'events.busyWeekAbsentReprimand');
      expect(reprimandEvt).toBeDefined();
      // Dependability dropped by at least 4 due to absentee reprimand + natural decay
      expect(nextP.dependability).toBeLessThanOrEqual(46);
      expect(nextP.mistakesByLocation?.['red_pirate']).toBe(1);
    });

    it('protects newly hired employees from rush week absentee penalties on the turn they were hired', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_low_cost', campaign2000.config);
      player.currentJobId = 'pirate_cook';
      player.dependability = 50;
      player.turnFlags.hasWorked = false;
      player.turnFlags.hiredThisTurn = true; // Just hired this turn!
      player.workActionsThisTurn = 0;
      player.inventory.freshFoodUnits = 4;

      const state: GameState = {
        turn: 2,
        players: [player],
        economicIndex: 100,
        rules: campaign2000.config.gameRules,
        pawnShopItemsForSale: [],
        rngState: 42,
        phase: 'playing',
        busyLocations: { red_pirate: true }
      };

      const nextState = processTurnStart(state, campaign2000);
      const nextP = nextState.players[0];

      const reprimandEvt = nextP.turnEvents.find(e => e.key === 'events.busyWeekAbsentReprimand');
      expect(reprimandEvt).toBeUndefined();
      expect(nextP.mistakesByLocation?.['red_pirate'] ?? 0).toBe(0);
    });

    it('guarantees the first full turn after hiring at Red Pirate is NOT a busy week (rookie protection)', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_low_cost', campaign2000.config);
      player.currentJobId = 'pirate_cook';
      player.turnFlags.hiredThisTurn = true;
      player.jobTenure = 0;

      // Force a deck where the top card would be true (busy)
      const state: GameState = {
        turn: 2,
        players: [player],
        economicIndex: 100,
        rules: campaign2000.config.gameRules,
        pawnShopItemsForSale: [],
        rngState: 42,
        phase: 'playing',
        busyLocations: { red_pirate: false },
        busyWeeksDeck: [true, false, false, false] // Popping would yield true
      };

      const nextState = processTurnStart(state, campaign2000);
      // Rookie protection must prevent next turn from being busy
      expect(nextState.busyLocations?.['red_pirate']).toBe(false);
      // And player tenure increments for the upcoming turn
      expect(nextState.players[0].jobTenure).toBe(1);
    });

    it('logs demerits on rush week absence and fires employee upon reaching 3 demerits', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_low_cost', campaign2000.config);
      player.currentJobId = 'pirate_cook';
      player.dependability = 50;
      player.turnFlags.hasWorked = false;
      player.workActionsThisTurn = 0;
      player.inventory.freshFoodUnits = 4;
      player.mistakesByLocation = { red_pirate: 2 }; // Already has 2 demerits!

      const state: GameState = {
        turn: 5,
        players: [player],
        economicIndex: 100,
        rules: campaign2000.config.gameRules,
        pawnShopItemsForSale: [],
        rngState: 42,
        phase: 'playing',
        busyLocations: { red_pirate: true }
      };

      const nextState = processTurnStart(state, campaign2000);
      const nextP = nextState.players[0];

      // Reached 3 demerits -> FIRED
      expect(nextP.currentJobId).toBeNull();
      const firedEvt = nextP.turnEvents.find(e => e.key === 'events.busyWeekAbsentFired');
      expect(firedEvt).toBeDefined();
    });

    it('clears 1 demerit when working during All Hands on Deck', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_low_cost', campaign2000.config);
      player.currentJobId = 'pirate_cook';
      player.mistakesByLocation = { red_pirate: 1 };
      player.hoursRemaining = 20;

      const cookJob = campaign2000.jobs.find(j => j.id === 'pirate_cook')!;
      const result = workShift(
        player,
        cookJob,
        6,
        campaign2000.config.gameRules,
        campaign2000.config.statRules,
        'work_work',
        new Random(1),
        undefined,
        campaign2000.education,
        campaign2000,
        true // busy
      );

      // Successfully working rush shift clears the demerit
      expect(result.updated.mistakesByLocation?.['red_pirate']).toBe(0);
      expect(result.messages.some(m => m.key === 'action.job.busyWeekClearedMistake')).toBe(true);
    });
  });

  describe('The Hospital & Healthcare Perk', () => {
    it('covers doctor visit fee ($0) and grants +12 physical bounce-back for hospital employees', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_low_cost', campaign2000.config);
      player.currentJobId = 'hospital_orderly';
      player.money = 0; // Broke employee
      player.physicalCondition = 10;
      player.physicalConditionMax = 50;

      const updated = processDoctorVisit(
        player,
        4,
        new Random(1),
        true, // bypassDoctorIfBroke is true, but employee benefit bypasses check!
        campaign2000.config.gameRules,
        undefined,
        campaign2000.config.statRules
      );

      // Free visit
      expect(updated.money).toBe(0);
      expect(updated.loanDebt).toBe(0);
      // Enhanced +12 bounce-back
      expect(updated.physicalCondition).toBe(22);
    });

    it('charges non-hospital employees and uses standard bounce-back', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_low_cost', campaign2000.config);
      player.currentJobId = 'pirate_cook';
      player.money = 500;
      player.physicalCondition = 10;
      player.physicalConditionMax = 50;

      const updated = processDoctorVisit(
        player,
        4,
        new Random(1),
        true,
        campaign2000.config.gameRules,
        undefined,
        campaign2000.config.statRules
      );

      // Charged money
      expect(updated.money).toBeLessThan(500);
      // Standard bounce-back (+4 in statRules)
      expect(updated.physicalCondition).toBe(14);
    });

    it('contains exactly 9 Hospital jobs with calibrated progression and tags', () => {
      const hospitalJobs = campaign2000.jobs.filter(j => j.locationId === 'hospital');
      expect(hospitalJobs).toHaveLength(9);

      const orderly = hospitalJobs.find(j => j.id === 'hospital_custodian')!;
      expect(orderly.baseWage).toBe(7);
      expect(orderly.requirements.dependability).toBe(20);
      expect(orderly.tags).toContain('heavy_physical');
      expect(orderly.tags).not.toContain('high_downtime');

      const nurse = hospitalJobs.find(j => j.id === 'hospital_nurse')!;
      expect(nurse.baseWage).toBe(15);
      expect(nurse.requirements.degrees).toEqual(['physiology']);
      expect(nurse.tags).toContain('clinical');

      const surgeon = hospitalJobs.find(j => j.id === 'hospital_surgeon')!;
      expect(surgeon.baseWage).toBe(24);
      expect(surgeon.requirements.degrees).toEqual(['medical_school']);
      expect(surgeon.tags).toContain('clinical');
      expect(surgeon.tags).toContain('technical');

      const chief = hospitalJobs.find(j => j.id === 'hospital_director')!;
      expect(chief.baseWage).toBe(25);
      expect(chief.requirements.degrees).toEqual(['medical_school']);
      expect(chief.requirements.mgmtSkill).toBe(2.5);
      expect(chief.tags).toContain('executive_management');
      expect(chief.tags).toContain('clinical');
    });

    it('restores classic job baselines across legacy locations and preserves iconic Broker', () => {
      const broker = campaign2000.jobs.find(j => j.id === 'bank_broker')!;
      expect(broker.baseWage).toBe(22);
      expect(broker.requirements.experience).toBe(70);
      expect(broker.requirements.dependability).toBe(70);
      expect(broker.requirements.degrees).toEqual(['business_admin', 'academic']);
      expect(broker.requirements.uniform).toBe('business');

      const zmartClerk = campaign2000.jobs.find(j => j.id === 'zmart_clerk')!;
      expect(zmartClerk.baseWage).toBe(4);
      expect(zmartClerk.requirements.experience).toBe(10);
      expect(zmartClerk.requirements.dependability).toBe(10);

      const zmartMgr = campaign2000.jobs.find(j => j.id === 'zmart_mgr')!;
      expect(zmartMgr.baseWage).toBe(7);
      expect(zmartMgr.requirements.experience).toBe(30);
      expect(zmartMgr.requirements.dependability).toBe(30);

      const uniLab = campaign2000.jobs.find(j => j.id === 'uni_lab_assistant')!;
      expect(uniLab.baseWage).toBe(8);
      expect(uniLab.requirements.degrees).toEqual(['biochemistry']);
      expect(uniLab.tags).toContain('technical');
    });

    it('clinical shift Charting (look_busy) grants dependability without experience', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_factory', campaign2000.config);
      const nurseJob = campaign2000.jobs.find(j => j.id === 'hospital_nurse')!;
      player.currentJobId = nurseJob.id;
      player.currentWage = nurseJob.baseWage;
      player.hoursRemaining = 40;
      player.money = 100;
      player.physicalCondition = 50;
      player.mentalCondition = 50;
      player.dependability = 45;
      player.experience = 40;

      const res = workShift(
        player,
        nurseJob,
        6,
        campaign2000.config.gameRules,
        campaign2000.config.statRules,
        'look_busy',
        new Random(1),
        undefined,
        campaign2000.education,
        campaign2000
      );

      // Gains +1 Dep from Charting, 0 Exp
      expect(res.updated.dependability).toBe(46);
      expect(res.updated.experience).toBe(40);
    });

    it('clinical mistakes inflict extra -2 Mental stress shock', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_factory', campaign2000.config);
      const nurseJob = campaign2000.jobs.find(j => j.id === 'hospital_nurse')!;
      player.currentJobId = nurseJob.id;
      player.currentWage = nurseJob.baseWage;
      player.hoursRemaining = 40;
      player.physicalCondition = 5;
      player.mentalCondition = 50;
      player.dependability = 45;

      const res = workShift(
        player,
        nurseJob,
        6,
        campaign2000.config.gameRules,
        campaign2000.config.statRules,
        'work_work',
        new Random(1),
        { inDecisions: [{ type: `work_phys_mistake_${player.id}_1`, result: true }] },
        campaign2000.education,
        campaign2000
      );

      // Condition was low -> mistake occurred -> normal mental cost (1) + clinical mistake shock (2) = 47
      expect(res.updated.mentalCondition).toBe(47);
    });

    it('awards landlord standing bonus for healthcare workers with clinical jobs', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_security', campaign2000.config);
      player.currentJobId = 'hospital_nurse';
      player.currentHousingId = 'security';
      player.dependability = 20;

      const { standing, breakdown } = calcLandlordStanding(player, campaign2000.config.gameRules, 1, campaign2000.jobs);
      expect(breakdown.some(b => b.label === 'Healthcare Worker Standing')).toBe(true);
      expect(standing).toBe(61); // 55 baseline - 4 mess + 10 healthcare = 61
    });
  });

  describe('Parks & Arcade Interactive Actions', () => {
    function setupContext(player: PlayerState) {
      return {
        campaign: campaign2000,
        rules: campaign2000.config.gameRules,
        turn: 1,
        economicIndex: 100,
        rng: new Random(1),
        state: {
          turn: 1,
          players: [player],
          economicIndex: 100,
          rules: campaign2000.config.gameRules,
          pawnShopItemsForSale: [],
          rngState: 1,
          phase: 'playing',
        } as GameState
      };
    }

    it('relax_park consumes 3 hours and awards card-driven encounter modifiers without double-dipping base stats', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_park_campus', campaign2000.config);
      player.hoursRemaining = 20;
      player.physicalCondition = 30;
      player.mentalCondition = 30;
      player.turnFlags = { ...player.turnFlags, parkRelaxesThisTurn: 0 };
      player.isAi = true;

      const noEventContext = setupContext(player);
      noEventContext.rng = { next: () => 0.99, nextInt: () => 0, getState: () => 1, setState: () => {} };

      // Relax 1: -3h, card-driven modifier chosen by AI
      const res1 = gameReducer(player, { type: 'relax_park' }, noEventContext);
      expect(res1.updatedPlayer.hoursRemaining).toBe(17);
      expect(res1.updatedPlayer.mentalCondition).toBeGreaterThanOrEqual(31);
      expect(res1.updatedPlayer.turnFlags.parkRelaxesThisTurn).toBe(1);

      // Relax 2: -3h
      const res2 = gameReducer(res1.updatedPlayer, { type: 'relax_park' }, noEventContext);
      expect(res2.updatedPlayer.hoursRemaining).toBe(14);
      expect(res2.updatedPlayer.turnFlags.parkRelaxesThisTurn).toBe(2);

      // Relax 3: -3h
      const res3 = gameReducer(res2.updatedPlayer, { type: 'relax_park' }, noEventContext);
      expect(res3.updatedPlayer.hoursRemaining).toBe(11);
      expect(res3.updatedPlayer.turnFlags.parkRelaxesThisTurn).toBe(3);
    });

    it('workout_park consumes 3 hours, requires Physical >= 15, trains Max Phys from workout cards; overtraining on 2nd workout penalizes', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_park_campus', campaign2000.config);
      player.hoursRemaining = 20;
      player.physicalCondition = 10; // Below 15
      player.physicalConditionMax = 50;
      player.mentalCondition = 30;

      const noEventContext = setupContext(player);
      noEventContext.rng = { next: () => 0.99, nextInt: () => 0, getState: () => 1, setState: () => {} };

      // Exhausted attempt: Fails
      const resFail = gameReducer(player, { type: 'workout_park' }, noEventContext);
      expect(resFail.updatedPlayer.hoursRemaining).toBe(20);
      expect(resFail.actionLog).toEqual(expect.objectContaining({ key: 'action.error.tooPhysicallyExhausted' }));

      // Qualified Workout 1 (AI player): -3h, workout card chosen by AI grants +1 Max Phys
      player.physicalCondition = 30;
      player.isAi = true;
      const res1 = gameReducer(player, { type: 'workout_park' }, noEventContext);
      expect(res1.updatedPlayer.hoursRemaining).toBe(17);
      expect(res1.updatedPlayer.physicalConditionMax).toBeGreaterThanOrEqual(51);
      expect(res1.updatedPlayer.turnFlags.parkWorkoutsThisTurn).toBe(1);

      // Over-training Workout 2 in same turn: -2 Phys, -1 Mental
      const res2 = gameReducer(res1.updatedPlayer, { type: 'workout_park' }, noEventContext);
      expect(res2.updatedPlayer.hoursRemaining).toBe(14);
      expect(res2.updatedPlayer.turnFlags.parkWorkoutsThisTurn).toBe(2);
    });

    it('workout_park triggers fatigue mistake (pulled muscle) if Physical or Mental < 20', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_park_campus', campaign2000.config);
      player.hoursRemaining = 20;
      player.physicalCondition = 18; // < 20
      player.mentalCondition = 15; // < 20
      player.physicalConditionMax = 50;

      const mockContext = setupContext(player);
      mockContext.rng = {
        next: () => 0.01,
        nextInt: () => 0,
        getState: () => 1,
        setState: () => {}
      };

      const res = gameReducer(player, { type: 'workout_park' }, mockContext);
      expect(res.updatedPlayer.hoursRemaining).toBe(17);
      expect(res.updatedPlayer.physicalCondition).toBe(16); // 18 - 2 = 16
      expect(res.updatedPlayer.physicalConditionMax).toBe(50); // No max phys gain when injured
      const logs = Array.isArray(res.actionLog) ? res.actionLog : [res.actionLog];
      expect(logs.some(l => l?.key === 'action.park.workoutPulledMuscle')).toBe(true);
    });

    it('good encounter (75% roll) draws 3 cards, spawns pendingMiniGame for human, and resolves chosen card', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_park_campus', campaign2000.config);
      player.hoursRemaining = 20;
      player.physicalCondition = 30;
      player.mentalCondition = 30;
      player.isAi = false;

      const mockContext = setupContext(player);
      mockContext.rng = {
        next: () => 0.8,
        nextInt: () => 0,
        getState: () => 1,
        setState: () => {}
      };

      const res = gameReducer(player, { type: 'relax_park' }, mockContext);
      expect(res.updatedPlayer.pendingMiniGame).toBeDefined();
      expect(res.updatedPlayer.pendingMiniGame?.gameType).toBe('park_encounter');
      expect(res.updatedPlayer.pendingMiniGame?.options.length).toBe(3);

      const resResolve = gameReducer(
        res.updatedPlayer,
        { type: 'resolve_appraisal_dilemma', choiceIndex: 0 },
        mockContext
      );
      expect(resResolve.updatedPlayer.pendingMiniGame).toBeNull();
      const logs = Array.isArray(resResolve.actionLog) ? resResolve.actionLog : [resResolve.actionLog];
      expect(logs.some(l => l?.key === 'action.park.cardResolved')).toBe(true);
    });

    it('hazard encounter (25% roll) draws 1 card from shared Hazards deck and prompts human with park_hazard miniGame', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_park_campus', campaign2000.config);
      player.hoursRemaining = 20;
      player.money = 250;
      player.physicalCondition = 30;
      player.mentalCondition = 30;
      player.isAi = false;

      const mockContext = setupContext(player);
      mockContext.rng = {
        next: () => 0.05, // < 0.25 -> hazard
        nextInt: () => 0,
        getState: () => 1,
        setState: () => {}
      };

      const res = gameReducer(player, { type: 'relax_park' }, mockContext);
      expect(res.updatedPlayer.pendingMiniGame).toBeDefined();
      expect(res.updatedPlayer.pendingMiniGame?.gameType).toBe('park_hazard');
      expect(res.updatedPlayer.pendingMiniGame?.options.length).toBe(1);

      // Resolving the hazard applies the modifiers and clears pendingMiniGame
      const resResolve = gameReducer(
        res.updatedPlayer,
        { type: 'resolve_mini_game', choiceIndex: 0 },
        mockContext
      );
      expect(resResolve.updatedPlayer.pendingMiniGame).toBeNull();
      const logs = Array.isArray(resResolve.actionLog) ? resResolve.actionLog : [resResolve.actionLog];
      expect(logs.some(l => l?.key === 'events.park.hazard')).toBe(true);
    });

    it('triggers Cabin Fever penalty (-2 Mental) on 3rd consecutive home relax without visiting park', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_low_cost', campaign2000.config);
      player.hoursRemaining = 30;
      player.physicalCondition = 50;
      player.physicalConditionMax = 100;
      player.mentalCondition = 30;
      player.mentalConditionMax = 80;
      player.inventory.cannedFoodUnits = 10;
      player.turnFlags.hasEaten = true;
      player.turnFlags.homeRelaxesThisTurn = 2;
      player.turnFlags.parkRelaxesThisTurn = 0;
      player.turnFlags.parkWorkoutsThisTurn = 0;
      player.turnFlags.relaxedThisTurn = true;

      // Normal 2nd+ relax: 3 (base) + 1 (socialMental: floor(20/15)=1) = 4 Mental.
      // With Cabin Fever penalty (-2 Mental): 4 - 2 = 2 Mental! 30 + 2 = 32
      const res = gameReducer(player, { type: 'relax' }, setupContext(player));
      expect(res.updatedPlayer.mentalCondition).toBe(32);
      expect(res.updatedPlayer.turnFlags.homeRelaxesThisTurn).toBe(3);

      // If player visits park, cabin fever is prevented:
      const playerVisitedPark = createPlayerState('p2', 'Alex', false, createDefaultGoalAllotment(), 'node_low_cost', campaign2000.config);
      playerVisitedPark.hoursRemaining = 30;
      playerVisitedPark.physicalCondition = 50;
      playerVisitedPark.physicalConditionMax = 100;
      playerVisitedPark.mentalCondition = 30;
      playerVisitedPark.mentalConditionMax = 80;
      playerVisitedPark.inventory.cannedFoodUnits = 10;
      playerVisitedPark.turnFlags.hasEaten = true;
      playerVisitedPark.turnFlags.homeRelaxesThisTurn = 2;
      playerVisitedPark.turnFlags.parkRelaxesThisTurn = 1;
      playerVisitedPark.turnFlags.relaxedThisTurn = true;

      const resVisited = gameReducer(playerVisitedPark, { type: 'relax' }, setupContext(playerVisitedPark));
      expect(resVisited.updatedPlayer.mentalCondition).toBe(34);
    });

    it('supports backwards-compatible aliases: stroll_park, jog_park, and rest_bench route properly', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_park_campus', campaign2000.config);
      player.hoursRemaining = 20;
      player.physicalCondition = 30;
      player.mentalCondition = 30;
      player.isAi = true;

      const context = setupContext(player);
      context.rng = { next: () => 0.99, nextInt: () => 0, getState: () => 1, setState: () => {} };

      const resStroll = gameReducer(player, { type: 'stroll_park' }, context);
      expect(resStroll.updatedPlayer.turnFlags.parkRelaxesThisTurn).toBe(1);
      expect(resStroll.updatedPlayer.turnFlags.parkStrollsThisTurn).toBe(1);

      const resJog = gameReducer(player, { type: 'jog_park' }, context);
      expect(resJog.updatedPlayer.turnFlags.parkWorkoutsThisTurn).toBe(1);
      expect(resJog.updatedPlayer.turnFlags.parkJogsThisTurn).toBe(1);

      const resRest = gameReducer(player, { type: 'rest_bench' }, context);
      expect(resRest.updatedPlayer.turnFlags.parkRelaxesThisTurn).toBe(1);
      expect(resRest.updatedPlayer.turnFlags.parkBenchesThisTurn).toBe(1);
    });

    it('supports authentic curved paths and contains all 16 authentic nodes and edges in advanced_2000', () => {
      expect(campaign2000.config.gameRules.authenticCurvedPaths).toBe(true);
      expect(campaign2000.map.authenticNodes).toBeDefined();
      expect(Object.keys(campaign2000.map.authenticNodes || {}).length).toBe(16);
      expect(campaign2000.map.authenticNodes?.['node_park_campus']).toEqual({ x: 592.5, y: 633.75 });
      expect(campaign2000.map.authenticNodes?.['node_park_east']).toEqual({ x: 1147.5, y: 592.5 });
      expect(campaign2000.map.authenticNodes?.['node_park_west']).toEqual({ x: 56.25, y: 311.25 });
      expect(campaign2000.map.edges).toBeDefined();
      expect(campaign2000.map.edges?.length).toBe(16);
    });

    it('removes normal monolith burger items from Red Pirate and retains pirate menu & coffee', () => {
      const redPirate = campaign2000.buildings.find(b => b.id === 'red_pirate')!;
      const itemIds = redPirate.inventory?.map(i => i.itemId) || [];
      expect(itemIds).not.toContain('hamburger');
      expect(itemIds).not.toContain('cheeseburger');
      expect(itemIds).not.toContain('fries');
      expect(itemIds).not.toContain('cola');
      expect(itemIds).toContain('scurvy_slaw');
      expect(itemIds).toContain('kraken_burger');
      expect(itemIds).toContain('buccaneer_stew');
      expect(itemIds).toContain('drip_coffee');
    });

    it('play_arcade consumes 3 hours and $10 for +2 Mental (play 1) and +2 Mental, -0.5 Physical (play 2+)', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_burger', campaign2000.config);
      player.hoursRemaining = 20;
      player.money = 50;
      player.mentalCondition = 30;
      player.social = 10;
      player.happiness = 40;
      player.physicalCondition = 40;

      // Play 1: +2 Mental, 0 Social, 0 Happiness
      const res1 = gameReducer(player, { type: 'play_arcade' }, setupContext(player));
      expect(res1.updatedPlayer.hoursRemaining).toBe(17);
      expect(res1.updatedPlayer.money).toBe(40);
      expect(res1.updatedPlayer.mentalCondition).toBe(32);
      expect(res1.updatedPlayer.physicalCondition).toBe(40);
      expect(res1.updatedPlayer.social).toBe(10); // No free Social
      expect(res1.updatedPlayer.happiness).toBe(40);
      expect(res1.updatedPlayer.turnFlags.arcadePlaysThisTurn).toBe(1);

      // Play 2: +2 Mental, -0.5 Physical
      const res2 = gameReducer(res1.updatedPlayer, { type: 'play_arcade' }, setupContext(res1.updatedPlayer));
      expect(res2.updatedPlayer.hoursRemaining).toBe(14);
      expect(res2.updatedPlayer.money).toBe(30);
      expect(res2.updatedPlayer.mentalCondition).toBe(34);
      expect(res2.updatedPlayer.physicalCondition).toBe(39.5);
      expect(res2.updatedPlayer.social).toBe(10);
      expect(res2.updatedPlayer.turnFlags.arcadePlaysThisTurn).toBe(2);

      // Play 3+: +2 Mental, -0.5 Physical
      const res3 = gameReducer(res2.updatedPlayer, { type: 'play_arcade' }, setupContext(res2.updatedPlayer));
      expect(res3.updatedPlayer.hoursRemaining).toBe(11);
      expect(res3.updatedPlayer.money).toBe(20);
      expect(res3.updatedPlayer.physicalCondition).toBe(39);
      expect(res3.updatedPlayer.mentalCondition).toBe(36);
      expect(res3.updatedPlayer.turnFlags.arcadePlaysThisTurn).toBe(3);
    });
  });

  describe('Hospital Interactive Building Actions', () => {
    function setupHospitalContext(player: PlayerState) {
      return {
        campaign: campaign2000,
        rules: campaign2000.config.gameRules,
        turn: 1,
        economicIndex: 0,
        rng: new Random(1),
        state: {
          turn: 1,
          players: [player],
          economicIndex: 0,
          rules: campaign2000.config.gameRules,
          pawnShopItemsForSale: [],
          rngState: 1,
          phase: 'playing' as const
        }
      };
    }

    it('urgent care provides proportional healing (critical < 20 lifts to 20 and repairs Max Phys, moderate +5, healthy +1)', () => {
      // 1. Critical tier (Physical = 10, max = 50 < 65)
      const pCritical = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_factory', campaign2000.config);
      pCritical.hoursRemaining = 20;
      pCritical.money = 200;
      pCritical.physicalCondition = 10;
      pCritical.physicalConditionMax = 50;

      const resCrit = gameReducer(pCritical, { type: 'hospital_urgent_care' }, setupHospitalContext(pCritical));
      expect(resCrit.updatedPlayer.hoursRemaining).toBe(14);
      expect(resCrit.updatedPlayer.money).toBe(120); // $200 - $80
      expect(resCrit.updatedPlayer.physicalCondition).toBe(20); // Lifted to 20
      expect(resCrit.updatedPlayer.physicalConditionMax).toBe(51); // Repaired +1 Max Phys
      expect(resCrit.actionLog).toEqual(expect.objectContaining({ key: 'action.hospital.urgentCareCritical' }));

      // 2. Moderate tier (Physical = 25)
      const pMod = createPlayerState('p2', 'Alex', false, createDefaultGoalAllotment(), 'node_factory', campaign2000.config);
      pMod.hoursRemaining = 20;
      pMod.money = 200;
      pMod.physicalCondition = 25;
      pMod.physicalConditionMax = 65;

      const resMod = gameReducer(pMod, { type: 'hospital_urgent_care' }, setupHospitalContext(pMod));
      expect(resMod.updatedPlayer.physicalCondition).toBe(30); // +5
      expect(resMod.actionLog).toEqual(expect.objectContaining({ key: 'action.hospital.urgentCareModerate' }));

      // 3. Healthy tier (Physical = 40)
      const pHealthy = createPlayerState('p3', 'Alex', false, createDefaultGoalAllotment(), 'node_factory', campaign2000.config);
      pHealthy.hoursRemaining = 20;
      pHealthy.money = 200;
      pHealthy.physicalCondition = 40;
      pHealthy.physicalConditionMax = 65;

      const resHealthy = gameReducer(pHealthy, { type: 'hospital_urgent_care' }, setupHospitalContext(pHealthy));
      expect(resHealthy.updatedPlayer.physicalCondition).toBe(41); // +1
      expect(resHealthy.actionLog).toEqual(expect.objectContaining({ key: 'action.hospital.urgentCareHealthy' }));
    });

    it('urgent care grants 50% employee discount for Hospital staff ($40 instead of $80)', () => {
      const staffPlayer = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_factory', campaign2000.config);
      staffPlayer.currentJobId = 'hospital_nurse';
      staffPlayer.hoursRemaining = 20;
      staffPlayer.money = 100;
      staffPlayer.physicalCondition = 25;

      const res = gameReducer(staffPlayer, { type: 'hospital_urgent_care' }, setupHospitalContext(staffPlayer));
      expect(res.updatedPlayer.money).toBe(60); // Paid only $40
      expect(res.updatedPlayer.physicalCondition).toBe(30);
    });

    it('urgent care rejects player if hours < 6 or money < cost', () => {
      const brokePlayer = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_factory', campaign2000.config);
      brokePlayer.hoursRemaining = 20;
      brokePlayer.money = 30; // Needs $80

      const resNoMoney = gameReducer(brokePlayer, { type: 'hospital_urgent_care' }, setupHospitalContext(brokePlayer));
      expect(resNoMoney.updatedPlayer.money).toBe(30);
      expect(resNoMoney.actionLog).toEqual(expect.objectContaining({ key: 'action.error.notEnoughMoneyHospital' }));

      const tiredPlayer = createPlayerState('p2', 'Alex', false, createDefaultGoalAllotment(), 'node_factory', campaign2000.config);
      tiredPlayer.hoursRemaining = 4; // Needs 6
      tiredPlayer.money = 200;

      const resNoTime = gameReducer(tiredPlayer, { type: 'hospital_urgent_care' }, setupHospitalContext(tiredPlayer));
      expect(resNoTime.updatedPlayer.hoursRemaining).toBe(4);
      expect(resNoTime.actionLog).toEqual(expect.objectContaining({ key: 'action.error.notEnoughTimeHospital' }));
    });

    it('psychiatric therapy permanently expands Max Mental (+1 resilienceBonus) and restores +3 Mental', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_factory', campaign2000.config);
      player.hoursRemaining = 20;
      player.money = 200;
      player.mentalCondition = 30;
      player.mentalConditionMax = 66;
      player.resilienceBonus = 0;

      const res = gameReducer(player, { type: 'hospital_therapy' }, setupHospitalContext(player));
      expect(res.updatedPlayer.hoursRemaining).toBe(14);
      expect(res.updatedPlayer.money).toBe(80); // $200 - $120
      expect(res.updatedPlayer.resilienceBonus).toBe(1);
      expect(res.updatedPlayer.mentalConditionMax).toBe(67); // Expanded by 1
      expect(res.updatedPlayer.mentalCondition).toBe(33); // +3 Mental
      expect(res.actionLog).toEqual(expect.objectContaining({ key: 'action.hospital.therapySuccess' }));
    });

    it('psychiatric therapy grants 50% employee discount for Hospital staff ($60 instead of $120)', () => {
      const staffPlayer = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_factory', campaign2000.config);
      staffPlayer.currentJobId = 'hospital_nurse';
      staffPlayer.hoursRemaining = 20;
      staffPlayer.money = 100;
      staffPlayer.mentalCondition = 30;

      const res = gameReducer(staffPlayer, { type: 'hospital_therapy' }, setupHospitalContext(staffPlayer));
      expect(res.updatedPlayer.money).toBe(40); // Paid $60
      expect(res.updatedPlayer.mentalCondition).toBe(33);
      expect(res.updatedPlayer.resilienceBonus).toBe(1);
    });

    it('emergency blood donation pays +$40, inflicts -3 Physical net, grants +1 Social, and enforces once-per-turn limit', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_factory', campaign2000.config);
      player.hoursRemaining = 20;
      player.money = 0;
      player.physicalCondition = 35;
      player.social = 20;

      // First donation: Success
      const res1 = gameReducer(player, { type: 'hospital_donate_blood' }, setupHospitalContext(player));
      expect(res1.updatedPlayer.hoursRemaining).toBe(18);
      expect(res1.updatedPlayer.money).toBe(40); // +$40 cash payout!
      expect(res1.updatedPlayer.physicalCondition).toBe(32); // -3 net Physical
      expect(res1.updatedPlayer.social).toBe(21); // +1 Social
      expect(res1.updatedPlayer.turnFlags.donatedBloodThisTurn).toBe(true);
      expect(res1.actionLog).toEqual(expect.objectContaining({ key: 'action.hospital.bloodDonationSuccess' }));

      // Second donation in same turn: Fails
      const res2 = gameReducer(res1.updatedPlayer, { type: 'hospital_donate_blood' }, setupHospitalContext(res1.updatedPlayer));
      expect(res2.updatedPlayer.money).toBe(40);
      expect(res2.updatedPlayer.hoursRemaining).toBe(18);
      expect(res2.actionLog).toEqual(expect.objectContaining({ key: 'action.hospital.alreadyDonatedBlood' }));
    });

    it('emergency blood donation is refused if player is too weak (Physical < 20)', () => {
      const weakPlayer = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_factory', campaign2000.config);
      weakPlayer.hoursRemaining = 20;
      weakPlayer.money = 0;
      weakPlayer.physicalCondition = 15; // Below 20

      const res = gameReducer(weakPlayer, { type: 'hospital_donate_blood' }, setupHospitalContext(weakPlayer));
      expect(res.updatedPlayer.money).toBe(0);
      expect(res.updatedPlayer.hoursRemaining).toBe(20);
      expect(res.actionLog).toEqual(expect.objectContaining({ key: 'action.hospital.bloodDonationTooWeak' }));
    });

    it('hospital cafeteria is restricted to hospital staff ($40 cost), non-staff is rejected', () => {
      const nonStaff = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_factory', campaign2000.config);
      nonStaff.hoursRemaining = 10;
      nonStaff.money = 50;
      nonStaff.physicalCondition = 30;
      nonStaff.mentalCondition = 30;
      nonStaff.inventory.fastFoodItems = [];

      // Non-staff attempt: rejected
      const resNonStaff = gameReducer(nonStaff, { type: 'hospital_cafeteria' }, setupHospitalContext(nonStaff));
      expect(resNonStaff.actionLog).toEqual(expect.objectContaining({ key: 'action.error.hospitalStaffOnly' }));
      expect(resNonStaff.updatedPlayer.money).toBe(50);
      expect(resNonStaff.updatedPlayer.inventory.fastFoodItems).toHaveLength(0);

      // Staff test ($40 cost)
      const staff = createPlayerState('p2', 'Alex', false, createDefaultGoalAllotment(), 'node_factory', campaign2000.config);
      staff.currentJobId = 'hospital_custodian';
      staff.hoursRemaining = 10;
      staff.money = 50;
      staff.physicalCondition = 30;
      staff.mentalCondition = 30;
      staff.inventory.fastFoodItems = [];

      const resStaff = gameReducer(staff, { type: 'hospital_cafeteria' }, setupHospitalContext(staff));
      expect(resStaff.updatedPlayer.hoursRemaining).toBe(9);
      expect(resStaff.updatedPlayer.money).toBe(10); // $50 - $40
      expect(resStaff.updatedPlayer.physicalCondition).toBe(31); // +1 Phys
      expect(resStaff.updatedPlayer.mentalCondition).toBe(28); // -2 Mental
      expect(resStaff.updatedPlayer.turnFlags.ateHospitalCafeteriaThisTurn).toBe(true);
      expect(resStaff.updatedPlayer.inventory.fastFoodItems).toHaveLength(1);
      expect(resStaff.updatedPlayer.inventory.fastFoodItems[0].itemId).toBe('hospital_tray');
    });

    it('prevents death spiral: broke hospital worker donates blood and buys cafeteria meal to avoid weekend starvation', () => {
      const brokePlayer = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_factory', campaign2000.config);
      brokePlayer.currentJobId = 'hospital_custodian';
      brokePlayer.hoursRemaining = 10;
      brokePlayer.money = 0; // Completely broke!
      brokePlayer.physicalCondition = 25;
      brokePlayer.mentalCondition = 30;
      brokePlayer.inventory.freshFoodUnits = 0;
      brokePlayer.inventory.fastFoodItems = [];
      brokePlayer.inventory.cannedFoodUnits = 0;

      // 1. Donate blood -> gain $40
      const afterBlood = gameReducer(brokePlayer, { type: 'hospital_donate_blood' }, setupHospitalContext(brokePlayer));
      expect(afterBlood.updatedPlayer.money).toBe(40);
      expect(afterBlood.updatedPlayer.physicalCondition).toBe(22);

      // 2. Buy cafeteria meal -> spend $40, have 1 food unit
      const afterFood = gameReducer(afterBlood.updatedPlayer, { type: 'hospital_cafeteria' }, setupHospitalContext(afterBlood.updatedPlayer));
      expect(afterFood.updatedPlayer.money).toBe(0);
      expect(afterFood.updatedPlayer.inventory.fastFoodItems).toHaveLength(1);

      // 3. Process turn start: verify NO starvation event occurred!
      const state: GameState = {
        turn: 2,
        players: [afterFood.updatedPlayer],
        economicIndex: 100,
        rules: campaign2000.config.gameRules,
        pawnShopItemsForSale: [],
        rngState: 42,
        phase: 'playing'
      };

      const nextState = processTurnStart(state, campaign2000);
      const nextPlayer = nextState.players[0];

      expect(nextPlayer.turnEvents.some(e => e.key === 'events.starvation')).toBe(false);
      expect(nextPlayer.money).toBe(0); // Spent $40 on cafeteria meal
    });
  });
});
