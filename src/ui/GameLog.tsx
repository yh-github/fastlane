import React from 'react';
import { useTranslation } from 'react-i18next';
import type { GameEvent } from '../engine/gameState';

export interface LogEntry {
  week: number;
  event: GameEvent;
}

interface GameLogProps {
  entries: LogEntry[];
}

export const GameLog: React.FC<GameLogProps> = ({ entries }) => {
  const { t } = useTranslation();
  if (entries.length === 0) return null;
  
  return (
    <div className="game-log">
      {entries.slice().reverse().map((e, i) => {
        const msg = t(e.event.key, { ...e.event.params, defaultValue: e.event.key });
        const diff = e.event.params?.diff ? e.event.params.diff : '';
        return (
          <div key={`${e.week}-${i}`} className="log-entry">
            <span>[Week {e.week}]</span> {msg}{diff}
          </div>
        );
      })}
    </div>
  );
};
