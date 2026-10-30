import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BuildingModal } from '../src/ui/BuildingModal';
import { gameReducer } from '../src/engine/gameReducer';
import type { PlayerState, GameRules, PawnedItem } from '../src/engine/gameState';
import type { CampaignBundle } from '../src/engine/dataLoader';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.defaultValue) return options.defaultValue;
      return key;
    }
  }),
}));

describe('GUI Parity: Authentic vs Generated Views are Pure Presentation', () => {
  const mockCampaign: CampaignBundle = {
    config: {
      name: '1990_classic_floppy',
      timeRules: {
        buildingEntryCost: 1,
        jobApplicationCost: 4,
        workSessionCost: 6,
        studySessionCost: 5,
        moveApartmentCost: 4
      },
      statRules: {
        baseMaxHours: 50,
        unfedTurnStarvationHours: 10
      },
      economyRules: {
        pawnPayoutRate: 0.4,
        pawnRedeemRate: 0.5
      }
    } as any,
    buildings: [
      { id: 'apartment_complex', name: 'Apartment Complex', archetype: 'housing' },
      { id: 'low_cost_housing', name: 'Low Cost Housing', archetype: 'home' },
      { id: 'security_apartments', name: 'Security Apartments', archetype: 'home' },
      { id: 'burger_palace', name: 'Monolith Burgers', archetype: 'fast_food', inventory: [{ itemId: 'hamburger', priceOverride: 5 }] },
      { id: 'pawn_shop', name: 'Pawn Shop', archetype: 'discount_and_pawn', inventory: [{ itemId: 'toaster', priceOverride: 60 }] },
      { id: 'bank', name: 'First City Bank', archetype: 'bank' },
      { id: 'employment_office', name: 'Employment Office', archetype: 'workplace' },
      { id: 'university', name: 'University', archetype: 'education' },
      { id: 'factory', name: 'Factory', archetype: 'workplace' }
    ] as any,
    housing: [
      { id: 'low_cost', name: 'Low-Cost Housing', baseRent: 325, homeNodeId: 'node_low_cost' },
      { id: 'security', name: 'Security Apartments', baseRent: 475, homeNodeId: 'node_security' }
    ] as any,
    items: [
      { id: 'hamburger', name: 'Hamburger', category: 'food', basePrice: 5 },
      { id: 'toaster', name: 'Toaster', category: 'appliance', basePrice: 60 },
      { id: 'tv', name: 'Television', category: 'appliance', basePrice: 200 }
    ] as any,
    jobs: [
      { id: 'burger_cook', title: 'Cook', baseWage: 6, locationId: 'burger_palace', requirements: { experience: 0, dependability: 0, degrees: [] } },
      { id: 'rent_clerk', title: 'Rent Clerk', baseWage: 8, locationId: 'apartment_complex', requirements: { experience: 0, dependability: 0, degrees: [] } },
      { id: 'factory_worker', title: 'Worker', baseWage: 7, locationId: 'factory', requirements: { experience: 0, dependability: 0, degrees: [] } }
    ] as any,
    education: [
      { id: 'business_admin', name: 'Business Administration', baseTuitionFee: 50, courses: [] }
    ] as any,
    map: {
      nodes: [
        { id: 'node_apt', buildingId: 'apartment_complex', x: 10, y: 10 },
        { id: 'node_low_cost', buildingId: 'low_cost_housing', x: 20, y: 20 },
        { id: 'node_security', buildingId: 'security_apartments', x: 30, y: 30 },
        { id: 'node_burgers', buildingId: 'burger_palace', x: 40, y: 40 },
        { id: 'node_pawn', buildingId: 'pawn_shop', x: 50, y: 50 },
        { id: 'node_bank', buildingId: 'bank', x: 60, y: 60 },
        { id: 'node_emp', buildingId: 'employment_office', x: 70, y: 70 }
      ],
      edges: []
    } as any
  };

  const getBasePlayer = (overrides?: Partial<PlayerState>): PlayerState => ({
    id: 'p1',
    name: 'Player',
    money: 1000,
    bankSavings: 500,
    hoursRemaining: 40,
    happiness: 50,
    position: 'node_pawn',
    currentHousingId: 'low_cost',
    currentRentPrice: 325,
    rentPaidUntilWeek: 4,
    rentDebt: 0,
    degrees: [],
    experience: 10,
    dependability: 50,
    currentJobId: null,
    currentWage: 0,
    turnFlags: {},
    inventory: {
      appliances: [{ id: 'tv', purchasePrice: 200, isBroken: false } as any],
      foodItems: [],
      fastFoodItems: [],
      lotteryTickets: [],
      books: [],
      pawnedItems: [],
      stocks: { tBills: 0, holdings: {} },
      selectedClothes: 'casual',
      casualClothesWeeks: 10,
      freshFoodUnits: 0,
      cannedFoodUnits: 0
    },
    ...overrides
  } as any);

  it('both GUI modes dispatch the exact same pawn action signature and gameReducer updates state identically', async () => {
    let capturedGeneratedAction: any = null;
    let capturedAuthenticAction: any = null;

    const baseRules: GameRules = {
      guiStyle: 'generated',
      advancedWorkGUI: false
    } as any;

    const player = getBasePlayer();

    // 1. Render in Generated GUI
    const { unmount: unmountGen } = render(
      <BuildingModal
        player={player}
        campaign={mockCampaign}
        currentBuildingId="pawn_shop"
        turn={4}
        economicIndex={0}
        rules={{ ...baseRules, guiStyle: 'generated' }}
        onAction={async (action) => {
          capturedGeneratedAction = action;
          return { key: 'action.pawn.pawned' };
        }}
        onClose={vi.fn()}
      />
    );

    // Switch to pawn tab and click pawn TV
    const pawnTab = screen.getByTestId('tab-pawn');
    fireEvent.click(pawnTab);
    const subPawnTab = screen.getByTestId('tab-pawnshop-pawn');
    fireEvent.click(subPawnTab);
    const pawnTvBtn = document.querySelector('[data-action-target="pawn-tv"]') as HTMLElement;
    await act(async () => {
      fireEvent.click(pawnTvBtn);
    });
    unmountGen();

    // 2. Render in Authentic GUI
    const { unmount: unmountAuth } = render(
      <BuildingModal
        player={player}
        campaign={mockCampaign}
        currentBuildingId="pawn_shop"
        turn={4}
        economicIndex={0}
        rules={{ ...baseRules, guiStyle: 'authentic' }}
        onAction={async (action) => {
          capturedAuthenticAction = action;
          return { key: 'action.pawn.pawned' };
        }}
        onClose={vi.fn()}
      />
    );

    // Click 1. PAWN ITEMS menu button
    const pawnModeBtn = screen.getByTestId('btn-pawn-mode');
    fireEvent.click(pawnModeBtn);
    const authPawnTv = screen.getByTestId('pawn-item-tv');
    await act(async () => {
      fireEvent.click(authPawnTv);
    });
    unmountAuth();

    // Verify both dispatched 'pawn_item' with the exact same payload
    expect(capturedGeneratedAction).toBeDefined();
    expect(capturedAuthenticAction).toBeDefined();
    expect(capturedAuthenticAction.type).toBe('pawn_item');
    expect(capturedGeneratedAction.type).toBe('pawn_item');
    expect(capturedAuthenticAction.item.id).toBe('tv');
    expect(capturedGeneratedAction.item.id).toBe('tv');
    expect(capturedAuthenticAction.value).toBe(capturedGeneratedAction.value);

    // Run both actions through gameReducer and prove state outcomes are 100% identical
    const context = {
      state: { players: [player], economicIndex: 0 } as any,
      campaign: mockCampaign,
      rules: baseRules,
      turn: 4,
      economicIndex: 0,
      rng: { next: () => 0.5, getState: () => ({}) } as any
    };

    const resGen = gameReducer(player, capturedGeneratedAction, context);
    const resAuth = gameReducer(player, capturedAuthenticAction, context);

    expect(resGen.updatedPlayer.money).toBe(resAuth.updatedPlayer.money);
    expect(resGen.updatedPlayer.inventory.appliances).toEqual(resAuth.updatedPlayer.inventory.appliances);
    expect(resGen.updatedPlayer.inventory.pawnedItems).toEqual(resAuth.updatedPlayer.inventory.pawnedItems);
  });

  it('both GUI modes dispatch the exact same redeem action signature and gameReducer updates state identically', async () => {
    let capturedGeneratedAction: any = null;
    let capturedAuthenticAction: any = null;

    const pawnedItem: PawnedItem = {
      itemId: 'tv',
      originalPrice: 200,
      redeemCost: 100,
      weekPawned: 1,
      ownerId: 'p1',
      purchaseSource: 'socket_city',
      condition: 'good'
    };

    const player = getBasePlayer({
      inventory: {
        ...getBasePlayer().inventory,
        appliances: [],
        pawnedItems: [pawnedItem]
      }
    });

    const baseRules: GameRules = {
      guiStyle: 'generated',
      advancedWorkGUI: false
    } as any;

    // 1. Generated GUI
    const { unmount: unmountGen } = render(
      <BuildingModal
        player={player}
        campaign={mockCampaign}
        currentBuildingId="pawn_shop"
        turn={4}
        economicIndex={0}
        rules={{ ...baseRules, guiStyle: 'generated' }}
        onAction={async (action) => {
          capturedGeneratedAction = action;
          return { key: 'action.pawn.redeemed' };
        }}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('tab-pawn'));
    fireEvent.click(screen.getByTestId('tab-pawnshop-pawn'));
    const redeemBtn = document.querySelector('[data-action-target="redeem-tv"]') as HTMLElement;
    await act(async () => {
      fireEvent.click(redeemBtn);
    });
    unmountGen();

    // 2. Authentic GUI
    const { unmount: unmountAuth } = render(
      <BuildingModal
        player={player}
        campaign={mockCampaign}
        currentBuildingId="pawn_shop"
        turn={4}
        economicIndex={0}
        rules={{ ...baseRules, guiStyle: 'authentic' }}
        onAction={async (action) => {
          capturedAuthenticAction = action;
          return { key: 'action.pawn.redeemed' };
        }}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('btn-redeem-mode'));
    const authRedeemBtn = screen.getByTestId('redeem-item-tv');
    await act(async () => {
      fireEvent.click(authRedeemBtn);
    });
    unmountAuth();

    expect(capturedGeneratedAction.type).toBe('redeem_item');
    expect(capturedAuthenticAction.type).toBe('redeem_item');
    expect(capturedAuthenticAction.item.itemId).toBe('tv');
    expect(capturedGeneratedAction.item.itemId).toBe('tv');
    expect(capturedAuthenticAction.cost).toBe(capturedGeneratedAction.cost);

    const context = {
      state: { players: [player], economicIndex: 0 } as any,
      campaign: mockCampaign,
      rules: baseRules,
      turn: 4,
      economicIndex: 0,
      rng: { next: () => 0.5, getState: () => ({}) } as any
    };

    const resGen = gameReducer(player, capturedGeneratedAction, context);
    const resAuth = gameReducer(player, capturedAuthenticAction, context);

    expect(resGen.updatedPlayer.money).toBe(resAuth.updatedPlayer.money);
    expect(resGen.updatedPlayer.inventory.appliances).toEqual(resAuth.updatedPlayer.inventory.appliances);
    expect(resGen.updatedPlayer.inventory.pawnedItems).toEqual(resAuth.updatedPlayer.inventory.pawnedItems);
  });

  it('both GUI modes dispatch the exact same rent payment action and amount', async () => {
    let capturedGeneratedAction: any = null;
    let capturedAuthenticAction: any = null;

    const player = getBasePlayer({
      currentHousingId: 'low_cost',
      currentRentPrice: 325,
      rentPaidUntilWeek: 4,
      rentDebt: 0
    });

    const baseRules: GameRules = {
      guiStyle: 'generated',
      advancedWorkGUI: false
    } as any;

    // Generated GUI
    const { unmount: unmountGen } = render(
      <BuildingModal
        player={player}
        campaign={mockCampaign}
        currentBuildingId="apartment_complex"
        turn={4}
        economicIndex={0}
        rules={{ ...baseRules, guiStyle: 'generated' }}
        onAction={async (action) => {
          capturedGeneratedAction = action;
          return { key: 'action.rent.paid' };
        }}
        onClose={vi.fn()}
      />
    );

    const payRentBtn = screen.getByTestId('btn-pay-rent');
    await act(async () => {
      fireEvent.click(payRentBtn);
    });
    unmountGen();

    // Authentic GUI
    const { unmount: unmountAuth } = render(
      <BuildingModal
        player={player}
        campaign={mockCampaign}
        currentBuildingId="apartment_complex"
        turn={4}
        economicIndex={0}
        rules={{ ...baseRules, guiStyle: 'authentic' }}
        onAction={async (action) => {
          capturedAuthenticAction = action;
          return { key: 'action.rent.paid' };
        }}
        onClose={vi.fn()}
      />
    );

    const authPayRentBtn = screen.getByTestId('btn-pay-rent');
    await act(async () => {
      fireEvent.click(authPayRentBtn);
    });
    unmountAuth();

    expect(capturedGeneratedAction).toEqual({ type: 'rent_transaction', amount: 325 });
    expect(capturedAuthenticAction).toEqual({ type: 'rent_transaction', amount: 325 });
  });

  it('both GUI modes dispatch the exact same burger purchase action', async () => {
    let capturedGeneratedAction: any = null;
    let capturedAuthenticAction: any = null;

    const player = getBasePlayer();
    const baseRules: GameRules = {
      guiStyle: 'generated',
      advancedWorkGUI: false
    } as any;

    // Generated GUI
    const { unmount: unmountGen } = render(
      <BuildingModal
        player={player}
        campaign={mockCampaign}
        currentBuildingId="burger_palace"
        turn={1}
        economicIndex={0}
        rules={{ ...baseRules, guiStyle: 'generated' }}
        onAction={async (action) => {
          capturedGeneratedAction = action;
          return { key: 'action.buy.success' };
        }}
        onClose={vi.fn()}
      />
    );

    const buyBurgerBtn = screen.getByTestId('store-item-hamburger');
    await act(async () => {
      fireEvent.click(buyBurgerBtn);
    });
    unmountGen();

    // Authentic GUI
    const { unmount: unmountAuth } = render(
      <BuildingModal
        player={player}
        campaign={mockCampaign}
        currentBuildingId="burger_palace"
        turn={1}
        economicIndex={0}
        rules={{ ...baseRules, guiStyle: 'authentic' }}
        onAction={async (action) => {
          capturedAuthenticAction = action;
          return { key: 'action.buy.success' };
        }}
        onClose={vi.fn()}
      />
    );

    const authBurgerBtn = screen.getByTestId('menu-item-hamburger');
    await act(async () => {
      fireEvent.click(authBurgerBtn);
    });
    unmountAuth();

    expect(capturedGeneratedAction).toEqual({ type: 'buy', itemId: 'hamburger' });
    expect(capturedAuthenticAction).toEqual({ type: 'buy', itemId: 'hamburger' });
  });
});
