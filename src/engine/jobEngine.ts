import { type PlayerState, type GameRules, type GameEvent } from './gameState';
import { spendHours } from './timeManager';
import { processRentDebt } from './economyEngine';
import type { JobDef } from './dataLoader';
import type { Random } from '../utils/rng';

export interface JobApplicationResult {
  updated: PlayerState;
  success: boolean;
  message: GameEvent;
}

export function calculateJobLuck(player: PlayerState): number {
  return Math.floor(30 + (10 + player.dependability + player.experience + (8 * player.degrees.length)) / 3);
}

export function applyForJob(player: PlayerState, job: JobDef, timeCost: number, messages: Record<string, string> = {}, offeredWage?: number, rng?: Random, rules?: GameRules, turn: number = 1): JobApplicationResult {
  const msg = (key: string, defaultMsg: string, vars: Record<string, string> = {}) => {
    let m = messages[key] || defaultMsg;
    for (const [k, v] of Object.entries(vars)) m = m.replaceAll(`{${k}}`, v as string);
    return m;
  };

  if (player.hoursRemaining < timeCost) {
    if (!rules?.allowPartialHours) {
      return { updated: player, success: false, message: { key: 'action.error.notEnoughTime' } };
    }
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

    const reqDep = job.requirements.dependability + (updated.raisesAtCurrentJob * 5);
    if (updated.dependability >= reqDep) {
      if (newWage > player.currentWage) {
        updated.currentWage = newWage;
        updated.raisesAtCurrentJob += 1;
        updated.happiness = Math.min(100, updated.happiness + 3);
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
    if (turn <= 4) {
      return { updated, success: false, message: { key: 'action.job.noOpenings' } };
    }
    return { updated, success: false, message: { key: 'action.job.rejected', params: { reasons: rejectionReasons.join(' ') } } };
  }

  // RNG Luck check for new jobs
  const luck = calculateJobLuck(updated);
  const roll = Math.floor((rng ? rng.next() : Math.random()) * 100) + 1;

  if (roll > luck) {
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
  message?: GameEvent;
}

export function workShift(player: PlayerState, job: JobDef, shiftCost: number): WorkResult {
  if (player.hoursRemaining <= 0 || player.currentJobId !== job.id) {
    return { updated: player, wagesEarned: 0, success: false, message: { key: 'action.error.cannotWork' } };
  }
  
  // Dependability firing & warning checks
  const degreeBoost = Math.max(0, player.maxDependability - 20);
  if (player.dependability <= job.requirements.dependability - 5 - degreeBoost) {
    const updated = { ...player, currentJobId: null, currentWage: 0, raisesAtCurrentJob: 0 };
    updated.happiness = Math.max(10, updated.happiness - 7);
    return { updated, wagesEarned: 0, success: false, message: { key: 'action.job.fired' } };
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
    return { updated: player, wagesEarned: 0, success: false, message: { key: 'action.job.needClothes', params: { req } } };
  }

  const clothesScore = activeClothes === 'business' ? 3 : (activeClothes === 'dress' ? 2 : 1);
  const reqScore = req === 'business' ? 3 : (req === 'dress' ? 2 : 1);

  if (clothesScore < reqScore) {
    return { updated: player, wagesEarned: 0, success: false, message: { key: 'action.job.needClothes', params: { req } } };
  }

  const hoursToWork = Math.min(player.hoursRemaining, shiftCost);
  let updated = spendHours(player, hoursToWork);

  // Prorate wage: shiftCost hours = 8 hours of base wage (full shift)
  const fullShiftWage = updated.currentWage * 8;
  const rawWagesEarned = Math.floor(fullShiftWage * (hoursToWork / shiftCost));

  let wagesEarned = rawWagesEarned;
  let garnishMessage = '';
  
  if (updated.rentDebt > 0) {
    const [afterDebtState, netWage] = processRentDebt(updated, rawWagesEarned);
    updated = afterDebtState;
    wagesEarned = netWage;
    const garnished = rawWagesEarned - netWage;
    if (garnished > 0) {
      garnishMessage = ` ($${garnished} garnished for rent debt)`;
    }
  }

  updated.money += wagesEarned;
  updated.turnFlags.hasWorked = true;

  // Stat growth is capped by the current job's requirements plus any degree boosts
  // updated.maxExperience inherently stores (STARTING_EXPERIENCE + 10 + degreeBoosts)
  // We want the cap to be (10 + degreeBoosts + current job requirement)
  const effectiveMaxExp = updated.maxExperience - 10 + job.requirements.experience;
  const effectiveMaxDep = updated.maxDependability - 20 + job.requirements.dependability;

  updated.experience = Math.min(updated.experience + 1, effectiveMaxExp);
  updated.dependability = Math.min(updated.dependability + 1, effectiveMaxDep);

  // Deduct fractional?
  // We'll let the turnProcessor handle clothes wear unconditionally per turn as per the classic rules.

  let finalMessage: GameEvent | undefined = undefined;
  if (player.dependability <= job.requirements.dependability - 3 - degreeBoost) {
    finalMessage = { key: 'action.job.warning', params: { garnished: garnishMessage } };
  } else if (garnishMessage) {
    finalMessage = { key: 'action.job.garnished', params: { garnished: garnishMessage } };
  }

  return { updated, wagesEarned, success: true, message: finalMessage };
}
