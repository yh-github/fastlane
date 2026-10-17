import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { PlayerState, GameRules } from '../../../engine/gameState';
import type { CampaignBundle, JobDef } from '../../../engine/dataLoader';
import { calcWorkShiftSummary, getWorkShiftModifiers, type WorkShiftOption, type WorkMode } from '../../../engine/jobEngine';
import { formatHours } from '../../../engine/statMath';
import { WorkCardHelpModal } from './WorkCardHelpModal';
import { ActionReasonModal } from '../ActionReasonModal';

export interface WorkConsolePopupProps {
  player: PlayerState;
  job: JobDef;
  campaign?: CampaignBundle;
  rules?: GameRules;
  onAction: (action: any) => void;
  onClose?: () => void;
  modalRef?: React.RefObject<HTMLDivElement | null>;
  selectedMode?: WorkMode;
  onSelectMode?: (mode: WorkMode) => void;
}

export const WorkConsolePopup: React.FC<WorkConsolePopupProps> = ({
  player,
  job,
  campaign,
  rules,
  onAction,
  onClose,
  modalRef,
  selectedMode: selectedModeProp,
  onSelectMode
}) => {
  const { t } = useTranslation();
  const popupRef = useRef<HTMLDivElement>(null);

  const getInitialMode = (): WorkMode => {
    if (selectedModeProp) return selectedModeProp;
    try {
      const saved = sessionStorage.getItem('fastlane_selected_work_mode');
      if (saved && ['work_work', 'look_busy', 'face_time', 'show_initiative', 'innovate'].includes(saved)) {
        return saved as WorkMode;
      }
    } catch {
      // ignore
    }
    return 'work_work';
  };

  const [internalMode, setInternalMode] = useState<WorkMode>(getInitialMode);
  const selectedMode = selectedModeProp ?? internalMode;

  const handleSelectMode = (mode: WorkMode) => {
    setInternalMode(mode);
    try {
      sessionStorage.setItem('fastlane_selected_work_mode', mode);
    } catch {
      // ignore
    }
    onSelectMode?.(mode);
  };

  const [activeHelpMode, setActiveHelpMode] = useState<WorkMode | null>(null);
  const [disabledReason, setDisabledReason] = useState<{ title: string; reason: string } | null>(null);

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [modalWidth, setModalWidth] = useState<number | null>(null);

  // Monitor location window width to ensure console does not exceed it
  useEffect(() => {
    if (!modalRef?.current || typeof window === 'undefined') return;
    const updateModalW = () => {
      if (modalRef.current) {
        setModalWidth(modalRef.current.getBoundingClientRect().width);
      }
    };
    updateModalW();
    window.addEventListener('resize', updateModalW);
    return () => window.removeEventListener('resize', updateModalW);
  }, [modalRef]);

  const effectiveRules = rules || campaign?.config?.gameRules;
  const statRules = campaign?.config?.statRules;
  const shiftCost = campaign?.config?.timeRules?.workSessionCost ?? 6;

  const summary = calcWorkShiftSummary(player, job, shiftCost, effectiveRules, statRules, campaign?.education, campaign);
  const { hoursToWork, modes, turnMistakes, locationMistakes } = summary;

  // Ensure selectedMode is valid among modes; default to work_work
  useEffect(() => {
    if (!modes.some(m => m.id === selectedMode)) {
      handleSelectMode('work_work');
    }
  }, [modes, selectedMode]);

  // HUD bounds detection helper for clamping (avoids top HUD and bottom clock)
  const getHudBounds = useCallback((): { minY: number; maxY: number; minX: number; maxX: number } => {
    let hudTopLimit = 8;
    let hudBottomLimit = typeof window !== 'undefined' ? window.innerHeight - 8 : 800;
    let hudLeftLimit = 8;
    let hudRightLimit = typeof window !== 'undefined' ? window.innerWidth - 8 : 1000;

    if (typeof document !== 'undefined') {
      const topHud = document.querySelector('.dashboard') as HTMLElement | null;
      const sideHud = document.querySelector('.side-hud') as HTMLElement | null;
      const bottomClock = document.querySelector('.bottom-center-clock, [data-testid="bottom-center-clock"]') as HTMLElement | null;

      if (topHud) {
        const rect = topHud.getBoundingClientRect();
        if (rect.bottom > 0 && rect.bottom < window.innerHeight / 2) {
          hudTopLimit = Math.max(hudTopLimit, Math.round(rect.bottom) + 6);
        }
      }

      if (bottomClock) {
        const clockRect = bottomClock.getBoundingClientRect();
        if (clockRect.top > 0) {
          hudBottomLimit = Math.min(hudBottomLimit, Math.round(clockRect.top) - 8);
        }
      }

      if (sideHud) {
        const rect = sideHud.getBoundingClientRect();
        if (rect.right > 0 && rect.left < 50) {
          hudLeftLimit = Math.max(hudLeftLimit, Math.round(rect.right) + 6);
        } else if (rect.left > 0 && rect.right >= (window.innerWidth - 50)) {
          hudRightLimit = Math.min(hudRightLimit, Math.round(rect.left) - 6);
        }
      }
    }

    return {
      minY: hudTopLimit,
      maxY: hudBottomLimit,
      minX: hudLeftLimit,
      maxX: hudRightLimit
    };
  }, []);

  const maxLocationWidth = modalWidth ?? (modalRef?.current ? modalRef.current.getBoundingClientRect().width : null);
  const targetWidth = maxLocationWidth ? Math.min(340, Math.max(260, Math.round(maxLocationWidth - 12))) : 340;

  // Initialize position on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const popupW = 340;
    const popupH = 150;
    const bounds = getHudBounds();

    let initialX: number | null = null;
    let initialY: number | null = null;

    try {
      const saved = sessionStorage.getItem('fastlane_work_popup_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          initialX = Math.max(bounds.minX, Math.min(bounds.maxX - popupW, parsed.x));
          initialY = Math.max(bounds.minY, Math.min(bounds.maxY - popupH, parsed.y));
        }
      }
    } catch {
      // ignore
    }

    if (initialX === null || initialY === null) {
      // Default: front and center, respecting HUD and bottom clock boundaries
      const availableWidth = bounds.maxX - bounds.minX;
      const availableHeight = bounds.maxY - bounds.minY;
      initialX = Math.max(bounds.minX, bounds.minX + Math.round((availableWidth - popupW) / 2));
      initialY = Math.max(bounds.minY, bounds.minY + Math.round((availableHeight - popupH) / 2));
    }

    setPosition({ x: initialX, y: initialY });
  }, [getHudBounds]);

  // Dragging handler using Pointer Events
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, [data-no-drag]')) {
      return;
    }
    if (!popupRef.current) return;
    e.preventDefault();
    setIsDragging(true);

    const startPointerX = e.clientX;
    const startPointerY = e.clientY;
    const currentX = position?.x ?? 50;
    const currentY = position?.y ?? 50;
    const popupRect = popupRef.current.getBoundingClientRect();
    const bounds = getHudBounds();

    const onPointerMove = (moveEvt: PointerEvent) => {
      const deltaX = moveEvt.clientX - startPointerX;
      const deltaY = moveEvt.clientY - startPointerY;

      const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX - popupRect.width, currentX + deltaX));
      const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY - popupRect.height, currentY + deltaY));

      setPosition({ x: Math.round(clampedX), y: Math.round(clampedY) });
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      // Persist dragged position
      if (popupRef.current) {
        const finalRect = popupRef.current.getBoundingClientRect();
        try {
          sessionStorage.setItem('fastlane_work_popup_pos', JSON.stringify({
            x: Math.round(finalRect.left),
            y: Math.round(finalRect.top)
          }));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Card meta configuration
  const cardMeta: Record<string, {
    actionName: string;
    shortName: string;
    icon: string;
    themeColor: string;
    glowColor: string;
  }> = {
    work_work: {
      actionName: t('workStation.actionWorkWork', { defaultValue: 'Work Shift' }),
      shortName: t('workStation.shortWorkWork', { defaultValue: 'Work' }),
      icon: '💼',
      themeColor: '#10b981',
      glowColor: 'rgba(16, 185, 129, 0.35)'
    },
    look_busy: {
      actionName: t('workStation.actionLookBusy', { defaultValue: 'Coast' }),
      shortName: t('workStation.shortLookBusy', { defaultValue: 'Coast' }),
      icon: '👀',
      themeColor: '#f59e0b',
      glowColor: 'rgba(245, 158, 11, 0.35)'
    },
    face_time: {
      actionName: t('workStation.actionFaceTime', { defaultValue: 'Network' }),
      shortName: t('workStation.shortFaceTime', { defaultValue: 'Network' }),
      icon: '🤝',
      themeColor: '#0ea5e9',
      glowColor: 'rgba(14, 165, 233, 0.35)'
    },
    show_initiative: {
      actionName: t('workStation.actionShowInitiative', { defaultValue: 'Initiative' }),
      shortName: t('workStation.shortShowInitiative', { defaultValue: 'Initiative' }),
      icon: '🌟',
      themeColor: '#a855f7',
      glowColor: 'rgba(168, 85, 247, 0.35)'
    },
    innovate: {
      actionName: t('workStation.actionShowInitiative', { defaultValue: 'Initiative' }),
      shortName: t('workStation.shortShowInitiative', { defaultValue: 'Initiative' }),
      icon: '🌟',
      themeColor: '#a855f7',
      glowColor: 'rgba(168, 85, 247, 0.35)'
    }
  };

  // Uniform check
  const uniformReq = job.requirements?.uniform || 'casual';
  const hasCasual = (player.inventory?.casualClothesWeeks ?? 0) > 0;
  const hasDress = (player.inventory?.dressClothesWeeks ?? 0) > 0;
  const hasBusiness = (player.inventory?.businessClothesWeeks ?? 0) > 0;
  let activeClothes = player.inventory?.selectedClothes as string | undefined;
  if (activeClothes === 'business' && !hasBusiness) activeClothes = hasDress ? 'dress' : (hasCasual ? 'casual' : 'none');
  if (activeClothes === 'dress' && !hasDress) activeClothes = hasBusiness ? 'business' : (hasCasual ? 'casual' : 'none');
  if (activeClothes === 'casual' && !hasCasual) activeClothes = hasDress ? 'dress' : (hasBusiness ? 'business' : 'none');
  const clothesScore = activeClothes === 'business' ? 3 : (activeClothes === 'dress' ? 2 : (activeClothes === 'casual' ? 1 : 0));
  const reqScore = uniformReq === 'business' ? 3 : (uniformReq === 'dress' ? 2 : (uniformReq === 'casual' ? 1 : 0));
  const hasProperUniform = reqScore === 0 || clothesScore >= reqScore;
  const uniformName = uniformReq === 'business' ? 'Business' : (uniformReq === 'dress' ? 'Dress' : 'Casual');

  // Condition calculations
  const curPhys = player.physicalCondition ?? 50;
  const curMental = player.mentalCondition ?? 50;
  const hasEnoughTime = player.hoursRemaining > 0;

  // Selected mode option
  const activeModeOption = modes.find(m => m.id === selectedMode) || modes[0];
  const activeMeta = cardMeta[activeModeOption?.id || 'work_work'] || cardMeta.work_work;

  const isActivePhysOk = curPhys - (activeModeOption?.physCost ?? 0) >= 1.0;
  const isActiveMentalOk = curMental - (activeModeOption?.mentalCost ?? 0) >= 1.0;
  const canAffordActive = hasEnoughTime && isActivePhysOk && isActiveMentalOk && !activeModeOption?.disabled;

  // Rent debt garnishment for net wage
  const rentDebt = player.rentDebt ?? 0;
  const isGarnished = rentDebt > 0 && (activeModeOption?.wage ?? 0) > 0;
  const garnishedAmount = isGarnished ? Math.min(rentDebt, Math.floor((activeModeOption?.wage ?? 0) * 0.5)) : 0;
  const activeNetWage = (activeModeOption?.wage ?? 0) - garnishedAmount;

  // Active modifiers for selected mode ONLY
  const activeBadges = activeModeOption?.modifiers || getWorkShiftModifiers(player, job, activeModeOption, summary, {
    rules: effectiveRules,
    statRules,
    campaignEducation: campaign?.education,
    campaign
  });

  const roundPct = (val: number) => Math.round(Number((val * 100).toFixed(6)));

  const activeMistakeChance = activeModeOption?.totalMistakeChance ?? 0;
  const roundedMistakeChance = roundPct(activeMistakeChance);

  const breakdownTooltip = activeModeOption?.modifierBreakdown?.mistakeBreakdown
    ? (activeModeOption.modifierBreakdown.mistakeBreakdown
        .filter(b => b.isTriggered)
        .map(b => `${b.label}: ${(b.chance * 100).toFixed(1)}%`)
        .join(' | ') || `Mistake Risk: ${roundedMistakeChance}%`)
    : `Mistake Risk: ${roundedMistakeChance}%`;

  // Resolve disabled explanation
  const getDisabledReason = (m: WorkShiftOption) => {
    const reqExp = (job.requirements?.experience ?? 0) + 10;
    if (m.disabledReasonKey) {
      return t(m.disabledReasonKey, { reqExp, defaultValue: 'You need more experience before you can perform this action.' });
    }
    if (m.id === 'show_initiative' || m.id === 'innovate') {
      return t('workStation.initiativeNeedExp', {
        reqExp,
        defaultValue: `Requires at least ${reqExp} experience to show initiative (you have ${player.experience ?? 0}).`
      });
    }
    return t('workStation.modeDisabledReason', { defaultValue: 'This work mode is currently unavailable.' });
  };

  // Handle shift execution
  const handleExecuteShift = () => {
    if (!activeModeOption) return;

    if (activeModeOption.disabled) {
      setDisabledReason({
        title: activeModeOption.id === 'show_initiative' || activeModeOption.id === 'innovate'
          ? t('workStation.initiativeLockedTitle', { defaultValue: 'Show Initiative Unavailable' })
          : t('workStation.modeUnavailableTitle', { defaultValue: 'Action Unavailable' }),
        reason: getDisabledReason(activeModeOption)
      });
      return;
    }

    onAction({
      type: 'work',
      jobId: job.id,
      mode: activeModeOption.id
    });
  };

  const popupContent = (
    <>
      {activeHelpMode && (
        <WorkCardHelpModal
          mode={activeHelpMode}
          job={job}
          player={player}
          campaign={campaign}
          summary={summary}
          onClose={() => setActiveHelpMode(null)}
        />
      )}

      {disabledReason && (
        <ActionReasonModal
          title={disabledReason.title}
          reason={disabledReason.reason}
          onClose={() => setDisabledReason(null)}
        />
      )}

      <div
        ref={popupRef}
        className="work-console-popup"
        data-testid="work-console-popup"
        style={{
          position: 'fixed',
          left: position ? `${position.x}px` : '50%',
          top: position ? `${position.y}px` : '50%',
          transform: position ? 'none' : 'translate(-50%, -50%)',
          zIndex: 1050,
          width: `min(${targetWidth}px, calc(100vw - 16px))`,
          maxHeight: 'calc(100vh - 40px)',
          background: 'linear-gradient(165deg, rgba(15, 23, 42, 0.98) 0%, rgba(10, 15, 30, 0.99) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.45)',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.75), 0 0 12px rgba(56, 189, 248, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflow: 'hidden',
          pointerEvents: 'auto',
          userSelect: 'none'
        }}
      >
        {/* Draggable Header */}
        <div
          className="work-console-popup__header"
          onPointerDown={handlePointerDown}
          title={t('workStation.dragHelp', { defaultValue: 'Click and drag to move window aside' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px',
            background: 'linear-gradient(90deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
            borderBottom: '1px solid rgba(56, 189, 248, 0.25)',
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
            <span style={{ fontSize: '0.80rem', color: '#94a3b8', letterSpacing: '-1px' }}>⋮⋮</span>
            <span style={{ fontSize: '0.85rem' }}>💼</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
              <span style={{
                fontSize: '0.78rem',
                fontWeight: 'bold',
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {t(`job.${job.id}`, { defaultValue: job.title })}
              </span>
              <span style={{
                fontSize: '0.66rem',
                color: '#94a3b8',
                whiteSpace: 'nowrap'
              }}>
                Shift #{summary.actionCount}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 'bold',
              color: 'var(--accent-cyan, #00e5ff)',
              background: 'rgba(0, 229, 255, 0.12)',
              padding: '1px 4px',
              borderRadius: '3px',
              border: '1px solid rgba(0, 229, 255, 0.3)'
            }}>
              ${player.currentWage || job.baseWage}/hr
            </span>
            {onClose && (
              <button
                data-testid="btn-close-work-wings"
                aria-label="Close Work Console"
                onClick={onClose}
                data-no-drag
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '3px',
                  color: '#94a3b8',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  padding: '1px 4px',
                  fontWeight: 'bold',
                  lineHeight: '1'
                }}
                title="Minimize Work Console"
              >
                <span data-testid="btn-close-work-console">✕</span>
              </button>
            )}
          </div>
        </div>

        {/* Minimalistic Mode Selection Bar (Compact 4-column Grid) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '4px',
          padding: '4px 8px',
          flexShrink: 0
        }}>
          {modes.map((m: WorkShiftOption) => {
            const isSelected = selectedMode === m.id;
            const meta = cardMeta[m.id] || cardMeta.work_work;

            // Garnishment calculation for display
            const isOptionGarnished = rentDebt > 0 && m.wage > 0;
            const optionGarnishedAmt = isOptionGarnished ? Math.min(rentDebt, Math.floor(m.wage * 0.5)) : 0;
            const optionNetWage = m.wage - optionGarnishedAmt;
            const wageText = m.wage > 0 ? `+$${optionNetWage}` : '$0';

            const handleRowClick = () => {
              if (m.disabled) {
                setDisabledReason({
                  title: m.id === 'show_initiative' || m.id === 'innovate'
                    ? t('workStation.initiativeLockedTitle', { defaultValue: 'Show Initiative Unavailable' })
                    : t('workStation.modeUnavailableTitle', { defaultValue: 'Action Unavailable' }),
                  reason: getDisabledReason(m)
                });
                return;
              }
              handleSelectMode(m.id);
            };

            return (
              <div
                key={m.id}
                onClick={handleRowClick}
                data-testid={`work-mode-option-${m.id}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '32px',
                  maxHeight: '32px',
                  minHeight: '32px',
                  padding: '2px 4px',
                  borderRadius: '5px',
                  boxSizing: 'border-box',
                  background: isSelected
                    ? 'rgba(16, 185, 129, 0.16)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected
                    ? `1.5px solid ${meta.themeColor}`
                    : '1px solid rgba(255, 255, 255, 0.10)',
                  boxShadow: isSelected
                    ? `0 0 6px ${meta.glowColor}`
                    : 'none',
                  cursor: m.disabled ? 'not-allowed' : 'pointer',
                  opacity: m.disabled ? 0.6 : 1,
                  position: 'relative',
                  userSelect: 'none',
                  transition: 'background 0.12s ease, border-color 0.12s ease'
                }}
              >
                {/* Radio input (hidden but accessible for tests & accessibility) */}
                <input
                  type="radio"
                  name="work_mode_selection"
                  id={`radio-work-${m.id}`}
                  value={m.id}
                  checked={isSelected}
                  onChange={() => !m.disabled && handleSelectMode(m.id)}
                  disabled={m.disabled}
                  data-testid={`radio-work-mode-${m.id}`}
                  style={{
                    position: 'absolute',
                    opacity: 0.01,
                    width: '1px',
                    height: '1px',
                    pointerEvents: 'none',
                    margin: 0
                  }}
                />

                {/* Top/Center: Icon + Mode short name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', pointerEvents: 'none' }}>
                  <span style={{ fontSize: '0.80rem', flexShrink: 0 }}>{m.disabled ? '🔒' : meta.icon}</span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: isSelected ? 'bold' : 'normal',
                    color: isSelected ? '#fff' : '#cbd5e1',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {meta.shortName}
                  </span>
                </div>

                {/* Bottom: Net wage */}
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 'bold',
                  color: isSelected ? meta.themeColor : (m.wage > 0 ? '#34d399' : '#94a3b8'),
                  lineHeight: '1',
                  pointerEvents: 'none'
                }}>
                  {wageText}
                </span>

                {/* Help button in top-right */}
                <button
                  type="button"
                  data-testid={`help-btn-${m.id}`}
                  data-no-drag
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveHelpMode(m.id);
                  }}
                  title={t('workStation.helpTooltip', { defaultValue: 'View strategy, lore & mechanics' })}
                  style={{
                    position: 'absolute',
                    top: '1px',
                    right: '2px',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.58rem',
                    cursor: 'pointer',
                    padding: '0 1px',
                    lineHeight: '1',
                    zIndex: 2
                  }}
                >
                  ℹ️
                </button>
              </div>
            );
          })}
        </div>

        {/* Selected Mode Modifiers & Outlook Panel (Active selection ONLY) */}
        <div
          data-testid="selected-mode-modifiers-panel"
          style={{
            margin: '2px 8px',
            padding: '3px 6px',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '5px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            flexShrink: 0
          }}
        >
          {/* Row 1: Cost & Mistake Risk */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.66rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {summary.tier === 'grind' && (
                <span style={{
                  fontSize: '0.60rem',
                  fontWeight: 'bold',
                  padding: '0 4px',
                  borderRadius: '3px',
                  background: 'rgba(245, 158, 11, 0.25)',
                  color: '#f59e0b',
                  border: '1px solid #f59e0b'
                }}>
                  ⚡ GRIND
                </span>
              )}
              {summary.tier === 'overtime' && (
                <span style={{
                  fontSize: '0.60rem',
                  fontWeight: 'bold',
                  padding: '0 4px',
                  borderRadius: '3px',
                  background: 'rgba(239, 68, 68, 0.25)',
                  color: '#ef4444',
                  border: '1px solid #ef4444'
                }}>
                  🔥 OVERTIME
                </span>
              )}
              <span style={{
                color: summary.tier === 'overtime' ? '#f87171' : (summary.tier === 'grind' ? '#fbbf24' : '#fca5a5'),
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}>
                {activeModeOption.mentalCost > 0
                  ? `-${activeModeOption.physCost} 💪, -${activeModeOption.mentalCost} 🧠`
                  : `-${activeModeOption.physCost} 💪`}
              </span>
            </div>

            {roundedMistakeChance > 0 && (
              <span
                data-testid="selected-mode-mistake-risk"
                title={breakdownTooltip}
                style={{
                  color: '#f87171',
                  fontWeight: 'bold',
                  fontSize: '0.62rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  padding: '0 4px',
                  borderRadius: '3px',
                  border: '1px solid #ef4444',
                  whiteSpace: 'nowrap'
                }}
              >
                ⚠️ {roundedMistakeChance}% Risk
              </span>
            )}
          </div>

          {/* Row 2: Active Modifier Badges */}
          <div
            data-testid="selected-mode-active-badges"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '3px',
              alignItems: 'center',
              minHeight: '18px'
            }}
          >
            {activeBadges.map(b => (
              <span
                key={b.key}
                data-testid={`modifier-badge-${b.key}`}
                style={{
                  fontSize: '0.60rem',
                  fontWeight: 'bold',
                  padding: '0 3px',
                  borderRadius: '3px',
                  backgroundColor: b.bg,
                  color: b.color,
                  border: `1px solid ${b.border}`,
                  whiteSpace: b.wrap ? 'normal' : 'nowrap',
                  lineHeight: '1.2'
                }}
              >
                {b.label}
              </span>
            ))}
          </div>

          {/* Row 3: Context / Job Demerits & Uniform Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.62rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            paddingTop: '2px',
            color: '#94a3b8'
          }}>
            <span style={{
              color: hasProperUniform ? '#94a3b8' : '#ef4444',
              fontWeight: 600
            }}>
              {hasProperUniform ? `👔 ${uniformName}` : `⚠️ Attire (${uniformName})`}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {turnMistakes > 0 && (
                <span style={{
                  fontSize: '0.58rem',
                  background: turnMistakes >= 2 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.2)',
                  color: '#fca5a5',
                  border: '1px solid #ef4444',
                  padding: '0 3px',
                  borderRadius: '2px',
                  fontWeight: 'bold'
                }}>
                  ⚠️ {turnMistakes}/3 Mistakes
                </span>
              )}
              {locationMistakes > 0 && (
                <span style={{
                  fontSize: '0.58rem',
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#fcd34d',
                  border: '1px solid #f59e0b',
                  padding: '0 3px',
                  borderRadius: '2px',
                  fontWeight: 'bold'
                }}>
                  ⚠️ {locationMistakes} Demerits
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer: Prominent WORK Action Button */}
        <div style={{
          padding: '4px 8px 6px 8px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          flexShrink: 0
        }}>
          <button
            type="button"
            data-testid={`work-mode-${selectedMode}`}
            data-action-target={`work-${job.id}`}
            onClick={handleExecuteShift}
            style={{
              width: '100%',
              height: '28px',
              padding: '0 8px',
              borderRadius: '5px',
              border: canAffordActive ? `1px solid ${activeMeta.themeColor}` : '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: canAffordActive ? activeMeta.themeColor : '#334155',
              color: canAffordActive ? '#000' : '#94a3b8',
              fontWeight: 'bold',
              fontSize: '0.78rem',
              cursor: 'pointer',
              boxShadow: canAffordActive ? `0 1px 8px ${activeMeta.glowColor}` : 'none',
              transition: 'all 0.12s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>{activeModeOption?.disabled ? '🔒' : activeMeta.icon}</span>
            <span>{activeMeta.actionName}</span>
            <span>{activeNetWage > 0 ? `(+$${activeNetWage})` : '($0)'}</span>
          </button>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '0.62rem',
            color: '#94a3b8'
          }}>
            <span>⏳ {formatHours(hoursToWork)}h Shift</span>
          </div>
        </div>
      </div>
    </>
  );

  return typeof document !== 'undefined'
    ? createPortal(popupContent, document.body)
    : popupContent;
};
