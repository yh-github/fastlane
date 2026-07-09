import { type PlayerState, COST_JOB_APPLICATION, COST_WORK_SESSION } from './gameState';
import { spendHours } from './timeManager';
import { processRentDebt } from './economyEngine';
import type { JobDef } from './dataLoader';

export interface JobApplicationResult {
  updated: PlayerState;
  success: boolean;
  message: string;
}

export function applyForJob(player: PlayerState, job: JobDef, messages: Record<string, string> = {}): JobApplicationResult {
  const msg = (key: string, defaultMsg: string, vars: Record<string, string> = {}) => {
    let m = messages[key] || defaultMsg;
    for (const [k, v] of Object.entries(vars)) m = m.replace(`{${k}}`, v);
    return m;
  };

  if (player.hoursRemaining < COST_JOB_APPLICATION) {
    return { updated: player, success: false, message: msg('job_apply_not_enough_time', 'Not enough time to apply.') };
  }

  // Cost to apply
  let updated = spendHours(player, COST_JOB_APPLICATION);

  // The Cook job at Monolith Burgers is always available
  if (job.id === 'burger_cook') {
    updated.currentJobId = job.id;
    updated.currentWage = job.baseWage;
    updated.raisesAtCurrentJob = 0;
    return { updated, success: true, message: msg('job_apply_success', `You got the job as ${job.title}!`, { title: job.title }) };
  }

  // Check hard requirements
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

  // RNG Luck check
  const luck = 40 + updated.dependability + updated.experience + (8 * updated.degrees.length);
  const roll = Math.floor(Math.random() * 100) + 1;

  if (roll > luck) {
    return { updated, success: false, message: msg('job_apply_no_openings', 'They decided to hire someone else (bad luck).') };
  }

  // Success
  updated.currentJobId = job.id;
  updated.currentWage = job.baseWage; // Lock in the wage
  updated.raisesAtCurrentJob = 0;

  return { updated, success: true, message: `You got the job as ${job.title}!` };
}

export interface WorkResult {
  updated: PlayerState;
  wagesEarned: number;
  success: boolean;
  message?: string;
}

export function workShift(player: PlayerState, job: JobDef): WorkResult {
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

  const hoursToWork = Math.min(player.hoursRemaining, COST_WORK_SESSION);
  let updated = spendHours(player, hoursToWork);

  // Prorate wage: 6 hours = 8 hours of base wage (full shift)
  const fullShiftWage = updated.currentWage * 8;
  const rawWagesEarned = Math.floor(fullShiftWage * (hoursToWork / COST_WORK_SESSION));

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

  // Deduct clothing wear (1 week worn per turn worked, handled here or turn end? 
  // Standard classic is 1 week worn per turn you work at least once).
  // We'll handle it via turn-end processor using `hasWorked`, or we can deduct fractional.
  // For now, let's let turnProcessor handle clothes wear if `hasWorked` is true.

  return { updated, wagesEarned, success: true, message: garnishMessage };
}
