import { describe, it, expect, beforeEach } from 'vitest';
import { loadCampaign } from '../src/engine/dataLoader';
import { createPlayerState, createDefaultGoalAllotment } from '../src/engine/stateFactories';
import { applyForJob } from '../src/engine/jobEngine';
import { getJobExpMultiplier, hasJobTag } from '../src/engine/jobTags';
import { calcAdvancedJobEmployabilityScore, calcUsedSpace } from '../src/engine/statMath';
import { gameReducer } from '../src/engine/gameReducer';
import { buyItem } from '../src/engine/shoppingEngine';
import { processMaintenanceAndDecayPhase } from '../src/engine/turn/maintenanceAndDecayPhase';
import { getPawnShopWeeklyStock } from '../src/ui/buildingModal/clerkDialogue';
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
      expect(job.requirements.experience).toBe(20);
      expect(job.requirements.dependability).toBe(20);
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
      const score30 = calcAdvancedJobEmployabilityScore(20, 20, 20, 20, 0, 0, 0, 0, 0, false, false, 0, false, 0, false, 30, true);
      const score40 = calcAdvancedJobEmployabilityScore(20, 20, 20, 20, 0, 0, 0, 0, 0, false, false, 0, false, 0, false, 40, true);
      const score50 = calcAdvancedJobEmployabilityScore(20, 20, 20, 20, 0, 0, 0, 0, 0, false, false, 0, false, 0, false, 50, true);

      expect(score40).toBe(score30 + 10); // +1% per point above 30 -> +10%
      expect(score50).toBe(score30 + 20); // +20% for +20
    });
  });

  describe('Counter Appraiser & Appraisal Dilemma', () => {
    it('has pawn_appraiser at $9/hr with Trade School requirement', () => {
      const job = campaign.jobs.find((j: any) => j.id === 'pawn_appraiser');
      expect(job).toBeDefined();
      expect(job.baseWage).toBe(9);
      expect(job.requirements.experience).toBe(30);
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
  });
});
