import { type PlayerState, type GameRules } from './gameState';
import { type StatRules } from './rules';

export type HappinessReason = 
  | 'loan_refused' | 'loan_approved' | 'rent_extension_approved' 
  | 'rent_extension_denied' | 'street_robbery' | 'apartment_robbery' 
  | 'weekend_bonus' | 'raise_approved' | 'fired' | 'market_crash' 
  | 'economic_boom' | 'graduation' | 'lottery_win' | 'computer_profit'
  | 'food_spoilage' | 'loan_default' | 'appliance_break' | 'appliance_breakage' | 'starvation' 
  | 'doctor_visit' | 'eat_consumable' | 'cooking_bonus' | 'pawn_item';

/**
 * Applies a happiness change to the player, updating both Classic Happiness
 * and (in Advanced Mode) Mental Condition.
 */
export function applyHappinessChange(
  player: PlayerState, 
  amount: number, 
  _reason: HappinessReason,
  rules: GameRules,
  statRules?: StatRules
): PlayerState {
  let nextPlayer = { ...player };

  // 1. Classic Mode: Always apply to Happiness
  nextPlayer.happiness = Math.max(10, Math.min(100, nextPlayer.happiness + amount));

  // 2. Advanced Mode: Route to Mental Condition
  // Since Lifestyle is derived from physical possessions, all one-off events map to Mental.
  if (rules.usePhysicalMentalConditions) {
    const minMental = statRules?.minMentalCondition ?? 5;
    const maxMental = nextPlayer.mentalConditionMax || (statRules?.maxMentalCondition ?? 25);
    nextPlayer.mentalCondition = Math.max(minMental, Math.min(maxMental, 
      (nextPlayer.mentalCondition || 15) + amount));
  }

  return nextPlayer;
}

export function applyMentalChange(
  player: PlayerState,
  amount: number,
  statRules?: StatRules
): PlayerState {
  let nextPlayer = { ...player };
  const minMental = statRules?.minMentalCondition ?? 5;
  const maxMental = nextPlayer.mentalConditionMax || (statRules?.maxMentalCondition ?? 25);
  nextPlayer.mentalCondition = Math.max(minMental, Math.min(maxMental, 
    (nextPlayer.mentalCondition || 15) + amount));
  return nextPlayer;
}
