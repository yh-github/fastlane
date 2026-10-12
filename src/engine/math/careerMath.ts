import type { GameRules, StatRules } from '../rules';
import type { EducationDef } from '../dataLoader';
import { clampZero } from './conditionMath';

/**
 * Calculates the player's dynamic maximum skill cap.
 * If dynamicSkillCaps is disabled in rules, returns maxSkillCap (default 10.0).
 * Otherwise: Base cap (default 2.5) + sum of completed degree boosts up to maxSkillCap.
 */
export function calcMaxSkillCap(
  player: { degrees?: string[] },
  skillType: 'skillTech' | 'skillMgmt',
  campaignEducation?: EducationDef[],
  statRules?: StatRules,
  rules?: GameRules
): number {
  if (!rules?.dynamicSkillCaps) {
    return statRules?.maxSkillCap ?? 10.0;
  }
  const baseCap = statRules?.baseSkillCap ?? 2.5;
  const maxCap = statRules?.maxSkillCap ?? 10.0;
  if (!player.degrees || player.degrees.length === 0 || !campaignEducation) {
    return baseCap;
  }

  let bonus = 0;
  for (const degId of player.degrees) {
    const def = campaignEducation.find(e => e.id === degId);
    if (!def) continue;
    if (skillType === 'skillTech') {
      if (def.rewards?.maxTechBoost !== undefined) {
        bonus += def.rewards.maxTechBoost;
      } else if (def.tags?.includes('technical')) {
        bonus += 2.5;
      }
    } else if (skillType === 'skillMgmt') {
      if (def.rewards?.maxMgmtBoost !== undefined) {
        bonus += def.rewards.maxMgmtBoost;
      } else if (def.tags?.includes('management')) {
        bonus += 2.5;
      }
    }
  }

  return Math.min(maxCap, baseCap + bonus);
}

/**
 * Calculate the Employability / Hiring Roll Threshold Score (30-100).
 *
 * The Employability / Rejection Formula.
 * If the roll is > Employability Score, the application fails.
 *
 * @param dependability — Player dependability
 * @param experience    — Player experience
 * @param degreesCount  — Number of degrees completed
 */
export function calcEmployabilityScore(
  dependability: number,
  experience: number,
  degreesCount: number,
  mistakesAtLocation: number = 0,
  social: number = 0,
  isProbation: boolean = false
): number {
  const socialBonus = Math.floor((social || 0) / 15);
  const baseScore = Math.floor(30 + (10 + dependability + experience + 8 * degreesCount) / 3) + socialBonus;
  const score = Math.max(0, baseScore - mistakesAtLocation);
  return isProbation ? Math.floor(score / 2) : score;
}

/**
 * Calculate the Advanced Per-Job Employability Score.
 * Accounts for qualification margin, location innovations, degrees, social charm,
 * and labor market dynamics across economic cycles.
 */
export interface EmployabilityCalculatorOptions {
  dependability: number;
  experience: number;
  degreesCount: number;
  jobReqDep: number;
  jobReqExp: number;
  innovationsAtLocation?: number;
  initiativesAtLocation?: number;
  mistakesAtLocation?: number;
  social?: number;
  economicIndex?: number;
  isProbation?: boolean;
  isFrontline?: boolean;
  skillTech?: number;
  isTechnical?: boolean;
  skillMgmt?: number;
  isManagement?: boolean;
  physicalCondition?: number;
  isLookFit?: boolean;
  attireModifier?: number;

  // Optional extensions for wage-scaled and tag-aware employability
  jobBaseWage?: number;
  minCampaignWage?: number;
  maxCampaignWage?: number;
  jobTags?: string[];
  rules?: GameRules;
  statRules?: StatRules;
}

/**
 * Calculates a dynamic employability score based on physical/mental condition models.
 * Accounts for qualification margin, location innovations, degrees, social charm,
 * and labor market dynamics across economic cycles.
 */
export function calcAdvancedJobEmployabilityScore(opts: EmployabilityCalculatorOptions): number {
  const {
    dependability, experience, degreesCount, jobReqDep, jobReqExp,
    innovationsAtLocation = 0, initiativesAtLocation = 0, mistakesAtLocation = 0, social = 0, economicIndex = 0,
    isProbation = false, isFrontline = false, skillTech = 0, isTechnical = false,
    skillMgmt = 0, isManagement = false, physicalCondition = 50, isLookFit = false,
    attireModifier = 0
  } = opts;

  // New Wage-Scaled & Tag-Aware Employability system
  if (opts.rules?.wageScaledEmployability && opts.statRules) {
    const sr = opts.statRules;
    const base = sr.baseEmployability ?? 45;

    // Decoupled raw margin: Experience is Experience, Dependability is Dependability
    const depMargin = Math.max(0, dependability - jobReqDep);
    const expMargin = Math.max(0, experience - jobReqExp);
    const marginRate = sr.employabilityMarginRate ?? 1.0;
    const maxMarginBonus = sr.employabilityMaxMarginBonus ?? 40;
    const marginBonus = Math.min(
      maxMarginBonus,
      Math.floor((depMargin + expMargin) * marginRate)
    );

    // Normalized Wage Competition
    const minW = opts.minCampaignWage ?? 4;
    const maxW = opts.maxCampaignWage ?? 25;
    const jobW = opts.jobBaseWage ?? 4;
    const wageRatio = maxW > minW ? Math.max(0, Math.min(1, (jobW - minW) / (maxW - minW))) : 0;
    const maxWagePenalty = sr.maxWageCompetitionPenalty ?? 20;
    const baseWageComp = Math.round(wageRatio * maxWagePenalty);

    // Tag competition modifiers
    let tagModifier = 0;
    if (opts.jobTags && sr.tagCompetitionModifiers) {
      for (const tag of opts.jobTags) {
        if (sr.tagCompetitionModifiers[tag] !== undefined) {
          tagModifier += sr.tagCompetitionModifiers[tag];
        }
      }
    }
    const wageCompetition = Math.max(0, baseWageComp + tagModifier);

    // Domain Skill Leverage
    const skillRate = sr.employabilitySkillBonusRate ?? 2.0;
    const techBonus = isTechnical ? Math.floor((skillTech || 0) * skillRate) : 0;
    const mgmtBonus = isManagement ? Math.floor((skillMgmt || 0) * skillRate) : 0;

    // Social weighting: Frontline vs Non-Frontline
    let socialBonus = 0;
    if (isFrontline) {
      const socialDelta = (social || 0) - (sr.socialEmployabilityBaseline ?? 20);
      socialBonus = Math.round(socialDelta * (sr.frontlineSocialEmployabilityRate ?? 0.5));
    } else {
      socialBonus = Math.floor((social || 0) * (sr.generalSocialEmployabilityRate ?? 0.1));
    }

    const degreesBonus = degreesCount * 1;
    const innovBonus = innovationsAtLocation * 5;
    const initiativeBonus = initiativesAtLocation * 3;
    const lookFitBonus = isLookFit ? Math.max(0, physicalCondition - 30) * 2 : 0;

    let econModifier = 0;
    if (economicIndex >= 0) {
      econModifier = Math.floor(economicIndex / 10);
    } else {
      if (jobReqDep <= 20) {
        econModifier = Math.floor(economicIndex / 10);
      } else if (jobReqDep <= 40) {
        econModifier = Math.floor(economicIndex / 5);
      } else {
        econModifier = Math.floor(economicIndex / 2.5);
      }
    }

    const rawScore = base + marginBonus - wageCompetition + techBonus + mgmtBonus 
                   + socialBonus + degreesBonus + innovBonus + initiativeBonus 
                   + lookFitBonus + econModifier + attireModifier - mistakesAtLocation;

    const clampedScore = Math.max(1, Math.min(99, rawScore));
    return isProbation ? Math.floor(clampedScore / 2) : clampedScore;
  }

  // Classic/Default Advanced formula
  const base = 45;
  const effectiveDep = dependability + (isTechnical ? skillTech : 0) + (isManagement ? skillMgmt : 0);
  const effectiveExp = experience + (isTechnical ? skillTech : 0) + (isManagement ? skillMgmt : 0);
  const depMargin = Math.max(0, effectiveDep - jobReqDep);
  const expMargin = Math.max(0, effectiveExp - jobReqExp);
  const marginBonus = Math.min(45, Math.floor(0.5 * (depMargin + expMargin)));

  const degreesBonus = degreesCount * 1;
  const innovBonus = innovationsAtLocation * 5;
  const initiativeBonus = initiativesAtLocation * 3;
  const socialBonus = isFrontline
    ? 2 * Math.floor((social || 0) / 10)
    : Math.floor((social || 0) / 10);
  const techBonus = isTechnical ? Math.floor(skillTech * 1.5) : 0;
  const mgmtBonus = isManagement ? Math.floor(skillMgmt * 1.5) : 0;
  const lookFitBonus = isLookFit
    ? Math.max(0, physicalCondition - 30) * 2
    : 0;

  let econModifier = 0;
  if (economicIndex >= 0) {
    econModifier = Math.floor(economicIndex / 10);
  } else {
    // In recession (< 0), tier-scaled penalty based on job required dependability
    if (jobReqDep <= 20) {
      econModifier = Math.floor(economicIndex / 10); // e.g. -3 at -30 index
    } else if (jobReqDep <= 40) {
      econModifier = Math.floor(economicIndex / 5);  // e.g. -6 at -30 index
    } else {
      econModifier = Math.floor(economicIndex / 2.5); // e.g. -12 at -30 index
    }
  }

  const rawScore = base + marginBonus + degreesBonus + innovBonus + initiativeBonus + socialBonus + techBonus + mgmtBonus + lookFitBonus + econModifier + attireModifier - mistakesAtLocation;
  const clampedScore = Math.max(1, Math.min(99, rawScore));
  return isProbation ? Math.floor(clampedScore / 2) : clampedScore;
}

/**
 * Calculate dependability decay for the start of a turn.
 * Always flat -3 per turn in classic.
 * In advanced (usePhysicalMentalConditions): dep_loss = Math.max(1, Math.ceil(D_REQ / 10) - Math.floor(social / 25)),
 * where D_REQ is current job requirement or 3 for unemployed.
 */
export function calcDependabilityDecay(
  current: number,
  statRules?: StatRules,
  jobRequiredDep?: number,
  isAdvanced?: boolean,
  social: number = 0,
  isHighDowntime: boolean = false,
  isExecutiveManagement: boolean = false
): number {
  if (isAdvanced) {
    const baseDepLoss = (jobRequiredDep !== undefined && jobRequiredDep > 0)
      ? Math.ceil(jobRequiredDep / 10)
      : 3;
    const socialOffset = Math.floor((social || 0) / 25);
    let depLoss = Math.max(1, baseDepLoss - socialOffset);
    if (isHighDowntime) {
      depLoss = Math.max(1, Math.floor(depLoss / 2));
    }
    if (isExecutiveManagement) {
      depLoss += 1;
    }
    return clampZero(current - depLoss);
  }
  return clampZero(current - (statRules?.dependabilityWeeklyDecay ?? 3));
}

/**
 * Calculate the maximum possible dependability.
 * Capped by the job's requirement plus degree bonuses and innovation breakthroughs.
 *
 * @param jobRequiredDep — The dependability required by the current job (0 if unemployed)
 * @param degreeDepBoost — Cumulative dependability boost from all completed degrees
 * @param depMaxBonus    — Bonus cap expansion from innovation breakthroughs
 */
export function calcMaxDependability(jobRequiredDep: number, degreeDepBoost: number, depMaxBonus: number = 0): number {
  return 20 + jobRequiredDep + degreeDepBoost + depMaxBonus;
}

/**
 * Calculate the maximum possible experience.
 * Capped by the job's requirement plus degree bonuses and innovation breakthroughs.
 *
 * @param jobRequiredExp — The experience required by the current job (0 if unemployed)
 * @param degreeExpBoost — Cumulative experience boost from all completed degrees
 * @param xpMaxBonus     — Bonus cap expansion from innovation breakthroughs
 */
export function calcMaxExperience(jobRequiredExp: number, degreeExpBoost: number, xpMaxBonus: number = 0): number {
  return 10 + jobRequiredExp + degreeExpBoost + xpMaxBonus;
}

/**
 * Calculate prorated wage if working a partial shift (less than 6 hours).
 *
 * @param baseWage       — The locked-in hourly wage
 * @param hoursRemaining — Hours remaining in the turn (1 to 5)
 */
export function calcProratedWage(baseWage: number, hoursRemaining: number): number {
  return Math.floor((baseWage * 8 * hoursRemaining) / 6);
}

/**
 * Calculate the dependability required to get a raise at the current job.
 * Innovation breakthroughs discount previous raises.
 *
 * @param jobRequiredDep — Base dependability required for the job
 * @param raisesReceived — Number of raises already received at this job
 * @param innovationCount — Number of innovation breakthroughs at this job
 */
export function calcRaiseThreshold(jobRequiredDep: number, raisesReceived: number, innovationCount: number = 0): number {
  return jobRequiredDep + 5 * Math.max(0, raisesReceived - innovationCount);
}

/**
 * Calculate current Career stat (0-100) based on Dependability.
 * 80 Dependability = 100 Career.
 * Must have a job to have a Career stat > 0.
 */
export function calcCareerProgress(dependability: number, hasJob: boolean): number {
  if (!hasJob) return 0;
  return Math.min(100, Math.floor(1.25 * dependability));
}
