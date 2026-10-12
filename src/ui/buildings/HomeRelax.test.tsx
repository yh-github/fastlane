import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { HomeRelax } from "./HomeRelax";

describe("HomeRelax", () => {
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
    expect(cleanServiceBtn.textContent).toContain('Professional cleaning (-10');
    expect(within(cleanServiceBtn).getByTestId('mess-icon')).toBeInTheDocument();

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

    // Flanking action wings begin folded; open Leisure wing
    fireEvent.click(screen.getByTestId('toggle-wing-leisure'));

    // Leisure actions are present in the left flanking wing
    const hostBtn = screen.getByTestId('btn-socialize');
    expect(hostBtn).not.toBeDisabled();
    expect(screen.getByText(/-1 💪/i)).toBeInTheDocument();

    fireEvent.click(hostBtn);
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'socialize_guests' });
  });

  it('HomeRelax dynamically updates Relax button with exact runtime gains based on conditions, mental condition bonus, first-turn bonus, mess, social, and appliances', () => {
    const mockPlayer = {
      id: 'p1',
      hoursRemaining: 6,
      physicalCondition: 30,
      mentalCondition: 50,
      social: 15,
      mess: 0,
      turnFlags: { relaxedThisTurn: false },
      inventory: {
        freshFoodUnits: 2,
        appliances: [{ id: 'color_tv', purchasePrice: 400, purchaseSource: 'socket_city' }],
        books: ['encyclopedia']
      }
    } as any;

    const mockCampaign = {
      housing: [{ id: 'low_cost', name: 'Low Cost' }],
      items: [
        { id: 'color_tv', name: 'Color TV', basePrice: 400, category: 'appliance', effects: [{ trigger: 'on_relax', stat: 'mental', value: 1 }] },
        { id: 'encyclopedia', name: 'Encyclopedia', basePrice: 100, category: 'book', effects: [{ trigger: 'continuous', stat: 'mental_max', value: 1 }] }
      ],
      config: {
        timeRules: { relaxCost: 6, cleaningServiceCost: 1, socializeCost: 6 },
        economyRules: { cleaningServiceBasePrice: 100 },
        statRules: { relaxMessIncrease: 1 }
      }
    } as any;

    const { rerender } = render(
      <HomeRelax
        player={mockPlayer}
        onAction={vi.fn()}
        campaign={mockCampaign}
        rules={{ trackMess: true, usePhysicalMentalConditions: true } as any}
        economicIndex={0}
      />
    );

    // Flanking action wings begin folded; open Leisure wing
    fireEvent.click(screen.getByTestId('toggle-wing-leisure'));

    // Initial Relax card in Left Wing:
    // Phys gain: 1 + Math.floor(50/25) = 3
    // Mental gain: firstBonus (2) + 3 + mentalBonus(1) + socialMentalBonus(1) = 7
    // Mess: +1
    expect(screen.getByText(/\+3 💪 Phys/i)).toBeInTheDocument();
    expect(screen.getByText(/\+7 🧠 Mental/i)).toBeInTheDocument();
    const relaxCard = screen.getByTestId('home-card-relax');
    expect(within(relaxCard).getByText(/\+1/i)).toBeInTheDocument();
    expect(within(relaxCard).getByTestId('mess-icon')).toBeInTheDocument();
    const relaxBtn = screen.getByTestId('btn-relax');
    expect(relaxBtn.textContent).toContain('Relax');

    // After relaxing once this turn (relaxedThisTurn = true)
    const relaxedPlayer = {
      ...mockPlayer,
      turnFlags: { relaxedThisTurn: true }
    };
    rerender(
      <HomeRelax
        player={relaxedPlayer}
        onAction={vi.fn()}
        campaign={mockCampaign}
        rules={{ trackMess: true, usePhysicalMentalConditions: true } as any}
        economicIndex={0}
      />
    );
    // firstBonus becomes 0 -> Mental gain is 5
    expect(screen.getByText(/\+3 💪 Phys/i)).toBeInTheDocument();
    expect(screen.getByText(/\+5 🧠 Mental/i)).toBeInTheDocument();

    // When starving (0 food)
    const starvingPlayer = {
      ...mockPlayer,
      inventory: { freshFoodUnits: 0, fastFoodItems: [], appliances: [], books: [] }
    };
    rerender(
      <HomeRelax
        player={starvingPlayer}
        onAction={vi.fn()}
        campaign={mockCampaign}
        rules={{ trackMess: true, usePhysicalMentalConditions: true } as any}
        economicIndex={0}
      />
    );
    expect(screen.getByText(/⚠️ Starving: -1 Max 💪 & 🧠!/i)).toBeInTheDocument();
  });

  it('HomeRelax renders presentable Amenities & Storage section with Fresh food, fridge status, fast food, and appliances', () => {
    const mockPlayer = {
      id: 'p1',
      hoursRemaining: 6,
      inventory: {
        freshFoodUnits: 4,
        fastFoodItems: [{ itemId: 'cheeseburger', happinessBonus: 3 }],
        appliances: [
          { id: 'refrigerator', purchasePrice: 600, purchaseSource: 'socket_city' },
          { id: 'stereo', purchasePrice: 200, purchaseSource: 'socket_city' }
        ],
        books: ['dictionary']
      }
    } as any;

    const mockCampaign = {
      housing: [{ id: 'low_cost', name: 'Low Cost' }],
      items: [
        { id: 'refrigerator', name: 'Refrigerator', basePrice: 600, category: 'appliance', tags: ['refrigerator'] },
        { id: 'stereo', name: 'Stereo', basePrice: 200, category: 'appliance', effects: [{ trigger: 'on_relax', stat: 'mental', value: 1 }] },
        { id: 'cheeseburger', name: 'Cheeseburger', basePrice: 6, category: 'food' },
        { id: 'dictionary', name: 'Dictionary', basePrice: 40, category: 'book', effects: [{ trigger: 'continuous', stat: 'mental_max', value: 1 }] }
      ],
      config: {
        timeRules: { relaxCost: 6, cleaningServiceCost: 1, socializeCost: 6 },
        economyRules: { cleaningServiceBasePrice: 100 },
        statRules: {}
      }
    } as any;

    render(
      <HomeRelax
        player={mockPlayer}
        onAction={vi.fn()}
        campaign={mockCampaign}
        rules={{ trackMess: true, usePhysicalMentalConditions: true } as any}
        economicIndex={0}
      />
    );

    // Verify Showcase
    expect(screen.getByTestId('apartment-furnishings')).toBeInTheDocument();

    // Verify Durables shown in showcase
    expect(screen.getByText(/Refrigerator/i)).toBeInTheDocument();
    expect(screen.getByText(/Stereo/i)).toBeInTheDocument();
    expect(screen.getByText(/Dictionary/i)).toBeInTheDocument();

    // Click Stereo to inspect card
    fireEvent.click(screen.getByTitle(/Stereo/i));
    expect(screen.getByText(/\+1 🧠/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Back to Apartment|✕/i }));

    // Click Dictionary to inspect card
    fireEvent.click(screen.getByTitle(/Dictionary/i));
    expect(screen.getByText(/\+1 Max 🧠/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Back to Apartment|✕/i }));

    // Flanking action wings begin folded; open Chores wing
    fireEvent.click(screen.getByTestId('toggle-wing-chores'));

    // In Right Wing, Pantry status card is rendered
    expect(screen.getByTestId('home-card-pantry')).toBeInTheDocument();
    expect(screen.getByText(/Fridge/i)).toBeInTheDocument();
    expect(screen.getByText(/4/)).toBeInTheDocument(); // 4 fresh units
    expect(screen.getByText(/Fast Food/i)).toBeInTheDocument();

    // Clicking Pantry '?' help button opens Strategy Guide modal for Pantry
    const pantryHelpBtn = within(screen.getByTestId('home-card-pantry')).getByRole('button', { name: 'Help & Details' });
    fireEvent.click(pantryHelpBtn);
    expect(screen.getByText(/Pantry & Food Supplies/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Got It' }));
  });

  it('HomeRelax renders classic amenities layout when advancedHomeGUI is disabled', () => {
    const mockPlayer = {
      id: 'p1',
      hoursRemaining: 6,
      inventory: {
        freshFoodUnits: 4,
        fastFoodItems: [{ itemId: 'cheeseburger', happinessBonus: 3 }],
        appliances: [
          { id: 'refrigerator', purchasePrice: 600, purchaseSource: 'socket_city' },
          { id: 'stereo', purchasePrice: 200, purchaseSource: 'socket_city' }
        ],
        books: ['dictionary']
      }
    } as any;

    const mockCampaign = {
      housing: [{ id: 'low_cost', name: 'Low Cost' }],
      items: [
        { id: 'refrigerator', name: 'Refrigerator', basePrice: 600, category: 'appliance', tags: ['refrigerator'] },
        { id: 'stereo', name: 'Stereo', basePrice: 200, category: 'appliance', effects: [{ trigger: 'on_relax', stat: 'mental', value: 1 }] },
        { id: 'cheeseburger', name: 'Cheeseburger', basePrice: 6, category: 'food' },
        { id: 'dictionary', name: 'Dictionary', basePrice: 40, category: 'book', effects: [{ trigger: 'continuous', stat: 'mental_max', value: 1 }] }
      ],
      config: {
        timeRules: { relaxCost: 6, cleaningServiceCost: 1, socializeCost: 6 },
        economyRules: { cleaningServiceBasePrice: 100 },
        statRules: {}
      }
    } as any;

    render(
      <HomeRelax
        player={mockPlayer}
        onAction={vi.fn()}
        campaign={mockCampaign}
        rules={{ trackMess: true, helpfulUI: true } as any}
        economicIndex={0}
      />
    );

    // Verify Furnishings and Pantry in classic mode
    expect(screen.getByTestId('apartment-furnishings')).toBeInTheDocument();

    // Verify Pantry Pill Badge and click to view modal
    const pantryPill = screen.getByTestId('pantry-pill-badge');
    expect(pantryPill).toBeInTheDocument();
    expect(pantryPill).toHaveTextContent('4');
    fireEvent.click(pantryPill);

    expect(screen.getByTestId('pantry-details-modal')).toBeInTheDocument();
    expect(screen.getByText(/Pantry & Food Supplies/i)).toBeInTheDocument();
    expect(screen.getByText(/Refrigerator Active/i)).toBeInTheDocument();

    // Verify Fresh Food
    expect(screen.getByText(/4 units/i)).toBeInTheDocument();

    // Verify Fast food
    expect(screen.getByText(/Cheeseburger/i)).toBeInTheDocument();
    expect(screen.getByText(/\+3 😊/i)).toBeInTheDocument();

    // Verify Appliances & Books
    expect(screen.getByText(/Stereo/i)).toBeInTheDocument();
    expect(screen.getByText(/Dictionary/i)).toBeInTheDocument();

    // Clicking inspects durable cards
    fireEvent.click(screen.getByTestId('durable-card-stereo'));
    expect(screen.getByText(/\+1 🧠/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Back to Apartment|✕/i }));

    fireEvent.click(screen.getByTestId('durable-card-dictionary'));
    expect(screen.getByText(/\+1 Max 🧠/i)).toBeInTheDocument();
  });

  it('HomeRelax base version hides modifiers, pantry, and cleaning when helpfulUI and trackMess are off', () => {
    const mockPlayer = {
      id: 'p1',
      hoursRemaining: 6,
      inventory: {
        freshFoodUnits: 4,
        fastFoodItems: [{ itemId: 'cheeseburger', happinessBonus: 3 }],
        appliances: [{ id: 'stereo', purchasePrice: 200, purchaseSource: 'socket_city' }],
        books: ['dictionary']
      }
    } as any;

    const mockCampaign = {
      housing: [{ id: 'low_cost', name: 'Low Cost' }],
      items: [
        { id: 'stereo', name: 'Stereo', basePrice: 200, category: 'appliance', effects: [{ trigger: 'on_relax', stat: 'mental', value: 1 }] },
        { id: 'cheeseburger', name: 'Cheeseburger', basePrice: 6, category: 'food' },
        { id: 'dictionary', name: 'Dictionary', basePrice: 40, category: 'book', effects: [{ trigger: 'continuous', stat: 'mental_max', value: 1 }] }
      ],
      config: {
        timeRules: { relaxCost: 6 },
        statRules: {}
      }
    } as any;

    render(
      <HomeRelax
        player={mockPlayer}
        onAction={vi.fn()}
        campaign={mockCampaign}
        rules={{ trackMess: false, helpfulUI: false } as any}
        economicIndex={0}
      />
    );

    // Relax button displays classic short label RELAX
    const relaxBtn = screen.getByTestId('btn-relax');
    expect(relaxBtn.textContent).toBe('RELAX');

    // No cleaning column
    expect(screen.queryByText(/Cleaning & Maintenance/i)).not.toBeInTheDocument();

    // No pantry
    expect(screen.queryByText(/Pantry & Food Supplies/i)).not.toBeInTheDocument();

    // Visual cards for owned durables exist
    expect(screen.getByTestId('durable-card-stereo')).toBeInTheDocument();
    expect(screen.getByTestId('durable-card-dictionary')).toBeInTheDocument();

    // Clicking opens inspection modal
    fireEvent.click(screen.getByTestId('durable-card-stereo'));
    expect(screen.getAllByText(/Stereo/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/\+1 🧠/i)).toBeInTheDocument();
  });

});
