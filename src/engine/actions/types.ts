import type { PlayerState, GameRules, OwnedAppliance, PawnedItem, GameEvent, GameState } from '../gameState';
import type { CampaignBundle } from '../dataLoader';
import type { Random } from '../../utils/rng';
import type { EngineDecision } from '../replayTypes';

export type GameAction =
  | { type: 'apply'; jobId: string; offeredWage?: number }
  | { type: 'work'; jobId: string; mode?: 'look_busy' | 'work_work' | 'face_time' | 'innovate' }
  | { type: 'buy'; itemId: string }
  | { type: 'enroll'; degreeId: string }
  | { type: 'study'; degreeId: string }
  | { type: 'relax' }
  | { type: 'bank_transaction'; amount: number }
  | { type: 'open_broker' }
  | { type: 'move'; nodeId: string }
  | { type: 'buy_stock'; stockId: string; quantity: number; cost: number }
  | { type: 'sell_stock'; stockId: string; quantity: number; revenue: number }
  | { type: 'take_loan' }
  | { type: 'pay_loan' }
  | { type: 'rent_transaction'; amount: number }
  | { type: 'move_apartment'; housingId: string; cost: number }
  | { type: 'pay_rent_advance'; amount: number }
  | { type: 'pawn_item'; item: OwnedAppliance; value: number }
  | { type: 'redeem_item'; item: PawnedItem; cost: number }
  | { type: 'buy_pawn_item'; item: PawnedItem; cost: number }
  | { type: 'change_clothes'; clothes: 'casual' | 'dress' | 'business' | 'none' }
  | { type: 'ask_rent_extension' }
  | { type: 'clean' }
  | { type: 'call_cleaning_service' }
  | { type: 'socialize_guests' };

export interface ReducerContext {
  campaign: CampaignBundle;
  rules: GameRules;
  turn: number;
  economicIndex: number;
  rng: Random;
  state: GameState;
  engineDecisions?: EngineDecision[]; // Incoming decisions for replay
}

export interface ReducerResult {
  updatedPlayer: PlayerState;
  actionLog?: GameEvent | GameEvent[];
  updatedPawnShopItemsForSale?: PawnedItem[];
  outEngineDecisions?: EngineDecision[];
}

export interface ActionHandlerResult {
  nextPlayer: PlayerState;
  actionLog?: GameEvent | GameEvent[];
  updatedPawnShopItemsForSale?: PawnedItem[];
}
