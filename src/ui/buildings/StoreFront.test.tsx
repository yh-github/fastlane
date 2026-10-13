import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StoreFront } from "./StoreFront";

describe("StoreFront", () => {
  it('StoreFront renders items for sale and dispatches buy action', () => {
    const mockPlayer = {
      id: 'p1',
      money: 500,
      hoursRemaining: 10,
      inventory: { appliances: [], books: [] }
    } as any;

    const mockItems = [
      { id: 'bicycle', name: 'Bicycle', basePrice: 100, category: 'vehicle' },
      { id: 'color_tv', name: 'Color TV', basePrice: 300, category: 'appliance' }
    ] as any;

    const mockOnAction = vi.fn();

    render(
      <StoreFront
        player={mockPlayer}
        onAction={mockOnAction}
        availableItems={mockItems}
        economicIndex={0}
      />
    );

    expect(screen.getByText(/Bicycle/i)).toBeInTheDocument();
    expect(screen.getByText(/Color TV/i)).toBeInTheDocument();

    const bicycleItem = screen.getByText(/Bicycle/i);
    fireEvent.click(bicycleItem);
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'buy', itemId: 'bicycle' });
  });

  it('StoreFront opens ItemCardModal when helpfulUI is true and displays price, ownership, on_buy modifiers, and BUY button', () => {
    const mockPlayer = {
      id: 'p1',
      money: 500,
      hoursRemaining: 10,
      inventory: { appliances: [{ id: 'color_tv', isBroken: false, condition: 'used' }], books: [] }
    } as any;

    const mockItems = [
      { id: 'bicycle', name: 'Bicycle', basePrice: 100, category: 'vehicle', happinessBonus: 2 },
      { id: 'color_tv', name: 'Color TV', basePrice: 300, category: 'appliance' }
    ] as any;

    const mockOnAction = vi.fn();

    render(
      <StoreFront
        player={mockPlayer}
        onAction={mockOnAction}
        availableItems={mockItems}
        economicIndex={0}
        rules={{ helpfulUI: true } as any}
      />
    );

    // Clicking bicycle opens the modal
    const bicycleItem = screen.getByText(/Bicycle/i);
    fireEvent.click(bicycleItem);

    // Verify modal is rendered
    expect(screen.getByTestId('durable-card-modal-backdrop')).toBeInTheDocument();
    expect(screen.getByText(/On-Purchase Modifiers/i)).toBeInTheDocument();
    expect(screen.getByText(/\+2 on buy/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\$100/i).length).toBeGreaterThanOrEqual(2);

    // Click BUY button inside modal
    const buyBtn = screen.getByTestId('btn-buy-modal-bicycle');
    fireEvent.click(buyBtn);
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'buy', itemId: 'bicycle' });
  });

  it('filters out food_2weeks and food_4weeks when advancedStores is true', () => {
    const mockPlayer = {
      id: 'p1',
      money: 1000,
      hoursRemaining: 10,
      inventory: { appliances: [], books: [] }
    } as any;

    const mockGroceryItems = [
      { id: 'food_1week', name: 'Food for 1 Week', basePrice: 55, category: 'food', subcategory: 'groceries' },
      { id: 'food_2weeks', name: 'Food for 2 Weeks', basePrice: 100, category: 'food', subcategory: 'groceries' },
      { id: 'food_4weeks', name: 'Food for 4 Weeks', basePrice: 190, category: 'food', subcategory: 'groceries' },
      { id: 'lottery_tickets', name: '10 Lottery Tickets', basePrice: 10, category: 'ticket' }
    ] as any;

    // 1. With advancedStores: true
    const { rerender } = render(
      <StoreFront
        player={mockPlayer}
        onAction={vi.fn()}
        availableItems={mockGroceryItems}
        economicIndex={0}
        rules={{ advancedStores: true, helpfulUI: true } as any}
      />
    );

    expect(screen.getByTestId('store-item-food_1week')).toBeInTheDocument();
    expect(screen.queryByTestId('store-item-food_2weeks')).not.toBeInTheDocument();
    expect(screen.queryByTestId('store-item-food_4weeks')).not.toBeInTheDocument();
    expect(screen.getByTestId('store-item-lottery_tickets')).toBeInTheDocument();

    // 2. With advancedStores: false
    rerender(
      <StoreFront
        player={mockPlayer}
        onAction={vi.fn()}
        availableItems={mockGroceryItems}
        economicIndex={0}
        rules={{ advancedStores: false, helpfulUI: true } as any}
      />
    );

    expect(screen.getByTestId('store-item-food_1week')).toBeInTheDocument();
    expect(screen.getByTestId('store-item-food_2weeks')).toBeInTheDocument();
    expect(screen.getByTestId('store-item-food_4weeks')).toBeInTheDocument();
  });

  it('allows quantity selection for bulk groceries and lottery tickets in ItemCardModal', () => {
    const mockPlayer = {
      id: 'p1',
      money: 1000,
      hoursRemaining: 10,
      inventory: { appliances: [], books: [] }
    } as any;

    const mockGroceryItem = { id: 'food_1week', name: 'Food for 1 Week', basePrice: 55, category: 'food', subcategory: 'groceries' } as any;
    const mockOnAction = vi.fn();

    render(
      <StoreFront
        player={mockPlayer}
        onAction={mockOnAction}
        availableItems={[mockGroceryItem]}
        economicIndex={0}
        rules={{ advancedStores: true, helpfulUI: true } as any}
      />
    );

    fireEvent.click(screen.getByTestId('store-item-food_1week'));

    // Verify quantity stepper is rendered
    expect(screen.getByTestId('btn-qty-minus')).toBeInTheDocument();
    expect(screen.getByTestId('btn-qty-plus')).toBeInTheDocument();
    expect(screen.getByTestId('btn-qty-preset-4')).toBeInTheDocument();

    // Click 4w preset (formula: 45 * 4 + 10 = 190)
    fireEvent.click(screen.getByTestId('btn-qty-preset-4'));
    expect(screen.getAllByText(/\$190/).length).toBeGreaterThanOrEqual(1);

    // Click BUY
    fireEvent.click(screen.getByTestId('btn-buy-modal-food_1week'));
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'buy', itemId: 'food_1week', quantity: 4 });
  });

  it('renders used clothes with "Used" naming and durability badges when available in store', () => {
    const mockPlayer = {
      id: 'p1',
      money: 500,
      hoursRemaining: 10,
      inventory: { appliances: [], books: [], casualClothesWeeks: 0, dressClothesWeeks: 0, businessClothesWeeks: 0 }
    } as any;

    const mockClothes = [
      { id: 'casual_clothes', name: 'Used Casual Clothes', basePrice: 35, category: 'clothes', subcategory: 'casual', weeks: 7 },
      { id: 'dress_clothes', name: 'Used Dress Clothes', basePrice: 90, category: 'clothes', subcategory: 'dress', weeks: 7 },
      { id: 'business_suit', name: 'Used Business Suit', basePrice: 100, category: 'clothes', subcategory: 'business', weeks: 3 }
    ] as any;

    const mockOnAction = vi.fn();

    render(
      <StoreFront
        player={mockPlayer}
        onAction={mockOnAction}
        availableItems={mockClothes}
        economicIndex={0}
        rules={{ helpfulUI: true } as any}
      />
    );

    expect(screen.getByText('Used Casual Clothes')).toBeInTheDocument();
    expect(screen.getByText('Used Dress Clothes')).toBeInTheDocument();
    expect(screen.getByText('Used Business Suit')).toBeInTheDocument();

    expect(screen.getAllByText('👔 7w')).toHaveLength(2);
    expect(screen.getByText('👔 3w')).toBeInTheDocument();

    // Clicking Used Business Suit opens ItemCardModal with 3 weeks of wear badge
    fireEvent.click(screen.getByTestId('store-item-business_suit'));
    expect(screen.getByText(/\+3 Weeks of wear/i)).toBeInTheDocument();
  });
});
