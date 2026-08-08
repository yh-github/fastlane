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
   * ADVANCED: Physical condition level threshold below which doctor visits trigger.
   */
  physicalDoctorThreshold?: number;

  /**
   * ADVANCED: Mental condition level threshold below which low-spirit events trigger.
   */
  mentalDoctorThreshold?: number;

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
   * ADVANCED: If true, the player starts their turn at their home node.
   */
  turnStartAtHome?: boolean;

  /**
   * ADVANCED: If true, tracks 'Mess' at home, allowing cleaning.
   */
  trackMess?: boolean;
}

export interface EventRules {
  marketCrashDivisor: number;
  willyRobberyStartWeek: number;
  charity: {
    maxCash: number;
    maxWealth: number;
    wealthMetric: 'durableValue' | 'netWorth';
  };
}

export interface StatRules {
  startingHappiness?: number;
  startingRelaxation: number;
  relaxationDecayRate: number;
  relaxationDoctorChance: number;
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
  loanCost: number;
  brokerCost: number;
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
  allowOverAchievingGoals: false,
  bypassDoctorIfBroke: true,
  relaxationDoctorThreshold: 10,
  protectBuiltInAppliances: false,
  allowEmployedRentPayment: false,
  delayBookSetCredit: true,
  allowEatingSpoiledFood: true,
  reducedDegreeStatBonus: false,
  showItemImages: false,
  maxEnrolledClasses: 4,
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

  marketCrashDivisor: 'Divisor applied to stock market values during market crash event',
  willyRobberyStartWeek: 'Game turn/week when Willy robbery events begin',
  'charity.maxCash': 'Maximum cash limit to remain eligible for charity payout',
  'charity.maxWealth': 'Maximum wealth limit to remain eligible for charity payout',
  'charity.wealthMetric': 'Wealth calculation metric for charity (durableValue vs netWorth)',
  
  useHomeTimeRobbery: 'Uses a moving average of time spent at home for robbery chances instead of relaxation',
  usePhysicalMentalConditions: 'Splits relaxation into detailed Physical and Mental conditions',
  physicalDoctorThreshold: 'Physical condition threshold that triggers doctor events in Advanced mode',
  mentalDoctorThreshold: 'Mental condition threshold that triggers low-spirit events in Advanced mode',
  turnStartAtHome: 'Forces the player to start their turn inside their apartment',
  trackMess: 'Enables tracking and cleaning of apartment mess',
};

