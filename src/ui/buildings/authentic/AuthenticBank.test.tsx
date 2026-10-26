import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AuthenticBank } from './AuthenticBank';
import { BuildingModal } from '../../BuildingModal';

const mockCampaignFloppy: any = {
  config: {
    name: '1990_classic_floppy',
    economyRules: {
      loanPaymentAmount: 50
    },
    timeRules: {
      totalHoursPerWeekend: 12,
      hoursPerTurn: 12,
      workSessionCost: 6,
      classesSessionCost: 5,
      relaxSessionCost: 2,
      pawnTimeCost: 1,
      minTurnHours: 0,
      newspaperCost: 1,
      loanCost: 1,
      brokerCost: 2
    }
  },
  buildings: [
    {
      id: 'bank',
      name: 'First National Bank',
      archetype: 'bank',
      spritePath: 'images/bank.png',
      description: 'Bank'
    },
    {
      id: 'pawn_shop',
      name: "Curly's Pawn Shop",
      archetype: 'pawnshop',
      spritePath: 'images/pawn_shop.png',
      description: 'Pawn shop'
    }
  ],
  items: [],
  jobs: [
    {
      id: 'bank_teller',
      title: 'Bank Teller',
      locationId: 'bank',
      baseWage: 12,
      requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'business' }
    }
  ],
  education: [],
  housing: [
    { id: 'low_cost', name: 'Low-Cost Housing', rentPrice: 300, homeNodeId: 'node_rent' }
  ],
  map: {
    nodes: [
      { id: 'node_bank', buildingId: 'bank', x: 0, y: 0, connections: [] },
      { id: 'node_pawn_shop', buildingId: 'pawn_shop', x: 0, y: 0, connections: [] }
    ]
  },
  events: [],
  stocks: [
    { id: 'stock_a', name: 'Corp A', basePrice: 20, sellFeePercent: 10 }
  ],
  messages: {},
  weekends: {},
  synergies: []
};

const mockCampaignCdrom: any = {
  ...mockCampaignFloppy,
  config: {
    ...mockCampaignFloppy.config,
    name: '1990_classic_cdrom'
  }
};

const basePlayer: any = {
  id: 'p1',
  name: 'Jones',
  money: 500,
  savings: 200,
  bankSavings: 200,
  debt: 0,
  loanDebt: 0,
  career: 0,
  education: 0,
  happiness: 50,
  relaxation: 50,
  rentPaidUntilWeek: 4,
  currentHousingId: 'low_cost',
  hoursRemaining: 10,
  turnFlags: {},
  inventory: { selectedClothes: 'casual', appliances: [], possessionIds: [] },
  position: 'node_bank',
  degrees: [],
  experience: 0
};

const authenticRules: any = {
  guiStyle: 'authentic'
};

describe('AuthenticBank Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders authentic viewport, talker and piggy bank for floppy campaign', () => {
    render(
      <AuthenticBank
        player={basePlayer}
        onAction={vi.fn()}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    expect(screen.getByTestId('authentic-bank')).toBeInTheDocument();
    const talker = screen.getByTestId('bank-talker');
    expect(talker).toBeInTheDocument();
    expect(talker.getAttribute('src')).toContain('/talker_floppy/talker_');
    const piggy = screen.getByTestId('bank-piggy');
    expect(piggy).toBeInTheDocument();
    expect(piggy.querySelector('img')?.getAttribute('src')).toContain('/desk/piggy_');
    expect(screen.getByTestId('btn-bank-done')).toBeInTheDocument();
  });

  it('renders authentic talker with cdrom folder when in cdrom campaign', () => {
    render(
      <AuthenticBank
        player={basePlayer}
        onAction={vi.fn()}
        onClose={vi.fn()}
        campaign={mockCampaignCdrom}
      />
    );

    const talker = screen.getByTestId('bank-talker');
    expect(talker.getAttribute('src')).toContain('/talker_cdrom/talker_');
  });

  it('renders all 5 authentic options', () => {
    render(
      <AuthenticBank
        player={basePlayer}
        onAction={vi.fn()}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    expect(screen.getByTestId('bank-option-deposit')).toHaveTextContent('Deposit');
    expect(screen.getByTestId('bank-option-withdraw')).toHaveTextContent('Withdraw');
    expect(screen.getByTestId('bank-option-loan_payment')).toHaveTextContent('Loan Payment');
    expect(screen.getByTestId('bank-option-apply_loan')).toHaveTextContent('Apply For Loan');
    expect(screen.getByTestId('bank-option-see_broker')).toHaveTextContent('See The Broker');
  });

  it('deposits up to $100 and animates piggy forward when clicking Deposit', () => {
    const onAction = vi.fn();
    render(
      <AuthenticBank
        player={basePlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    fireEvent.click(screen.getByTestId('bank-option-deposit'));
    expect(onAction).toHaveBeenCalledWith({ type: 'bank_transaction', amount: 100 });

    const bubble = screen.getByTestId('bank-speech-bubble');
    expect(bubble).toHaveTextContent('Thank you for depositing on us.');

    // Advances piggy animation
    act(() => {
      vi.advanceTimersByTime(250);
    });
    const piggy = screen.getByTestId('bank-piggy');
    expect(piggy.querySelector('img')?.getAttribute('src')).toContain('/desk/piggy_');
  });

  it('prevents deposit when player has zero cash', () => {
    const onAction = vi.fn();
    const brokePlayer = { ...basePlayer, money: 0 };
    render(
      <AuthenticBank
        player={brokePlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    fireEvent.click(screen.getByTestId('bank-option-deposit'));
    expect(onAction).not.toHaveBeenCalled();

    const bubble = screen.getByTestId('bank-speech-bubble');
    expect(bubble).toHaveTextContent('You do not have any cash to deposit.');
  });

  it('withdraws up to $100 and animates piggy backward when clicking Withdraw', () => {
    const onAction = vi.fn();
    render(
      <AuthenticBank
        player={basePlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    fireEvent.click(screen.getByTestId('bank-option-withdraw'));
    expect(onAction).toHaveBeenCalledWith({ type: 'bank_transaction', amount: -100 });

    const bubble = screen.getByTestId('bank-speech-bubble');
    expect(bubble).toHaveTextContent('There is always a penalty for early withdrawal.');
  });

  it('prevents withdrawal when player has zero savings', () => {
    const onAction = vi.fn();
    const noSavingsPlayer = { ...basePlayer, bankSavings: 0, savings: 0 };
    render(
      <AuthenticBank
        player={noSavingsPlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    fireEvent.click(screen.getByTestId('bank-option-withdraw'));
    expect(onAction).not.toHaveBeenCalled();

    const bubble = screen.getByTestId('bank-speech-bubble');
    expect(bubble).toHaveTextContent('You do not have any savings.');
  });

  it('makes loan payment when player has existing loan and cash', () => {
    const onAction = vi.fn();
    const indebtedPlayer = { ...basePlayer, loanDebt: 150, debt: 150, money: 100 };
    render(
      <AuthenticBank
        player={indebtedPlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    fireEvent.click(screen.getByTestId('bank-option-loan_payment'));
    expect(onAction).toHaveBeenCalledWith({ type: 'pay_loan' });

    const bubble = screen.getByTestId('bank-speech-bubble');
    expect(bubble).toHaveTextContent('Thank You for your payment.');
  });

  it('notifies player when trying to pay loan with no active loan', () => {
    const onAction = vi.fn();
    render(
      <AuthenticBank
        player={basePlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    fireEvent.click(screen.getByTestId('bank-option-loan_payment'));
    expect(onAction).not.toHaveBeenCalled();

    const bubble = screen.getByTestId('bank-speech-bubble');
    expect(bubble).toHaveTextContent("You don't have a loan.");
  });

  it('handles loan application flow with confirmation modal', () => {
    const onAction = vi.fn();
    // High-worth employed player eligible for loan
    const qualifiedPlayer = {
      ...basePlayer,
      money: 1000,
      bankSavings: 500,
      currentWage: 12,
      currentJobId: 'bank_teller',
      hoursRemaining: 10
    };

    render(
      <AuthenticBank
        player={qualifiedPlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    fireEvent.click(screen.getByTestId('bank-option-apply_loan'));

    // Confirmation box with Yes and No appears
    const yesBtn = screen.getByTestId('btn-loan-yes');
    const noBtn = screen.getByTestId('btn-loan-no');
    expect(yesBtn).toBeInTheDocument();
    expect(noBtn).toBeInTheDocument();

    // Clicking No cancels offer
    fireEvent.click(noBtn);
    expect(screen.queryByTestId('btn-loan-yes')).not.toBeInTheDocument();
    expect(screen.getByTestId('bank-speech-bubble')).toHaveTextContent('Well then, come back and see us any time.');
    expect(onAction).not.toHaveBeenCalled();

    // Reopen and accept offer
    fireEvent.click(screen.getByTestId('bank-option-apply_loan'));
    fireEvent.click(screen.getByTestId('btn-loan-yes'));

    expect(onAction).toHaveBeenCalledWith({ type: 'take_loan' });
  });

  it('triggers onSeeBroker when player has enough time', () => {
    const onSeeBroker = vi.fn();
    render(
      <AuthenticBank
        player={basePlayer}
        onAction={vi.fn()}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
        onSeeBroker={onSeeBroker}
      />
    );

    fireEvent.click(screen.getByTestId('bank-option-see_broker'));
    expect(onSeeBroker).toHaveBeenCalledTimes(1);
  });

  it('prevents see broker when not enough time remaining', () => {
    const onSeeBroker = vi.fn();
    const exhaustedPlayer = { ...basePlayer, hoursRemaining: 1 };
    render(
      <AuthenticBank
        player={exhaustedPlayer}
        onAction={vi.fn()}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
        onSeeBroker={onSeeBroker}
      />
    );

    fireEvent.click(screen.getByTestId('bank-option-see_broker'));
    expect(onSeeBroker).not.toHaveBeenCalled();
    expect(screen.getByTestId('bank-speech-bubble')).toHaveTextContent('No time is left to see the broker.');
  });

  it('hides WORK button when player does not work at the bank', () => {
    render(
      <AuthenticBank
        player={basePlayer}
        onAction={vi.fn()}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    expect(screen.queryByTestId('btn-bank-work')).not.toBeInTheDocument();
  });

  it('shows WORK button and animates punch card overlay when employed here', () => {
    const onAction = vi.fn();
    const bankEmployee = { ...basePlayer, currentJobId: 'bank_teller' };

    render(
      <AuthenticBank
        player={bankEmployee}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    const workBtn = screen.getByTestId('btn-bank-work');
    expect(workBtn).toBeInTheDocument();

    fireEvent.click(workBtn);

    // Punch card overlay appears at desk (0, 57)
    expect(screen.getByTestId('bank-punch-card')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onAction).toHaveBeenCalledWith({ type: 'work', jobId: 'bank_teller' });
    expect(screen.queryByTestId('bank-punch-card')).not.toBeInTheDocument();
  });

  it('calls onClose when clicking DONE button', () => {
    const onClose = vi.fn();
    render(
      <AuthenticBank
        player={basePlayer}
        onAction={vi.fn()}
        onClose={onClose}
        campaign={mockCampaignFloppy}
      />
    );

    fireEvent.click(screen.getByTestId('btn-bank-done'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles keyboard shortcuts: X/Esc to exit, 1-5 for options', () => {
    const onClose = vi.fn();
    const onAction = vi.fn();

    render(
      <AuthenticBank
        player={basePlayer}
        onAction={onAction}
        onClose={onClose}
        campaign={mockCampaignFloppy}
      />
    );

    // Key '1' triggers deposit
    fireEvent.keyDown(window, { key: '1' });
    expect(onAction).toHaveBeenCalledWith({ type: 'bank_transaction', amount: 100 });

    // Key '2' triggers withdraw
    fireEvent.keyDown(window, { key: '2' });
    expect(onAction).toHaveBeenCalledWith({ type: 'bank_transaction', amount: -100 });

    // Key 'x' exits
    fireEvent.keyDown(window, { key: 'x' });
    expect(onClose).toHaveBeenCalledTimes(1);

    // Key 'Escape' exits
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('renders BuildingModal with AuthenticBank when guiStyle is authentic and currentBuilding is bank', () => {
    const { container } = render(
      <BuildingModal
        player={basePlayer}
        campaign={mockCampaignFloppy}
        currentBuildingId="bank"
        turn={1}
        economicIndex={0}
        rules={authenticRules}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={vi.fn()}
      />
    );

    const modal = container.querySelector('.building-modal');
    expect(modal).toBeInTheDocument();
    expect(modal?.classList.contains('building-modal--authentic')).toBe(true);
    expect(modal?.classList.contains('building-modal--authentic-replica')).toBe(true);

    // Modern header and close button should NOT be present
    expect(container.querySelector('.building-modal__header')).not.toBeInTheDocument();
    expect(container.querySelector('.building-modal__close')).not.toBeInTheDocument();

    // AuthenticBank should be rendered
    expect(screen.getByTestId('authentic-bank')).toBeInTheDocument();
  });
});
