import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ItemDef, CampaignBundle } from '../../engine/dataLoader';
import type { GameRules, PawnedItem } from '../../engine/gameState';
import { calcEconomyPrice } from '../../engine/economyEngine';
import { StoreFront } from './StoreFront';
import type { InteractionProps } from './types';

export function PawnShop({ player, onAction, economicIndex = 0, pawnShopItemsForSale = [], rules, campaign }: InteractionProps & { economicIndex?: number, pawnShopItemsForSale?: PawnedItem[], rules?: GameRules, campaign?: CampaignBundle }) {
  const { t } = useTranslation();
  const pawnableAppliances = player.inventory.appliances;
  const redeemableItems = player.inventory.pawnedItems || [];

  const formatItemName = (id: string) => campaign?.items.find(i => i.id === id)?.name || id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div className="interaction-panel">
      <h3>{t('pawnShop.title', { defaultValue: 'Pawn Shop' })}</h3>
      
      <h4 style={{ color: 'var(--accent-cyan)', margin: '12px 0 8px 0', fontSize: '0.95em' }}>{t('pawnShop.sellTitle', { defaultValue: 'Sell Items (40% Value)' })}</h4>
      {pawnableAppliances.length === 0 ? (
        <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#888' }}>{t('pawnShop.noSell', { defaultValue: 'You have no appliances to pawn.' })}</p>
      ) : (
        <ul className="store-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', listStyle: 'none', padding: 0, margin: 0 }}>
          {pawnableAppliances.map((app, idx) => {
            const pawnValue = Math.floor(calcEconomyPrice(app.purchasePrice, economicIndex) * 0.4);
            return (
              <li key={idx} className="store-item" onClick={() => onAction({ type: 'pawn_item', item: app, value: pawnValue })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  {rules?.showItemImages && (
                    <img 
                      src={`/assets/raw_images/${app.id}.png`} 
                      alt={app.id} 
                      style={{ width: '28px', height: '28px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '4px', flexShrink: 0 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(`item.${app.id}`, { defaultValue: formatItemName(app.id) })}</span>
                </div>
                <span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '13px', marginLeft: '8px', flexShrink: 0 }}>+${pawnValue}</span>
              </li>
            );
          })}
        </ul>
      )}

      <h4 style={{ color: 'var(--accent-cyan)', margin: '16px 0 8px 0', fontSize: '0.95em' }}>{t('pawnShop.buyTitle', { defaultValue: 'Buy Back (50% Value)' })}</h4>
      {redeemableItems.length === 0 ? (
        <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#888' }}>{t('pawnShop.noBuy', { defaultValue: 'You have no items pawned.' })}</p>
      ) : (
        <ul className="store-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', listStyle: 'none', padding: 0, margin: 0 }}>
          {redeemableItems.map((app, idx) => {
            const redeemCost = app.redeemCost;
            return (
              <li key={idx} className="store-item" onClick={() => onAction({ type: 'redeem_item', item: app, cost: redeemCost })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  {rules?.showItemImages && (
                    <img 
                      src={`/assets/raw_images/${app.itemId}.png`} 
                      alt={app.itemId} 
                      style={{ width: '28px', height: '28px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '4px', flexShrink: 0 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(`item.${app.itemId}`, { defaultValue: formatItemName(app.itemId) })}</span>
                </div>
                <span style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: '13px', marginLeft: '8px', flexShrink: 0 }}>-${redeemCost}</span>
              </li>
            );
          })}
        </ul>
      )}

      {pawnShopItemsForSale.length > 0 && (
        <>
          <h4 style={{ color: 'var(--accent-cyan)', margin: '16px 0 8px 0', fontSize: '0.95em' }}>{t('pawnShop.secondHandTitle', { defaultValue: 'Second Hand Items (50% Value)' })}</h4>
          <ul className="store-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', listStyle: 'none', padding: 0, margin: 0 }}>
            {pawnShopItemsForSale.map((app, idx) => {
              const buyCost = Math.floor(app.originalPrice * 0.5);
              return (
                <li key={idx} className="store-item" onClick={() => onAction({ type: 'buy_pawn_item', item: app, cost: buyCost })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    {rules?.showItemImages && (
                      <img 
                        src={`/assets/raw_images/${app.itemId}.png`} 
                        alt={app.itemId} 
                        style={{ width: '28px', height: '28px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '4px', flexShrink: 0 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(`item.${app.itemId}`, { defaultValue: formatItemName(app.itemId) })}</span>
                  </div>
                  <span style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: '13px', marginLeft: '8px', flexShrink: 0 }}>-${buyCost}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export function DiscountAndPawnShop({ player, onAction, availableItems, economicIndex = 0, pawnShopItemsForSale = [], rules, campaign }: InteractionProps & { availableItems: ItemDef[], economicIndex?: number, pawnShopItemsForSale?: PawnedItem[], rules?: GameRules, campaign?: CampaignBundle }) {
  const [activeTab, setActiveTab] = useState<'store' | 'pawn'>('store');

  return (
    <div className="interaction-panel discount-pawn-shop">
      <div className="tabs" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button 
          className={`tab-btn ${activeTab === 'store' ? 'active' : ''}`}
          onClick={() => setActiveTab('store')}
          style={{ flex: 1, padding: '10px', background: activeTab === 'store' ? '#4CAF50' : '#333', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          🛒 Retail Store
        </button>
        <button 
          className={`tab-btn ${activeTab === 'pawn' ? 'active' : ''}`}
          onClick={() => setActiveTab('pawn')}
          style={{ flex: 1, padding: '10px', background: activeTab === 'pawn' ? '#4CAF50' : '#333', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          ⚖️ Pawn & Trade
        </button>
      </div>

      {activeTab === 'store' && (
        <StoreFront 
          player={player}
          onAction={onAction}
          availableItems={availableItems}
          economicIndex={economicIndex}
          rules={rules}
        />
      )}
      
      {activeTab === 'pawn' && (
        <PawnShop 
          player={player}
          onAction={onAction}
          economicIndex={economicIndex}
          pawnShopItemsForSale={pawnShopItemsForSale}
          rules={rules}
          campaign={campaign}
        />
      )}
    </div>
  );
}
