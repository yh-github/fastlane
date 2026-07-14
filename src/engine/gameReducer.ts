import { type PlayerState, type GameRules, type OwnedAppliance, type PawnedItem, type GameEvent } from './gameState';
import { type CampaignBundle } from './dataLoader';
import { type Random } from '../utils/rng';
import { applyForJob, workShift } from './jobEngine';
import { buyItem } from './shoppingEngine';
import { enrollInDegree, study } from './educationEngine';
import { spendHours } from './timeManager';
import { recalculatePlayerEffects } from './gameState';

export type GameAction =
  | { type: 'apply'; jobId: string; offeredWage?: number }
  | { type: 'work'; jobId: string }
  | { type: 'buy'; itemId: string }
  | { type: 'enroll'; degreeId: string }
  | { type: 'study'; degreeId: string }
  | { type: 'relax' }
  | { type: 'bank_transaction'; amount: number }
  | { type: 'open_broker' }
  | { type: 'move'; nodeId: string }
  | { type: 'buy_stock'; stockId: string; quantity: number; cost: number }
  | { type: 'sell_stock'; stockId: string; quantity: number; revenue: number }
  | { type: 'take_loan' }
  | { type: 'pay_loan' }
  | { type: 'rent_transaction'; amount: number }
  | { type: 'move_apartment'; housingId: string; cost: number }
  | { type: 'pay_rent_advance'; amount: number }
  | { type: 'pawn_item'; item: OwnedAppliance; value: number }
  | { type: 'redeem_item'; item: PawnedItem; cost: number }
  | { type: 'buy_pawn_item'; item: PawnedItem; cost: number }
  | { type: 'change_clothes'; clothes: 'casual' | 'dress' | 'business' | 'none' }
  | { type: 'ask_rent_extension' };

export interface ReducerContext {
  campaign: CampaignBundle;
  rules: GameRules;
  turn: number;
  economicIndex: number;
  rng: Random;
  state: import('./gameState').GameState;
}

export interface ReducerResult {
  updatedPlayer: PlayerState;
  actionLog?: GameEvent;
  updatedPawnShopItemsForSale?: PawnedItem[];
}

export function gameReducer(
  player: PlayerState,
  action: GameAction,
  context: ReducerContext
): ReducerResult {
  let nextPlayer = structuredClone(player);
  let actionLog: GameEvent | undefined = undefined;
  let updatedPawnShopItemsForSale: PawnedItem[] | undefined = undefined;

  switch (action.type) {
    case 'apply': {
      const jobDef = context.campaign.jobs.find(j => j.id === action.jobId);
      if (jobDef) {
        const result = applyForJob(nextPlayer, jobDef, context.campaign.config.timeRules.jobApplicationCost, context.campaign.messages, action.offeredWage, context.rng, context.rules, context.turn);
        nextPlayer = result.updated;
        actionLog = result.message;
      }
      break;
    }
    case 'work': {
      const jobDef = context.campaign.jobs.find(j => j.id === action.jobId);
      if (jobDef) {
        const result = workShift(nextPlayer, jobDef, context.campaign.config.timeRules.workSessionCost);
        nextPlayer = result.updated;
        if (result.success) {
          actionLog = { key: 'action.job.worked', params: { title: jobDef.title, wagesEarned: result.wagesEarned } };
        } else {
          actionLog = result.message || { key: 'action.error.cannotWork' };
        }
      }
      break;
    }
    case 'buy': {
      const itemDef = context.campaign.items.find(i => i.id === action.itemId);
      if (itemDef) {
        const timeCost = itemDef.id === 'newspaper' ? context.campaign.config.timeRules.newspaperCost : 0;
        if (timeCost > 0 && nextPlayer.hoursRemaining < timeCost) {
          if (!context.rules.allowPartialHours) {
            actionLog = { key: 'action.error.notEnoughTimeBuy', params: { name: itemDef.name } };
            break;
          }
        }
        const result = buyItem(nextPlayer, itemDef, context.rules);
        if (result.success) {
          nextPlayer = spendHours(result.updated, timeCost);
          actionLog = result.message;
        } else {
          actionLog = result.message;
        }
      }
      break;
    }
    case 'enroll': {
      const degDef = context.campaign.education.find(d => d.id === action.degreeId);
      if (degDef) {
        const result = enrollInDegree(nextPlayer, degDef, context.economicIndex);
        nextPlayer = result.updated;
        actionLog = result.message;
      }
      break;
    }
    case 'study': {
      const degDef = context.campaign.education.find(d => d.id === action.degreeId);
      if (degDef) {
        const result = study(nextPlayer, degDef, context.campaign.config.timeRules.studySessionCost, context.rules);
        nextPlayer = result.updated;
        actionLog = result.message;
      }
      break;
    }
    case 'relax': {
      const relaxCost = context.campaign.config.timeRules.relaxCost || 6;
      if (nextPlayer.hoursRemaining < relaxCost) {
        if (!context.rules.allowPartialHours || nextPlayer.hoursRemaining <= 0) {
          actionLog = { key: 'action.error.notEnoughTimeRelax' };
          break;
        }
      }
      
      // As per the rules, fractional hours don't penalize outcome except for working, 
      // so we always grant full relaxation amount regardless of partial hours spent.
      nextPlayer = spendHours(nextPlayer, relaxCost);
      nextPlayer.relaxation = Math.min(50, nextPlayer.relaxation + relaxCost);
      if (!nextPlayer.turnFlags.relaxedThisTurn) {
        nextPlayer.happiness = Math.min(100, nextPlayer.happiness + 2);
        nextPlayer.turnFlags.relaxedThisTurn = true;
      }
      actionLog = { key: 'action.relax' };
      break;
    }
    case 'bank_transaction': {
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
      break;
    }
    case 'open_broker': {
      const timeCost = context.campaign.config.timeRules.brokerCost || 2;
      if (nextPlayer.hoursRemaining < timeCost && !context.rules.allowPartialHours) {
        actionLog = { key: 'action.error.notEnoughTimeBroker' };
        break;
      }
      nextPlayer = spendHours(nextPlayer, timeCost);
      actionLog = { key: 'action.broker.visited' };
      break;
    }
    case 'buy_stock': {
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
      break;
    }
    case 'sell_stock': {
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
      break;
    }
    case 'take_loan': {
      const timeCost = context.campaign.config.timeRules.loanCost || 2;
      if (nextPlayer.hoursRemaining < timeCost && !context.rules.allowPartialHours) {
        actionLog = { key: 'action.error.notEnoughTimeLoan' };
        break;
      }
      nextPlayer = spendHours(nextPlayer, timeCost);
      
      const liquidAssets = nextPlayer.money + nextPlayer.bankSavings;
      const liquidity = nextPlayer.currentWage + (liquidAssets / 1000);
      let risk = 5;
      if (nextPlayer.timesDefaulted > 0 || (nextPlayer.loanDebt || 0) > 0) {
        risk = 5 + nextPlayer.timesDefaulted + ((nextPlayer.loanDebt || 0) / 100) + ((nextPlayer.loanDebt || 0) > 0 ? 1 : 0);
      }
      const maxLoan = 100 * Math.max(0, liquidity - risk);
      const isDefaulted = nextPlayer.loanPaymentDeadline > 0 && nextPlayer.loanPaymentDeadline < context.turn;

      if (isDefaulted || liquidity <= risk || (context.rules.requireJobForLoan && nextPlayer.currentJobId === null)) {
        actionLog = { key: 'action.loan.refused' };
        const penalty = (nextPlayer.loanDebt || 0) > 0 ? 1 : 2;
        nextPlayer.happiness = Math.max(10, nextPlayer.happiness - penalty);
      } else {
        const loanSize = Math.floor(maxLoan);
        if (loanSize > 0) {
          if ((nextPlayer.loanDebt || 0) === 0) {
            nextPlayer.loanPaymentDeadline = Math.floor((context.turn - 1) / 4) * 4 + 4; // Week 4 of current month
          }
          nextPlayer.money += loanSize;
          nextPlayer.loanDebt = (nextPlayer.loanDebt || 0) + loanSize;
          nextPlayer.happiness = Math.min(100, nextPlayer.happiness + 5);
          actionLog = { key: 'action.loan.approved', params: { loanSize } };
        } else {
          actionLog = { key: 'action.loan.refused' };
          const penalty = (nextPlayer.loanDebt || 0) > 0 ? 1 : 2;
          nextPlayer.happiness = Math.max(10, nextPlayer.happiness - penalty);
        }
      }
      break;
    }
    case 'pay_loan': {
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
      break;
    }
    case 'rent_transaction': {
      if (nextPlayer.money >= action.amount) {
        nextPlayer.money -= action.amount;
        nextPlayer.rentDebt = 0;
        nextPlayer.turnFlags.rentPaidThisTurn = true;
        // BUG FIX: Actually extend the rentPaidUntilWeek counter
        if (nextPlayer.rentPaidUntilWeek <= context.turn) {
          // If they were behind, paying resets them to end of current month
          nextPlayer.rentPaidUntilWeek = context.turn + 4;
        } else {
          nextPlayer.rentPaidUntilWeek += 4;
        }
        actionLog = { key: 'action.rent.paid', params: { amount: action.amount } };
      } else {
        actionLog = { key: 'action.error.notEnoughMoneyRent' };
      }
      break;
    }
    case 'move_apartment': {
      const housingDef = context.campaign.housing.find(h => h.id === action.housingId);
      if (housingDef) {
        if (nextPlayer.money >= action.cost) {
          nextPlayer.money -= action.cost;
          nextPlayer.currentHousingId = housingDef.id;
          nextPlayer.currentRentPrice = action.cost;
          nextPlayer.rentPaidUntilWeek = context.turn + 4; // Pay for a month
          nextPlayer.rentDebt = 0;
          nextPlayer.rentExtensionActive = false;
          nextPlayer.turnFlags.rentPaidThisTurn = true;
          actionLog = { key: 'action.rent.moved', params: { name: housingDef.name, cost: action.cost } };
        } else {
          actionLog = { key: 'action.error.notEnoughMoneyMove', params: { name: housingDef.name } };
        }
      }
      break;
    }
    case 'pay_rent_advance': {
      if (nextPlayer.money >= action.amount) {
        nextPlayer.money -= action.amount;
        nextPlayer.rentPaidUntilWeek += 4;
        nextPlayer.rentExtensionActive = false;
        nextPlayer.turnFlags.rentPaidThisTurn = true;
        actionLog = { key: 'action.rent.advancePaid', params: { amount: action.amount } };
      } else {
        actionLog = { key: 'action.error.notEnoughMoneyRentAdvance' };
      }
      break;
    }
    case 'pawn_item': {
      // Validate global pawn shop constraints
      const allPawned = context.state.players.flatMap(p => p.inventory.pawnedItems || []);
      const forSale = context.state.pawnShopItemsForSale || [];
      const totalPawnShopItems = allPawned.length + forSale.length;
      
      if (totalPawnShopItems >= 6) {
        actionLog = { key: 'action.error.pawnShopFull' };
        break;
      }
      if (allPawned.some(p => p.itemId === action.item.id) || forSale.some(p => p.itemId === action.item.id)) {
        actionLog = { key: 'action.error.pawnShopHasDuplicate' };
        break;
      }

      nextPlayer.inventory.appliances = nextPlayer.inventory.appliances.filter(a => a.id !== action.item.id);
      if (!nextPlayer.inventory.pawnedItems) nextPlayer.inventory.pawnedItems = [];
      const pawnedItem = {
        itemId: action.item.id,
        originalPrice: action.item.purchasePrice,
        redeemCost: Math.floor(action.item.purchasePrice * 0.5),
        weekPawned: context.turn,
        ownerId: nextPlayer.id
      };
      nextPlayer.inventory.pawnedItems.push(pawnedItem);
      nextPlayer.money += action.value;
      nextPlayer.happiness = Math.max(10, nextPlayer.happiness - 1);
      if (action.item.id === 'refrigerator' && nextPlayer.inventory.freshFoodUnits > 0) {
        nextPlayer.happiness = Math.max(10, nextPlayer.happiness - 1);
      }
      const itemName = action.item.id.replaceAll('_', ' ');
      actionLog = { key: 'action.pawn.pawned', params: { itemName, value: action.value } };
      break;
    }
    case 'redeem_item': {
      if (nextPlayer.money >= action.cost) {
        nextPlayer.money -= action.cost;
        nextPlayer.inventory.pawnedItems = nextPlayer.inventory.pawnedItems.filter(a => a.itemId !== action.item.itemId);
        nextPlayer.inventory.appliances.push({
          id: action.item.itemId,
          purchasePrice: action.item.originalPrice,
          purchaseSource: 'pawnshop'
        });
        const itemName = action.item.itemId.replaceAll('_', ' ');
        actionLog = { key: 'action.pawn.redeemed', params: { itemName, cost: action.cost } };
      } else {
        actionLog = { key: 'action.error.notEnoughMoneyBuyBack' };
      }
      break;
    }
    case 'buy_pawn_item': {
      if (nextPlayer.money >= action.cost) {
        nextPlayer.money -= action.cost;
        updatedPawnShopItemsForSale = (context.state.pawnShopItemsForSale || []).filter(i => i.itemId !== action.item.itemId);
        nextPlayer.inventory.appliances.push({
          id: action.item.itemId,
          purchasePrice: action.item.originalPrice,
          purchaseSource: 'pawnshop'
        });
        const itemName = action.item.itemId.replaceAll('_', ' ');
        actionLog = { key: 'action.pawn.bought', params: { itemName, cost: action.cost } };
      } else {
        actionLog = { key: 'action.error.notEnoughMoneyBuyPawn' };
      }
      break;
    }
    case 'change_clothes': {
      nextPlayer.inventory.selectedClothes = action.clothes;
      actionLog = { key: 'action.clothes.changed', params: { clothes: action.clothes } };
      break;
    }
    case 'ask_rent_extension': {
      if (nextPlayer.rentExtensionActive || nextPlayer.turnFlags.askedForExtension) {
        actionLog = { key: 'action.rent.alreadyGranted' };
        break;
      }
      nextPlayer.turnFlags.askedForExtension = true;
      let approved = false;
      if (nextPlayer.rentExtensionsReceived === 0) {
        approved = true;
      } else {
        const chance = Math.max(25, 100 - (nextPlayer.rentExtensionsReceived * 25));
        const roll = Math.floor(context.rng.next() * 100);
        if (roll < chance) {
          approved = true;
        }
      }

      if (approved) {
        nextPlayer.rentExtensionsReceived += 1;
        nextPlayer.rentExtensionActive = true;
        nextPlayer.happiness = Math.min(100, nextPlayer.happiness + 1);
        actionLog = { key: 'action.rent.extensionApproved' };
      } else {
        if (!nextPlayer.turnFlags.rentExtensionRefusedThisTurn) {
          nextPlayer.happiness = Math.max(10, nextPlayer.happiness - 1);
          nextPlayer.turnFlags.rentExtensionRefusedThisTurn = true;
        }
        actionLog = { key: 'action.rent.extensionDenied' };
      }
      break;
    }
  }

  // Always sync active effects after an action
  nextPlayer = recalculatePlayerEffects(nextPlayer, context.campaign);

  return {
    updatedPlayer: nextPlayer,
    actionLog,
    updatedPawnShopItemsForSale
  };
}
