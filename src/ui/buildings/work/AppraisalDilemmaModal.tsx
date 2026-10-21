import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { AppraisalDilemmaState, PlayerState } from '../../../engine/gameState';
import type { CampaignBundle } from '../../../engine/dataLoader';
import { calcUsedSpace, calcHousingSpaceCap } from '../../../engine/statMath';
import { CardView } from '../../CardView';

interface AppraisalDilemmaModalProps {
  dilemma: AppraisalDilemmaState;
  onSelectOption: (index: number) => void;
  onRedraw?: () => void;
  player?: PlayerState;
  campaign?: CampaignBundle;
  compact?: boolean;
}

function getOptionDetails(opt: any, hasSpace: boolean) {
  let icon: React.ReactNode = opt.icon || '💵';
  let borderColor = '#22c55e';
  let rewardText = `+$${opt.cashAmount || 0}`;
  let shortTag = opt.title ? opt.title.split(' ')[0] : 'Choice';
  let warning: React.ReactNode = undefined;
  let helpText: React.ReactNode = undefined;

  if (opt.type === 'initiative') {
    if (opt.burnoutRisk) borderColor = '#ef4444';
    else if (opt.leadershipSkillAmount) borderColor = '#38bdf8';
    else if (opt.techSkillAmount) borderColor = '#10b981';
    else if (opt.standingAmount) borderColor = '#facc15';
    else if (opt.mentalAmount && opt.mentalAmount > 0) borderColor = '#a855f7';
    else if (opt.socialAmount && opt.socialAmount > 0) borderColor = '#6366f1';
    else if (opt.cashAmount) borderColor = '#22c55e';
    else borderColor = '#f59e0b';

    icon = opt.icon || (
      opt.burnoutRisk ? '⚠️' :
      opt.leadershipSkillAmount ? '👔' :
      opt.techSkillAmount ? '🔧' :
      opt.standingAmount ? '🌟' :
      opt.cashAmount ? '💵' :
      (opt.mentalAmount && opt.mentalAmount > 0) ? '🧠' :
      (opt.socialAmount && opt.socialAmount > 0) ? '👥' : '👌'
    );

    const parts: string[] = [];
    if (opt.leadershipSkillAmount) parts.push(`+${opt.leadershipSkillAmount} 👔`);
    if (opt.techSkillAmount) parts.push(`+${opt.techSkillAmount} 🔧`);
    if (opt.expAmount) parts.push(`+${opt.expAmount} 👌`);
    if (opt.standingAmount) parts.push(`+${opt.standingAmount} 🌟`);
    if (opt.depAmount) parts.push(`+${opt.depAmount} 🤝`);
    if (opt.cashAmount) parts.push(`+$${opt.cashAmount}`);
    if (opt.cashCost) parts.push(`-$${opt.cashCost}`);
    if (opt.mentalAmount && opt.mentalAmount > 0) parts.push(`+${opt.mentalAmount} 🧠`);
    if (opt.mentalAmount && opt.mentalAmount < 0) parts.push(`${opt.mentalAmount} 🧠`);
    if (opt.socialAmount && opt.socialAmount > 0) parts.push(`+${opt.socialAmount} 👥`);
    if (opt.socialAmount && opt.socialAmount < 0) parts.push(`${opt.socialAmount} 👥`);
    if (opt.physicalAmount && opt.physicalAmount > 0) parts.push(`+${opt.physicalAmount} 💪`);
    if (opt.physicalAmount && opt.physicalAmount < 0) parts.push(`${opt.physicalAmount} 💪`);
    rewardText = parts.length > 0 ? parts.join(', ') : 'Standard';

    if (opt.burnoutRisk) {
      warning = '⚠️ High Burnout & Mistake Risk';
    }

    const helpParts: React.ReactNode[] = [];
    if (opt.leadershipSkillAmount) {
      helpParts.push(
        <div key="lead" style={{ marginBottom: '4px' }}>
          <strong>👔 Leadership (+{opt.leadershipSkillAmount}):</strong> Advances managerial competency for supervisor and manager positions.
        </div>
      );
    }
    if (opt.techSkillAmount) {
      helpParts.push(
        <div key="tech" style={{ marginBottom: '4px' }}>
          <strong>🔧 Tech Skill (+{opt.techSkillAmount}):</strong> Develops technical proficiency for specialist roles and DIY repairs.
        </div>
      );
    }
    if (opt.expAmount) {
      helpParts.push(
        <div key="exp" style={{ marginBottom: '4px' }}>
          <strong>👌 Experience (+{opt.expAmount}):</strong> Builds on-the-job mastery towards promotions.
        </div>
      );
    }
    if (opt.standingAmount) {
      helpParts.push(
        <div key="standing" style={{ marginBottom: '4px' }}>
          <strong>🌟 Standing (+{opt.standingAmount}):</strong> Local reputation at this employer, improving raise chances and employability.
        </div>
      );
    }
    if (opt.depAmount) {
      helpParts.push(
        <div key="dep" style={{ marginBottom: '4px' }}>
          <strong>🤝 Dependability (+{opt.depAmount}):</strong> Proves reliability to qualify for raises and avoid demerits.
        </div>
      );
    }
    if (opt.cashAmount) {
      helpParts.push(
        <div key="cash" style={{ marginBottom: '4px' }}>
          <strong>💵 Cash Bounty (+${opt.cashAmount}):</strong> Immediate earnings from client efficiency and bonuses.
        </div>
      );
    }
    if (opt.cashCost) {
      helpParts.push(
        <div key="cost" style={{ marginBottom: '4px' }}>
          <strong>💸 Cost (-${opt.cashCost}):</strong> Out-of-pocket investment for tools or materials.
        </div>
      );
    }
    if (opt.mentalAmount && opt.mentalAmount > 0) {
      helpParts.push(
        <div key="mental-pos" style={{ marginBottom: '4px' }}>
          <strong>🧠 Morale (+{opt.mentalAmount}):</strong> Craftsmanship, ethics, and pride restore mental energy.
        </div>
      );
    }
    if (opt.mentalAmount && opt.mentalAmount < 0) {
      helpParts.push(
        <div key="mental-neg" style={{ marginBottom: '4px' }}>
          <strong>🧠 Mental Drain ({opt.mentalAmount}):</strong> Heavy workload and cognitive pressure deplete mental condition.
        </div>
      );
    }
    if (opt.socialAmount && opt.socialAmount > 0) {
      helpParts.push(
        <div key="social-pos" style={{ marginBottom: '4px' }}>
          <strong>👥 Camaraderie (+{opt.socialAmount}):</strong> Standing up for colleagues and collaborative teamwork builds social connection.
        </div>
      );
    }
    if (opt.socialAmount && opt.socialAmount < 0) {
      helpParts.push(
        <div key="social-neg" style={{ marginBottom: '4px' }}>
          <strong>👥 Social Friction ({opt.socialAmount}):</strong> Intense deadlines and pressure strain team relationships.
        </div>
      );
    }
    if (opt.physicalAmount && opt.physicalAmount > 0) {
      helpParts.push(
        <div key="phys-pos" style={{ marginBottom: '4px' }}>
          <strong>💪 Physical Stamina (+{opt.physicalAmount}):</strong> Active tasks and routine exertion build stamina.
        </div>
      );
    }
    if (opt.physicalAmount && opt.physicalAmount < 0) {
      helpParts.push(
        <div key="phys-neg" style={{ marginBottom: '4px' }}>
          <strong>💪 Physical Strain ({opt.physicalAmount}):</strong> Strenuous labor reduces physical stamina.
        </div>
      );
    }
    if (opt.burnoutRisk) {
      helpParts.push(
        <div key="burnout" style={{ color: '#fca5a5', marginBottom: '4px' }}>
          <strong>⚠️ Burnout Risk:</strong> Severe exhaustion increases the risk of mistakes during shifts.
        </div>
      );
    }

    helpText = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {helpParts}
      </div>
    );

    let outcomeNode: React.ReactNode = undefined;
    if (parts.length > 0) {
      outcomeNode = (
        <div
          className="initiative-modifiers-chips"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '3px 5px',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {parts.map((part, pIdx) => {
            let chipBg = 'rgba(255, 255, 255, 0.08)';
            let chipBorder = 'rgba(255, 255, 255, 0.2)';
            let chipColor = '#f8fafc';

            if (part.includes('👔')) {
              chipBg = 'rgba(56, 189, 248, 0.2)';
              chipBorder = '#38bdf8';
              chipColor = '#e0f2fe';
            } else if (part.includes('🔧')) {
              chipBg = 'rgba(16, 185, 129, 0.2)';
              chipBorder = '#10b981';
              chipColor = '#d1fae5';
            } else if (part.includes('👌')) {
              chipBg = 'rgba(245, 158, 11, 0.2)';
              chipBorder = '#f59e0b';
              chipColor = '#fef3c7';
            } else if (part.includes('🌟')) {
              chipBg = 'rgba(250, 204, 21, 0.2)';
              chipBorder = '#facc15';
              chipColor = '#fef08a';
            } else if (part.includes('🤝')) {
              chipBg = 'rgba(14, 165, 233, 0.2)';
              chipBorder = '#0ea5e9';
              chipColor = '#e0f2fe';
            } else if (part.includes('+$')) {
              chipBg = 'rgba(34, 197, 94, 0.2)';
              chipBorder = '#22c55e';
              chipColor = '#bbf7d0';
            } else if (part.includes('-$')) {
              chipBg = 'rgba(239, 68, 68, 0.2)';
              chipBorder = '#ef4444';
              chipColor = '#fecaca';
            } else if (part.includes('🧠')) {
              if (part.startsWith('+')) {
                chipBg = 'rgba(168, 85, 247, 0.2)';
                chipBorder = '#a855f7';
                chipColor = '#f3e8ff';
              } else {
                chipBg = 'rgba(239, 68, 68, 0.2)';
                chipBorder = '#ef4444';
                chipColor = '#fecaca';
              }
            } else if (part.includes('👥')) {
              if (part.startsWith('+')) {
                chipBg = 'rgba(99, 102, 241, 0.2)';
                chipBorder = '#6366f1';
                chipColor = '#e0e7ff';
              } else {
                chipBg = 'rgba(239, 68, 68, 0.2)';
                chipBorder = '#ef4444';
                chipColor = '#fecaca';
              }
            } else if (part.includes('💪')) {
              if (part.startsWith('+')) {
                chipBg = 'rgba(249, 115, 22, 0.2)';
                chipBorder = '#f97316';
                chipColor = '#ffedd5';
              } else {
                chipBg = 'rgba(239, 68, 68, 0.2)';
                chipBorder = '#ef4444';
                chipColor = '#fecaca';
              }
            }

            return (
              <React.Fragment key={pIdx}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 6px',
                    borderRadius: '5px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    backgroundColor: chipBg,
                    border: `1px solid ${chipBorder}`,
                    color: chipColor,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {part}
                </span>
                {pIdx < parts.length - 1 && <span style={{ display: 'none' }}>, </span>}
              </React.Fragment>
            );
          })}
        </div>
      );
    }

    return { icon, borderColor, rewardText, outcomeNode, shortTag, warning, helpText };
  } else if (opt.type === 'standing') {
    icon = '⭐';
    borderColor = '#38bdf8';
    shortTag = 'Standing';
    rewardText = `+${opt.depAmount || 0} 🤝${opt.mentalAmount ? `, +${opt.mentalAmount} 🧠` : ''}`;
    helpText = (
      <div>
        <strong>⭐ Certification & Standing:</strong> Authenticating and documenting the timepiece builds employer trust (🤝 Dependability) and craft pride (🧠 Mental).
      </div>
    );
  } else if (opt.type === 'item') {
    icon = opt.itemType === 'spare_parts' ? '⚙️' : '🏺';
    shortTag = opt.itemType === 'spare_parts' ? 'Parts' : 'Curio';
    if (hasSpace) {
      borderColor = '#a855f7';
      rewardText = opt.itemType === 'spare_parts' ? '1x Spare Parts' : '1x Knick-Knack';
      helpText = (
        <div>
          <strong>{opt.itemType === 'spare_parts' ? '⚙️ Spare Parts' : '🏺 Knick-Knack'}:</strong> Keep this curio in your apartment to furnish your home or use for DIY repairs.
        </div>
      );
    } else {
      borderColor = '#f59e0b';
      rewardText = opt.itemType === 'spare_parts' ? 'Auto-Pawn (+$10)' : 'Auto-Pawn (+$15)';
      warning = '⚠️ Auto-pawn scrap cash';
      helpText = (
        <div>
          <strong>⚠️ Auto-Pawn:</strong> Apartment space is full! Item will be automatically pawned for immediate scrap cash.
        </div>
      );
    }
  } else if (opt.type === 'skill') {
    icon = '🔧';
    borderColor = '#f59e0b';
    shortTag = 'Tech';
    rewardText = `+${opt.techSkillAmount || 0} 🔧${opt.mentalAmount ? `, +${opt.mentalAmount} 🧠` : ''}`;
    helpText = (
      <div>
        <strong>🔧 Technical Apprenticeship:</strong> Studying intricate clockwork escapements expands Tech Skill (🔧) and mental satisfaction (🧠).
      </div>
    );
  } else {
    // cash
    icon = '💵';
    borderColor = '#22c55e';
    rewardText = `+$${opt.cashAmount || 0}`;
    shortTag = 'Cash';
    helpText = (
      <div>
        <strong>💵 Immediate Cash Tip:</strong> Quick customer payout for swift mechanical adjustment and expedient service.
      </div>
    );
  }

  return { icon, borderColor, rewardText, shortTag, warning, helpText };
}

export function AppraisalDilemmaModal({
  dilemma,
  onSelectOption,
  onRedraw,
  player,
  campaign,
  compact: compactProp
}: AppraisalDilemmaModalProps) {
  const { t } = useTranslation();

  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  });
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const isInitiative = dilemma.gameType === 'work_initiative';

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hasSpace = player && campaign
    ? (calcUsedSpace(player, campaign, true) + 2 <= calcHousingSpaceCap(player, campaign))
    : true;

  const count = dilemma.options.length;
  // In spacious form, each card needs ~160px width + 12px gap + padding (~48px)
  const neededWidthForFull = count * 165 + (count - 1) * 12 + 64;
  const neededHeightForFull = 680;
  const canShowAllFull = !compactProp && dimensions.width >= neededWidthForFull && dimensions.height >= neededHeightForFull;
  const isCompact = !canShowAllFull;

  // Touch carousel check: active on narrow mobile widths (< 540px) or whenever side-by-side cards cannot fit comfortably (need ~170px per card)
  const neededWidthForSideBySide = count * 170 + (count - 1) * 8 + 48;
  const isCarouselMode = count >= 2 && (dimensions.width < 540 || dimensions.width < neededWidthForSideBySide);

  const scrollToOption = (idx: number) => {
    setSelectedIdx(idx);
    const el = cardRefs.current[idx];
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newIdx = (selectedIdx - 1 + count) % count;
    scrollToOption(newIdx);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newIdx = (selectedIdx + 1) % count;
    scrollToOption(newIdx);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      const newIdx = Math.max(0, selectedIdx - 1);
      scrollToOption(newIdx);
    } else if (e.key === 'ArrowRight') {
      const newIdx = Math.min(count - 1, selectedIdx + 1);
      scrollToOption(newIdx);
    } else if (e.key === 'Enter') {
      onSelectOption(selectedIdx);
    }
  };

  if (typeof document === 'undefined') return null;

  // Render inside .game-viewport so HUD (top / side) remains 100% visible and interactive.
  // Fall back to document.body if running in an isolated test environment without a full viewport.
  const portalTarget = document.querySelector('.game-viewport') || document.body;

  const modalTitle = isInitiative
    ? (dilemma.title || t('appraisalDilemma.initiativeTitle', { defaultValue: 'Workplace Initiative' }))
    : t('appraisalDilemma.title', { defaultValue: 'Appraisal Dilemma' });
  const headerIcons = isInitiative ? '🌟 👔 👌' : '🔍 ⚖️ 🏷️';

  return createPortal(
    <div
      className="building-modal-overlay appraisal-dilemma-overlay"
      data-testid="appraisal-dilemma-modal"
      role="dialog"
      aria-modal="true"
      aria-label={modalTitle}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: portalTarget === document.body ? 'fixed' : 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        // Semi-transparent backdrop with blur: never pitch-black screen so player retains full situational awareness of HUD and board
        backgroundColor: 'rgba(5, 10, 20, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 60, // Above building-modal (50), below HUD (100) and Status modal (75)
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: isCompact ? '8px' : '16px',
        boxSizing: 'border-box'
      }}
    >
      <div
        className="building-modal-content"
        data-testid="appraisal-dilemma-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, #1e293b, #0f172a)',
          padding: isCompact ? '12px 14px' : '20px 22px',
          borderRadius: isCompact ? '10px' : '12px',
          width: isCarouselMode ? 'min(580px, 96vw)' : (isCompact ? 'min(780px, 96vw)' : '720px'),
          maxWidth: '96%',
          maxHeight: 'min(92vh, 620px)',
          overflowY: isCarouselMode ? 'visible' : 'auto',
          color: '#fff',
          border: '2px solid #eab308',
          boxShadow: '0 0 25px rgba(234, 179, 8, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          animation: 'popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
        }}
      >
        {/* HEADER: Clean title and subtitle with no global ? button (help is now contextual per card) */}
        {isCompact ? (
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.25rem' }}>{headerIcons}</span>
              <h3 style={{ margin: 0, color: '#facc15', fontSize: '1.1rem', fontWeight: 'bold' }}>
                {modalTitle}
              </h3>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
              {isInitiative ? (
                dilemma.subtitle || t('appraisalDilemma.initiativeSubtitle', { defaultValue: 'Select an opportunity to advance your career:' })
              ) : (
                <>
                  {t('appraisalDilemma.subtitle', { defaultValue: 'A customer brought in:' })}{' '}
                  <strong style={{ color: '#fef08a' }}>{dilemma.itemTitle}</strong>
                </>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '2.0rem', marginBottom: '2px' }}>{headerIcons}</div>
            <h2 style={{ margin: '0 0 4px 0', color: '#facc15', fontSize: '1.35rem' }}>
              {modalTitle}
            </h2>
            <div style={{ fontSize: '0.92rem', color: '#94a3b8' }}>
              {isInitiative ? (
                dilemma.subtitle || t('appraisalDilemma.initiativeSubtitle', { defaultValue: 'Select an opportunity to advance your career:' })
              ) : (
                <>
                  {t('appraisalDilemma.subtitle', { defaultValue: 'A customer brought in:' })}{' '}
                  <strong style={{ color: '#e2e8f0' }}>{dilemma.itemTitle}</strong>
                </>
              )}
            </div>
          </div>
        )}

        {/* TOUCH CAROUSEL PILL NAVIGATION (when carousel is active on narrow screens) */}
        {isCarouselMode && (
          <div className="appraisal-carousel-indicator" role="tablist" aria-label="Appraisal options selector">
            <button
              type="button"
              onClick={handlePrev}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
              title="Previous option"
            >
              ‹
            </button>

            {dilemma.options.map((opt, idx) => {
              const details = getOptionDetails(opt, hasSpace);
              const isSelected = selectedIdx === idx;

              return (
                <button
                  key={idx}
                  data-testid={`appraisal-pill-${idx}`}
                  role="tab"
                  aria-selected={isSelected}
                  className={`appraisal-carousel-indicator__btn ${isSelected ? 'appraisal-carousel-indicator__btn--active' : ''}`}
                  onClick={() => scrollToOption(idx)}
                >
                  <span>{details.icon}</span>
                  <span>{idx + 1}. {details.shortTag}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleNext}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
              title="Next option"
            >
              ›
            </button>
          </div>
        )}

        {/* CARDS CONTAINER: SHARED CARD PRESENTATION LAYER */}
        <div
          data-testid="appraisal-cards-container"
          className={isCarouselMode ? "appraisal-cards-carousel" : "appraisal-cards-grid"}
          style={!isCarouselMode ? {
            display: 'grid',
            gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
            gap: isCompact ? '8px' : '12px',
            marginBottom: isCompact ? '6px' : '12px',
            alignItems: 'stretch'
          } : undefined}
        >
          {dilemma.options.map((opt, idx) => {
            const details = getOptionDetails(opt, hasSpace);
            const isSelected = selectedIdx === idx;
            const displayTitle = opt.title || t(`appraisalDilemma.option_${opt.type}.title`, { defaultValue: opt.title });
            const displayDesc = opt.description || t(`appraisalDilemma.option_${opt.type}.desc`, { defaultValue: opt.description });

            return (
              <CardView
                key={idx}
                ref={(el) => { cardRefs.current[idx] = el; }}
                testId={`appraisal-option-${idx}`}
                actionTarget={`appraisal-choice-${idx}`}
                className={`appraisal-card ${isCompact ? 'appraisal-card--compact' : ''}`}
                compact={isCompact}
                isSelected={isSelected}
                onSelect={() => {
                  setSelectedIdx(idx);
                  if (isCarouselMode) {
                    scrollToOption(idx);
                  } else {
                    onSelectOption(idx);
                  }
                }}
                onConfirm={() => onSelectOption(idx)}
                borderColor={details.borderColor}
                icon={details.icon}
                title={displayTitle}
                description={displayDesc}
                warning={details.warning}
                outcome={(details as any).outcomeNode || details.rewardText}
                outcomeLabel={isInitiative ? 'Modifiers' : 'Reward'}
                helpText={details.helpText}
                helpBtnTestId={`card-help-btn-${idx}`}
                helpPanelTestId={`card-help-panel-${idx}`}
                selectLabel="Select"
                confirmLabel="✓ Accept"
              />
            );
          })}
        </div>

        {/* Brainstorm Alternatives (Redraw) Option */}
        {isInitiative && onRedraw && !dilemma.hasRedrawn && (() => {
          const canAffordRedraw = (player?.hoursRemaining ?? 0) >= 1 && ((player?.mentalCondition ?? 50) - 1.0 >= 1.0);
          return (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px', marginBottom: '6px' }}>
              <button
                type="button"
                data-testid="btn-redraw-initiative"
                disabled={!canAffordRedraw}
                onClick={onRedraw}
                style={{
                  background: canAffordRedraw ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: canAffordRedraw ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: canAffordRedraw ? '#38bdf8' : '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: canAffordRedraw ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🔄</span>
                <span>{t('appraisalDilemma.redrawButton', { defaultValue: 'Brainstorm Alternatives (⏳ 1 hr, -1.0 🧠)' })}</span>
              </button>
            </div>
          );
        })()}

        {/* STICKY CAROUSEL CONFIRM BAR (When in mobile carousel mode) */}
        {isCarouselMode && (() => {
          const opt = dilemma.options[selectedIdx] || dilemma.options[0];
          const details = getOptionDetails(opt, hasSpace);
          const { borderColor, rewardText } = details;

          return (
            <div className="appraisal-confirm-bar">
              <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  {t('appraisalDilemma.chosenOptionPrompt', { defaultValue: 'Selected Option:' })}
                </div>
                <div style={{ fontSize: '0.84rem', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {opt.title}
                </div>
              </div>
              <button
                data-testid="btn-confirm-appraisal-choice"
                onClick={() => onSelectOption(selectedIdx)}
                style={{
                  background: borderColor,
                  color: '#000',
                  fontWeight: 'bold',
                  fontSize: '0.86rem',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: `0 0 10px ${borderColor}`,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  minHeight: '38px'
                }}
              >
                {t('appraisalDilemma.acceptAction', { defaultValue: 'Confirm' })} ({rewardText})
              </button>
            </div>
          );
        })()}
      </div>
    </div>,
    portalTarget
  );
}
