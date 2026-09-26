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
  onOpenLog?: () => void;
  logCount?: number;
}

export function SettingsModal({ gameState, setGameState, campaign, replayData, onClose, onOpenLog, logCount }: SettingsModalProps) {
  const { t, i18n } = useTranslation();
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const handleToggleHelpfulUI = () => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          helpfulUI: !prev.rules.helpfulUI
        }
      };
    });
  };

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

  const handleToggleHudLayout = () => {
    const currentLayout = gameState.rules.hudLayout || 'top';
    const nextLayout = currentLayout === 'top' ? 'side' : 'top';
    try {
      localStorage.setItem('fastlane_hud_layout', nextLayout);
    } catch {
      // ignore
    }
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          hudLayout: nextLayout
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

  const handleToggleShowWindowPositionSize = () => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          showWindowPositionSize: !prev.rules.showWindowPositionSize
        }
      };
    });
  };

  const handleToggleAllowWindowMoveResize = () => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          allowWindowMoveResize: !prev.rules.allowWindowMoveResize
        }
      };
    });
  };

  const handleToggleRemoveCharacterBg = () => {
    setGameState(prev => {
      if (!prev) return prev;
      const current = prev.rules.removeCharacterBg !== false;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          removeCharacterBg: !current
        }
      };
    });
  };

  const handleToggleAuthenticCurvedPaths = () => {
    setGameState(prev => {
      if (!prev) return prev;
      const current = prev.rules.authenticCurvedPaths !== false;
      const nextVal = !current;
      try {
        localStorage.setItem('fastlane_curved_board', nextVal ? 'true' : 'false');
      } catch {
        // ignore
      }
      return {
        ...prev,
        rules: {
          ...prev.rules,
          authenticCurvedPaths: nextVal
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

  const isInterfaceCollapsed = !!collapsedCategories['interface'];
  const isGraphicsCollapsed = !!collapsedCategories['graphics'];
  const isDeveloperCollapsed = !!collapsedCategories['developer'];

  return (
    <>
      <div className="fullscreen-overlay settings-modal-overlay" style={{ zIndex: 9999 }}>
        <div className="building-modal settings-modal-content" style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
          <button className="building-modal__close" onClick={onClose}>×</button>
          <div className="building-modal__header">
            <div className="building-modal__face">⚙️</div>
            <div className="building-modal__title-group">
              <h2>{t('settings.title', { defaultValue: 'Settings' })}</h2>
            </div>
          </div>

          <div className="interaction-panel" style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
            {/* --- Category: Interface & Assistance --- */}
            <div
              className="settings-category-header"
              onClick={() => toggleCategory('interface')}
              data-testid="category-header-interface"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '6px',
                cursor: 'pointer',
                userSelect: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                color: 'var(--accent-cyan, #00e5ff)',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                marginBottom: isInterfaceCollapsed ? '10px' : '6px',
                transition: 'background 0.15s ease'
              }}
            >
              <span>🧭 {t('settings.categories.interface', { defaultValue: 'Interface & Assistance' })}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                {isInterfaceCollapsed ? '▶ ' + t('settings.show', { defaultValue: 'Expand' }) : '▼ ' + t('settings.hide', { defaultValue: 'Fold' })}
              </span>
            </div>

            {!isInterfaceCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                {/* Mid-Game Language Switcher */}
                <div 
                  className="interaction-item"
                  data-testid="setting-language-toggle"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>🌐 {t('settings.language', { defaultValue: 'Language' })}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                        {t('settings.languageHelp', { defaultValue: 'Select interface language' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className={`action-panel__btn ${(i18n?.language || 'en') === 'en' ? 'action-panel__btn--active' : ''}`}
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.8rem',
                          background: (i18n?.language || 'en') === 'en' ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
                          color: (i18n?.language || 'en') === 'en' ? '#000' : '#fff',
                          border: '1px solid rgba(0,229,255,0.4)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: (i18n?.language || 'en') === 'en' ? 'bold' : 'normal'
                        }}
                        onClick={() => i18n?.changeLanguage('en')}
                        data-testid="btn-lang-en"
                      >
                        English
                      </button>
                      <button
                        type="button"
                        className={`action-panel__btn ${i18n?.language === 'he' ? 'action-panel__btn--active' : ''}`}
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.8rem',
                          background: i18n?.language === 'he' ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
                          color: i18n?.language === 'he' ? '#000' : '#fff',
                          border: '1px solid rgba(0,229,255,0.4)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: i18n?.language === 'he' ? 'bold' : 'normal'
                        }}
                        onClick={() => i18n?.changeLanguage('he')}
                        data-testid="btn-lang-he"
                      >
                        עברית
                      </button>
                    </div>
                  </div>
                </div>

                <div 
                  className="interaction-item interaction-item--clickable"
                  onClick={handleToggleHelpfulUI}
                  data-testid="setting-helpful-ui"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{t('settings.helpfulUI', { defaultValue: 'Helpful Interface' })}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                        {gameState.rules.helpfulUI 
                          ? t('settings.helpfulUIOn', { defaultValue: 'Displays exact prices, wage estimates, and break-in risk (ON)' })
                          : t('settings.helpfulUIOff', { defaultValue: 'Authentic minimal information (OFF)' })}
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={!!gameState.rules.helpfulUI} 
                      readOnly
                      style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
                    />
                  </div>
                </div>

                <div 
                  className="interaction-item interaction-item--clickable"
                  onClick={handleToggleAnimations}
                  data-testid="setting-enable-animations"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{t('settings.animations', { defaultValue: 'Floating Stat Popups & Effects' })}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                        {gameState.rules.enableAnimations 
                          ? t('settings.animationsOn', { defaultValue: 'Displays floating numbers and icons when stats change (ON)' })
                          : t('settings.animationsOff', { defaultValue: 'Suppressed stat change popups (OFF)' })}
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={!!gameState.rules.enableAnimations} 
                      readOnly
                      style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
                    />
                  </div>
                </div>

                <div 
                  className="interaction-item interaction-item--clickable"
                  onClick={handleToggleShowItemImages}
                  data-testid="setting-show-item-images"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{t('settings.showItemImages', { defaultValue: 'Show Item Graphics' })}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                        {gameState.rules.showItemImages 
                          ? t('settings.itemImagesOn', { defaultValue: 'Graphical icons in shops and inventory (ON)' })
                          : t('settings.itemImagesOff', { defaultValue: 'Text-only item listings (OFF)' })}
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={!!gameState.rules.showItemImages} 
                      readOnly
                      style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
                    />
                  </div>
                </div>

                <div 
                  className="interaction-item interaction-item--clickable"
                  onClick={handleToggleHudLayout}
                  data-testid="setting-hud-layout"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{t('settings.hudLayout', { defaultValue: 'HUD Layout Style' })}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                        {(gameState.rules.hudLayout || 'top') === 'top'
                          ? t('settings.hudLayoutTop', { defaultValue: 'Top HUD (Classic desktop top-bar)' })
                          : t('settings.hudLayoutSide', { defaultValue: 'Side HUD (Modern widescreen & phone landscape, 2-column sidebar with folding)' })}
                      </div>
                    </div>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      background: 'rgba(0, 229, 255, 0.2)', 
                      color: 'var(--accent-cyan)',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      border: '1px solid var(--accent-cyan)'
                    }}>
                      {(gameState.rules.hudLayout || 'top') === 'top' ? 'TOP' : 'SIDE'}
                    </span>
                  </div>
                </div>

                <div 
                  className="interaction-item interaction-item--clickable"
                  onClick={handleToggleShowWindowPositionSize}
                  data-testid="setting-show-window-position-size"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{t('settings.showWindowPositionSize', { defaultValue: 'Show Window Position & Size' })}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                        {gameState.rules.showWindowPositionSize 
                          ? t('settings.showWindowPositionSizeOn', { defaultValue: 'Displays coordinate and dimension overlay on location windows (ON)' })
                          : t('settings.showWindowPositionSizeOff', { defaultValue: 'Hidden window coordinate and dimension overlay (OFF)' })}
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={!!gameState.rules.showWindowPositionSize} 
                      readOnly
                      style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
                    />
                  </div>
                </div>

                <div 
                  className="interaction-item interaction-item--clickable"
                  onClick={handleToggleAllowWindowMoveResize}
                  data-testid="setting-allow-window-move-resize"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{t('settings.allowWindowMoveResize', { defaultValue: 'Move & Resize Location Windows' })}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                        {gameState.rules.allowWindowMoveResize 
                          ? t('settings.allowWindowMoveResizeOn', { defaultValue: 'Header dragging and corner resize handle enabled (ON)' })
                          : t('settings.allowWindowMoveResizeOff', { defaultValue: 'Fixed location window position and size (OFF)' })}
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={!!gameState.rules.allowWindowMoveResize} 
                      readOnly
                      style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- Category: Graphics & Sprites --- */}
            <div
              className="settings-category-header"
              onClick={() => toggleCategory('graphics')}
              data-testid="category-header-graphics"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '6px',
                cursor: 'pointer',
                userSelect: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                color: 'var(--accent-cyan, #00e5ff)',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                marginBottom: isGraphicsCollapsed ? '10px' : '6px',
                transition: 'background 0.15s ease'
              }}
            >
              <span>🎨 {t('settings.categories.graphics', { defaultValue: 'Graphics & Sprites' })}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                {isGraphicsCollapsed ? '▶ ' + t('settings.show', { defaultValue: 'Expand' }) : '▼ ' + t('settings.hide', { defaultValue: 'Fold' })}
              </span>
            </div>

            {!isGraphicsCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
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
                        {gameState.rules.removeCharacterBg !== false
                          ? t('settings.removeBgOn', { defaultValue: 'Transparent stage background (ON)' })
                          : t('settings.removeBgOff', { defaultValue: 'Original solid character background (OFF)' })}
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={gameState.rules.removeCharacterBg !== false} 
                      readOnly
                      style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
                    />
                  </div>
                </div>

                <div 
                  className="interaction-item interaction-item--clickable"
                  onClick={handleToggleAuthenticCurvedPaths}
                  data-testid="setting-authentic-curved-paths"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{t('settings.authenticCurvedPaths', { defaultValue: 'Authentic Curved Board' })}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                        {gameState.rules.authenticCurvedPaths !== false
                          ? t('settings.curvedBoardOn', { defaultValue: 'Authentic 1990 curved sidewalks and proportionate waypoint spacing (ON)' })
                          : t('settings.curvedBoardOff', { defaultValue: 'Simplified schematic rectangular layout (OFF)' })}
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={gameState.rules.authenticCurvedPaths !== false} 
                      readOnly
                      style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- Category: Developer & Diagnostics --- */}
            {(campaign || replayData || onOpenLog) && (
              <>
                <div
                  className="settings-category-header"
                  onClick={() => toggleCategory('developer')}
                  data-testid="category-header-developer"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: 'var(--accent-cyan, #00e5ff)',
                    border: '1px solid rgba(0, 229, 255, 0.25)',
                    marginBottom: isDeveloperCollapsed ? '10px' : '6px',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <span>🛠️ {t('settings.categories.developer', { defaultValue: 'Developer & Tools' })}</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                    {isDeveloperCollapsed ? '▶ ' + t('settings.show', { defaultValue: 'Expand' }) : '▼ ' + t('settings.hide', { defaultValue: 'Fold' })}
                  </span>
                </div>

                {!isDeveloperCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                    {onOpenLog && (
                      <div 
                        className="interaction-item interaction-item--clickable"
                        onClick={onOpenLog}
                        style={{ border: '1px solid rgba(0, 229, 255, 0.3)' }}
                        data-testid="btn-open-game-log"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                            📜 {t('settings.viewGameLog', { defaultValue: 'View Game Activity Log' })}
                          </span>
                          {typeof logCount === 'number' && logCount > 0 && (
                            <span style={{
                              background: 'rgba(0, 229, 255, 0.15)',
                              color: 'var(--accent-cyan)',
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 700
                            }}>
                              {logCount}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {campaign && (
                      <div 
                        className="interaction-item interaction-item--clickable"
                        onClick={() => setIsDebugModalOpen(true)}
                        style={{ border: '1px solid rgba(0, 229, 255, 0.3)' }}
                        data-testid="btn-open-debug-events"
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
                )}
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
