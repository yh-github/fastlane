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
    expect(screen.getByText(/\+2 Happiness/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\$100/i).length).toBeGreaterThanOrEqual(2);

    // Click BUY button inside modal
    const buyBtn = screen.getByTestId('btn-buy-modal-bicycle');
    fireEvent.click(buyBtn);
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'buy', itemId: 'bicycle' });
  });

});
