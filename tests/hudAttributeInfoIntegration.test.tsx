import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { GameSession } from '../src/ui/GameSession';
import { Dashboard } from '../src/ui/Dashboard';
import type { PlayerState, GameState } from '../src/engine/gameState';
import type { CampaignBundle } from '../src/engine/dataLoader';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.defaultValue) return options.defaultValue;
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('../src/ui/GameMap', () => ({
  GameMap: () => <div data-testid="mock-game-map" />,
}));

const mockPlayer: PlayerState = {
  id: 'p1',
  name: 'Player 1',
  isAi: false,
  money: 750,
  bankSavings: 1000,
  loanDebt: 0,
  rentDebt: 0,
  happiness: 40,
  relaxation: 30,
  physicalCondition: 45,
  physicalConditionMax: 50,
  mentalCondition: 35,
  mentalConditionMax: 50,
  social: 25,
  caffeineTolerance: 4,
  skillTech: 15.0,
  skillMgmt: 10.0,
  dependability: 25,
  experience: 12,
  degrees: ['cert_tech'],
  degreeDepBoost: 10,
  degreeExpBoost: 10,
  goalAllotment: { wealth: 25, happiness: 25, education: 25, career: 25 },
  inventory: {
    casualClothesWeeks: 0,
    dressClothesWeeks: 0,
    businessClothesWeeks: 0,
    selectedClothes: 'business',
    appliances: [],
    freshFoodUnits: 2,
    fastFoodItems: [],
    lotteryTickets: 0,
    pawnedItems: [],
    stocks: { tBills: 0, holdings: {} },
  },
  turnFlags: { hasWorked: true },
  turnEvents: [],
  activeEffects: {},
  position: 'node_1',
  hoursRemaining: 42,
  currentHousingId: 'low_cost',
  currentRentPrice: 300,
  rentPaidUntilWeek: 2,
  currentJobId: 'job_tech',
  currentWage: 20,
  hasWon: false,
  rentExtensionsDeniedPermanently: false,
  rentExtensionActive: false,
  nakedTurns: 0,
  hasEarnedIncome: true,
  lifestyle: 30,
} as unknown as PlayerState;

const mockCampaign: CampaignBundle = {
  id: 'test_campaign',
  name: 'Test Campaign',
  config: {
    timeRules: { hoursPerTurn: 50 },
    statRules: {
      enableAdvancedStats: true,
      mentalWarningThreshold: 10,
      physicalWarningThreshold: 10,
      maxSkillCap: 30,
    },
    winConditions: [
      { stat: 'wealth', label: 'Wealth' },
      { stat: 'happiness', label: 'Happiness' },
      { stat: 'education', label: 'Education' },
      { stat: 'career', label: 'Career' },
    ],
  },
  jobs: [
    {
      id: 'job_tech',
      title: 'Technician',
      requirements: { dependability: 20, experience: 10 },
    } as any,
  ],
  education: [
    { id: 'cert_tech', name: 'Tech Certificate' } as any,
  ],
  items: [],
  housing: [],
  buildings: [
    { id: 'bank', name: 'First National Bank', archetype: 'bank' } as any,
  ],
  map: {
    nodes: [
      { id: 'node_1', x: 100, y: 100, name: 'Bank Node', buildingId: 'bank' },
    ],
  },
} as any;

const mockGameState: GameState = {
  turn: 2,
  phase: 'playing',
  economicIndex: 1,
  economicReading: 1,
  economicTrend: 1,
  rules: {
    helpfulUI: true,
    useSkills: true,
    usePhysicalMentalConditions: true,
    enableCaffeineSystem: true,
    trackSocial: true,
    hudLayout: 'top',
    guiStyle: 'generated',
    authenticCurvedPaths: false,
  } as any,
  players: [mockPlayer],
  pawnShopItemsForSale: [],
  busyLocations: {},
} as any;

describe('HUD Improvement Integration: Hover Tooltips & Info Cards Across All Versions', () => {
  it('displays attribute name, current, and max on hover over HUD numbers in Top HUD', () => {
    render(
      <Dashboard
        player={mockPlayer}
        gameState={mockGameState}
        turn={2}
        hoursPerTurn={50}
        campaign={mockCampaign}
        layout="top"
        onOpenInventory={() => {}}
        onOpenSettings={() => {}}
      />
    );

    // 1. Money number has hover text showing name and value
    const moneyBadge = screen.getByTitle('Money');
    const moneyValue = moneyBadge.querySelector('.stat-badge__value');
    expect(moneyValue).toHaveAttribute('title', 'Money: $750');

    // 2. Physical number has hover text showing current and max
    const physBadge = screen.getByTitle('Physical');
    const physValue = physBadge.querySelector('.stat-badge__value');
    expect(physValue?.getAttribute('title')).toContain('Physical: 45 / 50');

    // 3. Tech Skill has hover text showing current and max
    const techBadge = screen.getByTitle('Tech');
    const techValue = techBadge.querySelector('.stat-badge__value');
    expect(techValue?.getAttribute('title')).toContain('Tech: 15.00 / 30.0');

    // 4. Leadership Skill has hover text showing current and max
    const mgmtBadge = screen.getByTitle('Leadership');
    const mgmtValue = mgmtBadge.querySelector('.stat-badge__value');
    expect(mgmtValue?.getAttribute('title')).toContain('Leadership: 10.00 / 30.0');

    // 5. Dependability has hover text showing current and max
    const depBadge = screen.getByTitle('Dependability');
    const depValue = depBadge.querySelector('.stat-badge__value');
    expect(depValue?.getAttribute('title')).toContain('Dependability: 25 / 50');

    // 6. Clock in Top HUD has hover text showing hours remaining and max
    const clockElem = screen.getByTestId('hud-top-clock');
    expect(clockElem?.getAttribute('title')).toContain('Hours: 42 / 50 hrs');
  });

  it('clicking a HUD skill badge (Tech or Leadership) pops up the info card with details and filtered log link', async () => {
    const onSelectLogFilter = vi.fn();

    render(
      <Dashboard
        player={mockPlayer}
        gameState={mockGameState}
        turn={2}
        hoursPerTurn={50}
        campaign={mockCampaign}
        layout="top"
        onSelectLogFilter={onSelectLogFilter}
        onOpenInventory={() => {}}
        onOpenSettings={() => {}}
      />
    );

    // Click Tech skill badge
    const techBadge = screen.getByTitle('Tech');
    fireEvent.click(techBadge);

    // Verify info card popped up
    const modal = screen.getByTestId('hud-info-modal');
    expect(modal).toBeInTheDocument();
    expect(screen.getByText('Tech Skill')).toBeInTheDocument();
    expect(screen.getByTestId('hud-info-current').textContent).toBe('15.00');
    expect(screen.getByTestId('hud-info-max').textContent).toBe('30.0');
    expect(screen.getByTestId('hud-info-desc')).toBeInTheDocument();

    // Click View in Activity Log
    const logBtn = screen.getByTestId('hud-info-view-log');
    expect(logBtn.textContent).toContain('skillTech');
    fireEvent.click(logBtn);

    expect(onSelectLogFilter).toHaveBeenCalledWith('skillTech');
    expect(screen.queryByTestId('hud-info-modal')).not.toBeInTheDocument();
  });

  it('clicking Top HUD clock pops up Time info card, and clicking economy pops up Economy info card', () => {
    render(
      <Dashboard
        player={mockPlayer}
        gameState={mockGameState}
        turn={2}
        hoursPerTurn={50}
        campaign={mockCampaign}
        layout="top"
        onOpenInventory={() => {}}
        onOpenSettings={() => {}}
      />
    );

    // 1. Click Top HUD clock
    fireEvent.click(screen.getByTestId('hud-top-clock'));
    expect(screen.getByTestId('hud-info-modal')).toBeInTheDocument();
    expect(screen.getByText('Time (Hours Remaining)')).toBeInTheDocument();
    expect(screen.getByTestId('hud-info-current').textContent).toBe('42 hrs');
    expect(screen.getByTestId('hud-info-max').textContent).toBe('50 hrs');

    // Close modal
    fireEvent.click(screen.getByTestId('hud-info-close'));
    expect(screen.queryByTestId('hud-info-modal')).not.toBeInTheDocument();

    // 2. Click Economy strip
    const economyElem = document.querySelector('.dashboard-stat.economy');
    expect(economyElem).toBeInTheDocument();
    fireEvent.click(economyElem!);

    expect(screen.getByTestId('hud-info-modal')).toBeInTheDocument();
    expect(screen.getByText('Economic Climate')).toBeInTheDocument();

    // Dismiss modal
    fireEvent.click(screen.getByTestId('hud-info-dismiss'));
    expect(screen.queryByTestId('hud-info-modal')).not.toBeInTheDocument();
  });

  it('in Side HUD mode: hover tooltips exist, clicking badges pops up info card, and victory click unfolds goals while popping info card', () => {
    render(
      <Dashboard
        player={mockPlayer}
        gameState={mockGameState}
        turn={2}
        hoursPerTurn={50}
        campaign={mockCampaign}
        layout="side"
        foldState="full"
        onOpenInventory={() => {}}
        onOpenSettings={() => {}}
      />
    );

    // Verify Side HUD full layout
    expect(screen.getByTestId('side-hud-full')).toBeInTheDocument();

    // Left column: verify hover text on Employability
    const empBadge = screen.getByTitle('Employability');
    const empValue = empBadge.querySelector('.stat-badge__value');
    expect(empValue?.getAttribute('title')).toContain('Employability:');

    // Click Caffeine badge in right column
    const cafBadge = screen.getByTitle('Caffeine');
    fireEvent.click(cafBadge);

    expect(screen.getByTestId('hud-info-modal')).toBeInTheDocument();
    expect(screen.getByText('Caffeine Tolerance')).toBeInTheDocument();
    expect(screen.getByTestId('hud-info-current').textContent).toBe('4');
    expect(screen.getByTestId('hud-info-max').textContent).toBe('10');

    // Close info card
    fireEvent.click(screen.getByTestId('hud-info-close'));
    expect(screen.queryByTestId('hud-info-modal')).not.toBeInTheDocument();

    // In Side HUD, goals start folded
    expect(screen.queryByTitle('Happiness')).toBeNull();

    // Clicking Victory unfolds goals AND opens info card
    const vicBadge = screen.getByTitle('Victory');
    fireEvent.click(vicBadge);

    // Goals are now unfolded!
    expect(screen.getByTitle('Happiness')).toBeInTheDocument();
    expect(screen.getByTitle('Wealth')).toBeInTheDocument();

    // Victory info card is shown
    expect(screen.getByTestId('hud-info-modal')).toBeInTheDocument();
    expect(screen.getByText('Victory Progress')).toBeInTheDocument();
  });

  it('in GameSession: Dynamic Money Badge is non-clickable while Bottom Center Clock pops up info card', async () => {
    const sideGameState: GameState = {
      ...mockGameState,
      rules: {
        ...mockGameState.rules,
        hudLayout: 'side',
      },
    };

    render(
      <GameSession
        campaign={mockCampaign}
        initialGameState={sideGameState}
        onGameOver={() => {}}
        onQuitToTitle={() => {}}
      />
    );

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    // 1. Verify dynamic money badge on the board is non-clickable (pointer-events: none) and does not open explanation modal
    const moneyOnBoard = screen.getByTestId('stat-money');
    expect(moneyOnBoard).toBeInTheDocument();
    expect(moneyOnBoard).toHaveStyle({ pointerEvents: 'none' });
    fireEvent.click(moneyOnBoard);

    expect(screen.queryByTestId('hud-info-modal')).not.toBeInTheDocument();

    // 2. Click bottom center clock on the board
    const bottomClock = screen.getByTestId('bottom-center-clock');
    expect(bottomClock).toBeInTheDocument();
    fireEvent.click(bottomClock);

    expect(screen.getByTestId('hud-info-modal')).toBeInTheDocument();
    expect(screen.getByText('Time (Hours Remaining)')).toBeInTheDocument();

    // Click "View Filtered Activity Log" on the bottom of the card
    const viewLogBtn = screen.getByTestId('hud-info-view-log');
    fireEvent.click(viewLogBtn);

    // Modal closes and Activity Log opens!
    expect(screen.queryByTestId('hud-info-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('log-window')).toBeInTheDocument();
  });
});
