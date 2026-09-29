/**
 * Dashboard.tsx — Player stats HUD.
 *
 * Supports both modern Side HUD (default, with 2 columns & 3-state folding)
 * and classic Top HUD (desktop top-bar).
 */

import React from 'react';
import { type PlayerState, type GameState } from '../engine/gameState';
import {
  calcUsedSpace,
  calcHousingSpaceCap,
  formatHours
} from '../engine/statMath';
import { useTranslation } from 'react-i18next';
import type { CampaignBundle } from '../engine/dataLoader';
import { buildDashboardBadges } from './dashboardBadges';
import type { GoalFilter } from '../utils/logCategorizer';

export type HudLayoutMode = 'auto' | 'side' | 'top';
export type HudFoldState = 'full' | 'compact' | 'minimized';

export interface DashboardProps {
  player: PlayerState | null;
  gameState: GameState;
  turn: number;
  economicIndex?: number;
  economicReading?: number;
  economicTrend?: number;
  hoursPerTurn: number;
  campaign?: CampaignBundle;
  activeLogFilter?: GoalFilter | null;
  onSelectLogFilter?: (filter: GoalFilter | null) => void;
  onOpenInventory: () => void;
  onOpenSettings: () => void;
  layout?: HudLayoutMode;
  foldState?: HudFoldState;
  onToggleFold?: (nextState: HudFoldState) => void;
}

interface AdvancedStatsStripProps {
  campaign?: CampaignBundle;
  gameState: GameState;
  player: PlayerState;
  lifestyle: number;
  isMentalCritical: boolean;
  isMentalWarning: boolean;
  isPhysicalCritical: boolean;
  isPhysicalWarning: boolean;
  activeLogFilter?: GoalFilter | null;
  onFilterToggle: (filter: GoalFilter) => void;
  t: (key: string, options?: any) => string;
}

function AdvancedStatsStrip({
  campaign,
  gameState,
  player,
  lifestyle,
  isMentalCritical,
  isMentalWarning,
  isPhysicalCritical,
  isPhysicalWarning,
  activeLogFilter,
  onFilterToggle,
  t,
}: AdvancedStatsStripProps) {
  if (!campaign?.config.statRules?.enableAdvancedStats) return null;

  return (
    <div
      className="hud-advanced-stats"
      style={{
        display: 'flex',
        gap: '15px',
        flexWrap: 'wrap',
        padding: '5px 10px',
        backgroundColor: '#eef',
        borderRadius: '4px',
        fontSize: '0.9em',
        marginTop: '6px',
      }}
    >
      {!campaign?.config.winConditions?.some((w) => w.stat === 'lifestyle') && (
        <div
          style={{ cursor: 'pointer', opacity: activeLogFilter && activeLogFilter !== 'lifestyle' ? 0.6 : 1 }}
          onClick={() => onFilterToggle('lifestyle')}
        >
          <strong>{t('stat.lifestyle')}:</strong> {Math.floor(lifestyle)}
        </div>
      )}
      <div
        style={{
          cursor: 'pointer',
          opacity: activeLogFilter && activeLogFilter !== 'mental' ? 0.6 : 1,
          fontWeight: isMentalCritical ? 'bold' : 'normal',
          color: isMentalCritical ? '#e74c3c' : isMentalWarning ? '#e67e22' : 'inherit',
        }}
        onClick={() => onFilterToggle('mental')}
      >
        <strong>{t('stat.mentalCondition')}:</strong>{' '}
        {Math.floor(player.mentalCondition || 0)}
      </div>
      <div
        style={{
          cursor: 'pointer',
          opacity: activeLogFilter && activeLogFilter !== 'physical' ? 0.6 : 1,
          fontWeight: isPhysicalCritical ? 'bold' : 'normal',
          color: isPhysicalCritical ? '#e74c3c' : isPhysicalWarning ? '#e67e22' : 'inherit',
        }}
        onClick={() => onFilterToggle('physical')}
      >
        <strong>{t('stat.physicalCondition')}:</strong>{' '}
        {Math.floor(player.physicalCondition || 0)}
      </div>
      {gameState.rules.spaceCapping && (
        <div
          title={`Appliances & Books: ${calcUsedSpace(player, campaign, false)} space | Clutter/Mess: ${player.mess || 0} space`}
          style={{
            fontWeight:
              calcUsedSpace(player, campaign, true) >= calcHousingSpaceCap(player, campaign)
                ? 'bold'
                : 'normal',
            color:
              calcUsedSpace(player, campaign, true) >= calcHousingSpaceCap(player, campaign)
                ? '#e74c3c'
                : 'inherit',
          }}
        >
          <strong>📦 {t('stat.space', 'Space')}:</strong>{' '}
          {calcUsedSpace(player, campaign, true)}/{calcHousingSpaceCap(player, campaign)}
        </div>
      )}
    </div>
  );
}

export function Dashboard({
  player,
  gameState,
  turn,
  economicIndex = 0,
  economicReading,
  economicTrend,
  hoursPerTurn,
  campaign,
  activeLogFilter,
  onSelectLogFilter,
  onOpenInventory,
  onOpenSettings,
  layout = gameState?.rules?.hudLayout || 'top',
  foldState = 'full',
  onToggleFold
}: DashboardProps) {
  const { t } = useTranslation();
  if (!player) return <header className="dashboard">{t('dashboard.loading')}</header>;

  const handleFilterToggle = (filter: GoalFilter) => {
    if (!onSelectLogFilter) return;
    if (activeLogFilter === filter) {
      onSelectLogFilter(null);
    } else {
      onSelectLogFilter(filter);
    }
  };

  const isLandscape = typeof window !== 'undefined' && window.innerWidth > window.innerHeight;
  const currentHudSetting = layout ?? gameState?.rules?.hudLayout ?? 'top';
  const effectiveLayout: 'side' | 'top' = currentHudSetting === 'auto'
    ? (isLandscape ? 'side' : 'top')
    : currentHudSetting;

  const readingVal = economicReading ?? gameState.economicReading ?? economicIndex;
  const trendVal = economicTrend ?? gameState.economicTrend ?? 0;
  const formattedReading = readingVal > 0 ? `+${readingVal}` : `${readingVal}`;
  const trendArrow = trendVal > 0 ? '↑' : trendVal < 0 ? '↓' : '→';
  const formattedTrend = `${trendVal > 0 ? `+${trendVal}` : `${trendVal}`} ${trendArrow}`;

  const { lifeBadges, careerBadges, allBadges, stats } = buildDashboardBadges({
    player,
    rules: gameState.rules,
    gameState,
    campaign,
    turn,
    economicIndex,
    activeLogFilter,
    onFilterToggle: handleFilterToggle,
    t,
  });

  // ─────────────────────────────────────────────────────────────
  // 1. SIDE HUD (Modern Widescreen / Phone Landscape)
  // ─────────────────────────────────────────────────────────────
  if (effectiveLayout === 'side') {
    if (foldState === 'minimized') {
      return (
        <aside className="side-hud side-hud--minimized" data-testid="side-hud-minimized">
          <button
            className="side-hud__tab-btn"
            onClick={() => onToggleFold?.('compact')}
            title={t('dashboard.expandHUD', { defaultValue: 'Expand Stats' })}
            data-testid="side-hud-expand"
          >
            ▶ 📊
          </button>
        </aside>
      );
    }

    return (
      <aside className={`side-hud side-hud--${foldState}`} data-testid={`side-hud-${foldState}`}>
        {/* Folding Controls Bar */}
        <div className="side-hud__folding-header">
          {foldState === 'full' ? (
            <button
              className="side-hud__fold-btn"
              onClick={() => onToggleFold?.('compact')}
              title={t('dashboard.foldCareer', { defaultValue: 'Fold Career Column' })}
              data-testid="side-hud-fold"
            >
              ◀ {t('dashboard.fold', { defaultValue: 'Fold Career' })}
            </button>
          ) : (
            <div className="side-hud__fold-btn-group">
              <button
                className="side-hud__fold-btn"
                onClick={() => onToggleFold?.('minimized')}
                title={t('dashboard.minimize', { defaultValue: 'Minimize HUD' })}
                data-testid="side-hud-minimize"
              >
                ◀ {t('dashboard.hide', { defaultValue: 'Hide' })}
              </button>
              <button
                className="side-hud__fold-btn"
                onClick={() => onToggleFold?.('full')}
                title={t('dashboard.expandCareer', { defaultValue: 'Expand Career' })}
                data-testid="side-hud-expand-career"
              >
                ▶ {t('dashboard.career', { defaultValue: 'Career' })}
              </button>
            </div>
          )}
        </div>

        <div className="side-hud__columns">
          {/* Column 1 — Life & Goals */}
          <div className="side-hud__col side-hud__col--life">
            <div className="side-hud__player-card">
              <h2 className="side-hud__player-title">{player ? player.name : ''} - {t('dashboard.turn', { turn, defaultValue: `Week ${turn}` })}</h2>
              {player.isAi && <span className="ai-badge">{t('dashboard.aiBadge', { defaultValue: 'AI' })}</span>}
              {player.inventory?.selectedClothes === 'none' && <span className="naked-badge">⚠️ NAKED</span>}
              {gameState.rules.helpfulUI && (
                <div 
                  className="side-hud__economy"
                  title={t('dashboard.economyTooltip', { defaultValue: 'Economic Reading: Price level relative to baseline (higher = higher prices).\nEconomic Trend: Momentum pushing prices up or down (-3 to +3).' })}
                >
                  <span>
                    {t('dashboard.economy', { 
                      reading: formattedReading, 
                      trend: formattedTrend,
                      index: formattedReading,
                      defaultValue: `Economy: Reading ${formattedReading} | Trend ${formattedTrend}`
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="side-hud__controls-card">
              <button
                id="btn-inventory"
                onClick={onOpenInventory}
                className="side-hud__btn side-hud__btn--status"
              >
                📊 {t('dashboard.status', { defaultValue: 'Status' })}
              </button>
              <button
                id="btn-settings"
                onClick={onOpenSettings}
                className="side-hud__btn side-hud__btn--settings"
                title={t('dashboard.settings', { defaultValue: 'Settings' })}
              >
                ⚙️
              </button>
            </div>

            <div className="side-hud__badges-group">
              {lifeBadges.map((badge) => (
                <StatBadge key={badge.id} {...badge} />
              ))}

              <AdvancedStatsStrip
                campaign={campaign}
                gameState={gameState}
                player={player}
                lifestyle={stats.lifestyle}
                isMentalCritical={stats.isMentalCritical}
                isMentalWarning={stats.isMentalWarning}
                isPhysicalCritical={stats.isPhysicalCritical}
                isPhysicalWarning={stats.isPhysicalWarning}
                activeLogFilter={activeLogFilter}
                onFilterToggle={handleFilterToggle}
                t={t}
              />
            </div>
          </div>

          {/* Column 2 — Career & Skills (Strict user order: Career, Employability, Dep, Exp, Mgmt, Tech) */}
          {foldState === 'full' && (
            <div className="side-hud__col side-hud__col--career">
              <div className="side-hud__col-header">💼 {t('dashboard.career', { defaultValue: 'Career' })}</div>
              <div className="side-hud__badges-group">
                {careerBadges.map((badge) => (
                  <StatBadge key={badge.id} {...badge} />
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. TOP HUD (Classic Desktop / Phone Portrait)
  // ─────────────────────────────────────────────────────────────
  return (
    <header className="dashboard">
      <div className="dashboard-top-row">
        <div className="dashboard-player-info">
          <h2>{player ? player.name : ''} - {t('dashboard.turn', { turn, defaultValue: `Week ${turn}` })}</h2>
          {player?.isAi && <span className="ai-badge">{t('dashboard.aiBadge', { defaultValue: 'AI' })}</span>}
          {player?.inventory?.selectedClothes === 'none' && <span style={{ background: 'red', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', fontWeight: 'bold' }}>⚠️ NAKED</span>}
          {gameState.rules.helpfulUI && (
            <div 
              className="dashboard-stat economy"
              title={t('dashboard.economyTooltip', { defaultValue: 'Economic Reading: Price level relative to baseline (higher = higher prices).\nEconomic Trend: Momentum pushing prices up or down (-3 to +3).' })}
            >
              <span>
                {t('dashboard.economy', { 
                  reading: formattedReading, 
                  trend: formattedTrend,
                  index: formattedReading,
                  defaultValue: `Economy: Reading ${formattedReading} | Trend ${formattedTrend}`
                })}
              </span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: `conic-gradient(#ff3333 0%, #ff3333 ${Math.max(0, (((hoursPerTurn - player.hoursRemaining) / hoursPerTurn) * 100) - 0.25)}%, white ${Math.min(100, (((hoursPerTurn - player.hoursRemaining) / hoursPerTurn) * 100) + 0.25)}% 100%)`,
            border: '2px solid #333',
            boxShadow: 'inset 0 0 4px rgba(0,0,0,0.4)',
            marginRight: '10px'
          }} />
          <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#00e5ff', textShadow: '0 0 5px #00e5ff', whiteSpace: 'nowrap' }}>
            ⏳ {formatHours(player.hoursRemaining)} / {hoursPerTurn}{t('dashboard.hrs', { defaultValue: ' hrs' })} {t('dashboard.left', { defaultValue: 'left' })}
          </div>
        </div>
        <button 
          id="btn-inventory"
          onClick={onOpenInventory}
          style={{
            padding: '8px 12px', marginRight: '10px',
            backgroundColor: '#f39c12', color: '#000', border: 'none', borderRadius: '4px',
            fontWeight: 'bold', cursor: 'pointer'
          }}
        >
          📊 {t('dashboard.status', { defaultValue: 'Status' })}
        </button>
        <button 
          id="btn-settings"
          onClick={onOpenSettings}
          style={{
            padding: '8px 12px', marginRight: '10px',
            backgroundColor: '#444', color: '#fff', border: '1px solid var(--accent-cyan)', borderRadius: '4px',
            fontWeight: 'bold', cursor: 'pointer'
          }}
          title={t('dashboard.settings', { defaultValue: 'Settings' })}
        >
          ⚙️
        </button>
      </div>

      <AdvancedStatsStrip
        campaign={campaign}
        gameState={gameState}
        player={player}
        lifestyle={stats.lifestyle}
        isMentalCritical={stats.isMentalCritical}
        isMentalWarning={stats.isMentalWarning}
        isPhysicalCritical={stats.isPhysicalCritical}
        isPhysicalWarning={stats.isPhysicalWarning}
        activeLogFilter={activeLogFilter}
        onFilterToggle={handleFilterToggle}
        t={t}
      />

      {(gameState.rules as any).showDetailedStats && !campaign?.config.statRules?.enableAdvancedStats && (
        <div className="hud-advanced-stats" style={{ display: 'flex', gap: '15px', padding: '5px 10px', backgroundColor: '#eef', borderRadius: '4px', fontSize: '0.9em', marginTop: '10px' }}>
          <div><strong>{t('stat.dependability')}:</strong> {Math.floor(player.dependability)}</div>
          <div><strong>{t('stat.experience')}:</strong> {Math.floor(player.experience)}</div>
          {(gameState.rules as any).useRelaxationStat && (
            <div>
              <strong>{t('stat.relaxation')}:</strong> {Math.floor(player.relaxation || 0)}
            </div>
          )}
        </div>
      )}

      <div className="dashboard__stats" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', minHeight: '44px' }}>
        {allBadges.map((badge) => (
          <StatBadge key={badge.id} {...badge} />
        ))}
      </div>
    </header>
  );
}

interface StatBadgeProps {
  label: string;
  value: React.ReactNode;
  icon: string;
  id?: string;
  danger?: boolean;
  warning?: boolean;
  badge?: string;
  isActive?: boolean;
  onClick?: () => void;
}

function StatBadge({ label, value, icon, id, danger, warning, badge, isActive, onClick }: StatBadgeProps) {
  const activeStyle: React.CSSProperties = isActive ? {
    borderColor: '#00e5ff',
    boxShadow: '0 0 10px rgba(0, 229, 255, 0.7)',
    backgroundColor: 'rgba(0, 229, 255, 0.15)'
  } : {};

  return (
    <div
      className={`stat-badge ${isActive ? 'stat-badge--active' : ''}`}
      title={label}
      id={id}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background-color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        userSelect: 'none',
        position: 'relative',
        boxSizing: 'border-box',
        ...activeStyle
      }}
    >
      <span className="stat-badge__icon">{icon}</span>
      <span 
        className="stat-badge__value" 
        style={danger ? { color: '#ff3333', fontWeight: 'bold', textShadow: '0 0 8px rgba(255,51,51,0.6)' } : (warning ? { color: '#e67e22', fontWeight: 'bold', textShadow: '0 0 8px rgba(230,126,34,0.4)' } : {})}
      >
        {value}
      </span>
      <span 
        className="stat-badge__label" 
        style={danger ? { color: '#ff3333' } : (warning ? { color: '#e67e22' } : {})}
      >
        {label}
      </span>
      {badge && (
        <span style={{
          position: 'absolute',
          top: '-6px',
          right: '-6px',
          backgroundColor: '#e74c3c',
          color: '#fff',
          fontSize: '0.65em',
          padding: '1px 4px',
          borderRadius: '3px',
          fontWeight: 'bold',
          boxShadow: '0 0 4px rgba(0,0,0,0.5)'
        }}>
          {badge}
        </span>
      )}
    </div>
  );
}
