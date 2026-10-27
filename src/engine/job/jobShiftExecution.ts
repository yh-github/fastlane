import { 
  type PlayerState, 
  type GameRules, 
  type GameEvent, 
  type MiniGameOption, 
  type MiniGameState, 
  markClothesWorn 
} from '../gameState';
import { spendHours } from '../timeManager';
import { processRentDebt } from '../economyEngine';
import { roundToResolution, calcMaxSkillCap } from '../statMath';
import type { JobDef, EducationDef, CampaignBundle } from '../dataLoader';
import type { Random } from '../../utils/rng';
import { resolveDecision, type ReplayContext } from '../replayTypes';
import { applyHappinessChange } from '../statEffects';
import { isBaseVersion, isAdvancedVersion, requireAdvancedStatRules, type StatRules } from '../rules';
import { generateInitiativeCards, getJobInitiativeTier } from './jobInitiativeDeck';
import {
  hasJobTag,
  getJobPhysicalCostModifier,
  getJobMentalCostModifier,
  isFaceTimeAllowed,
  isLookBusyAllowed,
  getLookBusyDepPenalty,
  getLookBusySocialPenalty,
  getJobExpMultiplier,
  getJobSocialModifier,
  getJobWorkMistakeSocialPenalty,
  getLookBusyPhysicalCostModifier,
  getJobPhysicalFatigueThreshold,
  getJobPhysicalMistakeThreshold,
  getJobPhysicalMistakeRate,
  getJobMentalMistakeThreshold,
  getJobMentalMistakeRate,
  getJobSocialMistakeThreshold,
  getJobSocialMistakeRate,
  getExecutiveMistakeExpMargin,
  getExecutiveMistakeRate,
  isManagementJob
} from '../jobTags';
import type { WorkMode, WorkResult } from './jobTypes';

function resolveActiveClothes(player: PlayerState): 'casual' | 'dress' | 'business' | 'none' {
  const hasCasual = player.inventory.casualClothesWeeks > 0;
  const hasDress = player.inventory.dressClothesWeeks > 0;
  const hasBusiness = player.inventory.businessClothesWeeks > 0;

  let activeClothes: 'casual' | 'dress' | 'business' | 'none' = player.inventory.selectedClothes as 'casual' | 'dress' | 'business' | 'none';

  if (activeClothes === 'business' && !hasBusiness) activeClothes = hasDress ? 'dress' : (hasCasual ? 'casual' : 'none');
  if (activeClothes === 'dress' && !hasDress) activeClothes = hasBusiness ? 'business' : (hasCasual ? 'casual' : 'none');
  if (activeClothes === 'casual' && !hasCasual) activeClothes = hasDress ? 'dress' : (hasBusiness ? 'business' : 'none');

  return activeClothes;
}

export function workShiftBase(
  player: PlayerState,
  job: JobDef,
  shiftCost: number,
  rules?: GameRules | Partial<GameRules>,
  statRules?: StatRules
): WorkResult {
  if (player.hoursRemaining <= 0 || player.currentJobId !== job.id) {
    return { updated: player, wagesEarned: 0, success: false, messages: [{ key: 'action.error.cannotWork' }] };
  }

  const effectiveDep = player.dependability;
  const fireBuffer = 5;
  if (effectiveDep <= job.requirements.dependability - fireBuffer) {
    const enableProbation = rules?.locationProbation ?? isAdvancedVersion(rules);
    let updated: PlayerState = {
      ...player,
      currentJobId: null,
      currentJobTier: undefined,
      currentWage: 0,
      raisesAtCurrentJob: 0,
      innovationCount: 0,
      depMaxBonus: 0,
      xpMaxBonus: 0,
      turnFlags: {
        ...player.turnFlags,
        ...(enableProbation ? {
          firedLocationsThisTurn: Array.from(new Set([...(player.turnFlags.firedLocationsThisTurn || []), job.locationId]))
        } : {})
      }
    };
    updated = applyHappinessChange(updated, -7, 'fired', rules as GameRules, statRules);
    return { updated, wagesEarned: 0, success: false, messages: [{ key: 'action.job.fired' }] };
  }

  const req = job.requirements.uniform;
  const activeClothes = resolveActiveClothes(player);

  if (activeClothes === 'none') {
    return { updated: player, wagesEarned: 0, success: false, messages: [{ key: 'action.job.needClothes', params: { req } }] };
  }

  const clothesScore = activeClothes === 'business' ? 3 : (activeClothes === 'dress' ? 2 : 1);
  const reqScore = req === 'business' ? 3 : (req === 'dress' ? 2 : 1);

  if (clothesScore < reqScore) {
    return { updated: player, wagesEarned: 0, success: false, messages: [{ key: 'action.job.needClothes', params: { req } }] };
  }

  const hoursToWork = Math.min(player.hoursRemaining, shiftCost);
  const ratio = hoursToWork / shiftCost;
  let updated = spendHours(player, hoursToWork);
  if (activeClothes) {
    updated = markClothesWorn(updated, activeClothes);
    if (updated.inventory) {
      updated.inventory.selectedClothes = activeClothes;
    }
  }

  const fullShiftWage = Math.floor(updated.currentWage * 8);
  const rawWagesEarned = Math.floor(fullShiftWage * ratio);

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
  updated.hasEarnedIncome = true;

  const messages: GameEvent[] = [];

  const effectiveMaxExp = 10 + job.requirements.experience + (updated.degreeExpBoost || 0);
  const effectiveMaxDep = 20 + job.requirements.dependability + (updated.degreeDepBoost || 0);

  const classicExpGain = (rules?.proportionalDivisibleActions && hoursToWork < shiftCost) ? roundToResolution(1 * ratio, 0.5) : 1;
  const classicDepGain = (rules?.proportionalDivisibleActions && hoursToWork < shiftCost) ? roundToResolution(1 * ratio, 0.5) : 1;

  if (updated.experience < effectiveMaxExp) {
    updated.experience = Math.min(effectiveMaxExp, roundToResolution(updated.experience + classicExpGain, 0.5));
  }
  if (updated.dependability < effectiveMaxDep) {
    updated.dependability = Math.min(effectiveMaxDep, roundToResolution(updated.dependability + classicDepGain, 0.5));
  }
  messages.unshift({ key: 'action.job.worked', params: { title: job.title, wagesEarned, stats: '' } });

  const warnBuffer = 3;
  if (effectiveDep <= job.requirements.dependability - warnBuffer) {
    messages.unshift({ key: 'action.job.warning' });
  }
  if (totalGarnished > 0) {
    messages.push({ key: 'action.job.garnished', params: { amount: totalGarnished } });
  }

  return { updated, wagesEarned, success: true, messages };
}

export function workShift(
  player: PlayerState,
  job: JobDef,
  shiftCost: number,
  rules?: GameRules | Partial<GameRules>,
  statRules?: StatRules,
  mode: WorkMode = 'work_work',
  rng?: Random,
  replay?: ReplayContext,
  campaignEducation?: EducationDef[],
  campaign?: CampaignBundle
): WorkResult {
  if (isBaseVersion(rules) && !rules?.usePhysicalMentalConditions && !rules?.useSkills) {
    return workShiftBase(player, job, shiftCost, rules, statRules);
  }

  if (player.hoursRemaining <= 0 || player.currentJobId !== job.id) {
    return { updated: player, wagesEarned: 0, success: false, messages: [{ key: 'action.error.cannotWork' }] };
  }
  
  const isAdvanced = isAdvancedVersion(rules) || Boolean(rules?.usePhysicalMentalConditions);
  const useConditions = Boolean(rules?.usePhysicalMentalConditions);
  const useSkills = Boolean(rules?.useSkills);
  const isTechnical = useSkills && hasJobTag(job, 'technical');
  const isManagement = useSkills && isManagementJob(job);
  const effectiveDep = player.dependability + (isTechnical ? (player.skillTech || 0) : 0) + (isManagement ? (player.skillMgmt || 0) : 0);
  
  // Dependability firing & warning checks
  const locMerits = (isAdvanced && job.locationId) ? (player.initiativesByLocation?.[job.locationId] || 0) : 0;
  const fireBuffer = 5 + (player.innovationCount || 0) + locMerits;
  if (effectiveDep <= job.requirements.dependability - fireBuffer) {
    let updated: PlayerState = {
      ...player,
      currentJobId: null,
      currentJobTier: undefined,
      currentWage: 0,
      raisesAtCurrentJob: 0,
      innovationCount: 0,
      depMaxBonus: 0,
      xpMaxBonus: 0,
      turnFlags: {
        ...player.turnFlags,
        ...((rules?.locationProbation ?? isAdvanced) ? {
          firedLocationsThisTurn: Array.from(new Set([...(player.turnFlags.firedLocationsThisTurn || []), job.locationId]))
        } : {})
      }
    };
    updated = applyHappinessChange(updated, -7, 'fired', rules as GameRules, statRules);
    return { updated, wagesEarned: 0, success: false, messages: [{ key: isAdvanced ? 'action.job.firedDepLow' : 'action.job.fired' }] };
  }

  const req = job.requirements.uniform;
  const activeClothes = resolveActiveClothes(player);

  if (activeClothes === 'none') {
    return { updated: player, wagesEarned: 0, success: false, messages: [{ key: 'action.job.needClothes', params: { req } }] };
  }

  const clothesScore = activeClothes === 'business' ? 3 : (activeClothes === 'dress' ? 2 : 1);
  const reqScore = req === 'business' ? 3 : (req === 'dress' ? 2 : 1);

  if (clothesScore < reqScore) {
    return { updated: player, wagesEarned: 0, success: false, messages: [{ key: 'action.job.needClothes', params: { req } }] };
  }

  const isInitiative = mode === 'show_initiative' || mode === 'innovate';
  if (isInitiative) {
    const reqExp = (job.requirements?.experience ?? 0) + 10;
    if ((player.experience ?? 0) < reqExp) {
      return { updated: player, wagesEarned: 0, success: false, messages: [{ key: 'action.job.initiativeNeedExp', params: { reqExp } }] };
    }
  }

  // Softly disable if player cannot pay Social cost
  let actionSocialCost = 0;
  if (mode === 'look_busy') {
    actionSocialCost = getLookBusySocialPenalty(job);
  } else if (mode === 'work_work') {
    const actionCount = (player.workActionsThisTurn || 0) + 1;
    const sMod = getJobSocialModifier(job, actionCount);
    if (sMod < 0) actionSocialCost = -sMod;
  }
  if (isAdvanced && actionSocialCost > 0 && (player.social ?? 50) - actionSocialCost < 1) {
    return { updated: player, wagesEarned: 0, success: false, messages: [{ key: 'action.job.needMoreSocial' }] };
  }

  if (mode === 'face_time' && !isFaceTimeAllowed(job)) {
    return { updated: player, wagesEarned: 0, success: false, messages: [{ key: 'action.job.faceTimeDisabled' }] };
  }

  if (mode === 'look_busy' && !isLookBusyAllowed(job)) {
    return { updated: player, wagesEarned: 0, success: false, messages: [{ key: 'action.job.lookBusyDisabled' }] };
  }

  let physicalCost = 0;
  let mentalCost = 0;
  let wageMultiplier = 1.0;
  let baseDepGain = 1;

  const advStatRules = requireAdvancedStatRules(statRules);

  if (useConditions) {
    const actionCount = (player.workActionsThisTurn || 0) + 1;
    const overtimeThreshold = advStatRules.workOvertimeThreshold;
    const grindThreshold = advStatRules.workGrindThreshold;

    let basePhys: number;
    let baseMental: number;

    if (actionCount >= overtimeThreshold) {
      basePhys = advStatRules.workOvertimePhysicalCost;
      baseMental = advStatRules.workOvertimeMentalCost;
    } else if (actionCount >= grindThreshold) {
      basePhys = advStatRules.workGrindPhysicalCost;
      baseMental = advStatRules.workGrindMentalCost;
    } else {
      basePhys = advStatRules.workPhysicalCost;
      baseMental = advStatRules.workNormalMentalCost;
    }

    if (mode === 'look_busy') {
      physicalCost = basePhys * 0.5 + getLookBusyPhysicalCostModifier(job);
      mentalCost = baseMental * 0.5;
      wageMultiplier = 1.0;
      baseDepGain = 0;
    } else if (mode === 'face_time') {
      physicalCost = basePhys * 0.5;
      mentalCost = baseMental * 1.0 + 2.0;
      wageMultiplier = 0.0;
      baseDepGain = 1 + Math.ceil((player.social || 1) / 25) / 2;
    } else if (isInitiative) {
      const isExecMgmt = hasJobTag(job, 'executive_management');
      const isMiddleMgmt = hasJobTag(job, 'middle_management');
      physicalCost = basePhys * 1.5;
      mentalCost = baseMental * 1.5 + 2.0;
      wageMultiplier = 0.4;
      baseDepGain = isExecMgmt ? 2.0 : (isMiddleMgmt ? 1.5 : 1.0);
    } else {
      // work_work
      physicalCost = basePhys * 1.0 + getJobPhysicalCostModifier(job);
      mentalCost = baseMental * 1.0 + getJobMentalCostModifier(job);
      wageMultiplier = 1.0;
      baseDepGain = 1;
    }

    // Fatigue: when Physical is below threshold, +1 Mental cost (or 0.5 if halved)
    const curPhys = player.physicalCondition ?? 50;
    const fatigueThreshold = getJobPhysicalFatigueThreshold(job);
    if (curPhys < fatigueThreshold) {
      const fatigueCost = (mode === 'look_busy' || mode === 'face_time') ? 0.5 : 1.0;
      mentalCost += fatigueCost;
    }

    const hoursToWork = Math.min(player.hoursRemaining, shiftCost);
    const ratio = hoursToWork / shiftCost;

    if (rules?.proportionalDivisibleActions && hoursToWork < shiftCost) {
      const conditionRes = rules.conditionResolution ?? 0.5;
      const physRes = (physicalCost % 0.5 !== 0) ? Math.min(conditionRes, 0.25) : conditionRes;
      physicalCost = Math.max(0, roundToResolution(physicalCost * ratio, physRes));
      mentalCost = Math.max(0, roundToResolution(mentalCost * ratio, conditionRes));
      baseDepGain = roundToResolution(baseDepGain * ratio, 0.5);
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
  const ratio = hoursToWork / shiftCost;
  let updated = spendHours(player, hoursToWork);
  if (activeClothes) {
    updated = markClothesWorn(updated, activeClothes);
    if (updated.inventory) {
      updated.inventory.selectedClothes = activeClothes;
    }
  }

  // Prorate wage: shiftCost hours = 8 hours of base wage (full shift)
  const fullShiftWage = Math.floor(updated.currentWage * 8 * wageMultiplier);
  const rawWagesEarned = Math.floor(fullShiftWage * ratio);

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
  updated.hasEarnedIncome = true;

  const messages: GameEvent[] = [];

  let maxPhysDrop = 0;
  const actionCount = (player.workActionsThisTurn || 0) + 1;
  updated.workActionsThisTurn = actionCount;
  const overtimeThreshold = advStatRules.workOvertimeThreshold;
  const grindThreshold = advStatRules.workGrindThreshold;

  const oldPhys = updated.physicalCondition ?? 50;
  const oldMental = updated.mentalCondition ?? 50;
  const oldSocial = updated.social ?? 50;

  if (useConditions) {
    updated.physicalCondition = oldPhys - physicalCost;
    updated.mentalCondition = oldMental - mentalCost;

    if (mentalCost >= advStatRules.resilienceDropThreshold) {
      updated.resilienceBonus = (updated.resilienceBonus || 0) + 1;
      updated.mentalConditionMax = Math.min(advStatRules.globalMaxMentalCondition, (updated.mentalConditionMax || 50) + 1);
    }

    if (mode === 'work_work' || isInitiative) {
      const isOvertime = actionCount >= overtimeThreshold;
      const isHeavyGrind = actionCount >= grindThreshold && hasJobTag(job, 'heavy_physical');
      if (isOvertime || isHeavyGrind) {
        const minMaxPhys = advStatRules.minMaxPhysical;
        const curMaxPhys = updated.physicalConditionMax ?? advStatRules.initialPhysicalMax;
        const newMaxPhys = Math.max(minMaxPhys, roundToResolution(curMaxPhys - 0.5, 0.5));
        if (newMaxPhys < curMaxPhys) {
          maxPhysDrop = roundToResolution(curMaxPhys - newMaxPhys, 0.5);
          updated.physicalConditionMax = newMaxPhys;
          updated.physicalCondition = Math.min(updated.physicalConditionMax, updated.physicalCondition);
        }
      }
    }
  }

  const lookBusySocPenalty = mode === 'look_busy' ? getLookBusySocialPenalty(job) : 0;
  if (mode === 'look_busy') {
    const lookBusyDepPenalty = getLookBusyDepPenalty(job);
    if (lookBusyDepPenalty > 0) {
      updated.dependability = Math.max(0, updated.dependability - lookBusyDepPenalty);
    }
    if (lookBusySocPenalty > 0) {
      updated.social = Math.max(1, (updated.social || 1) - lookBusySocPenalty);
    }
  }

  // Mistake resolution
  let physMistake = false;
  let mentalMistake = false;
  let socialMistake = false;
  let execMistake = false;

  if (useConditions) {
    const physMistakeThreshold = getJobPhysicalMistakeThreshold(job, statRules);
    const physMistakeRate = getJobPhysicalMistakeRate(statRules);
    if (physicalCost > 0 && oldPhys < physMistakeThreshold) {
      const physChance = (physMistakeThreshold - oldPhys) * physMistakeRate;
      physMistake = resolveDecision(replay, `work_phys_mistake_${player.id}_${actionCount}`, () => (rng ? rng.next() : Math.random()) < physChance);
    }

    const mentalMistakeThreshold = getJobMentalMistakeThreshold(job, statRules);
    const mentalMistakeRate = getJobMentalMistakeRate(statRules);
    const isExecMgmt = hasJobTag(job, 'executive_management');
    if ((mentalCost > 0 || isExecMgmt) && oldMental < mentalMistakeThreshold) {
      const mentalMultiplier = hasJobTag(job, 'heavy_physical') ? 0.5 : 1.0;
      const mentalChance = (mentalMistakeThreshold - oldMental) * mentalMistakeRate * mentalMultiplier;
      mentalMistake = resolveDecision(replay, `work_mental_mistake_${player.id}_${actionCount}`, () => (rng ? rng.next() : Math.random()) < mentalChance);
    }
  }

  const isExecMgmt = hasJobTag(job, 'executive_management');
  // Executive management base mistake risk based on experience margin: max(0, margin - (Exp - Exp_req)) * rate
  if (isAdvanced && isExecMgmt) {
    const expMargin = (updated.experience || 0) - (job.requirements?.experience || 0);
    const execExpMargin = getExecutiveMistakeExpMargin(statRules);
    const execExpRate = getExecutiveMistakeRate(statRules);
    const execMistakeChance = Math.max(0, execExpMargin - expMargin) * execExpRate;
    if (execMistakeChance > 0) {
      execMistake = resolveDecision(
        replay,
        `work_exec_mistake_${player.id}_${actionCount}`,
        () => (rng ? rng.next() : Math.random()) < execMistakeChance
      );
    }
  }

  const isFrontline = hasJobTag(job, 'frontline_service');
  const modifiesSocial = isFrontline ||
                         (mode === 'look_busy' && lookBusySocPenalty > 0) ||
                         (mode === 'work_work' && getJobSocialModifier(job, actionCount) !== 0) ||
                         (mode === 'face_time');
  const socialMistakeThreshold = getJobSocialMistakeThreshold(job, statRules);
  const socialMistakeRate = getJobSocialMistakeRate(statRules);
  if (isAdvanced && modifiesSocial && oldSocial < socialMistakeThreshold) {
    const socialChance = (socialMistakeThreshold - oldSocial) * socialMistakeRate;
    socialMistake = resolveDecision(replay, `work_social_mistake_${player.id}_${actionCount}`, () => (rng ? rng.next() : Math.random()) < socialChance);
  }

  if (physMistake || mentalMistake || socialMistake || execMistake) {
    const curMistakes = updated.mistakesByLocation?.[job.locationId] || 0;
    let mistakesAdded = 0;
    if (physMistake) {
      mistakesAdded++;
      updated.physicalConditionMax = Math.max(1, (updated.physicalConditionMax ?? 50) - 1);
      updated.physicalCondition = Math.min(updated.physicalConditionMax, updated.physicalCondition ?? 50);
    }
    if (mentalMistake) {
      mistakesAdded++;
      updated.resilienceBonus = (updated.resilienceBonus || 0) - 1;
      updated.mentalConditionMax = Math.max(1, (updated.mentalConditionMax ?? 50) - 1);
      updated.mentalCondition = Math.min(updated.mentalConditionMax, updated.mentalCondition ?? 50);
    }
    if (socialMistake) {
      mistakesAdded++;
      updated.social = Math.max(1, (updated.social || 1) - 1);
      messages.push({ key: 'action.job.socialMistake' });
    }
    if (execMistake && !mentalMistake) {
      mistakesAdded++;
      updated.resilienceBonus = (updated.resilienceBonus || 0) - 1;
      updated.mentalConditionMax = Math.max(1, (updated.mentalConditionMax ?? 50) - 1);
      updated.mentalCondition = Math.min(updated.mentalConditionMax, updated.mentalCondition ?? 50);
      messages.push({ key: 'action.job.executiveMistake' });
    }

    // Penalty = NUM_OF_MISTAKES (current counter before adding this turn's mistakes)
    updated.dependability = Math.max(0, updated.dependability - curMistakes);
    const extraSocialPenalty = getJobWorkMistakeSocialPenalty(job);
    if (extraSocialPenalty > 0) {
      updated.social = Math.max(1, (updated.social || 1) - extraSocialPenalty);
    }

    updated.mistakesByLocation = {
      ...(updated.mistakesByLocation || {}),
      [job.locationId]: curMistakes + mistakesAdded
    };

    const currentTurnMistakes = (updated.workMistakesThisTurn || updated.turnFlags?.workMistakesThisTurn || 0) + mistakesAdded;
    updated.workMistakesThisTurn = currentTurnMistakes;
    if (updated.turnFlags) {
      updated.turnFlags.workMistakesThisTurn = currentTurnMistakes;
    }

    const mistakeTypes = [
      physMistake ? 'Physical' : null,
      mentalMistake ? 'Mental' : null,
      socialMistake ? 'Social' : null,
      execMistake ? 'Executive' : null
    ].filter(Boolean).join(' & ');
    messages.push({ key: 'action.job.mistake', params: { type: mistakeTypes, penalty: curMistakes, total: curMistakes + mistakesAdded } });

    const mistakeTerminationThreshold = 3 + locMerits;
    if (currentTurnMistakes >= mistakeTerminationThreshold) {
      // Gross Negligence: Immediate Termination
      updated.currentJobId = null;
      updated.currentJobTier = undefined;
      updated.currentWage = 0;
      updated.raisesAtCurrentJob = 0;
      updated.innovationCount = 0;
      updated.depMaxBonus = 0;
      updated.xpMaxBonus = 0;
      updated.dependability = Math.max(0, updated.dependability - 5);
      updated = applyHappinessChange(updated, -7, 'fired', rules as GameRules, statRules);
      updated.turnFlags = {
        ...updated.turnFlags,
        ...((rules?.locationProbation ?? isAdvanced) ? {
          firedLocationsThisTurn: Array.from(new Set([...(updated.turnFlags.firedLocationsThisTurn || []), job.locationId]))
        } : {})
      };
      messages.push({ key: 'action.job.firedMistakes', params: { title: job.title, count: currentTurnMistakes } });
    }
  } else {
    const effectiveMaxDep = 20 + job.requirements.dependability + (updated.degreeDepBoost || 0) + (updated.depMaxBonus || 0);

    if (isInitiative) {
      // NOTE: show_initiative does NOT clear demerits (demerits cleared defensively by face_time)
      const isMiddleMgmt = hasJobTag(job, 'middle_management');
      const tier = getJobInitiativeTier(job);
      const rawStandingGain = isExecMgmt ? 2 : 1;
      const curStanding = updated.initiativesByLocation?.[job.locationId] || 0;
      const standingGain = Math.max(0, Math.min(rawStandingGain, tier - curStanding));
      const depGain = isExecMgmt ? 2.0 : (isMiddleMgmt ? 1.5 : (baseDepGain > 0 ? baseDepGain : 1.0));

      // Base location initiative tracking (capped at job tier max)
      if (standingGain > 0) {
        updated.initiativesByLocation = {
          ...(updated.initiativesByLocation || {}),
          [job.locationId]: curStanding + standingGain
        };
      }

      // Advance baseline dependability
      if (depGain > 0 && updated.dependability < effectiveMaxDep) {
        updated.dependability = Math.min(effectiveMaxDep, roundToResolution(updated.dependability + depGain, 0.5));
      }

      if (useSkills) {
        const mgmtGain = isExecMgmt ? 1.0 : (isMiddleMgmt ? 0.5 : 0.25);
        const maxMgmt = calcMaxSkillCap(updated, 'skillMgmt', campaignEducation, advStatRules, rules as GameRules);
        updated.skillMgmt = Math.min(maxMgmt, roundToResolution((updated.skillMgmt || 0) + mgmtGain, 0.05));

        if (hasJobTag(job, 'technical')) {
          const maxTech = calcMaxSkillCap(updated, 'skillTech', campaignEducation, advStatRules, rules as GameRules);
          updated.skillTech = Math.min(maxTech, roundToResolution((updated.skillTech || 0) + 0.25, 0.05));
        }
      }

      // Generate dynamic initiative cards
      const initiativeCards = generateInitiativeCards(
        updated,
        job,
        campaign,
        rng,
        replay,
        actionCount
      );

      if (updated.isAi) {
        // AI evaluates and automatically resolves the best initiative option
        let chosen = initiativeCards[0];
        if ((updated.mentalCondition ?? 50) < 15) {
          const ethics = initiativeCards.find(c => (c.mentalAmount || 0) > 0);
          if (ethics) chosen = ethics;
        } else if (updated.money < 30) {
          const bounty = initiativeCards.find(c => (c.cashAmount || 0) > 0);
          if (bounty) chosen = bounty;
        } else {
          const skillCard = initiativeCards.find(c => (c.leadershipSkillAmount || 0) > 0 || (c.techSkillAmount || 0) > 0);
          if (skillCard) chosen = skillCard;
        }

        if (chosen.cashAmount) updated.money += chosen.cashAmount;
        if (chosen.cashCost) updated.money = Math.max(0, updated.money - chosen.cashCost);
        if (chosen.depAmount) updated.dependability = Math.min(effectiveMaxDep, (updated.dependability || 0) + chosen.depAmount);
        if (chosen.expAmount) updated.experience = Math.min(100, (updated.experience || 0) + chosen.expAmount);
        if (chosen.leadershipSkillAmount && useSkills) {
          const maxMgmt = calcMaxSkillCap(updated, 'skillMgmt', campaignEducation, advStatRules, rules as GameRules);
          const newLead = Math.min(maxMgmt, roundToResolution((updated.skillMgmt || 0) + chosen.leadershipSkillAmount, 0.05));
          updated.skillMgmt = newLead;
          updated.skillLeadership = newLead;
        }
        if (chosen.techSkillAmount && useSkills) {
          const maxTech = calcMaxSkillCap(updated, 'skillTech', campaignEducation, advStatRules, rules as GameRules);
          updated.skillTech = Math.min(maxTech, roundToResolution((updated.skillTech || 0) + chosen.techSkillAmount, 0.05));
        }
        if (chosen.standingAmount) {
          const curStanding = updated.initiativesByLocation?.[job.locationId] || 0;
          const allowedGain = Math.max(0, Math.min(chosen.standingAmount, tier - curStanding));
          if (allowedGain > 0) {
            updated.initiativesByLocation = {
              ...(updated.initiativesByLocation || {}),
              [job.locationId]: curStanding + allowedGain
            };
          }
        }
        if (chosen.mentalAmount && useConditions) {
          const maxMental = updated.mentalConditionMax ?? 50;
          updated.mentalCondition = Math.max(1, Math.min(maxMental, (updated.mentalCondition ?? 50) + chosen.mentalAmount));
        }
        if (chosen.socialAmount) {
          updated.social = Math.max(1, Math.min(99, (updated.social ?? 50) + chosen.socialAmount));
        }
        if (chosen.physicalAmount && useConditions) {
          const maxPhys = updated.physicalConditionMax ?? 50;
          updated.physicalCondition = Math.max(1, Math.min(maxPhys, (updated.physicalCondition ?? 50) + chosen.physicalAmount));
        }

        updated.pendingMiniGame = null;
        updated.pendingAppraisalDilemma = null;
        messages.push({ key: 'action.job.initiativeSuccess', params: { skillMgmt: updated.skillMgmt ?? 0, title: chosen.title } });
      } else {
        const tier = getJobInitiativeTier(job);
        const miniGameState: MiniGameState = {
          gameType: 'work_initiative',
          title: 'Workplace Initiative',
          subtitle: `${job.title} — Initiative Tier ${tier}`,
          tier,
          options: initiativeCards
        };
        updated.pendingMiniGame = miniGameState;
        updated.pendingAppraisalDilemma = miniGameState;
        messages.push({ key: 'action.job.initiativeCardsDrawn', params: { count: initiativeCards.length } });
      }
    } else {
      // Normal stat growth for other modes
      if (baseDepGain > 0 && updated.dependability < effectiveMaxDep) {
        updated.dependability = Math.min(effectiveMaxDep, roundToResolution(updated.dependability + baseDepGain, 0.5));
      }
    }
  }

  if (mode === 'work_work' && !physMistake && !mentalMistake && !socialMistake && !execMistake) {
    const effectiveMaxExp = 10 + job.requirements.experience + (updated.degreeExpBoost || 0) + (updated.xpMaxBonus || 0);
    const expMult = getJobExpMultiplier(job);
    const expGain = roundToResolution(((rules?.proportionalDivisibleActions && hoursToWork < shiftCost) ? 1 * ratio : 1) * expMult, 0.5);
    if (updated.experience < effectiveMaxExp) {
      updated.experience = Math.min(effectiveMaxExp, roundToResolution(updated.experience + expGain, 0.5));
    }

    if (useSkills && hasJobTag(job, 'technical')) {
      const techGain = roundToResolution(expGain * 0.10, 0.05);
      if (techGain > 0) {
        const maxTech = calcMaxSkillCap(updated, 'skillTech', campaignEducation, advStatRules, rules as GameRules);
        updated.skillTech = Math.min(maxTech, roundToResolution((updated.skillTech || 0) + techGain, 0.05));
      }
    }

    if (useSkills && hasJobTag(job, 'middle_management')) {
      const mgmtGain = roundToResolution(expGain * 0.05, 0.05);
      if (mgmtGain > 0) {
        const maxMgmt = calcMaxSkillCap(updated, 'skillMgmt', campaignEducation, advStatRules, rules as GameRules);
        updated.skillMgmt = Math.min(maxMgmt, roundToResolution((updated.skillMgmt || 0) + mgmtGain, 0.05));
      }
    } else if (useSkills && hasJobTag(job, 'executive_management')) {
      const mgmtGain = roundToResolution(expGain * 0.10, 0.05);
      if (mgmtGain > 0) {
        const maxMgmt = calcMaxSkillCap(updated, 'skillMgmt', campaignEducation, advStatRules, rules as GameRules);
        updated.skillMgmt = Math.min(maxMgmt, roundToResolution((updated.skillMgmt || 0) + mgmtGain, 0.05));
      }
    }

    const socialMod = getJobSocialModifier(job, actionCount);
    if (socialMod !== 0) {
      updated.social = Math.max(1, Math.min(99, (updated.social || 1) + socialMod));
    }
  }

  let socialGain = 0;
  if (mode === 'face_time' && !physMistake && !mentalMistake && !socialMistake && !execMistake) {
    // Clear 1 location mistake if any exist (Face Time defensive benefit)
    const curLocMistakes = updated.mistakesByLocation?.[job.locationId] || 0;
    if (curLocMistakes > 0) {
      updated.mistakesByLocation = {
        ...(updated.mistakesByLocation || {}),
        [job.locationId]: Math.max(0, curLocMistakes - 1)
      };
      messages.push({ key: 'action.job.faceTimeClearedMistake' });
    }

    if (useSkills && isManagementJob(job)) {
      const maxMgmt = calcMaxSkillCap(updated, 'skillMgmt', campaignEducation, advStatRules, rules as GameRules);
      updated.skillMgmt = Math.min(maxMgmt, roundToResolution((updated.skillMgmt || 0) + 0.15, 0.05));
    }
    const curSoc = player.social || 1;
    const socChance = Math.max(0, ((100 - curSoc) / 100) * ratio);
    const isSocSuccess = resolveDecision(replay, `work_facetime_social_${player.id}_${actionCount}`, () => (rng ? rng.next() : Math.random()) < socChance);
    if (isSocSuccess) {
      socialGain = 1;
      updated.social = Math.min(99, curSoc + 1);
    }
  }

  if (isAdvanced && mode !== 'look_busy' && (job.id === 'pawn_appraiser' || job.id === 'pawn_horologist') && !updated.pendingMiniGame && !updated.pendingAppraisalDilemma) {
    const dilemmaRoll = resolveDecision(replay, `appraisal_dilemma_${player.id}_${actionCount}`, () => (rng ? rng.next() : Math.random()));
    if (dilemmaRoll < 0.15) {
      const isHorologist = job.id === 'pawn_horologist';
      const horologistItems = [
        'Antique German Cuckoo Clock',
        'Swiss Tourbillon Pocket Watch',
        'Brass Marine Chronometer',
        'Victorian Pendulum Mantle Clock',
        'Vintage Aviation Stopwatch'
      ];
      const appraiserItems = [
        'Tarnished Antique Pocketwatch',
        'Mid-Century Transistor Radio',
        'Art Deco Silver Letter Opener',
        'Victorian Cameo Brooch',
        'Box of Salvaged Radio Parts'
      ];
      const itemPool = isHorologist ? horologistItems : appraiserItems;
      const titleRoll = resolveDecision(replay, `dilemma_title_${player.id}_${actionCount}`, () => (rng ? rng.next() : Math.random()));
      const itemTitle = itemPool[Math.floor(titleRoll * itemPool.length)] || itemPool[0];

      const cashAmount = 18 + Math.floor(resolveDecision(replay, `appraisal_cash_${player.id}_${actionCount}`, () => (rng ? rng.next() : Math.random())) * 15);

      let candidateOptions: MiniGameOption[] = [
        {
          type: 'cash',
          title: isHorologist ? 'Quick Escapement Adjustment' : 'Fast Cash Commission',
          description: isHorologist ? 'Clean the escapement and gears for an immediate cash tip from the customer.' : 'Broker a quick sale for the shop and pocket an immediate commission.',
          cashAmount
        },
        {
          type: 'standing',
          title: isHorologist ? 'Master Horology Certification' : 'Boss Appreciation & Integrity',
          description: isHorologist ? 'Carefully log and authenticate the timepiece for the shop registry.' : 'Authenticate the piece for the shop record to boost your workplace standing.',
          depAmount: 2,
          mentalAmount: 1
        },
        {
          type: 'item',
          title: isHorologist ? 'Salvage Precision Gears' : 'Salvage Spare Components',
          description: 'Customer abandons broken donor components. Keep them as spare repair parts!',
          itemType: 'spare_parts'
        },
        {
          type: 'item',
          title: isHorologist ? 'Vintage Horological Curio' : 'Side Deal Curio for Yourself',
          description: 'Customer parts with the piece for pocket change. Take it home for your shelf display!',
          itemType: 'knick_knack'
        },
        ...(useSkills ? [{
          type: 'skill' as const,
          title: isHorologist ? 'Study Mechanical Escapement' : 'Deep Technical Appraisal',
          description: 'Disassemble and study the mechanism up-close to hone your technical skills.',
          techSkillAmount: 0.25,
          mentalAmount: 2
        }] : [])
      ];

      const maxTech = useSkills ? calcMaxSkillCap(updated, 'skillTech', campaignEducation, advStatRules, rules as GameRules) : 0;
      if (!useSkills || (updated.skillTech || 0) >= maxTech) {
        candidateOptions = candidateOptions.filter(o => o.type !== 'skill');
      }

      // Pick distinct choices: 2 for appraiser, 3 for horologist
      const roll1 = resolveDecision(replay, `dilemma_opt1_${player.id}_${actionCount}`, () => (rng ? rng.next() : Math.random()));
      const idx1 = Math.floor(roll1 * candidateOptions.length);
      const roll2 = resolveDecision(replay, `dilemma_opt2_${player.id}_${actionCount}`, () => (rng ? rng.next() : Math.random()));
      let idx2 = Math.floor(roll2 * (candidateOptions.length - 1));
      if (idx2 >= idx1) idx2++;

      const chosenOptions = [candidateOptions[idx1], candidateOptions[idx2]];

      if (isHorologist && candidateOptions.length > 2) {
        const roll3 = resolveDecision(replay, `dilemma_opt3_${player.id}_${actionCount}`, () => (rng ? rng.next() : Math.random()));
        const availableIndices = candidateOptions.map((_, i) => i).filter(i => i !== idx1 && i !== idx2);
        const idx3 = availableIndices[Math.floor(roll3 * availableIndices.length)];
        chosenOptions.push(candidateOptions[idx3]);
      }

      if (updated.isAi) {
        const cashOpt = chosenOptions.find(o => o.type === 'cash');
        if (cashOpt?.cashAmount) {
          updated.money += cashOpt.cashAmount;
          messages.push({ key: 'action.job.appraisalCommissionAi', params: { amount: cashOpt.cashAmount } });
        } else if (chosenOptions[0].type === 'standing') {
          updated.dependability = Math.min(100, (updated.dependability || 0) + (chosenOptions[0].depAmount || 2));
        } else if (chosenOptions[0].type === 'item') {
          if (chosenOptions[0].itemType === 'spare_parts') {
            updated.inventory.spareParts = (updated.inventory.spareParts || 0) + 1;
          } else {
            updated.inventory.knickKnacks = (updated.inventory.knickKnacks || 0) + 1;
          }
        } else if (chosenOptions[0].type === 'skill' && useSkills) {
          updated.skillTech = Math.min(maxTech, (updated.skillTech || 0) + (chosenOptions[0].techSkillAmount || 0.25));
        }
        updated.pendingMiniGame = null;
        updated.pendingAppraisalDilemma = null;
      } else {
        const miniGameState: MiniGameState = {
          gameType: 'appraisal_dilemma',
          itemTitle,
          options: chosenOptions
        };
        updated.pendingMiniGame = miniGameState;
        updated.pendingAppraisalDilemma = miniGameState;
        messages.push({ key: 'action.job.appraisalDilemmaTriggered' });
      }
    }
  }

  const statCosts: string[] = [];
  if (physicalCost > 0) statCosts.push(`-${physicalCost} Physical`);
  if (maxPhysDrop > 0) statCosts.push(`-${maxPhysDrop} Max Physical`);
  if (mentalCost > 0) statCosts.push(`-${mentalCost} Mental`);
  if (socialGain > 0) statCosts.push(`+${socialGain} Social`);
  const statsStr = statCosts.length > 0 ? ` (${statCosts.join(', ')})` : '';
  messages.unshift({ key: 'action.job.worked', params: { title: job.title, wagesEarned, stats: statsStr } });

  const warnBuffer = 3 + (player.innovationCount || 0) + locMerits;
  if (effectiveDep <= job.requirements.dependability - warnBuffer) {
    messages.unshift({ key: 'action.job.warning' });
  }
  if (totalGarnished > 0) {
    messages.push({ key: 'action.job.garnished', params: { amount: totalGarnished } });
  }

  return { updated, wagesEarned, success: true, messages };
}
