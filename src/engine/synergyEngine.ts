import type { CampaignBundle, EffectTrigger, StatTarget } from './dataLoader';
import type { PlayerState } from './gameState';
import { requireAdvancedStatRules } from './rules';
import { messGrowth, calcMaxMental } from './statMath';

export function recalculatePlayerEffects(player: PlayerState, campaign: CampaignBundle): PlayerState {
  const activeEffects: Record<string, number> = {};
  const activeTags = new Set<string>();

  // Gather tags from inventory
  // 1. Appliances
  for (const app of player.inventory.appliances) {
    if (app.isBroken) continue;
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
    const statRules = requireAdvancedStatRules(campaign.config.statRules);
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

    const globalMaxPhys = statRules.globalMaxPhysicalCondition;
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

export const LIFESTYLE_CURIO_MAX_COUNT = 5;
const TV_SLOT_IDS = new Set(['bw_tv', 'color_tv', 'crt_tv', 'plasma_tv']);
const AUDIO_SLOT_IDS = new Set(['8track', 'stereo']);
const CLOTHES_SLOT_IDS = new Set(['casual_clothes', 'dress_clothes', 'business_suit']);

/**
 * Raw diminishing-returns Lifestyle contribution from curios on display,
 * capped at LIFESTYLE_CURIO_MAX_COUNT curios to avoid tedious pawn-rummage grinding.
 */
export function calcCurioRawLifestyle(curioCount: number): number {
  if (curioCount <= 0) return 0;
  const cappedCount = Math.min(LIFESTYLE_CURIO_MAX_COUNT, curioCount);
  return Math.floor(2.8 * Math.sqrt(cappedCount));
}

/**
 * Raw Lifestyle contribution from Social standing relative to startingSocial,
 * clamped at maxSocial so Social can never push Lifestyle above 100%.
 */
export function calcSocialRawLifestyle(
  social: number,
  startingSocial: number = 20,
  maxSocial: number = 99
): number {
  const effectiveSocial = Math.min(maxSocial, social);
  return Math.floor((effectiveSocial - startingSocial) / 4);
}

/**
 * Starter housing baseline subtracted from all housing tiers so starter home = 0 Lifestyle.
 */
export function getStarterHousingLifestyle(campaign: CampaignBundle): number {
  const housings = campaign.housing || [];
  const lowCost = housings.find(h => h.id === 'low_cost');
  if (lowCost) return lowCost.lifestyleValue ?? 0;
  const nonStreet = housings.find(h => h.id !== 'street');
  return nonStreet?.lifestyleValue ?? 0;
}

/**
 * Collect item IDs purchasable in campaign shops when shops stock lifestyle-bearing items.
 * Returns null if the campaign/mock has no shop lifestyle items, falling back to campaign.items.
 */
function getAvailableLifestyleItemIds(campaign: CampaignBundle): Set<string> | null {
  const itemById = new Map((campaign.items || []).map(item => [item.id, item]));
  const shopItemIds = new Set<string>();
  let hasShopLifestyleItems = false;

  for (const building of campaign.buildings || []) {
    for (const entry of building.inventory || []) {
      shopItemIds.add(entry.itemId);
      if ((itemById.get(entry.itemId)?.lifestyleValue ?? 0) > 0) {
        hasShopLifestyleItems = true;
      }
    }
  }

  return hasShopLifestyleItems ? shopItemIds : null;
}

/**
 * Scale a raw Lifestyle delta/value to the 0-100 calibrated scale for a campaign.
 */
export function scaleLifestylePoints(rawPoints: number, campaign?: CampaignBundle): number {
  if (!campaign) return rawPoints;
  const maxRaw = calcMaxLifestyle(campaign);
  return Math.round((rawPoints / maxRaw) * 100);
}

/**
 * Scaled Lifestyle contribution from curios on display for UI & engine consistency.
 */
export function calcCurioScaledLifestyle(curioCount: number, campaign?: CampaignBundle): number {
  return scaleLifestylePoints(calcCurioRawLifestyle(curioCount), campaign);
}

export function recalculateLifestyle(player: PlayerState, campaign: CampaignBundle): number {
  let rawLifestyle = 0;

  const starterHousingLifestyle = getStarterHousingLifestyle(campaign);
  const housingDef = (campaign.housing || []).find(h => h.id === player.currentHousingId);
  if (housingDef) {
    rawLifestyle += (housingDef.lifestyleValue ?? 0) - starterHousingLifestyle;
  }

  const itemById = new Map((campaign.items || []).map(i => [i.id, i]));
  let bestTvVal = 0;
  let hasWorkingTv = false;
  let bestAudioVal = 0;
  let vcrVal = 0;
  const seenAppliances = new Set<string>();

  for (const app of player.inventory.appliances) {
    if (app.isBroken) continue;
    const itemDef = itemById.get(app.id);
    const val = itemDef?.lifestyleValue ?? 0;

    if (TV_SLOT_IDS.has(app.id)) {
      hasWorkingTv = true;
      if (val > bestTvVal) bestTvVal = val;
      continue;
    }
    if (AUDIO_SLOT_IDS.has(app.id)) {
      if (val > bestAudioVal) bestAudioVal = val;
      continue;
    }
    if (app.id === 'vcr') {
      if (val > vcrVal) vcrVal = val;
      continue;
    }
    if (!seenAppliances.has(app.id)) {
      seenAppliances.add(app.id);
      rawLifestyle += val;
    }
  }

  rawLifestyle += bestTvVal + bestAudioVal + (hasWorkingTv ? vcrVal : 0);

  for (const bookId of new Set(player.inventory.books)) {
    const val = itemById.get(bookId)?.lifestyleValue ?? 0;
    rawLifestyle += val;
  }

  // Clothes slot: best active clothing tier only
  let bestClothesVal = 0;
  if (player.inventory.casualClothesWeeks > 0) {
    bestClothesVal = Math.max(bestClothesVal, itemById.get('casual_clothes')?.lifestyleValue ?? 0);
  }
  if (player.inventory.dressClothesWeeks > 0) {
    bestClothesVal = Math.max(bestClothesVal, itemById.get('dress_clothes')?.lifestyleValue ?? 0);
  }
  if (player.inventory.businessClothesWeeks > 0) {
    bestClothesVal = Math.max(bestClothesVal, itemById.get('business_suit')?.lifestyleValue ?? 0);
  }
  rawLifestyle += bestClothesVal;

  // Knick-knacks / Curios contribution with diminishing returns
  rawLifestyle += calcCurioRawLifestyle(player.inventory?.knickKnacks || 0);

  if (player.mess !== undefined) {
    rawLifestyle -= Math.floor(messGrowth(player.mess) / 2);
  }
  if (player.social !== undefined) {
    const sr = campaign.config.statRules as any;
    const startingSocial = sr?.startingSocial ?? 20;
    const maxSocial = sr?.maxSocial ?? 99;
    rawLifestyle += calcSocialRawLifestyle(player.social, startingSocial, maxSocial);
  }

  const maxRaw = calcMaxLifestyle(campaign);
  return Math.min(100, Math.round((rawLifestyle / maxRaw) * 100));
}

/**
 * Compute true maximum raw Lifestyle achievable in this campaign (equal to 100 Lifestyle):
 * best housing (above starter) + best item per slot + all unique working durables
 * + capped curios (if enabled) + max Social standing (if trackSocial enabled).
 */
export function calcMaxLifestyle(campaign: CampaignBundle): number {
  let maxLifestyle = 0;

  const starterHousingLifestyle = getStarterHousingLifestyle(campaign);
  let maxHousing = starterHousingLifestyle;
  for (const h of campaign.housing || []) {
    if (h.lifestyleValue !== undefined && h.lifestyleValue > maxHousing) {
      maxHousing = h.lifestyleValue;
    }
  }
  maxLifestyle += Math.max(0, maxHousing - starterHousingLifestyle);

  const availableIds = getAvailableLifestyleItemIds(campaign);
  let bestTvVal = 0;
  let hasAnyTv = false;
  let bestAudioVal = 0;
  let bestClothesVal = 0;
  let vcrVal = 0;
  const seenItems = new Set<string>();

  for (const item of campaign.items || []) {
    if (availableIds && !availableIds.has(item.id)) continue;
    if (seenItems.has(item.id)) continue;
    seenItems.add(item.id);

    const val = item.lifestyleValue ?? 0;

    if (TV_SLOT_IDS.has(item.id)) {
      hasAnyTv = true;
      if (val > bestTvVal) bestTvVal = val;
      continue;
    }
    if (AUDIO_SLOT_IDS.has(item.id)) {
      if (val > bestAudioVal) bestAudioVal = val;
      continue;
    }
    if (CLOTHES_SLOT_IDS.has(item.id) || item.category === 'clothes') {
      if (val > bestClothesVal) bestClothesVal = val;
      continue;
    }
    if (item.id === 'vcr') {
      if (val > vcrVal) vcrVal = val;
      continue;
    }
    if (val > 0 && (item.category === 'appliance' || item.category === 'book')) {
      maxLifestyle += val;
    }
  }

  maxLifestyle += bestTvVal + bestAudioVal + bestClothesVal + (hasAnyTv ? vcrVal : 0);

  // Curios cap (5 curios when rummaging is enabled)
  if (campaign.config.gameRules?.pawnRummageBins) {
    maxLifestyle += calcCurioRawLifestyle(LIFESTYLE_CURIO_MAX_COUNT);
  }

  // Peak Social standing (startingSocial -> configured maxSocial when trackSocial is enabled)
  if (campaign.config.gameRules?.trackSocial) {
    const sr = campaign.config.statRules as any;
    const startingSocial = sr?.startingSocial ?? 20;
    const maxSocial = sr?.maxSocial ?? 99;
    maxLifestyle += Math.max(0, calcSocialRawLifestyle(maxSocial, startingSocial, maxSocial));
  }

  return Math.max(1, maxLifestyle);
}

export function collectItemEffects(
  player: PlayerState,
  campaign?: CampaignBundle,
  trigger?: EffectTrigger
): Map<StatTarget, number> {
  const totals = new Map<StatTarget, number>();
  if (!campaign || !campaign.items || !trigger) return totals;

  const seenItemIds = new Set<string>();
  const hasStereo = player.inventory?.appliances?.some(a => a.id === 'stereo' && !a.isBroken);
  const hasColorTv = player.inventory?.appliances?.some(a => (a.id === 'color_tv' || a.id === 'crt_tv' || a.id === 'plasma_tv') && !a.isBroken);
  const isAnyTv = (id: string) => id === 'color_tv' || id === 'bw_tv' || id === 'crt_tv' || id === 'plasma_tv';
  const hasTv = player.inventory?.appliances?.some(a => isAnyTv(a.id) && !a.isBroken);

  const cookingEnabled = Boolean(campaign?.config?.gameRules?.enableCookingSystem);
  const advConditions = Boolean(campaign?.config?.gameRules?.usePhysicalMentalConditions);

  // Process appliances
  for (const app of player.inventory?.appliances || []) {
    if (app.isBroken) continue;
    if (seenItemIds.has(app.id)) continue;
    if (hasStereo && app.id === '8track') continue;
    if (hasColorTv && app.id === 'bw_tv') continue;
    if (app.id === 'vcr' && !hasTv) continue;
    seenItemIds.add(app.id);

    const itemDef = campaign.items?.find(i => i.id === app.id);
    if (cookingEnabled && (app.id === 'stove' || app.id === 'microwave')) {
      // Under the Advanced Cooking system, stove and microwave benefits come from meal prep
      continue;
    }

    const effectsList = itemDef?.effects || [];
    for (const effect of effectsList) {
      if (effect.trigger === trigger) {
        totals.set(effect.stat, (totals.get(effect.stat) || 0) + effect.value);
      }
    }

    if (!cookingEnabled && advConditions && effectsList.length === 0) {
      if (app.id === 'stove' && trigger === 'on_relax') {
        totals.set('physical', (totals.get('physical') || 0) + 1);
      } else if (app.id === 'microwave') {
        if (trigger === 'on_relax') {
          totals.set('physical', (totals.get('physical') || 0) + 1);
        } else if (trigger === 'on_socialize') {
          totals.set('social', (totals.get('social') || 0) + 1);
        }
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
