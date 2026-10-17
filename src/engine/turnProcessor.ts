/**
 * turnProcessor.ts — Orchestrates the turn-start event sequence.
 * Separates the frozen Base player turn pipeline from the Advanced player turn pipeline.
 */
import { type GameState, type PlayerState, type StatModification, type PawnedItem, recalculatePlayerEffects, collectItemEffects } from './gameState';
import { type CampaignBundle } from './dataLoader';
import { applyMoraleEffect } from './statEffects';
import { messGrowth, calcMaxMental, calcMaxMess } from './statMath';
import { resetPlayerClock } from './timeManager';
import { Random } from '../utils/rng';
import { resolveDecision, type ReplayContext } from './replayTypes';
import {
  processEconomicTurnPhase,
  processBaseHealthAndFood,
  processAdvancedHealthAndFood,
  processHousingAndLoanPhase,
  processPawnExpiration,
  processBaseMaintenanceAndDecay,
  processAdvancedMaintenanceAndDecay,
  processPostHealthMaintenance,
  type EconomicTurnResult
} from './turn';
import { mergeWeekendModifications } from './weekendEngine';
import { isBaseVersion, requireAdvancedStatRules } from './rules';

function resetCommonTurnState(player: PlayerState, state: GameState, campaign: CampaignBundle): PlayerState {
  let p = resetPlayerClock(structuredClone(player), campaign.config.timeRules.hoursPerTurn);
  p = recalculatePlayerEffects(p, campaign);

  p.turnFlags = {
    hasEaten: false,
    hasWorked: false,
    drinkHappinessGranted: false,
    fastFoodHappinessGranted: false,
    freshFoodHappinessGranted: false,
    caffeineDebt: p.turnFlags?.caffeineDebt || 0,
    askedForExtension: false,
    rentPaidThisTurn: false,
    loanPaidThisTurn: false,
    freeNewspaper: false,
    hasSeenEvents: state.turn === 0,
    hasSeenWeekend: state.turn === 0,
    loanDefaultWarning: false,
    loanPayableWarning: false,
    mentalDropsThisTurn: 0,
    firedLocationsThisTurn: [],
    workMistakesThisTurn: 0,
    jobsRejectedThisTurn: [],
    fastFoodMealsThisTurn: 0,
    ...(state.rules.clothingDecaysAll === false || (state.rules.clothesSwitching && state.rules.clothesSwitching !== 'autoBest')
      ? { clothesWornThisTurn: [] }
      : {})
  };
  p.turnEvents = [];
  p.newspaperHeadline = null;
  p.workActionsThisTurn = 0;
  p.workMistakesThisTurn = 0;
  return p;
}

function finalizePlayerControlAndPosition(
  p: PlayerState,
  campaign: CampaignBundle,
  rng: Random,
  replay: ReplayContext | undefined,
  econResult: EconomicTurnResult
): PlayerState {
  if (!p.newspaperHeadline) {
    const randomHeadlines = [
      'newspaper.random.1',
      'newspaper.random.2',
      'newspaper.random.3',
      'newspaper.random.4'
    ];
    const headlineIdx = resolveDecision(replay, `newspaper_headline_${p.id}`, () => Math.floor(rng.next() * randomHeadlines.length));
    p.newspaperHeadline = { key: randomHeadlines[headlineIdx] };
  }

  if (econResult.currentHeadline?.stockTip && !p.newspaperHeadline.stockTip) {
    p.newspaperHeadline.stockTip = econResult.currentHeadline.stockTip;
  }

  const housing = campaign.housing.find(h => h.id === p.currentHousingId);
  p.position = housing?.homeNodeId || (p.currentHousingId === 'security' || p.currentHousingId === 'penthouse' ? 'node_security' : 'node_low_cost');

  return p;
}

/**
 * Frozen Base Player Turn Pipeline (Floppy, CD-ROM, QoL Improved).
 * Protected from Advanced mechanics (no mess, social, physical/mental conditions, curios, or alternative weekends).
 */
function processBasePlayerTurn(
  player: PlayerState,
  state: GameState,
  campaign: CampaignBundle,
  rng: Random,
  replay: ReplayContext | undefined,
  previousPlayerWeekends: string[],
  econResult: EconomicTurnResult,
  newPawnShopItemsForSale: PawnedItem[]
): PlayerState {
  let p = resetCommonTurnState(player, state, campaign);

  if (state.turn > 0) {
    const preTurnStats = {
      dependability: p.dependability,
      happiness: p.happiness,
      relaxation: p.relaxation
    };

    const turnHappinessBonus = p.activeEffects['add_turn_happiness'] || 0;
    if (turnHappinessBonus > 0) {
      p = applyMoraleEffect(p, turnHappinessBonus, 'cooking_bonus', state.rules, campaign.config.statRules);
    }

    const { updatedPlayer, preRobberyStorage } = processBaseMaintenanceAndDecay(
      p,
      state,
      campaign,
      rng,
      replay,
      previousPlayerWeekends
    );
    p = updatedPlayer;

    const maintenanceMods: StatModification[] = [];
    const hapDiff = p.happiness - preTurnStats.happiness;
    if (hapDiff !== 0) {
      maintenanceMods.push({ stat: 'happiness', diff: hapDiff, label: 'Weekly Upkeep' });
    }
    const relaxDiff = p.relaxation - preTurnStats.relaxation;
    if (relaxDiff !== 0) {
      maintenanceMods.push({ stat: 'relaxation', diff: relaxDiff, label: 'Weekly Upkeep' });
    }
    const depDiff = p.dependability - preTurnStats.dependability;
    if (depDiff !== 0) {
      maintenanceMods.push({ stat: 'dependability', diff: depDiff, label: 'Dependability Decay' });
    }

    if (p.weekendResult) {
      const activityMods: StatModification[] = [];
      if (p.weekendResult.cost > 0) {
        activityMods.push({ stat: 'money', diff: -p.weekendResult.cost, label: 'Weekend Cost' });
      }
      if (p.weekendResult.happinessBonus) {
        activityMods.push({ stat: 'happiness', diff: p.weekendResult.happinessBonus, label: 'Weekend Activity' });
      }
      if (activityMods.length > 0) {
        p.weekendResult.activityModifications = activityMods;
      }
      if (maintenanceMods.length > 0) {
        p.weekendResult.maintenanceModifications = maintenanceMods;
      }
      p.weekendResult.modifications = mergeWeekendModifications(activityMods, maintenanceMods);
    }

    p = recalculatePlayerEffects(p, campaign);
    p = processBaseHealthAndFood(p, state, campaign, rng, replay, preRobberyStorage);
    p = processHousingAndLoanPhase(p, state, campaign);
    p = processPostHealthMaintenance(p, state, campaign, rng, replay, econResult);
    p = processPawnExpiration(p, state, newPawnShopItemsForSale);
  }

  return finalizePlayerControlAndPosition(p, campaign, rng, replay, econResult);
}

/**
 * Advanced Player Turn Pipeline.
 */
function processAdvancedPlayerTurn(
  player: PlayerState,
  state: GameState,
  campaign: CampaignBundle,
  rng: Random,
  replay: ReplayContext | undefined,
  previousPlayerWeekends: string[],
  econResult: EconomicTurnResult,
  newPawnShopItemsForSale: PawnedItem[]
): PlayerState {
  let p = resetCommonTurnState(player, state, campaign);
  p.studyActionsThisTurn = 0;

  if (state.rules.turnStartAtHome) {
    const housing = campaign.housing.find(h => h.id === p.currentHousingId);
    if (housing && housing.homeNodeId) {
      p.position = housing.homeNodeId;
    }
  }

  if (state.turn > 0) {
    const sr = requireAdvancedStatRules(campaign.config.statRules);
    const preTurnStats = {
      dependability: p.dependability,
      mess: p.mess ?? 0,
      social: p.social ?? sr.startingSocial,
      physicalCondition: p.physicalCondition ?? sr.startingPhysicalCondition,
      mentalCondition: p.mentalCondition ?? sr.startingMentalCondition,
      happiness: p.happiness,
      relaxation: p.relaxation
    };

    if (state.rules.trackMess) {
      const maxMess = calcMaxMess(p, sr);
      const growth = messGrowth(p.mess || 0);
      p.mess = Math.min(maxMess, (p.mess || 0) + growth);
    }
    if (state.rules.usePhysicalMentalConditions) {
      if (state.rules.trackSocial) {
        p.social = Math.max(sr.minSocial, (p.social ?? sr.startingSocial) - 1);
      }
      const currentSocial = state.rules.trackSocial ? (p.social ?? sr.startingSocial) : 0;
      p.mentalConditionMax = calcMaxMental(p.mess || 0, currentSocial, p.resilienceBonus || 0, p, sr, campaign);
      if (p.mentalCondition !== undefined && p.mentalCondition > p.mentalConditionMax) {
        p.mentalCondition = p.mentalConditionMax;
      }
    }
    if (state.rules.useHomeTimeRobbery) {
      if (!p.homeTimeHistory) p.homeTimeHistory = [];
      p.homeTimeHistory.push(p.homeTimeThisTurn || 0);
      if (p.homeTimeHistory.length > 4) {
        p.homeTimeHistory.shift();
      }
      p.homeTimeThisTurn = 0;
    }

    // Turn-Start Item Effects (Cooking & Hot Tub cumulative bonuses)
    if (state.rules.usePhysicalMentalConditions) {
      const turnStartEffects = collectItemEffects(p, campaign, 'turn_start');
      const physBonus = turnStartEffects.get('physical') || 0;
      const mentalBonus = turnStartEffects.get('mental') || 0;

      if (physBonus > 0) {
        const maxPhys = p.physicalConditionMax ?? sr.initialPhysicalMax;
        p.physicalCondition = Math.min(maxPhys, (p.physicalCondition ?? sr.startingPhysicalCondition) + physBonus);
      }
      if (mentalBonus > 0) {
        const maxMental = p.mentalConditionMax ?? sr.maxMentalCondition;
        p.mentalCondition = Math.min(maxMental, (p.mentalCondition ?? sr.startingMentalCondition) + mentalBonus);
      }
    } else {
      const turnHappinessBonus = p.activeEffects['add_turn_happiness'] || 0;
      if (turnHappinessBonus > 0) {
        p = applyMoraleEffect(p, turnHappinessBonus, 'cooking_bonus', state.rules, sr);
      }
    }

    const { updatedPlayer, preRobberyStorage } = processAdvancedMaintenanceAndDecay(
      p,
      state,
      campaign,
      rng,
      replay,
      previousPlayerWeekends
    );
    p = updatedPlayer;

    const maintenanceMods: StatModification[] = [];
    if (state.rules.usePhysicalMentalConditions) {
      const mentalDiff = (p.mentalCondition ?? 0) - preTurnStats.mentalCondition;
      if (mentalDiff !== 0) {
        maintenanceMods.push({ stat: 'mental', diff: mentalDiff, label: 'Weekly Upkeep' });
      }
      const physDiff = (p.physicalCondition ?? 0) - preTurnStats.physicalCondition;
      if (physDiff !== 0) {
        maintenanceMods.push({ stat: 'physical', diff: physDiff, label: 'Weekly Upkeep' });
      }
      if (state.rules.trackSocial) {
        const socDiff = (p.social ?? 0) - preTurnStats.social;
        if (socDiff !== 0) {
          maintenanceMods.push({ stat: 'social', diff: socDiff, label: 'Weekly Upkeep' });
        }
      }
    } else {
      const hapDiff = p.happiness - preTurnStats.happiness;
      if (hapDiff !== 0) {
        maintenanceMods.push({ stat: 'happiness', diff: hapDiff, label: 'Weekly Upkeep' });
      }
      const relaxDiff = p.relaxation - preTurnStats.relaxation;
      if (relaxDiff !== 0) {
        maintenanceMods.push({ stat: 'relaxation', diff: relaxDiff, label: 'Weekly Upkeep' });
      }
    }
    const depDiff = p.dependability - preTurnStats.dependability;
    if (depDiff !== 0) {
      maintenanceMods.push({ stat: 'dependability', diff: depDiff, label: 'Dependability Decay' });
    }
    if (state.rules.trackMess) {
      const messDiff = (p.mess ?? 0) - preTurnStats.mess;
      if (messDiff !== 0) {
        maintenanceMods.push({ stat: 'mess', diff: messDiff, label: 'Apartment Mess' });
      }
    }

    if (p.weekendResult) {
      const activityMods: StatModification[] = [];
      if (p.weekendResult.cost > 0) {
        activityMods.push({ stat: 'money', diff: -p.weekendResult.cost, label: 'Weekend Cost' });
      }
      if (p.weekendResult.happinessBonus) {
        if (p.mentalCondition !== undefined) {
          activityMods.push({ stat: 'mental', diff: p.weekendResult.happinessBonus, label: 'Weekend Activity' });
        } else {
          activityMods.push({ stat: 'happiness', diff: p.weekendResult.happinessBonus, label: 'Weekend Activity' });
        }
      }
      if (activityMods.length > 0) {
        p.weekendResult.activityModifications = activityMods;
      }
      if (maintenanceMods.length > 0) {
        p.weekendResult.maintenanceModifications = maintenanceMods;
      }
      p.weekendResult.modifications = mergeWeekendModifications(activityMods, maintenanceMods);
    } else if (p.offeredWeekendCards) {
      p.maintenanceModifications = maintenanceMods;
    }

    p = recalculatePlayerEffects(p, campaign);
    p = state.rules.usePhysicalMentalConditions
      ? processAdvancedHealthAndFood(p, state, campaign, rng, replay, preRobberyStorage)
      : processBaseHealthAndFood(p, state, campaign, rng, replay, preRobberyStorage);
    p = processHousingAndLoanPhase(p, state, campaign);
    p = processPostHealthMaintenance(p, state, campaign, rng, replay, econResult);
    p = processPawnExpiration(p, state, newPawnShopItemsForSale);
  }

  return finalizePlayerControlAndPosition(p, campaign, rng, replay, econResult);
}

export function processTurnStart(state: GameState, campaign: CampaignBundle, replay?: ReplayContext): GameState {
  const rng = new Random(state.rngState);

  // 1. Economic Changes & Market Crash/Boom Phase
  const econResult = processEconomicTurnPhase(state, campaign, rng, replay);

  const previousPlayerWeekends: string[] = [];
  const newPawnShopItemsForSale = [...(state.pawnShopItemsForSale || [])];

  // Dispatch to Base vs. Advanced player turn pipeline
  const useBasePipeline = isBaseVersion(state.rules) && !state.rules.usePhysicalMentalConditions && !state.rules.trackMess && !state.rules.trackSocial && !state.rules.useHomeTimeRobbery && !state.rules.alternativeWeekends;

  const updatedPlayers = state.players.map(player =>
    useBasePipeline
      ? processBasePlayerTurn(player, state, campaign, rng, replay, previousPlayerWeekends, econResult, newPawnShopItemsForSale)
      : processAdvancedPlayerTurn(player, state, campaign, rng, replay, previousPlayerWeekends, econResult, newPawnShopItemsForSale)
  );

  // Check Game Over
  let phase = state.phase;
  let winnerId = state.winnerId;

  const winner = updatedPlayers.find(p => p.hasWon);
  if (winner) {
    phase = 'game-over';
    winnerId = winner.id;
  }

  const survivingDebugQueue = (state.debugQueue || []).filter(e => e.type === 'street_robbery');

  const resultState: GameState = {
    ...state,
    rngState: rng.getState(),
    economicIndex: econResult.newEconomy,
    ...(state.economicReading !== undefined || !(replay?.inDecisions && replay.inDecisions.length > 0) ? { economicReading: econResult.newEconomy } : {}),
    economicTrend: econResult.newTrend,
    ...(econResult.newEconomySimulation !== undefined ? { economySimulation: econResult.newEconomySimulation } : {}),
    pawnShopItemsForSale: newPawnShopItemsForSale,
    players: updatedPlayers,
    turn: state.turn + 1,
    phase,
    winnerId,
  };

  if (econResult.newEconomySimulation === undefined && 'economySimulation' in resultState) {
    delete (resultState as any).economySimulation;
  }

  if (survivingDebugQueue.length > 0) {
    resultState.debugQueue = survivingDebugQueue;
  } else {
    delete resultState.debugQueue;
  }

  return resultState;
}
