import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ItemDef, CampaignBundle } from '../../engine/dataLoader';
import type { GameRules } from '../../engine/gameState';
import { calcItemPrice } from '../../engine/economyEngine';
import { calcUsedSpace, calcHousingSpaceCap } from '../../engine/statMath';
import { getItemDisplayName } from '../../utils/itemUtils';
import type { InteractionProps } from './types';

export function StoreFront({ player, onAction, availableItems, economicIndex = 0, rules, campaign }: InteractionProps & { availableItems: ItemDef[], economicIndex?: number, rules?: GameRules, campaign?: CampaignBundle }) {
  const { t } = useTranslation();
  const currentSpace = calcUsedSpace(player, campaign, true);
  const maxSpace = calcHousingSpaceCap(player, campaign);
  const [selectedId, setSelectedId] = useState<string>(availableItems[0]?.id || '');
  
  const selectedItem = availableItems.find(i => i.id === selectedId) || availableItems[0];

  return (
    <div className="interaction-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', gap: '10px', height: '100%', minHeight: '180px' }}>
        {/* Left: List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', paddingRight: '4px' }}>
          {availableItems.map(item => {
            const adjustedPrice = calcItemPrice(item, economicIndex);
            const isSelected = item.id === selectedItem?.id;
            
            let alreadyOwned = false;
            if (item.category === 'book') alreadyOwned = player.inventory.books.includes(item.id);
            else if (item.category === 'appliance') alreadyOwned = player.inventory.appliances.some(a => a.id === item.id);

            let itemSpace = item.space ?? 0;
            if (item.category === 'book' && itemSpace === 0) {
              itemSpace = item.id === 'encyclopedia' ? 20 : 10;
            }
            const hasSpace = !rules?.spaceCapping || itemSpace === 0 || (currentSpace + itemSpace <= maxSpace);
            const canAfford = player.money >= adjustedPrice;
            const canBuy = canAfford && (!rules?.helpfulUI || hasSpace);

            return (
              <div
                key={item.id}
                data-action-target={`buy-${item.id}`}
                className={`interaction-item interaction-item--clickable ${!canBuy ? 'interaction-item--disabled' : ''}`}
                onClick={() => {
                  setSelectedId(item.id);
                  onAction({ type: 'buy', itemId: item.id });
                }}
                onMouseEnter={() => setSelectedId(item.id)}
                title={!hasSpace ? `Not enough space (Requires ${itemSpace} space, you have ${Math.max(0, maxSpace - currentSpace)} free)` : undefined}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  cursor: canBuy ? 'pointer' : 'not-allowed',
                  opacity: canBuy ? 1 : 0.5,
                  backgroundColor: isSelected ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  transition: 'background-color 0.1s'
                }}
              >
                <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {getItemDisplayName(item.id, item, t, !!rules?.usePhysicalMentalConditions)}
                  {rules?.helpfulUI && alreadyOwned && <span style={{ color: '#4caf50', fontSize: '11px', fontWeight: 'bold' }}>✓</span>}
                  {rules?.spaceCapping && itemSpace > 0 && <span style={{ color: !hasSpace ? '#e74c3c' : '#00e5ff', fontSize: '11px' }}>📦{itemSpace}</span>}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: isSelected ? 'var(--accent-cyan)' : '#e2e8f0' }}>${adjustedPrice}</span>
              </div>
            );
          })}
        </div>

        {/* Right: Preview Pane */}
        {selectedItem && (() => {
          const adjustedPrice = calcItemPrice(selectedItem, economicIndex);
          const canAfford = player.money >= adjustedPrice;
          let alreadyOwned = false;
          if (selectedItem.category === 'book') alreadyOwned = player.inventory.books.includes(selectedItem.id);
          else if (selectedItem.category === 'appliance') alreadyOwned = player.inventory.appliances.some(a => a.id === selectedItem.id);
          
          let itemSpace = selectedItem.space ?? 0;
          if (selectedItem.category === 'book' && itemSpace === 0) {
            itemSpace = selectedItem.id === 'encyclopedia' ? 20 : 10;
          }
          const hasSpace = !rules?.spaceCapping || itemSpace === 0 || (currentSpace + itemSpace <= maxSpace);
          const canBuy = canAfford && (!rules?.helpfulUI || hasSpace);

          return (
            <div style={{ 
              width: '130px', 
              flexShrink: 0, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              padding: '10px 8px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              {rules?.showItemImages && (
                <div style={{ 
                  width: '64px', height: '64px', 
                  backgroundColor: '#000', 
                  borderRadius: '6px', 
                  marginBottom: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <img 
                    src={`/assets/raw_images/${selectedItem.id}.png`} 
                    alt={selectedItem.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
              
              <div style={{ textAlign: 'center', marginBottom: '8px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

                {rules?.helpfulUI && alreadyOwned && (
                  <div style={{ color: '#4caf50', fontSize: '11px', fontWeight: 'bold' }}>✓ {t('storeFront.owned', { defaultValue: 'Owned' })}</div>
                )}
                {rules?.spaceCapping && itemSpace > 0 && (
                  <div style={{ color: !hasSpace ? '#e74c3c' : '#00e5ff', fontSize: '11px', marginTop: '2px' }}>
                    📦 {itemSpace} Space
                  </div>
                )}
                {!hasSpace && (
                  <div style={{ color: '#e74c3c', fontSize: '10px', marginTop: '2px', lineHeight: '1.1' }}>
                    Need {itemSpace} space, have {Math.max(0, maxSpace - currentSpace)}
                  </div>
                )}
              </div>

              <button
                disabled={!canBuy}
                onClick={() => onAction({ type: 'buy', itemId: selectedItem.id })}
                data-action-target={`buy-${selectedItem.id}`}
                style={{
                  width: '100%',
                  padding: '6px 0',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: canBuy ? 'var(--accent-cyan)' : '#333',
                  color: canBuy ? '#000' : '#777',
                  border: canBuy ? 'none' : '1px solid #555',
                  borderRadius: '4px',
                  cursor: canBuy ? 'pointer' : 'not-allowed',
                  opacity: canBuy ? 1 : 0.7,
                  boxShadow: canBuy ? '0 0 8px rgba(0,229,255,0.4)' : 'none',
                  textTransform: 'uppercase'
                }}
              >
                {t('storeFront.buy', { defaultValue: 'BUY' })}
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
