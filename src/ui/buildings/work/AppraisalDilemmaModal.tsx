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
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

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
        {isCompact ? (
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.25rem' }}>🔍 ⚖️</span>
              <h3 style={{ margin: 0, color: '#facc15', fontSize: '1.1rem', fontWeight: 'bold' }}>
                {t('appraisalDilemma.title', { defaultValue: 'Appraisal Dilemma' })}
              </h3>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
              {t('appraisalDilemma.subtitle', { defaultValue: 'A customer brought in:' })}{' '}
              <strong style={{ color: '#fef08a' }}>{dilemma.itemTitle}</strong>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '4px' }}>🔍 ⚖️ 🏷️</div>
            <h2 style={{ margin: '0 0 4px 0', color: '#facc15', fontSize: '1.35rem' }}>
              {t('appraisalDilemma.title', { defaultValue: 'Appraisal Dilemma' })}
            </h2>
            <div style={{ fontSize: '0.95rem', color: '#94a3b8' }}>
              {t('appraisalDilemma.subtitle', { defaultValue: 'A customer brought in:' })}{' '}
              <strong style={{ color: '#e2e8f0' }}>{dilemma.itemTitle}</strong>
            </div>
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
              const icon = opt.type === 'standing'
                ? '⭐'
                : (opt.type === 'item'
                    ? (opt.itemType === 'spare_parts' ? '⚙️' : '🏺')
                    : (opt.type === 'skill' ? '🔬' : '💵'));
              const shortTag = opt.type === 'standing'
                ? 'Standing'
                : (opt.type === 'item'
                    ? (opt.itemType === 'spare_parts' ? 'Parts' : 'Curio')
                    : (opt.type === 'skill' ? 'Tech' : 'Cash'));
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
                  <span>{icon}</span>
                  <span>{idx + 1}. {shortTag}</span>
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
            let icon = '💵';
            let borderColor = '#22c55e';
            let rewardText = `+$${opt.cashAmount}`;
            let isItemFull = false;

            if (opt.type === 'standing') {
              icon = '⭐';
              borderColor = '#38bdf8';
              rewardText = `+${opt.depAmount || 0} Dep${opt.mentalAmount ? `, +${opt.mentalAmount} 🧠` : ''}`;
            } else if (opt.type === 'item') {
              icon = opt.itemType === 'spare_parts' ? '⚙️' : '🏺';
              if (hasSpace) {
                borderColor = '#a855f7';
                rewardText = opt.itemType === 'spare_parts' ? '1x Spare Parts' : '1x Knick-Knack';
              } else {
                isItemFull = true;
                borderColor = '#f59e0b';
                rewardText = opt.itemType === 'spare_parts' ? 'Auto-Pawn (+$10)' : 'Auto-Pawn (+$15)';
              }
            } else if (opt.type === 'skill') {
              icon = '🔬';
              borderColor = '#f59e0b';
              rewardText = `+${opt.techSkillAmount || 0} Tech${opt.mentalAmount ? `, +${opt.mentalAmount} 🧠` : ''}`;
            }

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
                {/* Icon & Title */}
                <div>
                  <div style={{ fontSize: isCompact ? '1.35rem' : '1.9rem', lineHeight: '1.1' }}>
                    {icon}
                  </div>
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
                </div>

                {/* Reward Badge / Action Button */}
                <button
                  type="button"
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
          let borderColor = '#22c55e';
          let rewardText = `+$${opt.cashAmount}`;
          if (opt.type === 'standing') {
            borderColor = '#38bdf8';
            rewardText = `+${opt.depAmount || 0} Dep${opt.mentalAmount ? `, +${opt.mentalAmount} 🧠` : ''}`;
          } else if (opt.type === 'item') {
            borderColor = hasSpace ? '#a855f7' : '#f59e0b';
            rewardText = hasSpace
              ? (opt.itemType === 'spare_parts' ? '1x Spare Parts' : '1x Knick-Knack')
              : (opt.itemType === 'spare_parts' ? 'Auto-Pawn (+$10)' : 'Auto-Pawn (+$15)');
          } else if (opt.type === 'skill') {
            borderColor = '#f59e0b';
            rewardText = `+${opt.techSkillAmount || 0} Tech${opt.mentalAmount ? `, +${opt.mentalAmount} 🧠` : ''}`;
          }

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

