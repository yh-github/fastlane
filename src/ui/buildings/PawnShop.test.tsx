import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PawnShop } from "./PawnShop";

describe("PawnShop", () => {
  it('PawnShop renders pawn and redeem interface and handles pawn actions', () => {
    const mockPlayer = {
      id: 'p1',
      money: 200,
      hoursRemaining: 10,
      inventory: {
        appliances: [{ id: 'stereo', purchasePrice: 200, purchaseSource: 'socket_city' }],
        pawnedItems: [{ itemId: 'color_tv', originalPrice: 400, redeemCost: 200, weekPawned: 1, ownerId: 'p1' }]
      }
    } as any;

    const mockOnAction = vi.fn();

    render(
      <PawnShop
        player={mockPlayer}
        onAction={mockOnAction}
        economicIndex={0}
        pawnShopItemsForSale={[]}
      />
    );

    fireEvent.click(screen.getByTestId('tab-pawnshop-pawn'));
    expect(screen.getByText(/Sell Items/i)).toBeInTheDocument();
    expect(screen.getByText(/Buy Back/i)).toBeInTheDocument();
    expect(screen.getByText(/Stereo/i)).toBeInTheDocument();
  });

  it('PawnShop allows switching between Buy and Pawn tabs', () => {
    const mockPlayer = {
      id: 'p1',
      money: 200,
      hoursRemaining: 10,
      inventory: {
        appliances: [{ id: 'stereo', purchasePrice: 200, purchaseSource: 'socket_city' }],
        pawnedItems: []
      }
    } as any;

    const mockItems = [
      { id: 'knick_knack', name: 'Vintage Tin Robot', category: 'junk' as const, subcategory: 'curio', basePrice: 10, space: 2, happinessBonus: 1 }
    ];

    render(
      <PawnShop
        player={mockPlayer}
        onAction={vi.fn()}
        economicIndex={0}
        availableItems={mockItems}
      />
    );

    // Starts on Buy tab by default when availableItems present
    expect(screen.getByText(/Vintage Tin Robot/i)).toBeInTheDocument();
    expect(screen.queryByText(/Sell Items/i)).not.toBeInTheDocument();

    // Click Pawn tab
    fireEvent.click(screen.getByTestId('tab-pawnshop-pawn'));
    expect(screen.getByText(/Sell Items/i)).toBeInTheDocument();
    expect(screen.getByText(/Stereo/i)).toBeInTheDocument();

    // Click Buy tab again
    fireEvent.click(screen.getByTestId('tab-pawnshop-buy'));
    expect(screen.getByText(/Vintage Tin Robot/i)).toBeInTheDocument();
  });

  it('PawnShop displays curio selling impact breakdown and allows individual curio selling', () => {
    const mockPlayer = {
      id: 'p1',
      money: 200,
      hoursRemaining: 10,
      inventory: {
        knickKnacks: 2,
        curios: [
          { id: 'curio_1', catalogId: 'curio_vintage_tin_robot', name: 'Vintage Tin Robot', acquiredWeek: 1 },
          { id: 'curio_2', catalogId: 'curio_brass_carriage_clock', name: 'Brass Carriage Clock', acquiredWeek: 2 }
        ],
        appliances: [],
        pawnedItems: []
      }
    } as any;

    const mockOnAction = vi.fn();

    render(
      <PawnShop
        player={mockPlayer}
        onAction={mockOnAction}
        economicIndex={0}
        initialTab="pawn"
      />
    );

    // Modifier breakdown should be visible
    expect(screen.getByText(/Selling Impact Breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/Curios & Knick-Knacks/i)).toBeInTheDocument();

    // Toggle individual curio picker
    const toggleBtn = screen.getByTestId('btn-toggle-curios-picker');
    fireEvent.click(toggleBtn);

    // Individual list should appear
    expect(screen.getByTestId('pawn-individual-curios-list')).toBeInTheDocument();
    expect(screen.getByText('Vintage Tin Robot')).toBeInTheDocument();

    // Sell single curio
    const sellBtn = screen.getByTestId('btn-sell-curio-curio_1');
    fireEvent.click(sellBtn);

    expect(mockOnAction).toHaveBeenCalledWith({
      type: 'pawn_knick_knacks',
      curioId: 'curio_1',
      valuePerItem: expect.any(Number)
    });
  });

  it('PawnShop renders full rummage trigger in standard mode and compact trigger in compact mode', () => {
    const mockPlayer = {
      id: 'p1',
      money: 100,
      hoursRemaining: 5,
      inventory: { appliances: [], pawnedItems: [] }
    } as any;
    const mockOnAction = vi.fn();
    const mockRules = { pawnRummageBins: true, helpfulUI: true } as any;

    // 1. Standard mode
    const { unmount } = render(
      <PawnShop
        player={mockPlayer}
        onAction={mockOnAction}
        economicIndex={0}
        rules={mockRules}
        compact={false}
      />
    );

    const fullTrigger = screen.getByTestId('pawn-rummage-trigger');
    expect(fullTrigger).toBeInTheDocument();
    expect(fullTrigger).not.toHaveClass('pawn-rummage-trigger--compact');
    expect(screen.getByText(/Dig through unsorted bins of discarded goods/i)).toBeInTheDocument();

    const fullRummageBtn = screen.getByTestId('rummage-pawn-shop-btn');
    expect(fullRummageBtn).toHaveTextContent(/Rummage Through Bins/i);
    fireEvent.click(fullRummageBtn);
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'rummage_pawn_shop' });

    unmount();

    // 2. Compact mode
    render(
      <PawnShop
        player={mockPlayer}
        onAction={mockOnAction}
        economicIndex={0}
        rules={mockRules}
        compact={true}
      />
    );

    const compactTrigger = screen.getByTestId('pawn-rummage-trigger');
    expect(compactTrigger).toBeInTheDocument();
    expect(compactTrigger).toHaveClass('pawn-rummage-trigger--compact');
    expect(screen.getByText(/Dig for curios, parts & bargains/i)).toBeInTheDocument();

    const compactRummageBtn = screen.getByTestId('rummage-pawn-shop-btn');
    expect(compactRummageBtn).toHaveTextContent(/Rummage \(1 hr\)/i);
    fireEvent.click(compactRummageBtn);
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'rummage_pawn_shop' });
  });
});
