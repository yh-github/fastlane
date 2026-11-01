import { describe, it, expect, beforeEach } from 'vitest';
import { loadCampaign, type CampaignBundle } from '../src/engine/dataLoader';
import { createPlayerState, createDefaultGoalAllotment } from '../src/engine/stateFactories';
import { processTurnStart } from '../src/engine/turnProcessor';
import { processDoctorVisit } from '../src/engine/eventEngine';
import { workShift } from '../src/engine/job/jobShiftExecution';
import { gameReducer } from '../src/engine/gameReducer';
import { buyItem } from '../src/engine/shoppingEngine';
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

    it('contains progressive healthcare education degrees', () => {
      const degIds = campaign2000.education.map(d => d.id);
      expect(degIds).toContain('physiology');
      expect(degIds).toContain('biochemistry');
      expect(degIds).toContain('medical_school');
      expect(degIds).toContain('residency');
      expect(degIds).toContain('specialty_fellowship');
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

    it('drinking coffee provides immediate physical/mental boosts and tracks cups drank', () => {
      const { player } = createTestState(0);
      const dripDef = campaign2000.items.find(i => i.id === 'drip_coffee')!;

      const result = buyItem(player, dripDef, campaign2000.config.gameRules, campaign2000, 1);
      expect(result.updated.turnFlags.coffeeCupsThisTurn).toBe(1);
      expect(result.updated.physicalCondition).toBeGreaterThan(40);
      expect(result.updated.mentalCondition).toBeGreaterThan(40);
      // Immediate consumption does not consume fridge or pantry food units
      expect(result.updated.inventory.cannedFoodUnits).toBe(4);
      expect(result.updated.inventory.freshFoodUnits).toBe(0);
    });

    it('diminishes coffee benefits at high tolerance levels (tolerance >= 6 and >= 9)', () => {
      const { player: freshPlayer } = createTestState(0);
      const { player: tolerantPlayer } = createTestState(9);
      const doubleDef = campaign2000.items.find(i => i.id === 'double_shot')!;

      const freshResult = buyItem(freshPlayer, doubleDef, campaign2000.config.gameRules, campaign2000, 1);
      const tolerantResult = buyItem(tolerantPlayer, doubleDef, campaign2000.config.gameRules, campaign2000, 1);

      const freshPhysGain = (freshResult.updated.physicalCondition ?? 0) - 40;
      const tolPhysGain = (tolerantResult.updated.physicalCondition ?? 0) - 40;
      expect(freshPhysGain).toBeGreaterThan(tolPhysGain);
    });

    it('updates tolerance during turn maintenance based on cups consumed', () => {
      // 0 cups -> detox (-2 tolerance)
      const { player: pDetox, state: sDetox } = createTestState(5);
      pDetox.turnFlags.coffeeCupsThisTurn = 0;
      const nextDetox = processTurnStart({ ...sDetox, players: [pDetox] }, campaign2000);
      expect(nextDetox.players[0].caffeineTolerance).toBe(3);

      // 1 cup -> maintain tolerance
      const { player: pMaint, state: sMaint } = createTestState(5);
      pMaint.turnFlags.coffeeCupsThisTurn = 1;
      const nextMaint = processTurnStart({ ...sMaint, players: [pMaint] }, campaign2000);
      expect(nextMaint.players[0].caffeineTolerance).toBe(5);

      // 2 cups -> +1 tolerance
      const { player: pTwo, state: sTwo } = createTestState(5);
      pTwo.turnFlags.coffeeCupsThisTurn = 2;
      const nextTwo = processTurnStart({ ...sTwo, players: [pTwo] }, campaign2000);
      expect(nextTwo.players[0].caffeineTolerance).toBe(6);

      // 3+ cups -> +2 tolerance
      const { player: pThree, state: sThree } = createTestState(5);
      pThree.turnFlags.coffeeCupsThisTurn = 3;
      const nextThree = processTurnStart({ ...sThree, players: [pThree] }, campaign2000);
      expect(nextThree.players[0].caffeineTolerance).toBe(7);
    });

    it('applies morning fog penalty at tolerance 3-5 (-1 Physical)', () => {
      const { player, state } = createTestState(4);
      player.turnFlags.coffeeCupsThisTurn = 1; // stays at 4
      player.physicalCondition = 40;
      player.mentalCondition = 40;

      const nextState = processTurnStart({ ...state, players: [player] }, campaign2000);
      const nextP = nextState.players[0];
      const fogEvt = nextP.turnEvents.find(e => e.key === 'events.caffeine_fog');
      expect(fogEvt).toBeDefined();
    });

    it('applies moderate withdrawal penalty at tolerance 6-8 (-2 Physical, -2 Mental)', () => {
      const { player, state } = createTestState(7);
      player.turnFlags.coffeeCupsThisTurn = 1; // stays at 7

      const nextState = processTurnStart({ ...state, players: [player] }, campaign2000);
      const nextP = nextState.players[0];
      const withEvt = nextP.turnEvents.find(e => e.key === 'events.caffeine_withdrawal');
      expect(withEvt).toBeDefined();
    });

    it('applies severe withdrawal penalty at tolerance 9-10 (-3 Phys, -3 Mental, -1 Max Phys)', () => {
      const { player, state } = createTestState(9);
      player.turnFlags.coffeeCupsThisTurn = 1; // stays at 9
      const initMaxPhys = player.physicalConditionMax ?? 100;

      const nextState = processTurnStart({ ...state, players: [player] }, campaign2000);
      const nextP = nextState.players[0];
      const sevEvt = nextP.turnEvents.find(e => e.key === 'events.caffeine_withdrawal_severe');
      expect(sevEvt).toBeDefined();
      expect(nextP.physicalConditionMax).toBe(initMaxPhys - 1);
    });
  });

  describe('The Red Pirate & Busy Weeks', () => {
    it('Red Pirate food menu has cheap/gross slaw vs yummy kraken burger', () => {
      const slaw = campaign2000.items.find(i => i.id === 'scurvy_slaw')!;
      const burger = campaign2000.items.find(i => i.id === 'kraken_burger')!;

      expect(slaw.basePrice).toBe(15);
      expect(slaw.effects?.some(e => e.stat === 'physical' && (e.value ?? 0) < 0)).toBe(true);

      expect(burger.basePrice).toBe(75);
      expect(burger.happinessBonus).toBeGreaterThan(0);
      expect(burger.mentalBonus).toBeGreaterThan(0);
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

      expect(busyRes.wagesEarned).toBe(Math.floor(normalRes.wagesEarned * 1.5));
      expect(busyRes.updated.dependability).toBeGreaterThan(normalRes.updated.dependability);
      expect(busyRes.updated.experience).toBeGreaterThan(normalRes.updated.experience);
      expect(busyRes.updated.physicalCondition).toBeLessThan(normalRes.updated.physicalCondition ?? 50);
    });

    it('penalizes employees who work 0 shifts during a busy week (-4 Dep and reprimand)', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_low_cost', campaign2000.config);
      player.currentJobId = 'pirate_cook';
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

    it('stroll_park consumes 1 hour and restores +1 Physical and +1 Mental', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_park_campus', campaign2000.config);
      player.hoursRemaining = 20;
      player.physicalCondition = 30;
      player.mentalCondition = 30;

      const res = gameReducer(player, { type: 'stroll_park' }, setupContext(player));
      expect(res.updatedPlayer.hoursRemaining).toBe(19);
      expect(res.updatedPlayer.physicalCondition).toBe(31);
      expect(res.updatedPlayer.mentalCondition).toBe(31);
    });

    it('jog_park consumes 2 hours, trains +1 Max Physical, adds +1 Physical, and expends -1 Mental', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_park_campus', campaign2000.config);
      player.hoursRemaining = 20;
      player.physicalCondition = 30;
      player.physicalConditionMax = 40;
      player.mentalCondition = 30;

      const res = gameReducer(player, { type: 'jog_park' }, setupContext(player));
      expect(res.updatedPlayer.hoursRemaining).toBe(18);
      expect(res.updatedPlayer.physicalConditionMax).toBe(41);
      expect(res.updatedPlayer.physicalCondition).toBe(31);
      expect(res.updatedPlayer.mentalCondition).toBe(29);
    });

    it('rest_bench consumes 2 hours and restores +1 Physical and +2 Mental', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_park_campus', campaign2000.config);
      player.hoursRemaining = 20;
      player.physicalCondition = 30;
      player.mentalCondition = 30;

      const res = gameReducer(player, { type: 'rest_bench' }, setupContext(player));
      expect(res.updatedPlayer.hoursRemaining).toBe(18);
      expect(res.updatedPlayer.physicalCondition).toBe(31);
      expect(res.updatedPlayer.mentalCondition).toBe(32);
    });

    it('play_arcade consumes 1 hour and $5 for +2 Mental and +2 Happiness', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_burger_palace', campaign2000.config);
      player.hoursRemaining = 20;
      player.money = 50;
      player.mentalCondition = 30;
      player.happiness = 40;

      const res = gameReducer(player, { type: 'play_arcade' }, setupContext(player));
      expect(res.updatedPlayer.hoursRemaining).toBe(19);
      expect(res.updatedPlayer.money).toBe(45);
      expect(res.updatedPlayer.mentalCondition).toBe(32);
      expect(res.updatedPlayer.happiness).toBe(42);
    });
  });
});
