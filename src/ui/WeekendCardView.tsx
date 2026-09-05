import React from 'react';
import { useTranslation } from 'react-i18next';
import type { WeekendCard } from '../engine/gameState';

interface WeekendCardViewProps {
  card: WeekendCard;
  isSelected: boolean;
  onSelect: () => void;
  onConfirm: () => void;
}

export const WeekendCardView: React.FC<WeekendCardViewProps> = ({
  card,
  isSelected,
  onSelect,
  onConfirm
}) => {
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
    if (card.costMax === 0) return '$0';
    if (card.costMin === card.costMax) return `$${card.costMin}`;
    return `$${card.costMin} – $${card.costMax}`;
  };

  const formatBonusText = () => {
    if (card.isSpecial) {
      return `+${card.potentialBonusMin}..+${card.potentialBonusMax} 🧠`;
    }
    if (card.type === 'clean') {
      return `-8..-12 🧹, -2 💪`;
    }
    if (card.type === 'rest') {
      return `+1 🧠, +2 🧹`;
    }
    if (!card.targetStat || card.potentialBonusMax === 0) {
      return t('weekendScreen.noBonusStat', { defaultValue: 'No extra bonus' });
    }
    const statIcon = card.targetStat === 'mental' ? '🧠' : card.targetStat === 'social' ? '👥' : '🤝';
    const statLabel = t(`weekendScreen.${card.targetStat}`, { defaultValue: card.targetStat });
    return `+${card.potentialBonusMin}..+${card.potentialBonusMax} ${statIcon} (${statLabel})`;
  };

  return (
    <div
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
      className={`weekend-card ${isSelected ? 'weekend-card--selected' : ''}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: '280px',
        minWidth: '220px',
        minHeight: '380px',
        padding: '16px',
        borderRadius: '16px',
        border: `3px solid ${tierStyles.border}`,
        boxShadow: tierStyles.glow,
        background: tierStyles.bgGradient,
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        transform: isSelected ? 'translateY(-6px) scale(1.03)' : 'none',
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
          marginBottom: '12px'
        }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 'bold',
            letterSpacing: '0.08em',
            padding: '3px 8px',
            borderRadius: '6px',
            backgroundColor: tierStyles.headerBg,
            color: tierStyles.headerColor,
            border: `1px solid ${tierStyles.border}`
          }}>
            {tierStyles.tierLabel}
          </span>

          <span style={{
            fontSize: '0.85rem',
            fontWeight: 'bold',
            padding: '3px 10px',
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
          height: '80px',
          margin: '8px 0 14px',
          borderRadius: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '2.8rem'
        }}>
          <span role="img" aria-label="card icon">{card.icon}</span>
        </div>

        {/* Card Title */}
        <h3 style={{
          margin: '0 0 8px',
          fontSize: '1.05rem',
          fontWeight: 'bold',
          color: '#ffffff',
          textAlign: 'center',
          lineHeight: '1.3'
        }}>
          {t(card.titleKey, { defaultValue: card.type === 'durable' ? 'Home Comfort' : card.type === 'ticket' ? 'Live Entertainment' : 'Weekend Activity' })}
        </h3>

        {/* Fluff Narrative */}
        <p style={{
          fontSize: '0.85rem',
          lineHeight: '1.4',
          color: '#cbd5e1',
          fontStyle: 'italic',
          textAlign: 'center',
          margin: '0 0 14px',
          padding: '0 4px',
          minHeight: '60px'
        }}>
          "{card.fluff}"
        </p>
      </div>

      {/* Card Footer: Potential Modifier & Choose Button */}
      <div style={{ marginTop: 'auto' }}>
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
          borderRadius: '8px',
          padding: '8px 10px',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '12px'
        }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('weekendScreen.potentialOutcome', { defaultValue: 'Potential Outcome' })}
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#f8fafc', marginTop: '3px' }}>
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
            padding: '10px 14px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.95rem',
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
};
