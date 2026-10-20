import type { PlayerState, GameState, GameEvent, StatModification } from '../gameState';
import type { CampaignBundle } from '../dataLoader';
import type { Random } from '../../utils/rng';
import { resolveDecision, type ReplayContext } from '../replayTypes';
import { calcDependabilityDecay, calcWealthProgress, calcEducationProgress, calcCareerProgress, calcWellbeingScore, roundToResolution } from '../statMath';
import { calcLiquidAssets, applyMarketCrash, applyEconomicBoom } from '../economyEngine';
import { applyHappinessChange, applyMentalChange } from '../statEffects';
import { CURIO_CATALOG, ensurePlayerCurios } from '../curioCatalog';
import { processApartmentRobbery, processDonations } from '../eventEngine';
import { processWeekend, generateWeekendChoices, resolveWeekendChoice } from '../weekendEngine';
import { selectAiWeekendCard } from '../aiEngine';
import { resetPlayerClock } from '../timeManager';
import { isBaseVersion } from '../rules';
import type { EconomicTurnResult } from './types';

function checkPlayerWinConditions(player: PlayerState, state: GameState, campaign: CampaignBundle): boolean {
  for (const cond of campaign.config.winConditions) {
    const target = player.goalAllotment[cond.stat] || 0;
    let progress = 0;
    if (cond.stat === 'wealth') {
      const hasEarnedIncome = player.hasEarnedIncome ?? (state.turn > 1 || !!player.turnFlags?.hasWorked);
      progress = calcWealthProgress(calcLiquidAssets(player, campaign, state.economicIndex, state.turn, state.economySimulation), hasEarnedIncome);
    } else if (cond.stat === 'education') {
      progress = calcEducationProgress(player.degrees.length);
    } else if (cond.stat === 'career') {
      progress = calcCareerProgress(player.dependability, player.currentJobId !== null);
    } else if (cond.stat === 'happiness') {
      progress = player.happiness;
    } else if (cond.stat === 'lifestyle') {
      progress = player.lifestyle || 0;
    } else if (cond.stat === 'wellbeing') {
      progress = calcWellbeingScore(player.physicalCondition ?? 0, player.mentalCondition ?? 0);
    } else {
      progress = (player as any)[cond.stat] || 0;
    }

    if (progress < target) {
      return false;
    }
  }
  return true;
}

function processLotteryDrawing(
  player: PlayerState,
  state: GameState,
  campaign: CampaignBundle,
  rng: Random,
  replay: ReplayContext | undefined
): PlayerState {
  let p = player;
  const queuedLottery = state.debugQueue?.find(e => e.type === 'lottery_win' && (e.playerId === p.id || !e.playerId));
  if (queuedLottery) {
    if (p.inventory.lotteryTickets > 0) {
      const tier = queuedLottery.lotteryTier || 'large';
      let amount = 5000;
      let happiness = 10;
      if (tier === 'small') { amount = 200; happiness = 5; }
      else if (tier === 'medium') { amount = 500; happiness = 5; }
      p.money += amount;
      p = applyHappinessChange(p, happiness, 'lottery_win', state.rules, campaign.config.statRules);
      p.turnEvents.push({
        key: 'events.lottery',
        params: { amount },
        modifications: [
          { stat: 'money', diff: amount },
          { stat: state.rules.usePhysicalMentalConditions ? 'mental' : 'happiness', diff: happiness }
        ]
      });
      p.inventory.lotteryTickets = 0;
    } else {
      p.turnEvents.push({ key: 'debug.event_cancelled', params: { event: 'Lottery Win', reason: 'Player owns 0 lottery tickets' } });
    }
  } else if (p.inventory.lotteryTickets > 0) {
    const r = resolveDecision(replay, `lottery_roll_${p.id}`, () => Math.floor(rng.next() * 501));
    const t = p.inventory.lotteryTickets;
    if (r < t) {
      const isLarge = r <= t / 20;
      const isMed = r <= t / 5;
      const winAmt = isLarge ? 5000 : (isMed ? 500 : 200);
      const winHap = isLarge ? 10 : 5;
      p.money += winAmt;
      p = applyHappinessChange(p, winHap, 'lottery_win', state.rules, campaign.config.statRules);
      p.turnEvents.push({
        key: 'events.lottery',
        params: { amount: winAmt },
        modifications: [
          { stat: 'money', diff: winAmt },
          { stat: state.rules.usePhysicalMentalConditions ? 'mental' : 'happiness', diff: winHap }
        ]
      });
    }
    p.inventory.lotteryTickets = 0;
  }
  return p;
}

function processApartmentRobberyStep(
  player: PlayerState,
  state: GameState,
  campaign: CampaignBundle,
  rng: Random,
  replay: ReplayContext | undefined
): { updatedPlayer: PlayerState; preRobberyStorage: number } {
  let p = player;
  const queuedAptRobbery = state.debugQueue?.find(e => e.type === 'apartment_robbery' && (e.playerId === p.id || !e.playerId));
  const robberyStartWeek = campaign.config.eventRules.willyRobberyStartWeek;
  const preRobberyStorage = p.activeEffects['set_food_storage'] || 0;
  if (queuedAptRobbery) {
    const curHousing = campaign.housing.find(h => h.id === p.currentHousingId);
    if (curHousing?.isRobberyImmune || p.currentHousingId === 'security') {
      p.turnEvents.push({ key: 'debug.event_cancelled', params: { event: 'Apartment Robbery', reason: `Living in ${curHousing?.name || 'La Security'}` } });
    } else if (p.inventory.appliances.length === 0) {
      p.turnEvents.push({ key: 'debug.event_cancelled', params: { event: 'Apartment Robbery', reason: 'Player owns 0 appliances' } });
    } else {
      const robberyResult = processApartmentRobbery(
        p,
        rng,
        state.rules.protectBuiltInAppliances,
        state.rules,
        state.turn,
        robberyStartWeek,
        replay,
        campaign.config.statRules,
        true,
        queuedAptRobbery.stolenItemIds
      );
      p = robberyResult.updated;
    }
  } else {
    const robberyResult = processApartmentRobbery(p, rng, state.rules.protectBuiltInAppliances, state.rules, state.turn, robberyStartWeek, replay, campaign.config.statRules);
    p = robberyResult.updated;
  }
  return { updatedPlayer: p, preRobberyStorage };
}

/**
 * Frozen Base Pipeline: Maintenance and Decay Phase (Floppy, CD-ROM, QoL).
 */
export function processBaseMaintenanceAndDecay(
  p: PlayerState,
  state: GameState,
  campaign: CampaignBundle,
  rng: Random,
  replay: ReplayContext | undefined,
  previousPlayerWeekends: string[]
): { updatedPlayer: PlayerState; preRobberyStorage: number } {
  let player = p;

  // 3. Winner Check
  if (checkPlayerWinConditions(player, state, campaign)) {
    player.hasWon = true;
  }

  // 4. Classic Weekend
  player = processWeekend(player, state.turn, previousPlayerWeekends, campaign.weekends, rng, state.rules, campaign);
  if (player.weekendResult) {
    previousPlayerWeekends.push(player.weekendResult.event.key);
  }

  // Update Time
  resetPlayerClock(player, campaign.config.timeRules.hoursPerTurn);

  // 5. Check Lottery
  player = processLotteryDrawing(player, state, campaign, rng, replay);

  // 6. Computer Profits (Classic: Money + Happiness only)
  const queuedCompProfit = state.debugQueue?.find(e => e.type === 'computer_profit' && (e.playerId === player.id || !e.playerId));
  const computerIncomeChance = player.activeEffects['computer_income_chance'] || 0;
  if (queuedCompProfit) {
    if (computerIncomeChance > 0) {
      const profit = resolveDecision(replay, `computer_profit_amount_${player.id}`, () => Math.floor(rng.next() * 81) + 20);
      player.money += profit;
      player = applyHappinessChange(player, 3, 'computer_profit', state.rules, campaign.config.statRules);
      player.turnEvents.push({
        key: 'events.computerProfit',
        params: { profit },
        modifications: [
          { stat: 'money', diff: profit },
          { stat: 'happiness', diff: 3 }
        ]
      });
    } else {
      player.turnEvents.push({ key: 'debug.event_cancelled', params: { event: 'Computer Profit', reason: 'No active computer synergy' } });
    }
  } else if (computerIncomeChance > 0) {
    const compProfitTrigger = resolveDecision(replay, `computer_profit_trigger_${player.id}`, () => rng.next() < (1 / 7));
    if (compProfitTrigger) {
      const profit = resolveDecision(replay, `computer_profit_amount_${player.id}`, () => Math.floor(rng.next() * 81) + 20);
      player.money += profit;
      player = applyHappinessChange(player, 3, 'computer_profit', state.rules, campaign.config.statRules);
      player.turnEvents.push({
        key: 'events.computerProfit',
        params: { profit },
        modifications: [
          { stat: 'money', diff: profit },
          { stat: 'happiness', diff: 3 }
        ]
      });
    }
  }

  // 7. Degrade Relaxation & Classic Dependability Decay (-3)
  const preventRelaxationDecay = player.activeEffects['prevent_relaxation_decay'] || 0;
  if (!preventRelaxationDecay) {
    const decay = campaign.config.statRules.relaxationDecayRate;
    const threshold = state.rules.relaxationDoctorThreshold;
    player.relaxation = Math.max(threshold, player.relaxation - decay);
  }
  player.dependability = calcDependabilityDecay(player.dependability, campaign.config.statRules);

  // 8. Apartment Robbery
  return processApartmentRobberyStep(player, state, campaign, rng, replay);
}

/**
 * Advanced Pipeline: Maintenance and Decay Phase.
 */
export function processAdvancedMaintenanceAndDecay(
  p: PlayerState,
  state: GameState,
  campaign: CampaignBundle,
  rng: Random,
  replay: ReplayContext | undefined,
  previousPlayerWeekends: string[]
): { updatedPlayer: PlayerState; preRobberyStorage: number } {
  let player = p;

  // 3. Winner Check
  if (checkPlayerWinConditions(player, state, campaign)) {
    player.hasWon = true;
  }

  // 4. Weekend (Alternative Card System or Classic)
  if (state.rules.alternativeWeekends) {
    if (player.isAi) {
      const { player: pWithChoices, cards } = generateWeekendChoices(player, state.turn, campaign.weekends, rng);
      const bestCardId = selectAiWeekendCard(pWithChoices, cards);
      player = resolveWeekendChoice(pWithChoices, bestCardId, rng, state.rules, campaign.config.statRules);
    } else {
      const { player: pWithChoices, cards } = generateWeekendChoices(player, state.turn, campaign.weekends, rng);
      player = pWithChoices;
      player.offeredWeekendCards = cards;
      player.weekendResult = undefined;
    }
  } else {
    player = processWeekend(player, state.turn, previousPlayerWeekends, campaign.weekends, rng, state.rules, campaign);
  }
  if (player.weekendResult) {
    previousPlayerWeekends.push(player.weekendResult.event.key);
  }

  // Update Time
  resetPlayerClock(player, campaign.config.timeRules.hoursPerTurn);

  // 5. Check Lottery
  player = processLotteryDrawing(player, state, campaign, rng, replay);

  // 5b. Curio / Knick-Knack Weekend Appraisal (Advanced only)
  const uninspectedCurios = player.inventory.uninspectedKnickKnacks || 0;
  if (uninspectedCurios > 0) {
    const winChance = 0.80 * (1 - Math.pow(0.55, uninspectedCurios));
    const winRoll = resolveDecision(replay, `curio_lottery_win_${player.id}_turn_${state.turn}`, () => rng.next());

    if (winRoll < winChance) {
      const curioIndex = resolveDecision(replay, `curio_catalog_${player.id}_turn_${state.turn}`, () => Math.floor(rng.next() * CURIO_CATALOG.length));
      const curio = CURIO_CATALOG[curioIndex] || CURIO_CATALOG[0];
      const outcomeRoll = resolveDecision(replay, `curio_outcome_${player.id}_turn_${state.turn}`, () => rng.next());

      if (outcomeRoll < 0.40) {
        const lifestyleGain = outcomeRoll < 0.20 ? 0.5 : 1.0;
        player.lifestyle = Math.min(100, roundToResolution((player.lifestyle || 0) + lifestyleGain, 0.1));
        player.inventory.knickKnacks = (player.inventory.knickKnacks || 0) + uninspectedCurios;
        player.turnEvents.push({
          key: 'events.curioDecor',
          params: { name: curio.name, lifestyle: lifestyleGain },
          modifications: [{ stat: 'lifestyle', diff: lifestyleGain }]
        });
      } else if (outcomeRoll < 0.80) {
        const mentalGain = outcomeRoll < 0.60 ? 1 : 2;
        player = applyMentalChange(player, mentalGain, campaign.config.statRules);
        player.inventory.knickKnacks = (player.inventory.knickKnacks || 0) + uninspectedCurios;
        player.turnEvents.push({
          key: 'events.curioMental',
          params: { name: curio.name, mental: mentalGain },
          modifications: [{ stat: 'mental', diff: mentalGain }]
        });
      } else {
        const cashAmount = resolveDecision(replay, `curio_cash_${player.id}_turn_${state.turn}`, () => 35 + Math.floor(rng.next() * 16));
        player.money += cashAmount;
        player.inventory.knickKnacks = (player.inventory.knickKnacks || 0) + (uninspectedCurios - 1);
        player.turnEvents.push({
          key: 'events.curioCash',
          params: { name: curio.name, amount: cashAmount },
          modifications: [{ stat: 'money', diff: cashAmount }]
        });
      }
    } else {
      player.inventory.knickKnacks = (player.inventory.knickKnacks || 0) + uninspectedCurios;
    }
    player.inventory.uninspectedKnickKnacks = 0;
    ensurePlayerCurios(player, state.turn);
  }

  // 6. Computer Profits (Advanced: Money + Morale + optional Tech Skill)
  const queuedCompProfit = state.debugQueue?.find(e => e.type === 'computer_profit' && (e.playerId === player.id || !e.playerId));
  const computerIncomeChance = player.activeEffects['computer_income_chance'] || 0;
  if (queuedCompProfit) {
    if (computerIncomeChance > 0) {
      const profit = resolveDecision(replay, `computer_profit_amount_${player.id}`, () => Math.floor(rng.next() * 81) + 20);
      player.money += profit;
      player = applyHappinessChange(player, 3, 'computer_profit', state.rules, campaign.config.statRules);
      if (state.rules.useSkills) {
        player.skillTech = Math.min(10, roundToResolution((player.skillTech || 0) + 0.25, 0.05));
      }
      const compMods: StatModification[] = [
        { stat: 'money', diff: profit },
        { stat: state.rules.usePhysicalMentalConditions ? 'mental' : 'happiness', diff: 3 }
      ];
      if (state.rules.useSkills) {
        compMods.push({ stat: 'skillTech', diff: 0.25 });
      }
      player.turnEvents.push({ key: 'events.computerProfit', params: { profit }, modifications: compMods });
    } else {
      player.turnEvents.push({ key: 'debug.event_cancelled', params: { event: 'Computer Profit', reason: 'No active computer synergy' } });
    }
  } else if (computerIncomeChance > 0) {
    const compProfitTrigger = resolveDecision(replay, `computer_profit_trigger_${player.id}`, () => rng.next() < (1 / 7));
    if (compProfitTrigger) {
      const profit = resolveDecision(replay, `computer_profit_amount_${player.id}`, () => Math.floor(rng.next() * 81) + 20);
      player.money += profit;
      player = applyHappinessChange(player, 3, 'computer_profit', state.rules, campaign.config.statRules);
      if (state.rules.useSkills) {
        player.skillTech = Math.min(10, roundToResolution((player.skillTech || 0) + 0.25, 0.05));
      }
      const compMods: StatModification[] = [
        { stat: 'money', diff: profit },
        { stat: state.rules.usePhysicalMentalConditions ? 'mental' : 'happiness', diff: 3 }
      ];
      if (state.rules.useSkills) {
        compMods.push({ stat: 'skillTech', diff: 0.25 });
      }
      player.turnEvents.push({ key: 'events.computerProfit', params: { profit }, modifications: compMods });
    }
  }

  // 7. Degrade Relaxation & Advanced Dependability Decay
  const preventRelaxationDecay = player.activeEffects['prevent_relaxation_decay'] || 0;
  if (!preventRelaxationDecay) {
    const decay = campaign.config.statRules.relaxationDecayRate;
    const threshold = state.rules.relaxationDoctorThreshold;
    player.relaxation = Math.max(threshold, player.relaxation - decay);
  }
  const curJob = player.currentJobId ? campaign.jobs.find(j => j.id === player.currentJobId) : undefined;
  const isHighDowntime = curJob?.tags?.includes('high_downtime') ?? false;
  const isExecMgmt = curJob?.tags?.includes('executive_management') ?? false;
  player.dependability = calcDependabilityDecay(
    player.dependability,
    campaign.config.statRules,
    curJob?.requirements.dependability,
    true,
    player.social,
    isHighDowntime,
    isExecMgmt
  );

  // 8. Apartment Robbery
  return processApartmentRobberyStep(player, state, campaign, rng, replay);
}

export function processMaintenanceAndDecayPhase(
  p: PlayerState,
  state: GameState,
  campaign: CampaignBundle,
  rng: Random,
  replay: ReplayContext | undefined,
  previousPlayerWeekends: string[],
  _economicTurnResult?: {
    newEconomy: number;
    crashSeverity: 'none' | 'minor' | 'moderate' | 'major';
    economicBoom: boolean;
    currentHeadline: GameEvent | null;
    cancelledGlobalEvents: GameEvent[];
  }
): { updatedPlayer: PlayerState; preRobberyStorage: number } {
  if (isBaseVersion(state.rules)) {
    return processBaseMaintenanceAndDecay(p, state, campaign, rng, replay, previousPlayerWeekends);
  }
  return processAdvancedMaintenanceAndDecay(p, state, campaign, rng, replay, previousPlayerWeekends);
}

export function processPostHealthMaintenance(
  p: PlayerState,
  state: GameState,
  campaign: CampaignBundle,
  rng: Random,
  replay: ReplayContext | undefined,
  economicTurnResult: EconomicTurnResult
): PlayerState {
  let player = p;

  // 15. Appliance Repair
  const formatAppName = (id: string) =>
    campaign.items.find(i => i.id === id)?.name ||
    id.split('_').map(w => (w.toLowerCase() === 'tv' || w.toLowerCase() === 'vcr' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
  const queuedAppBreak = state.debugQueue?.find(e => e.type === 'appliance_break' && (e.playerId === player.id || !e.playerId));
  const isAdvancedMaint = state.rules.advancedMaintenance;
  const minRepairPct = campaign.config.economyRules.repairCostMin;
  const maxRepairPct = campaign.config.economyRules.repairCostMax;
  const repairRange = maxRepairPct - minRepairPct;

  if (queuedAppBreak) {
    const candidateApps = isAdvancedMaint
      ? player.inventory.appliances.filter(a => !a.isBroken)
      : player.inventory.appliances;
    if (candidateApps.length > 0) {
      const targetApp = candidateApps.find(a => a.id === queuedAppBreak.applianceId) || candidateApps[0];
      if (isAdvancedMaint) {
        targetApp.isBroken = true;
        player = applyHappinessChange(player, -1, 'appliance_breakage', state.rules, campaign.config.statRules);
        player.turnEvents.push({
          key: 'events.applianceBrokeNeedRepair',
          params: { appliance: formatAppName(targetApp.id) },
          modifications: [{ stat: state.rules.usePhysicalMentalConditions ? 'mental' : 'happiness', diff: -1 }]
        });
      } else {
        const repairCost = Math.floor(targetApp.purchasePrice * (minRepairPct + rng.next() * repairRange));
        player.money = Math.max(0, player.money - repairCost);
        player = applyHappinessChange(player, -1, 'appliance_breakage', state.rules, campaign.config.statRules);
        player.turnEvents.push({
          key: 'events.applianceBroke',
          params: { appliance: formatAppName(targetApp.id), repairCost },
          modifications: [
            { stat: 'money', diff: -repairCost },
            { stat: state.rules.usePhysicalMentalConditions ? 'mental' : 'happiness', diff: -1 }
          ]
        });
      }

      for (const app of player.inventory.appliances.filter(a => a !== targetApp && (!isAdvancedMaint || !a.isBroken))) {
        const breakChance = app.purchaseSource === 'socket_city' ? 1 / 51 : 1 / 36;
        const breakTrigger = resolveDecision(replay, `appliance_break_${player.id}_${app.id}`, () => rng.next() < breakChance);
        if (breakTrigger) {
          if (isAdvancedMaint) {
            app.isBroken = true;
            player = applyHappinessChange(player, -1, 'appliance_breakage', state.rules, campaign.config.statRules);
            player.turnEvents.push({
              key: 'events.applianceBrokeNeedRepair',
              params: { appliance: formatAppName(app.id) },
              modifications: [{ stat: state.rules.usePhysicalMentalConditions ? 'mental' : 'happiness', diff: -1 }]
            });
          } else {
            const rCost = resolveDecision(replay, `appliance_repair_${player.id}_${app.id}`, () => Math.floor(app.purchasePrice * (minRepairPct + rng.next() * repairRange)));
            player.money = Math.max(0, player.money - rCost);
            player = applyHappinessChange(player, -1, 'appliance_breakage', state.rules, campaign.config.statRules);
            player.turnEvents.push({
              key: 'events.applianceBroke',
              params: { appliance: formatAppName(app.id), repairCost: rCost },
              modifications: [
                { stat: 'money', diff: -rCost },
                { stat: state.rules.usePhysicalMentalConditions ? 'mental' : 'happiness', diff: -1 }
              ]
            });
          }
        }
      }
    } else {
      player.turnEvents.push({ key: 'debug.event_cancelled', params: { event: 'Appliance Break', reason: 'Player owns 0 eligible appliances' } });
    }
  } else {
    for (const app of player.inventory.appliances) {
      if (isAdvancedMaint && app.isBroken) continue;
      const breakChance = app.purchaseSource === 'socket_city' ? 1 / 51 : 1 / 36;
      const breakTrigger = resolveDecision(replay, `appliance_break_${player.id}_${app.id}`, () => rng.next() < breakChance);
      if (breakTrigger) {
        if (isAdvancedMaint) {
          app.isBroken = true;
          player = applyHappinessChange(player, -1, 'appliance_breakage', state.rules, campaign.config.statRules);
          player.turnEvents.push({
            key: 'events.applianceBrokeNeedRepair',
            params: { appliance: formatAppName(app.id) },
            modifications: [{ stat: state.rules.usePhysicalMentalConditions ? 'mental' : 'happiness', diff: -1 }]
          });
        } else {
          const repairCost = resolveDecision(replay, `appliance_repair_${player.id}_${app.id}`, () => Math.floor(app.purchasePrice * (minRepairPct + rng.next() * repairRange)));
          player.money = Math.max(0, player.money - repairCost);
          player = applyHappinessChange(player, -1, 'appliance_breakage', state.rules, campaign.config.statRules);
          player.turnEvents.push({
            key: 'events.applianceBroke',
            params: { appliance: formatAppName(app.id), repairCost },
            modifications: [
              { stat: 'money', diff: -repairCost },
              { stat: state.rules.usePhysicalMentalConditions ? 'mental' : 'happiness', diff: -1 }
            ]
          });
        }
      }
    }
  }

  // Prepend any cancelled global events
  if (economicTurnResult.cancelledGlobalEvents.length > 0) {
    player.turnEvents = [...economicTurnResult.cancelledGlobalEvents, ...player.turnEvents];
  }

  // 16. Economic Events
  if (economicTurnResult.crashSeverity !== 'none') {
    player = applyMarketCrash(
      player,
      economicTurnResult.crashSeverity,
      rng,
      replay,
      state.rules,
      campaign.config.statRules,
      campaign,
      economicTurnResult.newEconomy,
      state.turn,
      economicTurnResult.newEconomySimulation ?? state.economySimulation
    );
  } else if (economicTurnResult.economicBoom) {
    player = applyEconomicBoom(
      player,
      campaign,
      economicTurnResult.newEconomy,
      state.turn,
      state.rules,
      campaign.config.statRules,
      economicTurnResult.newEconomySimulation ?? state.economySimulation
    );
  }

  if (player.turnFlags.freeNewspaper && player.newspaperHeadline?.key === 'newspaper.robbery') {
    if (economicTurnResult.crashSeverity !== 'none' || economicTurnResult.economicBoom) {
      player.newspaperHeadline = economicTurnResult.currentHeadline;
    } else if (economicTurnResult.currentHeadline?.stockTip) {
      player.newspaperHeadline.stockTip = economicTurnResult.currentHeadline.stockTip;
    }
  } else if (economicTurnResult.currentHeadline) {
    player.newspaperHeadline = economicTurnResult.currentHeadline;
    if (economicTurnResult.crashSeverity !== 'none' || economicTurnResult.economicBoom) {
      player.turnFlags.freeNewspaper = true;
    }
  }

  // 17. Donations
  player = processDonations(player, state, campaign, rng, replay);

  return player;
}
