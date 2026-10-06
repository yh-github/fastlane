import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { CampaignBundle } from '../../../engine/dataLoader';
import type { PlayerState, GameRules, OwnedAppliance } from '../../../engine/gameState';
import { DurableCardModal } from './DurableCardModal';
import { ApartmentFurnishings } from './ApartmentFurnishings';
import { CuriosFlankingWings } from './CuriosFlankingWings';
import { HomeFlankingWings } from './HomeFlankingWings';
import { MessIcon } from '../../icons/MessIcon';

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

  // Maintenance & Actions
  economicIndex?: number;
  turn?: number;
  onAction?: (action: any) => void;
}

export const HomeApartmentView: React.FC<HomeApartmentViewProps> = ({
  player,
  campaign,
  rules,
  economicIndex = 0,
  turn = 1,
  onAction,
  housingName,
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
  const [activeWing, setActiveWing] = useState<'leisure' | 'chores' | null>(null);
  const [isCuriosWingsOpen, setIsCuriosWingsOpen] = useState(false);
  const [inspectedDurable, setInspectedDurable] = useState<{
    id: string;
    isBook?: boolean;
    applianceData?: OwnedAppliance;
    isOwned?: boolean;
  } | null>(null);
  const [showMessDetails, setShowMessDetails] = useState(false);

  // Esc key closes internal sub-popups first
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMessDetails) {
          e.stopImmediatePropagation();
          setShowMessDetails(false);
          return;
        }
        if (inspectedDurable) {
          e.stopImmediatePropagation();
          setInspectedDurable(null);
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [showMessDetails, inspectedDurable]);

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

  return (
    <div 
      ref={panelRef}
      className="home-apartment-panel" 
      style={{ 
        width: '100%', 
        height: '100%',
        flex: '1 1 auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        position: 'relative',
        paddingBottom: 0
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
        <div 
          className="mess-visual-card" 
          data-testid="compact-mess-bar"
          onClick={() => setShowMessDetails(true)}
          style={{ 
            marginBottom: '8px', 
            padding: '4px 8px', 
            background: 'linear-gradient(135deg, rgba(20,20,35,0.95) 0%, rgba(35,35,55,0.95) 100%)', 
            borderRadius: '8px',
            border: isOvercapacity ? '1px solid #e74c3c' : `1px solid ${messBarColor}`,
            boxShadow: isOvercapacity ? '0 0 10px rgba(231,76,60,0.4)' : `0 0 8px ${messBarColor}22`,
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 20,
            cursor: 'pointer'
          }}
          title={t('homeRelax.messClickDetails', { defaultValue: 'Click to view apartment space and mess breakdown' })}
        >
          {rules?.spaceCapping ? (
            <div 
              style={{ 
                width: '100%', 
                height: '22px', 
                backgroundColor: 'rgba(255,255,255,0.08)', 
                borderRadius: '6px', 
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 8px'
              }}
            >
              {/* Durables progress background */}
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${durablesPct}%`,
                backgroundColor: 'rgba(0, 229, 255, 0.45)',
                transition: 'width 0.3s ease',
                zIndex: 1
              }} />

              {/* Mess progress background */}
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

              {/* Text overlays directly on the bar */}
              <span style={{ position: 'relative', zIndex: 5, fontWeight: 'bold', fontSize: '0.78rem', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                🛋️ {durablesSpace} space
              </span>
              <span style={{ position: 'relative', zIndex: 5, fontWeight: 'bold', fontSize: '0.78rem', textAlign: 'center', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                {isOvercapacity ? (
                  <span style={{ color: '#fff', background: '#e74c3c', padding: '1px 5px', borderRadius: '3px' }}>
                    ⚠️ +{overflow}
                  </span>
                ) : freeSpace === 0 ? (
                  <span style={{ color: '#f39c12' }}>FULL</span>
                ) : (
                  <span style={{ color: '#2ecc71' }}>{freeSpace} free</span>
                )}
              </span>
              <span style={{ position: 'relative', zIndex: 5, fontWeight: 'bold', fontSize: '0.78rem', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.9)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {messIcon && !messIcon.includes('🧹') && messIcon !== '📦' && messIcon !== '📦📦' && messIcon !== '🗑️' && (
                  <span>{messIcon} </span>
                )}
                <MessIcon size="1.15em" />
                <span>{currentMess} ({messLabel})</span>
              </span>
            </div>
          ) : (
            <div style={{ 
              width: '100%', 
              height: '20px', 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              borderRadius: '6px', 
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 8px'
            }}>
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${messPercentage}%`,
                backgroundColor: messBarColor,
                transition: 'width 0.5s ease-in-out, background-color 0.5s ease',
                zIndex: 1
              }} />
              <span style={{ position: 'relative', zIndex: 5, fontWeight: 'bold', fontSize: '0.78rem', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.9)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {messIcon && !messIcon.includes('🧹') && messIcon !== '📦' && messIcon !== '📦📦' && messIcon !== '🗑️' && (
                  <span>{messIcon} </span>
                )}
                <MessIcon size="1.15em" />
                <span>{currentMess}</span>
              </span>
              <span style={{ position: 'relative', zIndex: 5, fontWeight: 'bold', fontSize: '0.78rem', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                {messLabel}
              </span>
            </div>
          )}
        </div>
      )}

      {showMessDetails && (
        <div 
          data-testid="mess-details-popup"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 100,
            borderRadius: '12px',
            backdropFilter: 'blur(3px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMessDetails(false);
            }
          }}
        >
          <div
            style={{
              background: 'linear-gradient(145deg, #131b2e 0%, #1e293b 100%)',
              border: '2px solid #38bdf8',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.85), 0 0 24px rgba(56, 189, 248, 0.25)',
              borderRadius: '14px',
              padding: '20px 22px',
              maxWidth: '380px',
              width: '92%',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative'
            }}
          >
            <button
              type="button"
              onClick={() => setShowMessDetails(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '12px',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px 8px',
                lineHeight: 1
              }}
              aria-label={t('buildingModal.close', { defaultValue: 'Close' })}
            >
              ✕
            </button>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
              <MessIcon size={44} />
            </div>
            <h3 style={{ margin: '0 0 10px', color: 'var(--accent-cyan, #00e5ff)', fontSize: '1.2rem', fontWeight: 800 }}>
              {t('homeRelax.messDetailsTitle', { defaultValue: 'Apartment Space & Mess Breakdown' })}
            </h3>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              maxWidth: '340px',
              width: '100%',
              fontSize: '0.85rem',
              textAlign: 'start',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '4px' }}>
                <span style={{ color: '#94a3b8' }}>Apartment:</span>
                <span style={{ fontWeight: 'bold' }}>{housingName || player.currentHousingId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Capacity:</span>
                <span style={{ fontWeight: 'bold' }}>{spaceCap} space</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Total Used:</span>
                <span style={{ fontWeight: 'bold' }}>{totalUsedSpace} / {spaceCap}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#00e5ff' }}>Durables Space:</span>
                <span style={{ fontWeight: 'bold', color: '#00e5ff' }}>{durablesSpace} space</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: messBarColor }}>Current Mess:</span>
                <span style={{ fontWeight: 'bold', color: messBarColor }}>{currentMess} space ({messLabel})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Free Space:</span>
                <span style={{ fontWeight: 'bold', color: isOvercapacity ? '#e74c3c' : '#2ecc71' }}>
                  {isOvercapacity ? `⚠️ Overcrowded (+${overflow})` : `${freeSpace} space`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Max Mess Allowed:</span>
                <span style={{ fontWeight: 'bold' }}>{maxMessHousing}</span>
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '0.78rem', fontStyle: 'italic', marginTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '4px' }}>
                Mess reduces your relaxation rate and penalizes social visits if it exceeds 25. Clean DIY or hire a cleaning service.
              </div>
            </div>
            <button
              type="button"
              className="action-panel__btn"
              data-testid="btn-close-mess-popup"
              onClick={() => setShowMessDetails(false)}
              style={{
                backgroundColor: 'var(--accent-cyan, #00e5ff)',
                color: '#000',
                padding: '6px 20px',
                fontWeight: 'bold',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {t('buildingModal.close', { defaultValue: 'Close' })}
            </button>
          </div>
        </div>
      )}



      {/* MIDDLE CONTENT: ALWAYS APARTMENT FURNISHINGS & BELONGINGS (UNOBSTRUCTED) */}
      <ApartmentFurnishings
        player={player}
        campaign={campaign}
        rules={rules}
        onInspectDurable={setInspectedDurable}
        onToggleCuriosWings={() => {
          setIsCuriosWingsOpen(!isCuriosWingsOpen);
          if (!isCuriosWingsOpen) setActiveWing(null);
        }}
        isCuriosWingsOpen={isCuriosWingsOpen}
      />

      {/* Flanking Curios Wings (when Curios shelf toggled) */}
      {isCuriosWingsOpen && ((player.inventory?.knickKnacks || 0) + (player.inventory?.uninspectedKnickKnacks || 0)) > 0 && (
        modalParent ? createPortal(
          <CuriosFlankingWings
            player={player}
            onAction={onAction}
            onClose={() => setIsCuriosWingsOpen(false)}
            turn={turn}
            rules={rules}
          />,
          modalParent
        ) : (
          <CuriosFlankingWings
            player={player}
            onAction={onAction}
            onClose={() => setIsCuriosWingsOpen(false)}
            turn={turn}
            rules={rules}
          />
        )
      )}

      {/* Flanking Home Action Wings: Leisure on Left, Chores & Pantry on Right */}
      {!isCuriosWingsOpen && activeWing && (
        modalParent ? createPortal(
          <HomeFlankingWings
            activeWing={activeWing}
            onCloseWing={() => setActiveWing(null)}
            player={player}
            rules={rules}
            campaign={campaign}
            hoursToRelax={hoursToRelax}
            isRelaxDisabled={isRelaxDisabled}
            hasFood={hasFood}
            physGain={physGain}
            mentalGain={mentalGain}
            scaledMess={scaledMess}
            classicGain={classicGain}
            classicFirstBonus={classicFirstBonus}
            onRelaxClick={onRelaxClick}
            socialParams={socialParams}
            onSocializeClick={onSocializeClick}
            hoursToClean={hoursToClean}
            cleanPhysGain={cleanPhysGain}
            isCleanDisabled={isCleanDisabled}
            cleanSubtext={cleanSubtext}
            onCleanClick={onCleanClick}
            cleaningServiceCost={cleaningServiceCost}
            cleaningServicePrice={cleaningServicePrice}
            isServiceDisabled={isServiceDisabled}
            serviceSubtext={serviceSubtext}
            onServiceClick={onServiceClick}
            hasFridge={hasFridge}
            hasFreezer={hasFreezer}
          />,
          modalParent
        ) : (
          <HomeFlankingWings
            activeWing={activeWing}
            onCloseWing={() => setActiveWing(null)}
            player={player}
            rules={rules}
            campaign={campaign}
            hoursToRelax={hoursToRelax}
            isRelaxDisabled={isRelaxDisabled}
            hasFood={hasFood}
            physGain={physGain}
            mentalGain={mentalGain}
            scaledMess={scaledMess}
            classicGain={classicGain}
            classicFirstBonus={classicFirstBonus}
            onRelaxClick={onRelaxClick}
            socialParams={socialParams}
            onSocializeClick={onSocializeClick}
            hoursToClean={hoursToClean}
            cleanPhysGain={cleanPhysGain}
            isCleanDisabled={isCleanDisabled}
            cleanSubtext={cleanSubtext}
            onCleanClick={onCleanClick}
            cleaningServiceCost={cleaningServiceCost}
            cleaningServicePrice={cleaningServicePrice}
            isServiceDisabled={isServiceDisabled}
            serviceSubtext={serviceSubtext}
            onServiceClick={onServiceClick}
            hasFridge={hasFridge}
            hasFreezer={hasFreezer}
          />
        )
      )}

      {/* Non-scrollable Leisure and Chores buttons portaled to bottom border of building-modal */}
      {(() => {
        const dockedActionsElement = (
          <div 
            className="home-docked-actions"
            data-testid="home-docked-actions"
            style={{
              position: 'absolute',
              bottom: modalParent ? '0px' : 'calc(-18px * var(--board-scale, 1))',
              left: '50%',
              transform: 'translate(-50%, 50%)',
              zIndex: 70,
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
              alignItems: 'center',
              pointerEvents: 'auto'
            }}
          >
            {/* Leisure Button */}
            <button
              type="button"
              data-testid="toggle-wing-leisure"
              onClick={() => setActiveWing(activeWing === 'leisure' ? null : 'leisure')}
              style={{
                padding: '5px 14px',
                borderRadius: '6px',
                border: activeWing === 'leisure' ? '2px solid #10b981' : '1.5px solid rgba(16, 185, 129, 0.5)',
                background: activeWing === 'leisure' 
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%)' 
                  : 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(6, 78, 59, 0.85) 100%)',
                color: activeWing === 'leisure' ? '#000' : '#6ee7b7',
                fontSize: '0.80rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: activeWing === 'leisure' 
                  ? '0 0 14px rgba(16, 185, 129, 0.8), 0 4px 10px rgba(0,0,0,0.7)' 
                  : '0 3px 8px rgba(0,0,0,0.6)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <span>🧘</span>
              <span>{t('homeRelax.btnLeisure', { defaultValue: 'Leisure' })}</span>
              <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>
                {activeWing === 'leisure' ? '◀' : '▶'}
              </span>
            </button>

            {/* Chores Button */}
            <button
              type="button"
              data-testid="toggle-wing-chores"
              onClick={() => setActiveWing(activeWing === 'chores' ? null : 'chores')}
              style={{
                padding: '5px 14px',
                borderRadius: '6px',
                border: activeWing === 'chores' ? '2px solid #818cf8' : '1.5px solid rgba(129, 140, 248, 0.5)',
                background: activeWing === 'chores' 
                  ? 'linear-gradient(135deg, rgba(129, 140, 248, 0.95) 0%, rgba(99, 102, 241, 0.95) 100%)' 
                  : 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.85) 100%)',
                color: activeWing === 'chores' ? '#000' : '#c7d2fe',
                fontSize: '0.80rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: activeWing === 'chores' 
                  ? '0 0 14px rgba(129, 140, 248, 0.8), 0 4px 10px rgba(0,0,0,0.7)' 
                  : '0 3px 8px rgba(0,0,0,0.6)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>
                {activeWing === 'chores' ? '▶' : '◀'}
              </span>
              <span>🧹</span>
              <span>{t('homeRelax.btnChores', { defaultValue: 'Chores' })}</span>
            </button>
          </div>
        );

        return modalParent ? createPortal(dockedActionsElement, modalParent) : dockedActionsElement;
      })()}

      {/* DURABLE CARD INSPECTION MODAL */}
      {inspectedDurable && (
        <DurableCardModal
          durable={inspectedDurable}
          player={player}
          campaign={campaign}
          rules={rules}
          economicIndex={economicIndex}
          onAction={onAction}
          onClose={() => setInspectedDurable(null)}
        />
      )}
    </div>
  );
};
