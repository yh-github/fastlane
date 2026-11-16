import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { loadCampaign } from '../src/engine/dataLoader';
import { createPlayerState, createDefaultGoalAllotment } from '../src/engine/stateFactories';
import { InventoryModal } from '../src/ui/InventoryModal';
import type { PlayerState } from '../src/engine/gameState';

describe('Inventory Status - Campaign Versions & helpfulUI Rules', () => {
  it('1990 Classic Floppy (Basic): Hides Fast Food and Canned Food by default (helpfulUI: false)', async () => {
    const campaignFloppy = await loadCampaign('1990_classic_floppy');
    const player: PlayerState = {
      ...createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'board', campaignFloppy.config),
      inventory: {
        freshFoodUnits: 3,
        cannedFoodUnits: 0,
        fastFoodItems: [{ itemId: 'burger', happinessBonus: 1 }],
        casualClothesWeeks: 4,
        dressClothesWeeks: 0,
        businessClothesWeeks: 0,
        selectedClothes: 'casual',
        appliances: [],
        books: [],
        pawnedItems: [],
        stocks: { tBills: 0, holdings: {} },
        lotteryTickets: 0
      }
    };

    // Default floppy rules have helpfulUI: false
    expect(campaignFloppy.config.gameRules.helpfulUI).toBe(false);

    render(
      <InventoryModal
        player={player}
        campaign={campaignFloppy}
        rules={campaignFloppy.config.gameRules}
        turn={1}
        onClose={vi.fn()}
      />
    );

    // Fresh food is shown
    expect(screen.getByText(/Fresh Food: 3 units/i)).toBeInTheDocument();

    // Fast food is NOT shown (because helpfulUI is false in classic floppy)
    expect(screen.queryByText(/Fast Food/i)).not.toBeInTheDocument();

    // Canned food is NOT shown (because canned goods do not exist in classic floppy)
    expect(screen.queryByText(/Canned Food/i)).not.toBeInTheDocument();
  });

  it('1990 Classic Floppy (Basic): Shows Fast Food when helpfulUI is turned ON, but keeps Canned Food hidden', async () => {
    const campaignFloppy = await loadCampaign('1990_classic_floppy');
    const player: PlayerState = {
      ...createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'board', campaignFloppy.config),
      inventory: {
        freshFoodUnits: 2,
        cannedFoodUnits: 0,
        fastFoodItems: [{ itemId: 'burger', happinessBonus: 1 }, { itemId: 'fries', happinessBonus: 0 }],
        casualClothesWeeks: 4,
        dressClothesWeeks: 0,
        businessClothesWeeks: 0,
        selectedClothes: 'casual',
        appliances: [],
        books: [],
        pawnedItems: [],
        stocks: { tBills: 0, holdings: {} },
        lotteryTickets: 0
      }
    };

    render(
      <InventoryModal
        player={player}
        campaign={campaignFloppy}
        rules={{ ...campaignFloppy.config.gameRules, helpfulUI: true }}
        turn={1}
        onClose={vi.fn()}
      />
    );

    // Fast food is now shown because helpfulUI is ON
    expect(screen.getByText(/Fast Food: 2 meals/i)).toBeInTheDocument();

    // Canned food remains hidden because it does not exist in Basic
    expect(screen.queryByText(/Canned Food/i)).not.toBeInTheDocument();
  });

  it('Advanced Edition: Shows Fast Food & Canned Food with default rules (helpfulUI: true)', async () => {
    const campaignAdv = await loadCampaign('advanced');
    const player: PlayerState = {
      ...createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'board', campaignAdv.config),
      inventory: {
        freshFoodUnits: 4,
        cannedFoodUnits: 2,
        fastFoodItems: [{ itemId: 'hamburger', happinessBonus: 1 }],
        casualClothesWeeks: 4,
        dressClothesWeeks: 0,
        businessClothesWeeks: 0,
        selectedClothes: 'casual',
        appliances: [],
        books: [],
        pawnedItems: [],
        stocks: { tBills: 0, holdings: {} },
        lotteryTickets: 0
      }
    };

    expect(campaignAdv.config.gameRules.helpfulUI).toBe(true);

    render(
      <InventoryModal
        player={player}
        campaign={campaignAdv}
        rules={campaignAdv.config.gameRules}
        turn={1}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/Fresh Food: 4 units/i)).toBeInTheDocument();
    expect(screen.getByText(/Canned Food: 2 units/i)).toBeInTheDocument();
    expect(screen.getByText(/Fast Food: 1 meals/i)).toBeInTheDocument();
  });

  it('Advanced Edition: Hides Fast Food when helpfulUI is toggled OFF, but keeps Canned Food visible', async () => {
    const campaignAdv = await loadCampaign('advanced');
    const player: PlayerState = {
      ...createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'board', campaignAdv.config),
      inventory: {
        freshFoodUnits: 4,
        cannedFoodUnits: 2,
        fastFoodItems: [{ itemId: 'hamburger', happinessBonus: 1 }],
        casualClothesWeeks: 4,
        dressClothesWeeks: 0,
        businessClothesWeeks: 0,
        selectedClothes: 'casual',
        appliances: [],
        books: [],
        pawnedItems: [],
        stocks: { tBills: 0, holdings: {} },
        lotteryTickets: 0
      }
    };

    render(
      <InventoryModal
        player={player}
        campaign={campaignAdv}
        rules={{ ...campaignAdv.config.gameRules, helpfulUI: false }}
        turn={1}
        onClose={vi.fn()}
      />
    );

    // Fast food is hidden when helpfulUI is OFF
    expect(screen.queryByText(/Fast Food/i)).not.toBeInTheDocument();

    // Canned food is still shown (part of Advanced mechanics)
    expect(screen.getByText(/Canned Food: 2 units/i)).toBeInTheDocument();
    expect(screen.getByText(/Fresh Food: 4 units/i)).toBeInTheDocument();
  });

  it('Advanced 2000: Shows Fast Food & Canned Food by default, hides Fast Food when helpfulUI is OFF', async () => {
    const campaign2000 = await loadCampaign('advanced_2000');
    const player: PlayerState = {
      ...createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'board', campaign2000.config),
      inventory: {
        freshFoodUnits: 1,
        cannedFoodUnits: 1,
        fastFoodItems: [
          { itemId: 'scurvy_slaw', happinessBonus: 0 },
          { itemId: 'kraken_burger', happinessBonus: 0 }
        ],
        casualClothesWeeks: 4,
        dressClothesWeeks: 0,
        businessClothesWeeks: 0,
        selectedClothes: 'casual',
        appliances: [],
        books: [],
        pawnedItems: [],
        stocks: { tBills: 0, holdings: {} },
        lotteryTickets: 0
      }
    };

    // 1. With default helpfulUI (true)
    const { rerender } = render(
      <InventoryModal
        player={player}
        campaign={campaign2000}
        rules={campaign2000.config.gameRules}
        turn={1}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/Fresh Food: 1 units/i)).toBeInTheDocument();
    expect(screen.getByText(/Canned Food: 1 units/i)).toBeInTheDocument();
    expect(screen.getByText(/Fast Food: 2 meals/i)).toBeInTheDocument();

    // 2. Rerender with helpfulUI toggled to false
    rerender(
      <InventoryModal
        player={player}
        campaign={campaign2000}
        rules={{ ...campaign2000.config.gameRules, helpfulUI: false }}
        turn={1}
        onClose={vi.fn()}
      />
    );

    // Fast food is hidden
    expect(screen.queryByText(/Fast Food/i)).not.toBeInTheDocument();

    // Fresh and canned remain visible
    expect(screen.getByText(/Fresh Food: 1 units/i)).toBeInTheDocument();
    expect(screen.getByText(/Canned Food: 1 units/i)).toBeInTheDocument();
  });
});
