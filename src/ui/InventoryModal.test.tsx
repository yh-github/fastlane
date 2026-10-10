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
        rules={{ ...campaign.config.gameRules, helpfulUI: true } as any}
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
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
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
        rules={{ helpfulUI: true, autoEquipBestClothes: false } as any}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'dress' } });
    expect(onAction).toHaveBeenCalledWith({ type: 'change_clothes', clothes: 'dress' });
  });

  it('hides clothes dropdown and shows auto-equipped text when autoEquipBestClothes is enabled', () => {
    const campaign = createMockCampaign();
    const player = createTestPlayer(
      {
        inventory: {
          freshFoodUnits: 0,
          fastFoodItems: [],
          casualClothesWeeks: 4,
          dressClothesWeeks: 2,
          businessClothesWeeks: 0,
          selectedClothes: 'dress',
          appliances: [],
          books: [],
          tickets: { baseball: 0, theatre: 0, concert: 0 },
          lotteryTickets: 0,
          stocks: { tBills: 0, holdings: {} },
          pawnedItems: [],
        }
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
        rules={{ helpfulUI: true, autoEquipBestClothes: true } as any}
      />
    );

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText(/Auto-equipped/i)).toBeInTheDocument();
  });

  it('hides clothes dropdown and shows location hint when clothesSwitching is restricted (homeOrStore or homeOnly)', () => {
    const campaign = createMockCampaign();
    const player = createTestPlayer(
      {
        inventory: {
          freshFoodUnits: 0,
          fastFoodItems: [],
          casualClothesWeeks: 4,
          dressClothesWeeks: 2,
          businessClothesWeeks: 0,
          selectedClothes: 'dress',
          appliances: [],
          books: [],
          tickets: { baseball: 0, theatre: 0, concert: 0 },
          lotteryTickets: 0,
          stocks: { tBills: 0, holdings: {} },
          pawnedItems: [],
        }
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
        rules={{ helpfulUI: true, clothesSwitching: 'homeOrStore', autoEquipBestClothes: false } as any}
      />
    );

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText(/Change at Home or Clothing Stores/i)).toBeInTheDocument();
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

  it('hides condition badges (Brand New / Used) when helpfulUI is false', () => {
    const campaign = createMockCampaign();
    const player = createTestPlayer(
      {
        inventory: {
          freshFoodUnits: 0,
          fastFoodItems: [],
          casualClothesWeeks: 4,
          dressClothesWeeks: 0,
          businessClothesWeeks: 0,
          selectedClothes: 'casual',
          appliances: [
            { id: 'computer', purchasePrice: 1599, purchaseSource: 'socket_city', condition: 'new' },
            { id: 'bw_tv', purchasePrice: 50, purchaseSource: 'pawnshop', condition: 'used' }
          ],
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
        rules={{ helpfulUI: false } as any}
      />
    );

    expect(screen.getByText(/Computer/i)).toBeInTheDocument();
    expect(screen.getByText(/Bw Tv/i)).toBeInTheDocument();
    expect(screen.queryByText(/Brand New/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Used/i)).not.toBeInTheDocument();
  });

  it('displays condition badges (Brand New / Used) when helpfulUI is true', () => {
    const campaign = createMockCampaign();
    const player = createTestPlayer(
      {
        inventory: {
          freshFoodUnits: 0,
          fastFoodItems: [],
          casualClothesWeeks: 4,
          dressClothesWeeks: 0,
          businessClothesWeeks: 0,
          selectedClothes: 'casual',
          appliances: [
            { id: 'computer', purchasePrice: 1599, purchaseSource: 'socket_city', condition: 'new' },
            { id: 'bw_tv', purchasePrice: 50, purchaseSource: 'pawnshop', condition: 'used' }
          ],
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

    expect(screen.getByText(/Brand New/i)).toBeInTheDocument();
    expect(screen.getByText(/Used/i)).toBeInTheDocument();
  });

  it('scrolls to clothes section and applies highlight when scrollToSection is "clothes"', () => {
    const campaign = createMockCampaign();
    const player = createTestPlayer({}, campaign);
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    render(
      <InventoryModal
        player={player}
        campaign={campaign}
        turn={1}
        onClose={vi.fn()}
        scrollToSection="clothes"
      />
    );

    const clothesSection = screen.getByTestId('status-section-clothes');
    expect(clothesSection).toBeInTheDocument();
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(clothesSection).toHaveClass('status-section--highlighted');
  });

  it('hides Fast Food when helpfulUI is false and shows it when helpfulUI is true', () => {
    const campaign = createMockCampaign();
    const player = createTestPlayer(
      {
        inventory: {
          freshFoodUnits: 2,
          fastFoodItems: [{ itemId: 'burger', happinessBonus: 1 }],
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

    const { rerender } = render(
      <InventoryModal
        player={player}
        campaign={campaign}
        turn={1}
        onClose={vi.fn()}
        rules={{ helpfulUI: false } as any}
      />
    );

    // Fast food should NOT be shown when helpfulUI is false (original game behavior)
    expect(screen.queryByText(/Fast Food/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Fresh Food/i)).toBeInTheDocument();

    // Rerender with helpfulUI: true
    rerender(
      <InventoryModal
        player={player}
        campaign={campaign}
        turn={1}
        onClose={vi.fn()}
        rules={{ helpfulUI: true } as any}
      />
    );

    // Fast food should now be shown
    expect(screen.getByText(/Fast Food/i)).toBeInTheDocument();
  });

  it('hides Canned Food when campaign has no canned food items and player has none', () => {
    const campaign = createMockCampaign(); // default mock campaign has no canned food items
    const player = createTestPlayer(
      {
        inventory: {
          freshFoodUnits: 2,
          cannedFoodUnits: 0,
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
        rules={{ helpfulUI: true } as any}
      />
    );

    expect(screen.queryByText(/Canned Food/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Fresh Food/i)).toBeInTheDocument();
  });

  it('shows Canned Food when campaign includes canned food items', () => {
    const campaign = createMockCampaign({
      items: [
        { id: 'canned_meat', name: 'Canned Meat', category: 'food', subcategory: 'canned', happinessBonus: 0 }
      ]
    });
    const player = createTestPlayer(
      {
        inventory: {
          freshFoodUnits: 2,
          cannedFoodUnits: 0,
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
        rules={{ helpfulUI: true } as any}
      />
    );

    expect(screen.getByText(/Canned Food/i)).toBeInTheDocument();
  });

  it('shows Canned Food if player has cannedFoodUnits > 0 even if campaign items list is omitted', () => {
    const campaign = createMockCampaign();
    const player = createTestPlayer(
      {
        inventory: {
          freshFoodUnits: 2,
          cannedFoodUnits: 3,
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
        rules={{ helpfulUI: true } as any}
      />
    );

    expect(screen.getByText(/Canned Food/i)).toBeInTheDocument();
    expect(screen.getByText(/3 units/i)).toBeInTheDocument();
  });
});
