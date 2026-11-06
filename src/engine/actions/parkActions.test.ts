import { describe, it, expect } from 'vitest';
import { handleRelaxParkAction, handleWorkoutParkAction } from './parkActions';
import { createPlayerState } from '../stateFactories';
import { Random } from '../../utils/rng';
import type { ReducerContext } from './types';

describe('Park Actions', () => {
  const dummyCampaign = {
    housing: [],
    config: {
      startingMoney: 200,
      timeRules: { hoursPerTurn: 60 },
      statRules: { startingHappiness: 10, initialPhysicalMax: 100 },
      gameRules: { usePhysicalMentalConditions: true }
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
    expect(res.nextPlayer.physicalCondition).toBe(42);
    expect(res.nextPlayer.mentalCondition).toBe(42);
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

    // 1.5h spent out of 3h -> ratio = 0.5 -> 2 * 0.5 = +1 physical and +1 mental
    const res = handleRelaxParkAction(player, { type: 'relax_park' }, context);
    expect(res.nextPlayer.hoursRemaining).toBe(0);
    expect(res.nextPlayer.physicalCondition).toBe(41);
    expect(res.nextPlayer.mentalCondition).toBe(41);
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
});
