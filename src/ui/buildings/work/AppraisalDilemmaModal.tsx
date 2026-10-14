import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { AppraisalDilemmaState, PlayerState } from '../../../engine/gameState';
import type { CampaignBundle } from '../../../engine/dataLoader';
import { calcUsedSpace, calcHousingSpaceCap } from '../../../engine/statMath';

interface AppraisalDilemmaModalProps {
  dilemma: AppraisalDilemmaState;
  onSelectOption: (index: number) => void;
  player?: PlayerState;
  campaign?: CampaignBundle;
  compact?: boolean;
}

function getOptionRewardDetails(opt: any, hasSpace: boolean) {
  let icon = opt.icon || '💵';
  let borderColor = '#22c55e';
  let rewardText = `+$${opt.cashAmount || 0}`;
  let shortTag = 'Cash';

  if (opt.type === 'initiative') {
    shortTag = opt.badge || 'Initiative';
    if (opt.badge === 'LEADERSHIP') borderColor = '#38bdf8';
    else if (opt.badge === 'TECHNICAL') borderColor = '#10b981';
    else if (opt.badge === 'ETHICS') borderColor = '#a855f7';
    else if (opt.badge === 'BOUNTY') borderColor = '#22c55e';
    else if (opt.badge === 'EXPENSIVE') borderColor = '#ef4444';
    else borderColor = '#f59e0b';

    const parts: string[] = [];
    if (opt.standingAmount) parts.push(`+${opt.standingAmount} 🌟`);
    if (opt.cashAmount) parts.push(`+$${opt.cashAmount}`);
    if (opt.cashCost) parts.push(`-$${opt.cashCost}`);
    if (opt.expAmount) parts.push(`+${opt.expAmount} 👌`);
    if (opt.depAmount) parts.push(`+${opt.depAmount} 🤝`);
    if (opt.leadershipSkillAmount) parts.push(`+${opt.leadershipSkillAmount} 👔`);
    if (opt.techSkillAmount) parts.push(`+${opt.techSkillAmount} 🔧`);
    if (opt.mentalAmount && opt.mentalAmount > 0) parts.push(`+${opt.mentalAmount} 🧠`);
    if (opt.mentalAmount && opt.mentalAmount < 0) parts.push(`${opt.mentalAmount} 🧠`);
    if (opt.socialAmount && opt.socialAmount < 0) parts.push(`${opt.socialAmount} 👥`);
    if (opt.physicalAmount && opt.physicalAmount < 0) parts.push(`${opt.physicalAmount} 💪`);
    rewardText = parts.length > 0 ? parts.join(', ') : 'Select';
  } else if (opt.type === 'standing') {
    icon = '⭐';
    borderColor = '#38bdf8';
    shortTag = 'Standing';
    rewardText = `+${opt.depAmount || 0} 🤝${opt.mentalAmount ? `, +${opt.mentalAmount} 🧠` : ''}`;
  } else if (opt.type === 'item') {
    icon = opt.itemType === 'spare_parts' ? '⚙️' : '🏺';
    shortTag = opt.itemType === 'spare_parts' ? 'Parts' : 'Curio';
    if (hasSpace) {
      borderColor = '#a855f7';
      rewardText = opt.itemType === 'spare_parts' ? '1x Spare Parts' : '1x Knick-Knack';
    } else {
      borderColor = '#f59e0b';
      rewardText = opt.itemType === 'spare_parts' ? 'Auto-Pawn (+$10)' : 'Auto-Pawn (+$15)';
    }
  } else if (opt.type === 'skill') {
    icon = '🔧';
    borderColor = '#f59e0b';
    shortTag = 'Tech';
    rewardText = `+${opt.techSkillAmount || 0} 🔧${opt.mentalAmount ? `, +${opt.mentalAmount} 🧠` : ''}`;
  }

  return { icon, borderColor, rewardText, shortTag };
}

export function AppraisalDilemmaModal({
  dilemma,
  onSelectOption,
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
  const [showHelp, setShowHelp] = useState<boolean>(false);
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

  // Touch carousel check: narrow mobile width (< 640px) or width too small to fit compact cards side-by-side
  const neededWidthForCompactRow = count * 115 + (count - 1) * 8 + 48;
  const isCarouselMode = count > 2 && (dimensions.width < 640 || dimensions.width < neededWidthForCompactRow);

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

  return createPortal(
    <div
      className="building-modal-overlay"
      data-testid="appraisal-dilemma-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t('appraisalDilemma.title', { defaultValue: 'Appraisal Dilemma' })}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        zIndex: 9999,
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
          padding: isCompact ? '12px 14px' : '22px 24px',
          borderRadius: isCompact ? '10px' : '12px',
          width: isCarouselMode ? 'min(580px, 96vw)' : (isCompact ? 'min(780px, 96vw)' : '680px'),
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
        {/* HEADER */}
        {(() => {
          const isInitiative = dilemma.gameType === 'work_initiative';
          const modalTitle = isInitiative
            ? (dilemma.title || t('appraisalDilemma.initiativeTitle', { defaultValue: 'Workplace Initiative' }))
            : t('appraisalDilemma.title', { defaultValue: 'Appraisal Dilemma' });
          const headerIcons = isInitiative ? '🌟 👔 👌' : '🔍 ⚖️ 🏷️';

          return isCompact ? (
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.25rem' }}>{headerIcons}</span>
                <h3 style={{ margin: 0, color: '#facc15', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  {modalTitle}
                </h3>
                <button
                  type="button"
                  data-testid="appraisal-help-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHelp(prev => !prev);
                  }}
                  title={isInitiative ? "Explain initiative options and icons" : "Appraisal Help"}
                  style={{
                    background: showHelp ? 'rgba(234, 179, 8, 0.35)' : 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(234, 179, 8, 0.5)',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    color: '#facc15',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '4px',
                    lineHeight: '1'
                  }}
                >
                  ?
                </button>
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
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '4px' }}>{headerIcons}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <h2 style={{ margin: '0 0 4px 0', color: '#facc15', fontSize: '1.35rem' }}>
                  {modalTitle}
                </h2>
                <button
                  type="button"
                  data-testid="appraisal-help-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHelp(prev => !prev);
                  }}
                  title={isInitiative ? "Explain initiative options and icons" : "Appraisal Help"}
                  style={{
                    background: showHelp ? 'rgba(234, 179, 8, 0.35)' : 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(234, 179, 8, 0.5)',
                    borderRadius: '50%',
                    width: '22px',
                    height: '22px',
                    color: '#facc15',
                    fontSize: '0.80rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: '1'
                  }}
                >
                  ?
                </button>
              </div>
              <div style={{ fontSize: '0.95rem', color: '#94a3b8' }}>
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
          );
        })()}

        {/* HELP POPUP / EXPLANATION PANEL */}
        {showHelp && (
          <div
            data-testid="appraisal-help-panel"
            style={{
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1.5px solid #eab308',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '10px',
              fontSize: '0.78rem',
              lineHeight: '1.4',
              color: '#cbd5e1',
              boxShadow: '0 4px 16px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: 'bold', color: '#facc15' }}>💡 {dilemma.gameType === 'work_initiative' ? 'Workplace Initiative Guide' : 'Appraisal Guide'}</span>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', padding: 0 }}
              >
                ✕
              </button>
            </div>
            {dilemma.gameType === 'work_initiative' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>👌 Experience:</strong> Builds on-the-job mastery towards promotions.</div>
                <div><strong>👔 Leadership:</strong> Advances managerial competency for management positions.</div>
                <div><strong>🔧 Tech Skill:</strong> Develops technical proficiency for specialist roles and DIY repairs.</div>
                <div><strong>🤝 Dependability:</strong> Proves reliability to prevent demerits and qualify for raises.</div>
                <div><strong>🌟 Workplace Standing:</strong> Local reputation improving employability and raise prospects.</div>
                <div><strong>💵 Cash Bounty:</strong> Immediate earnings from client efficiency and quotas.</div>
                <div><strong>🧠 Ethics & Integrity:</strong> Dedicated craft restoring Mental condition.</div>
                <div><strong>⚠️ High-Stakes Sprint:</strong> Heavy workload sprint granting large skill/experience bonuses, but drains Mental condition and risks burnout.</div>
              </div>
            ) : (
              <div>Choose how to handle the customer item based on appraisal value and apartment space.</div>
            )}
          </div>
        )}

        {/* TOUCH CAROUSEL PILL NAVIGATION (when carousel is active) */}
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
              const details = getOptionRewardDetails(opt, hasSpace);
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

        {/* CARDS CONTAINER: CAROUSEL VS SIDE-BY-SIDE GRID */}
        <div
          data-testid="appraisal-cards-container"
          className={isCarouselMode ? "appraisal-cards-carousel" : "appraisal-cards-grid"}
          style={!isCarouselMode ? {
            display: 'grid',
            gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
            gap: isCompact ? '8px' : '12px',
            marginBottom: isCompact ? '6px' : '14px',
            alignItems: 'stretch'
          } : undefined}
        >
          {dilemma.options.map((opt, idx) => {
            const details = getOptionRewardDetails(opt, hasSpace);
            const { icon, borderColor, rewardText } = details;
            const isItemFull = opt.type === 'item' && !hasSpace;

            const isSelected = selectedIdx === idx;
            const displayTitle = opt.title || t(`appraisalDilemma.option_${opt.type}.title`, { defaultValue: opt.title });
            const displayDesc = opt.description || t(`appraisalDilemma.option_${opt.type}.desc`, { defaultValue: opt.description });

            return (
              <div
                key={idx}
                ref={(el) => { cardRefs.current[idx] = el; }}
                data-testid={`appraisal-option-${idx}`}
                className={`appraisal-card ${isCompact ? 'appraisal-card--compact' : ''}`}
                onClick={() => {
                  if (isCarouselMode) {
                    scrollToOption(idx);
                  } else {
                    onSelectOption(idx);
                  }
                }}
                style={{
                  background: isSelected && isCarouselMode
                    ? 'linear-gradient(165deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)'
                    : 'linear-gradient(165deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  border: isSelected
                    ? `2px solid ${borderColor}`
                    : `1.5px solid ${borderColor}66`,
                  borderRadius: isCompact ? '8px' : '10px',
                  padding: isCompact ? '8px 8px' : '14px 12px',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: isCompact ? '4px' : '8px',
                  boxShadow: isSelected
                    ? `0 0 16px ${borderColor}55, 0 4px 12px rgba(0,0,0,0.5)`
                    : '0 2px 8px rgba(0,0,0,0.4)',
                  textAlign: 'center',
                  boxSizing: 'border-box'
                }}
              >
                {/* Badge if present */}
                {opt.badge && (
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: `${borderColor}22`,
                    color: borderColor,
                    border: `1px solid ${borderColor}55`,
                    marginBottom: '2px',
                    display: 'inline-block'
                  }}>
                    {opt.badge}
                  </span>
                )}

                {/* Icon & Title */}
                <div>
                  {!isInitiative && (
                    <div style={{ fontSize: isCompact ? '1.35rem' : '1.9rem', lineHeight: '1.1' }}>
                      {icon}
                    </div>
                  )}
                  <div style={{
                    fontWeight: 'bold',
                    fontSize: isCompact ? '0.82rem' : '0.94rem',
                    color: '#f8fafc',
                    marginTop: '2px',
                    lineHeight: '1.2'
                  }}>
                    {displayTitle}
                  </div>
                </div>

                {/* Description */}
                <div style={{
                  fontSize: isCompact ? '0.70rem' : '0.78rem',
                  color: '#94a3b8',
                  lineHeight: '1.25',
                  flex: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: isCompact ? 2 : 4,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {displayDesc}
                  {isItemFull && (
                    <div style={{ color: '#f59e0b', fontSize: '0.66rem', marginTop: '2px', fontWeight: 'bold' }}>
                      ⚠️ {t('appraisalDilemma.apartmentFullNotice', { defaultValue: 'Auto-pawn scrap cash' })}
                    </div>
                  )}
                  {opt.burnoutRisk && (
                    <div style={{ color: '#ef4444', fontSize: '0.66rem', marginTop: '2px', fontWeight: 'bold' }}>
                      ⚠️ High Burnout & Mistake Risk
                    </div>
                  )}
                </div>

                {/* Reward Badge / Action Button */}
                <button
                  type="button"
                  title={rewardText}
                  data-action-target={`appraisal-choice-${idx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectOption(idx);
                  }}
                  style={{
                    marginTop: isCompact ? '2px' : '6px',
                    fontWeight: 'bold',
                    fontSize: isCompact ? '0.78rem' : '0.88rem',
                    color: '#000',
                    background: borderColor,
                    padding: isCompact ? '4px 6px' : '7px 10px',
                    borderRadius: '5px',
                    width: '100%',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: `0 2px 8px ${borderColor}44`,
                    transition: 'all 0.15s ease',
                    minHeight: isCompact ? '30px' : '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isCarouselMode
                    ? (isSelected ? `✓ Select (${rewardText})` : rewardText)
                    : (isCompact ? rewardText : `Accept (${rewardText})`)}
                </button>
              </div>
            );
          })}
        </div>

        {/* STICKY CAROUSEL CONFIRM BAR (When in mobile carousel mode) */}
        {isCarouselMode && (() => {
          const opt = dilemma.options[selectedIdx] || dilemma.options[0];
          const details = getOptionRewardDetails(opt, hasSpace);
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
    document.body
  );
}

