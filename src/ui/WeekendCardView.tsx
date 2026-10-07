import React from 'react';
import { useTranslation } from 'react-i18next';
import type { WeekendCard } from '../engine/gameState';
import { MessIcon } from './icons/MessIcon';

interface WeekendCardViewProps {
  card: WeekendCard;
  isSelected: boolean;
  onSelect: () => void;
  onConfirm: () => void;
  compact?: boolean;
}

export const WeekendCardView = React.forwardRef<HTMLDivElement, WeekendCardViewProps>(({
  card,
  isSelected,
  onSelect,
  onConfirm,
  compact = false
}, ref) => {
  const { t } = useTranslation();

  // Tier color styling
  const tierStyles = (() => {
    switch (card.tier) {
      case 'expensive':
        return {
          border: isSelected ? '#fbbf24' : '#b45309',
          glow: isSelected ? '0 0 20px rgba(251, 191, 36, 0.6)' : '0 4px 12px rgba(0, 0, 0, 0.5)',
          bgGradient: 'linear-gradient(165deg, #2a1538 0%, #170d24 100%)',
          headerBg: 'rgba(251, 191, 36, 0.15)',
          headerColor: '#fbbf24',
          tierLabel: t('weekendScreen.tierExpensive', { defaultValue: 'EXPENSIVE' }),
          costBadgeBg: '#78350f',
          costBadgeColor: '#fef3c7'
        };
      case 'medium':
        return {
          border: isSelected ? '#38bdf8' : '#0284c7',
          glow: isSelected ? '0 0 20px rgba(56, 189, 248, 0.6)' : '0 4px 12px rgba(0, 0, 0, 0.5)',
          bgGradient: 'linear-gradient(165deg, #0c213b 0%, #06111f 100%)',
          headerBg: 'rgba(56, 189, 248, 0.15)',
          headerColor: '#38bdf8',
          tierLabel: t('weekendScreen.tierMedium', { defaultValue: 'MEDIUM' }),
          costBadgeBg: '#075985',
          costBadgeColor: '#e0f2fe'
        };
      case 'cheap':
        return {
          border: isSelected ? '#fb923c' : '#c2410c',
          glow: isSelected ? '0 0 20px rgba(251, 146, 60, 0.6)' : '0 4px 12px rgba(0, 0, 0, 0.5)',
          bgGradient: 'linear-gradient(165deg, #2c1b12 0%, #180d07 100%)',
          headerBg: 'rgba(251, 146, 60, 0.15)',
          headerColor: '#fb923c',
          tierLabel: t('weekendScreen.tierCheap', { defaultValue: 'CHEAP' }),
          costBadgeBg: '#7c2d12',
          costBadgeColor: '#ffedd5'
        };
      case 'free':
      default:
        return {
          border: isSelected ? '#34d399' : '#059669',
          glow: isSelected ? '0 0 20px rgba(52, 211, 153, 0.6)' : '0 4px 12px rgba(0, 0, 0, 0.5)',
          bgGradient: 'linear-gradient(165deg, #0f2c1d 0%, #06160e 100%)',
          headerBg: 'rgba(52, 211, 153, 0.15)',
          headerColor: '#34d399',
          tierLabel: t('weekendScreen.tierFree', { defaultValue: 'FREE' }),
          costBadgeBg: '#064e3b',
          costBadgeColor: '#d1fae5'
        };
    }
  })();

  const formatCostRange = () => {
    if (card.type === 'ticket_resale') {
      return `+$${card.resalePayout || 0}`;
    }
    if (card.costMax === 0) return '$0';
    if (card.costMin === card.costMax) return `$${card.costMin}`;
    return `$${card.costMin} – $${card.costMax}`;
  };

  const formatBonusText = () => {
    if (card.type === 'ticket_resale') {
      return `+$${card.resalePayout || 0} Cash`;
    }
    if (card.isSpecial) {
      return `+${card.potentialBonusMin}..+${card.potentialBonusMax} 🧠`;
    }
    if (card.type === 'clean') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          -8..-12 <MessIcon />, -1 💪
        </span>
      );
    }
    if (card.type === 'rest') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          +2 🧠, +1 💪, +2 <MessIcon />
        </span>
      );
    }
    if (card.type === 'walk') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          +2 💪, +2 <MessIcon />
        </span>
      );
    }
    if (card.type === 'chat') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          +2 👥, +2 <MessIcon />
        </span>
      );
    }
    if (card.type === 'ticket' && card.secondaryStat) {
      const p1 = (card.potentialBonusMax !== undefined && card.potentialBonusMax !== card.potentialBonusMin)
        ? `+${card.potentialBonusMin}..+${card.potentialBonusMax}`
        : `+${card.potentialBonusMin}`;
      const p2 = (card.potentialSecondaryBonusMax !== undefined && card.potentialSecondaryBonusMax !== card.potentialSecondaryBonusMin)
        ? `+${card.potentialSecondaryBonusMin}..+${card.potentialSecondaryBonusMax}`
        : `+${card.potentialSecondaryBonusMin}`;
      const countNote = card.ticketCount && card.ticketCount > 1 ? ` (${card.ticketCount} Tickets)` : '';
      return `${p1} 🧠, ${p2} 👥${countNote}`;
    }
    if (!card.targetStat || card.potentialBonusMax === 0) {
      return t('weekendScreen.noBonusStat', { defaultValue: 'No extra bonus' });
    }
    const statIcon = card.targetStat === 'mental' ? '🧠' : card.targetStat === 'social' ? '👥' : card.targetStat === 'physical' ? '💪' : '🤝';
    const statLabel = t(`weekendScreen.${card.targetStat}`, { defaultValue: card.targetStat });
    return `+${card.potentialBonusMin}..+${card.potentialBonusMax} ${statIcon} (${statLabel})`;
  };

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (isSelected) onConfirm();
          else onSelect();
        }
      }}
      className={`weekend-card ${compact ? 'weekend-card--compact' : ''} ${isSelected ? 'weekend-card--selected' : ''}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: compact ? '240px' : '280px',
        minWidth: compact ? '160px' : '220px',
        minHeight: compact ? '210px' : '380px',
        padding: compact ? '10px 12px' : '16px',
        borderRadius: compact ? '12px' : '16px',
        border: `3px solid ${tierStyles.border}`,
        boxShadow: tierStyles.glow,
        background: tierStyles.bgGradient,
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        transform: isSelected ? 'translateY(-4px) scale(1.02)' : 'none',
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
    >
      {/* Top Banner: Tier & Cost */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: compact ? '6px' : '12px'
        }}>
          <span style={{
            fontSize: compact ? '0.68rem' : '0.75rem',
            fontWeight: 'bold',
            letterSpacing: '0.08em',
            padding: compact ? '2px 6px' : '3px 8px',
            borderRadius: '6px',
            backgroundColor: tierStyles.headerBg,
            color: tierStyles.headerColor,
            border: `1px solid ${tierStyles.border}`
          }}>
            {tierStyles.tierLabel}
          </span>

          <span style={{
            fontSize: compact ? '0.78rem' : '0.85rem',
            fontWeight: 'bold',
            padding: compact ? '2px 8px' : '3px 10px',
            borderRadius: '12px',
            backgroundColor: tierStyles.costBadgeBg,
            color: tierStyles.costBadgeColor,
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            {formatCostRange()}
          </span>
        </div>

        {/* Card Artwork / Icon Frame */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: compact ? '36px' : '80px',
          margin: compact ? '4px 0 6px' : '8px 0 14px',
          borderRadius: compact ? '8px' : '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: compact ? '1.5rem' : '2.8rem'
        }}>
          <span role="img" aria-label="card icon">{card.icon}</span>
        </div>

        {/* Card Title */}
        <h3 style={{
          margin: compact ? '0 0 4px' : '0 0 8px',
          fontSize: compact ? '0.92rem' : '1.05rem',
          fontWeight: 'bold',
          color: '#ffffff',
          textAlign: 'center',
          lineHeight: '1.2'
        }}>
          {t(card.titleKey, { defaultValue: card.type === 'durable' ? 'Home Comfort' : card.type === 'ticket' ? 'Live Entertainment' : 'Weekend Activity' })}
        </h3>

        {/* Fluff Narrative */}
        <p style={{
          fontSize: compact ? '0.74rem' : '0.85rem',
          lineHeight: compact ? '1.3' : '1.4',
          color: '#cbd5e1',
          fontStyle: 'italic',
          textAlign: 'center',
          margin: compact ? '0 0 6px' : '0 0 14px',
          padding: '0 4px',
          minHeight: compact ? 'auto' : '60px',
          maxHeight: compact ? '28px' : undefined,
          overflow: compact ? 'hidden' : undefined,
          display: compact ? '-webkit-box' : undefined,
          WebkitLineClamp: compact ? 2 : undefined,
          WebkitBoxOrient: compact ? 'vertical' : undefined
        }}>
          "{card.fluff}"
        </p>
      </div>

      {/* Card Footer: Potential Modifier & Choose Button */}
      <div style={{ marginTop: 'auto' }}>
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
          borderRadius: '8px',
          padding: compact ? '4px 8px' : '8px 10px',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: compact ? '6px' : '12px'
        }}>
          <div style={{ fontSize: compact ? '0.65rem' : '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('weekendScreen.potentialOutcome', { defaultValue: 'Potential Outcome' })}
          </div>
          <div style={{ fontSize: compact ? '0.82rem' : '0.9rem', fontWeight: 'bold', color: '#f8fafc', marginTop: compact ? '1px' : '3px' }}>
            {formatBonusText()}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConfirm();
          }}
          style={{
            width: '100%',
            padding: compact ? '6px 10px' : '10px 14px',
            borderRadius: '8px',
            border: 'none',
            fontSize: compact ? '0.84rem' : '0.95rem',
            minHeight: compact ? '32px' : '40px',
            fontWeight: 'bold',
            cursor: 'pointer',
            backgroundColor: isSelected ? '#00e5ff' : 'rgba(255, 255, 255, 0.15)',
            color: isSelected ? '#000' : '#fff',
            boxShadow: isSelected ? '0 0 12px rgba(0, 229, 255, 0.6)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          {isSelected
            ? t('weekendScreen.chooseThisActivity', { defaultValue: '✓ Choose This Activity' })
            : t('weekendScreen.selectCard', { defaultValue: 'Select' })}
        </button>
      </div>
    </div>
  );
});

WeekendCardView.displayName = 'WeekendCardView';
