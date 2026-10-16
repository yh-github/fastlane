import React, { useState } from 'react';

export interface CardViewProps {
  id?: string;
  className?: string;
  testId?: string;
  actionTarget?: string;
  compact?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onConfirm?: () => void;

  // Visual Theme & Accents
  borderColor?: string;
  glow?: string;
  bgGradient?: string;

  // Header / Top Row
  badge?: React.ReactNode;
  badgeBg?: string;
  badgeColor?: string;
  topRightBadge?: React.ReactNode;
  topRightBadgeBg?: string;
  topRightBadgeColor?: string;

  // Per-Card Help
  helpText?: React.ReactNode;
  helpTitle?: string;
  helpBtnTestId?: string;
  helpPanelTestId?: string;

  // Artwork / Icon Frame
  icon: React.ReactNode;

  // Content
  title: string;
  description: string;
  warning?: React.ReactNode;

  // Outcome / Modifiers Box
  outcome: React.ReactNode;
  outcomeLabel?: string;

  // Action Button
  selectLabel?: string;
  confirmLabel?: string;
}

export const CardView = React.forwardRef<HTMLDivElement, CardViewProps>(({
  className = '',
  testId,
  actionTarget,
  compact = false,
  isSelected = false,
  onSelect,
  onConfirm,
  borderColor = '#38bdf8',
  glow,
  bgGradient,
  badge,
  badgeBg,
  badgeColor,
  topRightBadge,
  topRightBadgeBg,
  topRightBadgeColor,
  helpText,
  helpTitle,
  helpBtnTestId,
  helpPanelTestId,
  icon,
  title,
  description,
  warning,
  outcome,
  outcomeLabel = 'Modifiers',
  selectLabel = 'Select',
  confirmLabel = '✓ Accept'
}, ref) => {
  const [showHelp, setShowHelp] = useState(false);

  const defaultGlow = isSelected
    ? `0 0 16px ${borderColor}88, 0 4px 12px rgba(0, 0, 0, 0.5)`
    : '0 4px 12px rgba(0, 0, 0, 0.4)';

  const defaultBg = bgGradient || (isSelected
    ? 'linear-gradient(165deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)'
    : 'linear-gradient(165deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)');

  return (
    <div
      ref={ref}
      tabIndex={0}
      data-testid={testId}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (isSelected && onConfirm) {
            onConfirm();
          } else if (onSelect) {
            onSelect();
          }
        }
      }}
      className={`game-card ${className} ${isSelected ? 'game-card--selected' : ''}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        minWidth: compact ? '150px' : '200px',
        maxWidth: compact ? '260px' : '300px',
        minHeight: compact ? '210px' : '360px',
        padding: compact ? '8px 10px' : '14px 14px',
        borderRadius: compact ? '10px' : '14px',
        border: `2px solid ${borderColor}`,
        boxShadow: glow || defaultGlow,
        background: defaultBg,
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        transform: isSelected ? 'translateY(-3px) scale(1.02)' : 'none',
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
    >
      {/* TOP ROW: Optional Badge (Left) & Top-Right Badge / Per-Card Help (Right) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: compact ? '4px' : '8px',
        minHeight: compact ? '20px' : '24px'
      }}>
        {badge ? (
          <span style={{
            fontSize: compact ? '0.64rem' : '0.72rem',
            fontWeight: 'bold',
            letterSpacing: '0.08em',
            padding: compact ? '2px 6px' : '3px 8px',
            borderRadius: '6px',
            backgroundColor: badgeBg || 'rgba(255, 255, 255, 0.1)',
            color: badgeColor || '#fff',
            border: `1px solid ${borderColor || 'rgba(255, 255, 255, 0.2)'}`
          }}>
            {badge}
          </span>
        ) : <span />}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {topRightBadge && (
            <span style={{
              fontSize: compact ? '0.72rem' : '0.80rem',
              fontWeight: 'bold',
              padding: compact ? '2px 7px' : '3px 9px',
              borderRadius: '12px',
              backgroundColor: topRightBadgeBg || 'rgba(0, 0, 0, 0.5)',
              color: topRightBadgeColor || '#fff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              {topRightBadge}
            </span>
          )}

          {/* PER-CARD HELP BUTTON */}
          {helpText && (
            <button
              type="button"
              data-testid={helpBtnTestId || 'card-help-btn'}
              onClick={(e) => {
                e.stopPropagation();
                setShowHelp(prev => !prev);
              }}
              title={helpTitle || `Explain ${title}`}
              aria-label={helpTitle || `Explain ${title}`}
              style={{
                background: showHelp ? 'rgba(234, 179, 8, 0.35)' : 'rgba(255, 255, 255, 0.08)',
                border: `1px solid ${showHelp ? '#facc15' : 'rgba(255, 255, 255, 0.25)'}`,
                borderRadius: '50%',
                width: compact ? '20px' : '22px',
                height: compact ? '20px' : '22px',
                color: showHelp ? '#facc15' : '#cbd5e1',
                fontSize: compact ? '0.72rem' : '0.78rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                padding: 0,
                transition: 'all 0.15s ease'
              }}
            >
              ?
            </button>
          )}
        </div>
      </div>

      {/* CARD ARTWORK / ICON FRAME */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: compact ? '36px' : '64px',
        margin: compact ? '2px 0 6px' : '4px 0 10px',
        borderRadius: compact ? '8px' : '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        fontSize: compact ? '1.5rem' : '2.4rem'
      }}>
        <span role="img" aria-label="card icon">{icon}</span>
      </div>

      {/* CARD TITLE */}
      <h3 style={{
        margin: compact ? '0 0 4px' : '0 0 6px',
        fontSize: compact ? '0.86rem' : '1.0rem',
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        lineHeight: '1.2'
      }}>
        {title}
      </h3>

      {/* DESCRIPTION / FLUFF */}
      <p style={{
        fontSize: compact ? '0.69rem' : '0.78rem',
        lineHeight: compact ? '1.25' : '1.35',
        color: '#cbd5e1',
        fontStyle: 'italic',
        textAlign: 'center',
        margin: compact ? '0 0 4px' : '0 0 8px',
        padding: '0 2px',
        flex: 1,
        display: '-webkit-box',
        WebkitLineClamp: compact ? 2 : 4,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {description}
      </p>

      {/* WARNINGS */}
      {warning && (
        <div style={{
          fontSize: compact ? '0.66rem' : '0.72rem',
          color: '#ef4444',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: compact ? '4px' : '6px'
        }}>
          {warning}
        </div>
      )}

      {/* CARD FOOTER: MODIFIERS & ACTION BUTTON */}
      <div style={{ marginTop: 'auto' }}>
        {/* Outcome / Modifiers Box */}
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
          borderRadius: '8px',
          padding: compact ? '4px 6px' : '6px 8px',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: compact ? '6px' : '8px'
        }}>
          <div style={{
            fontSize: compact ? '0.60rem' : '0.66rem',
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {outcomeLabel}
          </div>
          <div style={{
            fontSize: compact ? '0.78rem' : '0.88rem',
            fontWeight: 'bold',
            color: '#f8fafc',
            marginTop: compact ? '1px' : '2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {outcome}
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          data-action-target={actionTarget}
          className="card-action-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (onConfirm) {
              onConfirm();
            } else if (onSelect) {
              onSelect();
            }
          }}
          style={{
            width: '100%',
            padding: compact ? '5px 8px' : '8px 12px',
            borderRadius: '8px',
            border: 'none',
            fontSize: compact ? '0.78rem' : '0.88rem',
            minHeight: compact ? '28px' : '36px',
            fontWeight: 'bold',
            cursor: 'pointer',
            backgroundColor: isSelected ? (borderColor || '#00e5ff') : 'rgba(255, 255, 255, 0.15)',
            color: isSelected ? '#000' : '#fff',
            boxShadow: isSelected ? `0 0 12px ${borderColor || 'rgba(0, 229, 255, 0.6)'}` : 'none',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          {isSelected ? confirmLabel : selectLabel}
        </button>
      </div>

      {/* PER-CARD INLINE HELP OVERLAY */}
      {showHelp && helpText && (
        <div
          data-testid={helpPanelTestId || 'card-help-panel'}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.97)',
            borderRadius: compact ? '10px' : '14px',
            padding: compact ? '10px' : '14px',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: `2px solid ${borderColor || '#eab308'}`,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8)',
            animation: 'fadeIn 0.15s ease',
            boxSizing: 'border-box',
            textAlign: 'left'
          }}
        >
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              paddingBottom: '4px'
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#facc15' }}>
                💡 {title}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHelp(false);
                }}
                aria-label="Close help"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  padding: '0 4px',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>
            <div style={{
              fontSize: compact ? '0.70rem' : '0.76rem',
              color: '#cbd5e1',
              lineHeight: '1.4',
              maxHeight: compact ? '135px' : '220px',
              overflowY: 'auto'
            }}>
              {helpText}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowHelp(false);
            }}
            style={{
              width: '100%',
              padding: '4px 8px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              fontSize: '0.74rem',
              cursor: 'pointer',
              marginTop: '6px'
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
});

CardView.displayName = 'CardView';
