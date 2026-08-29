import type { PlayerState, GameState, PawnedItem } from '../gameState';

export function processPawnExpiration(
  p: PlayerState,
  state: GameState,
  newPawnShopItemsForSale: PawnedItem[]
): PlayerState {
  if (p.inventory.pawnedItems && p.inventory.pawnedItems.length > 0) {
    const newTurn = state.turn + 1;
    const expired = p.inventory.pawnedItems.filter(item => newTurn - item.weekPawned >= 3);
    if (expired.length > 0) {
      p.turnEvents.push({ key: 'events.pawnExpired' });
      newPawnShopItemsForSale.push(...expired);
      p.inventory.pawnedItems = p.inventory.pawnedItems.filter(item => newTurn - item.weekPawned < 3);
    }
  }
  return p;
}
