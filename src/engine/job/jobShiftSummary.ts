import type { PlayerState, GameRules } from '../gameState';
import type { JobDef } from '../dataLoader';
import type { StatRules } from '../rules';
import { roundToResolution } from '../statMath';
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
  getLookBusyPhysicalCostModifier,
  getJobPhysicalFatigueThreshold,
  getJobMentalMistakeThreshold
} from '../jobTags';
import type { 
  ShiftTier, 
  WorkShiftOption, 
  WorkShiftSummary, 
  ModifierBreakdownItem 
} from './jobTypes';
import { getJobInitiativeTier } from './jobInitiativeDeck';

export function calcWorkShiftSummary(
  player: PlayerState,
  job: JobDef,
  shiftCost: number = 6,
  rules?: GameRules | Partial<GameRules>,
  statRules?: StatRules
): WorkShiftSummary {
  const isAdvanced = !!rules?.usePhysicalMentalConditions;
  const actionCount = (player.workActionsThisTurn || 0) + 1;
  const overtimeThreshold = statRules?.workOvertimeThreshold ?? 8;
  const grindThreshold = statRules?.workGrindThreshold ?? 4;

  let basePhys = 1;
  let baseMental = 0;
  let tierLabel = '';

  const tier: ShiftTier = actionCount >= overtimeThreshold
    ? 'overtime'
    : (actionCount >= grindThreshold ? 'grind' : 'normal');

  if (isAdvanced) {
    if (actionCount >= overtimeThreshold) {
      basePhys = statRules?.workOvertimePhysicalCost ?? 2;
      baseMental = statRules?.workOvertimeMentalCost ?? 2;
      tierLabel = ' [Overtime]';
    } else if (actionCount >= grindThreshold) {
      basePhys = statRules?.workGrindPhysicalCost ?? 1;
      baseMental = statRules?.workGrindMentalCost ?? 1;
      tierLabel = ' [Grind]';
    } else {
      basePhys = statRules?.workPhysicalCost ?? 1;
      baseMental = statRules?.workNormalMentalCost ?? 0;
    }
  }

  const curPhys = player.physicalCondition ?? 50;
  const fatigueThreshold = getJobPhysicalFatigueThreshold(job);
  const fatigueMental = curPhys < fatigueThreshold ? 1.0 : 0.0;
  const halfFatigueMental = curPhys < fatigueThreshold ? 0.5 : 0.0;
  const faceTimeDep = 1 + Math.ceil((player.social || 1) / 25) / 2;

  const hoursToWork = player.hoursRemaining > 0 ? Math.min(shiftCost, player.hoursRemaining) : shiftCost;
  const workRatio = rules?.proportionalDivisibleActions && hoursToWork < shiftCost ? hoursToWork / shiftCost : 1.0;
  const conditionRes = rules?.conditionResolution ?? 0.5;

  const physTagMod = getJobPhysicalCostModifier(job);
  const lbPhysTagMod = getLookBusyPhysicalCostModifier(job);
  const physRes = (lbPhysTagMod % 0.5 !== 0 || physTagMod % 0.5 !== 0) ? Math.min(conditionRes, 0.25) : conditionRes;
  const mentalTagMod = getJobMentalCostModifier(job);
  const expMult = getJobExpMultiplier(job);
  const socialMod = getJobSocialModifier(job, actionCount);
  const isFTAllowed = isFaceTimeAllowed(job);
  const isLBAllowed = isLookBusyAllowed(job);
  const lbDepPenalty = getLookBusyDepPenalty(job);
  const lbSocialPenalty = getLookBusySocialPenalty(job);
  const lbSocialText = lbSocialPenalty > 0 ? `, -${lbSocialPenalty} 👥` : '';

  const workWorkDepGain = roundToResolution(1 * workRatio, 0.5);
  const workWorkExpGain = roundToResolution(1 * expMult * workRatio, 0.5);
  const socialGainText = socialMod > 0 ? `, +${socialMod} 👥` : (socialMod < 0 ? `, ${socialMod} 👥` : '');
  const useSkills = rules?.useSkills !== undefined ? rules.useSkills : isAdvanced;
  const isTech = useSkills && hasJobTag(job, 'technical');
  const isMiddleMgmt = useSkills && hasJobTag(job, 'middle_management');
  const isExecMgmt = useSkills && hasJobTag(job, 'executive_management');
  const isMgmt = isMiddleMgmt || isExecMgmt;

  const techGain = isTech ? roundToResolution(workWorkExpGain * 0.25, 0.05) : 0;
  const techGainText = techGain > 0 ? `, +${techGain.toFixed(2)} 🔧` : '';

  const mgmtGain = isMiddleMgmt ? roundToResolution(workWorkExpGain * 0.25, 0.05) : (isExecMgmt ? roundToResolution(workWorkExpGain * 0.50, 0.05) : 0);
  const mgmtGainText = mgmtGain > 0 ? `, +${mgmtGain.toFixed(2)} 👔` : '';

  const isOvertimeShift = actionCount >= overtimeThreshold;
  const isHeavyGrindShift = actionCount >= grindThreshold && hasJobTag(job, 'heavy_physical');
  const maxPhysDropText = isAdvanced && (isOvertimeShift || isHeavyGrindShift) ? ', -0.5 Max 💪' : '';

  const modes: WorkShiftOption[] = [
    {
      id: 'work_work',
      physCost: isAdvanced ? Math.max(0, roundToResolution((basePhys * 1.0 + physTagMod) * workRatio, physRes)) : 0,
      mentalCost: isAdvanced ? Math.max(0, roundToResolution((baseMental * 1.0 + mentalTagMod + fatigueMental) * workRatio, conditionRes)) : 0,
      wage: Math.floor((player.currentWage || job.baseWage) * 8 * (hoursToWork / shiftCost)),
      rewardDep: workWorkDepGain,
      rewardExp: workWorkExpGain,
      rewardSocial: socialMod,
      rewardText: `+${workWorkDepGain} 🤝, +${workWorkExpGain} 👌${socialGainText}${techGainText}${mgmtGainText}${maxPhysDropText}`,
      color: '#2ecc71',
      isDefault: true,
      disabled: false
    },
    {
      id: 'look_busy',
      physCost: isAdvanced ? Math.max(0, roundToResolution((basePhys * 0.5 + lbPhysTagMod) * workRatio, physRes)) : 0,
      mentalCost: isAdvanced ? Math.max(0, roundToResolution((baseMental * 0.5 + halfFatigueMental) * workRatio, conditionRes)) : 0,
      wage: Math.floor((player.currentWage || job.baseWage) * 8 * (hoursToWork / shiftCost)),
      rewardDep: lbDepPenalty > 0 ? -lbDepPenalty : 0,
      rewardExp: 0,
      rewardSocial: lbSocialPenalty > 0 ? -lbSocialPenalty : 0,
      rewardText: !isLBAllowed
        ? 'action.job.lookBusyDisabled'
        : (lbDepPenalty > 0 ? `-${lbDepPenalty} 🤝, +0 👌${lbSocialText}` : `+0 🤝, +0 👌${lbSocialText}`),
      color: '#3498db',
      isDefault: false,
      disabled: !isLBAllowed,
      disabledReasonKey: !isLBAllowed ? 'action.job.lookBusyDisabled' : undefined
    },
    {
      id: 'face_time',
      physCost: isAdvanced ? Math.max(0, roundToResolution(basePhys * 0.5 * workRatio, conditionRes)) : 0,
      mentalCost: isAdvanced ? Math.max(0, roundToResolution((baseMental * 1.0 + 2.0 + halfFatigueMental) * workRatio, conditionRes)) : 0,
      wage: 0,
      rewardDep: roundToResolution(faceTimeDep * workRatio, 0.5),
      rewardExp: 0,
      rewardSocial: 1,
      rewardText: !isFTAllowed
        ? 'action.job.faceTimeDisabled'
        : `+${roundToResolution(faceTimeDep * workRatio, 0.5)} 🤝, +👥${isMgmt ? ', +0.25 👔' : ''}`,
      color: '#9b59b6',
      isDefault: false,
      disabled: !isFTAllowed,
      disabledReasonKey: !isFTAllowed ? 'action.job.faceTimeDisabled' : undefined
    },
    {
      id: 'show_initiative',
      physCost: isAdvanced ? Math.max(0, roundToResolution(basePhys * 1.5 * workRatio, conditionRes)) : 0,
      mentalCost: isAdvanced ? Math.max(0, roundToResolution((baseMental * 1.5 + 2.0 + fatigueMental) * workRatio, conditionRes)) : 0,
      wage: Math.floor((player.currentWage || job.baseWage) * 8 * 0.4 * (hoursToWork / shiftCost)),
      rewardDep: isExecMgmt ? 2 : (isMiddleMgmt ? 1.5 : 1),
      rewardExp: 0,
      rewardSocial: 0,
      rewardText: (player.experience ?? 0) >= (job.requirements?.experience ?? 0) + 10
        ? `Draw ${getJobInitiativeTier(job) === 3 ? '3' : '2'} Initiative Cards (👔, 🔧, 🎓, 💵, 🧘)`
        : 'action.job.initiativeNeedExp',
      color: '#f59e0b',
      isDefault: false,
      disabled: (player.experience ?? 0) < (job.requirements?.experience ?? 0) + 10,
      disabledReasonKey: (player.experience ?? 0) < (job.requirements?.experience ?? 0) + 10 ? 'action.job.initiativeNeedExp' : undefined
    }
  ];

  // Softly disable modes that cost Social if player has insufficient Social
  const curSocial = player.social ?? 50;
  if (isAdvanced) {
    if (lbSocialPenalty > 0 && curSocial - lbSocialPenalty < 1) {
      const lbMode = modes.find(m => m.id === 'look_busy');
      if (lbMode) {
        lbMode.disabled = true;
        lbMode.disabledReasonKey = 'action.job.needMoreSocial';
      }
    }
    const wwSocialCost = socialMod < 0 ? -socialMod : 0;
    if (wwSocialCost > 0 && curSocial - wwSocialCost < 1) {
      const wwMode = modes.find(m => m.id === 'work_work');
      if (wwMode) {
        wwMode.disabled = true;
        wwMode.disabledReasonKey = 'action.job.needMoreSocial';
      }
    }
  }

  const physMistakeThreshold = hasJobTag(job, 'heavy_physical') ? 20 : 10;
  const mentalMistakeThreshold = getJobMentalMistakeThreshold(job);
  const mentalMultiplier = hasJobTag(job, 'heavy_physical') ? 0.5 : 1.0;
  const isFrontline = hasJobTag(job, 'frontline_service');
  const socialMistakeThreshold = isFrontline ? 20 : 10;
  const isExecJob = hasJobTag(job, 'executive_management');
  const curMental = player.mentalCondition ?? 50;

  for (const m of modes) {
    const physChance = (isAdvanced && m.physCost > 0 && curPhys < physMistakeThreshold)
      ? Math.min(1.0, Math.max(0, (physMistakeThreshold - curPhys) * 0.025))
      : 0;
    const mentalChance = (isAdvanced && (m.mentalCost > 0 || isExecJob) && curMental < mentalMistakeThreshold)
      ? Math.min(1.0, Math.max(0, (mentalMistakeThreshold - curMental) * 0.025 * mentalMultiplier))
      : 0;
    const modifiesSocial = isFrontline ||
                           (m.id === 'look_busy' && lbSocialPenalty > 0) ||
                           (m.id === 'work_work' && socialMod !== 0) ||
                           (m.id === 'face_time');
    const socialChance = (isAdvanced && modifiesSocial && curSocial < socialMistakeThreshold)
      ? Math.min(1.0, Math.max(0, (socialMistakeThreshold - curSocial) * 0.0125))
      : 0;

    m.physMistakeChance = physChance;
    m.mentalMistakeChance = mentalChance;
    m.socialMistakeChance = socialChance;
    m.totalMistakeChance = isAdvanced ? (1 - (1 - physChance) * (1 - mentalChance) * (1 - socialChance)) : 0;

    // Detailed modifier breakdown for '?' strategy & help display
    if (isAdvanced) {
      const physMods: ModifierBreakdownItem[] = [];
      const mentalMods: ModifierBreakdownItem[] = [];

      let modeBasePhys = basePhys;
      let modeBaseMental = baseMental;
      if (m.id === 'look_busy') {
        modeBasePhys = basePhys * 0.5;
        modeBaseMental = baseMental * 0.5;
      } else if (m.id === 'face_time') {
        modeBasePhys = basePhys * 0.5;
        modeBaseMental = baseMental * 1.0;
      } else if (m.id === 'show_initiative' || m.id === 'innovate') {
        modeBasePhys = basePhys * 1.5;
        modeBaseMental = baseMental * 1.5;
      }

      if (tier === 'overtime') {
        physMods.push({ label: `Overtime tier (shift #${actionCount} ≥ ${overtimeThreshold})`, amount: 1 });
      }

      if (m.id === 'work_work' && physTagMod !== 0) {
        physMods.push({ label: hasJobTag(job, 'heavy_physical') ? 'Heavy Physical job requirement' : 'Job physical modifier', amount: physTagMod });
      } else if (m.id === 'look_busy' && lbPhysTagMod !== 0) {
        physMods.push({ label: 'Job physical modifier', amount: lbPhysTagMod });
      }

      if (tier === 'grind') {
        mentalMods.push({ label: `Grind time (worked > ${grindThreshold - 1} shifts this turn)`, amount: modeBaseMental > 0 ? modeBaseMental : 1 });
      } else if (tier === 'overtime') {
        mentalMods.push({ label: `Overtime fatigue (worked ≥ ${overtimeThreshold} shifts this turn)`, amount: modeBaseMental > 0 ? modeBaseMental : 2 });
      }

      if (m.id === 'work_work' && mentalTagMod !== 0) {
        const isExec = hasJobTag(job, 'executive_management');
        const isMid = hasJobTag(job, 'middle_management');
        mentalMods.push({
          label: isExec ? 'Executive Management high accountability' : (isMid ? 'Middle Management oversight' : 'Job mental demand'),
          amount: mentalTagMod
        });
      }

      const modeFatigue = (m.id === 'look_busy' || m.id === 'face_time') ? halfFatigueMental : fatigueMental;
      if (modeFatigue > 0) {
        mentalMods.push({ label: 'Physical exhaustion carryover (Physical < 20)', amount: modeFatigue });
      }

      if (m.id === 'face_time') {
        mentalMods.push({ label: 'Networking social & mental burden', amount: 2.0 });
      } else if (m.id === 'show_initiative' || m.id === 'innovate') {
        mentalMods.push({ label: 'Leadership responsibility & problem solving', amount: 2.0 });
      }

      m.modifierBreakdown = {
        physicalBase: modeBasePhys,
        physicalModifiers: physMods,
        totalPhysicalCost: m.physCost,
        mentalBase: modeBaseMental,
        mentalModifiers: mentalMods,
        totalMentalCost: m.mentalCost,
        fatigueApplied: modeFatigue > 0,
        tier,
        actionCount,
        grindThreshold,
        overtimeThreshold
      };
    }
  }

  return {
    hoursToWork,
    shiftCost,
    workRatio,
    actionCount,
    grindThreshold,
    overtimeThreshold,
    tier,
    tierLabel,
    modes,
    innovationsCount: player.innovationCount || 0,
    locationMistakes: player.mistakesByLocation?.[job.locationId] || 0,
    locationInitiatives: player.initiativesByLocation?.[job.locationId] || 0,
    turnMistakes: player.workMistakesThisTurn || 0
  };
}
