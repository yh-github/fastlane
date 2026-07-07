import { type PlayerState, COST_JOB_APPLICATION, COST_WORK_SESSION } from './gameState';
import { spendHours } from './timeManager';
import type { JobDef } from './dataLoader';

export interface JobApplicationResult {
  updated: PlayerState;
  success: boolean;
  message: string;
}

export function applyForJob(player: PlayerState, job: JobDef): JobApplicationResult {
  if (player.hoursRemaining < COST_JOB_APPLICATION) {
    return { updated: player, success: false, message: 'Not enough time to apply.' };
  }

  // Cost to apply
  let updated = spendHours(player, COST_JOB_APPLICATION);

  // Check hard requirements
  if (updated.experience < job.requirements.experience) {
    return { updated, success: false, message: 'Not enough experience.' };
  }
  if (updated.dependability < job.requirements.dependability) {
    return { updated, success: false, message: 'Not dependable enough.' };
  }
  
  // Check degrees
  for (const degree of job.requirements.degrees) {
    if (!updated.degrees.includes(degree)) {
      return { updated, success: false, message: `Missing required degree: ${degree}` };
    }
  }

  // Check uniform (if strict clothes tracking is implemented)
  // For V1, we just check if they have weeks left of the required clothes type
  let hasClothes = false;
  if (job.requirements.uniform === 'casual' && updated.inventory.casualClothesWeeks > 0) hasClothes = true;
  else if (job.requirements.uniform === 'dress' && updated.inventory.dressClothesWeeks > 0) hasClothes = true;
  else if (job.requirements.uniform === 'business' && updated.inventory.businessClothesWeeks > 0) hasClothes = true;

  if (!hasClothes) {
    return { updated, success: false, message: `You need ${job.requirements.uniform} clothes.` };
  }

  // RNG Luck check
  const luck = 40 + updated.dependability + updated.experience + (8 * updated.degrees.length);
  const roll = Math.floor(Math.random() * 100) + 1;

  if (roll > luck) {
    return { updated, success: false, message: 'They decided to hire someone else (bad luck).' };
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
}

export function workShift(player: PlayerState, job: JobDef): WorkResult {
  if (player.hoursRemaining < 1 || player.currentJobId !== job.id) {
    return { updated: player, wagesEarned: 0 };
  }

  const hoursToWork = Math.min(player.hoursRemaining, COST_WORK_SESSION);
  let updated = spendHours(player, hoursToWork);

  // Prorate wage: 6 hours = 8 hours of base wage (full shift)
  const fullShiftWage = updated.currentWage * 8;
  const wagesEarned = Math.floor(fullShiftWage * (hoursToWork / COST_WORK_SESSION));

  updated.money += wagesEarned;
  updated.turnFlags.hasWorked = true;

  // Stat growth
  updated.experience = Math.min(updated.experience + 1, updated.maxExperience);
  updated.dependability = Math.min(updated.dependability + 1, updated.maxDependability);

  // Deduct clothing wear (1 week worn per turn worked, handled here or turn end? 
  // Standard classic is 1 week worn per turn you work at least once).
  // We'll handle it via turn-end processor using `hasWorked`, or we can deduct fractional.
  // For now, let's let turnProcessor handle clothes wear if `hasWorked` is true.

  return { updated, wagesEarned };
}
