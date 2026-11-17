import type { PlayerState, GameRules } from '../gameState';
import type { JobDef, EducationDef, CampaignBundle } from '../dataLoader';
import { isAdvancedVersion, isAdvancedStatRules, requireAdvancedStatRules, type StatRules, type AdvancedStatRules } from '../rules';
import { roundToResolution, calcMaxSkillCap, formatHours, calcCaffeineBuffer } from '../statMath';
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
  getFrontlineSocialGainChance,
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
  getNewJobMistakeChance,
  getInitiativeExecutionMistakeChance,
  getInitiativeRushedMistakeChance,
  isJobSoulCrushingAtCap
} from '../jobTags';
import type { 
  ShiftTier, 
  WorkShiftOption, 
  WorkShiftSummary, 
  ModifierBreakdownItem,
  MistakeBreakdownItem,
  WorkShiftModifierBadge
} from './jobTypes';
import { getJobInitiativeTier } from './jobInitiativeDeck';

export function calcWorkShiftSummary(
  player: PlayerState,
  job: JobDef,
  shiftCost: number = 6,
  rules?: GameRules | Partial<GameRules>,
  statRules?: StatRules,
  campaignEducation?: EducationDef[],
  campaign?: CampaignBundle,
  isBusyLocation: boolean = false
): WorkShiftSummary {
  const isAdvanced = isAdvancedVersion(rules) || Boolean(rules?.usePhysicalMentalConditions);
  const useConditions = Boolean(rules?.usePhysicalMentalConditions);
  const useSkills = Boolean(rules?.useSkills);
  const actionCount = (player.workActionsThisTurn || 0) + 1;
  const advStatRules = isAdvanced && statRules ? requireAdvancedStatRules(statRules) : undefined;
  const overtimeThreshold = advStatRules ? advStatRules.workOvertimeThreshold : 8;
  const grindThreshold = advStatRules ? advStatRules.workGrindThreshold : 4;

  let basePhys = 1;
  let baseMental = 0;
  let tierLabel = '';

  const tier: ShiftTier = actionCount >= overtimeThreshold
    ? 'overtime'
    : (actionCount >= grindThreshold ? 'grind' : 'normal');

  if (useConditions) {
    const reqStatRules = requireAdvancedStatRules(statRules);
    if (actionCount >= overtimeThreshold) {
      basePhys = reqStatRules.workOvertimePhysicalCost;
      baseMental = reqStatRules.workOvertimeMentalCost;
      tierLabel = ' [Overtime]';
    } else if (actionCount >= grindThreshold) {
      basePhys = reqStatRules.workGrindPhysicalCost;
      baseMental = reqStatRules.workGrindMentalCost;
      tierLabel = ' [Grind]';
    } else {
      basePhys = reqStatRules.workPhysicalCost;
      baseMental = reqStatRules.workNormalMentalCost;
    }
  }

  const curPhys = player.physicalCondition ?? 50;
  const curMental = player.mentalCondition ?? 50;
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
  const socialMod = getJobSocialModifier(job, actionCount, rules, overtimeThreshold);
  const frontlineSocialChance = getFrontlineSocialGainChance(job, actionCount, player.social || 1, workRatio, rules, overtimeThreshold);
  const isFTAllowed = isFaceTimeAllowed(job);
  const isLBDisabledByBusyWeek = Boolean(rules?.enableBusyWeeks && isBusyLocation);
  const isLBAllowed = isLookBusyAllowed(job) && !isLBDisabledByBusyWeek;
  const lbDisabledReasonKey = isLBDisabledByBusyWeek
    ? 'action.job.lookBusyDisabledBusyWeek'
    : (!isLBAllowed ? 'action.job.lookBusyDisabled' : undefined);
  const lbDepPenalty = getLookBusyDepPenalty(job);
  const lbSocialPenalty = getLookBusySocialPenalty(job);
  const lbSocialText = lbSocialPenalty > 0 ? `, -${lbSocialPenalty} 👥` : '';

  const workWorkDepGain = roundToResolution(1 * workRatio, 0.5);
  const workWorkExpGain = roundToResolution(1 * expMult * workRatio, 0.5);
  const socialGainText = socialMod > 0
    ? `, +${socialMod} 👥`
    : (socialMod < 0
        ? `, ${socialMod} 👥`
        : (frontlineSocialChance > 0 ? `, ~${Math.round(frontlineSocialChance * 100)}% 👥` : ''));
  const isTech = useSkills && hasJobTag(job, 'technical');
  const isMiddleMgmt = useSkills && hasJobTag(job, 'middle_management');
  const isExecMgmt = useSkills && hasJobTag(job, 'executive_management');
  const isMgmt = isMiddleMgmt || isExecMgmt;

  const techGain = isTech ? roundToResolution(workWorkExpGain * 0.10, 0.05) : 0;
  const techGainText = techGain > 0 ? `, +${techGain.toFixed(2)} 🔧` : '';

  const mgmtGain = isMiddleMgmt ? roundToResolution(workWorkExpGain * 0.05, 0.05) : (isExecMgmt ? roundToResolution(workWorkExpGain * 0.10, 0.05) : 0);
  const mgmtGainText = mgmtGain > 0 ? `, +${mgmtGain.toFixed(2)} 👔` : '';

  const isOvertimeShift = actionCount >= overtimeThreshold;
  const isHeavyGrindShift = actionCount >= grindThreshold && hasJobTag(job, 'heavy_physical');
  const maxPhysDropText = useConditions && (isOvertimeShift || isHeavyGrindShift) ? ', -0.5 Max 💪' : '';
  const maxMentalDropText = '';

  const isSkillTechCappedSummary = Boolean(
    useConditions &&
    useSkills &&
    advStatRules &&
    hasJobTag(job, 'technical') &&
    (player.skillTech || 0) >= calcMaxSkillCap(player, 'skillTech', campaignEducation, advStatRules, rules as GameRules)
  );
  const soulCrushingPenalty = isJobSoulCrushingAtCap(
    job,
    player.experience ?? 0,
    player.degreeExpBoost || 0,
    player.xpMaxBonus || 0,
    isSkillTechCappedSummary,
    rules
  )
    ? (rules?.proportionalDivisibleActions && hoursToWork < shiftCost
        ? Math.max(0.5, roundToResolution(1 * workRatio, conditionRes))
        : 1)
    : 0;

  const effectiveHourlyWage = player.currentWage || job.baseWage;
  const busyWageMultiplier = (rules?.enableBusyWeeks && isBusyLocation) ? 1.15 : 1.0;

  const modes: WorkShiftOption[] = [
    {
      id: 'work_work',
      physCost: isAdvanced ? Math.max(0, roundToResolution((basePhys * 1.0 + physTagMod) * workRatio, physRes)) : 0,
      mentalCost: isAdvanced ? Math.max(0, roundToResolution((baseMental * 1.0 + mentalTagMod + fatigueMental) * workRatio, conditionRes) + soulCrushingPenalty) : 0,
      soulCrushingPenalty,
      wage: Math.floor(Math.floor(effectiveHourlyWage * 8 * 1.0 * busyWageMultiplier) * (hoursToWork / shiftCost)),
      rewardDep: workWorkDepGain,
      rewardExp: workWorkExpGain,
      rewardSocial: socialMod,
      rewardText: `+${workWorkDepGain} 🤝, +${workWorkExpGain} 👌${socialGainText}${techGainText}${mgmtGainText}${maxPhysDropText}${maxMentalDropText}`,
      color: '#2ecc71',
      isDefault: true,
      disabled: false
    },
    {
      id: 'look_busy',
      physCost: isAdvanced ? Math.max(0, roundToResolution((basePhys * 0.5 + lbPhysTagMod) * workRatio, physRes)) : 0,
      mentalCost: isAdvanced ? Math.max(0, roundToResolution((baseMental * 0.5 + halfFatigueMental) * workRatio, conditionRes) + soulCrushingPenalty) : 0,
      soulCrushingPenalty,
      wage: Math.floor(Math.floor(effectiveHourlyWage * 8 * 1.0 * busyWageMultiplier) * (hoursToWork / shiftCost)),
      rewardDep: lbDepPenalty > 0 ? -lbDepPenalty : 0,
      rewardExp: 0,
      rewardSocial: lbSocialPenalty > 0 ? -lbSocialPenalty : 0,
      rewardText: !isLBAllowed
        ? (lbDisabledReasonKey || 'action.job.lookBusyDisabled')
        : (lbDepPenalty > 0 ? `-${lbDepPenalty} 🤝, +0 👌${lbSocialText}` : `+0 🤝, +0 👌${lbSocialText}`),
      color: '#3498db',
      isDefault: false,
      disabled: !isLBAllowed,
      disabledReasonKey: lbDisabledReasonKey
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
      physCost: isAdvanced
        ? (rules?.enableInitiativeRevamp
            ? Math.max(0, roundToResolution(basePhys * 1.5 + physTagMod, physRes))
            : Math.max(0, roundToResolution(basePhys * 1.5 * workRatio, conditionRes)))
        : 0,
      mentalCost: isAdvanced
        ? (rules?.enableInitiativeRevamp
            ? Math.max(0, roundToResolution(baseMental * 1.5 + 2.0 + mentalTagMod + fatigueMental, conditionRes))
            : Math.max(0, roundToResolution((baseMental * 1.5 + 2.0 + fatigueMental) * workRatio, conditionRes)))
        : 0,
      wage: Math.floor(Math.floor(effectiveHourlyWage * 8 * 0.4 * busyWageMultiplier) * (hoursToWork / shiftCost)),
      rewardDep: rules?.enableInitiativeRevamp
        ? roundToResolution((isExecMgmt ? 2 : (isMiddleMgmt ? 1.5 : 1)) * workRatio, 0.5)
        : (isExecMgmt ? 2 : (isMiddleMgmt ? 1.5 : 1)),
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

  const physMistakeThreshold = getJobPhysicalMistakeThreshold(job, statRules, actionCount);
  const physMistakeRate = getJobPhysicalMistakeRate(statRules);
  const mentalMistakeThreshold = getJobMentalMistakeThreshold(job, statRules, actionCount);
  const mentalMistakeRate = getJobMentalMistakeRate(statRules);
  const mentalMultiplier = hasJobTag(job, 'heavy_physical') ? 0.5 : 1.0;
  const isFrontline = hasJobTag(job, 'frontline_service');
  const socialMistakeThreshold = getJobSocialMistakeThreshold(job, statRules);
  const socialMistakeRate = getJobSocialMistakeRate(statRules);
  const isExecJob = hasJobTag(job, 'executive_management');

  const execExpMargin = getExecutiveMistakeExpMargin(statRules);
  const execExpRate = getExecutiveMistakeRate(statRules);
  const playerExp = player.experience || 0;
  const reqExp = job.requirements?.experience || 0;
  const expMargin = playerExp - reqExp;
  const execChance = (isAdvanced && isExecJob)
    ? Math.min(1.0, Math.max(0, (execExpMargin - expMargin) * execExpRate))
    : 0;
  const newJobExpMargin = (statRules as AdvancedStatRules | undefined)?.workMistakeNewJobExpMargin ?? 0;
  const newJobExpRate = (statRules as AdvancedStatRules | undefined)?.workMistakeNewJobExpChancePerPoint ?? 0;
  const baseNewJobChance = isAdvanced
    ? getNewJobMistakeChance(job, playerExp, actionCount, statRules)
    : 0;

  const caffeineBuffer = calcCaffeineBuffer(player, rules);
  const effectivePhys = Math.min(player.physicalConditionMax ?? 50, curPhys + caffeineBuffer);
  const effectiveMental = Math.min(player.mentalConditionMax ?? 50, curMental + caffeineBuffer);

  for (const m of modes) {
    const physChance = (isAdvanced && m.physCost > 0 && effectivePhys < physMistakeThreshold)
      ? Math.min(1.0, Math.max(0, (physMistakeThreshold - effectivePhys) * physMistakeRate))
      : 0;
    const mentalChance = (isAdvanced && (m.mentalCost > 0 || isExecJob) && effectiveMental < mentalMistakeThreshold)
      ? Math.min(1.0, Math.max(0, (mentalMistakeThreshold - effectiveMental) * mentalMistakeRate * mentalMultiplier))
      : 0;
    const modifiesSocial = isFrontline ||
                           (m.id === 'look_busy' && lbSocialPenalty > 0) ||
                           (m.id === 'work_work' && socialMod !== 0) ||
                           (m.id === 'face_time');
    const socialChance = (isAdvanced && modifiesSocial && curSocial < socialMistakeThreshold)
      ? Math.min(1.0, Math.max(0, (socialMistakeThreshold - curSocial) * socialMistakeRate))
      : 0;
    const newJobChance = (m.id === 'work_work' || m.id === 'show_initiative' || m.id === 'innovate')
      ? baseNewJobChance
      : 0;
    const baseInitChance = (isAdvanced && (m.id === 'show_initiative' || m.id === 'innovate'))
      ? getInitiativeExecutionMistakeChance(job, rules)
      : 0;
    const rushedInitChance = (isAdvanced && (m.id === 'show_initiative' || m.id === 'innovate'))
      ? getInitiativeRushedMistakeChance(hoursToWork, shiftCost, rules)
      : 0;
    const initChance = 1 - (1 - baseInitChance) * (1 - rushedInitChance);

    m.physMistakeChance = physChance;
    m.mentalMistakeChance = mentalChance;
    m.socialMistakeChance = socialChance;
    m.execMistakeChance = execChance;
    m.newJobMistakeChance = newJobChance;
    m.initiativeMistakeChance = initChance;
    m.totalMistakeChance = isAdvanced
      ? (1 - (1 - physChance) * (1 - mentalChance) * (1 - socialChance) * (1 - execChance) * (1 - newJobChance) * (1 - initChance))
      : 0;

    // Detailed modifier breakdown for '?' strategy & help display
    if (isAdvanced) {
      const physMods: ModifierBreakdownItem[] = [];
      const mentalMods: ModifierBreakdownItem[] = [];
      const mistakeBreakdown: MistakeBreakdownItem[] = [];

      const unbufferedPhysRisk = Math.max(0, (physMistakeThreshold - curPhys) * physMistakeRate * 100);
      mistakeBreakdown.push({
        type: 'physical',
        label: 'Physical Fatigue',
        icon: '💪',
        currentStat: effectivePhys,
        threshold: physMistakeThreshold,
        ratePerPoint: physMistakeRate,
        chance: physChance,
        isTriggered: physChance > 0,
        explanation: m.physCost === 0
          ? 'No physical effort required for this action.'
          : (caffeineBuffer > 0
              ? (effectivePhys >= physMistakeThreshold
                  ? `Physical: ${curPhys} actual + ${caffeineBuffer} ☕ buffer = ${effectivePhys} effective (meets threshold ≥ ${physMistakeThreshold} → 0.0% risk; ${unbufferedPhysRisk.toFixed(1)}% without caffeine).`
                  : `Physical: ${curPhys} actual + ${caffeineBuffer} ☕ buffer = ${effectivePhys} effective (${(physMistakeThreshold - effectivePhys).toFixed(1)} pts below threshold ${physMistakeThreshold}) × ${(physMistakeRate * 100).toFixed(1)}%/pt = ${(physChance * 100).toFixed(1)}%`)
              : (curPhys >= physMistakeThreshold
                  ? `Physical condition (${curPhys}) meets safety threshold (≥ ${physMistakeThreshold}).`
                  : `${(physMistakeThreshold - curPhys).toFixed(1)} pts below threshold (${physMistakeThreshold}) × ${(physMistakeRate * 100).toFixed(1)}%/pt = ${(physChance * 100).toFixed(1)}%`))
      });

      const effectiveMentalRate = mentalMistakeRate * mentalMultiplier;
      const unbufferedMentalRisk = Math.max(0, (mentalMistakeThreshold - curMental) * effectiveMentalRate * 100);
      mistakeBreakdown.push({
        type: 'mental',
        label: 'Mental Exhaustion',
        icon: '🧠',
        currentStat: effectiveMental,
        threshold: mentalMistakeThreshold,
        ratePerPoint: effectiveMentalRate,
        chance: mentalChance,
        isTriggered: mentalChance > 0,
        explanation: (m.mentalCost === 0 && !isExecJob)
          ? 'No mental demand required for this action.'
          : (caffeineBuffer > 0
              ? (effectiveMental >= mentalMistakeThreshold
                  ? `Mental: ${curMental} actual + ${caffeineBuffer} ☕ buffer = ${effectiveMental} effective (meets threshold ≥ ${mentalMistakeThreshold} → 0.0% risk; ${unbufferedMentalRisk.toFixed(1)}% without caffeine).`
                  : `Mental: ${curMental} actual + ${caffeineBuffer} ☕ buffer = ${effectiveMental} effective (${(mentalMistakeThreshold - effectiveMental).toFixed(1)} pts below threshold ${mentalMistakeThreshold}) × ${(effectiveMentalRate * 100).toFixed(1)}%/pt = ${(mentalChance * 100).toFixed(1)}%`)
              : (curMental >= mentalMistakeThreshold
                  ? `Mental condition (${curMental}) meets safety threshold (≥ ${mentalMistakeThreshold}).`
                  : `${(mentalMistakeThreshold - curMental).toFixed(1)} pts below threshold (${mentalMistakeThreshold}) × ${(effectiveMentalRate * 100).toFixed(1)}%/pt = ${(mentalChance * 100).toFixed(1)}%`))
      });

      if (modifiesSocial) {
        mistakeBreakdown.push({
          type: 'social',
          label: 'Social Strain',
          icon: '👥',
          currentStat: curSocial,
          threshold: socialMistakeThreshold,
          ratePerPoint: socialMistakeRate,
          chance: socialChance,
          isTriggered: socialChance > 0,
          explanation: curSocial >= socialMistakeThreshold
            ? `Social standing (${curSocial}) meets safety threshold (≥ ${socialMistakeThreshold}).`
            : `${(socialMistakeThreshold - curSocial).toFixed(1)} pts below threshold (${socialMistakeThreshold}) × ${(socialMistakeRate * 100).toFixed(2)}%/pt = ${(socialChance * 100).toFixed(1)}%`
        });
      }

      if (isExecJob) {
        mistakeBreakdown.push({
          type: 'executive',
          label: 'Executive Blunder Risk',
          icon: '💼',
          currentStat: playerExp,
          threshold: reqExp + execExpMargin,
          ratePerPoint: execExpRate,
          chance: execChance,
          isTriggered: execChance > 0,
          explanation: expMargin >= execExpMargin
            ? `Experience (+${expMargin} over req ${reqExp}) meets executive safety buffer (+${execExpMargin}).`
            : `${(execExpMargin - expMargin).toFixed(1)} Exp below safety buffer (+${execExpMargin} over req ${reqExp}) × ${(execExpRate * 100).toFixed(1)}%/pt = ${(execChance * 100).toFixed(1)}%`
        });
      } else if (
        newJobExpMargin > 0 &&
        newJobExpRate > 0 &&
        actionCount >= grindThreshold &&
        (m.id === 'work_work' || m.id === 'show_initiative' || m.id === 'innovate')
      ) {
        mistakeBreakdown.push({
          type: 'experience',
          label: 'Inexperience (Grind/Overtime)',
          icon: '🆕',
          currentStat: playerExp,
          threshold: reqExp + newJobExpMargin,
          ratePerPoint: newJobExpRate,
          chance: newJobChance,
          isTriggered: newJobChance > 0,
          explanation: expMargin >= newJobExpMargin
            ? `Experience (+${expMargin} over req ${reqExp}) meets rookie safety buffer (+${newJobExpMargin}) for Grind/Overtime.`
            : `${(newJobExpMargin - expMargin).toFixed(1)} Exp below rookie buffer (+${newJobExpMargin} over req ${reqExp}) during ${tier} × ${(newJobExpRate * 100).toFixed(1)}%/pt = ${(newJobChance * 100).toFixed(1)}%`
        });
      }

      if ((m.id === 'show_initiative' || m.id === 'innovate') && initChance > 0) {
        mistakeBreakdown.push({
          type: 'initiative',
          label: rushedInitChance > 0 ? 'Initiative & Rushed Risk' : 'Initiative Execution Risk',
          icon: '🎯',
          currentStat: Number(formatHours(hoursToWork)),
          threshold: shiftCost,
          ratePerPoint: 0.10,
          chance: initChance,
          isTriggered: initChance > 0,
          explanation: rushedInitChance > 0
            ? `Base tier risk (${(baseInitChance * 100).toFixed(0)}%) + rushed (${formatHours(shiftCost - hoursToWork)}h short × 10%/h = ${(rushedInitChance * 100).toFixed(0)}%) → ${(initChance * 100).toFixed(1)}% combined.`
            : `Stepping up to lead (Tier ${getJobInitiativeTier(job)}) carries a ${(baseInitChance * 100).toFixed(0)}% base execution risk.`
        });
      }

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

      if ((m.id === 'work_work' || (rules?.enableInitiativeRevamp && (m.id === 'show_initiative' || m.id === 'innovate'))) && physTagMod !== 0) {
        physMods.push({ label: hasJobTag(job, 'heavy_physical') ? 'Heavy Physical job requirement' : 'Job physical modifier', amount: physTagMod });
      } else if (m.id === 'look_busy' && lbPhysTagMod !== 0) {
        physMods.push({ label: 'Job physical modifier', amount: lbPhysTagMod });
      }

      if (tier === 'grind') {
        mentalMods.push({ label: `Grind time (worked > ${grindThreshold - 1} shifts this turn)`, amount: modeBaseMental > 0 ? modeBaseMental : 1 });
      } else if (tier === 'overtime') {
        mentalMods.push({ label: `Overtime fatigue (worked ≥ ${overtimeThreshold} shifts this turn)`, amount: modeBaseMental > 0 ? modeBaseMental : 2 });
      }

      if ((m.id === 'work_work' || (rules?.enableInitiativeRevamp && (m.id === 'show_initiative' || m.id === 'innovate'))) && mentalTagMod !== 0) {
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

      if ((m.soulCrushingPenalty || 0) > 0) {
        mentalMods.push({ label: 'Soul-crushing stagnation (at Exp cap)', amount: m.soulCrushingPenalty! });
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
        overtimeThreshold,
        mistakeBreakdown
      };
    }
  }

  const summaryResult: WorkShiftSummary = {
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

  // Populate active modifiers on each shift mode
  for (const m of modes) {
    m.modifiers = getWorkShiftModifiers(player, job, m, summaryResult, {
      rules,
      statRules,
      campaignEducation,
      campaign
    });
  }

  return summaryResult;
}

export function getWorkShiftModifiers(
  player: PlayerState,
  job: JobDef,
  m: WorkShiftOption,
  summary: {
    tier: ShiftTier;
    actionCount: number;
    hoursToWork: number;
    shiftCost: number;
    workRatio?: number;
    overtimeThreshold?: number;
    locationMistakes?: number;
    turnMistakes?: number;
  },
  options?: {
    rules?: GameRules | Partial<GameRules>;
    statRules?: StatRules;
    campaignEducation?: EducationDef[];
    campaign?: CampaignBundle;
  }
): WorkShiftModifierBadge[] {
  const effectiveRules = options?.rules || options?.campaign?.config?.gameRules;
  const statRules = options?.statRules || options?.campaign?.config?.statRules;
  const campaignEducation = options?.campaignEducation || options?.campaign?.education;
  const useConditions = Boolean(effectiveRules?.usePhysicalMentalConditions);
  const useSkills = Boolean(effectiveRules?.useSkills);

  const curPhys = player.physicalCondition ?? 50;
  const curMental = player.mentalCondition ?? 50;
  const hasEnoughPhys = curPhys - m.physCost >= 1.0;
  const hasEnoughMental = curMental - m.mentalCost >= 1.0;

  // Stat and skill caps
  const effectiveMaxDep = 20 + (job.requirements?.dependability ?? 0) + (player.degreeDepBoost ?? 0) + (player.depMaxBonus ?? 0);
  const effectiveMaxExp = 10 + (job.requirements?.experience ?? 0) + (player.degreeExpBoost ?? 0) + (player.xpMaxBonus ?? 0);
  const isDepCapped = (player.dependability ?? 0) >= effectiveMaxDep;
  const isExpCapped = (player.experience ?? 0) >= effectiveMaxExp;

  const advStatRules = isAdvancedStatRules(statRules) ? statRules : undefined;
  const maxTech = (useSkills && advStatRules && effectiveRules) ? calcMaxSkillCap(player, 'skillTech', campaignEducation, advStatRules, effectiveRules as GameRules) : 0;
  const maxMgmt = (useSkills && advStatRules && effectiveRules) ? calcMaxSkillCap(player, 'skillMgmt', campaignEducation, advStatRules, effectiveRules as GameRules) : 0;
  const isTechCapped = (player.skillTech ?? 0) >= maxTech;
  const isMgmtCapped = (player.skillMgmt ?? 0) >= maxMgmt;

  const badges: WorkShiftModifierBadge[] = [];

  // 1. Exhaustion Floor Warning (<1.0 stat)
  if (useConditions) {
    if (!hasEnoughPhys && !hasEnoughMental) {
      badges.push({
        key: 'exhaust_both',
        label: '⛔ <1.0 💪/🧠',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.22)',
        border: '#ef4444',
        type: 'warning'
      });
    } else if (!hasEnoughPhys) {
      badges.push({
        key: 'exhaust_phys',
        label: '⛔ <1.0 💪',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.22)',
        border: '#ef4444',
        type: 'warning'
      });
    } else if (!hasEnoughMental) {
      badges.push({
        key: 'exhaust_mental',
        label: '⛔ <1.0 🧠',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.22)',
        border: '#ef4444',
        type: 'warning'
      });
    }
  }

  // 2. Dependability
  if (m.rewardDep > 0) {
    if (isDepCapped) {
      badges.push({
        key: 'dep_capped',
        label: `0 🤝 (Cap: ${effectiveMaxDep})`,
        color: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.12)',
        border: 'rgba(148, 163, 184, 0.3)',
        type: 'cap'
      });
    } else {
      badges.push({
        key: 'dep',
        label: `+${m.rewardDep} 🤝`,
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.18)',
        border: 'rgba(56, 189, 248, 0.45)',
        type: 'reward'
      });
    }
  } else if (m.rewardDep < 0) {
    badges.push({
      key: 'dep_pen',
      label: `${m.rewardDep} 🤝`,
      color: '#f87171',
      bg: 'rgba(239, 68, 68, 0.18)',
      border: 'rgba(239, 68, 68, 0.45)',
      type: 'penalty'
    });
  }

  // 3. Experience
  if (m.rewardExp > 0) {
    if (isExpCapped) {
      badges.push({
        key: 'exp_capped',
        label: `0 👌 (Cap: ${effectiveMaxExp})`,
        color: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.12)',
        border: 'rgba(148, 163, 184, 0.3)',
        type: 'cap'
      });
    } else {
      badges.push({
        key: 'exp',
        label: `+${m.rewardExp} 👌`,
        color: '#a78bfa',
        bg: 'rgba(167, 139, 250, 0.18)',
        border: 'rgba(167, 139, 250, 0.45)',
        type: 'reward'
      });
    }
  }

  // 4. Social modifier
  if (m.id === 'face_time') {
    const curSoc = player.social || 1;
    const ratio = summary.shiftCost > 0 ? Math.min(player.hoursRemaining, summary.shiftCost) / summary.shiftCost : 1;
    const netSocChance = Math.max(0, Math.min(100, Math.round(((100 - curSoc) / 100) * ratio * 100)));
    badges.push({
      key: 'social_ft',
      label: `👥 ~${netSocChance}% Social`,
      color: '#f472b6',
      bg: 'rgba(244, 114, 182, 0.18)',
      border: 'rgba(244, 114, 182, 0.45)',
      type: 'reward'
    });
  } else if (m.rewardSocial > 0) {
    badges.push({
      key: 'social_gain',
      label: `+${m.rewardSocial} 👥 Social`,
      color: '#f472b6',
      bg: 'rgba(244, 114, 182, 0.18)',
      border: 'rgba(244, 114, 182, 0.45)',
      type: 'reward'
    });
  } else if (m.rewardSocial < 0) {
    badges.push({
      key: 'social_loss',
      label: `${m.rewardSocial} 👥 Social`,
      color: '#f87171',
      bg: 'rgba(239, 68, 68, 0.18)',
      border: 'rgba(239, 68, 68, 0.45)',
      type: 'penalty'
    });
  } else if (hasJobTag(job, 'frontline_service') && m.id === 'work_work') {
    if (effectiveRules?.nerfFrontlineSocial) {
      const workRatioForBadge = summary.workRatio ?? (
        effectiveRules?.proportionalDivisibleActions && summary.hoursToWork < summary.shiftCost && summary.shiftCost > 0
          ? summary.hoursToWork / summary.shiftCost
          : 1
      );
      const overtimeThresholdForBadge = summary.overtimeThreshold ?? (statRules as AdvancedStatRules | undefined)?.workOvertimeThreshold ?? 8;
      const frontlineChance = getFrontlineSocialGainChance(
        job,
        summary.actionCount,
        player.social || 1,
        workRatioForBadge,
        effectiveRules,
        overtimeThresholdForBadge
      );
      if (summary.actionCount < 3) {
        badges.push({
          key: 'social_early',
          label: '0 👥 (Shift 3+)',
          color: '#94a3b8',
          bg: 'rgba(148, 163, 184, 0.12)',
          border: 'rgba(148, 163, 184, 0.25)',
          type: 'cap'
        });
      } else if (frontlineChance > 0) {
        const pct = Math.max(0, Math.min(100, Math.round(frontlineChance * 100)));
        badges.push({
          key: 'social_frontline',
          label: `👥 ~${pct}% Social`,
          color: '#f472b6',
          bg: 'rgba(244, 114, 182, 0.18)',
          border: 'rgba(244, 114, 182, 0.45)',
          type: 'reward'
        });
      } else {
        badges.push({
          key: 'social_cap',
          label: '0 👥 (Max 80)',
          color: '#94a3b8',
          bg: 'rgba(148, 163, 184, 0.12)',
          border: 'rgba(148, 163, 184, 0.25)',
          type: 'cap'
        });
      }
    } else {
      badges.push({
        key: 'social_grind',
        label: '0 👥 Social (Grind)',
        color: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.12)',
        border: 'rgba(148, 163, 184, 0.25)',
        type: 'cap'
      });
    }
  }

  // 5. Technical Skill gain
  const isTech = useSkills && hasJobTag(job, 'technical');
  if (isTech) {
    if (m.id === 'work_work' && m.rewardExp > 0) {
      if (isTechCapped) {
        badges.push({
          key: 'tech_capped',
          label: `MAX 🔧 (${maxTech})`,
          color: '#94a3b8',
          bg: 'rgba(148, 163, 184, 0.12)',
          border: 'rgba(148, 163, 184, 0.3)',
          type: 'cap'
        });
      } else {
        const techGain = (m.rewardExp * 0.10).toFixed(2);
        badges.push({
          key: 'tech',
          label: `+${techGain} 🔧`,
          color: '#38bdf8',
          bg: 'rgba(56, 189, 248, 0.18)',
          border: 'rgba(56, 189, 248, 0.45)',
          type: 'reward'
        });
      }
    } else if (m.id === 'show_initiative' || m.id === 'innovate') {
      if (isTechCapped) {
        badges.push({
          key: 'tech_init_capped',
          label: `MAX 🔧 (${maxTech})`,
          color: '#94a3b8',
          bg: 'rgba(148, 163, 184, 0.12)',
          border: 'rgba(148, 163, 184, 0.3)',
          type: 'cap'
        });
      } else {
        badges.push({
          key: 'tech_init',
          label: '+0.25 🔧',
          color: '#38bdf8',
          bg: 'rgba(56, 189, 248, 0.18)',
          border: 'rgba(56, 189, 248, 0.45)',
          type: 'reward'
        });
      }
    }
  }

  // 6. Management Skill gain
  const isMiddleMgmt = useSkills && hasJobTag(job, 'middle_management');
  const isExecMgmt = useSkills && hasJobTag(job, 'executive_management');
  const isMgmt = isMiddleMgmt || isExecMgmt;
  if (isMgmt) {
    if (isMgmtCapped) {
      if (
        (m.id === 'work_work' && m.rewardExp > 0) ||
        m.id === 'face_time' ||
        m.id === 'show_initiative' ||
        m.id === 'innovate'
      ) {
        badges.push({
          key: 'mgmt_capped',
          label: `MAX 👔 (${maxMgmt})`,
          color: '#94a3b8',
          bg: 'rgba(148, 163, 184, 0.12)',
          border: 'rgba(148, 163, 184, 0.3)',
          type: 'cap'
        });
      }
    } else {
      if (m.id === 'work_work' && m.rewardExp > 0) {
        const mgmtGain = ((isExecMgmt ? 0.10 : 0.05) * m.rewardExp).toFixed(2);
        badges.push({
          key: 'mgmt',
          label: `+${mgmtGain} 👔`,
          color: '#fbbf24',
          bg: 'rgba(251, 191, 36, 0.18)',
          border: 'rgba(251, 191, 36, 0.45)',
          type: 'reward'
        });
      } else if (m.id === 'face_time') {
        badges.push({
          key: 'mgmt_ft',
          label: '+0.15 👔',
          color: '#fbbf24',
          bg: 'rgba(251, 191, 36, 0.18)',
          border: 'rgba(251, 191, 36, 0.45)',
          type: 'reward'
        });
      }
    }
  }

  // 7. Face Time demerit clearing
  if (m.id === 'face_time') {
    const locMistakes = summary.locationMistakes ?? (player.mistakesByLocation?.[job.locationId] || 0);
    if (locMistakes > 0) {
      badges.push({
        key: 'clear_mistake',
        label: '-1 ⚠️ Demerit',
        color: '#34d399',
        bg: 'rgba(52, 211, 153, 0.18)',
        border: 'rgba(52, 211, 153, 0.45)',
        type: 'reward'
      });
    }
  }

  // 8. Overtime / Heavy Grind permanent physical drop
  const isOvertimeShift = summary.tier === 'overtime';
  const isHeavyGrindShift = summary.tier === 'grind' && hasJobTag(job, 'heavy_physical');
  if ((isOvertimeShift || isHeavyGrindShift) && (m.id === 'work_work' || m.id === 'show_initiative' || m.id === 'innovate')) {
    badges.push({
      key: 'max_phys_drop',
      label: '-0.5 MAX 💪',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.22)',
      border: '#ef4444',
      type: 'penalty'
    });
  }

  // 9. Mental Resilience bonus (+1 MAX 🧠) — excludes soul-crushing stagnation drain
  const effortMentalCost = Math.max(0, m.mentalCost - (m.soulCrushingPenalty || 0));
  if (useConditions && effortMentalCost >= requireAdvancedStatRules(statRules).resilienceDropThreshold) {
    badges.push({
      key: 'resilience',
      label: '+1 MAX 🧠',
      color: '#c084fc',
      bg: 'rgba(192, 132, 252, 0.18)',
      border: 'rgba(192, 132, 252, 0.45)',
      type: 'reward'
    });
  }

  // 9a. Soul-crushing stagnation penalty at Exp cap
  if ((m.soulCrushingPenalty || 0) > 0) {
    badges.push({
      key: 'soul_crushing',
      label: `-${m.soulCrushingPenalty} 🧠 Stagnant`,
      color: '#f87171',
      bg: 'rgba(239, 68, 68, 0.18)',
      border: 'rgba(239, 68, 68, 0.45)',
      type: 'penalty'
    });
  }

  // 9b. Caffeine Shield
  if (effectiveRules?.enableCaffeineSystem) {
    const buf = calcCaffeineBuffer(player, effectiveRules);
    if (buf > 0) {
      badges.push({
        key: 'caffeine_shield',
        label: `☕ Shield +${buf}`,
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.18)',
        border: 'rgba(56, 189, 248, 0.45)',
        type: 'reward'
      });
    }
  }

  // 10. Rent Debt Wage Garnishment
  const rentDebt = player.rentDebt ?? 0;
  const isGarnished = rentDebt > 0 && m.wage > 0;
  const garnishedAmount = isGarnished ? Math.min(rentDebt, Math.floor(m.wage * 0.5)) : 0;
  if (garnishedAmount > 0) {
    badges.push({
      key: 'debt_garnished',
      label: `-$${garnishedAmount} Debt`,
      color: '#f87171',
      bg: 'rgba(239, 68, 68, 0.18)',
      border: 'rgba(239, 68, 68, 0.45)',
      type: 'penalty'
    });
  }

  // 11. Initiative special rewards
  if (m.id === 'show_initiative' || m.id === 'innovate') {
    const initTier = getJobInitiativeTier(job);
    const cardCount = initTier === 3 ? 3 : 2;
    badges.push({
      key: 'initiative_cards',
      label: `🃏 ${cardCount} Cards`,
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.18)',
      border: 'rgba(56, 189, 248, 0.45)',
      type: 'reward'
    });
    badges.push({
      key: 'initiative_star',
      label: `+${isExecMgmt ? 2 : 1} 🌟`,
      color: '#fbbf24',
      bg: 'rgba(251, 191, 36, 0.18)',
      border: 'rgba(251, 191, 36, 0.45)',
      type: 'reward'
    });
    if (effectiveRules?.enableInitiativeRevamp && summary.hoursToWork < summary.shiftCost) {
      badges.push({
        key: 'initiative_rushed',
        label: `⚠️ Rushed (${formatHours(summary.hoursToWork)}/${summary.shiftCost}h)`,
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.22)',
        border: '#ef4444',
        type: 'warning'
      });
    }
  }

  // 11. Coasting with 0 rewards
  if (m.id === 'look_busy' && badges.length === 0) {
    badges.push({
      key: 'coast_neutral',
      label: '0 👌 (Coast)',
      color: '#94a3b8',
      bg: 'rgba(148, 163, 184, 0.12)',
      border: 'rgba(148, 163, 184, 0.25)',
      type: 'cap'
    });
  }

  return badges;
}
