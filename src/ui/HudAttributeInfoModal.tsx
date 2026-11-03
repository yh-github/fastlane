import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { PlayerState, GameState } from '../engine/gameState';
import type { GameRules } from '../engine/rules';
import type { CampaignBundle } from '../engine/dataLoader';
import type { GoalFilter } from '../utils/logCategorizer';
import { getHudAttributeInfo } from './hudAttributeInfo';

export interface HudAttributeInfoModalProps {
  attributeId: string;
  player: PlayerState;
  rules: GameRules;
  gameState?: GameState;
  campaign?: CampaignBundle;
  turn: number;
  economicIndex?: number;
  economicReading?: number;
  economicTrend?: number;
  hoursPerTurn?: number;
  onClose: () => void;
  onOpenFilteredLog: (filter: GoalFilter) => void;
}

export const HudAttributeInfoModal: React.FC<HudAttributeInfoModalProps> = ({
  attributeId,
  player,
  rules,
  gameState,
  campaign,
  turn,
  economicIndex,
  economicReading,
  economicTrend,
  hoursPerTurn,
  onClose,
  onOpenFilteredLog,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const info = getHudAttributeInfo({
    attributeId,
    player,
    rules,
    gameState,
    campaign,
    turn,
    economicIndex,
    economicReading,
    economicTrend,
    hoursPerTurn,
    t,
  });

  const portalTarget = document.querySelector('.game-viewport') || document.body;

  return createPortal(
    <div
      className="hud-info-overlay"
      data-testid="hud-info-modal"
      role="dialog"
      aria-modal="true"
      aria-label={info.name}
      onClick={onClose}
      style={{
        position: portalTarget === document.body ? 'fixed' : 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 10, 20, 0.55)',
        backdropFilter: 'blur(3px)',
        zIndex: 65,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '12px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="hud-info-card"
        data-testid="hud-info-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(680px, 94vw)',
          maxHeight: 'min(86vh, 560px)',
          background: 'linear-gradient(160deg, #161e2e 0%, #0d121d 100%)',
          border: '1px solid #00e5ff',
          borderRadius: '12px',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.8), 0 0 15px rgba(0, 229, 255, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          color: '#f1f5f9',
          boxSizing: 'border-box',
          overflow: 'hidden',
          animation: 'popIn 0.2s ease-out forwards',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid rgba(0, 229, 255, 0.2)',
            backgroundColor: 'rgba(0, 229, 255, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{info.icon}</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#00e5ff', fontWeight: 700 }}>
                {info.name}
              </h2>
              <span
                style={{
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#94a3b8',
                }}
              >
                {info.category}
              </span>
            </div>
          </div>
          <button
            className="hud-info-close-btn"
            data-testid="hud-info-close"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.6rem',
              lineHeight: 1,
              cursor: 'pointer',
              padding: '0 4px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            &times;
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            flex: 1,
          }}
        >
          {/* Quick Metrics Bar: Current and Max */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                  {t('hudInfo.current', { defaultValue: 'Current' })}:{' '}
                </span>
                <span
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: info.statusColor || '#00e5ff',
                    textShadow: '0 0 8px rgba(0, 229, 255, 0.4)',
                  }}
                  data-testid="hud-info-current"
                >
                  {info.currentFormatted}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                  {t('hudInfo.maximum', { defaultValue: 'Maximum' })}:{' '}
                </span>
                <span style={{ fontSize: '1.15rem', fontWeight: 600, color: '#e2e8f0' }} data-testid="hud-info-max">
                  {info.maxFormatted}
                </span>
              </div>
              {info.statusBadge && (
                <span
                  style={{
                    backgroundColor: info.statusColor || '#e74c3c',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                  }}
                  data-testid="hud-info-status-badge"
                >
                  {info.statusBadge}
                </span>
              )}
            </div>

            {info.percentage !== null && (
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginTop: '4px',
                }}
              >
                <div
                  style={{
                    width: `${Math.max(0, Math.min(100, info.percentage))}%`,
                    height: '100%',
                    backgroundColor: info.statusColor || '#00e5ff',
                    boxShadow: info.statusColor ? `0 0 8px ${info.statusColor}` : '0 0 8px #00e5ff',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            )}
          </div>

          {/* What It Is */}
          <div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#facc15', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ℹ️ {t('hudInfo.whatItIs', { defaultValue: 'What It Is' })}
            </h4>
            <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.5, color: '#cbd5e1' }} data-testid="hud-info-desc">
              {info.description}
            </p>
          </div>

          {/* Max Explanation if provided */}
          {info.maxExplanation && (
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                📏 {t('hudInfo.howMaxWorks', { defaultValue: 'How The Cap Works' })}
              </h4>
              <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.5, color: '#94a3b8' }} data-testid="hud-info-max-explanation">
                {info.maxExplanation}
              </p>
            </div>
          )}

          {/* What Affects It */}
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ⚡ {t('hudInfo.whatAffectsIt', { defaultValue: 'What Affects It' })}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
              {/* Increases */}
              <div
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ color: '#4ade80', fontWeight: 600, fontSize: '0.82rem', marginBottom: '6px' }}>
                  ▲ {t('hudInfo.increasesHowToRaise', { defaultValue: 'Increases / How to Raise' })}
                </div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.84rem', color: '#e2e8f0', lineHeight: 1.45 }}>
                  {info.increases.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Decreases */}
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ color: '#f87171', fontWeight: 600, fontSize: '0.82rem', marginBottom: '6px' }}>
                  ▼ {t('hudInfo.decreasesRisksDecay', { defaultValue: 'Decreases / Risks & Decay' })}
                </div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.84rem', color: '#e2e8f0', lineHeight: 1.45 }}>
                  {info.decreases.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Filtered Log button and Close button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(10, 15, 25, 0.85)',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <button
            data-testid="hud-info-view-log"
            onClick={() => onOpenFilteredLog(info.logFilter)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0284c7',
              color: '#fff',
              border: '1px solid #38bdf8',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0369a1')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0284c7')}
          >
            📜 {t('hudInfo.viewFilteredLog', {
              defaultValue: `View Filtered Activity Log (${info.logFilter})`,
              filter: info.logFilter,
            })}
          </button>

          <button
            data-testid="hud-info-dismiss"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#334155',
              color: '#e2e8f0',
              border: '1px solid #475569',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#475569')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
          >
            {t('common.close', { defaultValue: 'Close' })}
          </button>
        </div>
      </div>
    </div>,
    portalTarget
  );
};
