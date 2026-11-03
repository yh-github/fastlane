import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HudAttributeInfoModal } from './HudAttributeInfoModal';
import { getHudAttributeInfo } from './hudAttributeInfo';
import type { PlayerState, GameState } from '../engine/gameState';
import type { CampaignBundle } from '../engine/dataLoader';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => options?.defaultValue || key,
  }),
}));

const mockPlayer: PlayerState = {
  id: 'p1',
  name: 'Player 1',
  isAi: false,
  money: 500,
  bankSavings: 200,
  loanDebt: 0,
  rentDebt: 0,
  happiness: 35,
  relaxation: 25,
  physicalCondition: 40,
  physicalConditionMax: 50,
  mentalCondition: 8, // <= 10 (critical threshold)
  mentalConditionMax: 50,
  caffeineTolerance: 7, // >= 6 (withdrawal)
  social: 20,
  skillTech: 12.5,
  skillMgmt: 8.0,
  dependability: 30,
  experience: 15,
  degrees: ['degree_tech'],
  degreeDepBoost: 10,
  degreeExpBoost: 10,
  goalAllotment: { wealth: 25, happiness: 25, education: 25, career: 25, lifestyle: 25, wellbeing: 25 },
  inventory: {
    casualClothesWeeks: 0,
    dressClothesWeeks: 0,
    businessClothesWeeks: 0,
    selectedClothes: 'business',
    appliances: [],
    freshFoodUnits: 2,
    fastFoodItems: [],
    lotteryTickets: 1,
    pawnedItems: [],
    stocks: { tBills: 0, holdings: {} },
  },
  turnFlags: { hasWorked: true },
  turnEvents: [],
  activeEffects: {},
  position: 'node_home',
  hoursRemaining: 35,
  currentHousingId: 'low_cost',
  currentRentPrice: 300,
  rentPaidUntilWeek: 2,
  currentJobId: 'job_tech',
  currentWage: 18,
  hasWon: false,
  rentExtensionsDeniedPermanently: false,
  rentExtensionActive: false,
  nakedTurns: 0,
  hasEarnedIncome: true,
  lifestyle: 20,
} as unknown as PlayerState;

const mockRules = {
  helpfulUI: true,
  useSkills: true,
  usePhysicalMentalConditions: true,
  enableCaffeineSystem: true,
  trackSocial: true,
  guiStyle: 'generated',
} as any;

const mockCampaign: CampaignBundle = {
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
      title: 'Junior Technician',
      requirements: { dependability: 20, experience: 10 },
    } as any,
  ],
  education: [
    { id: 'degree_tech', name: 'Computer Certificate', maxTechSkillBonus: 5 } as any,
  ],
  items: [],
  housing: [],
  buildings: [],
  map: { nodes: [] },
} as any;

const mockGameState: GameState = {
  turn: 2,
  economicIndex: 1,
  economicReading: 1,
  economicTrend: 1,
  rules: mockRules,
  players: [mockPlayer],
} as any;

describe('getHudAttributeInfo Helper', () => {
  it('builds accurate info for Money', () => {
    const info = getHudAttributeInfo({
      attributeId: 'money',
      player: mockPlayer,
      rules: mockRules,
      turn: 2,
      campaign: mockCampaign,
    });
    expect(info.id).toBe('money');
    expect(info.currentFormatted).toBe('$500');
    expect(info.maxFormatted).toBe('No limit');
    expect(info.logFilter).toBe('money');
    expect(info.increases.length).toBeGreaterThan(0);
    expect(info.decreases.length).toBeGreaterThan(0);
  });

  it('builds accurate info for Time / Hours', () => {
    const info = getHudAttributeInfo({
      attributeId: 'time',
      player: mockPlayer,
      rules: mockRules,
      turn: 2,
      hoursPerTurn: 50,
      campaign: mockCampaign,
    });
    expect(info.id).toBe('time');
    expect(info.currentFormatted).toBe('35 hrs');
    expect(info.maxFormatted).toBe('50 hrs');
    expect(info.percentage).toBe(70);
    expect(info.logFilter).toBe('time');
  });

  it('builds accurate info for Tech Skill', () => {
    const info = getHudAttributeInfo({
      attributeId: 'skillTech',
      player: mockPlayer,
      rules: mockRules,
      turn: 2,
      campaign: mockCampaign,
    });
    expect(info.id).toBe('skillTech');
    expect(info.currentFormatted).toBe('12.50');
    expect(info.logFilter).toBe('skillTech');
    expect(info.description).toContain('electronics');
  });

  it('builds accurate info for Leadership / Management Skill', () => {
    const info = getHudAttributeInfo({
      attributeId: 'skillMgmt',
      player: mockPlayer,
      rules: mockRules,
      turn: 2,
      campaign: mockCampaign,
    });
    expect(info.id).toBe('skillMgmt');
    expect(info.currentFormatted).toBe('8.00');
    expect(info.logFilter).toBe('skillMgmt');
  });

  it('builds accurate info for Mental condition showing critical badge', () => {
    const info = getHudAttributeInfo({
      attributeId: 'mental',
      player: mockPlayer,
      rules: mockRules,
      turn: 2,
      campaign: mockCampaign,
    });
    expect(info.id).toBe('mental');
    expect(info.currentFormatted).toBe('8');
    expect(info.maxFormatted).toBe('50');
    expect(info.statusBadge).toBe('Critical');
    expect(info.logFilter).toBe('mental');
  });

  it('builds accurate info for Caffeine tolerance showing withdrawal status', () => {
    const info = getHudAttributeInfo({
      attributeId: 'caffeine',
      player: mockPlayer,
      rules: mockRules,
      turn: 2,
      campaign: mockCampaign,
    });
    expect(info.id).toBe('caffeine');
    expect(info.currentFormatted).toBe('7');
    expect(info.maxFormatted).toBe('10');
    expect(info.statusBadge).toBe('Withdrawal');
    expect(info.logFilter).toBe('caffeine');
  });

  it('builds accurate info for Economy', () => {
    const info = getHudAttributeInfo({
      attributeId: 'economy',
      player: mockPlayer,
      rules: mockRules,
      turn: 2,
      economicReading: 2,
      economicTrend: 1,
      campaign: mockCampaign,
    });
    expect(info.id).toBe('economy');
    expect(info.currentFormatted).toContain('Reading: +2');
    expect(info.currentFormatted).toContain('Trend: +1 ↑');
    expect(info.logFilter).toBe('wealth');
  });
});

describe('HudAttributeInfoModal Component', () => {
  it('renders modal with name, current, max, description, and list of effects', () => {
    const onClose = vi.fn();
    const onOpenFilteredLog = vi.fn();

    render(
      <HudAttributeInfoModal
        attributeId="dependability"
        player={mockPlayer}
        rules={mockRules}
        gameState={mockGameState}
        campaign={mockCampaign}
        turn={2}
        onClose={onClose}
        onOpenFilteredLog={onOpenFilteredLog}
      />
    );

    expect(screen.getByTestId('hud-info-modal')).toBeInTheDocument();
    expect(screen.getByText('Dependability')).toBeInTheDocument();
    expect(screen.getByTestId('hud-info-current').textContent).toBe('30');
    // maxDep = 20 (base) + 20 (req) + 10 (degreeDepBoost) = 50
    expect(screen.getByTestId('hud-info-max').textContent).toBe('50');
    expect(screen.getByTestId('hud-info-desc')).toBeInTheDocument();

    // Verify sections
    expect(screen.getByText(/What It Is/i)).toBeInTheDocument();
    expect(screen.getByText(/What Affects It/i)).toBeInTheDocument();
    expect(screen.getByText(/Increases \/ How to Raise/i)).toBeInTheDocument();
    expect(screen.getByText(/Decreases \/ Risks & Decay/i)).toBeInTheDocument();
  });

  it('calls onOpenFilteredLog with attribute filter when clicking View Filtered Activity Log', () => {
    const onClose = vi.fn();
    const onOpenFilteredLog = vi.fn();

    render(
      <HudAttributeInfoModal
        attributeId="skillTech"
        player={mockPlayer}
        rules={mockRules}
        gameState={mockGameState}
        campaign={mockCampaign}
        turn={2}
        onClose={onClose}
        onOpenFilteredLog={onOpenFilteredLog}
      />
    );

    const logBtn = screen.getByTestId('hud-info-view-log');
    expect(logBtn).toBeInTheDocument();
    expect(logBtn.textContent).toContain('skillTech');

    fireEvent.click(logBtn);
    expect(onOpenFilteredLog).toHaveBeenCalledWith('skillTech');
  });

  it('calls onClose when close button, dismiss button, or backdrop is clicked, or Escape is pressed', () => {
    const onClose = vi.fn();

    render(
      <HudAttributeInfoModal
        attributeId="money"
        player={mockPlayer}
        rules={mockRules}
        gameState={mockGameState}
        campaign={mockCampaign}
        turn={2}
        onClose={onClose}
        onOpenFilteredLog={() => {}}
      />
    );

    // 1. Close button in header
    fireEvent.click(screen.getByTestId('hud-info-close'));
    expect(onClose).toHaveBeenCalledTimes(1);

    // 2. Dismiss button in footer
    fireEvent.click(screen.getByTestId('hud-info-dismiss'));
    expect(onClose).toHaveBeenCalledTimes(2);

    // 3. Backdrop overlay click
    fireEvent.click(screen.getByTestId('hud-info-modal'));
    expect(onClose).toHaveBeenCalledTimes(3);

    // 4. Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(4);
  });
});
