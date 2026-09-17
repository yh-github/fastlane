import { describe, it, expect } from 'vitest';
import { gameReducer } from '../src/engine/gameReducer';
import { processTurnStart } from '../src/engine/turnProcessor';
import { processApartmentRobbery } from '../src/engine/eventEngine';
import { generatePredictiveStockTip } from '../src/engine/economyEngine';
import { applyMoraleEffect } from '../src/engine/statEffects';
import { createPlayerState, createInitialGameState, createDefaultGoalAllotment } from '../src/engine/stateFactories';
import { createMockCampaign } from '../src/engine/testFactories';
import { Random } from '../src/utils/rng';
import type { PlayerState, GameState } from '../src/engine/gameState';
import { computeClerkResponse, getAvailableItemsForBuilding, getPawnShopWeeklyStock } from '../src/ui/buildingModal/clerkDialogue';
import { buyItem } from '../src/engine/shoppingEngine';
import type { BuildingDef, ItemDef } from '../src/engine/dataLoader';

const campaign = createMockCampaign();
(campaign.config as any).economyRules = { model: 'authentic_sectors' };
campaign.items.push({ id: 'dictionary', name: 'Dictionary', basePrice: 70, category: 'book', happinessBonus: 0 });

function makePlayer(): PlayerState {
  const p = createPlayerState('p1', 'Player 1', false, createDefaultGoalAllotment(), 'node_z_mart', campaign.config);
  p.happiness = 0;
  p.money = 500;
  p.position = 'node_z_mart';
  return p;
}

function makeState(player: PlayerState): GameState {
  const s = createInitialGameState(campaign, [{ name: 'Player 1', isAi: false, goals: createDefaultGoalAllotment(), characterIndex: 1 }], 'node_z_mart', undefined, 12345);
  s.players[0] = player;
  s.rules.predictiveNewspaperStockTips = true;
  return s;
}

describe('Newspaper Delivery and Stock Tips', () => {
  it('does NOT grant a free newspaper on a standard turn without crash, boom, or robbery', () => {
    const player = makePlayer();
    const state = makeState(player);

    const nextState = processTurnStart(state, campaign);
    const nextPlayer = nextState.players[0];

    // Standard turn: newspaper is NOT free!
    expect(nextPlayer.turnFlags.freeNewspaper).toBe(false);
    expect(nextPlayer.newspaperHeadline).toBeDefined();
    // Front page is a real headline (mover or random), not replaced by stock tip
    expect(nextPlayer.newspaperHeadline?.key).toMatch(/^newspaper\.(stocks|random)/);
    // Stock tip is attached in addition to the headline
    expect(nextPlayer.newspaperHeadline?.stockTip).toBeDefined();
  });

  it('grants a free newspaper when an apartment robbery steals appliances', () => {
    let player = makePlayer();
    player.currentHousingId = 'low_cost';
    player.inventory.appliances = [
      { id: 'microwave', purchasePrice: 200, purchaseSource: 'z_mart', condition: 'new' }
    ];
    // Force robbery to trigger and steal items
    const rng = new Random(1);
    const result = processApartmentRobbery(
      player,
      rng,
      false,
      { protectBuiltInAppliances: false } as any,
      1,
      4,
      undefined,
      undefined,
      true // forceRobbed
    );

    expect(result.robbed).toBe(true);
    expect(result.updated.turnFlags.freeNewspaper).toBe(true);
    expect(result.updated.newspaperHeadline?.key).toBe('newspaper.robbery');
  });

  it('predictive stock tips evaluate valuation discounts as BUY and premiums as SELL', () => {
    const rng = new Random(100);
    const simState = {
      main: { index: 0, reading: 100, high: 0, low: 0, lowerRange: -3, upperRange: 3, adjustment: 0 },
      goods: { index: 0, reading: 100, high: 0, low: 0, lowerRange: -3, upperRange: 3, adjustment: 0 },
      investments: { index: 0, reading: 100, high: 0, low: 0, lowerRange: -3, upperRange: 3, adjustment: 0 },
      stocks: {
        // Gold is oversold / cheap (reading 78, high bounce flag active)
        gold: { index: -1, reading: 78, high: 2, low: 0, lowerRange: -3, upperRange: 3, adjustment: 0 },
        // Silver is at equilibrium
        silver: { index: 0, reading: 100, high: 0, low: 0, lowerRange: -3, upperRange: 3, adjustment: 0 },
        // Pork is overbought / expensive (reading 122, low bounce flag active)
        pork: { index: 1, reading: 122, high: 0, low: 2, lowerRange: -3, upperRange: 3, adjustment: 0 },
        blueChip: { index: 0, reading: 100, high: 0, low: 0, lowerRange: -3, upperRange: 3, adjustment: 0 },
        penny: { index: 0, reading: 100, high: 0, low: 0, lowerRange: -3, upperRange: 3, adjustment: 0 },
      },
      lastCrashSeverity: 'none' as const,
      lastBoom: false,
    };

    const tip = generatePredictiveStockTip(simState, rng);
    expect(tip).toBeDefined();
    // Strongest opportunity is gold (deeply discounted with upward bounce) -> strong buy!
    expect(tip?.commodityId).toBe('gold');
    expect(tip?.action).toBe('buy');
  });
});

describe('QoL Bug Fixes: Happiness Floor and Dictionary', () => {
  it('applyMoraleEffect clamps happiness at 0, not 10', () => {
    const player = makePlayer();
    player.happiness = 0;

    // A small negative effect stays at 0
    const clampedNegative = applyMoraleEffect(player, -2, 'shopping_bonus');
    expect(clampedNegative.happiness).toBe(0);

    // A +1 bonus increases happiness from 0 to 1, NOT snapping to 10
    const plusOne = applyMoraleEffect(player, 1, 'shopping_bonus');
    expect(plusOne.happiness).toBe(1);
  });

  it('buying a dictionary awards 0 happiness and does not jump from 0 to 10', () => {
    const player = makePlayer();
    player.money = 200;
    player.happiness = 0;
    const state = makeState(player);

    const context = {
      state,
      campaign,
      economicIndex: 0,
      rules: state.rules,
    };

    const next = gameReducer(player, { type: 'buy', itemId: 'dictionary' }, context);
    expect(next.updatedPlayer.inventory.books).toContain('dictionary');
    // Happiness should remain 0, NOT jumping by +10!
    expect(next.updatedPlayer.happiness).toBe(0);
  });
});

describe('Newspaper Purchase Time Restriction & Clerk Dialogue', () => {
  it('prevents purchasing newspaper when hoursRemaining is 0 or less than 1', () => {
    const player = makePlayer();
    player.money = 200;
    player.hoursRemaining = 0;
    const building = campaign.buildings.find(b => b.id === 'socket_city');
    if (building) {
      building.inventory = [{ itemId: 'newspaper' }];
    }
    const node = campaign.map?.nodes?.find(n => n.buildingId === 'socket_city');
    if (node) {
      player.position = node.id;
    }
    const state = makeState(player);
    const context = {
      state,
      campaign,
      economicIndex: 0,
      rules: state.rules,
    };

    const next = gameReducer(player, { type: 'buy', itemId: 'newspaper' }, context);
    expect(next.actionLog).toMatchObject({ key: 'action.error.notEnoughTimeBuy' });
    expect(next.updatedPlayer.money).toBe(200);
    expect(next.updatedPlayer.turnFlags.readNewspaperThisTurn).toBeFalsy();
    expect(next.updatedPlayer.hoursRemaining).toBe(0);
  });

  it('allows purchasing newspaper when hoursRemaining >= 1 and spends 1 hour', () => {
    const player = makePlayer();
    player.money = 200;
    player.hoursRemaining = 10;
    const building = campaign.buildings.find(b => b.id === 'socket_city');
    if (building) {
      building.inventory = [{ itemId: 'newspaper' }];
    }
    const node = campaign.map?.nodes?.find(n => n.buildingId === 'socket_city');
    if (node) {
      player.position = node.id;
    }
    const state = makeState(player);
    const context = {
      state,
      campaign,
      economicIndex: 0,
      rules: state.rules,
    };

    const next = gameReducer(player, { type: 'buy', itemId: 'newspaper' }, context);
    expect(next.actionLog).toMatchObject({ key: 'action.buy', params: { itemId: 'newspaper', itemName: 'Newspaper' } });
    expect(next.updatedPlayer.hoursRemaining).toBe(9);
    expect(next.updatedPlayer.turnFlags.readNewspaperThisTurn).toBe(true);
  });

  it('computeClerkResponse outputs "No time to read the newspaper."', () => {
    const fakeBuilding: BuildingDef = { id: 'socket_city', name: 'Socket City', archetype: 'shop', spritePath: '', description: '' };
    const t = (key: string) => key === 'clerkDialogs.noTimeToReadNewspaper' ? 'No time to read the newspaper.' : key;
    const getRandomMsg = (_key: string, def: string) => def;

    const res1 = computeClerkResponse(
      { type: 'buy', itemId: 'newspaper' },
      { key: 'action.error.notEnoughTimeBuy' },
      fakeBuilding,
      t,
      getRandomMsg
    );
    expect(res1).toBe('No time to read the newspaper.');

    const res2 = computeClerkResponse(
      { type: 'buy', itemId: 'newspaper' },
      { key: 'action.error.notEnoughTime' },
      fakeBuilding,
      t,
      getRandomMsg
    );
    expect(res2).toBe('No time to read the newspaper.');
  });
});

describe('Z-Mart & Pawn Shop Randomization and Deterministic Replay', () => {
  it('Z-Mart inventory differs with different gameSeeds but is 100% deterministic with same seed', () => {
    const fakeZMart: BuildingDef = {
      id: 'z_mart',
      name: 'Z-Mart',
      archetype: 'shop',
      spritePath: '',
      description: '',
      inventory: [
        { itemId: 'item1' },
        { itemId: 'item2' },
        { itemId: 'item3' },
        { itemId: 'item4' },
        { itemId: 'item5' },
        { itemId: 'item6' },
        { itemId: 'item7' },
        { itemId: 'item8' },
      ]
    };
    const testCampaign = {
      ...campaign,
      items: [
        { id: 'item1', name: 'Item 1', category: 'appliance' as const, happinessBonus: 1 },
        { id: 'item2', name: 'Item 2', category: 'appliance' as const, happinessBonus: 1 },
        { id: 'item3', name: 'Item 3', category: 'appliance' as const, happinessBonus: 1 },
        { id: 'item4', name: 'Item 4', category: 'appliance' as const, happinessBonus: 1 },
        { id: 'item5', name: 'Item 5', category: 'appliance' as const, happinessBonus: 1 },
        { id: 'item6', name: 'Item 6', category: 'appliance' as const, happinessBonus: 1 },
        { id: 'item7', name: 'Item 7', category: 'appliance' as const, happinessBonus: 1 },
        { id: 'item8', name: 'Item 8', category: 'appliance' as const, happinessBonus: 1 },
      ]
    };

    const stockSeedA1 = getAvailableItemsForBuilding(fakeZMart, testCampaign as any, 1, 'p1', 11111);
    const stockSeedA2 = getAvailableItemsForBuilding(fakeZMart, testCampaign as any, 1, 'p1', 11111);
    const stockSeedB = getAvailableItemsForBuilding(fakeZMart, testCampaign as any, 1, 'p1', 99999);

    // Same seed produces identical items in identical order (deterministic replay)
    expect(stockSeedA1.map(i => i.id)).toEqual(stockSeedA2.map(i => i.id));
    // Different seed produces different items / permutation
    expect(stockSeedA1.map(i => i.id)).not.toEqual(stockSeedB.map(i => i.id));
  });

  it('Pawn Shop stock differs with different gameSeeds and is deterministic with same seed', () => {
    const stock1 = getPawnShopWeeklyStock(campaign, 1, 'p1', 12345);
    const stock2 = getPawnShopWeeklyStock(campaign, 1, 'p1', 12345);
    const stock3 = getPawnShopWeeklyStock(campaign, 1, 'p1', 98765);

    expect(stock1.map(i => i.id)).toEqual(stock2.map(i => i.id));
    expect(stock1.map(i => i.id)).not.toEqual(stock3.map(i => i.id));
  });
});

describe('Goal Defaults and Microwave Mechanics', () => {
  it('createPlayerState defaults missing win conditions to 50', () => {
    const testConfig = {
      ...campaign.config,
      winConditions: [
        { stat: 'wealth', label: 'Wealth', target: 100 },
        { stat: 'happiness', label: 'Happiness', target: 100 },
        { stat: 'education', label: 'Education', target: 100 },
        { stat: 'career', label: 'Career', target: 100 },
      ]
    };

    // Passed goals missing happiness (e.g. from Advanced mode where happiness wasn't set)
    const incompleteGoals = { wealth: 60, career: 40 } as any;
    const player = createPlayerState('p1', 'Player 1', false, incompleteGoals, 'node_z_mart', testConfig as any);

    expect(player.goalAllotment.wealth).toBe(60);
    expect(player.goalAllotment.career).toBe(40);
    expect(player.goalAllotment.happiness).toBe(50);
    expect(player.goalAllotment.education).toBe(50);
  });

  it('Microwave awards +2 Happiness from socket_city and +1 from z_mart', () => {
    const player = makePlayer();
    player.money = 1000;
    player.happiness = 10;

    const microFromSocket: ItemDef = {
      id: 'microwave',
      name: 'Microwave',
      category: 'appliance',
      basePrice: 330,
      happinessBonus: 1,
      store: 'socket_city',
    };

    const resSocket = buyItem(player, microFromSocket);
    // 10 + 2 = 12
    expect(resSocket.updated.happiness).toBe(12);
    expect(resSocket.message.params?.happinessBonus).toBe(2);

    const microFromZMart: ItemDef = {
      id: 'microwave',
      name: 'Microwave',
      category: 'appliance',
      basePrice: 220,
      happinessBonus: 1,
      store: 'z_mart',
    };

    const resZMart = buyItem(player, microFromZMart);
    // 10 + 1 = 11
    expect(resZMart.updated.happiness).toBe(11);
    expect(resZMart.message.params?.happinessBonus).toBe(1);
  });

  it('getAvailableItemsForBuilding reports +2 Happiness for microwave at socket_city and +1 at z_mart', () => {
    const testCampaign = {
      ...campaign,
      items: [
        { id: 'microwave', name: 'Microwave', category: 'appliance' as const, basePrice: 220, happinessBonus: 1 }
      ]
    };

    const socketCityBuilding: BuildingDef = {
      id: 'socket_city',
      name: 'Socket City',
      archetype: 'shop',
      spritePath: '',
      description: '',
      inventory: [{ itemId: 'microwave', priceOverride: 330 }]
    };

    const zMartBuilding: BuildingDef = {
      id: 'z_mart',
      name: 'Z-Mart',
      archetype: 'shop',
      spritePath: '',
      description: '',
      inventory: [{ itemId: 'microwave', priceOverride: 220 }]
    };

    const socketItems = getAvailableItemsForBuilding(socketCityBuilding, testCampaign as any, 1, 'p1', 123);
    const zMartItems = getAvailableItemsForBuilding(zMartBuilding, testCampaign as any, 1, 'p1', 123);

    expect(socketItems[0].happinessBonus).toBe(2);
    expect(zMartItems[0].happinessBonus).toBe(1);
  });
});
