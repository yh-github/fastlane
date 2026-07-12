import { type PlayerState } from './gameState';
import { spendHours } from './timeManager';
import { processRentDebt } from './economyEngine';
import type { JobDef } from './dataLoader';
import type { Random } from './rng';

export interface JobApplicationResult {
  updated: PlayerState;
  success: boolean;
  message: string;
}

export function applyForJob(player: PlayerState, job: JobDef, timeCost: number, messages: Record<string, string> = {}, offeredWage?: number, rng?: Random): JobApplicationResult {
  const msg = (key: string, defaultMsg: string, vars: Record<string, string> = {}) => {
    let m = messages[key] || defaultMsg;
    for (const [k, v] of Object.entries(vars)) m = m.replaceAll(`{${k}}`, v as string);
    return m;
  };

  if (player.hoursRemaining < timeCost) {
    return { updated: player, success: false, message: msg('job_apply_not_enough_time', 'Not enough time to apply.') };
  }

  // Cost to apply
  let updated = spendHours(player, timeCost);
  
  const isRaise = player.currentJobId === job.id;

  // The Cook job at Monolith Burgers is always available
  if (job.id === 'burger_cook' && !isRaise) {
    updated.currentJobId = job.id;
    updated.currentWage = offeredWage ?? job.baseWage;
    updated.raisesAtCurrentJob = 0;
    return { updated, success: true, message: msg('job_apply_success', `You got the job as ${job.title}!`, { title: job.title }) };
  }

  if (isRaise) {
    // Raise logic
    const reqDep = job.requirements.dependability + (updated.raisesAtCurrentJob * 5);
    if (updated.dependability >= reqDep) {
      const newWage = offeredWage ?? job.baseWage;
      if (newWage > player.currentWage) {
        updated.currentWage = newWage;
        updated.raisesAtCurrentJob += 1;
        updated.happiness = Math.min(100, updated.happiness + 3);
        return { updated, success: true, message: msg('job_apply_raise_success', 'You got the raise!') };
      } else {
        return { updated, success: false, message: 'You applied for a wage less than or equal to your current wage. Waste of time!' };
      }
    } else {
      return { updated, success: false, message: msg('job_apply_raise_denied', 'They denied your raise request. You need to be more dependable.') };
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
    return { updated, success: false, message: rejectionReasons.join(' ') };
  }

  // RNG Luck check for new jobs
  const luck = 40 + updated.dependability + updated.experience + (8 * updated.degrees.length);
  const roll = Math.floor((rng ? rng.next() : Math.random()) * 100) + 1;

  if (roll > luck) {
    return { updated, success: false, message: msg('job_apply_no_openings', 'They decided to hire someone else (bad luck).') };
  }

  // Success
  updated.currentJobId = job.id;
  updated.currentWage = offeredWage ?? job.baseWage; // Lock in the wage
  updated.raisesAtCurrentJob = 0;

  return { updated, success: true, message: msg('job_apply_success', `You got the job as ${job.title}!`, { title: job.title }) };
}

export interface WorkResult {
  updated: PlayerState;
  wagesEarned: number;
  success: boolean;
  message?: string;
}

export function workShift(player: PlayerState, job: JobDef, shiftCost: number): WorkResult {
  if (player.hoursRemaining < 1 || player.currentJobId !== job.id) {
    return { updated: player, wagesEarned: 0, success: false, message: "Cannot work right now." };
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
    return { updated: player, wagesEarned: 0, success: false, message: `You need ${req} clothes.` };
  }

  const clothesScore = activeClothes === 'business' ? 3 : (activeClothes === 'dress' ? 2 : 1);
  const reqScore = req === 'business' ? 3 : (req === 'dress' ? 2 : 1);

  if (clothesScore < reqScore) {
    return { updated: player, wagesEarned: 0, success: false, message: `You need ${req} clothes.` };
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

  return { updated, wagesEarned, success: true, message: garnishMessage };
}
