import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Dashboard } from './Dashboard';
import { createInitialGameState } from '../engine/gameState';
import type { PlayerState } from '../engine/gameState';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.defaultValue) return options.defaultValue;
      return key;
    }
  }),
}));

describe('Dashboard Component', () => {
  it('renders relaxation in red and bold when relaxation is at or below threshold', () => {
    // Create a mock player with relaxation = 10
    const mockPlayer = {
      id: 'p1',
      name: 'Player 1',
      isAi: false,
      money: 100,
      bankSavings: 0,
      loanDebt: 0,
      rentDebt: 0,
      happiness: 50,
      relaxation: 10,
      dependability: 50,
      experience: 10,
      degrees: [],
      inventory: { casualClothesWeeks: 0, dressClothesWeeks: 0, businessClothesWeeks: 0, selectedClothes: 'none', appliances: [], freshFoodUnits: 0, fastFoodItems: [], lotteryTickets: 0, pawnedItems: [], stocks: { tBills: 0, holdings: {} } },
      turnFlags: {},
      turnEvents: [],
      activeEffects: {},
      position: 'node1',
      hoursRemaining: 50,
      currentHousingId: 'low_cost',
      currentRentPrice: 300,
      rentPaidUntilWeek: 1,
      currentJobId: null,
      currentWage: 0,
      goalAllotment: { wealth: 25, happiness: 25, education: 25, career: 25 },
      hasWon: false,
      rentExtensionsDeniedPermanently: false,
      rentExtensionActive: false,
      nakedTurns: 0
    } as unknown as PlayerState;

    const mockGameState = {
      rules: {
        enableRelaxationDoctor: true,
        // specifically leaving relaxationDoctorThreshold undefined to test the fallback!
      }
    } as any;

    const mockCampaign = {
      config: { timeRules: { hoursPerTurn: 50 } },
      items: [],
      housing: [],
      jobs: [],
      education: [],
      buildings: [],
      map: { nodes: [] }
    } as any;

    render(
      <Dashboard 
        player={mockPlayer} 
        gameState={mockGameState} 
        turn={1} 
        economicIndex={0} 
        hoursPerTurn={50} 
        campaign={mockCampaign}
        onOpenInventory={() => {}}
        onOpenSettings={() => {}}
      />
    );

    const relaxationBadge = screen.getByTitle('Relaxation');
    expect(relaxationBadge).toBeInTheDocument();
    const valueSpan = relaxationBadge.querySelector('.stat-badge__value');
    expect(valueSpan).toHaveStyle('color: rgb(255, 51, 51)');
    expect(valueSpan).toHaveStyle('font-weight: bold');
  });

  it('renders relaxation normally when above threshold', () => {
    const mockPlayer = {
      name: 'Player 1',
      relaxation: 11,
      degrees: [],
      dependability: 50,
      money: 100,
      goalAllotment: { wealth: 25, happiness: 25, education: 25, career: 25 },
      inventory: { selectedClothes: 'none', stocks: { tBills: 0, holdings: {} } },
      hoursRemaining: 50
    } as unknown as PlayerState;

    const mockGameState = {
      rules: {
        enableRelaxationDoctor: true
      }
    } as any;

    render(
      <Dashboard 
        player={mockPlayer} 
        gameState={mockGameState} 
        turn={1} 
        economicIndex={0} 
        hoursPerTurn={50} 
        onOpenInventory={() => {}}
        onOpenSettings={() => {}}
      />
    );

    const relaxationBadge = screen.getByTitle('Relaxation');
    expect(relaxationBadge).toBeInTheDocument();
    
    // Should NOT have red color
    expect(relaxationBadge).not.toHaveStyle('color: red');
  });
});
