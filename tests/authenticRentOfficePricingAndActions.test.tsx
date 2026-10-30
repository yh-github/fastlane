import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthenticRentOffice } from '../src/ui/buildings/authentic/AuthenticRentOffice';

describe('AuthenticRentOffice Pricing and Actions Integration', () => {
  const mockCampaign: any = {
    config: {
      name: '1990_classic_floppy',
      timeRules: { moveApartmentCost: 4 }
    },
    buildings: [
      { id: 'apartment_complex', name: 'Rent Office', archetype: 'housing' }
    ],
    housing: [
      { id: 'low_cost', name: 'Low-Cost Housing', baseRent: 325 },
      { id: 'security', name: 'Security Apartments', baseRent: 475 }
    ],
    jobs: [
      { id: 'rent_clerk', title: 'Rent Clerk', locationId: 'apartment_complex', baseWage: 8 }
    ]
  };

  const getMockPlayer = (overrides?: any) => ({
    id: 'p1',
    name: 'Jones',
    money: 1000,
    hoursRemaining: 10,
    currentHousingId: 'low_cost',
    currentRentPrice: 325,
    rentPaidUntilWeek: 4,
    rentDebt: 0,
    turnFlags: {},
    inventory: { appliances: [], books: [] },
    ...overrides
  });

  it('displays accurate monthly rent of $325 (not $1300)', () => {
    const player = getMockPlayer({ currentRentPrice: 325, rentDebt: 0 });
    render(
      <AuthenticRentOffice
        player={player}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={vi.fn()}
        campaign={mockCampaign}
      />
    );

    const payRentBtn = screen.getByTestId('btn-pay-rent');
    expect(payRentBtn.textContent).toContain('$325');
    expect(payRentBtn.textContent).not.toContain('$1300');
  });

  it('displays rent arrears when player owes rentDebt', () => {
    const player = getMockPlayer({ currentRentPrice: 325, rentDebt: 450 });
    render(
      <AuthenticRentOffice
        player={player}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={vi.fn()}
        campaign={mockCampaign}
      />
    );

    const payRentBtn = screen.getByTestId('btn-pay-rent');
    expect(payRentBtn.textContent).toContain('Pay Rent Arrears ($450)');
  });

  it('dispatches rent_transaction with exact rent amount when clicking Pay Rent', async () => {
    const onAction = vi.fn().mockResolvedValue({});
    const player = getMockPlayer({ currentRentPrice: 325, rentDebt: 0 });
    render(
      <AuthenticRentOffice
        player={player}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaign}
      />
    );

    fireEvent.click(screen.getByTestId('btn-pay-rent'));
    expect(onAction).toHaveBeenCalledWith({
      type: 'rent_transaction',
      amount: 325
    });
  });

  it('dispatches ask_rent_extension when clicking Ask For More Time and displays extensionYes', async () => {
    const onAction = vi.fn().mockResolvedValue({ key: 'action.rent.extensionApproved' });
    const player = getMockPlayer();
    render(
      <AuthenticRentOffice
        player={player}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaign}
      />
    );

    fireEvent.click(screen.getByTestId('btn-more-time'));
    expect(onAction).toHaveBeenCalledWith({
      type: 'ask_rent_extension'
    });

    const speechBubble = await screen.findByTestId('rent-office-speech-bubble');
    expect(speechBubble.textContent).toContain('Sure, you can pay your rent next week');
  });

  it('dispatches move_apartment when clicking Rent Security Apt', async () => {
    const onAction = vi.fn().mockResolvedValue({});
    const player = getMockPlayer({ currentHousingId: 'low_cost' });
    render(
      <AuthenticRentOffice
        player={player}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaign}
      />
    );

    fireEvent.click(screen.getByTestId('btn-rent-security'));
    expect(onAction).toHaveBeenCalledWith({
      type: 'move_apartment',
      housingId: 'security',
      cost: 475
    });
  });

  it('dispatches engine actions via keyboard shortcuts 1, 2, 4', () => {
    const onAction = vi.fn().mockResolvedValue({});
    const player = getMockPlayer({ currentHousingId: 'low_cost', currentRentPrice: 325 });
    render(
      <AuthenticRentOffice
        player={player}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaign}
      />
    );

    // Press '1' for pay rent
    fireEvent.keyDown(window, { key: '1' });
    expect(onAction).toHaveBeenCalledWith({
      type: 'rent_transaction',
      amount: 325
    });

    // Press '2' for ask extension
    fireEvent.keyDown(window, { key: '2' });
    expect(onAction).toHaveBeenCalledWith({
      type: 'ask_rent_extension'
    });

    // Press '4' for rent security apartment
    fireEvent.keyDown(window, { key: '4' });
    expect(onAction).toHaveBeenCalledWith({
      type: 'move_apartment',
      housingId: 'security',
      cost: 475
    });
  });
});
