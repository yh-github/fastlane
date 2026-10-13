import { describe, it, expect } from 'vitest';
import { handleResolveAppraisalDilemmaAction, handleWorkAction } from './jobActions';
import { createPlayerState } from '../stateFactories';
import { Random } from '../../utils/rng';
import type { ReducerContext } from './types';
import type { MiniGameState } from '../gameState';

describe('Job Actions & Initiative Card Resolution', () => {
  const dummyJob = {
    id: 'tech_lead',
    title: 'Lead Software Engineer',
    locationId: 'socket_city',
    baseWage: 20,
    requirements: { experience: 40, dependability: 40, degrees: ['engineering'] },
    tags: ['technical', 'middle_management'],
    perks: []
  };

  const dummyCampaign = {
    jobs: [dummyJob],
    config: {
      startingMoney: 200,
      timeRules: { hoursPerTurn: 60, workSessionCost: 6 },
      statRules: {
        workPhysicalCost: 1,
        workNormalMentalCost: 1,
        initialPhysicalMax: 50,
        initialMentalMax: 50,
        globalMaxMentalCondition: 99
      },
      gameRules: { usePhysicalMentalConditions: true, useSkills: true }
    },
    education: [],
    messages: {}
  } as any;

  const mockContext: ReducerContext = {
    campaign: dummyCampaign,
    rules: { usePhysicalMentalConditions: true, useSkills: true } as any,
    turn: 1,
    economicIndex: 0,
    rng: new Random(42),
    state: {} as any
  };

  const mockReplay = {} as any;

  it('resolves ethics & aesthetics initiative card restoring mental condition and logging result', () => {
    let player = createPlayerState('p1', 'Player 1', false, { wealth: 50, happiness: 50, education: 50, career: 50 }, 'node_1', dummyCampaign.config);
    player.currentJobId = 'tech_lead';
    player.currentWage = 20;
    player.mentalCondition = 15;
    player.social = 10;
    player.dependability = 30;

    const pendingMiniGame: MiniGameState = {
      gameType: 'work_initiative',
      locationId: 'socket_city',
      itemTitle: 'Lead Software Engineer',
      options: [
        {
          type: 'initiative',
          badge: 'ETHICS',
          icon: '🧘',
          title: 'Code Quality & Refactoring Pride',
          description: 'Take quiet pride in robust software craft, eliminating technical debt.',
          mentalAmount: 2.5,
          socialAmount: 1,
          depAmount: 1.0,
          standingAmount: 1
        },
        {
          type: 'initiative',
          badge: 'LEADERSHIP',
          icon: '👔',
          title: 'Floor Rush Coordination',
          description: 'Lead the team.',
          leadershipSkillAmount: 0.25
        }
      ]
    };
    player.pendingMiniGame = pendingMiniGame;

    const { nextPlayer, actionLog } = handleResolveAppraisalDilemmaAction(
      player,
      { type: 'resolve_appraisal_dilemma', choiceIndex: 0 },
      mockContext
    );

    // Mental condition restored
    expect(nextPlayer.mentalCondition).toBe(17.5);
    // Social bumped
    expect(nextPlayer.social).toBe(11);
    // Dep bumped
    expect(nextPlayer.dependability).toBe(31);
    // Standing incremented for location
    expect(nextPlayer.initiativesByLocation?.['socket_city']).toBe(1);
    // Pending mini game cleared
    expect(nextPlayer.pendingMiniGame).toBeNull();
    // Action log populated
    expect((actionLog as any)?.key).toBe('action.job.initiativeChoiceResolved');
    expect((actionLog as any)?.params?.title).toBe('Code Quality & Refactoring Pride');
    expect((actionLog as any)?.params?.badge).toBe('ETHICS');
  });

  it('resolves strategic crunch card applying costs and leadership growth', () => {
    let player = createPlayerState('p1', 'Player 1', false, { wealth: 50, happiness: 50, education: 50, career: 50 }, 'node_1', dummyCampaign.config);
    player.currentJobId = 'tech_lead';
    player.currentWage = 20;
    player.money = 100;
    player.mentalCondition = 40;
    player.social = 25;
    player.skillMgmt = 1.0;

    const pendingMiniGame: MiniGameState = {
      gameType: 'work_initiative',
      locationId: 'socket_city',
      itemTitle: 'Lead Software Engineer',
      options: [
        {
          type: 'initiative',
          badge: 'STRATEGIC CRUNCH',
          icon: '⚡',
          title: 'High-Stakes Architecture Overhaul',
          description: 'Push a massive refactor overnight.',
          leadershipSkillAmount: 0.80,
          depAmount: 2.0,
          standingAmount: 2,
          mentalAmount: -2.5,
          socialAmount: -1.5,
          cashCost: 20,
          burnoutRisk: true
        }
      ]
    };
    player.pendingMiniGame = pendingMiniGame;

    const { nextPlayer, actionLog } = handleResolveAppraisalDilemmaAction(
      player,
      { type: 'resolve_appraisal_dilemma', choiceIndex: 0 },
      mockContext
    );

    // Deducts mental and social
    expect(nextPlayer.mentalCondition).toBe(37.5);
    expect(nextPlayer.social).toBe(23.5);
    // Deducts out-of-pocket cash
    expect(nextPlayer.money).toBe(80);
    // Grants leadership skill and updates alias
    expect(nextPlayer.skillMgmt).toBe(1.8);
    expect(nextPlayer.skillLeadership).toBe(1.8);
    // Grants location standing
    expect(nextPlayer.initiativesByLocation?.['socket_city']).toBe(2);
    // Clears mini game
    expect(nextPlayer.pendingMiniGame).toBeNull();
    expect((actionLog as any)?.params?.title).toBe('High-Stakes Architecture Overhaul');
  });

  it('resolves technical DIY card granting tech skill and cash bounty', () => {
    let player = createPlayerState('p1', 'Player 1', false, { wealth: 50, happiness: 50, education: 50, career: 50 }, 'node_1', dummyCampaign.config);
    player.currentJobId = 'tech_lead';
    player.currentWage = 20;
    player.money = 50;
    player.skillTech = 2.0;

    const pendingMiniGame: MiniGameState = {
      gameType: 'work_initiative',
      locationId: 'socket_city',
      itemTitle: 'Lead Software Engineer',
      options: [
        {
          type: 'initiative',
          badge: 'TECHNICAL',
          icon: '🔧',
          title: 'Diagnostics & System Repair',
          description: 'Repair core infrastructure.',
          techSkillAmount: 0.35,
          cashAmount: 35,
          depAmount: 1.0,
          standingAmount: 1
        }
      ]
    };
    player.pendingMiniGame = pendingMiniGame;

    const { nextPlayer } = handleResolveAppraisalDilemmaAction(
      player,
      { type: 'resolve_appraisal_dilemma', choiceIndex: 0 },
      mockContext
    );

    expect(nextPlayer.money).toBe(85);
    expect(nextPlayer.skillTech).toBe(2.35);
    expect(nextPlayer.pendingMiniGame).toBeNull();
  });

  it('executing show_initiative via handleWorkAction spawns pendingMiniGame for human player', () => {
    let player = createPlayerState('p1', 'Player 1', false, { wealth: 50, happiness: 50, education: 50, career: 50 }, 'node_1', dummyCampaign.config);
    player.currentJobId = 'tech_lead';
    player.currentWage = 20;
    player.experience = 60;
    player.dependability = 40;
    player.hoursRemaining = 12;
    player.mistakesByLocation = { socket_city: 1 };

    const { nextPlayer } = handleWorkAction(
      player,
      { type: 'work', jobId: 'tech_lead', mode: 'show_initiative' },
      mockContext,
      mockReplay
    );

    // Paid 0.4x wage: Math.floor(20 * 8 * 0.4) = 64
    expect(nextPlayer.money).toBe(200 + 64);
    // Erases 1 location mistake
    expect(nextPlayer.mistakesByLocation?.['socket_city']).toBe(0);
    // Increments location initiatives
    expect(nextPlayer.initiativesByLocation?.['socket_city']).toBe(1);
    // Spawns pendingMiniGame for user choice
    expect(nextPlayer.pendingMiniGame).toBeDefined();
    expect(nextPlayer.pendingMiniGame?.gameType).toBe('work_initiative');
    expect(nextPlayer.pendingMiniGame?.options.length).toBe(2);
  });
});
