import type { PlayerState } from '../gameState';
import type { ReducerContext, ActionHandlerResult } from './types';
import { requireConfig } from '../rules';
import { spendHours, canAffordAction } from '../timeManager';
import { applyHappinessChange } from '../statEffects';
import { calcLoanAssessment, calcInitialLoanDeadline, calcAdvancedLoanDeadline } from '../statMath';

export function handleBankTransactionAction(
  player: PlayerState,
  action: { type: 'bank_transaction'; amount: number }
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  if (action.amount > 0) { // Deposit
    if (nextPlayer.money >= action.amount) {
      nextPlayer.money -= action.amount;
      nextPlayer.bankSavings += action.amount;
      actionLog = { key: 'action.bank.deposit', params: { amount: action.amount } };
    } else {
      actionLog = { key: 'action.error.notEnoughMoneyDeposit' };
    }
  } else { // Withdraw
    const absAmount = Math.abs(action.amount);
    if (nextPlayer.bankSavings >= absAmount) {
      nextPlayer.bankSavings -= absAmount;
      nextPlayer.money += absAmount;
      actionLog = { key: 'action.bank.withdraw', params: { amount: absAmount } };
    } else {
      actionLog = { key: 'action.error.notEnoughSavings' };
    }
  }

  return { nextPlayer, actionLog };
}

export function handleOpenBrokerAction(
  player: PlayerState,
  _action: { type: 'open_broker' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  const timeCost = requireConfig(context.campaign.config.timeRules?.brokerCost, 'timeRules.brokerCost');
  if (!canAffordAction(nextPlayer, timeCost, true)) {
    actionLog = { key: 'action.error.notEnoughTimeBroker' };
    return { nextPlayer, actionLog };
  }
  nextPlayer = spendHours(nextPlayer, timeCost);
  actionLog = { key: 'action.broker.visited' };

  return { nextPlayer, actionLog };
}

export function handleBuyStockAction(
  player: PlayerState,
  action: { type: 'buy_stock'; stockId: string; quantity: number; cost: number }
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  if (nextPlayer.money >= action.cost) {
    nextPlayer.money -= action.cost;
    if (action.stockId === 'tbills') {
      nextPlayer.inventory.stocks.tBills += action.quantity;
    } else {
      nextPlayer.inventory.stocks.holdings[action.stockId] = (nextPlayer.inventory.stocks.holdings[action.stockId] || 0) + action.quantity;
    }
    actionLog = { key: 'action.broker.buy', params: { quantity: action.quantity, stockId: action.stockId } };
  } else {
    actionLog = { key: 'action.error.notEnoughMoneyStock' };
  }

  return { nextPlayer, actionLog };
}

export function handleSellStockAction(
  player: PlayerState,
  action: { type: 'sell_stock'; stockId: string; quantity: number; revenue: number }
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  const owned = action.stockId === 'tbills' 
    ? nextPlayer.inventory.stocks.tBills 
    : (nextPlayer.inventory.stocks.holdings[action.stockId] || 0);
  
  if (owned >= action.quantity) {
    if (action.stockId === 'tbills') {
      nextPlayer.inventory.stocks.tBills -= action.quantity;
    } else {
      nextPlayer.inventory.stocks.holdings[action.stockId] -= action.quantity;
    }
    nextPlayer.money += action.revenue;
    nextPlayer.hasEarnedIncome = true;
    actionLog = { key: 'action.broker.sell', params: { quantity: action.quantity, stockId: action.stockId } };
  } else {
    actionLog = { key: 'action.error.notEnoughShares' };
  }

  return { nextPlayer, actionLog };
}

export function handleTakeLoanAction(
  player: PlayerState,
  _action: { type: 'take_loan' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  const timeCost = requireConfig(context.campaign.config.timeRules?.loanCost, 'timeRules.loanCost');
  if (!canAffordAction(nextPlayer, timeCost, true)) {
    actionLog = { key: 'action.error.notEnoughTimeLoan' };
    return { nextPlayer, actionLog };
  }
  nextPlayer = spendHours(nextPlayer, timeCost);
  
  const assessment = calcLoanAssessment(nextPlayer, context.campaign, context.turn, context.rules);

  if (!assessment.eligible || assessment.estimatedAmount <= 0) {
    actionLog = { key: 'action.loan.refused' };
    nextPlayer = applyHappinessChange(nextPlayer, -1, 'loan_refused', context.rules, context.campaign.config.statRules);
  } else {
    const loanSize = assessment.estimatedAmount;
    if ((nextPlayer.loanDebt || 0) === 0) {
      nextPlayer.loanPaymentDeadline = calcInitialLoanDeadline(
        context.turn,
        Boolean(context.rules.rollingLoanDeadline)
      );
    }
    nextPlayer.money += loanSize;
    nextPlayer.loanDebt = (nextPlayer.loanDebt || 0) + loanSize;
    nextPlayer = applyHappinessChange(nextPlayer, 5, 'loan_approved', context.rules, context.campaign.config.statRules);
    actionLog = { key: 'action.loan.approved', params: { loanSize } };
  }

  return { nextPlayer, actionLog };
}

export interface LoanPaymentDetails {
  minRequiredPayment: number;
  fullPayoffAmount: number;
  basePaymentAmount: number;
  interestRate: number;
}

export interface LoanPaymentBreakdown {
  payment: number;
  principalApplied: number;
  interestFee: number;
  remainingDebt: number;
  meetsMinimum: boolean;
}

export function calcLoanPaymentDetails(
  loanDebt: number,
  rules?: { versionClass?: string },
  economyRules?: { loanPaymentAmount?: number; loanPrincipalAmount?: number; loanInterestAmount?: number }
): LoanPaymentDetails {
  const baseAmount = economyRules?.loanPaymentAmount ?? 50;
  const baseInterest = economyRules?.loanInterestAmount ?? 5;
  const basePrincipal = economyRules?.loanPrincipalAmount ?? Math.max(1, baseAmount - baseInterest);
  const interestRate = baseAmount > 0 ? baseInterest / baseAmount : 0.1;

  if (loanDebt <= 0) {
    return {
      minRequiredPayment: 0,
      fullPayoffAmount: 0,
      basePaymentAmount: baseAmount,
      interestRate
    };
  }

  if (loanDebt < baseAmount) {
    return {
      minRequiredPayment: loanDebt,
      fullPayoffAmount: loanDebt,
      basePaymentAmount: baseAmount,
      interestRate
    };
  }

  const fullInterest = Math.round(loanDebt * (baseInterest / basePrincipal));
  const fullPayoffAmount = loanDebt + fullInterest;
  const isAdvanced = rules?.versionClass === 'advanced';
  const computedMin = isAdvanced
    ? Math.max(baseAmount, Math.ceil((loanDebt * 0.20) / 10) * 10)
    : baseAmount;

  return {
    minRequiredPayment: Math.min(fullPayoffAmount, computedMin),
    fullPayoffAmount,
    basePaymentAmount: baseAmount,
    interestRate
  };
}

export function calcLoanPaymentBreakdown(
  loanDebt: number,
  paymentAmount: number,
  details: LoanPaymentDetails,
  economyRules?: { loanPaymentAmount?: number; loanPrincipalAmount?: number; loanInterestAmount?: number }
): LoanPaymentBreakdown {
  if (loanDebt <= 0 || paymentAmount <= 0) {
    return {
      payment: 0,
      principalApplied: 0,
      interestFee: 0,
      remainingDebt: Math.max(0, loanDebt),
      meetsMinimum: false
    };
  }

  const clampedPayment = Math.min(Math.floor(paymentAmount), details.fullPayoffAmount);
  const baseAmount = economyRules?.loanPaymentAmount ?? details.basePaymentAmount;
  const basePrincipal = economyRules?.loanPrincipalAmount ?? 45;
  const baseInterest = economyRules?.loanInterestAmount ?? 5;

  let interestFee: number;
  let principalApplied: number;
  let remainingDebt: number;

  if (clampedPayment >= details.fullPayoffAmount) {
    principalApplied = loanDebt;
    interestFee = clampedPayment - loanDebt;
    remainingDebt = 0;
  } else if (clampedPayment === baseAmount) {
    interestFee = baseInterest;
    principalApplied = Math.min(loanDebt, basePrincipal);
    remainingDebt = Math.max(0, loanDebt - principalApplied);
  } else {
    interestFee = Math.round(clampedPayment * details.interestRate);
    principalApplied = Math.min(loanDebt, Math.max(1, clampedPayment - interestFee));
    remainingDebt = Math.max(0, loanDebt - principalApplied);
  }

  return {
    payment: clampedPayment,
    principalApplied,
    interestFee,
    remainingDebt,
    meetsMinimum: clampedPayment >= details.minRequiredPayment
  };
}

export function handlePayLoanAction(
  player: PlayerState,
  action: { type: 'pay_loan'; amount?: number },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  if ((nextPlayer.loanDebt || 0) > 0) {
    const economyRules = context.campaign.config.economyRules;
    const details = calcLoanPaymentDetails(nextPlayer.loanDebt, context.rules, economyRules);
    const requested = action.amount !== undefined ? Math.floor(action.amount) : details.minRequiredPayment;

    if (requested < details.minRequiredPayment) {
      actionLog = { key: 'action.error.belowMinLoanPayment', params: { min: details.minRequiredPayment } };
      return { nextPlayer, actionLog };
    }

    const breakdown = calcLoanPaymentBreakdown(nextPlayer.loanDebt, requested, details, economyRules);
    if (nextPlayer.money >= breakdown.payment) {
      nextPlayer.money -= breakdown.payment;
      nextPlayer.loanDebt = breakdown.remainingDebt;
      if (!nextPlayer.turnFlags) nextPlayer.turnFlags = {} as any;
      nextPlayer.turnFlags.loanPaidThisTurn = true;
      nextPlayer.turnFlags.loanPayableWarning = false;

      if (nextPlayer.loanDebt === 0) {
        nextPlayer.loanPaymentDeadline = 0;
        actionLog = { key: 'action.loan.paidOff', params: { amount: breakdown.payment } };
      } else {
        nextPlayer.loanPaymentDeadline = calcAdvancedLoanDeadline(
          nextPlayer.loanPaymentDeadline || 0,
          context.turn,
          Boolean(context.rules?.rollingLoanDeadline),
          'payment'
        );
        actionLog = {
          key: 'action.loan.paidInstallment',
          params: {
            payment: breakdown.payment,
            principal: breakdown.principalApplied,
            interest: breakdown.interestFee
          }
        };
      }
    } else {
      actionLog = { key: 'action.error.notEnoughMoneyPayment' };
    }
  } else {
    actionLog = { key: 'action.error.noLoan' };
  }

  return { nextPlayer, actionLog };
}
