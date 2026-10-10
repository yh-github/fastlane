import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { PlayerState, GameRules } from '../../../engine/gameState';
import type { CampaignBundle, JobDef } from '../../../engine/dataLoader';
import { calcWorkShiftSummary, type WorkShiftOption, type WorkMode } from '../../../engine/jobEngine';
import { hasJobTag } from '../../../engine/jobTags';
import { formatHours } from '../../../engine/statMath';
import { WorkCardHelpModal } from './WorkCardHelpModal';
import { ActionReasonModal } from '../ActionReasonModal';

export interface WorkShiftCardsProps {
  player: PlayerState;
  job: JobDef;
  campaign?: CampaignBundle;
  rules?: GameRules;
  onAction: (action: any) => void;
  onClose?: () => void;
  layoutMode?: 'flanking' | 'grid';
  isFloating?: boolean;
  modalRef?: React.RefObject<HTMLDivElement | null>;
}

export const WorkShiftCards: React.FC<WorkShiftCardsProps> = ({
  player,
  job,
  campaign,
  rules,
  onAction,
  onClose,
  layoutMode = 'grid',
  isFloating: _isFloating = true,
  modalRef
}) => {
  const { t } = useTranslation();
  const [activeHelpMode, setActiveHelpMode] = useState<WorkMode | null>(null);
  const [disabledReason, setDisabledReason] = useState<{ title: string; reason: string } | null>(null);

  const isFlanking = layoutMode === 'flanking';
  const [modalRect, setModalRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isFlanking || typeof window === 'undefined') return;

    const updateRect = () => {
      if (modalRef?.current) {
        setModalRect(modalRef.current.getBoundingClientRect());
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    const interval = setInterval(updateRect, 250);
    return () => {
      window.removeEventListener('resize', updateRect);
      clearInterval(interval);
    };
  }, [isFlanking, modalRef]);

  const effectiveRules = rules || campaign?.config?.gameRules;
  const statRules = campaign?.config?.statRules;
  const isAdvanced = !!effectiveRules?.usePhysicalMentalConditions;
  const isHelpful = effectiveRules ? effectiveRules.helpfulUI !== false : true;
  const shiftCost = campaign?.config.timeRules?.workSessionCost ?? 6;

  // Classic Mode (Non-Advanced): streamlined visual card
  if (!isAdvanced) {
    const canWork = player.hoursRemaining > 0;
    const wageEarned = Math.floor((player.currentWage || job.baseWage) * 8);

    const classicCard = (
      <div
        className="work-shift-card"
        style={{
          width: '100%',
          maxWidth: layoutMode === 'flanking' ? '100%' : '300px',
          background: 'linear-gradient(165deg, rgba(13, 35, 58, 0.95) 0%, rgba(6, 18, 31, 0.98) 100%)',
          border: '2px solid #38bdf8',
          borderRadius: '10px',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: '0.65rem',
            fontWeight: 'bold',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(56, 189, 248, 0.2)',
            color: '#38bdf8',
            border: '1px solid #38bdf8'
          }}>
            SHIFT
          </span>
          {isHelpful && (
            <span style={{ fontSize: '0.72rem', color: '#a5f3fc', fontWeight: 'bold' }}>
              ⏳ {formatHours(shiftCost)} hrs
            </span>
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', margin: '2px 0' }}>💼</div>
          <h4 style={{ margin: 0, fontSize: '1.02rem', color: '#fff', fontWeight: 'bold' }}>
            {t('workStation.workShiftTitle', { defaultValue: 'Work Shift' })}
          </h4>
          <div style={{ fontSize: '0.90rem', color: '#34d399', fontWeight: 'bold', marginTop: '2px' }}>
            +${wageEarned} Pay
          </div>
        </div>

        <button
          data-testid="work-mode-work_work"
          data-action-target={`work-${job.id}`}
          onClick={() => onAction({ type: 'work', jobId: job.id })}
          style={{
            width: '100%',
            padding: '8px',
            background: canWork ? 'linear-gradient(145deg, #0284c7 0%, #0369a1 100%)' : '#334155',
            color: canWork ? '#fff' : '#64748b',
            border: canWork ? '1px solid #38bdf8' : 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            cursor: canWork ? 'pointer' : 'not-allowed',
            boxShadow: canWork ? '0 0 10px rgba(56, 189, 248, 0.4)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          💼 {isHelpful ? t('workStation.workShift', { cost: formatHours(shiftCost), defaultValue: `Work Shift (${formatHours(shiftCost)}h)` }) : t('workStation.workShiftBasic', { defaultValue: 'Work Shift' })}
        </button>
      </div>
    );

    if (layoutMode === 'flanking') {
      const wingTop = modalRect ? `${Math.max(8, Math.min(modalRect.top, Math.max(8, window.innerHeight - 380)))}px` : '8px';
      const leftWingContent = (
        <div
          className="work-wing-left work-card-wing"
          style={{
            position: 'fixed',
            top: wingTop,
            maxHeight: 'calc(100vh - 16px)',
            width: '124px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            zIndex: 1000,
            boxSizing: 'border-box',
            ...(modalRect ? {
              right: `${Math.max(6, window.innerWidth - modalRect.left + 6)}px`,
              left: 'auto'
            } : {
              left: '8px'
            })
          }}
        >
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '8px',
            padding: '4px 6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            flexShrink: 0
          }}>
            <span style={{ fontSize: '0.70rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
              💼 Console
            </span>
            <span style={{ fontSize: '0.68rem', color: '#a5f3fc', fontWeight: 'bold' }}>
              ${player.currentWage || job.baseWage}/hr
            </span>
          </div>
          {classicCard}
        </div>
      );

      return typeof document !== 'undefined'
        ? createPortal(leftWingContent, document.body)
        : leftWingContent;
    }

    return (
      <div className="work-cards-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>
              💼 {t(`job.${job.id}`, { defaultValue: job.title })}
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan, #00e5ff)', fontWeight: 'bold' }}>
              ${player.currentWage || job.baseWage}/hr{isHelpful ? ` (⏳${formatHours(shiftCost)}h)` : ''}
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                color: '#ddd',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 'bold'
              }}
            >
              ✕ {t('common.close', { defaultValue: 'Close' })}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
          {classicCard}
        </div>
      </div>
    );
  }

  // Advanced Mode: Full 4-Card Strategy Deck
  const summary = calcWorkShiftSummary(player, job, shiftCost, effectiveRules, statRules);
  const { hoursToWork, tierLabel, modes, innovationsCount, locationMistakes, turnMistakes } = summary;

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

  // Render a single compact card
  const renderCompactCard = (m: WorkShiftOption) => {
    const meta = cardMeta[m.id] || {
      actionName: m.id,
      icon: '💼',
      themeColor: m.color,
      glowColor: 'rgba(255,255,255,0.2)'
    };

    const curPhys = player.physicalCondition ?? 50;
    const curMental = player.mentalCondition ?? 50;
    const hasEnoughTime = player.hoursRemaining > 0;
    const hasEnoughPhys = curPhys - m.physCost >= 1.0;
    const hasEnoughMental = curMental - m.mentalCost >= 1.0;
    const canAfford = hasEnoughTime && hasEnoughPhys && hasEnoughMental && !m.disabled;

    const isWorkWork = m.id === 'work_work';
    const totalMistakeChance = m.totalMistakeChance ?? 0;
    const physChance = m.physMistakeChance ?? 0;
    const mentalChance = m.mentalMistakeChance ?? 0;
    const socialChance = m.socialMistakeChance ?? 0;

    const fatigueCostText = m.mentalCost > 0
      ? `-${m.physCost} 💪, -${m.mentalCost} 🧠`
      : `-${m.physCost} 💪`;

    const wageText = m.wage > 0 ? `(+$${m.wage})` : '($0)';

    // Extract all exact properties and active modifiers as clean badges
    interface ModifierBadge {
      key: string;
      label: string;
      color: string;
      bg: string;
      border: string;
      wrap?: boolean;
    }
    const badges: ModifierBadge[] = [];

    // 1. Dependability
    if (m.rewardDep > 0) {
      badges.push({
        key: 'dep',
        label: `+${m.rewardDep} 🤝`,
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.18)',
        border: 'rgba(56, 189, 248, 0.45)'
      });
    } else if (m.rewardDep < 0) {
      badges.push({
        key: 'dep_pen',
        label: `${m.rewardDep} 🤝`,
        color: '#f87171',
        bg: 'rgba(239, 68, 68, 0.18)',
        border: 'rgba(239, 68, 68, 0.45)'
      });
    }

    // 2. Experience
    if (m.rewardExp > 0) {
      badges.push({
        key: 'exp',
        label: `+${m.rewardExp} 👌`,
        color: '#a78bfa',
        bg: 'rgba(167, 139, 250, 0.18)',
        border: 'rgba(167, 139, 250, 0.45)'
      });
    }

    // 3. Social modifier (crucial: frontline_service +1/-1 Social, and network +1 Social)
    if (m.rewardSocial > 0) {
      badges.push({
        key: 'social_gain',
        label: `+${m.rewardSocial} 👥`,
        color: '#f472b6',
        bg: 'rgba(244, 114, 182, 0.18)',
        border: 'rgba(244, 114, 182, 0.45)'
      });
    } else if (m.rewardSocial < 0) {
      badges.push({
        key: 'social_loss',
        label: `${m.rewardSocial} 👥`,
        color: '#f87171',
        bg: 'rgba(239, 68, 68, 0.18)',
        border: 'rgba(239, 68, 68, 0.45)'
      });
    }

    // 4. Technical Skill gain
    const useSkills = Boolean(rules?.useSkills !== undefined ? rules.useSkills : rules?.usePhysicalMentalConditions);
    const isTech = useSkills && hasJobTag(job, 'technical');
    if (isTech && m.id === 'work_work' && m.rewardExp > 0) {
      const techGain = (m.rewardExp * 0.25).toFixed(2);
      badges.push({
        key: 'tech',
        label: `+${techGain} 🔧`,
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.18)',
        border: 'rgba(56, 189, 248, 0.45)'
      });
    }

    // 5. Management Skill gain
    const isMiddleMgmt = useSkills && hasJobTag(job, 'middle_management');
    const isExecMgmt = useSkills && hasJobTag(job, 'executive_management');
    const isMgmt = isMiddleMgmt || isExecMgmt;
    if (isMgmt) {
      if (m.id === 'work_work' && m.rewardExp > 0) {
        const mgmtGain = ((isExecMgmt ? 0.50 : 0.25) * m.rewardExp).toFixed(2);
        badges.push({
          key: 'mgmt',
          label: `+${mgmtGain} 👔`,
          color: '#fbbf24',
          bg: 'rgba(251, 191, 36, 0.18)',
          border: 'rgba(251, 191, 36, 0.45)'
        });
      } else if (m.id === 'face_time') {
        badges.push({
          key: 'mgmt_ft',
          label: '+0.25 👔',
          color: '#fbbf24',
          bg: 'rgba(251, 191, 36, 0.18)',
          border: 'rgba(251, 191, 36, 0.45)'
        });
      } else if (m.id === 'show_initiative' || m.id === 'innovate') {
        const initMgmt = (isExecMgmt ? 1.0 : (isMiddleMgmt ? 0.5 : 0.25)).toFixed(2);
        badges.push({
          key: 'mgmt_init',
          label: `+${initMgmt} 👔`,
          color: '#fbbf24',
          bg: 'rgba(251, 191, 36, 0.18)',
          border: 'rgba(251, 191, 36, 0.45)'
        });
      }
    }

    // 6. Overtime / Heavy Grind permanent physical drop
    const isOvertimeShift = summary.tier === 'overtime';
    const isHeavyGrindShift = summary.tier === 'grind' && hasJobTag(job, 'heavy_physical');
    if ((isOvertimeShift || isHeavyGrindShift) && m.id === 'work_work') {
      badges.push({
        key: 'max_phys_drop',
        label: '-0.5 MAX 💪',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.22)',
        border: '#ef4444'
      });
    }

    // 7. Initiative special rewards
    if (m.id === 'show_initiative' || m.id === 'innovate') {
      badges.push({
        key: 'clear_mistake',
        label: '-1 ⚠️',
        color: '#34d399',
        bg: 'rgba(52, 211, 153, 0.18)',
        border: 'rgba(52, 211, 153, 0.45)'
      });
      badges.push({
        key: 'initiative_star',
        label: `+${isExecMgmt ? 2 : 1} 🌟`,
        color: '#fbbf24',
        bg: 'rgba(251, 191, 36, 0.18)',
        border: 'rgba(251, 191, 36, 0.45)'
      });
    }

    // 8. Coasting with 0 rewards
    if (m.id === 'look_busy' && badges.length === 0) {
      badges.push({
        key: 'coast_neutral',
        label: '0 👌 (Coast)',
        color: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.12)',
        border: 'rgba(148, 163, 184, 0.25)'
      });
    }

    return (
      <div
        key={m.id}
        className="work-shift-card"
        style={{
          background: canAfford
            ? 'linear-gradient(165deg, rgba(20, 28, 48, 0.96) 0%, rgba(10, 15, 28, 0.98) 100%)'
            : 'linear-gradient(165deg, rgba(15, 20, 32, 0.8) 0%, rgba(8, 12, 20, 0.85) 100%)',
          border: canAfford
            ? (isWorkWork ? `2px solid ${meta.themeColor}` : `1.5px solid ${meta.themeColor}`)
            : '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '10px',
          padding: '6px 7px',
          height: isFlanking ? 'auto' : '128px',
          minHeight: isFlanking ? '136px' : '128px',
          maxHeight: isFlanking ? 'none' : '135px',
          boxSizing: 'border-box',
          boxShadow: canAfford
            ? (isWorkWork ? `0 0 14px ${meta.glowColor}, 0 4px 12px rgba(0,0,0,0.6)` : `0 4px 10px rgba(0,0,0,0.5)`)
            : 'none',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '5px',
          opacity: canAfford ? 1 : 0.7,
          overflow: isFlanking ? 'visible' : 'hidden'
        }}
      >
        {/* Row 1: Title + Duration & '?' Help Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 'bold', color: meta.themeColor, display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span>{meta.icon}</span>
            <span>{meta.actionName}</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 'bold',
                padding: '1px 4px',
                borderRadius: '4px',
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                color: '#cbd5e1'
              }}
            >
              ⏳ {formatHours(hoursToWork)} hrs
            </span>

            <button
              type="button"
              data-testid={`help-btn-${m.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveHelpMode(m.id);
              }}
              title={t('workStation.helpTooltip', { defaultValue: 'View strategy, lore & mechanics' })}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid #38bdf8',
                color: '#38bdf8',
                fontSize: '0.64rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#38bdf8';
                e.currentTarget.style.color = '#000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)';
                e.currentTarget.style.color = '#38bdf8';
              }}
            >
              ?
            </button>
          </div>
        </div>

        {/* Row 2: Condition / Fatigue cost + Mistake Chance */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.66rem', flexShrink: 0 }}>
          <span style={{
            color: summary.tier === 'overtime' ? '#f87171' : (summary.tier === 'grind' ? '#fbbf24' : '#fca5a5'),
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '2px'
          }}>
            {summary.tier === 'overtime' ? '🔥 ' : (summary.tier === 'grind' ? '⚡ ' : '')}{fatigueCostText}
          </span>

          {totalMistakeChance > 0 && (
            <span
              title={`Physical: ${(physChance * 100).toFixed(1)}%, Mental: ${(mentalChance * 100).toFixed(1)}%${socialChance > 0 ? `, Social: ${(socialChance * 100).toFixed(1)}%` : ''}`}
              style={{
                color: '#f87171',
                fontWeight: 'bold',
                fontSize: '0.62rem',
                background: 'rgba(239, 68, 68, 0.2)',
                padding: '1px 4px',
                borderRadius: '3px',
                border: '1px solid #ef4444'
              }}
            >
              ⚠️ {(totalMistakeChance * 100).toFixed(1)}%
            </span>
          )}
        </div>

        {/* Row 3: All active modifier badges (frontline social, tech, overtime drop, etc.) */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '3px',
          alignItems: 'center',
          minHeight: '20px'
        }}>
          {badges.map(b => (
            <span
              key={b.key}
              style={{
                fontSize: '0.62rem',
                fontWeight: 'bold',
                padding: '1px 4px',
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

        {/* Row 4: Consolidated Mode Button */}
        <div style={{ flexShrink: 0 }}>
          <button
            data-testid={`work-mode-${m.id}`}
            data-action-target={isWorkWork ? `work-${job.id}` : undefined}
            onClick={() => {
              if (m.disabled) {
                const reqExp = (job.requirements?.experience ?? 0) + 10;
                let reasonText = '';
                if (m.disabledReasonKey) {
                  reasonText = t(m.disabledReasonKey, { reqExp, defaultValue: 'You need more experience before you can perform this action.' });
                } else if (m.id === 'show_initiative' || m.id === 'innovate') {
                  reasonText = t('workStation.initiativeNeedExp', {
                    reqExp,
                    defaultValue: `Requires at least ${reqExp} experience to show initiative (you have ${player.experience ?? 0}).`
                  });
                } else {
                  reasonText = t('workStation.modeDisabledReason', { defaultValue: 'This work mode is currently unavailable.' });
                }
                setDisabledReason({
                  title: m.id === 'show_initiative' || m.id === 'innovate'
                    ? t('workStation.initiativeLockedTitle', { defaultValue: 'Show Initiative Unavailable' })
                    : t('workStation.modeUnavailableTitle', { defaultValue: 'Action Unavailable' }),
                  reason: reasonText
                });
                return;
              }
              onAction({ type: 'work', jobId: job.id, mode: m.id as any });
            }}
            style={{
              width: '100%',
              padding: '6px 4px',
              borderRadius: '6px',
              border: canAfford ? `1px solid ${meta.themeColor}` : '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: canAfford ? meta.themeColor : '#334155',
              color: canAfford ? '#000000' : '#94a3b8',
              fontWeight: 'bold',
              fontSize: '0.72rem',
              cursor: 'pointer',
              boxShadow: canAfford ? `0 2px 8px ${meta.glowColor}` : 'none',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: '1.2'
            }}
            onMouseDown={(e) => {
              if (canAfford) e.currentTarget.style.transform = 'scale(0.97)';
            }}
            onMouseUp={(e) => {
              if (canAfford) e.currentTarget.style.transform = 'none';
            }}
          >
            {m.disabled ? '🔒 ' : `${meta.icon} `}{meta.actionName} {wageText}
          </button>
        </div>
      </div>
    );
  };

  const leftModes = modes.filter(m => m.id === 'work_work' || m.id === 'look_busy');
  const rightModes = modes.filter(m => m.id === 'face_time' || m.id === 'show_initiative' || m.id === 'innovate');

  return (
    <>
      {/* Help Modal when active */}
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

      {/* Action Reason Modal when clicking disabled mode */}
      {disabledReason && (
        <ActionReasonModal
          title={disabledReason.title}
          reason={disabledReason.reason}
          onClose={() => setDisabledReason(null)}
        />
      )}

      {layoutMode === 'flanking' ? (
        /* FLANKING RADIAL WINGS: Steal screen space from the surrounding board! */
        (() => {
          const wingTop = modalRect ? `${Math.max(8, Math.min(modalRect.top, Math.max(8, window.innerHeight - 380)))}px` : '8px';
          const wingsContent = (
            <>
              {/* Left Wing (Work Work & Look Busy) */}
              <div
                className="work-wing-left work-card-wing"
                style={{
                  position: 'fixed',
                  top: wingTop,
                  maxHeight: 'calc(100vh - 16px)',
                  width: '124px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  overflowY: 'auto',
                  scrollbarWidth: 'thin',
                  zIndex: 1000,
                  boxSizing: 'border-box',
                  ...(modalRect ? {
                    right: `${Math.max(6, window.innerWidth - modalRect.left + 6)}px`,
                    left: 'auto'
                  } : {
                    left: '8px'
                  })
                }}
              >
                <div style={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  borderRadius: '8px',
                  padding: '4px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: '0.70rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                    💼 Console
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#a5f3fc', fontWeight: 'bold' }}>
                    ${player.currentWage || job.baseWage}/hr
                  </span>
                </div>

                {leftModes.map(m => renderCompactCard(m))}
              </div>

              {/* Right Wing (Face Time & Innovate) */}
              <div
                className="work-wing-right work-card-wing"
                style={{
                  position: 'fixed',
                  top: wingTop,
                  maxHeight: 'calc(100vh - 16px)',
                  width: '124px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  overflowY: 'auto',
                  scrollbarWidth: 'thin',
                  zIndex: 1000,
                  boxSizing: 'border-box',
                  ...(modalRect ? {
                    left: `${Math.min(window.innerWidth - 124 - 6, modalRect.right + 6)}px`,
                    right: 'auto'
                  } : {
                    right: '8px'
                  })
                }}
              >
                <div style={{
                  background: summary.tier === 'overtime' ? 'linear-gradient(135deg, rgba(69, 10, 10, 0.96) 0%, rgba(24, 10, 15, 0.98) 100%)' : (summary.tier === 'grind' ? 'linear-gradient(135deg, rgba(69, 39, 10, 0.96) 0%, rgba(26, 18, 10, 0.98) 100%)' : 'rgba(15, 23, 42, 0.96)'),
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  borderRadius: '8px',
                  padding: '5px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#fff' }}>
                      Shift #{summary.actionCount}
                    </span>
                    {summary.tier === 'grind' && <span style={{ fontSize: '0.60rem', fontWeight: 'bold', padding: '1px 3px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.25)', color: '#f59e0b', border: '1px solid #f59e0b' }}>⚡ GRIND</span>}
                    {summary.tier === 'overtime' && <span style={{ fontSize: '0.60rem', fontWeight: 'bold', padding: '1px 3px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.25)', color: '#ef4444', border: '1px solid #ef4444' }}>🔥 OVERTIME</span>}
                  </div>
                  {onClose && (
                    <button
                      data-testid="btn-close-work-wings"
                      aria-label="Close Work Console"
                      onClick={onClose}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: '0.80rem',
                        cursor: 'pointer',
                        padding: '0 2px',
                        fontWeight: 'bold'
                      }}
                      title="Minimize Work Console"
                    >
                      <span data-testid="btn-close-work-console" style={{ display: 'contents' }}>✕</span>
                    </button>
                  )}
                </div>

                {rightModes.map(m => renderCompactCard(m))}
              </div>
            </>
          );

          return typeof document !== 'undefined'
            ? createPortal(wingsContent, document.body)
            : wingsContent;
        })()
      ) : (
        /* GRID / STANDALONE VIEW: For direct test rendering */
        <div
          className="work-cards-deck"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {/* Top Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: '6px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: 'bold' }}>
                💼 {t(`job.${job.id}`, { defaultValue: job.title })}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                <span style={{ fontSize: '0.85rem', color: '#00e5ff', fontWeight: 'bold' }}>
                  ${player.currentWage || job.baseWage}/hr{isHelpful ? ` (⏳${formatHours(hoursToWork)}h)` : ''} {tierLabel}
                </span>
                {summary.locationInitiatives > 0 && (
                  <span style={{ fontSize: '0.74rem', color: '#f59e0b', fontWeight: 'bold', background: 'rgba(245, 158, 11, 0.15)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    🌟 {summary.locationInitiatives} Initiatives (+{summary.locationInitiatives * 3}% standing)
                  </span>
                )}
                {summary.locationMistakes > 0 && (
                  <span style={{ fontSize: '0.74rem', color: '#f87171', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.15)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    ⚠️ {summary.locationMistakes} Incidents
                  </span>
                )}
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  padding: '3px 8px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  color: '#e2e8f0',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ✕ {t('common.close', { defaultValue: 'Close' })}
              </button>
            )}
          </div>

          {/* Chips */}
          {(innovationsCount > 0 || locationMistakes > 0 || turnMistakes > 0) && (
            <div style={{ display: 'flex', gap: '6px', fontSize: '0.70rem' }}>
              {innovationsCount > 0 && (
                <span style={{ background: 'rgba(0, 229, 255, 0.15)', color: '#00e5ff', border: '1px solid #00e5ff', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                  💡 {innovationsCount} Innovations
                </span>
              )}
              {turnMistakes > 0 && (
                <span style={{ background: 'rgba(255, 77, 77, 0.18)', color: '#ff6b6b', border: '1px solid #ff4d4d', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                  ⚠️ {turnMistakes} Turn Mistakes
                </span>
              )}
              {locationMistakes > 0 && (
                <span style={{ background: 'rgba(255, 179, 0, 0.18)', color: '#ffb300', border: '1px solid #ffb300', padding: '1px 5px', borderRadius: '4px' }}>
                  ⚠️ {locationMistakes} Here
                </span>
              )}
            </div>
          )}

          {/* 4 Cards Grid Tray */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {modes.map(m => renderCompactCard(m))}
          </div>
        </div>
      )}
    </>
  );
};
