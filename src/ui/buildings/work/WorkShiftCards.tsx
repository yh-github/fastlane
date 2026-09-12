import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerState, GameRules } from '../../../engine/gameState';
import type { CampaignBundle, JobDef } from '../../../engine/dataLoader';
import { calcWorkShiftSummary, type WorkShiftOption, type WorkMode } from '../../../engine/jobEngine';
import { WorkCardHelpModal } from './WorkCardHelpModal';

export interface WorkShiftCardsProps {
  player: PlayerState;
  job: JobDef;
  campaign?: CampaignBundle;
  rules?: GameRules;
  onAction: (action: any) => void;
  onClose?: () => void;
  layoutMode?: 'flanking' | 'grid';
  isFloating?: boolean;
}

export const WorkShiftCards: React.FC<WorkShiftCardsProps> = ({
  player,
  job,
  campaign,
  rules,
  onAction,
  onClose,
  layoutMode = 'grid',
  isFloating: _isFloating = true
}) => {
  const { t } = useTranslation();
  const [activeHelpMode, setActiveHelpMode] = useState<WorkMode | null>(null);

  const effectiveRules = rules || campaign?.config?.gameRules;
  const statRules = campaign?.config?.statRules;
  const isAdvanced = !!effectiveRules?.usePhysicalMentalConditions;
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
          <span style={{ fontSize: '0.72rem', color: '#a5f3fc', fontWeight: 'bold' }}>
            ⏳ {shiftCost} hrs
          </span>
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
          💼 {t('workStation.workShift', { cost: shiftCost, defaultValue: `Work Shift (${shiftCost}h)` })}
        </button>
      </div>
    );

    if (layoutMode === 'flanking') {
      return (
        <div
          className="work-wing-left"
          style={{
            position: 'absolute',
            right: 'calc(100% + 14px)',
            top: '24px',
            width: 'calc(185px * var(--board-scale, 1))',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 60
          }}
        >
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '8px',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
              💼 Work Console
            </span>
            <span style={{ fontSize: '0.70rem', color: '#a5f3fc', fontWeight: 'bold' }}>
              ${player.currentWage || job.baseWage}/hr
            </span>
          </div>
          {classicCard}
        </div>
      );
    }

    return (
      <div className="work-cards-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>
              💼 {t(`job.${job.id}`, { defaultValue: job.title })}
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan, #00e5ff)', fontWeight: 'bold' }}>
              ${player.currentWage || job.baseWage}/hr (⏳{shiftCost}h)
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
    title: string;
    icon: string;
    badge: string;
    themeColor: string;
    glowColor: string;
    buttonLabel: string;
  }> = {
    work_work: {
      title: t('action.workModal.workWork', { defaultValue: 'Work Work' }),
      icon: '💼',
      badge: 'DEFAULT',
      themeColor: '#10b981',
      glowColor: 'rgba(16, 185, 129, 0.35)',
      buttonLabel: `💼 ${t('workStation.actionWorkWork', { defaultValue: 'Work Shift' })}`
    },
    look_busy: {
      title: t('action.workModal.lookBusy', { defaultValue: 'Look Busy' }),
      icon: '👀',
      badge: 'SLACKING',
      themeColor: '#f59e0b',
      glowColor: 'rgba(245, 158, 11, 0.35)',
      buttonLabel: `👀 ${t('workStation.actionLookBusy', { defaultValue: 'Coast' })}`
    },
    face_time: {
      title: t('action.workModal.faceTime', { defaultValue: 'Face Time' }),
      icon: '🤝',
      badge: 'NETWORKING',
      themeColor: '#0ea5e9',
      glowColor: 'rgba(14, 165, 233, 0.35)',
      buttonLabel: `🤝 ${t('workStation.actionFaceTime', { defaultValue: 'Network' })}`
    },
    show_initiative: {
      title: t('action.workModal.showInitiative', { defaultValue: 'Show Initiative' }),
      icon: '🌟',
      badge: 'LEADERSHIP',
      themeColor: '#f59e0b',
      glowColor: 'rgba(245, 158, 11, 0.35)',
      buttonLabel: `🌟 ${t('workStation.actionShowInitiative', { defaultValue: 'Show Initiative' })}`
    },
    innovate: {
      title: t('action.workModal.showInitiative', { defaultValue: 'Show Initiative' }),
      icon: '🌟',
      badge: 'LEADERSHIP',
      themeColor: '#f59e0b',
      glowColor: 'rgba(245, 158, 11, 0.35)',
      buttonLabel: `🌟 ${t('workStation.actionShowInitiative', { defaultValue: 'Show Initiative' })}`
    }
  };

  // Render a single compact card
  const renderCompactCard = (m: WorkShiftOption) => {
    const meta = cardMeta[m.id] || {
      title: m.id,
      icon: '💼',
      badge: 'MODE',
      themeColor: m.color,
      glowColor: 'rgba(255,255,255,0.2)',
      buttonLabel: `Work ${m.id}`
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

    const reqExp = (job.requirements?.experience ?? 0) + 10;
    const displayReward = m.disabledReasonKey
      ? t(m.disabledReasonKey, { reqExp })
      : (m.id === 'show_initiative' || m.id === 'innovate'
          ? t(m.rewardText, { reqExp })
          : m.rewardText);

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
          padding: '8px 9px',
          boxShadow: canAfford
            ? (isWorkWork ? `0 0 14px ${meta.glowColor}, 0 4px 12px rgba(0,0,0,0.6)` : `0 4px 10px rgba(0,0,0,0.5)`)
            : 'none',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '6px',
          opacity: canAfford ? 1 : 0.65,
          boxSizing: 'border-box'
        }}
      >
        {/* Top Header: Badge, Duration & '?' Help Button */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            {summary.tier === 'overtime' ? (
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 'bold',
                  letterSpacing: '0.04em',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(239, 68, 68, 0.25)',
                  color: '#ef4444',
                  border: '1px solid #ef4444'
                }}
              >
                🔥 OVERTIME
              </span>
            ) : summary.tier === 'grind' ? (
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 'bold',
                  letterSpacing: '0.04em',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(245, 158, 11, 0.25)',
                  color: '#fbbf24',
                  border: '1px solid #f59e0b'
                }}
              >
                ⚡ GRIND
              </span>
            ) : (
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 'bold',
                  letterSpacing: '0.04em',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  backgroundColor: canAfford ? `${meta.themeColor}22` : 'rgba(255,255,255,0.05)',
                  color: canAfford ? meta.themeColor : '#71717a',
                  border: `1px solid ${canAfford ? meta.themeColor : '#3f3f46'}`
                }}
              >
                {meta.badge}
              </span>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 'bold',
                  padding: '1px 5px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  color: '#cbd5e1'
                }}
              >
                ⏳ {hoursToWork} hrs
              </span>

              {/* Strategy & Mechanics Guide '?' Button */}
              <button
                type="button"
                data-testid={`help-btn-${m.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveHelpMode(m.id);
                }}
                title={t('workStation.helpTooltip', { defaultValue: 'View strategy, lore & mechanics' })}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid #38bdf8',
                  color: '#38bdf8',
                  fontSize: '0.68rem',
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

          {/* Title & Wage Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '1.15rem' }}>{meta.icon}</span>
              <h4
                style={{
                  margin: 0,
                  fontSize: '0.90rem',
                  fontWeight: 'bold',
                  color: canAfford ? '#ffffff' : '#a1a1aa',
                  whiteSpace: 'nowrap'
                }}
              >
                {meta.title}
              </h4>
            </div>

            <span
              style={{
                fontSize: '0.80rem',
                fontWeight: 'bold',
                color: m.wage > 0 ? '#34d399' : '#94a3b8'
              }}
            >
              {m.wage > 0 ? `+$${m.wage}` : '$0'}
            </span>
          </div>
        </div>

        {/* Compact Costs, Risk & Benefits */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            style={{
              padding: '4px 6px',
              borderRadius: '5px',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.68rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px'
            }}
          >
            {/* Fatigue & Mistake Risk */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                color: summary.tier === 'overtime' ? '#f87171' : (summary.tier === 'grind' ? '#fbbf24' : '#fca5a5'),
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}>
                {summary.tier === 'overtime' ? '🔥 ' : (summary.tier === 'grind' ? '⚡ ' : '')}{fatigueCostText}
              </span>

              {totalMistakeChance > 0 && (
                <span
                  title={`Physical: ${(physChance * 100).toFixed(1)}%, Mental: ${(mentalChance * 100).toFixed(1)}%${socialChance > 0 ? `, Social: ${(socialChance * 100).toFixed(1)}%` : ''}`}
                  style={{
                    color: '#f87171',
                    fontWeight: 'bold',
                    fontSize: '0.65rem',
                    background: 'rgba(239, 68, 68, 0.2)',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    border: '1px solid #ef4444'
                  }}
                >
                  ⚠️ {(totalMistakeChance * 100).toFixed(1)}%
                </span>
              )}
            </div>

            {/* Overtime Permanent Wear & Tear Banner */}
            {summary.tier === 'overtime' && isWorkWork && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #ef4444',
                borderRadius: '4px',
                padding: '2px 5px',
                color: '#fca5a5',
                fontSize: '0.63rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span>🔥</span>
                <span>-0.5 Max Physical Condition</span>
              </div>
            )}

            {/* Reward Perks */}
            <div style={{
              color: canAfford ? '#67e8f9' : '#71717a',
              fontWeight: 'bold',
              fontSize: '0.66rem',
              lineHeight: '1.25',
              wordBreak: 'break-word'
            }}>
              {displayReward.replace(/,\s*-0\.5\s*Max\s*💪/g, '')}
            </div>
          </div>

          {/* Action Button */}
          <div>
            {m.disabled && m.disabledReasonKey && (
              <div
                style={{
                  fontSize: '0.66rem',
                  color: '#fca5a5',
                  marginBottom: '4px',
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}
              >
                {displayReward}
              </div>
            )}

            <button
              data-testid={`work-mode-${m.id}`}
              data-action-target={isWorkWork ? `work-${job.id}` : undefined}
              onClick={() => {
                onAction({ type: 'work', jobId: job.id, mode: m.id as any });
              }}
              style={{
                width: '100%',
                padding: '6px 4px',
                borderRadius: '6px',
                border: canAfford ? `1px solid ${meta.themeColor}` : 'none',
                backgroundColor: canAfford ? meta.themeColor : '#3f3f46',
                color: canAfford ? '#000000' : '#71717a',
                fontWeight: 'bold',
                fontSize: '0.78rem',
                cursor: canAfford ? 'pointer' : 'not-allowed',
                boxShadow: canAfford ? `0 2px 8px ${meta.glowColor}` : 'none',
                transition: 'all 0.15s ease'
              }}
              onMouseDown={(e) => {
                if (canAfford) e.currentTarget.style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                if (canAfford) e.currentTarget.style.transform = 'none';
              }}
            >
              {meta.buttonLabel} {m.wage > 0 ? `(+$${m.wage})` : '($0)'}
            </button>
          </div>
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

      {layoutMode === 'flanking' ? (
        /* FLANKING RADIAL WINGS: Steal screen space from the surrounding board! */
        <>
          {/* Left Wing (Work Work & Look Busy) */}
          <div
            className="work-wing-left"
            style={{
              position: 'absolute',
              right: 'calc(100% + 12px)',
              top: '20px',
              width: 'calc(205px * var(--board-scale, 1))',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              zIndex: 60
            }}
          >
            <div style={{
              background: summary.tier === 'overtime'
                ? 'linear-gradient(135deg, rgba(69, 10, 10, 0.96) 0%, rgba(24, 10, 15, 0.98) 100%)'
                : (summary.tier === 'grind'
                  ? 'linear-gradient(135deg, rgba(69, 39, 10, 0.96) 0%, rgba(26, 18, 10, 0.98) 100%)'
                  : 'rgba(15, 23, 42, 0.96)'),
              border: summary.tier === 'overtime'
                ? '1px solid #ef4444'
                : (summary.tier === 'grind'
                  ? '1px solid #f59e0b'
                  : '1px solid rgba(56, 189, 248, 0.4)'),
              borderRadius: '8px',
              padding: '5px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: summary.tier === 'overtime'
                ? '0 0 12px rgba(239, 68, 68, 0.4), 0 4px 12px rgba(0,0,0,0.5)'
                : (summary.tier === 'grind'
                  ? '0 0 10px rgba(245, 158, 11, 0.35), 0 4px 12px rgba(0,0,0,0.5)'
                  : '0 4px 12px rgba(0,0,0,0.5)')
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 'bold', color: '#fff' }}>
                  Shift #{summary.actionCount}
                </span>
                {summary.tier === 'grind' && (
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 'bold',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: 'rgba(245, 158, 11, 0.25)',
                    color: '#f59e0b',
                    border: '1px solid #f59e0b'
                  }}>
                    ⚡ GRIND
                  </span>
                )}
                {summary.tier === 'overtime' && (
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 'bold',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: 'rgba(239, 68, 68, 0.25)',
                    color: '#ef4444',
                    border: '1px solid #ef4444'
                  }}>
                    🔥 OVERTIME
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.70rem', color: '#a5f3fc', fontWeight: 'bold' }}>
                ${player.currentWage || job.baseWage}/hr
              </span>
            </div>

            {leftModes.map(m => renderCompactCard(m))}
          </div>

          {/* Right Wing (Face Time & Innovate) */}
          <div
            className="work-wing-right"
            style={{
              position: 'absolute',
              left: 'calc(100% + 12px)',
              top: '20px',
              width: 'calc(205px * var(--board-scale, 1))',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              zIndex: 60
            }}
          >
            <div style={{
              background: 'rgba(15, 23, 42, 0.96)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '8px',
              padding: '5px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.70rem', color: '#cbd5e1' }}>
                  ⏳ {player.hoursRemaining}h left
                </span>
                {summary.locationInitiatives > 0 && (
                  <span
                    title={`${summary.locationInitiatives} Initiatives (+${summary.locationInitiatives * 3}% promotion standing)`}
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 'bold',
                      color: '#f59e0b',
                      background: 'rgba(245, 158, 11, 0.15)',
                      padding: '1px 4px',
                      borderRadius: '4px',
                      border: '1px solid rgba(245, 158, 11, 0.3)'
                    }}
                  >
                    🌟 {summary.locationInitiatives}
                  </span>
                )}
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
                  ✕
                </button>
              )}
            </div>

            {rightModes.map(m => renderCompactCard(m))}
          </div>
        </>
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
                  ${player.currentWage || job.baseWage}/hr (⏳{hoursToWork}h) {tierLabel}
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
