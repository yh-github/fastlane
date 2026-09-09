import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { gameReducer } from '../src/engine/gameReducer';
import { calcEconomyPrice } from '../src/engine/economyEngine';
import { getAvailableActions } from '../src/engine/actionProvider';
import { PawnShop } from '../src/ui/buildings/PawnShop';
import type { PlayerState, GameState } from '../src/engine/gameState';
import { loadCampaign, type CampaignBundle } from '../src/engine/dataLoader';
import { Random } from '../src/utils/rng';

function createMockCampaign(preventPawnArbitrage = true): CampaignBundle {
  return {
    id: 'test_campaign',
    name: 'Test Campaign',
    version: '1.0.0',
    description: 'Test Campaign',
    config: {
      name: 'Test',
      version: '1.0.0',
      description: 'Test',
      startingMoney: 1000,
      winConditions: [],
      timeRules: {
        hoursPerTurn: 60,
        buildingEntryCost: 2,
        workSessionCost: 6,
        studySessionCost: 6,
        jobApplicationCost: 4,
        relaxCost: 6,
        relaxGain: 3,
        newspaperCost: 1,
        starvationPenalty: 20,
        doctorPenalty: 10,
        loanCost: 2,
        brokerCost: 2
      },
      economyRules: {
        rentGarnishRate: 0.5,
        rentFee: 2,
        repairCostMin: 0.05,
        repairCostMax: 0.25,
        pawnPayoutRate: 0.4,
        pawnRedeemRate: 0.5
      },
      mapRules: { allowDiagonalMovement: false, movementCostPerNode: 0.5 },
      statRules: {},
      eventRules: { marketCrashDivisor: 20, willyRobberyStartWeek: 1, charity: { maxCash: 0, maxWealth: 0, wealthMetric: 'durableValue' } },
      gameRules: {
        helpfulUI: true,
        preventPawnArbitrage
      }
    },
    items: [
      { id: 'refrigerator', name: 'Refrigerator', category: 'appliance', basePrice: 650, space: 40 },
      { id: 'color_tv', name: 'Color TV', category: 'appliance', basePrice: 400, space: 20 },
      { id: 'dictionary', name: 'Dictionary', category: 'book', basePrice: 100, space: 5 }
    ],
    housing: [],
    jobs: [],
    education: [],
    map: {
      nodes: [
        { id: 'node_pawn_shop', x: 0, y: 0, buildingId: 'pawn_shop', connections: [] }
      ]
    },
    buildings: [
      { id: 'pawn_shop', name: 'Pawn Shop', archetype: 'pawnshop', spritePath: '', description: '' }
    ]
  } as unknown as CampaignBundle;
}

function createInitialState(campaign: CampaignBundle, economicIndex = 0): GameState {
  const player: PlayerState = {
    id: 'player_1',
    name: 'Player 1',
    money: 1000,
    bankSavings: 0,
    education: 0,
    career: 0,
    happiness: 50,
    relaxation: 50,
    hoursRemaining: 50,
    location: 'pawn_shop',
    position: 'node_pawn_shop',
    currentNodeId: 'node_pawn_shop',
    currentHousingId: 'low_cost',
    rentOwed: 0,
    turnEvents: [],
    turnFlags: { hasEaten: true },
    experience: {},
    degrees: [],
    enrolledCourses: [],
    inventory: {
      appliances: [
        { id: 'refrigerator', purchasePrice: 650, purchaseSource: 'socket_city' }
      ],
      books: [],
      clothes: { casual: 10, dress: 0 },
      freshFoodUnits: 0,
      nonPerishableFoodUnits: 0,
      stocks: { tBills: 0, holdings: {} },
      pawnedItems: []
    }
  };

  return {
    players: [player],
    currentPlayerIndex: 0,
    turn: 1,
    economicIndex,
    economicTrend: 0,
    gameOver: false,
    rules: { ...campaign.config.gameRules },
    pawnShopItemsForSale: []
  };
}

describe('Pawn Shop Arbitrage Prevention', () => {
  it('prevents same-turn infinite money exploit during an economic boom (+60)', () => {
    const campaign = createMockCampaign(true);
    const state = createInitialState(campaign, 60);
    const player = state.players[0];

    const actions = getAvailableActions(player, state, campaign, true);
    const pawnAction = actions.find(a => a.action.type === 'pawn_item' && a.action.item.id === 'refrigerator');
    expect(pawnAction).toBeDefined();

    // At economy = +60, calcEconomyPrice(650, 60) = 650 + (650 * 60)/60 = 1300
    // Payout (40%): Math.floor(1300 * 0.4) = 520
    expect(pawnAction!.action.value).toBe(520);

    // 1. Pawn the refrigerator
    const context = {
      state,
      rules: state.rules!,
      campaign,
      turn: 1,
      rng: new Random(42)
    };

    const pawnResult = gameReducer(player, pawnAction!.action, context);
    expect(pawnResult.updatedPlayer.money).toBe(1520); // 1000 + 520
    expect(pawnResult.updatedPlayer.inventory.appliances).toHaveLength(0);
    expect(pawnResult.updatedPlayer.inventory.pawnedItems).toHaveLength(1);

    const pawnedItem = pawnResult.updatedPlayer.inventory.pawnedItems![0];
    // Redeem cost at +60 should be Math.floor(1300 * 0.5) = 650
    expect(pawnedItem.redeemCost).toBe(650);

    // 2. Check available actions after pawning
    const stateAfterPawn: GameState = {
      ...state,
      players: [pawnResult.updatedPlayer]
    };
    const actionsAfterPawn = getAvailableActions(pawnResult.updatedPlayer, stateAfterPawn, campaign, true);
    const redeemAction = actionsAfterPawn.find(a => a.action.type === 'redeem_item');
    expect(redeemAction).toBeDefined();
    expect(redeemAction!.action.cost).toBe(650);

    // Redeeming immediately on the same turn costs $650, while player only received $520
    // Net difference is -$130 (25% interest) -> Arbitrage is impossible!
    expect(redeemAction!.action.cost).toBeGreaterThan(pawnAction!.action.value);

    // 3. Perform immediate redemption
    const redeemResult = gameReducer(pawnResult.updatedPlayer, redeemAction!.action, {
      ...context,
      state: stateAfterPawn
    });
    expect(redeemResult.updatedPlayer.money).toBe(870); // 1520 - 650 = 870 ($130 net loss)
    expect(redeemResult.updatedPlayer.inventory.appliances).toHaveLength(1);
    expect(redeemResult.updatedPlayer.inventory.pawnedItems).toHaveLength(0);
  });

  it('prevents clearance second-hand arbitrage during economic boom', () => {
    const campaign = createMockCampaign(true);
    const state = createInitialState(campaign, 60);
    state.pawnShopItemsForSale = [
      { itemId: 'color_tv', originalPrice: 400, redeemCost: 200, weekPawned: 0, ownerId: 'other' }
    ];

    const actions = getAvailableActions(state.players[0], state, campaign, true);
    const buyAction = actions.find(a => a.action.type === 'buy_pawn_item');
    expect(buyAction).toBeDefined();

    // At economy = +60, TV market price = 800. 50% clearance price = 400.
    expect(buyAction!.action.cost).toBe(400);

    // Payout if immediately pawned at +60: Math.floor(800 * 0.4) = 320.
    // 400 > 320 -> Player cannot buy clearance and pawn for profit on the same turn.
    expect(buyAction!.action.cost).toBeGreaterThan(Math.floor(calcEconomyPrice(400, 60) * 0.4));
  });

  it('allows a legitimate net gain when the economy crashes wildly while item is pawned', () => {
    const campaign = createMockCampaign(true);
    // Week 1: Economic Boom (+60)
    const stateBoom = createInitialState(campaign, 60);
    const player = stateBoom.players[0];

    const contextBoom = {
      state: stateBoom,
      rules: stateBoom.rules!,
      campaign,
      turn: 1,
      rng: new Random(42)
    };

    // Pawn Fridge at peak economy (+60): receives $520
    const pawnAction = {
      type: 'pawn_item' as const,
      item: player.inventory.appliances[0],
      value: 520
    };
    const pawnRes = gameReducer(player, pawnAction, contextBoom);
    expect(pawnRes.updatedPlayer.money).toBe(1520);

    // Week 2: Market Crash! Economy drops from +60 to -30
    const stateCrash: GameState = {
      ...stateBoom,
      economicIndex: -30,
      turn: 2,
      players: [pawnRes.updatedPlayer]
    };

    // At economy = -30, market price of Fridge is calcEconomyPrice(650, -30) = 650 - 325 = 325
    // Dynamic redemption fee: Math.floor(325 * 0.5) = 162
    const actionsCrash = getAvailableActions(pawnRes.updatedPlayer, stateCrash, campaign, true);
    const redeemCrashAction = actionsCrash.find(a => a.action.type === 'redeem_item');
    expect(redeemCrashAction).toBeDefined();
    expect(redeemCrashAction!.action.cost).toBe(162);

    // Player redeems for $162
    const contextCrash = {
      state: stateCrash,
      rules: stateCrash.rules!,
      campaign,
      turn: 2,
      rng: new Random(42)
    };
    const redeemRes = gameReducer(pawnRes.updatedPlayer, redeemCrashAction!.action, contextCrash);

    // Final cash: 1520 - 162 = 1358
    // Starting cash was 1000. Net gain from timing the market crash: $358!
    expect(redeemRes.updatedPlayer.money).toBe(1358);
    expect(redeemRes.updatedPlayer.money - player.money).toBe(358);
  });

  it('preserves legacy static redemption behavior when preventPawnArbitrage is disabled', () => {
    const campaign = createMockCampaign(false); // Classic mode with bug
    const state = createInitialState(campaign, 60);
    const player = state.players[0];

    const context = {
      state,
      rules: state.rules!,
      campaign,
      turn: 1,
      rng: new Random(42)
    };

    // Legacy pawn
    const pawnAction = {
      type: 'pawn_item' as const,
      item: player.inventory.appliances[0],
      value: 520
    };
    const pawnRes = gameReducer(player, pawnAction, context);
    // In legacy mode, redeemCost is fixed at purchasePrice * 0.5 = 325
    expect(pawnRes.updatedPlayer.inventory.pawnedItems![0].redeemCost).toBe(325);

    const stateAfterPawn: GameState = {
      ...state,
      players: [pawnRes.updatedPlayer]
    };
    const actionsAfterPawn = getAvailableActions(pawnRes.updatedPlayer, stateAfterPawn, campaign, true);
    const redeemAction = actionsAfterPawn.find(a => a.action.type === 'redeem_item');
    expect(redeemAction!.action.cost).toBe(325);
  });

  it('guarantees across ALL items and ALL economic indices that earning money on the same turn is impossible', async () => {
    const campaigns = [await loadCampaign('qol_improved'), await loadCampaign('advanced')];

    for (const campaign of campaigns) {
      const pawnableItems = campaign.items.filter(i => i.category === 'appliance' || i.category === 'book');
      const payoutRate = campaign.config.economyRules.pawnPayoutRate;
      const redeemRate = campaign.config.economyRules.pawnRedeemRate;

      for (let economy = -30; economy <= 90; economy += 5) {
        for (const item of pawnableItems) {
          const currentMarketPrice = calcEconomyPrice(item.basePrice, economy);
          const pawnValue = Math.floor(currentMarketPrice * payoutRate);
          const redeemCost = Math.floor(currentMarketPrice * redeemRate);
          const clearanceCost = Math.floor(currentMarketPrice * redeemRate);

          // Invariant 1: Redeem cost is strictly greater than pawn payout (unless both are 0)
          if (pawnValue > 0) {
            expect(redeemCost).toBeGreaterThan(pawnValue);
            expect(clearanceCost).toBeGreaterThan(pawnValue);
          }

          // Invariant 2: Net gain from pawn -> redeem cycle is strictly negative
          const cycleProfit = pawnValue - redeemCost;
          expect(cycleProfit).toBeLessThanOrEqual(0);
          if (pawnValue > 0) {
            expect(cycleProfit).toBeLessThan(0);
          }

          // Invariant 3: Net gain from clearance buy -> pawn cycle is strictly negative
          const clearanceArbitrage = pawnValue - clearanceCost;
          expect(clearanceArbitrage).toBeLessThanOrEqual(0);
          if (pawnValue > 0) {
            expect(clearanceArbitrage).toBeLessThan(0);
          }
        }
      }
    }
  });

  it('drains player money when attempting repeated pawn and redeem loops without economy change', () => {
    const campaign = createMockCampaign(true);
    let state = createInitialState(campaign, 50); // High economy boom
    let player = state.players[0];
    const initialMoney = player.money;

    const context = {
      state,
      rules: state.rules!,
      campaign,
      turn: 1,
      rng: new Random(42)
    };

    // Attempt 5 consecutive pawn-and-redeem cycles on the exact same turn
    for (let cycle = 0; cycle < 5; cycle++) {
      const prevMoney = player.money;
      const actions = getAvailableActions(player, state, campaign, true);
      const pawnAction = actions.find(a => a.action.type === 'pawn_item' && a.action.item.id === 'refrigerator');
      expect(pawnAction).toBeDefined();

      const pawnRes = gameReducer(player, pawnAction!.action, context);
      player = pawnRes.updatedPlayer;
      state = { ...state, players: [player] };

      const actionsAfterPawn = getAvailableActions(player, state, campaign, true);
      const redeemAction = actionsAfterPawn.find(a => a.action.type === 'redeem_item');
      expect(redeemAction).toBeDefined();

      const redeemRes = gameReducer(player, redeemAction!.action, context);
      player = redeemRes.updatedPlayer;
      state = { ...state, players: [player] };

      // After completing one full pawn + redeem cycle, player must have LESS money than before
      expect(player.money).toBeLessThan(prevMoney);
    }

    // After 5 cycles, total money lost should be significant
    expect(player.money).toBeLessThan(initialMoney);
  });

  it('drains player money when buying second-hand and attempting to pawn on the same turn', () => {
    const campaign = createMockCampaign(true);
    let state = createInitialState(campaign, 50);
    state.pawnShopItemsForSale = [
      { itemId: 'color_tv', originalPrice: 400, redeemCost: 200, weekPawned: 0, ownerId: 'other' }
    ];
    let player = state.players[0];
    const initialMoney = player.money;

    const context = {
      state,
      rules: state.rules!,
      campaign,
      turn: 1,
      rng: new Random(42)
    };

    const actions = getAvailableActions(player, state, campaign, true);
    const buyAction = actions.find(a => a.action.type === 'buy_pawn_item');
    expect(buyAction).toBeDefined();

    // Buy the TV from clearance rack
    const buyRes = gameReducer(player, buyAction!.action, context);
    player = buyRes.updatedPlayer;
    state = { ...state, players: [player], pawnShopItemsForSale: buyRes.updatedPawnShopItemsForSale || [] };

    // Immediately pawn the TV
    const actionsAfterBuy = getAvailableActions(player, state, campaign, true);
    const pawnAction = actionsAfterBuy.find(a => a.action.type === 'pawn_item' && a.action.item.id === 'color_tv');
    expect(pawnAction).toBeDefined();

    const pawnRes = gameReducer(player, pawnAction!.action, context);
    player = pawnRes.updatedPlayer;

    // Buying and immediately pawning on the same turn strictly results in a loss
    expect(player.money).toBeLessThan(initialMoney);
  });

  it('confirms that profit is impossible unless the economy swings downward while pawned', () => {
    const campaign = createMockCampaign(true);
    const item = campaign.items.find(i => i.id === 'refrigerator')!;
    const payoutRate = campaign.config.economyRules.pawnPayoutRate;
    const redeemRate = campaign.config.economyRules.pawnRedeemRate;

    // Test a range of (pawnEconomy, redeemEconomy) pairs
    const testCases = [
      // Economy unchanged: profit MUST be negative (loss)
      { pawnE: 60, redeemE: 60, expectedProfitPossible: false },
      { pawnE: 30, redeemE: 30, expectedProfitPossible: false },
      { pawnE: 0, redeemE: 0, expectedProfitPossible: false },
      { pawnE: -20, redeemE: -20, expectedProfitPossible: false },
      // Economy rose (inflation): profit MUST be negative (even bigger loss)
      { pawnE: 0, redeemE: 40, expectedProfitPossible: false },
      { pawnE: -20, redeemE: 60, expectedProfitPossible: false },
      // Small economy drop: profit still negative (interest fee outweighs small drop)
      { pawnE: 30, redeemE: 25, expectedProfitPossible: false },
      // Major economy crash: profit IS possible (reward for market timing)
      { pawnE: 60, redeemE: -20, expectedProfitPossible: true },
      { pawnE: 60, redeemE: -30, expectedProfitPossible: true },
      { pawnE: 50, redeemE: -30, expectedProfitPossible: true },
    ];

    for (const tc of testCases) {
      const pawnPrice = calcEconomyPrice(item.basePrice, tc.pawnE);
      const pawnValue = Math.floor(pawnPrice * payoutRate);

      const redeemPrice = calcEconomyPrice(item.basePrice, tc.redeemE);
      const redeemCost = Math.floor(redeemPrice * redeemRate);

      const netProfit = pawnValue - redeemCost;

      if (tc.expectedProfitPossible) {
        expect(netProfit).toBeGreaterThan(0);
      } else {
        expect(netProfit).toBeLessThan(0);
      }
    }
  });

  it('PawnShop UI renders dynamic prices and prevents arbitrage on click', () => {
    const campaign = createMockCampaign(true);
    const mockPlayer = {
      id: 'p1',
      money: 1000,
      inventory: {
        appliances: [{ id: 'refrigerator', purchasePrice: 650, purchaseSource: 'socket_city' }],
        books: ['dictionary'],
        pawnedItems: [{ itemId: 'color_tv', originalPrice: 400, redeemCost: 200, weekPawned: 1, ownerId: 'p1' }]
      }
    } as any;

    const clearanceItems = [
      { itemId: 'color_tv', originalPrice: 400, redeemCost: 200, weekPawned: 0, ownerId: 'other' }
    ];

    const actionsReceived: any[] = [];
    const handleAction = (act: any) => actionsReceived.push(act);

    // Render at high economy (+60)
    const { container } = render(
      <PawnShop
        player={mockPlayer}
        onAction={handleAction}
        economicIndex={60}
        pawnShopItemsForSale={clearanceItems}
        rules={{ preventPawnArbitrage: true }}
        campaign={campaign}
      />
    );

    // Verify UI displayed prices across tabs:
    // On Buy & Browse tab: clearance buy cost at +60 should be -$400
    expect(screen.getByText('-$400')).toBeInTheDocument();
    container.querySelectorAll('.store-item').forEach(item => fireEvent.click(item));

    // Switch to Pawn & Redeem tab
    fireEvent.click(screen.getByTestId('tab-pawnshop-pawn'));

    // Refrigerator pawn value at +60 should be +$520
    expect(screen.getByText('+$520')).toBeInTheDocument();
    // Color TV redeem cost at +60 should be -$400
    expect(screen.getByText('-$400')).toBeInTheDocument();

    // Click all pawn & redeem items to verify dispatched action payloads
    container.querySelectorAll('.store-item').forEach(item => fireEvent.click(item));

    const pawnAct = actionsReceived.find(a => a.type === 'pawn_item' && a.item.id === 'refrigerator');
    const redeemAct = actionsReceived.find(a => a.type === 'redeem_item');
    const buyAct = actionsReceived.find(a => a.type === 'buy_pawn_item');

    expect(pawnAct.value).toBe(520);
    expect(redeemAct.cost).toBe(400); // 50% of 800
    expect(buyAct.cost).toBe(400);    // 50% of 800

    // Redemption and clearance buy cost are strictly greater than payout for the same item at the same economy reading
    expect(redeemAct.cost).toBeGreaterThan(Math.floor(calcEconomyPrice(400, 60) * 0.4));
    expect(buyAct.cost).toBeGreaterThan(Math.floor(calcEconomyPrice(400, 60) * 0.4));
  });
});
