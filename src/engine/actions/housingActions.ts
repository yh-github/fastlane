import type { PlayerState } from '../gameState';
import type { ReducerContext, ActionHandlerResult } from './types';
import type { ReplayContext } from '../replayTypes';
import { calcUsedSpace, calcMovingFee } from '../statMath';
import { resolveDecision } from '../replayTypes';
import { applyHappinessChange } from '../statEffects';

export function handleRentTransactionAction(
  player: PlayerState,
  action: { type: 'rent_transaction'; amount: number },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  if (nextPlayer.money >= action.amount) {
    nextPlayer.money -= action.amount;
    nextPlayer.rentDebt = 0;
    nextPlayer.turnFlags.rentPaidThisTurn = true;
    // Actually extend the rentPaidUntilWeek counter
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

  return { nextPlayer, actionLog };
}

export function handleMoveApartmentAction(
  player: PlayerState,
  action: { type: 'move_apartment'; housingId: string; cost: number },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  const housingDef = context.campaign.housing.find(h => h.id === action.housingId);
  if (housingDef) {
    if (nextPlayer.currentHousingId === housingDef.id) {
      actionLog = { key: 'action.rent.alreadyLiveHere', params: { name: housingDef.name } };
    } else {
      if (context.rules.spaceCapping) {
        const durablesSpace = calcUsedSpace(nextPlayer, context.campaign, false);
        const targetCap = housingDef.spaceCap ?? 999999;
        if (durablesSpace > targetCap) {
          actionLog = { key: 'action.error.notEnoughSpaceMove', params: { targetName: housingDef.name } };
          return { nextPlayer, actionLog };
        }
      }
      const movingFee = context.rules.trackMess ? calcMovingFee(nextPlayer.mess || 0, nextPlayer.inventory.appliances.length, context.campaign.config.economyRules) : 0;
      const totalCost = action.cost + movingFee;
      if (nextPlayer.money >= totalCost) {
        nextPlayer.money -= totalCost;
        nextPlayer.currentHousingId = housingDef.id;
        nextPlayer.currentRentPrice = action.cost;
        nextPlayer.rentPaidUntilWeek = context.turn + 4; // Pay for a month
        nextPlayer.rentExtensionActive = false;
        nextPlayer.turnFlags.rentPaidThisTurn = true;
        if (context.rules.trackMess) {
          nextPlayer.mess = 3 + nextPlayer.inventory.appliances.length;
        }
        actionLog = { key: 'action.rent.moved', params: { name: housingDef.name, cost: totalCost } };
      } else {
        actionLog = { key: 'action.error.notEnoughMoneyMove', params: { name: housingDef.name } };
      }
    }
  }

  return { nextPlayer, actionLog };
}

export function handlePayRentAdvanceAction(
  player: PlayerState,
  action: { type: 'pay_rent_advance'; amount: number }
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  if (nextPlayer.money >= action.amount) {
    nextPlayer.money -= action.amount;
    nextPlayer.rentPaidUntilWeek += 4;
    nextPlayer.rentExtensionActive = false;
    nextPlayer.turnFlags.rentPaidThisTurn = true;
    actionLog = { key: 'action.rent.advancePaid', params: { amount: action.amount } };
  } else {
    actionLog = { key: 'action.error.notEnoughMoneyRentAdvance' };
  }

  return { nextPlayer, actionLog };
}

export function handleAskRentExtensionAction(
  player: PlayerState,
  _action: { type: 'ask_rent_extension' },
  context: ReducerContext,
  replayContext: ReplayContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  let actionLog;

  if (nextPlayer.rentPaidUntilWeek > context.turn + 1) {
    actionLog = { key: 'rentOffice.notNeeded' };
    return { nextPlayer, actionLog };
  }
  if (nextPlayer.rentExtensionActive || nextPlayer.turnFlags.askedForExtension) {
    actionLog = { key: 'action.rent.alreadyGranted' };
    return { nextPlayer, actionLog };
  }
  if (nextPlayer.rentExtensionsDeniedPermanently) {
    actionLog = { key: 'action.rent.extensionDenied' };
    return { nextPlayer, actionLog };
  }
  nextPlayer.turnFlags.askedForExtension = true;
  let approved = false;
  if (nextPlayer.rentExtensionsReceived === 0) {
    approved = true;
  } else {
    const baseChance = Math.max(25, 100 - (nextPlayer.rentExtensionsReceived * 25));
    const messPenalty = context.rules.trackMess ? (nextPlayer.mess || 0) : 0;
    const chance = Math.max(1, baseChance - messPenalty);
    const roll = resolveDecision(replayContext, `rent_extension_roll`, () => Math.floor(context.rng.next() * 100));
    if (roll < chance) {
      approved = true;
    }
  }

  if (approved) {
    nextPlayer.rentExtensionsReceived += 1;
    nextPlayer.rentExtensionActive = true;
    nextPlayer = applyHappinessChange(nextPlayer, 1, 'rent_extension_approved', context.rules, context.campaign.config.statRules);
    actionLog = { key: 'action.rent.extensionApproved' };
  } else {
    if (!nextPlayer.turnFlags.rentExtensionRefusedThisTurn) {
      nextPlayer = applyHappinessChange(nextPlayer, -1, 'rent_extension_denied', context.rules, context.campaign.config.statRules);
      nextPlayer.turnFlags.rentExtensionRefusedThisTurn = true;
    }
    actionLog = { key: 'action.rent.extensionDenied' };
  }

  return { nextPlayer, actionLog };
}
