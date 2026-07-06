/**
 * Dashboard.tsx — Top bar HUD displaying player stats.
 *
 * Shows money, happiness, education, career progress,
 * and the current week/phase indicator.
 */

import type { PlayerStats } from '../engine/statMath';
import type { GameTime } from '../engine/timeManager';
import { getTimeLabel } from '../engine/timeManager';

interface DashboardProps {
  stats: PlayerStats;
  time: GameTime;
}

export function Dashboard({ stats, time }: DashboardProps) {
  return (
    <header className="dashboard">
      <div className="dashboard__time">{getTimeLabel(time)}</div>
      <div className="dashboard__stats">
        <StatBadge label="Money" value={`$${stats.money}`} icon="💰" />
        <StatBadge label="Happiness" value={stats.happiness} icon="😊" />
        <StatBadge label="Education" value={stats.education} icon="🎓" />
        <StatBadge label="Career" value={stats.career} icon="💼" />
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
