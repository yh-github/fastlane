import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AuthenticMonolithBurgers } from './AuthenticMonolithBurgers';
import { BuildingModal } from '../../BuildingModal';

const mockCampaignFloppy: any = {
  config: {
    name: '1990_classic_floppy',
    timeRules: {
      totalHoursPerWeekend: 12,
      hoursPerTurn: 12,
      workSessionCost: 6,
      classesSessionCost: 5,
      relaxSessionCost: 2,
      pawnTimeCost: 1,
      minTurnHours: 0,
      newspaperCost: 1
    }
  },
  buildings: [
    {
      id: 'burger_palace',
      name: 'Monolith Burgers',
      archetype: 'restaurant',
      spritePath: 'images/burger_palace.png',
      description: 'Fast food and drinks.',
      inventory: [
        { itemId: 'hamburger', priceOverride: 79 },
        { itemId: 'cheeseburger', priceOverride: 89 },
        { itemId: 'astro_chicken', priceOverride: 124 },
        { itemId: 'fries', priceOverride: 65 },
        { itemId: 'cola', priceOverride: 69 },
        { itemId: 'shake', priceOverride: 102 }
      ]
    },
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
  items: [
    { id: 'hamburger', name: 'Hamburgers', category: 'food', basePrice: 79, happinessBonus: 0 },
    { id: 'cheeseburger', name: 'Cheeseburger', category: 'food', basePrice: 89, happinessBonus: 1 },
    { id: 'astro_chicken', name: 'Astro Chicken', category: 'food', basePrice: 124, happinessBonus: 1 },
    { id: 'fries', name: 'Fries', category: 'food', basePrice: 65, happinessBonus: 0 },
    { id: 'cola', name: 'Colas', category: 'junk', basePrice: 69, happinessBonus: 0 },
    { id: 'shake', name: 'Shakes', category: 'junk', basePrice: 102, happinessBonus: 0 }
  ],
  jobs: [
    {
      id: 'burger_cook',
      title: 'Cook',
      locationId: 'burger_palace',
      baseWage: 5,
      requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' }
    }
  ],
  education: [],
  housing: [
    { id: 'low_cost', name: 'Low-Cost Housing', rentPrice: 300, homeNodeId: 'node_rent' }
  ],
  map: {
    nodes: [
      { id: 'node_burger', buildingId: 'burger_palace', x: 0, y: 0, connections: [] },
      { id: 'node_bank', buildingId: 'bank', x: 0, y: 0, connections: [] }
    ]
  },
  events: [],
  stocks: [],
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
  savings: 0,
  debt: 0,
  career: 0,
  education: 0,
  happiness: 50,
  relaxation: 50,
  rentPaidUntilWeek: 4,
  currentHousingId: 'low_cost',
  hoursRemaining: 10,
  turnFlags: {},
  inventory: { selectedClothes: 'casual', appliances: [], possessionIds: [] },
  position: 'node_burger',
  degrees: [],
  experience: 0
};

const authenticRules: any = {
  guiStyle: 'authentic'
};

describe('AuthenticMonolithBurgers Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders authentic viewport and talker for floppy campaign', () => {
    render(
      <AuthenticMonolithBurgers
        player={basePlayer}
        onAction={vi.fn()}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    expect(screen.getByTestId('authentic-monolith-burgers')).toBeInTheDocument();
    const talker = screen.getByTestId('monolith-talker');
    expect(talker).toBeInTheDocument();
    expect(talker.getAttribute('src')).toContain('/talker_floppy/talker_');
    expect(screen.getByTestId('btn-monolith-done')).toBeInTheDocument();
  });

  it('renders authentic talker with cdrom folder when in cdrom campaign', () => {
    render(
      <AuthenticMonolithBurgers
        player={basePlayer}
        onAction={vi.fn()}
        onClose={vi.fn()}
        campaign={mockCampaignCdrom}
      />
    );

    const talker = screen.getByTestId('monolith-talker');
    expect(talker.getAttribute('src')).toContain('/talker_cdrom/talker_');
  });

  it('renders all 6 authentic menu items with correct prices and formatting', () => {
    render(
      <AuthenticMonolithBurgers
        player={basePlayer}
        onAction={vi.fn()}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    const burgerItem = screen.getByTestId('menu-item-hamburger');
    expect(burgerItem).toBeInTheDocument();
    expect(burgerItem.textContent).toContain('Hamburgers......... $ 79');

    const cheeseItem = screen.getByTestId('menu-item-cheeseburger');
    expect(cheeseItem.textContent).toContain('Cheeseburger....... $ 89');

    const chickenItem = screen.getByTestId('menu-item-astro_chicken');
    expect(chickenItem.textContent).toContain('Astro Chicken...... $124');

    const friesItem = screen.getByTestId('menu-item-fries');
    expect(friesItem.textContent).toContain('Fries.............. $ 65');

    const shakeItem = screen.getByTestId('menu-item-shake');
    expect(shakeItem.textContent).toContain('Shakes............. $102');

    const colaItem = screen.getByTestId('menu-item-cola');
    expect(colaItem.textContent).toContain('Colas.............. $ 69');
  });

  it('dispatches buy action and locks the food item window to the bought item', () => {
    const onAction = vi.fn();
    render(
      <AuthenticMonolithBurgers
        player={basePlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    fireEvent.click(screen.getByTestId('menu-item-hamburger'));
    expect(onAction).toHaveBeenCalledWith({ type: 'buy', itemId: 'hamburger' });

    const counter = screen.getByTestId('monolith-counter');
    expect(counter.querySelector('img')?.getAttribute('src')).toContain('food_hamburger.png');

    // Speech bubble has tail pointing right
    expect(screen.getByTestId('speech-tail-right')).toBeInTheDocument();

    // After 3200ms, unlock and resume cycling
    act(() => {
      vi.advanceTimersByTime(3200);
    });
  });

  it('cycles food items in the little window when idle', () => {
    render(
      <AuthenticMonolithBurgers
        player={basePlayer}
        onAction={vi.fn()}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    const counter = screen.getByTestId('monolith-counter');
    expect(counter.querySelector('img')?.getAttribute('src')).toContain('food_hamburger.png');

    // Advance 1200ms -> cycles to cheeseburger
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(counter.querySelector('img')?.getAttribute('src')).toContain('food_cheeseburger.png');

    // Advance 1200ms -> cycles to astro chicken
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(counter.querySelector('img')?.getAttribute('src')).toContain('food_chicken.png');
  });

  it('prevents purchase and displays not enough cash dialogue when player is broke', () => {
    const onAction = vi.fn();
    const poorPlayer = { ...basePlayer, money: 10 };

    render(
      <AuthenticMonolithBurgers
        player={poorPlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    fireEvent.click(screen.getByTestId('menu-item-hamburger'));
    expect(onAction).not.toHaveBeenCalled();

    const bubble = screen.getByTestId('monolith-speech-bubble');
    expect(bubble.textContent).toContain('You do not have enough cash.');
  });

  it('hides WORK button when player is not employed at Monolith Burgers', () => {
    render(
      <AuthenticMonolithBurgers
        player={basePlayer}
        onAction={vi.fn()}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    expect(screen.queryByTestId('btn-monolith-work')).not.toBeInTheDocument();
  });

  it('shows WORK button and executes punch card animation when employed here', () => {
    const onAction = vi.fn();
    const employedPlayer = { ...basePlayer, currentJobId: 'burger_cook' };

    render(
      <AuthenticMonolithBurgers
        player={employedPlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaignFloppy}
      />
    );

    const workBtn = screen.getByTestId('btn-monolith-work');
    expect(workBtn).toBeInTheDocument();

    fireEvent.click(workBtn);

    // Punch card overlay appears at counter (0, 57)
    expect(screen.getByTestId('monolith-punch-card')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onAction).toHaveBeenCalledWith({ type: 'work', jobId: 'burger_cook' });
    expect(screen.queryByTestId('monolith-punch-card')).not.toBeInTheDocument();
  });

  it('calls onClose when clicking DONE button', () => {
    const onClose = vi.fn();
    render(
      <AuthenticMonolithBurgers
        player={basePlayer}
        onAction={vi.fn()}
        onClose={onClose}
        campaign={mockCampaignFloppy}
      />
    );

    fireEvent.click(screen.getByTestId('btn-monolith-done'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles keyboard shortcuts: X/Esc to exit, 1-6 to buy items', () => {
    const onClose = vi.fn();
    const onAction = vi.fn();

    render(
      <AuthenticMonolithBurgers
        player={basePlayer}
        onAction={onAction}
        onClose={onClose}
        campaign={mockCampaignFloppy}
      />
    );

    // Key '1' buys hamburger
    fireEvent.keyDown(window, { key: '1' });
    expect(onAction).toHaveBeenCalledWith({ type: 'buy', itemId: 'hamburger' });

    // Key 'x' exits
    fireEvent.keyDown(window, { key: 'x' });
    expect(onClose).toHaveBeenCalledTimes(1);

    // Key 'Escape' exits
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('renders BuildingModal with AuthenticMonolithBurgers when guiStyle is authentic and currentBuilding is burger_palace', () => {
    const { container } = render(
      <BuildingModal
        player={basePlayer}
        campaign={mockCampaignFloppy}
        currentBuildingId="burger_palace"
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

    // Authentic component should be rendered
    expect(screen.getByTestId('authentic-monolith-burgers')).toBeInTheDocument();
  });

  it('renders standard BuildingModal for other buildings even when guiStyle is authentic', () => {
    const { container } = render(
      <BuildingModal
        player={basePlayer}
        campaign={mockCampaignFloppy}
        currentBuildingId="pawn_shop"
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
    expect(modal?.classList.contains('building-modal--authentic-replica')).toBe(false);

    // Standard header and close button ARE present for non-replica buildings
    expect(container.querySelector('.building-modal__header')).toBeInTheDocument();
    expect(container.querySelector('.building-modal__close')).toBeInTheDocument();
  });
});
