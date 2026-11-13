import React from 'react';
import { type PlayerState, type GameState, isPlayerFed } from '../engine/gameState';
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
  calcMaxSkillCap,
} from '../engine/statMath';
import { calcLiquidAssets } from '../engine/economyEngine';
import type { GoalFilter } from '../utils/logCategorizer';

export interface DashboardBadgeData {
  id: string;
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  danger?: boolean;
  warning?: boolean;
  badge?: string;
  isActive?: boolean;
  hoverText?: string;
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
  onOpenAttributeCard?: (attributeId: string) => void;
  t: (key: string, options?: any) => string;
}

export interface DashboardBadgesResult {
  victoryBadge: DashboardBadgeData;
  goalBadges: DashboardBadgeData[];
  careerAttributes: DashboardBadgeData[];
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
    onOpenAttributeCard,
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

  const statRules = campaign?.config?.statRules;
  const mentalThreshold =
    (statRules && 'mentalWarningThreshold' in statRules ? statRules.mentalWarningThreshold : undefined) ??
    (statRules && 'lowSpiritsThreshold' in statRules ? statRules.lowSpiritsThreshold : undefined) ??
    10;
  const mentalVal = player.mentalCondition || 0;
  const isMentalCritical = mentalVal <= mentalThreshold;
  const isMentalWarning = mentalVal <= mentalThreshold * 2;

  const physicalThreshold =
    (statRules && 'physicalWarningThreshold' in statRules ? statRules.physicalWarningThreshold : undefined) ??
    (statRules && 'physicalDoctorThreshold' in statRules ? statRules.physicalDoctorThreshold : undefined) ??
    10;
  const physicalVal = player.physicalCondition || 0;
  const isPhysicalCritical = physicalVal <= physicalThreshold;
  const isPhysicalWarning = physicalVal <= physicalThreshold * 2;

  const useSkills = Boolean(rules.useSkills);

  // 1. Victory Badge (Top-most icon on the right column)
  const victoryLabel = t('dashboard.victory', { defaultValue: 'Victory' });
  const victoryBadge: DashboardBadgeData = {
    id: 'stat-victory',
    label: victoryLabel,
    value: `${victoryPercent}%`,
    icon: '🏆',
    hoverText: `${victoryLabel}: ${victoryPercent}% / 100%`,
    onClick: onOpenAttributeCard ? () => onOpenAttributeCard('victory') : undefined,
  };

  // 2. Dynamic Goal Badges for all win conditions (including career)
  const goalBadges: DashboardBadgeData[] = [];
  for (const cond of winConditions) {
    let current = 0;
    if (cond.stat === 'career') current = career;
    else if (cond.stat === 'wealth') current = !rules.allowOverAchievingGoals ? Math.min(wealth, player.goalAllotment.wealth || 0) : wealth;
    else if (cond.stat === 'education') current = !rules.allowOverAchievingGoals ? Math.min(education, player.goalAllotment.education || 0) : education;
    else if (cond.stat === 'happiness') current = displayHappiness as number;
    else if (cond.stat === 'lifestyle') current = !rules.allowOverAchievingGoals ? Math.min(lifestyle, player.goalAllotment.lifestyle || 0) : lifestyle;
    else if (cond.stat === 'wellbeing') current = !rules.allowOverAchievingGoals ? Math.min(wellbeing, player.goalAllotment.wellbeing || 0) : wellbeing;
    else current = (player as any)[cond.stat] || 0;

    const target = player.goalAllotment[cond.stat] || 0;
    let icon = '🎯';
    if (cond.stat === 'career') icon = '💼';
    else if (cond.stat === 'wealth') icon = '🤑';
    else if (cond.stat === 'education') icon = '🎓';
    else if (cond.stat === 'happiness') icon = '😊';
    else if (cond.stat === 'lifestyle') icon = (player.lifestyle || 0) > 50 ? '🧐' : '😎';
    else if (cond.stat === 'wellbeing') icon = '🧘';

    const goalLabel = t(`dashboard.${cond.stat}`, { defaultValue: cond.label });
    goalBadges.push({
      id: `stat-${cond.stat}`,
      label: goalLabel,
      value: `${current}/${target}`,
      icon,
      hoverText: `${goalLabel}: ${current} / ${target}`,
      isActive: activeLogFilter === (cond.stat as any),
      onClick: onOpenAttributeCard
        ? () => onOpenAttributeCard(cond.stat)
        : () => onFilterToggle?.(cond.stat as GoalFilter),
    });
  }

  // 3. Career Attributes (Left column: Employability, Dep, Exp, Mgmt, Tech - strict order, only when helpfulUI)
  const careerAttributes: DashboardBadgeData[] = [];
  if (rules.helpfulUI) {
    const empLabel = t('dashboard.employability', { defaultValue: 'Employability' });
    careerAttributes.push({
      id: 'stat-employability',
      label: empLabel,
      value: `${employabilityScore}%`,
      icon: '👨‍💼',
      hoverText: `${empLabel}: ${employabilityScore}% / 100%`,
      isActive: activeLogFilter === 'employability',
      onClick: onOpenAttributeCard
        ? () => onOpenAttributeCard('employability')
        : () => onFilterToggle?.('employability'),
    });

    const depLabel = t('dashboard.dependability', { defaultValue: 'Dependability' });
    careerAttributes.push({
      id: 'stat-dependability',
      label: depLabel,
      value: `${player.dependability}/${maxDep}`,
      icon: '🤝',
      hoverText: `${depLabel}: ${Math.floor(player.dependability)} / ${maxDep}`,
      isActive: activeLogFilter === 'dependability',
      onClick: onOpenAttributeCard
        ? () => onOpenAttributeCard('dependability')
        : () => onFilterToggle?.('dependability'),
    });

    const expLabel = t('dashboard.experience', { defaultValue: 'Experience' });
    careerAttributes.push({
      id: 'stat-experience',
      label: expLabel,
      value: `${player.experience}/${maxExp}`,
      icon: '👌',
      hoverText: `${expLabel}: ${Math.floor(player.experience)} / ${maxExp}`,
      isActive: activeLogFilter === 'experience',
      onClick: onOpenAttributeCard
        ? () => onOpenAttributeCard('experience')
        : () => onFilterToggle?.('experience'),
    });

    if (useSkills && campaign?.config?.statRules) {
      const maxMgmt = calcMaxSkillCap(player, 'skillMgmt', campaign?.education, campaign.config.statRules, rules);
      const maxTech = calcMaxSkillCap(player, 'skillTech', campaign?.education, campaign.config.statRules, rules);
      const mgmtLabel = t('dashboard.skillMgmt', { defaultValue: 'Leadership' });
      careerAttributes.push({
        id: 'stat-skill-mgmt',
        label: mgmtLabel,
        value: `${(player.skillMgmt ?? 0).toFixed(2)}/${maxMgmt.toFixed(1)}`,
        icon: '👔',
        hoverText: `${mgmtLabel}: ${(player.skillMgmt ?? 0).toFixed(2)} / ${maxMgmt.toFixed(1)}`,
        onClick: onOpenAttributeCard ? () => onOpenAttributeCard('skillMgmt') : undefined,
      });

      const techLabel = t('dashboard.skillTech', { defaultValue: 'Tech' });
      careerAttributes.push({
        id: 'stat-skill-tech',
        label: techLabel,
        value: `${(player.skillTech ?? 0).toFixed(2)}/${maxTech.toFixed(1)}`,
        icon: '🔧',
        hoverText: `${techLabel}: ${(player.skillTech ?? 0).toFixed(2)} / ${maxTech.toFixed(1)}`,
        onClick: onOpenAttributeCard ? () => onOpenAttributeCard('skillTech') : undefined,
      });
    }
  }

  // 4. Life & Resource Badges (Right column under goals: Money, Physical, Mental, Social, Relaxation)
  const moneyLabel = t('dashboard.money', { defaultValue: 'Money' });
  const lifeBadges: DashboardBadgeData[] = [
    {
      id: 'stat-money',
      label: moneyLabel,
      value: `$${player.money}`,
      icon: '💰',
      hoverText: `${moneyLabel}: $${player.money}`,
      isActive: activeLogFilter === 'money',
      onClick: onOpenAttributeCard
        ? () => onOpenAttributeCard('money')
        : () => onFilterToggle?.('money'),
    },
  ];

  if (rules.usePhysicalMentalConditions) {
    const physLabel = t('dashboard.physical', { defaultValue: 'Physical' });
    lifeBadges.push({
      id: 'stat-physical',
      label: physLabel,
      value: `${player.physicalCondition || 0}/${player.physicalConditionMax || 50}`,
      icon: '💪',
      hoverText: `${physLabel}: ${Math.floor(player.physicalCondition || 0)} / ${player.physicalConditionMax || 50}`,
      danger: isPhysicalCritical,
      warning: !isPhysicalCritical && isPhysicalWarning,
      badge:
        player.physicalConditionMax !== undefined && player.physicalConditionMax < 50
          ? `Max ${player.physicalConditionMax} ↓`
          : undefined,
      isActive: activeLogFilter === 'physical',
      onClick: onOpenAttributeCard
        ? () => onOpenAttributeCard('physical')
        : () => onFilterToggle?.('physical'),
    });

    const mentalLabel = t('dashboard.mental', { defaultValue: 'Mental' });
    lifeBadges.push({
      id: 'stat-mental',
      label: mentalLabel,
      value: `${player.mentalCondition || 0}/${player.mentalConditionMax || 50}`,
      icon: '🧠',
      hoverText: `${mentalLabel}: ${Math.floor(player.mentalCondition || 0)} / ${player.mentalConditionMax || 50}`,
      danger: isMentalCritical,
      warning: !isMentalCritical && isMentalWarning,
      badge:
        player.mentalConditionMax !== undefined && player.mentalConditionMax < 50
          ? `Max ${player.mentalConditionMax} ↓`
          : undefined,
      isActive: activeLogFilter === 'mental',
      onClick: onOpenAttributeCard
        ? () => onOpenAttributeCard('mental')
        : () => onFilterToggle?.('mental'),
    });

    if (rules.enableCookingSystem) {
      const isFed = isPlayerFed(player, rules);
      const foodLabel = t('dashboard.food', { defaultValue: 'Food' });
      const fedStatusText = isFed
        ? t('dashboard.nutritionFed', { defaultValue: 'Fed' })
        : t('dashboard.nutritionUnfed', { defaultValue: 'Unfed' });
      lifeBadges.push({
        id: 'stat-nutrition',
        label: foodLabel,
        value: fedStatusText,
        icon: isFed ? '🥗' : '🍽️',
        hoverText: isFed
          ? `${foodLabel}: ${fedStatusText} (${t('dashboard.dietFedDesc', { defaultValue: 'Fed for this week. Relaxing provides full recovery.' })})`
          : `${foodLabel}: ${fedStatusText} (${t('dashboard.dietUnfedDesc', { defaultValue: 'Prepare food at home or eat out before relaxing.' })})`,
        warning: !isFed,
        onClick: onOpenAttributeCard ? () => onOpenAttributeCard('nutrition') : undefined,
      });
    }

    if (rules.trackSocial) {
      const socLabel = t('dashboard.social', { defaultValue: 'Social' });
      lifeBadges.push({
        id: 'stat-social',
        label: socLabel,
        value: `${player.social ?? 9}/99`,
        icon: '👥',
        hoverText: `${socLabel}: ${player.social ?? 9} / 99`,
        onClick: onOpenAttributeCard ? () => onOpenAttributeCard('social') : undefined,
      });
    }

    if (rules.enableCaffeineSystem && rules.helpfulUI) {
      const tol = player.caffeineTolerance ?? 0;
      const intake = player.turnFlags?.caffeineIntake ?? 0;
      const buf = Math.max(0, intake - tol);
      const isDanger = intake > 20 || tol >= 9;
      const isWarning = intake >= 18 || tol >= 6;
      let badgeStatus: string | undefined;
      if (intake > 20) badgeStatus = 'Overdose';
      else if (buf >= 12) badgeStatus = 'Sprint';
      else if (buf > 0) badgeStatus = `+${buf} Buf`;
      else if (tol >= 6) badgeStatus = 'Withdrawal';
      else if (tol >= 3) badgeStatus = 'Fog';

      const cafLabel = t('dashboard.caffeine', { defaultValue: 'Caffeine' });
      const displayVal = buf > 0 ? `+${buf} (${tol} tol)` : `${tol}/10`;
      lifeBadges.push({
        id: 'stat-caffeine',
        label: cafLabel,
        value: displayVal,
        icon: '☕',
        hoverText: `${cafLabel}: Intake ${intake}, Tolerance ${tol}, Mistake Buffer +${buf}`,
        danger: isDanger,
        warning: isWarning,
        badge: badgeStatus,
        onClick: onOpenAttributeCard ? () => onOpenAttributeCard('caffeine') : undefined,
      });
    }
  } else {
    if (rules.helpfulUI) {
      const relaxationMax = player.relaxationMax ?? campaign?.config?.statRules?.maxRelaxation ?? 50;
      const displayRelaxation = relaxationMax ? `${player.relaxation}/${relaxationMax}` : `${player.relaxation}`;
      const relaxLabel = t('dashboard.relaxation', { defaultValue: 'Relaxation' });
      lifeBadges.push({
        id: 'stat-relaxation',
        label: relaxLabel,
        value: displayRelaxation,
        icon: '🛌',
        hoverText: `${relaxLabel}: ${Math.floor(player.relaxation || 0)} / ${relaxationMax}`,
        danger: Boolean(
          rules.enableRelaxationDoctor &&
            player.relaxation <= (rules.relaxationDoctorThreshold ?? 10)
        ),
        isActive: activeLogFilter === 'relaxation',
        onClick: onOpenAttributeCard
          ? () => onOpenAttributeCard('relaxation')
          : () => onFilterToggle?.('relaxation'),
      });
    }
  }

  // Combined badges for backwards compatibility
  const careerBadges: DashboardBadgeData[] = [
    ...goalBadges.filter(g => g.id === 'stat-career'),
    ...careerAttributes
  ];
  const allBadges: DashboardBadgeData[] = [victoryBadge, ...goalBadges, ...lifeBadges, ...careerAttributes];

  return {
    victoryBadge,
    goalBadges,
    careerAttributes,
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
