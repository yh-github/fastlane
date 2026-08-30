import type { PlayerState } from '../gameState';
import type { ReducerContext, ActionHandlerResult } from './types';
import { buyItem } from '../shoppingEngine';
import { calcItemPrice } from '../economyEngine';
import { spendHours } from '../timeManager';
import { safeDecrementPhysical } from '../statMath';

export function handleBuyAction(
  player: PlayerState,
  action: { type: 'buy'; itemId: string },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  const currentBuildingId = context.campaign.map?.nodes?.find(n => n.id === nextPlayer.position)?.buildingId;
  const buildingDef = context.campaign.buildings.find(b => b.id === currentBuildingId);
  const inventoryEntry = buildingDef?.inventory?.find(i => i.itemId === action.itemId);
  const baseItemDef = context.campaign.items.find(i => i.id === action.itemId);

  console.log(`[DEBUG-GAMEREDUCER-BUY] itemId=${action.itemId}, currentBuilding=${currentBuildingId}, itemDefFound=${!!baseItemDef}`);

  if (baseItemDef) {
    const timeCost = baseItemDef.id === 'newspaper' ? context.campaign.config.timeRules.newspaperCost : 0;
    if (timeCost > 0 && nextPlayer.hoursRemaining < timeCost) {
      if (!context.rules.allowPartialHours) {
        actionLog = { key: 'action.error.notEnoughTimeBuy', params: { name: baseItemDef.name } };
        return { nextPlayer, actionLog };
      }
    }

    // Resolve price from inventory override or fallback to old basePrice, default to 0
    const basePrice = inventoryEntry?.priceOverride ?? baseItemDef.basePrice ?? 0;

    // Ensure price is adjusted for economy, respecting fixed-price items
    const itemForPricing = { ...baseItemDef, basePrice };
    const adjustedPrice = calcItemPrice(itemForPricing, context.economicIndex);
    const itemWithPriceAndStore = { ...baseItemDef, basePrice: adjustedPrice, store: currentBuildingId };

    const result = buyItem(nextPlayer, itemWithPriceAndStore, context.rules, context.campaign);
    console.log(`[DEBUG-GAMEREDUCER-BUY] buyItem success=${result.success}, newMoney=${result.updated.money}`);
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
        const isJunkOrBadFastFood = !isBurger && (
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
