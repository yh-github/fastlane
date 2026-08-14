import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type GameState } from '../engine/gameState';
import { type CampaignBundle } from '../engine/dataLoader';
import type { ReplayData } from '../engine/replayTypes';
import { DebugEventsModal } from './DebugEventsModal';

interface SettingsModalProps {
  gameState: GameState;
  setGameState: (updater: GameState | ((prev: GameState | null) => GameState | null)) => void;
  campaign?: CampaignBundle;
  replayData?: ReplayData | null;
  onClose: () => void;
}

export function SettingsModal({ gameState, setGameState, campaign, replayData, onClose }: SettingsModalProps) {
  const { t } = useTranslation();
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);

  const handleToggleAnimations = () => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          enableAnimations: !prev.rules.enableAnimations
        }
      };
    });
  };

  const handleToggleShowItemImages = () => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          showItemImages: !prev.rules.showItemImages
        }
      };
    });
  };

  const handleToggleOverAchieve = () => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          allowOverAchievingGoals: !prev.rules.allowOverAchievingGoals
        }
      };
    });
  };

  const handleExportReplay = () => {
    if (!replayData) return;
    const blob = new Blob([JSON.stringify(replayData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fastlane-replay-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="fullscreen-overlay" style={{ zIndex: 9999 }}>
        <div className="building-modal">
          <button className="building-modal__close" onClick={onClose}>×</button>
          <div className="building-modal__header">
            <div className="building-modal__face">⚙️</div>
            <div className="building-modal__title-group">
              <h2>{t('settings.title', { defaultValue: 'Settings' })}</h2>
            </div>
          </div>

          <div className="interaction-panel">
            <div 
              className="interaction-item interaction-item--clickable"
              onClick={handleToggleShowItemImages}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t('settings.showItemImages', { defaultValue: 'Show Item Graphics' })}</span>
                <input 
                  type="checkbox" 
                  checked={gameState.rules.showItemImages} 
                  readOnly
                  style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
                />
              </div>
            </div>
            <div 
              className="interaction-item interaction-item--clickable"
              onClick={handleToggleAnimations}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t('settings.animations', { defaultValue: 'Enable Animations' })}</span>
                <input 
                  type="checkbox" 
                  checked={gameState.rules.enableAnimations} 
                  readOnly
                  style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
                />
              </div>
            </div>
            <div 
              className="interaction-item interaction-item--clickable"
              onClick={handleToggleOverAchieve}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t('settings.overachieve', { defaultValue: 'Allow Over-Achieving Goals' })}</span>
                <input 
                  type="checkbox" 
                  checked={gameState.rules.allowOverAchievingGoals} 
                  readOnly
                  style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
                />
              </div>
            </div>

            {campaign && (
              <div 
                className="interaction-item interaction-item--clickable"
                onClick={() => setIsDebugModalOpen(true)}
                style={{ border: '1px solid rgba(0, 229, 255, 0.3)', marginTop: '8px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    🛠️ {t('settings.debugEvents', { defaultValue: 'Debug Events & Economy' })}
                  </span>
                  {(gameState.debugQueue?.length || 0) > 0 && (
                    <span style={{
                      background: 'rgba(255, 179, 0, 0.2)',
                      color: 'var(--accent-amber)',
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 700
                    }}>
                      {gameState.debugQueue?.length} Queued
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
            {replayData && (
              <button className="action-panel__btn" onClick={handleExportReplay}>
                Export Replay
              </button>
            )}
            <button className="action-panel__btn" onClick={onClose}>
              {t('settings.close', { defaultValue: 'Close' })}
            </button>
          </div>
        </div>
      </div>

      {isDebugModalOpen && campaign && (
        <DebugEventsModal
          gameState={gameState}
          setGameState={setGameState}
          campaign={campaign}
          onClose={() => setIsDebugModalOpen(false)}
        />
      )}
    </>
  );
}
