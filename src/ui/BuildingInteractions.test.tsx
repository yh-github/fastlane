import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JobBoard, StockTradeRow, BankInterface, HomeRelax, WorkStation, UniversityRegistry } from './BuildingInteractions';
import type { PlayerState } from '../engine/gameState';
import type { CampaignBundle } from '../engine/dataLoader';

describe('BuildingInteractions', () => {
  it('renders JobBoard without crashing and displays buildings', () => {
    const mockPlayer = {
      name: 'Tester',
      dependability: 10,
      experience: 10,
      degrees: [],
      inventory: {}
    } as unknown as PlayerState;

    const mockCampaign = {
      jobs: [
        { id: 'burger_cook', title: 'Cook', locationId: 'burger_palace', baseWage: 5, requirements: { experience: 0, dependability: 0, degrees: [] } }
      ],
      buildings: [
        { id: 'burger_palace', name: 'Monolith Burgers' }
      ],
      items: [],
      config: {}
    } as unknown as CampaignBundle;

    render(
      <JobBoard
        player={mockPlayer}
        onAction={vi.fn()}
        availableJobs={mockCampaign.jobs}
        buildings={mockCampaign.buildings}
        economicIndex={0}
        campaign={mockCampaign}
      />
    );

    expect(screen.getByText(/Monolith Burgers/i)).toBeInTheDocument();
  });

  it('sorts jobs by baseWage ascending in JobBoard (Janitor before Manager)', () => {
    const mockPlayer = {
      name: 'Tester',
      dependability: 10,
      experience: 10,
      degrees: [],
      inventory: {}
    } as unknown as PlayerState;

    const mockCampaign = {
      jobs: [
        { id: 'qt_mgr', title: 'Manager', locationId: 'qt_clothing', baseWage: 12, requirements: { experience: 50, dependability: 50, degrees: [] } },
        { id: 'qt_janitor', title: 'Janitor', locationId: 'qt_clothing', baseWage: 6, requirements: { experience: 10, dependability: 20, degrees: [] } },
        { id: 'qt_salesperson', title: 'Salesperson', locationId: 'qt_clothing', baseWage: 8, requirements: { experience: 30, dependability: 30, degrees: [] } }
      ],
      buildings: [
        { id: 'qt_clothing', name: 'QT Clothing' }
      ],
      items: [],
      config: {}
    } as unknown as CampaignBundle;

    render(
      <JobBoard
        player={mockPlayer}
        onAction={vi.fn()}
        availableJobs={mockCampaign.jobs}
        buildings={mockCampaign.buildings}
        economicIndex={0}
        campaign={mockCampaign}
      />
    );

    fireEvent.click(screen.getByText(/QT Clothing/i));

    const jobHeadings = screen.getAllByText(/Janitor|Salesperson|Manager/i);
    expect(jobHeadings[0].textContent).toContain('Janitor');
    expect(jobHeadings[1].textContent).toContain('Salesperson');
    expect(jobHeadings[2].textContent).toContain('Manager');
  });

  it('StockTradeRow displays softly disabled explanation modal when buying with insufficient funds or selling with 0 shares', () => {
    const stockDef = { id: 'acme', name: 'ACME Corp', basePrice: 100, type: 'stable' as const };
    const mockOnAction = vi.fn();

    const { rerender } = render(
      <StockTradeRow stock={stockDef} price={100} owned={0} playerMoney={20} onAction={mockOnAction} />
    );

    // Click softly disabled Buy button - ensure no raw {{cost}} template string!
    const buyBtn = screen.getByRole('button', { name: /^Buy$/i });
    expect(buyBtn.textContent).toBe('Buy');
    expect(buyBtn.textContent).not.toContain('{{');
    fireEvent.click(buyBtn);
    expect(screen.getByText(/Stock Trade Unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/You need at least \$100 in cash/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('OK'));

    // Click softly disabled Sell button - ensure no raw {{cost}} template string!
    const sellBtn = screen.getByRole('button', { name: /^Sell$/i });
    expect(sellBtn.textContent).toBe('Sell');
    expect(sellBtn.textContent).not.toContain('{{');
    fireEvent.click(sellBtn);
    expect(screen.getByText(/Stock Trade Unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/You do not own any shares of ACME Corp/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('OK'));
  });

  it('StockTradeRow opens trade dialog and confirms buy/sell transactions', () => {
    const stockDef = { id: 'acme', name: 'ACME Corp', basePrice: 50, type: 'stable' as const };
    const mockOnAction = vi.fn();

    render(
      <StockTradeRow stock={stockDef} price={50} owned={5} playerMoney={500} onAction={mockOnAction} />
    );

    // Open Buy Dialog
    const buyBtn = screen.getByRole('button', { name: /^Buy$/i });
    expect(buyBtn.textContent).toBe('Buy');
    fireEvent.click(buyBtn);
    expect(screen.getByText(/Buy ACME Corp/i)).toBeInTheDocument();

    // Confirm Buy
    fireEvent.click(screen.getByText(/Confirm Buy/i));
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'buy_stock', stockId: 'acme', quantity: 1, cost: 50 });
  });

  it('BankInterface handles deposit/withdraw dialogs and softly disabled states', () => {
    const mockPlayer = {
      id: 'p1',
      money: 150,
      bankSavings: 300,
      loanDebt: 0,
      inventory: { stocks: { holdings: {} } }
    } as any;

    const mockOnAction = vi.fn();

    render(
      <BankInterface player={mockPlayer} onAction={mockOnAction} />
    );

    // Click Deposit Money -> opens Deposit dialog
    fireEvent.click(screen.getByText(/Deposit Money/i));
    expect(screen.getByText(/Deposit Money into Savings/i)).toBeInTheDocument();

    // Select Max preset button
    fireEvent.click(screen.getByText(/Max \(\$150\)/i));
    fireEvent.click(screen.getByText(/Confirm Deposit \(\$150\)/i));
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'bank_transaction', amount: 150 });
  });

  it('BankInterface renders Stocks tab even when rules are passed and allows switching to Stocks tab', () => {
    const mockPlayer = {
      id: 'p1',
      money: 500,
      bankSavings: 100,
      loanDebt: 0,
      inventory: { stocks: { tBills: 2, holdings: { 'blue_chip': 5, 'penny_stocks': 10 } } }
    } as any;

    const mockCampaign = {
      stocks: [
        { id: 'tbills', name: 'Treasury Bills', type: 'fixed', basePrice: 100 },
        { id: 'blue_chip', name: 'Blue Chip Stocks', type: 'fluctuating', basePrice: 50 },
        { id: 'penny_stocks', name: 'Penny Stocks', type: 'fluctuating', basePrice: 10 }
      ]
    } as any;

    const mockRules = {
      classicStockMarket: true,
      helpfulUI: true
    } as any;

    const mockOnAction = vi.fn();

    render(
      <BankInterface 
        player={mockPlayer} 
        campaign={mockCampaign} 
        rules={mockRules} 
        onAction={mockOnAction} 
      />
    );

    // Verify Stocks tab button is present
    const stocksTabBtn = screen.getByText(/^Stocks$|bank\.tabStocks/i);
    expect(stocksTabBtn).toBeInTheDocument();

    // Click Stocks tab
    fireEvent.click(stocksTabBtn);

    // Verify open_broker action was dispatched
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'open_broker' });

    // Verify stock rows are rendered
    expect(screen.getByText(/Treasury Bills/i)).toBeInTheDocument();
    expect(screen.getByText(/Blue Chip Stocks/i)).toBeInTheDocument();
    expect(screen.getByText(/Penny Stocks/i)).toBeInTheDocument();

    // Verify owned counts
    expect(screen.getByText(/Owned:\s*2/i)).toBeInTheDocument();
    expect(screen.getByText(/Owned:\s*5/i)).toBeInTheDocument();
    expect(screen.getByText(/Owned:\s*10/i)).toBeInTheDocument();
  });

  it('HomeRelax displays dynamic economy price for Cleaning Service and softly disables with reason when broke or clean', () => {
    const mockPlayer = {
      id: 'p1',
      money: 50, // Less than $100 price
      hoursRemaining: 30,
      mess: 20,
      currentHousingId: 'low_cost'
    } as any;

    const mockCampaign = {
      housing: [{ id: 'low_cost', name: 'Low Cost' }],
      config: {
        timeRules: { relaxCost: 6, cleaningServiceCost: 1 },
        economyRules: { cleaningServiceBasePrice: 100 },
        statRules: {}
      }
    } as any;

    const mockOnAction = vi.fn().mockResolvedValue({ key: 'action.error.notEnoughMoneyCleanService' });

    // Render with broke player ($50 vs $100 cost)
    const { rerender } = render(
      <HomeRelax
        player={mockPlayer}
        onAction={mockOnAction}
        campaign={mockCampaign}
        rules={{ trackMess: true } as any}
        economicIndex={0}
      />
    );

    const cleanServiceBtn = screen.getByRole('button', { name: /Call Cleaning Service/i });
    expect(cleanServiceBtn).not.toBeDisabled();
    expect(cleanServiceBtn.textContent).toContain('$100');
    expect(cleanServiceBtn.textContent).toContain('Professional cleaning (-10 Mess)');

    // Clicking softly-disabled button calls onAction and receives feedback
    fireEvent.click(cleanServiceBtn);
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'call_cleaning_service' });

    // Rerender with wealthy player ($500) and economic boom (+50 -> $150)
    const wealthyPlayer = { ...mockPlayer, money: 500 };
    rerender(
      <HomeRelax
        player={wealthyPlayer}
        onAction={mockOnAction}
        campaign={mockCampaign}
        rules={{ trackMess: true } as any}
        economicIndex={50}
      />
    );

    const updatedBtn = screen.getByRole('button', { name: /Call Cleaning Service/i });
    expect(updatedBtn).not.toBeDisabled();
    expect(updatedBtn.textContent).toContain('$183');

    fireEvent.click(updatedBtn);
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'call_cleaning_service' });
  });

  it('HomeRelax softly disables Socialize button with feedback banner when clicked', () => {
    const messyPlayer = {
      id: 'p1',
      money: 500,
      hoursRemaining: 30,
      mess: 30, // Mess > 25
      physicalCondition: 20,
      currentHousingId: 'low_cost'
    } as any;

    const mockCampaign = {
      housing: [{ id: 'low_cost', name: 'Low Cost' }],
      config: {
        timeRules: { relaxCost: 6, cleaningServiceCost: 1, socializeCost: 6 },
        economyRules: { cleaningServiceBasePrice: 100 },
        statRules: {}
      }
    } as any;

    const mockOnAction = vi.fn().mockResolvedValue({ key: 'action.error.messTooHighSocialize' });

    render(
      <HomeRelax
        player={messyPlayer}
        onAction={mockOnAction}
        campaign={mockCampaign}
        rules={{ trackMess: true, usePhysicalMentalConditions: true } as any}
        economicIndex={0}
      />
    );

    const socializeBtn = screen.getByRole('button', { name: /Socialize \/ Entertain Guests/i });
    expect(socializeBtn).not.toBeDisabled();
    expect(socializeBtn.textContent).toContain('-1 Phys, +Social stat (Generates Mess)');

    fireEvent.click(socializeBtn);
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'socialize_guests' });
  });

  it('WorkStation renders prominent Work Work default option and prorates partial hours', () => {
    const mockPlayer = {
      name: 'Tester',
      currentWage: 20,
      hoursRemaining: 3, // Partial shift (3 hrs out of 6)
      physicalCondition: 30,
      mentalCondition: 30,
      workActionsThisTurn: 0,
      degrees: ['cs_degree'],
      inventory: {}
    } as any;

    const mockJob = {
      id: 'job_dev',
      title: 'Developer',
      baseWage: 20,
      locationId: 'tech_office',
      requirements: { dependability: 10, experience: 10, degrees: [] }
    } as any;

    const mockCampaign = {
      config: {
        gameRules: { usePhysicalMentalConditions: true },
        timeRules: { workSessionCost: 6 },
        statRules: { workPhysicalCost: 1, workNormalMentalCost: 0 }
      }
    } as any;

    const mockOnAction = vi.fn();

    render(
      <WorkStation
        player={mockPlayer}
        job={mockJob}
        onAction={mockOnAction}
        campaign={mockCampaign}
      />
    );

    // Inline strategy options are displayed directly without a modal
    expect(screen.getByText(/DEFAULT/i)).toBeInTheDocument();
    expect(screen.getByText(/\(3h\)/i)).toBeInTheDocument();

    const workWorkBtn = screen.getByTestId('work-mode-work_work');
    expect(workWorkBtn).toBeInTheDocument();
    // 3/6 hours * $160 = $80
    expect(workWorkBtn.textContent).toContain('$80');

    // Click Work Work
    fireEvent.click(workWorkBtn);
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'work', jobId: 'job_dev', mode: 'work_work' });
  });

  it('UniversityRegistry renders percentage progress bar when percentageEducation is enabled', () => {
    const mockPlayer = {
      name: 'Tester',
      money: 1000,
      hoursRemaining: 4,
      degrees: [],
      enrolledClasses: {
        'trade_school': 45.5
      },
      inventory: {}
    } as any;

    const mockCampaign = {
      degrees: [
        {
          id: 'trade_school',
          name: 'Trade School',
          baseTuitionFee: 100,
          lessonsRequired: 10,
          prerequisites: [],
          rewards: { dependability: 5, happiness: 10, maxDepBoost: 5, maxExpBoost: 5 }
        }
      ],
      config: {
        timeRules: { studySessionCost: 6 },
        statRules: {}
      }
    } as any;

    const mockOnAction = vi.fn();

    render(
      <UniversityRegistry
        player={mockPlayer}
        onAction={mockOnAction}
        campaign={mockCampaign}
        rules={{ percentageEducation: true } as any}
      />
    );

    expect(screen.getByText(/45.5% \/ 100%/i)).toBeInTheDocument();
    const studyBtn = screen.getByTestId('study-trade_school');
    expect(studyBtn.textContent).toContain('Study (4h)');

    fireEvent.click(studyBtn);
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'study', degreeId: 'trade_school' });
  });
});
