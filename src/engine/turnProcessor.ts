/**
 * turnProcessor.ts — Orchestrates the turn-start event sequence.
 */
import { type GameState, type StatModification, recalculatePlayerEffects, collectItemEffects } from './gameState';
import { type CampaignBundle } from './dataLoader';
import { applyMoraleEffect } from './statEffects';
import { messGrowth, calcMaxMental, calcMaxMess } from './statMath';
import { resetPlayerClock } from './timeManager';
import { Random } from '../utils/rng';
import { resolveDecision, type ReplayContext } from './replayTypes';
import {
  processEconomicTurnPhase,
  processHealthAndFoodPhase,
  processHousingAndLoanPhase,
  processPawnExpiration,
  processMaintenanceAndDecayPhase,
  processPostHealthMaintenance
} from './turn';

export function processTurnStart(state: GameState, campaign: CampaignBundle, replay?: ReplayContext): GameState {
  const rng = new Random(state.rngState);

  // 1. Economic Changes & Market Crash/Boom Phase
  const econResult = processEconomicTurnPhase(state, campaign, rng, replay);

  const previousPlayerWeekends: string[] = [];
  const newPawnShopItemsForSale = [...(state.pawnShopItemsForSale || [])];

  // Process each player
  const updatedPlayers = state.players.map(player => {
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
      freeNewspaper: false,
      hasSeenEvents: state.turn === 0,
      hasSeenWeekend: state.turn === 0,
      loanDefaultWarning: false,
      loanPayableWarning: false,
      mentalDropsThisTurn: 0,
      firedLocationsThisTurn: [],
      workMistakesThisTurn: 0,
      jobsRejectedThisTurn: []
    };
    p.turnEvents = [];
    p.newspaperHeadline = null;
    p.workActionsThisTurn = 0;
    p.workMistakesThisTurn = 0;
    if (state.rules.usePhysicalMentalConditions || p.studyActionsThisTurn !== undefined) {
      p.studyActionsThisTurn = 0;
    }

    if (state.rules.turnStartAtHome) {
      const housing = campaign?.housing?.find(h => h.id === p.currentHousingId);
      if (housing && housing.homeNodeId) {
        p.position = housing.homeNodeId;
      }
    }

    if (state.turn > 0) {
      const preTurnStats = {
        dependability: p.dependability,
        mess: p.mess ?? 0,
        social: p.social ?? 9,
        physicalCondition: p.physicalCondition ?? 50,
        mentalCondition: p.mentalCondition ?? 50,
        happiness: p.happiness,
        relaxation: p.relaxation
      };

      if (state.rules.trackMess) {
        const maxMess = calcMaxMess(p, campaign.config.statRules);
        const growth = messGrowth(p.mess || 0);
        p.mess = Math.min(maxMess, (p.mess || 0) + growth);
      }
      if (state.rules.usePhysicalMentalConditions) {
        const minSocial = campaign.config.statRules?.minSocial ?? 1;
        p.social = Math.max(minSocial, (p.social ?? 9) - 1);
        p.mentalConditionMax = calcMaxMental(p.mess || 0, p.social || 9, p.resilienceBonus || 0, p, campaign.config.statRules, campaign);
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
          const maxPhys = p.physicalConditionMax ?? 50;
          p.physicalCondition = Math.min(maxPhys, (p.physicalCondition ?? 50) + physBonus);
        }
        if (mentalBonus > 0) {
          const maxMental = p.mentalConditionMax ?? 50;
          p.mentalCondition = Math.min(maxMental, (p.mentalCondition ?? 50) + mentalBonus);
        }
      } else {
        const turnHappinessBonus = p.activeEffects?.['add_turn_happiness'] || 0;
        if (turnHappinessBonus > 0) {
          p = applyMoraleEffect(p, turnHappinessBonus, 'cooking_bonus', state.rules, campaign.config.statRules);
        }
      }

      // Maintenance & Decay Phase 1 (Winner check, weekend, lottery, computer profit, relaxation/dep decay, apartment robbery)
      const { updatedPlayer, preRobberyStorage } = processMaintenanceAndDecayPhase(
        p,
        state,
        campaign,
        rng,
        replay,
        previousPlayerWeekends,
        econResult
      );
      p = updatedPlayer;

      if (p.weekendResult) {
        const mods: StatModification[] = [];
        if (p.weekendResult.cost > 0) {
          mods.push({ stat: 'money', diff: -p.weekendResult.cost });
        }
        if (state.rules.usePhysicalMentalConditions) {
          const mentalDiff = (p.mentalCondition ?? 0) - preTurnStats.mentalCondition;
          if (mentalDiff !== 0) {
            mods.push({ stat: 'mental', diff: mentalDiff });
          }
          const physDiff = (p.physicalCondition ?? 0) - preTurnStats.physicalCondition;
          if (physDiff !== 0) {
            mods.push({ stat: 'physical', diff: physDiff });
          }
          const socDiff = (p.social ?? 0) - preTurnStats.social;
          if (socDiff !== 0) {
            mods.push({ stat: 'social', diff: socDiff });
          }
        } else {
          const hapDiff = p.happiness - preTurnStats.happiness;
          if (hapDiff !== 0) {
            mods.push({ stat: 'happiness', diff: hapDiff });
          }
          const relaxDiff = p.relaxation - preTurnStats.relaxation;
          if (relaxDiff !== 0) {
            mods.push({ stat: 'relaxation', diff: relaxDiff });
          }
        }
        const depDiff = p.dependability - preTurnStats.dependability;
        if (depDiff !== 0) {
          mods.push({ stat: 'dependability', diff: depDiff });
        }
        if (state.rules.trackMess) {
          const messDiff = (p.mess ?? 0) - preTurnStats.mess;
          if (messDiff !== 0) {
            mods.push({ stat: 'mess', diff: messDiff });
          }
        }
        p.weekendResult.modifications = mods;
      }

      // Recalculate active effects immediately after robbery so loss of appliances affects stats
      p = recalculatePlayerEffects(p, campaign);

      // Health, Food Spoilage, Starvation & Doctor Phase
      p = processHealthAndFoodPhase(p, state, campaign, rng, replay, preRobberyStorage);

      // Housing, Rent, Clothing Decay & Loan Phase
      p = processHousingAndLoanPhase(p, state, campaign);

      // Maintenance Phase 2 (Appliance repair, economic events, donations)
      p = processPostHealthMaintenance(p, state, campaign, rng, replay, econResult);

      // Pawn Shop Expiration
      p = processPawnExpiration(p, state, newPawnShopItemsForSale);
    }

    // Player Control (Set Newspaper if none)
    if (!p.newspaperHeadline) {
      const randomHeadlines = [
        "newspaper.random.1",
        "newspaper.random.2",
        "newspaper.random.3",
        "newspaper.random.4"
      ];
      const headlineIdx = resolveDecision(replay, `newspaper_headline_${p.id}`, () => Math.floor(rng.next() * randomHeadlines.length));
      p.newspaperHeadline = { key: randomHeadlines[headlineIdx] };
    }

    const housing = campaign?.housing?.find(h => h.id === p.currentHousingId);
    p.position = housing?.homeNodeId || (p.currentHousingId === 'security' || p.currentHousingId === 'penthouse' ? 'node_security' : 'node_low_cost');

    return p;
  });

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
    economicTrend: econResult.newTrend,
    pawnShopItemsForSale: newPawnShopItemsForSale,
    players: updatedPlayers,
    turn: state.turn + 1,
    phase,
    winnerId,
  };

  if (survivingDebugQueue.length > 0) {
    resultState.debugQueue = survivingDebugQueue;
  } else {
    delete resultState.debugQueue;
  }

  return resultState;
}
