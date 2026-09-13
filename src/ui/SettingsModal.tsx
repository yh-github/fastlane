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
  const [activeTab, setActiveTab] = useState<'general' | 'graphics'>('general');
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

  const handleTogglePixelatedSprites = () => {
    setGameState(prev => {
      if (!prev) return prev;
      const current = prev.rules.pixelatedSprites !== false;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          pixelatedSprites: !current
        }
      };
    });
  };

  const handleToggleRemoveCharacterBg = () => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          removeCharacterBg: !prev.rules.removeCharacterBg
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
      <div className="fullscreen-overlay settings-modal-overlay" style={{ zIndex: 9999 }}>
        <div className="building-modal settings-modal-content">
          <button className="building-modal__close" onClick={onClose}>×</button>
          <div className="building-modal__header">
            <div className="building-modal__face">⚙️</div>
            <div className="building-modal__title-group">
              <h2>{t('settings.title', { defaultValue: 'Settings' })}</h2>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '8px' }}>
            <button
              style={{
                background: activeTab === 'general' ? 'var(--accent-cyan)' : 'transparent',
                color: activeTab === 'general' ? '#000' : 'var(--text-main, #fff)',
                border: '1px solid var(--accent-cyan)',
                borderRadius: '6px',
                padding: '6px 14px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.15s ease'
              }}
              onClick={() => setActiveTab('general')}
              data-testid="tab-settings-general"
            >
              ⚙️ {t('settings.tabs.general', { defaultValue: 'General' })}
            </button>
            <button
              style={{
                background: activeTab === 'graphics' ? 'var(--accent-cyan)' : 'transparent',
                color: activeTab === 'graphics' ? '#000' : 'var(--text-main, #fff)',
                border: '1px solid var(--accent-cyan)',
                borderRadius: '6px',
                padding: '6px 14px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.15s ease'
              }}
              onClick={() => setActiveTab('graphics')}
              data-testid="tab-settings-graphics"
            >
              🎨 {t('settings.tabs.graphics', { defaultValue: 'Graphics' })}
            </button>
          </div>

          <div className="interaction-panel">
            {activeTab === 'general' && (
              <>
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
              </>
            )}

            {activeTab === 'graphics' && (
              <>
                <div 
                  className="interaction-item interaction-item--clickable"
                  onClick={handleTogglePixelatedSprites}
                  data-testid="setting-pixelated-sprites"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{t('settings.pixelatedSprites', { defaultValue: 'Crisp Pixel Art' })}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                        {gameState.rules.pixelatedSprites !== false 
                          ? t('settings.pixelatedOn', { defaultValue: 'Nearest-neighbor sharp pixels (ON)' })
                          : t('settings.pixelatedOff', { defaultValue: 'Bilinear smoothed interpolation (OFF)' })}
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={gameState.rules.pixelatedSprites !== false} 
                      readOnly
                      style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
                    />
                  </div>
                </div>

                <div 
                  className="interaction-item interaction-item--clickable"
                  onClick={handleToggleRemoveCharacterBg}
                  data-testid="setting-remove-character-bg"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{t('settings.removeCharacterBg', { defaultValue: 'Remove Character Background' })}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                        {gameState.rules.removeCharacterBg 
                          ? t('settings.removeBgOn', { defaultValue: 'Transparent stage background (ON)' })
                          : t('settings.removeBgOff', { defaultValue: 'Original solid character background (OFF)' })}
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={!!gameState.rules.removeCharacterBg} 
                      readOnly
                      style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
                    />
                  </div>
                </div>

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
                    <span>{t('settings.animations', { defaultValue: 'Enable UI Animations' })}</span>
                    <input 
                      type="checkbox" 
                      checked={gameState.rules.enableAnimations} 
                      readOnly
                      style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
                    />
                  </div>
                </div>
              </>
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
