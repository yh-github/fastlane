/**
 * jobInitiativeDeck.ts
 * Generates dynamic, tiered initiative opportunity cards for the Show Initiative work mode.
 * Features:
 * - Proportional effect scaling based on job requirements and wage
 * - Distinct card decks by tier: Tier 1 (Groundwork), Tier 2 (Operational), Tier 3 (Strategic)
 * - Ethics & Aesthetics choices that restore Mental condition
 * - Expensive high-value cards with Social/Mental/Cash costs that expose players to mistake risks
 * - Location-aware weighting for Technical and Leadership specializations
 */

import type { JobDef, CampaignBundle } from '../dataLoader';
import type { PlayerState, MiniGameOption } from '../gameState';
import type { Random } from '../../utils/rng';
import type { ReplayContext } from '../replayTypes';
import { resolveDecision } from '../replayTypes';
import { hasJobTag } from '../jobTags';

export type JobInitiativeTier = 1 | 2 | 3;

/**
 * Determine the Initiative Tier for a job.
 * - Tier 3: Executive management or top-tier requirements (Exp >= 60, baseWage >= 14)
 * - Tier 2: Middle management, technical specialist, or mid-tier requirements (Exp >= 20, baseWage >= 8)
 * - Tier 1: Base / frontline entry jobs
 */
export function getJobInitiativeTier(job: JobDef): JobInitiativeTier {
  if (hasJobTag(job, 'executive_management') || (job.requirements?.experience ?? 0) >= 60) {
    return 3;
  }
  if (
    hasJobTag(job, 'middle_management') ||
    hasJobTag(job, 'technical') ||
    (job.requirements?.experience ?? 0) >= 20 ||
    job.baseWage >= 8
  ) {
    return 2;
  }
  return 1;
}

/**
 * Checks whether the current workplace location has at least one technical job in the campaign.
 */
export function locationHasTechnicalJobs(locationId: string, campaign?: CampaignBundle): boolean {
  if (!campaign?.jobs) return false;
  return campaign.jobs.some(
    j => j.locationId === locationId && (hasJobTag(j, 'technical') || (j.requirements as any)?.techSkill > 0)
  );
}

/**
 * Checks whether the current workplace location has management career tracks.
 */
export function locationHasManagementJobs(locationId: string, campaign?: CampaignBundle): boolean {
  if (!campaign?.jobs) return false;
  return campaign.jobs.some(
    j => j.locationId === locationId && (hasJobTag(j, 'middle_management') || hasJobTag(j, 'executive_management'))
  );
}

/**
 * Generates candidate initiative cards tailored to the current job and player.
 */
export function generateInitiativeCards(
  player: PlayerState,
  job: JobDef,
  campaign: CampaignBundle | undefined,
  rng: Random | undefined,
  replay: ReplayContext | undefined,
  actionCount: number = 1
): MiniGameOption[] {
  const tier = getJobInitiativeTier(job);
  const isTechJob = hasJobTag(job, 'technical');
  const isMgmtJob = hasJobTag(job, 'middle_management') || hasJobTag(job, 'executive_management');
  const locHasTech = locationHasTechnicalJobs(job.locationId, campaign);
  const locHasMgmt = locationHasManagementJobs(job.locationId, campaign);

  const baseWage = (player.currentJobId === job.id && player.currentWage) ? player.currentWage : (job.baseWage || 5);

  const candidatePool: MiniGameOption[] = [];

  // ─────────────────────────────────────────────────────────────────────────
  // 1. LEADERSHIP & ORGANIZATION
  // ─────────────────────────────────────────────────────────────────────────
  if (tier === 1) {
    candidatePool.push({
      type: 'initiative',
      badge: 'LEADERSHIP',
      icon: '👔',
      title: 'Floor Rush Coordination',
      description: 'Step up to guide coworkers during peak customer rush and organize the floor.',
      leadershipSkillAmount: locHasMgmt ? 0.25 : 0.20,
      depAmount: 1.0,
      standingAmount: 1
    });
  } else if (tier === 2) {
    candidatePool.push({
      type: 'initiative',
      badge: 'LEADERSHIP',
      icon: '👔',
      title: 'Workflow & Shift Optimization',
      description: 'Streamline team scheduling, clear operational bottlenecks, and mentor junior colleagues.',
      leadershipSkillAmount: isMgmtJob ? 0.50 : 0.35,
      depAmount: 1.5,
      standingAmount: 1
    });
  } else {
    candidatePool.push({
      type: 'initiative',
      badge: 'LEADERSHIP',
      icon: '👔',
      title: 'Executive Restructuring & Vision',
      description: 'Realign departmental priorities and present a high-stakes operational roadmap.',
      leadershipSkillAmount: 0.75,
      depAmount: 2.5,
      standingAmount: 2,
      mentalAmount: -1.5,
      burnoutRisk: true
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. TECHNICAL / DIY PROBLEM SOLVING
  // ─────────────────────────────────────────────────────────────────────────
  if (tier === 1) {
    candidatePool.push({
      type: 'initiative',
      badge: 'TECHNICAL',
      icon: '🔧',
      title: locHasTech ? 'Basic Tooling & Component Fix' : 'DIY Equipment Unjamming',
      description: locHasTech
        ? 'Assist technicians with equipment maintenance and basic tool calibration.'
        : 'Take initiative to unjam stuck equipment and fix registers without waiting for repairmen.',
      techSkillAmount: locHasTech ? 0.25 : 0.20,
      cashAmount: Math.max(10, Math.floor(baseWage * 1.5)),
      depAmount: 1.0,
      standingAmount: 1
    });
  } else if (tier === 2) {
    candidatePool.push({
      type: 'initiative',
      badge: 'TECHNICAL',
      icon: '🔧',
      title: isTechJob ? 'Advanced Diagnostics & Calibration' : 'Preventative System Maintenance',
      description: isTechJob
        ? 'Conduct deep troubleshooting of complex machinery and optimize operating tolerances.'
        : 'Identify subtle mechanical wear and overhaul floor hardware before failure strikes.',
      techSkillAmount: isTechJob ? 0.50 : 0.35,
      expAmount: 1.0,
      depAmount: 1.5,
      standingAmount: 1
    });
  } else {
    candidatePool.push({
      type: 'initiative',
      badge: 'TECHNICAL',
      icon: '🔬',
      title: 'Infrastructure & Tech Modernization',
      description: 'Lead major technical architecture upgrades and introduce automated workflow tools.',
      techSkillAmount: 0.50,
      expAmount: 1.5,
      depAmount: 2.0,
      standingAmount: 2,
      mentalAmount: -1.0,
      physicalAmount: -1.0,
      burnoutRisk: true
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. CAREER MENTORSHIP & ROLE MASTERY (EXPERIENCE)
  // ─────────────────────────────────────────────────────────────────────────
  if (tier === 1) {
    candidatePool.push({
      type: 'initiative',
      badge: 'EXPERIENCE',
      icon: '🎓',
      title: 'Standard Operating Procedures Drill',
      description: 'Master operating manuals and shadow senior staff to accelerate your core competencies.',
      expAmount: 0.75,
      depAmount: 1.0,
      standingAmount: 1
    });
  } else if (tier === 2) {
    candidatePool.push({
      type: 'initiative',
      badge: 'EXPERIENCE',
      icon: '🎓',
      title: 'Cross-Departmental Immersion',
      description: 'Collaborate with adjacent departments to develop versatile cross-functional mastery.',
      expAmount: 1.5,
      depAmount: 1.5,
      standingAmount: 1
    });
  } else {
    candidatePool.push({
      type: 'initiative',
      badge: 'EXPERIENCE',
      icon: '🎓',
      title: 'Strategic Industry Fellowship',
      description: 'Represent the firm at executive summits and publish high-impact operational analyses.',
      expAmount: 2.5,
      depAmount: 2.0,
      standingAmount: 2
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. OPERATIONAL BOUNTY & EFFICIENCY (CASH)
  // ─────────────────────────────────────────────────────────────────────────
  if (tier === 1) {
    const cashVal = Math.max(12, Math.floor(baseWage * 2.2));
    candidatePool.push({
      type: 'initiative',
      badge: 'BOUNTY',
      icon: '💵',
      title: 'Preventing Waste & Client Tip',
      description: 'Catch an inventory discrepancy and assist high-value customers for an immediate bonus.',
      cashAmount: cashVal,
      depAmount: 0.5,
      standingAmount: 1
    });
  } else if (tier === 2) {
    const cashVal = Math.max(30, Math.floor(baseWage * 3.5));
    candidatePool.push({
      type: 'initiative',
      badge: 'BOUNTY',
      icon: '💵',
      title: 'Procurement Savings Commission',
      description: 'Renegotiate vendor supply deliveries and pocket a performance efficiency bounty.',
      cashAmount: cashVal,
      depAmount: 1.0,
      standingAmount: 1
    });
  } else {
    const cashVal = Math.max(65, Math.floor(baseWage * 5.0));
    candidatePool.push({
      type: 'initiative',
      badge: 'BOUNTY',
      icon: '💵',
      title: 'Aggressive Revenue Quota Clampdown',
      description: 'Enforce ruthless quarterly billing quotas to secure a lucrative executive bonus.',
      cashAmount: cashVal,
      depAmount: 2.0,
      standingAmount: 2,
      socialAmount: -2.0,
      burnoutRisk: true
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. ETHICS, INTEGRITY & PRIDE IN CRAFT (+MENTAL RESTORATION)
  // ─────────────────────────────────────────────────────────────────────────
  if (tier === 1) {
    candidatePool.push({
      type: 'initiative',
      badge: 'ETHICS',
      icon: '🧘',
      title: 'Pride in Cleanliness & Order',
      description: 'Take quiet pride in thoroughly organizing the workspace, bringing calm and dignity to your shift.',
      mentalAmount: 2.0,
      depAmount: 1.0,
      standingAmount: 1
    });
  } else if (tier === 2) {
    candidatePool.push({
      type: 'initiative',
      badge: 'ETHICS',
      icon: '✨',
      title: 'Ethical Stand: Fair Shift Scheduling',
      description: 'Defend exhausted team members against unfair overtime, earning deep respect and clear conscience.',
      mentalAmount: 3.0,
      socialAmount: 1.0,
      depAmount: 1.0,
      standingAmount: 1
    });
  } else {
    candidatePool.push({
      type: 'initiative',
      badge: 'ETHICS',
      icon: '⚖️',
      title: 'Corporate Conscience: Client Protection',
      description: 'Refuse predatory upsells and protect consumer trust, foregoing short-term profit for lasting integrity.',
      mentalAmount: 4.0,
      depAmount: 1.5,
      standingAmount: 2,
      cashCost: 15
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. STRATEGIC CRUNCH ("EXPENSIVE" HIGH-STAKES BREAKTHROUGHS, TIER 2 & 3)
  // ─────────────────────────────────────────────────────────────────────────
  if (tier === 2) {
    candidatePool.push({
      type: 'initiative',
      badge: 'EXPENSIVE',
      icon: '⚡',
      title: 'Crunch Process Sprint',
      description: 'Lead an intense sprint to resolve department backlogs. High gains, but drains mental resilience.',
      leadershipSkillAmount: 0.40,
      techSkillAmount: 0.25,
      expAmount: 1.5,
      depAmount: 1.5,
      standingAmount: 1,
      mentalAmount: -2.0,
      socialAmount: -1.0,
      burnoutRisk: true
    });
  } else if (tier === 3) {
    candidatePool.push({
      type: 'initiative',
      badge: 'EXPENSIVE',
      icon: '⚡',
      title: 'High-Stakes Strategic Overhaul',
      description: 'Commit to an exhausting restructuring overhaul. Unlocks massive power, but pushes you to the brink.',
      leadershipSkillAmount: 0.85,
      techSkillAmount: 0.35,
      expAmount: 2.5,
      depAmount: 2.5,
      standingAmount: 2,
      cashAmount: Math.max(40, Math.floor(baseWage * 2.5)),
      mentalAmount: -2.5,
      socialAmount: -1.5,
      burnoutRisk: true
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SELECTION: 2 CARDS FOR TIER 1 & 2; 3 CARDS FOR TIER 3
  // ─────────────────────────────────────────────────────────────────────────
  const numChoices = tier === 3 ? 3 : 2;

  // Use replay-safe pseudo-random selections to guarantee consistency
  const shuffledIndices: number[] = [];
  const poolSize = candidatePool.length;

  for (let i = 0; i < poolSize; i++) {
    shuffledIndices.push(i);
  }

  // Deterministic shuffle with replay
  for (let i = poolSize - 1; i > 0; i--) {
    const roll = resolveDecision(
      replay,
      `init_card_shuffle_${player.id}_${actionCount}_${i}`,
      () => (rng ? rng.next() : Math.random())
    );
    const j = Math.floor(roll * (i + 1));
    const temp = shuffledIndices[i];
    shuffledIndices[i] = shuffledIndices[j];
    shuffledIndices[j] = temp;
  }

  const chosenIndices = shuffledIndices.slice(0, numChoices);
  return chosenIndices.map(idx => candidatePool[idx]);
}
