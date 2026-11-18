import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BankInterface, StockTradeRow } from "./BankInterface";

describe("BankInterface", () => {
  it('StockTradeRow displays softly disabled explanation modal when buying with insufficient funds or selling with 0 shares', () => {
    const stockDef = { id: 'acme', name: 'ACME Corp', basePrice: 100, type: 'fixed' as const };
    const mockOnAction = vi.fn();

    render(
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
    const stockDef = { id: 'acme', name: 'ACME Corp', basePrice: 50, type: 'fixed' as const };
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

    // Click Deposit -> opens Deposit dialog
    fireEvent.click(screen.getByRole('button', { name: /deposit/i }));
    expect(screen.getByText(/Deposit Money into Savings/i)).toBeInTheDocument();

    // Select Max preset button
    fireEvent.click(screen.getByText(/Max.*150/i));
    fireEvent.click(screen.getByText(/Confirm Deposit.*150/i));
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

  it('BankInterface Loans tab displays helpfulUI pre-approval chance, likely amount, and metrics breakdown', () => {
    const mockOnAction = vi.fn();

    // 1. Unemployed player -> 0% approval chance, Refused
    const unemployedPlayer = {
      id: 'p1',
      money: 100,
      bankSavings: 100,
      currentJobId: null,
      currentWage: 0,
      loanDebt: 0,
      timesDefaulted: 0,
      loanPaymentDeadline: 0,
    } as any;

    const { rerender } = render(
      <BankInterface 
        player={unemployedPlayer} 
        rules={{ helpfulUI: true } as any} 
        onAction={mockOnAction} 
      />
    );

    // Switch to Loans tab
    fireEvent.click(screen.getByText(/^Loans$|bank\.tabLoans/i));

    expect(screen.getByTestId('helpful-loan-assessment')).toBeInTheDocument();
    expect(screen.getByText(/Approval Chance:\s*0%\s*\(Refused\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Unemployed/i)).toBeInTheDocument();
    expect(screen.getByText(/Apply for Loan \(Refused\)/i)).toBeInTheDocument();

    // 2. Employed player with good wage -> 100% approval chance, shows calculated amount
    const employedPlayer = {
      id: 'p1',
      money: 500,
      bankSavings: 500,
      currentJobId: 'cook',
      currentWage: 10,
      loanDebt: 0,
      timesDefaulted: 0,
      loanPaymentDeadline: 0,
    } as any;

    rerender(
      <BankInterface 
        player={employedPlayer} 
        rules={{ helpfulUI: true } as any} 
        onAction={mockOnAction} 
      />
    );

    expect(screen.getByText(/Approval Chance:\s*100%\s*\(Approved\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Likely Loan:\s*\$600/i)).toBeInTheDocument();
    expect(screen.getByText(/Apply for Loan \(\+\$600\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Wage:\s*\$10\/hr/i)).toBeInTheDocument();

    // 3. Player with overdue loan debt -> displays overdue indicator
    const delinquentPlayer = {
      id: 'p1',
      money: 200,
      bankSavings: 0,
      currentJobId: 'cook',
      currentWage: 10,
      loanDebt: 300,
      timesDefaulted: 1,
      loanPaymentDeadline: 4,
    } as any;

    rerender(
      <BankInterface 
        player={delinquentPlayer} 
        turn={5}
        rules={{ helpfulUI: true } as any} 
        onAction={mockOnAction} 
      />
    );

    expect(screen.getByText(/\(OVERDUE\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Account in default/i)).toBeInTheDocument();
  });

  it('StockTradeRow dialog includes Max button for both buying max affordable shares and selling max owned shares', () => {
    const stockDef = { id: 'acme', name: 'ACME Corp', basePrice: 40, type: 'fixed' as const };
    const mockOnAction = vi.fn();

    render(
      <StockTradeRow stock={stockDef} price={40} owned={7} playerMoney={250} onAction={mockOnAction} />
    );

    // 1. Buy Max: floor(250 / 40) = 6 shares ($240)
    fireEvent.click(screen.getByRole('button', { name: /^Buy$/i }));
    const buyMaxBtn = screen.getByTestId('btn-stock-max');
    expect(buyMaxBtn).toHaveTextContent('Max (6)');
    fireEvent.click(buyMaxBtn);
    fireEvent.click(screen.getByText(/Confirm Buy \(\$240\)/i));
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'buy_stock', stockId: 'acme', quantity: 6, cost: 240 });

    // 2. Sell Max: 7 owned shares ($280)
    fireEvent.click(screen.getByRole('button', { name: /^Sell$/i }));
    const sellMaxBtn = screen.getByTestId('btn-stock-max');
    expect(sellMaxBtn).toHaveTextContent('Max (7)');
    fireEvent.click(sellMaxBtn);
    fireEvent.click(screen.getByText(/Confirm Sell \(\+\$280\)/i));
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'sell_stock', stockId: 'acme', quantity: 7, revenue: 280 });
  });

  it('helpfulUI Loans tab shows computed Advanced minimum payment and Custom / Pay Full dialog', () => {
    const mockOnAction = vi.fn();
    const player = {
      id: 'p1',
      money: 800,
      bankSavings: 0,
      currentJobId: 'cook',
      currentWage: 15,
      loanDebt: 450,
      timesDefaulted: 0,
      loanPaymentDeadline: 8,
      turnFlags: { loanPaidThisTurn: false },
      inventory: { stocks: { holdings: {} } }
    } as any;

    render(
      <BankInterface
        player={player}
        activeTab="loans"
        rules={{ helpfulUI: true, versionClass: 'advanced' } as any}
        onAction={mockOnAction}
      />
    );

    // Advanced min on $450 debt: 20% = $90
    expect(screen.getByText(/Min Due to Count:\s*\$90\/cycle/i)).toBeInTheDocument();

    // Open Custom / Pay Full dialog
    fireEvent.click(screen.getByTestId('btn-loan-custom-pay'));
    expect(screen.getByTestId('loan-payment-dialog')).toBeInTheDocument();
    expect(screen.getByText(/Minimum Required to Satisfy Billing Cycle:/i)).toBeInTheDocument();

    // Click Pay Full ($500 = $450 principal + $50 fee)
    const fullBtn = screen.getByTestId('btn-loan-preset-full');
    fireEvent.click(fullBtn);
    fireEvent.click(screen.getByTestId('btn-loan-confirm'));

    expect(mockOnAction).toHaveBeenCalledWith({ type: 'pay_loan', amount: 500 });
  });

});
