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
   * If true (default), renders character sprites with nearest-neighbor crisp pixelation.
   * If false, renders with smooth bilinear filtering.
   */
  pixelatedSprites?: boolean;

  /**
   * If true, renders character sprites with transparent background instead of solid color.
   */
  removeCharacterBg?: boolean;

  /**
   * If true (default), renders the board using authentic curved sidewalks and non-straight waypoint paths from the original game.
   */
  authenticCurvedPaths?: boolean;

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
  relaxationDoctorThreshold: number;

  /**
   * If true, prevents built-in appliances (like refrigerators) from being stolen during apartment robberies.
   * Classic Floppy/CD-ROM: false. QoL Improved: false.
   */
  protectBuiltInAppliances: boolean;

  /**
   * Allows paying rent manually at any time if you are employed at the same building (the Rent Office).
   * Classic Floppy/CD-ROM: false. QoL Improved: false.
   */
  allowEmployedRentPayment: boolean;

  /**
   * If true, completing a 3-book set requires waiting until the next turn for the lesson discount.
   * Classic Floppy/CD-ROM: true. QoL Improved: false.
   */
  delayBookSetCredit: boolean;

  /**
   * If true, allows eating spoiled/expired food (potentially with happiness penalties).
   */
  allowEatingSpoiledFood: boolean;

  /**
   * Reduces the stat padding given by degrees from +5 to +2 for current and max Dep/Exp.
   */
  reducedDegreeStatBonus: boolean;

  /**
   * Maximum number of courses a player can be concurrently enrolled in.
   * Classic Floppy/CD-ROM: 4.
   */
  maxEnrolledClasses: number;

  /**
   * If true, displays item graphics next to items in menus and inventory.
   */
  showItemImages: boolean;

  /**
   * HUD layout style: 'side' (modern widescreen/mobile side wings, default) or 'top' (classic desktop top-bar).
   */
  hudLayout?: 'side' | 'top';

  /**
   * ADVANCED: If true, apartment robberies are based on a 4-week moving average of time spent at home.
   */
  useHomeTimeRobbery: boolean;

  /**
   * ADVANCED: If true, the game tracks Physical and Mental Condition separately instead of a single Relaxation stat.
   */
  usePhysicalMentalConditions: boolean;

  /**
   * The lowest possible value the economic index (reading) can reach.
   */
  minEconomicReading: number;

  /**
   * ADVANCED: If true, the player starts their turn at their home node.
   */
  turnStartAtHome: boolean;

  /**
   * ADVANCED: If true, tracks 'Mess' at home, allowing cleaning.
   */
  trackMess: boolean;

  /**
   * If true, stolen refrigerators/freezers don't cause immediate food rot on the turn of theft (1-week grace period).
   */
  delayRobberyFoodSpoilage: boolean;

  /**
   * If true, unqualified job applications in early weeks (turns 1-4) return 'No openings' instead of explicit missing requirements.
   * Classic Floppy/CD-ROM: true. QoL / Advanced: false.
   */
  maskEarlyJobRejections: boolean;

  /**
   * ADVANCED: If true, degree education is tracked on a 0-100% continuous progress scale instead of integer classes.
   */
  percentageEducation: boolean;

  /**
   * ADVANCED: If true, continuous/divisible actions (Work, Study, Relax, Clean) scale gains and stamina costs proportionally when hours are below standard cost.
   */
  proportionalDivisibleActions: boolean;

  /**
   * ADVANCED: Step resolution for physical and mental condition scores (default 0.5 for half points).
   */
  conditionResolution: number;

  /**
   * ADVANCED: Decimal resolution for percentage education progress (default 0.1).
   */
  educationResolution: number;

  /**
   * ADVANCED: If true, limits inventory durables and mess by housing space capacity.
   */
  spaceCapping: boolean;

  /**
   * If true, switching to a new job grants +2 Experience immediately.
   * Classic Floppy/CD-ROM: true. Advanced: false.
   */
  grantExpOnJobSwitch: boolean;

  /**
   * ADVANCED: If true, alternative card-based weekend choices are presented instead of automated classic weekend events.
   */
  alternativeWeekends: boolean;

  /**
   * ADVANCED: If true, uses the card-based GUI and visual apartment showcase for Home.
   */
  advancedHomeGUI: boolean;

  /**
   * ADVANCED: If true, uses the card-based GUI and flanking work shift console for workplaces.
   */
  advancedWorkGUI: boolean;

  /**
   * QoL & ADVANCED: Adjusts pawn redemption and clearance prices dynamically with the economy to prevent infinite-money same-turn arbitrage.
   */
  preventPawnArbitrage: boolean;

  /**
   * ADVANCED: Appliances break instead of auto-repairing for money, requiring manual repair, service, or disposal.
   */
  advancedMaintenance: boolean;

  /**
   * ADVANCED: If true, displays job archetype tags (Always Hiring, Frontline Service, Technical, etc.) in the Employment Office.
   */
  showJobTags: boolean;

  /**
   * ADVANCED: If true, enables the Dusty Junk Bins & Crates rummage section in the Pawn Shop.
   */
  pawnRummageBins: boolean;

  /**
   * Allows street robbery to happen when leaving the Bank or Black Market upon ending a turn (0 hours left).
   * Classic Floppy/CD-ROM: true. QoL / Advanced: true.
   */
  streetRobberyOnTurnEnd: boolean;

  /**
   * QoL & ADVANCED: If true, the weekly newspaper includes predictive stock market tips and financial column.
   */
  predictiveNewspaperStockTips: boolean;
}

export interface EventRules {
  marketCrashDivisor: number;
  marketCrashThreshold: number;
  marketCrashStartWeek?: number;
  economicBoomDivisor: number;
  economicBoomStartWeek?: number;
  economicBoomThreshold?: number;
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
  startingHappiness: number;
  startingRelaxation: number;
  relaxationDecayRate: number;
  relaxationDoctorChance: number;
  
  // Advanced mechanics
  enableAdvancedStats: boolean;
  mentalWarningThreshold: number;
  physicalWarningThreshold: number;
  startingPhysicalCondition: number;
  startingMentalCondition: number;
  minPhysicalCondition: number;
  maxPhysicalCondition: number;
  minMentalCondition: number;
  maxMentalCondition: number;
  globalMaxMentalCondition: number;
  physicalDoctorThreshold: number;
  physicalDoctorChancePerPoint: number;
  doctorVisitPhysicalThreshold: number;
  doctorVisitPhysicalChancePerPoint: number;
  hotTubMaxMessBonus: number;
  lowSpiritsThreshold: number;
  lowSpiritsChancePerPoint: number;
  workGrindThreshold: number;
  workGrindMentalCost: number;
  workGrindPhysicalCost: number;
  workPhysicalCost: number;
  workNormalMentalCost: number;
  workOvertimeThreshold: number;
  workOvertimePhysicalCost: number;
  workOvertimeMentalCost: number;
  studyMentalCost: number;
  studyNormalMentalCost: number;
  studyNormalPhysicalCost: number;
  studyGrindThreshold: number;
  studyGrindMentalCost: number;
  studyGrindPhysicalCost: number;
  studyOvertimeThreshold: number;
  studyOvertimeMentalCost: number;
  studyOvertimePhysicalCost: number;
  resilienceDropThreshold: number;
  cleanPhysicalCost: number;
  // Advanced feature bundle configuration
  initialPhysicalMax: number;
  initialMinPhysical: number;
  globalPhysicalMin: number;
  minMaxPhysical: number;
  globalMessMax: number;
  lowCostMessMax: number;
  securityMessMax: number;
  initialMessMin: number;
  globalMessMin: number;
  startingSocial: number;
  minSocial: number;
  maxSocial: number;
  relaxMessIncrease: number;
  doctorPhysicalBounceBack: number;
  starvationMaxPhysicalPenalty: number;
  lowSpiritsMentalBounceBack: number;
  globalMaxPhysicalCondition: number;
  mentalMaxBaseValue: number;
  mentalMaxDegreeBonus: number;
  
  // Starting values
  startingExperience: number;
  startingDependability: number;
  startingCasualClothesWeeks: number;
  
  // Caps and limits
  maxExperience: number;
  maxDependability: number;
  dependabilityWeeklyDecay: number;
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
  relaxGain: number;
  newspaperCost: number;
  starvationPenalty: number;
  doctorPenalty: number;
  burnoutPenalty: number;
  loanCost: number;
  brokerCost: number;
  cleaningServiceCost: number;
  socializeCost: number;
}

export interface MapRules {
  allowDiagonalMovement?: boolean;
  movementCostModel?: 'hops' | 'waypoints';
  movementCostPerNode?: number;
  stepsPerHour?: number;
}

export interface EconomyRules {
  rentGarnishRate: number;
  rentFee: number;
  repairCostMin: number;
  repairCostMax: number;
  pawnPayoutRate: number;
  pawnRedeemRate: number;
  bankTransactionIncrementSmall: number;
  bankTransactionIncrementLarge: number;
  loanPaymentAmount: number;
  loanInterestAmount: number;
  loanPrincipalAmount: number;
  cleaningServiceBasePrice: number;
  socializeLowCostCashCost: number;
  socializeSecurityCashCost: number;
  socializePenthouseCashCost: number;
  moveFeeMessThreshold: number;
  moveFeeMessRate: number;
  moveFeeDurableRate: number;

  // Multi-Sector Economy Simulation (Authentic Sierra SCI)
  model?: 'authentic_sectors' | 'legacy_scalar';
  baselineReading?: number;
  minReading?: number;
  maxReading?: number;
  priceFloorPercent?: number;
  priceCeilingPercent?: number;
  upwardBounceStrongThreshold?: number;
  upwardBounceModerateThreshold?: number;
  downwardBounceStrongThreshold?: number;
  downwardBounceModerateThreshold?: number;
  sectorRisks?: Record<string, number>;
}

/**
 * Default rules fallback used when a campaign does not explicitly specify a rule.
 */
export const DEFAULT_GAME_RULES: GameRules = {
  strictEviction: false,
  fluctuatingRent: false,
  clothingDecaysAll: true,
  autoEquipBestClothes: true,
  classicStockMarket: true,
  allowPartialHours: true,
  enableRelaxationDoctor: true,
  requireJobForLoan: true,
  helpfulUI: false,
  enableAnimations: false,
  pixelatedSprites: true,
  removeCharacterBg: true,
  authenticCurvedPaths: true,
  allowOverAchievingGoals: true,
  bypassDoctorIfBroke: true,
  relaxationDoctorThreshold: 10,
  protectBuiltInAppliances: false,
  allowEmployedRentPayment: false,
  delayBookSetCredit: true,
  allowEatingSpoiledFood: true,
  reducedDegreeStatBonus: false,
  showItemImages: true,
  hudLayout: 'top',
  maxEnrolledClasses: 4,
  turnStartAtHome: false,
  delayRobberyFoodSpoilage: false,
  maskEarlyJobRejections: true,
  spaceCapping: false,
  grantExpOnJobSwitch: true,
  alternativeWeekends: false,
  preventPawnArbitrage: false,
  advancedMaintenance: false,
  showJobTags: false,
  pawnRummageBins: false,
  useHomeTimeRobbery: false,
  usePhysicalMentalConditions: false,
  minEconomicReading: -90,
  trackMess: false,
  percentageEducation: false,
  proportionalDivisibleActions: false,
  conditionResolution: 0.5,
  educationResolution: 0.1,
  advancedHomeGUI: false,
  advancedWorkGUI: false,
  streetRobberyOnTurnEnd: true,
  predictiveNewspaperStockTips: false,
};

/**
 * Human-readable descriptions for each rule (concise and without "If true," intros).
 */
export const RULE_DESCRIPTIONS: Record<string, string> = {
  pixelatedSprites: 'Renders character sprites with crisp pixelation (nearest-neighbor) instead of smooth filtering',
  removeCharacterBg: 'Renders character sprites with transparent backgrounds instead of solid colored backdrops',
  authenticCurvedPaths: 'Renders the board using authentic curved sidewalks and non-straight waypoint paths from the original game',
  streetRobberyOnTurnEnd: 'Allows street robbery when leaving the Bank or Black Market upon ending a turn (0 hours left)',
  predictiveNewspaperStockTips: 'Enables predictive stock market tips and financial column in the weekly newspaper',
  advancedHomeGUI: 'Uses the card-based GUI and visual apartment showcase for Home',
  advancedWorkGUI: 'Uses the card-based GUI and flanking work shift console for workplaces',
  advancedMaintenance: 'Appliances break instead of auto-repairing for money, requiring manual repair, service, or disposal',
  showJobTags: 'Displays job archetype tags (Always Hiring, Frontline Service, Technical, etc.) in the Employment Office',
  pawnRummageBins: 'Enables Dusty Junk Bins & Crates section in the Pawn Shop for rummaging bargains, curios, and spare parts',
  strictEviction: 'Warns at 1 month rent debt and evicts from apartment at >2 months debt',
  preventPawnArbitrage: 'Prevents infinite-money exploits by adjusting pawn redemption and clearance prices with the economic index',
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
  grantExpOnJobSwitch: 'Grants +2 Experience immediately whenever hired for a new job',
  alternativeWeekends: 'Presents interactive card-based choices during weekends with deck momentum and risk/reward options',
  protectBuiltInAppliances: 'Protects built-in appliances from theft during apartment burglaries',
  allowEmployedRentPayment: 'Allows paying rent manually at any time if employed at Rent Office',
  delayBookSetCredit: 'Requires waiting until next turn for 3-book set lesson discount',
  allowEatingSpoiledFood: 'Allows eating spoiled or expired food',
  reducedDegreeStatBonus: 'Reduces the Dependability and Experience boost from degrees from +5 to +2',
  showItemImages: 'Displays graphical icons for items in menus and inventory',
  hudLayout: 'HUD layout style (Classic Top HUD default or Modern Side HUD)',
  delayRobberyFoodSpoilage: 'Grants a 1-week grace period before food rots when a refrigerator is stolen',
  maskEarlyJobRejections: 'Masks low dependability rejection as "No openings" (and suppresses "Poor Work History" if other requirements are missing) during turns 1-4 (Original Floppy/CD-ROM behavior)',
  percentageEducation: 'Tracks degree progress on a 0-100% continuous progress scale',
  proportionalDivisibleActions: 'Scales gains and stamina costs proportionally for continuous actions (Work, Study, Relax, Clean)',
  conditionResolution: 'Step resolution for physical and mental condition scores (default 0.5 for half points)',
  educationResolution: 'Decimal precision for percentage degree progress (default 0.1)',
  spaceCapping: 'Limits inventory durables and mess according to housing tier space capacity',

  marketCrashDivisor: 'Divisor applied to stock market values during market crash event',
  marketCrashThreshold: 'Minimum economic reading required for a market crash to trigger (default 60)',
  marketCrashStartWeek: 'Game turn/week when stock market crash events begin (e.g. week 4 or 8)',
  economicBoomDivisor: 'Divisor determining the frequency of economic boom events (default 30 or 50)',
  economicBoomStartWeek: 'Game turn/week when economic boom events begin (e.g. week 4 or 8)',
  economicBoomThreshold: 'Maximum reading threshold for economic boom events to trigger (default 120)',
  minEconomicReading: 'The lowest possible value the economic index (reading) can reach (-90 for Floppy, -30 for CD-ROM)',
  willyRobberyStartWeek: 'Game turn/week when Willy robbery events begin',
  charity: 'Charity eligibility limits and payout rules',
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
  cleaningServiceCost: 'Hours required when using the professional cleaning service',
  socializeCost: 'Hours required when socializing with friends or neighbors',

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
  cleaningServiceBasePrice: 'Base price for professional apartment cleaning service',
  socializeLowCostCashCost: 'Cash cost to socialize while living in Low Cost Housing',
  socializeSecurityCashCost: 'Cash cost to socialize while living in Security Apartments',
  socializePenthouseCashCost: 'Cash cost to socialize while living in Penthouse Suites',
  moveFeeMessThreshold: 'Mess level threshold above which additional move-out cleaning fees apply',
  moveFeeMessRate: 'Fee charged per point of mess exceeding the moving mess threshold',
  moveFeeDurableRate: 'Fee charged per appliance or durable item when moving residences',
  model: 'Economic model mode (authentic_sectors or legacy_scalar)',
  baselineReading: 'Baseline starting reading for economic sectors (default 100)',
  minReading: 'Minimum sector reading floor (default 10 for Floppy, 70 for CD-ROM)',
  maxReading: 'Maximum sector reading ceiling (default 130)',
  priceFloorPercent: 'Absolute lowest price percentage scaling allowed (default 50%)',
  priceCeilingPercent: 'Absolute highest price percentage scaling allowed (default 250%)',
  upwardBounceStrongThreshold: 'Sector reading threshold triggering +2 upward bounce (e.g. 40 for Floppy, 80 for CD-ROM)',
  upwardBounceModerateThreshold: 'Sector reading threshold triggering +1 upward bounce (e.g. 70 for Floppy, 90 for CD-ROM)',
  downwardBounceStrongThreshold: 'Sector reading threshold triggering -2 downward bounce (default 120)',
  downwardBounceModerateThreshold: 'Sector reading threshold triggering -1 downward bounce (default 110)',
  sectorRisks: 'Volatility and momentum risk multipliers per economic sector',

  // StatRules
  startingHappiness: 'Initial happiness score at the start of a campaign',
  startingRelaxation: 'Initial relaxation score at the start of a campaign',
  relaxationDecayRate: 'Amount of relaxation lost naturally per turn',
  relaxationDoctorChance: 'Probability of a doctor visit if relaxation is critically low',
  enableAdvancedStats: 'Enables advanced physical condition and mental health tracking',
  mentalWarningThreshold: 'Mental condition threshold below which low mental health warnings trigger',
  physicalWarningThreshold: 'Physical condition threshold below which low physical condition warnings trigger',
  startingPhysicalCondition: 'Initial physical condition (if Advanced Stats enabled)',
  startingMentalCondition: 'Initial mental condition (if Advanced Stats enabled)',
  minPhysicalCondition: 'Absolute minimum physical condition',
  maxPhysicalCondition: 'Absolute maximum physical condition',
  minMentalCondition: 'Absolute minimum mental condition',
  maxMentalCondition: 'Default maximum mental condition (can be expanded by degrees)',
  globalMaxMentalCondition: 'Absolute maximum mental condition (hard cap)',
  physicalDoctorThreshold: 'Physical condition level that triggers potential doctor visits',
  physicalDoctorChancePerPoint: 'Probability of doctor visit per point below the physical threshold',
  doctorVisitPhysicalThreshold: 'Physical condition threshold below which emergency doctor visits may trigger',
  doctorVisitPhysicalChancePerPoint: 'Probability increase per point below threshold for emergency doctor visit',
  hotTubMaxMessBonus: 'Bonus apartment mess tolerance granted by owning a hot tub',
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
  cleanPhysicalCost: 'Physical condition lost per cleaning action',
  initialPhysicalMax: 'Initial maximum physical condition ceiling',
  initialMinPhysical: 'Initial minimum physical condition floor',
  globalPhysicalMin: 'Absolute global minimum physical condition limit',
  minMaxPhysical: 'Absolute minimum ceiling for maximum physical condition',
  globalMessMax: 'Absolute maximum mess limit an apartment can reach',
  lowCostMessMax: 'Maximum mess capacity for Low Cost Housing',
  securityMessMax: 'Maximum mess capacity for Security Apartments',
  initialMessMin: 'Initial baseline mess floor',
  globalMessMin: 'Absolute minimum apartment mess level',
  startingSocial: 'Initial social connection score at campaign start',
  minSocial: 'Minimum possible social stat value',
  maxSocial: 'Maximum possible social stat value',
  relaxMessIncrease: 'Amount of apartment mess generated per relaxation action',
  doctorPhysicalBounceBack: 'Physical condition restored after receiving medical care',
  starvationMaxPhysicalPenalty: 'Maximum physical condition penalty suffered from starvation',
  lowSpiritsMentalBounceBack: 'Mental condition restored when recovering from Low Spirits',
  globalMaxPhysicalCondition: 'Absolute maximum possible physical condition cap',
  mentalMaxBaseValue: 'Base maximum mental condition ceiling',
  mentalMaxDegreeBonus: 'Bonus maximum mental condition ceiling granted per completed degree',
  startingCasualClothesWeeks: 'Initial durability in weeks of starting casual clothes',
  startingExperience: 'Initial work experience points at campaign start',
  startingDependability: 'Initial dependability points at campaign start',
  maxExperience: 'Maximum work experience points attainable',
  maxDependability: 'Maximum dependability points attainable',
  dependabilityWeeklyDecay: 'Dependability points lost each week if unemployed'
};

