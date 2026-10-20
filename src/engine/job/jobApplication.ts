import { type PlayerState, type GameRules, markClothesWorn } from '../gameState';
import { spendHours } from '../timeManager';
import { calcEmployabilityScore, calcAdvancedJobEmployabilityScore, calcEffectiveJobRequirements } from '../statMath';
import type { JobDef } from '../dataLoader';
import type { Random } from '../../utils/rng';
import { resolveDecision, type ReplayContext } from '../replayTypes';
import { applyMoraleEffect } from '../statEffects';
import { isAdvancedVersion, requireAdvancedStatRules, type StatRules } from '../rules';
import {
  hasJobTag,
  isManagementJob,
  isExecutiveManagementJob,
  getJobInitiativeTier
} from '../jobTags';
import { calcEconomyPrice } from '../economyEngine';
import type { JobApplicationResult } from './jobTypes';

export const DEGREE_NAMES: Record<string, string> = {
  junior_college: 'Junior College',
  trade_school: 'Trade School',
  business_admin: 'Business Administration',
  academic: 'Academic',
  electronics: 'Electronics',
  pre_engineering: 'Pre-Engineering',
  graduate_school: 'Graduate School',
  engineering: 'Engineering',
  post_doctoral: 'Post-Doctoral',
  research: 'Research',
  publishing: 'Publishing'
};

export function formatDegreeName(id: string): string {
  if (DEGREE_NAMES[id]) return DEGREE_NAMES[id];
  return id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function calculateJobEmployability(player: PlayerState): number {
  return calcEmployabilityScore(player.dependability, player.experience, player.degrees.length, 0, player.social);
}

export function applyForJob(
  player: PlayerState,
  job: JobDef,
  timeCost: number,
  messages: Record<string, string> = {},
  offeredWage?: number,
  rng?: Random,
  rules?: GameRules | Partial<GameRules>,
  turn: number = 1,
  replay?: ReplayContext,
  statRules?: StatRules,
  economicIndex: number = 0,
  minCampaignWage?: number,
  maxCampaignWage?: number
): JobApplicationResult {
  const msg = (key: string, defaultMsg: string, vars: Record<string, string | number> = {}) => {
    let m = messages[key] || defaultMsg;
    for (const [k, v] of Object.entries(vars)) m = m.replaceAll(`{${k}}`, String(v));
    return m;
  };

  if (player.hoursRemaining < timeCost) {
    return { updated: player, success: false, message: { key: 'action.error.notEnoughTimeInterview' } };
  }

  if (player.turnFlags.jobsRejectedThisTurn?.includes(job.id)) {
    return { updated: player, success: false, message: { key: 'action.job.noOpenings' } };
  }

  const isAdvanced = isAdvancedVersion(rules);
  const useConditions = Boolean(rules?.usePhysicalMentalConditions);
  const useSkills = Boolean(rules?.useSkills);

  // Interview costs 1 Mental when Physical/Mental conditions are enabled
  if (useConditions) {
    const curMental = player.mentalCondition ?? 50;
    if (curMental - 1 < 1.0) {
      return { updated: player, success: false, message: { key: 'action.error.tooMentallyExhausted' } };
    }
  }

  // Cost to apply (time)
  let updated = spendHours(player, timeCost);

  // Apply mental cost and check for interview mistake
  if (useConditions) {
    const oldMental = updated.mentalCondition ?? 50;
    updated.mentalCondition = oldMental - 1;

    if (oldMental < 10) {
      const mistakeChance = (10 - oldMental) * 0.025;
      const isMistake = resolveDecision(
        replay,
        `job_interview_mental_mistake_${player.id}_${turn}_${job.id}`,
        () => (rng ? rng.next() : Math.random()) < mistakeChance
      );
      if (isMistake) {
        if (!updated.turnFlags.jobsRejectedThisTurn) updated.turnFlags.jobsRejectedThisTurn = [];
        updated.turnFlags.jobsRejectedThisTurn.push(job.id);
        return { updated, success: false, message: { key: 'action.job.interviewMistake' } };
      }
    }
  }
  
  const isRaise = player.currentJobId === job.id;

  if (isRaise) {
    // Raise logic
    const newWage = offeredWage !== undefined ? offeredWage : calcEconomyPrice(job.baseWage, economicIndex);
    if (newWage === player.currentWage) {
      return { updated, success: false, message: { key: 'action.job.raiseSame' } };
    }
    if (newWage < player.currentWage) {
      return { updated, success: false, message: { key: 'action.job.raiseLess' } };
    }

    const localInitiatives = isAdvanced
      ? ((updated.initiativesByLocation?.[job.locationId] || 0) + (updated.innovationCount || 0))
      : 0;
    const effectiveRaises = Math.max(0, updated.raisesAtCurrentJob - localInitiatives);
    const isTechnical = useSkills && hasJobTag(job, 'technical');
    const isManagement = useSkills && isManagementJob(job);
    const decoupleSkills = Boolean(rules?.wageScaledEmployability);
    const effectiveDep = updated.dependability + (decoupleSkills ? 0 : ((isTechnical ? (updated.skillTech || 0) : 0) + (isManagement ? (updated.skillMgmt || 0) : 0)));
    const reqDep = job.requirements.dependability + (effectiveRaises * 5);
    if (effectiveDep >= reqDep) {
      if (newWage > player.currentWage) {
        updated.currentWage = newWage;
        updated.raisesAtCurrentJob += 1;
        updated = applyMoraleEffect(updated, 3, 'raise_approved', rules as GameRules, statRules);
        return { updated, success: true, message: { key: 'action.job.raiseSuccess' } };
      } else {
        return { updated, success: false, message: { key: 'action.job.raiseWaste' } };
      }
    } else {
      return { updated, success: false, message: { key: 'action.job.raiseDenied' } };
    }
  }

  // Regular job application logic: Check hard requirements first
  const rejectionReasons: string[] = [];

  const isTechnical = useSkills && hasJobTag(job, 'technical');
  const isManagement = useSkills && isManagementJob(job);
  const isExecutive = useSkills && isExecutiveManagementJob(job);
  const isFrontline = hasJobTag(job, 'frontline_service');

  const effReqs = calcEffectiveJobRequirements(job, updated, isAdvanced);
  const reqDepTarget = effReqs.reqDep;
  const reqExpTarget = effReqs.reqExp;

  const techSkill = isTechnical ? (updated.skillTech || 0) : 0;
  const mgmtSkill = isManagement ? (updated.skillMgmt || 0) : 0;
  const decoupleSkills = Boolean(rules?.wageScaledEmployability);
  const effectiveExp = updated.experience + (decoupleSkills ? 0 : (techSkill + mgmtSkill));
  const effectiveDep = updated.dependability + (decoupleSkills ? 0 : (techSkill + mgmtSkill));

  const shouldMask = rules?.maskEarlyJobRejections !== undefined 
    ? (rules.maskEarlyJobRejections && turn <= 4)
    : (turn <= 4 && !rules?.helpfulUI);

  const missingDep = effectiveDep < reqDepTarget;

  if (effectiveExp < reqExpTarget) {
    rejectionReasons.push(msg('job_apply_missing_experience', 'Not enough experience.'));
  }
  if (missingDep && !shouldMask) {
    rejectionReasons.push(msg('job_apply_missing_dependability', 'Poor Work History.'));
  }

  // Check degrees / education
  const missingDegrees = job.requirements.degrees.filter(degree => !updated.degrees.includes(degree));
  if (missingDegrees.length > 0) {
    if (rules?.helpfulUI) {
      const degreeNames = missingDegrees.map(d => messages[`education_${d}`] || formatDegreeName(d)).join(', ');
      rejectionReasons.push(msg('job_apply_missing_education_helpful', `Not enough education: missing ${degreeNames}.`, { degrees: degreeNames }));
    } else if (messages['job_apply_missing_education']) {
      rejectionReasons.push(msg('job_apply_missing_education', 'Not enough education.'));
    } else {
      for (const degree of missingDegrees) {
        rejectionReasons.push(msg('job_apply_missing_degree', `Missing required degree: ${degree}`, { degree }));
      }
    }
  }

  if (isExecutive) {
    const reqMgmt = Math.floor(job.requirements.experience / 10);
    if ((updated.skillMgmt || 0) < reqMgmt - 0.001) {
      rejectionReasons.push(msg('job_apply_missing_mgmt_skill', `Requires at least ${reqMgmt.toFixed(2)} Management Skill (Skill_Mgmt). Gain experience in Middle Management.`, { reqMgmt: reqMgmt.toFixed(2) }));
    }
  }

  const reqTech = (job.requirements as any)?.techSkill ?? (job.requirements as any)?.skillTech;
  if (isTechnical && reqTech !== undefined) {
    if ((updated.skillTech || 0) < reqTech - 0.001) {
      rejectionReasons.push(msg('job_apply_missing_tech_skill', `Requires at least ${Number(reqTech).toFixed(2)} Technical Skill (Skill_Tech).`, { reqTech: Number(reqTech).toFixed(2) }));
    }
  }

  const isLookFit = useConditions && hasJobTag(job, 'look_fit');
  if (isLookFit) {
    const phys = updated.physicalCondition ?? 50;
    if (phys < 30) {
      rejectionReasons.push(msg('job_apply_missing_physical_condition', 'Not physically fit enough for security guard work. Requires Physical Condition >= 30.'));
    }
  }

  const isHeavyPhysical = useConditions && hasJobTag(job, 'heavy_physical');
  if (isHeavyPhysical) {
    const advStatRules = requireAdvancedStatRules(statRules);
    const minPhys = advStatRules.heavyPhysicalMinRequirement;
    const phys = updated.physicalCondition ?? 50;
    if (phys < minPhys) {
      rejectionReasons.push(msg('job_apply_missing_physical_heavy', `Requires at least ${minPhys} Physical Condition for heavy physical labor.`, { minPhys }));
    }
  }

  if (rejectionReasons.length > 0) {
    return {
      updated,
      success: false,
      message: {
        key: 'action.job.rejected',
        params: {
          reasons: rejectionReasons.join(' '),
          missingDegrees: missingDegrees.join(',')
        }
      }
    };
  }

  // If dependability was the only missing requirement during early turns, mask it as "No openings"
  if (missingDep && shouldMask) {
    return { updated, success: false, message: { key: 'action.job.noOpenings' } };
  }

  // If the job is "always_hiring" and requirements are met, skip luck roll and auto-hire!
  const isAlwaysHiring = job.tags?.includes('always_hiring') || job.tags?.includes('auto_accept');
  if (isAlwaysHiring) {
    updated.currentJobId = job.id;
    updated.currentWage = offeredWage ?? job.baseWage;
    updated.raisesAtCurrentJob = 0;
    updated.innovationCount = 0;
    updated.depMaxBonus = 0;
    updated.xpMaxBonus = 0;
    if (isAdvanced) {
      updated.currentJobTier = getJobInitiativeTier(job);
      updated.noOpeningBonus = 0;
    }
    
    if (updated.dependability < 10) {
      updated.dependability = 10;
    }

    const shouldGrantExpOnSwitch = rules?.grantExpOnJobSwitch !== undefined ? rules.grantExpOnJobSwitch : true;
    if (shouldGrantExpOnSwitch) {
      updated.experience += 2;
    }
    
    return { updated, success: true, message: { key: 'action.job.gotJob', params: { title: job.title } } };
  }

  // Hiring threshold check for normal jobs
  const locMistakes = updated.mistakesByLocation?.[job.locationId] || 0;
  const isProbation = updated.turnFlags.firedLocationsThisTurn?.includes(job.locationId) ?? false;
  
  // Calculate Employability Score (1–99%)
  let employability: number;
  if (isAdvanced) {
    const locInnovations = updated.innovationsByLocation?.[job.locationId] || 0;

    const reqUniform = job.requirements.uniform;
    const reqScore = reqUniform === 'business' ? 3 : (reqUniform === 'dress' ? 2 : 1);
    const playerClothes = updated.inventory?.selectedClothes || 'none';
    const hasSelected = (playerClothes === 'business' && (updated.inventory?.businessClothesWeeks || 0) > 0)
      || (playerClothes === 'dress' && (updated.inventory?.dressClothesWeeks || 0) > 0)
      || (playerClothes === 'casual' && (updated.inventory?.casualClothesWeeks || 0) > 0);
    const effectiveClothes = hasSelected ? playerClothes : 'none';
    const clothesScore = effectiveClothes === 'business' ? 3 : (effectiveClothes === 'dress' ? 2 : (effectiveClothes === 'casual' ? 1 : 0));

    let attireModifier = 0;
    if (clothesScore < reqScore) {
      attireModifier = -5;
    } else if (clothesScore > reqScore) {
      attireModifier = 5;
    }

    if (effectiveClothes !== 'none') {
      updated = markClothesWorn(updated, effectiveClothes);
    }

    employability = calcAdvancedJobEmployabilityScore({
      dependability: updated.dependability,
      experience: updated.experience,
      degreesCount: updated.degrees.length,
      jobReqDep: reqDepTarget,
      jobReqExp: reqExpTarget,
      innovationsAtLocation: locInnovations,
      initiativesAtLocation: updated.initiativesByLocation?.[job.locationId] || 0,
      mistakesAtLocation: locMistakes,
      social: updated.social || 0,
      economicIndex: economicIndex,
      isProbation: isProbation,
      isFrontline: isFrontline,
      skillTech: updated.skillTech || 0,
      isTechnical: isTechnical,
      skillMgmt: updated.skillMgmt || 0,
      isManagement: isManagement,
      physicalCondition: updated.physicalCondition ?? 50,
      isLookFit: isLookFit,
      attireModifier,
      jobBaseWage: job.baseWage,
      minCampaignWage,
      maxCampaignWage,
      jobTags: job.tags,
      rules: rules as GameRules,
      statRules
    });
    if (updated.noOpeningBonus) {
      employability = Math.min(99, employability + updated.noOpeningBonus);
    }
  } else {
    employability = calcEmployabilityScore(
      updated.dependability,
      updated.experience,
      updated.degrees.length,
      locMistakes,
      updated.social || 0,
      isProbation
    );
  }

  const roll = resolveDecision(replay, `job_apply_luck`, () => Math.floor((rng ? rng.next() : Math.random()) * 100) + 1);

  if (roll > employability) {
    if (!updated.turnFlags.jobsRejectedThisTurn) updated.turnFlags.jobsRejectedThisTurn = [];
    updated.turnFlags.jobsRejectedThisTurn.push(job.id);
    if (isAdvanced) {
      const increment = updated.currentJobId === null ? 10 : 5;
      updated.noOpeningBonus = Math.min(30, (updated.noOpeningBonus || 0) + increment);
    }
    if (isProbation) {
      return { updated, success: false, message: { key: 'action.job.noOpeningsProbation' } };
    }
    return { updated, success: false, message: { key: 'action.job.noOpenings' } };
  }

  // Success
  updated.currentJobId = job.id;
  updated.currentWage = offeredWage !== undefined ? offeredWage : calcEconomyPrice(job.baseWage, economicIndex); // Lock in the wage
  updated.raisesAtCurrentJob = 0;
  updated.innovationCount = 0;
  updated.depMaxBonus = 0;
  updated.xpMaxBonus = 0;
  if (isAdvanced) {
    updated.currentJobTier = getJobInitiativeTier(job);
    updated.noOpeningBonus = 0;
  }
  
  // Anti-frustration feature: reset dependability to 10 when getting a new job if it's too low
  if (updated.dependability < 10) {
    updated.dependability = 10;
  }

  const shouldGrantExpOnSwitch = rules?.grantExpOnJobSwitch ?? true;
  if (shouldGrantExpOnSwitch) {
    updated.experience += 2;
  }

  return { updated, success: true, message: { key: 'action.job.gotJob', params: { title: job.title } } };
}
