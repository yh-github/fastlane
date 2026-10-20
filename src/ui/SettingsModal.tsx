import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type GameState } from '../engine/gameState';
import { type CampaignBundle } from '../engine/dataLoader';
import type { ReplayData } from '../engine/replayTypes';
import { DebugEventsModal } from './DebugEventsModal';
import { exportReplayToFile, exportSaveToFile } from '../utils/saveManager';

interface SettingsModalProps {
  gameState: GameState;
  setGameState: (updater: GameState | ((prev: GameState | null) => GameState | null)) => void;
  campaign?: CampaignBundle;
  replayData?: ReplayData | null;
  onClose: () => void;
  onOpenLog?: () => void;
  logCount?: number;
  onQuitGame?: () => void;
}

/**
 * Mobile-friendly and accessible switch toggle component.
 * Renders an accessible, real checkbox under the hood while providing
 * smooth sliding track and thumb visuals optimized for touch screens.
 */
function SettingSwitch({ checked, ariaLabel }: { checked: boolean; ariaLabel?: string }) {
  return (
    <div className={`settings-switch ${checked ? 'settings-switch--active' : ''}`} aria-hidden="true">
      <input 
        type="checkbox" 
        checked={checked} 
        readOnly
        tabIndex={-1}
        aria-label={ariaLabel}
        className="settings-switch__input"
      />
      <div className="settings-switch__track">
        <div className="settings-switch__thumb" />
      </div>
    </div>
  );
}

export function SettingsModal({ gameState, setGameState, campaign, replayData, onClose, onOpenLog, logCount, onQuitGame }: SettingsModalProps) {
  const { t, i18n } = useTranslation();
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const scrollToCategory = (catId: string) => {
    setCollapsedCategories(prev => {
      if (prev[catId]) {
        return { ...prev, [catId]: false };
      }
      return prev;
    });
    setTimeout(() => {
      const el = document.querySelector(`[data-testid="category-header-${catId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
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
    const currentLayout = gameState.rules.hudLayout || 'auto';
    const nextLayout: 'auto' | 'side' | 'top' =
      currentLayout === 'auto' ? 'top' : currentLayout === 'top' ? 'side' : 'auto';
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

  const handleToggleWorkConsoleStyle = () => {
    const currentStyle = gameState.rules.workConsoleStyle || 'popup';
    const nextStyle: 'popup' | 'flanking' = currentStyle === 'popup' ? 'flanking' : 'popup';
    try {
      localStorage.setItem('fastlane_work_console_style', nextStyle);
    } catch {
      // ignore
    }
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          workConsoleStyle: nextStyle
        }
      };
    });
  };

  const isAuthenticSupported = campaign?.config?.supportedGuiStyles ? campaign.config.supportedGuiStyles.includes('authentic') : true;

  const handleToggleGuiStyle = () => {
    if (!isAuthenticSupported) return;
    const currentStyle = gameState.rules.guiStyle || 'generated';
    const nextStyle: 'generated' | 'authentic' = currentStyle === 'generated' ? 'authentic' : 'generated';
    try {
      localStorage.setItem('fastlane_gui_style', nextStyle);
    } catch {
      // ignore
    }
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          guiStyle: nextStyle
        }
      };
    });
  };

  const handleToggleUseSkills = () => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          useSkills: !prev.rules.useSkills
        }
      };
    });
  };

  const handleToggleDynamicSkillCaps = () => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          dynamicSkillCaps: !prev.rules.dynamicSkillCaps
        }
      };
    });
  };

  const handleToggleWageScaledEmployability = () => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          wageScaledEmployability: !prev.rules.wageScaledEmployability
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
    exportReplayToFile(replayData);
  };

  const handleExportSave = () => {
    exportSaveToFile({
      version: 1,
      campaignId: campaign?.config.name || gameState.campaignId || 'qol_improved',
      gameState,
      replayData,
      timestamp: Date.now()
    });
  };

  const isInterfaceCollapsed = !!collapsedCategories['interface'];
  const isGraphicsCollapsed = !!collapsedCategories['graphics'];
  const isDeveloperCollapsed = !!collapsedCategories['developer'];

  return (
    <>
      <div className="fullscreen-overlay settings-modal-overlay" style={{ zIndex: 9999 }}>
        <div 
          className={`building-modal settings-modal-content ${isFullscreen ? 'settings-modal-content--fullscreen' : ''}`}
          data-testid="settings-modal-content"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <button className="building-modal__close settings-modal__close" onClick={onClose} aria-label="Close">×</button>
          <button 
            type="button"
            className="settings-modal__fullscreen-btn"
            data-testid="btn-settings-fullscreen"
            onClick={() => setIsFullscreen(prev => !prev)}
            title={isFullscreen ? t('settings.exitFullscreen', { defaultValue: 'Exit Full Screen' }) : t('settings.enterFullscreen', { defaultValue: 'Full Screen' })}
          >
            {isFullscreen ? '🗗' : '⛶'}
          </button>
          <div className="building-modal__header">
            <div className="building-modal__face">⚙️</div>
            <div className="building-modal__title-group">
              <h2>{t('settings.title', { defaultValue: 'Settings' })}</h2>
            </div>
          </div>

          {/* Quick Jump Category Pills for Touch & Small Screens */}
          <div className="settings-category-nav" role="tablist" aria-label={t('settings.categoriesNav', { defaultValue: 'Settings categories' })}>
            <button
              type="button"
              className="settings-category-nav__pill"
              onClick={() => scrollToCategory('interface')}
              data-testid="pill-goto-interface"
            >
              🧭 {t('settings.categories.interfaceShort', { defaultValue: 'Interface' })}
            </button>
            <button
              type="button"
              className="settings-category-nav__pill"
              onClick={() => scrollToCategory('graphics')}
              data-testid="pill-goto-graphics"
            >
              🎨 {t('settings.categories.graphicsShort', { defaultValue: 'Graphics' })}
            </button>
            {(campaign || replayData || onOpenLog) && (
              <button
                type="button"
                className="settings-category-nav__pill"
                onClick={() => scrollToCategory('developer')}
                data-testid="pill-goto-developer"
              >
                🛠️ {t('settings.categories.developerShort', { defaultValue: 'Developer' })}
              </button>
            )}
          </div>

          <div className="interaction-panel settings-modal__body">
            {/* --- Category: Interface & Assistance --- */}
            <div
              className="settings-category-header"
              onClick={() => toggleCategory('interface')}
              data-testid="category-header-interface"
            >
              <span>🧭 {t('settings.categories.interface', { defaultValue: 'Interface & Assistance' })}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                {isInterfaceCollapsed ? '▶ ' + t('settings.show', { defaultValue: 'Expand' }) : '▼ ' + t('settings.hide', { defaultValue: 'Fold' })}
              </span>
            </div>

            {!isInterfaceCollapsed && (
              <div className="settings-items-grid">
                {/* Mid-Game Language Switcher */}
                <div 
                  className="interaction-item settings-item settings-item--fullwidth"
                  data-testid="setting-language-toggle"
                >
                  <div className="settings-item-row">
                    <div className="settings-item-info">
                      <div className="settings-item-title">🌐 {t('settings.language', { defaultValue: 'Language' })}</div>
                      <div className="settings-item-desc">
                        {t('settings.languageHelp', { defaultValue: 'Select interface language' })}
                      </div>
                    </div>
                    <div className="settings-lang-group">
                      <button
                        type="button"
                        className={`action-panel__btn settings-lang-btn ${(i18n?.language || 'en') === 'en' ? 'settings-lang-btn--active' : ''}`}
                        onClick={() => i18n?.changeLanguage('en')}
                        data-testid="btn-lang-en"
                      >
                        English
                      </button>
                      <button
                        type="button"
                        className={`action-panel__btn settings-lang-btn ${i18n?.language === 'he' ? 'settings-lang-btn--active' : ''}`}
                        onClick={() => i18n?.changeLanguage('he')}
                        data-testid="btn-lang-he"
                      >
                        עברית
                      </button>
                    </div>
                  </div>
                </div>

                <div 
                  className="interaction-item interaction-item--clickable settings-item"
                  onClick={handleToggleHelpfulUI}
                  data-testid="setting-helpful-ui"
                >
                  <div className="settings-item-row">
                    <div className="settings-item-info">
                      <div className="settings-item-title">{t('settings.helpfulUI', { defaultValue: 'Helpful Interface' })}</div>
                      <div className="settings-item-desc">
                        {gameState.rules.helpfulUI 
                          ? t('settings.helpfulUIOn', { defaultValue: 'Displays exact prices, wage estimates, and burglary risk (ON)' })
                          : t('settings.helpfulUIOff', { defaultValue: 'Authentic minimal information (OFF)' })}
                      </div>
                    </div>
                    <div className="settings-item-control">
                      <SettingSwitch checked={!!gameState.rules.helpfulUI} ariaLabel={t('settings.helpfulUI', { defaultValue: 'Helpful Interface' })} />
                    </div>
                  </div>
                </div>

                <div 
                  className="interaction-item interaction-item--clickable settings-item"
                  onClick={handleToggleAnimations}
                  data-testid="setting-enable-animations"
                >
                  <div className="settings-item-row">
                    <div className="settings-item-info">
                      <div className="settings-item-title">{t('settings.animations', { defaultValue: 'Floating Stat Popups & Effects' })}</div>
                      <div className="settings-item-desc">
                        {gameState.rules.enableAnimations 
                          ? t('settings.animationsOn', { defaultValue: 'Displays floating numbers and icons when stats change (ON)' })
                          : t('settings.animationsOff', { defaultValue: 'Suppressed stat change popups (OFF)' })}
                      </div>
                    </div>
                    <div className="settings-item-control">
                      <SettingSwitch checked={!!gameState.rules.enableAnimations} ariaLabel={t('settings.animations', { defaultValue: 'Floating Stat Popups & Effects' })} />
                    </div>
                  </div>
                </div>

                <div 
                  className="interaction-item interaction-item--clickable settings-item"
                  onClick={handleToggleShowItemImages}
                  data-testid="setting-show-item-images"
                >
                  <div className="settings-item-row">
                    <div className="settings-item-info">
                      <div className="settings-item-title">{t('settings.showItemImages', { defaultValue: 'Show Item Graphics' })}</div>
                      <div className="settings-item-desc">
                        {gameState.rules.showItemImages 
                          ? t('settings.itemImagesOn', { defaultValue: 'Graphical icons in shops and inventory (ON)' })
                          : t('settings.itemImagesOff', { defaultValue: 'Text-only item listings (OFF)' })}
                      </div>
                    </div>
                    <div className="settings-item-control">
                      <SettingSwitch checked={!!gameState.rules.showItemImages} ariaLabel={t('settings.showItemImages', { defaultValue: 'Show Item Graphics' })} />
                    </div>
                  </div>
                </div>

                <div 
                  className={`interaction-item settings-item ${isAuthenticSupported ? 'interaction-item--clickable' : ''}`}
                  onClick={isAuthenticSupported ? handleToggleGuiStyle : undefined}
                  data-testid="setting-gui-style"
                  style={{ opacity: isAuthenticSupported ? 1 : 0.6 }}
                >
                  <div className="settings-item-row">
                    <div className="settings-item-info">
                      <div className="settings-item-title">{t('settings.guiStyle', { defaultValue: 'GUI Presentation Mode' })}</div>
                      <div className="settings-item-desc">
                        {!isAuthenticSupported
                          ? t('settings.guiStyleUnsupported', { defaultValue: 'Authentic 1990 VGA view is not supported by this campaign' })
                          : (gameState.rules.guiStyle === 'authentic')
                          ? t('settings.guiStyleAuthentic', { defaultValue: 'Authentic (1990 Sierra SCI VGA board & animated doors)' })
                          : t('settings.guiStyleGenerated', { defaultValue: 'Generated (Modern crisp procedural vector board)' })}
                      </div>
                    </div>
                    <div className="settings-item-control">
                      <span className={`settings-badge ${!isAuthenticSupported ? 'settings-badge--disabled' : gameState.rules.guiStyle === 'authentic' ? 'settings-badge--amber' : ''}`}>
                        {!isAuthenticSupported
                          ? 'N/A'
                          : (gameState.rules.guiStyle === 'authentic')
                          ? 'AUTHENTIC'
                          : 'GENERATED'}
                      </span>
                    </div>
                  </div>
                </div>

                <div 
                  className="interaction-item interaction-item--clickable settings-item"
                  onClick={handleToggleHudLayout}
                  data-testid="setting-hud-layout"
                >
                  <div className="settings-item-row">
                    <div className="settings-item-info">
                      <div className="settings-item-title">{t('settings.hudLayout', { defaultValue: 'HUD Layout Style' })}</div>
                      <div className="settings-item-desc">
                        {(gameState.rules.hudLayout || 'auto') === 'auto'
                          ? t('settings.hudLayoutAuto', { defaultValue: 'Auto (Landscape: Side HUD, Portrait: Top HUD)' })
                          : gameState.rules.hudLayout === 'top'
                          ? t('settings.hudLayoutTop', { defaultValue: 'Top HUD (Classic desktop top-bar)' })
                          : t('settings.hudLayoutSide', { defaultValue: 'Side HUD (Modern widescreen & phone landscape, 2-column sidebar with folding)' })}
                      </div>
                    </div>
                    <div className="settings-item-control">
                      <span className="settings-badge">
                        {(gameState.rules.hudLayout || 'auto').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div 
                  className="interaction-item interaction-item--clickable settings-item"
                  onClick={handleToggleWorkConsoleStyle}
                  data-testid="setting-work-console-style"
                >
                  <div className="settings-item-row">
                    <div className="settings-item-info">
                      <div className="settings-item-title">{t('settings.workConsoleStyle', { defaultValue: 'Work Console Style' })}</div>
                      <div className="settings-item-desc">
                        {(gameState.rules.workConsoleStyle || 'popup') === 'popup'
                          ? t('settings.workConsolePopup', { defaultValue: 'Movable Window (Popup with radio modes - can move aside to watch shop)' })
                          : t('settings.workConsoleFlanking', { defaultValue: 'Flanking Wings (Fixed cards flanking the location window)' })}
                      </div>
                    </div>
                    <div className="settings-item-control">
                      <span className="settings-badge">
                        {(gameState.rules.workConsoleStyle || 'popup').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div 
                  className="interaction-item interaction-item--clickable settings-item"
                  onClick={handleToggleUseSkills}
                  data-testid="setting-use-skills"
                >
                  <div className="settings-item-row">
                    <div className="settings-item-info">
                      <div className="settings-item-title">{t('settings.useSkills', { defaultValue: 'Management & Technical Skills' })}</div>
                      <div className="settings-item-desc">
                        {gameState.rules.useSkills
                          ? t('settings.useSkillsOn', { defaultValue: 'Tracks Management & Technical skills with job bonuses (ON)' })
                          : t('settings.useSkillsOff', { defaultValue: 'Skills disabled (OFF)' })}
                      </div>
                    </div>
                    <div className="settings-item-control">
                      <SettingSwitch checked={!!gameState.rules.useSkills} ariaLabel={t('settings.useSkills', { defaultValue: 'Management & Technical Skills' })} />
                    </div>
                  </div>
                </div>

                <div 
                  className="interaction-item interaction-item--clickable settings-item"
                  onClick={handleToggleDynamicSkillCaps}
                  data-testid="setting-dynamic-skill-caps"
                >
                  <div className="settings-item-row">
                    <div className="settings-item-info">
                      <div className="settings-item-title">{t('settings.dynamicSkillCaps', { defaultValue: 'Dynamic Skill Caps' })}</div>
                      <div className="settings-item-desc">
                        {gameState.rules.dynamicSkillCaps
                          ? t('settings.dynamicSkillCapsOn', { defaultValue: 'Skill caps scale with completed degrees up to 10.0 (ON)' })
                          : t('settings.dynamicSkillCapsOff', { defaultValue: 'Flat 10.0 skill caps (OFF)' })}
                      </div>
                    </div>
                    <div className="settings-item-control">
                      <SettingSwitch checked={!!gameState.rules.dynamicSkillCaps} ariaLabel={t('settings.dynamicSkillCaps', { defaultValue: 'Dynamic Skill Caps' })} />
                    </div>
                  </div>
                </div>

                <div 
                  className="interaction-item interaction-item--clickable settings-item"
                  onClick={handleToggleWageScaledEmployability}
                  data-testid="setting-wage-scaled-employability"
                >
                  <div className="settings-item-row">
                    <div className="settings-item-info">
                      <div className="settings-item-title">{t('settings.wageScaledEmployability', { defaultValue: 'Wage-Scaled Employability' })}</div>
                      <div className="settings-item-desc">
                        {gameState.rules.wageScaledEmployability
                          ? t('settings.wageScaledEmployabilityOn', { defaultValue: 'Normalized wage competition, qualification margin, and tag modifiers (ON)' })
                          : t('settings.wageScaledEmployabilityOff', { defaultValue: 'Classic employability formula (OFF)' })}
                      </div>
                    </div>
                    <div className="settings-item-control">
                      <SettingSwitch checked={!!gameState.rules.wageScaledEmployability} ariaLabel={t('settings.wageScaledEmployability', { defaultValue: 'Wage-Scaled Employability' })} />
                    </div>
                  </div>
                </div>

                <div 
                  className="interaction-item interaction-item--clickable settings-item"
                  onClick={handleToggleShowWindowPositionSize}
                  data-testid="setting-show-window-position-size"
                >
                  <div className="settings-item-row">
                    <div className="settings-item-info">
                      <div className="settings-item-title">{t('settings.showWindowPositionSize', { defaultValue: 'Show Window Position & Size' })}</div>
                      <div className="settings-item-desc">
                        {gameState.rules.showWindowPositionSize 
                          ? t('settings.showWindowPositionSizeOn', { defaultValue: 'Displays coordinate and dimension overlay on location windows (ON)' })
                          : t('settings.showWindowPositionSizeOff', { defaultValue: 'Hidden window coordinate and dimension overlay (OFF)' })}
                      </div>
                    </div>
                    <div className="settings-item-control">
                      <SettingSwitch checked={!!gameState.rules.showWindowPositionSize} ariaLabel={t('settings.showWindowPositionSize', { defaultValue: 'Show Window Position & Size' })} />
                    </div>
                  </div>
                </div>

                <div 
                  className="interaction-item interaction-item--clickable settings-item"
                  onClick={handleToggleAllowWindowMoveResize}
                  data-testid="setting-allow-window-move-resize"
                >
                  <div className="settings-item-row">
                    <div className="settings-item-info">
                      <div className="settings-item-title">{t('settings.allowWindowMoveResize', { defaultValue: 'Move & Resize Location Windows' })}</div>
                      <div className="settings-item-desc">
                        {gameState.rules.allowWindowMoveResize 
                          ? t('settings.allowWindowMoveResizeOn', { defaultValue: 'Header dragging and corner resize handle enabled (ON)' })
                          : t('settings.allowWindowMoveResizeOff', { defaultValue: 'Fixed location window position and size (OFF)' })}
                      </div>
                    </div>
                    <div className="settings-item-control">
                      <SettingSwitch checked={!!gameState.rules.allowWindowMoveResize} ariaLabel={t('settings.allowWindowMoveResize', { defaultValue: 'Move & Resize Location Windows' })} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- Category: Graphics & Sprites --- */}
            <div
              className="settings-category-header"
              onClick={() => toggleCategory('graphics')}
              data-testid="category-header-graphics"
            >
              <span>🎨 {t('settings.categories.graphics', { defaultValue: 'Graphics & Sprites' })}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                {isGraphicsCollapsed ? '▶ ' + t('settings.show', { defaultValue: 'Expand' }) : '▼ ' + t('settings.hide', { defaultValue: 'Fold' })}
              </span>
            </div>

            {!isGraphicsCollapsed && (
              <div className="settings-items-grid">
                <div 
                  className="interaction-item interaction-item--clickable settings-item"
                  onClick={handleTogglePixelatedSprites}
                  data-testid="setting-pixelated-sprites"
                >
                  <div className="settings-item-row">
                    <div className="settings-item-info">
                      <div className="settings-item-title">{t('settings.pixelatedSprites', { defaultValue: 'Crisp Pixel Art' })}</div>
                      <div className="settings-item-desc">
                        {gameState.rules.pixelatedSprites !== false 
                          ? t('settings.pixelatedOn', { defaultValue: 'Nearest-neighbor sharp pixels (ON)' })
                          : t('settings.pixelatedOff', { defaultValue: 'Bilinear smoothed interpolation (OFF)' })}
                      </div>
                    </div>
                    <div className="settings-item-control">
                      <SettingSwitch checked={gameState.rules.pixelatedSprites !== false} ariaLabel={t('settings.pixelatedSprites', { defaultValue: 'Crisp Pixel Art' })} />
                    </div>
                  </div>
                </div>

                <div 
                  className="interaction-item interaction-item--clickable settings-item"
                  onClick={handleToggleRemoveCharacterBg}
                  data-testid="setting-remove-character-bg"
                >
                  <div className="settings-item-row">
                    <div className="settings-item-info">
                      <div className="settings-item-title">{t('settings.removeCharacterBg', { defaultValue: 'Remove Character Background' })}</div>
                      <div className="settings-item-desc">
                        {gameState.rules.removeCharacterBg !== false
                          ? t('settings.removeBgOn', { defaultValue: 'Transparent stage background (ON)' })
                          : t('settings.removeBgOff', { defaultValue: 'Original solid character background (OFF)' })}
                      </div>
                    </div>
                    <div className="settings-item-control">
                      <SettingSwitch checked={gameState.rules.removeCharacterBg !== false} ariaLabel={t('settings.removeCharacterBg', { defaultValue: 'Remove Character Background' })} />
                    </div>
                  </div>
                </div>

                <div 
                  className="interaction-item interaction-item--clickable settings-item"
                  onClick={handleToggleAuthenticCurvedPaths}
                  data-testid="setting-authentic-curved-paths"
                >
                  <div className="settings-item-row">
                    <div className="settings-item-info">
                      <div className="settings-item-title">{t('settings.authenticCurvedPaths', { defaultValue: 'Authentic Curved Board' })}</div>
                      <div className="settings-item-desc">
                        {gameState.rules.authenticCurvedPaths !== false
                          ? t('settings.curvedBoardOn', { defaultValue: 'Authentic 1990 curved sidewalks and proportionate waypoint spacing (ON)' })
                          : t('settings.curvedBoardOff', { defaultValue: 'Simplified schematic rectangular layout (OFF)' })}
                      </div>
                    </div>
                    <div className="settings-item-control">
                      <SettingSwitch checked={gameState.rules.authenticCurvedPaths !== false} ariaLabel={t('settings.authenticCurvedPaths', { defaultValue: 'Authentic Curved Board' })} />
                    </div>
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
                >
                  <span>🛠️ {t('settings.categories.developer', { defaultValue: 'Developer & Tools' })}</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                    {isDeveloperCollapsed ? '▶ ' + t('settings.show', { defaultValue: 'Expand' }) : '▼ ' + t('settings.hide', { defaultValue: 'Fold' })}
                  </span>
                </div>

                {!isDeveloperCollapsed && (
                  <div className="settings-items-grid">
                    {onOpenLog && (
                      <div 
                        className="interaction-item interaction-item--clickable settings-item"
                        onClick={onOpenLog}
                        style={{ border: '1px solid rgba(0, 229, 255, 0.3)' }}
                        data-testid="btn-open-game-log"
                      >
                        <div className="settings-item-row">
                          <div className="settings-item-info">
                            <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                              📜 {t('settings.viewGameLog', { defaultValue: 'View Game Activity Log' })}
                            </span>
                          </div>
                          {typeof logCount === 'number' && logCount > 0 && (
                            <div className="settings-item-control">
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
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {campaign && (
                      <div 
                        className="interaction-item interaction-item--clickable settings-item"
                        onClick={() => setIsDebugModalOpen(true)}
                        style={{ border: '1px solid rgba(0, 229, 255, 0.3)' }}
                        data-testid="btn-open-debug-events"
                      >
                        <div className="settings-item-row">
                          <div className="settings-item-info">
                            <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                              🛠️ {t('settings.debugEvents', { defaultValue: 'Debug Events & Economy' })}
                            </span>
                          </div>
                          {(gameState.debugQueue?.length || 0) > 0 && (
                            <div className="settings-item-control">
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
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="settings-modal-footer">
            {replayData && (
              <button className="action-panel__btn" onClick={handleExportReplay}>
                Export Replay
              </button>
            )}
            <button className="action-panel__btn" data-testid="btn-export-save" onClick={handleExportSave}>
              {t('autoSave.exportSave', { defaultValue: 'Export Save' })}
            </button>
            {onQuitGame && (
              <button 
                className="action-panel__btn" 
                data-testid="btn-quit-game"
                onClick={() => setShowQuitConfirm(true)}
                style={{
                  backgroundColor: '#dc2626',
                  borderColor: '#ef4444',
                  color: '#fff'
                }}
              >
                🚪 {t('settings.quitGame', { defaultValue: 'Quit Game' })}
              </button>
            )}
            <button className="action-panel__btn settings-modal-footer__close" onClick={onClose} style={{ marginInlineStart: 'auto' }}>
              {t('settings.close', { defaultValue: 'Close' })}
            </button>
          </div>
        </div>

        {showQuitConfirm && (
          <div 
            data-testid="quit-confirm-dialog"
            className="settings-quit-confirm-dialog"
          >
            <div className="settings-quit-confirm-dialog__icon" style={{ fontSize: '2.2rem', marginBottom: '8px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px', color: '#ff6b6b' }}>
              {t('settings.quitConfirmTitle', { defaultValue: 'Quit Current Game?' })}
            </h3>
            <p style={{ color: '#ccc', fontSize: '0.88rem', marginBottom: '16px', maxWidth: '320px', lineHeight: 1.4 }}>
              {t('settings.quitConfirmMsg', { defaultValue: 'Are you sure you want to quit? Current game progress will be lost.' })}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="action-panel__btn"
                data-testid="btn-confirm-quit"
                onClick={() => {
                  setShowQuitConfirm(false);
                  onClose();
                  onQuitGame?.();
                }}
                style={{
                  backgroundColor: '#dc2626',
                  borderColor: '#ef4444',
                  color: '#fff',
                  padding: '8px 18px',
                  fontWeight: 'bold'
                }}
              >
                {t('settings.confirmQuit', { defaultValue: 'Yes, Quit' })}
              </button>
              <button
                className="action-panel__btn"
                data-testid="btn-cancel-quit"
                onClick={() => setShowQuitConfirm(false)}
                style={{ padding: '8px 18px' }}
              >
                {t('settings.cancel', { defaultValue: 'Cancel' })}
              </button>
            </div>
          </div>
        )}
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
