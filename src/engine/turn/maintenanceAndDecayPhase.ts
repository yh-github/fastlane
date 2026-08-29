import type { PlayerState, GameState, GameEvent } from '../gameState';
import type { CampaignBundle } from '../dataLoader';
import type { Random } from '../../utils/rng';
import { resolveDecision, type ReplayContext } from '../replayTypes';
import { calcDependabilityDecay, calcWealthProgress, calcEducationProgress, calcCareerProgress, calcWellbeingScore } from '../statMath';
import { calcLiquidAssets, applyMarketCrash, applyEconomicBoom } from '../economyEngine';
import { applyHappinessChange } from '../statEffects';
import { processApartmentRobbery, processDonations } from '../eventEngine';
import { processWeekend } from '../weekendEngine';
import { resetPlayerClock } from '../timeManager';

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
  let player = p;

  // 3. Winner Check
  let allGoalsMet = true;
  const winConditions = campaign.config.winConditions || [
    { stat: 'wealth', target: 100, label: 'Wealth' },
    { stat: 'happiness', target: 100, label: 'Happiness' },
    { stat: 'education', target: 100, label: 'Education' },
    { stat: 'career', target: 100, label: 'Career' }
  ];
  for (const cond of winConditions) {
    const target = player.goalAllotment[cond.stat] || 0;
    let progress = 0;
    if (cond.stat === 'wealth') progress = calcWealthProgress(calcLiquidAssets(player, campaign, state.economicIndex, state.turn));
    else if (cond.stat === 'education') progress = calcEducationProgress(player.degrees.length);
    else if (cond.stat === 'career') progress = calcCareerProgress(player.dependability, player.currentJobId !== null);
    else if (cond.stat === 'happiness') progress = player.happiness;
    else if (cond.stat === 'lifestyle') progress = player.lifestyle || 0;
    else if (cond.stat === 'wellbeing') progress = calcWellbeingScore(player.physicalCondition ?? 50, player.mentalCondition ?? 25);
    else progress = (player as any)[cond.stat] || 0;
    
    if (progress < target) {
      allGoalsMet = false;
      break;
    }
  }

  if (allGoalsMet) {
    player.hasWon = true;
  }

  // 4. Weekend
  const weekendResult = processWeekend(player, state.turn, previousPlayerWeekends, campaign.weekends, rng, state.rules, campaign);
  player = weekendResult;
  if (player.weekendResult) {
    previousPlayerWeekends.push(player.weekendResult.event.key);
  }

  // Update Time
  resetPlayerClock(player, campaign.config.timeRules.hoursPerTurn);

  // 5. Check Lottery
  const queuedLottery = state.debugQueue?.find(e => e.type === 'lottery_win' && (e.playerId === player.id || !e.playerId));
  if (queuedLottery) {
    if (player.inventory.lotteryTickets > 0) {
      const tier = queuedLottery.lotteryTier || 'large';
      let amount = 5000;
      let happiness = 10;
      if (tier === 'small') { amount = 200; happiness = 5; }
      else if (tier === 'medium') { amount = 500; happiness = 5; }
      player.money += amount;
      player = applyHappinessChange(player, happiness, 'lottery_win', state.rules, campaign.config.statRules);
      player.turnEvents.push({ key: 'events.lottery', params: { amount } });
      player.inventory.lotteryTickets = 0;
    } else {
      player.turnEvents.push({ key: 'debug.event_cancelled', params: { event: 'Lottery Win', reason: 'Player owns 0 lottery tickets' } });
    }
  } else if (player.inventory.lotteryTickets > 0) {
    const r = resolveDecision(replay, `lottery_roll_${player.id}`, () => Math.floor(rng.next() * 501));
    const t = player.inventory.lotteryTickets;
    if (r < t) {
      if (r <= t / 20) { player.money += 5000; player = applyHappinessChange(player, 10, 'lottery_win', state.rules, campaign.config.statRules); player.turnEvents.push({ key: 'events.lottery', params: { amount: 5000 } }); }
      else if (r <= t / 5) { player.money += 500; player = applyHappinessChange(player, 5, 'lottery_win', state.rules, campaign.config.statRules); player.turnEvents.push({ key: 'events.lottery', params: { amount: 500 } }); }
      else { player.money += 200; player = applyHappinessChange(player, 5, 'lottery_win', state.rules, campaign.config.statRules); player.turnEvents.push({ key: 'events.lottery', params: { amount: 200 } }); }
    }
    player.inventory.lotteryTickets = 0;
  }

  // 6. Computer Profits
  const queuedCompProfit = state.debugQueue?.find(e => e.type === 'computer_profit' && (e.playerId === player.id || !e.playerId));
  const computerIncomeChance = player.activeEffects['computer_income_chance'] || 0;
  if (queuedCompProfit) {
    if (computerIncomeChance > 0) {
      const profit = resolveDecision(replay, `computer_profit_amount_${player.id}`, () => Math.floor(rng.next() * 81) + 20);
      player.money += profit; 
      player = applyHappinessChange(player, 3, 'computer_profit', state.rules, campaign.config.statRules);
      player.turnEvents.push({ key: 'events.computerProfit', params: { profit } });
    } else {
      player.turnEvents.push({ key: 'debug.event_cancelled', params: { event: 'Computer Profit', reason: 'No active computer synergy' } });
    }
  } else if (computerIncomeChance > 0) {
    const compProfitTrigger = resolveDecision(replay, `computer_profit_trigger_${player.id}`, () => rng.next() < (1/7));
    if (compProfitTrigger) {
      const profit = resolveDecision(replay, `computer_profit_amount_${player.id}`, () => Math.floor(rng.next() * 81) + 20);
      player.money += profit; 
      player = applyHappinessChange(player, 3, 'computer_profit', state.rules, campaign.config.statRules);
      player.turnEvents.push({ key: 'events.computerProfit', params: { profit } });
    }
  }

  // 7. Degrade Relaxation (and Dependability decay)
  const preventRelaxationDecay = player.activeEffects['prevent_relaxation_decay'] || 0;
  if (!preventRelaxationDecay) {
    const decay = campaign.config.statRules?.relaxationDecayRate ?? 1;
    const threshold = state.rules.relaxationDoctorThreshold ?? 10;
    player.relaxation = Math.max(threshold, player.relaxation - decay);
  }
  const curJob = player.currentJobId && campaign?.jobs ? campaign.jobs.find(j => j.id === player.currentJobId) : undefined;
  player.dependability = calcDependabilityDecay(player.dependability, curJob?.requirements?.dependability, state.rules.usePhysicalMentalConditions, player.social); 

  // 8. Apartment Robbery
  const queuedAptRobbery = state.debugQueue?.find(e => e.type === 'apartment_robbery' && (e.playerId === player.id || !e.playerId));
  const robberyStartWeek = campaign.config.eventRules?.willyRobberyStartWeek ?? 4;
  const preRobberyStorage = player.activeEffects['set_food_storage'] || 0;
  if (queuedAptRobbery) {
    const curHousing = campaign?.housing?.find(h => h.id === player.currentHousingId);
    if (curHousing?.isRobberyImmune || player.currentHousingId === 'security') {
      player.turnEvents.push({ key: 'debug.event_cancelled', params: { event: 'Apartment Robbery', reason: `Living in ${curHousing?.name || 'La Security'}` } });
    } else if (player.inventory.appliances.length === 0) {
      player.turnEvents.push({ key: 'debug.event_cancelled', params: { event: 'Apartment Robbery', reason: 'Player owns 0 appliances' } });
    } else {
      const robberyResult = processApartmentRobbery(
        player,
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
      player = robberyResult.updated;
    }
  } else {
    const robberyResult = processApartmentRobbery(player, rng, state.rules.protectBuiltInAppliances, state.rules, state.turn, robberyStartWeek, replay, campaign.config.statRules);
    player = robberyResult.updated;
  }

  return { updatedPlayer: player, preRobberyStorage };
}

export function processPostHealthMaintenance(
  p: PlayerState,
  state: GameState,
  campaign: CampaignBundle,
  rng: Random,
  replay: ReplayContext | undefined,
  economicTurnResult: {
    newEconomy: number;
    crashSeverity: 'none' | 'minor' | 'moderate' | 'major';
    economicBoom: boolean;
    currentHeadline: GameEvent | null;
    cancelledGlobalEvents: GameEvent[];
  }
): PlayerState {
  let player = p;

  // 15. Appliance Repair
  const formatAppName = (id: string) => campaign.items?.find(i => i.id === id)?.name || id.split('_').map(w => (w.toLowerCase() === 'tv' || w.toLowerCase() === 'vcr' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
  const queuedAppBreak = state.debugQueue?.find(e => e.type === 'appliance_break' && (e.playerId === player.id || !e.playerId));
  if (queuedAppBreak) {
    if (player.inventory.appliances.length > 0) {
      const targetApp = player.inventory.appliances.find(a => a.id === queuedAppBreak.applianceId) || player.inventory.appliances[0];
      const repairCost = Math.floor(targetApp.purchasePrice * (0.05 + rng.next() * 0.2));
      player.money = Math.max(0, player.money - repairCost);
      player = applyHappinessChange(player, -1, 'appliance_breakage', state.rules, campaign.config.statRules);
      player.turnEvents.push({ key: 'events.applianceBroke', params: { appliance: formatAppName(targetApp.id), repairCost } });

      for (const app of player.inventory.appliances.filter(a => a !== targetApp)) {
        const breakChance = app.purchaseSource === 'socket_city' ? 1/51 : 1/36;
        const breakTrigger = resolveDecision(replay, `appliance_break_${player.id}_${app.id}`, () => rng.next() < breakChance);
        if (breakTrigger) {
          const rCost = resolveDecision(replay, `appliance_repair_${player.id}_${app.id}`, () => Math.floor(app.purchasePrice * (0.05 + rng.next() * 0.2)));
          player.money = Math.max(0, player.money - rCost);
          player = applyHappinessChange(player, -1, 'appliance_breakage', state.rules, campaign.config.statRules);
          player.turnEvents.push({ key: 'events.applianceBroke', params: { appliance: formatAppName(app.id), repairCost: rCost } });
        }
      }
    } else {
      player.turnEvents.push({ key: 'debug.event_cancelled', params: { event: 'Appliance Break', reason: 'Player owns 0 appliances' } });
    }
  } else {
    for (const app of player.inventory.appliances) {
      const breakChance = app.purchaseSource === 'socket_city' ? 1/51 : 1/36;
      const breakTrigger = resolveDecision(replay, `appliance_break_${player.id}_${app.id}`, () => rng.next() < breakChance);
      if (breakTrigger) {
        const repairCost = resolveDecision(replay, `appliance_repair_${player.id}_${app.id}`, () => Math.floor(app.purchasePrice * (0.05 + rng.next() * 0.2)));
        player.money = Math.max(0, player.money - repairCost);
        player = applyHappinessChange(player, -1, 'appliance_breakage', state.rules, campaign.config.statRules);
        player.turnEvents.push({ key: 'events.applianceBroke', params: { appliance: formatAppName(app.id), repairCost } });
      }
    }
  }

  // Prepend any cancelled global events
  if (economicTurnResult.cancelledGlobalEvents.length > 0) {
    player.turnEvents = [...economicTurnResult.cancelledGlobalEvents, ...player.turnEvents];
  }

  // 16. Economic Events
  if (economicTurnResult.crashSeverity !== 'none') {
    player = applyMarketCrash(player, economicTurnResult.crashSeverity, rng, replay, state.rules, campaign.config.statRules);
  } else if (economicTurnResult.economicBoom) {
    player = applyEconomicBoom(player, campaign, economicTurnResult.newEconomy, state.turn, state.rules, campaign.config.statRules);
  }

  if (economicTurnResult.currentHeadline) {
    player.newspaperHeadline = economicTurnResult.currentHeadline;
    player.turnFlags.freeNewspaper = true;
  }

  // 17. Donations
  player = processDonations(player, state, campaign, rng, replay);

  return player;
}
