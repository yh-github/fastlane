/**
 * jobTags.ts — Central registry and rule helpers for Job Tags across campaigns.
 */

import type { JobDef } from './dataLoader';

export type JobTag =
  | 'always_hiring'
  | 'academic_freedom'
  | 'heavy_physical'
  | 'frontline_service'
  | 'middle_management'
  | 'high_downtime'
  | 'technical';

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
  high_downtime: {
    id: 'high_downtime',
    nameKey: 'tag.high_downtime',
    descKey: 'tag.high_downtime_desc'
  },
  technical: {
    id: 'technical',
    nameKey: 'tag.technical',
    descKey: 'tag.technical_desc'
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
    return 1;
  }
  return 0;
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
 * Get Experience gain multiplier for this job.
 */
export function getJobExpMultiplier(job: JobDef | undefined | null): number {
  if (hasJobTag(job, 'heavy_physical')) {
    return 0.5;
  }
  return 1.0;
}

/**
 * Get Social gain or loss during work_work for frontline_service and middle_management.
 */
export function getJobSocialModifier(job: JobDef | undefined | null, actionCount: number): number {
  let mod = 0;
  if (hasJobTag(job, 'frontline_service')) {
    if (actionCount < 4) {
      mod += 1;
    } else if (actionCount >= 8) {
      mod -= 1;
    }
  }
  if (hasJobTag(job, 'middle_management')) {
    mod += 0.5;
  }
  return mod;
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

