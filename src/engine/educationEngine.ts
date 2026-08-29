import { type PlayerState, type GameRules, type GameEvent } from './gameState';
import { spendHours } from './timeManager';
import type { EducationDef } from './dataLoader';
import { applyHappinessChange } from './statEffects';

export interface EducationResult {
  updated: PlayerState;
  success: boolean;
  message: GameEvent;
}

import { calcEconomyPrice } from './economyEngine';

export function enrollInDegree(player: PlayerState, degree: EducationDef, economicIndex: number = 0, rules?: GameRules): EducationResult {
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

  // Check max concurrent enrolled classes limit
  const activeEnrolledCount = Object.keys(player.enrolledClasses || {}).filter(k => !k.endsWith('_req')).length;
  const maxAllowed = rules?.maxEnrolledClasses ?? 4;
  if (activeEnrolledCount >= maxAllowed) {
    return { updated: player, success: false, message: { key: 'action.error.maxEnrolledClasses', params: { max: maxAllowed } } };
  }

  const tuitionFee = calcEconomyPrice(degree.baseTuitionFee, economicIndex);

  if (player.money < tuitionFee) {
    return { updated: player, success: false, message: { key: 'action.error.notEnoughMoneyTuition' } };
  }

  let updated = { 
    ...player, 
    money: player.money - tuitionFee,
    enrolledClasses: { 
      ...(player.enrolledClasses || {}), 
      [degree.id]: 0,
      [`${degree.id}_req`]: calcRequiredLessons(player, degree, rules)
    }
  };

  return { updated, success: true, message: { key: 'action.education.enrolled', params: { name: degree.name } } };
}

export function calcRequiredLessons(player: PlayerState, degree: EducationDef, rules?: GameRules): number {
  if (player.enrolledClasses && player.enrolledClasses[`${degree.id}_req`] !== undefined) {
    return player.enrolledClasses[`${degree.id}_req`];
  }

  let required = degree.lessonsRequired;
  let reduction = 0;
  
  if (player.inventory?.appliances?.some(a => a.id === 'computer')) reduction += 1;
  
  const hasAllBooks = player.inventory?.books?.includes('dictionary') && 
                      player.inventory?.books?.includes('encyclopedia') && 
                      player.inventory?.books?.includes('atlas');
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

import { roundToResolution } from './statMath';

export function formatDegreeProgress(progress: number, isPercentage?: boolean): string {
  if (isPercentage) {
    const rounded = Math.min(100, Math.max(0, roundToResolution(progress, 0.1)));
    if (rounded >= 99.0) return '100%';
    const formatted = rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
    return `${formatted}%`;
  }
  return String(Math.floor(progress));
}

export function study(player: PlayerState, degree: EducationDef, timeCost: number, rules?: GameRules): EducationResult {
  if (player.enrolledClasses?.[degree.id] === undefined) {
    return { updated: player, success: false, message: { key: 'action.error.cannotStudy' } };
  }

  // Time check
  if (player.hoursRemaining <= 0 || (player.hoursRemaining < timeCost && !rules?.allowPartialHours)) {
    return { updated: player, success: false, message: { key: 'action.error.notEnoughTime' } };
  }

  const isPercentage = !!rules?.percentageEducation;
  const required = calcRequiredLessons(player, degree, rules);
  const totalRequiredHours = required * timeCost;
  const currentProgress = player.enrolledClasses[degree.id] || 0;

  // Cost to study (allow partial/proportional hours if rule is enabled)
  let maxSpend = rules?.allowPartialHours
    ? Math.min(player.hoursRemaining, timeCost)
    : timeCost;

  if (isPercentage && rules?.proportionalDivisibleActions) {
    const remainingPct = Math.max(0, 100 - currentProgress);
    const hoursNeeded = (remainingPct / 100) * totalRequiredHours;
    if (hoursNeeded < maxSpend) {
      maxSpend = Math.max(0.5, roundToResolution(hoursNeeded, 0.5));
    }
  }

  const hoursToSpend = rules?.allowPartialHours
    ? Math.min(player.hoursRemaining, maxSpend)
    : maxSpend;
    
  let updated = spendHours(player, hoursToSpend);
  updated.enrolledClasses = { ...(updated.enrolledClasses || {}) };

  let isGraduated = false;

  if (isPercentage) {
    const progressGain = (hoursToSpend / totalRequiredHours) * 100;
    const rawProgress = currentProgress + progressGain;
    
    if (rawProgress >= 99.0 || (totalRequiredHours - (currentProgress / 100 * totalRequiredHours) <= hoursToSpend + 0.1)) {
      updated.enrolledClasses[degree.id] = 100;
      isGraduated = true;
    } else {
      const newProgress = Math.min(100, roundToResolution(rawProgress, rules?.educationResolution ?? 0.1));
      if (newProgress >= 99.0) {
        updated.enrolledClasses[degree.id] = 100;
        isGraduated = true;
      } else {
        updated.enrolledClasses[degree.id] = newProgress;
      }
    }
  } else {
    updated.enrolledClasses[degree.id] = (updated.enrolledClasses[degree.id] || 0) + 1;
    isGraduated = updated.enrolledClasses[degree.id] >= required;
  }

  const currentDisplay = isPercentage 
    ? formatDegreeProgress(updated.enrolledClasses[degree.id], true)
    : String(updated.enrolledClasses[degree.id]);
  const requiredDisplay = isPercentage ? '100%' : String(required);

  let message: GameEvent = { key: 'action.education.studied', params: { name: degree.name, current: currentDisplay, required: requiredDisplay } };

  // Check for graduation
  if (isGraduated) {
    updated.degrees = [...updated.degrees, degree.id];
    delete updated.enrolledClasses[degree.id];
    delete updated.enrolledClasses[`${degree.id}_req`];

    // Apply rewards
    const qolReduced = rules?.reducedDegreeStatBonus;
    
    const depReward = qolReduced ? Math.min(2, degree.rewards.dependability) : degree.rewards.dependability;
    const maxDepReward = qolReduced ? Math.min(2, degree.rewards.maxDepBoost) : degree.rewards.maxDepBoost;
    const maxExpReward = qolReduced ? Math.min(2, degree.rewards.maxExpBoost) : degree.rewards.maxExpBoost;

    updated = applyHappinessChange(updated, degree.rewards.happiness, 'graduation', rules || ({} as any));
    updated.degreeDepBoost += maxDepReward;
    updated.dependability = Math.min(100, updated.dependability + depReward);
    
    updated.degreeExpBoost += maxExpReward;

    message = { key: 'action.education.graduated', params: { name: degree.name } };
  }

  return { updated, success: true, message };
}

/**
 * Calculates the depth of prerequisites behind a given degree.
 * Returns 0 if the degree has no prerequisites, 1 if it has 1 prerequisite level, etc.
 */
export function getPrerequisiteChainDepth(degreeId: string, educationList?: EducationDef[]): number {
  if (!educationList || educationList.length === 0) return 0;
  const eduMap = new Map(educationList.map(e => [e.id, e]));
  const visited = new Set<string>();

  function getDepth(id: string): number {
    if (visited.has(id)) return 0;
    visited.add(id);
    const def = eduMap.get(id);
    if (!def || !def.prerequisites || def.prerequisites.length === 0) {
      return 0;
    }
    let maxParentDepth = 0;
    for (const p of def.prerequisites) {
      maxParentDepth = Math.max(maxParentDepth, 1 + getDepth(p));
    }
    return maxParentDepth;
  }

  return getDepth(degreeId);
}
