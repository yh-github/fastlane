import { type PlayerState, type GameRules, type GameEvent } from './gameState';
import { spendHours } from './timeManager';
import { processRentDebt } from './economyEngine';
import { calcEmployabilityScore } from './statMath';
import type { JobDef } from './dataLoader';
import type { Random } from '../utils/rng';
import { resolveDecision, type ReplayContext } from './replayTypes';
import { applyMoraleEffect, applyHappinessChange } from './statEffects';
import { type StatRules } from './rules';

export interface JobApplicationResult {
  updated: PlayerState;
  success: boolean;
  message: GameEvent;
}

export function calculateJobEmployability(player: PlayerState): number {
  return calcEmployabilityScore(player.dependability, player.experience, player.degrees.length);
}

export function applyForJob(player: PlayerState, job: JobDef, timeCost: number, messages: Record<string, string> = {}, offeredWage?: number, rng?: Random, rules?: GameRules, turn: number = 1, replay?: ReplayContext, statRules?: StatRules): JobApplicationResult {
  const msg = (key: string, defaultMsg: string, vars: Record<string, string> = {}) => {
    let m = messages[key] || defaultMsg;
    for (const [k, v] of Object.entries(vars)) m = m.replaceAll(`{${k}}`, v as string);
    return m;
  };

  if (player.hoursRemaining <= 0 || (player.hoursRemaining < timeCost && !rules?.allowPartialHours)) {
    return { updated: player, success: false, message: { key: 'action.error.notEnoughTime' } };
  }

  if (player.turnFlags.jobsRejectedThisTurn?.includes(job.id)) {
    return { updated: player, success: false, message: { key: 'action.job.noOpenings' } };
  }

  // Cost to apply
  let updated = spendHours(player, timeCost);
  
  const isRaise = player.currentJobId === job.id;

  // Some jobs are automatically granted regardless of luck or exact stat checks
  if (job.tags?.includes('auto_accept') && !isRaise) {
    updated.currentJobId = job.id;
    updated.currentWage = offeredWage ?? job.baseWage;
    updated.raisesAtCurrentJob = 0;
    
    if (updated.dependability < 10) {
      updated.dependability = 10;
    }
    updated.experience += 2;
    
    return { updated, success: true, message: { key: 'action.job.gotJob', params: { title: job.title } } };
  }

  if (isRaise) {
    // Raise logic
    const newWage = offeredWage ?? job.baseWage;
    if (newWage === player.currentWage) {
      return { updated, success: false, message: { key: 'action.job.raiseSame' } };
    }
    if (newWage < player.currentWage) {
      return { updated, success: false, message: { key: 'action.job.raiseLess' } };
    }

    const reqDep = job.requirements.dependability + (updated.raisesAtCurrentJob * 5);
    if (updated.dependability >= reqDep) {
      if (newWage > player.currentWage) {
        updated.currentWage = newWage;
        updated.raisesAtCurrentJob += 1;
        updated = applyMoraleEffect(updated, 3, 'raise_approved', rules || ({} as any), statRules);
        return { updated, success: true, message: { key: 'action.job.raiseSuccess' } };
      } else {
        return { updated, success: false, message: { key: 'action.job.raiseWaste' } };
      }
    } else {
      return { updated, success: false, message: { key: 'action.job.raiseDenied' } };
    }
  }

  // Regular job application logic
  const rejectionReasons: string[] = [];

  if (updated.experience < job.requirements.experience) {
    rejectionReasons.push(msg('job_apply_missing_experience', 'Not enough experience.'));
  }
  if (updated.dependability < job.requirements.dependability) {
    rejectionReasons.push(msg('job_apply_missing_dependability', 'Not dependable enough.'));
  }
  
  // Check degrees
  for (const degree of job.requirements.degrees) {
    if (!updated.degrees.includes(degree)) {
      rejectionReasons.push(msg('job_apply_missing_degree', `Missing required degree: ${degree}`, { degree }));
    }
  }

  // Clothing is intentionally NOT checked here, as per game rules.
  // The workplace checks clothes during workShift.

  if (rejectionReasons.length > 0) {
    if (turn <= 4 && !rules?.helpfulUI) {
      return { updated, success: false, message: { key: 'action.job.noOpenings' } };
    }
    return { updated, success: false, message: { key: 'action.job.rejected', params: { reasons: rejectionReasons.join(' ') } } };
  }

  // Hiring threshold check for new jobs
  const employability = calculateJobEmployability(updated);
  const roll = resolveDecision(replay, `job_apply_luck`, () => Math.floor((rng ? rng.next() : Math.random()) * 100) + 1);

  if (roll > employability) {
    if (!updated.turnFlags.jobsRejectedThisTurn) updated.turnFlags.jobsRejectedThisTurn = [];
    updated.turnFlags.jobsRejectedThisTurn.push(job.id);
    return { updated, success: false, message: { key: 'action.job.noOpenings' } };
  }

  // Success
  updated.currentJobId = job.id;
  updated.currentWage = offeredWage ?? job.baseWage; // Lock in the wage
  updated.raisesAtCurrentJob = 0;
  
  // Anti-frustration feature: reset dependability to 10 when getting a new job if it's too low
  if (updated.dependability < 10) {
    updated.dependability = 10;
  }
  
  // Bonus experience for getting a new job
  updated.experience += 2;

  return { updated, success: true, message: { key: 'action.job.gotJob', params: { title: job.title } } };
}

export interface WorkResult {
  updated: PlayerState;
  wagesEarned: number;
  success: boolean;
  messages?: GameEvent[];
}

export function workShift(player: PlayerState, job: JobDef, shiftCost: number, rules?: GameRules, statRules?: StatRules): WorkResult {
  if (player.hoursRemaining <= 0 || player.currentJobId !== job.id) {
    return { updated: player, wagesEarned: 0, success: false, messages: [{ key: 'action.error.cannotWork' }] };
  }
  
  // Dependability firing & warning checks
  if (player.dependability <= job.requirements.dependability - 5) {
    let updated: PlayerState = { ...player, currentJobId: null, currentWage: 0, raisesAtCurrentJob: 0 };
    updated = applyHappinessChange(updated, -7, 'fired', rules || ({} as any), statRules);
    return { updated, wagesEarned: 0, success: false, messages: [{ key: 'action.job.fired' }] };
  }

  const req = job.requirements.uniform;

  const hasCasual = player.inventory.casualClothesWeeks > 0;
  const hasDress = player.inventory.dressClothesWeeks > 0;
  const hasBusiness = player.inventory.businessClothesWeeks > 0;

  let activeClothes: 'casual' | 'dress' | 'business' | 'none' = player.inventory.selectedClothes as 'casual' | 'dress' | 'business' | 'none';

  // Fallback if selected is worn out
  if (activeClothes === 'business' && !hasBusiness) activeClothes = hasDress ? 'dress' : (hasCasual ? 'casual' : 'none');
  if (activeClothes === 'dress' && !hasDress) activeClothes = hasBusiness ? 'business' : (hasCasual ? 'casual' : 'none');
  if (activeClothes === 'casual' && !hasCasual) activeClothes = hasDress ? 'dress' : (hasBusiness ? 'business' : 'none');

  if (activeClothes === 'none') {
    return { updated: player, wagesEarned: 0, success: false, messages: [{ key: 'action.job.needClothes', params: { req } }] };
  }

  const clothesScore = activeClothes === 'business' ? 3 : (activeClothes === 'dress' ? 2 : 1);
  const reqScore = req === 'business' ? 3 : (req === 'dress' ? 2 : 1);

  if (clothesScore < reqScore) {
    return { updated: player, wagesEarned: 0, success: false, messages: [{ key: 'action.job.needClothes', params: { req } }] };
  }

  const hoursToWork = Math.min(player.hoursRemaining, shiftCost);
  let updated = spendHours(player, hoursToWork);

  // Prorate wage: shiftCost hours = 8 hours of base wage (full shift)
  const fullShiftWage = updated.currentWage * 8;
  const rawWagesEarned = Math.floor(fullShiftWage * (hoursToWork / shiftCost));

  let wagesEarned = rawWagesEarned;
  let totalGarnished = 0;
  
  if (updated.rentDebt > 0) {
    const [afterDebtState, netWage, garnishedAmount] = processRentDebt(updated, rawWagesEarned);
    updated = afterDebtState;
    wagesEarned = netWage;
    totalGarnished = garnishedAmount;
  }

  updated.money += wagesEarned;
  updated.turnFlags.hasWorked = true;

  // Stat growth is capped by the current job's requirements plus any degree boosts
  const effectiveMaxExp = 10 + job.requirements.experience + (updated.degreeExpBoost || 0);
  const effectiveMaxDep = 20 + job.requirements.dependability + (updated.degreeDepBoost || 0);

  updated.experience = Math.min(updated.experience + 1, effectiveMaxExp);
  updated.dependability = Math.min(updated.dependability + 1, effectiveMaxDep);

  const messages: GameEvent[] = [];
  if (player.dependability <= job.requirements.dependability - 3) {
    messages.push({ key: 'action.job.warning' });
  }
  if (totalGarnished > 0) {
    messages.push({ key: 'action.job.garnished', params: { amount: totalGarnished } });
  }

  return { updated, wagesEarned, success: true, messages };
}
