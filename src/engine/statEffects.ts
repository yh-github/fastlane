import { type PlayerState, type GameRules } from './gameState';
import { type StatRules, isAdvancedStatRules } from './rules';

export type MoraleReason = 
  | 'loan_refused' | 'loan_approved' | 'rent_extension_approved' 
  | 'rent_extension_denied' | 'street_robbery' | 'apartment_robbery' 
  | 'weekend_bonus' | 'raise_approved' | 'fired' | 'market_crash' 
  | 'economic_boom' | 'graduation' | 'lottery_win' | 'computer_profit'
  | 'food_spoilage' | 'loan_default' | 'appliance_break' | 'appliance_breakage' | 'appliance_repair' | 'starvation' 
  | 'doctor_visit' | 'eat_consumable' | 'cooking_bonus' | 'pawn_item' | 'shopping_bonus';

export type HappinessReason = MoraleReason;

/**
 * Applies a morale change to the player, updating Classic Happiness
 * or (when usePhysicalMentalConditions is enabled) Mental Condition.
 */
export function applyMoraleEffect(
  player: PlayerState, 
  amount: number, 
  _reason: MoraleReason,
  rules?: Partial<GameRules>,
  statRules?: StatRules
): PlayerState {
  const nextPlayer = { ...player };

  if (!rules?.usePhysicalMentalConditions) {
    const minHap = statRules ? statRules.minHappiness : 0;
    const maxHap = statRules ? statRules.maxHappiness : 100;
    nextPlayer.happiness = Math.max(minHap, Math.min(maxHap, nextPlayer.happiness + amount));
  } else {
    const sr = statRules && isAdvancedStatRules(statRules) ? statRules : undefined;
    const minMental = sr ? sr.minMentalCondition : 1;
    const maxMental = nextPlayer.mentalConditionMax ?? (sr ? sr.maxMentalCondition : 85);
    const curMental = nextPlayer.mentalCondition ?? (sr ? sr.startingMentalCondition : 51);
    nextPlayer.mentalCondition = Math.max(minMental, Math.min(maxMental, curMental + amount));
  }

  return nextPlayer;
}

export const applyHappinessChange = applyMoraleEffect;

export function applyMentalChange(
  player: PlayerState,
  amount: number,
  statRules?: StatRules
): PlayerState {
  const nextPlayer = { ...player };
  const sr = isAdvancedStatRules(statRules) ? statRules : undefined;
  const minMental = sr ? sr.minMentalCondition : 1;
  const maxMental = nextPlayer.mentalConditionMax ?? (sr ? sr.maxMentalCondition : 85);
  const curMental = nextPlayer.mentalCondition ?? (sr ? sr.startingMentalCondition : 51);
  nextPlayer.mentalCondition = Math.max(minMental, Math.min(maxMental, curMental + amount));
  return nextPlayer;
}
