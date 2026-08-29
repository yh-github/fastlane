import type { GameState, GameEvent } from '../gameState';
import type { CampaignBundle } from '../dataLoader';
import type { Random } from '../../utils/rng';
import { resolveDecision, type ReplayContext } from '../replayTypes';
import { fluctuateEconomy } from '../economyEngine';
import type { EconomicTurnResult } from './types';

export function processEconomicTurnPhase(
  state: GameState,
  campaign: CampaignBundle,
  rng: Random,
  replay?: ReplayContext
): EconomicTurnResult {
  const minReading = state.rules.minEconomicReading ?? -30;
  let [newEconomy, newTrend] = fluctuateEconomy(state.economicIndex, state.economicTrend || 0, minReading, rng, replay);

  let crashSeverity: 'none' | 'minor' | 'moderate' | 'major' = 'none';
  let economicBoom = false;
  let currentHeadline: GameEvent | null = null;
  const cancelledGlobalEvents: GameEvent[] = [];

  const debugCrash = state.debugQueue?.find(e => e.type === 'market_crash');
  const debugBoom = state.debugQueue?.find(e => e.type === 'market_boom');

  if (debugCrash) {
    const crashThreshold = campaign.config.eventRules?.marketCrashThreshold ?? 60;
    if (state.turn >= 8 && newEconomy >= crashThreshold) {
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
      const crashThreshold = campaign.config.eventRules?.marketCrashThreshold ?? 60;
      cancelledGlobalEvents.push({
        key: 'debug.event_cancelled',
        params: {
          event: 'Market Crash',
          reason: state.turn < 8 ? 'Requires Turn 8+' : `Economy must be ≥ ${crashThreshold} (Current: ${newEconomy})`,
        },
      });
    }
  } else if (state.turn >= 8) {
    const crashThreshold = campaign.config.eventRules?.marketCrashThreshold ?? 60;
    if (newEconomy >= crashThreshold) {
      const crashDivisor = campaign.config.eventRules?.marketCrashDivisor ?? 20;
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
  }

  if (debugBoom && crashSeverity === 'none') {
    if (state.turn >= 8 && newEconomy >= 0) {
      economicBoom = true;
      newEconomy = Math.min(90, newEconomy + 6);
      newTrend = 2;
      currentHeadline = { key: 'newspaper.boom' };
    } else {
      cancelledGlobalEvents.push({
        key: 'debug.event_cancelled',
        params: {
          event: 'Economic Boom',
          reason: state.turn < 8 ? 'Requires Turn 8+' : `Economy must be ≥ 0 (Current: ${newEconomy})`,
        },
      });
    }
  } else if (crashSeverity === 'none' && newEconomy <= 120 && state.turn >= 8) {
    const boomDivisor = campaign.config.eventRules?.economicBoomDivisor ?? 50;
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
