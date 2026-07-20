import { type PlayerState, type GameRules, type GameEvent } from './gameState';
import { spendHours } from './timeManager';
import type { EducationDef } from './dataLoader';

export interface EducationResult {
  updated: PlayerState;
  success: boolean;
  message: GameEvent;
}

import { calcEconomyPrice } from './economyEngine';

export function enrollInDegree(player: PlayerState, degree: EducationDef, economicIndex: number = 0): EducationResult {
  // Check if they already have it
  if (player.degrees.includes(degree.id)) {
    return { updated: player, success: false, message: { key: 'action.error.alreadyHaveDegree' } };
  }

  // Check prerequisites
  for (const prereq of degree.prerequisites) {
    if (!player.degrees.includes(prereq)) {
      return { updated: player, success: false, message: { key: 'action.error.missingPrereq', params: { prereq } } };
    }
  }

  const tuitionFee = calcEconomyPrice(degree.baseTuitionFee, economicIndex);

  if (player.money < tuitionFee) {
    return { updated: player, success: false, message: { key: 'action.error.notEnoughMoneyTuition' } };
  }

  let updated = { 
    ...player, 
    money: player.money - tuitionFee,
    enrolledClasses: { ...(player.enrolledClasses || {}), [degree.id]: 0 }
  };

  return { updated, success: true, message: { key: 'action.education.enrolled', params: { name: degree.name } } };
}

export function calcRequiredLessons(player: PlayerState, degree: EducationDef, rules?: GameRules): number {
  let required = degree.lessonsRequired;
  let reduction = 0;
  
  if (player.inventory.appliances.some(a => a.id === 'computer')) reduction += 1;
  
  const hasAllBooks = player.inventory.books?.includes('dictionary') && 
                      player.inventory.books?.includes('encyclopedia') && 
                      player.inventory.books?.includes('atlas');
  if (hasAllBooks) {
    const isCompletedThisTurn = !!player.turnFlags?.bookSetCompletedThisTurn;
    if (!rules?.delayBookSetCredit || !isCompletedThisTurn) {
      reduction += 1;
    }
  }
  
  // Cumulative up to -2 lessons
  reduction = Math.min(2, reduction);
  required -= reduction;

  // Ensure we don't drop requirement below 1, just in case
  return Math.max(1, required);
}

export function study(player: PlayerState, degree: EducationDef, timeCost: number, rules?: GameRules): EducationResult {
  if (player.hoursRemaining < 1 || player.enrolledClasses?.[degree.id] === undefined) {
    return { updated: player, success: false, message: { key: 'action.error.cannotStudy' } };
  }

  // Time check
  if (player.hoursRemaining < timeCost) {
    if (!rules?.allowPartialHours) {
      return { updated: player, success: false, message: { key: 'action.error.notEnoughTime' } };
    }
  }

  // Cost to study (allow partial hours if rule is enabled)
  const hoursToSpend = rules?.allowPartialHours
    ? Math.min(player.hoursRemaining, timeCost)
    : timeCost;
    
  let updated = spendHours(player, hoursToSpend);
  updated.enrolledClasses = { ...(updated.enrolledClasses || {}) };
  updated.enrolledClasses[degree.id] += 1;

  // Calculate dynamic lessons required
  const required = calcRequiredLessons(player, degree, rules);

  let message: GameEvent = { key: 'action.education.studied', params: { name: degree.name, current: updated.enrolledClasses[degree.id], required } };

  // Check for graduation
  if (updated.enrolledClasses[degree.id] >= required) {
    updated.degrees = [...updated.degrees, degree.id];
    delete updated.enrolledClasses[degree.id];

    // Apply rewards
    updated.happiness = Math.min(100, updated.happiness + degree.rewards.happiness);
    updated.maxDependability += degree.rewards.maxDepBoost;
    updated.dependability = updated.dependability + degree.rewards.dependability;
    
    updated.maxExperience += degree.rewards.maxExpBoost;

    message = { key: 'action.education.graduated', params: { name: degree.name } };
  }

  return { updated, success: true, message };
}
