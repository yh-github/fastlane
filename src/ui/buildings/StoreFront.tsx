import { useTranslation } from 'react-i18next';
import type { ItemDef, CampaignBundle } from '../../engine/dataLoader';
import type { GameRules } from '../../engine/gameState';
import { calcItemPrice } from '../../engine/economyEngine';
import { calcUsedSpace, calcHousingSpaceCap } from '../../engine/statMath';
import type { InteractionProps } from './types';

export function StoreFront({ player, onAction, availableItems, economicIndex = 0, rules, campaign }: InteractionProps & { availableItems: ItemDef[], economicIndex?: number, rules?: GameRules, campaign?: CampaignBundle }) {
  const { t } = useTranslation();
  const currentSpace = calcUsedSpace(player, campaign, true);
  const maxSpace = calcHousingSpaceCap(player, campaign);

  return (
    <div className="interaction-panel">
      <h3 style={{ marginBottom: '12px' }}>{t('storeFront.title')}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
        {availableItems.map(item => {
          const adjustedPrice = calcItemPrice(item, economicIndex);
          const canAfford = player.money >= adjustedPrice;
          let alreadyOwned = false;
          if (item.category === 'book') alreadyOwned = player.inventory.books.includes(item.id);
          else if (item.category === 'appliance') alreadyOwned = player.inventory.appliances.some(a => a.id === item.id);
          
          let itemSpace = item.space ?? 0;
          if (item.category === 'book' && itemSpace === 0) {
            itemSpace = item.id === 'encyclopedia' ? 2 : 1;
          }
          const hasSpace = !rules?.spaceCapping || itemSpace === 0 || (currentSpace + itemSpace <= maxSpace);
          const canBuy = canAfford && (!rules?.helpfulUI || hasSpace);

          return (
            <div 
              key={item.id} 
              className={`interaction-item interaction-item--clickable ${!canBuy ? 'interaction-item--disabled' : ''}`}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                margin: 0,
                padding: '8px 12px',
                opacity: canBuy ? 1 : 0.5,
                cursor: canBuy ? 'pointer' : 'not-allowed',
                borderRadius: '6px'
              }}
              onClick={() => {
                onAction({ type: 'buy', itemId: item.id });
              }}
              data-action-target={`buy-${item.id}`}
              title={!hasSpace ? `Not enough space (Requires ${itemSpace} space, you have ${Math.max(0, maxSpace - currentSpace)} free)` : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                {rules?.showItemImages && (
                  <img 
                    src={`/assets/raw_images/${item.id}.png`} 
                    alt={item.name} 
                    style={{ width: '28px', height: '28px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '4px', flexShrink: 0 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t(`item.${item.id}`, { defaultValue: item.name })}
                  {rules?.helpfulUI && alreadyOwned && <span style={{ color: '#4caf50', marginLeft: '6px', fontWeight: 'bold' }}>✓ {t('storeFront.owned', { defaultValue: 'Owned' })}</span>}
                  {rules?.spaceCapping && itemSpace > 0 && <span style={{ color: !hasSpace ? '#e74c3c' : '#00e5ff', marginLeft: '6px', fontSize: '11px' }}>📦{itemSpace}</span>}
                </span>
              </div>
              <span style={{ fontWeight: 'bold', fontSize: '13px', marginLeft: '8px', flexShrink: 0 }}>${adjustedPrice}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
