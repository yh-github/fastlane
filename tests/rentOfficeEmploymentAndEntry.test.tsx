import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { canEnterBuilding, isRentOfficeOpen } from '../src/engine/buildingRules';
import { BuildingModal } from '../src/ui/BuildingModal';
import { loadCampaign } from '../src/engine/dataLoader';
import type { PlayerState, GameRules } from '../src/engine/gameState';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.defaultValue) return options.defaultValue;
      if (key === 'rentOffice.closed') {
        return `The Rent Office is closed. Come back during Week ${options?.week ?? 4} to pay your rent or move to a new apartment.`;
      }
      return key;
    },
    i18n: { language: 'en' }
  }),
}));

describe('Rent Office Employment & Entry (Post-Mortem Verification)', () => {
  it('allows an employee at Rent Office to enter and work in Advanced campaign on non-rent weeks', async () => {
    const campaign = await loadCampaign('advanced');
    expect(campaign).toBeDefined();

    const rentJob = campaign.jobs.find(j => j.id === 'rent_groundskeeper');
    expect(rentJob).toBeDefined();
    expect(rentJob?.locationId).toBe('apartment_complex');

    const rules = campaign.config.gameRules as GameRules;
    expect(rules.allowEmployedRentPayment).toBe(false);

    const player: PlayerState = {
      id: 'p1',
      name: 'Player',
      money: 500,
      hoursRemaining: 40,
      position: 'node_rent',
      currentHousingId: 'low_cost',
      currentRentPrice: 325,
      rentPaidUntilWeek: 4,
      rentDebt: 0,
      currentJobId: 'rent_groundskeeper',
      currentWage: 6,
      turnFlags: {},
      inventory: {
        appliances: [],
        clothes: ['casual'],
        books: []
      } as any
    } as PlayerState;

    // 1. Core Rule Check: canEnterBuilding MUST be true for the employee
    const entryCheck = canEnterBuilding('apartment_complex', player, 1, campaign, rules);
    expect(entryCheck.canEnter).toBe(true);

    // 2. Core Rule Check: isRentOfficeOpen is false because allowEmployedRentPayment is false
    const rentServiceOpen = isRentOfficeOpen(player, 1, campaign, rules);
    expect(rentServiceOpen).toBe(false);

    // 3. UI Component Check: BuildingModal renders in Generated GUI with WORK console
    let capturedAction: any = null;
    const { unmount } = render(
      <BuildingModal
        player={player}
        campaign={campaign}
        currentBuildingId="apartment_complex"
        turn={1}
        economicIndex={0}
        rules={rules}
        onAction={async (action) => {
          capturedAction = action;
          return { key: 'action.job.worked' };
        }}
        onClose={vi.fn()}
      />
    );

    // Rent payment banner explains that the rent office is closed
    expect(screen.getByText(/The Rent Office is closed/i)).toBeInTheDocument();

    // But WORK button is present and usable!
    const workDock = screen.getByTestId('btn-work-dock');
    expect(workDock).toBeInTheDocument();

    // Click WORK dock to open work cards/console
    fireEvent.click(workDock);
    const workWorkModeBtn = screen.getByTestId('work-mode-work_work');
    expect(workWorkModeBtn).toBeInTheDocument();

    // Work a shift
    await act(async () => {
      fireEvent.click(workWorkModeBtn);
    });

    expect(capturedAction).toBeDefined();
    expect(capturedAction.type).toBe('work');
    expect(capturedAction.jobId).toBe('rent_groundskeeper');

    unmount();
  });

  it('allows an employee at Rent Office to enter and work in Authentic GUI on non-rent weeks', async () => {
    const campaign = await loadCampaign('1990_classic_floppy');
    const rules = { ...campaign.config.gameRules, guiStyle: 'authentic' } as GameRules;

    const player: PlayerState = {
      id: 'p1',
      name: 'Player',
      money: 500,
      hoursRemaining: 40,
      position: 'node_rent',
      currentHousingId: 'low_cost',
      currentRentPrice: 325,
      rentPaidUntilWeek: 4,
      rentDebt: 0,
      currentJobId: 'rent_groundskeeper',
      currentWage: 6,
      turnFlags: {},
      inventory: { appliances: [], clothes: ['casual'], books: [] } as any
    } as PlayerState;

    const entryCheck = canEnterBuilding('apartment_complex', player, 1, campaign, rules);
    expect(entryCheck.canEnter).toBe(true);

    let capturedAction: any = null;
    render(
      <BuildingModal
        player={player}
        campaign={campaign}
        currentBuildingId="apartment_complex"
        turn={1}
        economicIndex={0}
        rules={rules}
        onAction={async (action) => {
          capturedAction = action;
          return { key: 'action.job.worked' };
        }}
        onClose={vi.fn()}
      />
    );

    // Authentic rent office location window mounts with work button
    expect(screen.getByTestId('authentic-rent-office')).toBeInTheDocument();
    const workBtn = screen.getByTestId('btn-rent-office-work');
    expect(workBtn).toBeInTheDocument();

    // Click work button
    await act(async () => {
      fireEvent.click(workBtn);
    });

    // Fast-forward animation timers to trigger work action
    await act(async () => {
      await new Promise(r => setTimeout(r, 600));
    });

    expect(capturedAction).toBeDefined();
    expect(capturedAction.type).toBe('work');
    expect(capturedAction.jobId).toBe('rent_groundskeeper');
  });

  it('displays closed panel when a non-employee visits rent office on non-rent week in Authentic GUI', async () => {
    const campaign = await loadCampaign('1990_classic_floppy');
    const rules = { ...campaign.config.gameRules, guiStyle: 'authentic' } as GameRules;

    const player: PlayerState = {
      id: 'p1',
      name: 'Player',
      money: 500,
      hoursRemaining: 40,
      position: 'node_rent',
      currentHousingId: 'low_cost',
      currentRentPrice: 325,
      rentPaidUntilWeek: 4,
      rentDebt: 0,
      currentJobId: null,
      turnFlags: {},
      inventory: { appliances: [], clothes: ['casual'], books: [] } as any
    } as PlayerState;

    const entryCheck = canEnterBuilding('apartment_complex', player, 1, campaign, rules);
    expect(entryCheck.canEnter).toBe(false);
    expect(entryCheck.reason).toBe('rent_office_closed');

    render(
      <BuildingModal
        player={player}
        campaign={campaign}
        currentBuildingId="apartment_complex"
        turn={1}
        economicIndex={0}
        rules={rules}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // Shows rent office closed panel with Close button
    expect(screen.getByTestId('rent-office-closed-panel')).toBeInTheDocument();
    expect(screen.getByText(/The Rent Office is closed/i)).toBeInTheDocument();
    expect(screen.queryByTestId('btn-rent-office-work')).toBeNull();
  });
});
