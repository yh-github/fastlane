import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import type { AutoSaveData } from '../utils/saveManager';
import { getCampaignDisplayName } from '../utils/saveManager';

export interface ResumePromptModalProps {
  savedGame: AutoSaveData;
  onResume: () => void;
  onStartNew: () => void;
  onDiscard?: () => void;
  onClose: () => void;
}

export const ResumePromptModal: React.FC<ResumePromptModalProps> = ({
  savedGame,
  onResume,
  onStartNew,
  onDiscard,
  onClose,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const playerIndex = savedGame.activePlayerIndex ?? 0;
  const activePlayer = savedGame.gameState.players[playerIndex] || savedGame.gameState.players[0];
  const campaignName = getCampaignDisplayName(savedGame.campaignId);

  const formattedTime = savedGame.timestamp
    ? new Date(savedGame.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
  const formattedDate = savedGame.timestamp
    ? new Date(savedGame.timestamp).toLocaleDateString()
    : '';

  return createPortal(
    <div
      className="fullscreen-overlay settings-modal-overlay"
      data-testid="resume-prompt-modal-overlay"
      style={{
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 5, 15, 0.85)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="building-modal"
        data-testid="resume-prompt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-prompt-title"
        style={{
          width: 'min(480px, 92vw)',
          padding: '24px 28px',
          background: 'var(--panel-bg, #1a1a2e)',
          border: '2px solid var(--accent-cyan, #00f0ff)',
          borderRadius: '14px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 240, 255, 0.25)',
          color: '#fff',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <button
          className="building-modal__close"
          data-testid="btn-resume-close"
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: '12px', right: '12px' }}
        >
          ×
        </button>

        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>💾</div>

        <h2
          id="resume-prompt-title"
          style={{
            margin: '0 0 8px 0',
            fontSize: '1.4rem',
            color: '#fff',
            fontWeight: 700,
            textShadow: '0 0 8px rgba(0, 240, 255, 0.4)',
          }}
        >
          {t('autoSave.resumeTitle', { defaultValue: 'Continue Where You Left Off?' })}
        </h2>

        <p
          style={{
            margin: '0 0 18px 0',
            fontSize: '0.95rem',
            color: '#cbd5e1',
            lineHeight: 1.4,
          }}
        >
          {t('autoSave.resumeMessage', { defaultValue: 'A saved game in progress was found.' })}
        </p>

        {/* Save game summary card */}
        <div
          data-testid="resume-save-card"
          style={{
            width: '100%',
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              {t('autoSave.campaign', { defaultValue: 'Campaign' })}:
            </span>
            <span style={{ fontWeight: 600, color: '#38bdf8', fontSize: '0.9rem' }}>
              {campaignName}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              {t('autoSave.player', { defaultValue: 'Player' })}:
            </span>
            <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
              {activePlayer?.name || 'Player 1'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              {t('autoSave.turn', { turn: savedGame.gameState.turn, defaultValue: `Week ${savedGame.gameState.turn}` })}:
            </span>
            <span style={{ fontWeight: 600, color: '#fbbf24', fontSize: '0.9rem' }}>
              ${activePlayer ? activePlayer.money : 0} • {activePlayer ? activePlayer.hoursRemaining : 0}h left
            </span>
          </div>

          {savedGame.timestamp && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {t('autoSave.savedAt', { defaultValue: 'Saved' })}:
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {formattedDate} {formattedTime}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          <button
            className="title-screen__btn"
            data-testid="btn-resume-continue"
            onClick={onResume}
            style={{
              background: '#10b981',
              borderColor: '#34d399',
              color: '#fff',
              fontSize: '1.15rem',
              padding: '12px 20px',
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: '8px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            }}
          >
            ▶ {t('autoSave.continueGame', { defaultValue: 'Continue Game' })}
          </button>

          <button
            className="title-screen__btn"
            data-testid="btn-resume-start-new"
            onClick={onStartNew}
            style={{
              background: '#374151',
              borderColor: '#4b5563',
              color: '#e5e7eb',
              fontSize: '1rem',
              padding: '10px 18px',
              cursor: 'pointer',
              borderRadius: '8px',
            }}
          >
            {t('autoSave.startNewGame', { defaultValue: 'Start New Game' })}
          </button>

          {onDiscard && (
            <button
              data-testid="btn-resume-discard"
              onClick={onDiscard}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f87171',
                fontSize: '0.85rem',
                padding: '6px',
                cursor: 'pointer',
                textDecoration: 'underline',
                opacity: 0.8,
                marginTop: '4px',
              }}
            >
              {t('autoSave.discardSave', { defaultValue: 'Discard Save' })}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
