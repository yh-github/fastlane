import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { CampaignBundle } from '../../../engine/dataLoader';
import type { PlayerState, GameRules, OwnedAppliance } from '../../../engine/gameState';
import { HomeCardDeck } from './HomeCardDeck';
import { LeisureCards } from './LeisureCards';
import { ChoresCards } from './ChoresCards';
import { PantryCard } from './PantryCard';
import { DurableCardModal } from './DurableCardModal';

const DEFAULT_APPLIANCES = [
  'refrigerator', 'freezer', 'stove', 'microwave',
  'color_tv', 'bw_tv', 'stereo', 'vcr', 'computer', 'hot_tub'
];
const DEFAULT_BOOKS = ['dictionary', 'encyclopedia', 'atlas'];

interface HomeApartmentViewProps {
  player: PlayerState;
  campaign?: CampaignBundle;
  rules?: GameRules;
  housingName: string;
  actionFeedback: { message: string; isError: boolean } | null;

  // Space & Mess gauge props
  durablesSpace: number;
  totalUsedSpace: number;
  spaceCap: number;
  freeSpace: number;
  overflow: number;
  isOvercapacity: boolean;
  durablesPct: number;
  messPct: number;
  currentMess: number;
  maxMessHousing: number;
  messIcon: string;
  messLabel: string;
  messBarColor: string;
  messPercentage: number;

  // Leisure props
  hoursToRelax: number;
  isRelaxDisabled: boolean;
  hasFood: boolean;
  physGain: number;
  mentalGain: number;
  scaledMess: number;
  classicGain: number;
  classicFirstBonus: number;
  onRelaxClick: () => void;

  // Socialize props
  socialParams: any;
  onSocializeClick: () => void;

  // Chores props
  hoursToClean: number;
  cleanPhysGain: number;
  isCleanDisabled: boolean;
  cleanSubtext: string;
  onCleanClick: () => void;

  cleaningServiceCost: number;
  cleaningServicePrice: number;
  isServiceDisabled: boolean;
  serviceSubtext: string;
  onServiceClick: () => void;

  // Pantry props
  hasFridge: boolean;
  hasFreezer: boolean;
}

export const HomeApartmentView: React.FC<HomeApartmentViewProps> = ({
  player,
  campaign,
  rules,
  housingName: _housingName,
  actionFeedback,
  durablesSpace,
  totalUsedSpace,
  spaceCap,
  freeSpace,
  overflow,
  isOvercapacity,
  durablesPct,
  messPct,
  currentMess,
  maxMessHousing,
  messIcon,
  messLabel,
  messBarColor,
  messPercentage,
  hoursToRelax,
  isRelaxDisabled,
  hasFood,
  physGain,
  mentalGain,
  scaledMess,
  classicGain,
  classicFirstBonus,
  onRelaxClick,
  socialParams,
  onSocializeClick,
  hoursToClean,
  cleanPhysGain,
  isCleanDisabled,
  cleanSubtext,
  onCleanClick,
  cleaningServiceCost,
  cleaningServicePrice,
  isServiceDisabled,
  serviceSubtext,
  onServiceClick,
  hasFridge,
  hasFreezer
}) => {
  const { t } = useTranslation();
  const [activeDeck, setActiveDeck] = useState<'leisure' | 'chores' | 'pantry' | null>(null);
  const [inspectedDurable, setInspectedDurable] = useState<{
    id: string;
    isBook?: boolean;
    applianceData?: OwnedAppliance;
    isOwned?: boolean;
  } | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const [modalParent, setModalParent] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (panelRef.current) {
      const modal = panelRef.current.closest<HTMLElement>('.building-modal');
      if (modal) {
        modal.style.overflow = 'visible';
        setModalParent(modal);
      }
      const content = panelRef.current.closest<HTMLElement>('.building-modal__content');
      const prevOverflow = content?.style.overflowY;
      const prevDisplay = content?.style.display;
      const prevDirection = content?.style.flexDirection;
      if (content) {
        content.style.overflowY = 'hidden';
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
      }
      const parent = panelRef.current.parentElement;
      const prevParentHeight = parent?.style.height;
      const prevParentFlex = parent?.style.flex;
      const prevParentMinHeight = parent?.style.minHeight;
      const prevParentDisplay = parent?.style.display;
      const prevParentDirection = parent?.style.flexDirection;
      if (parent && parent !== content) {
        parent.style.height = '100%';
        parent.style.flex = '1';
        parent.style.minHeight = '0';
        parent.style.display = 'flex';
        parent.style.flexDirection = 'column';
      }
      return () => {
        if (content) {
          content.style.overflowY = prevOverflow || '';
          content.style.display = prevDisplay || '';
          content.style.flexDirection = prevDirection || '';
        }
        if (parent && parent !== content) {
          parent.style.height = prevParentHeight || '';
          parent.style.flex = prevParentFlex || '';
          parent.style.minHeight = prevParentMinHeight || '';
          parent.style.display = prevParentDisplay || '';
          parent.style.flexDirection = prevParentDirection || '';
        }
      };
    }
  }, []);

  // Group appliances so each unique ID has an entry, keeping 'new' if any copy is new
  const uniqueApplianceIds = Array.from(new Set(player.inventory?.appliances?.map(a => a.id) || []));
  const uniqueAppliances = uniqueApplianceIds.map(id => {
    const matching = player.inventory?.appliances?.filter(a => a.id === id) || [];
    const hasAnyNew = matching.some(a => a.condition === 'new' || a.purchaseSource === 'socket_city');
    const first = matching[0];
    return {
      ...first,
      condition: (hasAnyNew ? 'new' : 'used') as 'new' | 'used'
    };
  });

  const ownedBooks = player.inventory?.books || [];
  const totalDurablesCount = uniqueAppliances.length + ownedBooks.length;

  const allApplianceIds = Array.from(new Set([
    ...DEFAULT_APPLIANCES,
    ...(campaign?.items?.filter(i => i.category === 'appliance').map(i => i.id) || [])
  ]));

  const allBookIds = Array.from(new Set([
    ...DEFAULT_BOOKS,
    ...(campaign?.items?.filter(i => i.category === 'book').map(i => i.id) || [])
  ]));

  return (
    <div 
      ref={panelRef}
      className="interaction-panel home-apartment-panel" 
      style={{ 
        width: '100%', 
        height: '100%',
        flex: '1 1 auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        position: 'relative',
        paddingBottom: modalParent ? '34px' : '0'
      }}
    >

      {actionFeedback && (
        <div style={{
          padding: '6px 10px',
          marginBottom: '8px',
          borderRadius: '5px',
          backgroundColor: actionFeedback.isError ? 'rgba(231, 76, 60, 0.2)' : 'rgba(46, 204, 113, 0.2)',
          border: `1px solid ${actionFeedback.isError ? '#e74c3c' : '#2ecc71'}`,
          color: actionFeedback.isError ? '#ff8585' : '#85ffb5',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexShrink: 0
        }}>
          <span>{actionFeedback.isError ? '⚠️' : '✓'}</span>
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Space & Mess Opposing Gauge Bar - Fixed / Always Visible */}
      {(rules?.trackMess || rules?.spaceCapping) && (
        <div className="mess-visual-card" style={{ 
          marginBottom: '8px', 
          padding: '8px 12px', 
          background: 'linear-gradient(135deg, rgba(20,20,35,0.95) 0%, rgba(35,35,55,0.95) 100%)', 
          borderRadius: '8px',
          border: isOvercapacity ? '1px solid #e74c3c' : `1px solid ${messBarColor}`,
          boxShadow: isOvercapacity ? '0 0 10px rgba(231,76,60,0.4)' : `0 0 8px ${messBarColor}22`,
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 20
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.85em', color: '#00e5ff' }}>
              🛋️ Durables: {durablesSpace} space
            </span>
            <span style={{ fontWeight: 'bold', fontSize: '0.85em', textAlign: 'center' }}>
              {rules?.spaceCapping ? (
                isOvercapacity ? (
                  <span style={{ color: '#e74c3c', background: 'rgba(231,76,60,0.2)', padding: '1px 6px', borderRadius: '3px' }}>
                    ⚠️ OVERCROWDED (+{overflow})
                  </span>
                ) : freeSpace === 0 ? (
                  <span style={{ color: '#f39c12' }}>FULL (0 free)</span>
                ) : (
                  <span style={{ color: '#2ecc71' }}>{freeSpace} free space</span>
                )
              ) : null}
            </span>
            <span style={{ fontWeight: 'bold', fontSize: '0.85em', color: messBarColor }}>
              {messIcon} Mess: {currentMess} <span style={{ fontSize: '0.85em', opacity: 0.9 }}>({messLabel})</span>
            </span>
          </div>

          {rules?.spaceCapping ? (
            <div 
              style={{ 
                width: '100%', 
                height: '12px', 
                backgroundColor: 'rgba(255,255,255,0.08)', 
                borderRadius: '6px', 
                overflow: 'hidden',
                position: 'relative'
              }}
              title={`Durables: ${durablesSpace} space | Mess: ${currentMess} space | Free: ${freeSpace} space${overflow > 0 ? ` (⚠️ ${overflow} space overcrowded!)` : ''}`}
            >
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${durablesPct}%`,
                backgroundColor: '#00e5ff',
                transition: 'width 0.3s ease',
                zIndex: 1
              }} />

              <div style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: `${messPct}%`,
                background: isOvercapacity 
                  ? 'repeating-linear-gradient(45deg, #e74c3c, #e74c3c 6px, #f39c12 6px, #f39c12 12px)'
                  : messBarColor,
                boxShadow: isOvercapacity ? '0 0 8px rgba(231,76,60,0.8)' : undefined,
                transition: 'width 0.3s ease',
                zIndex: 2
              }} />
            </div>
          ) : (
            <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${messPercentage}%`,
                height: '100%',
                backgroundColor: messBarColor,
                transition: 'width 0.5s ease-in-out, background-color 0.5s ease'
              }} />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.72em', color: '#aaa', flexWrap: 'wrap', gap: '4px' }}>
            {rules?.spaceCapping ? (
              <>
                <span style={{ color: '#00e5ff' }}>0 (Start)</span>
                <span>
                  Capacity: <strong>{spaceCap} space</strong>
                  {overflow > 0 && <span style={{ color: '#e74c3c', marginLeft: '4px' }}>(Total: {totalUsedSpace})</span>}
                </span>
                <span style={{ color: messBarColor }}>Max Mess: {maxMessHousing}</span>
              </>
            ) : (
              <>
                <span>0 (Spotless)</span>
                <span>Social limit: 25</span>
                <span>Max: {maxMessHousing}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* MIDDLE CONTENT: EITHER ACTIVE CARD DECK OR DURABLES SHOWCASE */}
      {activeDeck === 'leisure' ? (
        <HomeCardDeck>
          <LeisureCards
            hoursToRelax={hoursToRelax}
            isRelaxDisabled={isRelaxDisabled}
            hasFood={hasFood}
            physGain={physGain}
            mentalGain={mentalGain}
            scaledMess={scaledMess}
            trackMess={rules?.trackMess}
            usePhysicalMental={rules?.usePhysicalMentalConditions}
            classicGain={classicGain}
            classicFirstBonus={classicFirstBonus}
            onRelaxClick={() => {
              onRelaxClick();
            }}
            socialParams={socialParams}
            onSocializeClick={() => {
              onSocializeClick();
            }}
          />
        </HomeCardDeck>
      ) : activeDeck === 'chores' ? (
        <HomeCardDeck>
          <ChoresCards
            hoursToClean={hoursToClean}
            cleanPhysGain={cleanPhysGain}
            isCleanDisabled={isCleanDisabled}
            cleanSubtext={cleanSubtext}
            onCleanClick={() => {
              onCleanClick();
            }}
            cleaningServiceCost={cleaningServiceCost}
            cleaningServicePrice={cleaningServicePrice}
            isServiceDisabled={isServiceDisabled}
            serviceSubtext={serviceSubtext}
            onServiceClick={() => {
              onServiceClick();
            }}
          />
        </HomeCardDeck>
      ) : activeDeck === 'pantry' ? (
        <HomeCardDeck>
          <PantryCard
            freshFoodUnits={player.inventory?.freshFoodUnits || 0}
            cannedFoodUnits={player.inventory?.cannedFoodUnits || 0}
            fastFoodItems={player.inventory?.fastFoodItems || []}
            hasFridge={hasFridge}
            hasFreezer={hasFreezer}
            campaign={campaign}
          />
        </HomeCardDeck>
      ) : (
        /* FRONT AND CENTER: COLLECTIBLE DURABLES SHOWCASE */
        <div style={{
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
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 }}>
          <h4 style={{ margin: 0, color: 'var(--accent-cyan)', fontSize: '0.88em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🛋️ {t('homeRelax.durablesShowcase', { defaultValue: 'Apartment Furnishings' })}
          </h4>
          <span style={{ fontSize: '0.74rem', color: totalDurablesCount > 0 ? '#2ecc71' : '#888', fontWeight: 'bold' }}>
            {totalDurablesCount} / {allApplianceIds.length + allBookIds.length} Furnished
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

            return (
              <div
                key={appDefId}
                onClick={() => setInspectedDurable({
                  id: appDefId,
                  isBook: false,
                  applianceData: ownedApp,
                  isOwned
                })}
                title={isOwned 
                  ? `${itemName} (${isNew ? 'New' : 'Used'}) — Click to inspect`
                  : `${itemName} (Unowned — Available at Socket City/Z-Mart)`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '66px',
                  height: '74px',
                  background: isOwned ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.25)',
                  border: isOwned 
                    ? `1.5px solid ${isNew ? '#2ecc71' : '#3498db'}`
                    : '1.5px dashed rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: isOwned 
                    ? (isNew ? '0 0 8px rgba(46, 204, 113, 0.25)' : '0 0 8px rgba(52, 152, 219, 0.25)')
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
                    e.currentTarget.style.boxShadow = isNew 
                      ? '0 0 12px rgba(46, 204, 113, 0.5)' 
                      : '0 0 12px rgba(52, 152, 219, 0.5)';
                  } else {
                    e.currentTarget.style.opacity = '0.8';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  if (isOwned) {
                    e.currentTarget.style.boxShadow = isNew 
                      ? '0 0 8px rgba(46, 204, 113, 0.25)' 
                      : '0 0 8px rgba(52, 152, 219, 0.25)';
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
                  {itemName}
                </span>
                {isOwned && (
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    right: '3px',
                    fontSize: '0.62rem'
                  }}>
                    {isNew ? '✨' : '📦'}
                  </span>
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
                onClick={() => setInspectedDurable({
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
        </div>
      </div>
      )}

      {/* ACTION CONTROLS BAR (Leisure, Chores, Pantry) - DOCKED OVER THE BOTTOM WINDOW BORDER */}
      {modalParent ? createPortal(
        <div 
          className="home-docked-actions"
          style={{
            position: 'absolute',
            bottom: 'calc(-26px * var(--board-scale, 1))',
            left: 'calc(20px * var(--board-scale, 1))',
            right: 'calc(20px * var(--board-scale, 1))',
            zIndex: 60,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 'calc(10px * var(--board-scale, 1))',
            background: 'linear-gradient(180deg, rgba(14, 18, 32, 0.98) 0%, rgba(8, 10, 20, 0.99) 100%)',
            padding: 'calc(6px * var(--board-scale, 1)) calc(12px * var(--board-scale, 1))',
            borderRadius: 'calc(10px * var(--board-scale, 1))',
            border: '2px solid var(--accent-cyan)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.9), 0 0 16px rgba(0, 229, 255, 0.4)',
            backdropFilter: 'blur(12px)',
            boxSizing: 'border-box'
          }}
        >
          {/* Leisure Button */}
          <button
            onClick={() => setActiveDeck(activeDeck === 'leisure' ? null : 'leisure')}
            style={{
              padding: '8px 10px',
              background: activeDeck === 'leisure'
                ? 'linear-gradient(145deg, #34d399 0%, #10b981 100%)'
                : 'linear-gradient(145deg, #10b981 0%, #059669 100%)',
              color: '#000',
              border: activeDeck === 'leisure' ? '2px solid #ffffff' : '2px solid transparent',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: activeDeck === 'leisure'
                ? '0 0 16px rgba(52, 211, 153, 0.8), 0 4px 12px rgba(0,0,0,0.7)'
                : '0 3px 10px rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transform: activeDeck === 'leisure' ? 'translateY(-2px)' : 'none',
              transition: 'all 0.15s ease'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={(e) => e.currentTarget.style.transform = activeDeck === 'leisure' ? 'translateY(-2px)' : 'none'}
          >
            <span style={{ fontSize: '1.4rem' }}>🛋️</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>{t('homeRelax.btnLeisure', { defaultValue: 'Leisure' })}</span>
              <span style={{ fontSize: '0.65rem', color: '#064e3b', fontWeight: 'bold' }}>Relax & Socialize</span>
            </div>
          </button>

          {/* Chores Button */}
          <button
            onClick={() => setActiveDeck(activeDeck === 'chores' ? null : 'chores')}
            style={{
              padding: '8px 10px',
              background: activeDeck === 'chores'
                ? 'linear-gradient(145deg, #38bdf8 0%, #0284c7 100%)'
                : 'linear-gradient(145deg, #0284c7 0%, #0369a1 100%)',
              color: '#fff',
              border: activeDeck === 'chores' ? '2px solid #ffffff' : '2px solid transparent',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: activeDeck === 'chores'
                ? '0 0 16px rgba(56, 189, 248, 0.8), 0 4px 12px rgba(0,0,0,0.7)'
                : '0 3px 10px rgba(2, 132, 199, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transform: activeDeck === 'chores' ? 'translateY(-2px)' : 'none',
              transition: 'all 0.15s ease'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={(e) => e.currentTarget.style.transform = activeDeck === 'chores' ? 'translateY(-2px)' : 'none'}
          >
            <span style={{ fontSize: '1.4rem' }}>🧹</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>{t('homeRelax.btnChores', { defaultValue: 'Chores' })}</span>
              <span style={{ fontSize: '0.65rem', color: '#e0f2fe', fontWeight: 'normal' }}>Clean & Service</span>
            </div>
          </button>

          {/* Pantry Button */}
          <button
            onClick={() => setActiveDeck(activeDeck === 'pantry' ? null : 'pantry')}
            style={{
              padding: '8px 10px',
              background: activeDeck === 'pantry'
                ? 'linear-gradient(145deg, #fbbf24 0%, #f59e0b 100%)'
                : 'linear-gradient(145deg, #f59e0b 0%, #d97706 100%)',
              color: '#000',
              border: activeDeck === 'pantry' ? '2px solid #ffffff' : '2px solid transparent',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: activeDeck === 'pantry'
                ? '0 0 16px rgba(251, 191, 36, 0.8), 0 4px 12px rgba(0,0,0,0.7)'
                : '0 3px 10px rgba(245, 158, 11, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transform: activeDeck === 'pantry' ? 'translateY(-2px)' : 'none',
              transition: 'all 0.15s ease'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={(e) => e.currentTarget.style.transform = activeDeck === 'pantry' ? 'translateY(-2px)' : 'none'}
          >
            <span style={{ fontSize: '1.4rem' }}>🥫</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>{t('homeRelax.btnPantry', { defaultValue: 'Pantry' })}</span>
              <span style={{ fontSize: '0.65rem', color: '#78350f', fontWeight: 'bold' }}>
                {player.inventory?.freshFoodUnits || 0} units
              </span>
            </div>
          </button>
        </div>,
        modalParent
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '8px',
          flexShrink: 0,
          marginTop: 'auto',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.12)'
        }}>
          {/* Leisure Button */}
          <button
            onClick={() => setActiveDeck(activeDeck === 'leisure' ? null : 'leisure')}
            style={{
              padding: '8px 6px',
              background: activeDeck === 'leisure'
                ? 'linear-gradient(145deg, #34d399 0%, #10b981 100%)'
                : 'linear-gradient(145deg, #10b981 0%, #059669 100%)',
              color: '#000',
              border: activeDeck === 'leisure' ? '2px solid #ffffff' : '2px solid transparent',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: activeDeck === 'leisure'
                ? '0 0 14px rgba(52, 211, 153, 0.8)'
                : '0 3px 10px rgba(16, 185, 129, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.15s ease'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'none'}
          >
            <span style={{ fontSize: '1.25rem' }}>🛋️</span>
            <span>{t('homeRelax.btnLeisure', { defaultValue: 'Leisure' })}</span>
            <span style={{ fontSize: '0.65rem', color: '#064e3b', fontWeight: 'bold' }}>Relax & Socialize</span>
          </button>

          {/* Chores Button */}
          <button
            onClick={() => setActiveDeck(activeDeck === 'chores' ? null : 'chores')}
            style={{
              padding: '8px 6px',
              background: activeDeck === 'chores'
                ? 'linear-gradient(145deg, #38bdf8 0%, #0284c7 100%)'
                : 'linear-gradient(145deg, #0284c7 0%, #0369a1 100%)',
              color: '#fff',
              border: activeDeck === 'chores' ? '2px solid #ffffff' : '2px solid transparent',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: activeDeck === 'chores'
                ? '0 0 14px rgba(56, 189, 248, 0.8)'
                : '0 3px 10px rgba(2, 132, 199, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.15s ease'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'none'}
          >
            <span style={{ fontSize: '1.25rem' }}>🧹</span>
            <span>{t('homeRelax.btnChores', { defaultValue: 'Chores' })}</span>
            <span style={{ fontSize: '0.65rem', color: '#e0f2fe', fontWeight: 'normal' }}>Clean & Service</span>
          </button>

          {/* Pantry Button */}
          <button
            onClick={() => setActiveDeck(activeDeck === 'pantry' ? null : 'pantry')}
            style={{
              padding: '8px 6px',
              background: activeDeck === 'pantry'
                ? 'linear-gradient(145deg, #fbbf24 0%, #f59e0b 100%)'
                : 'linear-gradient(145deg, #f59e0b 0%, #d97706 100%)',
              color: '#000',
              border: activeDeck === 'pantry' ? '2px solid #ffffff' : '2px solid transparent',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: activeDeck === 'pantry'
                ? '0 0 14px rgba(251, 191, 36, 0.8)'
                : '0 3px 10px rgba(245, 158, 11, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.15s ease'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'none'}
          >
            <span style={{ fontSize: '1.25rem' }}>🥫</span>
            <span>{t('homeRelax.btnPantry', { defaultValue: 'Pantry' })}</span>
            <span style={{ fontSize: '0.65rem', color: '#78350f', fontWeight: 'bold' }}>
              {player.inventory?.freshFoodUnits || 0} units
            </span>
          </button>
        </div>
      )}

      {/* DURABLE CARD INSPECTION MODAL */}
      {inspectedDurable && (
        <DurableCardModal
          durable={inspectedDurable}
          campaign={campaign}
          onClose={() => setInspectedDurable(null)}
        />
      )}
    </div>
  );
};
