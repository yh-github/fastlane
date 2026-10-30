import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthenticInventoryModal } from '../src/ui/authentic/AuthenticInventoryModal';
import { AuthenticGoalsModal } from '../src/ui/authentic/AuthenticGoalsModal';
import { InventoryModal } from '../src/ui/InventoryModal';

const mockCampaign: any = {
  config: {
    name: '1990_classic_floppy',
    eventRules: {
      willyRobberyStartWeek: 4
    },
    gameRules: {
      guiStyle: 'authentic',
      authenticCurvedPaths: true,
      clothesSwitching: 'anywhere',
    }
  },
  buildings: [
    { id: 'burger_palace', name: 'Monolith Burgers' },
  ],
  locations: [
    { id: 'burger_palace', name: 'Monolith Burgers' },
  ],
  jobs: [
    { id: 'job_fry_cook', title: 'Fry Cook', locationId: 'burger_palace', baseWage: 6, requirements: { dependability: 10, experience: 0 } }
  ],
  items: [
    { id: 'tv', name: 'Television', basePrice: 400 },
    { id: 'refrigerator', name: 'Refrigerator', basePrice: 600 }
  ],
  education: [
    { id: 'academic', name: 'Academic Degree' }
  ],
  stocks: [
    { id: 'megacorp', name: 'MegaCorp', symbol: 'MEGA', currentPrice: 50 }
  ]
};

const createMockPlayer = (overrides: any = {}): any => ({
  id: 'player_1',
  name: 'Jones',
  money: 200,
  bankSavings: 500,
  loanDebt: 0,
  rentDebt: 0,
  currentJobId: 'job_fry_cook',
  currentWage: 6,
  dependability: 20,
  experience: 15,
  degrees: ['academic'],
  inventory: {
    freshFoodUnits: 12,
    cannedFoodUnits: 0,
    selectedClothes: 'casual',
    casualClothesWeeks: 4,
    dressClothesWeeks: 2,
    businessClothesWeeks: 0,
    appliances: [
      { id: 'tv', pricePaid: 350, condition: 'used', isBroken: false }
    ],
    stocks: {
      tBills: 1,
      holdings: { megacorp: 10 }
    }
  },
  goalAllotment: {
    wealth: 100,
    happiness: 100,
    education: 100,
    career: 100
  },
  happiness: 50,
  career: 50,
  ...overrides
});

describe('Authentic Status / Inventory Modal (Script 231)', () => {
  it('renders authentic 183x112 card with Sierra SCI formatted lines', () => {
    const player = createMockPlayer();
    const handleClose = vi.fn();

    render(
      <AuthenticInventoryModal
        player={player}
        campaign={mockCampaign}
        turn={1}
        onClose={handleClose}
        rules={{ guiStyle: 'authentic' }}
      />
    );

    // Modal container
    const modal = screen.getByTestId('inventory-modal');
    expect(modal).toBeInTheDocument();
    expect(modal.classList.contains('building-modal--authentic')).toBe(true);

    // Check background image
    const bgImg = screen.getByAltText('Inventory Background');
    expect(bgImg).toHaveAttribute('src', '/assets/authentic/status/bg_inventory.png');

    // Check DSelector lines
    const selector = screen.getByTestId('inventory-selector');
    expect(selector).toBeInTheDocument();

    // Check formatted text in line 0 (centered player name)
    const line0 = screen.getByTestId('inventory-line-0');
    expect(line0.textContent?.trim()).toBe('Jones');

    // Check job lines
    expect(screen.getByText(/Works at Monolith/i)).toBeInTheDocument();
    expect(screen.getByText(/As a Fry Cook/i)).toBeInTheDocument();
    expect(screen.getByText(/Hourly wage: \$6/i)).toBeInTheDocument();

    // Check finances
    expect(screen.getByText(/Cash: \$200/i)).toBeInTheDocument();
    expect(screen.getByText(/Savings: \$500/i)).toBeInTheDocument();

    // Done button closes modal
    const doneBtn = screen.getByTestId('btn-inventory-done');
    fireEvent.click(doneBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('allows clicking clothes line to switch clothes when rule allows', () => {
    const player = createMockPlayer();
    const handleAction = vi.fn();

    render(
      <AuthenticInventoryModal
        player={player}
        campaign={mockCampaign}
        turn={1}
        onAction={handleAction}
        onClose={() => {}}
        rules={{ guiStyle: 'authentic', clothesSwitching: 'anywhere' }}
        scrollToSection="clothes"
      />
    );

    // Dress clothes should be clickable (since current is casual)
    const dressLine = screen.getByText(/Dress Clothes/i);
    fireEvent.click(dressLine);
    expect(handleAction).toHaveBeenCalledWith({ type: 'change_clothes', clothes: 'dress' });
  });

  it('switches to Goals screen when onOpenGoals is triggered', () => {
    const player = createMockPlayer();
    const handleOpenGoals = vi.fn();

    render(
      <AuthenticInventoryModal
        player={player}
        campaign={mockCampaign}
        turn={1}
        onClose={() => {}}
        onOpenGoals={handleOpenGoals}
        rules={{ guiStyle: 'authentic' }}
      />
    );

    const switchBtn = screen.getByTestId('btn-switch-to-goals');
    fireEvent.click(switchBtn);
    expect(handleOpenGoals).toHaveBeenCalledTimes(1);
  });

  it('delegates to AuthenticInventoryModal inside InventoryModal when guiStyle is authentic', () => {
    const player = createMockPlayer();
    const handleClose = vi.fn();

    render(
      <InventoryModal
        player={player}
        campaign={mockCampaign}
        turn={1}
        onClose={handleClose}
        rules={{ guiStyle: 'authentic' }}
      />
    );

    expect(screen.getByTestId('inventory-modal')).toBeInTheDocument();
    expect(screen.getByAltText('Inventory Background')).toBeInTheDocument();
  });
});

describe('Authentic Goals Modal (Script 238)', () => {
  it('renders thermometer view with accurate calculation for 1 player (centered with +65px offset)', () => {
    // Player 1 with 50% on all goals -> percent should be 50%
    const player = createMockPlayer({
      money: 50,
      bankSavings: 0,
      happiness: 50,
      degrees: ['academic', 'degree2'], // 2 * 25 = 50
      dependability: 40, // 1.25 * 40 = 50
      goalAllotment: { wealth: 100, happiness: 100, education: 100, career: 100 }
    });

    const handleClose = vi.fn();
    const handleOpenStatus = vi.fn();

    render(
      <AuthenticGoalsModal
        players={[player]}
        onClose={handleClose}
        onOpenStatus={handleOpenStatus}
      />
    );

    expect(screen.getByTestId('goals-modal')).toBeInTheDocument();
    expect(screen.getByAltText('Goals Background')).toHaveAttribute('src', '/assets/authentic/status/bg_goals.png');

    // 1 Player: 50% achieved -> percent = 50%
    const pctText = screen.getByTestId('goals-percent-0');
    expect(pctText.textContent).toBe('50%');

    // thermCel = floor(50 / 10) = 5
    const thermImg = screen.getByTestId('goals-therm-0');
    expect(thermImg).toHaveAttribute('src', '/assets/authentic/status/thermometers/therm_5.png');

    // fineCel = floor((50 % 10) / 2) = 0 (no fine meniscus since remainder is 0)
    expect(screen.queryByTestId('goals-fine-therm-0')).toBeNull();

    // 1 player column offset = 65px. Base badge left is 18 -> total 83px
    const playerBadge = screen.getByTestId('goals-player-badge-0');
    expect(playerBadge.style.left).toBe('83px');

    // Done button closes modal
    const doneBtn = screen.getByTestId('btn-goals-done');
    fireEvent.click(doneBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Switch to status button
    const statusBtn = screen.getByTestId('btn-switch-to-status');
    fireEvent.click(statusBtn);
    expect(handleOpenStatus).toHaveBeenCalledTimes(1);
  });

  it('renders multi-player thermometers with fine meniscus fill and correct offsets', () => {
    // Player 1 has remainder: 47% (cel = 4, fineCel = floor(7/2) = 3)
    const p1 = createMockPlayer({
      name: 'Player 1',
      money: 47,
      bankSavings: 0,
      happiness: 47,
      degrees: [],
      dependability: 38, // 1.25 * 38 = 47
      goalAllotment: { wealth: 100, happiness: 100, education: 0, career: 100 } // total 300
      // achieved = 47 + 47 + 0 + 47 = 141. 141 / 300 = 47%
    });

    const p2 = createMockPlayer({
      name: 'Player 2',
      money: 80,
      bankSavings: 0,
      happiness: 80,
      degrees: [],
      dependability: 64, // 1.25 * 64 = 80
      goalAllotment: { wealth: 100, happiness: 100, education: 0, career: 100 }
      // achieved = 240 / 300 = 80%
    });

    render(
      <AuthenticGoalsModal
        players={[p1, p2]}
        onClose={() => {}}
      />
    );

    // 2 Players: offset = 42px.
    // Player 1 badge left = 18 + 42 = 60px
    const badge0 = screen.getByTestId('goals-player-badge-0');
    expect(badge0.style.left).toBe('60px');

    // Player 2 badge left = 62 + 42 = 104px
    const badge1 = screen.getByTestId('goals-player-badge-1');
    expect(badge1.style.left).toBe('104px');

    // Player 1: percent = 47%
    expect(screen.getByTestId('goals-percent-0').textContent).toBe('47%');
    // thermCel = 4
    expect(screen.getByTestId('goals-therm-0')).toHaveAttribute('src', '/assets/authentic/status/thermometers/therm_4.png');
    // fineCel = 3
    const fine0 = screen.getByTestId('goals-fine-therm-0');
    expect(fine0).toHaveAttribute('src', '/assets/authentic/status/thermometers/fine_therm_3.png');
    // fineTop = 83 - 4*5 = 63px
    expect(fine0.style.top).toBe('63px');
  });

  it('clicking a player badge opens the detailed goal breakdown card and returns', () => {
    const p1 = createMockPlayer({ name: 'Jones' });
    render(
      <AuthenticGoalsModal
        players={[p1]}
        onClose={() => {}}
      />
    );

    // Click player badge to open details
    const badge = screen.getByTestId('goals-player-badge-0');
    fireEvent.click(badge);

    // Detailed view should be shown with bg_detailed_goals.png
    expect(screen.getByTestId('goals-detailed-view')).toBeInTheDocument();
    expect(screen.getByAltText('Goals Background')).toHaveAttribute('src', '/assets/authentic/status/bg_detailed_goals.png');
    expect(screen.getByText(/Jones/i)).toBeInTheDocument();
    expect(screen.getByText(/Wealth:/i)).toBeInTheDocument();
    expect(screen.getByText(/Goal Points:/i)).toBeInTheDocument();

    // Click back button to return to thermometers
    const backBtn = screen.getByTestId('btn-back-to-thermometers');
    fireEvent.click(backBtn);
    expect(screen.queryByTestId('goals-detailed-view')).toBeNull();
    expect(screen.getByTestId('goals-thermometers-view')).toBeInTheDocument();
  });
});
