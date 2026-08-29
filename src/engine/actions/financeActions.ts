import type { PlayerState } from '../gameState';
import type { ReducerContext, ActionHandlerResult } from './types';
import { requireConfig } from '../rules';
import { spendHours } from '../timeManager';
import { applyHappinessChange } from '../statEffects';

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
  if (nextPlayer.hoursRemaining < timeCost) {
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
  if (nextPlayer.hoursRemaining < timeCost) {
    actionLog = { key: 'action.error.notEnoughTimeLoan' };
    return { nextPlayer, actionLog };
  }
  nextPlayer = spendHours(nextPlayer, timeCost);
  
  const liquidAssets = nextPlayer.money + nextPlayer.bankSavings - (nextPlayer.loanDebt || 0);
  const liquidity = nextPlayer.currentWage + (liquidAssets / 1000);
  let risk = 5;
  if (nextPlayer.timesDefaulted > 0 || (nextPlayer.loanDebt || 0) > 0) {
    risk = 5 + nextPlayer.timesDefaulted + ((nextPlayer.loanDebt || 0) / 100) + ((nextPlayer.loanDebt || 0) > 0 ? 1 : 0);
  }
  const maxLoan = 100 * Math.max(0, liquidity - risk);
  const isDefaulted = nextPlayer.loanPaymentDeadline > 0 && nextPlayer.loanPaymentDeadline < context.turn;

  if (isDefaulted || liquidity <= risk || (context.rules.requireJobForLoan && nextPlayer.currentJobId === null)) {
    actionLog = { key: 'action.loan.refused' };
    nextPlayer = applyHappinessChange(nextPlayer, -1, 'loan_refused', context.rules, context.campaign.config.statRules);
  } else {
    const loanSize = Math.floor(maxLoan);
    if (loanSize > 0) {
      if ((nextPlayer.loanDebt || 0) === 0) {
        nextPlayer.loanPaymentDeadline = Math.floor((context.turn - 1) / 4) * 4 + 4; // Week 4 of current month
      }
      nextPlayer.money += loanSize;
      nextPlayer.loanDebt = (nextPlayer.loanDebt || 0) + loanSize;
      nextPlayer = applyHappinessChange(nextPlayer, 5, 'loan_approved', context.rules, context.campaign.config.statRules);
      actionLog = { key: 'action.loan.approved', params: { loanSize } };
    } else {
      actionLog = { key: 'action.loan.refused' };
      nextPlayer = applyHappinessChange(nextPlayer, -1, 'loan_refused', context.rules, context.campaign.config.statRules);
    }
  }

  return { nextPlayer, actionLog };
}

export function handlePayLoanAction(
  player: PlayerState,
  _action: { type: 'pay_loan' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  if ((nextPlayer.loanDebt || 0) > 0) {
    const loanPaymentAmount = context.campaign.config.economyRules?.loanPaymentAmount ?? 50;
    const loanPrincipalAmount = context.campaign.config.economyRules?.loanPrincipalAmount ?? 45;
    const loanInterestAmount = context.campaign.config.economyRules?.loanInterestAmount ?? 5;
    
    if (nextPlayer.loanDebt < loanPaymentAmount && nextPlayer.money >= nextPlayer.loanDebt) {
      const amount = nextPlayer.loanDebt;
      nextPlayer.money -= amount;
      nextPlayer.loanDebt = 0;
      nextPlayer.loanPaymentDeadline += 4;
      actionLog = { key: 'action.loan.paidOff', params: { amount } };
    } else if (nextPlayer.money >= loanPaymentAmount) {
      nextPlayer.money -= loanPaymentAmount;
      nextPlayer.loanDebt = Math.max(0, nextPlayer.loanDebt - loanPrincipalAmount);
      nextPlayer.loanPaymentDeadline += 4;
      actionLog = { key: 'action.loan.paidInstallment', params: { payment: loanPaymentAmount, principal: loanPrincipalAmount, interest: loanInterestAmount } };
    } else {
      actionLog = { key: 'action.error.notEnoughMoneyPayment' };
    }
    if (nextPlayer.loanDebt === 0) {
      nextPlayer.loanPaymentDeadline = 0;
    }
  } else {
    actionLog = { key: 'action.error.noLoan' };
  }

  return { nextPlayer, actionLog };
}
