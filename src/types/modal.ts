export type ActiveModal =
  | { type: 'building' }
  | { type: 'newspaper' }
  | { type: 'inventory'; section?: string | null }
  | { type: 'goals'; playerIndex?: number }
  | { type: 'diploma'; degreeId?: string; degreeName?: string; playerName?: string }
  | { type: 'lottery'; prizeAmount: number }
  | { type: 'settings' }
  | { type: 'log' }
  | null;
