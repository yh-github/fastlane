import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BuildingModal } from './BuildingModal';
import type { PlayerState } from '../engine/gameState';
import type { CampaignBundle } from '../engine/dataLoader';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.defaultValue) return options.defaultValue;
      return key;
    }
  }),
}));

describe('BuildingModal Component', () => {
  const mockPlayer: PlayerState = {
    id: 'p1',
    name: 'Player 1',
    isAi: false,
    money: 100,
    bankSavings: 50,
    loanDebt: 0,
    rentDebt: 0,
    timesDefaulted: 0,
    loanPaymentDeadline: 0,
    happiness: 50,
    relaxation: 50,
    dependability: 50,
    experience: 10,
    degreeExpBoost: 0,
    degreeDepBoost: 0,
    degrees: [],
    enrolledClasses: {},
    raisesAtCurrentJob: 0,
    rentExtensionsReceived: 0,
    inventory: {
      casualClothesWeeks: 1,
      dressClothesWeeks: 0,
      businessClothesWeeks: 0,
      selectedClothes: 'casual',
      appliances: [{ id: 'tv', purchasePrice: 200, purchaseSource: 'z_mart' }],
      freshFoodUnits: 0,
      fastFoodItems: [],
      lotteryTickets: 0,
      pawnedItems: [],
      stocks: { tBills: 0, holdings: {} },
      books: [],
      tickets: { baseball: 0, theatre: 0, concert: 0 }
    },
    turnFlags: {} as any,
    turnEvents: [],
    activeEffects: {},
    position: 'node1',
    hoursRemaining: 50,
    currentHousingId: 'low_cost',
    currentRentPrice: 300,
    rentPaidUntilWeek: 4,
    currentJobId: null,
    currentWage: 0,
    goalAllotment: { wealth: 25, happiness: 25, education: 25, career: 25 },
    hasWon: false,
    rentExtensionsDeniedPermanently: false,
    rentExtensionActive: false,
    nakedTurns: 0,
    newspaperHeadline: null
  };

  const mockCampaign: CampaignBundle = {
    config: { timeRules: { hoursPerTurn: 50, jobApplicationCost: 4, workSessionCost: 6, relaxCost: 6, studySessionCost: 6, loanCost: 2 } } as any,
    items: [],
    housing: [{ id: 'low_cost', name: 'Low Cost Apt', baseRent: 300, homeNodeId: 'node1' }] as any,
    jobs: [],
    education: [],
    buildings: [
      { id: 'pawn_shop', name: 'Pawn Shop', description: 'Buy and sell goods', archetype: 'pawnshop' },
      { id: 'employment_office', name: 'Employment Office', description: 'Find a job', archetype: 'employment' },
      { id: 'z_mart', name: 'Z-Mart', description: 'Buy items', archetype: 'shop' },
      { id: 'bank', name: 'Bank of Jones', description: 'Save and borrow', archetype: 'bank' },
      { id: 'university', name: 'University', description: 'Study and take classes', archetype: 'education' },
      { id: 'apartment_complex', name: 'Rent Office', description: 'Pay rent', archetype: 'housing' },
    ] as any,
    map: { nodes: [{ id: 'node1', buildingId: 'apartment_complex' }] } as any,
    events: [],
    stocks: [],
    messages: {} as any,
    weekends: [],
    synergies: []
  } as any;

  const mockRules = {
    helpfulUI: true,
    showItemImages: false
  } as any;

  it('renders PawnShop building modal without crashing', () => {
    render(
      <BuildingModal
        player={mockPlayer}
        campaign={mockCampaign}
        currentBuildingId="pawn_shop"
        turn={1}
        economicIndex={0}
        rules={mockRules}
        pawnShopItemsForSale={[]}
        onAction={vi.fn().mockResolvedValue([])}
        onClose={vi.fn()}
      />
    );

    expect(screen.getAllByText('Pawn Shop').length).toBeGreaterThan(0);
    expect(screen.getByText('Sell Items (40% Value)')).toBeInTheDocument();
    expect(screen.getByText('Buy Back (50% Value)')).toBeInTheDocument();
  });

  it('renders Bank building modal without crashing', () => {
    render(
      <BuildingModal
        player={mockPlayer}
        campaign={mockCampaign}
        currentBuildingId="bank"
        turn={1}
        economicIndex={0}
        rules={mockRules}
        pawnShopItemsForSale={[]}
        onAction={vi.fn().mockResolvedValue([])}
        onClose={vi.fn()}
      />
    );

    expect(screen.getAllByText('Bank of Jones').length).toBeGreaterThan(0);
  });

  it('renders Employment Office building modal without crashing', () => {
    render(
      <BuildingModal
        player={mockPlayer}
        campaign={mockCampaign}
        currentBuildingId="employment_office"
        turn={1}
        economicIndex={0}
        rules={mockRules}
        pawnShopItemsForSale={[]}
        onAction={vi.fn().mockResolvedValue([])}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Employment Office')).toBeInTheDocument();
  });

  it('correctly interpolates loan payment parameters (payment, principal, interest) in speech bubble', async () => {
    const { fireEvent } = await import('@testing-library/react');

    const mockOnAction = vi.fn().mockResolvedValue({
      key: 'action.loan.paidInstallment',
      params: { payment: 50, principal: 45, interest: 5 }
    });

    render(
      <BuildingModal
        player={{ ...mockPlayer, loanDebt: 500 }}
        campaign={mockCampaign}
        currentBuildingId="bank"
        turn={1}
        economicIndex={0}
        rules={mockRules}
        pawnShopItemsForSale={[]}
        onAction={mockOnAction}
        onClose={vi.fn()}
      />
    );

    // Switch to loans tab and click make payment
    fireEvent.click(screen.getByText('Loans'));
    const payBtn = screen.getByText(/Make Loan Payment/i);
    fireEvent.click(payBtn);

    expect(mockOnAction).toHaveBeenCalledWith({ type: 'pay_loan' });
  });
});
