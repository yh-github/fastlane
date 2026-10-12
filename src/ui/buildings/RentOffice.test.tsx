import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RentOffice } from "./RentOffice";

describe("RentOffice", () => {
  it('RentOffice renders housing options and rent payment controls', () => {
    const mockPlayer = {
      id: 'p1',
      money: 1000,
      hoursRemaining: 10,
      currentHousingId: 'low_cost',
      currentRentPrice: 300,
      rentPaidUntilWeek: 4,
      rentDebt: 0,
      turnFlags: { rentPaidThisTurn: false },
      inventory: { appliances: [], books: [] }
    } as any;

    const mockCampaign = {
      housing: [
        { id: 'low_cost', name: 'Low Cost Housing', baseRent: 300, isRobberyImmune: false },
        { id: 'security', name: 'Security Apartments', baseRent: 800, isRobberyImmune: true }
      ],
      config: {
        timeRules: { moveApartmentCost: 4 }
      }
    } as any;

    const mockOnAction = vi.fn();

    render(
      <RentOffice
        player={mockPlayer}
        onAction={mockOnAction}
        campaign={mockCampaign}
        turn={4}
        economicIndex={0}
      />
    );

    expect(screen.getByText(/Security Apartments/i)).toBeInTheDocument();
  });

  it('RentOffice renders dynamic upcoming week when closed', () => {
    const mockPlayer = {
      id: 'p1',
      money: 1000,
      hoursRemaining: 10,
      currentHousingId: 'low_cost',
      currentRentPrice: 300,
      rentPaidUntilWeek: 8,
      rentDebt: 0,
      turnFlags: { rentPaidThisTurn: false },
      inventory: { appliances: [], books: [] }
    } as any;

    const mockCampaign = {
      housing: [
        { id: 'low_cost', name: 'Low Cost Housing', baseRent: 300, isRobberyImmune: false }
      ],
      jobs: [],
      config: { timeRules: { moveApartmentCost: 4 } }
    } as any;

    render(
      <RentOffice
        player={mockPlayer}
        onAction={vi.fn()}
        campaign={mockCampaign}
        turn={5}
        economicIndex={0}
      />
    );

    expect(screen.getByText(/Come back during Week 8/i)).toBeInTheDocument();
  });

  it('renders renegotiate button with standard icons (⏳ 1h, -2 🧠)', () => {
    const mockPlayer = {
      id: 'p1',
      money: 1000,
      hoursRemaining: 10,
      currentHousingId: 'low_cost',
      currentRentPrice: 350,
      rentPaidUntilWeek: 4,
      rentPaymentsAtCurrentRate: 1,
      rentPaymentsMade: 2,
      rentDebt: 0,
      turnFlags: { rentPaidThisTurn: false },
      inventory: { appliances: [], books: [] }
    } as any;

    const mockCampaign = {
      housing: [
        { id: 'low_cost', name: 'Low Cost Housing', baseRent: 300, isRobberyImmune: false }
      ],
      jobs: [],
      config: { timeRules: { moveApartmentCost: 4 } }
    } as any;

    render(
      <RentOffice
        player={mockPlayer}
        onAction={vi.fn()}
        campaign={mockCampaign}
        rules={{ usePhysicalMentalConditions: true } as any}
        turn={4}
        economicIndex={-20}
      />
    );

    const renegotiateBtn = screen.getByTestId('btn-renegotiate-rent');
    expect(renegotiateBtn).toBeInTheDocument();
    expect(renegotiateBtn.textContent).toContain('(⏳ 1h, -2 🧠)');
  });
});
