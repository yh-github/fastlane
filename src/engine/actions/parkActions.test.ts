import { describe, it, expect } from 'vitest';
import {
  handleRelaxParkAction,
  handleWorkoutParkAction,
  handlePlayArcadeAction,
  applyParkCardEffects,
  ARCADE_ENCOUNTER_CARDS,
  ARCADE_GLITCH_CARD,
} from './parkActions';
import { createPlayerState } from '../stateFactories';
import { TEST_ADVANCED_CAMPAIGN_CONFIG } from '../testFactories';
import { recalculatePlayerEffects } from '../gameState';
import { gameReducer } from '../gameReducer';
import { Random } from '../../utils/rng';
import type { ReducerContext } from './types';

describe('Park Actions', () => {
  const dummyCampaign = {
    housing: [],
    config: {
      ...TEST_ADVANCED_CAMPAIGN_CONFIG,
      startingMoney: 200,
      timeRules: { ...TEST_ADVANCED_CAMPAIGN_CONFIG.timeRules, hoursPerTurn: 60 },
      statRules: {
        ...TEST_ADVANCED_CAMPAIGN_CONFIG.statRules,
        startingHappiness: 10,
        initialPhysicalMax: 65,
        globalMaxPhysicalCondition: 100,
        globalMaxMentalCondition: 100,
      },
      gameRules: { ...TEST_ADVANCED_CAMPAIGN_CONFIG.gameRules, usePhysicalMentalConditions: true }
    },
    items: [],
    jobs: [],
    buildings: []
  } as any;

  it('rejects park relax when player does not have enough time and allowPartialHours is false', () => {
    let player = createPlayerState('p1', 'Player 1', false, { wealth: 50, happiness: 50, education: 50, career: 50 }, 'node_1', dummyCampaign.config);
    player.hoursRemaining = 2;

    const context: ReducerContext = {
      campaign: dummyCampaign,
      rules: { usePhysicalMentalConditions: true, allowPartialHours: false, proportionalDivisibleActions: false } as any,
      turn: 1,
      economicIndex: 0,
      rng: new Random(1),
      state: {} as any
    };

    const res = handleRelaxParkAction(player, { type: 'relax_park' }, context);
    expect(res.actionLog).toEqual({ key: 'action.error.notEnoughTime' });
    expect(res.nextPlayer.hoursRemaining).toBe(2);
  });

  it('allows full 3h park relax when player has enough hours', () => {
    let player = createPlayerState('p1', 'Player 1', false, { wealth: 50, happiness: 50, education: 50, career: 50 }, 'node_1', dummyCampaign.config);
    player.hoursRemaining = 10;
    player.physicalCondition = 40;
    player.mentalCondition = 40;

    const context: ReducerContext = {
      campaign: dummyCampaign,
      rules: { usePhysicalMentalConditions: true, enableParkSystem: false } as any,
      turn: 1,
      economicIndex: 0,
      rng: new Random(1),
      state: {} as any
    };

    const res = handleRelaxParkAction(player, { type: 'relax_park' }, context);
    expect(res.nextPlayer.hoursRemaining).toBe(7);
    expect(res.nextPlayer.physicalCondition).toBe(43);
    expect(res.nextPlayer.mentalCondition).toBe(43);
  });

  it('allows partial park relax and scales gains proportionally with proportionalDivisibleActions', () => {
    let player = createPlayerState('p1', 'Player 1', false, { wealth: 50, happiness: 50, education: 50, career: 50 }, 'node_1', dummyCampaign.config);
    player.hoursRemaining = 1.5;
    player.physicalCondition = 40;
    player.mentalCondition = 40;

    const context: ReducerContext = {
      campaign: dummyCampaign,
      rules: {
        usePhysicalMentalConditions: true,
        allowPartialHours: true,
        proportionalDivisibleActions: true,
        conditionResolution: 0.5,
        enableParkSystem: false
      } as any,
      turn: 1,
      economicIndex: 0,
      rng: new Random(1),
      state: {} as any
    };

    // 1.5h spent out of 3h -> ratio = 0.5 -> 3 * 0.5 = +1.5 physical and +1.5 mental
    const res = handleRelaxParkAction(player, { type: 'relax_park' }, context);
    expect(res.nextPlayer.hoursRemaining).toBe(0);
    expect(res.nextPlayer.physicalCondition).toBe(41.5);
    expect(res.nextPlayer.mentalCondition).toBe(41.5);
  });

  it('rejects workout when physically exhausted (< 15 physical)', () => {
    let player = createPlayerState('p1', 'Player 1', false, { wealth: 50, happiness: 50, education: 50, career: 50 }, 'node_1', dummyCampaign.config);
    player.hoursRemaining = 10;
    player.physicalCondition = 12;

    const context: ReducerContext = {
      campaign: dummyCampaign,
      rules: { usePhysicalMentalConditions: true } as any,
      turn: 1,
      economicIndex: 0,
      rng: new Random(1),
      state: {} as any
    };

    const res = handleWorkoutParkAction(player, { type: 'workout_park' }, context);
    expect(res.actionLog).toEqual({ key: 'action.error.tooPhysicallyExhausted' });
  });

  it('allows partial workout and scales costs and max conditioning gains proportionally', () => {
    let player = createPlayerState('p1', 'Player 1', false, { wealth: 50, happiness: 50, education: 50, career: 50 }, 'node_1', dummyCampaign.config);
    player.hoursRemaining = 1.5;
    player.physicalCondition = 50;
    player.physicalConditionMax = 60;
    player.mentalCondition = 50;

    const context: ReducerContext = {
      campaign: dummyCampaign,
      rules: {
        usePhysicalMentalConditions: true,
        allowPartialHours: true,
        proportionalDivisibleActions: true,
        conditionResolution: 0.5,
        enableParkSystem: false
      } as any,
      turn: 1,
      economicIndex: 0,
      rng: new Random(1),
      state: {} as any
    };

    const res = handleWorkoutParkAction(player, { type: 'workout_park' }, context);
    expect(res.nextPlayer.hoursRemaining).toBe(0);
    // ratio = 1.5 / 3 = 0.5
    // maxPhysical +0.5, physical -0.5, mental +0.5
    expect(res.nextPlayer.physicalConditionMax).toBe(60.5);
    expect(res.nextPlayer.physicalCondition).toBe(49.5);
    expect(res.nextPlayer.mentalCondition).toBe(50.5);
  });

  it('workout_park raises physicalConditionMax past initialPhysicalMax (65) and clamps at globalMaxPhysicalCondition (100)', () => {
    const player = createPlayerState('p1', 'Player 1', false, { wealth: 50, happiness: 50, education: 50, career: 50 }, 'node_1', dummyCampaign.config);
    player.hoursRemaining = 10;
    player.physicalCondition = 50;
    player.physicalConditionMax = 65; // At initialPhysicalMax, below globalMaxPhysicalCondition (100)
    player.mentalCondition = 50;

    const context: ReducerContext = {
      campaign: dummyCampaign,
      rules: {
        ...TEST_ADVANCED_CAMPAIGN_CONFIG.gameRules,
        usePhysicalMentalConditions: true,
        enableParkSystem: false
      },
      turn: 1,
      economicIndex: 0,
      rng: new Random(1),
      state: {} as any
    };

    const res = handleWorkoutParkAction(player, { type: 'workout_park' }, context);
    expect(res.nextPlayer.physicalConditionMax).toBe(66);

    // At globalMaxPhysicalCondition (100), does not exceed 100
    const maxedPlayer = { ...player, physicalConditionMax: 100 };
    const maxedRes = handleWorkoutParkAction(maxedPlayer, { type: 'workout_park' }, context);
    expect(maxedRes.nextPlayer.physicalConditionMax).toBe(100);
  });

  it('applyParkCardEffects respects globalMaxPhysicalCondition/globalMaxMentalCondition and persists park_chess via resilienceBonus', () => {
    const player = createPlayerState('p1', 'Player 1', false, { wealth: 50, happiness: 50, education: 50, career: 50 }, 'node_1', dummyCampaign.config);
    player.physicalConditionMax = 99.5;
    player.mentalConditionMax = 99.5;

    const customCampaign = {
      ...dummyCampaign,
      config: {
        ...dummyCampaign.config,
        statRules: {
          ...dummyCampaign.config.statRules,
          globalMaxPhysicalCondition: 100,
          globalMaxMentalCondition: 100,
          mentalMaxBaseValue: 99,
        }
      }
    };

    const context: ReducerContext = {
      campaign: customCampaign,
      rules: { ...TEST_ADVANCED_CAMPAIGN_CONFIG.gameRules, usePhysicalMentalConditions: true, trackSocial: true, trackMess: false },
      turn: 1,
      economicIndex: 0,
      rng: new Random(1),
      state: {} as any
    };

    const res = applyParkCardEffects(player, {
      type: 'park_encounter',
      cardId: 'park_chess',
      title: 'Park Chess Match',
      description: '',
      maxPhysAmount: 1,
      maxMentalAmount: 1,
    }, context);

    expect(res.nextPlayer.physicalConditionMax).toBe(100);
    expect(res.nextPlayer.mentalConditionMax).toBe(100);
    expect(res.nextPlayer.resilienceBonus).toBe(0.5);

    // Verify park_chess gain persists across recalculatePlayerEffects / gameReducer
    const playerForChess = createPlayerState('p2', 'Player 2', false, { wealth: 50, happiness: 50, education: 50, career: 50 }, 'node_1', customCampaign.config);
    playerForChess.mess = 0;
    playerForChess.social = 0;
    const beforeRecalc = recalculatePlayerEffects(playerForChess, customCampaign);
    const baseMaxMental = beforeRecalc.mentalConditionMax!;
    beforeRecalc.pendingMiniGame = {
      title: 'Park',
      options: [{
        type: 'park_encounter',
        cardId: 'park_chess',
        title: 'Park Chess Match',
        description: '',
        maxMentalAmount: 1,
        mentalAmount: 1,
      }]
    };
    const resolved = gameReducer(beforeRecalc, { type: 'resolve_mini_game', choiceIndex: 0 }, context);
    expect(resolved.updatedPlayer.mentalConditionMax).toBe(baseMaxMental + 1);
  });

  describe('Arcade Actions', () => {
    it('draws 2 arcade encounter cards (80% branch) on 1st play, records decisions, and applies techSkillAmount clamped by calcMaxSkillCap', () => {
      const player = createPlayerState('p1', 'Player 1', false, { wealth: 50, happiness: 50, education: 50, career: 50 }, 'node_1', dummyCampaign.config);
      player.hoursRemaining = 10;
      player.money = 50;
      player.physicalCondition = 40;
      player.physicalConditionMax = 65;
      player.mentalCondition = 40;
      player.mentalConditionMax = 65;
      player.social = 10;
      player.skillTech = 1;

      const context: ReducerContext = {
        campaign: dummyCampaign,
        rules: {
          ...TEST_ADVANCED_CAMPAIGN_CONFIG.gameRules,
          usePhysicalMentalConditions: true,
          trackSocial: true,
          enableArcade: true,
        },
        turn: 1,
        economicIndex: 0,
        rng: new Random(1),
        state: { turn: 1, players: [player] } as any,
        engineDecisions: [
          { type: 'arcade_glitch_p1_1', result: false },
          { type: 'arcade_draw_p1_1_shuffle_5', result: 0.99 },
          { type: 'arcade_draw_p1_1_shuffle_4', result: 0.99 },
          { type: 'arcade_draw_p1_1_shuffle_3', result: 0.99 },
          { type: 'arcade_draw_p1_1_shuffle_2', result: 0 },
          { type: 'arcade_draw_p1_1_shuffle_1', result: 0.99 },
        ],
      };

      const res = gameReducer(player, { type: 'play_arcade' }, context);
      expect(res.updatedPlayer.hoursRemaining).toBe(8);
      expect(res.updatedPlayer.money).toBe(42);
      expect(res.updatedPlayer.mentalCondition).toBe(42);
      expect(res.updatedPlayer.social).toBe(11);
      expect(res.updatedPlayer.pendingMiniGame?.options).toHaveLength(2);
      expect(res.updatedPlayer.pendingMiniGame?.options[0].cardId).toBe('arcade_pcb_tinker');
      expect(res.updatedPlayer.pendingMiniGame?.options[0].techSkillAmount).toBe(0.1);
      expect(res.outEngineDecisions?.some(d => d.type === 'arcade_glitch_p1_1' && d.result === false)).toBe(true);

      const resolved = gameReducer(res.updatedPlayer, { type: 'resolve_mini_game', choiceIndex: 0 }, context);
      expect(resolved.updatedPlayer.pendingMiniGame).toBeNull();
      expect(resolved.updatedPlayer.skillTech).toBe(1.1);
      expect(resolved.updatedPlayer.mentalCondition).toBe(43);
      const resolvedLog = Array.isArray(resolved.actionLog) ? resolved.actionLog[0] : resolved.actionLog;
      expect(resolvedLog?.key).toBe('action.arcade.cardResolved');

      // Also verify calcMaxSkillCap prevents exceeding cap without degrees (capped at 5)
      const cappedRes = applyParkCardEffects({ ...player, skillTech: 5 }, res.updatedPlayer.pendingMiniGame!.options[0], context);
      expect(cappedRes.nextPlayer.skillTech).toBe(5);

      // Live recording test (no pre-seeded engineDecisions)
      const liveOut: { type: string; result: any }[] = [];
      handlePlayArcadeAction(player, { type: 'play_arcade' }, { ...context, engineDecisions: undefined }, { outDecisions: liveOut });
      expect(liveOut.some(d => d.type === 'arcade_glitch_p1_1')).toBe(true);
    });

    it('triggers mild arcade glitch (20% branch) leaving Play 1 net-positive with zero max-stat loss', () => {
      const player = createPlayerState('p1', 'Player 1', false, { wealth: 50, happiness: 50, education: 50, career: 50 }, 'node_1', dummyCampaign.config);
      player.hoursRemaining = 10;
      player.money = 50;
      player.physicalCondition = 40;
      player.physicalConditionMax = 65;
      player.mentalCondition = 40;
      player.mentalConditionMax = 65;
      player.social = 10;

      const context: ReducerContext = {
        campaign: dummyCampaign,
        rules: {
          ...TEST_ADVANCED_CAMPAIGN_CONFIG.gameRules,
          usePhysicalMentalConditions: true,
          trackSocial: true,
          enableArcade: true,
        },
        turn: 1,
        economicIndex: 0,
        rng: new Random(1),
        state: { turn: 1, players: [player] } as any,
        engineDecisions: [{ type: 'arcade_glitch_p1_1', result: true }],
      };

      // AI resolves glitch immediately without pendingMiniGame; Human prompts modal and applies on resolve_mini_game
      const res = gameReducer(player, { type: 'play_arcade' }, context);
      expect(res.updatedPlayer.pendingMiniGame?.gameType).toBe('arcade_encounter');
      expect(res.updatedPlayer.pendingMiniGame?.options).toHaveLength(1);
      expect(res.updatedPlayer.pendingMiniGame?.options[0].cardId).toBe(ARCADE_GLITCH_CARD.cardId);

      const maxPhysBeforeResolve = res.updatedPlayer.physicalConditionMax;
      const maxMentalBeforeResolve = res.updatedPlayer.mentalConditionMax;
      const resolved = gameReducer(res.updatedPlayer, { type: 'resolve_mini_game', choiceIndex: 0 }, context);
      expect(resolved.updatedPlayer.pendingMiniGame).toBeNull();
      expect(resolved.updatedPlayer.money).toBe(40); // -$8 base - $2 glitch
      expect(resolved.updatedPlayer.mentalCondition).toBe(41.5); // +2 base - 0.5 glitch
      expect(resolved.updatedPlayer.social).toBe(11);
      expect(resolved.updatedPlayer.mentalConditionMax).toBe(maxMentalBeforeResolve);
      expect(resolved.updatedPlayer.physicalConditionMax).toBe(maxPhysBeforeResolve);
      const glitchLog = Array.isArray(resolved.actionLog) ? resolved.actionLog[0] : resolved.actionLog;
      expect(glitchLog?.key).toBe('action.arcade.glitch');
    });

    it('supports proportional partial hours and AI auto-picking without leaving pendingMiniGame', () => {
      const player = createPlayerState('ai1', 'Bot', true, { wealth: 50, happiness: 50, education: 50, career: 50 }, 'node_1', dummyCampaign.config);
      player.hoursRemaining = 1; // half of 2h
      player.money = 50;
      player.physicalCondition = 40;
      player.mentalCondition = 40;
      player.social = 10;

      const context: ReducerContext = {
        campaign: dummyCampaign,
        rules: {
          ...TEST_ADVANCED_CAMPAIGN_CONFIG.gameRules,
          usePhysicalMentalConditions: true,
          trackSocial: true,
          enableArcade: true,
          allowPartialHours: true,
          proportionalDivisibleActions: true,
          conditionResolution: 0.5,
        },
        turn: 1,
        economicIndex: 0,
        rng: new Random(1),
        state: { turn: 1, players: [player] } as any,
        engineDecisions: [
          { type: 'arcade_glitch_ai1_1', result: false },
          { type: 'arcade_draw_ai1_1_shuffle_5', result: 0.99 },
          { type: 'arcade_draw_ai1_1_shuffle_4', result: 0.99 },
          { type: 'arcade_draw_ai1_1_shuffle_3', result: 0.99 },
          { type: 'arcade_draw_ai1_1_shuffle_2', result: 0.99 },
          { type: 'arcade_draw_ai1_1_shuffle_1', result: 0.99 },
        ],
      };

      const res = gameReducer(player, { type: 'play_arcade' }, context);
      expect(res.updatedPlayer.hoursRemaining).toBe(0);
      expect(res.updatedPlayer.pendingMiniGame).toBeUndefined();
      expect(res.updatedPlayer.turnFlags.arcadePlaysThisTurn).toBe(1);
      // Verify ARCADE_ENCOUNTER_CARDS exists & scaled card applied positive bonuses cleanly
      expect(ARCADE_ENCOUNTER_CARDS.length).toBeGreaterThanOrEqual(2);
      expect(res.updatedPlayer.mentalCondition).toBeGreaterThan(40.5);
    });
  });
});
