import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthenticBroker } from './AuthenticBroker';
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
  jobs: [],
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
    { id: 'tbills', name: 'T-Bills', type: 'fixed', basePrice: 100, sellFeePercent: 3 },
    { id: 'gold', name: 'Gold', type: 'fluctuating', basePrice: 413, minPrice: 206, maxPrice: 1032 },
    { id: 'silver', name: 'Silver', type: 'fluctuating', basePrice: 14, minPrice: 7, maxPrice: 35 },
    { id: 'pork_bellies', name: 'Pork Bellies', type: 'fluctuating', basePrice: 20, minPrice: 10, maxPrice: 50 },
    { id: 'blue_chip', name: 'Blue Chip Stocks', type: 'fluctuating', basePrice: 49, minPrice: 24, maxPrice: 122 },
    { id: 'penny_stocks', name: 'Penny Stocks', type: 'fluctuating', basePrice: 7, minPrice: 3, maxPrice: 17 }
  ],
  messages: {},
  weekends: {},
  synergies: []
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
  inventory: {
    selectedClothes: 'casual',
    appliances: [],
    possessionIds: [],
    stocks: {
      tBills: 2,
      holdings: {
        gold: 1,
        silver: 0,
        pork_bellies: 5,
        blue_chip: 0,
        penny_stocks: 10
      }
    }
  },
  position: 'node_bank',
  degrees: [],
  experience: 0
};

const authenticRules: any = {
  guiStyle: 'authentic'
};

describe('AuthenticBroker Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders authentic viewport, background and all 6 stocks', () => {
    render(
      <AuthenticBroker
        player={basePlayer}
        onAction={vi.fn()}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    expect(screen.getByTestId('authentic-broker')).toBeInTheDocument();
    expect(screen.getByTestId('broker-bg')).toBeInTheDocument();
    expect(screen.getByTestId('broker-row-tbills')).toBeInTheDocument();
    expect(screen.getByTestId('broker-row-gold')).toBeInTheDocument();
    expect(screen.getByTestId('broker-row-silver')).toBeInTheDocument();
    expect(screen.getByTestId('broker-row-pork_bellies')).toBeInTheDocument();
    expect(screen.getByTestId('broker-row-blue_chip')).toBeInTheDocument();
    expect(screen.getByTestId('broker-row-penny_stocks')).toBeInTheDocument();
  });

  it('displays accurate market value and owned holdings for stocks', () => {
    render(
      <AuthenticBroker
        player={basePlayer}
        onAction={vi.fn()}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    expect(screen.getByTestId('stock-price-tbills')).toHaveTextContent('$100');
    expect(screen.getByTestId('stock-holdings-tbills')).toHaveTextContent('2');

    expect(screen.getByTestId('stock-holdings-gold')).toHaveTextContent('1');
    expect(screen.getByTestId('stock-holdings-silver')).toHaveTextContent('0');
    expect(screen.getByTestId('stock-holdings-pork_bellies')).toHaveTextContent('5');
    expect(screen.getByTestId('stock-holdings-penny_stocks')).toHaveTextContent('10');
  });

  it('dispatches buy action when player has enough cash', () => {
    const onAction = vi.fn();
    render(
      <AuthenticBroker
        player={basePlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    // Initial selected is T-Bills ($100)
    fireEvent.click(screen.getByTestId('btn-broker-buy'));
    expect(onAction).toHaveBeenCalledWith({
      type: 'buy_stock',
      stockId: 'tbills',
      quantity: 1,
      cost: 100
    });

    const bubble = screen.getByTestId('broker-speech-bubble');
    expect(bubble).toHaveTextContent('You bought 1 share of T-Bills.');
  });

  it('prevents buy action when player does not have enough cash', () => {
    const onAction = vi.fn();
    const poorPlayer = { ...basePlayer, money: 50 };
    render(
      <AuthenticBroker
        player={poorPlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    fireEvent.click(screen.getByTestId('btn-broker-buy'));
    expect(onAction).not.toHaveBeenCalled();

    const bubble = screen.getByTestId('broker-speech-bubble');
    expect(bubble).toHaveTextContent('You do not have enough cash.');
  });

  it('dispatches sell action when player owns shares', () => {
    const onAction = vi.fn();
    render(
      <AuthenticBroker
        player={basePlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    // Initial selected is T-Bills (owns 2, basePrice 100, sell fee 3% -> net 97)
    fireEvent.click(screen.getByTestId('btn-broker-sell'));
    expect(onAction).toHaveBeenCalledWith({
      type: 'sell_stock',
      stockId: 'tbills',
      quantity: 1,
      revenue: 97
    });

    const bubble = screen.getByTestId('broker-speech-bubble');
    expect(bubble).toHaveTextContent("You sold 1 share of T-Bills. (A $3 Broker's fee is deducted for the sale of each T-Bill.)");
  });

  it('prevents sell action when player owns 0 shares', () => {
    const onAction = vi.fn();
    render(
      <AuthenticBroker
        player={basePlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    // Select silver (owns 0)
    fireEvent.click(screen.getByTestId('broker-row-silver'));
    fireEvent.click(screen.getByTestId('btn-broker-sell'));
    expect(onAction).not.toHaveBeenCalled();

    const bubble = screen.getByTestId('broker-speech-bubble');
    expect(bubble).toHaveTextContent('You do not own any shares.');
  });

  it('calls onReturn or onClose when clicking DONE button', () => {
    const onReturn = vi.fn();
    const onClose = vi.fn();
    render(
      <AuthenticBroker
        player={basePlayer}
        onAction={vi.fn()}
        onClose={onClose}
        onReturn={onReturn}
        campaign={mockCampaignFloppy}
      />
    );

    fireEvent.click(screen.getByTestId('btn-broker-done'));
    expect(onReturn).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('handles keyboard navigation and shortcuts', () => {
    const onAction = vi.fn();
    const onReturn = vi.fn();
    render(
      <AuthenticBroker
        player={basePlayer}
        onAction={onAction}
        onClose={vi.fn()}
        onReturn={onReturn}
        campaign={mockCampaignFloppy}
      />
    );

    // Press '4' to select pork bellies (index 3)
    fireEvent.keyDown(window, { key: '4' });
    // Press 'b' to buy
    fireEvent.keyDown(window, { key: 'b' });
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'buy_stock', stockId: 'pork_bellies' })
    );

    // Press 's' to sell
    fireEvent.keyDown(window, { key: 's' });
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'sell_stock', stockId: 'pork_bellies' })
    );

    // Press 'x' to exit
    fireEvent.keyDown(window, { key: 'x' });
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it('renders BuildingModal with AuthenticBroker when bankTab is stocks in authentic mode', () => {
    // Open BuildingModal at bank
    render(
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

    // Click "See The Broker" in AuthenticBank to switch to stocks
    fireEvent.click(screen.getByTestId('bank-option-see_broker'));

    // AuthenticBroker should now be visible!
    expect(screen.getByTestId('authentic-broker')).toBeInTheDocument();
  });
});
