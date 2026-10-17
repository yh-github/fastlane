import type { PlayerState, MiniGameState } from '../gameState';
import type { ReducerContext, ActionHandlerResult } from './types';
import type { ReplayContext } from '../replayTypes';
import { requireConfig } from '../rules';
import { applyForJob, workShift } from '../jobEngine';
import { spendHours } from '../timeManager';
import { calcUsedSpace, calcHousingSpaceCap, calcMaxSkillCap } from '../statMath';
import { generateInitiativeCards, getJobInitiativeTier } from '../job/jobInitiativeDeck';

export function handleApplyAction(
  player: PlayerState,
  action: { type: 'apply'; jobId: string; offeredWage?: number },
  context: ReducerContext,
  replayContext: ReplayContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;
  const jobDef = context.campaign.jobs.find(j => j.id === action.jobId);
  if (jobDef) {
    const jobApplicationCost = requireConfig(context.campaign.config.timeRules?.jobApplicationCost, 'timeRules.jobApplicationCost');
    const result = applyForJob(
      nextPlayer,
      jobDef,
      jobApplicationCost,
      context.campaign.messages,
      action.offeredWage,
      context.rng,
      context.rules,
      context.turn,
      replayContext,
      context.campaign.config.statRules,
      context.economicIndex,
      context.campaign.minBaseWage,
      context.campaign.maxBaseWage
    );
    nextPlayer = result.updated;
    actionLog = result.message;
  }
  return { nextPlayer, actionLog };
}

export function handleWorkAction(
  player: PlayerState,
  action: { type: 'work'; jobId: string; mode?: 'look_busy' | 'work_work' | 'face_time' | 'innovate' | 'show_initiative' },
  context: ReducerContext,
  replayContext: ReplayContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;
  const jobDef = context.campaign.jobs.find(j => j.id === action.jobId);
  if (jobDef) {
    const workSessionCost = requireConfig(context.campaign.config.timeRules?.workSessionCost, 'timeRules.workSessionCost');
    const result = workShift(
      nextPlayer,
      jobDef,
      workSessionCost,
      context.rules,
      context.campaign.config.statRules,
      action.mode || 'work_work',
      context.rng,
      replayContext,
      context.campaign.education,
      context.campaign
    );
    nextPlayer = result.updated;
    if (result.messages && result.messages.length > 0) {
      actionLog = result.messages.length === 1 ? result.messages[0] : result.messages;
    } else {
      actionLog = result.success ? { key: 'action.job.worked' } : { key: 'action.error.cannotWork' };
    }
  }
  return { nextPlayer, actionLog };
}

export function handleResolveAppraisalDilemmaAction(
  player: PlayerState,
  action: { type: 'resolve_appraisal_dilemma' | 'resolve_mini_game'; choiceIndex: number },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  const dilemma = nextPlayer.pendingMiniGame || nextPlayer.pendingAppraisalDilemma;
  if (!dilemma || !dilemma.options[action.choiceIndex]) {
    return { nextPlayer, actionLog };
  }

  const choice = dilemma.options[action.choiceIndex];
  if (choice.type === 'cash') {
    const amount = choice.cashAmount || 0;
    nextPlayer.money += amount;
    actionLog = { key: 'action.job.appraisalChoiceCash', params: { amount } };
  } else if (choice.type === 'standing') {
    if (choice.depAmount) {
      nextPlayer.dependability = Math.min(100, (nextPlayer.dependability || 0) + choice.depAmount);
    }
    if (choice.mentalAmount) {
      nextPlayer.mentalCondition = Math.min(nextPlayer.mentalConditionMax ?? 50, (nextPlayer.mentalCondition ?? 50) + choice.mentalAmount);
    }
    actionLog = { key: 'action.job.appraisalChoiceStanding', params: { dep: choice.depAmount ?? 0, mental: choice.mentalAmount ?? 0 } };
  } else if (choice.type === 'item') {
    const isSpaceCapped = !!context.rules?.spaceCapping;
    const usedSpace = calcUsedSpace(nextPlayer, context.campaign, true);
    const spaceCap = calcHousingSpaceCap(nextPlayer, context.campaign);
    const hasSpace = !isSpaceCapped || (usedSpace + 2 <= spaceCap);

    if (choice.itemType === 'spare_parts') {
      if (hasSpace) {
        nextPlayer.inventory.spareParts = (nextPlayer.inventory.spareParts || 0) + 1;
        actionLog = { key: 'action.job.appraisalChoiceSpareParts' };
      } else {
        // Auto-pawn on the spot for $10 scrap cash
        nextPlayer.money += 10;
        actionLog = { key: 'action.job.appraisalChoiceSparePartsAutoPawn', params: { amount: 10 } };
      }
    } else {
      if (hasSpace) {
        nextPlayer.inventory.uninspectedKnickKnacks = (nextPlayer.inventory.uninspectedKnickKnacks || 0) + 1;
        actionLog = { key: 'action.job.appraisalChoiceCurio' };
      } else {
        // Auto-pawn on the spot for $15 scrap cash
        nextPlayer.money += 15;
        actionLog = { key: 'action.job.appraisalChoiceCurioAutoPawn', params: { amount: 15 } };
      }
    }
  } else if (choice.type === 'skill') {
    if (choice.techSkillAmount) {
      const maxTech = calcMaxSkillCap(nextPlayer, 'skillTech', context.campaign.education, context.campaign.config.statRules, context.rules);
      nextPlayer.skillTech = Math.min(maxTech, Math.round(((nextPlayer.skillTech || 0) + choice.techSkillAmount) * 100) / 100);
    }
    if (choice.mentalAmount) {
      nextPlayer.mentalCondition = Math.min(nextPlayer.mentalConditionMax ?? 50, (nextPlayer.mentalCondition ?? 50) + choice.mentalAmount);
    }
    actionLog = { key: 'action.job.appraisalChoiceSkill', params: { tech: choice.techSkillAmount ?? 0 } };
  } else if (choice.type === 'initiative') {
    if (choice.cashAmount) {
      nextPlayer.money += choice.cashAmount;
    }
    if (choice.cashCost) {
      nextPlayer.money = Math.max(0, nextPlayer.money - choice.cashCost);
    }
    if (choice.depAmount) {
      const job = context.campaign.jobs.find(j => j.id === nextPlayer.currentJobId);
      const maxDep = 20 + (job?.requirements?.dependability ?? 0) + (nextPlayer.degreeDepBoost || 0) + (nextPlayer.depMaxBonus || 0);
      nextPlayer.dependability = Math.min(Math.max(100, maxDep), (nextPlayer.dependability || 0) + choice.depAmount);
    }
    if (choice.expAmount) {
      const job = context.campaign.jobs.find(j => j.id === nextPlayer.currentJobId);
      const maxExp = 10 + (job?.requirements?.experience ?? 0) + (nextPlayer.degreeExpBoost || 0) + (nextPlayer.xpMaxBonus || 0);
      nextPlayer.experience = Math.min(maxExp, (nextPlayer.experience || 0) + choice.expAmount);
    }
    if (choice.leadershipSkillAmount) {
      const maxLeadership = calcMaxSkillCap(nextPlayer, 'skillMgmt', context.campaign.education, context.campaign.config.statRules, context.rules);
      const newLead = Math.min(maxLeadership, Math.round(((nextPlayer.skillMgmt || 0) + choice.leadershipSkillAmount) * 100) / 100);
      nextPlayer.skillMgmt = newLead;
      nextPlayer.skillLeadership = newLead;
    }
    if (choice.techSkillAmount) {
      const maxTech = calcMaxSkillCap(nextPlayer, 'skillTech', context.campaign.education, context.campaign.config.statRules, context.rules);
      nextPlayer.skillTech = Math.min(maxTech, Math.round(((nextPlayer.skillTech || 0) + choice.techSkillAmount) * 100) / 100);
    }
    if (choice.standingAmount && nextPlayer.currentJobId) {
      const job = context.campaign.jobs.find(j => j.id === nextPlayer.currentJobId);
      if (job?.locationId) {
        const tier = getJobInitiativeTier(job);
        const curStanding = nextPlayer.initiativesByLocation?.[job.locationId] || 0;
        const allowedGain = Math.max(0, Math.min(choice.standingAmount, tier - curStanding));
        if (allowedGain > 0) {
          nextPlayer.initiativesByLocation = {
            ...(nextPlayer.initiativesByLocation || {}),
            [job.locationId]: curStanding + allowedGain
          };
        }
      }
    }
    if (choice.mentalAmount) {
      const maxMental = nextPlayer.mentalConditionMax ?? 50;
      nextPlayer.mentalCondition = Math.max(1, Math.min(maxMental, (nextPlayer.mentalCondition ?? 50) + choice.mentalAmount));
    }
    if (choice.socialAmount) {
      nextPlayer.social = Math.max(1, Math.min(99, (nextPlayer.social ?? 50) + choice.socialAmount));
    }
    if (choice.physicalAmount) {
      const maxPhys = nextPlayer.physicalConditionMax ?? 50;
      nextPlayer.physicalCondition = Math.max(1, Math.min(maxPhys, (nextPlayer.physicalCondition ?? 50) + choice.physicalAmount));
    }

    actionLog = {
      key: 'action.job.initiativeChoiceResolved',
      params: {
        title: choice.title,
        badge: choice.badge || 'INITIATIVE',
        leadership: choice.leadershipSkillAmount ?? 0,
        tech: choice.techSkillAmount ?? 0,
        exp: choice.expAmount ?? 0,
        dep: choice.depAmount ?? 0,
        cash: (choice.cashAmount ?? 0) - (choice.cashCost ?? 0),
        mental: choice.mentalAmount ?? 0,
        social: choice.socialAmount ?? 0
      }
    };
  }

  nextPlayer.pendingMiniGame = null;
  nextPlayer.pendingAppraisalDilemma = null;
  return { nextPlayer, actionLog };
}

export function handleRedrawInitiativeAction(
  player: PlayerState,
  _action: { type: 'redraw_initiative' },
  context: ReducerContext,
  replayContext: ReplayContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  const dilemma = nextPlayer.pendingMiniGame || nextPlayer.pendingAppraisalDilemma;
  if (!dilemma || dilemma.gameType !== 'work_initiative' || dilemma.hasRedrawn) {
    return { nextPlayer, actionLog: { key: 'action.error.cannotRedraw' } };
  }

  // Cost: 1 hour, 1.0 Mental
  if (nextPlayer.hoursRemaining < 1) {
    return { nextPlayer, actionLog: { key: 'action.error.notEnoughTime' } };
  }
  const curMental = nextPlayer.mentalCondition ?? 50;
  if (curMental - 1.0 < 1.0) {
    return { nextPlayer, actionLog: { key: 'action.error.tooMentallyExhausted' } };
  }

  nextPlayer = spendHours(nextPlayer, 1);
  nextPlayer.mentalCondition = curMental - 1.0;

  const job = context.campaign.jobs.find(j => j.id === nextPlayer.currentJobId);
  if (!job) {
    return { nextPlayer, actionLog };
  }

  const actionCount = (nextPlayer.workActionsThisTurn || 0) + 1;
  const newCards = generateInitiativeCards(
    nextPlayer,
    job,
    context.campaign,
    context.rng,
    replayContext,
    actionCount
  );

  const updatedDilemma: MiniGameState = {
    ...dilemma,
    hasRedrawn: true,
    options: newCards
  };

  nextPlayer.pendingMiniGame = updatedDilemma;
  nextPlayer.pendingAppraisalDilemma = updatedDilemma;

  actionLog = { key: 'action.job.initiativeRedrawn' };
  return { nextPlayer, actionLog };
}


