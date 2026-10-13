import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { PlayerState, GameRules } from '../../../engine/gameState';
import type { CampaignBundle, JobDef } from '../../../engine/dataLoader';
import { calcWorkShiftSummary, type WorkShiftOption, type WorkMode } from '../../../engine/jobEngine';
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
}

export const WorkConsolePopup: React.FC<WorkConsolePopupProps> = ({
  player,
  job,
  campaign,
  rules,
  onAction,
  onClose,
  modalRef: _modalRef
}) => {
  const { t } = useTranslation();
  const popupRef = useRef<HTMLDivElement>(null);

  const [selectedMode, setSelectedMode] = useState<WorkMode>('work_work');
  const [activeHelpMode, setActiveHelpMode] = useState<WorkMode | null>(null);
  const [disabledReason, setDisabledReason] = useState<{ title: string; reason: string } | null>(null);

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const effectiveRules = rules || campaign?.config?.gameRules;
  const statRules = campaign?.config?.statRules;
  const shiftCost = campaign?.config?.timeRules?.workSessionCost ?? 6;

  const summary = calcWorkShiftSummary(player, job, shiftCost, effectiveRules, statRules);
  const { hoursToWork, modes, turnMistakes, locationMistakes } = summary;

  // Ensure selectedMode is valid among modes; default to work_work
  useEffect(() => {
    if (!modes.some(m => m.id === selectedMode)) {
      setSelectedMode('work_work');
    }
  }, [modes, selectedMode]);

  // HUD bounds detection helper for clamping
  const getHudBounds = useCallback((): { minY: number; maxY: number; minX: number; maxX: number } => {
    let hudTopLimit = 8;
    let hudBottomLimit = typeof window !== 'undefined' ? window.innerHeight - 8 : 800;
    let hudLeftLimit = 8;
    let hudRightLimit = typeof window !== 'undefined' ? window.innerWidth - 8 : 1000;

    if (typeof document !== 'undefined') {
      const topHud = document.querySelector('.dashboard') as HTMLElement | null;
      const sideHud = document.querySelector('.side-hud') as HTMLElement | null;

      if (topHud) {
        const rect = topHud.getBoundingClientRect();
        if (rect.bottom > 0 && rect.bottom < window.innerHeight / 2) {
          hudTopLimit = Math.max(hudTopLimit, Math.round(rect.bottom) + 6);
        }
      }

      if (sideHud) {
        const rect = sideHud.getBoundingClientRect();
        if (rect.right > 0 && rect.left < 50) {
          // Left side HUD
          hudLeftLimit = Math.max(hudLeftLimit, Math.round(rect.right) + 6);
        } else if (rect.left > 0 && rect.right >= (window.innerWidth - 50)) {
          // Right side HUD
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

  // Initialize position on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const popupW = 410;
    const popupH = 430;
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
      // Default: front and center, respecting HUD boundaries
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
    icon: string;
    themeColor: string;
    glowColor: string;
  }> = {
    work_work: {
      actionName: t('workStation.actionWorkWork', { defaultValue: 'Work Shift' }),
      icon: '💼',
      themeColor: '#10b981',
      glowColor: 'rgba(16, 185, 129, 0.35)'
    },
    look_busy: {
      actionName: t('workStation.actionLookBusy', { defaultValue: 'Coast' }),
      icon: '👀',
      themeColor: '#f59e0b',
      glowColor: 'rgba(245, 158, 11, 0.35)'
    },
    face_time: {
      actionName: t('workStation.actionFaceTime', { defaultValue: 'Network' }),
      icon: '🤝',
      themeColor: '#0ea5e9',
      glowColor: 'rgba(14, 165, 233, 0.35)'
    },
    show_initiative: {
      actionName: t('workStation.actionShowInitiative', { defaultValue: 'Initiative' }),
      icon: '🌟',
      themeColor: '#a855f7',
      glowColor: 'rgba(168, 85, 247, 0.35)'
    },
    innovate: {
      actionName: t('workStation.actionShowInitiative', { defaultValue: 'Initiative' }),
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
          width: 'min(410px, calc(100vw - 20px))',
          maxHeight: 'calc(100vh - 40px)',
          background: 'linear-gradient(165deg, rgba(15, 23, 42, 0.98) 0%, rgba(10, 15, 30, 0.99) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.45)',
          borderRadius: '10px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.75), 0 0 16px rgba(56, 189, 248, 0.15)',
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
            padding: '8px 12px',
            background: 'linear-gradient(90deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
            borderBottom: '1px solid rgba(56, 189, 248, 0.25)',
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontSize: '0.90rem', color: '#94a3b8', letterSpacing: '-1px' }}>⋮⋮</span>
            <span style={{ fontSize: '1rem' }}>💼</span>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{
                fontSize: '0.85rem',
                fontWeight: 'bold',
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {t(`job.${job.id}`, { defaultValue: job.title })}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 'bold',
              color: 'var(--accent-cyan, #00e5ff)',
              background: 'rgba(0, 229, 255, 0.12)',
              padding: '2px 6px',
              borderRadius: '4px',
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
                  borderRadius: '4px',
                  color: '#94a3b8',
                  fontSize: '0.80rem',
                  cursor: 'pointer',
                  padding: '2px 6px',
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

        {/* Status & Shift Info Ribbon (Fixed Height) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          background: 'rgba(15, 23, 42, 0.7)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '0.72rem',
          flexWrap: 'wrap',
          gap: '6px',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 'bold', color: '#fff' }}>
              Shift #{summary.actionCount}
            </span>
            {summary.tier === 'grind' && (
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 'bold',
                padding: '1px 5px',
                borderRadius: '3px',
                background: 'rgba(245, 158, 11, 0.25)',
                color: '#f59e0b',
                border: '1px solid #f59e0b'
              }}>
                ⚡ GRIND (+1 Mistake Risk)
              </span>
            )}
            {summary.tier === 'overtime' && (
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 'bold',
                padding: '1px 5px',
                borderRadius: '3px',
                background: 'rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
                border: '1px solid #ef4444'
              }}>
                🔥 OVERTIME (-0.5 MAX 💪)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontSize: '0.65rem',
              color: hasProperUniform ? '#94a3b8' : '#ef4444',
              fontWeight: 600
            }}>
              {hasProperUniform ? `👔 ${uniformName}` : `⚠️ Attire (${uniformName})`}
            </span>
            {turnMistakes > 0 && (
              <span style={{
                fontSize: '0.62rem',
                background: turnMistakes >= 2 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.2)',
                color: '#fca5a5',
                border: '1px solid #ef4444',
                padding: '1px 4px',
                borderRadius: '3px',
                fontWeight: 'bold'
              }}>
                ⚠️ {turnMistakes}/3 Mistakes
              </span>
            )}
            {locationMistakes > 0 && (
              <span style={{
                fontSize: '0.62rem',
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#fcd34d',
                border: '1px solid #f59e0b',
                padding: '1px 4px',
                borderRadius: '3px',
                fontWeight: 'bold'
              }}>
                ⚠️ {locationMistakes} Demerits
              </span>
            )}
          </div>
        </div>

        {/* Radio Modes Group (Fixed Stable Rows) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          padding: '10px 12px',
          flexShrink: 0
        }}>
          {modes.map((m: WorkShiftOption) => {
            const isSelected = selectedMode === m.id;
            const meta = cardMeta[m.id] || cardMeta.work_work;

            const modePhysOk = curPhys - m.physCost >= 1.0;
            const modeMentalOk = curMental - m.mentalCost >= 1.0;
            const modeCanAfford = hasEnoughTime && modePhysOk && modeMentalOk && !m.disabled;

            // Garnishment calculation for display
            const isOptionGarnished = rentDebt > 0 && m.wage > 0;
            const optionGarnishedAmt = isOptionGarnished ? Math.min(rentDebt, Math.floor(m.wage * 0.5)) : 0;
            const optionNetWage = m.wage - optionGarnishedAmt;
            const wageText = m.wage > 0 ? `+$${optionNetWage}` : '$0';

            // Cost label
            const costLabel = m.mentalCost > 0
              ? `-${m.physCost} 💪, -${m.mentalCost} 🧠`
              : `-${m.physCost} 💪`;

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
              setSelectedMode(m.id);
            };

            return (
              <div
                key={m.id}
                onClick={handleRowClick}
                data-testid={`work-mode-option-${m.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: '52px',
                  maxHeight: '52px',
                  minHeight: '52px',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  background: isSelected
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected
                    ? `1.5px solid ${meta.themeColor}`
                    : '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: isSelected
                    ? `0 0 10px ${meta.glowColor}`
                    : 'none',
                  cursor: m.disabled ? 'not-allowed' : 'pointer',
                  opacity: m.disabled ? 0.6 : (modeCanAfford ? 1 : 0.8),
                  transition: 'background 0.12s ease, border-color 0.12s ease',
                  overflow: 'hidden'
                }}
              >
                {/* Left: Radio input + Icon + Name + Payout */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  <input
                    type="radio"
                    name="work_mode_selection"
                    id={`radio-work-${m.id}`}
                    value={m.id}
                    checked={isSelected}
                    onChange={() => !m.disabled && setSelectedMode(m.id)}
                    disabled={m.disabled}
                    data-testid={`radio-work-mode-${m.id}`}
                    style={{
                      cursor: m.disabled ? 'not-allowed' : 'pointer',
                      accentColor: meta.themeColor,
                      width: '16px',
                      height: '16px',
                      margin: 0,
                      flexShrink: 0
                    }}
                  />
                  <span style={{ fontSize: '1.05rem', flexShrink: 0 }}>{m.disabled ? '🔒' : meta.icon}</span>

                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '0.80rem',
                        fontWeight: 'bold',
                        color: isSelected ? '#fff' : '#e2e8f0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {meta.actionName}
                      </span>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 'bold',
                        color: m.wage > 0 ? '#34d399' : '#94a3b8',
                        whiteSpace: 'nowrap'
                      }}>
                        {wageText}
                      </span>
                    </div>

                    {/* Secondary stats row (Fixed single line) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.66rem',
                      color: '#94a3b8',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      <span>{costLabel}</span>
                      {(m.totalMistakeChance ?? 0) > 0 && (
                        <span style={{ color: '#f87171', fontWeight: 600 }}>
                          ⚠️ {m.totalMistakeChance}%
                        </span>
                      )}
                      {(m.rewardDep ?? 0) > 0 && <span style={{ color: '#38bdf8' }}>+{m.rewardDep} Dep</span>}
                      {(m.rewardExp ?? 0) > 0 && <span style={{ color: '#a855f7' }}>+{m.rewardExp} Exp</span>}
                      {(m.rewardSocial ?? 0) > 0 && <span style={{ color: '#34d399' }}>+{m.rewardSocial} Soc</span>}
                    </div>
                  </div>
                </div>

                {/* Right: Info / Help button */}
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
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: '#94a3b8',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    padding: '3px 6px',
                    fontWeight: 'bold',
                    flexShrink: 0,
                    marginLeft: '6px'
                  }}
                >
                  ℹ️
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer: Prominent WORK Action Button */}
        <div style={{
          padding: '8px 12px 10px 12px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          flexShrink: 0
        }}>
          <button
            type="button"
            data-testid={`work-mode-${selectedMode}`}
            data-action-target={`work-${job.id}`}
            onClick={handleExecuteShift}
            style={{
              width: '100%',
              height: '44px',
              padding: '0 12px',
              borderRadius: '8px',
              border: canAffordActive ? `1px solid ${activeMeta.themeColor}` : '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: canAffordActive ? activeMeta.themeColor : '#334155',
              color: canAffordActive ? '#000' : '#94a3b8',
              fontWeight: 'bold',
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: canAffordActive ? `0 2px 10px ${activeMeta.glowColor}` : 'none',
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
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.68rem',
            color: '#94a3b8',
            padding: '0 2px'
          }}>
            <span>⏳ {formatHours(hoursToWork)}h Shift</span>
            <span>{player.hoursRemaining}h remaining</span>
          </div>
        </div>
      </div>
    </>
  );

  return typeof document !== 'undefined'
    ? createPortal(popupContent, document.body)
    : popupContent;
};
