import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InventoryModal } from './InventoryModal';
import { createTestPlayer, createMockCampaign } from '../engine/testFactories';

describe('InventoryModal', () => {
  it('renders player status, overview finances, and inventory items', () => {
    const campaign = createMockCampaign();
    const player = createTestPlayer(
      {
        money: 450,
        bankSavings: 1200,
        loanDebt: 100,
        rentDebt: 50,
        currentJobId: 'burger_cook',
        currentWage: 6,
        inventory: {
          freshFoodUnits: 8,
          fastFoodItems: [{ itemId: 'burger', happinessBonus: 1 }],
          casualClothesWeeks: 5,
          dressClothesWeeks: 0,
          businessClothesWeeks: 10,
          selectedClothes: 'casual',
          appliances: [{ id: 'refrigerator', purchasePrice: 400, purchaseSource: 'socket_city' }],
          books: ['dictionary'],
          tickets: { baseball: 2, theatre: 0, concert: 1 },
          lotteryTickets: 3,
          stocks: { tBills: 4, holdings: { acme: 10 } },
          pawnedItems: [],
        },
        degrees: ['junior_college'],
      },
      campaign
    );

    const onClose = vi.fn();
    const onAction = vi.fn();

    render(
      <InventoryModal
        player={player}
        campaign={campaign}
        turn={3}
        onClose={onClose}
        onAction={onAction}
        rules={campaign.config.gameRules as any}
      />
    );

    // Overview finances
    expect(screen.getByText(/Cash: \$450/i)).toBeInTheDocument();
    expect(screen.getByText(/Savings: \$1200/i)).toBeInTheDocument();
    expect(screen.getByText(/Loans: \$100/i)).toBeInTheDocument();
    expect(screen.getByText(/Rent Arrears: \$50/i)).toBeInTheDocument();

    // Food and items
    expect(screen.getByText(/Fresh Food/i)).toBeInTheDocument();
    expect(screen.getByText(/8 units/i)).toBeInTheDocument();
    expect(screen.getByText(/Fast Food/i)).toBeInTheDocument();
    expect(screen.getByText(/1 meals/i)).toBeInTheDocument();

    // Appliances & Books
    expect(screen.getByText(/Refrigerator/i)).toBeInTheDocument();
    expect(screen.getByText(/Dictionary/i)).toBeInTheDocument();

    // Close button
    fireEvent.click(screen.getByText('✖'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('triggers onAction when changing selected clothes', () => {
    const campaign = createMockCampaign();
    const player = createTestPlayer(
      {
        inventory: {
          freshFoodUnits: 0,
          fastFoodItems: [],
          casualClothesWeeks: 4,
          dressClothesWeeks: 6,
          businessClothesWeeks: 0,
          selectedClothes: 'casual',
          appliances: [],
          books: [],
          tickets: { baseball: 0, theatre: 0, concert: 0 },
          lotteryTickets: 0,
          stocks: { tBills: 0, holdings: {} },
          pawnedItems: [],
        },
      },
      campaign
    );

    const onAction = vi.fn();

    render(
      <InventoryModal
        player={player}
        campaign={campaign}
        turn={1}
        onClose={vi.fn()}
        onAction={onAction}
        rules={{ helpfulUI: true } as any}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'dress' } });
    expect(onAction).toHaveBeenCalledWith({ type: 'change_clothes', clothes: 'dress' });
  });

  it('renders innovations in Overview and Formula Attributes sections when player has innovations', () => {
    const campaign = createMockCampaign();
    const player = createTestPlayer(
      {
        currentJobId: 'burger_cook',
        currentWage: 6,
        innovationCount: 3,
        inventory: {
          freshFoodUnits: 0,
          fastFoodItems: [],
          casualClothesWeeks: 4,
          dressClothesWeeks: 0,
          businessClothesWeeks: 0,
          selectedClothes: 'casual',
          appliances: [],
          books: [],
          tickets: { baseball: 0, theatre: 0, concert: 0 },
          lotteryTickets: 0,
          stocks: { tBills: 0, holdings: {} },
          pawnedItems: [],
        },
      },
      campaign
    );

    render(
      <InventoryModal
        player={player}
        campaign={campaign}
        turn={1}
        onClose={vi.fn()}
        onAction={vi.fn()}
        rules={{ helpfulUI: true } as any}
      />
    );

    expect(screen.getByText(/3 Innovations/i)).toBeInTheDocument();
    expect(screen.getByText(/Workplace Innovations:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/💡 3/i).length).toBeGreaterThan(0);
  });
});
