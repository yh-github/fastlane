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

describe('Academic Freedom and Graduation Depth Scaling', () => {
  it('academic_freedom job grants +1 Dependability on the very first study action', () => {
    const player = makePlayer();
    player.currentJobId = 'researcher';
    player.dependability = 20;
    player.hoursRemaining = 10;
    player.physicalCondition = 50;
    player.mentalCondition = 50;

    const studyCampaign = {
      ...campaign,
      jobs: [
        { id: 'researcher', title: 'Researcher', baseWage: 20, locationId: 'university', perks: [], requirements: {} as any, tags: ['academic_freedom'] }
      ],
      education: [
        { id: 'trade_school', name: 'Trade School', prerequisites: [], baseTuitionFee: 50, lessonsRequired: 10, rewards: { happiness: 5, dependability: 5, maxDepBoost: 5, maxExpBoost: 5 } }
      ]
    };

    player.enrolledClasses = { trade_school: 1 };
    const state = makeState(player);
    const context = {
      state,
      campaign: studyCampaign,
      economicIndex: 0,
      rules: { ...state.rules, usePhysicalMentalConditions: true },
      rng: new Random(1)
    };

    const next = gameReducer(player, { type: 'study', degreeId: 'trade_school' }, context);
    // Even on action #1, academic_freedom grants +1 Dependability (20 -> 21)
    expect(next.updatedPlayer.dependability).toBe(21);
  });

  it('graduation awards Dependability = depth + 1 and Mental = depth * 2 + 1 when depthScaledDegreeBonus is enabled', () => {
    const studyCampaign = {
      ...campaign,
      education: [
        { id: 'junior_college', name: 'Junior College', prerequisites: [], baseTuitionFee: 50, lessonsRequired: 10, rewards: { happiness: 5, dependability: 5, maxDepBoost: 5, maxExpBoost: 5 } },
        { id: 'academic', name: 'Academic', prerequisites: ['junior_college'], baseTuitionFee: 50, lessonsRequired: 10, rewards: { happiness: 5, dependability: 5, maxDepBoost: 5, maxExpBoost: 5 } },
        { id: 'graduate_school', name: 'Graduate School', prerequisites: ['academic'], baseTuitionFee: 50, lessonsRequired: 10, rewards: { happiness: 5, dependability: 5, maxDepBoost: 5, maxExpBoost: 5 } }
      ]
    };

    // 1. Root degree (depth 0): Junior College -> Dep +1, Mental +1
    const p0 = makePlayer();
    p0.dependability = 20;
    p0.mentalCondition = 10;
    p0.enrolledClasses = { junior_college: 9 };
    const s0 = makeState(p0);
    const ctx0 = { state: s0, campaign: studyCampaign, economicIndex: 0, rules: { ...s0.rules, usePhysicalMentalConditions: true, depthScaledDegreeBonus: true }, rng: new Random(1) };
    const res0 = gameReducer(p0, { type: 'study', degreeId: 'junior_college' }, ctx0);
    expect(res0.updatedPlayer.degrees).toContain('junior_college');
    expect(res0.updatedPlayer.dependability).toBe(21); // 20 + (0 + 1)
    // 10 - mentalCost (1) + graduation Mental (0 * 2 + 1 = 1) = 10
    expect(res0.updatedPlayer.mentalCondition).toBe(10);

    // 2. Depth 1 degree (depth 1): Academic -> Dep +2, Mental +3
    const p1 = makePlayer();
    p1.degrees = ['junior_college'];
    p1.dependability = 20;
    p1.mentalCondition = 10;
    p1.enrolledClasses = { academic: 9 };
    const s1 = makeState(p1);
    const ctx1 = { state: s1, campaign: studyCampaign, economicIndex: 0, rules: { ...s1.rules, usePhysicalMentalConditions: true, depthScaledDegreeBonus: true }, rng: new Random(1) };
    const res1 = gameReducer(p1, { type: 'study', degreeId: 'academic' }, ctx1);
    expect(res1.updatedPlayer.degrees).toContain('academic');
    expect(res1.updatedPlayer.dependability).toBe(22); // 20 + (1 + 1)
    // 10 - mentalCost (1 base + 1 depth = 2) + graduation Mental (1 * 2 + 1 = 3) = 11
    expect(res1.updatedPlayer.mentalCondition).toBe(11);

    // 3. Depth 2 degree (depth 2): Graduate School -> Dep +3, Mental +5
    const p2 = makePlayer();
    p2.degrees = ['junior_college', 'academic'];
    p2.dependability = 20;
    p2.mentalCondition = 10;
    p2.enrolledClasses = { graduate_school: 9 };
    const s2 = makeState(p2);
    const ctx2 = { state: s2, campaign: studyCampaign, economicIndex: 0, rules: { ...s2.rules, usePhysicalMentalConditions: true, depthScaledDegreeBonus: true }, rng: new Random(1) };
    const res2 = gameReducer(p2, { type: 'study', degreeId: 'graduate_school' }, ctx2);
    expect(res2.updatedPlayer.degrees).toContain('graduate_school');
    expect(res2.updatedPlayer.dependability).toBe(23); // 20 + (2 + 1)
    // 10 - mentalCost (1 base + 2 depth = 3) + graduation Mental (2 * 2 + 1 = 5) = 12
    expect(res2.updatedPlayer.mentalCondition).toBe(12);
  });
});

describe('Newspaper Headline Selection with Stock Tips', () => {
  it('selects random city news when predictiveNewspaperStockTips is enabled', () => {
    const player = makePlayer();
    const state = makeState(player);
    state.rules.predictiveNewspaperStockTips = true;

    const nextState = processTurnStart(state, campaign);
    const headline = nextState.players[0].newspaperHeadline;
    expect(headline?.key).toMatch(/^newspaper\.random\.\d+$/);
    expect(headline?.stockTip).toBeDefined();
  });
});

