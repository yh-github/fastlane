/**
 * jobTags.ts — Central registry and rule helpers for Job Tags across campaigns.
 */

import type { JobDef } from './dataLoader';
import type { StatRules, AdvancedStatRules, GameRules } from './rules';

export type JobTag =
  | 'always_hiring'
  | 'academic_freedom'
  | 'heavy_physical'
  | 'frontline_service'
  | 'middle_management'
  | 'executive_management'
  | 'high_downtime'
  | 'technical'
  | 'look_fit'
  | 'clinical';

export interface JobTagDefinition {
  id: JobTag;
  nameKey: string;
  descKey: string;
}

export const JOB_TAG_REGISTRY: Record<JobTag, JobTagDefinition> = {
  always_hiring: {
    id: 'always_hiring',
    nameKey: 'tag.always_hiring',
    descKey: 'tag.always_hiring_desc'
  },
  academic_freedom: {
    id: 'academic_freedom',
    nameKey: 'tag.academic_freedom',
    descKey: 'tag.academic_freedom_desc'
  },
  heavy_physical: {
    id: 'heavy_physical',
    nameKey: 'tag.heavy_physical',
    descKey: 'tag.heavy_physical_desc'
  },
  frontline_service: {
    id: 'frontline_service',
    nameKey: 'tag.frontline_service',
    descKey: 'tag.frontline_service_desc'
  },
  middle_management: {
    id: 'middle_management',
    nameKey: 'tag.middle_management',
    descKey: 'tag.middle_management_desc'
  },
  executive_management: {
    id: 'executive_management',
    nameKey: 'tag.executive_management',
    descKey: 'tag.executive_management_desc'
  },
  high_downtime: {
    id: 'high_downtime',
    nameKey: 'tag.high_downtime',
    descKey: 'tag.high_downtime_desc'
  },
  technical: {
    id: 'technical',
    nameKey: 'tag.technical',
    descKey: 'tag.technical_desc'
  },
  look_fit: {
    id: 'look_fit',
    nameKey: 'tag.look_fit',
    descKey: 'tag.look_fit_desc'
  },
  clinical: {
    id: 'clinical',
    nameKey: 'tag.clinical',
    descKey: 'tag.clinical_desc'
  }
};

/**
 * Check if a job has a specific tag.
 */
export function hasJobTag(job: JobDef | undefined | null, tag: JobTag): boolean {
  if (!job || !job.tags) return false;
  return job.tags.includes(tag);
}

/**
 * Get the extra physical cost for work_work from job tags.
 */
export function getJobPhysicalCostModifier(job: JobDef | undefined | null): number {
  if (hasJobTag(job, 'heavy_physical')) {
    return 0.5;
  }
  return 0;
}

/**
 * Get the extra physical cost for look_busy from job tags.
 */
export function getLookBusyPhysicalCostModifier(job: JobDef | undefined | null): number {
  if (hasJobTag(job, 'heavy_physical')) {
    return 0.25;
  }
  return 0;
}

/**
 * Get the physical fatigue threshold (below which mental fatigue spillover occurs).
 */
export function getJobPhysicalFatigueThreshold(job: JobDef | undefined | null, statRules?: StatRules): number {
  const advStats = statRules as AdvancedStatRules | undefined;
  if (hasJobTag(job, 'heavy_physical')) {
    return advStats?.workMistakeHeavyPhysicalThreshold ?? 20;
  }
  return advStats?.workMistakePhysicalThreshold ?? 10;
}

/**
 * Get extra Physical/Mental mistake safety threshold added during Grind or Overtime shifts.
 */
export function getWorkMistakeTierThresholdBonus(actionCount: number = 1, statRules?: StatRules): number {
  const advStats = statRules as AdvancedStatRules | undefined;
  const grindThreshold = advStats?.workGrindThreshold ?? 4;
  const overtimeThreshold = advStats?.workOvertimeThreshold ?? 8;
  if (actionCount >= overtimeThreshold) {
    return advStats?.workMistakeOvertimeThresholdBonus ?? 0;
  }
  if (actionCount >= grindThreshold) {
    return advStats?.workMistakeGrindThresholdBonus ?? 0;
  }
  return 0;
}

/**
 * Get the physical mistake threshold for this job (including Grind/Overtime escalation).
 */
export function getJobPhysicalMistakeThreshold(
  job: JobDef | undefined | null,
  statRules?: StatRules,
  actionCount: number = 1
): number {
  const advStats = statRules as AdvancedStatRules | undefined;
  const base = hasJobTag(job, 'heavy_physical')
    ? (advStats?.workMistakeHeavyPhysicalThreshold ?? 20)
    : (advStats?.workMistakePhysicalThreshold ?? 10);
  return base + getWorkMistakeTierThresholdBonus(actionCount, statRules);
}

/**
 * Get the physical mistake scaling rate per point below threshold.
 */
export function getJobPhysicalMistakeRate(statRules?: StatRules): number {
  return (statRules as AdvancedStatRules | undefined)?.workMistakePhysicalChancePerPoint ?? 0.025;
}

/**
 * Get the extra mental cost for work_work from job tags.
 */
export function getJobMentalCostModifier(job: JobDef | undefined | null): number {
  if (hasJobTag(job, 'middle_management')) {
    return 1;
  }
  return 0;
}

/**
 * Get the mental mistake threshold for this job (including Grind/Overtime escalation).
 * Executive management roles elevate the threshold due to high strategic pressure and scrutiny.
 */
export function getJobMentalMistakeThreshold(
  job: JobDef | undefined | null,
  statRules?: StatRules,
  actionCount: number = 1
): number {
  const advStats = statRules as AdvancedStatRules | undefined;
  const base = hasJobTag(job, 'executive_management')
    ? (advStats?.workMistakeExecutiveMentalThreshold ?? 20)
    : (advStats?.workMistakeMentalThreshold ?? 10);
  return base + getWorkMistakeTierThresholdBonus(actionCount, statRules);
}

/**
 * Get the mental mistake scaling rate per point below threshold.
 */
export function getJobMentalMistakeRate(statRules?: StatRules): number {
  return (statRules as AdvancedStatRules | undefined)?.workMistakeMentalChancePerPoint ?? 0.025;
}

/**
 * Get the social mistake threshold for this job.
 */
export function getJobSocialMistakeThreshold(job: JobDef | undefined | null, statRules?: StatRules): number {
  const advStats = statRules as AdvancedStatRules | undefined;
  if (hasJobTag(job, 'frontline_service')) {
    return advStats?.workMistakeFrontlineSocialThreshold ?? 20;
  }
  return advStats?.workMistakeSocialThreshold ?? 10;
}

/**
 * Get the social mistake scaling rate per point below threshold.
 */
export function getJobSocialMistakeRate(statRules?: StatRules): number {
  return (statRules as AdvancedStatRules | undefined)?.workMistakeSocialChancePerPoint ?? 0.0125;
}

/**
 * Get the experience buffer margin above job requirement for executive management roles.
 */
export function getExecutiveMistakeExpMargin(statRules?: StatRules): number {
  return (statRules as AdvancedStatRules | undefined)?.workMistakeExecutiveExpMargin ?? 20;
}

/**
 * Get the base blunder risk rate per point below the executive experience margin.
 */
export function getExecutiveMistakeRate(statRules?: StatRules): number {
  return (statRules as AdvancedStatRules | undefined)?.workMistakeExecutiveExpChancePerPoint ?? 0.005;
}

/**
 * Get the inexperience mistake risk for non-executive jobs during Grind or Overtime shifts.
 */
export function getNewJobMistakeChance(
  job: JobDef | undefined | null,
  playerExp: number,
  actionCount: number = 1,
  statRules?: StatRules
): number {
  if (!job || hasJobTag(job, 'executive_management')) return 0;
  const advStats = statRules as AdvancedStatRules | undefined;
  const grindThreshold = advStats?.workGrindThreshold ?? 4;
  if (actionCount < grindThreshold) return 0;

  const margin = advStats?.workMistakeNewJobExpMargin ?? 0;
  const rate = advStats?.workMistakeNewJobExpChancePerPoint ?? 0;
  if (margin <= 0 || rate <= 0) return 0;

  const expMargin = playerExp - (job.requirements?.experience || 0);
  return Math.min(1.0, Math.max(0, (margin - expMargin) * rate));
}

/**
 * Check if face_time mode is allowed for this job.
 */
export function isFaceTimeAllowed(job: JobDef | undefined | null): boolean {
  if (hasJobTag(job, 'heavy_physical')) {
    return false;
  }
  return true;
}

/**
 * Check if look_busy mode is allowed for this job.
 */
export function isLookBusyAllowed(job: JobDef | undefined | null): boolean {
  if (hasJobTag(job, 'middle_management')) {
    return false;
  }
  return true;
}

/**
 * Get the Dependability penalty for look_busy mode if any.
 */
export function getLookBusyDepPenalty(job: JobDef | undefined | null): number {
  if (hasJobTag(job, 'heavy_physical')) {
    return 1;
  }
  return 0;
}

/**
 * Get the Social penalty for look_busy mode if any.
 * In frontline_service jobs, coasting/slacking off instead of helping customers reduces 1 Social.
 */
export function getLookBusySocialPenalty(job: JobDef | undefined | null): number {
  if (hasJobTag(job, 'frontline_service')) {
    return 1;
  }
  return 0;
}

/**
 * Get Experience gain multiplier for this job.
 */
export function getJobExpMultiplier(job: JobDef | undefined | null): number {
  if (hasJobTag(job, 'heavy_physical') || hasJobTag(job, 'look_fit')) {
    return 0.5;
  }
  return 1.0;
}

/**
 * Get deterministic Social gain or loss during work_work for frontline_service.
 * When `nerfFrontlineSocial` is enabled, deterministic +1 on shifts 1-3 is removed
 * (shifts 3-7 instead use `getFrontlineSocialGainChance`, while Overtime 8+ still loses -1).
 */
export function getJobSocialModifier(
  job: JobDef | undefined | null,
  actionCount: number,
  rules?: Partial<GameRules>,
  overtimeThreshold: number = 8
): number {
  let mod = 0;
  if (hasJobTag(job, 'frontline_service')) {
    if (rules?.nerfFrontlineSocial) {
      if (actionCount >= overtimeThreshold) {
        mod -= 1;
      }
    } else {
      if (actionCount < 4) {
        mod += 1;
      } else if (actionCount >= overtimeThreshold) {
        mod -= 1;
      }
    }
  }
  return mod;
}

/**
 * Get the probability of gaining +1 Social on a clean frontline_service work_work shift
 * when `nerfFrontlineSocial` is enabled (Option B: shifts 3 to overtimeThreshold-1, tapered by current Social up to 80).
 */
export function getFrontlineSocialGainChance(
  job: JobDef | undefined | null,
  actionCount: number,
  currentSocial: number,
  ratio: number = 1,
  rules?: Partial<GameRules>,
  overtimeThreshold: number = 8
): number {
  if (!rules?.nerfFrontlineSocial || !hasJobTag(job, 'frontline_service')) {
    return 0;
  }
  if (actionCount < 3 || actionCount >= overtimeThreshold) {
    return 0;
  }
  return Math.max(0, Math.min(1, ((80 - currentSocial) / 100) * ratio));
}

/**
 * Get extra Social penalty on work mistakes.
 */
export function getJobWorkMistakeSocialPenalty(job: JobDef | undefined | null): number {
  if (hasJobTag(job, 'frontline_service')) {
    return 1;
  }
  return 0;
}

/**
 * Check if weekly Dependability decay is halved due to high downtime.
 */
export function isDepDecayHalved(job: JobDef | undefined | null): boolean {
  return hasJobTag(job, 'high_downtime');
}

/**
 * Check if a job is technical (rewards and utilizes Skill_Tech).
 */
export function isTechnicalJob(job: JobDef | undefined | null): boolean {
  return hasJobTag(job, 'technical');
}

/**
 * Check if a job is managerial (middle or executive management).
 */
export function isManagementJob(job: JobDef | undefined | null): boolean {
  return hasJobTag(job, 'middle_management') || hasJobTag(job, 'executive_management');
}

/**
 * Check if a job is top-tier executive management (requires Management Skill).
 */
export function isExecutiveManagementJob(job: JobDef | undefined | null): boolean {
  return hasJobTag(job, 'executive_management');
}

/**
 * Determine whether working standard/coast shifts on this job inflicts a "soul-crushing"
 * Mental stagnation penalty because the player has reached its Experience cap.
 *
 * Exempt: executive_management, academic_freedom, clinical, and technical (unless Skill_Tech is also capped).
 */
export function isJobSoulCrushingAtCap(
  job: JobDef | undefined | null,
  playerExperience: number,
  degreeExpBoost: number = 0,
  xpMaxBonus: number = 0,
  isSkillTechCapped: boolean = false,
  rules?: Partial<GameRules>
): boolean {
  if (!job || !rules?.enableSoulCrushingJobs || !rules?.usePhysicalMentalConditions) {
    return false;
  }
  if (
    hasJobTag(job, 'executive_management') ||
    hasJobTag(job, 'academic_freedom') ||
    hasJobTag(job, 'clinical')
  ) {
    return false;
  }
  if (hasJobTag(job, 'technical')) {
    if (!rules?.useSkills || !isSkillTechCapped) {
      return false;
    }
  }
  const effectiveMaxExp = 10 + (job.requirements?.experience ?? 0) + degreeExpBoost + xpMaxBonus;
  return playerExperience >= effectiveMaxExp;
}

export interface JobSpecialRequirement {
  label: string;
  detail: string;
}

/**
 * Returns special qualification requirements for a job (e.g. Management skill, Fitness, Tech skill)
 * which are enforced by game systems in Advanced edition.
 */
export function getJobSpecialRequirements(job: JobDef | undefined | null, isAdvanced: boolean): JobSpecialRequirement[] {
  if (!job || !isAdvanced) return [];
  const reqs: JobSpecialRequirement[] = [];

  if (isExecutiveManagementJob(job)) {
    const minMgmt = Math.floor((job.requirements?.experience ?? 0) / 10);
    reqs.push({
      label: 'Management Skill',
      detail: `Skill_Mgmt >= ${minMgmt}.00 (gain via Middle Mgmt)`
    });
  }

  const reqTech = (job.requirements as any)?.techSkill ?? (job.requirements as any)?.skillTech;
  if (hasJobTag(job, 'technical') && reqTech !== undefined) {
    reqs.push({
      label: 'Technical Skill',
      detail: `Skill_Tech >= ${Number(reqTech).toFixed(2)}`
    });
  }

  if (hasJobTag(job, 'look_fit')) {
    reqs.push({
      label: 'Physical Fitness',
      detail: 'Physical Condition >= 30'
    });
  }

  return reqs;
}

export type JobInitiativeTier = 1 | 2 | 3;

/**
 * Determine the Initiative / Career Tier for a job.
 * - Tier 3: Executive management or top-tier requirements (Exp >= 60, baseWage >= 14)
 * - Tier 2: Middle management, technical specialist, or mid-tier requirements (Exp >= 20, baseWage >= 8)
 * - Tier 1: Base / frontline entry jobs
 */
export function getJobInitiativeTier(job: JobDef | undefined | null): JobInitiativeTier {
  if (!job) return 1;
  if (hasJobTag(job, 'executive_management') || (job.requirements?.experience ?? 0) >= 60) {
    return 3;
  }
  if (
    hasJobTag(job, 'middle_management') ||
    hasJobTag(job, 'technical') ||
    (job.requirements?.experience ?? 0) >= 20 ||
    (job.baseWage ?? 0) >= 8
  ) {
    return 2;
  }
  return 1;
}

/**
 * Base mistake probability when taking a Show Leadership initiative (scales by job tier).
 */
export function getInitiativeExecutionMistakeChance(
  job: JobDef | undefined | null,
  rules?: Partial<GameRules>
): number {
  if (!job || !rules?.enableInitiativeRevamp) return 0;
  return getJobInitiativeTier(job) * 0.05;
}

/**
 * Extra mistake probability when rushing Show Leadership with fewer than full shift hours.
 */
export function getInitiativeRushedMistakeChance(
  hoursToWork: number,
  shiftCost: number,
  rules?: Partial<GameRules>
): number {
  if (!rules?.enableInitiativeRevamp || hoursToWork >= shiftCost) return 0;
  return Math.min(1.0, Math.max(0, (shiftCost - hoursToWork) * 0.10));
}



