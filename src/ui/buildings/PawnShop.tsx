import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ItemDef, CampaignBundle } from '../../engine/dataLoader';
import type { GameRules, PawnedItem } from '../../engine/gameState';
import { calcEconomyPrice } from '../../engine/economyEngine';
import { StoreFront } from './StoreFront';
import type { InteractionProps } from './types';

export function PawnShop({
  player,
  onAction,
  economicIndex = 0,
  pawnShopItemsForSale = [],
  rules,
  campaign,
  availableItems = [],
  initialTab
}: InteractionProps & {
  economicIndex?: number;
  pawnShopItemsForSale?: PawnedItem[];
  rules?: GameRules;
  campaign?: CampaignBundle;
  availableItems?: ItemDef[];
  initialTab?: 'buy' | 'pawn';
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'buy' | 'pawn'>(initialTab ?? 'buy');
  const [purchasedItemKeys, setPurchasedItemKeys] = useState<Record<string, boolean>>({});

  const pawnableAppliances = player.inventory.appliances || [];
  const pawnableBooks = (player.inventory.books || []).map(bId => {
    const bookDef = campaign?.items.find(i => i.id === bId);
    return {
      id: bId,
      purchasePrice: bookDef?.basePrice || 100,
      purchaseSource: 'z_mart' as const
    };
  });
  const pawnableItems = [...pawnableAppliances, ...pawnableBooks];
  const redeemableItems = player.inventory.pawnedItems || [];

  const formatItemName = (id: string) =>
    campaign?.items.find(i => i.id === id)?.name ||
    id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div className="interaction-panel pawn-shop-panel">
      <h3>{t('pawnShop.title', { defaultValue: 'Pawn Shop' })}</h3>

      {/* Primary Navigation Tabs: Prevent accidental selling */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          data-testid="tab-pawnshop-buy"
          onClick={() => setActiveTab('buy')}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '6px',
            fontWeight: 'bold',
            background: activeTab === 'buy' ? 'var(--accent-cyan, #00e5ff)' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'buy' ? '#000' : '#fff',
            border: activeTab === 'buy' ? '1px solid var(--accent-cyan, #00e5ff)' : '1px solid #444',
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'all 0.15s ease'
          }}
        >
          🛒 {t('pawnShop.tabBuy', { defaultValue: 'Buy & Browse' })}
        </button>
        <button
          data-testid="tab-pawnshop-pawn"
          onClick={() => setActiveTab('pawn')}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '6px',
            fontWeight: 'bold',
            background: activeTab === 'pawn' ? 'var(--accent-cyan, #00e5ff)' : 'rgba(255,255,255,0.05)',
            color: activeTab === 'pawn' ? '#000' : '#fff',
            border: activeTab === 'pawn' ? '1px solid var(--accent-cyan, #00e5ff)' : '1px solid #444',
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'all 0.15s ease'
          }}
        >
          ⚖️ {t('pawnShop.tabPawn', { defaultValue: 'Pawn & Redeem' })}
          {redeemableItems.length > 0 ? ` (${redeemableItems.length})` : ''}
        </button>
      </div>

      {/* TAB 1: BUY & BROWSE */}
      {activeTab === 'buy' && (
        <div>
          {availableItems.length > 0 ? (
            <div style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
              <h4 style={{ color: 'var(--accent-cyan)', margin: '0 0 10px 0', fontSize: '0.95em' }}>
                🏷️ {t('pawnShop.weeklyStockTitle', { defaultValue: 'Weekly Pawn & Curio Stock' })}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                {availableItems.map((item, idx) => {
                  const slotKey = `${item.id}_${item.name}_${idx}`;
                  const isBroken = item.tags?.includes('broken') || (item as any).isBroken;
                  const isSpareParts = item.id === 'spare_parts';
                  const price = calcEconomyPrice(item.basePrice || 0, economicIndex);
                  const canAfford = player.money >= price;
                  const isSoldOut = isBroken && !!purchasedItemKeys[slotKey];

                  // Icon
                  const icon = isBroken ? '🔧 ' : isSpareParts ? '⚙️ ' : '🏺 ';

                  // Display Name
                  let displayName = item.name;
                  if (isBroken) {
                    const rawName = item.name.replace('Broken ', '');
                    displayName = t('pawnShop.brokenItemName', {
                      name: t(`item.${item.id}`, { defaultValue: rawName }),
                      defaultValue: `Broken ${rawName}`
                    });
                  } else if (isSpareParts) {
                    displayName = t('item.spare_parts', { defaultValue: item.name });
                  }

                  // Description
                  let descText = t('pawnShop.knickKnackDesc', { defaultValue: 'Weekend Appraisal (2 space)' });
                  if (isSpareParts) {
                    descText = t('pawnShop.sparePartsDesc', { defaultValue: '+30% DIY Repair (2 space)' });
                  } else if (isBroken) {
                    descText = t('pawnShop.brokenDesc', {
                      space: item.space || 3,
                      defaultValue: `Broken appliance. Needs repair (${item.space || 3} space)`
                    });
                  }

                  return (
                    <div
                      key={slotKey}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: isBroken ? '1px solid #78350f' : '1px solid #444',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {icon}
                          {displayName}
                        </div>
                        <div style={{ fontSize: '11px', color: isBroken ? '#f59e0b' : '#94a3b8' }}>
                          {descText}
                        </div>
                      </div>
                      <button
                        disabled={!canAfford || isSoldOut}
                        onClick={async () => {
                          if (isBroken) {
                            setPurchasedItemKeys(prev => ({ ...prev, [slotKey]: true }));
                            await onAction({
                              type: 'buy_pawn_item',
                              item: {
                                itemId: item.id,
                                originalPrice: item.basePrice || 100,
                                redeemCost: price,
                                weekPawned: 0,
                                ownerId: 'pawnshop',
                                purchaseSource: 'pawnshop',
                                condition: 'used',
                                isBroken: true
                              },
                              cost: price
                            });
                          } else {
                            await onAction({ type: 'buy', itemId: item.id });
                          }
                        }}
                        style={{
                          background: isSoldOut ? '#334155' : canAfford ? '#10b981' : '#4b5563',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: (canAfford && !isSoldOut) ? 'pointer' : 'not-allowed',
                          flexShrink: 0
                        }}
                      >
                        {isSoldOut ? t('pawnShop.soldOut', { defaultValue: 'Sold Out' }) : `$${price}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#888' }}>
              {t('pawnShop.noStock', { defaultValue: 'No goods currently on display.' })}
            </p>
          )}

          {/* Forfeited Second Hand Belongings */}
          {pawnShopItemsForSale.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ color: 'var(--accent-cyan)', margin: '0 0 8px 0', fontSize: '0.95em' }}>
                📦 {t('pawnShop.forfeitedStockTitle', { defaultValue: 'Forfeited Second-Hand Belongings' })}
              </h4>
              <ul className="store-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', listStyle: 'none', padding: 0, margin: 0 }}>
                {pawnShopItemsForSale.map((app, idx) => {
                  const itemDef = campaign?.items.find(i => i.id === app.itemId);
                  const basePrice = itemDef?.basePrice ?? app.originalPrice;
                  const redeemRate = campaign?.config?.economyRules?.pawnRedeemRate ?? 0.5;
                  const buyCost = rules?.preventPawnArbitrage
                    ? Math.floor(calcEconomyPrice(basePrice, economicIndex) * redeemRate)
                    : Math.floor(app.originalPrice * 0.5);
                  return (
                    <li
                      key={idx}
                      className="store-item"
                      onClick={() => onAction({ type: 'buy_pawn_item', item: app, cost: buyCost })}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        {rules?.showItemImages && (
                          <img
                            src={`/assets/raw_images/${app.itemId}.png`}
                            alt={app.itemId}
                            style={{ width: '28px', height: '28px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '4px', flexShrink: 0 }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t(`item.${app.itemId}`, { defaultValue: formatItemName(app.itemId) })}
                          {app.isBroken && (
                            <span style={{ marginLeft: '6px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                              ({t('pawnShop.brokenTagShort', { defaultValue: 'Broken' })})
                            </span>
                          )}
                        </span>
                      </div>
                      <span style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: '13px', marginLeft: '8px', flexShrink: 0 }}>-${buyCost}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAWN & REDEEM */}
      {activeTab === 'pawn' && (
        <div>
          {/* Pawn Durables / Books */}
          <h4 style={{ color: 'var(--accent-cyan)', margin: '12px 0 8px 0', fontSize: '0.95em' }}>
            {t('pawnShop.sellTitle', { defaultValue: 'Sell Items (40% Value)' })}
          </h4>
          {pawnableItems.length === 0 ? (
            <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#888' }}>
              {t('pawnShop.noSell', { defaultValue: 'You have no durables to pawn.' })}
            </p>
          ) : (
            <ul className="store-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', listStyle: 'none', padding: 0, margin: 0 }}>
              {pawnableItems.map((item, idx) => {
                const itemDef = campaign?.items.find(i => i.id === item.id);
                const basePrice = itemDef?.basePrice ?? item.purchasePrice;
                const payoutRate = campaign?.config?.economyRules?.pawnPayoutRate ?? 0.4;
                const standardPawnValue = Math.floor(calcEconomyPrice(basePrice, economicIndex) * payoutRate);
                const isBroken = (item as any).isBroken;
                const pawnValue = isBroken ? Math.floor(standardPawnValue * 0.25) : standardPawnValue;
                return (
                  <li
                    key={idx}
                    className="store-item"
                    onClick={() => onAction({ type: 'pawn_item', item, value: pawnValue })}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      {rules?.showItemImages && (
                        <img
                          src={`/assets/raw_images/${item.id}.png`}
                          alt={item.id}
                          style={{ width: '28px', height: '28px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '4px', flexShrink: 0 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t(`item.${item.id}`, { defaultValue: formatItemName(item.id) })}
                        {isBroken && (
                          <span style={{ marginLeft: '6px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                            ({t('pawnShop.brokenTag', { defaultValue: 'Broken — 25%' })})
                          </span>
                        )}
                      </span>
                    </div>
                    <span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '13px', marginLeft: '8px', flexShrink: 0 }}>+${pawnValue}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Buy Back / Redeem */}
          <h4 style={{ color: 'var(--accent-cyan)', margin: '20px 0 8px 0', fontSize: '0.95em' }}>
            {t('pawnShop.buyTitle', { defaultValue: 'Buy Back (50% Value)' })}
          </h4>
          {redeemableItems.length === 0 ? (
            <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#888' }}>
              {t('pawnShop.noBuy', { defaultValue: 'You have no items pawned.' })}
            </p>
          ) : (
            <ul className="store-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', listStyle: 'none', padding: 0, margin: 0 }}>
              {redeemableItems.map((app, idx) => {
                const itemDef = campaign?.items.find(i => i.id === app.itemId);
                const basePrice = itemDef?.basePrice ?? app.originalPrice;
                const redeemRate = campaign?.config?.economyRules?.pawnRedeemRate ?? 0.5;
                const redeemCost = rules?.preventPawnArbitrage
                  ? Math.floor(calcEconomyPrice(basePrice, economicIndex) * redeemRate)
                  : app.redeemCost;
                return (
                  <li
                    key={idx}
                    className="store-item"
                    onClick={() => onAction({ type: 'redeem_item', item: app, cost: redeemCost })}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      {rules?.showItemImages && (
                        <img
                          src={`/assets/raw_images/${app.itemId}.png`}
                          alt={app.itemId}
                          style={{ width: '28px', height: '28px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '4px', flexShrink: 0 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t(`item.${app.itemId}`, { defaultValue: formatItemName(app.itemId) })}
                        {app.isBroken && (
                          <span style={{ marginLeft: '6px', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>
                            ({t('pawnShop.brokenTagShort', { defaultValue: 'Broken' })})
                          </span>
                        )}
                      </span>
                    </div>
                    <span style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: '13px', marginLeft: '8px', flexShrink: 0 }}>-${redeemCost}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
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
          availableItems={availableItems.filter(i => i.id === 'knick_knack' || i.id === 'spare_parts')}
        />
      )}
    </div>
  );
}
