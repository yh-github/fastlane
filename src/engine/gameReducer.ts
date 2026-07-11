import { type PlayerState, type GameRules, type OwnedAppliance, type PawnedItem } from './gameState';
import { type CampaignBundle } from './dataLoader';
import { applyForJob, workShift } from './jobEngine';
import { buyItem } from './shoppingEngine';
import { enrollInDegree, study } from './educationEngine';
import { spendHours } from './timeManager';
import { recalculatePlayerEffects } from './gameState';

export type GameAction =
  | { type: 'apply'; jobId: string }
  | { type: 'work'; jobId: string }
  | { type: 'buy'; itemId: string }
  | { type: 'enroll'; degreeId: string }
  | { type: 'study'; degreeId: string }
  | { type: 'relax' }
  | { type: 'bank_transaction'; amount: number }
  | { type: 'buy_stock'; stockId: string; quantity: number; cost: number }
  | { type: 'sell_stock'; stockId: string; quantity: number; revenue: number }
  | { type: 'take_loan' }
  | { type: 'pay_loan' }
  | { type: 'rent_transaction'; amount: number }
  | { type: 'move_apartment'; housingId: string; cost: number }
  | { type: 'pay_rent_advance'; amount: number }
  | { type: 'pawn_item'; item: OwnedAppliance; value: number }
  | { type: 'redeem_item'; item: PawnedItem; cost: number }
  | { type: 'change_clothes'; clothes: 'casual' | 'dress' | 'business' | 'none' }
  | { type: 'ask_rent_extension' };

export interface ReducerContext {
  campaign: CampaignBundle;
  rules: GameRules;
  turn: number;
}

export interface ReducerResult {
  updatedPlayer: PlayerState;
  actionLog: string;
}

export function gameReducer(
  player: PlayerState,
  action: GameAction,
  context: ReducerContext
): ReducerResult {
  let nextPlayer = { ...player };
  let actionLog = "";

  switch (action.type) {
    case 'apply': {
      const jobDef = context.campaign.jobs.find(j => j.id === action.jobId);
      if (jobDef) {
        const result = applyForJob(nextPlayer, jobDef, context.campaign.messages);
        nextPlayer = result.updated;
        actionLog = result.message;
      }
      break;
    }
    case 'work': {
      const jobDef = context.campaign.jobs.find(j => j.id === action.jobId);
      if (jobDef) {
        const result = workShift(nextPlayer, jobDef);
        nextPlayer = result.updated;
        if (result.success) {
          const msg = result.message ? result.message : '';
          actionLog = `Worked at ${jobDef.title}! Earned $${result.wagesEarned}${msg}`;
        } else {
          actionLog = result.message || 'Could not work.';
        }
      }
      break;
    }
    case 'buy': {
      const itemDef = context.campaign.items.find(i => i.id === action.itemId);
      if (itemDef) {
        if (itemDef.id === 'newspaper') {
          if (nextPlayer.hoursRemaining >= 1 && nextPlayer.money >= itemDef.basePrice) {
            nextPlayer = spendHours(nextPlayer, 1);
            nextPlayer.money -= itemDef.basePrice;
            actionLog = "Read the Newspaper.";
            // UI handles modal opening separately
          } else if (nextPlayer.money < itemDef.basePrice) {
            actionLog = "Not enough money for the newspaper.";
          } else {
            actionLog = "Not enough time to read the newspaper.";
          }
        } else {
          const result = buyItem(nextPlayer, itemDef, context.rules);
          nextPlayer = result.updated;
          actionLog = result.message;
        }
      }
      break;
    }
    case 'enroll': {
      const degDef = context.campaign.education.find(d => d.id === action.degreeId);
      if (degDef) {
        const result = enrollInDegree(nextPlayer, degDef);
        nextPlayer = result.updated;
        actionLog = result.message;
      }
      break;
    }
    case 'study': {
      const degDef = context.campaign.education.find(d => d.id === action.degreeId);
      if (degDef) {
        const result = study(nextPlayer, degDef, context.rules);
        nextPlayer = result.updated;
        actionLog = result.message;
      }
      break;
    }
    case 'relax': {
      const cost = Math.min(nextPlayer.hoursRemaining, 5);
      if (cost > 0) {
        nextPlayer = spendHours(nextPlayer, cost);
        nextPlayer.happiness = Math.min(100, nextPlayer.happiness + 1);
        actionLog = `Relaxed at home for ${cost} hours.`;
      }
      break;
    }
    case 'bank_transaction': {
      if (action.amount > 0) { // Deposit
        if (nextPlayer.money >= action.amount) {
          nextPlayer.money -= action.amount;
          nextPlayer.bankSavings += action.amount;
          actionLog = `Deposited $${action.amount}.`;
        } else {
          actionLog = "Not enough cash to deposit.";
        }
      } else { // Withdraw
        const absAmount = Math.abs(action.amount);
        if (nextPlayer.bankSavings >= absAmount) {
          nextPlayer.bankSavings -= absAmount;
          nextPlayer.money += absAmount;
          actionLog = `Withdrew $${absAmount}.`;
        } else {
          actionLog = "Not enough savings to withdraw.";
        }
      }
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
        actionLog = `Bought ${action.quantity} shares of ${action.stockId}.`;
      } else {
        actionLog = "Not enough cash to buy stocks.";
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
        actionLog = `Sold ${action.quantity} shares of ${action.stockId}.`;
      } else {
        actionLog = "You do not own enough shares.";
      }
      break;
    }
    case 'take_loan': {
      const liquidAssets = nextPlayer.money + nextPlayer.bankSavings;
      const liquidity = nextPlayer.currentWage + (liquidAssets / 1000);
      let risk = 5;
      if (nextPlayer.timesDefaulted > 0 || (nextPlayer.loanDebt || 0) > 0) {
        risk = 5 + nextPlayer.timesDefaulted + ((nextPlayer.loanDebt || 0) / 100) + ((nextPlayer.loanDebt || 0) > 0 ? 1 : 0);
      }
      const maxLoan = 100 * Math.max(0, liquidity - risk);
      const isDefaulted = nextPlayer.loanPaymentDeadline > 0 && nextPlayer.loanPaymentDeadline < context.turn;

      if (isDefaulted || liquidity <= risk) {
        actionLog = "The bank refused to lend you money!";
        nextPlayer.happiness = Math.max(10, nextPlayer.happiness - 1);
      } else {
        const loanSize = Math.floor(maxLoan);
        if (loanSize > 0) {
          if ((nextPlayer.loanDebt || 0) === 0) {
            nextPlayer.loanPaymentDeadline = Math.floor((context.turn - 1) / 4) * 4 + 4; // Week 4 of current month
          }
          nextPlayer.money += loanSize;
          nextPlayer.loanDebt = (nextPlayer.loanDebt || 0) + loanSize;
          nextPlayer.happiness = Math.min(100, nextPlayer.happiness + 5);
          actionLog = `The bank approved a loan of $${loanSize}.`;
        } else {
          actionLog = "The bank refused to lend you money!";
          nextPlayer.happiness = Math.max(10, nextPlayer.happiness - 1);
        }
      }
      nextPlayer = spendHours(nextPlayer, 2);
      break;
    }
    case 'pay_loan': {
      if ((nextPlayer.loanDebt || 0) > 0) {
        if (nextPlayer.loanDebt < 50 && nextPlayer.money >= nextPlayer.loanDebt) {
          const amount = nextPlayer.loanDebt;
          nextPlayer.money -= amount;
          nextPlayer.loanDebt = 0;
          nextPlayer.loanPaymentDeadline += 4;
          actionLog = `Paid off the remaining loan of $${amount}.`;
        } else if (nextPlayer.money >= 50) {
          nextPlayer.money -= 50;
          nextPlayer.loanDebt = Math.max(0, nextPlayer.loanDebt - 45);
          nextPlayer.loanPaymentDeadline += 4;
          actionLog = `Made a $50 loan payment ($45 principal, $5 interest).`;
        } else {
          actionLog = "Not enough cash to make a payment.";
        }
        if (nextPlayer.loanDebt === 0) {
          nextPlayer.loanPaymentDeadline = 0;
        }
      } else {
        actionLog = "You do not have a loan.";
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
        actionLog = `Paid $${action.amount} for rent.`;
      } else {
        actionLog = "Not enough cash to pay rent.";
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
          actionLog = `Moved into ${housingDef.name} for $${action.cost}.`;
        } else {
          actionLog = `Not enough cash to move to ${housingDef.name}.`;
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
        actionLog = `Paid $${action.amount} rent advance.`;
      } else {
        actionLog = `Not enough cash for rent advance.`;
      }
      break;
    }
    case 'pawn_item': {
      nextPlayer.inventory.appliances = nextPlayer.inventory.appliances.filter(a => a !== action.item);
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
      nextPlayer.happiness = Math.max(0, nextPlayer.happiness - 1);
      const itemName = action.item.id.replaceAll('_', ' ');
      actionLog = `Pawned ${itemName} for $${action.value}.`;
      break;
    }
    case 'redeem_item': {
      if (nextPlayer.money >= action.cost) {
        nextPlayer.money -= action.cost;
        nextPlayer.inventory.pawnedItems = nextPlayer.inventory.pawnedItems.filter(a => a !== action.item);
        nextPlayer.inventory.appliances.push({
          id: action.item.itemId,
          purchasePrice: action.item.originalPrice,
          purchaseSource: 'pawnshop'
        });
        const itemName = action.item.itemId.replaceAll('_', ' ');
        actionLog = `Bought back ${itemName} for $${action.cost}.`;
      } else {
        actionLog = "Not enough cash to buy back item.";
      }
      break;
    }
    case 'change_clothes': {
      nextPlayer.inventory.selectedClothes = action.clothes;
      actionLog = `Selected ${action.clothes} clothes.`;
      break;
    }
    case 'ask_rent_extension': {
      nextPlayer.turnFlags.askedForExtension = true;
      let approved = false;
      if (nextPlayer.rentExtensionsReceived === 0) {
        approved = true;
      } else {
        const chance = Math.max(25, 100 - (nextPlayer.rentExtensionsReceived * 25));
        const roll = Math.floor(Math.random() * 100);
        if (roll < chance) {
          approved = true;
        }
      }

      if (approved) {
        nextPlayer.rentExtensionsReceived += 1;
        nextPlayer.rentExtensionActive = true;
        actionLog = "Rent Office approved your 1-week extension! You have until the end of the week to pay.";
      } else {
        actionLog = "The Rent Office denied your extension request.";
      }
      break;
    }
  }

  // Always sync active effects after an action
  nextPlayer = recalculatePlayerEffects(nextPlayer, context.campaign);

  return {
    updatedPlayer: nextPlayer,
    actionLog
  };
}
