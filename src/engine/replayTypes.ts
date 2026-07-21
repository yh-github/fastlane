import type { GameState, GameRules } from './gameState';
import type { ControllerAction } from './gameController';

export interface EngineDecision {
  type: string;
  result: any;
}

export interface ReplayValidation {
  hash: string;
  snapshot: {
    turn: number;
    money: number;
    bankSavings: number;
    hoursRemaining: number;
    happiness: number;
    currentJobId: string | null;
  };
}

export interface ReplayStep {
  turn: number;
  action: ControllerAction;
  engineDecisions: EngineDecision[];
  validation: ReplayValidation;
}

export interface ReplayData {
  version: string;
  commitHash: string;
  campaignId: string;
  rules: GameRules;
  startingState: GameState;
  steps: ReplayStep[];
  endStateHash: string;
}

export interface ReplayContext {
  inDecisions?: EngineDecision[];
  outDecisions: EngineDecision[];
}

export function resolveDecision<T>(
  replay: ReplayContext | undefined,
  type: string,
  generator: () => T
): T {
  if (replay && replay.inDecisions) {
    const forcedIndex = replay.inDecisions.findIndex(d => d.type === type);
    if (forcedIndex !== -1) {
      const forced = replay.inDecisions[forcedIndex];
      replay.inDecisions.splice(forcedIndex, 1);
      replay.outDecisions.push(forced);
      return forced.result as T;
    }
  }
  const result = generator();
  if (replay) {
    replay.outDecisions.push({ type, result });
  }
  return result;
}
