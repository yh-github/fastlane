import type { PlayerState, PawnedItem } from '../gameState';
import type { ReducerContext, ActionHandlerResult, PawnableItem } from './types';
import type { ItemDef } from '../dataLoader';
import { calcUsedSpace, calcHousingSpaceCap } from '../statMath';
import { applyHappinessChange, applyMentalChange } from '../statEffects';
import { addApplianceCardToDeck, removeApplianceCardFromDeck } from '../weekendEngine';
import { calcEconomyPrice } from '../economyEngine';
import { spendHours } from '../timeManager';
import { CURIO_CATALOG, RARE_TRINKET_CATALOG } from '../curioCatalog';
import { getPawnShopWeeklyStock } from '../../ui/buildingModal/clerkDialogue';

export function handlePawnItemAction(
  player: PlayerState,
  action: { type: 'pawn_item'; item: PawnableItem; value: number },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  // Validate global pawn shop constraints
  const allPawned = context.state.players.flatMap(p => p.inventory.pawnedItems || []);
  const forSale = context.state.pawnShopItemsForSale || [];
  const totalPawnShopItems = allPawned.length + forSale.length;
  const maxPawnCapacity = context.rules.spaceCapping ? 1_000_000 : 6;
  
  if (totalPawnShopItems >= maxPawnCapacity) {
    actionLog = { key: 'action.error.pawnShopFull' };
    return { nextPlayer, actionLog };
  }
  if (allPawned.some(p => p.itemId === action.item.id) || forSale.some(p => p.itemId === action.item.id)) {
    actionLog = { key: 'action.error.pawnShopHasDuplicate' };
    return { nextPlayer, actionLog };
  }

  const isBook = nextPlayer.inventory.books?.includes(action.item.id);
  if (isBook) {
    nextPlayer.inventory.books = nextPlayer.inventory.books.filter(b => b !== action.item.id);
  } else {
    nextPlayer.inventory.appliances = nextPlayer.inventory.appliances.filter(a => a.id !== action.item.id);
    if (context.rules.alternativeWeekends && nextPlayer.weekendDecks) {
      nextPlayer = removeApplianceCardFromDeck(nextPlayer, action.item.id);
    }
  }

  if (!nextPlayer.inventory.pawnedItems) nextPlayer.inventory.pawnedItems = [];
  const trackCondition = !!(context.rules.advancedHomeGUI || context.rules.usePhysicalMentalConditions);
  const itemDef = context.campaign.items?.find(i => i.id === action.item.id);
  const basePrice = itemDef?.basePrice ?? action.item.purchasePrice;
  const redeemRate = context.campaign.config?.economyRules?.pawnRedeemRate ?? 0.5;
  const redeemCost = context.rules.preventPawnArbitrage
    ? Math.floor(calcEconomyPrice(basePrice, context.state.economicIndex) * redeemRate)
    : Math.floor(action.item.purchasePrice * 0.5);

  const pawnedItem: PawnedItem = {
    itemId: action.item.id,
    originalPrice: context.rules.preventPawnArbitrage ? basePrice : action.item.purchasePrice,
    redeemCost,
    weekPawned: context.turn,
    ownerId: nextPlayer.id,
    purchaseSource: action.item.purchaseSource || 'socket_city',
    ...((trackCondition || action.item.condition) ? { condition: action.item.condition || (action.item.purchaseSource === 'socket_city' ? 'new' : 'used') } : {}),
    ...(action.item.isBroken ? { isBroken: true } : {})
  };
  nextPlayer.inventory.pawnedItems.push(pawnedItem);
  nextPlayer.money += action.value;
  nextPlayer = applyHappinessChange(nextPlayer, -1, 'pawn_item', context.rules, context.campaign.config.statRules);
  if (action.item.id === 'refrigerator' && nextPlayer.inventory.freshFoodUnits > 0) {
    nextPlayer = applyHappinessChange(nextPlayer, -1, 'pawn_item', context.rules, context.campaign.config.statRules);
  }
  const formatItem = (id: string) => context.campaign.items?.find(i => i.id === id)?.name || id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const itemName = formatItem(action.item.id);
  actionLog = { key: 'action.pawn.pawned', params: { itemName, value: action.value } };

  return { nextPlayer, actionLog };
}

export function handleRedeemItemAction(
  player: PlayerState,
  action: { type: 'redeem_item'; item: PawnedItem; cost: number },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  if (nextPlayer.money >= action.cost) {
    const itemDef = context.campaign.items?.find(i => i.id === action.item.itemId);
    if (context.rules.spaceCapping) {
      const itemSpace = itemDef?.space ?? 0;
      const currentSpace = calcUsedSpace(nextPlayer, context.campaign, true);
      const maxSpace = calcHousingSpaceCap(nextPlayer, context.campaign);
      if (currentSpace + itemSpace > maxSpace) {
        const currentHousing = context.campaign.housing.find(h => h.id === nextPlayer.currentHousingId);
        actionLog = {
          key: 'action.error.notEnoughSpace',
          params: {
            home: currentHousing?.name || 'your home',
            item: itemDef?.name || action.item.itemId
          }
        };
        return { nextPlayer, actionLog };
      }
    }
    nextPlayer.money -= action.cost;
    nextPlayer.inventory.pawnedItems = nextPlayer.inventory.pawnedItems.filter(a => a.itemId !== action.item.itemId);

    if (itemDef?.category === 'book') {
      if (!nextPlayer.inventory.books) nextPlayer.inventory.books = [];
      const hadAllBooksBefore = nextPlayer.inventory.books.includes('dictionary') &&
                                nextPlayer.inventory.books.includes('encyclopedia') &&
                                nextPlayer.inventory.books.includes('atlas');
      if (!nextPlayer.inventory.books.includes(action.item.itemId)) {
        nextPlayer.inventory.books = [...nextPlayer.inventory.books, action.item.itemId];
      }
      const hasAllBooksNow = nextPlayer.inventory.books.includes('dictionary') &&
                             nextPlayer.inventory.books.includes('encyclopedia') &&
                             nextPlayer.inventory.books.includes('atlas');
      if (!hadAllBooksBefore && hasAllBooksNow) {
        nextPlayer.turnFlags = { ...nextPlayer.turnFlags, bookSetCompletedThisTurn: true };
      }
    } else {
      const trackCondition = !!(context.rules.advancedHomeGUI || context.rules.usePhysicalMentalConditions);
      const existingRedeem = nextPlayer.inventory.appliances.filter(a => a.id === action.item.itemId);
      const hasAnyNewRedeem = action.item.condition === 'new' || action.item.purchaseSource === 'socket_city' || existingRedeem.some(a => a.condition === 'new' || a.purchaseSource === 'socket_city');
      const redeemCondition: 'new' | 'used' = hasAnyNewRedeem ? 'new' : 'used';
      if (hasAnyNewRedeem && trackCondition) {
        nextPlayer.inventory.appliances = nextPlayer.inventory.appliances.map(a => a.id === action.item.itemId ? { ...a, condition: 'new' as const } : a);
      }
      nextPlayer.inventory.appliances.push({
        id: action.item.itemId,
        purchasePrice: action.item.originalPrice,
        purchaseSource: action.item.purchaseSource || 'socket_city',
        ...((trackCondition || action.item.condition) ? { condition: redeemCondition } : {}),
        ...(action.item.isBroken ? { isBroken: true } : {})
      });
      if (!action.item.isBroken && context.rules.alternativeWeekends && nextPlayer.weekendDecks) {
        nextPlayer = addApplianceCardToDeck(nextPlayer, action.item.itemId);
      }
    }

    const formatItem = (id: string) => context.campaign.items?.find(i => i.id === id)?.name || id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const itemName = formatItem(action.item.itemId);
    actionLog = { key: 'action.pawn.redeemed', params: { itemName, cost: action.cost } };
  } else {
    actionLog = { key: 'action.error.notEnoughMoneyBuyBack' };
  }

  return { nextPlayer, actionLog };
}

export function handleBuyPawnItemAction(
  player: PlayerState,
  action: { type: 'buy_pawn_item'; item: PawnedItem; cost: number },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;
  let updatedPawnShopItemsForSale: PawnedItem[] | undefined = undefined;

  if (nextPlayer.money >= action.cost) {
    const itemDef = context.campaign.items?.find(i => i.id === action.item.itemId);
    if (context.rules.spaceCapping) {
      const itemSpace = itemDef?.space ?? 0;
      const currentSpace = calcUsedSpace(nextPlayer, context.campaign, true);
      const maxSpace = calcHousingSpaceCap(nextPlayer, context.campaign);
      if (currentSpace + itemSpace > maxSpace) {
        const currentHousing = context.campaign.housing.find(h => h.id === nextPlayer.currentHousingId);
        actionLog = {
          key: 'action.error.notEnoughSpace',
          params: {
            home: currentHousing?.name || 'your home',
            item: itemDef?.name || action.item.itemId
          }
        };
        return { nextPlayer, actionLog };
      }
    }
    nextPlayer.money -= action.cost;
    updatedPawnShopItemsForSale = (context.state.pawnShopItemsForSale || []).filter(i => i.itemId !== action.item.itemId);

    if (itemDef?.category === 'book') {
      if (!nextPlayer.inventory.books) nextPlayer.inventory.books = [];
      const hadAllBooksBefore = nextPlayer.inventory.books.includes('dictionary') &&
                                nextPlayer.inventory.books.includes('encyclopedia') &&
                                nextPlayer.inventory.books.includes('atlas');
      if (!nextPlayer.inventory.books.includes(action.item.itemId)) {
        nextPlayer.inventory.books = [...nextPlayer.inventory.books, action.item.itemId];
      }
      const hasAllBooksNow = nextPlayer.inventory.books.includes('dictionary') &&
                             nextPlayer.inventory.books.includes('encyclopedia') &&
                             nextPlayer.inventory.books.includes('atlas');
      if (!hadAllBooksBefore && hasAllBooksNow) {
        nextPlayer.turnFlags = { ...nextPlayer.turnFlags, bookSetCompletedThisTurn: true };
      }
    } else {
      const trackCondition = !!(context.rules.advancedHomeGUI || context.rules.usePhysicalMentalConditions);
      const existingBuy = nextPlayer.inventory.appliances.filter(a => a.id === action.item.itemId);
      const hasAnyNewBuy = existingBuy.some(a => a.condition === 'new' || a.purchaseSource === 'socket_city');
      const buyCondition: 'new' | 'used' = hasAnyNewBuy ? 'new' : 'used';
      nextPlayer.inventory.appliances.push({
        id: action.item.itemId,
        purchasePrice: action.item.originalPrice,
        purchaseSource: 'pawnshop',
        ...((trackCondition || action.item.condition) ? { condition: buyCondition } : {}),
        ...(action.item.isBroken ? { isBroken: true } : {})
      });
      if (!action.item.isBroken && context.rules.alternativeWeekends && nextPlayer.weekendDecks) {
        nextPlayer = addApplianceCardToDeck(nextPlayer, action.item.itemId);
      }
    }

    const formatItem = (id: string) => context.campaign.items?.find(i => i.id === id)?.name || id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const itemName = formatItem(action.item.itemId);
    actionLog = { key: 'action.pawn.bought', params: { itemName, cost: action.cost } };
  } else {
    actionLog = { key: 'action.error.notEnoughMoneyBuyPawn' };
  }

  return { nextPlayer, actionLog, updatedPawnShopItemsForSale };
}

export function handlePawnKnickKnacksAction(
  player: PlayerState,
  action: { type: 'pawn_knick_knacks'; count: number; valuePerItem: number },
  _context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  const currentCount = nextPlayer.inventory.knickKnacks || 0;
  if (currentCount <= 0 || action.count <= 0) {
    actionLog = { key: 'action.error.noKnickKnacksToPawn' };
    return { nextPlayer, actionLog };
  }

  const sellCount = Math.min(currentCount, action.count);
  const totalValue = sellCount * action.valuePerItem;

  nextPlayer.inventory.knickKnacks = currentCount - sellCount;
  nextPlayer.money += totalValue;

  actionLog = {
    key: 'action.pawn.pawnedKnickKnacks',
    params: { count: sellCount, totalValue }
  };

  return { nextPlayer, actionLog };
}

export function handleRummagePawnShopAction(
  player: PlayerState,
  _action: { type: 'rummage_pawn_shop' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  if (context.rules && !context.rules.pawnRummageBins) {
    actionLog = { key: 'action.error.actionUnavailable' };
    return { nextPlayer, actionLog };
  }

  if (nextPlayer.hoursRemaining < 1) {
    actionLog = { key: 'action.error.notEnoughTime' };
    return { nextPlayer, actionLog };
  }

  nextPlayer = spendHours(nextPlayer, 1);

  const rng = context.rng;
  const roll = rng ? rng.next() : Math.random();

  const weeklyStock = getPawnShopWeeklyStock(context.campaign, context.turn, nextPlayer.id);
  const availableAppliances = weeklyStock.filter(item => {
    if (item.tags?.includes('broken')) {
      return !nextPlayer.inventory.appliances.some(a => a.id === item.id && a.isBroken);
    }
    return true;
  });

  let selectedItem: ItemDef;

  if (roll < 0.20) {
    // 20%: Rare pocket trinket (untracked in inventory, on_buy +1 Mental, 0 space)
    const trinketIdx = Math.floor((rng ? rng.next() : Math.random()) * RARE_TRINKET_CATALOG.length);
    const trinket = RARE_TRINKET_CATALOG[trinketIdx] || RARE_TRINKET_CATALOG[0];
    selectedItem = {
      id: trinket.id,
      name: trinket.name,
      category: 'junk',
      subcategory: 'rare_trinket',
      basePrice: trinket.basePrice,
      space: 0,
      happinessBonus: 1,
      tags: [trinket.id, 'rare_trinket', 'junk'],
      description: trinket.description
    };
  } else if (roll < 0.35) {
    // 15%: Spare parts for appliance repairs
    selectedItem = {
      id: 'spare_parts',
      name: 'Spare Parts Box',
      category: 'junk',
      basePrice: 15,
      space: 2,
      happinessBonus: 0,
      tags: ['spare_parts', 'repair_material'],
      description: 'Useful mechanical and electrical components for repairing broken appliances.'
    };
  } else if (roll < 0.60 && availableAppliances.length > 0) {
    // 25%: Used / broken appliance from weekly pawn stock
    const appIdx = Math.floor((rng ? rng.next() : Math.random()) * availableAppliances.length);
    selectedItem = availableAppliances[appIdx];
  } else {
    // 40% (or fallback): Curio / knick-knack
    const curioIdx = Math.floor((rng ? rng.next() : Math.random()) * CURIO_CATALOG.length);
    const curio = CURIO_CATALOG[curioIdx] || CURIO_CATALOG[0];
    selectedItem = {
      id: 'knick_knack',
      name: curio.name,
      category: 'junk',
      subcategory: 'curio',
      basePrice: 10,
      space: 2,
      happinessBonus: 1,
      tags: [curio.id, 'curio']
    };
  }

  nextPlayer.pendingPawnRummage = [selectedItem];
  actionLog = { key: 'action.pawn.rummaged' };

  return { nextPlayer, actionLog };
}

export function handleBuyRummageItemAction(
  player: PlayerState,
  action: { type: 'buy_rummage_item' | 'buy_pawn_rummage_item'; itemIndex?: number },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  const rummagedItems = nextPlayer.pendingPawnRummage;
  const targetIndex = action.itemIndex ?? 0;
  if (!rummagedItems || !rummagedItems[targetIndex]) {
    actionLog = { key: 'action.error.noRummageItem' };
    return { nextPlayer, actionLog };
  }

  const item = rummagedItems[targetIndex];
  const price = calcEconomyPrice(item.basePrice || 0, context.state.economicIndex);

  if (nextPlayer.money < price) {
    actionLog = { key: 'action.error.notEnoughMoney' };
    return { nextPlayer, actionLog };
  }

  const isTrinket = !!item.tags?.includes('rare_trinket');
  const isSpareParts = item.id === 'spare_parts';
  const itemSpace = isTrinket ? 0 : item.space ?? (isSpareParts ? 2 : item.category === 'junk' ? 2 : 3);

  if (!isTrinket && context.rules.spaceCapping && itemSpace > 0) {
    const currentSpace = calcUsedSpace(nextPlayer, context.campaign, true);
    const maxSpace = calcHousingSpaceCap(nextPlayer, context.campaign);
    if (currentSpace + itemSpace > maxSpace) {
      const currentHousing = context.campaign.housing.find(h => h.id === nextPlayer.currentHousingId);
      actionLog = {
        key: 'action.error.notEnoughSpace',
        params: { home: currentHousing?.name || 'your home', item: item.name }
      };
      return { nextPlayer, actionLog };
    }
  }

  nextPlayer.money -= price;

  if (isTrinket) {
    // Rare trinket: NOT added to inventory!
    // Gives on_buy +1 Mental (or +1 happiness in classic)
    if (context.rules?.usePhysicalMentalConditions) {
      nextPlayer = applyMentalChange(nextPlayer, 1, context.campaign.config.statRules);
    } else {
      nextPlayer = applyHappinessChange(nextPlayer, 1, 'shopping_bonus', context.rules, context.campaign.config.statRules);
    }
    actionLog = {
      key: 'action.pawn.boughtTrinket',
      params: { itemName: item.name, cost: price }
    };
  } else {
    const isBroken = item.tags?.includes('broken') || (item as any).isBroken;
    if (isBroken) {
      const trackCondition = !!(context.rules.advancedHomeGUI || context.rules.usePhysicalMentalConditions);
      nextPlayer.inventory.appliances.push({
        id: item.id,
        purchasePrice: item.basePrice || 100,
        purchaseSource: 'pawnshop',
        ...(trackCondition ? { condition: 'used' as const } : {}),
        isBroken: true
      });
    } else if (item.id === 'spare_parts') {
      nextPlayer.inventory.spareParts = (nextPlayer.inventory.spareParts || 0) + 1;
    } else if (item.id === 'knick_knack' || item.category === 'junk') {
      nextPlayer.inventory.uninspectedKnickKnacks = (nextPlayer.inventory.uninspectedKnickKnacks || 0) + 1;
      if (!nextPlayer.turnFlags?.curioNoveltyGranted) {
        nextPlayer.turnFlags.curioNoveltyGranted = true;
        if (context.rules?.usePhysicalMentalConditions) {
          nextPlayer = applyMentalChange(nextPlayer, 1, context.campaign.config.statRules);
        }
      }
    }

    actionLog = {
      key: 'action.pawn.boughtRummageItem',
      params: { itemName: item.name, cost: price }
    };
  }

  // Exactly 1 item per rummage: clear pending rummage!
  nextPlayer.pendingPawnRummage = null;

  return { nextPlayer, actionLog };
}

export function handleCloseRummageAction(
  player: PlayerState,
  _action: { type: 'close_rummage' | 'pass_pawn_rummage' },
  _context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  nextPlayer.pendingPawnRummage = null;
  return { nextPlayer, actionLog: { key: 'action.pawn.closedRummage' } };
}
