import type { PlayerState, GameEvent, PawnedItem } from './gameState';
import { recalculatePlayerEffects } from './gameState';
import type { EngineDecision, ReplayContext } from './replayTypes';
import type { GameAction, ReducerContext, ReducerResult } from './actions';
import {
  handleApplyAction,
  handleWorkAction,
  handleBuyAction,
  handleEnrollAction,
  handleStudyAction,
  handleRelaxAction,
  handleCleanAction,
  handleCleaningServiceAction,
  handleSocializeAction,
  handleChangeClothesAction,
  handleMoveAction,
  handleBankTransactionAction,
  handleOpenBrokerAction,
  handleBuyStockAction,
  handleSellStockAction,
  handleTakeLoanAction,
  handlePayLoanAction,
  handleRentTransactionAction,
  handleMoveApartmentAction,
  handlePayRentAdvanceAction,
  handleAskRentExtensionAction,
  handlePawnItemAction,
  handleRedeemItemAction,
  handleBuyPawnItemAction
} from './actions';

export type { GameAction, ReducerContext, ReducerResult } from './actions';

export function gameReducer(
  player: PlayerState,
  action: GameAction,
  context: ReducerContext
): ReducerResult {
  let nextPlayer = structuredClone(player);
  let actionLog: GameEvent | GameEvent[] | undefined = undefined;
  let updatedPawnShopItemsForSale: PawnedItem[] | undefined = undefined;
  const outEngineDecisions: EngineDecision[] = [];
  const replayContext: ReplayContext = {
    inDecisions: context.engineDecisions,
    outDecisions: outEngineDecisions
  };

  let res;
  switch (action.type) {
    case 'apply':
      res = handleApplyAction(nextPlayer, action, context, replayContext);
      break;
    case 'work':
      res = handleWorkAction(nextPlayer, action, context, replayContext);
      break;
    case 'buy':
      res = handleBuyAction(nextPlayer, action, context);
      break;
    case 'enroll':
      res = handleEnrollAction(nextPlayer, action, context);
      break;
    case 'study':
      res = handleStudyAction(nextPlayer, action, context, replayContext);
      break;
    case 'relax':
      res = handleRelaxAction(nextPlayer, action, context);
      break;
    case 'clean':
      res = handleCleanAction(nextPlayer, action, context);
      break;
    case 'call_cleaning_service':
      res = handleCleaningServiceAction(nextPlayer, action, context);
      break;
    case 'socialize_guests':
      res = handleSocializeAction(nextPlayer, action, context);
      break;
    case 'change_clothes':
      res = handleChangeClothesAction(nextPlayer, action);
      break;
    case 'move':
      res = handleMoveAction(nextPlayer, action, context, replayContext);
      break;
    case 'bank_transaction':
      res = handleBankTransactionAction(nextPlayer, action);
      break;
    case 'open_broker':
      res = handleOpenBrokerAction(nextPlayer, action, context);
      break;
    case 'buy_stock':
      res = handleBuyStockAction(nextPlayer, action);
      break;
    case 'sell_stock':
      res = handleSellStockAction(nextPlayer, action);
      break;
    case 'take_loan':
      res = handleTakeLoanAction(nextPlayer, action, context);
      break;
    case 'pay_loan':
      res = handlePayLoanAction(nextPlayer, action, context);
      break;
    case 'rent_transaction':
      res = handleRentTransactionAction(nextPlayer, action, context);
      break;
    case 'move_apartment':
      res = handleMoveApartmentAction(nextPlayer, action, context);
      break;
    case 'pay_rent_advance':
      res = handlePayRentAdvanceAction(nextPlayer, action);
      break;
    case 'ask_rent_extension':
      res = handleAskRentExtensionAction(nextPlayer, action, context, replayContext);
      break;
    case 'pawn_item':
      res = handlePawnItemAction(nextPlayer, action, context);
      break;
    case 'redeem_item':
      res = handleRedeemItemAction(nextPlayer, action, context);
      break;
    case 'buy_pawn_item':
      res = handleBuyPawnItemAction(nextPlayer, action, context);
      break;
  }

  if (res) {
    nextPlayer = res.nextPlayer;
    actionLog = res.actionLog;
    if (res.updatedPawnShopItemsForSale !== undefined) {
      updatedPawnShopItemsForSale = res.updatedPawnShopItemsForSale;
    }
  }

  // Always sync active effects after an action
  nextPlayer = recalculatePlayerEffects(nextPlayer, context.campaign);

  // Dynamically generate categories based on state diff
  const categories = new Set<string>();
  if (player.money !== nextPlayer.money || player.bankSavings !== nextPlayer.bankSavings) categories.add('money');
  if (player.happiness !== nextPlayer.happiness) categories.add('happiness');
  if (player.dependability !== nextPlayer.dependability) categories.add('dependability');
  if (player.experience !== nextPlayer.experience) categories.add('experience');
  if (player.relaxation !== nextPlayer.relaxation) categories.add('relaxation');
  if (player.lifestyle !== nextPlayer.lifestyle) categories.add('lifestyle');
  if (player.mentalCondition !== nextPlayer.mentalCondition) categories.add('mental');
  if (player.physicalCondition !== nextPlayer.physicalCondition) categories.add('physical');

  if (categories.size > 0 && actionLog) {
    const catArray = Array.from(categories);
    if (Array.isArray(actionLog)) {
      actionLog = actionLog.map(e => ({ ...e, categories: e.categories ? Array.from(new Set([...e.categories, ...catArray])) : catArray }));
    } else {
      actionLog = { ...actionLog, categories: actionLog.categories ? Array.from(new Set([...actionLog.categories, ...catArray])) : catArray };
    }
  }

  return {
    updatedPlayer: nextPlayer,
    actionLog,
    updatedPawnShopItemsForSale,
    outEngineDecisions
  };
}
