import { type PlayerState, type GameRules, type OwnedAppliance, type PawnedItem, type GameEvent, recalculatePlayerEffects, collectItemEffects } from './gameState';
import { type CampaignBundle } from './dataLoader';
import { type Random } from '../utils/rng';
import { applyForJob, workShift } from './jobEngine';
import { buyItem } from './shoppingEngine';
import { enrollInDegree, study } from './educationEngine';
import { spendHours } from './timeManager';
import { calcItemPrice, calcEconomyPrice } from './economyEngine';
import { calcMovingFee, messGrowth, safeDecrementPhysical, safeDecrementMental, calcMaxMess } from './statMath';
import { buildAdjacencyMap, findShortestPath } from '../graphics/pathfinding';
import { processStreetRobbery } from './eventEngine';
import { resolveDecision, type EngineDecision, type ReplayContext } from './replayTypes';
import { requireConfig } from './rules';
import { applyMoraleEffect, applyHappinessChange } from './statEffects';

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
  | { type: 'ask_rent_extension' }
  | { type: 'clean' }
  | { type: 'call_cleaning_service' }
  | { type: 'socialize_guests' };

export interface ReducerContext {
  campaign: CampaignBundle;
  rules: GameRules;
  turn: number;
  economicIndex: number;
  rng: Random;
  state: import('./gameState').GameState;
  engineDecisions?: EngineDecision[]; // Incoming decisions for replay
}

export interface ReducerResult {
  updatedPlayer: PlayerState;
  actionLog?: GameEvent | GameEvent[];
  updatedPawnShopItemsForSale?: PawnedItem[];
  outEngineDecisions?: EngineDecision[];
}

export function gameReducer(
  player: PlayerState,
  action: GameAction,
  context: ReducerContext
): ReducerResult {
  let nextPlayer = structuredClone(player);
  let actionLog: GameEvent | GameEvent[] | undefined = undefined;
  let updatedPawnShopItemsForSale: PawnedItem[] | undefined = undefined;
  let outEngineDecisions: EngineDecision[] = [];
  const replayContext: ReplayContext = {
    inDecisions: context.engineDecisions,
    outDecisions: outEngineDecisions
  };

  switch (action.type) {
    case 'apply': {
      const jobDef = context.campaign.jobs.find(j => j.id === action.jobId);
      if (jobDef) {
        const jobApplicationCost = requireConfig(context.campaign.config.timeRules?.jobApplicationCost, 'timeRules.jobApplicationCost');
        const result = applyForJob(nextPlayer, jobDef, jobApplicationCost, context.campaign.messages, action.offeredWage, context.rng, context.rules, context.turn, replayContext);
        nextPlayer = result.updated;
        actionLog = result.message;
      }
      break;
    }
    case 'work': {
      const jobDef = context.campaign.jobs.find(j => j.id === action.jobId);
      if (jobDef) {
        const workSessionCost = requireConfig(context.campaign.config.timeRules?.workSessionCost, 'timeRules.workSessionCost');
        const result = workShift(nextPlayer, jobDef, workSessionCost, context.rules, context.campaign.config.statRules);
        nextPlayer = result.updated;
        if (result.success) {
          const workedEvent: any = { key: 'action.job.worked', params: { title: jobDef.title, wagesEarned: result.wagesEarned, stats: '' } };
          if (context.rules.usePhysicalMentalConditions) {
            const statRules = context.campaign.config.statRules;
            const minPhysical = statRules?.minPhysicalCondition ?? 5;
            const minMental = statRules?.minMentalCondition ?? 5;
            
            const actionCount = (nextPlayer.workActionsThisTurn || 0) + 1;
            nextPlayer.workActionsThisTurn = actionCount;

            const overtimeThreshold = statRules?.workOvertimeThreshold ?? 8;
            const grindThreshold = statRules?.workGrindThreshold ?? 4;

            let physicalCost: number;
            let mentalCost: number;

            if (actionCount >= overtimeThreshold) {
              physicalCost = statRules?.workOvertimePhysicalCost ?? 2;
              mentalCost = statRules?.workOvertimeMentalCost ?? 2;
            } else if (actionCount >= grindThreshold) {
              physicalCost = statRules?.workGrindPhysicalCost ?? 1;
              mentalCost = statRules?.workGrindMentalCost ?? 1;
            } else {
              physicalCost = statRules?.workPhysicalCost ?? 1;
              mentalCost = statRules?.workNormalMentalCost ?? 0;
            }

            const currentPhys = nextPlayer.physicalCondition ?? (statRules?.startingPhysicalCondition ?? 15);
            nextPlayer.physicalCondition = safeDecrementPhysical(currentPhys, physicalCost, minPhysical);

            if (mentalCost > 0) {
              const oldMental = nextPlayer.mentalCondition ?? (statRules?.startingMentalCondition ?? 15);
              const newMental = safeDecrementMental(oldMental, mentalCost, minMental);
              nextPlayer.mentalCondition = newMental;

              const mentalDrop = oldMental - newMental;
              const resThreshold = statRules?.resilienceDropThreshold ?? 3;
              if (mentalDrop >= resThreshold) {
                nextPlayer.resilienceBonus = (nextPlayer.resilienceBonus || 0) + 1;
                nextPlayer.mentalConditionMax = Math.min(statRules?.globalMaxMentalCondition ?? 99, (nextPlayer.mentalConditionMax || (statRules?.maxMentalCondition ?? 25)) + 1);
              }
              workedEvent.params.stats = ` (-${physicalCost} Physical, -${mentalCost} Mental)`;
            } else {
              workedEvent.params.stats = ` (-${physicalCost} Physical)`;
            }
          }
          if (result.messages && result.messages.length > 0) {
             actionLog = [workedEvent, ...result.messages];
          } else {
             actionLog = workedEvent;
          }
        } else {
          actionLog = (result.messages && result.messages.length > 0) ? result.messages : { key: 'action.error.cannotWork' };
        }
      }
      break;
    }
    case 'buy': {
      const currentBuildingId = context.campaign.map?.nodes?.find(n => n.id === nextPlayer.position)?.buildingId;
      const buildingDef = context.campaign.buildings.find(b => b.id === currentBuildingId);
      const inventoryEntry = buildingDef?.inventory?.find(i => i.itemId === action.itemId);
      const baseItemDef = context.campaign.items.find(i => i.id === action.itemId);
      
      console.log(`[DEBUG-GAMEREDUCER-BUY] itemId=${action.itemId}, currentBuilding=${currentBuildingId}, itemDefFound=${!!baseItemDef}`);
      
      if (baseItemDef) {
        const timeCost = baseItemDef.id === 'newspaper' ? context.campaign.config.timeRules.newspaperCost : 0;
        if (timeCost > 0 && nextPlayer.hoursRemaining < timeCost) {
          if (!context.rules.allowPartialHours) {
            actionLog = { key: 'action.error.notEnoughTimeBuy', params: { name: baseItemDef.name } };
            break;
          }
        }
        
        // Resolve price from inventory override or fallback to old basePrice, default to 0
        const basePrice = inventoryEntry?.priceOverride ?? baseItemDef.basePrice ?? 0;
        
        // Ensure price is adjusted for economy, respecting fixed-price items
        const itemForPricing = { ...baseItemDef, basePrice };
        const adjustedPrice = calcItemPrice(itemForPricing, context.economicIndex);
        const itemWithPriceAndStore = { ...baseItemDef, basePrice: adjustedPrice, store: currentBuildingId };
        
        const result = buyItem(nextPlayer, itemWithPriceAndStore, context.rules);
        console.log(`[DEBUG-GAMEREDUCER-BUY] buyItem success=${result.success}, newMoney=${result.updated.money}`);
        if (result.success) {
          nextPlayer = spendHours(result.updated, timeCost);
          if (baseItemDef.id === 'newspaper') {
            nextPlayer.turnFlags.readNewspaperThisTurn = true;
          }
          if (context.rules.usePhysicalMentalConditions) {
            if (baseItemDef.category === 'appliance' || baseItemDef.category === 'clothes') {
              nextPlayer.lifestyle = Math.min(100, (nextPlayer.lifestyle || 50) + 1);
            }
            if (baseItemDef.category === 'fast_food' || ['fries', 'shake', 'cola', 'astro_chicken'].includes(baseItemDef.id)) {
              const minPhys = nextPlayer.minPhysicalCondition ?? 3;
              nextPlayer.physicalCondition = safeDecrementPhysical(nextPlayer.physicalCondition ?? 50, 1, minPhys);
            }
          }
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
        const studySessionCost = requireConfig(context.campaign.config.timeRules?.studySessionCost, 'timeRules.studySessionCost');
        const result = study(nextPlayer, degDef, studySessionCost, context.rules);
        nextPlayer = result.updated;
        if (result.success && context.rules.usePhysicalMentalConditions) {
          const statRules = context.campaign.config.statRules;
          const minMental = statRules?.minMentalCondition ?? 5;
          const minPhysical = statRules?.minPhysicalCondition ?? 5;

          const actionCount = (nextPlayer.studyActionsThisTurn || 0) + 1;
          nextPlayer.studyActionsThisTurn = actionCount;

          const overtimeThreshold = statRules?.studyOvertimeThreshold ?? 8;
          const grindThreshold = statRules?.studyGrindThreshold ?? 4;

          let mentalCost: number;
          let physicalCost: number;

          if (actionCount >= overtimeThreshold) {
            mentalCost = statRules?.studyOvertimeMentalCost ?? 2;
            physicalCost = statRules?.studyOvertimePhysicalCost ?? 1;
          } else if (actionCount >= grindThreshold) {
            mentalCost = statRules?.studyGrindMentalCost ?? 2;
            physicalCost = statRules?.studyGrindPhysicalCost ?? 0;
          } else {
            mentalCost = statRules?.studyMentalCost ?? statRules?.studyNormalMentalCost ?? 1;
            physicalCost = statRules?.studyNormalPhysicalCost ?? 0;
          }

          const oldMental = nextPlayer.mentalCondition ?? (statRules?.startingMentalCondition ?? 15);
          const newMental = safeDecrementMental(oldMental, mentalCost, minMental);
          nextPlayer.mentalCondition = newMental;

          const mentalDrop = oldMental - newMental;
          const resThreshold = statRules?.resilienceDropThreshold ?? 3;
          if (mentalDrop >= resThreshold) {
            nextPlayer.resilienceBonus = (nextPlayer.resilienceBonus || 0) + 1;
            nextPlayer.mentalConditionMax = Math.min(statRules?.globalMaxMentalCondition ?? 99, (nextPlayer.mentalConditionMax || (statRules?.maxMentalCondition ?? 25)) + 1);
          }

          if (physicalCost > 0) {
            const currentPhys = nextPlayer.physicalCondition ?? (statRules?.startingPhysicalCondition ?? 15);
            nextPlayer.physicalCondition = safeDecrementPhysical(currentPhys, physicalCost, minPhysical);
          }

          const statsStr = physicalCost > 0 
            ? ` (-${mentalCost} Mental, -${physicalCost} Physical)` 
            : ` (-${mentalCost} Mental)`;

          actionLog = { key: 'action.education.studied', params: { name: degDef.name, current: nextPlayer.enrolledClasses![degDef.id], required: result.message?.params?.required || 0, stats: statsStr } };
        } else {
          actionLog = result.message;
        }
      }
      break;
    }
    case 'relax': {
      const relaxCost = requireConfig(context.campaign.config.timeRules?.relaxCost, 'timeRules.relaxCost');
      const relaxGain = context.campaign.config.timeRules.relaxGain ?? 3;
      if (nextPlayer.hoursRemaining < relaxCost) {
        if (!context.rules.allowPartialHours || nextPlayer.hoursRemaining <= 0) {
          actionLog = { key: 'action.error.notEnoughTimeRelax' };
          break;
        }
      }
      
      const actualHours = Math.min(relaxCost, nextPlayer.hoursRemaining);
      nextPlayer = spendHours(nextPlayer, actualHours);
      
      let statsStr = '';
      if (context.rules.usePhysicalMentalConditions) {
        const statRules = context.campaign.config.statRules;
        const maxPhysical = nextPlayer.physicalConditionMax ?? statRules?.initialPhysicalMax ?? 50;
        const maxMental = nextPlayer.mentalConditionMax ?? 50;

        const relaxEffects = collectItemEffects(nextPlayer, context.campaign, 'on_relax');
        const physBonus = relaxEffects.get('physical') || 0;
        const mentalBonus = relaxEffects.get('mental') || 0;
        const extraMess = relaxEffects.get('mess') || 0;

        const physGain = 1 + physBonus;
        const hotTubMentalBonus = mentalBonus;

        nextPlayer.physicalCondition = Math.min(maxPhysical, (nextPlayer.physicalCondition ?? maxPhysical) + physGain);
        const firstBonus = nextPlayer.turnFlags.relaxedThisTurn ? 0 : 2;
        const messPenalty = Math.floor((nextPlayer.mess || 0) / 5);
        const mentalGain = Math.max(0, firstBonus + 3 - messPenalty) + hotTubMentalBonus;
        nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? maxMental) + mentalGain);

        if (context.rules.trackMess) {
          const baseRelaxMess = statRules?.relaxMessIncrease ?? 1;
          const relaxMess = baseRelaxMess + extraMess;
          const maxCap = calcMaxMess(nextPlayer, statRules, context.campaign);
          nextPlayer.mess = Math.min(maxCap, (nextPlayer.mess || 0) + relaxMess);
        }

        nextPlayer.homeTimeThisTurn = (nextPlayer.homeTimeThisTurn || 0) + 3;
        statsStr = ` (+${physGain} Physical, +${mentalGain} Mental)`;
      } else {
        nextPlayer.relaxation = Math.min(50, nextPlayer.relaxation + relaxGain);
        if (!nextPlayer.turnFlags.relaxedThisTurn) {
          nextPlayer.happiness = Math.min(100, nextPlayer.happiness + 2);
        }
      }
      
      nextPlayer.turnFlags.relaxedThisTurn = true;
      actionLog = { key: 'action.relax', params: { stats: statsStr } };
      break;
    }
    case 'clean': {
      if (nextPlayer.hoursRemaining < 3) {
        if (!context.rules.allowPartialHours || nextPlayer.hoursRemaining <= 0) {
          actionLog = { key: 'action.error.notEnoughTimeClean' };
          break;
        }
      }
      nextPlayer = spendHours(nextPlayer, 3);
      let cleanStatsStr = '';
      if (context.rules.usePhysicalMentalConditions) {
        const statRules = context.campaign.config.statRules;
        const minPhysical = statRules?.minPhysicalCondition ?? 3;
        const cleanCost = statRules?.cleanPhysicalCost ?? 1;

        const currentPhys = nextPlayer.physicalCondition ?? (statRules?.initialPhysicalMax ?? 50);
        nextPlayer.physicalCondition = safeDecrementPhysical(currentPhys, cleanCost, minPhysical);
        nextPlayer.homeTimeThisTurn = (nextPlayer.homeTimeThisTurn || 0) + 3;
        cleanStatsStr = ` (-${cleanCost} Physical)`;
      }
      if (context.rules.trackMess || context.rules.usePhysicalMentalConditions) {
        const d3_1 = context.rng.nextInt(1, 3);
        const d3_2 = context.rng.nextInt(1, 3);
        const reduction = d3_1 + d3_2;
        const minMess = context.campaign.config.statRules?.globalMessMin ?? 0;
        nextPlayer.mess = Math.max(minMess, (nextPlayer.mess || 0) - reduction);
      }
      actionLog = { key: 'action.clean', params: { stats: cleanStatsStr } };
      break;
    }
    case 'call_cleaning_service': {
      const timeCost = context.campaign.config.timeRules?.cleaningServiceCost ?? 1;
      if (nextPlayer.hoursRemaining < timeCost) {
        actionLog = { key: 'action.error.notEnoughTimeClean' };
        break;
      }
      const basePrice = context.campaign.config.economyRules?.cleaningServiceBasePrice ?? 100;
      const price = calcEconomyPrice(basePrice, context.economicIndex);
      if (nextPlayer.money < price) {
        actionLog = { key: 'action.error.notEnoughMoneyCleanService' };
        break;
      }
      nextPlayer = spendHours(nextPlayer, timeCost);
      nextPlayer.money -= price;
      const minMess = context.campaign.config.statRules?.globalMessMin ?? 0;
      nextPlayer.mess = Math.max(minMess, (nextPlayer.mess || 0) - 10);
      actionLog = { key: 'action.callCleaningService', params: { cost: price } };
      break;
    }
    case 'socialize_guests': {
      const timeCost = context.campaign.config.timeRules?.socializeCost ?? 6;
      if (nextPlayer.hoursRemaining < timeCost) {
        actionLog = { key: 'action.error.notEnoughTimeSocialize' };
        break;
      }
      if ((nextPlayer.mess || 0) > 25) {
        actionLog = { key: 'action.error.messTooHighSocialize' };
        break;
      }
      nextPlayer = spendHours(nextPlayer, timeCost);

      const minPhysical = nextPlayer.minPhysicalCondition ?? 3;
      const currentPhys = nextPlayer.physicalCondition ?? 50;
      nextPlayer.physicalCondition = safeDecrementPhysical(currentPhys, 1, minPhysical);

      const statRules = context.campaign.config.statRules;

      let appBonus = 0;
      if (context.rules.usePhysicalMentalConditions) {
        const socializeEffects = collectItemEffects(nextPlayer, context.campaign, 'on_socialize');
        appBonus += socializeEffects.get('social') || 0;
        appBonus += nextPlayer.activeEffects?.['vcr_social_bonus'] || 0;
      }

      const X = context.rng.nextInt(1, 3);
      const growth = messGrowth(nextPlayer.mess || 0);
      const messGen = X * growth;
      const maxMess = calcMaxMess(nextPlayer, statRules, context.campaign);
      nextPlayer.mess = Math.min(maxMess, (nextPlayer.mess || 0) + messGen);

      const mentalCost = X * growth;
      const finalMentalCost = mentalCost - appBonus;
      const cashRate = nextPlayer.currentHousingId === 'security' ? (context.campaign.config.economyRules?.socializeSecurityCashCost ?? 50) : (context.campaign.config.economyRules?.socializeLowCostCashCost ?? 25);
      const cashCost = X * cashRate;
      const fullReward = nextPlayer.currentHousingId === 'security' ? X * 2 : X;

      const currentMental = nextPlayer.mentalCondition ?? 25;
      const minMental = statRules?.minMentalCondition ?? 5;
      const maxMental = nextPlayer.mentalConditionMax ?? 90;
      const hasFullCash = nextPlayer.money >= cashCost;
      const hasFullMental = finalMentalCost <= 0 || currentMental >= finalMentalCost;

      let actualReward = fullReward + appBonus;
      if (hasFullCash && hasFullMental) {
        nextPlayer.money -= cashCost;
        if (finalMentalCost >= 0) {
          nextPlayer.mentalCondition = safeDecrementMental(currentMental, finalMentalCost, minMental);
        } else {
          nextPlayer.mentalCondition = Math.min(maxMental, currentMental - finalMentalCost);
        }
      } else {
        nextPlayer.money = Math.max(0, nextPlayer.money - cashCost);
        if (finalMentalCost >= 0) {
          nextPlayer.mentalCondition = safeDecrementMental(currentMental, finalMentalCost, minMental);
        } else {
          nextPlayer.mentalCondition = Math.min(maxMental, currentMental - finalMentalCost);
        }
        actualReward = Math.floor(fullReward / 2) + appBonus;
      }

      const maxSocial = statRules?.maxSocial ?? 99;
      nextPlayer.social = Math.min(maxSocial, (nextPlayer.social ?? 9) + actualReward);

      actionLog = { key: 'action.socialize', params: { reward: actualReward, guests: X } };
      break;
    }
    case 'move': {
      const nodeId = action.nodeId;
      if (nextPlayer.position === nodeId) {
        break;
      }

      const adjacencyMap = context.campaign.map?.nodes ? buildAdjacencyMap(context.campaign.map.nodes) : new Map<string, string[]>();
      const pathResult = context.campaign.map?.nodes ? findShortestPath(adjacencyMap, nextPlayer.position, nodeId) : { found: true, steps: 1, path: [] };
      console.log(`[DEBUG-GAMEREDUCER-MOVE] from ${nextPlayer.position} to ${nodeId}: path found=${pathResult.found}, steps=${pathResult.steps}, hoursRemaining=${nextPlayer.hoursRemaining}`);

      if (pathResult.found) {
        const currentBuilding = context.campaign.map?.nodes?.find(n => n.id === nextPlayer.position)?.buildingId;
        if (currentBuilding === 'bank' || currentBuilding === 'blacks_market') {
          const preRobberyMoney = nextPlayer.money;
          const isForced = !!context.state.debugQueue?.some(e => e.type === 'street_robbery' && (e.playerId === nextPlayer.id || !e.playerId));
          nextPlayer = processStreetRobbery(nextPlayer, currentBuilding, context.turn, context.rng, context.campaign, replayContext, isForced);
          if (isForced && context.state.debugQueue) {
            context.state.debugQueue = context.state.debugQueue.filter(e => !(e.type === 'street_robbery' && (e.playerId === nextPlayer.id || !e.playerId)));
          }
          if (nextPlayer.money < preRobberyMoney) {
            actionLog = { key: 'log.robbery' };
          }
        }

        const movementCost = (context.campaign.config.mapRules as any)?.movementCostPerNode ?? 1;
        let requiredHours = pathResult.steps * movementCost;
        
        const destNode = context.campaign.map?.nodes?.find(n => n.id === nodeId);
        if (destNode && destNode.buildingId) {
            const buildingEntryCost = requireConfig(context.campaign.config.timeRules?.buildingEntryCost, 'timeRules.buildingEntryCost');
            requiredHours += buildingEntryCost;
        }

        if (nextPlayer.hoursRemaining >= requiredHours || context.rules.allowPartialHours) {
          nextPlayer.position = nodeId;
          nextPlayer = spendHours(nextPlayer, requiredHours);
          console.log(`[DEBUG-GAMEREDUCER-MOVE-SUCCESS] new position: ${nextPlayer.position}, hoursRemaining: ${nextPlayer.hoursRemaining}`);
        } else {
          actionLog = { key: 'action.error.notEnoughTime' };
          console.log(`[DEBUG-GAMEREDUCER-MOVE-FAIL] not enough time`);
        }
      } else {
         console.log(`[DEBUG-GAMEREDUCER-MOVE-FAIL] path not found`);
      }
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
      const timeCost = requireConfig(context.campaign.config.timeRules?.brokerCost, 'timeRules.brokerCost');
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
      const timeCost = requireConfig(context.campaign.config.timeRules?.loanCost, 'timeRules.loanCost');
      if (nextPlayer.hoursRemaining < timeCost && !context.rules.allowPartialHours) {
        actionLog = { key: 'action.error.notEnoughTimeLoan' };
        break;
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
        if (nextPlayer.currentHousingId === housingDef.id) {
          actionLog = { key: 'action.rent.alreadyLiveHere', params: { name: housingDef.name } };
        } else {
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
        ownerId: nextPlayer.id,
        purchaseSource: action.item.purchaseSource || 'socket_city'
      };
      nextPlayer.inventory.pawnedItems.push(pawnedItem);
      nextPlayer.money += action.value;
      nextPlayer = applyHappinessChange(nextPlayer, -1, 'pawn_item', context.rules, context.campaign.config.statRules);
      if (action.item.id === 'refrigerator' && nextPlayer.inventory.freshFoodUnits > 0) {
        nextPlayer = applyHappinessChange(nextPlayer, -1, 'pawn_item', context.rules, context.campaign.config.statRules);
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
          purchaseSource: action.item.purchaseSource || 'socket_city'
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
      if (nextPlayer.rentPaidUntilWeek > context.turn + 1) {
        actionLog = { key: 'rentOffice.notNeeded' };
        break;
      }
      if (nextPlayer.rentExtensionActive || nextPlayer.turnFlags.askedForExtension) {
        actionLog = { key: 'action.rent.alreadyGranted' };
        break;
      }
      if (nextPlayer.rentExtensionsDeniedPermanently) {
        actionLog = { key: 'action.rent.extensionDenied' };
        break;
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
      break;
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
