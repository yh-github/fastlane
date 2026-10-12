import type { PlayerState } from '../gameState';
import type { CampaignBundle } from '../dataLoader';
import type { GameRules } from '../rules';

export interface LoanAssessment {
  eligible: boolean;
  approvalChance: number; // 100 or 0
  estimatedAmount: number;
  liquidity: number;
  risk: number;
  liquidAssets: number;
  reason?: 'unemployed' | 'in_default' | 'insufficient_liquidity';
  reasonText: string;
}

/**
 * Calculates bank loan qualification, approval chance, and estimated loan size
 * based on authentic Sierra SCI formulas:
 *   Liquidity = currentWage + (liquidAssets / 1000)
 *   Risk = 5 + timesDefaulted + (loanDebt / 100) + (1 if loanDebt > 0)
 *   Loan Size = Math.floor(100 * (Liquidity - Risk))
 */
export function calcLoanAssessment(
  player: PlayerState,
  campaign: CampaignBundle | null | undefined,
  turn: number,
  rules?: GameRules
): LoanAssessment {
  const liquidAssets = (player.money || 0) + (player.bankSavings || 0) - (player.rentDebt || 0) - (player.loanDebt || 0);
  const wage = player.currentWage || 0;
  const liquidity = wage + Math.trunc(Math.max(0, liquidAssets) / 1000);
  
  let risk = 5;
  const timesDefaulted = player.timesDefaulted || 0;
  const loanDebt = player.loanDebt || 0;
  if (timesDefaulted > 0 || loanDebt > 0) {
    risk = 5 + timesDefaulted + Math.floor(loanDebt / 100) + (loanDebt > 0 ? 1 : 0);
  }

  const isDefaulted = (player.loanPaymentDeadline || 0) > 0 && (player.loanPaymentDeadline || 0) < turn;
  const requireJob = rules?.requireJobForLoan ?? campaign?.config?.gameRules?.requireJobForLoan ?? false;
  const hasJob = player.currentJobId !== null && player.currentJobId !== undefined;

  if (isDefaulted) {
    return {
      eligible: false,
      approvalChance: 0,
      estimatedAmount: 0,
      liquidity,
      risk,
      liquidAssets,
      reason: 'in_default',
      reasonText: 'Account in default. Overdue loan payments must be settled before applying.',
    };
  }

  if (requireJob && !hasJob) {
    return {
      eligible: false,
      approvalChance: 0,
      estimatedAmount: 0,
      liquidity,
      risk,
      liquidAssets,
      reason: 'unemployed',
      reasonText: 'Unemployed. The bank requires holding an active job to qualify for a loan.',
    };
  }

  const estimatedAmount = liquidity > risk ? (liquidity - risk) * 100 : 0;

  if (liquidity <= risk || estimatedAmount <= 0) {
    return {
      eligible: false,
      approvalChance: 0,
      estimatedAmount: 0,
      liquidity,
      risk,
      liquidAssets,
      reason: 'insufficient_liquidity',
      reasonText: `Income & savings too low (Liquidity ${liquidity} ≤ Risk ${risk}).`,
    };
  }

  return {
    eligible: true,
    approvalChance: 100,
    estimatedAmount,
    liquidity,
    risk,
    liquidAssets,
    reasonText: `Pre-approved for up to $${estimatedAmount}.`,
  };
}
