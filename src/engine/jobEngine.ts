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
  return calcEmployabilityScore(player.dependability, player.experience, player.degrees.length, 0, player.social);
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
    updated.innovateChance = 0;
    updated.innovateEscrow = 0;
    updated.innovateProjectsCompleted = 0;
    
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

    const effectiveRaises = Math.max(0, updated.raisesAtCurrentJob - (updated.innovateProjectsCompleted || 0));
    const reqDep = job.requirements.dependability + (effectiveRaises * 5);
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
    rejectionReasons.push(msg('job_apply_missing_dependability', 'Poor Work History.'));
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
    const shouldMask = rules?.maskEarlyJobRejections !== undefined 
      ? (rules.maskEarlyJobRejections && turn <= 4)
      : (turn <= 4 && !rules?.helpfulUI);
    if (shouldMask) {
      return { updated, success: false, message: { key: 'action.job.noOpenings' } };
    }
    return { updated, success: false, message: { key: 'action.job.rejected', params: { reasons: rejectionReasons.join(' ') } } };
  }

  // Hiring threshold check for new jobs
  const locMistakes = updated.mistakesByLocation?.[job.locationId] || 0;
  const employability = calcEmployabilityScore(updated.dependability, updated.experience, updated.degrees.length, locMistakes, updated.social);
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
  updated.innovateChance = 0;
  updated.innovateEscrow = 0;
  updated.innovateProjectsCompleted = 0;
  
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

export type WorkMode = 'look_busy' | 'work_work' | 'face_time' | 'innovate';

export function workShift(
  player: PlayerState,
  job: JobDef,
  shiftCost: number,
  rules?: GameRules,
  statRules?: StatRules,
  mode: WorkMode = 'work_work',
  rng?: Random,
  replay?: ReplayContext
): WorkResult {
  if (player.hoursRemaining <= 0 || player.currentJobId !== job.id) {
    return { updated: player, wagesEarned: 0, success: false, messages: [{ key: 'action.error.cannotWork' }] };
  }
  
  // Dependability firing & warning checks
  const fireBuffer = 5 + (player.innovateProjectsCompleted || 0) * 2;
  if (player.dependability <= job.requirements.dependability - fireBuffer) {
    let updated: PlayerState = {
      ...player,
      currentJobId: null,
      currentWage: 0,
      raisesAtCurrentJob: 0,
      innovateChance: 0,
      innovateEscrow: 0,
      innovateProjectsCompleted: 0
    };
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

  if (mode === 'innovate' && (!player.degrees || player.degrees.length === 0)) {
    return { updated: player, wagesEarned: 0, success: false, messages: [{ key: 'action.job.innovateNeedDegree' }] };
  }

  const isAdvanced = !!rules?.usePhysicalMentalConditions;
  let physicalCost = 0;
  let mentalCost = 0;
  let wageMultiplier = 1.0;
  let baseDepGain = 1;

  if (isAdvanced) {
    const actionCount = (player.workActionsThisTurn || 0) + 1;
    const overtimeThreshold = statRules?.workOvertimeThreshold ?? 8;
    const grindThreshold = statRules?.workGrindThreshold ?? 4;

    let basePhys: number;
    let baseMental: number;

    if (actionCount >= overtimeThreshold) {
      basePhys = statRules?.workOvertimePhysicalCost ?? 2;
      baseMental = statRules?.workOvertimeMentalCost ?? 2;
    } else if (actionCount >= grindThreshold) {
      basePhys = statRules?.workGrindPhysicalCost ?? 1;
      baseMental = statRules?.workGrindMentalCost ?? 1;
    } else {
      basePhys = statRules?.workPhysicalCost ?? 1;
      baseMental = statRules?.workNormalMentalCost ?? 0;
    }

    if (mode === 'look_busy') {
      physicalCost = basePhys * 0.5;
      mentalCost = baseMental * 0.5;
      wageMultiplier = 1.0;
      baseDepGain = 0;
    } else if (mode === 'face_time') {
      physicalCost = basePhys * 0.5;
      mentalCost = baseMental * 0.5 + 1.0;
      wageMultiplier = 0.5;
      const socialDepBonus = Math.floor((player.social || 0) / 25);
      baseDepGain = 2 + socialDepBonus;
    } else if (mode === 'innovate') {
      physicalCost = basePhys * 1.0;
      mentalCost = baseMental + 4.0;
      wageMultiplier = 0.0;
      baseDepGain = 0;
    } else {
      // work_work
      physicalCost = basePhys * 1.0;
      mentalCost = baseMental * 1.0;
      wageMultiplier = 1.0;
      baseDepGain = 1;
    }

    // Fatigue: when Physical < 10, +1 Mental cost (or 0.5 if halved)
    const curPhys = player.physicalCondition ?? 50;
    if (curPhys < 10) {
      const fatigueCost = (mode === 'look_busy' || mode === 'face_time') ? 0.5 : 1.0;
      mentalCost += fatigueCost;
    }

    // Strict stat floor check: currentStat - cost >= 1.0
    const curMental = player.mentalCondition ?? 50;
    const physLow = curPhys - physicalCost < 1.0;
    const mentalLow = curMental - mentalCost < 1.0;

    if (physLow && mentalLow) {
      return { updated: player, wagesEarned: 0, success: false, messages: [{ key: 'action.error.tooExhausted' }] };
    }
    if (physLow) {
      return { updated: player, wagesEarned: 0, success: false, messages: [{ key: 'action.error.tooPhysicallyExhausted' }] };
    }
    if (mentalLow) {
      return { updated: player, wagesEarned: 0, success: false, messages: [{ key: 'action.error.tooMentallyExhausted' }] };
    }
  }

  const hoursToWork = Math.min(player.hoursRemaining, shiftCost);
  let updated = spendHours(player, hoursToWork);

  // Prorate wage: shiftCost hours = 8 hours of base wage (full shift)
  const fullShiftWage = Math.floor(updated.currentWage * 8 * wageMultiplier);
  const rawWagesEarned = Math.floor(fullShiftWage * (hoursToWork / shiftCost));

  let wagesEarned = rawWagesEarned;
  let totalGarnished = 0;
  
  if (updated.rentDebt > 0 && rawWagesEarned > 0) {
    const [afterDebtState, netWage, garnishedAmount] = processRentDebt(updated, rawWagesEarned);
    updated = afterDebtState;
    wagesEarned = netWage;
    totalGarnished = garnishedAmount;
  }

  updated.money += wagesEarned;
  updated.turnFlags.hasWorked = true;

  const messages: GameEvent[] = [];

  if (isAdvanced) {
    const actionCount = (player.workActionsThisTurn || 0) + 1;
    updated.workActionsThisTurn = actionCount;

    const oldPhys = updated.physicalCondition ?? 50;
    const oldMental = updated.mentalCondition ?? 50;

    updated.physicalCondition = oldPhys - physicalCost;
    updated.mentalCondition = oldMental - mentalCost;

    if (mentalCost >= (statRules?.resilienceDropThreshold ?? 3)) {
      updated.resilienceBonus = (updated.resilienceBonus || 0) + 1;
      updated.mentalConditionMax = Math.min(statRules?.globalMaxMentalCondition ?? 99, (updated.mentalConditionMax || 50) + 1);
    }

    // Mistake resolution
    let physMistake = false;
    let mentalMistake = false;

    if (physicalCost > 0 && oldPhys < 10) {
      const physChance = (10 - oldPhys) * 0.025;
      physMistake = resolveDecision(replay, `work_phys_mistake_${player.id}_${actionCount}`, () => (rng ? rng.next() : Math.random()) < physChance);
    }

    if (mentalCost > 0) {
      if (mode === 'innovate') {
        const mentalThresh = 25;
        if (oldMental < mentalThresh) {
          const mentalChance = (mentalThresh - oldMental) * 0.04;
          mentalMistake = resolveDecision(replay, `work_mental_mistake_${player.id}_${actionCount}`, () => (rng ? rng.next() : Math.random()) < mentalChance);
        }
      } else {
        const mentalThresh = 10;
        if (oldMental < mentalThresh) {
          const mentalChance = (mentalThresh - oldMental) * 0.025;
          mentalMistake = resolveDecision(replay, `work_mental_mistake_${player.id}_${actionCount}`, () => (rng ? rng.next() : Math.random()) < mentalChance);
        }
      }
    }

    if (physMistake || mentalMistake) {
      const curMistakes = updated.mistakesByLocation?.[job.locationId] || 0;
      let mistakesAdded = 0;
      if (physMistake) {
        mistakesAdded++;
        updated.physicalConditionMax = Math.max(1, (updated.physicalConditionMax ?? 50) - 1);
        updated.physicalCondition = Math.min(updated.physicalConditionMax, updated.physicalCondition);
      }
      if (mentalMistake) {
        mistakesAdded++;
        if (mode === 'innovate') {
          // Research blunders cause direct mental drain and lost research odds without degrading max capacity/resilience
          updated.mentalCondition = Math.max(1, (updated.mentalCondition ?? 50) - 5);
          updated.innovateChance = Math.max(0, Math.round(((updated.innovateChance || 0) - 2.0) * 10) / 10);
        } else {
          updated.resilienceBonus = (updated.resilienceBonus || 0) - 1;
          updated.mentalConditionMax = Math.max(1, (updated.mentalConditionMax ?? 50) - 1);
          updated.mentalCondition = Math.min(updated.mentalConditionMax, updated.mentalCondition);
        }
      }

      // Penalty = NUM_OF_MISTAKES (current counter before adding this turn's mistakes)
      updated.dependability = Math.max(0, updated.dependability - curMistakes);
      updated.mistakesByLocation = {
        ...(updated.mistakesByLocation || {}),
        [job.locationId]: curMistakes + mistakesAdded
      };

      const mistakeTypes = [physMistake ? 'Physical' : null, mentalMistake ? 'Mental' : null].filter(Boolean).join(' & ');
      messages.push({ key: 'action.job.mistake', params: { type: mistakeTypes, penalty: curMistakes, total: curMistakes + mistakesAdded } });
    } else {
      if (mode === 'innovate') {
        const fraction = hoursToWork / shiftCost;
        const baseRate = 1.8; // 1.8 pp base
        const surplusXp = Math.max(0, updated.experience - job.requirements.experience);
        const surplusXpBonus = Math.min(1.0, Math.floor(surplusXp / 10) * 0.5); // up to +1.0 pp
        const mentalBonus = oldMental > 75 ? 1.0 : (oldMental > 50 ? 0.5 : 0.0); // up to +1.0 pp
        const hasComputer = !!updated.inventory?.appliances?.some(a => a.id === 'computer');
        const computerBonus = hasComputer ? 1.0 : 0.0; // +1.0 pp
        const completedProjects = updated.innovateProjectsCompleted || 0;
        const divisor = completedProjects === 0 ? 1.0 : (completedProjects === 1 ? 2.5 : (completedProjects === 2 ? 4.5 : 7.0));

        const gain = ((baseRate + surplusXpBonus + mentalBonus + computerBonus) * fraction) / divisor;
        const oldChance = updated.innovateChance || 0;
        const newChance = Math.min(85, Math.round((oldChance + gain) * 10) / 10);

        // Halved escrow accumulation (0.5x wage rate)
        const shiftEscrow = Math.floor(updated.currentWage * 4 * fraction);
        const newEscrow = (updated.innovateEscrow || 0) + shiftEscrow;

        // Serendipity check (~15% when healthy: Mental >= 25 and Phys >= 10)
        if (oldMental >= 25 && oldPhys >= 10) {
          const isSerendipity = resolveDecision(replay, `innovate_serendipity_${player.id}_${actionCount}`, () => (rng ? rng.next() : Math.random()) < 0.15);
          if (isSerendipity) {
            const rollSerenType = resolveDecision(replay, `innovate_serendipity_type_${player.id}_${actionCount}`, () => (rng ? rng.next() : Math.random()) < 0.5 ? 1 : 2);
            if (rollSerenType === 1) {
              updated.depMaxBonus = (updated.depMaxBonus || 0) + 1;
              messages.push({ key: 'action.job.innovateSerendipityDep' });
            } else {
              const maxExp = 10 + job.requirements.experience + (updated.degreeExpBoost || 0) + (updated.xpMaxBonus || 0);
              updated.experience = Math.min(maxExp, updated.experience + 1);
              messages.push({ key: 'action.job.innovateSerendipityExp' });
            }
          }
        }

        // Breakthrough roll
        const roll100 = resolveDecision(replay, `innovate_roll_${player.id}_${actionCount}`, () => Math.floor((rng ? rng.next() : Math.random()) * 100) + 1);
        const isBreakthrough = roll100 <= newChance;

        if (isBreakthrough) {
          const varianceMultiplier = resolveDecision(replay, `innovate_grant_variance_${player.id}_${actionCount}`, () => 0.75 + (rng ? rng.next() : Math.random()) * 0.5);
          const finalGrant = Math.floor(newEscrow * varianceMultiplier);
          let netGrant = finalGrant;
          if (updated.rentDebt > 0 && finalGrant > 0) {
            const [afterDebtState, netAmount, garnished] = processRentDebt(updated, finalGrant);
            updated = afterDebtState;
            netGrant = netAmount;
            if (garnished > 0) {
              messages.push({ key: 'action.job.garnished', params: { amount: garnished } });
            }
          }
          updated.money += netGrant;

          updated.depMaxBonus = (updated.depMaxBonus || 0) + 3;
          updated.xpMaxBonus = (updated.xpMaxBonus || 0) + 3;

          const effectiveMaxDep = 20 + job.requirements.dependability + (updated.degreeDepBoost || 0) + (updated.depMaxBonus || 0);
          updated.dependability = Math.min(effectiveMaxDep, updated.dependability + 5);

          const effectiveMaxExp = 10 + job.requirements.experience + (updated.degreeExpBoost || 0) + (updated.xpMaxBonus || 0);
          updated.experience = Math.min(effectiveMaxExp, updated.experience + 3);

          updated.innovateChance = 0;
          updated.innovateEscrow = 0;
          updated.innovateProjectsCompleted = completedProjects + 1;

          messages.push({ key: 'action.job.innovateBreakthrough', params: { grant: finalGrant, projectNum: completedProjects + 1 } });
        } else {
          updated.innovateChance = newChance;
          updated.innovateEscrow = newEscrow;
          messages.push({ key: 'action.job.innovateProgress', params: { chance: Math.round(newChance), escrow: newEscrow } });
        }
      } else {
        // Normal stat growth for other modes
        const effectiveMaxDep = 20 + job.requirements.dependability + (updated.degreeDepBoost || 0) + (updated.depMaxBonus || 0);
        updated.dependability = Math.min(effectiveMaxDep, updated.dependability + baseDepGain);
      }
    }

    if (mode === 'work_work') {
      const effectiveMaxExp = 10 + job.requirements.experience + (updated.degreeExpBoost || 0) + (updated.xpMaxBonus || 0);
      updated.experience = Math.min(effectiveMaxExp, updated.experience + 1);
    }

    let socialGain = 0;
    if (mode === 'face_time') {
      socialGain = resolveDecision(replay, `work_facetime_social_${player.id}_${actionCount}`, () => Math.floor((rng ? rng.next() : Math.random()) * 3) + 1);
      updated.social = Math.min(99, (updated.social || 1) + socialGain);
    }

    const statCosts: string[] = [];
    if (physicalCost > 0) statCosts.push(`-${physicalCost} Physical`);
    if (mentalCost > 0) statCosts.push(`-${mentalCost} Mental`);
    if (socialGain > 0) statCosts.push(`+${socialGain} Social`);
    const statsStr = statCosts.length > 0 ? ` (${statCosts.join(', ')})` : '';
    messages.unshift({ key: 'action.job.worked', params: { title: job.title, wagesEarned, stats: statsStr } });

  } else {
    // Classic Mode
    const effectiveMaxExp = 10 + job.requirements.experience + (updated.degreeExpBoost || 0);
    const effectiveMaxDep = 20 + job.requirements.dependability + (updated.degreeDepBoost || 0);

    updated.experience = Math.min(effectiveMaxExp, updated.experience + 1);
    updated.dependability = Math.min(effectiveMaxDep, updated.dependability + 1);
    messages.unshift({ key: 'action.job.worked', params: { title: job.title, wagesEarned, stats: '' } });
  }

  const warnBuffer = 3 + (player.innovateProjectsCompleted || 0) * 2;
  if (player.dependability <= job.requirements.dependability - warnBuffer) {
    messages.unshift({ key: 'action.job.warning' });
  }
  if (totalGarnished > 0) {
    messages.push({ key: 'action.job.garnished', params: { amount: totalGarnished } });
  }

  return { updated, wagesEarned, success: true, messages };
}
