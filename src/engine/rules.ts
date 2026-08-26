/**
 * rules.ts — Single source of truth for game rules, rule interfaces, and default values.
 *
 * This file defines all the configurable rules across campaigns, including optional rules,
 * economic multipliers, time rules, and their fallback defaults.
 */

export interface GameRules {
  /**
   * If true, warns at 1 month rent debt and evicts from apartment at >2 months debt.
   * Classic Floppy/CD-ROM: false (lenient). QoL Improved: true.
   */
  strictEviction: boolean;

  /**
   * Rent rates adjust dynamically with the economic index.
   * Classic Floppy/CD-ROM: false. QoL Improved: false.
   */
  fluctuatingRent: boolean;

  /**
   * If true, all clothing types in inventory decay by 1 week every turn. If false, only worn clothing decays.
   * Classic Floppy/CD-ROM: true. QoL Improved: true.
   */
  clothingDecaysAll: boolean;

  /**
   * Automatically selects and equips the best available clothes in inventory for your job.
   * Classic Floppy/CD-ROM: true. QoL Improved: true.
   */
  autoEquipBestClothes: boolean;

  /**
   * Uses the original stock market price calculations.
   * Classic Floppy/CD-ROM: true. QoL Improved: true.
   */
  classicStockMarket: boolean;

  /**
   * Allows studying/working for whatever hours are left even if it is less than a full session.
   * Classic Floppy/CD-ROM: true. QoL Improved: true.
   */
  allowPartialHours: boolean;

  /**
   * Enables mandatory doctor visits if relaxation decays too far.
   * Classic Floppy/CD-ROM: true. QoL Improved: true.
   */
  enableRelaxationDoctor: boolean;

  /**
   * Requires having a job to qualify for a bank loan.
   * Classic Floppy/CD-ROM: true. QoL Improved: true.
   */
  requireJobForLoan: boolean;

  /**
   * If true, displays exact prices, transaction fees, and loan costs in the UI.
   * Classic Floppy/CD-ROM: false. QoL Improved: true.
   */
  helpfulUI: boolean;

  /**
   * Enables money transaction popups and other UI animations.
   * Classic Floppy/CD-ROM: false. QoL Improved: true.
   */
  enableAnimations: boolean;

  /**
   * Allows progression metrics to go beyond 100% (useful for scoring or AI optimization).
   * Classic Floppy/CD-ROM: false. QoL Improved: true.
   */
  allowOverAchievingGoals: boolean;

  /**
   * If true, a mandatory doctor visit is bypassed without penalty if you have no cash/savings.
   * Classic Floppy/CD-ROM: true. QoL Improved: false.
   */
  bypassDoctorIfBroke: boolean;

  /**
   * The relaxation level below which the doctor event triggers.
   * Classic Floppy/CD-ROM: 10. QoL Improved: 10.
   */
  relaxationDoctorThreshold?: number;

  /**
   * If true, prevents built-in appliances (like refrigerators) from being stolen during apartment robberies.
   * Classic Floppy/CD-ROM: false. QoL Improved: false.
   */
  protectBuiltInAppliances?: boolean;

  /**
   * Allows paying rent manually at any time if you are employed at the same building (the Rent Office).
   * Classic Floppy/CD-ROM: false. QoL Improved: false.
   */
  allowEmployedRentPayment?: boolean;

  /**
   * If true, completing a 3-book set requires waiting until the next turn for the lesson discount.
   * Classic Floppy/CD-ROM: true. QoL Improved: false.
   */
  delayBookSetCredit?: boolean;

  /**
   * If true, allows eating spoiled/expired food (potentially with happiness penalties).
   */
  allowEatingSpoiledFood?: boolean;

  /**
   * Reduces the stat padding given by degrees from +5 to +2 for current and max Dep/Exp.
   */
  reducedDegreeStatBonus?: boolean;

  /**
   * Maximum number of courses a player can be concurrently enrolled in.
   * Classic Floppy/CD-ROM: 4.
   */
  maxEnrolledClasses?: number;

  /**
   * If true, displays item graphics next to items in menus and inventory.
   */
  showItemImages?: boolean;

  /**
   * ADVANCED: If true, apartment robberies are based on a 4-week moving average of time spent at home.
   */
  useHomeTimeRobbery?: boolean;

  /**
   * ADVANCED: If true, the game tracks Physical and Mental Condition separately instead of a single Relaxation stat.
   */
  usePhysicalMentalConditions?: boolean;

  /**
   * The lowest possible value the economic index (reading) can reach.
   */
  minEconomicReading?: number;

  /**
   * ADVANCED: If true, the player starts their turn at their home node.
   */
  turnStartAtHome?: boolean;

  /**
   * ADVANCED: If true, tracks 'Mess' at home, allowing cleaning.
   */
  trackMess?: boolean;

  /**
   * If true, stolen refrigerators/freezers don't cause immediate food rot on the turn of theft (1-week grace period).
   */
  delayRobberyFoodSpoilage?: boolean;

  /**
   * If true, unqualified job applications in early weeks (turns 1-4) return 'No openings' instead of explicit missing requirements.
   * Classic Floppy/CD-ROM: true. QoL / Advanced: false.
   */
  maskEarlyJobRejections?: boolean;

  /**
   * ADVANCED: If true, degree education is tracked on a 0-100% continuous progress scale instead of integer classes.
   */
  percentageEducation?: boolean;

  /**
   * ADVANCED: If true, continuous/divisible actions (Work, Study, Relax, Clean) scale gains and stamina costs proportionally when hours are below standard cost.
   */
  proportionalDivisibleActions?: boolean;

  /**
   * ADVANCED: Step resolution for physical and mental condition scores (default 0.5 for half points).
   */
  conditionResolution?: number;

  /**
   * ADVANCED: Decimal resolution for percentage education progress (default 0.1).
   */
  educationResolution?: number;
}

export interface EventRules {
  marketCrashDivisor: number;
  marketCrashThreshold?: number;
  economicBoomDivisor?: number;
  willyRobberyStartWeek: number;
  charity: {
    maxCash: number;
    maxWealth: number;
    wealthMetric: 'durableValue' | 'netWorth';
  };
}

/**
 * Ensures a required configuration property is defined. Throws an explicit error if missing.
 */
export function requireConfig<T>(value: T | undefined | null, name: string): T {
  if (value === undefined || value === null) {
    throw new Error(`Missing required configuration: ${name}`);
  }
  return value;
}

export interface StatRules {
  startingHappiness?: number;
  startingRelaxation: number;
  relaxationDecayRate: number;
  relaxationDoctorChance: number;
  
  // Advanced mechanics
  enableAdvancedStats?: boolean;
  mentalWarningThreshold?: number;
  physicalWarningThreshold?: number;
  startingPhysicalCondition?: number;
  startingMentalCondition?: number;
  minPhysicalCondition?: number;
  maxPhysicalCondition?: number;
  minMentalCondition?: number;
  maxMentalCondition?: number;
  globalMaxMentalCondition?: number;
  physicalDoctorThreshold?: number;
  physicalDoctorChancePerPoint?: number;
  lowSpiritsThreshold?: number;
  lowSpiritsChancePerPoint?: number;
  workGrindThreshold?: number;
  workGrindMentalCost?: number;
  workGrindPhysicalCost?: number;
  workPhysicalCost?: number;
  workNormalMentalCost?: number;
  workOvertimeThreshold?: number;
  workOvertimePhysicalCost?: number;
  workOvertimeMentalCost?: number;
  studyMentalCost?: number;
  studyNormalMentalCost?: number;
  studyNormalPhysicalCost?: number;
  studyGrindThreshold?: number;
  studyGrindMentalCost?: number;
  studyGrindPhysicalCost?: number;
  studyOvertimeThreshold?: number;
  studyOvertimeMentalCost?: number;
  studyOvertimePhysicalCost?: number;
  resilienceDropThreshold?: number;
  cleanPhysicalCost?: number;
  // Advanced feature bundle configuration
  initialPhysicalMax?: number;
  initialMinPhysical?: number;
  globalPhysicalMin?: number;
  minMaxPhysical?: number;
  globalMessMax?: number;
  lowCostMessMax?: number;
  securityMessMax?: number;
  initialMessMin?: number;
  globalMessMin?: number;
  startingSocial?: number;
  minSocial?: number;
  maxSocial?: number;
  relaxMessIncrease?: number;
  doctorPhysicalBounceBack?: number;
  lowSpiritsMentalBounceBack?: number;
  globalMaxPhysicalCondition?: number;
  mentalMaxBaseValue?: number;
  mentalMaxDegreeBonus?: number;
}

export interface WinCondition {
  stat: string;
  target: number;
  label: string;
}

export interface TimeRules {
  hoursPerTurn: number;
  buildingEntryCost: number;
  workSessionCost: number;
  studySessionCost: number;
  jobApplicationCost: number;
  relaxCost: number;
  relaxGain?: number;
  newspaperCost: number;
  starvationPenalty: number;
  doctorPenalty: number;
  burnoutPenalty?: number;
  loanCost: number;
  brokerCost: number;
  cleaningServiceCost?: number;
  socializeCost?: number;
}

export interface EconomyRules {
  rentGarnishRate: number;
  rentFee: number;
  repairCostMin: number;
  repairCostMax: number;
  pawnPayoutRate: number;
  pawnRedeemRate: number;
  bankTransactionIncrementSmall?: number;
  bankTransactionIncrementLarge?: number;
  loanPaymentAmount?: number;
  loanInterestAmount?: number;
  loanPrincipalAmount?: number;
  cleaningServiceBasePrice?: number;
  socializeLowCostCashCost?: number;
  socializeSecurityCashCost?: number;
  moveFeeMessThreshold?: number;
  moveFeeMessRate?: number;
  moveFeeDurableRate?: number;
}

/**
 * Default rules fallback used when a campaign does not explicitly specify a rule.
 */
export const DEFAULT_GAME_RULES: GameRules = {
  strictEviction: false,
  fluctuatingRent: false,
  clothingDecaysAll: true,
  autoEquipBestClothes: false,
  classicStockMarket: true,
  allowPartialHours: true,
  enableRelaxationDoctor: true,
  requireJobForLoan: true,
  helpfulUI: false,
  enableAnimations: false,
  allowOverAchievingGoals: true,
  bypassDoctorIfBroke: true,
  relaxationDoctorThreshold: 10,
  protectBuiltInAppliances: false,
  allowEmployedRentPayment: false,
  delayBookSetCredit: true,
  allowEatingSpoiledFood: true,
  reducedDegreeStatBonus: false,
  showItemImages: true,
  maxEnrolledClasses: 4,
  turnStartAtHome: false,
  delayRobberyFoodSpoilage: false,
  maskEarlyJobRejections: true,
};

/**
 * Human-readable descriptions for each rule (concise and without "If true," intros).
 */
export const RULE_DESCRIPTIONS: Record<string, string> = {
  strictEviction: 'Warns at 1 month rent debt and evicts from apartment at >2 months debt',
  fluctuatingRent: 'Rent rates adjust dynamically with economic index changes',
  clothingDecaysAll: 'All clothing in inventory decays by 1 week every turn (vs only worn clothing)',
  autoEquipBestClothes: 'Automatically equips best available clothes for current job',
  classicStockMarket: 'Uses original stock market price calculations',
  allowPartialHours: 'Allows studying/working for remaining hours even if less than full session',
  enableRelaxationDoctor: 'Triggers mandatory doctor visit if relaxation drops below threshold',
  requireJobForLoan: 'Requires holding a job to qualify for bank loan',
  helpfulUI: 'Displays exact prices, transaction fees, and loan costs in UI',
  enableAnimations: 'Enables money transaction popups and UI animations',
  allowOverAchievingGoals: 'Allows progression metrics to exceed 100%',
  bypassDoctorIfBroke: 'Bypasses mandatory doctor visit without penalty if player has no money',
  relaxationDoctorThreshold: 'Relaxation level threshold that triggers mandatory doctor event',
  protectBuiltInAppliances: 'Protects built-in appliances from theft during apartment burglaries',
  allowEmployedRentPayment: 'Allows paying rent manually at any time if employed at Rent Office',
  delayBookSetCredit: 'Requires waiting until next turn for 3-book set lesson discount',
  allowEatingSpoiledFood: 'Allows eating spoiled or expired food',
  reducedDegreeStatBonus: 'Reduces the Dependability and Experience boost from degrees from +5 to +2',
  showItemImages: 'Displays graphical icons for items in menus and inventory',
  delayRobberyFoodSpoilage: 'Grants a 1-week grace period before food rots when a refrigerator is stolen',
  maskEarlyJobRejections: 'Masks unqualified job applications as "No openings" during turns 1-4 (Original Floppy/CD-ROM behavior)',
  percentageEducation: 'Tracks degree progress on a 0-100% continuous progress scale',
  proportionalDivisibleActions: 'Scales gains and stamina costs proportionally for continuous actions (Work, Study, Relax, Clean)',
  conditionResolution: 'Step resolution for physical and mental condition scores (default 0.5 for half points)',
  educationResolution: 'Decimal precision for percentage degree progress (default 0.1)',

  marketCrashDivisor: 'Divisor applied to stock market values during market crash event',
  marketCrashThreshold: 'Minimum economic reading required for a market crash to trigger (default 60)',
  economicBoomDivisor: 'Divisor determining the frequency of economic boom events (default 50)',
  minEconomicReading: 'The lowest possible value the economic index (reading) can reach (-90 for Floppy, -30 for CD-ROM)',
  willyRobberyStartWeek: 'Game turn/week when Willy robbery events begin',
  'charity.maxCash': 'Maximum cash limit to remain eligible for charity payout',
  'charity.maxWealth': 'Maximum wealth limit to remain eligible for charity payout',
  'charity.wealthMetric': 'Wealth calculation metric for charity (durableValue vs netWorth)',
  
  useHomeTimeRobbery: 'Uses a moving average of time spent at home for robbery chances instead of relaxation',
  usePhysicalMentalConditions: 'Splits relaxation into detailed Physical and Mental conditions',
  turnStartAtHome: 'Forces the player to start their turn inside their apartment',
  trackMess: 'Enables tracking and cleaning of apartment mess',

  maxEnrolledClasses: 'Maximum number of courses a player can be concurrently enrolled in (set to 999 or high number for unlimited)',

  // TimeRules
  hoursPerTurn: 'Total number of hours available to the player per week (turn)',
  buildingEntryCost: 'Hours required to travel to and enter a location',
  workSessionCost: 'Hours required to complete a single work shift',
  studySessionCost: 'Hours required to complete a single study session',
  jobApplicationCost: 'Hours required to submit a job application',
  relaxCost: 'Hours required to perform a relaxation action',
  relaxGain: 'Amount of relaxation (or physical condition) gained per relax action',
  newspaperCost: 'Hours required to read the newspaper (look for jobs)',
  starvationPenalty: 'Time penalty (in hours) deducted next turn if the player fails to eat',
  doctorPenalty: 'Time penalty (in hours) deducted if a mandatory doctor visit is triggered',
  burnoutPenalty: 'Time penalty (in hours) deducted if mental health leave is taken for burnout',
  loanCost: 'Hours required to negotiate or process a bank loan',
  brokerCost: 'Hours required to visit the stock broker',

  // EconomyRules
  rentGarnishRate: 'Percentage of wages garnished if evicted with outstanding rent debt',
  rentFee: 'Percentage penalty applied when rent is overdue',
  repairCostMin: 'Minimum percentage cost (of purchase price) to repair a broken appliance',
  repairCostMax: 'Maximum percentage cost (of purchase price) to repair a broken appliance',
  pawnPayoutRate: 'Percentage of an item\'s value received when pawning it',
  pawnRedeemRate: 'Percentage of an item\'s value required to redeem it from the pawn shop',
  bankTransactionIncrementSmall: 'Small transaction increment for banking UI',
  bankTransactionIncrementLarge: 'Large transaction increment for banking UI',
  loanPaymentAmount: 'Fixed payment amount for bank loans',
  loanInterestAmount: 'Interest charged per turn on active loans',
  loanPrincipalAmount: 'Principal deducted per turn on active loans',

  // StatRules
  startingHappiness: 'Initial happiness score at the start of a campaign',
  startingRelaxation: 'Initial relaxation score at the start of a campaign',
  relaxationDecayRate: 'Amount of relaxation lost naturally per turn',
  relaxationDoctorChance: 'Probability of a doctor visit if relaxation is critically low',
  startingPhysicalCondition: 'Initial physical condition (if Advanced Stats enabled)',
  startingMentalCondition: 'Initial mental condition (if Advanced Stats enabled)',
  minPhysicalCondition: 'Absolute minimum physical condition',
  maxPhysicalCondition: 'Absolute maximum physical condition',
  minMentalCondition: 'Absolute minimum mental condition',
  maxMentalCondition: 'Default maximum mental condition (can be expanded by degrees)',
  globalMaxMentalCondition: 'Absolute maximum mental condition (hard cap)',
  physicalDoctorThreshold: 'Physical condition level that triggers potential doctor visits',
  physicalDoctorChancePerPoint: 'Probability of doctor visit per point below the physical threshold',
  lowSpiritsThreshold: 'Mental condition level that triggers Low Spirits penalty',
  lowSpiritsChancePerPoint: 'Probability of Low Spirits per point below the mental threshold',
  workGrindThreshold: 'Number of work shifts taken in a turn before Grind penalties apply (e.g. 4 means actions 4-7)',
  workGrindMentalCost: 'Mental condition lost per work shift during Grind',
  workGrindPhysicalCost: 'Physical condition lost per work shift during Grind',
  workPhysicalCost: 'Physical condition lost per standard work shift (actions 1-3)',
  workNormalMentalCost: 'Mental condition lost per standard work shift (actions 1-3)',
  workOvertimeThreshold: 'Number of work shifts taken in a turn before Overtime penalties apply (e.g. 8 means action 8+)',
  workOvertimePhysicalCost: 'Physical condition lost per work shift during Overtime (action 8+)',
  workOvertimeMentalCost: 'Mental condition lost per work shift during Overtime (action 8+)',
  studyMentalCost: 'Mental condition lost per standard study session (actions 1-3)',
  studyNormalMentalCost: 'Mental condition lost per standard study session (actions 1-3)',
  studyNormalPhysicalCost: 'Physical condition lost per standard study session (actions 1-3)',
  studyGrindThreshold: 'Number of study sessions taken in a turn before Academic Grind penalties apply (e.g. 4 means actions 4-7)',
  studyGrindMentalCost: 'Mental condition lost per study session during Academic Grind (actions 4-7)',
  studyGrindPhysicalCost: 'Physical condition lost per study session during Academic Grind (actions 4-7)',
  studyOvertimeThreshold: 'Number of study sessions taken in a turn before Hyper-Accelerating penalties apply (e.g. 8 means action 8+)',
  studyOvertimeMentalCost: 'Mental condition lost per study session during Hyper-Accelerating (action 8+)',
  studyOvertimePhysicalCost: 'Physical condition lost per study session during Hyper-Accelerating (action 8+)',
  resilienceDropThreshold: 'Single-event mental drop threshold required to award a permanent resilience bonus (e.g. 3)',
  cleanPhysicalCost: 'Physical condition lost per cleaning action'
};

