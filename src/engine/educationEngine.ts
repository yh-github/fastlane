import { type PlayerState, type GameRules } from './gameState';
import { spendHours } from './timeManager';
import type { EducationDef } from './dataLoader';

export interface EducationResult {
  updated: PlayerState;
  success: boolean;
  message: string;
}

import { calcEconomyPrice } from './economyEngine';

export function enrollInDegree(player: PlayerState, degree: EducationDef, economicIndex: number = 0): EducationResult {
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

  const tuitionFee = calcEconomyPrice(degree.baseTuitionFee, economicIndex);

  if (player.money < tuitionFee) {
    return { updated: player, success: false, message: 'Not enough money for tuition.' };
  }

  let updated = { 
    ...player, 
    money: player.money - tuitionFee,
    enrolledClasses: { ...(player.enrolledClasses || {}), [degree.id]: 0 }
  };

  return { updated, success: true, message: `Enrolled in ${degree.name}.` };
}

export function calcRequiredLessons(player: PlayerState, degree: EducationDef): number {
  let required = degree.lessonsRequired;
  let reduction = 0;
  
  if (player.inventory.appliances.some(a => a.id === 'computer')) reduction += 1;
  
  const hasAllBooks = player.inventory.books?.includes('dictionary') && 
                      player.inventory.books?.includes('encyclopedia') && 
                      player.inventory.books?.includes('atlas');
  if (hasAllBooks) reduction += 1;
  
  // Cumulative up to -2 lessons
  reduction = Math.min(2, reduction);
  required -= reduction;

  // Ensure we don't drop requirement below 1, just in case
  return Math.max(1, required);
}

export function study(player: PlayerState, degree: EducationDef, timeCost: number, rules?: GameRules): EducationResult {
  if (player.hoursRemaining < 1 || player.enrolledClasses?.[degree.id] === undefined) {
    return { updated: player, success: false, message: 'Cannot study right now.' };
  }

  // Time check
  if (player.hoursRemaining < timeCost) {
    if (!rules?.studyWithPartialHours) {
      return { updated: player, success: false, message: 'Not enough time to study.' };
    }
  }

  // Cost to study (allow partial hours if rule is enabled)
  const hoursToSpend = rules?.studyWithPartialHours
    ? Math.min(player.hoursRemaining, timeCost)
    : timeCost;
    
  let updated = spendHours(player, hoursToSpend);
  updated.enrolledClasses = { ...(updated.enrolledClasses || {}) };
  updated.enrolledClasses[degree.id] += 1;

  // Calculate dynamic lessons required
  const required = calcRequiredLessons(player, degree);

  let message = `Studied for ${degree.name}. Progress: ${updated.enrolledClasses[degree.id]}/${required}`;

  // Check for graduation
  if (updated.enrolledClasses[degree.id] >= required) {
    updated.degrees = [...updated.degrees, degree.id];
    delete updated.enrolledClasses[degree.id];

    // Apply rewards
    updated.happiness = Math.min(100, updated.happiness + degree.rewards.happiness);
    updated.dependability = Math.min(updated.dependability + degree.rewards.dependability, updated.maxDependability + degree.rewards.maxDepBoost);
    
    updated.maxDependability += degree.rewards.maxDepBoost;
    updated.maxExperience += degree.rewards.maxExpBoost;

    message = `Congratulations! You graduated with a ${degree.name}.`;
  }

  return { updated, success: true, message };
}
