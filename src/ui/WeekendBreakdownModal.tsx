import React from 'react';
import { useTranslation } from 'react-i18next';
import type { StatModification, WeekendResult } from '../engine/gameState';
import { StatModifierPills } from './StatModifierPills';

export interface WeekendBreakdownModalProps {
  weekendResult?: WeekendResult;
  isHelpfulUI?: boolean;
  onClose: () => void;
}

export const WeekendBreakdownModal: React.FC<WeekendBreakdownModalProps> = ({
  weekendResult,
  isHelpfulUI = true,
  onClose
}) => {
  const { t } = useTranslation();

  const activityMods: StatModification[] = weekendResult?.activityModifications || [];
  const maintenanceMods: StatModification[] = weekendResult?.maintenanceModifications || [];
  const netMods: StatModification[] = weekendResult?.modifications || [];

  return (
    <div
      className="building-modal-overlay"
      data-testid="weekend-breakdown-modal"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box'
      }}
    >
      <div
        className="building-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#1e293b',
          border: '2px solid #00e5ff',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 0 30px rgba(0, 229, 255, 0.35)',
          color: '#fff',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.15)', paddingBottom: '12px' }}>
          <h2 style={{ margin: 0, color: '#00e5ff', fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>ℹ️</span> {t('weekendScreen.guideTitle', { defaultValue: 'How Weekends & Turns Work' })}
          </h2>
          <button
            onClick={onClose}
            data-testid="close-breakdown-modal-btn"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.4rem',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px'
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Concept Explanation */}
        <div style={{
          backgroundColor: 'rgba(0, 229, 255, 0.08)',
          border: '1px solid rgba(0, 229, 255, 0.25)',
          borderRadius: '8px',
          padding: '14px',
          marginBottom: '20px',
          fontSize: '0.9rem',
          lineHeight: '1.5',
          color: '#e2e8f0'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#00e5ff' }}>
            {t('weekendScreen.guideConceptHeading', { defaultValue: 'Weekly Life Cycle' })}
          </h4>
          <p style={{ margin: '0 0 8px 0' }}>
            {t('weekendScreen.guideConceptP1', {
              defaultValue: 'Each turn represents one full week. At the end of every week, two distinct processes resolve:'
            })}
          </p>
          <ul style={{ margin: '0 0 8px 0', paddingInlineStart: '20px' }}>
            <li>
              <strong>{t('weekendScreen.guideActivityName', { defaultValue: 'Weekend Activity' })}</strong>: {t('weekendScreen.guideActivityDesc', { defaultValue: 'Your chosen weekend card or leisure activity, applying relaxation bonuses and costs.' })}
            </li>
            <li>
              <strong>{t('weekendScreen.guideUpkeepName', { defaultValue: 'Weekly Upkeep & Maintenance' })}</strong>: {t('weekendScreen.guideUpkeepDesc', { defaultValue: 'Natural weekly adjustments for apartment mess, clothes wear, hygiene, and dependability.' })}
            </li>
          </ul>
          <p style={{ margin: 0, fontStyle: 'italic', color: '#cbd5e1' }}>
            💡 <strong>{t('weekendScreen.guideNoDoubleHeading', { defaultValue: 'No Double Deductions' })}</strong>: {t('weekendScreen.guideNoDoubleDesc', { defaultValue: 'Urgent turn events (doctor visits, food spoilage, computer gigs) have their own notifications and are never deducted twice here.' })}
          </p>
        </div>

        {/* Itemized Breakdown */}
        <h3 style={{ margin: '0 0 12px 0', color: '#f1c40f', fontSize: '1.1rem' }}>
          {t('weekendScreen.breakdownTitle', { defaultValue: 'This Week’s Breakdown' })}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          {/* 1. Weekend Activity */}
          <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>
                🏖️ {t('weekendScreen.activitySection', { defaultValue: 'Weekend Activity' })}
              </span>
              {weekendResult?.chosenCard && (
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  {t(weekendResult.chosenCard.titleKey, { defaultValue: 'Selected Activity' })}
                </span>
              )}
            </div>
            {activityMods.length > 0 ? (
              <StatModifierPills modifications={activityMods} isHelpfulUI={isHelpfulUI} align="start" />
            ) : (
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                {t('weekendScreen.noActivityMods', { defaultValue: 'No attribute modifications.' })}
              </span>
            )}
          </div>

          {/* 2. Weekly Upkeep */}
          <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ fontWeight: 'bold', color: '#a78bfa', marginBottom: '6px' }}>
              ⚙️ {t('weekendScreen.upkeepSection', { defaultValue: 'Weekly Upkeep & Maintenance' })}
            </div>
            {maintenanceMods.length > 0 ? (
              <StatModifierPills modifications={maintenanceMods} isHelpfulUI={isHelpfulUI} align="start" />
            ) : (
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                {t('weekendScreen.noMaintenanceMods', { defaultValue: 'Everything stayed clean and steady this week.' })}
              </span>
            )}
          </div>

          {/* 3. Net Total */}
          <div style={{ backgroundColor: 'rgba(0, 229, 255, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(0, 229, 255, 0.3)' }}>
            <div style={{ fontWeight: 'bold', color: '#00e5ff', marginBottom: '6px' }}>
              📊 {t('weekendScreen.netSection', { defaultValue: 'Net Weekly Change' })}
            </div>
            {netMods.length > 0 ? (
              <StatModifierPills modifications={netMods} isHelpfulUI={isHelpfulUI} align="start" />
            ) : (
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                {t('weekendScreen.noNetMods', { defaultValue: 'No net changes.' })}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: '#00e5ff',
            color: '#000',
            fontWeight: 'bold',
            fontSize: '1rem',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            boxShadow: '0 0 10px rgba(0, 229, 255, 0.5)'
          }}
        >
          {t('common.gotIt', { defaultValue: 'Got It!' })}
        </button>
      </div>
    </div>
  );
};
