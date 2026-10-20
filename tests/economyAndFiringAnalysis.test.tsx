import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { processTurnStart } from '../src/engine/turnProcessor';
import { createTestGameState, TEST_BASE_CAMPAIGN_CONFIG, TEST_ADVANCED_CAMPAIGN_CONFIG } from '../src/engine/testFactories';
import { workShift } from '../src/engine/jobEngine';
import { applyForJob } from '../src/engine/job/jobApplication';
import { calcEconomyPrice, applyMarketCrash } from '../src/engine/economyEngine';
import { Random } from '../src/utils/rng';
import type { CampaignBundle, JobDef } from '../src/engine/dataLoader';
import type { GameRules, StatRules } from '../src/engine/rules';
import type { PlayerState } from '../src/engine/gameState';
import { computeClerkResponse } from '../src/ui/buildingModal/clerkDialogue';
import { BuildingModal } from '../src/ui/BuildingModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.defaultValue) return options.defaultValue;
      if (key === 'action.job.firedDepLow') return 'Terminated! Your Dependability dropped too far below company standards.';
      if (key === 'action.job.fired') return "You have missed too much work! You're fired!";
      return key;
    }
  }),
}));

const baseCampaign: CampaignBundle = {
  buildings: [
    { id: 'factory', name: 'Factory', archetype: 'workplace', spritePath: '' },
    { id: 'apartment_complex', name: 'Apartment Complex', archetype: 'housing', spritePath: '' },
    { id: 'employment_office', name: 'Employment Office', archetype: 'employment', spritePath: '' }
  ],
  items: [],
  jobs: [
    {
      id: 'factory_engineer',
      title: 'Engineer',
      baseWage: 28,
      locationId: 'factory',
      openings: 1,
      requirements: { experience: 20, dependability: 20, degrees: ['eng_degree'], uniform: 'casual' }
    },
    {
      id: 'rent_groundskeeper',
      title: 'Groundskeeper',
      baseWage: 8,
      locationId: 'apartment_complex',
      openings: 1,
      tags: ['heavy_physical'],
      requirements: { experience: 0, dependability: 10, degrees: [], uniform: 'casual' }
    },
    {
      id: 'factory_janitor',
      title: 'Janitor',
      baseWage: 6,
      locationId: 'factory',
      openings: 1,
      tags: ['heavy_physical'],
      requirements: { experience: 0, dependability: 5, degrees: [], uniform: 'casual' }
    }
  ],
  housing: [
    { id: 'low_cost', name: 'Low Cost Housing', baseRent: 150, homeNodeId: 'node_home', capacity: 10, description: '' }
  ],
  education: [],
  map: {
    nodes: [
      { id: 'node_home', name: 'Home', buildingId: 'low_cost', x: 0, y: 0, neighbors: ['node_factory', 'node_apt'] },
      { id: 'node_factory', name: 'Factory', buildingId: 'factory', x: 10, y: 10, neighbors: ['node_home'] },
      { id: 'node_apt', name: 'Apartment', buildingId: 'apartment_complex', x: 20, y: 20, neighbors: ['node_home'] }
    ]
  },
  messages: {},
  stocks: [],
  campaignId: 'advanced',
  config: TEST_ADVANCED_CAMPAIGN_CONFIG
};

describe('Economy and Job Retention Analysis', () => {

  it('proves that a high-wage Engineer ($56/hr at +60) suffers NO pay cuts and is NOT fired when economy drops to -30', () => {
    // 1. Calculate offered wage for Engineer (baseWage 28) at economy +60
    const boomEconomy = 60;
    const boomWage = calcEconomyPrice(28, boomEconomy);
    expect(boomWage).toBe(56); // 28 + (28 * 60) / 60 = 56 (> $40/hr)

    const campaign = structuredClone(baseCampaign);
    let state = createTestGameState(
      campaign,
      [{ name: 'Player 1', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }],
      'node_home'
    );

    // Hire player as Engineer with the boom wage
    state.economicIndex = boomEconomy;
    state.players[0].experience = 50;
    state.players[0].dependability = 50;
    state.players[0].degrees = ['eng_degree'];
    state.players[0].inventory.casualClothesWeeks = 10;
    const engineerJob = campaign.jobs.find(j => j.id === 'factory_engineer')!;
    const hireResult = applyForJob(
      state.players[0],
      engineerJob,
      4,
      {},
      boomWage,
      new Random(1),
      state.rules,
      1,
      undefined,
      campaign.config.statRules,
      boomEconomy
    );

    expect(hireResult.updated.currentJobId).toBe('factory_engineer');
    expect(hireResult.updated.currentWage).toBe(56);

    state.players[0] = hireResult.updated;

    // 2. Now force the economy down to -30 over multiple turns
    state.economicIndex = -30;
    state.economicTrend = -3;
    if (state.economySimulation) {
      state.economySimulation.main.reading = 70; // 70 - 100 = -30
      state.economySimulation.goods.reading = 70;
    }

    // Process a turn start with the economy at -30
    const nextState = processTurnStart(state, campaign);
    const updatedPlayer = nextState.players[0];

    // VERIFICATION:
    // Despite the economy being at -30 (deep depression), the player:
    // 1. Keeps their high wage ($56/hour)
    expect(updatedPlayer.currentWage).toBe(56);
    // 2. Keeps their job
    expect(updatedPlayer.currentJobId).toBe('factory_engineer');
    // 3. Receives NO wage cut turn event
    expect(updatedPlayer.turnEvents.some(e => e.key === 'events.marketCrash.wageCut')).toBe(false);
    // 4. Receives NO job lost turn event
    expect(updatedPlayer.turnEvents.some(e => e.key === 'events.marketCrash.jobLost')).toBe(false);
  });

  it('proves that pay cuts and job loss from the economy ONLY occur during a Market Crash, which requires high economy (>= 80)', () => {
    const campaign = structuredClone(baseCampaign);
    const rng = new Random(42);

    // In economyEngine.ts, applyMarketCrash applies pay cuts or job loss
    const playerWithHighWage: PlayerState = {
      ...createTestGameState(campaign, [{ name: 'Player 1', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }], 'node_home').players[0],
      currentJobId: 'factory_engineer',
      currentWage: 50,
      inventory: { appliances: [], foodItems: [], fastFoodItems: [], lotteryTickets: [], stocks: { tBills: 0, holdings: {} } }
    };

    // A moderate crash gives 50% chance of wage cut (to 80%), or 50% chance of job loss
    const crashRngNoFire = new Random(1);
    vi.spyOn(crashRngNoFire, 'next').mockReturnValue(0.75); // rng >= 0.5 -> wage cut
    const cutState = applyMarketCrash(playerWithHighWage, 'moderate', crashRngNoFire, undefined, campaign.config.gameRules, campaign.config.statRules, campaign);

    expect(cutState.currentWage).toBe(40); // 50 * 0.8 = 40
    expect(cutState.turnEvents.some(e => e.key === 'events.marketCrash.wageCut')).toBe(true);

    // But Market Crash CANNOT trigger when economy is low (e.g., -30) because marketCrashThreshold is 80!
    expect(campaign.config.eventRules.marketCrashThreshold).toBe(80);
  });
});

describe('Heavy Physical Job Coasting and Firing Analysis', () => {
  const advancedRules: GameRules = {
    ...TEST_ADVANCED_CAMPAIGN_CONFIG.gameRules,
    versionClass: 'advanced',
    usePhysicalMentalConditions: true
  };
  const advancedStatRules: StatRules = TEST_ADVANCED_CAMPAIGN_CONFIG.statRules;

  const heavyJob: JobDef = {
    id: 'rent_groundskeeper',
    title: 'Groundskeeper',
    baseWage: 8,
    locationId: 'apartment_complex',
    tags: ['heavy_physical'],
    openings: 1,
    requirements: { experience: 0, dependability: 15, degrees: [], uniform: 'casual' }
  };

  it('proves that coasting (look_busy) on a heavy_physical job decrements dependability by 1 each time', () => {
    const player: PlayerState = {
      id: 'p1',
      name: 'Player',
      money: 100,
      bankSavings: 0,
      hoursRemaining: 60,
      dependability: 20,
      experience: 10,
      currentJobId: 'rent_groundskeeper',
      currentWage: 8,
      inventory: { selectedClothes: 'casual', casualClothesWeeks: 10, appliances: [], foodItems: [], fastFoodItems: [], lotteryTickets: [], stocks: { tBills: 0, holdings: {} } },
      turnFlags: {},
      physicalCondition: 50,
      mentalCondition: 50,
      social: 50
    } as any;

    // Shift 1: Coast (look_busy)
    const res1 = workShift(player, heavyJob, 6, advancedRules, advancedStatRules, 'look_busy');
    expect(res1.success).toBe(true);
    // Dependability decreased by 1 due to heavy_physical tag
    expect(res1.updated.dependability).toBe(19);

    // Shift 2: Coast again
    const res2 = workShift(res1.updated, heavyJob, 6, advancedRules, advancedStatRules, 'look_busy');
    expect(res2.success).toBe(true);
    expect(res2.updated.dependability).toBe(18);
  });

  it('proves that when dependability drops below req - fireBuffer (15 - 5 = 10), the player is fired with -7 Mental and currentWage wiped to 0', () => {
    // Requirements: dependability 15. Fire buffer: 5.
    // Firing threshold: effectiveDep <= 15 - 5 = 10.
    const playerOnVerge: PlayerState = {
      id: 'p1',
      name: 'Player',
      money: 100,
      bankSavings: 0,
      hoursRemaining: 60,
      dependability: 10, // Exactly at or below 15 - 5 = 10
      experience: 10,
      currentJobId: 'rent_groundskeeper',
      currentWage: 8,
      inventory: { selectedClothes: 'casual', casualClothesWeeks: 10, appliances: [], foodItems: [], fastFoodItems: [], lotteryTickets: [], stocks: { tBills: 0, holdings: {} } },
      turnFlags: {},
      physicalCondition: 50,
      mentalCondition: 40,
      social: 50
    } as any;

    const res = workShift(playerOnVerge, heavyJob, 6, advancedRules, advancedStatRules, 'look_busy');

    // 1. Success is false
    expect(res.success).toBe(false);
    // 2. Fired message returned
    expect(res.messages?.[0]?.key).toBe('action.job.firedDepLow');
    // 3. Job and wage wiped
    expect(res.updated.currentJobId).toBeNull();
    expect(res.updated.currentWage).toBe(0);
    // 4. Mental condition reduced by 7 (40 - 7 = 33)
    expect(res.updated.mentalCondition).toBe(33);
    // 5. Location added to firedLocationsThisTurn
    expect(res.updated.turnFlags.firedLocationsThisTurn).toContain('apartment_complex');
  });

  it('proves GUI message gap: at apartment_complex, being fired hides the speech bubble completely because isRentOfficeOpen collapses to false', () => {
    // When working as groundskeeper at apartment_complex on week 1 (rent not due):
    const turn = 1; // not week 4
    const rentPaidUntilWeek = 4; // rent not due
    const isWeek4 = turn % 4 === 0; // false
    const rentDue = rentPaidUntilWeek <= turn + 1; // false

    // Before being fired:
    const playerJobBefore = heavyJob;
    const isRentOfficeOpenBefore = isWeek4 || rentDue || false || !!playerJobBefore;
    expect(isRentOfficeOpenBefore).toBe(true);

    const building = { id: 'apartment_complex', name: 'Apartment Complex', archetype: 'housing' as const };
    const shouldShowSpeechBubbleBefore = building.archetype !== 'home' && (building.id !== 'apartment_complex' || isRentOfficeOpenBefore);
    expect(shouldShowSpeechBubbleBefore).toBe(true);

    // After being fired:
    // player.currentJobId is null, so playerJobHere is null!
    const playerJobAfter = null;
    const isRentOfficeOpenAfter = isWeek4 || rentDue || false || !!playerJobAfter;
    expect(isRentOfficeOpenAfter).toBe(false);

    // CRITICAL BUG/GAP: shouldShowSpeechBubble collapses to false!
    const shouldShowSpeechBubbleAfter = building.archetype !== 'home' && (building.id !== 'apartment_complex' || isRentOfficeOpenAfter);
    expect(shouldShowSpeechBubbleAfter).toBe(false);
    // As a result, the clerk speech bubble containing the fired message is completely SUPPRESSED and never shown to the user!
  });

  it('proves computeClerkResponse translates action.job.firedDepLow correctly if rendered', () => {
    const building = { id: 'factory', name: 'Factory', archetype: 'workplace' as const, spritePath: '' };
    const t = (key: string) => {
      if (key === 'action.job.firedDepLow') return 'Terminated! Your Dependability dropped too far below company standards.';
      return key;
    };

    const actionLog = { key: 'action.job.firedDepLow' };
    const response = computeClerkResponse({ type: 'work', jobId: 'factory_janitor' }, actionLog, building as any, t, () => '');

    expect(response).toBe('Terminated! Your Dependability dropped too far below company standards.');
  });

  it('proves that in BuildingModal, getting fired immediately vanishes the WORK console button', async () => {
    const campaign: CampaignBundle = {
      ...baseCampaign,
      jobs: [heavyJob]
    };

    // Component wrapper that simulates a game session updating player on action
    function TestWrapper() {
      const [player, setPlayer] = useState<PlayerState>({
        id: 'p1',
        name: 'Player',
        money: 100,
        bankSavings: 0,
        hoursRemaining: 60,
        dependability: 10, // will get fired
        experience: 10,
        currentJobId: 'rent_groundskeeper',
        currentWage: 8,
        inventory: { selectedClothes: 'casual', casualClothesWeeks: 10, appliances: [], foodItems: [], fastFoodItems: [], lotteryTickets: [], stocks: { tBills: 0, holdings: {} } },
        turnFlags: {},
        physicalCondition: 50,
        mentalCondition: 50,
        social: 50
      } as any);

      const handleAction = async (payload: any) => {
        if (payload.type === 'work') {
          // Player is fired:
          setPlayer(prev => ({
            ...prev,
            currentJobId: null,
            currentWage: 0,
            mentalCondition: prev.mentalCondition ? prev.mentalCondition - 7 : 43
          }));
          return { key: 'action.job.firedDepLow' };
        }
        return {};
      };

      return (
        <BuildingModal
          player={player}
          campaign={campaign}
          currentBuildingId="apartment_complex"
          turn={1}
          economicIndex={0}
          rules={{ ...advancedRules, advancedWorkGUI: true }}
          onAction={handleAction}
          onClose={vi.fn()}
        />
      );
    }

    render(<TestWrapper />);

    // Initially, WORK dock button is present
    expect(screen.getByTestId('tab-work')).toBeInTheDocument();
    expect(screen.getByTestId('btn-toggle-work')).toBeInTheDocument();

    // Click WORK to open console
    fireEvent.click(screen.getByTestId('btn-toggle-work'));

    // Work station is now open
    // Select coast mode if desired or click the execute button directly
    const executeBtn = screen.getByRole('button', { name: /Work Shift/i }) || document.querySelector(`[data-action-target="work-${heavyJob.id}"]`);
    expect(executeBtn).toBeInTheDocument();

    // Trigger the work action (which fires the player)
    fireEvent.click(executeBtn!);

    // After being fired:
    await waitFor(() => {
      // 1. The WORK dock button has DISAPPEARED from the DOM
      expect(screen.queryByTestId('tab-work')).not.toBeInTheDocument();
      expect(screen.queryByTestId('btn-toggle-work')).not.toBeInTheDocument();
      // 2. The entire Work Console popup has unmounted
      expect(screen.queryByTestId('work-console-popup')).not.toBeInTheDocument();
      // 3. At apartment_complex (outside week 4/rent due), the speech bubble is suppressed
      expect(screen.queryByText(/Terminated/i)).not.toBeInTheDocument();
    });
  });
});
