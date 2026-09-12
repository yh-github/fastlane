import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { CampaignBundle } from '../../../engine/dataLoader';
import type { PlayerState, GameRules, OwnedAppliance } from '../../../engine/gameState';

export const DEFAULT_APPLIANCES = [
  'refrigerator', 'freezer', 'stove', 'microwave',
  'color_tv', 'bw_tv', 'stereo', 'vcr', 'computer', 'hot_tub'
];
export const DEFAULT_BOOKS = ['dictionary', 'encyclopedia', 'atlas'];

export interface ApartmentFurnishingsProps {
  player: PlayerState;
  campaign?: CampaignBundle;
  rules?: GameRules;
  onInspectDurable: (durable: {
    id: string;
    isBook?: boolean;
    applianceData?: OwnedAppliance;
    isOwned?: boolean;
  }) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const ApartmentFurnishings: React.FC<ApartmentFurnishingsProps> = ({
  player,
  campaign,
  rules,
  onInspectDurable,
  className,
  style
}) => {
  const { t } = useTranslation();

  // Group appliances so each unique ID has an entry, prioritizing broken copy if any is broken
  const uniqueApplianceIds = useMemo(() => Array.from(new Set(player.inventory?.appliances?.map(a => a.id) || [])), [player.inventory?.appliances]);
  const uniqueAppliances = useMemo(() => uniqueApplianceIds.map(id => {
    const matching = player.inventory?.appliances?.filter(a => a.id === id) || [];
    const hasAnyNew = matching.some(a => a.condition === 'new' || a.purchaseSource === 'socket_city');
    const brokenCopy = matching.find(a => a.isBroken);
    const first = brokenCopy || matching[0];
    return {
      ...first,
      condition: (hasAnyNew ? 'new' : 'used') as 'new' | 'used',
      isBroken: Boolean(brokenCopy)
    };
  }), [uniqueApplianceIds, player.inventory?.appliances]);

  const ownedBooks = player.inventory?.books || [];
  const totalDurablesCount = uniqueAppliances.length + ownedBooks.length;

  const allApplianceIds = useMemo(() => Array.from(new Set([
    ...DEFAULT_APPLIANCES,
    ...(campaign?.items?.filter(i => i.category === 'appliance').map(i => i.id) || [])
  ])), [campaign?.items]);

  const allBookIds = useMemo(() => Array.from(new Set([
    ...DEFAULT_BOOKS,
    ...(campaign?.items?.filter(i => i.category === 'book').map(i => i.id) || [])
  ])), [campaign?.items]);

  const totalMax = allApplianceIds.length + allBookIds.length;

  return (
    <div 
      className={`apartment-furnishings-showcase ${className || ''}`}
      style={{
        background: 'linear-gradient(180deg, rgba(16, 20, 36, 0.9) 0%, rgba(10, 12, 22, 0.95) 100%)',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '10px 12px',
        marginBottom: '8px',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
        flex: '1 1 auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...style
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 }}>
        <h4 style={{ margin: 0, color: 'var(--accent-cyan)', fontSize: '0.88em', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🛋️ {t('homeRelax.durablesShowcase', { defaultValue: 'Apartment Furnishings & Belongings' })}
        </h4>
        <span style={{ fontSize: '0.74rem', color: totalDurablesCount > 0 ? '#2ecc71' : '#888', fontWeight: 'bold' }}>
          {totalDurablesCount} / {totalMax} Furnished
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(66px, 1fr))',
        gap: '8px',
        justifyItems: 'center',
        overflowY: 'auto',
        padding: '2px',
        flex: '1 1 auto'
      }}>
        {/* Appliances */}
        {allApplianceIds.map((appDefId) => {
          const ownedApp = uniqueAppliances.find(a => a.id === appDefId);
          const isOwned = Boolean(ownedApp);
          const itemDef = campaign?.items?.find(i => i.id === appDefId);
          const itemName = itemDef ? t(`item.${itemDef.id}`, { defaultValue: itemDef.name }) : appDefId;
          const isNew = ownedApp ? (ownedApp.condition === 'new' || ownedApp.purchaseSource === 'socket_city') : false;
          const isBroken = Boolean(ownedApp?.isBroken);

          return (
            <div
              key={appDefId}
              data-testid={`durable-card-${appDefId}`}
              onClick={() => onInspectDurable({
                id: appDefId,
                isBook: false,
                applianceData: ownedApp,
                isOwned
              })}
              title={isOwned 
                ? (isBroken ? `${itemName} (BROKEN — Needs Repair) — Click to maintain` : `${itemName} (${isNew ? 'New' : 'Used'}) — Click to inspect`)
                : `${itemName} (Unowned — Available at Socket City/Z-Mart)`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '66px',
                height: '74px',
                background: isOwned 
                  ? (isBroken ? 'rgba(239, 68, 68, 0.22)' : 'rgba(0, 0, 0, 0.45)') 
                  : 'rgba(0, 0, 0, 0.25)',
                border: isOwned 
                  ? (isBroken ? '1.5px solid #ef4444' : `1.5px solid ${isNew ? '#2ecc71' : '#3498db'}`)
                  : '1.5px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: isOwned 
                  ? (isBroken ? '0 0 10px rgba(239, 68, 68, 0.5)' : (isNew ? '0 0 8px rgba(46, 204, 113, 0.25)' : '0 0 8px rgba(52, 152, 219, 0.25)'))
                  : 'none',
                opacity: isOwned ? 1 : 0.45,
                transition: 'all 0.15s ease',
                position: 'relative',
                padding: '4px 2px',
                boxSizing: 'border-box'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)';
                if (isOwned) {
                  e.currentTarget.style.boxShadow = isBroken 
                    ? '0 0 16px rgba(239, 68, 68, 0.8)' 
                    : (isNew 
                      ? '0 0 12px rgba(46, 204, 113, 0.5)' 
                      : '0 0 12px rgba(52, 152, 219, 0.5)');
                } else {
                  e.currentTarget.style.opacity = '0.8';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                if (isOwned) {
                  e.currentTarget.style.boxShadow = isBroken 
                    ? '0 0 10px rgba(239, 68, 68, 0.5)' 
                    : (isNew 
                      ? '0 0 8px rgba(46, 204, 113, 0.25)' 
                      : '0 0 8px rgba(52, 152, 219, 0.25)');
                } else {
                  e.currentTarget.style.opacity = '0.45';
                }
              }}
            >
              <img
                src={`/assets/raw_images/${appDefId}.png`}
                alt={itemName}
                style={{
                  width: '38px',
                  height: '38px',
                  objectFit: 'contain',
                  filter: isOwned 
                    ? (isBroken ? 'drop-shadow(0 2px 4px rgba(239,68,68,0.8)) sepia(30%)' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))') 
                    : 'grayscale(100%) opacity(0.35) brightness(0.6)'
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span style={{
                fontSize: '0.62rem',
                color: isOwned ? '#e2e8f0' : '#718096',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '60px',
                marginTop: '2px'
              }}>
                {itemName}
              </span>
              {isOwned && (
                isBroken ? (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontSize: '0.50rem',
                    fontWeight: 'bold',
                    letterSpacing: '0.04em',
                    padding: '1px 4px',
                    borderRadius: '4px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.8)',
                    zIndex: 2,
                    border: '1px solid #f87171'
                  }}>
                    BROKEN
                  </span>
                ) : (
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    right: '3px',
                    fontSize: '0.62rem'
                  }}>
                    {isNew ? '✨' : '📦'}
                  </span>
                )
              )}
            </div>
          );
        })}

        {/* Books */}
        {allBookIds.map((bId) => {
          const isOwned = ownedBooks.includes(bId);
          const itemDef = campaign?.items?.find(i => i.id === bId);
          const bookName = itemDef ? t(`item.${itemDef.id}`, { defaultValue: itemDef.name }) : bId;

          return (
            <div
              key={bId}
              data-testid={`durable-card-${bId}`}
              onClick={() => onInspectDurable({
                id: bId,
                isBook: true,
                isOwned
              })}
              title={isOwned 
                ? `${bookName} (Book) — Click to inspect`
                : `${bookName} (Book, Unowned — Available at Socket City/Z-Mart)`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '66px',
                height: '74px',
                background: isOwned ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.25)',
                border: isOwned ? '1.5px solid #9b59b6' : '1.5px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: isOwned ? '0 0 8px rgba(155, 89, 182, 0.25)' : 'none',
                opacity: isOwned ? 1 : 0.45,
                transition: 'all 0.15s ease',
                position: 'relative',
                padding: '4px 2px',
                boxSizing: 'border-box'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)';
                if (isOwned) {
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(155, 89, 182, 0.5)';
                } else {
                  e.currentTarget.style.opacity = '0.8';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                if (isOwned) {
                  e.currentTarget.style.boxShadow = '0 0 8px rgba(155, 89, 182, 0.25)';
                } else {
                  e.currentTarget.style.opacity = '0.45';
                }
              }}
            >
              <img
                src={`/assets/raw_images/${bId}.png`}
                alt={bookName}
                style={{
                  width: '38px',
                  height: '38px',
                  objectFit: 'contain',
                  filter: isOwned 
                    ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' 
                    : 'grayscale(100%) opacity(0.35) brightness(0.6)'
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span style={{
                fontSize: '0.62rem',
                color: isOwned ? '#e2e8f0' : '#718096',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '60px',
                marginTop: '2px'
              }}>
                {bookName}
              </span>
              {isOwned && (
                <span style={{
                  position: 'absolute',
                  top: '2px',
                  right: '3px',
                  fontSize: '0.62rem'
                }}>
                  📚
                </span>
              )}
            </div>
          );
        })}

        {/* Knick Knacks (Curios) */}
        {(rules?.pawnRummageBins !== false || (player.inventory?.knickKnacks || 0) > 0) && (
          <div
            title={`Curios & Knick-Knacks\nYou have ${(player.inventory?.knickKnacks || 0)} on display.`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '66px',
              height: '74px',
              background: (player.inventory?.knickKnacks || 0) > 0 ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.25)',
              border: (player.inventory?.knickKnacks || 0) > 0 ? '1.5px solid #f1c40f' : '1.5px dashed rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              cursor: 'default',
              boxShadow: (player.inventory?.knickKnacks || 0) > 0 ? '0 0 8px rgba(241, 196, 15, 0.25)' : 'none',
              opacity: (player.inventory?.knickKnacks || 0) > 0 ? 1 : 0.45,
              transition: 'all 0.15s ease',
              position: 'relative',
              padding: '4px 2px',
              boxSizing: 'border-box'
            }}
          >
            <span style={{ fontSize: '24px', filter: (player.inventory?.knickKnacks || 0) > 0 ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' : 'grayscale(100%) opacity(0.35)' }}>
              🏺
            </span>
            <span style={{
              fontSize: '0.62rem',
              color: (player.inventory?.knickKnacks || 0) > 0 ? '#e2e8f0' : '#718096',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '60px',
              marginTop: '2px'
            }}>
              Curios
            </span>
            {(player.inventory?.knickKnacks || 0) > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#f1c40f',
                color: '#000',
                fontSize: '0.55rem',
                fontWeight: 'bold',
                padding: '2px 5px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                border: '1px solid #d4ac0d'
              }}>
                x{player.inventory?.knickKnacks}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
