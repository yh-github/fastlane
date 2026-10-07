import React from 'react';
import type { PlayerState, GameState } from '../engine/gameState';
import type { CampaignBundle, JobDef } from '../engine/dataLoader';
import type { GameRules } from '../engine/rules';
import {
  calcEducationProgress,
  calcCareerProgress,
  calcWealthProgress,
  calcWellbeingScore,
  calcEmployabilityScore,
  calcMaxDependability,
  calcMaxExperience,
} from '../engine/statMath';
import { calcLiquidAssets } from '../engine/economyEngine';
import type { GoalFilter } from '../utils/logCategorizer';
import { MessIcon } from './icons/MessIcon';

export interface DashboardBadgeData {
  id: string;
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  danger?: boolean;
  warning?: boolean;
  badge?: string;
  isActive?: boolean;
  onClick?: () => void;
}

export interface BuildDashboardBadgesParams {
  player: PlayerState;
  rules: GameRules;
  gameState?: GameState;
  campaign?: CampaignBundle;
  turn: number;
  economicIndex?: number;
  activeLogFilter?: GoalFilter | null;
  onFilterToggle?: (filter: GoalFilter) => void;
  t: (key: string, options?: any) => string;
}

export interface DashboardBadgesResult {
  lifeBadges: DashboardBadgeData[];
  careerBadges: DashboardBadgeData[];
  allBadges: DashboardBadgeData[];
  // Calculated stats for reuse (e.g. in advanced stats strip)
  stats: {
    education: number;
    career: number;
    wealth: number;
    lifestyle: number;
    wellbeing: number;
    displayHappiness: number;
    employabilityScore: number;
    victoryPercent: number;
    isMentalCritical: boolean;
    isMentalWarning: boolean;
    isPhysicalCritical: boolean;
    isPhysicalWarning: boolean;
  };
}

export function buildDashboardBadges(params: BuildDashboardBadgesParams): DashboardBadgesResult {
  const {
    player,
    rules,
    gameState,
    campaign,
    turn,
    economicIndex = 0,
    activeLogFilter,
    onFilterToggle,
    t,
  } = params;

  const education = calcEducationProgress(player.degrees.length);
  const career = calcCareerProgress(player.dependability, player.currentJobId !== null);
  const hasEarnedIncome = player.hasEarnedIncome ?? (turn > 1 || !!player.turnFlags?.hasWorked);
  const wealth = calcWealthProgress(
    calcLiquidAssets(player, campaign, economicIndex, turn, gameState?.economySimulation),
    hasEarnedIncome
  );
  const lifestyle = player.lifestyle || 0;
  const wellbeing = calcWellbeingScore(player.physicalCondition ?? 50, player.mentalCondition ?? 25);

  const statValues: Record<string, number> = {
    wealth,
    happiness: player.happiness,
    education,
    career,
    lifestyle,
    wellbeing,
  };

  let totalPoints = 0;
  let totalGoals = 0;

  const winConditions = campaign?.config.winConditions || [
    { stat: 'happiness', label: 'Happiness' },
    { stat: 'education', label: 'Education' },
    { stat: 'wealth', label: 'Wealth' },
    { stat: 'career', label: 'Career' },
  ];

  for (const cond of winConditions) {
    const target = player.goalAllotment[cond.stat] || 0;
    const current = statValues[cond.stat] || 0;
    const cappedCurrent = Math.min(current, target);
    totalGoals += target;
    totalPoints += cappedCurrent;
  }

  const victoryPercent = totalGoals > 0 ? Math.floor((totalPoints / totalGoals) * 100) : 0;

  const displayHappiness = !rules.allowOverAchievingGoals
    ? Math.min(player.happiness, player.goalAllotment.happiness || 0)
    : player.happiness;

  const employabilityScore = calcEmployabilityScore(
    player.dependability || 0,
    player.experience || 0,
    player.degrees?.length || 0,
    0,
    player.social || 0
  );

  const currentJob = player.currentJobId ? campaign?.jobs?.find((j: JobDef) => j.id === player.currentJobId) : null;
  const jobReqDep = currentJob ? currentJob.requirements.dependability : 0;
  const jobReqExp = currentJob ? currentJob.requirements.experience : 0;
  const maxDep = calcMaxDependability(jobReqDep, player.degreeDepBoost || 0, player.depMaxBonus || 0);
  const maxExp = calcMaxExperience(jobReqExp, player.degreeExpBoost || 0, player.xpMaxBonus || 0);

  const mentalThreshold =
    campaign?.config?.statRules?.mentalWarningThreshold ??
    campaign?.config?.statRules?.lowSpiritsThreshold ??
    10;
  const mentalVal = player.mentalCondition || 0;
  const isMentalCritical = mentalVal <= mentalThreshold;
  const isMentalWarning = mentalVal <= mentalThreshold * 2;

  const physicalThreshold =
    campaign?.config?.statRules?.physicalWarningThreshold ??
    campaign?.config?.statRules?.physicalDoctorThreshold ??
    10;
  const physicalVal = player.physicalCondition || 0;
  const isPhysicalCritical = physicalVal <= physicalThreshold;
  const isPhysicalWarning = physicalVal <= physicalThreshold * 2;

  const useSkills = rules.useSkills !== undefined ? rules.useSkills : !!rules.usePhysicalMentalConditions;

  // 1. Column 1: Life & Goals
  const lifeBadges: DashboardBadgeData[] = [
    {
      id: 'stat-money',
      label: t('dashboard.money', { defaultValue: 'Money' }),
      value: `$${player.money}`,
      icon: '💰',
      isActive: activeLogFilter === 'money',
      onClick: () => onFilterToggle?.('money'),
    },
    {
      id: 'stat-victory',
      label: t('dashboard.victory', { defaultValue: 'Victory' }),
      value: `${victoryPercent}%`,
      icon: '🏆',
    },
  ];

  // Dynamic Goal Badges for Non-Career Win Conditions
  for (const cond of winConditions.filter((c: { stat: string; label: string }) => c.stat !== 'career')) {
    let current = 0;
    if (cond.stat === 'wealth') current = !rules.allowOverAchievingGoals ? Math.min(wealth, player.goalAllotment.wealth || 0) : wealth;
    else if (cond.stat === 'education') current = !rules.allowOverAchievingGoals ? Math.min(education, player.goalAllotment.education || 0) : education;
    else if (cond.stat === 'happiness') current = displayHappiness as number;
    else if (cond.stat === 'lifestyle') current = !rules.allowOverAchievingGoals ? Math.min(lifestyle, player.goalAllotment.lifestyle || 0) : lifestyle;
    else if (cond.stat === 'wellbeing') current = !rules.allowOverAchievingGoals ? Math.min(wellbeing, player.goalAllotment.wellbeing || 0) : wellbeing;
    else current = (player as any)[cond.stat] || 0;

    const target = player.goalAllotment[cond.stat] || 0;
    let icon = '🎯';
    if (cond.stat === 'wealth') icon = '🤑';
    else if (cond.stat === 'education') icon = '🎓';
    else if (cond.stat === 'happiness') icon = '😊';
    else if (cond.stat === 'lifestyle') icon = (player.lifestyle || 0) > 50 ? '🧐' : '😎';
    else if (cond.stat === 'wellbeing') icon = '🧘';

    lifeBadges.push({
      id: `stat-${cond.stat}`,
      label: t(`dashboard.${cond.stat}`, { defaultValue: cond.label }),
      value: `${current}/${target}`,
      icon,
      isActive: activeLogFilter === (cond.stat as any),
      onClick: () => onFilterToggle?.(cond.stat as GoalFilter),
    });
  }

  // Health / Condition badges
  if (rules.usePhysicalMentalConditions) {
    lifeBadges.push({
      id: 'stat-physical',
      label: t('dashboard.physical', { defaultValue: 'Physical' }),
      value: `${player.physicalCondition || 0}/${player.physicalConditionMax || 50}`,
      icon: '💪',
      danger: isPhysicalCritical,
      warning: !isPhysicalCritical && isPhysicalWarning,
      badge:
        player.physicalConditionMax !== undefined && player.physicalConditionMax < 50
          ? `Max ${player.physicalConditionMax} ↓`
          : undefined,
      isActive: activeLogFilter === 'physical',
      onClick: () => onFilterToggle?.('physical'),
    });

    lifeBadges.push({
      id: 'stat-mental',
      label: t('dashboard.mental', { defaultValue: 'Mental' }),
      value: `${player.mentalCondition || 0}/${player.mentalConditionMax || 50}`,
      icon: '🧠',
      danger: isMentalCritical,
      warning: !isMentalCritical && isMentalWarning,
      badge:
        player.mentalConditionMax !== undefined && player.mentalConditionMax < 50
          ? `Max ${player.mentalConditionMax} ↓`
          : undefined,
      isActive: activeLogFilter === 'mental',
      onClick: () => onFilterToggle?.('mental'),
    });

    if (rules.trackSocial) {
      lifeBadges.push({
        id: 'stat-social',
        label: t('dashboard.social', { defaultValue: 'Social' }),
        value: `${player.social ?? 9}/99`,
        icon: '👥',
      });
    }

    if (rules.trackMess) {
      lifeBadges.push({
        id: 'stat-mess',
        label: t('dashboard.mess', { defaultValue: 'Mess' }),
        value: `${player.mess ?? 0}`,
        icon: <MessIcon />,
      });
    }
  } else {
    if (rules.helpfulUI) {
      const relaxationMax = player.relaxationMax ?? campaign?.config?.statRules?.maxRelaxation ?? campaign?.config?.statRules?.initialPhysicalMax ?? 50;
      const displayRelaxation = relaxationMax ? `${player.relaxation}/${relaxationMax}` : `${player.relaxation}`;
      lifeBadges.push({
        id: 'stat-relaxation',
        label: t('dashboard.relaxation', { defaultValue: 'Relaxation' }),
        value: displayRelaxation,
        icon: '🛌',
        danger: Boolean(
          rules.enableRelaxationDoctor &&
            player.relaxation <= (rules.relaxationDoctorThreshold ?? 10)
        ),
        isActive: activeLogFilter === 'relaxation',
        onClick: () => onFilterToggle?.('relaxation'),
      });
    }
  }

  // 2. Column 2: Career & Skills (Strict user order: Career, Employability, Dep, Exp, Mgmt, Tech)
  const careerBadges: DashboardBadgeData[] = [
    {
      id: 'stat-career',
      label: t('dashboard.career', { defaultValue: 'Career' }),
      value: `${career}/${player.goalAllotment.career || 0}`,
      icon: '💼',
      isActive: activeLogFilter === 'career',
      onClick: () => onFilterToggle?.('career'),
    },
  ];

  if (rules.helpfulUI) {
    careerBadges.push({
      id: 'stat-employability',
      label: t('dashboard.employability', { defaultValue: 'Employability' }),
      value: `${employabilityScore}%`,
      icon: '👨‍💼',
      isActive: activeLogFilter === 'employability',
      onClick: () => onFilterToggle?.('employability'),
    });

    careerBadges.push({
      id: 'stat-dependability',
      label: t('dashboard.dependability', { defaultValue: 'Dependability' }),
      value: `${player.dependability}/${maxDep}`,
      icon: '🤝',
      isActive: activeLogFilter === 'dependability',
      onClick: () => onFilterToggle?.('dependability'),
    });

    careerBadges.push({
      id: 'stat-experience',
      label: t('dashboard.experience', { defaultValue: 'Experience' }),
      value: `${player.experience}/${maxExp}`,
      icon: '👌',
      isActive: activeLogFilter === 'experience',
      onClick: () => onFilterToggle?.('experience'),
    });

    if (useSkills) {
      careerBadges.push({
        id: 'stat-skill-mgmt',
        label: t('dashboard.skillMgmt', { defaultValue: 'Mgmt' }),
        value: `${(player.skillMgmt ?? 0).toFixed(1)}/10`,
        icon: '👔',
      });

      careerBadges.push({
        id: 'stat-skill-tech',
        label: t('dashboard.skillTech', { defaultValue: 'Tech' }),
        value: `${(player.skillTech ?? 0).toFixed(1)}/10`,
        icon: '🔧',
      });
    }
  }

  const allBadges: DashboardBadgeData[] = [...lifeBadges, ...careerBadges];

  return {
    lifeBadges,
    careerBadges,
    allBadges,
    stats: {
      education,
      career,
      wealth,
      lifestyle,
      wellbeing,
      displayHappiness: displayHappiness as number,
      employabilityScore,
      victoryPercent,
      isMentalCritical,
      isMentalWarning,
      isPhysicalCritical,
      isPhysicalWarning,
    },
  };
}
