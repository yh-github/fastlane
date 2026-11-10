import { describe, it, expect, beforeEach } from 'vitest';
import { loadCampaign, type CampaignBundle } from '../src/engine/dataLoader';
import { createPlayerState, createDefaultGoalAllotment } from '../src/engine/stateFactories';
import { gameReducer } from '../src/engine/gameReducer';
import { enrollInDegree } from '../src/engine/educationEngine';
import { processTurnStart } from '../src/engine/turnProcessor';
import { Random } from '../src/utils/rng';
import type { ReducerContext, GameState } from '../src/engine/gameState';

describe('Academic Strikes, Tier-Scaled Mistake Thresholds & Caffeine Shielding', () => {
  let campaign: CampaignBundle;
  let context: ReducerContext;

  beforeEach(async () => {
    campaign = await loadCampaign('advanced_2000');
    context = {
      campaign,
      rules: { ...campaign.config.gameRules, percentageEducation: true, usePhysicalMentalConditions: true },
      rng: new Random(12345),
      turn: 1,
      economicIndex: 0,
      engineDecisions: []
    };
  });

  describe('Progress Rollback on Mistake (Floored at 0%)', () => {
    it('rolls back 10 percentage points on mistake and floors at 0%', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_park_campus', campaign.config);
      player.hoursRemaining = 24;
      player.physicalCondition = 50;
      player.mentalCondition = 10; // below threshold -> risks mistake
      player.enrolledClasses = { trade_school: 35 };

      // Force mistake decision
      context.engineDecisions = [{ type: `study_mental_mistake_${player.id}_1`, result: true }];

      // First mistake: 35% -> 25%
      const res1 = gameReducer(player, { type: 'study', degreeId: 'trade_school' }, context);
      expect(res1.actionLog?.key).toBe('action.education.mistake');
      expect(res1.updatedPlayer.enrolledClasses['trade_school']).toBe(25);
      expect(res1.updatedPlayer.academicStrikes?.['trade_school']).toBe(1);

      // Set progress to 5% and trigger second mistake: floors at 0%, does NOT drop below 0
      res1.updatedPlayer.enrolledClasses['trade_school'] = 5;
      res1.updatedPlayer.hoursRemaining = 18;
      context.engineDecisions = [{ type: `study_mental_mistake_${player.id}_2`, result: true }];

      const res2 = gameReducer(res1.updatedPlayer, { type: 'study', degreeId: 'trade_school' }, context);
      expect(res2.actionLog?.key).toBe('action.education.mistake');
      expect(res2.updatedPlayer.enrolledClasses['trade_school']).toBe(0);
      expect(res2.updatedPlayer.academicStrikes?.['trade_school']).toBe(2);
    });
  });

  describe('3-Strike Course Failure, Expulsion & Turn Suspension Lockout', () => {
    it('triggers course failure on 3rd strike, wipes progress, and blocks re-enrollment this turn', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_park_campus', campaign.config);
      player.hoursRemaining = 24;
      player.physicalCondition = 50;
      player.mentalCondition = 10;
      player.enrolledClasses = { trade_school: 50 };
      player.academicStrikes = { trade_school: 2 }; // Already has 2 strikes

      // Force 3rd mistake
      context.engineDecisions = [{ type: `study_mental_mistake_${player.id}_1`, result: true }];

      const res = gameReducer(player, { type: 'study', degreeId: 'trade_school' }, context);

      // Course fails
      expect(res.actionLog?.key).toBe('action.education.failedCourse');
      // Class removed from enrolledClasses
      expect(res.updatedPlayer.enrolledClasses['trade_school']).toBeUndefined();
      // Strikes cleared from active list
      expect(res.updatedPlayer.academicStrikes?.['trade_school']).toBeUndefined();
      // Marked as failed this turn
      expect(res.updatedPlayer.turnFlags.failedClassesThisTurn).toContain('trade_school');

      // Attempting to re-enroll in the same turn is blocked
      const enrollAttempt = enrollInDegree(res.updatedPlayer, campaign.education.find(d => d.id === 'trade_school')!, 0, context.rules);
      expect(enrollAttempt.success).toBe(false);
      expect(enrollAttempt.message.key).toBe('action.error.classFailedThisTurn');

      // Next turn: suspension is lifted
      const dummyState: GameState = {
        turn: 1,
        players: [res.updatedPlayer],
        rules: context.rules,
        seed: 123
      } as any;
      const nextTurnState = processTurnStart(dummyState, campaign);
      const nextPlayer = nextTurnState.players[0];
      expect(nextPlayer.turnFlags.failedClassesThisTurn).toEqual([]);

      // Now re-enrollment is allowed
      nextPlayer.money = 500;
      const reEnrollRes = enrollInDegree(nextPlayer, campaign.education.find(d => d.id === 'trade_school')!, 0, context.rules);
      expect(reEnrollRes.success).toBe(true);
      expect(reEnrollRes.updated.enrolledClasses['trade_school']).toBe(0);
    });

    it('clears accumulated strikes upon graduation', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_park_campus', campaign.config);
      player.hoursRemaining = 24;
      player.physicalCondition = 50;
      player.mentalCondition = 50; // high mental -> safe
      player.enrolledClasses = { trade_school: 95 }; // 1 session away from graduating
      player.academicStrikes = { trade_school: 2 }; // Sitting on 2 strikes

      const res = gameReducer(player, { type: 'study', degreeId: 'trade_school' }, context);
      expect(res.actionLog?.key).toBe('action.education.graduated');
      expect(res.updatedPlayer.degrees).toContain('trade_school');
      expect(res.updatedPlayer.enrolledClasses['trade_school']).toBeUndefined();
      // Strikes successfully wiped
      expect(res.updatedPlayer.academicStrikes?.['trade_school']).toBeUndefined();
    });
  });

  describe('Tier-Scaled Cognitive Difficulty (Threshold = Base + 2 * Tier)', () => {
    it('escalates mistake threshold based on course prerequisite depth', () => {
      // In advanced_2000, base mental mistake threshold is 18
      expect(campaign.config.statRules?.workMistakeMentalThreshold).toBe(18);

      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_park_campus', campaign.config);
      player.hoursRemaining = 24;
      player.physicalCondition = 50;

      // Tier 0: trade_school (prereqDepth = 0) -> Threshold = 18 + 0 = 18
      // With Mental = 18, mistake chance is 0%
      player.mentalCondition = 18;
      player.enrolledClasses = { trade_school: 10 };
      const resTier0Safe = gameReducer(player, { type: 'study', degreeId: 'trade_school' }, context);
      expect(resTier0Safe.actionLog?.key).toBe('action.education.studied');

      // Now test an advanced degree: graduate_school (requires junior_college -> academic, prereqDepth = 2)
      // Tier 2: Threshold = 18 + (2 * 2) = 22
      // With Mental = 20: 20 < 22 -> in danger zone!
      player.degrees = ['junior_college', 'academic'];
      player.enrolledClasses = { graduate_school: 10 };
      player.mentalCondition = 20;

      // Force mental mistake on graduate_school
      context.engineDecisions = [{ type: `study_mental_mistake_${player.id}_1`, result: true }];
      const resTier2Mistake = gameReducer(player, { type: 'study', degreeId: 'graduate_school' }, context);
      expect(resTier2Mistake.actionLog?.key).toBe('action.education.mistake');
      expect(resTier2Mistake.updatedPlayer.academicStrikes?.['graduate_school']).toBe(1);

      // With Mental = 22: meets threshold -> 0% risk!
      player.mentalCondition = 22;
      context.engineDecisions = [];
      const resTier2Safe = gameReducer(player, { type: 'study', degreeId: 'graduate_school' }, context);
      expect(resTier2Safe.actionLog?.key).toBe('action.education.studied');
    });
  });

  describe('Caffeine Buffer Shields Cognitive Study Mistakes', () => {
    it('allows coffee consumption to buffer Mental and prevent study mistakes', () => {
      const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_park_campus', campaign.config);
      player.hoursRemaining = 24;
      player.physicalCondition = 50;
      player.degrees = ['junior_college', 'academic'];
      player.enrolledClasses = { graduate_school: 10 }; // Tier 2 -> Threshold = 22

      // Mental is 16 (6 points below 22 -> 15% mistake risk without caffeine)
      player.mentalCondition = 16;
      player.turnFlags.caffeineIntake = 0;
      player.caffeineTolerance = 0;

      // Force mistake decision
      context.engineDecisions = [{ type: `study_mental_mistake_${player.id}_1`, result: true }];
      const unbufferedRes = gameReducer(player, { type: 'study', degreeId: 'graduate_school' }, context);
      expect(unbufferedRes.actionLog?.key).toBe('action.education.mistake');

      // Now drink an espresso (+10 caffeine buffer)
      // Effective Mental = 16 + 10 = 26 >= 22 -> 0% mistake risk!
      player.turnFlags.caffeineIntake = 10;
      player.caffeineTolerance = 0;
      context.engineDecisions = [{ type: `study_mental_mistake_${player.id}_2`, result: true }];

      const bufferedRes = gameReducer(player, { type: 'study', degreeId: 'graduate_school' }, context);
      // Caffeine completely shields the student!
      expect(bufferedRes.actionLog?.key).toBe('action.education.studied');
      expect(bufferedRes.updatedPlayer.academicStrikes?.['graduate_school']).toBeUndefined();
    });
  });
});
