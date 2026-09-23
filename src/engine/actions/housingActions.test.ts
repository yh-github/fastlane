import { describe, it, expect } from 'vitest';
import { handleRenegotiateRentAction } from './housingActions';
import { calcLandlordStanding } from '../statMath';
import { createPlayerState } from '../stateFactories';
import { Random } from '../../utils/rng';
import type { ReducerContext } from './types';

describe('Housing Actions & Rent Renegotiation', () => {
  const dummyCampaign = {
    housing: [
      { id: 'low_cost', name: 'Low-Cost Housing', baseRent: 300, isRobberyImmune: false, homeNodeId: 'node_1', description: '' }
    ],
    config: {
      startingMoney: 200,
      timeRules: { hoursPerTurn: 60 },
      statRules: { startingHappiness: 10 },
      gameRules: { usePhysicalMentalConditions: true, trackMess: true }
    },
    items: [],
    jobs: [],
    buildings: []
  } as any;

  it('calculates Landlord Standing score with penalties and bonuses', () => {
    let player = createPlayerState('p1', 'Player 1', false, { wealth: 50, happiness: 50, education: 50, career: 50 }, 'node_1', dummyCampaign.config);
    // Baseline: 50, start mess is 3 (clean bonus +10) -> 60
    const standingInitial = calcLandlordStanding(player, { usePhysicalMentalConditions: true, trackMess: true } as any);
    expect(standingInitial.standing).toBe(60);

    // Extensions penalty
    player.rentExtensionsReceived = 2; // -10
    const standingWithExtensions = calcLandlordStanding(player, { usePhysicalMentalConditions: true, trackMess: true } as any);
    expect(standingWithExtensions.standing).toBe(50);

    // Mess penalty
    player.mess = 10; // no clean bonus (+0), -15 mess penalty
    const standingMess = calcLandlordStanding(player, { usePhysicalMentalConditions: true, trackMess: true } as any);
    expect(standingMess.standing).toBe(25); // 50 - 10 - 15 = 25

    // Debt penalty
    player.rentDebt = 100; // -25
    const standingDebt = calcLandlordStanding(player, { usePhysicalMentalConditions: true, trackMess: true } as any);
    expect(standingDebt.standing).toBe(0); // clamped at 0
  });

  it('approves full rent reduction to market rent when standing >= 50', () => {
    let player = createPlayerState('p1', 'Player 1', false, { wealth: 50, happiness: 50, education: 50, career: 50 }, 'node_1', dummyCampaign.config);
    player.currentRentPrice = 300;
    player.mess = 2; // clean bonus -> standing 60

    // Economic index is negative -> market rent drops to e.g. 240
    const context: ReducerContext = {
      campaign: dummyCampaign,
      rules: { usePhysicalMentalConditions: true, trackMess: true } as any,
      turn: 4,
      economicIndex: -20,
      rng: new Random(1),
      state: {} as any
    };

    const res = handleRenegotiateRentAction(player, { type: 'renegotiate_rent' }, context);
    expect(res.nextPlayer.currentRentPrice).toBeLessThan(300);
    expect(res.actionLog).toMatchObject({
      key: 'action.rent.renegotiateApproved'
    });
  });

  it('offers partial compromise when 35 <= standing < 50', () => {
    let player = createPlayerState('p1', 'Player 1', false, { wealth: 50, happiness: 50, education: 50, career: 50 }, 'node_1', dummyCampaign.config);
    player.currentRentPrice = 300;
    player.mess = 6; // mess penalty: -9, baseline 50 -> standing 41

    const context: ReducerContext = {
      campaign: dummyCampaign,
      rules: { usePhysicalMentalConditions: true, trackMess: true } as any,
      turn: 4,
      economicIndex: -20,
      rng: new Random(1),
      state: {} as any
    };

    const res = handleRenegotiateRentAction(player, { type: 'renegotiate_rent' }, context);
    expect(res.nextPlayer.currentRentPrice).toBeLessThan(300);
    expect(res.actionLog).toMatchObject({
      key: 'action.rent.renegotiateCompromise'
    });
  });

  it('denies rent reduction when standing < 35', () => {
    let player = createPlayerState('p1', 'Player 1', false, { wealth: 50, happiness: 50, education: 50, career: 50 }, 'node_1', dummyCampaign.config);
    player.currentRentPrice = 300;
    player.rentExtensionsReceived = 4; // -20
    player.mess = 10; // -15 -> standing 15

    const context: ReducerContext = {
      campaign: dummyCampaign,
      rules: { usePhysicalMentalConditions: true, trackMess: true } as any,
      turn: 4,
      economicIndex: -20,
      rng: new Random(1),
      state: {} as any
    };

    const res = handleRenegotiateRentAction(player, { type: 'renegotiate_rent' }, context);
    expect(res.nextPlayer.currentRentPrice).toBe(300); // Unchanged
    expect(res.actionLog).toMatchObject({
      key: 'action.rent.renegotiateDenied'
    });
  });
});
