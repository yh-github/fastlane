import type { PlayerState } from '../gameState';
import type { ReducerContext, ActionHandlerResult } from './types';
import { buyItem } from '../shoppingEngine';
import { calcItemPrice } from '../economyEngine';
import { spendHours } from '../timeManager';
import { safeDecrementPhysical } from '../statMath';

export function calcBulkGroceryBasePrice(weeks: number): number {
  return 45 * Math.max(1, Math.floor(weeks)) + 10;
}

export function handleBuyAction(
  player: PlayerState,
  action: { type: 'buy'; itemId: string; quantity?: number },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  const currentBuildingId = context.campaign.map?.nodes?.find(n => n.id === nextPlayer.position)?.buildingId;
  const buildingDef = context.campaign.buildings?.find(b => b.id === currentBuildingId);
  const inventoryEntry = buildingDef?.inventory?.find(i => i.itemId === action.itemId);
  const baseItemDef = context.campaign.items?.find(i => i.id === action.itemId) || (action as any).item;

  if (baseItemDef) {
    const quantity = Math.max(1, Math.floor(action.quantity ?? 1));
    const timeCost = baseItemDef.id === 'newspaper' ? context.campaign.config.timeRules.newspaperCost : 0;
    if (timeCost > 0 && nextPlayer.hoursRemaining < timeCost) {
      actionLog = { key: 'action.error.notEnoughTimeBuy', params: { name: baseItemDef.name } };
      return { nextPlayer, actionLog };
    }

    // Resolve price from inventory override or fallback to old basePrice, default to 0
    let adjustedPrice = 0;
    const isGroceryFood = baseItemDef.category === 'food' && (baseItemDef.subcategory === 'groceries' || baseItemDef.id === 'food_1week');

    if (context.rules.advancedStores && isGroceryFood) {
      const bulkBase = calcBulkGroceryBasePrice(quantity);
      adjustedPrice = calcItemPrice({ basePrice: bulkBase }, context.economicIndex);
    } else {
      const basePrice = (inventoryEntry?.priceOverride ?? baseItemDef.basePrice ?? 0) * quantity;
      const itemForPricing = { ...baseItemDef, basePrice };
      adjustedPrice = calcItemPrice(itemForPricing, context.economicIndex);
    }

    const itemWithPriceAndStore = {
      ...baseItemDef,
      basePrice: adjustedPrice,
      store: currentBuildingId,
      name: inventoryEntry?.nameOverride ?? baseItemDef.name,
      weeks: inventoryEntry?.weeksOverride ?? baseItemDef.weeks,
      happinessBonus: inventoryEntry?.happinessBonusOverride ?? baseItemDef.happinessBonus
    };

    const result = buyItem(nextPlayer, itemWithPriceAndStore, context.rules, context.campaign, quantity);
    if (result.success) {
      nextPlayer = spendHours(result.updated, timeCost);
      if (baseItemDef.id === 'newspaper') {
        nextPlayer.turnFlags.readNewspaperThisTurn = true;
      }
      if (context.rules.usePhysicalMentalConditions) {
        if (baseItemDef.category === 'appliance' || baseItemDef.category === 'clothes') {
          nextPlayer.lifestyle = Math.min(100, (nextPlayer.lifestyle || 50) + 1);
        }
        const isBurger = ['hamburger', 'cheeseburger', 'burger'].includes(baseItemDef.id);
        const isCurioOrParts = baseItemDef.id === 'knick_knack' || baseItemDef.id === 'spare_parts';
        const isJunkOrBadFastFood = !isBurger && !isCurioOrParts && (
          baseItemDef.category === 'junk' ||
          ['fries', 'shake', 'cola', 'colas', 'shakes', 'astro_chicken'].includes(baseItemDef.id)
        );
        if (isJunkOrBadFastFood) {
          const minPhys = nextPlayer.minPhysicalCondition ?? 1;
          nextPlayer.physicalCondition = safeDecrementPhysical(nextPlayer.physicalCondition ?? 50, 1, minPhys);
          nextPlayer.physicalConditionMax = Math.max(minPhys, (nextPlayer.physicalConditionMax ?? 50) - 1);
          nextPlayer.physicalCondition = Math.min(nextPlayer.physicalConditionMax, nextPlayer.physicalCondition);
        }
      }
      actionLog = result.message;
    } else {
      actionLog = result.message;
    }
  }

  return { nextPlayer, actionLog };
}
