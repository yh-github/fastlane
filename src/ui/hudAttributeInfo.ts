import React from 'react';
import { type PlayerState, type GameState, isPlayerFed } from '../engine/gameState';
import type { GameRules } from '../engine/rules';
import type { CampaignBundle } from '../engine/dataLoader';
import type { GoalFilter } from '../utils/logCategorizer';
import {
  calcEducationProgress,
  calcCareerProgress,
  getJobCareerTier,
  getJobCareerCap,
  calcWealthProgress,
  calcWellbeingScore,
  calcEmployabilityScore,
  calcMaxDependability,
  calcMaxExperience,
  calcMaxSkillCap,
  formatHours,
} from '../engine/statMath';
import { calcLiquidAssets } from '../engine/economyEngine';

export interface HudAttributeInfo {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  currentValue: number | string;
  maxValue: number | string | null;
  currentFormatted: string;
  maxFormatted: string;
  percentage: number | null;
  statusBadge?: string;
  statusColor?: string;
  description: string;
  maxExplanation?: string;
  increases: string[];
  decreases: string[];
  logFilter: GoalFilter;
}

export interface BuildHudAttributeInfoParams {
  attributeId: string;
  player: PlayerState;
  rules: GameRules;
  gameState?: GameState;
  campaign?: CampaignBundle;
  turn: number;
  economicIndex?: number;
  economicReading?: number;
  economicTrend?: number;
  hoursPerTurn?: number;
  t?: (key: string, options?: any) => string;
}

export function getHudAttributeInfo(params: BuildHudAttributeInfoParams): HudAttributeInfo {
  const {
    attributeId,
    player,
    rules,
    gameState,
    campaign,
    turn,
    economicIndex = 0,
    economicReading,
    economicTrend,
    hoursPerTurn = campaign?.config.timeRules.hoursPerTurn ?? 50,
    t = ((key: string, opt?: any) => opt?.defaultValue || key)
  } = params;

  // Normalize id
  const normId = attributeId.replace(/^stat-/, '').replace(/_|-/g, '');

  const readingVal = economicReading ?? gameState?.economicReading ?? economicIndex;
  const trendVal = economicTrend ?? gameState?.economicTrend ?? 0;
  const formattedReading = readingVal > 0 ? `+${readingVal}` : `${readingVal}`;
  const trendArrow = trendVal > 0 ? '↑' : trendVal < 0 ? '↓' : '→';
  const formattedTrend = `${trendVal > 0 ? `+${trendVal}` : `${trendVal}`} ${trendArrow}`;

  const currentJob = player.currentJobId ? campaign?.jobs?.find(j => j.id === player.currentJobId) : null;
  const jobReqDep = currentJob ? currentJob.requirements.dependability : 0;
  const jobReqExp = currentJob ? currentJob.requirements.experience : 0;
  const maxDep = calcMaxDependability(jobReqDep, player.degreeDepBoost || 0, player.depMaxBonus || 0);
  const maxExp = calcMaxExperience(jobReqExp, player.degreeExpBoost || 0, player.xpMaxBonus || 0);

  const education = calcEducationProgress(player.degrees?.length || 0);
  const statRules = campaign?.config?.statRules;
  const career = calcCareerProgress(player.dependability || 0, player.currentJobId !== null, {
    job: currentJob,
    allJobs: campaign?.jobs,
    raisesAtCurrentJob: player.raisesAtCurrentJob,
    rules,
    statRules,
  });
  const hasEarnedIncome = player.hasEarnedIncome ?? (turn > 1 || !!player.turnFlags?.hasWorked);
  const liquidAssets = calcLiquidAssets(player, campaign, economicIndex, turn, gameState?.economySimulation);
  const wealth = calcWealthProgress(liquidAssets, hasEarnedIncome);
  const lifestyle = player.lifestyle || 0;
  const wellbeing = calcWellbeingScore(player.physicalCondition ?? 50, player.mentalCondition ?? 25);
  const employabilityScore = calcEmployabilityScore(
    player.dependability || 0,
    player.experience || 0,
    player.degrees?.length || 0,
    0,
    player.social || 0
  );

  const maxMgmt = campaign?.education && statRules
    ? calcMaxSkillCap(player, 'skillMgmt', campaign.education, statRules, rules)
    : 30;
  const maxTech = campaign?.education && statRules
    ? calcMaxSkillCap(player, 'skillTech', campaign.education, statRules, rules)
    : 30;

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

  // Calculate overall victory
  const winConditions = campaign?.config.winConditions || [
    { stat: 'happiness', label: 'Happiness' },
    { stat: 'education', label: 'Education' },
    { stat: 'wealth', label: 'Wealth' },
    { stat: 'career', label: 'Career' },
  ];
  const statValues: Record<string, number> = {
    wealth,
    happiness: player.happiness,
    education,
    career,
    lifestyle,
    wellbeing,
  };
  let totalGoals = 0;
  let totalPoints = 0;
  for (const cond of winConditions) {
    const target = player.goalAllotment[cond.stat] || 0;
    const current = statValues[cond.stat] || 0;
    totalGoals += target;
    totalPoints += Math.min(current, target);
  }
  const victoryPercent = totalGoals > 0 ? Math.floor((totalPoints / totalGoals) * 100) : 0;

  switch (normId.toLowerCase()) {
    case 'money':
    case 'cash':
      return {
        id: 'money',
        name: t('stats.money', { defaultValue: 'Money (Cash on Hand)' }),
        category: t('hudInfo.categoryLife', { defaultValue: 'Life & Finances' }),
        icon: '💰',
        currentValue: player.money,
        maxValue: null,
        currentFormatted: `$${player.money.toLocaleString()}`,
        maxFormatted: t('hudInfo.noLimit', { defaultValue: 'No limit' }),
        percentage: null,
        description: t('hudInfo.moneyDesc', {
          defaultValue: 'Cash currently held in your wallet. It can be spent immediately at any location for food, rent, tuition, clothing, or investments.'
        }),
        maxExplanation: t('hudInfo.moneyMax', {
          defaultValue: 'There is no upper ceiling on the amount of cash you can hold. You can also deposit excess funds into First National Bank to earn weekly interest.'
        }),
        increases: [
          t('hudInfo.moneyInc1', { defaultValue: 'Working shifts at your employer to earn hourly wages' }),
          t('hudInfo.moneyInc2', { defaultValue: 'Pawning unwanted appliances, furniture, and valuables at the Pawn Shop' }),
          t('hudInfo.moneyInc3', { defaultValue: 'Taking a bank loan at First National Bank or withdrawing savings' }),
          t('hudInfo.moneyInc4', { defaultValue: 'Selling stock holdings for capital gains through the Broker' }),
          t('hudInfo.moneyInc5', { defaultValue: 'Winning scratch-off lottery ticket payouts' }),
        ],
        decreases: [
          t('hudInfo.moneyDec1', { defaultValue: 'Paying weekly rent at the Rent Office' }),
          t('hudInfo.moneyDec2', { defaultValue: 'Purchasing groceries, snacks, meals, and coffee' }),
          t('hudInfo.moneyDec3', { defaultValue: 'Tuition fees for university courses and diplomas' }),
          t('hudInfo.moneyDec4', { defaultValue: 'Purchasing clothing at QT Clothing or durables at Socket City' }),
          t('hudInfo.moneyDec5', { defaultValue: 'Loan interest and principal payments, or street muggings by Willy' }),
        ],
        logFilter: 'money',
      };

    case 'time':
    case 'hours':
    case 'clock':
    case 'clockdigital':
      return {
        id: 'time',
        name: t('stats.time', { defaultValue: 'Time (Hours Remaining)' }),
        category: t('hudInfo.categoryTurn', { defaultValue: 'Turn Resource' }),
        icon: '⏰',
        currentValue: player.hoursRemaining,
        maxValue: hoursPerTurn,
        currentFormatted: `${formatHours(player.hoursRemaining)} hrs`,
        maxFormatted: `${hoursPerTurn} hrs`,
        percentage: Math.max(0, Math.min(100, Math.round((player.hoursRemaining / hoursPerTurn) * 100))),
        statusBadge: player.hoursRemaining <= 5 ? t('hudInfo.hoursLow', { defaultValue: 'Low Hours' }) : undefined,
        statusColor: player.hoursRemaining <= 5 ? '#ff3333' : undefined,
        description: t('hudInfo.timeDesc', {
          defaultValue: 'Your remaining action budget for this week. Every action—traveling across town, working shifts, attending classes, shopping, or relaxing—consumes hours.'
        }),
        maxExplanation: t('hudInfo.timeMax', {
          defaultValue: `You receive ${hoursPerTurn} hours at the start of each new week after weekend recap.`
        }),
        increases: [
          t('hudInfo.timeInc1', { defaultValue: 'Hours are fully replenished to maximum at the start of every new week' }),
        ],
        decreases: [
          t('hudInfo.timeDec1', { defaultValue: 'Walking between nodes on the city map (1-2 hours per move)' }),
          t('hudInfo.timeDec2', { defaultValue: 'Working shifts at your workplace (usually 8-10 hours)' }),
          t('hudInfo.timeDec3', { defaultValue: 'Attending lectures and labs at Hi-Tech University (10 hours per class)' }),
          t('hudInfo.timeDec4', { defaultValue: 'Engaging in home leisure, cleaning chores, or socializing' }),
        ],
        logFilter: 'time',
      };

    case 'dependability':
      return {
        id: 'dependability',
        name: t('stats.dependability', { defaultValue: 'Dependability' }),
        category: t('hudInfo.categoryCareer', { defaultValue: 'Career Attribute' }),
        icon: '🤝',
        currentValue: player.dependability,
        maxValue: maxDep,
        currentFormatted: `${Math.floor(player.dependability)}`,
        maxFormatted: `${maxDep}`,
        percentage: maxDep > 0 ? Math.min(100, Math.round((player.dependability / maxDep) * 100)) : 100,
        description: t('hudInfo.dependabilityDesc', {
          defaultValue: 'Measures your workplace reliability, punctuality, and work ethic. Higher dependability protects against being fired and unlocks promotion opportunities.'
        }),
        maxExplanation: t('hudInfo.dependabilityMax', {
          defaultValue: `Capped at ${maxDep}. Your cap is set by your current job requirement (${jobReqDep}) plus degree boosts (+${player.degreeDepBoost || 0}) and career bonuses.`
        }),
        increases: [
          t('hudInfo.depInc1', { defaultValue: 'Working shifts consistently and showing up on time' }),
          t('hudInfo.depInc2', { defaultValue: 'Earning university degrees that permanently expand your dependability cap' }),
          t('hudInfo.depInc3', { defaultValue: 'Successfully completing workplace appraisal initiatives' }),
        ],
        decreases: [
          t('hudInfo.depDec1', { defaultValue: 'Natural weekly decay when taking excessive time off work' }),
          t('hudInfo.depDec2', { defaultValue: 'Working shifts while starving, fatigued, or in critical mental distress' }),
          t('hudInfo.depDec3', { defaultValue: 'Failing appraisal dilemmas or accumulating workplace demerits' }),
        ],
        logFilter: 'dependability',
      };

    case 'experience':
    case 'exp':
      return {
        id: 'experience',
        name: t('stats.experience', { defaultValue: 'Experience' }),
        category: t('hudInfo.categoryCareer', { defaultValue: 'Career Attribute' }),
        icon: '👌',
        currentValue: player.experience,
        maxValue: maxExp,
        currentFormatted: `${Math.floor(player.experience)}`,
        maxFormatted: `${maxExp}`,
        percentage: maxExp > 0 ? Math.min(100, Math.round((player.experience / maxExp) * 100)) : 100,
        description: t('hudInfo.experienceDesc', {
          defaultValue: 'Practical on-the-job mastery. Required to meet qualifications for senior careers and advanced vocational tracks.'
        }),
        maxExplanation: t('hudInfo.experienceMax', {
          defaultValue: `Capped at ${maxExp}. Your cap scales with your current job tier and is boosted by completing university degrees.`
        }),
        increases: [
          t('hudInfo.expInc1', { defaultValue: 'Clocking in and working shifts at your workplace' }),
          t('hudInfo.expInc2', { defaultValue: 'Resolving work shift challenges and technical appraisals' }),
          t('hudInfo.expInc3', { defaultValue: 'Graduating from relevant university curricula' }),
        ],
        decreases: [
          t('hudInfo.expDec1', { defaultValue: 'Experience never decays over time; it is permanently retained up to your cap' }),
        ],
        logFilter: 'experience',
      };

    case 'employability':
      return {
        id: 'employability',
        name: t('stats.employability', { defaultValue: 'Employability' }),
        category: t('hudInfo.categoryCareer', { defaultValue: 'Career Metric' }),
        icon: '👨‍💼',
        currentValue: employabilityScore,
        maxValue: 100,
        currentFormatted: `${employabilityScore}%`,
        maxFormatted: '100%',
        percentage: employabilityScore,
        description: t('hudInfo.employabilityDesc', {
          defaultValue: 'Composite rating of your overall attractiveness to employers. Determines your hiring odds when applying for jobs and your odds of receiving pay raises.'
        }),
        maxExplanation: t('hudInfo.employabilityMax', {
          defaultValue: 'Calculated from Dependability, Experience, Degrees earned, Social Standing, and wearing appropriate workplace attire.'
        }),
        increases: [
          t('hudInfo.empInc1', { defaultValue: 'Raising your Dependability and Experience stats' }),
          t('hudInfo.empInc2', { defaultValue: 'Earning Trade School certificates and University degrees' }),
          t('hudInfo.empInc3', { defaultValue: 'Wearing Business or Dress clothes from QT Clothing' }),
          t('hudInfo.empInc4', { defaultValue: 'Cultivating positive Social Standing in the community' }),
        ],
        decreases: [
          t('hudInfo.empDec1', { defaultValue: 'Applying without meeting minimum job requirements' }),
          t('hudInfo.empDec2', { defaultValue: 'Wearing casual clothes, ragged clothes, or arriving naked' }),
          t('hudInfo.empDec3', { defaultValue: 'Suffering workplace demerits, terminations, or poor social standing' }),
        ],
        logFilter: 'employability',
      };

    case 'skilltech':
    case 'tech':
      return {
        id: 'skillTech',
        name: t('stats.skillTech', { defaultValue: 'Tech Skill' }),
        category: t('hudInfo.categorySkill', { defaultValue: 'Specialized Skill' }),
        icon: '🔧',
        currentValue: player.skillTech ?? 0,
        maxValue: maxTech,
        currentFormatted: `${(player.skillTech ?? 0).toFixed(2)}`,
        maxFormatted: `${maxTech.toFixed(1)}`,
        percentage: maxTech > 0 ? Math.min(100, Math.round(((player.skillTech ?? 0) / maxTech) * 100)) : 0,
        description: t('hudInfo.skillTechDesc', {
          defaultValue: 'Proficiency with electronics, hardware, coding, and mechanical systems. Unlocks high-paying technical careers and freelance computer repairs.'
        }),
        maxExplanation: t('hudInfo.skillTechMax', {
          defaultValue: `Maximum cap is ${maxTech.toFixed(1)}. Expand your cap by completing technical courses and degrees at Hi-Tech University.`
        }),
        increases: [
          t('hudInfo.techInc1', { defaultValue: 'Studying Electronics and Computer Science at Hi-Tech University' }),
          t('hudInfo.techInc2', { defaultValue: 'Working shifts at technical job positions' }),
          t('hudInfo.techInc3', { defaultValue: 'Tinkering with home PCs and repairing household appliances' }),
        ],
        decreases: [
          t('hudInfo.techDec1', { defaultValue: 'Slowly decays if unused for extended periods' }),
        ],
        logFilter: 'skillTech',
      };

    case 'skillmgmt':
    case 'mgmt':
    case 'leadership':
      return {
        id: 'skillMgmt',
        name: t('stats.skillMgmt', { defaultValue: 'Leadership / Management' }),
        category: t('hudInfo.categorySkill', { defaultValue: 'Specialized Skill' }),
        icon: '👔',
        currentValue: player.skillMgmt ?? 0,
        maxValue: maxMgmt,
        currentFormatted: `${(player.skillMgmt ?? 0).toFixed(2)}`,
        maxFormatted: `${maxMgmt.toFixed(1)}`,
        percentage: maxMgmt > 0 ? Math.min(100, Math.round(((player.skillMgmt ?? 0) / maxMgmt) * 100)) : 0,
        description: t('hudInfo.skillMgmtDesc', {
          defaultValue: 'Management, leadership, and supervisory aptitude. Crucial for qualifying for corporate management, executive roles, and appraisal negotiations.'
        }),
        maxExplanation: t('hudInfo.skillMgmtMax', {
          defaultValue: `Maximum cap is ${maxMgmt.toFixed(1)}. Increase your cap by completing Business Administration and Management degrees.`
        }),
        increases: [
          t('hudInfo.mgmtInc1', { defaultValue: 'Enrolling in Business Administration coursework at the University' }),
          t('hudInfo.mgmtInc2', { defaultValue: 'Leading workplace initiatives and handling managerial dilemmas' }),
          t('hudInfo.mgmtInc3', { defaultValue: 'Working supervisory shifts at corporate employers' }),
        ],
        decreases: [
          t('hudInfo.mgmtDec1', { defaultValue: 'Decays over turns without managerial practice or leadership duties' }),
        ],
        logFilter: 'skillMgmt',
      };

    case 'physical':
    case 'physicalcondition':
      return {
        id: 'physical',
        name: t('stats.physical', { defaultValue: 'Physical Condition' }),
        category: t('hudInfo.categoryLife', { defaultValue: 'Health & Vitality' }),
        icon: '💪',
        currentValue: player.physicalCondition || 0,
        maxValue: player.physicalConditionMax || 50,
        currentFormatted: `${Math.floor(player.physicalCondition || 0)}`,
        maxFormatted: `${player.physicalConditionMax || 50}`,
        percentage: Math.min(100, Math.round(((player.physicalCondition || 0) / (player.physicalConditionMax || 50)) * 100)),
        statusBadge: isPhysicalCritical
          ? t('hudInfo.critical', { defaultValue: 'Critical' })
          : isPhysicalWarning
          ? t('hudInfo.warning', { defaultValue: 'Warning' })
          : undefined,
        statusColor: isPhysicalCritical ? '#ff3333' : isPhysicalWarning ? '#e67e22' : undefined,
        description: t('hudInfo.physicalDesc', {
          defaultValue: 'Your bodily energy, health, and stamina. If your condition drops into critical levels, you risk medical collapse, doctor bills, and work penalties.'
        }),
        maxExplanation: t('hudInfo.physicalMax', {
          defaultValue: `Maximum vitality is ${player.physicalConditionMax || 50}. Neglect or starvation can reduce your maximum cap until treated.`
        }),
        increases: [
          t('hudInfo.physInc1', { defaultValue: 'Eating nutritious fresh meals from stores or fast food from Monolith Burgers' }),
          t('hudInfo.physInc2', { defaultValue: 'Sleeping and resting in comfortable apartment beds' }),
          t('hudInfo.physInc3', { defaultValue: 'Visiting the doctor clinic or fitness center for medical restoration' }),
        ],
        decreases: [
          t('hudInfo.physDec1', { defaultValue: 'Starvation from going without meals' }),
          t('hudInfo.physDec2', { defaultValue: 'Overworking long shifts or manual labor shifts' }),
          t('hudInfo.physDec3', { defaultValue: 'Living in squalor or high apartment mess' }),
          t('hudInfo.physDec4', { defaultValue: 'Physical assault during street robberies' }),
        ],
        logFilter: 'physical',
      };

    case 'mental':
    case 'mentalcondition':
      return {
        id: 'mental',
        name: t('stats.mental', { defaultValue: 'Mental Condition' }),
        category: t('hudInfo.categoryLife', { defaultValue: 'Health & Morale' }),
        icon: '🧠',
        currentValue: player.mentalCondition || 0,
        maxValue: player.mentalConditionMax || 50,
        currentFormatted: `${Math.floor(player.mentalCondition || 0)}`,
        maxFormatted: `${player.mentalConditionMax || 50}`,
        percentage: Math.min(100, Math.round(((player.mentalCondition || 0) / (player.mentalConditionMax || 50)) * 100)),
        statusBadge: isMentalCritical
          ? t('hudInfo.critical', { defaultValue: 'Critical' })
          : isMentalWarning
          ? t('hudInfo.warning', { defaultValue: 'Warning' })
          : undefined,
        statusColor: isMentalCritical ? '#ff3333' : isMentalWarning ? '#e67e22' : undefined,
        description: t('hudInfo.mentalDesc', {
          defaultValue: 'Psychological well-being, focus, and stress resistance. Low morale causes burnout, work mistakes, and demerits.'
        }),
        maxExplanation: t('hudInfo.mentalMax', {
          defaultValue: `Maximum mental capacity is ${player.mentalConditionMax || 50}. Persistent stress or caffeine crashes can depress this cap.`
        }),
        increases: [
          t('hudInfo.menInc1', { defaultValue: 'Leisure activities at home: listening to stereo, watching TV, or reading books' }),
          t('hudInfo.menInc2', { defaultValue: 'Relaxing weekend getaways and social entertainment' }),
          t('hudInfo.menInc3', { defaultValue: 'Maintaining a clean, comfortable, and well-furnished apartment' }),
        ],
        decreases: [
          t('hudInfo.menDec1', { defaultValue: 'Workplace stress, appraisals, and long work hours' }),
          t('hudInfo.menDec2', { defaultValue: 'Caffeine withdrawal, fog, and crash effects' }),
          t('hudInfo.menDec3', { defaultValue: 'Debt pressure from overdue loans or pending rent eviction' }),
          t('hudInfo.menDec4', { defaultValue: 'Trauma from muggings or living in dirty apartments' }),
        ],
        logFilter: 'mental',
      };

    case 'nutrition':
    case 'diet': {
      const isFed = isPlayerFed(player, rules);
      const currentVal = isFed
        ? t('dashboard.nutritionFed', { defaultValue: 'Fed' })
        : t('dashboard.nutritionUnfed', { defaultValue: 'Unfed' });
      const freshUnits = player.inventory?.freshFoodUnits || 0;
      const cannedUnits = player.inventory?.cannedFoodUnits || 0;
      return {
        id: 'nutrition',
        name: t('dashboard.food', { defaultValue: 'Food & Nutrition' }),
        category: t('hudInfo.categoryLife', { defaultValue: 'Physical & Mental Health' }),
        icon: isFed ? '🥗' : '🍽️',
        currentValue: currentVal,
        maxValue: null,
        currentFormatted: currentVal,
        maxFormatted: '',
        percentage: null,
        statusBadge: isFed ? '✓ Fed' : 'Unfed',
        statusColor: isFed ? '#10b981' : '#f59e0b',
        description: t('hudAttribute.dietDesc', {
          defaultValue:
            'Dietary sustenance for the week. In Advanced 2000, possessing food in cupboards is not enough—you must prepare and eat meals (or dine out) before relaxing. Relaxing while unfed inflicts permanent exhaustion damage (-1 Max Physical & Mental capacity).'
        }),
        maxExplanation: `Pantry supplies at home: ${freshUnits} Fresh Groceries, ${cannedUnits} Canned Provisions.`,
        increases: [
          'Prepare Fresh Food at Home (Stove: Net +1.5 Physical, +2.0 Mental)',
          'Microwave Fresh Food (Microwave: +0.5 Physical, +1.0 Mental)',
          'Cold Meal (Sandwich & Salad: +0.5 Mental)',
          'Dine at Fast Food Restaurant or Hospital Cafeteria',
          'Heat Canned Rations (-1.5 Mental, emergency survival)',
        ],
        decreases: [
          'Unfed Relaxing (-1 Max Physical & -1 Max Mental per turn unfed)',
          'Consecutive Canned Diet (-1 Max Physical per subsequent week)',
        ],
        logFilter: 'physical' as GoalFilter,
      };
    }

    case 'social':
      return {
        id: 'social',
        name: t('stats.social', { defaultValue: 'Social Standing' }),
        category: t('hudInfo.categoryLife', { defaultValue: 'Community Status' }),
        icon: '👥',
        currentValue: player.social ?? 9,
        maxValue: 99,
        currentFormatted: `${player.social ?? 9}`,
        maxFormatted: '99',
        percentage: Math.min(100, Math.round(((player.social ?? 9) / 99) * 100)),
        description: t('hudInfo.socialDesc', {
          defaultValue: 'Your reputation and connection with the city community. Buffers against dependability decay and boosts interview success.'
        }),
        maxExplanation: t('hudInfo.socialMax', {
          defaultValue: 'Social standing is tracked on a 0-99 scale.'
        }),
        increases: [
          t('hudInfo.socInc1', { defaultValue: 'Hosting visitors or chatting on your apartment porch' }),
          t('hudInfo.socInc2', { defaultValue: 'Participating in community weekend gatherings and festivals' }),
          t('hudInfo.socInc3', { defaultValue: 'Wearing sharp dress or business clothes from QT Clothing' }),
          t('hudInfo.socInc4', { defaultValue: 'Making charitable contributions and civic donations' }),
        ],
        decreases: [
          t('hudInfo.socDec1', { defaultValue: 'Walking around the streets in rags or naked' }),
          t('hudInfo.socDec2', { defaultValue: 'Isolating yourself and neglecting relationships over many turns' }),
          t('hudInfo.socDec3', { defaultValue: 'Negative random events and public controversies' }),
        ],
        logFilter: 'social',
      };

    case 'caffeine':
      const tol = player.caffeineTolerance ?? 0;
      const intake = player.turnFlags?.caffeineIntake ?? 0;
      const buf = Math.max(0, intake - tol);
      const nextTol = Math.floor((tol + intake) / 2);
      return {
        id: 'caffeine',
        name: t('stats.caffeineTolerance', { defaultValue: 'Caffeine Tolerance' }),
        category: t('hudInfo.categoryLife', { defaultValue: 'Habit & Fatigue' }),
        icon: '☕',
        currentValue: tol,
        maxValue: 10,
        currentFormatted: buf > 0 ? `+${buf} (Tol ${tol})` : `${tol}`,
        maxFormatted: '10',
        percentage: Math.min(100, Math.round((tol / 10) * 100)),
        statusBadge: intake > 20
          ? t('hudInfo.caffeineOverdose', { defaultValue: 'Overdose (>20)' })
          : (buf >= 12
          ? t('hudInfo.caffeineSprint', { defaultValue: 'Wired (Sprint)' })
          : (buf > 0
          ? t('hudInfo.caffeineShield', { defaultValue: `Shield +${buf}` })
          : (tol >= 6
          ? t('hudInfo.caffeineWithdrawal', { defaultValue: 'Withdrawal' })
          : (tol >= 3 ? t('hudInfo.caffeineFog', { defaultValue: 'Brain Fog' }) : undefined)))),
        statusColor: intake > 20 ? '#ff3333' : (buf > 0 ? '#2ecc71' : (tol >= 6 ? '#e67e22' : undefined)),
        description: t('hudInfo.caffeineDesc', {
          defaultValue: `Weekly Intake: ${intake} | Tolerance: ${tol} | Net Mistake Buffer: +${buf}. Projected Next Turn Tolerance: ${nextTol}.`
        }),
        maxExplanation: t('hudInfo.caffeineMax', {
          defaultValue: 'Mistake Buffer = max(0, Intake - Tolerance). Tolerance reduces buffer point-for-point. Intake > 20 causes Overdose, damaging Max Physical and Max Mental.'
        }),
        increases: [
          t('hudInfo.cafInc1', { defaultValue: 'Consuming weekly coffee rations increases Intake (Drip +10, Espresso +18, Double Shot +28)' }),
          t('hudInfo.cafInc2', { defaultValue: 'Tolerance updates at turn boundary: floor((Tolerance + Intake) / 2)' }),
        ],
        decreases: [
          t('hudInfo.cafDec1', { defaultValue: 'Refraining from coffee (0 intake) halves tolerance at turn boundary: floor(Tolerance / 2)' }),
        ],
        logFilter: 'caffeine',
      };

    case 'relaxation':
      const relaxationMax = player.relaxationMax ?? campaign?.config?.statRules?.maxRelaxation ?? 50;
      const isRelaxCritical = rules.enableRelaxationDoctor && (player.relaxation || 0) <= (rules.relaxationDoctorThreshold ?? 10);
      return {
        id: 'relaxation',
        name: t('stats.relaxation', { defaultValue: 'Relaxation' }),
        category: t('hudInfo.categoryLife', { defaultValue: 'Stress Resilience' }),
        icon: '🛌',
        currentValue: player.relaxation || 0,
        maxValue: relaxationMax,
        currentFormatted: `${Math.floor(player.relaxation || 0)}`,
        maxFormatted: `${relaxationMax}`,
        percentage: relaxationMax > 0 ? Math.min(100, Math.round(((player.relaxation || 0) / relaxationMax) * 100)) : 100,
        statusBadge: isRelaxCritical ? t('hudInfo.critical', { defaultValue: 'Doctor Risk' }) : undefined,
        statusColor: isRelaxCritical ? '#ff3333' : undefined,
        description: t('hudInfo.relaxationDesc', {
          defaultValue: 'Classic stress buffer metric. Falling below the safety threshold forces emergency medical care and hospital expenses.'
        }),
        maxExplanation: t('hudInfo.relaxationMax', {
          defaultValue: `Max relaxation is ${relaxationMax}.`
        }),
        increases: [
          t('hudInfo.relInc1', { defaultValue: 'Relaxing at home with entertainment appliances (stereo, TV, books)' }),
          t('hudInfo.relInc2', { defaultValue: 'Selecting leisure activities during weekend recap' }),
          t('hudInfo.relInc3', { defaultValue: 'Taking time off between strenuous work shifts' }),
        ],
        decreases: [
          t('hudInfo.relDec1', { defaultValue: 'Working long shifts, traveling in bad weather, or suffering muggings' }),
          t('hudInfo.relDec2', { defaultValue: 'Accumulating unpaid debts and overdue rent' }),
        ],
        logFilter: 'relaxation',
      };

    case 'wealth':
      const targetWealth = player.goalAllotment.wealth || 0;
      return {
        id: 'wealth',
        name: t('dashboard.wealth', { defaultValue: 'Wealth Goal' }),
        category: t('hudInfo.categoryGoal', { defaultValue: 'Victory Condition' }),
        icon: '🤑',
        currentValue: wealth,
        maxValue: targetWealth,
        currentFormatted: `${wealth}`,
        maxFormatted: `${targetWealth}`,
        percentage: targetWealth > 0 ? Math.min(100, Math.round((wealth / targetWealth) * 100)) : 100,
        description: t('hudInfo.wealthDesc', {
          defaultValue: 'Your financial milestone toward winning the game. Reflects liquid assets, net worth, savings, and investments.'
        }),
        maxExplanation: t('hudInfo.wealthMax', {
          defaultValue: `Target: Reach ${targetWealth} wealth points to complete this victory goal.`
        }),
        increases: [
          t('hudInfo.wltInc1', { defaultValue: 'Accumulating cash and building up bank savings' }),
          t('hudInfo.wltInc2', { defaultValue: 'Purchasing appreciating stocks through the Broker' }),
          t('hudInfo.wltInc3', { defaultValue: 'Acquiring durable furnishings and household assets' }),
        ],
        decreases: [
          t('hudInfo.wltDec1', { defaultValue: 'Outstanding bank loans and unpaid rent debts decrease net liquid assets' }),
        ],
        logFilter: 'wealth',
      };

    case 'happiness':
      const targetHappiness = player.goalAllotment.happiness || 0;
      return {
        id: 'happiness',
        name: t('dashboard.happiness', { defaultValue: 'Happiness Goal' }),
        category: t('hudInfo.categoryGoal', { defaultValue: 'Victory Condition' }),
        icon: '😊',
        currentValue: player.happiness || 0,
        maxValue: targetHappiness,
        currentFormatted: `${player.happiness || 0}`,
        maxFormatted: `${targetHappiness}`,
        percentage: targetHappiness > 0 ? Math.min(100, Math.round(((player.happiness || 0) / targetHappiness) * 100)) : 100,
        description: t('hudInfo.happinessDesc', {
          defaultValue: 'Your personal satisfaction and quality of life milestone toward victory.'
        }),
        maxExplanation: t('hudInfo.happinessMax', {
          defaultValue: `Target: Reach ${targetHappiness} happiness points to complete this victory goal.`
        }),
        increases: [
          t('hudInfo.hapInc1', { defaultValue: 'Purchasing clothes, appliances, and home entertainment' }),
          t('hudInfo.hapInc2', { defaultValue: 'Dining out at restaurants and enjoying weekend recreation' }),
          t('hudInfo.hapInc3', { defaultValue: 'Achieving career and educational milestones' }),
        ],
        decreases: [
          t('hudInfo.hapDec1', { defaultValue: 'Starvation, eviction threats, muggings, and untreated illness' }),
        ],
        logFilter: 'happiness',
      };

    case 'education':
      const targetEducation = player.goalAllotment.education || 0;
      return {
        id: 'education',
        name: t('dashboard.education', { defaultValue: 'Education Goal' }),
        category: t('hudInfo.categoryGoal', { defaultValue: 'Victory Condition' }),
        icon: '🎓',
        currentValue: education,
        maxValue: targetEducation,
        currentFormatted: `${education}`,
        maxFormatted: `${targetEducation}`,
        percentage: targetEducation > 0 ? Math.min(100, Math.round((education / targetEducation) * 100)) : 100,
        description: t('hudInfo.educationDesc', {
          defaultValue: 'Your academic attainment goal. Earn certificates and diplomas from Hi-Tech University to fulfill this milestone.'
        }),
        maxExplanation: t('hudInfo.educationMax', {
          defaultValue: `Target: Complete ${targetEducation} degree milestones to satisfy this victory condition.`
        }),
        increases: [
          t('hudInfo.eduInc1', { defaultValue: 'Enrolling in and completing course sequences at Hi-Tech University' }),
          t('hudInfo.eduInc2', { defaultValue: 'Graduating from Trade School, Junior College, and University faculties' }),
        ],
        decreases: [
          t('hudInfo.eduDec1', { defaultValue: 'Degrees never expire once earned' }),
        ],
        logFilter: 'education',
      };

    case 'career': {
      const targetCareer = player.goalAllotment.career || 0;
      const isTiered = !!rules?.tieredCareerGoal;
      const tier = currentJob ? getJobCareerTier(currentJob, campaign?.jobs) : 0;
      const tierCap = currentJob ? getJobCareerCap(currentJob, campaign?.jobs, statRules) : 0;
      return {
        id: 'career',
        name: t('dashboard.career', { defaultValue: 'Career Goal' }),
        category: t('hudInfo.categoryGoal', { defaultValue: 'Victory Condition' }),
        icon: '💼',
        currentValue: career,
        maxValue: targetCareer,
        currentFormatted: `${career}`,
        maxFormatted: `${targetCareer}`,
        percentage: targetCareer > 0 ? Math.min(100, Math.round((career / targetCareer) * 100)) : 100,
        description: isTiered
          ? t('hudInfo.careerTieredDesc', {
              defaultValue: 'Your professional career achievement milestone. Capped by your current job tier (25/45/65/85/100) and boosted by dependability & raises.'
            })
          : t('hudInfo.careerDesc', {
              defaultValue: 'Your professional career achievement milestone. Advance in the workforce and build dependability to reach victory.'
            }),
        maxExplanation: isTiered
          ? (currentJob
              ? t('hudInfo.careerTieredMax', {
                  defaultValue: `Current Job: Tier ${tier}/5 (Max ${tierCap} pts). Target: ${targetCareer} career points.`
                })
              : t('hudInfo.careerTieredUnemployed', {
                  defaultValue: `Unemployed (0 pts). Target: ${targetCareer} career points.`
                }))
          : t('hudInfo.careerMax', {
              defaultValue: `Target: Reach ${targetCareer} career points to complete this victory goal.`
            }),
        increases: isTiered
          ? [
              t('hudInfo.carTieredInc1', { defaultValue: 'Getting hired into higher-tier jobs (Tier 1–5 unlock caps of 25/45/65/85/100)' }),
              t('hudInfo.carTieredInc2', { defaultValue: 'Building Dependability and earning raises to reach your current tier cap' }),
            ]
          : [
              t('hudInfo.carInc1', { defaultValue: 'Holding a steady job and building high Dependability' }),
              t('hudInfo.carInc2', { defaultValue: 'Securing promotions to senior job tiers' }),
            ],
        decreases: [
          t('hudInfo.carDec1', { defaultValue: 'Being unemployed or suffering workplace demerits' }),
        ],
        logFilter: 'career',
      };
    }

    case 'lifestyle':
      const targetLifestyle = player.goalAllotment.lifestyle || 100;
      return {
        id: 'lifestyle',
        name: t('stat.lifestyle', { defaultValue: 'Lifestyle' }),
        category: t('hudInfo.categoryGoal', { defaultValue: 'Living Standard' }),
        icon: (player.lifestyle || 0) > 50 ? '🧐' : '😎',
        currentValue: lifestyle,
        maxValue: targetLifestyle,
        currentFormatted: `${Math.floor(lifestyle)}`,
        maxFormatted: `${targetLifestyle}`,
        percentage: targetLifestyle > 0 ? Math.min(100, Math.round((lifestyle / targetLifestyle) * 100)) : 0,
        description: t('hudInfo.lifestyleDesc', {
          defaultValue: 'Measures your living conditions, apartment prestige, durables, and furnishings.'
        }),
        maxExplanation: t('hudInfo.lifestyleMax', {
          defaultValue: `Target: ${targetLifestyle} lifestyle points.`
        }),
        increases: [
          t('hudInfo.lifeInc1', { defaultValue: 'Moving into higher-tier housing (Security Complex, Luxury Suites)' }),
          t('hudInfo.lifeInc2', { defaultValue: 'Purchasing appliances, stereos, and curios for your apartment' }),
          t('hudInfo.lifeInc3', { defaultValue: 'Keeping your apartment clean and well-maintained' }),
        ],
        decreases: [
          t('hudInfo.lifeDec1', { defaultValue: 'Downsizing to low-cost or slum housing' }),
          t('hudInfo.lifeDec2', { defaultValue: 'Allowing broken appliances to pile up in disrepair' }),
        ],
        logFilter: 'lifestyle',
      };

    case 'wellbeing':
      const targetWellbeing = player.goalAllotment.wellbeing || 0;
      return {
        id: 'wellbeing',
        name: t('dashboard.wellbeing', { defaultValue: 'Wellbeing Goal' }),
        category: t('hudInfo.categoryGoal', { defaultValue: 'Victory Condition' }),
        icon: '🧘',
        currentValue: wellbeing,
        maxValue: targetWellbeing,
        currentFormatted: `${wellbeing}`,
        maxFormatted: `${targetWellbeing}`,
        percentage: targetWellbeing > 0 ? Math.min(100, Math.round((wellbeing / targetWellbeing) * 100)) : 100,
        description: t('hudInfo.wellbeingDesc', {
          defaultValue: 'Harmonic balance between Physical condition and Mental condition in advanced rules.'
        }),
        maxExplanation: t('hudInfo.wellbeingMax', {
          defaultValue: `Target: Reach ${targetWellbeing} wellbeing points. Both Physical and Mental health must be nurtured; if either drops, your wellbeing suffers.`
        }),
        increases: [
          t('hudInfo.wbInc1', { defaultValue: 'Simultaneously maintaining high Physical condition and Mental morale' }),
          t('hudInfo.wbInc2', { defaultValue: 'Healthy eating, adequate sleep, and regular leisure recreation' }),
        ],
        decreases: [
          t('hudInfo.wbDec1', { defaultValue: 'Neglecting either physical health or psychological stress' }),
        ],
        logFilter: 'wellbeing',
      };

    case 'victory':
    case 'trophy':
      return {
        id: 'victory',
        name: t('dashboard.victory', { defaultValue: 'Victory Progress' }),
        category: t('hudInfo.categoryVictory', { defaultValue: 'Game Objective' }),
        icon: '🏆',
        currentValue: victoryPercent,
        maxValue: 100,
        currentFormatted: `${victoryPercent}%`,
        maxFormatted: '100%',
        percentage: victoryPercent,
        description: t('hudInfo.victoryDesc', {
          defaultValue: 'Overall progress toward winning the game across all assigned goal categories. Reach 100% to trigger victory!'
        }),
        maxExplanation: t('hudInfo.victoryMax', {
          defaultValue: `Aggregated from your progress in all assigned win conditions (${winConditions.map(w => w.label).join(', ')}).`
        }),
        increases: [
          t('hudInfo.vicInc1', { defaultValue: 'Advancing toward your Wealth, Happiness, Education, Career, Lifestyle, and Wellbeing goals' }),
        ],
        decreases: [
          t('hudInfo.vicDec1', { defaultValue: 'Losing points in uncompleted goal categories drops overall progress' }),
        ],
        logFilter: 'all',
      };

    case 'economy':
    case 'economicreading':
      return {
        id: 'economy',
        name: t('dashboard.economy', { defaultValue: 'Economic Climate' }),
        category: t('hudInfo.categoryEconomy', { defaultValue: 'Macroeconomic Index' }),
        icon: '📈',
        currentValue: readingVal,
        maxValue: 3,
        currentFormatted: `Reading: ${formattedReading} | Trend: ${formattedTrend}`,
        maxFormatted: 'Range [-3, +3]',
        percentage: Math.min(100, Math.max(0, Math.round(((readingVal + 3) / 6) * 100))),
        description: t('hudInfo.economyDesc', {
          defaultValue: 'Citywide macroeconomic climate affecting inflation, retail prices, stock valuations, and employment markets.'
        }),
        maxExplanation: t('hudInfo.economyMax', {
          defaultValue: 'Economic Reading ranges from -3 (recession/bargain prices) to +3 (boom/high inflation). The Trend shows current momentum direction.'
        }),
        increases: [
          t('hudInfo.ecoInc1', { defaultValue: 'Economic booms and inflation spikes drive prices and stock valuations higher' }),
        ],
        decreases: [
          t('hudInfo.ecoDec1', { defaultValue: 'Market contractions and deflation cool down retail prices' }),
        ],
        logFilter: 'wealth',
      };

    default:
      return {
        id: normId,
        name: t(`stats.${normId}`, { defaultValue: attributeId }),
        category: t('hudInfo.categoryGeneral', { defaultValue: 'Game Attribute' }),
        icon: '📊',
        currentValue: (player as any)[normId] ?? 0,
        maxValue: 100,
        currentFormatted: `${(player as any)[normId] ?? 0}`,
        maxFormatted: '100',
        percentage: null,
        description: t(`hudInfo.${normId}Desc`, { defaultValue: `Tracked attribute: ${attributeId}.` }),
        increases: [t('hudInfo.generalInc', { defaultValue: 'Relevant game activities and events' })],
        decreases: [t('hudInfo.generalDec', { defaultValue: 'Costs and decay mechanisms' })],
        logFilter: (normId as GoalFilter) || 'all',
      };
  }
}
