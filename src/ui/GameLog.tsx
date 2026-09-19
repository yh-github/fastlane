import React, { useState } from 'react';
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
  collapsible?: boolean;
}

export const GameLog: React.FC<GameLogProps> = ({
  entries,
  players = [],
  activeFilter = null,
  onSelectFilter,
  collapsible = false
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  if (entries.length === 0) return null;

  const currentFilter: GoalFilter = activeFilter || 'all';
  const filteredEntries = entries.filter(e => isLogMatchingFilter(e, currentFilter));
  const colors = ['#ff4081', '#00e5ff', '#76ff03', '#ffeb3b']; // Magenta, Cyan, Light Green, Yellow

  const logContent = (
    <>
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
    </>
  );

  if (collapsible) {
    return (
      <div className="game-log-drawer-container">
        <button
          className="game-log-drawer-trigger"
          onClick={() => setIsOpen(prev => !prev)}
          title={t('gameLog.toggleLog', { defaultValue: 'Toggle Event Log' })}
          data-testid="game-log-toggle"
        >
          📜 {t('gameLog.log', { defaultValue: 'Log' })}
          {filteredEntries.length > 0 && (
            <span className="game-log-drawer-count">{filteredEntries.length}</span>
          )}
        </button>

        <div
          className={`game-log-drawer-panel ${isOpen ? 'game-log-drawer-panel--open' : 'game-log-drawer-panel--closed'}`}
          style={!isOpen ? { display: 'none' } : undefined}
        >
          <div className="game-log-drawer-header">
            <span>📜 {t('gameLog.title', { defaultValue: 'Activity Log' })}</span>
            <button
              className="game-log-drawer-close"
              onClick={() => setIsOpen(false)}
              title={t('gameLog.close', { defaultValue: 'Close' })}
            >
              ✖
            </button>
          </div>
          {logContent}
        </div>
      </div>
    );
  }

  return (
    <div className="game-log-container" style={{ width: '100%' }}>
      {logContent}
    </div>
  );
};
