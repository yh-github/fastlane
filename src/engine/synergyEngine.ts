import type { CampaignBundle, EffectTrigger, StatTarget } from './dataLoader';
import type { PlayerState } from './gameState';
import { messGrowth, calcMaxMental } from './statMath';

export function recalculatePlayerEffects(player: PlayerState, campaign: CampaignBundle): PlayerState {
  const activeEffects: Record<string, number> = {};
  const activeTags = new Set<string>();

  // Gather tags from inventory
  // 1. Appliances
  for (const app of player.inventory.appliances) {
    activeTags.add(`item:${app.id}`);
    const itemDef = campaign.items.find(i => i.id === app.id);
    if (itemDef?.tags) {
      itemDef.tags.forEach(t => activeTags.add(`tag:${t}`));
    }
  }

  // 2. Books
  for (const bookId of player.inventory.books) {
    activeTags.add(`item:${bookId}`);
    const itemDef = campaign.items.find(i => i.id === bookId);
    if (itemDef?.tags) {
      itemDef.tags.forEach(t => activeTags.add(`tag:${t}`));
    }
  }

  // Evaluate Synergies
  for (const synergy of campaign.synergies || []) {
    const requirementsMet = synergy.requires.every(req => activeTags.has(req));
    if (requirementsMet) {
      for (const effect of synergy.effects) {
        const currentVal = activeEffects[effect.type];
        
        switch (effect.operation) {
          case 'MAX':
            activeEffects[effect.type] = currentVal === undefined ? effect.value : Math.max(currentVal, effect.value);
            break;
          case 'ADD':
            activeEffects[effect.type] = (currentVal || 0) + effect.value;
            break;
          case 'SET':
            activeEffects[effect.type] = effect.value;
            break;
        }
      }
    }
  }

  let updatedPlayer = {
    ...player,
    activeEffects
  };

  if (campaign.config.gameRules?.usePhysicalMentalConditions) {
    const statRules = campaign.config.statRules;
    const calculatedMaxMental = calcMaxMental(
      updatedPlayer.mess || 0,
      updatedPlayer.social || 9,
      updatedPlayer.resilienceBonus || 0,
      updatedPlayer,
      statRules,
      campaign
    );
    updatedPlayer.mentalConditionMax = calculatedMaxMental;
    if (updatedPlayer.mentalCondition !== undefined) {
      updatedPlayer.mentalCondition = Math.min(updatedPlayer.mentalConditionMax, updatedPlayer.mentalCondition);
    }

    const globalMaxPhys = statRules?.globalMaxPhysicalCondition ?? 100;
    if (updatedPlayer.physicalConditionMax !== undefined) {
      updatedPlayer.physicalConditionMax = Math.min(globalMaxPhys, updatedPlayer.physicalConditionMax);
    }
    if (updatedPlayer.physicalCondition !== undefined && updatedPlayer.physicalConditionMax !== undefined) {
      updatedPlayer.physicalCondition = Math.min(updatedPlayer.physicalConditionMax, updatedPlayer.physicalCondition);
    }
  }

  if (updatedPlayer.lifestyle !== undefined) {
    updatedPlayer.lifestyle = recalculateLifestyle(updatedPlayer, campaign);
  }

  return updatedPlayer;
}

export function recalculateLifestyle(player: PlayerState, campaign: CampaignBundle): number {
  let lifestyle = 0;

  const housingDef = campaign.housing.find(h => h.id === player.currentHousingId);
  if (housingDef && housingDef.lifestyleValue !== undefined) {
    lifestyle += housingDef.lifestyleValue;
  }

  const itemCounts: Record<string, number> = {};

  for (const app of player.inventory.appliances) {
    itemCounts[app.id] = (itemCounts[app.id] || 0) + 1;
  }
  for (const book of player.inventory.books) {
    itemCounts[book] = (itemCounts[book] || 0) + 1;
  }
  if (player.inventory.casualClothesWeeks > 0) itemCounts['casual_clothes'] = 1;
  if (player.inventory.dressClothesWeeks > 0) itemCounts['dress_clothes'] = 1;
  if (player.inventory.businessClothesWeeks > 0) itemCounts['business_suit'] = 1;

  for (const [itemId, count] of Object.entries(itemCounts)) {
    const itemDef = campaign.items.find(i => i.id === itemId);
    if (itemDef && itemDef.lifestyleValue) {
      const val = itemDef.lifestyleValue;
      if (count === 1) {
        lifestyle += val;
      } else if (count >= 2) {
        lifestyle += val + Math.floor(val * 0.5);
      }
    }
  }

  if (player.mess !== undefined) {
    lifestyle -= Math.floor(messGrowth(player.mess) / 2);
  }
  if (player.social !== undefined) {
    lifestyle += Math.floor(player.social / 10);
  }

  return Math.max(0, Math.min(100, lifestyle));
}

export function calcMaxLifestyle(campaign: CampaignBundle): number {
  let maxLifestyle = 0;

  // Max housing
  let maxHousing = 0;
  for (const h of campaign.housing) {
    if (h.lifestyleValue !== undefined && h.lifestyleValue > maxHousing) {
      maxHousing = h.lifestyleValue;
    }
  }
  maxLifestyle += maxHousing;

  // Max items (assuming optimal diminishing returns: 2 appliances, 2 books, 1 clothing)
  for (const item of campaign.items) {
    if (item.lifestyleValue) {
      if (item.category === 'appliance' || item.category === 'book') {
        maxLifestyle += item.lifestyleValue + Math.floor(item.lifestyleValue * 0.5); // 2 copies
      } else if (item.category === 'clothes') {
        // Technically player can hold one of each clothing type
        maxLifestyle += item.lifestyleValue;
      }
    }
  }

  return maxLifestyle;
}

export function collectItemEffects(
  player: PlayerState,
  campaign?: CampaignBundle,
  trigger?: EffectTrigger
): Map<StatTarget, number> {
  const totals = new Map<StatTarget, number>();
  if (!campaign || !campaign.items || !trigger) return totals;

  const seenItemIds = new Set<string>();

  // Process appliances
  for (const app of player.inventory?.appliances || []) {
    if (seenItemIds.has(app.id)) continue;
    seenItemIds.add(app.id);

    const itemDef = campaign.items?.find(i => i.id === app.id);
    for (const effect of itemDef?.effects || []) {
      if (effect.trigger === trigger) {
        totals.set(effect.stat, (totals.get(effect.stat) || 0) + effect.value);
      }
    }
  }

  // Process books
  for (const bookId of player.inventory?.books || []) {
    if (seenItemIds.has(bookId)) continue;
    seenItemIds.add(bookId);

    const itemDef = campaign.items?.find(i => i.id === bookId);
    for (const effect of itemDef?.effects || []) {
      if (effect.trigger === trigger) {
        totals.set(effect.stat, (totals.get(effect.stat) || 0) + effect.value);
      }
    }
  }

  return totals;
}
