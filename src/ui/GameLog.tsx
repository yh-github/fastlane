import React from 'react';

export interface LogEntry {
  week: number;
  message: string;
}

interface GameLogProps {
  entries: LogEntry[];
}

export const GameLog: React.FC<GameLogProps> = ({ entries }) => {
  if (entries.length === 0) return null;
  
  return (
    <div className="game-log">
      {entries.slice().reverse().map((e, i) => (
        <div key={i} className="game-log__entry">
          <span>[Week {e.week}]</span> {e.message}
        </div>
      ))}
    </div>
  );
};
