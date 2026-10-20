import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { processTurnStart } from '../src/engine/turnProcessor';
import { createTestGameState, TEST_BASE_CAMPAIGN_CONFIG, TEST_ADVANCED_CAMPAIGN_CONFIG } from '../src/engine/testFactories';
import { applyForJob } from '../src/engine/job/jobApplication';
import { calcEconomyPrice } from '../src/engine/economyEngine';
import { Random } from '../src/utils/rng';
import type { CampaignBundle, JobDef } from '../src/engine/dataLoader';
import type { PlayerState } from '../src/engine/gameState';
import { BuildingModal } from '../src/ui/BuildingModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.defaultValue) return options.defaultValue;
      if (key === 'action.job.firedDepLow') return 'Terminated! Your Dependability dropped too far below company standards.';
      if (key === 'action.job.fired') return "You have missed too much work! You're fired!";
      if (key === 'workStation.firedTitle') return 'EMPLOYMENT TERMINATED';
      return key;
    }
  }),
}));

const mockCampaign: CampaignBundle = {
  buildings: [
    { id: 'apartment_complex', name: 'Apartment Complex', archetype: 'housing', spritePath: '' },
    { id: 'factory', name: 'Factory', archetype: 'workplace', spritePath: '' }
  ],
  items: [],
  jobs: [
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
      id: 'factory_cook',
      title: 'Cook',
      baseWage: 10,
      locationId: 'factory',
      openings: 1,
      requirements: { experience: 0, dependability: 5, degrees: [], uniform: 'casual' }
    }
  ],
  housing: [
    { id: 'low_cost', name: 'Low Cost Housing', baseRent: 150, homeNodeId: 'node_home', capacity: 10, description: '' }
  ],
  education: [],
  map: {
    nodes: [
      { id: 'node_home', name: 'Home', buildingId: 'low_cost', x: 0, y: 0, neighbors: ['node_apt'] },
      { id: 'node_apt', name: 'Apartment', buildingId: 'apartment_complex', x: 10, y: 10, neighbors: ['node_home'] }
    ]
  },
  messages: {},
  stocks: [],
  campaignId: 'cdrom',
  config: {
    ...TEST_BASE_CAMPAIGN_CONFIG,
    eventRules: {
      ...TEST_BASE_CAMPAIGN_CONFIG.eventRules,
      marketCrashStartWeek: 8,
      marketCrashDivisor: 30,
      marketCrashThreshold: 80, // Authentic Sierra raw reading 80 (economicIndex = -20)
    }
  }
};

describe('Economy Bug Fixes Verification', () => {

  describe('1. Authentic Market Crash Threshold (raw reading 80 = economicIndex -20)', () => {
    it('triggers Market Crash when economicIndex is -20 (raw reading 80) and turn >= 8', () => {
      const state = createTestGameState(
        mockCampaign,
        [{ name: 'Player 1', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }],
        'node_home'
      );
      state.turn = 8;
      state.economicIndex = -20; // Exact threshold
      if (state.economySimulation) {
        state.economySimulation.main.reading = 80;
      }
      state.players[0].currentJobId = 'factory_cook';
      state.players[0].currentWage = 20;
      state.debugQueue = [
        { id: 'dbg_crash', type: 'market_crash', crashSeverity: 'moderate' }
      ];

      const nextState = processTurnStart(state, mockCampaign);

      expect(nextState.players[0].turnEvents.some(e => e.key.includes('marketCrash'))).toBe(true);
    });

    it('triggers Market Crash during a normal baseline economy (economicIndex = 0, raw reading 100)', () => {
      const state = createTestGameState(
        mockCampaign,
        [{ name: 'Player 1', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }],
        'node_home'
      );
      state.turn = 10;
      state.economicIndex = 0; // Baseline
      if (state.economySimulation) {
        state.economySimulation.main.reading = 100;
      }
      state.players[0].currentJobId = 'factory_cook';
      state.players[0].currentWage = 20;
      state.debugQueue = [
        { id: 'dbg_crash', type: 'market_crash', crashSeverity: 'moderate' }
      ];

      const nextState = processTurnStart(state, mockCampaign);

      expect(nextState.players[0].turnEvents.some(e => e.key.includes('marketCrash'))).toBe(true);
    });

    it('does NOT trigger Market Crash when economy is below threshold (economicIndex = -25, raw reading 75)', () => {
      const state = createTestGameState(
        mockCampaign,
        [{ name: 'Player 1', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }],
        'node_home'
      );
      state.turn = 10;
      state.economicIndex = -25;
      if (state.economySimulation) {
        state.economySimulation.main.reading = 75; // < 80
      }
      state.players[0].currentJobId = 'factory_cook';
      state.players[0].currentWage = 20;
      state.debugQueue = [
        { id: 'dbg_crash', type: 'market_crash', crashSeverity: 'moderate' }
      ];

      const nextState = processTurnStart(state, mockCampaign);

      expect(nextState.players[0].turnEvents.some(e => e.key.includes('marketCrash'))).toBe(false);
      expect(nextState.players[0].currentWage).toBe(20);
    });
  });

  describe('2. Job Application Wage Scaling Fallback (for AI and non-UI applications)', () => {
    it('scales wage with calcEconomyPrice when offeredWage is not provided during economic boom', () => {
      const player: PlayerState = {
        id: 'p1',
        name: 'AI Player',
        isAi: true,
        money: 100,
        bankSavings: 0,
        hoursRemaining: 50,
        dependability: 50,
        experience: 50,
        degrees: [],
        currentJobId: null,
        currentWage: 0,
        inventory: { selectedClothes: 'casual', casualClothesWeeks: 10, appliances: [], foodItems: [], fastFoodItems: [], lotteryTickets: [], stocks: { tBills: 0, holdings: {} } },
        turnFlags: {}
      } as any;

      const job: JobDef = {
        id: 'factory_cook',
        title: 'Cook',
        baseWage: 10,
        locationId: 'factory',
        openings: 1,
        requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' }
      };

      const boomEconomy = 60; // 100% price increase: 10 + (10 * 60) / 60 = 20
      const result = applyForJob(
        player,
        job,
        4,
        {},
        undefined, // AI omits offeredWage!
        new Random(1),
        {},
        1,
        undefined,
        undefined,
        boomEconomy // economicIndex passed
      );

      expect(result.success).toBe(true);
      expect(result.updated.currentWage).toBe(20); // Correctly scaled to $20/hr instead of flat $10/hr
    });

    it('scales wage with calcEconomyPrice when offeredWage is not provided during recession', () => {
      const player: PlayerState = {
        id: 'p1',
        name: 'AI Player',
        isAi: true,
        money: 100,
        bankSavings: 0,
        hoursRemaining: 50,
        dependability: 50,
        experience: 50,
        degrees: [],
        currentJobId: null,
        currentWage: 0,
        inventory: { selectedClothes: 'casual', casualClothesWeeks: 10, appliances: [], foodItems: [], fastFoodItems: [], lotteryTickets: [], stocks: { tBills: 0, holdings: {} } },
        turnFlags: {}
      } as any;

      const job: JobDef = {
        id: 'factory_cook',
        title: 'Cook',
        baseWage: 10,
        locationId: 'factory',
        openings: 1,
        requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' }
      };

      const slumpEconomy = -30; // 50% price reduction: 10 + (10 * -30) / 60 = 5
      const result = applyForJob(
        player,
        job,
        4,
        {},
        undefined,
        new Random(1),
        {},
        1,
        undefined,
        undefined,
        slumpEconomy
      );

      expect(result.success).toBe(true);
      expect(result.updated.currentWage).toBe(5); // Correctly scaled to $5/hr
    });
  });

  describe('3. Apartment Complex Speech Bubble and Advanced Firing Modal Feedback', () => {
    it('displays the clerk speech bubble at Apartment Complex when fired, even outside rent week', async () => {
      const campaign = structuredClone(mockCampaign);
      function TestHost() {
        const [player, setPlayer] = useState<PlayerState>({
          id: 'p1',
          name: 'Player',
          money: 100,
          bankSavings: 0,
          hoursRemaining: 50,
          dependability: 5,
          experience: 10,
          currentJobId: 'rent_groundskeeper',
          currentWage: 8,
          inventory: { selectedClothes: 'casual', casualClothesWeeks: 10, appliances: [], foodItems: [], fastFoodItems: [], lotteryTickets: [], stocks: { tBills: 0, holdings: {} } },
          turnFlags: {},
          rentPaidUntilWeek: 10
        } as any);

        const handleAction = async (payload: any) => {
          if (payload.type === 'work') {
            setPlayer(prev => ({
              ...prev,
              currentJobId: null,
              currentWage: 0
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
            turn={1} // Turn 1 is NOT week 4, rent not due
            economicIndex={0}
            rules={{ ...TEST_BASE_CAMPAIGN_CONFIG.gameRules, advancedWorkGUI: false }}
            onAction={handleAction}
            onClose={vi.fn()}
          />
        );
      }

      render(<TestHost />);

      // Work button is rendered on dock
      const workBtn = screen.getByTestId('dock-work-basic');
      expect(workBtn).toBeInTheDocument();

      const button = workBtn.querySelector('button')!;
      fireEvent.click(button);

      // Verify speech bubble displays the termination message
      await waitFor(() => {
        expect(screen.getByText(/Terminated/i)).toBeInTheDocument();
      });
    });

    it('displays the ActionReasonModal (EMPLOYMENT TERMINATED) in Advanced Mode when fired', async () => {
      const campaign = structuredClone(mockCampaign);
      function TestAdvancedHost() {
        const [player, setPlayer] = useState<PlayerState>({
          id: 'p1',
          name: 'Player',
          money: 100,
          bankSavings: 0,
          hoursRemaining: 50,
          dependability: 5,
          experience: 10,
          currentJobId: 'rent_groundskeeper',
          currentWage: 8,
          inventory: { selectedClothes: 'casual', casualClothesWeeks: 10, appliances: [], foodItems: [], fastFoodItems: [], lotteryTickets: [], stocks: { tBills: 0, holdings: {} } },
          turnFlags: {},
          rentPaidUntilWeek: 10,
          physicalCondition: 50,
          mentalCondition: 50,
          social: 50
        } as any);

        const handleAction = async (payload: any) => {
          if (payload.type === 'work') {
            setPlayer(prev => ({
              ...prev,
              currentJobId: null,
              currentWage: 0,
              mentalCondition: 43
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
            rules={{ ...TEST_ADVANCED_CAMPAIGN_CONFIG.gameRules, advancedWorkGUI: true }}
            onAction={handleAction}
            onClose={vi.fn()}
          />
        );
      }

      render(<TestAdvancedHost />);

      // Open WorkStation in Advanced mode
      const toggleBtn = screen.getByTestId('btn-toggle-work');
      fireEvent.click(toggleBtn);

      const executeBtn = screen.getByRole('button', { name: /Work Shift/i });
      fireEvent.click(executeBtn);

      // Verify ActionReasonModal displays with EMPLOYMENT TERMINATED title
      await waitFor(() => {
        expect(screen.getByTestId('action-reason-modal')).toBeInTheDocument();
        expect(screen.getByText(/EMPLOYMENT TERMINATED/i)).toBeInTheDocument();
        expect(screen.getByText(/Terminated! Your Dependability dropped too far below company standards/i)).toBeInTheDocument();
      });

      // Click OK to dismiss
      const okBtn = screen.getByRole('button', { name: /OK/i });
      fireEvent.click(okBtn);

      await waitFor(() => {
        expect(screen.queryByTestId('action-reason-modal')).not.toBeInTheDocument();
      });
    });
  });
});
