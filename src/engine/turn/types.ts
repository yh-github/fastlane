import type { GameEvent } from '../gameState';

export interface EconomicTurnResult {
  newEconomy: number;
  newTrend: number;
  crashSeverity: 'none' | 'minor' | 'moderate' | 'major';
  economicBoom: boolean;
  currentHeadline: GameEvent | null;
  cancelledGlobalEvents: GameEvent[];
}
