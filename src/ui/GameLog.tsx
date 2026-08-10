import React from 'react';
import { useTranslation } from 'react-i18next';
import type { GameEvent, PlayerState } from '../engine/gameState';
import { isLogMatchingFilter, type GoalFilter } from '../utils/logCategorizer';

export interface LogEntry {
  week: number;
  event: GameEvent;
  playerId?: string;
}

interface GameLogProps {
  entries: LogEntry[];
  players?: PlayerState[];
  activeFilter?: GoalFilter | null;
  onSelectFilter?: (filter: GoalFilter | null) => void;
}

export const GameLog: React.FC<GameLogProps> = ({
  entries,
  players = [],
  activeFilter = null,
  onSelectFilter
}) => {
  const { t } = useTranslation();
  if (entries.length === 0) return null;

  const currentFilter: GoalFilter = activeFilter || 'all';

  const filterButtons: Array<{ id: GoalFilter; label: string; icon: string }> = [
    { id: 'all', label: t('gameLog.filterAll', { defaultValue: 'All' }), icon: '📑' },
    { id: 'money', label: t('dashboard.money', { defaultValue: 'Money' }), icon: '💰' },
    { id: 'relaxation', label: t('dashboard.relaxation', { defaultValue: 'Relaxation' }), icon: '🧘' },
    { id: 'dependability', label: t('dashboard.dependability', { defaultValue: 'Dependability' }), icon: '🤝' },
    { id: 'experience', label: t('dashboard.experience', { defaultValue: 'Experience' }), icon: '👌' },
    { id: 'luck', label: t('dashboard.luck', { defaultValue: 'Luck' }), icon: '👨‍💼' },
    { id: 'happiness', label: t('dashboard.happiness', { defaultValue: 'Happiness' }), icon: '😊' },
    { id: 'education', label: t('dashboard.education', { defaultValue: 'Education' }), icon: '🎓' },
    { id: 'career', label: t('dashboard.career', { defaultValue: 'Career' }), icon: '💼' },
    { id: 'wealth', label: t('dashboard.wealth', { defaultValue: 'Wealth' }), icon: '🤑' },
  ];

  const filteredEntries = entries.filter(e => isLogMatchingFilter(e, currentFilter));
  const colors = ['#ff4081', '#00e5ff', '#76ff03', '#ffeb3b']; // Magenta, Cyan, Light Green, Yellow

  return (
    <div className="game-log-container" style={{ width: '100%' }}>
      {activeFilter && (
        <div className="game-log-filters" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 10px', backgroundColor: '#1a1a2e', borderBottom: '1px solid #333', fontSize: '11px'
        }}>
          <span style={{ color: '#00e5ff' }}>
            🔍 {t('gameLog.showingCount', { count: filteredEntries.length, filter: activeFilter, defaultValue: `Filtered by ${activeFilter} (${filteredEntries.length} entries)` })}
          </span>
          <button
            onClick={() => onSelectFilter?.(null)}
            style={{
              padding: '2px 8px', fontSize: '10px', borderRadius: '4px', border: '1px solid #555',
              backgroundColor: '#333', color: '#fff', cursor: 'pointer'
            }}
          >
            ❌ {t('gameLog.clearFilter', { defaultValue: 'Clear Filter' })}
          </button>
        </div>
      )}

      <div className="game-log">
        {filteredEntries.length === 0 ? (
          <div className="game-log__entry" style={{ fontStyle: 'italic', color: '#888' }}>
            No log entries found for this filter.
          </div>
        ) : (
          filteredEntries.slice().reverse().map((e, i) => {
            const msg = t(e.event.key, { ...e.event.params, defaultValue: e.event.key });
            const diff = e.event.params?.diff ? e.event.params.diff : '';
            const playerIndex = e.playerId ? players.findIndex(p => p.id === e.playerId) : -1;
            const playerColor = playerIndex !== -1 ? colors[playerIndex % colors.length] : undefined;
            const playerName = playerIndex !== -1 ? players[playerIndex]?.name : undefined;

            return (
              <div key={`${e.week}-${i}`} className="game-log__entry" style={playerColor ? { color: playerColor } : undefined}>
                <span>[Week {e.week}]</span>{playerName && <span className="game-log__player"> {playerName}:</span>} {msg}{diff}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
