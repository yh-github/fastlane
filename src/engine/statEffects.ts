import { type PlayerState, type GameRules } from './gameState';
import { type StatRules } from './rules';

export type MoraleReason = 
  | 'loan_refused' | 'loan_approved' | 'rent_extension_approved' 
  | 'rent_extension_denied' | 'street_robbery' | 'apartment_robbery' 
  | 'weekend_bonus' | 'raise_approved' | 'fired' | 'market_crash' 
  | 'economic_boom' | 'graduation' | 'lottery_win' | 'computer_profit'
  | 'food_spoilage' | 'loan_default' | 'appliance_break' | 'appliance_breakage' | 'starvation' 
  | 'doctor_visit' | 'eat_consumable' | 'cooking_bonus' | 'pawn_item' | 'shopping_bonus';

export type HappinessReason = MoraleReason;

/**
 * Applies a morale change to the player, updating both Classic Happiness
 * and (in Advanced Mode) Mental Condition.
 */
export function applyMoraleEffect(
  player: PlayerState, 
  amount: number, 
  _reason: MoraleReason,
  rules: GameRules,
  statRules?: StatRules
): PlayerState {
  let nextPlayer = { ...player };

  if (!rules.usePhysicalMentalConditions) {
    nextPlayer.happiness = Math.max(10, Math.min(100, nextPlayer.happiness + amount));
  } else {
    const minMental = statRules?.minMentalCondition ?? 5;
    const maxMental = nextPlayer.mentalConditionMax || 50;
    nextPlayer.mentalCondition = Math.max(minMental, Math.min(maxMental, 
      (nextPlayer.mentalCondition || 50) + amount));
  }

  return nextPlayer;
}

export const applyHappinessChange = applyMoraleEffect;

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
