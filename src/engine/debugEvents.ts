/**
 * debugEvents.ts — Precondition checks and queue management for the Playtest Event Trigger system.
 */

import { type GameState, type PlayerState } from './gameState';
import { type CampaignBundle } from './dataLoader';

export type DebugEventType =
  | 'apartment_robbery'
  | 'street_robbery'
  | 'doctor_visit'
  | 'market_crash'
  | 'market_boom'
  | 'lottery_win'
  | 'computer_profit'
  | 'appliance_break';

export interface DebugQueuedEvent {
  id: string;
  type: DebugEventType;
  playerId?: string; // undefined for global events (crash/boom)
  crashSeverity?: 'minor' | 'moderate' | 'major';
  lotteryTier?: 'small' | 'medium' | 'large';
  applianceId?: string;
  stolenItemIds?: string[];
}

export interface PreconditionResult {
  allowed: boolean;
  reason?: string;
}

export interface DebugEventMeta {
  type: DebugEventType;
  isGlobal: boolean;
  titleKey: string;
  descKey: string;
}

export const DEBUG_EVENT_METAS: DebugEventMeta[] = [
  {
    type: 'market_crash',
    isGlobal: true,
    titleKey: 'debug.events.market_crash.title',
    descKey: 'debug.events.market_crash.desc',
  },
  {
    type: 'market_boom',
    isGlobal: true,
    titleKey: 'debug.events.market_boom.title',
    descKey: 'debug.events.market_boom.desc',
  },
  {
    type: 'apartment_robbery',
    isGlobal: false,
    titleKey: 'debug.events.apartment_robbery.title',
    descKey: 'debug.events.apartment_robbery.desc',
  },
  {
    type: 'street_robbery',
    isGlobal: false,
    titleKey: 'debug.events.street_robbery.title',
    descKey: 'debug.events.street_robbery.desc',
  },
  {
    type: 'doctor_visit',
    isGlobal: false,
    titleKey: 'debug.events.doctor_visit.title',
    descKey: 'debug.events.doctor_visit.desc',
  },
  {
    type: 'lottery_win',
    isGlobal: false,
    titleKey: 'debug.events.lottery_win.title',
    descKey: 'debug.events.lottery_win.desc',
  },
  {
    type: 'computer_profit',
    isGlobal: false,
    titleKey: 'debug.events.computer_profit.title',
    descKey: 'debug.events.computer_profit.desc',
  },
  {
    type: 'appliance_break',
    isGlobal: false,
    titleKey: 'debug.events.appliance_break.title',
    descKey: 'debug.events.appliance_break.desc',
  },
];

/**
 * Validates whether an event's preconditions are met for a given state & player.
 */
export function checkEventPreconditions(
  type: DebugEventType,
  state: GameState,
  campaign: CampaignBundle,
  player?: PlayerState
): PreconditionResult {
  switch (type) {
    case 'market_crash': {
      const minWeek = 8;
      if (state.turn < minWeek) {
        return { allowed: false, reason: `Requires Turn ${minWeek}+ (Current: Turn ${state.turn})` };
      }
      const minIndex = 80;
      if (state.economicIndex < minIndex) {
        return { allowed: false, reason: `Economic index must be ≥ ${minIndex} (Current: ${state.economicIndex})` };
      }
      return { allowed: true };
    }

    case 'market_boom': {
      const minWeek = 8;
      if (state.turn < minWeek) {
        return { allowed: false, reason: `Requires Turn ${minWeek}+ (Current: Turn ${state.turn})` };
      }
      if (state.economicIndex < 0) {
        return { allowed: false, reason: `Economic index must be ≥ 0 (Current: ${state.economicIndex})` };
      }
      return { allowed: true };
    }

    case 'apartment_robbery': {
      if (!player) return { allowed: false, reason: 'No player selected' };
      if (player.currentHousingId === 'security') {
        return { allowed: false, reason: 'Living in La Security (0% robbery chance)' };
      }
      const startWeek = campaign.config.eventRules?.willyRobberyStartWeek ?? 4;
      if (state.rules.useHomeTimeRobbery && state.turn < startWeek) {
        return { allowed: false, reason: `Robberies start on Turn ${startWeek} (Current: Turn ${state.turn})` };
      }
      if (player.inventory.appliances.length === 0) {
        return { allowed: false, reason: 'Player owns no appliances to steal' };
      }
      if (state.rules.protectBuiltInAppliances) {
        const unprotected = player.inventory.appliances.filter(
          app => !['refrigerator', 'freezer', 'stove'].includes(app.id)
        );
        if (unprotected.length === 0) {
          return { allowed: false, reason: 'All owned appliances are protected built-ins' };
        }
      }
      return { allowed: true };
    }

    case 'street_robbery': {
      if (!player) return { allowed: false, reason: 'No player selected' };
      const startWeek = campaign.config.eventRules?.willyRobberyStartWeek ?? 4;
      if (state.turn < startWeek) {
        return { allowed: false, reason: `Street robberies start on Turn ${startWeek} (Current: Turn ${state.turn})` };
      }
      if (player.money <= 0) {
        return { allowed: false, reason: 'Player carries no cash ($0)' };
      }
      return { allowed: true };
    }

    case 'doctor_visit': {
      if (!player) return { allowed: false, reason: 'No player selected' };
      if (state.rules.bypassDoctorIfBroke && player.money <= 0) {
        return { allowed: false, reason: 'Player carries $0 and bypass rule is active' };
      }

      if (state.rules.usePhysicalMentalConditions) {
        const statRules = campaign.config.statRules;
        const physThreshold = statRules?.physicalDoctorThreshold ?? 10;
        const mentalThreshold = statRules?.lowSpiritsThreshold ?? 10;

        const isPhysLow = player.physicalCondition !== undefined && player.physicalCondition < physThreshold;
        const isMentalLow = player.mentalCondition !== undefined && player.mentalCondition < mentalThreshold;

        if (!isPhysLow && !isMentalLow) {
          return {
            allowed: false,
            reason: `Physical (${player.physicalCondition ?? 50} ≥ ${physThreshold}) & Mental (${player.mentalCondition ?? 50} ≥ ${mentalThreshold}) above thresholds`,
          };
        }
      } else if (state.rules.enableRelaxationDoctor) {
        const threshold = state.rules.relaxationDoctorThreshold ?? 10;
        if (player.relaxation > threshold) {
          return {
            allowed: false,
            reason: `Relaxation (${player.relaxation}) is above threshold (${threshold})`,
          };
        }
      } else {
        return { allowed: false, reason: 'Relaxation doctor rule is disabled' };
      }
      return { allowed: true };
    }

    case 'lottery_win': {
      if (!player) return { allowed: false, reason: 'No player selected' };
      if (player.inventory.lotteryTickets <= 0) {
        return { allowed: false, reason: 'Player owns 0 lottery tickets' };
      }
      return { allowed: true };
    }

    case 'computer_profit': {
      if (!player) return { allowed: false, reason: 'No player selected' };
      const incomeChance = player.activeEffects['computer_income_chance'] || 0;
      if (incomeChance <= 0) {
        return { allowed: false, reason: 'Player does not own a computer or active computer synergy' };
      }
      return { allowed: true };
    }

    case 'appliance_break': {
      if (!player) return { allowed: false, reason: 'No player selected' };
      if (player.inventory.appliances.length === 0) {
        return { allowed: false, reason: 'Player owns no appliances' };
      }
      return { allowed: true };
    }
  }
}
