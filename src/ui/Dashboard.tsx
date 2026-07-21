/**
 * Dashboard.tsx — Top bar HUD displaying player stats.
 *
 * Shows money, happiness, education, career progress,
 * luck score, and the current week/economy indicator.
 */

import { type PlayerState, type GameState } from '../engine/gameState';
import { calcEducationProgress, calcCareerProgress, calcWealthProgress, calcLuckScore, calcMaxDependability, calcMaxExperience } from '../engine/statMath';
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

  const cappedWealth = Math.min(wealth, player.goalAllotment.wealth);
  const cappedHappiness = Math.min(player.happiness, player.goalAllotment.happiness);
  const cappedEducation = Math.min(education, player.goalAllotment.education);
  const cappedCareer = Math.min(career, player.goalAllotment.career);

  const totalPoints = cappedWealth + cappedHappiness + cappedEducation + cappedCareer;
  const totalGoals = player.goalAllotment.wealth + player.goalAllotment.happiness + player.goalAllotment.education + player.goalAllotment.career;
  const victoryPercent = totalGoals > 0 ? Math.floor((totalPoints / totalGoals) * 100) : 0;

  if (!gameState.rules.allowOverAchievingGoals) {
    education = cappedEducation;
    career = cappedCareer;
    wealth = cappedWealth;
  }
  
  const displayHappiness = !gameState.rules.allowOverAchievingGoals 
    ? cappedHappiness 
    : player.happiness;

  const luckScore = calcLuckScore(player.dependability || 0, player.experience || 0, player.degrees?.length || 0);

  const currentJob = player.currentJobId ? campaign?.jobs.find(j => j.id === player.currentJobId) : null;
  const jobReqDep = currentJob ? currentJob.requirements.dependability : 0;
  const jobReqExp = currentJob ? currentJob.requirements.experience : 0;
  const maxDep = calcMaxDependability(jobReqDep, player.degrees?.length || 0);
  const maxExp = calcMaxExperience(jobReqExp, player.degrees?.length || 0);

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
          <h2>{player ? player.name : ''} - {t('dashboard.turn', { turn, defaultValue: 'Week {{turn}}' })}</h2>
          {player?.isAi && <span className="ai-badge">{t('dashboard.aiBadge', { defaultValue: 'AI' })}</span>}
          {player?.inventory?.selectedClothes === 'none' && <span style={{ background: 'red', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', fontWeight: 'bold' }}>⚠️ NAKED</span>}
          <div className="dashboard-stat economy">
            <span>{t('dashboard.economy', { index: economicIndex, defaultValue: 'Economy: {{index}}' })}</span>
          </div>
          <div className="dashboard-stat victory-percent" style={{ marginLeft: '12px', padding: '2px 8px', background: '#333', borderRadius: '4px', border: '1px solid #555' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--accent-green)' }}>🏆 {victoryPercent}%</span>
          </div>
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
      <div className="dashboard__stats" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <StatBadge label={t('dashboard.money', { defaultValue: 'Money' })} value={`$${player.money}`} icon="💰" id="stat-money" isActive={activeLogFilter === 'money'} onClick={() => handleFilterToggle('money')} />
        <StatBadge label={t('dashboard.relaxation', { defaultValue: 'Relaxation' })} value={player.relaxation} icon="🧘" id="stat-relaxation" danger={gameState.rules.enableRelaxationDoctor && player.relaxation <= (gameState.rules.relaxationDoctorThreshold ?? 10)} isActive={activeLogFilter === 'relaxation'} onClick={() => handleFilterToggle('relaxation')} />
        <StatBadge label={t('dashboard.dependability', { defaultValue: 'Dependability' })} value={`${player.dependability}/${maxDep}`} icon="🤝" id="stat-dependability" isActive={activeLogFilter === 'dependability'} onClick={() => handleFilterToggle('dependability')} />
        <StatBadge label={t('dashboard.experience', { defaultValue: 'Experience' })} value={`${player.experience}/${maxExp}`} icon="👌" id="stat-experience" isActive={activeLogFilter === 'experience'} onClick={() => handleFilterToggle('experience')} />
        <StatBadge label={t('dashboard.luck', { defaultValue: 'Luck' })} value={`${luckScore}%`} icon="🍀" id="stat-luck" isActive={activeLogFilter === 'luck'} onClick={() => handleFilterToggle('luck')} />
        <StatBadge label={t('dashboard.happiness', { defaultValue: 'Happiness' })} value={`${displayHappiness}/${player.goalAllotment.happiness}`} icon="😊" id="stat-happiness" isActive={activeLogFilter === 'happiness'} onClick={() => handleFilterToggle('happiness')} />
        <StatBadge label={t('dashboard.education', { defaultValue: 'Education' })} value={`${education}/${player.goalAllotment.education}`} icon="🎓" id="stat-education" isActive={activeLogFilter === 'education'} onClick={() => handleFilterToggle('education')} />
        <StatBadge label={t('dashboard.career', { defaultValue: 'Career' })} value={`${career}/${player.goalAllotment.career}`} icon="💼" id="stat-career" isActive={activeLogFilter === 'career'} onClick={() => handleFilterToggle('career')} />
        <StatBadge label={t('dashboard.wealth', { defaultValue: 'Wealth' })} value={`${wealth}/${player.goalAllotment.wealth}`} icon="🤑" id="stat-wealth" isActive={activeLogFilter === 'wealth'} onClick={() => handleFilterToggle('wealth')} />
      </div>
    </header>
  );
}

interface StatBadgeProps {
  label: string;
  value: string | number;
  icon: string;
  id?: string;
  danger?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}

function StatBadge({ label, value, icon, id, danger, isActive, onClick }: StatBadgeProps) {
  const activeStyle: React.CSSProperties = isActive ? {
    border: '2px solid #00e5ff',
    boxShadow: '0 0 10px rgba(0, 229, 255, 0.7)',
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    transform: 'scale(1.05)'
  } : {};

  return (
    <div
      className={`stat-badge ${isActive ? 'stat-badge--active' : ''}`}
      title={label}
      id={id}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        userSelect: 'none',
        ...activeStyle
      }}
    >
      <span className="stat-badge__icon">{icon}</span>
      <span className="stat-badge__value" style={danger ? { color: '#ff3333', fontWeight: 'bold', textShadow: '0 0 8px rgba(255,51,51,0.6)' } : {}}>{value}</span>
      <span className="stat-badge__label" style={danger ? { color: '#ff3333' } : {}}>{label}</span>
    </div>
  );
}
