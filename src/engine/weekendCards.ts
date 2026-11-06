import type { WeekendDef } from './dataLoader';
import type { Random } from '../utils/rng';
import type { PlayerState, WeekendCard, WeekendCardType, WeekendDeckTier } from './gameState';

export interface EventSouvenirDef {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const EVENT_SOUVENIRS: Record<'baseball' | 'theatre' | 'concert', EventSouvenirDef[]> = {
  baseball: [
    {
      id: 'ticket_stub_baseball',
      name: 'Commemorative Baseball Ticket Stub',
      icon: '🎟️',
      description: 'A creased, vintage ticket stub from an unforgettable extra-innings baseball game.'
    },
    {
      id: 'foul_ball',
      name: 'Foul Ball Souvenir',
      icon: '⚾',
      description: 'A scuffed official leather baseball caught in the stands during the 7th inning stretch.'
    },
    {
      id: 'team_pennant',
      name: 'Vintage Team Pennant',
      icon: '🧢',
      description: 'A felt stadium pennant celebrating your city\'s home run heroes.'
    },
    {
      id: 'autographed_card',
      name: 'Signed Rookie Baseball Card',
      icon: '🃏',
      description: 'A limited-edition player card autographed by the starting pitcher outside the dugout.'
    }
  ],
  theatre: [
    {
      id: 'ticket_stub_theatre',
      name: 'Embossed Theatre Ticket Stub',
      icon: '🎟️',
      description: 'A gold-embossed theatre ticket stub from a captivating stage performance.'
    },
    {
      id: 'playbill',
      name: 'Opening Night Playbill',
      icon: '🎭',
      description: 'A glossy souvenir playbill complete with director notes and cast biographies.'
    },
    {
      id: 'signed_program',
      name: 'Autographed Show Program',
      icon: '📜',
      description: 'A limited cast program signed by the lead actor at the stage door after the curtain call.'
    },
    {
      id: 'stage_prop_replica',
      name: 'Miniature Mask Prop Replica',
      icon: '🎭',
      description: 'A detailed theatrical mask curio commemorating the dramatic performance.'
    }
  ],
  concert: [
    {
      id: 'ticket_stub_concert',
      name: 'Holographic Concert Ticket Stub',
      icon: '🎟️',
      description: 'A holographic concert ticket stub from an ear-splitting rock performance.'
    },
    {
      id: 'guitar_pick',
      name: 'Touring Band Guitar Pick',
      icon: '🎸',
      description: 'A custom celluloid guitar pick flicked into the crowd by the lead guitarist.'
    },
    {
      id: 'backstage_pass',
      name: 'Laminated Backstage VIP Pass',
      icon: '🪪',
      description: 'A collectible backstage VIP pass worn during an electric encore set.'
    },
    {
      id: 'drumstick',
      name: 'Cracked Concert Drumstick',
      icon: '🥁',
      description: 'A splintered wooden drumstick tossed from the stage after the drum solo.'
    }
  ]
};

export const SPRINT_WEEKEND_CARDS: Record<string, WeekendCard> = {
  weekend_cramming_sprint: {
    id: 'weekend_cramming_sprint',
    tier: 'expensive',
    type: 'study',
    eventKey: 'events.weekend.cramming_sprint',
    titleKey: 'weekendScreen.card.crammingSprintTitle',
    fluff: 'Wired on continuous coffee, you locked yourself in the library all weekend, power-reading textbooks and drafting thesis notes.',
    icon: '📚',
    costMin: 60,
    costMax: 60,
    targetStat: 'mental',
    potentialBonusMin: 2,
    potentialBonusMax: 2,
    secondaryStat: 'physical',
    potentialSecondaryBonusMin: -4,
    potentialSecondaryBonusMax: -4
  },
  weekend_overtime_grind: {
    id: 'weekend_overtime_grind',
    tier: 'expensive',
    type: 'work',
    eventKey: 'events.weekend.overtime_grind',
    titleKey: 'weekendScreen.card.overtimeGrindTitle',
    fluff: 'You answered the emergency call and spent 36 consecutive hours at the workplace tackling backlogs and covering weekend shifts.',
    icon: '💼',
    costMin: 50,
    costMax: 50,
    targetStat: 'dependability',
    potentialBonusMin: 2,
    potentialBonusMax: 3,
    secondaryStat: 'physical',
    potentialSecondaryBonusMin: -4,
    potentialSecondaryBonusMax: -4
  }
};

export const FREE_WEEKEND_CARDS: Record<string, WeekendCard> = {
  free_stay_home: {
    id: 'free_stay_home',
    tier: 'free',
    type: 'rest',
    eventKey: 'events.weekend.free_stay_home',
    titleKey: 'weekendScreen.card.stayHomeTitle',
    fluff: 'You stayed home all weekend resting in bed and watching TV. You feel refreshed, but dishes and laundry piled up.',
    icon: '🛋️',
    costMin: 0,
    costMax: 0,
    targetStat: 'mental',
    potentialBonusMin: 2,
    potentialBonusMax: 2,
    secondaryStat: 'physical',
    potentialSecondaryBonusMin: 1,
    potentialSecondaryBonusMax: 1
  },
  free_deep_clean: {
    id: 'free_deep_clean',
    tier: 'free',
    type: 'clean',
    eventKey: 'events.weekend.free_deep_clean',
    titleKey: 'weekendScreen.card.deepCleanTitle',
    fluff: 'You spent the entire weekend scrubbing every floor and surface until your apartment was spotless.',
    icon: '🧹',
    costMin: 0,
    costMax: 0,
    targetStat: 'mess',
    potentialBonusMin: 8,
    potentialBonusMax: 12,
    secondaryStat: 'physical',
    potentialSecondaryBonusMin: -1,
    potentialSecondaryBonusMax: -1
  },
  free_park_walk: {
    id: 'free_park_walk',
    tier: 'free',
    type: 'walk',
    eventKey: 'events.weekend.free_park_walk',
    titleKey: 'weekendScreen.card.parkWalkTitle',
    fluff: 'You spent hours wandering the city parks enjoying nature and quiet fresh air.',
    icon: '🌳',
    costMin: 0,
    costMax: 0,
    targetStat: 'physical',
    potentialBonusMin: 2,
    potentialBonusMax: 2,
    secondaryStat: 'mental',
    potentialSecondaryBonusMin: 1,
    potentialSecondaryBonusMax: 1
  },
  free_porch_chat: {
    id: 'free_porch_chat',
    tier: 'free',
    type: 'chat',
    eventKey: 'events.weekend.free_porch_chat',
    titleKey: 'weekendScreen.card.porchChatTitle',
    fluff: 'You sat on the front porch chatting for hours with neighbors, leaving cups and clutter around.',
    icon: '🗣️',
    costMin: 0,
    costMax: 0,
    targetStat: 'social',
    potentialBonusMin: 2,
    potentialBonusMax: 2,
    secondaryStat: 'mess',
    potentialSecondaryBonusMin: 2,
    potentialSecondaryBonusMax: 2
  }
};

export function buildTicketCards(
  heldTicketType: 'baseball' | 'theatre' | 'concert',
  ticketCount: number,
  weekendData: WeekendDef,
  rng?: Random
): { attendCard: WeekendCard; resaleCard: WeekendCard } {
  let mental = 1;
  let social = 1;
  let costMin = 15;
  let costMax = 35;
  let tier: WeekendDeckTier = 'medium';

  const basePrice = heldTicketType === 'theatre' ? 30 : heldTicketType === 'concert' ? 40 : 45;

  if (heldTicketType === 'theatre') {
    if (ticketCount === 1) {
      mental = 1; social = 1;
      costMin = 15; costMax = 35;
      tier = 'medium';
    } else if (ticketCount === 2) {
      mental = 2; social = 2;
      costMin = 30; costMax = 55;
      tier = 'medium';
    } else {
      mental = 2; social = 3;
      costMin = 50; costMax = 85;
      tier = 'expensive';
    }
  } else if (heldTicketType === 'concert') {
    if (ticketCount === 1) {
      mental = 2; social = 1;
      costMin = 20; costMax = 45;
      tier = 'medium';
    } else if (ticketCount === 2) {
      mental = 2; social = 3;
      costMin = 45; costMax = 80;
      tier = 'expensive';
    } else {
      mental = 3; social = 4;
      costMin = 60; costMax = 100;
      tier = 'expensive';
    }
  } else {
    // baseball
    if (ticketCount === 1) {
      mental = 2; social = 2;
      costMin = 25; costMax = 50;
      tier = 'medium';
    } else if (ticketCount === 2) {
      mental = 3; social = 3;
      costMin = 50; costMax = 90;
      tier = 'expensive';
    } else {
      mental = 3; social = 4;
      costMin = 65; costMax = 100;
      tier = 'expensive';
    }
  }

  const ticketIcons: Record<string, string> = {
    baseball: '⚾',
    theatre: '🎭',
    concert: '🎸'
  };

  const attendCard: WeekendCard = {
    id: `ticket_${heldTicketType}`,
    tier,
    type: 'ticket',
    eventKey: `events.weekend.ticket_${heldTicketType}`,
    titleKey: `weekendScreen.card.ticket_${heldTicketType}`,
    fluff: weekendData.ticketWeekends?.[heldTicketType]?.text || 'Enjoyed an exciting live event with your tickets!',
    icon: ticketIcons[heldTicketType] || '🎟️',
    costMin,
    costMax,
    targetStat: 'mental',
    potentialBonusMin: Math.max(1, mental - 1),
    potentialBonusMax: mental + 1,
    secondaryStat: 'social',
    potentialSecondaryBonusMin: Math.max(1, social - 1),
    potentialSecondaryBonusMax: social + 1,
    ticketCount
  };

  const roll = rng ? rng.next() : Math.random();
  // Multiplier between 0.60 and 1.40 (profit not guaranteed)
  const multiplier = 0.60 + roll * 0.80;
  const resaleProfit = Math.max(5, Math.round(ticketCount * basePrice * multiplier));

  let resaleFluff = 'You found buyers outside the venue and sold your tickets for cash.';
  if (multiplier < 0.9) {
    resaleFluff = 'Demand was cold outside the venue. You had to let your tickets go below face value.';
  } else if (multiplier > 1.15) {
    resaleFluff = 'Desperate fans outside the venue paid a hefty premium for your tickets!';
  }

  const resaleCard: WeekendCard = {
    id: `ticket_resale_${heldTicketType}`,
    tier: 'free',
    type: 'ticket_resale',
    eventKey: `events.weekend.ticket_resale_${heldTicketType}`,
    titleKey: 'weekendScreen.card.ticketResaleTitle',
    fluff: resaleFluff,
    icon: '💵',
    costMin: 0,
    costMax: 0,
    potentialBonusMin: 0,
    potentialBonusMax: 0,
    resalePayout: resaleProfit,
    ticketCount
  };

  return { attendCard, resaleCard };
}

export function buildCardFromId(
  cardId: string,
  tier: WeekendDeckTier,
  weekendData: WeekendDef,
  player: PlayerState,
  rng: Random
): WeekendCard {
  if (SPRINT_WEEKEND_CARDS[cardId]) {
    return { ...SPRINT_WEEKEND_CARDS[cardId] };
  }

  if (tier === 'free' || cardId.startsWith('free_') || cardId.startsWith('broke_')) {
    if (cardId === 'broke_stay_home') return { ...FREE_WEEKEND_CARDS.free_stay_home, id: 'broke_stay_home', eventKey: 'events.weekend.broke_rest' };
    if (cardId === 'broke_deep_clean') return { ...FREE_WEEKEND_CARDS.free_deep_clean, id: 'broke_deep_clean', eventKey: 'events.weekend.broke_clean' };
    if (FREE_WEEKEND_CARDS[cardId]) {
      return { ...FREE_WEEKEND_CARDS[cardId] };
    }
    return { ...FREE_WEEKEND_CARDS.free_stay_home };
  }

  let costMin = 5;
  let costMax = 20;
  let bonusMin = 1;
  let bonusMax = 2;
  if (tier === 'medium') {
    costMin = 15;
    costMax = 55;
    bonusMin = 2;
    bonusMax = 3;
  } else if (tier === 'expensive') {
    costMin = 50;
    costMax = 100;
    bonusMin = 3;
    bonusMax = 5;
  }

  if (cardId.startsWith('random_')) {
    const idx = parseInt(cardId.replace('random_', ''), 10);
    const fluff = weekendData.randomWeekends?.[idx] || 'Spent a relaxing weekend.';
    const isSpecial = idx === 41;

    if (isSpecial) {
      const bonus = Math.floor(rng.next() * 3) + 2;
      return {
        id: cardId,
        tier,
        type: 'random',
        eventKey: `events.weekend.random_${idx}`,
        titleKey: 'weekendScreen.card.specialTitle',
        fluff,
        icon: '✨',
        costMin,
        costMax,
        targetStat: 'mental',
        potentialBonusMin: 2,
        potentialBonusMax: 4,
        isSpecial: true,
        specialBonus: bonus
      };
    }

    const stats: ('mental' | 'social' | 'dependability' | 'physical')[] = ['mental', 'social', 'dependability', 'physical'];
    const targetStat = stats[Math.floor(rng.next() * stats.length)];
    const iconMap = { mental: '🧠', social: '👥', dependability: '🤝', physical: '💪' };
    const typeMap: Record<string, WeekendCardType> = {
      mental: 'culture',
      social: 'social',
      dependability: 'career',
      physical: 'sports'
    };
    const cardType: WeekendCardType = typeMap[targetStat] || 'culture';

    return {
      id: cardId,
      tier,
      type: cardType,
      eventKey: `events.weekend.random_${idx}`,
      titleKey: `weekendScreen.card.${tier}Title`,
      fluff,
      icon: iconMap[targetStat] || '🎲',
      costMin,
      costMax,
      targetStat,
      potentialBonusMin: bonusMin,
      potentialBonusMax: bonusMax
    };
  }

  if (cardId.startsWith('durable_')) {
    const appName = cardId.replace('durable_', '');
    const isAnyTv = (id: string) => id === 'color_tv' || id === 'bw_tv' || id === 'crt_tv' || id === 'plasma_tv';
    const app = player.inventory?.appliances?.find(a => a.id === appName && !a.isBroken);
    if (!app) {
      return buildCardFromId('random_0', 'cheap', weekendData, player, rng);
    }
    if (appName === 'vcr') {
      const hasTv = player.inventory?.appliances?.some(a => isAnyTv(a.id) && !a.isBroken);
      if (!hasTv) {
        return buildCardFromId('random_0', 'cheap', weekendData, player, rng);
      }
    }
    const fluff = weekendData.durableWeekends?.[appName]?.text || 'Spent time with your home appliances.';
    const stats: ('mental' | 'social' | 'dependability')[] = ['mental', 'social', 'dependability'];
    const targetStat = stats[Math.floor(rng.next() * stats.length)];

    return {
      id: cardId,
      tier: 'cheap',
      type: 'durable',
      eventKey: `events.weekend.durable_${appName}`,
      titleKey: 'weekendScreen.card.applianceTitle',
      fluff,
      icon: '🏠',
      costMin: 5,
      costMax: 20,
      targetStat,
      potentialBonusMin: 1,
      potentialBonusMax: 2
    };
  }

  return {
    id: cardId,
    tier,
    type: 'random',
    eventKey: `events.weekend.random_0`,
    titleKey: `weekendScreen.card.cheapTitle`,
    fluff: 'Spent a relaxing weekend.',
    icon: '🎲',
    costMin,
    costMax,
    targetStat: 'mental',
    potentialBonusMin: bonusMin,
    potentialBonusMax: bonusMax
  };
}
