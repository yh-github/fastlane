import React from 'react';
import { useTranslation } from 'react-i18next';
import type { WeekendCard } from '../engine/gameState';
import { MessIcon } from './icons/MessIcon';
import { CardView } from './CardView';

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
    <CardView
      ref={ref}
      className={`weekend-card ${compact ? 'weekend-card--compact' : ''} ${isSelected ? 'weekend-card--selected' : ''}`}
      compact={compact}
      isSelected={isSelected}
      onSelect={onSelect}
      onConfirm={onConfirm}
      badge={tierStyles.tierLabel}
      badgeBg={tierStyles.headerBg}
      badgeColor={tierStyles.headerColor}
      topRightBadge={formatCostRange()}
      topRightBadgeBg={tierStyles.costBadgeBg}
      topRightBadgeColor={tierStyles.costBadgeColor}
      borderColor={tierStyles.border}
      glow={tierStyles.glow}
      bgGradient={tierStyles.bgGradient}
      icon={card.icon}
      title={t(card.titleKey, {
        defaultValue: card.type === 'durable'
          ? 'Home Comfort'
          : card.type === 'ticket'
            ? 'Live Entertainment'
            : 'Weekend Activity'
      })}
      description={`"${card.fluff}"`}
      outcome={formatBonusText()}
      outcomeLabel={t('weekendScreen.potentialOutcome', { defaultValue: 'Potential Outcome' })}
      selectLabel={t('weekendScreen.selectCard', { defaultValue: 'Select' })}
      confirmLabel={t('weekendScreen.chooseThisActivity', { defaultValue: '✓ Choose This Activity' })}
    />
  );
});

WeekendCardView.displayName = 'WeekendCardView';
