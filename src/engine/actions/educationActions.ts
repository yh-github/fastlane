import type { PlayerState } from '../gameState';
import type { ReducerContext, ActionHandlerResult } from './types';
import type { ReplayContext } from '../replayTypes';
import { requireConfig } from '../rules';
import { enrollInDegree, study, calcRequiredLessons, formatDegreeProgress, getPrerequisiteChainDepth } from '../educationEngine';
import { spendHours } from '../timeManager';
import { roundToResolution } from '../statMath';
import { resolveDecision } from '../replayTypes';
import { applyHappinessChange } from '../statEffects';

export function handleEnrollAction(
  player: PlayerState,
  action: { type: 'enroll'; degreeId: string },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;
  const degDef = context.campaign.education.find(d => d.id === action.degreeId);
  if (degDef) {
    const result = enrollInDegree(nextPlayer, degDef, context.economicIndex);
    nextPlayer = result.updated;
    actionLog = result.message;
  }
  return { nextPlayer, actionLog };
}

export function handleStudyAction(
  player: PlayerState,
  action: { type: 'study'; degreeId: string },
  context: ReducerContext,
  replayContext: ReplayContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  const degDef = context.campaign.education.find(d => d.id === action.degreeId);
  if (degDef) {
    const studySessionCost = requireConfig(context.campaign.config.timeRules?.studySessionCost, 'timeRules.studySessionCost');
    if (nextPlayer.hoursRemaining <= 0 || (nextPlayer.hoursRemaining < studySessionCost && !context.rules.allowPartialHours)) {
      actionLog = { key: 'action.error.notEnoughTime' };
      return { nextPlayer, actionLog };
    }

    if (context.rules.usePhysicalMentalConditions) {
      const statRules = context.campaign.config.statRules;
      const actionCount = (nextPlayer.studyActionsThisTurn || 0) + 1;

      const overtimeThreshold = statRules?.studyOvertimeThreshold ?? 8;
      const grindThreshold = statRules?.studyGrindThreshold ?? 4;

      let mentalCost: number;
      let physicalCost: number;

      if (actionCount >= overtimeThreshold) {
        mentalCost = statRules?.studyOvertimeMentalCost ?? 2;
        physicalCost = statRules?.studyOvertimePhysicalCost ?? 1;
      } else if (actionCount >= grindThreshold) {
        mentalCost = statRules?.studyGrindMentalCost ?? 2;
        physicalCost = statRules?.studyGrindPhysicalCost ?? 0;
      } else {
        mentalCost = statRules?.studyMentalCost ?? statRules?.studyNormalMentalCost ?? 1;
        physicalCost = statRules?.studyNormalPhysicalCost ?? 0;
      }

      const prereqDepth = getPrerequisiteChainDepth(degDef.id, context.campaign.education);
      mentalCost += prereqDepth;

      const curPhys = nextPlayer.physicalCondition ?? 50;
      if (curPhys < 10) {
        mentalCost += 1;
      }

      const curMental = nextPlayer.mentalCondition ?? 50;
      if ((curPhys - physicalCost < 1.0) || (curMental - mentalCost < 1.0)) {
        actionLog = { key: 'action.error.tooExhausted' };
        return { nextPlayer, actionLog };
      }

      // Mistake checks for study
      let physMistake = false;
      let mentalMistake = false;

      if (physicalCost > 0 && curPhys < 10) {
        const physChance = (10 - curPhys) * 0.025;
        physMistake = resolveDecision(replayContext, `study_phys_mistake_${nextPlayer.id}_${actionCount}`, () => context.rng.next() < physChance);
      }

      if (mentalCost > 0 && curMental < 10) {
        const mentalChance = (10 - curMental) * 0.025;
        mentalMistake = resolveDecision(replayContext, `study_mental_mistake_${nextPlayer.id}_${actionCount}`, () => context.rng.next() < mentalChance);
      }

      const isPercentage = !!context.rules.percentageEducation;
      const required = calcRequiredLessons(nextPlayer, degDef, context.rules);
      const totalRequiredHours = required * studySessionCost;
      const currentProgress = nextPlayer.enrolledClasses?.[degDef.id] || 0;

      let maxSpend = context.rules.allowPartialHours
        ? Math.min(nextPlayer.hoursRemaining, studySessionCost)
        : studySessionCost;

      if (isPercentage && context.rules.proportionalDivisibleActions) {
        const remainingPct = Math.max(0, 100 - currentProgress);
        const hoursNeeded = (remainingPct / 100) * totalRequiredHours;
        if (hoursNeeded < maxSpend) {
          maxSpend = Math.max(0.5, roundToResolution(hoursNeeded, 0.5));
        }
      }

      const hoursToSpend = context.rules.allowPartialHours
        ? Math.min(nextPlayer.hoursRemaining, maxSpend)
        : maxSpend;
      const ratio = hoursToSpend / studySessionCost;

      if (context.rules.proportionalDivisibleActions && hoursToSpend < studySessionCost) {
        const conditionRes = context.rules.conditionResolution ?? 0.5;
        physicalCost = Math.max(0, roundToResolution(physicalCost * ratio, conditionRes));
        mentalCost = Math.max(0, roundToResolution(mentalCost * ratio, conditionRes));
      }

      nextPlayer = spendHours(nextPlayer, hoursToSpend);
      nextPlayer.studyActionsThisTurn = actionCount;

      nextPlayer.physicalCondition = curPhys - physicalCost;
      nextPlayer.mentalCondition = curMental - mentalCost;

      // Academic freedom bonus check
      let baseDepBonus = 0;
      const currentJob = context.campaign.jobs.find(j => j.id === nextPlayer.currentJobId);
      if (currentJob?.tags?.includes('academic_freedom')) {
        if (actionCount >= overtimeThreshold) {
          baseDepBonus = 2;
        } else if (actionCount >= grindThreshold) {
          baseDepBonus = 1;
        }
      }

      const appliedDepBonus = (context.rules.proportionalDivisibleActions && hoursToSpend < studySessionCost)
        ? roundToResolution(baseDepBonus * ratio, 0.5)
        : baseDepBonus;

      if (appliedDepBonus > 0 && !physMistake && !mentalMistake) {
        nextPlayer.dependability = Math.min(100, roundToResolution(nextPlayer.dependability + appliedDepBonus, 0.5));
      }

      const statCosts: string[] = [];
      if (mentalCost > 0) statCosts.push(`-${mentalCost} Mental`);
      if (physicalCost > 0) statCosts.push(`-${physicalCost} Physical`);
      if (appliedDepBonus > 0 && !physMistake && !mentalMistake) statCosts.push(`+${appliedDepBonus} Dep`);
      const statsStr = statCosts.length > 0 ? ` (${statCosts.join(', ')})` : '';

      if (physMistake || mentalMistake) {
        if (physMistake) {
          nextPlayer.physicalConditionMax = Math.max(1, (nextPlayer.physicalConditionMax ?? 50) - 1);
          nextPlayer.physicalCondition = Math.min(nextPlayer.physicalConditionMax, nextPlayer.physicalCondition);
        }
        if (mentalMistake) {
          nextPlayer.resilienceBonus = (nextPlayer.resilienceBonus || 0) - 1;
          nextPlayer.mentalConditionMax = Math.max(1, (nextPlayer.mentalConditionMax ?? 50) - 1);
          nextPlayer.mentalCondition = Math.min(nextPlayer.mentalConditionMax, nextPlayer.mentalCondition);
        }
        const mistakeTypes = [physMistake ? 'Physical' : null, mentalMistake ? 'Mental' : null].filter(Boolean).join(' & ');
        actionLog = { key: 'action.education.mistake', params: { name: degDef.name, type: mistakeTypes, stats: statsStr } };
      } else {
        // Study progress
        nextPlayer.enrolledClasses = { ...(nextPlayer.enrolledClasses || {}) };
        let isGraduated = false;

        if (isPercentage) {
          const progressGain = (hoursToSpend / totalRequiredHours) * 100;
          const rawProgress = currentProgress + progressGain;
          
          if (rawProgress >= 99.0 || (totalRequiredHours - (currentProgress / 100 * totalRequiredHours) <= hoursToSpend + 0.1)) {
            nextPlayer.enrolledClasses[degDef.id] = 100;
            isGraduated = true;
          } else {
            const newProgress = Math.min(100, roundToResolution(rawProgress, context.rules.educationResolution ?? 0.1));
            if (newProgress >= 99.0) {
              nextPlayer.enrolledClasses[degDef.id] = 100;
              isGraduated = true;
            } else {
              nextPlayer.enrolledClasses[degDef.id] = newProgress;
            }
          }
        } else {
          nextPlayer.enrolledClasses[degDef.id] = (nextPlayer.enrolledClasses[degDef.id] || 0) + 1;
          isGraduated = nextPlayer.enrolledClasses[degDef.id] >= required;
        }

        const currentDisplay = isPercentage 
          ? formatDegreeProgress(nextPlayer.enrolledClasses[degDef.id], true)
          : String(nextPlayer.enrolledClasses[degDef.id]);
        const requiredDisplay = isPercentage ? '100%' : String(required);

        if (isGraduated) {
          nextPlayer.degrees = [...nextPlayer.degrees, degDef.id];
          delete nextPlayer.enrolledClasses[degDef.id];
          delete nextPlayer.enrolledClasses[`${degDef.id}_req`];

          const qolReduced = context.rules.reducedDegreeStatBonus;
          const depReward = qolReduced ? Math.min(2, degDef.rewards.dependability) : degDef.rewards.dependability;
          const maxDepReward = qolReduced ? Math.min(2, degDef.rewards.maxDepBoost) : degDef.rewards.maxDepBoost;
          const maxExpReward = qolReduced ? Math.min(2, degDef.rewards.maxExpBoost) : degDef.rewards.maxExpBoost;

          nextPlayer = applyHappinessChange(nextPlayer, degDef.rewards.happiness, 'graduation', context.rules, context.campaign.config.statRules);
          nextPlayer.degreeDepBoost += maxDepReward;
          nextPlayer.dependability = Math.min(100, nextPlayer.dependability + depReward);
          nextPlayer.degreeExpBoost += maxExpReward;

          actionLog = { key: 'action.education.graduated', params: { name: degDef.name, stats: statsStr } };
        } else {
          actionLog = { key: 'action.education.studied', params: { name: degDef.name, current: currentDisplay, required: requiredDisplay, stats: statsStr } };
        }
      }
    } else {
      const result = study(nextPlayer, degDef, studySessionCost, context.rules);
      nextPlayer = result.updated;
      actionLog = result.message;
    }
  }

  return { nextPlayer, actionLog };
}
