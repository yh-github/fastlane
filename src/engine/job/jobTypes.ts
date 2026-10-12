import type { PlayerState, GameEvent } from '../gameState';

export interface JobApplicationResult {
  updated: PlayerState;
  success: boolean;
  message: GameEvent;
}

export type ShiftTier = 'normal' | 'grind' | 'overtime';
export type WorkMode = 'look_busy' | 'work_work' | 'face_time' | 'show_initiative' | 'innovate';

export interface ModifierBreakdownItem {
  label: string;
  amount: number;
}

export interface WorkShiftModifierBreakdown {
  physicalBase: number;
  physicalModifiers: ModifierBreakdownItem[];
  totalPhysicalCost: number;
  mentalBase: number;
  mentalModifiers: ModifierBreakdownItem[];
  totalMentalCost: number;
  fatigueApplied: boolean;
  tier: ShiftTier;
  actionCount: number;
  grindThreshold: number;
  overtimeThreshold: number;
}

export interface WorkShiftOption {
  id: WorkMode;
  physCost: number;
  mentalCost: number;
  wage: number;
  rewardDep: number;
  rewardExp: number;
  rewardSocial: number;
  rewardText: string;
  color: string;
  isDefault: boolean;
  disabled: boolean;
  disabledReasonKey?: string;
  physMistakeChance?: number;
  mentalMistakeChance?: number;
  socialMistakeChance?: number;
  totalMistakeChance?: number;
  modifierBreakdown?: WorkShiftModifierBreakdown;
}

export interface WorkShiftSummary {
  hoursToWork: number;
  shiftCost: number;
  workRatio: number;
  actionCount: number;
  grindThreshold: number;
  overtimeThreshold: number;
  tier: ShiftTier;
  tierLabel: string;
  modes: WorkShiftOption[];
  innovationsCount: number;
  locationMistakes: number;
  locationInitiatives: number;
  turnMistakes: number;
}

export interface WorkResult {
  updated: PlayerState;
  wagesEarned: number;
  success: boolean;
  messages?: GameEvent[];
}
