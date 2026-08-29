import type { GameEvent } from '../../engine/gameState';

export type AppStatus = 'loading' | 'ready' | 'error';

export interface LogEntry {
  week: number;
  event: GameEvent;
  playerId?: string;
}
