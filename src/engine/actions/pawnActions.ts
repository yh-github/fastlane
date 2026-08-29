import type { PlayerState, OwnedAppliance, PawnedItem } from '../gameState';
import type { ReducerContext, ActionHandlerResult } from './types';
import { calcUsedSpace, calcHousingSpaceCap } from '../statMath';
import { applyHappinessChange } from '../statEffects';

export function handlePawnItemAction(
  player: PlayerState,
  action: { type: 'pawn_item'; item: OwnedAppliance; value: number },
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

  nextPlayer.inventory.appliances = nextPlayer.inventory.appliances.filter(a => a.id !== action.item.id);
  if (!nextPlayer.inventory.pawnedItems) nextPlayer.inventory.pawnedItems = [];
  const pawnedItem: PawnedItem = {
    itemId: action.item.id,
    originalPrice: action.item.purchasePrice,
    redeemCost: Math.floor(action.item.purchasePrice * 0.5),
    weekPawned: context.turn,
    ownerId: nextPlayer.id,
    purchaseSource: action.item.purchaseSource || 'socket_city'
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
    nextPlayer.inventory.appliances.push({
      id: action.item.itemId,
      purchasePrice: action.item.originalPrice,
      purchaseSource: action.item.purchaseSource || 'socket_city'
    });
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
    nextPlayer.inventory.appliances.push({
      id: action.item.itemId,
      purchasePrice: action.item.originalPrice,
      purchaseSource: 'pawnshop'
    });
    const formatItem = (id: string) => context.campaign.items?.find(i => i.id === id)?.name || id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const itemName = formatItem(action.item.itemId);
    actionLog = { key: 'action.pawn.bought', params: { itemName, cost: action.cost } };
  } else {
    actionLog = { key: 'action.error.notEnoughMoneyBuyPawn' };
  }

  return { nextPlayer, actionLog, updatedPawnShopItemsForSale };
}
