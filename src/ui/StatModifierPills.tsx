import React from 'react';
import { useTranslation } from 'react-i18next';
import type { StatModification } from '../engine/gameState';
import { getStatMeta } from './statMeta';

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

  const getStatInfo = (stat: string) => getStatMeta(stat, t);

  const filteredMods = modifications.filter(mod => {
    if (mod.diff === 0 && !mod.isCapped) return false;
    if (isHelpfulUI) return true;
    return mod.stat === 'money' || mod.stat === 'loanDebt' || mod.stat === 'rentDebt';
  });

  const mergedMods: StatModification[] = [];
  for (const mod of filteredMods) {
    const existing = mergedMods.find(m => m.stat === mod.stat);
    if (existing) {
      existing.diff += mod.diff;
      if (mod.isCapped) existing.isCapped = true;
    } else {
      mergedMods.push({ ...mod });
    }
  }
  const displayMods = mergedMods.filter(m => m.diff !== 0 || m.isCapped);

  if (displayMods.length === 0) {
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
      {displayMods.map((mod, idx) => {
        const info = getStatInfo(mod.stat);
        const isMoney = mod.stat === 'money';
        const isDebt = mod.stat === 'loanDebt' || mod.stat === 'rentDebt';

        let textSummary: string;
        let text: React.ReactNode;

        if (mod.isCapped) {
          textSummary = `MAX ${info.label}`;
          text = (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              MAX {info.icon}
            </span>
          );
        } else if (isMoney) {
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

        if (mod.isCapped) {
          // Neutral grey
        } else if (isMoney) {
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

        if (mod.isCapped) {
          color = '#94a3b8';
          bg = 'rgba(148, 163, 184, 0.12)';
          border = '1px solid rgba(148, 163, 184, 0.25)';
        } else if (isPositive) {
          color = '#4ade80';
          bg = 'rgba(74, 222, 128, 0.18)';
          border = '1px solid rgba(74, 222, 128, 0.35)';
        } else if (isNegative) {
          color = mod.stat === 'mess' ? '#fb923c' : '#f87171';
          bg = mod.stat === 'mess' ? 'rgba(251, 146, 60, 0.18)' : 'rgba(248, 113, 113, 0.18)';
          border = mod.stat === 'mess' ? '1px solid rgba(251, 146, 60, 0.35)' : '1px solid rgba(248, 113, 113, 0.35)';
        }

        let tooltip = info.label;
        if (mod.isCapped) {
          tooltip = mod.label || `${info.label}: Capped at maximum`;
        } else if (mod.breakdown && mod.breakdown.length > 0) {
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
