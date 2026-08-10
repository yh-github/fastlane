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
        helpfulUI: true,
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
        helpfulUI: true,
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

  it('renders Luck badge and calls onSelectLogFilter when clicked', () => {
    const mockPlayer = {
      name: 'Player 1',
      relaxation: 20,
      dependability: 20,
      experience: 10,
      degrees: ['degree_1'],
      money: 100,
      goalAllotment: { wealth: 25, happiness: 25, education: 25, career: 25 },
      inventory: { selectedClothes: 'casual', stocks: { tBills: 0, holdings: {} } },
      hoursRemaining: 50
    } as unknown as PlayerState;

    const mockGameState = { rules: { helpfulUI: true } } as any;
    const onSelectLogFilter = vi.fn();

    render(
      <Dashboard 
        player={mockPlayer} 
        gameState={mockGameState} 
        turn={1} 
        economicIndex={0} 
        hoursPerTurn={50} 
        onOpenInventory={() => {}}
        onOpenSettings={() => {}}
        onSelectLogFilter={onSelectLogFilter}
      />
    );

    // Luck score = 30 + Math.floor((10 + 20 + 10 + 8) / 3) = 46
    const employabilityBadge = screen.getByTitle('Employability');
    expect(employabilityBadge).toBeInTheDocument();
    expect(employabilityBadge.textContent).toContain('46');

    // Click employability badge to trigger filter
    employabilityBadge.click();
    expect(onSelectLogFilter).toHaveBeenCalledWith('employability');
  });

  it('hides non-core goal badges (money, relaxation, dependability, experience, employability) when helpfulUI is false', () => {
    const mockPlayer = {
      name: 'Player 1',
      relaxation: 20,
      dependability: 20,
      experience: 10,
      happiness: 50,
      money: 100,
      degrees: [],
      goalAllotment: { wealth: 25, happiness: 25, education: 25, career: 25 },
      inventory: { selectedClothes: 'casual', stocks: { tBills: 0, holdings: {} } },
      hoursRemaining: 50
    } as unknown as PlayerState;

    const mockGameState = { rules: { helpfulUI: false } } as any;

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

    // Non-core formula/hidden stats (relaxation, dependability, experience, luck, economy index) must NOT be rendered
    expect(screen.queryByTitle('Relaxation')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Dependability')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Experience')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Luck')).not.toBeInTheDocument();
    expect(screen.queryByText(/Economy:/i)).not.toBeInTheDocument();

    // Money, 4 Core goal badges, and Victory badge MUST be rendered
    expect(screen.getByTitle('Money')).toBeInTheDocument();
    expect(screen.getByTitle('Victory')).toBeInTheDocument();
    expect(screen.getByTitle('Happiness')).toBeInTheDocument();
    expect(screen.getByTitle('Education')).toBeInTheDocument();
    expect(screen.getByTitle('Career')).toBeInTheDocument();
    expect(screen.getByTitle('Wealth')).toBeInTheDocument();
  });
});
