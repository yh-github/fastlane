import { describe, it, expect, beforeEach } from 'vitest';
import { loadCampaign } from '../src/engine/dataLoader';
import { createPlayerState, createDefaultGoalAllotment } from '../src/engine/stateFactories';
import { applyForJob, workShift, calcWorkShiftSummary } from '../src/engine/jobEngine';
import { getJobExpMultiplier, hasJobTag } from '../src/engine/jobTags';
import { calcAdvancedJobEmployabilityScore, calcUsedSpace } from '../src/engine/statMath';
import { gameReducer } from '../src/engine/gameReducer';
import { buyItem } from '../src/engine/shoppingEngine';
import { processMaintenanceAndDecayPhase } from '../src/engine/turn/maintenanceAndDecayPhase';
import { getPawnShopWeeklyStock } from '../src/ui/buildingModal/clerkDialogue';
import { recalculateLifestyle } from '../src/engine/synergyEngine';
import { Random } from '../src/utils/rng';

describe('Pawn Shop Jobs, Knick-Knacks & Dilemmas', () => {
  let campaign: any;
  let rules: any;

  beforeEach(async () => {
    campaign = await loadCampaign('advanced');
    rules = campaign.config.gameRules;
  });

  const makePlayer = () => createPlayerState('p1', 'Player 1', false, createDefaultGoalAllotment(), 'node_low_cost', campaign.config);

  describe('look_fit tag & Security Guard Job', () => {
    it('has pawn_security_guard with look_fit and high_downtime tags', () => {
      const job = campaign.jobs.find((j: any) => j.id === 'pawn_security_guard');
      expect(job).toBeDefined();
      expect(job.baseWage).toBe(7);
      expect(job.requirements.experience).toBe(15);
      expect(job.requirements.dependability).toBe(15);
      expect(hasJobTag(job, 'look_fit')).toBe(true);
      expect(hasJobTag(job, 'high_downtime')).toBe(true);
      expect(getJobExpMultiplier(job)).toBe(0.5);
    });

    it('rejects applicant with Physical Condition < 30', () => {
      const job = campaign.jobs.find((j: any) => j.id === 'pawn_security_guard');
      let player = makePlayer();
      player.experience = 25;
      player.dependability = 25;
      player.physicalCondition = 25; // Below 30

      const rng = new Random(42);
      const result = applyForJob(player, job, 1, campaign.messages, undefined, rng, rules, 1, undefined, campaign.config.statRules, 0);
      expect(result.updated.currentJobId).toBeNull();
      expect(result.message.key).toBe('action.job.rejected');
      expect((result.message.params as any)?.reasons).toContain('Physical Condition >= 30');
    });

    it('scales employability score with Physical Condition above 30', () => {
      const score30 = calcAdvancedJobEmployabilityScore(20, 20, 0, 20, 20, 0, 0, 0, 0, false, false, 0, false, 0, false, 30, true);
      const score40 = calcAdvancedJobEmployabilityScore(20, 20, 0, 20, 20, 0, 0, 0, 0, false, false, 0, false, 0, false, 40, true);
      const score50 = calcAdvancedJobEmployabilityScore(20, 20, 0, 20, 20, 0, 0, 0, 0, false, false, 0, false, 0, false, 50, true);

      expect(score40).toBe(score30 + 20); // +2% per point above 30 -> +20%
      expect(score50).toBe(score30 + 40); // +40% for +20
    });
  });

  describe('Counter Appraiser & Appraisal Dilemma', () => {
    it('has pawn_appraiser at $9/hr with Trade School requirement', () => {
      const job = campaign.jobs.find((j: any) => j.id === 'pawn_appraiser');
      expect(job).toBeDefined();
      expect(job.baseWage).toBe(9);
      expect(job.requirements.experience).toBe(25);
      expect(job.requirements.dependability).toBe(25);
      expect(job.requirements.degrees).toContain('trade_school');
      expect(hasJobTag(job, 'frontline_service')).toBe(true);
      expect(hasJobTag(job, 'high_downtime')).toBe(true);
    });

    it('resolves appraisal dilemma options via gameReducer', () => {
      let player = makePlayer();
      player.money = 100;
      player.dependability = 30;
      player.inventory.spareParts = 0;
      player.inventory.uninspectedKnickKnacks = 0;

      player.pendingAppraisalDilemma = {
        itemTitle: 'Vintage Pocketwatch',
        options: [
          { type: 'cash', title: 'Commission', description: 'Quick cash', cashAmount: 25 },
          { type: 'standing', title: 'Reputation', description: 'Boss appreciation', depAmount: 2 },
          { type: 'item', title: 'Curio', description: 'Side deal', itemType: 'knick_knack' }
        ]
      };

      const context: any = {
        campaign,
        rules,
        turn: 1,
        economicIndex: 0,
        rng: new Random(123),
        state: { rules, players: [player] }
      };

      // Test option 0: Cash
      const resCash = gameReducer(player, { type: 'resolve_appraisal_dilemma', choiceIndex: 0 }, context);
      expect(resCash.updatedPlayer.money).toBe(125);
      expect(resCash.updatedPlayer.pendingAppraisalDilemma).toBeNull();

      // Test option 1: Standing
      const resStanding = gameReducer(player, { type: 'resolve_appraisal_dilemma', choiceIndex: 1 }, context);
      expect(resStanding.updatedPlayer.dependability).toBe(32);
      expect(resStanding.updatedPlayer.pendingAppraisalDilemma).toBeNull();

      // Test option 2: Curio
      const resCurio = gameReducer(player, { type: 'resolve_appraisal_dilemma', choiceIndex: 2 }, context);
      expect(resCurio.updatedPlayer.inventory.uninspectedKnickKnacks).toBe(1);
      expect(resCurio.updatedPlayer.pendingAppraisalDilemma).toBeNull();

      // Test blocking behavior: non-dilemma action blocked when dilemma pending
      player.pendingAppraisalDilemma = {
        itemTitle: 'Blocked Timepiece',
        options: [
          { type: 'cash', title: 'Cash', description: 'Cash', cashAmount: 10 },
          { type: 'standing', title: 'Standing', description: 'Standing', depAmount: 1 }
        ]
      };
      const blockedRes = gameReducer(player, { type: 'clean' }, context);
      expect((blockedRes.actionLog as any)?.key).toBe('action.error.mustResolveDilemma');
      expect(blockedRes.updatedPlayer.pendingAppraisalDilemma).toBeDefined();

      // Test pawn_knick_knacks action
      player.pendingAppraisalDilemma = null;
      player.inventory.knickKnacks = 8;
      player.money = 50;
      const pawnRes = gameReducer(player, { type: 'pawn_knick_knacks', count: 5, valuePerItem: 4 }, context);
      expect(pawnRes.updatedPlayer.inventory.knickKnacks).toBe(3);
      expect(pawnRes.updatedPlayer.money).toBe(70);
    });

    it('triggers appraisal dilemma with 2 choices for pawn_horologist', () => {
      let player = makePlayer();
      player.experience = 40;
      player.dependability = 40;
      player.currentJobId = 'pawn_horologist';
      player.currentWage = 13;
      player.hoursRemaining = 40;
      player.physicalCondition = 50;
      player.mentalCondition = 50;
      player.degrees = ['pre_engineering'];

      const horologistJob = campaign.jobs.find((j: any) => j.id === 'pawn_horologist');
      // Force roll < 0.15 for dilemma
      const rng = { next: () => 0.05 };
      const res = workShift(player, horologistJob, 1, rules, campaign.config.statRules, 'face_time', rng as any);
      expect(res.updated.pendingAppraisalDilemma).toBeDefined();
      expect(res.updated.pendingAppraisalDilemma?.options.length).toBe(2);
    });
  });

  describe('Knick-Knack Shopping & Weekend Appraisal', () => {
    it('buying knick-knack adds to uninspectedKnickKnacks and takes 2 space', () => {
      let player = makePlayer();
      player.money = 100;
      player.currentHousingId = 'low_cost';

      const knickKnackDef = campaign.items.find((i: any) => i.id === 'knick_knack');
      const buyRes = buyItem(player, knickKnackDef, rules, campaign);
      expect(buyRes.success).toBe(true);
      expect(buyRes.updated.inventory.uninspectedKnickKnacks).toBe(1);

      // Verify space calculation: start mess is 3 in advanced, so usedSpace without mess should be 2
      const spaceUsed = calcUsedSpace(buyRes.updated, campaign, false);
      expect(spaceUsed).toBe(2);
    });

    it('grants novelty bonus on first curio buy, but 0 on subsequent buys in same turn', () => {
      let player = makePlayer();
      player.money = 100;
      player.currentHousingId = 'low_cost';

      const knickKnackDef = campaign.items.find((i: any) => i.id === 'knick_knack');
      const buyRes1 = buyItem(player, knickKnackDef, rules, campaign);
      expect(buyRes1.success).toBe(true);
      expect(buyRes1.updated.turnFlags.curioNoveltyGranted).toBe(true);
      expect((buyRes1.message.params as any)?.happinessBonus ?? (buyRes1.message.params as any)?.mentalBonus).toBeDefined();

      const buyRes2 = buyItem(buyRes1.updated, knickKnackDef, rules, campaign);
      expect(buyRes2.success).toBe(true);
      expect((buyRes2.message.params as any)?.happinessBonus).toBeUndefined();
      expect((buyRes2.message.params as any)?.mentalBonus).toBeUndefined();
    });

    it('processes uninspected curios as a single lottery event during weekend phase', () => {
      let player = makePlayer();
      player.inventory.uninspectedKnickKnacks = 3;
      player.money = 100;

      const state: any = {
        rules,
        turn: 1,
        economicIndex: 0,
        players: [player]
      };

      const rng = new Random(456);
      const result = processMaintenanceAndDecayPhase(player, state, campaign, rng, undefined, []);

      // Uninspected count is cleared
      expect(result.updatedPlayer.inventory.uninspectedKnickKnacks).toBe(0);
      // At most 1 curio event is triggered (unified lottery, never an event per item)
      const curioEvents = result.updatedPlayer.turnEvents.filter(e => e.key.startsWith('events.curio'));
      expect(curioEvents.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Horologist & Butcher balance', () => {
    it('pawn_horologist uses pre_engineering degree with technical tag at $13/hr', () => {
      const horologist = campaign.jobs.find((j: any) => j.id === 'pawn_horologist');
      expect(horologist).toBeDefined();
      expect(horologist.baseWage).toBe(13);
      expect(horologist.requirements.degrees).toContain('pre_engineering');
      expect(hasJobTag(horologist, 'technical')).toBe(true);
      expect(hasJobTag(horologist, 'high_downtime')).toBe(true);
    });

    it('blacks_butcher has heavy_physical tag', () => {
      const butcher = campaign.jobs.find((j: any) => j.id === 'blacks_butcher');
      expect(butcher).toBeDefined();
      expect(hasJobTag(butcher, 'heavy_physical')).toBe(true);
      expect(getJobExpMultiplier(butcher)).toBe(0.5);
    });
  });

  describe('Pawn Shop Weekly Rotating Stock', () => {
    it('generates a rotating stock of 6 items changing every turn', () => {
      const stockWeek1 = getPawnShopWeeklyStock(campaign, 1, 'p1');
      const stockWeek2 = getPawnShopWeeklyStock(campaign, 2, 'p1');

      expect(stockWeek1.length).toBe(6);
      expect(stockWeek2.length).toBe(6);

      // Should contain curios (knick_knack with vintage name)
      const hasCurio = stockWeek1.some(i => i.id === 'knick_knack');
      expect(hasCurio).toBe(true);

      // Verify that the inventory rotates from week 1 to week 2
      const namesWeek1 = stockWeek1.map(i => i.name).join(',');
      const namesWeek2 = stockWeek2.map(i => i.name).join(',');
      expect(namesWeek1).not.toBe(namesWeek2);
    });

    it('discounted broken appliances have tags broken and used and heavy discount', () => {
      // Find a turn seed that generates a broken appliance
      let foundBroken: any = null;
      for (let t = 1; t <= 20; t++) {
        const stock = getPawnShopWeeklyStock(campaign, t, 'p1');
        const broken = stock.find(i => i.tags?.includes('broken'));
        if (broken) {
          foundBroken = broken;
          break;
        }
      }

      if (foundBroken) {
        expect(foundBroken.category).toBe('appliance');
        expect(foundBroken.name).toMatch(/^Broken /);
        expect(foundBroken.tags).toContain('broken');
        expect(foundBroken.tags).toContain('used');
      }
    });

    it('limits broken appliances to at most 1 per week and excludes high-end appliances', () => {
      const EXCLUDED = ['computer', 'hot_tub', 'refrigerator', 'freezer'];
      for (let t = 1; t <= 50; t++) {
        const stock = getPawnShopWeeklyStock(campaign, t, 'p1');
        const brokenItems = stock.filter(i => i.tags?.includes('broken'));
        // At most 1 broken appliance per week
        expect(brokenItems.length).toBeLessThanOrEqual(1);

        if (brokenItems.length === 1) {
          const item = brokenItems[0];
          expect(EXCLUDED).not.toContain(item.id);
          const originalDef = campaign.items.find((i: any) => i.id === item.id);
          expect(originalDef.basePrice).toBeLessThanOrEqual(500);
        }
      }
    });
  });

  describe('Knick-Knack Lifestyle Contribution & Space Trade-offs', () => {
    it('grants lifestyle bonus with diminishing returns: min(15, floor(2.8 * sqrt(curios)))', () => {
      let player = makePlayer();
      player.currentHousingId = 'low_cost'; // 10 base lifestyle
      player.mess = 0;
      player.social = 0;

      // 0 curios -> 10 lifestyle
      expect(recalculateLifestyle(player, campaign)).toBe(10);

      // 1 curio -> +2 lifestyle -> 12
      player.inventory.knickKnacks = 1;
      expect(recalculateLifestyle(player, campaign)).toBe(12);

      // 4 curios -> +5 lifestyle -> 15
      player.inventory.knickKnacks = 4;
      expect(recalculateLifestyle(player, campaign)).toBe(15);

      // 10 curios -> +8 lifestyle -> 18
      player.inventory.knickKnacks = 10;
      expect(recalculateLifestyle(player, campaign)).toBe(18);

      // 16 curios -> +11 lifestyle -> 21
      player.inventory.knickKnacks = 16;
      expect(recalculateLifestyle(player, campaign)).toBe(21);

      // 25 curios -> +14 lifestyle -> 24
      player.inventory.knickKnacks = 25;
      expect(recalculateLifestyle(player, campaign)).toBe(24);

      // 36 curios -> +15 lifestyle (capped) -> 25
      player.inventory.knickKnacks = 36;
      expect(recalculateLifestyle(player, campaign)).toBe(25);
    });

    it('enables low-cost starter home to reach 20-30 lifestyle through curio collection', () => {
      let player = makePlayer();
      player.currentHousingId = 'low_cost'; // 10 base lifestyle
      player.mess = 0;
      player.social = 50; // +5 lifestyle (floor(50/10))
      player.inventory.knickKnacks = 16; // +11 lifestyle

      // Total lifestyle reaches 26 (within 20-30 target for budget apartment)
      const lifestyle = recalculateLifestyle(player, campaign);
      expect(lifestyle).toBe(26);

      // 16 curios take 32 space out of low_cost home 100 space cap
      const usedSpace = calcUsedSpace(player, campaign, false);
      expect(usedSpace).toBe(32);
    });
  });

  describe('Pawn Shop Rummaging (Bins & Crates)', () => {
    it('rummaging spends 1 hour and unearths 1 item into pendingPawnRummage', () => {
      let player = makePlayer();
      player.hoursRemaining = 10;
      const context = {
        campaign,
        rules,
        turn: 1,
        economicIndex: 0,
        rng: new Random(42),
        state: { players: [player], turn: 1, economicIndex: 0 } as any,
        engineDecisions: []
      };

      const result = gameReducer(player, { type: 'rummage_pawn_shop' }, context);
      expect(result.updatedPlayer.hoursRemaining).toBe(9); // spent 1 hour
      expect(result.updatedPlayer.pendingPawnRummage).toBeDefined();
      expect(result.updatedPlayer.pendingPawnRummage?.length).toBe(1);
      expect(result.actionLog?.key).toBe('action.pawn.rummaged');
    });

    it('allows purchasing at most 1 item from the rummaged batch, then clears pendingPawnRummage', () => {
      let player = makePlayer();
      player.money = 200;
      player.pendingPawnRummage = [
        { id: 'spare_parts', name: 'Spare Parts Box', category: 'junk' as const, basePrice: 15, space: 2, happinessBonus: 0 }
      ];

      const context = {
        campaign,
        rules,
        turn: 1,
        economicIndex: 0,
        rng: new Random(42),
        state: { players: [player], turn: 1, economicIndex: 0 } as any,
        engineDecisions: []
      };

      const result = gameReducer(player, { type: 'buy_rummage_item', itemIndex: 0 }, context);
      expect(result.updatedPlayer.money).toBe(185); // 200 - 15
      expect(result.updatedPlayer.inventory.spareParts).toBe(1);
      // Exactly 1 item per rummage: pendingPawnRummage is cleared!
      expect(result.updatedPlayer.pendingPawnRummage).toBeNull();
      expect(result.actionLog?.key).toBe('action.pawn.boughtRummageItem');
    });

    it('allows walking away / closing rummage without buying, clearing pendingPawnRummage', () => {
      let player = makePlayer();
      player.pendingPawnRummage = [
        { id: 'spare_parts', name: 'Spare Parts Box', category: 'junk' as const, basePrice: 15, space: 2, happinessBonus: 0 }
      ];

      const context = {
        campaign,
        rules,
        turn: 1,
        economicIndex: 0,
        rng: new Random(42),
        state: { players: [player], turn: 1, economicIndex: 0 } as any,
        engineDecisions: []
      };

      const result = gameReducer(player, { type: 'close_rummage' }, context);
      expect(result.updatedPlayer.pendingPawnRummage).toBeNull();
      expect(result.actionLog?.key).toBe('action.pawn.closedRummage');
    });

    it('enforces money and space constraints when buying rummaged items', () => {
      let player = makePlayer();
      player.money = 5; // cannot afford $15
      player.pendingPawnRummage = [
        { id: 'spare_parts', name: 'Spare Parts Box', category: 'junk' as const, basePrice: 15, space: 2, happinessBonus: 0 }
      ];

      const context = {
        campaign,
        rules,
        turn: 1,
        economicIndex: 0,
        rng: new Random(42),
        state: { players: [player], turn: 1, economicIndex: 0 } as any,
        engineDecisions: []
      };

      const result = gameReducer(player, { type: 'buy_rummage_item', itemIndex: 0 }, context);
      expect(result.actionLog?.key).toBe('action.error.notEnoughMoney');
      expect(result.updatedPlayer.money).toBe(5);
    });

    it('buying a rare pocket trinket grants +1 Mental, consumes 0 space, and is untracked in inventory', () => {
      let player = makePlayer();
      player.money = 50;
      player.mentalCondition = 20;
      player.mentalConditionMax = 50;
      player.pendingPawnRummage = [
        {
          id: 'trinket_lucky_coin',
          name: 'Engraved Lucky Coin',
          category: 'junk' as const,
          subcategory: 'rare_trinket',
          basePrice: 5,
          space: 0,
          happinessBonus: 1,
          tags: ['trinket_lucky_coin', 'rare_trinket', 'junk']
        }
      ];

      const context = {
        campaign,
        rules: { ...rules, usePhysicalMentalConditions: true },
        turn: 1,
        economicIndex: 0,
        rng: new Random(42),
        state: { players: [player], turn: 1, economicIndex: 0 } as any,
        engineDecisions: []
      };

      const result = gameReducer(player, { type: 'buy_rummage_item', itemIndex: 0 }, context);
      expect(result.updatedPlayer.money).toBe(45); // 50 - 5
      expect(result.updatedPlayer.mentalCondition).toBe(21); // +1 Mental
      expect(result.updatedPlayer.inventory.appliances.length).toBe(0); // Not tracked in appliances
      expect(result.updatedPlayer.inventory.knickKnacks || 0).toBe(0); // Not tracked in knickKnacks
      expect(result.updatedPlayer.pendingPawnRummage).toBeNull();
      expect(result.actionLog?.key).toBe('action.pawn.boughtTrinket');
    });

    it('supports buy_pawn_rummage_item and pass_pawn_rummage action aliases', () => {
      let player = makePlayer();
      player.money = 20;
      player.pendingPawnRummage = [
        { id: 'spare_parts', name: 'Spare Parts Box', category: 'junk' as const, basePrice: 15, space: 2, happinessBonus: 0 }
      ];

      const context = {
        campaign,
        rules,
        turn: 1,
        economicIndex: 0,
        rng: new Random(42),
        state: { players: [player], turn: 1, economicIndex: 0 } as any,
        engineDecisions: []
      };

      // Test buy_pawn_rummage_item alias
      const buyRes = gameReducer(player, { type: 'buy_pawn_rummage_item', itemIndex: 0 }, context);
      expect(buyRes.updatedPlayer.money).toBe(5);
      expect(buyRes.updatedPlayer.inventory.spareParts).toBe(1);
      expect(buyRes.updatedPlayer.pendingPawnRummage).toBeNull();

      // Test pass_pawn_rummage alias
      player.pendingPawnRummage = [
        { id: 'spare_parts', name: 'Spare Parts Box', category: 'junk' as const, basePrice: 15, space: 2, happinessBonus: 0 }
      ];
      const passRes = gameReducer(player, { type: 'pass_pawn_rummage' }, context);
      expect(passRes.updatedPlayer.pendingPawnRummage).toBeNull();
      expect(passRes.actionLog?.key).toBe('action.pawn.closedRummage');
    });
  });

  describe('Show Initiative (Replaces Innovate)', () => {
    it('requires player Experience to exceed current job requirement by at least 10', () => {
      const job = campaign.jobs.find((j: any) => j.id === 'pawn_security_guard'); // req: 15 Exp
      let player = makePlayer();
      player.currentJobId = job.id;
      player.currentWage = job.baseWage;
      player.experience = 24; // Needs 15 + 10 = 25
      player.hoursRemaining = 10;
      player.inventory.casualClothesWeeks = 10;
      player.inventory.selectedClothes = 'casual';

      const summary = calcWorkShiftSummary(player, job, 6, rules, campaign.config.statRules);
      const initiativeOption = summary.modes.find(m => m.id === 'show_initiative');
      expect(initiativeOption?.disabled).toBe(true);
      expect(initiativeOption?.disabledReasonKey).toBe('action.job.initiativeNeedExp');

      const result = workShift(player, job, 6, rules, campaign.config.statRules, 'show_initiative');
      expect(result.success).toBe(false);
      expect(result.messages?.[0]?.key).toBe('action.job.initiativeNeedExp');
    });

    it('costs 1.5x physical stamina, 1.5x + 2.0 mental, and pays 0.4x wages', () => {
      const job = campaign.jobs.find((j: any) => j.id === 'pawn_security_guard'); // wage: $7, req: 15 Exp
      let player = makePlayer();
      player.currentJobId = job.id;
      player.currentWage = 7;
      player.experience = 25; // 15 + 10 = 25 (Satisfied)
      player.hoursRemaining = 10;
      player.physicalCondition = 40;
      player.mentalCondition = 40;
      player.inventory.casualClothesWeeks = 10;
      player.inventory.selectedClothes = 'casual';

      const result = workShift(player, job, 6, rules, campaign.config.statRules, 'show_initiative');
      expect(result.success).toBe(true);
      // Base phys cost 1 * 1.5 = 1.5. 40 - 1.5 = 38.5
      expect(result.updated.physicalCondition).toBe(38.5);
      // Base mental cost 0 * 1.5 + 2 = 2. 40 - 2 = 38
      expect(result.updated.mentalCondition).toBe(38);
      // Wages: 7 * 8 * 0.4 = 22.4 -> Math.floor = 22
      expect(result.wagesEarned).toBe(22);
    });

    it('awards +0.25 Management Skill (+0.50 on management jobs) and clears location mistakes', () => {
      const job = campaign.jobs.find((j: any) => j.id === 'pawn_security_guard'); // non-management
      let player = makePlayer();
      player.currentJobId = job.id;
      player.currentWage = 7;
      player.experience = 25;
      player.hoursRemaining = 10;
      player.skillMgmt = 0;
      player.mistakesByLocation = { [job.locationId]: 2 };
      player.inventory.casualClothesWeeks = 10;
      player.inventory.selectedClothes = 'casual';

      const result = workShift(player, job, 6, rules, campaign.config.statRules, 'show_initiative');
      expect(result.success).toBe(true);
      expect(result.updated.skillMgmt).toBe(0.25);
      // Clears 1 location mistake: 2 -> 1
      expect(result.updated.mistakesByLocation?.[job.locationId]).toBe(1);
      // Tracks location initiative: 0 -> 1
      expect(result.updated.initiativesByLocation?.[job.locationId]).toBe(1);
      expect(result.messages?.some(m => m.key === 'action.job.initiativeClearedMistake')).toBe(true);
    });

    it('awards +0.50 MGMT & +1.5 Dep on middle management, and +1.00 MGMT & +2.0 Dep & +2 standing on executive management', () => {
      const midJob = campaign.jobs.find((j: any) => j.id === 'zmart_asst_mgr');
      expect(midJob).toBeDefined();

      let midPlayer = makePlayer();
      midPlayer.currentJobId = midJob.id;
      midPlayer.currentWage = midJob.baseWage;
      midPlayer.experience = 40; // req 20 + 10 = 30
      midPlayer.dependability = 20;
      midPlayer.skillMgmt = 0;
      midPlayer.hoursRemaining = 10;
      midPlayer.inventory.dressClothesWeeks = 10;
      midPlayer.inventory.selectedClothes = 'dress';

      const midResult = workShift(midPlayer, midJob, 6, rules, campaign.config.statRules, 'show_initiative');
      expect(midResult.success).toBe(true);
      expect(midResult.updated.skillMgmt).toBe(0.50);
      expect(midResult.updated.dependability).toBe(21.5);
      expect(midResult.updated.initiativesByLocation?.[midJob.locationId]).toBe(1);

      const execJob = campaign.jobs.find((j: any) => j.id === 'zmart_mgr');
      expect(execJob).toBeDefined();

      let execPlayer = makePlayer();
      execPlayer.currentJobId = execJob.id;
      execPlayer.currentWage = execJob.baseWage;
      execPlayer.experience = 50; // req 30 + 10 = 40
      execPlayer.dependability = 40;
      execPlayer.skillMgmt = 2.0;
      execPlayer.hoursRemaining = 10;
      execPlayer.inventory.businessClothesWeeks = 10;
      execPlayer.inventory.selectedClothes = 'business';

      const execResult = workShift(execPlayer, execJob, 6, rules, campaign.config.statRules, 'show_initiative');
      expect(execResult.success).toBe(true);
      expect(execResult.updated.skillMgmt).toBe(3.0); // 2.0 + 1.0 = 3.0
      expect(execResult.updated.dependability).toBe(42); // 40 + 2.0 = 42
      expect(execResult.updated.initiativesByLocation?.[execJob.locationId]).toBe(2); // +2 initiatives for exec
    });

    it('boosts internal promotion employability score by +3 per initiative', () => {
      const baseScore = calcAdvancedJobEmployabilityScore({
        dependability: 50,
        experience: 50,
        degreesCount: 0,
        jobReqDep: 20,
        jobReqExp: 20,
        initiativesAtLocation: 0
      });
      const boostedScore = calcAdvancedJobEmployabilityScore({
        dependability: 50,
        experience: 50,
        degreesCount: 0,
        jobReqDep: 20,
        jobReqExp: 20,
        initiativesAtLocation: 2
      });
      expect(boostedScore - baseScore).toBe(6); // +3 * 2 = +6
    });

    it('location initiatives offset past raises when requesting a wage raise', () => {
      const job = campaign.jobs.find((j: any) => j.id === 'pawn_security_guard');
      let player = makePlayer();
      player.currentJobId = job.id;
      player.currentWage = 7;
      player.dependability = 20; // exactly base requirement (20)
      player.experience = 30;
      player.raisesAtCurrentJob = 1; // normally raises reqDep by +5 to 25
      player.initiativesByLocation = { [job.locationId]: 1 }; // 1 initiative offsets 1 raise!
      player.hoursRemaining = 10;
      player.inventory.casualClothesWeeks = 10;
      player.inventory.selectedClothes = 'casual';

      const result = applyForJob(player, job, 4, {}, 8, new Random(1), rules);
      expect(result.success).toBe(true);
      expect(result.updated.currentWage).toBe(8);
      expect(result.updated.raisesAtCurrentJob).toBe(2);
    });
  });

  describe('Social Mistakes & Frontline Service Vulnerability', () => {
    it('frontline_service jobs have double social mistake threshold (20 vs 10)', () => {
      const frontlineJob = campaign.jobs.find((j: any) => hasJobTag(j, 'frontline_service'));
      expect(frontlineJob).toBeDefined();

      let player = makePlayer();
      player.currentJobId = frontlineJob.id;
      player.currentWage = frontlineJob.baseWage;
      player.social = 15; // Between 10 and 20
      player.hoursRemaining = 10;
      player.inventory.casualClothesWeeks = 10;
      player.inventory.selectedClothes = 'casual';

      const summary = calcWorkShiftSummary(player, frontlineJob, 6, rules, campaign.config.statRules);
      const workWork = summary.modes.find(m => m.id === 'work_work');
      // For frontline_service, social threshold is 20, so at 15 social, (20 - 15) * 2.5% = 12.5% risk!
      expect(workWork?.socialMistakeChance).toBeCloseTo(0.125, 3);
    });

    it('rolls social mistake at (threshold - Social) * 2.5%, penalizing Social and adding mistake', () => {
      const frontlineJob = campaign.jobs.find((j: any) => hasJobTag(j, 'frontline_service'));
      let player = makePlayer();
      player.currentJobId = frontlineJob.id;
      player.currentWage = frontlineJob.baseWage;
      player.social = 16;
      player.hoursRemaining = 10;
      player.inventory.casualClothesWeeks = 10;
      player.inventory.selectedClothes = 'casual';

      const replay = {
        inDecisions: [{ type: `work_social_mistake_${player.id}_1`, result: true }],
        outDecisions: []
      };

      const result = workShift(player, frontlineJob, 6, rules, campaign.config.statRules, 'work_work', new Random(42), replay);
      expect(result.success).toBe(true);
      // Social reduced by -1 (social mistake) + -1 (frontline_service mistake penalty) = 14
      expect(result.updated.social).toBe(14);
      // Location mistake added
      expect(result.updated.mistakesByLocation?.[frontlineJob.locationId]).toBe(1);
    });

    it('softly disables actions that cost Social if player has insufficient Social (curSocial - cost < 1)', () => {
      const frontlineJob = campaign.jobs.find((j: any) => hasJobTag(j, 'frontline_service'));
      let player = makePlayer();
      player.currentJobId = frontlineJob.id;
      player.currentWage = frontlineJob.baseWage;
      player.social = 1; // Insufficient to pay 1 Social cost
      player.hoursRemaining = 10;
      player.inventory.casualClothesWeeks = 10;
      player.inventory.selectedClothes = 'casual';

      // look_busy costs 1 Social on frontline_service
      const summary = calcWorkShiftSummary(player, frontlineJob, 6, rules, campaign.config.statRules);
      const lookBusy = summary.modes.find(m => m.id === 'look_busy');
      expect(lookBusy?.disabled).toBe(true);
      expect(lookBusy?.disabledReasonKey).toBe('action.job.needMoreSocial');

      const result = workShift(player, frontlineJob, 6, rules, campaign.config.statRules, 'look_busy');
      expect(result.success).toBe(false);
      expect(result.messages?.[0]?.key).toBe('action.job.needMoreSocial');
    });

    it('initializes starting Social score to 20 so frontline service jobs have 0% blunder chance initially', () => {
      const initialPlayer = createPlayerState(
        'p1',
        'Test Player',
        false,
        createDefaultGoalAllotment(),
        'node_low_cost',
        campaign.config
      );
      expect(initialPlayer.social).toBe(20);

      const frontlineJob = campaign.jobs.find((j: any) => hasJobTag(j, 'frontline_service'));
      const summary = calcWorkShiftSummary(initialPlayer, frontlineJob, 6, rules, campaign.config.statRules);
      const workWork = summary.modes.find(m => m.id === 'work_work');
      // With Social = 20 and threshold = 20, mistake chance is max(0, (20 - 20) * 2.5%) = 0
      expect(workWork?.socialMistakeChance).toBe(0);
    });

    it('subjects ALL work modes (work_work, look_busy, face_time, show_initiative) to social mistake risk when Social < 20 on frontline_service', () => {
      const frontlineJob = campaign.jobs.find((j: any) => hasJobTag(j, 'frontline_service'));
      let player = makePlayer();
      player.currentJobId = frontlineJob.id;
      player.currentWage = frontlineJob.baseWage;
      player.social = 14; // 6 points below 20 -> 6 * 2.5% = 15% risk
      player.experience = 30;
      player.hoursRemaining = 10;
      player.inventory.casualClothesWeeks = 10;
      player.inventory.selectedClothes = 'casual';

      const summary = calcWorkShiftSummary(player, frontlineJob, 6, rules, campaign.config.statRules);
      for (const mode of summary.modes) {
        expect(mode.socialMistakeChance).toBeCloseTo(0.15, 3);
      }
    });
  });
});

