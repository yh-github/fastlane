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
    { id: 'luck', label: t('dashboard.luck', { defaultValue: 'Luck' }), icon: '🍀' },
    { id: 'happiness', label: t('dashboard.happiness', { defaultValue: 'Happiness' }), icon: '😊' },
    { id: 'education', label: t('dashboard.education', { defaultValue: 'Education' }), icon: '🎓' },
    { id: 'career', label: t('dashboard.career', { defaultValue: 'Career' }), icon: '💼' },
    { id: 'wealth', label: t('dashboard.wealth', { defaultValue: 'Wealth' }), icon: '🤑' },
  ];

  const filteredEntries = entries.filter(e => isLogMatchingFilter(e, currentFilter));
  const colors = ['#ff4081', '#00e5ff', '#76ff03', '#ffeb3b']; // Magenta, Cyan, Light Green, Yellow

  return (
    <div className="game-log-container" style={{ width: '100%' }}>
      <div className="game-log-filters" style={{
        display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto',
        padding: '6px 10px', backgroundColor: '#1a1a2e', borderBottom: '1px solid #333'
      }}>
        <span style={{ fontSize: '11px', color: '#aaa', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
          🔍 {t('gameLog.filterBy', { defaultValue: 'Filter Log:' })}
        </span>
        {filterButtons.map(btn => {
          const isActive = currentFilter === btn.id;
          return (
            <button
              key={btn.id}
              onClick={() => onSelectFilter?.(btn.id === 'all' ? null : btn.id)}
              style={{
                padding: '2px 8px', fontSize: '11px', borderRadius: '12px', border: '1px solid',
                borderColor: isActive ? '#00e5ff' : '#444',
                backgroundColor: isActive ? 'rgba(0, 229, 255, 0.2)' : '#222',
                color: isActive ? '#00e5ff' : '#ccc',
                fontWeight: isActive ? 'bold' : 'normal',
                cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <span>{btn.icon}</span>
              <span>{btn.label}</span>
            </button>
          );
        })}
        {currentFilter !== 'all' && (
          <span style={{ fontSize: '11px', color: '#00e5ff', marginLeft: 'auto', whiteSpace: 'nowrap', paddingInlineStart: '8px' }}>
            {t('gameLog.showingCount', { count: filteredEntries.length, filter: currentFilter, defaultValue: `Showing ${filteredEntries.length} entries for ${currentFilter}` })}
          </span>
        )}
      </div>

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
