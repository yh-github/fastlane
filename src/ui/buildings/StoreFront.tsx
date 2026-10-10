import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ItemDef, CampaignBundle } from '../../engine/dataLoader';
import type { GameRules } from '../../engine/gameState';
import { getClothesSwitchingRule } from '../../engine/rules';
import { calcItemPrice } from '../../engine/economyEngine';
import { calcUsedSpace, calcHousingSpaceCap } from '../../engine/statMath';
import { getItemDisplayName } from '../../utils/itemUtils';
import { ItemCardModal } from './home/DurableCardModal';
import type { InteractionProps } from './types';

export function StoreFront({ player, onAction, availableItems, economicIndex = 0, rules, campaign }: InteractionProps & { availableItems: ItemDef[], economicIndex?: number, rules?: GameRules, campaign?: CampaignBundle }) {
  const { t } = useTranslation();
  const currentSpace = calcUsedSpace(player, campaign, true);
  const maxSpace = calcHousingSpaceCap(player, campaign);
  const [modalItem, setModalItem] = useState<ItemDef | null>(null);

  const sellsClothes = availableItems.some(i => i.category === 'clothes');
  const clothesRule = getClothesSwitchingRule(rules);

  return (
    <div className="interaction-panel store-front-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {sellsClothes && clothesRule !== 'autoBest' && (
        <div 
          className="fitting-room-panel" 
          data-testid="store-fitting-room"
          style={{ 
            marginBottom: '8px', 
            padding: '6px 10px', 
            background: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: '6px', 
            border: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <span>👔</span>
            <span style={{ fontWeight: 'bold', color: 'var(--accent-cyan, #00e5ff)' }}>
              {t('storeFront.fittingRoom', { defaultValue: 'Fitting Room' })}:
            </span>
            <span style={{ color: '#ccc' }}>
              {t('inventoryModal.wearing', 'Wearing:')} <strong>{player.inventory.selectedClothes && player.inventory.selectedClothes !== 'none' ? t(`inventoryModal.${player.inventory.selectedClothes}`, { defaultValue: player.inventory.selectedClothes }) : t('inventoryModal.none', 'None')}</strong>
            </span>
          </div>
          <select
            data-testid="fitting-room-select"
            value={player.inventory.selectedClothes || 'none'}
            onChange={(e) => onAction && onAction({ type: 'change_clothes', clothes: e.target.value })}
            style={{ padding: '3px 8px', fontSize: '12px', borderRadius: '4px', background: '#1e293b', color: '#fff', border: '1px solid #475569', cursor: 'pointer' }}
          >
            <option value="none">{t('inventoryModal.none', 'None')}</option>
            <option value="casual" disabled={(player.inventory.casualClothesWeeks || 0) <= 0}>
              {t('inventoryModal.casual', 'Casual')} ({player.inventory.casualClothesWeeks || 0}w)
            </option>
            <option value="dress" disabled={(player.inventory.dressClothesWeeks || 0) <= 0}>
              {t('inventoryModal.dress', 'Dress')} ({player.inventory.dressClothesWeeks || 0}w)
            </option>
            <option value="business" disabled={(player.inventory.businessClothesWeeks || 0) <= 0}>
              {t('inventoryModal.business', 'Business')} ({player.inventory.businessClothesWeeks || 0}w)
            </option>
          </select>
        </div>
      )}
      <div 
        className="store-front-grid"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', 
          gap: '8px', 
          overflowY: 'auto', 
          padding: '2px 4px' 
        }}
      >
        {availableItems.map(item => {
          const adjustedPrice = calcItemPrice(item, economicIndex);
          
          let alreadyOwned = false;
          let ownedCount = 0;
          if (item.category === 'book') {
            alreadyOwned = player.inventory.books.includes(item.id);
            ownedCount = alreadyOwned ? 1 : 0;
          } else if (item.category === 'appliance') {
            const ownedList = player.inventory.appliances.filter(a => a.id === item.id);
            alreadyOwned = ownedList.length > 0;
            ownedCount = ownedList.length;
          } else if (item.category === 'clothes') {
            let weeks = 0;
            if (item.id === 'casual_clothes') weeks = player.inventory.casualClothesWeeks || 0;
            else if (item.id === 'dress_clothes') weeks = player.inventory.dressClothesWeeks || 0;
            else if (item.id === 'business_suit') weeks = player.inventory.businessClothesWeeks || 0;
            alreadyOwned = weeks > 0;
            ownedCount = weeks;
          }

          let itemSpace = item.space ?? 0;
          if (item.category === 'book' && itemSpace === 0) {
            itemSpace = item.id === 'encyclopedia' ? 20 : 10;
          }
          const hasSpace = !rules?.spaceCapping || itemSpace === 0 || (currentSpace + itemSpace <= maxSpace);
          const canAfford = player.money >= adjustedPrice;
          const canBuy = canAfford && (!rules?.helpfulUI || hasSpace);

          const handleClick = () => {
            if (rules?.helpfulUI) {
              setModalItem(item);
            } else {
              onAction({ type: 'buy', itemId: item.id });
            }
          };

          return (
            <div
              key={item.id}
              data-action-target={`buy-${item.id}`}
              data-testid={`store-item-${item.id}`}
              className={`interaction-item interaction-item--clickable ${!canBuy ? 'interaction-item--disabled' : ''}`}
              onClick={handleClick}
              title={!hasSpace ? `Not enough space (Requires ${itemSpace} space, you have ${Math.max(0, maxSpace - currentSpace)} free)` : undefined}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 10px',
                cursor: 'pointer',
                opacity: canBuy ? 1 : 0.6,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                transition: 'all 0.15s ease',
                minHeight: '44px',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0 }}>
                {rules?.showItemImages && (
                  <img 
                    src={`/assets/raw_images/${item.id}.png`} 
                    alt={item.name} 
                    style={{ width: '28px', height: '28px', objectFit: 'contain', flexShrink: 0 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getItemDisplayName(item.id, item, t, !!rules?.usePhysicalMentalConditions)}
                  </span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px' }}>
                    {rules?.helpfulUI && alreadyOwned && (
                      <span style={{ color: '#4caf50', fontWeight: 'bold' }}>✓ {ownedCount > 1 ? `(${ownedCount})` : ''}</span>
                    )}
                    {rules?.spaceCapping && itemSpace > 0 && (
                      <span style={{ color: !hasSpace ? '#e74c3c' : '#00e5ff' }}>📦 {itemSpace}</span>
                    )}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: canAfford ? 'var(--accent-cyan)' : '#f87171', marginLeft: '6px', flexShrink: 0 }}>
                ${adjustedPrice}
              </span>
            </div>
          );
        })}
      </div>

      {modalItem && (
        <ItemCardModal
          item={modalItem}
          player={player}
          campaign={campaign}
          rules={rules}
          economicIndex={economicIndex}
          mode="shop"
          onAction={onAction}
          onClose={() => setModalItem(null)}
        />
      )}
    </div>
  );
}
