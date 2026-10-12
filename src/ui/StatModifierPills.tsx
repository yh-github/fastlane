import React from 'react';
import { useTranslation } from 'react-i18next';
import type { StatModification } from '../engine/gameState';
import { MessIcon } from './icons/MessIcon';

export interface StatModifierPillsProps {
  modifications?: StatModification[];
  isHelpfulUI?: boolean;
  className?: string;
  style?: React.CSSProperties;
  align?: 'center' | 'start' | 'end';
}

export const StatModifierPills: React.FC<StatModifierPillsProps> = ({
  modifications = [],
  isHelpfulUI = true,
  className = '',
  style,
  align = 'center'
}) => {
  const { t } = useTranslation();

  const getStatInfo = (stat: string) => {
    switch (stat) {
      case 'money':
        return { icon: '$', label: t('stats.money', { defaultValue: 'Money' }) };
      case 'mental':
      case 'mentalCondition':
        return { icon: '🧠', label: t('stats.mental', { defaultValue: 'Mental Condition' }) };
      case 'physical':
      case 'physicalCondition':
        return { icon: '💪', label: t('stats.physical', { defaultValue: 'Physical Condition' }) };
      case 'dependability':
        return { icon: '🤝', label: t('stats.dependability', { defaultValue: 'Dependability' }) };
      case 'mess':
        return { icon: <MessIcon />, label: t('stats.mess', { defaultValue: 'Apartment Mess' }) };
      case 'social':
        return { icon: '👥', label: t('stats.social', { defaultValue: 'Social Standing' }) };
      case 'happiness':
        return { icon: '😊', label: t('stats.happiness', { defaultValue: 'Happiness' }) };
      case 'relaxation':
        return { icon: '🛌', label: t('stats.relaxation', { defaultValue: 'Relaxation' }) };
      case 'skillTech':
        return { icon: '💻', label: t('stats.skillTech', { defaultValue: 'Tech Skill' }) };
      case 'skillMgmt':
        return { icon: '📈', label: t('stats.skillMgmt', { defaultValue: 'Management Skill' }) };
      case 'lifestyle':
        return { icon: '😎', label: t('stats.lifestyle', { defaultValue: 'Lifestyle' }) };
      case 'loanDebt':
        return { icon: '🏦', label: t('stats.loanDebt', { defaultValue: 'Loan Debt' }) };
      case 'rentDebt':
        return { icon: '🏢', label: t('stats.rentDebt', { defaultValue: 'Rent Debt' }) };
      case 'time':
      case 'hours':
        return { icon: '⏰', label: t('stats.time', { defaultValue: 'Time' }) };
      default:
        return { icon: '', label: stat };
    }
  };

  const filteredMods = modifications.filter(mod => {
    if (mod.diff === 0) return false;
    if (isHelpfulUI) return true;
    return mod.stat === 'money' || mod.stat === 'loanDebt' || mod.stat === 'rentDebt';
  });

  if (filteredMods.length === 0) {
    return null;
  }

  const justifyMap = {
    center: 'center',
    start: 'flex-start',
    end: 'flex-end'
  };

  return (
    <div
      data-testid="stat-modifier-pills"
      className={`stat-modifier-pills ${className}`}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        justifyContent: justifyMap[align],
        alignItems: 'center',
        margin: '12px 0',
        ...style
      }}
    >
      {filteredMods.map((mod, idx) => {
        const info = getStatInfo(mod.stat);
        const isMoney = mod.stat === 'money';
        const isDebt = mod.stat === 'loanDebt' || mod.stat === 'rentDebt';

        let textSummary: string;
        let text: React.ReactNode;

        if (isMoney) {
          const sign = mod.diff > 0 ? '+' : '-';
          textSummary = `${sign}$${Math.abs(mod.diff)}`;
          text = textSummary;
        } else if (isDebt) {
          const sign = mod.diff > 0 ? '+' : '-';
          textSummary = `${sign}$${Math.abs(mod.diff)} ${info.label}`;
          text = (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {sign}${Math.abs(mod.diff)} {info.icon}
            </span>
          );
        } else {
          const sign = mod.diff > 0 ? '+' : '';
          textSummary = `${sign}${mod.diff} ${info.label}`;
          text = info.icon ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {sign}{mod.diff} {info.icon}
            </span>
          ) : textSummary;
        }

        let isPositive = false;
        let isNegative = false;

        if (isMoney) {
          if (mod.diff < 0) isNegative = true;
          else if (mod.diff > 0) isPositive = true;
        } else if (mod.stat === 'mess' || isDebt) {
          // Increase in mess or debt is negative
          if (mod.diff > 0) isNegative = true;
          else if (mod.diff < 0) isPositive = true;
        } else {
          if (mod.diff > 0) isPositive = true;
          else if (mod.diff < 0) isNegative = true;
        }

        let color = '#94a3b8';
        let bg = 'rgba(148, 163, 184, 0.15)';
        let border = '1px solid rgba(148, 163, 184, 0.3)';

        if (isPositive) {
          color = '#4ade80';
          bg = 'rgba(74, 222, 128, 0.18)';
          border = '1px solid rgba(74, 222, 128, 0.35)';
        } else if (isNegative) {
          color = mod.stat === 'mess' ? '#fb923c' : '#f87171';
          bg = mod.stat === 'mess' ? 'rgba(251, 146, 60, 0.18)' : 'rgba(248, 113, 113, 0.18)';
          border = mod.stat === 'mess' ? '1px solid rgba(251, 146, 60, 0.35)' : '1px solid rgba(248, 113, 113, 0.35)';
        }

        let tooltip = info.label;
        if (mod.breakdown && mod.breakdown.length > 0) {
          const breakdownParts = mod.breakdown.map(b => {
            const bSign = b.diff > 0 ? '+' : '';
            return `${b.source}: ${bSign}${b.diff}`;
          });
          tooltip = `${info.label}: ${textSummary} (${breakdownParts.join(', ')})`;
        } else if (mod.label) {
          tooltip = `${info.label}: ${textSummary} (${mod.label})`;
        } else {
          tooltip = `${info.label}: ${textSummary}`;
        }

        return (
          <span
            key={`${mod.stat}-${idx}`}
            data-testid={`stat-pill-${mod.stat}`}
            title={tooltip}
            aria-label={tooltip}
            dir="ltr"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 12px',
              borderRadius: '20px',
              fontWeight: 'bold',
              fontSize: '0.95em',
              color,
              backgroundColor: bg,
              border,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              unicodeBidi: 'isolate',
              cursor: (mod.breakdown?.length || mod.label) ? 'help' : 'default',
            }}
          >
            {text}
          </span>
        );
      })}
    </div>
  );
};
