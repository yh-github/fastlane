import type { GameState, GameEvent } from '../gameState';
import type { CampaignBundle } from '../dataLoader';
import type { Random } from '../../utils/rng';
import { resolveDecision, type ReplayContext } from '../replayTypes';
import {
  fluctuateEconomy,
  createDefaultEconomySimulationState,
  stepEconomySimulation,
  determineNewspaperMover,
  generatePredictiveStockTip
} from '../economyEngine';
import type { EconomicTurnResult } from './types';

export function processEconomicTurnPhase(
  state: GameState,
  campaign: CampaignBundle,
  rng: Random,
  replay?: ReplayContext
): EconomicTurnResult {
  const econRules = campaign.config.economyRules || ({} as any);
  const eventRules = campaign.config.eventRules || ({} as any);
  const minReading = state.rules.minEconomicReading ?? -30;
  const isAuthentic = econRules.model === 'authentic_sectors' && (state.economySimulation !== undefined || !(replay?.inDecisions && replay.inDecisions.length > 0));

  if (!isAuthentic) {
    let [newEconomy, newTrend] = fluctuateEconomy(state.economicIndex, state.economicTrend || 0, minReading, rng, replay);

    let crashSeverity: 'none' | 'minor' | 'moderate' | 'major' = 'none';
    let economicBoom = false;
    let currentHeadline: GameEvent | null = null;
    const cancelledGlobalEvents: GameEvent[] = [];

    const debugCrash = state.debugQueue?.find(e => e.type === 'market_crash');
    const debugBoom = state.debugQueue?.find(e => e.type === 'market_boom');

    const crashStartWeek = eventRules.marketCrashStartWeek ?? 8;
    const crashDivisor = eventRules.marketCrashDivisor ?? 20;
    const crashThreshold = eventRules.marketCrashThreshold ?? 60;

    const boomStartWeek = eventRules.economicBoomStartWeek ?? 8;
    const boomDivisor = eventRules.economicBoomDivisor ?? 50;
    const boomThreshold = eventRules.economicBoomThreshold ?? 120;

    if (debugCrash) {
      if (state.turn >= crashStartWeek && newEconomy >= crashThreshold) {
        const forcedSeverity = debugCrash.crashSeverity || (debugCrash as any).crashType || 'moderate';
        crashSeverity = forcedSeverity;
        const trendDrop = -3;
        if (forcedSeverity === 'minor') {
          newEconomy = Math.max(minReading, newEconomy - 15);
          newTrend = -2;
          currentHeadline = { key: 'newspaper.crash_minor' };
        } else if (forcedSeverity === 'moderate') {
          newEconomy = Math.max(minReading, newEconomy - 30);
          newTrend = trendDrop;
          currentHeadline = { key: 'newspaper.crash_moderate' };
        } else {
          newEconomy = Math.max(minReading, newEconomy - 50);
          newTrend = trendDrop;
          currentHeadline = { key: 'newspaper.crash_major' };
        }
      } else {
        cancelledGlobalEvents.push({
          key: 'debug.event_cancelled',
          params: {
            event: 'Market Crash',
            reason: state.turn < crashStartWeek ? `Requires Turn ${crashStartWeek}+` : `Economy must be ≥ ${crashThreshold} (Current: ${newEconomy})`,
          },
        });
      }
    } else if (state.turn >= crashStartWeek && newEconomy >= crashThreshold) {
      const crashChance = 1 / (1 + (crashDivisor * state.players.length));
      const crashTriggered = resolveDecision(replay, `market_crash_trigger`, () => rng.next() < crashChance);
      if (crashTriggered) {
        const roll = resolveDecision(replay, `market_crash_roll`, () => rng.next());
        const trendDrop = resolveDecision(replay, `market_crash_trend`, () => Math.floor(rng.next() * 3) - 3); // -3 to -1
        
        if (roll < 0.333) {
          crashSeverity = 'minor';
          newEconomy = Math.max(minReading, newEconomy - 15);
          newTrend = -2;
          currentHeadline = { key: 'newspaper.crash_minor' };
        } else if (roll < 0.666) {
          crashSeverity = 'moderate';
          newEconomy = Math.max(minReading, newEconomy - 30);
          newTrend = trendDrop;
          currentHeadline = { key: 'newspaper.crash_moderate' };
        } else {
          crashSeverity = 'major';
          newEconomy = Math.max(minReading, newEconomy - 50);
          newTrend = trendDrop;
          currentHeadline = { key: 'newspaper.crash_major' };
        }
      }
    }

    if (debugBoom && crashSeverity === 'none') {
      if (state.turn >= boomStartWeek && newEconomy >= 0) {
        economicBoom = true;
        newEconomy = Math.min(90, newEconomy + 6);
        newTrend = 2;
        currentHeadline = { key: 'newspaper.boom' };
      } else {
        cancelledGlobalEvents.push({
          key: 'debug.event_cancelled',
          params: {
            event: 'Economic Boom',
            reason: state.turn < boomStartWeek ? `Requires Turn ${boomStartWeek}+` : `Economy must be ≥ 0 (Current: ${newEconomy})`,
          },
        });
      }
    } else if (crashSeverity === 'none' && newEconomy <= boomThreshold && state.turn >= boomStartWeek) {
      const boomChance = 1 / (1 + (boomDivisor * state.players.length));
      const boomTriggered = resolveDecision(replay, `market_boom_trigger`, () => rng.next() < boomChance);
      if (boomTriggered) {
        economicBoom = true;
        newEconomy = Math.min(90, newEconomy + 6); // +10% (6 points)
        newTrend = resolveDecision(replay, `market_boom_trend`, () => Math.floor(rng.next() * 3) + 1); // +1 to +3
        currentHeadline = { key: 'newspaper.boom' };
      }
    }

    return {
      newEconomy,
      newTrend,
      crashSeverity,
      economicBoom,
      currentHeadline,
      cancelledGlobalEvents
    };
  }

  // Authentic 8-Sector Multi-Tier Simulation
  const sim = state.economySimulation 
    ? structuredClone(state.economySimulation) 
    : createDefaultEconomySimulationState(econRules, state.economicIndex, state.economicTrend);

  let crashSeverity: 'none' | 'minor' | 'moderate' | 'major' = 'none';
  let economicBoom = false;
  let currentHeadline: GameEvent | null = null;
  const cancelledGlobalEvents: GameEvent[] = [];

  const debugCrash = state.debugQueue?.find(e => e.type === 'market_crash');
  const debugBoom = state.debugQueue?.find(e => e.type === 'market_boom');

  const crashStartWeek = eventRules.marketCrashStartWeek ?? 8;
  const crashDivisor = eventRules.marketCrashDivisor ?? 30;
  const rawCrashThreshold = eventRules.marketCrashThreshold ?? 80;
  const crashThresholdReading = rawCrashThreshold < 50 ? (rawCrashThreshold + 100) : rawCrashThreshold;
  const crashThresholdIndex = rawCrashThreshold >= 50 ? (rawCrashThreshold - 100) : rawCrashThreshold;

  const boomStartWeek = eventRules.economicBoomStartWeek ?? 8;
  const boomDivisor = eventRules.economicBoomDivisor ?? 30;
  const rawBoomThreshold = eventRules.economicBoomThreshold ?? 120;
  const boomThresholdReading = rawBoomThreshold < 50 ? (rawBoomThreshold + 100) : rawBoomThreshold;

  // Current price level reading (main / goods reading)
  const currentGoodsReading = sim.main.reading;
  const currentGoodsIndex = sim.main.reading - 100;

  if (debugCrash) {
    if (state.turn >= crashStartWeek && currentGoodsReading >= crashThresholdReading) {
      const forcedSeverity = debugCrash.crashSeverity || (debugCrash as any).crashType || 'moderate';
      crashSeverity = forcedSeverity;
      if (forcedSeverity === 'minor') {
        currentHeadline = { key: 'newspaper.crash_minor' };
      } else if (forcedSeverity === 'moderate') {
        currentHeadline = { key: 'newspaper.crash_moderate' };
      } else {
        currentHeadline = { key: 'newspaper.crash_major' };
      }
    } else {
      cancelledGlobalEvents.push({
        key: 'debug.event_cancelled',
        params: {
          event: 'Market Crash',
          reason: state.turn < crashStartWeek ? `Requires Turn ${crashStartWeek}+` : `Economy must be ≥ ${crashThresholdIndex} (Current: ${currentGoodsIndex})`,
        },
      });
    }
  } else if (state.turn >= crashStartWeek && currentGoodsReading >= crashThresholdReading) {
    const crashChance = 1 / (1 + (crashDivisor * state.players.length));
    const crashTriggered = resolveDecision(replay, `market_crash_trigger`, () => rng.next() < crashChance);
    if (crashTriggered) {
      const roll = resolveDecision(replay, `market_crash_roll`, () => rng.next());
      if (roll < 0.333) {
        crashSeverity = 'minor';
        currentHeadline = { key: 'newspaper.crash_minor' };
      } else if (roll < 0.666) {
        crashSeverity = 'moderate';
        currentHeadline = { key: 'newspaper.crash_moderate' };
      } else {
        crashSeverity = 'major';
        currentHeadline = { key: 'newspaper.crash_major' };
      }
    }
  }

  if (debugBoom && crashSeverity === 'none') {
    if (state.turn >= boomStartWeek && currentGoodsReading <= boomThresholdReading) {
      economicBoom = true;
      currentHeadline = { key: 'newspaper.boom' };
    } else {
      cancelledGlobalEvents.push({
        key: 'debug.event_cancelled',
        params: {
          event: 'Economic Boom',
          reason: state.turn < boomStartWeek ? `Requires Turn ${boomStartWeek}+` : `Economy must be ≤ ${boomThresholdReading} (Current: ${currentGoodsReading})`,
        },
      });
    }
  } else if (crashSeverity === 'none' && currentGoodsReading <= boomThresholdReading && state.turn >= boomStartWeek) {
    const boomChance = 1 / (1 + (boomDivisor * state.players.length));
    const boomTriggered = resolveDecision(replay, `market_boom_trigger`, () => rng.next() < boomChance);
    if (boomTriggered) {
      economicBoom = true;
      currentHeadline = { key: 'newspaper.boom' };
    }
  }

  // Step the authentic 8-sector simulation
  const newSim = stepEconomySimulation(sim, econRules, rng, crashSeverity, economicBoom, replay);

  // New economy reading and trend (Consumer Goods tier)
  const newEconomy = Math.max(minReading, newSim.goods.reading - 100);
  const newTrend = newSim.goods.index;

  // Authentic mover headline (if no crash/boom headline), or fallback to city news
  if (!currentHeadline) {
    const mover = determineNewspaperMover(newSim);
    if (mover) {
      currentHeadline = { key: mover.moverKey };
    } else {
      const randomHeadlines = [
        "newspaper.random.1",
        "newspaper.random.2",
        "newspaper.random.3",
        "newspaper.random.4"
      ];
      const headlineIdx = resolveDecision(replay, `newspaper_headline_global`, () => Math.floor(rng.next() * randomHeadlines.length));
      currentHeadline = { key: randomHeadlines[headlineIdx] };
    }
  }

  // Predictive Stock Tips (if enabled for QoL / Advanced)
  if (state.rules.predictiveNewspaperStockTips) {
    const stockTip = generatePredictiveStockTip(newSim, rng, replay);
    if (stockTip && currentHeadline) {
      currentHeadline.stockTip = stockTip;
    }
  }

  return {
    newEconomy,
    newTrend,
    crashSeverity,
    economicBoom,
    currentHeadline,
    cancelledGlobalEvents,
    newEconomySimulation: newSim,
  };
}

