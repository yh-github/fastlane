import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ItemDef, CampaignBundle } from '../../engine/dataLoader';
import type { GameRules, PawnedItem } from '../../engine/gameState';
import { calcEconomyPrice } from '../../engine/economyEngine';
import { calcUsedSpace, calcHousingSpaceCap } from '../../engine/statMath';
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
  const currentSpace = calcUsedSpace(player, campaign, true);
  const maxSpace = calcHousingSpaceCap(player, campaign);

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
          {/* RUMMAGE BATCH (Discovery Modal / Card Deck) */}
          {rules?.pawnRummageBins && (
            player.pendingPawnRummage && player.pendingPawnRummage.length > 0 ? (
              <div
                data-testid="pawn-rummage-results"
                style={{
                  background: 'linear-gradient(165deg, rgba(30, 27, 22, 0.95) 0%, rgba(18, 16, 12, 0.98) 100%)',
                  border: '2px solid #f59e0b',
                  borderRadius: '10px',
                  padding: '14px',
                  marginBottom: '16px',
                  boxShadow: '0 4px 16px rgba(245, 158, 11, 0.2)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ color: '#fbbf24', margin: 0, fontSize: '1.02rem', fontWeight: 'bold' }}>
                    🔍 {t('pawnShop.rummageItemTitle', { defaultValue: 'Unearthed Item' })}
                  </h4>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.82rem', color: '#d1d5db' }}>
                  {t('pawnShop.rummageDesc', { defaultValue: 'Dig through unsorted bins of discarded goods and curios. You might find a bargain, a rare calming trinket, spare parts, or broken machinery. (Costs 1 hour)' })}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '12px', maxWidth: '420px' }}>
                  {player.pendingPawnRummage.map((item, idx) => {
                    const isTrinket = !!item.tags?.includes('rare_trinket');
                    const isBroken = item.tags?.includes('broken') || (item as any).isBroken;
                    const isSpareParts = item.id === 'spare_parts';
                    const price = calcEconomyPrice(item.basePrice || 0, economicIndex);
                    const canAfford = player.money >= price;
                    const itemSpace = isTrinket ? 0 : item.space ?? (isSpareParts ? 2 : item.category === 'junk' ? 2 : 3);
                    const hasSpace = isTrinket || !rules?.spaceCapping || itemSpace === 0 || (currentSpace + itemSpace <= maxSpace);
                    const canBuy = canAfford && (!rules?.helpfulUI || hasSpace);

                    let displayName = item.name;
                    if (isBroken) {
                      const rawName = item.name.replace('Broken ', '');
                      displayName = t('pawnShop.brokenItemName', {
                        name: t(`item.${item.id}`, { defaultValue: rawName }),
                        defaultValue: `Broken ${rawName}`
                      });
                    } else if (isSpareParts) {
                      displayName = t('item.spare_parts', { defaultValue: item.name });
                    } else if (isTrinket) {
                      displayName = item.name;
                    } else {
                      displayName = t(`item.${item.id}`, { defaultValue: item.name });
                    }

                    const handleBuyRummaged = async () => {
                      if (!canBuy) return;
                      await onAction({
                        type: 'buy_rummage_item',
                        itemIndex: idx
                      });
                    };

                    return (
                      <div
                        key={idx}
                        className={`interaction-item store-item ${!canBuy ? 'interaction-item--disabled' : ''}`}
                        style={{
                          background: 'rgba(0, 0, 0, 0.45)',
                          border: isTrinket ? '1px solid #10b981' : isBroken ? '1px solid #ef4444' : '1px solid #f59e0b',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                          <img
                            src={`/assets/raw_images/${item.id}.png`}
                            alt={displayName}
                            style={{
                              width: '36px',
                              height: '36px',
                              objectFit: 'contain',
                              filter: isBroken ? 'grayscale(80%) sepia(30%)' : 'none'
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{
                              fontWeight: 'bold',
                              fontSize: '0.88rem',
                              color: isTrinket ? '#34d399' : isBroken ? '#fca5a5' : '#fef3c7',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {displayName}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: '#9ca3af' }}>
                              {isTrinket ? 'Pocket Trinket (+1 Mental, 0 space)' : isSpareParts ? 'Repair Component (2 space)' : isBroken ? 'Broken Appliance' : item.category}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.92rem', color: '#34d399' }}>
                            ${price}
                          </span>
                          <button
                            data-testid={`buy-rummage-item-${idx}`}
                            onClick={handleBuyRummaged}
                            disabled={!canBuy}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontWeight: 'bold',
                              fontSize: '0.82rem',
                              background: canBuy ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#374151',
                              color: canBuy ? '#fff' : '#6b7280',
                              border: 'none',
                              cursor: canBuy ? 'pointer' : 'not-allowed',
                              boxShadow: canBuy ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none'
                            }}
                          >
                            {t('pawnShop.btnTakeBargain', { defaultValue: 'Take Item' })}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  {player.hoursRemaining >= 1 && (
                    <button
                      data-testid="rummage-again-btn"
                      onClick={() => onAction({ type: 'rummage_pawn_shop' })}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(59, 130, 246, 0.2)',
                        color: '#60a5fa',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      🔄 {t('pawnShop.btnRummageAgain', { defaultValue: 'Draw Another (1 hr)' })}
                    </button>
                  )}
                  <button
                    data-testid="pass-pawn-rummage-btn"
                    onClick={() => onAction({ type: 'close_rummage' })}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#d1d5db',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    {t('pawnShop.btnPassOnBatch', { defaultValue: 'Leave It (Pass)' })}
                  </button>
                </div>
              </div>
            ) : (
              /* RUMMAGE ACTION TRIGGER */
              <div
                data-testid="pawn-rummage-trigger"
                style={{
                  background: 'linear-gradient(165deg, rgba(30, 27, 22, 0.7) 0%, rgba(18, 16, 12, 0.8) 100%)',
                  border: '1px dashed #f59e0b',
                  borderRadius: '10px',
                  padding: '14px',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: '#fbbf24', margin: '0 0 4px 0', fontSize: '0.98rem', fontWeight: 'bold' }}>
                    📦 {t('pawnShop.rummageTitle', { defaultValue: 'Dusty Junk Bins & Crates' })}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.80rem', color: '#9ca3af' }}>
                    {t('pawnShop.rummageDesc', { defaultValue: 'Dig through unsorted bins of discarded goods and curios. You might find bargains, spare parts, or broken machinery. (Costs 1 hour, pick at most 1 item)' })}
                  </p>
                </div>

                <button
                  data-testid="rummage-pawn-shop-btn"
                  data-action-target="rummage-pawn-shop"
                  onClick={() => player.hoursRemaining >= 1 && onAction({ type: 'rummage_pawn_shop' })}
                  disabled={player.hoursRemaining < 1}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    background: player.hoursRemaining >= 1 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#374151',
                    color: player.hoursRemaining >= 1 ? '#000' : '#6b7280',
                    border: 'none',
                    cursor: player.hoursRemaining >= 1 ? 'pointer' : 'not-allowed',
                    boxShadow: player.hoursRemaining >= 1 ? '0 0 10px rgba(245, 158, 11, 0.3)' : 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🔍 {t('pawnShop.actionRummage', { defaultValue: 'Rummage Through Bins (1 hr)' })}
                </button>
              </div>
            )
          )}

          {availableItems.length > 0 && (!rules?.pawnRummageBins || !player.pendingPawnRummage) ? (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: 'var(--accent-cyan)', margin: '0 0 10px 0', fontSize: '0.95em' }}>
                🏷️ {t('pawnShop.weeklyStockTitle', { defaultValue: 'Weekly Pawn & Curio Stock' })}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                {availableItems.map((item, idx) => {
                  const slotKey = `${item.id}_${item.name}_${idx}`;
                  const isBroken = item.tags?.includes('broken') || (item as any).isBroken;
                  const isSpareParts = item.id === 'spare_parts';
                  const price = calcEconomyPrice(item.basePrice || 0, economicIndex);
                  const isSoldOut = isBroken && !!purchasedItemKeys[slotKey];
                  const canAfford = player.money >= price;
                  const itemSpace = item.space ?? (isSpareParts ? 2 : item.category === 'junk' ? 2 : 3);
                  const hasSpace = !rules?.spaceCapping || itemSpace === 0 || (currentSpace + itemSpace <= maxSpace);
                  const canBuy = canAfford && !isSoldOut && (!rules?.helpfulUI || hasSpace);

                  let displayName = item.name;
                  if (isBroken) {
                    const rawName = item.name.replace('Broken ', '');
                    displayName = t('pawnShop.brokenItemName', {
                      name: t(`item.${item.id}`, { defaultValue: rawName }),
                      defaultValue: `Broken ${rawName}`
                    });
                  } else if (isSpareParts) {
                    displayName = t('item.spare_parts', { defaultValue: item.name });
                  } else {
                    displayName = t(`item.${item.id}`, { defaultValue: item.name });
                  }

                  const handleBuy = async () => {
                    if (!canBuy) return;
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
                  };

                  return (
                    <div
                      key={slotKey}
                      className={`interaction-item store-item interaction-item--clickable ${!canBuy ? 'interaction-item--disabled' : ''}`}
                      onClick={canBuy ? handleBuy : undefined}
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
                      data-action-target={`buy-${item.id}`}
                      title={!hasSpace ? `Not enough space (Requires ${itemSpace} space, you have ${Math.max(0, maxSpace - currentSpace)} free)` : undefined}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        {rules?.showItemImages && (
                          <img
                            src={`/assets/raw_images/${item.id}.png`}
                            alt={displayName}
                            style={{ width: '28px', height: '28px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '4px', flexShrink: 0 }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {displayName}
                          {rules?.spaceCapping && itemSpace > 0 && (
                            <span style={{ color: !hasSpace ? '#e74c3c' : '#00e5ff', marginLeft: '6px', fontSize: '11px' }}>
                              📦{itemSpace}
                            </span>
                          )}
                        </span>
                      </div>
                      <span style={{ fontWeight: 'bold', fontSize: '13px', marginLeft: '8px', flexShrink: 0 }}>
                        {isSoldOut ? t('pawnShop.soldOut', { defaultValue: 'Sold Out' }) : `$${price}`}
                      </span>
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
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ color: 'var(--accent-cyan)', margin: '0 0 8px 0', fontSize: '0.95em' }}>
                📦 {t('pawnShop.forfeitedStockTitle', { defaultValue: 'Forfeited Second-Hand Belongings' })}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                {pawnShopItemsForSale.map((app, idx) => {
                  const itemDef = campaign?.items.find(i => i.id === app.itemId);
                  const basePrice = itemDef?.basePrice ?? app.originalPrice;
                  const redeemRate = campaign?.config?.economyRules?.pawnRedeemRate ?? 0.5;
                  const buyCost = rules?.preventPawnArbitrage
                    ? Math.floor(calcEconomyPrice(basePrice, economicIndex) * redeemRate)
                    : Math.floor(app.originalPrice * 0.5);
                  const canAfford = player.money >= buyCost;
                  let itemSpace = itemDef?.space ?? (itemDef?.category === 'book' ? 10 : 3);
                  if (itemDef?.category === 'book' && itemSpace === 0) {
                    itemSpace = itemDef.id === 'encyclopedia' ? 20 : 10;
                  }
                  const hasSpace = !rules?.spaceCapping || itemSpace === 0 || (currentSpace + itemSpace <= maxSpace);
                  const canBuy = canAfford && (!rules?.helpfulUI || hasSpace);

                  return (
                    <div
                      key={idx}
                      className={`interaction-item store-item interaction-item--clickable ${!canBuy ? 'interaction-item--disabled' : ''}`}
                      onClick={() => canBuy && onAction({ type: 'buy_pawn_item', item: app, cost: buyCost })}
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
                      data-action-target={`buy-pawn-${app.itemId}`}
                      title={!hasSpace ? `Not enough space (Requires ${itemSpace} space, you have ${Math.max(0, maxSpace - currentSpace)} free)` : undefined}
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
                          {rules?.spaceCapping && itemSpace > 0 && (
                            <span style={{ color: !hasSpace ? '#e74c3c' : '#00e5ff', marginLeft: '6px', fontSize: '11px' }}>
                              📦{itemSpace}
                            </span>
                          )}
                        </span>
                      </div>
                      <span style={{ fontWeight: 'bold', fontSize: '13px', marginLeft: '8px', flexShrink: 0, color: '#e74c3c' }}>-${buyCost}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAWN & REDEEM */}
      {activeTab === 'pawn' && (
        <div>
          {/* Sell Knick-Knacks (Bulk Sell / Permanent) */}
          {(player.inventory.knickKnacks || 0) > 0 && (() => {
            const knickKnacksCount = player.inventory.knickKnacks || 0;
            const payoutRate = campaign?.config?.economyRules?.pawnPayoutRate ?? 0.4;
            const knickKnackVal = Math.max(1, Math.floor(calcEconomyPrice(10, economicIndex) * payoutRate));
            return (
              <div
                data-testid="pawn-knick-knacks-card"
                style={{
                  background: 'rgba(234, 179, 8, 0.08)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🏺</span>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#facc15' }}>
                        {t('pawnShop.curiosOnDisplay', { defaultValue: 'Curios & Knick-Knacks' })}
                      </strong>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {t('pawnShop.curioCountDesc', {
                          count: knickKnacksCount,
                          space: knickKnacksCount * 2,
                          defaultValue: `You have ${knickKnacksCount} on display (${knickKnacksCount * 2} space). Sell value: $${knickKnackVal} each.`
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    data-action-target="pawn-knick-knack-1"
                    onClick={() => onAction({ type: 'pawn_knick_knacks', count: 1, valuePerItem: knickKnackVal })}
                    style={{
                      flex: 1,
                      minWidth: '90px',
                      padding: '6px 10px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid #eab308',
                      borderRadius: '5px',
                      color: '#fff',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {t('pawnShop.sell1', { val: knickKnackVal, defaultValue: `Sell 1 (+$${knickKnackVal})` })}
                  </button>
                  {knickKnacksCount >= 5 && (
                    <button
                      data-action-target="pawn-knick-knack-5"
                      onClick={() => onAction({ type: 'pawn_knick_knacks', count: 5, valuePerItem: knickKnackVal })}
                      style={{
                        flex: 1,
                        minWidth: '90px',
                        padding: '6px 10px',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid #eab308',
                        borderRadius: '5px',
                        color: '#fff',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      {t('pawnShop.sell5', { val: knickKnackVal * 5, defaultValue: `Sell 5 (+$${knickKnackVal * 5})` })}
                    </button>
                  )}
                  <button
                    data-action-target="pawn-knick-knack-all"
                    onClick={() => onAction({ type: 'pawn_knick_knacks', count: knickKnacksCount, valuePerItem: knickKnackVal })}
                    style={{
                      flex: 1,
                      minWidth: '90px',
                      padding: '6px 10px',
                      background: 'linear-gradient(145deg, rgba(234,179,8,0.3), rgba(202,138,4,0.3))',
                      border: '1px solid #facc15',
                      borderRadius: '5px',
                      color: '#fef08a',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {t('pawnShop.sellAll', { count: knickKnacksCount, val: knickKnackVal * knickKnacksCount, defaultValue: `Sell All ${knickKnacksCount} (+$${knickKnackVal * knickKnacksCount})` })}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Pawn Durables / Books */}
          <h4 style={{ color: 'var(--accent-cyan)', margin: '12px 0 8px 0', fontSize: '0.95em' }}>
            {t('pawnShop.sellTitle', { defaultValue: 'Sell Items (40% Value)' })}
          </h4>
          {pawnableItems.length === 0 ? (
            <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#888' }}>
              {t('pawnShop.noSell', { defaultValue: 'You have no durables to pawn.' })}
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
              {pawnableItems.map((item, idx) => {
                const itemDef = campaign?.items.find(i => i.id === item.id);
                const basePrice = itemDef?.basePrice ?? item.purchasePrice;
                const payoutRate = campaign?.config?.economyRules?.pawnPayoutRate ?? 0.4;
                const standardPawnValue = Math.floor(calcEconomyPrice(basePrice, economicIndex) * payoutRate);
                const isBroken = (item as any).isBroken;
                const pawnValue = isBroken ? Math.floor(standardPawnValue * 0.25) : standardPawnValue;
                const itemSpace = itemDef?.space ?? ((item as any).isBook ? 10 : 3);

                return (
                  <div
                    key={idx}
                    className="interaction-item store-item interaction-item--clickable"
                    onClick={() => onAction({ type: 'pawn_item', item, value: pawnValue })}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      margin: 0,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                    data-action-target={`pawn-${item.id}`}
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
                        {rules?.spaceCapping && itemSpace > 0 && (
                          <span style={{ color: '#00e5ff', marginLeft: '6px', fontSize: '11px' }}>
                            📦{itemSpace}
                          </span>
                        )}
                      </span>
                    </div>
                    <span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '13px', marginLeft: '8px', flexShrink: 0 }}>+${pawnValue}</span>
                  </div>
                );
              })}
            </div>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
              {redeemableItems.map((app, idx) => {
                const itemDef = campaign?.items.find(i => i.id === app.itemId);
                const basePrice = itemDef?.basePrice ?? app.originalPrice;
                const redeemRate = campaign?.config?.economyRules?.pawnRedeemRate ?? 0.5;
                const redeemCost = rules?.preventPawnArbitrage
                  ? Math.floor(calcEconomyPrice(basePrice, economicIndex) * redeemRate)
                  : app.redeemCost;
                let itemSpace = itemDef?.space ?? (itemDef?.category === 'book' ? 10 : 3);
                if (itemDef?.category === 'book' && itemSpace === 0) {
                  itemSpace = itemDef.id === 'encyclopedia' ? 20 : 10;
                }
                const canAfford = player.money >= redeemCost;
                const hasSpace = !rules?.spaceCapping || itemSpace === 0 || (currentSpace + itemSpace <= maxSpace);
                const canRedeem = canAfford && (!rules?.spaceCapping || hasSpace);

                return (
                  <div
                    key={idx}
                    className={`interaction-item store-item ${canRedeem ? 'interaction-item--clickable' : 'interaction-item--disabled'}`}
                    onClick={() => canRedeem && onAction({ type: 'redeem_item', item: app, cost: redeemCost })}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      margin: 0,
                      padding: '8px 12px',
                      opacity: canRedeem ? 1 : 0.5,
                      cursor: canRedeem ? 'pointer' : 'not-allowed',
                      borderRadius: '6px'
                    }}
                    data-action-target={`redeem-${app.itemId}`}
                    title={!hasSpace ? `Not enough space (Requires ${itemSpace} space, you have ${Math.max(0, maxSpace - currentSpace)} free)` : undefined}
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
                        {rules?.spaceCapping && itemSpace > 0 && (
                          <span style={{ color: !hasSpace ? '#e74c3c' : '#00e5ff', marginLeft: '6px', fontSize: '11px' }}>
                            📦{itemSpace}
                          </span>
                        )}
                      </span>
                    </div>
                    <span style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: '13px', marginLeft: '8px', flexShrink: 0 }}>-${redeemCost}</span>
                  </div>
                );
              })}
            </div>
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
