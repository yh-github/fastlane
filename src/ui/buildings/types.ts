import type { PlayerState } from '../../engine/gameState';

export interface InteractionProps {
  player: PlayerState;
  onAction: (actionPayload: any) => Promise<any> | any;
}
