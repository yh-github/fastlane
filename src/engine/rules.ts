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
  relaxationDoctorThreshold: number;

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
};
