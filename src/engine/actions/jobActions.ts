import type { PlayerState } from '../gameState';
import type { ReducerContext, ActionHandlerResult } from './types';
import type { ReplayContext } from '../replayTypes';
import { requireConfig } from '../rules';
import { applyForJob, workShift } from '../jobEngine';

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
      context.economicIndex
    );
    nextPlayer = result.updated;
    actionLog = result.message;
  }
  return { nextPlayer, actionLog };
}

export function handleWorkAction(
  player: PlayerState,
  action: { type: 'work'; jobId: string; mode?: 'look_busy' | 'work_work' | 'face_time' | 'innovate' },
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
      replayContext
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
  action: { type: 'resolve_appraisal_dilemma'; choiceIndex: number },
  _context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  const dilemma = nextPlayer.pendingAppraisalDilemma;
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
    if (choice.itemType === 'spare_parts') {
      nextPlayer.inventory.spareParts = (nextPlayer.inventory.spareParts || 0) + 1;
      actionLog = { key: 'action.job.appraisalChoiceSpareParts' };
    } else {
      nextPlayer.inventory.uninspectedKnickKnacks = (nextPlayer.inventory.uninspectedKnickKnacks || 0) + 1;
      actionLog = { key: 'action.job.appraisalChoiceCurio' };
    }
  }

  nextPlayer.pendingAppraisalDilemma = null;
  return { nextPlayer, actionLog };
}

