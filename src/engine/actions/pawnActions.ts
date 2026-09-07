import type { PlayerState, PawnedItem } from '../gameState';
import type { ReducerContext, ActionHandlerResult, PawnableItem } from './types';
import { calcUsedSpace, calcHousingSpaceCap } from '../statMath';
import { applyHappinessChange } from '../statEffects';
import { addApplianceCardToDeck, removeApplianceCardFromDeck } from '../weekendEngine';
import { calcEconomyPrice } from '../economyEngine';

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
