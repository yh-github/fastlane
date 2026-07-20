import React from 'react';
import { useTranslation } from 'react-i18next';
import type { GameEvent, PlayerState } from '../engine/gameState';

export interface LogEntry {
  week: number;
  event: GameEvent;
  playerId?: string;
}

interface GameLogProps {
  entries: LogEntry[];
  players?: PlayerState[];
}

export const GameLog: React.FC<GameLogProps> = ({ entries, players = [] }) => {
  const { t } = useTranslation();
  if (entries.length === 0) return null;

  const colors = ['#ff4081', '#00e5ff', '#76ff03', '#ffeb3b']; // Magenta, Cyan, Light Green, Yellow
  
  return (
    <div className="game-log">
      {entries.slice().reverse().map((e, i) => {
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
      })}
    </div>
  );
};

