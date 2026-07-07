/**
 * Dashboard.tsx — Top bar HUD displaying player stats.
 *
 * Shows money, happiness, education, career progress,
 * and the current week/economy indicator.
 */

import type { PlayerState } from '../engine/gameState';
import { calcEducationProgress, calcCareerProgress, calcWealthProgress } from '../engine/statMath';

interface DashboardProps {
  player: PlayerState | null;
  turn: number;
  economicIndex: number;
}

export function Dashboard({ player, turn, economicIndex }: DashboardProps) {
  if (!player) return <header className="dashboard">Loading...</header>;

  const education = calcEducationProgress(player.degrees.length);
  const career = calcCareerProgress(player.dependability);
  const wealth = calcWealthProgress(player.money + player.bankSavings);

  return (
    <header className="dashboard">
      <div className="dashboard__time">
        Week {turn} | Econ: {economicIndex > 0 ? '+' : ''}{economicIndex}
      </div>
      <div className="dashboard__stats">
        <StatBadge label="Money" value={`$${player.money}`} icon="💰" />
        <StatBadge label="Happiness" value={player.happiness} icon="😊" />
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
}

function StatBadge({ label, value, icon }: StatBadgeProps) {
  return (
    <div className="stat-badge" title={label}>
      <span className="stat-badge__icon">{icon}</span>
      <span className="stat-badge__value">{value}</span>
      <span className="stat-badge__label">{label}</span>
    </div>
  );
}
