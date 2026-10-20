import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { processTurnStart } from '../src/engine/turnProcessor';
import { createTestGameState, TEST_BASE_CAMPAIGN_CONFIG, TEST_ADVANCED_CAMPAIGN_CONFIG } from '../src/engine/testFactories';
import { applyForJob } from '../src/engine/job/jobApplication';
import {
  calcEconomyPrice,
  calcItemPrice,
  applyMarketCrash,
  applyEconomicBoom,
  calcPlayerStockHoldingsValue
} from '../src/engine/economyEngine';
import { processEconomicTurnPhase } from '../src/engine/turn/economicTurnPhase';
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
        state.economySimulation.goods.reading = 80;
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
        state.economySimulation.goods.reading = 100;
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
        state.economySimulation.goods.reading = 75;
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

  describe('4. Long-Run Economy Stability & Sector Decoupling', () => {
    it('proves that main and goods sectors decouple and fluctuate independently without runaway feedback', () => {
      let state = createTestGameState(
        mockCampaign,
        [{ name: 'Player 1', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }],
        'node_home'
      );
      state.turn = 1;
      const rng = new Random(12345);

      const gaps: number[] = [];
      for (let t = 1; t <= 30; t++) {
        state.turn = t;
        const res = processEconomicTurnPhase(state, mockCampaign, rng);
        state = {
          ...state,
          economicIndex: res.newEconomy,
          economicTrend: res.newTrend,
          economySimulation: res.newEconomySimulation,
        };
        if (res.newEconomySimulation) {
          gaps.push(Math.abs(res.newEconomySimulation.main.reading - res.newEconomySimulation.goods.reading));
        }
      }

      // Over 30 turns, main and goods should decouple (not identical every turn)
      const nonZeroGaps = gaps.filter(g => g > 0);
      expect(nonZeroGaps.length).toBeGreaterThan(15);
      // And the max gap should remain bounded (< 50) rather than exponentially exploding
      const maxGap = Math.max(...gaps);
      expect(maxGap).toBeLessThan(50);
    });

    it('proves statistical stability over 200 simulated games: median is near 0 and p90 does not explode', () => {
      const idxHistory: number[] = [];
      const N = 200;

      for (let g = 0; g < N; g++) {
        let state = createTestGameState(
          mockCampaign,
          [{ name: 'P1', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }],
          'node_home'
        );
        const rng = new Random(9999 + g);

        for (let t = 1; t <= 40; t++) {
          state.turn = t;
          const res = processEconomicTurnPhase(state, mockCampaign, rng);
          state = {
            ...state,
            economicIndex: res.newEconomy,
            economicTrend: res.newTrend,
            economySimulation: res.newEconomySimulation,
          };
          idxHistory.push(res.newEconomy);
        }
      }

      idxHistory.sort((a, b) => a - b);
      const median = idxHistory[Math.floor(idxHistory.length * 0.5)];
      const p90 = idxHistory[Math.floor(idxHistory.length * 0.9)];

      // Median should stay close to baseline 0 (-15 to +10)
      expect(median).toBeGreaterThanOrEqual(-15);
      expect(median).toBeLessThanOrEqual(10);

      // 90th percentile should NOT explode to +85 (stays below +45 in authentic Sierra)
      expect(p90).toBeLessThanOrEqual(45);
    });
  });

  describe('5. Authentic Price and Wage Floors (Script 109)', () => {
    it('floors prices at 50% of basePrice and minimum 1 dollar even in extreme -90 Floppy depressions', () => {
      // Base price $100: at -90, previously returned -50 (negative!). With authentic floor, returns 50.
      expect(calcEconomyPrice(100, -90)).toBe(50);
      expect(calcItemPrice({ basePrice: 100 }, -90)).toBe(50);

      // Base price $10: at -90, returns $5 (50% floor)
      expect(calcEconomyPrice(10, -90)).toBe(5);

      // Base price $1: even with 50% floor, never drops below $1
      expect(calcEconomyPrice(1, -90)).toBe(1);
      expect(calcEconomyPrice(1, -30)).toBe(1);
    });

    it('returns 0 for 0 basePrice items', () => {
      expect(calcEconomyPrice(0, -90)).toBe(0);
      expect(calcEconomyPrice(0, 50)).toBe(0);
    });
  });

  describe('6. Market Crash Wage Cut: -3 Happiness Penalty and $1 Wage Floor', () => {
    it('applies -3 happiness penalty on wage cut and enforces minimum wage of $1', () => {
      const player: PlayerState = {
        id: 'p1',
        name: 'Player',
        money: 100,
        bankSavings: 100,
        happiness: 50,
        currentJobId: 'factory_cook',
        currentWage: 1, // Minimum wage
        inventory: { stocks: { tBills: 0, holdings: {} } }
      } as any;

      // Mock RNG >= 0.5 so player is NOT fired (gets wage cut)
      const rng = new Random(1);
      vi.spyOn(rng, 'next').mockReturnValue(0.75);

      const updated = applyMarketCrash(player, 'moderate', rng);

      // Happiness drops by 2 (moderate crash, no stocks) + 3 (wage cut penalty) = 5 total drop
      expect(updated.happiness).toBe(45);
      // Wage remains at least $1 (never drops to $0)
      expect(updated.currentWage).toBe(1);
      expect(updated.turnEvents.some(e => e.key === 'events.marketCrash.wageCut')).toBe(true);
    });
  });

  describe('7. Investor Threshold (> $1000) in Crash and Boom', () => {
    const campaignWithStocks: CampaignBundle = {
      ...mockCampaign,
      stocks: [
        { id: 'gold', name: 'Gold', basePrice: 50, type: 'fluctuating' },
        { id: 'penny', name: 'Penny Stocks', basePrice: 2, type: 'fluctuating' }
      ]
    };

    it('does not penalize player as investor if stock holdings are <= $1000', () => {
      // 10 shares of gold @ ~$50 = $500 <= $1000
      const smallInvestor: PlayerState = {
        id: 'p1',
        name: 'Small Investor',
        money: 100,
        bankSavings: 100,
        happiness: 50,
        inventory: { stocks: { tBills: 0, holdings: { gold: 10 } } }
      } as any;

      const updatedCrash = applyMarketCrash(smallInvestor, 'minor', new Random(1), undefined, undefined, undefined, campaignWithStocks);
      // Minor crash without >$1000 stocks drops happiness by 1 (not 2)
      expect(updatedCrash.happiness).toBe(49);

      const updatedBoom = applyEconomicBoom(smallInvestor, campaignWithStocks, 0, 1);
      // Boom does not grant happiness bonus to small investor
      expect(updatedBoom.happiness).toBe(50);
      expect(updatedBoom.turnEvents.some(e => e.key === 'events.economicBoom.investorBonus')).toBe(false);
    });

    it('penalizes and rewards player as investor if stock holdings are > $1000', () => {
      // 30 shares of gold @ ~$50 = $1500 > $1000
      const largeInvestor: PlayerState = {
        id: 'p1',
        name: 'Large Investor',
        money: 100,
        bankSavings: 100,
        happiness: 50,
        inventory: { stocks: { tBills: 0, holdings: { gold: 30 } } }
      } as any;

      const updatedCrash = applyMarketCrash(largeInvestor, 'minor', new Random(1), undefined, undefined, undefined, campaignWithStocks);
      // Minor crash with >$1000 stocks drops happiness by 2
      expect(updatedCrash.happiness).toBe(48);

      const updatedBoom = applyEconomicBoom(largeInvestor, campaignWithStocks, 0, 1);
      // Boom grants +5 happiness to large investor
      expect(updatedBoom.happiness).toBe(55);
      expect(updatedBoom.turnEvents.some(e => e.key === 'events.economicBoom.investorBonus')).toBe(true);
    });
  });
});
