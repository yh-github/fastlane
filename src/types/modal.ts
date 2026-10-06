export type ActiveModal =
  | { type: 'building' }
  | { type: 'newspaper' }
  | { type: 'inventory'; section?: string | null }
  | { type: 'settings' }
  | { type: 'log' }
  | null;
