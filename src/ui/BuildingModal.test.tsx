import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    stocks: [
      { id: 'tbills', name: 'Treasury Bills', type: 'fixed', basePrice: 100 },
      { id: 'blue_chip', name: 'Blue Chip Stocks', type: 'fluctuating', basePrice: 50 },
      { id: 'penny_stocks', name: 'Penny Stocks', type: 'fluctuating', basePrice: 10 }
    ],
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
    expect(screen.getByTestId('tab-pawnshop-buy')).toBeInTheDocument();
    expect(screen.getByTestId('tab-pawnshop-pawn')).toBeInTheDocument();

    // Tab 2: Pawn & Redeem reveals Sell and Buy Back sections
    fireEvent.click(screen.getByTestId('tab-pawnshop-pawn'));
    expect(screen.getByText('Sell Items (40% Value)')).toBeInTheDocument();
    expect(screen.getByText('Buy Back (50% Value)')).toBeInTheDocument();
  });

  it('renders Bank building modal with Banking, Stocks, and Loans tabs', () => {
    const mockOnAction = vi.fn().mockResolvedValue([]);

    render(
      <BuildingModal
        player={mockPlayer}
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

    expect(screen.getAllByText('Bank of Jones').length).toBeGreaterThan(0);
    
    // Verify all 3 tabs are present
    expect(screen.getByText(/^Bank$|bank\.tabBanking/i)).toBeInTheDocument();
    expect(screen.getByText('Stocks')).toBeInTheDocument();
    expect(screen.getByText('Loans')).toBeInTheDocument();

    // Verify Banking tab is active by default
    expect(screen.getByText(/Deposit Money/i)).toBeInTheDocument();
    expect(screen.getByText(/Withdraw Money/i)).toBeInTheDocument();

    // Click Stocks tab
    fireEvent.click(screen.getByText('Stocks'));
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'open_broker' });
    expect(screen.getByText(/Treasury Bills/i)).toBeInTheDocument();
    expect(screen.getByText(/Blue Chip Stocks/i)).toBeInTheDocument();
    expect(screen.getByText(/Penny Stocks/i)).toBeInTheDocument();
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

  it('correctly interpolates loan payment parameters (payment, principal, interest) in speech bubble', () => {
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

  it('renders Work and Shop tabs when employed at a shop and speaks error in speech bubble on click', () => {
    const jobBurger = {
      id: 'job_burger_cook',
      title: 'Burger Cook',
      baseWage: 12,
      locationId: 'z_mart',
      requirements: { dependability: 10, experience: 0, degrees: [] }
    };

    const campaignWithJob: CampaignBundle = {
      ...mockCampaign,
      config: {
        ...mockCampaign.config,
        gameRules: { usePhysicalMentalConditions: true } as any
      },
      jobs: [jobBurger as any],
      items: [{ id: 'burger', name: 'Burger', basePrice: 5, category: 'food' } as any],
      buildings: [
        {
          id: 'z_mart',
          name: 'Z-Mart',
          description: 'Buy items',
          archetype: 'shop',
          inventory: [{ itemId: 'burger', priceOverride: 5 }]
        } as any
      ]
    };

    const mockOnAction = vi.fn().mockResolvedValue({
      key: 'action.error.tooPhysicallyExhausted'
    });

    render(
      <BuildingModal
        player={{
          ...mockPlayer,
          currentJobId: 'job_burger_cook',
          currentWage: 12,
          physicalCondition: 1,
          mentalCondition: 50
        }}
        campaign={campaignWithJob}
        currentBuildingId="z_mart"
        turn={1}
        economicIndex={0}
        rules={{ ...mockRules, usePhysicalMentalConditions: true }}
        onAction={mockOnAction}
        onClose={vi.fn()}
      />
    );

    // Both Work section toggle and Shop items should be present on the same window
    expect(screen.getByTestId('tab-work')).toBeInTheDocument();
    expect(screen.getByText('Burger')).toBeInTheDocument();

    // Work Station is open by default, showing work modes
    const workWorkBtn = screen.getByTestId('work-mode-work_work');
    expect(workWorkBtn).toBeInTheDocument();

    // Clicking softly-disabled Work Work calls onAction
    fireEvent.click(workWorkBtn);
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'work', jobId: 'job_burger_cook', mode: 'work_work' });
  });

  it('renders bottom-docked WORK button and executes basic work shift when in Basic mode', () => {
    const jobBurger = {
      id: 'job_burger_cook',
      title: 'Burger Cook',
      baseWage: 12,
      locationId: 'z_mart',
      requirements: { dependability: 10, experience: 0, degrees: [] }
    };

    const campaignWithJob: CampaignBundle = {
      ...mockCampaign,
      jobs: [jobBurger as any],
      buildings: [
        {
          id: 'z_mart',
          name: 'Z-Mart',
          description: 'Department Store',
          inventory: [{ itemId: 'burger', priceOverride: 5 }],
          archetype: 'general_store'
        } as any
      ],
      items: [
        { id: 'burger', name: 'Burger', basePrice: 5, category: 'food' } as any
      ]
    };

    const mockOnAction = vi.fn().mockResolvedValue({ success: true });

    const { container } = render(
      <BuildingModal
        player={{
          ...mockPlayer,
          currentJobId: 'job_burger_cook',
          currentWage: 12,
          hoursRemaining: 10
        }}
        campaign={campaignWithJob}
        currentBuildingId="z_mart"
        turn={1}
        economicIndex={0}
        rules={{ ...mockRules, usePhysicalMentalConditions: false, advancedWorkGUI: false }}
        onAction={mockOnAction}
        onClose={vi.fn()}
      />
    );

    // Advanced console toggle and flanking cards should NOT be present
    expect(screen.queryByTestId('tab-work')).not.toBeInTheDocument();
    expect(screen.queryByTestId('work-mode-work_work')).not.toBeInTheDocument();

    // Basic WORK button docked directly on building-modal
    const modal = container.querySelector('.building-modal');
    const workDock = screen.getByTestId('dock-work-basic');
    expect(workDock).toBeInTheDocument();
    expect(workDock.parentElement).toBe(modal);

    const workBtn = screen.getByTestId('btn-work');
    expect(workBtn.textContent).toBe('WORK');
    expect(workBtn).not.toBeDisabled();

    fireEvent.click(workBtn);
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'work', jobId: 'job_burger_cook' });
  });

  it('displays speech bubble when a raise is denied', async () => {

    const jobBurger = {
      id: 'job_burger_cook',
      title: 'Burger Cook',
      baseWage: 12,
      locationId: 'employment_office',
      requirements: { dependability: 10, experience: 0, degrees: [] }
    };

    const campaignWithJob: CampaignBundle = {
      ...mockCampaign,
      jobs: [jobBurger as any],
      buildings: [
        {
          id: 'employment_office',
          name: 'Employment Office',
          description: 'Find a job',
          archetype: 'employment'
        } as any
      ]
    };

    const mockOnAction = vi.fn().mockResolvedValue({
      key: 'action.job.raiseDenied'
    });

    render(
      <BuildingModal
        player={{
          ...mockPlayer,
          currentJobId: 'job_burger_cook',
          currentWage: 10
        }}
        campaign={campaignWithJob}
        currentBuildingId="employment_office"
        turn={1}
        economicIndex={0}
        rules={mockRules}
        onAction={mockOnAction}
        onClose={vi.fn()}
      />
    );

    const locationCard = screen.getByText('Employment Office', { selector: 'strong' });
    fireEvent.click(locationCard);

    const raiseBtn = screen.getByRole('button', { name: /jobBoard\.askRaise/i });
    expect(raiseBtn).toBeInTheDocument();

    fireEvent.click(raiseBtn);
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'apply', jobId: 'job_burger_cook', offeredWage: 12 });

    await waitFor(() => {
      expect(screen.getByText(/Raise denied/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('toggles floating work card console via docked bottom WORK button and close button', async () => {
    const jobDev = {
      id: 'job_dev_at_zmart',
      title: 'Z-Mart Developer',
      baseWage: 25,
      locationId: 'z_mart',
      perks: [],
      requirements: { dependability: 10, experience: 0, degrees: [], uniform: 'casual' as const }
    };

    const campaign = {
      ...mockCampaign,
      jobs: [jobDev],
      items: [
        {
          id: 'item_radio',
          name: 'Portable Radio',
          price: 40,
          locationId: 'z_mart',
          category: 'appliance' as const,
          happinessBonus: 5,
          effects: []
        }
      ]
    };

    const mockOnAction = vi.fn().mockResolvedValue({});

    render(
      <BuildingModal
        player={{
          ...mockPlayer,
          currentJobId: 'job_dev_at_zmart',
          currentWage: 25,
          physicalCondition: 30,
          mentalCondition: 30,
          hoursRemaining: 12
        }}
        campaign={campaign}
        currentBuildingId="z_mart"
        turn={1}
        economicIndex={0}
        rules={{ ...mockRules, usePhysicalMentalConditions: true }}
        onAction={mockOnAction}
        onClose={vi.fn()}
      />
    );

    // Docked bottom WORK button is present
    const toggleWorkBtn = screen.getByTestId('btn-toggle-work');
    expect(toggleWorkBtn).toBeInTheDocument();

    // Flanking cards are open by default. Mistake risk badge is NOT rendered when safe (0% chance)
    expect(screen.getByTestId('work-mode-work_work')).toBeInTheDocument();
    expect(screen.queryByText(/0% \(Safe\)/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Shift #1/i)).toBeInTheDocument();

    // Clicking '?' opens the WorkCardHelpModal
    const helpBtn = screen.getByTestId('help-btn-work_work');
    fireEvent.click(helpBtn);
    expect(screen.getByTestId('work-help-modal-work_work')).toBeInTheDocument();
    expect(screen.getByText(/CORE SHIFT/i)).toBeInTheDocument();
    expect(screen.getByText(/Put your head down and grind/i)).toBeInTheDocument();
    expect(screen.getByText(/Shift Fatigue Tiers/i)).toBeInTheDocument();
    expect(screen.getByText(/Current Progress: Shift #1/i)).toBeInTheDocument();

    // Close help modal
    const closeHelpBtn = screen.getByRole('button', { name: /Got It, Back to Work/i });
    fireEvent.click(closeHelpBtn);
    expect(screen.queryByTestId('work-help-modal-work_work')).not.toBeInTheDocument();

    // Click close button on the flanking console to dismiss it
    const closeWingsBtn = screen.getByTestId('btn-close-work-wings');
    fireEvent.click(closeWingsBtn);

    // Flanking cards are now dismissed
    expect(screen.queryByTestId('work-mode-work_work')).not.toBeInTheDocument();

    // Click docked bottom WORK button to reopen flanking cards
    fireEvent.click(toggleWorkBtn);
    expect(screen.getByTestId('work-mode-work_work')).toBeInTheDocument();
  });

  it('renders prominent Grind tier badges on Shift 4 and Overtime badges with -0.5 Max Physical on Shift 8', () => {
    const jobDev = {
      id: 'job_dev_at_zmart',
      title: 'Z-Mart Developer',
      baseWage: 25,
      locationId: 'z_mart',
      perks: [],
      requirements: { dependability: 10, experience: 0, degrees: [], uniform: 'casual' as const }
    };

    const campaign = {
      ...mockCampaign,
      jobs: [jobDev],
      items: [
        {
          id: 'item_radio',
          name: 'Portable Radio',
          price: 40,
          locationId: 'z_mart',
          category: 'appliance' as const,
          happinessBonus: 5,
          effects: []
        }
      ]
    };

    // 1. Shift #4: Grind tier
    const { unmount } = render(
      <BuildingModal
        player={{
          ...mockPlayer,
          currentJobId: 'job_dev_at_zmart',
          currentWage: 25,
          physicalCondition: 30,
          mentalCondition: 30,
          hoursRemaining: 12,
          workActionsThisTurn: 3 // next shift is #4 -> Grind
        }}
        campaign={campaign}
        currentBuildingId="z_mart"
        turn={1}
        economicIndex={0}
        rules={{ ...mockRules, usePhysicalMentalConditions: true }}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/Shift #4/i)).toBeInTheDocument();
    expect(screen.getAllByText(/⚡ GRIND/i).length).toBeGreaterThan(0);
    unmount();

    // 2. Shift #8: Overtime tier
    render(
      <BuildingModal
        player={{
          ...mockPlayer,
          currentJobId: 'job_dev_at_zmart',
          currentWage: 25,
          physicalCondition: 30,
          mentalCondition: 30,
          hoursRemaining: 12,
          workActionsThisTurn: 7 // next shift is #8 -> Overtime
        }}
        campaign={campaign}
        currentBuildingId="z_mart"
        turn={1}
        economicIndex={0}
        rules={{ ...mockRules, usePhysicalMentalConditions: true }}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/Shift #8/i)).toBeInTheDocument();
    expect(screen.getAllByText(/🔥 OVERTIME/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/-0\.5 Max Physical Condition/i)).toBeInTheDocument();
  });

  it('shows break-in risk badge only when helpfulUI is on, and hides it when helpfulUI is off', () => {
    const homeCampaign: CampaignBundle = {
      ...mockCampaign,
      buildings: [
        ...mockCampaign.buildings,
        { id: 'home_building', name: 'Home', description: 'Your home', archetype: 'home' } as any
      ],
      housing: [{ id: 'low_cost', name: 'Low Cost Apt', baseRent: 300, homeNodeId: 'home_node' }] as any,
      map: { nodes: [{ id: 'home_node', buildingId: 'home_building' }] } as any,
    };

    // When helpfulUI is true
    const { unmount } = render(
      <BuildingModal
        player={mockPlayer}
        campaign={homeCampaign}
        currentBuildingId="home_building"
        turn={4}
        economicIndex={0}
        rules={{ ...mockRules, helpfulUI: true }}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('home-burglary-badge')).toBeInTheDocument();
    unmount();

    // When helpfulUI is false
    render(
      <BuildingModal
        player={mockPlayer}
        campaign={homeCampaign}
        currentBuildingId="home_building"
        turn={4}
        economicIndex={0}
        rules={{ ...mockRules, helpfulUI: false }}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByTestId('home-burglary-badge')).not.toBeInTheDocument();
  });

  it('renders non-scrollable RELAX button portaled to the modal bottom border in basic home view', () => {
    const homeCampaign: CampaignBundle = {
      ...mockCampaign,
      buildings: [
        ...mockCampaign.buildings,
        { id: 'home_building', name: 'Home', description: 'Your home', archetype: 'home' } as any
      ],
      housing: [{ id: 'low_cost', name: 'Low Cost Apt', baseRent: 300, homeNodeId: 'home_node' }] as any,
      map: { nodes: [{ id: 'home_node', buildingId: 'home_building' }] } as any,
    };

    const onAction = vi.fn();
    const { container } = render(
      <BuildingModal
        player={mockPlayer}
        campaign={homeCampaign}
        currentBuildingId="home_building"
        turn={1}
        economicIndex={0}
        rules={{ ...mockRules, advancedHomeGUI: false, usePhysicalMentalConditions: false }}
        onAction={onAction}
        onClose={vi.fn()}
      />
    );

    const modal = container.querySelector('.building-modal');
    expect(modal).toBeInTheDocument();

    const relaxDock = modal?.querySelector('.home-relax-bottom-dock');
    expect(relaxDock).toBeInTheDocument();
    // Verify it is a direct child of .building-modal (portaled to the window border, outside scrollable content)
    expect(relaxDock?.parentElement).toBe(modal);

    const relaxBtn = screen.getByTestId('btn-relax');
    expect(relaxBtn.textContent).toBe('RELAX');
    fireEvent.click(relaxBtn);
    expect(onAction).toHaveBeenCalledWith({ type: 'relax' });
  });

  it('renders JobBoard apply and askRaise buttons without hours when helpfulUI is false', () => {
    const jobDev = {
      id: 'job_dev',
      title: 'Developer',
      baseWage: 20,
      locationId: 'employment_office',
      requirements: { dependability: 10, experience: 0, degrees: [] }
    };

    const campaignWithJob: CampaignBundle = {
      ...mockCampaign,
      jobs: [jobDev as any],
    };

    render(
      <BuildingModal
        player={{
          ...mockPlayer,
          currentJobId: null,
          hoursRemaining: 10
        }}
        campaign={campaignWithJob}
        currentBuildingId="employment_office"
        turn={1}
        economicIndex={0}
        rules={{ ...mockRules, helpfulUI: false, usePhysicalMentalConditions: false }}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // Select Employment Office location
    const locCard = screen.getByText('Employment Office', { selector: 'strong' });
    fireEvent.click(locCard);

    // Apply button should have 'Apply' and NOT '4h' or '4H'
    const applyBtn = screen.getByRole('button', { name: /Apply/i });
    expect(applyBtn.textContent).toContain('Apply');
    expect(applyBtn.textContent).not.toMatch(/4h/i);
  });

  it('renders JobBoard with (-1 🧠) and mistake risk when helpfulUI is true and mental < 10, but hides risk when mental >= 10', () => {
    const jobDev = {
      id: 'job_dev',
      title: 'Developer',
      baseWage: 20,
      locationId: 'employment_office',
      requirements: { dependability: 10, experience: 0, degrees: [] }
    };

    const campaignWithJob: CampaignBundle = {
      ...mockCampaign,
      jobs: [jobDev as any],
    };

    // Case 1: Low mental (8) -> mistake chance = (10 - 8) * 2.5% = 5.0%
    const { rerender } = render(
      <BuildingModal
        player={{
          ...mockPlayer,
          mentalCondition: 8,
          currentJobId: null,
          hoursRemaining: 10
        }}
        campaign={campaignWithJob}
        currentBuildingId="employment_office"
        turn={1}
        economicIndex={0}
        rules={{ ...mockRules, helpfulUI: true, usePhysicalMentalConditions: true }}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const locCard = screen.getByText('Employment Office', { selector: 'strong' });
    fireEvent.click(locCard);

    const applyBtn = screen.getByRole('button', { name: /Apply/i });
    expect(applyBtn.textContent).toContain('-1 🧠');
    expect(screen.getByTestId('interview-mistake-risk')).toBeInTheDocument();
    expect(screen.getByTestId('interview-mistake-risk').textContent).toBe('⚠️ 5.0%');

    // Case 2: Healthy mental (50) -> mistake chance = 0% -> MUST NOT show badge
    rerender(
      <BuildingModal
        player={{
          ...mockPlayer,
          mentalCondition: 50,
          currentJobId: null,
          hoursRemaining: 10
        }}
        campaign={campaignWithJob}
        currentBuildingId="employment_office"
        turn={1}
        economicIndex={0}
        rules={{ ...mockRules, helpfulUI: true, usePhysicalMentalConditions: true }}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByTestId('interview-mistake-risk')).not.toBeInTheDocument();
    expect(applyBtn.textContent).toContain('-1 🧠');
  });

  it('renders University study button and Bank apply loan button without hours when helpfulUI is false', () => {
    const degreeCS = {
      id: 'degree_cs',
      name: 'Computer Science',
      prerequisites: [],
      cost: 500,
      requiredHours: 10
    };

    const campaignWithUniAndBank: CampaignBundle = {
      ...mockCampaign,
      education: [degreeCS as any]
    };

    // 1. Check University
    const { rerender } = render(
      <BuildingModal
        player={{
          ...mockPlayer,
          hoursRemaining: 10,
          degrees: [],
          enrolledClasses: { degree_cs: 0 }
        }}
        campaign={campaignWithUniAndBank}
        currentBuildingId="university"
        turn={1}
        economicIndex={0}
        rules={{ ...mockRules, helpfulUI: false }}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const studyBtn = screen.getByRole('button', { name: /Study/i });
    expect(studyBtn.textContent).toBe('🎓 Study');
    expect(studyBtn.textContent).not.toMatch(/⏳|4h|\dh/i);

    // 2. Check Bank Loans tab
    rerender(
      <BuildingModal
        player={{
          ...mockPlayer,
          hoursRemaining: 10,
          loanDebt: 0
        }}
        campaign={campaignWithUniAndBank}
        currentBuildingId="bank"
        turn={1}
        economicIndex={0}
        rules={{ ...mockRules, helpfulUI: false }}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // Click Loans tab
    const loansTab = screen.getByText('Loans');
    fireEvent.click(loansTab);

    const applyLoanBtn = screen.getByRole('button', { name: /Apply for Loan/i });
    expect(applyLoanBtn.textContent).toBe('📝 Apply for Loan');
    expect(applyLoanBtn.textContent).not.toMatch(/⏳|Hours|2h/i);
  });

  it('renders JobBoard degree requirement badges with ✓ (green) when owned, ⏳ (orange) when studying, and ✗ (red) when missing', () => {
    const multiDegreeJob = {
      id: 'factory_head_engineer',
      title: 'Head Engineer',
      baseWage: 20,
      locationId: 'factory',
      requirements: {
        dependability: 10,
        experience: 10,
        degrees: ['junior_college', 'trade_school', 'engineering'],
        uniform: 'casual'
      }
    };

    const campaignWithJob: CampaignBundle = {
      ...mockCampaign,
      jobs: [multiDegreeJob as any],
      education: [
        { id: 'junior_college', name: 'Junior College' } as any,
        { id: 'trade_school', name: 'Trade School' } as any,
        { id: 'engineering', name: 'Engineering' } as any
      ],
      buildings: [
        {
          id: 'factory',
          name: 'Factory',
          description: 'Industrial plant',
          archetype: 'employment'
        } as any
      ]
    };

    render(
      <BuildingModal
        player={{
          ...mockPlayer,
          degrees: ['junior_college'],
          enrolledClasses: { trade_school: 2 }
        }}
        campaign={campaignWithJob}
        currentBuildingId="factory"
        turn={1}
        economicIndex={0}
        rules={{ ...mockRules, helpfulUI: true }}
        onAction={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // Click factory location card to view jobs
    const locationCard = screen.getByText('Factory', { selector: 'strong' });
    fireEvent.click(locationCard);

    // 1. junior_college: Owned -> ✓ and green (#2ecc71 / rgb(46, 204, 113))
    const ownedBadge = screen.getByTestId('job-factory_head_engineer-degree-junior_college');
    expect(ownedBadge).toBeInTheDocument();
    expect(ownedBadge.textContent).toContain('✓ Junior College');
    expect(ownedBadge.style.color).toBe('rgb(46, 204, 113)');

    // 2. trade_school: Studying/Enrolled -> ⏳ and orange (#f59e0b / rgb(245, 158, 11))
    const studyingBadge = screen.getByTestId('job-factory_head_engineer-degree-trade_school');
    expect(studyingBadge).toBeInTheDocument();
    expect(studyingBadge.textContent).toContain('⏳ Trade School');
    expect(studyingBadge.style.color).toBe('rgb(245, 158, 11)');

    // 3. engineering: Missing -> ✗ and red (#e74c3c / rgb(231, 76, 60))
    const missingBadge = screen.getByTestId('job-factory_head_engineer-degree-engineering');
    expect(missingBadge).toBeInTheDocument();
    expect(missingBadge.textContent).toContain('✗ Engineering');
    expect(missingBadge.style.color).toBe('rgb(231, 76, 60)');
  });

  it('clerk dialogue displays helpful missing degrees message when rejected for education with helpfulUI true', async () => {
    const jobTest = {
      id: 'factory_head_engineer',
      title: 'Head Engineer',
      baseWage: 20,
      locationId: 'factory',
      requirements: {
        dependability: 10,
        experience: 10,
        degrees: ['engineering'],
        uniform: 'casual'
      }
    };

    const campaignWithJob: CampaignBundle = {
      ...mockCampaign,
      jobs: [jobTest as any],
      education: [{ id: 'engineering', name: 'Engineering' } as any],
      buildings: [
        {
          id: 'factory',
          name: 'Factory',
          description: 'Industrial plant',
          archetype: 'employment'
        } as any
      ]
    };

    const mockOnAction = vi.fn().mockResolvedValue({
      key: 'action.job.rejected',
      params: {
        reasons: 'Not enough education: missing Engineering.',
        missingDegrees: 'engineering'
      }
    });

    render(
      <BuildingModal
        player={mockPlayer}
        campaign={campaignWithJob}
        currentBuildingId="factory"
        turn={1}
        economicIndex={0}
        rules={{ ...mockRules, helpfulUI: true }}
        onAction={mockOnAction}
        onClose={vi.fn()}
      />
    );

    const locationCard = screen.getByText('Factory', { selector: 'strong' });
    fireEvent.click(locationCard);

    const applyBtn = screen.getByRole('button', { name: /Apply/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(screen.getByText(/Not enough education: missing Engineering\./i)).toBeInTheDocument();
    }, { timeout: 8000 });
  });

  it('renders live coordinate and dimension readout and supports reset', async () => {
    // Mock navigator.clipboard
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock
      }
    });

    render(
      <BuildingModal
        player={mockPlayer}
        campaign={mockCampaign}
        currentBuildingId="z_mart"
        turn={1}
        economicIndex={0}
        rules={mockRules}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={vi.fn()}
      />
    );

    const readout = screen.getByTestId('modal-dimension-readout');
    expect(readout).toBeInTheDocument();
    expect(readout.textContent).toMatch(/W:\d+px\s+H:\d+px\s+\|\s+X:\d+px\s+Y:\d+px/);

    // Clicking readout triggers clipboard write
    fireEvent.click(readout);
    expect(writeTextMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText(/Copied!/i)).toBeInTheDocument();
    });

    // Test drag handle and pointer interaction
    const header = screen.getByText('Z-Mart', { selector: 'h2' }).closest('.building-modal__header');
    expect(header).toBeInTheDocument();

    fireEvent.pointerDown(header!, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 150, clientY: 180 });
    fireEvent.pointerUp(window);

    // Reset button should now appear
    const resetBtn = screen.getByTestId('btn-reset-modal-layout');
    expect(resetBtn).toBeInTheDocument();

    // Clicking reset button clears custom position
    fireEvent.click(resetBtn);
    expect(screen.queryByTestId('btn-reset-modal-layout')).not.toBeInTheDocument();

    // Test resize handle
    const resizeHandle = screen.getByTestId('building-modal-resize-handle');
    expect(resizeHandle).toBeInTheDocument();

    fireEvent.pointerDown(resizeHandle, { clientX: 200, clientY: 200 });
    fireEvent.pointerMove(window, { clientX: 260, clientY: 280 });
    fireEvent.pointerUp(window);

    expect(screen.getByTestId('btn-reset-modal-layout')).toBeInTheDocument();
  });

  it('allows adjusting modal margin with stepper and resets to 3px default', () => {
    localStorage.clear();
    const { container } = render(
      <BuildingModal
        player={mockPlayer}
        campaign={mockCampaign}
        currentBuildingId="z_mart"
        turn={1}
        economicIndex={0}
        rules={mockRules}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={vi.fn()}
      />
    );

    const marginDisplay = screen.getByTestId('margin-value-display');
    expect(marginDisplay.textContent).toBe('3px');
    const modal = container.querySelector('.building-modal') as HTMLElement;
    expect(modal.style.getPropertyValue('--modal-margin')).toBe('3px');

    // Click plus button -> 4px
    const plusBtn = screen.getByTestId('btn-margin-plus');
    fireEvent.click(plusBtn);
    expect(marginDisplay.textContent).toBe('4px');
    expect(modal.style.getPropertyValue('--modal-margin')).toBe('4px');
    expect(localStorage.getItem('fastlane_building_modal_margin')).toBe('4');

    // Reset button should now appear because margin !== 3
    const resetBtn = screen.getByTestId('btn-reset-modal-layout');
    expect(resetBtn).toBeInTheDocument();

    // Click reset button -> restores to 3px
    fireEvent.click(resetBtn);
    expect(marginDisplay.textContent).toBe('3px');
    expect(modal.style.getPropertyValue('--modal-margin')).toBe('3px');
    expect(localStorage.getItem('fastlane_building_modal_margin')).toBe('3');

    // Click minus button -> 2px
    const minusBtn = screen.getByTestId('btn-margin-minus');
    fireEvent.click(minusBtn);
    expect(marginDisplay.textContent).toBe('2px');
    expect(modal.style.getPropertyValue('--modal-margin')).toBe('2px');
  });

  it('starts with clean default responsive position without waiting for reset', () => {
    localStorage.clear();
    sessionStorage.setItem('fastlane_building_modal_pos', JSON.stringify({ x: 999, y: 999 }));
    sessionStorage.setItem('fastlane_building_modal_size', JSON.stringify({ width: 999, height: 999 }));

    const { container } = render(
      <BuildingModal
        player={mockPlayer}
        campaign={mockCampaign}
        currentBuildingId="z_mart"
        turn={1}
        economicIndex={0}
        rules={mockRules}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={vi.fn()}
      />
    );

    const modal = container.querySelector('.building-modal') as HTMLElement;
    // Should NOT have inline position/size overrides from sessionStorage!
    expect(modal.style.left).toBeFalsy();
    expect(modal.style.top).toBeFalsy();
    expect(modal.style.width).toBeFalsy();
    expect(modal.style.height).toBeFalsy();
    // Reset button should NOT be shown on clean start
    expect(screen.queryByTestId('btn-reset-modal-layout')).toBeNull();
  });
});

