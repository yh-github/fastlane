/**
 * Dashboard.tsx — Top bar HUD displaying player stats.
 *
 * Shows money, happiness, education, career progress,
 * luck score, and the current week/economy indicator.
 */

import { type PlayerState, type GameState } from '../engine/gameState';
import { calcEducationProgress, calcCareerProgress, calcWealthProgress, calcEmployabilityScore, calcMaxDependability, calcMaxExperience, calcWellbeingScore } from '../engine/statMath';
import { calcLiquidAssets } from '../engine/economyEngine';
import { useTranslation } from 'react-i18next';
import type { CampaignBundle } from '../engine/dataLoader';
import type { GoalFilter } from '../utils/logCategorizer';

interface DashboardProps {
  player: PlayerState | null;
  gameState: GameState;
  turn: number;
  economicIndex: number;
  hoursPerTurn: number;
  campaign?: CampaignBundle;
  activeLogFilter?: GoalFilter | null;
  onSelectLogFilter?: (filter: GoalFilter | null) => void;
  onOpenInventory: () => void;
  onOpenSettings: () => void;
}

import { calcEffectiveRobberyChance, calcTheoreticalRobberyChance } from '../engine/statMath';

export function Dashboard({
  player,
  gameState,
  turn,
  economicIndex,
  hoursPerTurn,
  campaign,
  activeLogFilter,
  onSelectLogFilter,
  onOpenInventory,
  onOpenSettings
}: DashboardProps) {
  const { t } = useTranslation();
  if (!player) return <header className="dashboard">{t('dashboard.loading')}</header>;

  let education = calcEducationProgress(player.degrees.length);
  let career = calcCareerProgress(player.dependability, player.currentJobId !== null);
  let wealth = calcWealthProgress(calcLiquidAssets(player, campaign, economicIndex, turn));
  let lifestyle = player.lifestyle || 0;
  let wellbeing = calcWellbeingScore(player.physicalCondition ?? 50, player.mentalCondition ?? 25);

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
    { stat: 'wealth', label: 'Wealth' },
    { stat: 'happiness', label: 'Happiness' },
    { stat: 'education', label: 'Education' },
    { stat: 'career', label: 'Career' }
  ];

  for (const cond of winConditions) {
    const target = player.goalAllotment[cond.stat] || 0;
    let current = statValues[cond.stat] || 0;
    
    // Always cap contribution towards overall victory progress at target so overachieved stats
    // don't inflate overall progress past 100% while required goals remain incomplete
    const cappedCurrent = Math.min(current, target);
    
    totalGoals += target;
    totalPoints += cappedCurrent;
  }

  const victoryPercent = totalGoals > 0 ? Math.floor((totalPoints / totalGoals) * 100) : 0;

  const displayHappiness = !gameState.rules.allowOverAchievingGoals 
    ? Math.min(player.happiness, player.goalAllotment.happiness || 0)
    : player.happiness;

  const employabilityScore = calcEmployabilityScore(player.dependability || 0, player.experience || 0, player.degrees?.length || 0, 0, player.social || 0);

  const currentJob = player.currentJobId ? campaign?.jobs.find(j => j.id === player.currentJobId) : null;
  const jobReqDep = currentJob ? currentJob.requirements.dependability : 0;
  const jobReqExp = currentJob ? currentJob.requirements.experience : 0;
  const maxDep = calcMaxDependability(jobReqDep, player.degreeDepBoost || 0, player.depMaxBonus || 0);
  const maxExp = calcMaxExperience(jobReqExp, player.degreeExpBoost || 0, player.xpMaxBonus || 0);

  const homeHistory = [...(player.homeTimeHistory || []), player.homeTimeThisTurn || 0];
  const homeTimeAvg = homeHistory.length > 0 ? (homeHistory.reduce((a, b) => a + b, 0) / homeHistory.length) : 0;
  const willyStartWeek = campaign?.config?.eventRules?.willyRobberyStartWeek ?? 4;
  const isWillyActive = turn >= willyStartWeek;
  const theoreticalRobbery = calcTheoreticalRobberyChance(player, gameState.rules);
  const effectiveRobbery = calcEffectiveRobberyChance(player, gameState.rules, turn, campaign);

  const handleFilterToggle = (filter: GoalFilter) => {
    if (!onSelectLogFilter) return;
    if (activeLogFilter === filter) {
      onSelectLogFilter(null);
    } else {
      onSelectLogFilter(filter);
    }
  };

  return (
    <header className="dashboard">
      <div className="dashboard-top-row">
        <div className="dashboard-player-info">
          <h2>{player ? player.name : ''} - {t('dashboard.turn', { turn, defaultValue: `Week ${turn}` })}</h2>
          {player?.isAi && <span className="ai-badge">{t('dashboard.aiBadge', { defaultValue: 'AI' })}</span>}
          {player?.inventory?.selectedClothes === 'none' && <span style={{ background: 'red', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', fontWeight: 'bold' }}>⚠️ NAKED</span>}
          {gameState.rules.helpfulUI && (
            <div className="dashboard-stat economy">
              <span>{t('dashboard.economy', { index: economicIndex, defaultValue: 'Economy: {{index}}' })}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: `conic-gradient(#ff3333 0% ${((hoursPerTurn - player.hoursRemaining) / hoursPerTurn) * 100}%, white ${((hoursPerTurn - player.hoursRemaining) / hoursPerTurn) * 100}% 100%)`,
            border: '2px solid #333',
            boxShadow: 'inset 0 0 4px rgba(0,0,0,0.4)',
            marginRight: '10px'
          }} />
          <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#00e5ff', textShadow: '0 0 5px #00e5ff', whiteSpace: 'nowrap' }}>
            ⏳ {Number(player.hoursRemaining).toFixed(1)} / {hoursPerTurn}{t('dashboard.hrs', { defaultValue: ' hrs' })} {t('dashboard.left', { defaultValue: 'left' })}
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
               fontWeight: (player.mentalCondition || 0) <= (campaign.config.statRules?.mentalWarningThreshold || 10) ? 'bold' : 'normal',
               color: (player.mentalCondition || 0) < (campaign.config.statRules?.mentalWarningThreshold || 10) ? 'red' : ((player.mentalCondition || 0) === (campaign.config.statRules?.mentalWarningThreshold || 10) ? 'orange' : 'inherit')
            }}
            onClick={() => handleFilterToggle('mental')}
          >
             <strong>{t('stat.mentalCondition')}:</strong> {Math.floor(player.mentalCondition || 0)}
          </div>
          <div 
            style={{
               cursor: 'pointer',
               opacity: activeLogFilter && activeLogFilter !== 'physical' ? 0.6 : 1,
               fontWeight: (player.physicalCondition || 0) <= (campaign.config.statRules?.physicalWarningThreshold || 10) ? 'bold' : 'normal',
               color: (player.physicalCondition || 0) < (campaign.config.statRules?.physicalWarningThreshold || 10) ? 'red' : ((player.physicalCondition || 0) === (campaign.config.statRules?.physicalWarningThreshold || 10) ? 'orange' : 'inherit')
            }}
            onClick={() => handleFilterToggle('physical')}
          >
             <strong>{t('stat.physicalCondition')}:</strong> {Math.floor(player.physicalCondition || 0)}
          </div>
          {gameState.rules.useHomeTimeRobbery && (
            <div>
              <strong>🏠 {t('stat.homeTime', 'Home Time')}:</strong> {Math.round(homeTimeAvg)}h/wk
            </div>
          )}
          <div>
            <strong>🏠 {t('stat.breakInChance', 'Break-in Risk')}:</strong> {
              !isWillyActive && theoreticalRobbery > 0 ? (
                <span style={{ color: '#888', fontStyle: 'italic' }} title={`Theoretical risk based on home time (Inactive until Week ${willyStartWeek})`}>
                  {(theoreticalRobbery * 100).toFixed(1)}%
                </span>
              ) : (
                `${(effectiveRobbery * 100).toFixed(1)}%`
              )
            }
          </div>
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
          {gameState.rules.useHomeTimeRobbery && (
            <div>
              <strong>🏠 {t('stat.homeTime', 'Home Time')}:</strong> {Math.round(homeTimeAvg)}h/wk
            </div>
          )}
          <div>
            <strong>🏠 {t('stat.breakInChance', 'Break-in Risk')}:</strong> {
              !isWillyActive && theoreticalRobbery > 0 ? (
                <span style={{ color: '#888', fontStyle: 'italic' }} title={`Theoretical risk (Inactive until Week ${willyStartWeek})`}>
                  {(theoreticalRobbery * 100).toFixed(1)}%
                </span>
              ) : (
                `${(effectiveRobbery * 100).toFixed(1)}%`
              )
            }
          </div>
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
              badge={(player.physicalConditionMax !== undefined && player.physicalConditionMax < 50) ? `Max ${player.physicalConditionMax} ↓` : undefined}
              isActive={activeLogFilter === 'physical'} 
              onClick={() => handleFilterToggle('physical')} 
            />
            <StatBadge 
              label={t('dashboard.mental', { defaultValue: 'Mental' })} 
              value={`${player.mentalCondition || 0}/${player.mentalConditionMax || 50}`} 
              icon="🧠" 
              id="stat-mental" 
              badge={(player.mentalConditionMax !== undefined && player.mentalConditionMax < 50) ? `Max ${player.mentalConditionMax} ↓` : undefined}
              isActive={activeLogFilter === 'mental'} 
              onClick={() => handleFilterToggle('mental')} 
            />
            <StatBadge label={t('dashboard.social', { defaultValue: 'Social' })} value={`${player.social ?? 9}/99`} icon="👥" id="stat-social" />
            {gameState.rules.trackMess && (
              <StatBadge label={t('dashboard.mess', { defaultValue: 'Mess' })} value={`${player.mess ?? 0}`} icon="🧹" id="stat-mess" />
            )}
          </>
        )}
        {(gameState.rules.useHomeTimeRobbery || gameState.rules.helpfulUI) && (
          <StatBadge 
            label={t('dashboard.home', { defaultValue: 'HOME' })} 
            value={
              <>
                {Math.round(homeTimeAvg)}h {
                  !isWillyActive && theoreticalRobbery > 0 ? (
                    <span style={{ color: '#aaa', fontStyle: 'italic' }} title={`Theoretical risk based on home time (Inactive until Week ${willyStartWeek})`}>
                      ({(theoreticalRobbery * 100).toFixed(1)}%)
                    </span>
                  ) : (
                    `(${(effectiveRobbery * 100).toFixed(1)}%)`
                  )
                }
              </>
            } 
            icon="🏠" 
            id="stat-home-risk" 
          />
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
  badge?: string;
  isActive?: boolean;
  onClick?: () => void;
}

function StatBadge({ label, value, icon, id, danger, badge, isActive, onClick }: StatBadgeProps) {
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
      <span className="stat-badge__value" style={danger ? { color: '#ff3333', fontWeight: 'bold', textShadow: '0 0 8px rgba(255,51,51,0.6)' } : {}}>{value}</span>
      <span className="stat-badge__label" style={danger ? { color: '#ff3333' } : {}}>{label}</span>
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
