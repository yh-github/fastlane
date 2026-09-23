import { useState, useEffect, useRef, useCallback } from 'react';
import type { CampaignBundle } from '../engine/dataLoader';
import type { GameRules, PlayerState, PawnedItem, EconomySimulationState } from '../engine/gameState';
import { useTranslation } from 'react-i18next';
import { 
  JobBoard, 
  StoreFront, 
  UniversityRegistry, 
  WorkStation, 
  HomeRelax, 
  RentOffice, 
  BankInterface, 
  PawnShop 
} from './BuildingInteractions';
import { AppraisalDilemmaModal } from './buildings/work/AppraisalDilemmaModal';
import { SpeechBubble } from './SpeechBubble';
import { getClerkFace, getAvailableItemsForBuilding, computeClerkResponse } from './buildingModal';
import { calcEffectiveRobberyChance, formatHours } from '../engine/statMath';

interface BuildingModalProps {
  player: PlayerState | null;
  campaign: CampaignBundle | null;
  currentBuildingId: string | null;
  turn: number;
  economicIndex: number;
  rules: GameRules;
  pawnShopItemsForSale?: PawnedItem[];
  economySimulation?: EconomySimulationState;
  gameSeed?: number;
  onAction: (actionPayload: any) => Promise<any>;
  onClose: () => void;
}

export function BuildingModal({
  player,
  campaign,
  currentBuildingId,
  turn,
  economicIndex,
  rules,
  pawnShopItemsForSale,
  economySimulation,
  gameSeed,
  onAction,
  onClose
}: BuildingModalProps) {
  const { t } = useTranslation();
  const [clerkMessage, setClerkMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'shop' | 'pawn'>('shop');
  const [isWorkDeckOpen, setIsWorkDeckOpen] = useState(true);
  const justUpdatedMessageRef = useRef(false);

  // Movable and Resizable window state
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [customSize, setCustomSize] = useState<{ width: number; height: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [, setIsResizing] = useState(false);
  const [modalMargin, setModalMargin] = useState<number>(() => {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('fastlane_building_modal_margin') : null;
      if (saved !== null) return parseInt(saved, 10);
    } catch {
      // ignore
    }
    return 3;
  });
  const [measuredRect, setMeasuredRect] = useState<{ width: number; height: number; left: number; top: number }>({
    width: 728,
    height: 516,
    left: 236,
    top: 160
  });
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Clear any legacy dragged coords from sessionStorage so starting position is always correct
  useEffect(() => {
    try {
      sessionStorage.removeItem('fastlane_building_modal_pos');
      sessionStorage.removeItem('fastlane_building_modal_size');
    } catch {}
  }, []);

  const handleMarginChange = (delta: number) => {
    setPosition(null);
    setCustomSize(null);
    setModalMargin(prev => {
      const next = Math.max(-20, Math.min(50, prev + delta));
      try {
        localStorage.setItem('fastlane_building_modal_margin', next.toString());
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Measure rect on mount and resize
  useEffect(() => {
    if (!modalRef.current) return;
    const updateRect = () => {
      if (!modalRef.current) return;
      const rect = modalRef.current.getBoundingClientRect();
      const parent = modalRef.current.parentElement;
      const parentRect = parent ? parent.getBoundingClientRect() : { left: 0, top: 0 };
      setMeasuredRect({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        left: Math.round(rect.left - parentRect.left),
        top: Math.round(rect.top - parentRect.top)
      });
    };
    updateRect();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateRect);
      observer.observe(modalRef.current);
      window.addEventListener('resize', updateRect);
      return () => {
        observer.disconnect();
        window.removeEventListener('resize', updateRect);
      };
    }
  }, [position, customSize, modalMargin]);

  // Handle Dragging
  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, textarea, .speech-bubble, [data-no-drag]')) {
      return;
    }
    if (!modalRef.current) return;
    e.preventDefault();
    setIsDragging(true);

    const startPointerX = e.clientX;
    const startPointerY = e.clientY;
    const rect = modalRef.current.getBoundingClientRect();
    const parent = (modalRef.current.offsetParent as HTMLElement) || modalRef.current.parentElement;
    const parentRect = parent ? parent.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const startLeft = rect.left - parentRect.left;
    const startTop = rect.top - parentRect.top;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startPointerX;
      const deltaY = moveEvent.clientY - startPointerY;
      const maxLeft = parentRect.width - rect.width - 10;
      const maxTop = parentRect.height - rect.height - 10;
      const clampedX = Math.max(10, Math.min(maxLeft, startLeft + deltaX));
      const clampedY = Math.max(10, Math.min(maxTop, startTop + deltaY));
      setPosition({ x: Math.round(clampedX), y: Math.round(clampedY) });
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Handle Resizing
  const handleResizePointerDown = (e: React.PointerEvent) => {
    if (!modalRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startPointerX = e.clientX;
    const startPointerY = e.clientY;
    const rect = modalRef.current.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startPointerX;
      const deltaY = moveEvent.clientY - startPointerY;
      const newW = Math.max(420, Math.min(window.innerWidth - 20, startWidth + deltaX));
      const newH = Math.max(360, Math.min(window.innerHeight - 20, startHeight + deltaY));
      setCustomSize({ width: Math.round(newW), height: Math.round(newH) });
    };

    const onPointerUp = () => {
      setIsResizing(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleResetLayout = () => {
    setPosition(null);
    setCustomSize(null);
    setModalMargin(3);
    try {
      sessionStorage.removeItem('fastlane_building_modal_pos');
      sessionStorage.removeItem('fastlane_building_modal_size');
      localStorage.setItem('fastlane_building_modal_margin', '3');
    } catch {}
  };

  const handleCopyLayoutSpec = () => {
    const spec = `width: ${measuredRect.width}px; height: ${measuredRect.height}px; left: ${measuredRect.left}px; top: ${measuredRect.top}px;`;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(spec).then(() => {
        setCopiedNotification(true);
        setTimeout(() => setCopiedNotification(false), 2000);
      }).catch(() => {});
    }
  };

  // Helper to pick random string if translation is an array
  const getRandomMessage = useCallback((key: string, defaultValue: string) => {
    const messages = t(key, { returnObjects: true, defaultValue });
    if (Array.isArray(messages)) {
      return messages[Math.floor(Math.random() * messages.length)];
    }
    return messages as unknown as string;
  }, [t]);

  const building = campaign?.buildings.find(b => b.id === currentBuildingId) || null;

  // Initialize greeting on entering building
  useEffect(() => {
    if (!building) return;
    const isWeek4 = turn % 4 === 0;
    const rentDue = player?.rentPaidUntilWeek !== undefined && player.rentPaidUntilWeek <= turn;
    const hasJobAtRentOffice = !!(player?.currentJobId && campaign?.jobs.some(j => j.id === player.currentJobId && j.locationId === 'apartment_complex'));
    const isRentOfficeOpen = isWeek4 || rentDue || !!player?.turnFlags?.rentPaidThisTurn || hasJobAtRentOffice;
    const shouldShow = building.archetype !== 'home' && (building.id !== 'apartment_complex' || isRentOfficeOpen);

    if (shouldShow) {
      let greetingKey = `clerkDialogs.${building.id}.greeting`;
      if (building.id === 'discount_and_pawn' || building.archetype === 'discount_and_pawn') {
        greetingKey = 'clerkDialogs.z_mart.greeting';
      }
      setClerkMessage(getRandomMessage(greetingKey, t('clerkDialogs.default.greeting')));
    } else {
      setClerkMessage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBuildingId]);

  // Handle global click to close speech bubble
  useEffect(() => {
    if (!clerkMessage) return;

    const handleGlobalClick = () => {
      if (justUpdatedMessageRef.current) {
        justUpdatedMessageRef.current = false;
        return;
      }
      setClerkMessage('');
    };

    // Tiny delay to prevent the click that triggered the speech bubble from instantly closing it
    const timeoutId = setTimeout(() => {
      window.addEventListener('click', handleGlobalClick);
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [clerkMessage]);

  // Reset tab on building change
  useEffect(() => {
    setActiveTab('shop');
    setIsWorkDeckOpen(true);
  }, [currentBuildingId]);

  if (!player || !campaign || !currentBuildingId || !building) return null;

  // Check if the player's current job is at this building
  const playerJobHere = player.currentJobId 
    ? campaign.jobs.find(j => j.id === player.currentJobId && j.locationId === currentBuildingId)
    : null;

  const isAdvancedWorkGUI = rules ? (rules.advancedWorkGUI ?? !!rules.usePhysicalMentalConditions) : false;

  const itemsHere = getAvailableItemsForBuilding(building, campaign, turn, player.id, gameSeed);

  const handleActionIntercept = async (payload: any) => {
    const actionLog = await onAction(payload);
    const nextMsg = computeClerkResponse(payload, actionLog, building, t, getRandomMessage);
    if (nextMsg) {
      setClerkMessage(nextMsg);
      justUpdatedMessageRef.current = true;
    }
    return actionLog;
  };

  const housing = campaign.housing.find(h => h.id === player.currentHousingId);
  const homeNode = campaign.map.nodes.find(n => n.id === housing?.homeNodeId);
  const livesHere = homeNode?.buildingId === building.id;

  const isWeek4 = turn % 4 === 0;
  const rentDue = player.rentPaidUntilWeek <= turn + 1;
  const isRentOfficeOpen = isWeek4 || rentDue || player.turnFlags.rentPaidThisTurn || !!playerJobHere;
  const isDiscountAndPawn = building.archetype === 'discount_and_pawn';
  const shouldShowSpeechBubble = building.archetype !== 'home' && (building.id !== 'apartment_complex' || isRentOfficeOpen);

  let currentFace = getClerkFace(building.id, building.archetype);
  if (building.archetype === 'home' && !livesHere) {
    currentFace = '🚫';
  } else if (building.id === 'apartment_complex' && !isRentOfficeOpen) {
    currentFace = '🚫';
  }

  const renderBuildingServices = () => (
    <>
      {/* Discount & Pawn Shop: Tabs for Shop and Pawn */}
      {isDiscountAndPawn && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            data-testid="tab-shop"
            onClick={() => setActiveTab('shop')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '6px',
              fontWeight: 'bold',
              background: activeTab === 'shop' ? 'var(--accent-cyan, #00e5ff)' : 'rgba(255,255,255,0.05)',
              color: activeTab === 'shop' ? '#000' : '#fff',
              border: activeTab === 'shop' ? '1px solid var(--accent-cyan, #00e5ff)' : '1px solid #444',
              cursor: 'pointer'
            }}
          >
            🛒 {t('buildingModal.tabShop', { defaultValue: 'Shop' })}
          </button>
          <button
            data-testid="tab-pawn"
            onClick={() => setActiveTab('pawn')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '6px',
              fontWeight: 'bold',
              background: activeTab === 'pawn' ? 'var(--accent-cyan, #00e5ff)' : 'rgba(255,255,255,0.05)',
              color: activeTab === 'pawn' ? '#000' : '#fff',
              border: activeTab === 'pawn' ? '1px solid var(--accent-cyan, #00e5ff)' : '1px solid #444',
              cursor: 'pointer'
            }}
          >
            ⚖️ {t('buildingModal.tabPawn', { defaultValue: 'Pawn' })}
          </button>
        </div>
      )}

      {/* Discount & Pawn Shop contents */}
      {isDiscountAndPawn && activeTab === 'shop' && (
        <StoreFront 
          player={player} 
          onAction={handleActionIntercept} 
          availableItems={itemsHere} 
          economicIndex={economicIndex}
          rules={rules}
          campaign={campaign}
        />
      )}
      {isDiscountAndPawn && activeTab === 'pawn' && (
        <PawnShop 
          player={player}
          onAction={handleActionIntercept}
          economicIndex={economicIndex}
          pawnShopItemsForSale={pawnShopItemsForSale}
          rules={rules}
          campaign={campaign}
        />
      )}

      {/* Other Services */}
      {!isDiscountAndPawn && (
        <>
          {building.archetype === 'employment' && (
            <JobBoard 
              player={player} 
              onAction={handleActionIntercept} 
              availableJobs={campaign.jobs} 
              buildings={campaign.buildings}
              economicIndex={economicIndex}
              campaign={campaign}
              rules={rules}
            />
          )}
          {itemsHere.length > 0 && building.archetype !== 'pawnshop' && (
            <StoreFront 
              player={player} 
              onAction={handleActionIntercept} 
              availableItems={itemsHere} 
              economicIndex={economicIndex}
              rules={rules}
              campaign={campaign}
            />
          )}
          {building.archetype === 'education' && (
            <UniversityRegistry 
              player={player} 
              onAction={handleActionIntercept} 
              availableDegrees={campaign.education} 
              rules={rules}
              campaign={campaign}
              economicIndex={economicIndex}
            />
          )}
          {building.archetype === 'housing' && (
            <RentOffice 
              player={player}
              campaign={campaign}
              turn={turn}
              economicIndex={economicIndex}
              rules={rules}
              onAction={handleActionIntercept}
            />
          )}
          {building.archetype === 'bank' && (
            <BankInterface 
              player={player}
              campaign={campaign}
              turn={turn}
              economicIndex={economicIndex}
              rules={rules}
              economySimulation={economySimulation}
              onAction={handleActionIntercept}
            />
          )}
          {building.archetype === 'pawnshop' && (
            <PawnShop 
              player={player}
              onAction={handleActionIntercept}
              economicIndex={economicIndex}
              pawnShopItemsForSale={pawnShopItemsForSale}
              rules={rules}
              campaign={campaign}
            />
          )}
          {building.archetype === 'home' && (
            livesHere ? (
              <HomeRelax 
                player={player}
                campaign={campaign}
                rules={rules}
                economicIndex={economicIndex}
                onAction={handleActionIntercept}
                turn={turn}
              />
            ) : (
              <div className="interaction-panel">
                <h3>{t(`building.${building.id}`, { defaultValue: building.name })}</h3>
                <p style={{ fontSize: '12px' }}>{t('buildingModal.dontLiveHere', "You don't live here.")}</p>
              </div>
            )
          )}
        </>
      )}
    </>
  );

  return (
    <div 
      ref={modalRef}
      className={`building-modal ${rules?.authenticCurvedPaths !== false ? 'building-modal--curved' : 'building-modal--schematic'}`}
      style={{
        '--modal-margin': `${modalMargin}px`,
        ...(position ? { left: `${position.x}px`, top: `${position.y}px` } : {}),
        ...(customSize ? { width: `${customSize.width}px`, height: `${customSize.height}px`, maxWidth: 'none', maxHeight: 'none' } : {})
      } as React.CSSProperties}
    >
      {/* Top Window Control Bar: Live coordinates readout, margin stepper and reset */}
      <div 
        className="building-modal__window-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          position: 'absolute',
          top: '12px',
          right: '48px',
          zIndex: 65,
          userSelect: 'none'
        }}
      >
        {/* Margin stepper control */}
        <div
          data-testid="modal-margin-stepper"
          style={{
            background: 'rgba(0, 0, 0, 0.55)',
            border: '1px solid rgba(0, 229, 255, 0.4)',
            borderRadius: '6px',
            color: '#a5f3fc',
            fontFamily: 'monospace',
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '2px 5px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
          }}
        >
          <span>{t('buildingModal.marginLabel', { defaultValue: 'Margin' })}:</span>
          <button
            type="button"
            data-testid="btn-margin-minus"
            onClick={() => handleMarginChange(-1)}
            title="Decrease margin"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#fff',
              borderRadius: '3px',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold',
              padding: 0
            }}
          >
            -
          </button>
          <span data-testid="margin-value-display" style={{ minWidth: '22px', textAlign: 'center', color: '#38bdf8' }}>{modalMargin}px</span>
          <button
            type="button"
            data-testid="btn-margin-plus"
            onClick={() => handleMarginChange(1)}
            title="Increase margin"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#fff',
              borderRadius: '3px',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold',
              padding: 0
            }}
          >
            +
          </button>
        </div>

        <button
          data-testid="modal-dimension-readout"
          onClick={handleCopyLayoutSpec}
          title={t('buildingModal.copyCoordsTooltip', { defaultValue: 'Click to copy coordinates & dimensions to clipboard' })}
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(0, 229, 255, 0.4)',
            borderRadius: '6px',
            color: '#a5f3fc',
            fontFamily: 'monospace',
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '3px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
          }}
        >
          <span>📐</span>
          <span>{`W:${measuredRect.width}px H:${measuredRect.height}px | X:${measuredRect.left}px Y:${measuredRect.top}px`}</span>
          {copiedNotification && <span style={{ color: '#34d399', marginLeft: '4px' }}>✓ Copied!</span>}
        </button>

        {(position || customSize || modalMargin !== 3) && (
          <button
            data-testid="btn-reset-modal-layout"
            onClick={handleResetLayout}
            title={t('buildingModal.resetTooltip', { defaultValue: 'Reset window size and position to defaults' })}
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '6px',
              color: '#fca5a5',
              fontSize: '10px',
              fontWeight: 'bold',
              padding: '3px 8px',
              cursor: 'pointer'
            }}
          >
            ↺ Reset
          </button>
        )}
      </div>

      {!player?.pendingAppraisalDilemma && (
        <button className="building-modal__close" onClick={onClose}>&times;</button>
      )}
      
      <div 
        className="building-modal__header"
        onPointerDown={handleHeaderPointerDown}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        title={t('buildingModal.dragTooltip', { defaultValue: 'Click and drag header to move location window' })}
      >
        <div className="building-modal__face" style={{ position: 'relative' }}>
          {currentFace}
          {clerkMessage && shouldShowSpeechBubble && <SpeechBubble message={clerkMessage} />}
        </div>
        <div className="building-modal__title-group">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <h2>{t(`building.${building.id}`, { defaultValue: building.name })}</h2>
            {rules?.helpfulUI && building.archetype === 'home' && livesHere && (() => {
              const robberyRate = (calcEffectiveRobberyChance(player, rules, turn, campaign) * 100).toFixed(1);
              const willyStartWeek = campaign?.config?.eventRules?.willyRobberyStartWeek ?? 4;
              const isInactive = turn < willyStartWeek;
              const isProtectedHousing = player.currentHousingId === 'security' || player.currentHousingId === 'security_apartments' || player.currentHousingId === 'penthouse';
              
              let homeTimeStr = '';
              if (rules?.useHomeTimeRobbery) {
                const history = [...(player.homeTimeHistory || []), player.homeTimeThisTurn || 0];
                const meanHome = history.length > 0 ? (history.reduce((a, b) => a + b, 0) / history.length) : 0;
                homeTimeStr = `${Math.round(meanHome)}h/wk · `;
              }

              return (
                <span 
                  data-testid="home-burglary-badge"
                  style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    background: 'rgba(0, 229, 255, 0.1)',
                    border: '1px solid var(--accent-cyan, #00e5ff)',
                    color: 'var(--accent-cyan, #00e5ff)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginInlineEnd: '48px',
                    marginTop: '10px'
                  }}
                  title={isProtectedHousing ? t('buildingModal.protectedTooltip', { defaultValue: 'Protected by Security Housing' }) : (isInactive ? t('buildingModal.inactiveTooltip', { week: willyStartWeek, defaultValue: `Inactive until Week ${willyStartWeek}` }) : undefined)}
                >
                  🏠 {homeTimeStr}{t('buildingModal.breakInRisk', { defaultValue: 'Break-in Risk' })}: {robberyRate}%{isProtectedHousing ? ` (${t('buildingModal.protected', { defaultValue: 'Protected' })})` : (isInactive ? ` (${t('buildingModal.inactive', { defaultValue: 'Inactive' })})` : '')}
                </span>
              );
            })()}
          </div>
          <p>{t(`buildingDesc.${building.id}`, { defaultValue: building.description })}</p>
        </div>
      </div>

      <div 
        className="building-modal__content" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: 0,
          paddingBottom: (playerJobHere && !isAdvancedWorkGUI) ? '20px' : '0'
        }}
      >
        {/* Full-width shop / services content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {renderBuildingServices()}
        </div>

        {/* Docked bottom WORK button when employed here (Advanced GUI) */}
        {playerJobHere && isAdvancedWorkGUI && (
          <div 
            className="building-modal__work-dock"
            data-testid="tab-work"
            style={{
              marginTop: 'auto',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexShrink: 0
            }}
          >
            <button
              data-testid="btn-toggle-work"
              data-action-target={`work-${playerJobHere.id}`}
              onClick={() => setIsWorkDeckOpen(!isWorkDeckOpen)}
              style={{
                width: '100%',
                maxWidth: '520px',
                padding: '9px 16px',
                background: isWorkDeckOpen
                  ? 'linear-gradient(145deg, #0284c7 0%, #0369a1 100%)'
                  : 'linear-gradient(145deg, #059669 0%, #047857 100%)',
                color: '#fff',
                border: isWorkDeckOpen ? '2px solid #38bdf8' : '2px solid #34d399',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '0.92rem',
                cursor: 'pointer',
                boxShadow: isWorkDeckOpen
                  ? '0 0 14px rgba(56, 189, 248, 0.4), 0 3px 10px rgba(0,0,0,0.5)'
                  : '0 0 14px rgba(52, 211, 153, 0.4), 0 3px 10px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>💼</span>
              <span>
                {isWorkDeckOpen
                  ? t('workStation.hideWorkDeck', { defaultValue: 'Hide Work Console' })
                  : t('workStation.showWorkDeck', {
                      defaultValue: `Work Shift (${playerJobHere.title} — $${player.currentWage || playerJobHere.baseWage}/hr)`
                    })}
              </span>
              <span style={{
                fontSize: '0.75rem',
                background: 'rgba(0,0,0,0.35)',
                padding: '2px 6px',
                borderRadius: '4px',
                color: '#cbd5e1'
              }}>
                ⏳ {formatHours(player.hoursRemaining)}h
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Flanking Radial Work Cards (Steals screen space from surrounding board, 0% obstruction of store!) - Advanced GUI */}
      {playerJobHere && isAdvancedWorkGUI && isWorkDeckOpen && (
        <WorkStation
          player={player}
          onAction={handleActionIntercept}
          job={playerJobHere}
          campaign={campaign}
          rules={rules}
          layoutMode="flanking"
          onClose={() => setIsWorkDeckOpen(false)}
        />
      )}

      {/* Non-scrollable WORK button on bottom border for Basic mode */}
      {playerJobHere && !isAdvancedWorkGUI && (() => {
        const shiftCost = campaign?.config?.timeRules?.workSessionCost ?? 6;
        const isWorkDisabled = rules?.allowPartialHours ? player.hoursRemaining <= 0 : player.hoursRemaining < shiftCost;
        const actualHoursWorked = rules?.allowPartialHours && player.hoursRemaining < shiftCost ? player.hoursRemaining : shiftCost;
        const wageEarned = Math.floor((player.currentWage || playerJobHere.baseWage) * actualHoursWorked);

        return (
          <div 
            className="building-work-bottom-dock"
            data-testid="dock-work-basic"
            style={{
              position: 'absolute',
              bottom: '0px',
              left: '50%',
              transform: 'translate(-50%, 50%)',
              zIndex: 60,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'auto'
            }}
          >
            <button
              data-action-target={`work-${playerJobHere.id}`}
              data-testid="btn-work"
              onClick={() => handleActionIntercept({ type: 'work', jobId: playerJobHere.id })}
              disabled={isWorkDisabled}
              title={rules?.helpfulUI 
                ? `Work (${formatHours(shiftCost)}h, +$${wageEarned})` 
                : undefined}
              style={{
                background: isWorkDisabled ? '#333' : 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)',
                color: isWorkDisabled ? '#777' : '#fff',
                border: isWorkDisabled ? '2px solid #555' : '2px solid #38bdf8',
                boxShadow: isWorkDisabled ? 'none' : '0 4px 10px rgba(0,0,0,0.8), 0 0 10px rgba(56,189,248,0.5)',
                padding: '4px 18px',
                borderRadius: '4px',
                fontWeight: 'bold',
                fontSize: '0.92rem',
                letterSpacing: '1px',
                cursor: isWorkDisabled ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                minWidth: 'auto',
                whiteSpace: 'nowrap'
              }}
            >
              {t('workStation.workBtnText', { defaultValue: 'WORK' })}
            </button>
          </div>
        );
      })()}

      {player?.pendingAppraisalDilemma && (
        <AppraisalDilemmaModal
          dilemma={player.pendingAppraisalDilemma}
          onSelectOption={(idx) => handleActionIntercept({ type: 'resolve_appraisal_dilemma', choiceIndex: idx })}
        />
      )}

      {/* Corner Resize Handle */}
      <div 
        className="building-modal__resize-handle"
        data-testid="building-modal-resize-handle"
        onPointerDown={handleResizePointerDown}
        title={t('buildingModal.resizeTooltip', { defaultValue: 'Drag corner to resize window' })}
      />
    </div>
  );
}
