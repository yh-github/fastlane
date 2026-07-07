import { type PlayerState, COST_STUDY_SESSION } from './gameState';
import { spendHours } from './timeManager';
import type { EducationDef } from './dataLoader';

export interface EducationResult {
  updated: PlayerState;
  success: boolean;
  message: string;
}

export function enrollInDegree(player: PlayerState, degree: EducationDef): EducationResult {
  // Check if they already have it
  if (player.degrees.includes(degree.id)) {
    return { updated: player, success: false, message: 'You already have this degree.' };
  }

  // Check prerequisites
  for (const prereq of degree.prerequisites) {
    if (!player.degrees.includes(prereq)) {
      return { updated: player, success: false, message: `Prerequisite required: ${prereq}` };
    }
  }

  if (player.money < degree.baseTuitionFee) {
    return { updated: player, success: false, message: 'Not enough money for tuition.' };
  }

  let updated = { 
    ...player, 
    money: player.money - degree.baseTuitionFee,
    currentDegreeId: degree.id,
    lessonsCompleted: 0
  };

  return { updated, success: true, message: `Enrolled in ${degree.name}.` };
}

export function study(player: PlayerState, degree: EducationDef): EducationResult {
  if (player.hoursRemaining < 1 || player.currentDegreeId !== degree.id) {
    return { updated: player, success: false, message: 'Cannot study right now.' };
  }

  // We require full block of 6 hours for a lesson. If you have less, you can spend it but it doesn't count as a full lesson?
  // Classic says: studying costs 6 hours per lesson.
  if (player.hoursRemaining < COST_STUDY_SESSION) {
    return { updated: player, success: false, message: `Need ${COST_STUDY_SESSION} hours to complete a lesson.` };
  }

  let updated = spendHours(player, COST_STUDY_SESSION);
  updated.lessonsCompleted += 1;

  let message = `Studied for ${degree.name}. Progress: ${updated.lessonsCompleted}/${degree.lessonsRequired}`;

  // Check for graduation
  if (updated.lessonsCompleted >= degree.lessonsRequired) {
    updated.degrees = [...updated.degrees, degree.id];
    updated.currentDegreeId = null;
    updated.lessonsCompleted = 0;

    // Apply rewards
    updated.happiness = Math.min(100, updated.happiness + degree.rewards.happiness);
    updated.dependability = Math.min(updated.dependability + degree.rewards.dependability, updated.maxDependability + degree.rewards.maxDepBoost);
    
    updated.maxDependability += degree.rewards.maxDepBoost;
    updated.maxExperience += degree.rewards.maxExpBoost;

    message = `Congratulations! You graduated with a ${degree.name}.`;
  }

  return { updated, success: true, message };
}
