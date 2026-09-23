/**
 * Dashboard.tsx — Player stats HUD.
 *
 * Supports both modern Side HUD (default, with 2 columns & 3-state folding)
 * and classic Top HUD (desktop top-bar).
 */

import React from 'react';
import { type PlayerState, type GameState } from '../engine/gameState';
import {
  calcEducationProgress,
  calcCareerProgress,
  calcWealthProgress,
  calcEmployabilityScore,
  calcMaxDependability,
  calcMaxExperience,
  calcWellbeingScore,
  calcUsedSpace,
  calcHousingSpaceCap,
  formatHours
} from '../engine/statMath';
import { calcLiquidAssets } from '../engine/economyEngine';
import { useTranslation } from 'react-i18next';
import type { CampaignBundle } from '../engine/dataLoader';
import type { GoalFilter } from '../utils/logCategorizer';

export type HudLayoutMode = 'side' | 'top';
export type HudFoldState = 'full' | 'compact' | 'minimized';

interface DashboardProps {
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

  const education = calcEducationProgress(player.degrees.length);
  const career = calcCareerProgress(player.dependability, player.currentJobId !== null);
  const hasEarnedIncome = player.hasEarnedIncome ?? (turn > 1 || !!player.turnFlags?.hasWorked);
  const wealth = calcWealthProgress(calcLiquidAssets(player, campaign, economicIndex, turn, gameState?.economySimulation), hasEarnedIncome);
  const lifestyle = player.lifestyle || 0;
  const wellbeing = calcWellbeingScore(player.physicalCondition ?? 50, player.mentalCondition ?? 25);

  const statValues: Record<string, number> = {
    wealth,
    happiness: player.happiness,
    education,
    career,
    lifestyle,
    wellbeing,
  };

  let totalPoints = 0;
  let totalGoals = 0;

  const winConditions = campaign?.config.winConditions || [
    { stat: 'happiness', label: 'Happiness' },
    { stat: 'education', label: 'Education' },
    { stat: 'wealth', label: 'Wealth' },
    { stat: 'career', label: 'Career' }
  ];

  for (const cond of winConditions) {
    const target = player.goalAllotment[cond.stat] || 0;
    const current = statValues[cond.stat] || 0;
    const cappedCurrent = Math.min(current, target);
    totalGoals += target;
    totalPoints += cappedCurrent;
  }

  const victoryPercent = totalGoals > 0 ? Math.floor((totalPoints / totalGoals) * 100) : 0;

  const displayHappiness = !gameState.rules.allowOverAchievingGoals 
    ? Math.min(player.happiness, player.goalAllotment.happiness || 0)
    : player.happiness;

  const employabilityScore = calcEmployabilityScore(
    player.dependability || 0,
    player.experience || 0,
    player.degrees?.length || 0,
    0,
    player.social || 0
  );

  const currentJob = player.currentJobId ? campaign?.jobs?.find(j => j.id === player.currentJobId) : null;
  const jobReqDep = currentJob ? currentJob.requirements.dependability : 0;
  const jobReqExp = currentJob ? currentJob.requirements.experience : 0;
  const maxDep = calcMaxDependability(jobReqDep, player.degreeDepBoost || 0, player.depMaxBonus || 0);
  const maxExp = calcMaxExperience(jobReqExp, player.degreeExpBoost || 0, player.xpMaxBonus || 0);

  const mentalThreshold = campaign?.config?.statRules?.mentalWarningThreshold ?? campaign?.config?.statRules?.lowSpiritsThreshold ?? 10;
  const mentalVal = player.mentalCondition || 0;
  const isMentalCritical = mentalVal <= mentalThreshold;
  const isMentalWarning = mentalVal <= mentalThreshold * 2;

  const physicalThreshold = campaign?.config?.statRules?.physicalWarningThreshold ?? campaign?.config?.statRules?.physicalDoctorThreshold ?? 10;
  const physicalVal = player.physicalCondition || 0;
  const isPhysicalCritical = physicalVal <= physicalThreshold;
  const isPhysicalWarning = physicalVal <= physicalThreshold * 2;

  const handleFilterToggle = (filter: GoalFilter) => {
    if (!onSelectLogFilter) return;
    if (activeLogFilter === filter) {
      onSelectLogFilter(null);
    } else {
      onSelectLogFilter(filter);
    }
  };

  const readingVal = economicReading ?? gameState.economicReading ?? economicIndex;
  const trendVal = economicTrend ?? gameState.economicTrend ?? 0;
  const formattedReading = readingVal > 0 ? `+${readingVal}` : `${readingVal}`;
  const trendArrow = trendVal > 0 ? '↑' : trendVal < 0 ? '↓' : '→';
  const formattedTrend = `${trendVal > 0 ? `+${trendVal}` : `${trendVal}`} ${trendArrow}`;

  // ─────────────────────────────────────────────────────────────
  // 1. SIDE HUD (Modern default)
  // ─────────────────────────────────────────────────────────────
  if (layout === 'side') {
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
              <StatBadge
                label={t('dashboard.money', { defaultValue: 'Money' })}
                value={`$${player.money}`}
                icon="💰"
                id="stat-money"
                isActive={activeLogFilter === 'money'}
                onClick={() => handleFilterToggle('money')}
              />
              <StatBadge
                label={t('dashboard.victory', { defaultValue: 'Victory' })}
                value={`${victoryPercent}%`}
                icon="🏆"
                id="stat-victory"
              />
              {/* Dynamic Goal Badges for Non-Career Win Conditions */}
              {winConditions
                .filter(cond => cond.stat !== 'career')
                .map(cond => {
                  let current = 0;
                  if (cond.stat === 'wealth') current = !gameState.rules.allowOverAchievingGoals ? Math.min(wealth, player.goalAllotment.wealth || 0) : wealth;
                  else if (cond.stat === 'education') current = !gameState.rules.allowOverAchievingGoals ? Math.min(education, player.goalAllotment.education || 0) : education;
                  else if (cond.stat === 'happiness') current = displayHappiness as number;
                  else if (cond.stat === 'lifestyle') current = !gameState.rules.allowOverAchievingGoals ? Math.min(lifestyle, player.goalAllotment.lifestyle || 0) : lifestyle;
                  else if (cond.stat === 'wellbeing') current = !gameState.rules.allowOverAchievingGoals ? Math.min(wellbeing, player.goalAllotment.wellbeing || 0) : wellbeing;
                  else current = (player as any)[cond.stat] || 0;

                  const target = player.goalAllotment[cond.stat] || 0;
                  let icon = '🎯';
                  if (cond.stat === 'wealth') icon = '🤑';
                  else if (cond.stat === 'education') icon = '🎓';
                  else if (cond.stat === 'happiness') icon = '😊';
                  else if (cond.stat === 'lifestyle') icon = (player.lifestyle || 0) > 50 ? '🧐' : '😎';
                  else if (cond.stat === 'wellbeing') icon = '🧘';

                  return (
                    <StatBadge
                      key={cond.stat}
                      label={t(`dashboard.${cond.stat}`, { defaultValue: cond.label })}
                      value={`${current}/${target}`}
                      icon={icon}
                      id={`stat-${cond.stat}`}
                      isActive={activeLogFilter === cond.stat as any}
                      onClick={() => handleFilterToggle(cond.stat as GoalFilter)}
                    />
                  );
                })}

              {/* Health / Wellbeing stats */}
              {gameState.rules.usePhysicalMentalConditions ? (
                <>
                  <StatBadge
                    label={t('dashboard.physical', { defaultValue: 'Physical' })}
                    value={`${player.physicalCondition || 0}/${player.physicalConditionMax || 50}`}
                    icon="💪"
                    id="stat-physical"
                    danger={isPhysicalCritical}
                    warning={!isPhysicalCritical && isPhysicalWarning}
                    badge={(player.physicalConditionMax !== undefined && player.physicalConditionMax < 50) ? `Max ${player.physicalConditionMax} ↓` : undefined}
                    isActive={activeLogFilter === 'physical'}
                    onClick={() => handleFilterToggle('physical')}
                  />
                  <StatBadge
                    label={t('dashboard.mental', { defaultValue: 'Mental' })}
                    value={`${player.mentalCondition || 0}/${player.mentalConditionMax || 50}`}
                    icon="🧠"
                    id="stat-mental"
                    danger={isMentalCritical}
                    warning={!isMentalCritical && isMentalWarning}
                    badge={(player.mentalConditionMax !== undefined && player.mentalConditionMax < 50) ? `Max ${player.mentalConditionMax} ↓` : undefined}
                    isActive={activeLogFilter === 'mental'}
                    onClick={() => handleFilterToggle('mental')}
                  />
                  <StatBadge label={t('dashboard.social', { defaultValue: 'Social' })} value={`${player.social ?? 9}/99`} icon="👥" id="stat-social" />
                  {gameState.rules.trackMess && (
                    <StatBadge label={t('dashboard.mess', { defaultValue: 'Mess' })} value={`${player.mess ?? 0}`} icon="🧹" id="stat-mess" />
                  )}
                </>
              ) : (
                gameState.rules.helpfulUI && (
                  <StatBadge
                    label={t('dashboard.relaxation', { defaultValue: 'Relaxation' })}
                    value={player.relaxation}
                    icon="🧘"
                    id="stat-relaxation"
                    danger={gameState.rules.enableRelaxationDoctor && player.relaxation <= (gameState.rules.relaxationDoctorThreshold ?? 10)}
                    isActive={activeLogFilter === 'relaxation'}
                    onClick={() => handleFilterToggle('relaxation')}
                  />
                )
              )}

              {campaign?.config.statRules?.enableAdvancedStats && (
                <div className="hud-advanced-stats" style={{ display: 'flex', flexDirection: 'column', gap: '3px', padding: '4px 6px', backgroundColor: '#eef', borderRadius: '4px', fontSize: '0.82em', marginTop: '4px' }}>
                  {!campaign?.config.winConditions?.some(w => w.stat === 'lifestyle') && (
                    <div 
                      style={{ cursor: 'pointer', opacity: activeLogFilter && activeLogFilter !== 'lifestyle' ? 0.6 : 1 }}
                      onClick={() => handleFilterToggle('lifestyle')}
                    >
                      <strong>{t('stat.lifestyle', { defaultValue: 'Lifestyle' })}:</strong> {Math.floor(lifestyle)}
                    </div>
                  )}
                  {!gameState.rules.usePhysicalMentalConditions && (
                    <>
                      <div 
                        style={{
                           cursor: 'pointer',
                           opacity: activeLogFilter && activeLogFilter !== 'mental' ? 0.6 : 1,
                           fontWeight: isMentalCritical ? 'bold' : 'normal',
                           color: isMentalCritical ? '#e74c3c' : (isMentalWarning ? '#e67e22' : 'inherit')
                        }}
                        onClick={() => handleFilterToggle('mental')}
                      >
                         <strong>{t('stat.mentalCondition', { defaultValue: 'Mental Condition' })}:</strong> {Math.floor(player.mentalCondition || 0)}
                      </div>
                      <div 
                        style={{
                           cursor: 'pointer',
                           opacity: activeLogFilter && activeLogFilter !== 'physical' ? 0.6 : 1,
                           fontWeight: isPhysicalCritical ? 'bold' : 'normal',
                           color: isPhysicalCritical ? '#e74c3c' : (isPhysicalWarning ? '#e67e22' : 'inherit')
                        }}
                        onClick={() => handleFilterToggle('physical')}
                      >
                         <strong>{t('stat.physicalCondition', { defaultValue: 'Physical Condition' })}:</strong> {Math.floor(player.physicalCondition || 0)}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Column 2 — Career & Skills (Strict user order: Career, Employability, Dep, Exp, Mgmt, Tech) */}
          {foldState === 'full' && (
            <div className="side-hud__col side-hud__col--career">
              <div className="side-hud__col-header">💼 {t('dashboard.career', { defaultValue: 'Career' })}</div>
              <div className="side-hud__badges-group">
                <StatBadge
                  label={t('dashboard.career', { defaultValue: 'Career' })}
                  value={`${career}/${player.goalAllotment.career || 0}`}
                  icon="💼"
                  id="stat-career"
                  isActive={activeLogFilter === 'career'}
                  onClick={() => handleFilterToggle('career')}
                />
                {gameState.rules.helpfulUI && (
                  <>
                    <StatBadge
                      label={t('dashboard.employability', { defaultValue: 'Employability' })}
                      value={`${employabilityScore}%`}
                      icon="👨‍💼"
                      id="stat-employability"
                      isActive={activeLogFilter === 'employability'}
                      onClick={() => handleFilterToggle('employability')}
                    />
                    <StatBadge
                      label={t('dashboard.dependability', { defaultValue: 'Dependability' })}
                      value={`${player.dependability}/${maxDep}`}
                      icon="🤝"
                      id="stat-dependability"
                      isActive={activeLogFilter === 'dependability'}
                      onClick={() => handleFilterToggle('dependability')}
                    />
                    <StatBadge
                      label={t('dashboard.experience', { defaultValue: 'Experience' })}
                      value={`${player.experience}/${maxExp}`}
                      icon="👌"
                      id="stat-experience"
                      isActive={activeLogFilter === 'experience'}
                      onClick={() => handleFilterToggle('experience')}
                    />
                    <StatBadge
                      label={t('dashboard.skillMgmt', { defaultValue: 'Mgmt' })}
                      value={`${(player.skillMgmt ?? 0).toFixed(1)}/10`}
                      icon="👔"
                      id="stat-skill-mgmt"
                    />
                    <StatBadge
                      label={t('dashboard.skillTech', { defaultValue: 'Tech' })}
                      value={`${(player.skillTech ?? 0).toFixed(1)}/10`}
                      icon="🔧"
                      id="stat-skill-tech"
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. TOP HUD (Classic Desktop)
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

      {campaign?.config.statRules?.enableAdvancedStats && (
        <div className="hud-advanced-stats" style={{ display: 'flex', gap: '15px', padding: '5px 10px', backgroundColor: '#eef', borderRadius: '4px', fontSize: '0.9em', marginTop: '10px' }}>
          <div 
            style={{ cursor: 'pointer', opacity: activeLogFilter && activeLogFilter !== 'lifestyle' ? 0.6 : 1 }}
            onClick={() => handleFilterToggle('lifestyle')}
          >
            <strong>{t('stat.lifestyle')}:</strong> {Math.floor(lifestyle)}
          </div>
          <div 
            style={{
               cursor: 'pointer',
               opacity: activeLogFilter && activeLogFilter !== 'mental' ? 0.6 : 1,
               fontWeight: isMentalCritical ? 'bold' : 'normal',
               color: isMentalCritical ? '#e74c3c' : (isMentalWarning ? '#e67e22' : 'inherit')
            }}
            onClick={() => handleFilterToggle('mental')}
          >
             <strong>{t('stat.mentalCondition')}:</strong> {Math.floor(player.mentalCondition || 0)}
          </div>
          <div 
            style={{
               cursor: 'pointer',
               opacity: activeLogFilter && activeLogFilter !== 'physical' ? 0.6 : 1,
               fontWeight: isPhysicalCritical ? 'bold' : 'normal',
               color: isPhysicalCritical ? '#e74c3c' : (isPhysicalWarning ? '#e67e22' : 'inherit')
            }}
            onClick={() => handleFilterToggle('physical')}
          >
             <strong>{t('stat.physicalCondition')}:</strong> {Math.floor(player.physicalCondition || 0)}
          </div>
          {gameState.rules.spaceCapping && (
            <div 
              title={`Appliances & Books: ${calcUsedSpace(player, campaign, false)} space | Clutter/Mess: ${player.mess || 0} space`}
              style={{
                fontWeight: calcUsedSpace(player, campaign, true) >= calcHousingSpaceCap(player, campaign) ? 'bold' : 'normal',
                color: calcUsedSpace(player, campaign, true) >= calcHousingSpaceCap(player, campaign) ? '#e74c3c' : 'inherit'
              }}
            >
              <strong>📦 {t('stat.space', 'Space')}:</strong> {calcUsedSpace(player, campaign, true)}/{calcHousingSpaceCap(player, campaign)}
            </div>
          )}
        </div>
      )}

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
        <StatBadge label={t('dashboard.money', { defaultValue: 'Money' })} value={`$${player.money}`} icon="💰" id="stat-money" isActive={activeLogFilter === 'money'} onClick={() => handleFilterToggle('money')} />
        {gameState.rules.helpfulUI && (
          <>
            {!gameState.rules.usePhysicalMentalConditions && (
              <StatBadge label={t('dashboard.relaxation', { defaultValue: 'Relaxation' })} value={player.relaxation} icon="🧘" id="stat-relaxation" danger={gameState.rules.enableRelaxationDoctor && player.relaxation <= (gameState.rules.relaxationDoctorThreshold ?? 10)} isActive={activeLogFilter === 'relaxation'} onClick={() => handleFilterToggle('relaxation')} />
            )}
            <StatBadge label={t('dashboard.dependability', { defaultValue: 'Dependability' })} value={`${player.dependability}/${maxDep}`} icon="🤝" id="stat-dependability" isActive={activeLogFilter === 'dependability'} onClick={() => handleFilterToggle('dependability')} />
            <StatBadge label={t('dashboard.experience', { defaultValue: 'Experience' })} value={`${player.experience}/${maxExp}`} icon="👌" id="stat-experience" isActive={activeLogFilter === 'experience'} onClick={() => handleFilterToggle('experience')} />
            <StatBadge label={t('dashboard.employability', { defaultValue: 'Employability' })} value={`${employabilityScore}%`} icon="👨‍💼" id="stat-employability" isActive={activeLogFilter === 'employability'} onClick={() => handleFilterToggle('employability')} />
          </>
        )}
        {gameState.rules.usePhysicalMentalConditions && (
          <>
            <StatBadge 
              label={t('dashboard.physical', { defaultValue: 'Physical' })} 
              value={`${player.physicalCondition || 0}/${player.physicalConditionMax || 50}`} 
              icon="💪" 
              id="stat-physical" 
              danger={isPhysicalCritical}
              warning={!isPhysicalCritical && isPhysicalWarning}
              badge={(player.physicalConditionMax !== undefined && player.physicalConditionMax < 50) ? `Max ${player.physicalConditionMax} ↓` : undefined}
              isActive={activeLogFilter === 'physical'} 
              onClick={() => handleFilterToggle('physical')} 
            />
            <StatBadge 
              label={t('dashboard.mental', { defaultValue: 'Mental' })} 
              value={`${player.mentalCondition || 0}/${player.mentalConditionMax || 50}`} 
              icon="🧠" 
              id="stat-mental" 
              danger={isMentalCritical}
              warning={!isMentalCritical && isMentalWarning}
              badge={(player.mentalConditionMax !== undefined && player.mentalConditionMax < 50) ? `Max ${player.mentalConditionMax} ↓` : undefined}
              isActive={activeLogFilter === 'mental'} 
              onClick={() => handleFilterToggle('mental')} 
            />
            <StatBadge label={t('dashboard.social', { defaultValue: 'Social' })} value={`${player.social ?? 9}/99`} icon="👥" id="stat-social" />
            {gameState.rules.trackMess && (
              <StatBadge label={t('dashboard.mess', { defaultValue: 'Mess' })} value={`${player.mess ?? 0}`} icon="🧹" id="stat-mess" />
            )}
            <StatBadge 
              label={t('dashboard.skillTech', { defaultValue: 'Tech' })} 
              value={`${(player.skillTech ?? 0).toFixed(2)}/10`} 
              icon="🔧" 
              id="stat-skill-tech" 
            />
            <StatBadge 
              label={t('dashboard.skillMgmt', { defaultValue: 'Mgmt' })} 
              value={`${(player.skillMgmt ?? 0).toFixed(2)}/10`} 
              icon="👔" 
              id="stat-skill-mgmt" 
            />
          </>
        )}
        <StatBadge label={t('dashboard.victory', { defaultValue: 'Victory' })} value={`${victoryPercent}%`} icon="🏆" id="stat-victory" />
        {(campaign?.config.winConditions || [
          { stat: 'happiness', label: 'Happiness' },
          { stat: 'education', label: 'Education' },
          { stat: 'career', label: 'Career' },
          { stat: 'wealth', label: 'Wealth' }
        ]).map(cond => {
          let current = 0;
          if (cond.stat === 'wealth') current = !gameState.rules.allowOverAchievingGoals ? Math.min(wealth, player.goalAllotment.wealth) : wealth;
          else if (cond.stat === 'education') current = !gameState.rules.allowOverAchievingGoals ? Math.min(education, player.goalAllotment.education) : education;
          else if (cond.stat === 'career') current = !gameState.rules.allowOverAchievingGoals ? Math.min(career, player.goalAllotment.career) : career;
          else if (cond.stat === 'happiness') current = displayHappiness as number;
          else if (cond.stat === 'lifestyle') current = !gameState.rules.allowOverAchievingGoals ? Math.min(lifestyle, player.goalAllotment.lifestyle || 0) : lifestyle;
          else if (cond.stat === 'wellbeing') current = !gameState.rules.allowOverAchievingGoals ? Math.min(wellbeing, player.goalAllotment.wellbeing || 0) : wellbeing;
          else current = (player as any)[cond.stat] || 0;

          const target = player.goalAllotment[cond.stat] || 0;
          let icon = '🎯';
          if (cond.stat === 'wealth') icon = '🤑';
          else if (cond.stat === 'education') icon = '🎓';
          else if (cond.stat === 'career') icon = '💼';
          else if (cond.stat === 'happiness') icon = '😊';
          else if (cond.stat === 'lifestyle') icon = (player.lifestyle || 0) > 50 ? '🧐' : '😎';
          else if (cond.stat === 'wellbeing') icon = '🧘';

          return (
            <StatBadge 
              key={cond.stat}
              label={t(`dashboard.${cond.stat}`, { defaultValue: cond.label })} 
              value={`${current}/${target}`} 
              icon={icon} 
              id={`stat-${cond.stat}`} 
              isActive={activeLogFilter === cond.stat as any} 
              onClick={() => handleFilterToggle(cond.stat as GoalFilter)} 
            />
          );
        })}
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
