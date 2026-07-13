/**
 * Dashboard.tsx — Top bar HUD displaying player stats.
 *
 * Shows money, happiness, education, career progress,
 * and the current week/economy indicator.
 */

import { type PlayerState } from '../engine/gameState';
import { calcEducationProgress, calcCareerProgress, calcWealthProgress } from '../engine/statMath';
import { useTranslation } from 'react-i18next';

interface DashboardProps {
  player: PlayerState | null;
  turn: number;
  economicIndex: number;
  hoursPerTurn: number;
  onOpenInventory: () => void;
}

export function Dashboard({ player, turn, economicIndex, hoursPerTurn, onOpenInventory }: DashboardProps) {
  const { t } = useTranslation();
  if (!player) return <header className="dashboard">{t('dashboard.loading')}</header>;

  const education = calcEducationProgress(player.degrees.length);
  const career = calcCareerProgress(player.dependability);
  const wealth = calcWealthProgress(player.money + player.bankSavings);

  return (
    <header className="dashboard">
      <div className="dashboard-top-row">
        <div className="dashboard-player-info">
          <h2>{player ? player.name : ''} - {t('dashboard.turn', { turn, defaultValue: 'Week {{turn}}' })}</h2>
          {player?.isAi && <span className="ai-badge">{t('dashboard.aiBadge', { defaultValue: 'AI' })}</span>}
          {player?.inventory.selectedClothes === 'none' && <span style={{ background: 'red', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', fontWeight: 'bold' }}>⚠️ NAKED</span>}
          <div className="dashboard-stat economy">
            <span>{t('dashboard.economy', { index: economicIndex, defaultValue: 'Economy: {{index}}' })}</span>
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
          📦 {t('dashboard.inventory', { defaultValue: 'Inventory' })}
        </button>
      </div>
      <div className="dashboard__stats" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <StatBadge label={t('dashboard.money', { defaultValue: 'Money' })} value={`$${player.money}`} icon="💰" id="stat-money" />
        <StatBadge label={t('dashboard.relaxation', { defaultValue: 'Relaxation' })} value={player.relaxation} icon="🧘" id="stat-relaxation" />
        <StatBadge label={t('dashboard.dependability', { defaultValue: 'Dependability' })} value={player.dependability} icon="🤝" id="stat-dependability" />
        <StatBadge label={t('dashboard.experience', { defaultValue: 'Experience' })} value={player.experience} icon="👌" id="stat-experience" />
        <StatBadge label={t('dashboard.happiness', { defaultValue: 'Happiness' })} value={player.happiness} icon="😊" id="stat-happiness" />
        <StatBadge label={t('dashboard.education', { defaultValue: 'Education' })} value={education} icon="🎓" />
        <StatBadge label={t('dashboard.career', { defaultValue: 'Career' })} value={career} icon="💼" />
        <StatBadge label={t('dashboard.wealth', { defaultValue: 'Wealth' })} value={wealth} icon="🤑" />
      </div>
    </header>
  );
}

interface StatBadgeProps {
  label: string;
  value: string | number;
  icon: string;
  id?: string;
}

function StatBadge({ label, value, icon, id }: StatBadgeProps) {
  return (
    <div className="stat-badge" title={label} id={id}>
      <span className="stat-badge__icon">{icon}</span>
      <span className="stat-badge__value">{value}</span>
      <span className="stat-badge__label">{label}</span>
    </div>
  );
}
