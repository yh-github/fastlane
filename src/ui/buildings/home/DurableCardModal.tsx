import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { CampaignBundle, ItemDef } from '../../../engine/dataLoader';
import type { PlayerState, GameRules, OwnedAppliance } from '../../../engine/gameState';
import type { GameAction } from '../../../engine/actions/types';
import { calcDiySuccessChance, calcRepairmanCost, calcThrowOutMess } from '../../../engine/actions/maintenanceActions';
import { calcItemPrice, calcEconomyPrice } from '../../../engine/economyEngine';
import { calcBulkGroceryBasePrice } from '../../../engine/actions/shoppingActions';
import { calcUsedSpace, calcHousingSpaceCap } from '../../../engine/statMath';
import { getItemDisplayName } from '../../../utils/itemUtils';
import { MessIcon } from '../../icons/MessIcon';

export interface ItemCardModalProps {
  durable?: {
    id: string;
    isBook?: boolean;
    applianceData?: OwnedAppliance;
    isOwned?: boolean;
  };
  item?: ItemDef;
  player?: PlayerState;
  campaign?: CampaignBundle;
  rules?: GameRules;
  economicIndex?: number;
  mode?: 'home' | 'shop';
  priceOverride?: number;
  onAction?: (action: GameAction) => void;
  onClose: () => void;
}

export type DurableCardModalProps = ItemCardModalProps;

import { DEFAULT_APPLIANCE_SPACE, getGameplayDescription } from './durableDescriptions';

export const ItemCardModal: React.FC<ItemCardModalProps> = ({
  durable,
  item,
  player,
  campaign,
  rules,
  economicIndex = 0,
  mode = 'home',
  priceOverride,
  onAction,
  onClose
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  const isShop = mode === 'shop';
  const itemId = durable?.id || item?.id || '';
  const itemDef = item || campaign?.items.find(i => i.id === itemId);
  const isLottery = itemId === 'lottery_tickets';
  const isBulkGrocery = Boolean(rules?.advancedStores && (itemId === 'food_1week' || (itemDef?.category === 'food' && itemDef?.subcategory === 'groceries')));
  const [buyQuantity, setBuyQuantity] = useState(1);
  const isWardrobe = itemId === 'wardrobe';
  const isSpareParts = itemId === 'spare_parts';
  const isCurio = itemId === 'knick_knack' || itemId === 'knick_knacks';
  const itemName = isWardrobe
    ? t('homeApartment.wardrobe', { defaultValue: 'Wardrobe Closet' })
    : (itemDef ? getItemDisplayName(itemDef.id, itemDef, t, !!rules?.usePhysicalMentalConditions, !!rules?.advancedStores) : itemId);
  const isBook = Boolean(durable?.isBook || itemDef?.category === 'book');

  const currentAppliance = isBook 
    ? undefined 
    : (player?.inventory.appliances.find(a => a.id === itemId && a.isBroken) || player?.inventory.appliances.find(a => a.id === itemId));
  const isBroken = Boolean(currentAppliance ? currentAppliance.isBroken : durable?.applianceData?.isBroken);

  const knickKnacks = player?.inventory.knickKnacks || 0;
  const uninspectedKnickKnacks = player?.inventory.uninspectedKnickKnacks || 0;
  const totalCurios = knickKnacks + uninspectedKnickKnacks;

  // Space calculation
  let itemSpace = itemDef?.space ?? 0;
  if ((itemDef?.category === 'book' || durable?.isBook) && itemSpace === 0) {
    itemSpace = itemId === 'encyclopedia' ? 20 : 10;
  } else if (!itemDef && DEFAULT_APPLIANCE_SPACE[itemId]) {
    itemSpace = DEFAULT_APPLIANCE_SPACE[itemId];
  }
  const currentSpace = player ? calcUsedSpace(player, campaign, true) : 0;
  const maxSpace = player ? calcHousingSpaceCap(player, campaign) : 100;
  const hasSpace = !rules?.spaceCapping || itemSpace === 0 || (currentSpace + itemSpace <= maxSpace);

  // Price & Affordability
  let adjustedPrice = priceOverride ?? (itemDef ? calcItemPrice(itemDef, economicIndex) : 0);
  if (isShop && isBulkGrocery) {
    const bulkBase = calcBulkGroceryBasePrice(buyQuantity);
    adjustedPrice = calcItemPrice({ basePrice: bulkBase }, economicIndex ?? 0);
  } else if (isShop && isLottery && rules?.advancedStores) {
    adjustedPrice = (priceOverride ?? 10) * buyQuantity;
  }
  const canAfford = (player?.money ?? 0) >= adjustedPrice;
  const canBuy = canAfford && (!rules?.helpfulUI || hasSpace);

  // Detailed ownership calculation
  let ownedCount = 0;
  let isOwned = false;
  let ownershipDetailText = '';

  if (isWardrobe) {
    isOwned = true;
    ownedCount = 1;
    ownershipDetailText = `Wearing: ${player?.inventory.selectedClothes || 'none'}`;
  } else if (itemDef?.category === 'book' || durable?.isBook) {
    isOwned = Boolean(player?.inventory.books.includes(itemId));
    ownedCount = isOwned ? 1 : 0;
    ownershipDetailText = isOwned ? `✓ ${t('storeFront.owned', { defaultValue: 'Owned' })}` : t('storeFront.notOwned', { defaultValue: 'Not Owned' });
  } else if (itemDef?.category === 'appliance' || (!itemDef && !durable?.isBook && DEFAULT_APPLIANCE_SPACE[itemId] && !isSpareParts && !isCurio && !isWardrobe)) {
    const ownedList = player?.inventory.appliances.filter(a => a.id === itemId) || [];
    ownedCount = ownedList.length;
    isOwned = ownedCount > 0;
    const brokenCount = ownedList.filter(a => a.isBroken).length;
    ownershipDetailText = isOwned
      ? (brokenCount > 0 ? `Owned: ${ownedCount} (${brokenCount} broken)` : `Owned: ${ownedCount}`)
      : t('storeFront.notOwned', { defaultValue: 'Not Owned' });
  } else if (itemDef?.category === 'clothes') {
    let weeks = 0;
    if (itemId === 'casual_clothes') weeks = player?.inventory.casualClothesWeeks || 0;
    else if (itemId === 'dress_clothes') weeks = player?.inventory.dressClothesWeeks || 0;
    else if (itemId === 'business_suit') weeks = player?.inventory.businessClothesWeeks || 0;
    isOwned = weeks > 0;
    ownedCount = weeks;
    ownershipDetailText = isOwned ? `✓ Owned (${weeks} wks left)` : t('storeFront.notOwned', { defaultValue: 'Not Owned' });
  } else if (itemDef?.category === 'food') {
    if (itemDef.subcategory === 'fast_food') {
      ownedCount = player?.inventory.fastFoodItems.filter(f => f.itemId === itemId).length || 0;
      isOwned = ownedCount > 0;
      ownershipDetailText = isOwned ? `In Inventory: ${ownedCount}` : 'None Owned';
    } else if (itemDef.subcategory === 'canned') {
      ownedCount = player?.inventory.cannedFoodUnits || 0;
      isOwned = ownedCount > 0;
      ownershipDetailText = `In Pantry: ${ownedCount} units`;
    } else {
      ownedCount = player?.inventory.freshFoodUnits || 0;
      isOwned = ownedCount > 0;
      ownershipDetailText = `In Storage: ${ownedCount} units`;
    }
  } else if (isSpareParts) {
    ownedCount = player?.inventory.spareParts || 0;
    isOwned = (durable?.isOwned !== false && ownedCount > 0);
    ownershipDetailText = `Owned: ${ownedCount} box(es)`;
  } else if (isCurio) {
    ownedCount = totalCurios;
    isOwned = (durable?.isOwned !== false && ownedCount > 0);
    ownershipDetailText = `Owned: ${ownedCount} curio(s)`;
  } else if (itemDef?.category === 'ticket') {
    if (itemId === 'lottery_ticket') {
      ownedCount = player?.inventory.lotteryTickets || 0;
      isOwned = ownedCount > 0;
      ownershipDetailText = `Owned: ${ownedCount} ticket(s)`;
    } else {
      ownedCount = (player?.inventory.tickets as any)?.[itemId] || 0;
      isOwned = ownedCount > 0;
      ownershipDetailText = `Owned: ${ownedCount} ticket(s)`;
    }
  } else {
    isOwned = durable ? (durable.isOwned !== false) : false;
    ownedCount = isOwned ? 1 : 0;
    ownershipDetailText = isOwned ? `✓ ${t('storeFront.owned', { defaultValue: 'Owned' })}` : t('storeFront.notOwned', { defaultValue: 'Not Owned' });
  }

  const isNew = durable?.isBook 
    ? false 
    : ((currentAppliance?.condition ?? durable?.applianceData?.condition) === 'new' || (currentAppliance?.purchaseSource ?? durable?.applianceData?.purchaseSource) === 'socket_city');

  const hasAllBooks = Boolean(
    player?.inventory?.books?.includes('dictionary') &&
    player?.inventory?.books?.includes('encyclopedia') &&
    player?.inventory?.books?.includes('atlas')
  );

  const conditionLabel = isWardrobe
    ? `👔 Wardrobe (${player?.inventory.selectedClothes || 'none'})`
    : (!isOwned 
        ? '🏬 Not Owned' 
        : (isSpareParts 
            ? `⚙️ Spare Parts (${player?.inventory.spareParts || 0})` 
            : (isCurio 
                ? `🏺 Curio Collection (${totalCurios})` 
                : (isBroken ? '⚠️ BROKEN' : (isNew ? '✨ Brand New' : (durable?.isBook || itemDef?.category === 'book' ? '📚 Book' : '📦 Used'))))));


  // Compile mechanical effects:
  interface EffectBadge {
    label: React.ReactNode;
    isOneTime?: boolean;
  }
  const effectBadges: EffectBadge[] = [];

  // Core gameplay appliance mechanics:
  if (itemId === 'refrigerator') {
    effectBadges.push({ label: '🧊 Preserves up to 6 Fresh Food/turn' });
  } else if (itemId === 'freezer') {
    effectBadges.push({ label: '🧊 Stores up to 12 Food (Needs Refrigerator)' });
    if (!rules?.usePhysicalMentalConditions && itemDef?.happinessBonus) {
      effectBadges.push({ label: `🎁 One-time: +${itemDef.happinessBonus} 😊 on buy`, isOneTime: true });
    }
  } else if (itemId === 'stove') {
    if (!rules?.usePhysicalMentalConditions) {
      effectBadges.push({ label: '🍳 +1 😊/turn' });
    }
  } else if (itemId === 'microwave') {
    if (!rules?.usePhysicalMentalConditions) {
      effectBadges.push({ label: '⚡ +1 😊/turn' });
    }
  } else if (itemId === 'computer') {
    effectBadges.push({ label: '🎓 Bonus Study Credit (-1 Lesson)' });
    effectBadges.push({ label: '💻 Freelance Income ($10–$150/turn chance)' });
    if (!rules?.usePhysicalMentalConditions && itemDef?.happinessBonus) {
      effectBadges.push({ label: `🎁 One-time: +${itemDef.happinessBonus} 😊 on buy`, isOneTime: true });
    }
  } else if (itemId === 'hot_tub') {
    effectBadges.push({ label: '🛁 Prevents relaxation collapse' });
    if (!rules?.usePhysicalMentalConditions && itemDef?.happinessBonus) {
      effectBadges.push({ label: `🎁 One-time: +${itemDef.happinessBonus} 😊 on buy`, isOneTime: true });
    }
  }

  // Reference book 3-book set synergy (Dictionary, Encyclopedia, Atlas):
  if (isBook && (itemId === 'dictionary' || itemId === 'encyclopedia' || itemId === 'atlas')) {
    effectBadges.push({
      label: hasAllBooks 
        ? '📚 3-Book Synergy: -1 Lesson (Active)' 
        : '📚 3-Book Synergy: -1 Lesson (Needs All 3)'
    });
  }

  // Stat triggers from effects list:
  if (itemDef?.effects) {
    for (const eff of itemDef.effects) {
      if (eff.trigger === 'on_relax') {
        if (eff.stat === 'physical') effectBadges.push({ label: `+${eff.value} 💪 On Relax` });
        else if (eff.stat === 'mental') effectBadges.push({ label: `+${eff.value} 🧠 On Relax` });
        else if (eff.stat === 'mess') effectBadges.push({
          label: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              +{eff.value} <MessIcon /> On Relax
            </span>
          )
        });
      } else if (eff.trigger === 'on_socialize') {
        if (eff.stat === 'social') effectBadges.push({ label: `+${eff.value} 👥 On Socialize` });
      } else if (eff.trigger === 'continuous' && eff.stat === 'mental_max') {
        effectBadges.push({ label: `+${eff.value} Max 🧠 (Continuous)` });
      } else if (eff.trigger === 'turn_start') {
        effectBadges.push({ label: `+${eff.value} ${eff.stat === 'physical' ? '💪' : '🧠'} Every Turn` });
      }
    }
  }

  // Fallback one-time happiness bonus for classic items in Base mode:
  if (
    !rules?.usePhysicalMentalConditions &&
    itemDef?.happinessBonus &&
    itemId !== 'freezer' &&
    itemId !== 'stove' &&
    itemId !== 'microwave' &&
    itemId !== 'computer' &&
    itemId !== 'hot_tub' &&
    !effectBadges.some(b => b.isOneTime)
  ) {
    effectBadges.push({ label: `🎁 One-time: +${itemDef.happinessBonus} 😊 on buy`, isOneTime: true });
  }

  if (isSpareParts) {
    effectBadges.push({ label: '+20% to +30% DIY Repair' });
  }
  if (isCurio) {
    if (rules?.usePhysicalMentalConditions) {
      const curioLifestyle = Math.min(15, Math.floor(2.8 * Math.sqrt(totalCurios || 1)));
      effectBadges.push({ label: `🏺 Lifestyle Synergy (+${curioLifestyle})` });
      effectBadges.push({ label: '📈 2.8 × √Count (Max +15)' });
      effectBadges.push({ label: '+1 🧠 Turn Novelty (First Curio)' });
      effectBadges.push({ label: '🎲 Weekend Appraisal (Decor/Mental/Cash)' });
    } else {
      effectBadges.push({ label: '+1 😊 Happiness' });
      effectBadges.push({ label: '🏺 Curio Collection' });
    }
  }

  const hasTv = player?.inventory.appliances.some(a => (a.id === 'color_tv' || a.id === 'bw_tv') && !a.isBroken);
  const isVcrWithoutTv = itemId === 'vcr' && isOwned && !hasTv;
  if (itemId === 'vcr' && isVcrWithoutTv && rules?.usePhysicalMentalConditions) {
    effectBadges.push({ label: '⚠️ Requires TV (Inactive)' });
  }

  const spaceCost = isSpareParts || isCurio
    ? 2
    : ((itemDef?.space && itemDef.space > 0) ? itemDef.space : (DEFAULT_APPLIANCE_SPACE[itemId] ?? (isBook ? 10 : 20)));
  const lifestyleVal = isVcrWithoutTv ? 0 : (isCurio ? Math.min(15, Math.floor(2.8 * Math.sqrt(totalCurios))) : (itemDef?.lifestyleValue ?? 0));

  // Explicit on_buy modifiers
  interface OnBuyModifier {
    label: string;
    icon: string;
  }
  const onBuyModifiers: OnBuyModifier[] = [];

  if (itemDef?.happinessBonus && !rules?.usePhysicalMentalConditions) {
    onBuyModifiers.push({ label: `+${itemDef.happinessBonus} on buy`, icon: '😊' });
  }

  // Mental bonus on purchase
  if (isLottery && rules?.usePhysicalMentalConditions) {
    const mentalPerPack = itemDef?.mentalBonus ?? 1;
    const totalMental = rules?.advancedStores ? mentalPerPack * buyQuantity : mentalPerPack;
    onBuyModifiers.push({ label: `+${totalMental} on buy`, icon: '🧠' });
  } else if (itemDef?.mentalBonus && rules?.usePhysicalMentalConditions && itemDef.category !== 'ticket') {
    onBuyModifiers.push({ label: `+${itemDef.mentalBonus} on buy`, icon: '🧠' });
  }

  if (itemDef?.effects) {
    for (const eff of itemDef.effects) {
      if (eff.trigger === 'on_purchase' || (eff.trigger as string) === 'on_buy') {
        if (eff.stat === 'physical_max') onBuyModifiers.push({ label: `${eff.value > 0 ? '+' : ''}${eff.value} Max Physical`, icon: '💪' });
        else if (eff.stat === 'physical') onBuyModifiers.push({ label: `${eff.value > 0 ? '+' : ''}${eff.value} Physical`, icon: '💪' });
        else if (eff.stat === 'mental_max') onBuyModifiers.push({ label: `${eff.value > 0 ? '+' : ''}${eff.value} Max Mental`, icon: '🧠' });
        else if (eff.stat === 'mental') onBuyModifiers.push({ label: `${eff.value > 0 ? '+' : ''}${eff.value} on buy`, icon: '🧠' });
        else if (eff.stat === 'happiness') onBuyModifiers.push({ label: `${eff.value > 0 ? '+' : ''}${eff.value} Happiness`, icon: '😊' });
        else if (eff.stat === 'social') onBuyModifiers.push({ label: `${eff.value > 0 ? '+' : ''}${eff.value} on buy`, icon: '👥' });
        else if (eff.stat === 'mess') onBuyModifiers.push({ label: `${eff.value > 0 ? '+' : ''}${eff.value} Mess`, icon: '🧹' });
      }
    }
  }

  if (itemDef?.category === 'clothes') {
    const weeks = itemDef.weeks ?? (itemId === 'business_suit' ? 12 : 8);
    onBuyModifiers.push({ label: `+${weeks} Weeks of wear`, icon: '👔' });
    if (rules?.usePhysicalMentalConditions) {
      onBuyModifiers.push({ label: '+1 Lifestyle prestige', icon: '✨' });
    }
  } else if (itemDef?.category === 'food') {
    if (itemDef.subcategory === 'fast_food') {
      onBuyModifiers.push({ label: 'Fast meal (+1 meal turn count)', icon: '🍔' });
    } else if (itemDef.subcategory === 'canned') {
      onBuyModifiers.push({ label: '+1 Pantry unit (Never spoils)', icon: '🥫' });
    } else {
      const foodUnits = isBulkGrocery ? buyQuantity : 1;
      onBuyModifiers.push({ label: `+${foodUnits} Fresh food (Preserves with Fridge)`, icon: '🥗' });
      if (rules?.usePhysicalMentalConditions && !player?.turnFlags?.freshFoodHappinessGranted) {
        onBuyModifiers.push({ label: '+1 Nutrition happiness', icon: '😊' });
      }
    }
  } else if (itemDef?.category === 'ticket' && !isLottery) {
    if (rules?.usePhysicalMentalConditions) {
      onBuyModifiers.push({ label: '+1 (up to 4/turn)', icon: '🧠' });
    }
  } else if (isCurio) {
    if (rules?.usePhysicalMentalConditions && !player?.turnFlags?.curioNoveltyGranted) {
      onBuyModifiers.push({ label: '+1 Mental novelty on buy', icon: '🧠' });
    }
  } else if (itemDef?.category === 'appliance' && rules?.usePhysicalMentalConditions) {
    onBuyModifiers.push({ label: '+1 Lifestyle prestige', icon: '✨' });
  }

  if (typeof document === 'undefined') return null;

  const categoryLabel = isBook
    ? '📚 BOOK'
    : (isWardrobe
        ? '👔 WARDROBE'
        : (itemDef?.category === 'clothes'
            ? '👔 CLOTHING'
            : (itemDef?.category === 'food'
                ? '🥗 FOOD'
                : (itemDef?.category === 'ticket'
                    ? '🎟️ TICKET'
                    : (isSpareParts
                        ? '⚙️ SPARE PARTS'
                        : (isCurio
                            ? '🏺 CURIO'
                            : '🛋️ APPLIANCE'))))));

  return createPortal(
    <div 
      data-testid="durable-card-modal-backdrop"
      className="durable-card-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '12px',
        boxSizing: 'border-box'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="item-card-modal-content"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '290px',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: '12px',
          border: isBroken
            ? '2px solid #ef4444'
            : `2px solid ${isNew ? '#2ecc71' : '#3498db'}`,
          boxShadow: isBroken
            ? '0 0 25px rgba(239, 68, 68, 0.4), 0 10px 30px rgba(0,0,0,0.8)'
            : (isNew 
              ? '0 0 25px rgba(46, 204, 113, 0.4), 0 10px 30px rgba(0,0,0,0.8)' 
              : '0 0 25px rgba(52, 152, 219, 0.4), 0 10px 30px rgba(0,0,0,0.8)'),
          background: 'linear-gradient(165deg, #161b2e 0%, #0d111d 100%)',
          padding: '10px 12px',
          color: '#fff',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        {/* Top-Right Dismiss Button */}
        <button
          type="button"
          data-testid="btn-close-durable-card"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '6px',
            right: '8px',
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            padding: '4px',
            lineHeight: 1,
            zIndex: 10
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
        >
          ✕
        </button>
        {/* Top Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '22px' }}>
          <span style={{
            fontSize: '0.66rem',
            fontWeight: 'bold',
            letterSpacing: '0.08em',
            padding: '2px 6px',
            borderRadius: '5px',
            backgroundColor: isBook ? 'rgba(155, 89, 182, 0.2)' : 'rgba(52, 152, 219, 0.2)',
            color: isBook ? '#d7bde2' : '#aed6f1',
            border: `1px solid ${isBook ? '#9b59b6' : '#3498db'}`
          }}>
            {categoryLabel}
          </span>

          <span style={{
            fontSize: '0.68rem',
            fontWeight: 'bold',
            padding: '2px 7px',
            borderRadius: '10px',
            backgroundColor: isShop
              ? (isOwned ? 'rgba(46, 204, 113, 0.2)' : 'rgba(52, 152, 219, 0.2)')
              : (isBroken
                  ? 'rgba(239, 68, 68, 0.25)'
                  : (isNew ? 'rgba(46, 204, 113, 0.2)' : 'rgba(52, 152, 219, 0.2)')),
            color: isShop
              ? (isOwned ? '#2ecc71' : '#5dade2')
              : (isBroken
                  ? '#ef4444'
                  : (isNew ? '#2ecc71' : '#5dade2')),
            border: `1px solid ${isShop ? (isOwned ? '#2ecc71' : '#3498db') : (isBroken ? '#ef4444' : (isNew ? '#2ecc71' : '#3498db'))}`
          }}>
            {isShop ? (isOwned ? `✓ OWNED (${ownedCount})` : '🏬 FOR SALE') : conditionLabel}
          </span>
        </div>

        {/* Artwork Frame */}
        <div 
          className="item-card-modal-artwork"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '46px',
            borderRadius: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
            flexShrink: 0
          }}
        >
          {isWardrobe ? (
            <span style={{ fontSize: '1.8rem' }}>👔</span>
          ) : (
            <img 
              src={`/assets/raw_images/${itemId}.png`} 
              alt={itemName}
              style={{ 
                maxWidth: '40px', 
                maxHeight: '40px', 
                objectFit: 'contain',
                filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.7))'
              }}
              onError={(e) => { 
                (e.target as HTMLImageElement).style.display = 'none'; 
              }}
            />
          )}
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <h3 className="item-card-modal-title" style={{ margin: 0, fontSize: '1.02rem', color: '#fff', fontWeight: 'bold' }}>
            {itemName}
          </h3>
          {!isOwned && !isShop && (
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '1px' }}>
              Available at Socket City / Z-Mart
            </div>
          )}
          {!isShop && isBroken && (
            <div style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 'bold', marginTop: '1px' }}>
              ⚠️ Broken (Needs Repair)
            </div>
          )}
          {!isShop && isNew && (
            <div style={{ fontSize: '0.68rem', color: '#2ecc71', fontWeight: 'bold', marginTop: '1px' }}>
              ✨ Brand New
            </div>
          )}
        </div>

        {/* Gameplay Narrative (Home Apartment Inspection) */}
        {!isShop && getGameplayDescription(itemId, rules, isBook) && (
          <p style={{
            fontSize: '0.74rem',
            lineHeight: '1.35',
            color: '#cbd5e1',
            textAlign: 'center',
            margin: 0,
            padding: '0 2px'
          }}>
            {getGameplayDescription(itemId, rules, isBook)}
          </p>
        )}

        {/* Specs & Effect Chips */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.35)',
          padding: '8px 10px',
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px'
        }}>
          {isShop && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.78rem',
              color: '#cbd5e1',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              paddingBottom: '4px'
            }}>
              <span>Price: <strong style={{ color: canAfford ? '#34d399' : '#f87171' }}>${adjustedPrice}</strong></span>
              <span style={{ fontSize: '0.72rem', color: isOwned ? '#34d399' : '#94a3b8' }}>{ownershipDetailText}</span>
            </div>
          )}

          {(Boolean(rules?.spaceCapping) || Boolean(lifestyleVal > 0 && rules?.usePhysicalMentalConditions)) && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#aaa',
              borderBottom: effectBadges.length > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              paddingBottom: '3px'
            }}>
              {rules?.spaceCapping ? (
                <span>Space: <strong style={{ color: hasSpace ? '#00e5ff' : '#f87171' }}>{spaceCost} space</strong></span>
              ) : <span />}
              {lifestyleVal > 0 && rules?.usePhysicalMentalConditions && (
                <span>Lifestyle: <strong style={{ color: '#f1c40f' }}>+{lifestyleVal}</strong></span>
              )}
            </div>
          )}

          {effectBadges.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
              {effectBadges.map((badge, idx) => (
                <span 
                  key={idx}
                  style={{
                    fontSize: '0.70rem',
                    fontWeight: 'bold',
                    color: isBroken ? '#94a3b8' : (badge.isOneTime ? '#facc15' : '#2ecc71'),
                    textDecoration: isBroken ? 'line-through' : 'none',
                    background: isBroken 
                      ? 'rgba(148, 163, 184, 0.1)' 
                      : (badge.isOneTime ? 'rgba(250, 204, 21, 0.12)' : 'rgba(46, 204, 113, 0.12)'),
                    border: `1px solid ${isBroken ? 'rgba(148, 163, 184, 0.25)' : (badge.isOneTime ? 'rgba(250, 204, 21, 0.3)' : 'rgba(46, 204, 113, 0.3)')}`,
                    borderRadius: '4px',
                    padding: '2px 5px'
                  }}
                >
                  {badge.label}
                </span>
              ))}
              {isBroken && effectBadges.length > 0 && (
                <div style={{ fontSize: '0.68rem', color: '#f87171', fontStyle: 'italic', width: '100%', marginTop: '2px' }}>
                  ⚠️ Inactive while broken
                </div>
              )}
            </div>
          )}
        </div>

        {/* Explicit on_buy modifiers block */}
        {isShop && (
          <div style={{
            background: 'rgba(0, 229, 255, 0.08)',
            border: '1px solid rgba(0, 229, 255, 0.25)',
            borderRadius: '8px',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 'bold', color: '#00e5ff', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>⚡ {t('storeFront.onBuyModifiers', { defaultValue: 'On-Purchase Modifiers (on_buy)' })}:</span>
            </div>
            {onBuyModifiers.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {onBuyModifiers.map((mod, i) => (
                  <span key={i} style={{
                    fontSize: '0.70rem',
                    fontWeight: 'bold',
                    color: '#e2e8f0',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(0, 229, 255, 0.25)',
                    borderRadius: '4px',
                    padding: '2px 6px'
                  }}>
                    {mod.icon} {mod.label}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.70rem', color: '#94a3b8', fontStyle: 'italic' }}>
                None (standard item / furnishing)
              </div>
            )}
          </div>
        )}

        {/* Shop Buy Action or Maintenance / Special Action Hook */}
        {isShop ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(isBulkGrocery || (isLottery && rules?.advancedStores)) && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 'bold', color: '#00e5ff' }}>
                    {isBulkGrocery ? '🥗 Weeks of Groceries:' : '🎟️ Ticket Packs (10/pack):'}
                  </span>
                  <span style={{ fontSize: '0.80rem', fontWeight: 'bold', color: '#fff' }}>
                    {isBulkGrocery ? `${buyQuantity} wk${buyQuantity > 1 ? 's' : ''}` : `${buyQuantity * 10} tickets (${buyQuantity} pack${buyQuantity > 1 ? 's' : ''})`}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    data-testid="btn-qty-minus"
                    onClick={() => setBuyQuantity(q => Math.max(1, q - 1))}
                    disabled={buyQuantity <= 1}
                    style={{
                      padding: '2px 10px',
                      background: buyQuantity <= 1 ? '#334155' : 'rgba(0, 229, 255, 0.2)',
                      border: '1px solid rgba(0, 229, 255, 0.4)',
                      borderRadius: '4px',
                      color: '#fff',
                      fontWeight: 'bold',
                      cursor: buyQuantity <= 1 ? 'not-allowed' : 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    -
                  </button>

                  <input
                    type="range"
                    data-testid="input-qty-slider"
                    min={1}
                    max={isBulkGrocery ? 12 : 10}
                    value={buyQuantity}
                    onChange={(e) => setBuyQuantity(Number(e.target.value))}
                    style={{ flex: 1, cursor: 'pointer' }}
                  />

                  <button
                    type="button"
                    data-testid="btn-qty-plus"
                    onClick={() => setBuyQuantity(q => Math.min(isBulkGrocery ? 12 : 10, q + 1))}
                    disabled={buyQuantity >= (isBulkGrocery ? 12 : 10)}
                    style={{
                      padding: '2px 10px',
                      background: buyQuantity >= (isBulkGrocery ? 12 : 10) ? '#334155' : 'rgba(0, 229, 255, 0.2)',
                      border: '1px solid rgba(0, 229, 255, 0.4)',
                      borderRadius: '4px',
                      color: '#fff',
                      fontWeight: 'bold',
                      cursor: buyQuantity >= (isBulkGrocery ? 12 : 10) ? 'not-allowed' : 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    +
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                  {(isBulkGrocery ? [1, 2, 4, 6, 12] : [1, 2, 5, 10]).map(preset => (
                    <button
                      key={preset}
                      type="button"
                      data-testid={`btn-qty-preset-${preset}`}
                      onClick={() => setBuyQuantity(preset)}
                      style={{
                        fontSize: '0.68rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: buyQuantity === preset ? 'var(--accent-cyan, #00e5ff)' : 'rgba(255, 255, 255, 0.08)',
                        color: buyQuantity === preset ? '#000' : '#cbd5e1',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: buyQuantity === preset ? 'bold' : 'normal'
                      }}
                    >
                      {isBulkGrocery ? `${preset}w` : `${preset * 10}`}
                    </button>
                  ))}
                </div>

                {isBulkGrocery && (
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', textAlign: 'center' }}>
                    ${Math.round(adjustedPrice / buyQuantity)}/wk • {(calcEconomyPrice(55, economicIndex ?? 0) * buyQuantity) - adjustedPrice > 0 ? `Bulk savings: $${(calcEconomyPrice(55, economicIndex ?? 0) * buyQuantity) - adjustedPrice}` : 'Standard rate'}
                  </div>
                )}
              </div>
            )}

            <button
              data-action-target={`buy-${itemId}`}
              data-testid={`btn-buy-modal-${itemId}`}
              disabled={!canBuy || !onAction}
              onClick={() => {
                onAction?.({
                  type: 'buy',
                  itemId,
                  quantity: (isBulkGrocery || (isLottery && rules?.advancedStores)) ? buyQuantity : undefined
                });
                onClose();
              }}
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: canBuy ? 'var(--accent-cyan, #00e5ff)' : '#334155',
                color: canBuy ? '#000000' : '#94a3b8',
                border: canBuy ? 'none' : '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '0.88rem',
                cursor: canBuy ? 'pointer' : 'not-allowed',
                boxShadow: canBuy ? '0 0 14px rgba(0, 229, 255, 0.4)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>🛒 {t('storeFront.buy', { defaultValue: 'BUY' })} (${adjustedPrice})</span>
              {!canAfford && <span style={{ fontSize: '0.74rem', color: '#f87171' }}>({t('action.error.notEnoughMoney', { defaultValue: 'Too expensive' })})</span>}
              {canAfford && !hasSpace && <span style={{ fontSize: '0.74rem', color: '#f87171' }}>({t('action.error.notEnoughSpace', { defaultValue: 'No space' })})</span>}
            </button>
          </div>
        ) : isBroken && isOwned ? (() => {
          const diyBreakdown = player ? calcDiySuccessChance(player, campaign, rules, undefined, itemId) : { baseChance: 25, techBonus: 0, electronicsBonus: 0, partsBonus: 0, complexityPenalty: 0, totalChance: 25 };
          const hasDiyHours = (player?.hoursRemaining ?? 0) >= 6;
          const curPhys = player?.physicalCondition ?? 50;
          const curMental = player?.mentalCondition ?? 50;
          const hasDiyStamina = !rules?.usePhysicalMentalConditions || (curPhys - 2 >= 1.0 && curMental - 1 >= 1.0);
          const isDiyDisabled = !player || !hasDiyHours || !hasDiyStamina || !onAction;
          const diyDisabledReason = !hasDiyHours ? 'Need 6h' : (!hasDiyStamina ? 'Exhausted' : '');

          const repairCost = calcRepairmanCost(itemId, economicIndex, campaign);
          const hasRepairHours = (player?.hoursRemaining ?? 0) >= 1;
          const hasRepairMoney = (player?.money ?? 0) >= repairCost;
          const isRepairDisabled = !player || !hasRepairHours || !hasRepairMoney || !onAction;
          const repairDisabledReason = !hasRepairHours ? 'Need 1h' : (!hasRepairMoney ? `Need $${repairCost}` : '');

          const throwMess = calcThrowOutMess(itemId, campaign);

          return (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '10px 12px'
            }}>
              <div style={{
                fontSize: '0.80rem',
                fontWeight: 'bold',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>🛠️ {t('homeDurable.maintenanceTitle', { defaultValue: 'Appliance Maintenance' })}</span>
                <span style={{ fontSize: '0.70rem', color: '#fca5a5' }}>Choose option:</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#fca5a5', lineHeight: '1.3' }}>
                {t('homeDurable.brokenDesc', { defaultValue: 'This appliance has broken down and does not function until repaired.' })}
              </div>

              {/* 1. DIY Fix */}
              <div style={{
                background: 'rgba(0,0,0,0.35)',
                borderRadius: '8px',
                padding: '8px 10px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '0.82rem', color: '#38bdf8' }}>🔧 DIY Fix</strong>
                  <span style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>{rules?.helpfulUI ? '⏳ 6h | -2 💪 | -1 🧠' : '-2 💪 | -1 🧠'}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#85ffb5', marginBottom: '2px' }}>
                  Success: <strong>{diyBreakdown.totalChance}%</strong> ({diyBreakdown.baseChance}% Base + {diyBreakdown.techBonus}% Tech + {diyBreakdown.electronicsBonus}% Electronics{diyBreakdown.partsBonus ? ` + ${diyBreakdown.partsBonus}% Parts` : ''} - {diyBreakdown.complexityPenalty} Complexity)
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '6px' }}>
                  Success: Restores to Used, +3 🧠, +0.5 Tech Skill • Fail: Remains broken, +0.1 Tech Skill
                </div>
                <button
                  data-action-target="diy-fix"
                  disabled={isDiyDisabled}
                  onClick={() => {
                    onAction?.({ type: 'appliance_maintenance', applianceId: itemId, option: 'diy' });
                  }}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '6px',
                    border: 'none',
                    background: isDiyDisabled ? '#475569' : '#0284c7',
                    color: isDiyDisabled ? '#94a3b8' : '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '0.78rem',
                    cursor: isDiyDisabled ? 'not-allowed' : 'pointer',
                    boxShadow: isDiyDisabled ? 'none' : '0 2px 8px rgba(2, 132, 199, 0.4)'
                  }}
                >
                  🔧 Attempt DIY Fix {diyDisabledReason ? `(${diyDisabledReason})` : ''}
                </button>
              </div>

              {/* 2. Call Repairman */}
              <div style={{
                background: 'rgba(0,0,0,0.35)',
                borderRadius: '8px',
                padding: '8px 10px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '0.82rem', color: '#c084fc' }}>📞 Call Repairman</strong>
                  <span style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>{rules?.helpfulUI ? `⏳ 1h | $${repairCost}` : `$${repairCost}`}</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '6px' }}>
                  Professional repair. Guaranteed fix, restores to ✨ Brand New condition.
                </div>
                <button
                  data-action-target="call-repairman"
                  disabled={isRepairDisabled}
                  onClick={() => {
                    onAction?.({ type: 'appliance_maintenance', applianceId: itemId, option: 'repairman' });
                  }}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '6px',
                    border: 'none',
                    background: isRepairDisabled ? '#475569' : '#9333ea',
                    color: isRepairDisabled ? '#94a3b8' : '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '0.78rem',
                    cursor: isRepairDisabled ? 'not-allowed' : 'pointer',
                    boxShadow: isRepairDisabled ? 'none' : '0 2px 8px rgba(147, 51, 234, 0.4)'
                  }}
                >
                  📞 Hire Repairman (${repairCost}) {repairDisabledReason ? `(${repairDisabledReason})` : ''}
                </button>
              </div>

              {/* 3. Throw Out */}
              <div style={{
                background: 'rgba(0,0,0,0.35)',
                borderRadius: '8px',
                padding: '8px 10px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '0.82rem', color: '#f87171' }}>🗑️ Throw Out</strong>
                  <span style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>{rules?.helpfulUI ? '⏳ 0h | Free' : 'Free'}</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
                  <span>Discards appliance permanently. Leaves +{throwMess}</span>
                  <MessIcon />
                  <span>in apartment.</span>
                </div>
                <button
                  data-action-target="throw-out-appliance"
                  disabled={!onAction}
                  onClick={() => {
                    onAction?.({ type: 'appliance_maintenance', applianceId: itemId, option: 'throw_out' });
                    onClose();
                  }}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)'
                  }}
                >
                  🗑️ Throw Out (+{throwMess} Mess)
                </button>
              </div>
            </div>
          );
        })() : isSpareParts ? (
          (player?.inventory.spareParts || 0) > 0 ? (
            <button
              data-testid="btn-discard-spare-parts"
              onClick={() => {
                onAction?.({ type: 'discard_inventory_item', itemType: 'spare_parts', count: 1 });
                onClose();
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)'
              }}
            >
              🗑️ Throw Away 1 Box of Parts (Frees 2 Space)
            </button>
          ) : (
            <div style={{
              padding: '6px 10px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '6px',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              fontSize: '0.72rem',
              color: '#777',
              textAlign: 'center',
              fontStyle: 'italic'
            }}>
              No spare parts in inventory. Find them rummaging at the Pawn Shop.
            </div>
          )
        ) : isCurio ? (
          totalCurios > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
              <button
                data-testid="btn-discard-knick-knacks"
                onClick={() => {
                  onAction?.({ type: 'discard_inventory_item', itemType: 'knick_knacks', count: 1 });
                  onClose();
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)'
                }}
              >
                🗑️ Throw Away 1 Curio (Frees 2 Space)
              </button>
              <div style={{ fontSize: '0.70rem', color: '#94a3b8', textAlign: 'center', lineHeight: '1.3' }}>
                {knickKnacks > 0 && <span>• {knickKnacks} on display shelf (+{Math.min(15, Math.floor(2.8 * Math.sqrt(knickKnacks)))} Lifestyle) </span>}
                {uninspectedKnickKnacks > 0 && <span style={{ color: '#38bdf8' }}>• {uninspectedKnickKnacks} pending weekend appraisal</span>}
              </div>
            </div>
          ) : (
            <div style={{
              padding: '6px 10px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '6px',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              fontSize: '0.72rem',
              color: '#777',
              textAlign: 'center',
              fontStyle: 'italic'
            }}>
              No curios in inventory. Find them rummaging at the Pawn Shop.
            </div>
          )
        ) : isWardrobe ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', marginBottom: '2px' }}>
              Select outfit to wear:
            </div>
            {([
              { id: 'none', label: t('inventoryModal.none', { defaultValue: 'None (Street Casual)' }), weeks: Infinity, icon: '👕' },
              { id: 'casual', label: t('inventoryModal.casual', { defaultValue: 'Casual Clothes' }), weeks: player?.inventory.casualClothesWeeks || 0, icon: '👖' },
              { id: 'dress', label: t('inventoryModal.dress', { defaultValue: 'Dress Clothes' }), weeks: player?.inventory.dressClothesWeeks || 0, icon: '👔' },
              { id: 'business', label: t('inventoryModal.business', { defaultValue: 'Business Suit' }), weeks: player?.inventory.businessClothesWeeks || 0, icon: '💼' }
            ] as const).map(outfit => {
              const isSelected = (player?.inventory.selectedClothes || 'none') === outfit.id;
              const isAvailable = outfit.id === 'none' || outfit.weeks > 0;
              return (
                <button
                  key={outfit.id}
                  data-testid={`btn-wardrobe-${outfit.id}`}
                  disabled={!isAvailable}
                  onClick={() => {
                    onAction?.({ type: 'change_clothes', clothes: outfit.id });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                    border: isSelected ? '1.5px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: isAvailable ? '#fff' : '#64748b',
                    cursor: isAvailable ? 'pointer' : 'not-allowed',
                    fontSize: '0.82rem',
                    fontWeight: isSelected ? 'bold' : 'normal',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{outfit.icon}</span>
                    <span>{outfit.label}</span>
                    {isSelected && <span style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ Wearing</span>}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: isAvailable ? '#94a3b8' : '#64748b' }}>
                    {outfit.id === 'none' ? 'Always' : `${outfit.weeks} wks`}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            padding: '7px 12px',
            backgroundColor: '#334155',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '0.78rem',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            marginTop: '2px'
          }}
        >
          ✕ {isShop ? t('common.close', { defaultValue: 'Back to Shop' }) : t('homeRelax.backToApartment', { defaultValue: 'Back to Apartment' })}
        </button>
      </div>
    </div>,
    document.body
  );
};

export const DurableCardModal = ItemCardModal;
export default ItemCardModal;
