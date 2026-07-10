/**
 * Dashboard.tsx — Top bar HUD displaying player stats.
 *
 * Shows money, happiness, education, career progress,
 * and the current week/economy indicator.
 */

import { type PlayerState, HOURS_PER_TURN } from '../engine/gameState';
import { calcEducationProgress, calcCareerProgress, calcWealthProgress } from '../engine/statMath';

interface DashboardProps {
  player: PlayerState | null;
  turn: number;
  economicIndex: number;
  onOpenInventory: () => void;
}

export function Dashboard({ player, turn, economicIndex, onOpenInventory }: DashboardProps) {
  if (!player) return <header className="dashboard">Loading...</header>;

  const education = calcEducationProgress(player.degrees.length);
  const career = calcCareerProgress(player.dependability);
  const wealth = calcWealthProgress(player.money + player.bankSavings);

  return (
    <header className="dashboard">
      <div className="dashboard-top-row">
        <div className="dashboard-player-info">
          <h2>{player ? player.name : ''} - Week {turn}</h2>
          {player?.isAi && <span className="ai-badge">AI (Jones)</span>}
          <div className="dashboard-stat economy">
            <span>Economy Index: {economicIndex}</span>
          </div>
        </div>
        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#00e5ff', textShadow: '0 0 5px #00e5ff' }}>
          ⏳ {player.hoursRemaining} / {HOURS_PER_TURN}h Left
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
          📦 Inventory
        </button>
      </div>
      <div className="dashboard__stats" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <StatBadge label="Money" value={`$${player.money}`} icon="💰" id="stat-money" />
        <StatBadge label="Happiness" value={player.happiness} icon="😊" id="stat-happiness" />
        <StatBadge label="Education" value={education} icon="🎓" />
        <StatBadge label="Career" value={career} icon="💼" />
        <StatBadge label="Wealth" value={wealth} icon="🏦" />
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
