import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BuildingModal } from './BuildingModal';
import { DurableCardModal } from './buildings/home/DurableCardModal';
import { ApartmentFurnishings } from './buildings/home/ApartmentFurnishings';
import type { PlayerState, GameRules } from '../engine/gameState';
import type { CampaignBundle } from '../engine/dataLoader';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.defaultValue) return options.defaultValue;
      return key;
    }
  }),
}));

describe('Modal Escape and Card Popups', () => {
  const baseRules: GameRules = {
    helpfulUI: true,
    advancedHomeGUI: false,
    usePhysicalMentalConditions: false,
    trackMess: true,
    spaceCapping: true,
  } as any;

  const mockPlayer: PlayerState = {
    id: 'p1',
    name: 'Player 1',
    cash: 500,
    currentLocationId: 'low_cost_housing',
    currentHousingId: 'low_cost_housing',
    relaxation: 10,
    hoursRemaining: 50,
    rentPaidUntilWeek: 8,
    turnFlags: {} as any,
    inventory: {
      appliances: [
        { id: 'refrigerator', condition: 'used', isBroken: false }
      ],
      freshFoodUnits: 3,
      fastFoodItems: [],
      spareParts: 0,
      knickKnacks: 0,
      uninspectedKnickKnacks: 0,
      books: []
    }
  } as any;

  const mockCampaign: CampaignBundle = {
    buildings: [
      { id: 'low_cost_housing', name: 'Low-Cost Housing', archetype: 'home', cost: 0, interactions: [] }
    ],
    items: [
      { id: 'refrigerator', name: 'Refrigerator', tags: ['refrigerator'], cost: 300, space: 2 },
      { id: 'freezer', name: 'Freezer', tags: ['freezer'], cost: 250, space: 2 }
    ],
    housing: [
      { id: 'low_cost_housing', name: 'Low-Cost Housing', rent: 100, spaceCapacity: 10, homeNodeId: 'node_home' }
    ],
    map: {
      nodes: [
        { id: 'node_home', buildingId: 'low_cost_housing' }
      ]
    },
    config: {
      eventRules: { willyRobberyStartWeek: 4 },
      timeRules: { weekendStartTime: 120 }
    }
  } as any;

  it('renders burglary and pantry pill badges in header when base home and helpfulUI', () => {
    render(
      <BuildingModal
        player={mockPlayer}
        campaign={mockCampaign}
        currentBuildingId="low_cost_housing"
        turn={5}
        economicIndex={0}
        rules={baseRules}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={vi.fn()}
      />
    );

    const burglaryBadge = screen.getByTestId('home-burglary-badge');
    expect(burglaryBadge).toBeInTheDocument();

    const pantryBadge = screen.getByTestId('pantry-pill-badge');
    expect(pantryBadge).toBeInTheDocument();
    expect(pantryBadge).toHaveTextContent('3');
  });

  it('opens floating break-in modal on click and closes via Esc key without closing BuildingModal', () => {
    const handleClose = vi.fn();
    render(
      <BuildingModal
        player={mockPlayer}
        campaign={mockCampaign}
        currentBuildingId="low_cost_housing"
        turn={5}
        economicIndex={0}
        rules={baseRules}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={handleClose}
      />
    );

    // Open break-in details
    fireEvent.click(screen.getByTestId('home-burglary-badge'));
    const breakInModal = screen.getByTestId('home-breakin-details-modal');
    expect(breakInModal).toBeInTheDocument();
    expect(screen.getByText(/Burglary Risk Details/i)).toBeInTheDocument();

    // Pressing Esc closes the break-in modal, not the parent BuildingModal
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('home-breakin-details-modal')).not.toBeInTheDocument();
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('opens floating pantry modal on click and closes via Esc key without closing BuildingModal', () => {
    const handleClose = vi.fn();
    render(
      <BuildingModal
        player={mockPlayer}
        campaign={mockCampaign}
        currentBuildingId="low_cost_housing"
        turn={5}
        economicIndex={0}
        rules={baseRules}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={handleClose}
      />
    );

    // Open pantry modal
    fireEvent.click(screen.getByTestId('pantry-pill-badge'));
    const pantryModal = screen.getByTestId('pantry-details-modal');
    expect(pantryModal).toBeInTheDocument();
    expect(screen.getByText(/Pantry & Food Supplies/i)).toBeInTheDocument();
    expect(screen.getByText(/Refrigerator Active/i)).toBeInTheDocument();

    // Pressing Esc closes the pantry modal
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('pantry-details-modal')).not.toBeInTheDocument();
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('closes break-in modal when clicking on its semi-transparent backdrop', () => {
    render(
      <BuildingModal
        player={mockPlayer}
        campaign={mockCampaign}
        currentBuildingId="low_cost_housing"
        turn={5}
        economicIndex={0}
        rules={baseRules}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('home-burglary-badge'));
    const backdrop = screen.getByTestId('home-breakin-details-modal');
    expect(backdrop).toBeInTheDocument();

    fireEvent.click(backdrop);
    expect(screen.queryByTestId('home-breakin-details-modal')).not.toBeInTheDocument();
  });

  it('closes pantry modal when clicking on its semi-transparent backdrop', () => {
    render(
      <BuildingModal
        player={mockPlayer}
        campaign={mockCampaign}
        currentBuildingId="low_cost_housing"
        turn={5}
        economicIndex={0}
        rules={baseRules}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('pantry-pill-badge'));
    const backdrop = screen.getByTestId('pantry-details-modal');
    expect(backdrop).toBeInTheDocument();

    fireEvent.click(backdrop);
    expect(screen.queryByTestId('pantry-details-modal')).not.toBeInTheDocument();
  });

  it('closes DurableCardModal when Esc key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <DurableCardModal
        durable={{ id: 'refrigerator', isOwned: true }}
        player={mockPlayer}
        campaign={mockCampaign}
        rules={baseRules}
        onClose={handleClose}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders unowned durables clearly visible with grayed out styling and responsive sizing', () => {
    render(
      <ApartmentFurnishings
        player={mockPlayer}
        campaign={mockCampaign}
        rules={baseRules}
        onInspectDurable={vi.fn()}
      />
    );

    // Freezer is unowned
    const unownedCard = screen.getByTestId('durable-card-freezer');
    expect(unownedCard).toBeInTheDocument();

    // Check that card container has opacity 0.8 (not 0.45)
    expect(unownedCard).toHaveStyle({ opacity: '0.8' });

    // Check that unowned image exists and has grayscale styling with brightness
    const unownedImg = screen.getByAltText('Freezer');
    expect(unownedImg).toBeInTheDocument();
    expect(unownedImg.style.filter).toContain('grayscale(100%)');
    expect(unownedImg.style.filter).toContain('brightness(1.2)');

    // Check that responsive CSS classes are applied
    expect(unownedCard).toHaveClass('durable-card-item');
    expect(unownedImg).toHaveClass('durable-card-item__img');
  });

  it('displays real space fallback, clear gameplay mechanics, and one-time badges in DurableCardModal', () => {
    const handleClose = vi.fn();
    const campaignWithoutItemSpace: CampaignBundle = {
      ...mockCampaign,
      items: [
        { id: 'freezer', name: 'Freezer', tags: ['freezer'], cost: 250, happinessBonus: 2 },
        { id: 'refrigerator', name: 'Refrigerator', tags: ['refrigerator'], cost: 300 }
      ]
    } as any;

    const { rerender } = render(
      <DurableCardModal
        durable={{ id: 'freezer', isOwned: false }}
        player={mockPlayer}
        campaign={campaignWithoutItemSpace}
        rules={baseRules}
        onClose={handleClose}
      />
    );

    // Space: Should NOT show 0 space even if space is not in campaign JSON; falls back to 30 space
    expect(screen.getByText(/30 space/i)).toBeInTheDocument();
    expect(screen.queryByText(/\b0 space/i)).not.toBeInTheDocument();

    // Gameplay narrative: Mentions requiring a Refrigerator to expand capacity to 12
    expect(screen.getByText(/Requires an active Refrigerator to function/i)).toBeInTheDocument();
    expect(screen.getByText(/Expands food preservation capacity from 6 up to 12 units/i)).toBeInTheDocument();

    // Effect chips: Distinctly labels one-time bonus vs food preservation
    expect(screen.getByText('🧊 Stores up to 12 Food (Needs Refrigerator)')).toBeInTheDocument();
    expect(screen.getByText('🎁 One-time: +2 😊 on buy')).toBeInTheDocument();

    // Placeholder removal: "Interactive durable actions coming in a future update" is gone
    expect(screen.queryByText(/Interactive durable actions coming in a future update/i)).not.toBeInTheDocument();

    // Top-right close button works
    const closeBtn = screen.getByTestId('btn-close-durable-card');
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Rerender for Refrigerator
    rerender(
      <DurableCardModal
        durable={{ id: 'refrigerator', isOwned: true }}
        player={mockPlayer}
        campaign={campaignWithoutItemSpace}
        rules={baseRules}
        onClose={handleClose}
      />
    );

    expect(screen.getByText(/40 space/i)).toBeInTheDocument();
    expect(screen.getByText('🧊 Preserves up to 6 Fresh Food/turn')).toBeInTheDocument();
    expect(screen.getByText(/Prevents fresh grocery spoilage for up to 6 food units/i)).toBeInTheDocument();
  });

  it('hides Space readout when spaceCapping is false, removes fake effects, and shows computer study credits and books synergy', () => {
    const handleClose = vi.fn();
    const rulesWithoutSpace: GameRules = {
      ...baseRules,
      spaceCapping: false,
      usePhysicalMentalConditions: false,
    };

    const campaignWithTechAndBooks: CampaignBundle = {
      ...mockCampaign,
      items: [
        { id: 'computer', name: 'Computer', tags: ['computer'], basePrice: 1599, happinessBonus: 3 },
        { id: 'dictionary', name: 'Dictionary', category: 'book', basePrice: 70 },
        { id: 'encyclopedia', name: 'Encyclopedia', category: 'book', basePrice: 475 },
        { id: 'atlas', name: 'Atlas', category: 'book', basePrice: 55 },
        { id: 'color_tv', name: 'Color TV', category: 'appliance', basePrice: 349, happinessBonus: 1 },
        { id: 'vcr', name: 'VCR', category: 'appliance', basePrice: 250, happinessBonus: 1 }
      ]
    } as any;

    const { rerender } = render(
      <DurableCardModal
        durable={{ id: 'computer', isOwned: true }}
        player={mockPlayer}
        campaign={campaignWithTechAndBooks}
        rules={rulesWithoutSpace}
        onClose={handleClose}
      />
    );

    // 1. Space: NOT shown when spaceCapping is off
    expect(screen.queryByText(/space/i)).not.toBeInTheDocument();

    // 2. Computer: Shows bonus credit when studying and freelance income
    expect(screen.getByText('🎓 Bonus Study Credit (-1 Lesson)')).toBeInTheDocument();
    expect(screen.getByText('💻 Freelance Income ($10–$150/turn chance)')).toBeInTheDocument();
    expect(screen.getByText('🎁 One-time: +3 😊 on buy')).toBeInTheDocument();
    expect(screen.getByText(/bonus credit when studying for university degrees/i)).toBeInTheDocument();

    // 3. Advanced-only Mental stat: NOT shown in Base version
    expect(screen.queryByText(/Max 🧠/i)).not.toBeInTheDocument();

    // 4. Books: Reference Library synergy
    rerender(
      <DurableCardModal
        durable={{ id: 'dictionary', isBook: true, isOwned: true }}
        player={mockPlayer}
        campaign={campaignWithTechAndBooks}
        rules={rulesWithoutSpace}
        onClose={handleClose}
      />
    );

    // Book synergy badge and narrative
    expect(screen.getByText(/3-Book Synergy: -1 Lesson/i)).toBeInTheDocument();
    expect(screen.getByText(/Part of the 3-book Reference Library \(Dictionary, Encyclopedia, Atlas\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/Max 🧠/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/space/i)).not.toBeInTheDocument();

    // 5. TV and VCR: No fake effects like "Enables VCR & TV viewing" or "Plays Video Tapes"
    rerender(
      <DurableCardModal
        durable={{ id: 'color_tv', isOwned: true }}
        player={mockPlayer}
        campaign={campaignWithTechAndBooks}
        rules={rulesWithoutSpace}
        onClose={handleClose}
      />
    );
    expect(screen.queryByText(/Enables VCR/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Plays Video Tapes/i)).not.toBeInTheDocument();
    expect(screen.getByText('🎁 One-time: +1 😊 on buy')).toBeInTheDocument();

    rerender(
      <DurableCardModal
        durable={{ id: 'vcr', isOwned: true }}
        player={mockPlayer}
        campaign={campaignWithTechAndBooks}
        rules={rulesWithoutSpace}
        onClose={handleClose}
      />
    );
    expect(screen.queryByText(/Plays Video Tapes/i)).not.toBeInTheDocument();
    expect(screen.getByText('🎁 One-time: +1 😊 on buy')).toBeInTheDocument();

    // 6. Stove & Microwave: +1 😊/turn in Base mode (no 'when eating'); hidden in Advanced mode
    rerender(
      <DurableCardModal
        durable={{ id: 'stove', isOwned: true }}
        player={mockPlayer}
        campaign={campaignWithTechAndBooks}
        rules={rulesWithoutSpace}
        onClose={handleClose}
      />
    );
    expect(screen.getByText('🍳 +1 😊/turn')).toBeInTheDocument();
    expect(screen.queryByText(/when eating/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Awards \+1 Happiness every turn\./i)).toBeInTheDocument();

    rerender(
      <DurableCardModal
        durable={{ id: 'microwave', isOwned: true }}
        player={mockPlayer}
        campaign={campaignWithTechAndBooks}
        rules={rulesWithoutSpace}
        onClose={handleClose}
      />
    );
    expect(screen.getByText('⚡ +1 😊/turn')).toBeInTheDocument();
    expect(screen.queryByText(/when eating/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Awards \+1 Happiness every turn\./i)).toBeInTheDocument();

    // In Advanced mode (usePhysicalMentalConditions: true):
    rerender(
      <DurableCardModal
        durable={{ id: 'stove', isOwned: true }}
        player={mockPlayer}
        campaign={campaignWithTechAndBooks}
        rules={{ ...rulesWithoutSpace, usePhysicalMentalConditions: true }}
        onClose={handleClose}
      />
    );
    expect(screen.queryByText(/😊/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/when eating/i)).not.toBeInTheDocument();

    rerender(
      <DurableCardModal
        durable={{ id: 'microwave', isOwned: true }}
        player={mockPlayer}
        campaign={campaignWithTechAndBooks}
        rules={{ ...rulesWithoutSpace, usePhysicalMentalConditions: true }}
        onClose={handleClose}
      />
    );
    expect(screen.queryByText(/😊/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/when eating/i)).not.toBeInTheDocument();
  });

  it('renders ApartmentFurnishings with seamless full-height expansion and no restrictive inner box styling', () => {
    const { container } = render(
      <ApartmentFurnishings
        player={mockPlayer}
        campaign={mockCampaign}
        rules={baseRules}
        onInspectDurable={vi.fn()}
      />
    );

    const showcase = screen.getByTestId('apartment-furnishings');
    expect(showcase).toBeInTheDocument();

    // Verify seamless transparent styling without restrictive inner borders/padding
    expect(showcase.style.background).toBe('transparent');
    expect(showcase.style.borderStyle === 'none' || showcase.style.border === 'none' || !showcase.style.border).toBe(true);
    expect(showcase.style.height).toBe('100%');
    expect(showcase.style.flex).toBe('1 1 auto');

    // Verify grid has full-height expansion and start alignment
    const grid = container.querySelector('.apartment-furnishings-grid') as HTMLElement;
    expect(grid).toBeInTheDocument();
    expect(grid.style.height).toBe('100%');
    expect(grid.style.flex).toBe('1 1 auto');
    expect(grid.style.alignContent).toBe('start');
  });
});
