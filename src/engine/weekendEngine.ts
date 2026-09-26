import type { WeekendDef } from './dataLoader';
import type { Random } from '../utils/rng';
import { applyHappinessChange } from './statEffects';
import type { PlayerState, GameEvent, GameRules, WeekendCard, WeekendDeckTier, StatModification } from './gameState';
import type { StatRules } from './rules';

// Helper to determine cost based on price range
function getWeekendCost(priceType: 'cheap' | 'medium' | 'expensive', playerMoney: number, rng: Random): number {
  let min = 0;
  let max = 0;
  switch (priceType) {
    case 'cheap': min = 5; max = 20; break;
    case 'medium': min = 15; max = 55; break;
    case 'expensive': min = 50; max = 100; break;
  }
  const cost = Math.floor(rng.next() * (max - min + 1)) + min;
  return Math.min(cost, playerMoney);
}

// ─────────────────────────────────────────────────────────────────────────────
// ALTERNATIVE WEEKEND DECK ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export const FREE_WEEKEND_CARDS: Record<string, WeekendCard> = {
  free_stay_home: {
    id: 'free_stay_home',
    tier: 'free',
    type: 'rest',
    eventKey: 'events.weekend.free_stay_home',
    titleKey: 'weekendScreen.card.stayHomeTitle',
    fluff: 'You stayed home all weekend, resting in bed and letting the dishes pile up.',
    icon: '🛋️',
    costMin: 0,
    costMax: 0,
    targetStat: 'mental',
    potentialBonusMin: 1,
    potentialBonusMax: 1,
    secondaryStat: 'mess',
    potentialSecondaryBonusMin: 2,
    potentialSecondaryBonusMax: 2
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
    fluff: 'You took long refreshing walks and did light exercises in the city park.',
    icon: '🌳',
    costMin: 0,
    costMax: 0,
    targetStat: 'physical',
    potentialBonusMin: 1,
    potentialBonusMax: 1
  },
  free_porch_chat: {
    id: 'free_porch_chat',
    tier: 'free',
    type: 'chat',
    eventKey: 'events.weekend.free_porch_chat',
    titleKey: 'weekendScreen.card.porchChatTitle',
    fluff: 'You sat on the front porch and spent hours chatting with neighbors and passersby.',
    icon: '🗣️',
    costMin: 0,
    costMax: 0,
    targetStat: 'social',
    potentialBonusMin: 1,
    potentialBonusMax: 1
  }
};

export function initPlayerWeekendDecks(player: PlayerState, weekendData: WeekendDef, rng: Random): PlayerState {
  const freeCards = ['free_stay_home', 'free_deep_clean', 'free_park_walk', 'free_porch_chat'];
  const cheapCards: string[] = [];
  const mediumCards: string[] = [];
  const expensiveCards: string[] = [];

  const count = weekendData.randomWeekends?.length || 42;
  for (let i = 0; i < count; i++) {
    const cardId = `random_${i}`;
    if (i < 28) {
      cheapCards.push(cardId);
    } else if (i < 35) {
      mediumCards.push(cardId);
    } else {
      expensiveCards.push(cardId);
    }
  }

  // Owned appliances: add durable_${id} to cheap deck
  if (player.inventory?.appliances) {
    const hasTv = player.inventory.appliances.some(a => (a.id === 'color_tv' || a.id === 'bw_tv') && !a.isBroken);
    for (const app of player.inventory.appliances) {
      if (app.isBroken) continue;
      if (app.id === 'vcr' && !hasTv) continue;
      const cardId = `durable_${app.id}`;
      if (!cheapCards.includes(cardId)) {
        cheapCards.push(cardId);
      }
    }
  }

  return {
    ...player,
    weekendDecks: {
      free: {
        drawPile: rng.shuffle([...freeCards]),
        discardPile: []
      },
      cheap: {
        drawPile: rng.shuffle([...cheapCards]),
        discardPile: []
      },
      medium: {
        drawPile: rng.shuffle([...mediumCards]),
        discardPile: []
      },
      expensive: {
        drawPile: rng.shuffle([...expensiveCards]),
        discardPile: []
      }
    },
    recentWeekendTiers: player.recentWeekendTiers ? [...player.recentWeekendTiers] : [],
    recentWeekendPicks: player.recentWeekendPicks ? [...player.recentWeekendPicks] : []
  };
}

export function addApplianceCardToDeck(player: PlayerState, applianceId: string, rng?: Random): PlayerState {
  if (!player.weekendDecks) return player;
  const hasTv = player.inventory?.appliances?.some(a => (a.id === 'color_tv' || a.id === 'bw_tv') && !a.isBroken);
  if (applianceId === 'vcr' && !hasTv) {
    return player;
  }
  const currentDecks = { ...player.weekendDecks };
  const cardId = `durable_${applianceId}`;
  const cheap = { ...currentDecks.cheap };
  if (!cheap.drawPile.includes(cardId) && !cheap.discardPile.includes(cardId)) {
    const newDraw = [...cheap.drawPile, cardId];
    cheap.drawPile = rng ? rng.shuffle(newDraw) : newDraw;
    currentDecks.cheap = cheap;
  }

  // If a TV was added, check if player has an unbroken VCR that needs to be added
  if (applianceId === 'color_tv' || applianceId === 'bw_tv') {
    const hasVcr = player.inventory?.appliances?.some(a => a.id === 'vcr' && !a.isBroken);
    if (hasVcr) {
      const vcrCardId = 'durable_vcr';
      const cheap2 = { ...currentDecks.cheap };
      if (!cheap2.drawPile.includes(vcrCardId) && !cheap2.discardPile.includes(vcrCardId)) {
        const newDraw2 = [...cheap2.drawPile, vcrCardId];
        cheap2.drawPile = rng ? rng.shuffle(newDraw2) : newDraw2;
        currentDecks.cheap = cheap2;
      }
    }
  }
  return {
    ...player,
    weekendDecks: currentDecks
  };
}

export function removeApplianceCardFromDeck(player: PlayerState, applianceId: string): PlayerState {
  if (!player.weekendDecks) return player;
  const cardId = `durable_${applianceId}`;
  const currentDecks = {
    ...player.weekendDecks,
    cheap: {
      drawPile: player.weekendDecks.cheap.drawPile.filter(id => id !== cardId),
      discardPile: player.weekendDecks.cheap.discardPile.filter(id => id !== cardId)
    }
  };
  // If a TV was removed, check if player has any unbroken TV remaining. If not, remove durable_vcr too!
  if (applianceId === 'color_tv' || applianceId === 'bw_tv') {
    const hasTv = player.inventory?.appliances?.some(a => (a.id === 'color_tv' || a.id === 'bw_tv') && !a.isBroken);
    if (!hasTv) {
      const vcrCardId = 'durable_vcr';
      currentDecks.cheap = {
        drawPile: currentDecks.cheap.drawPile.filter(id => id !== vcrCardId),
        discardPile: currentDecks.cheap.discardPile.filter(id => id !== vcrCardId)
      };
    }
  }
  return {
    ...player,
    weekendDecks: currentDecks
  };
}

function buildTicketCards(
  heldTicketType: 'baseball' | 'theatre' | 'concert',
  ticketCount: number,
  weekendData: WeekendDef
): { attendCard: WeekendCard; resaleCard: WeekendCard } {
  let mental = 1;
  let social = 1;
  const basePrice = heldTicketType === 'theatre' ? 30 : heldTicketType === 'concert' ? 40 : 45;

  if (heldTicketType === 'theatre') {
    if (ticketCount === 1) { mental = 1; social = 1; }
    else if (ticketCount === 2) { mental = 2; social = 2; }
    else { mental = 2; social = 3; }
  } else if (heldTicketType === 'concert') {
    if (ticketCount === 1) { mental = 2; social = 1; }
    else if (ticketCount === 2) { mental = 2; social = 3; }
    else { mental = 3; social = 4; }
  } else {
    // baseball
    if (ticketCount === 1) { mental = 2; social = 2; }
    else if (ticketCount === 2) { mental = 3; social = 3; }
    else { mental = 3; social = 4; }
  }

  const ticketIcons: Record<string, string> = {
    baseball: '⚾',
    theatre: '🎭',
    concert: '🎸'
  };

  const attendCard: WeekendCard = {
    id: `ticket_${heldTicketType}`,
    tier: 'medium',
    type: 'ticket',
    eventKey: `events.weekend.ticket_${heldTicketType}`,
    titleKey: `weekendScreen.card.ticket_${heldTicketType}`,
    fluff: weekendData.ticketWeekends?.[heldTicketType]?.text || 'Enjoyed an exciting live event with your tickets!',
    icon: ticketIcons[heldTicketType] || '🎟️',
    costMin: 0,
    costMax: 0,
    targetStat: 'mental',
    potentialBonusMin: mental,
    potentialBonusMax: mental,
    secondaryStat: 'social',
    potentialSecondaryBonusMin: social,
    potentialSecondaryBonusMax: social,
    ticketCount
  };

  const resaleProfit = Math.round(ticketCount * basePrice * 1.20);
  const resaleCard: WeekendCard = {
    id: `ticket_resale_${heldTicketType}`,
    tier: 'free',
    type: 'ticket_resale',
    eventKey: `events.weekend.ticket_resale_${heldTicketType}`,
    titleKey: 'weekendScreen.card.ticketResaleTitle',
    fluff: 'You stood outside the venue and sold your tickets to desperate fans for a quick profit.',
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

function buildCardFromId(
  cardId: string,
  tier: WeekendDeckTier,
  weekendData: WeekendDef,
  player: PlayerState,
  rng: Random
): WeekendCard {
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

    const stats: ('mental' | 'social' | 'dependability')[] = ['mental', 'social', 'dependability'];
    const targetStat = stats[Math.floor(rng.next() * stats.length)];
    const iconMap = { mental: '🧠', social: '👥', dependability: '🤝' };

    return {
      id: cardId,
      tier,
      type: 'random',
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
    if (appName === 'vcr') {
      const hasTv = player.inventory?.appliances?.some(a => (a.id === 'color_tv' || a.id === 'bw_tv') && !a.isBroken);
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

export function generateWeekendChoices(
  player: PlayerState,
  _turnNumber: number,
  weekendData: WeekendDef,
  rng: Random
): { player: PlayerState; cards: WeekendCard[] } {
  let updatedPlayer = player.weekendDecks ? { ...player } : initPlayerWeekendDecks(player, weekendData, rng);
  if (!updatedPlayer.weekendDecks!.free) {
    updatedPlayer.weekendDecks!.free = {
      drawPile: rng.shuffle(['free_stay_home', 'free_deep_clean', 'free_park_walk', 'free_porch_chat']),
      discardPile: []
    };
  }
  const decks = updatedPlayer.weekendDecks!;

  // 1. Broke players (money < 5): Offer exactly two $0 cards
  if (updatedPlayer.money < 5) {
    const brokeCards: WeekendCard[] = [
      {
        id: 'broke_stay_home',
        tier: 'free',
        type: 'rest',
        eventKey: 'events.weekend.broke_rest',
        titleKey: 'weekendScreen.card.stayHomeTitle',
        fluff: 'You stayed home all weekend, resting in bed and letting the dishes pile up.',
        icon: '🛋️',
        costMin: 0,
        costMax: 0,
        targetStat: 'mental',
        potentialBonusMin: 1,
        potentialBonusMax: 1
      },
      {
        id: 'broke_deep_clean',
        tier: 'free',
        type: 'clean',
        eventKey: 'events.weekend.broke_clean',
        titleKey: 'weekendScreen.card.deepCleanTitle',
        fluff: 'You spent the entire weekend scrubbing every floor and surface until your apartment was spotless.',
        icon: '🧹',
        costMin: 0,
        costMax: 0,
        targetStat: 'mess',
        potentialBonusMin: 8,
        potentialBonusMax: 12
      }
    ];
    updatedPlayer.offeredWeekendCards = brokeCards;
    return { player: updatedPlayer, cards: brokeCards };
  }

  // 2. Solvent players (money >= 5): 3 choices
  const drawnCards: WeekendCard[] = [];

  // 2a. Ticket guarantee: If holding ticket, guarantee attend and resale cards
  const tickets = updatedPlayer.inventory.tickets;
  let heldTicketType: 'baseball' | 'theatre' | 'concert' | null = null;
  if (tickets.baseball > 0 && weekendData.ticketWeekends.baseball) heldTicketType = 'baseball';
  else if (tickets.theatre > 0 && weekendData.ticketWeekends.theatre) heldTicketType = 'theatre';
  else if (tickets.concert > 0 && weekendData.ticketWeekends.concert) heldTicketType = 'concert';

  if (heldTicketType) {
    const ticketCount = tickets[heldTicketType];
    const { attendCard, resaleCard } = buildTicketCards(heldTicketType, ticketCount, weekendData);
    drawnCards.push(attendCard);
    drawnCards.push(resaleCard);
  }

  const slotsNeeded = 3 - drawnCards.length;

  const getTierWeights = (): { tier: WeekendDeckTier; weight: number }[] => {
    let base: Record<WeekendDeckTier, number>;
    if (_turnNumber <= 3) {
      base = { cheap: 4.0, free: 2.0, medium: 1.0, expensive: 0.1 };
    } else if (_turnNumber <= 7) {
      base = { cheap: 2.5, medium: 2.5, free: 1.5, expensive: 1.0 };
    } else {
      base = { expensive: 2.5, medium: 2.0, cheap: 1.5, free: 1.0 };
    }

    const affordable: WeekendDeckTier[] = ['free'];
    if (updatedPlayer.money >= 5) affordable.push('cheap');
    if (updatedPlayer.money >= 15) affordable.push('medium');
    if (updatedPlayer.money >= 50) affordable.push('expensive');

    const recentTiers = updatedPlayer.recentWeekendTiers || [];
    return affordable.map(t => {
      let w = base[t];
      const picks = recentTiers.filter(rt => rt === t).length;
      w *= (1 + picks * 0.75);
      return { tier: t, weight: w };
    });
  };

  for (let slot = 0; slot < slotsNeeded; slot++) {
    let candidateCard: WeekendCard | null = null;
    let attempts = 0;
    const maxAttempts = 35;

    while (attempts < maxAttempts) {
      attempts++;
      const tierWeights = getTierWeights();
      const totalWeight = tierWeights.reduce((sum, tw) => sum + tw.weight, 0);
      let r = rng.next() * totalWeight;
      let selectedTier: WeekendDeckTier = tierWeights[0].tier;
      for (const tw of tierWeights) {
        if (r <= tw.weight) {
          selectedTier = tw.tier;
          break;
        }
        r -= tw.weight;
      }

      const deck = decks[selectedTier];
      if (!deck || deck.drawPile.length === 0) {
        if (deck && deck.discardPile.length > 0) {
          deck.drawPile = rng.shuffle([...deck.discardPile]);
          deck.discardPile = [];
        } else {
          continue;
        }
      }

      const cardId = deck.drawPile.pop();
      if (!cardId) continue;

      const card = buildCardFromId(cardId, selectedTier, weekendData, updatedPlayer, rng);

      // Constraint 1: Never duplicate card id
      if (drawnCards.some(c => c.id === card.id)) {
        deck.drawPile.unshift(cardId);
        continue;
      }

      if (attempts < 25) {
        // Constraint 2: Never 3 cards of the exact same type
        if (drawnCards.length >= 2) {
          const type0 = drawnCards[0].type;
          const allSameTypeSoFar = drawnCards.every(c => c.type === type0);
          if (allSameTypeSoFar && card.type === type0) {
            deck.drawPile.unshift(cardId);
            continue;
          }
        }

        // Constraint 3: If two cards share the same type, they cannot share the same tier
        const sameTypeCard = drawnCards.find(c => c.type === card.type);
        if (sameTypeCard && sameTypeCard.tier === card.tier) {
          deck.drawPile.unshift(cardId);
          continue;
        }
      }

      candidateCard = card;
      break;
    }

    if (!candidateCard) {
      const fallbackDeck = decks.cheap.drawPile.length > 0 ? decks.cheap : (decks.free || decks.cheap);
      if (fallbackDeck.drawPile.length === 0 && fallbackDeck.discardPile.length > 0) {
        fallbackDeck.drawPile = rng.shuffle([...fallbackDeck.discardPile]);
        fallbackDeck.discardPile = [];
      }
      const cardId = fallbackDeck.drawPile.pop() || 'random_0';
      candidateCard = buildCardFromId(cardId, 'cheap', weekendData, updatedPlayer, rng);
    }

    drawnCards.push(candidateCard);
  }

  updatedPlayer.offeredWeekendCards = drawnCards;
  return { player: updatedPlayer, cards: drawnCards };
}

function mergeWeekendModifications(
  cardMods: StatModification[],
  maintenanceMods?: StatModification[]
): StatModification[] {
  if (!maintenanceMods || maintenanceMods.length === 0) {
    return cardMods;
  }
  const merged = cardMods.map(m => ({ ...m }));
  for (const mMod of maintenanceMods) {
    const existing = merged.find(m => m.stat === mMod.stat);
    if (existing) {
      existing.diff += mMod.diff;
    } else {
      merged.push({ ...mMod });
    }
  }
  return merged.filter(m => m.diff !== 0);
}

function maintainDecksOnChoice(
  player: PlayerState,
  chosenCard: WeekendCard,
  allCards: WeekendCard[],
  rng: Random
): void {
  if (player.weekendDecks) {
    const chosenTier = chosenCard.tier;
    if (chosenTier && player.weekendDecks[chosenTier]) {
      player.weekendDecks[chosenTier].discardPile.push(chosenCard.id);
    }

    for (const other of allCards) {
      if (other.id !== chosenCard.id && other.type !== 'ticket' && other.type !== 'ticket_resale') {
        const oTier = other.tier;
        if (oTier && player.weekendDecks[oTier]) {
          player.weekendDecks[oTier].drawPile.push(other.id);
          player.weekendDecks[oTier].drawPile = rng.shuffle([...player.weekendDecks[oTier].drawPile]);
        }
      }
    }
  }

  const currentRecent = player.recentWeekendTiers || [];
  player.recentWeekendTiers = [...currentRecent, chosenCard.tier].slice(-4);
  const currentPicks = player.recentWeekendPicks || [];
  player.recentWeekendPicks = [...currentPicks, {
    tier: chosenCard.tier,
    type: chosenCard.type,
    targetStat: chosenCard.targetStat
  }].slice(-4);
}

export function resolveWeekendChoice(
  player: PlayerState,
  selectedCardId: string,
  rng: Random,
  rules?: GameRules,
  statRules?: StatRules
): PlayerState {
  let updatedPlayer: PlayerState = {
    ...player,
    inventory: {
      ...player.inventory,
      tickets: { ...player.inventory.tickets }
    }
  };

  const cards = updatedPlayer.offeredWeekendCards || [];
  const card = cards.find(c => c.id === selectedCardId) || cards[0];

  if (!card) {
    return updatedPlayer;
  }

  const modifications: StatModification[] = [];

  // 1. Handle Broke / Free Stay Home
  if (card.id === 'broke_stay_home' || card.id === 'free_stay_home') {
    const mentalBonus = 1;
    const messIncrease = 2;

    if (rules?.usePhysicalMentalConditions) {
      const maxMental = updatedPlayer.mentalConditionMax ?? statRules?.maxMentalCondition ?? 50;
      updatedPlayer.mentalCondition = Math.min(maxMental, (updatedPlayer.mentalCondition ?? 50) + mentalBonus);
      modifications.push({ stat: 'mental', diff: mentalBonus });
    } else {
      updatedPlayer = applyHappinessChange(updatedPlayer, mentalBonus, 'weekend_bonus', rules || ({} as any), statRules);
      modifications.push({ stat: 'happiness', diff: mentalBonus });
    }

    if (rules?.trackMess) {
      updatedPlayer.mess = (updatedPlayer.mess || 0) + messIncrease;
      modifications.push({ stat: 'mess', diff: messIncrease });
    }

    // Expire all tickets
    if (updatedPlayer.inventory?.tickets) {
      updatedPlayer.inventory.tickets = { baseball: 0, theatre: 0, concert: 0 };
    }

    maintainDecksOnChoice(updatedPlayer, card, cards, rng);

    const finalMods = mergeWeekendModifications(modifications, updatedPlayer.maintenanceModifications);
    updatedPlayer.maintenanceModifications = undefined;

    updatedPlayer.weekendResult = {
      event: { key: card.eventKey },
      cost: 0,
      happinessBonus: mentalBonus,
      modifications: finalMods,
      chosenCard: card
    };
    updatedPlayer.offeredWeekendCards = undefined;
    return updatedPlayer;
  }

  // 2. Handle Broke / Free Deep Clean
  if (card.id === 'broke_deep_clean' || card.id === 'free_deep_clean') {
    const physicalCost = card.id === 'broke_deep_clean' ? 2 : 1;
    const messReduction = 10;

    if (rules?.usePhysicalMentalConditions) {
      const minPhys = updatedPlayer.minPhysicalCondition ?? 1;
      updatedPlayer.physicalCondition = Math.max(minPhys, (updatedPlayer.physicalCondition ?? 50) - physicalCost);
      modifications.push({ stat: 'physical', diff: -physicalCost });
    }

    if (rules?.trackMess) {
      const currentMess = updatedPlayer.mess || 0;
      const newMess = Math.max(0, currentMess - messReduction);
      const actualDiff = newMess - currentMess;
      updatedPlayer.mess = newMess;
      if (actualDiff !== 0) {
        modifications.push({ stat: 'mess', diff: actualDiff });
      }
    }

    // Expire all tickets
    if (updatedPlayer.inventory?.tickets) {
      updatedPlayer.inventory.tickets = { baseball: 0, theatre: 0, concert: 0 };
    }

    maintainDecksOnChoice(updatedPlayer, card, cards, rng);

    const finalMods = mergeWeekendModifications(modifications, updatedPlayer.maintenanceModifications);
    updatedPlayer.maintenanceModifications = undefined;

    updatedPlayer.weekendResult = {
      event: { key: card.eventKey },
      cost: 0,
      modifications: finalMods,
      chosenCard: card
    };
    updatedPlayer.offeredWeekendCards = undefined;
    return updatedPlayer;
  }

  // 3. Handle Free Park Walk
  if (card.id === 'free_park_walk') {
    const physicalGain = 1;
    if (rules?.usePhysicalMentalConditions) {
      const maxPhys = updatedPlayer.physicalConditionMax ?? statRules?.initialPhysicalMax ?? 50;
      updatedPlayer.physicalCondition = Math.min(maxPhys, (updatedPlayer.physicalCondition ?? 50) + physicalGain);
      modifications.push({ stat: 'physical', diff: physicalGain });
    }

    if (updatedPlayer.inventory?.tickets) {
      updatedPlayer.inventory.tickets = { baseball: 0, theatre: 0, concert: 0 };
    }

    maintainDecksOnChoice(updatedPlayer, card, cards, rng);

    const finalMods = mergeWeekendModifications(modifications, updatedPlayer.maintenanceModifications);
    updatedPlayer.maintenanceModifications = undefined;

    updatedPlayer.weekendResult = {
      event: { key: card.eventKey },
      cost: 0,
      modifications: finalMods,
      chosenCard: card
    };
    updatedPlayer.offeredWeekendCards = undefined;
    return updatedPlayer;
  }

  // 4. Handle Free Porch Chat
  if (card.id === 'free_porch_chat') {
    const socialGain = 1;
    updatedPlayer.social = Math.min(100, (updatedPlayer.social || 10) + socialGain);
    modifications.push({ stat: 'social', diff: socialGain });

    if (updatedPlayer.inventory?.tickets) {
      updatedPlayer.inventory.tickets = { baseball: 0, theatre: 0, concert: 0 };
    }

    maintainDecksOnChoice(updatedPlayer, card, cards, rng);

    const finalMods = mergeWeekendModifications(modifications, updatedPlayer.maintenanceModifications);
    updatedPlayer.maintenanceModifications = undefined;

    updatedPlayer.weekendResult = {
      event: { key: card.eventKey },
      cost: 0,
      modifications: finalMods,
      chosenCard: card
    };
    updatedPlayer.offeredWeekendCards = undefined;
    return updatedPlayer;
  }

  // 5. Handle Ticket Resale
  if (card.type === 'ticket_resale') {
    const payout = card.resalePayout || 0;
    updatedPlayer.money += payout;
    if (payout > 0) {
      modifications.push({ stat: 'money', diff: payout });
    }

    if (updatedPlayer.inventory?.tickets) {
      updatedPlayer.inventory.tickets = { baseball: 0, theatre: 0, concert: 0 };
    }

    maintainDecksOnChoice(updatedPlayer, card, cards, rng);

    const finalMods = mergeWeekendModifications(modifications, updatedPlayer.maintenanceModifications);
    updatedPlayer.maintenanceModifications = undefined;

    updatedPlayer.weekendResult = {
      event: { key: card.eventKey },
      cost: 0,
      modifications: finalMods,
      chosenCard: card
    };
    updatedPlayer.offeredWeekendCards = undefined;
    return updatedPlayer;
  }

  // 6. Handle Ticket Event Attendance
  if (card.type === 'ticket') {
    const mentalBonus = card.potentialBonusMin;
    const socialBonus = card.potentialSecondaryBonusMin || 0;

    if (rules?.usePhysicalMentalConditions) {
      const maxMental = updatedPlayer.mentalConditionMax ?? statRules?.maxMentalCondition ?? 50;
      updatedPlayer.mentalCondition = Math.min(maxMental, (updatedPlayer.mentalCondition ?? 50) + mentalBonus);
      modifications.push({ stat: 'mental', diff: mentalBonus });
    } else {
      updatedPlayer = applyHappinessChange(updatedPlayer, mentalBonus, 'weekend_bonus', rules || ({} as any), statRules);
      modifications.push({ stat: 'happiness', diff: mentalBonus });
    }

    if (socialBonus > 0) {
      updatedPlayer.social = Math.min(100, (updatedPlayer.social || 10) + socialBonus);
      modifications.push({ stat: 'social', diff: socialBonus });
    }

    // Expire all tickets
    if (updatedPlayer.inventory?.tickets) {
      updatedPlayer.inventory.tickets = { baseball: 0, theatre: 0, concert: 0 };
    }

    maintainDecksOnChoice(updatedPlayer, card, cards, rng);

    const finalMods = mergeWeekendModifications(modifications, updatedPlayer.maintenanceModifications);
    updatedPlayer.maintenanceModifications = undefined;

    updatedPlayer.weekendResult = {
      event: { key: card.eventKey },
      cost: 0,
      happinessBonus: mentalBonus,
      modifications: finalMods,
      chosenCard: card
    };
    updatedPlayer.offeredWeekendCards = undefined;
    return updatedPlayer;
  }

  // 7. Regular / Paid Cards
  const rawCost = Math.floor(rng.next() * (card.costMax - card.costMin + 1)) + card.costMin;
  const cost = Math.min(rawCost, updatedPlayer.money);
  updatedPlayer.money -= cost;
  if (cost > 0) {
    modifications.push({ stat: 'money', diff: -cost });
  }

  let happinessBonus: number | undefined = undefined;

  if (card.isSpecial) {
    happinessBonus = card.specialBonus || 3;
    if (rules?.usePhysicalMentalConditions) {
      const maxMental = updatedPlayer.mentalConditionMax ?? statRules?.maxMentalCondition ?? 50;
      updatedPlayer.mentalCondition = Math.min(maxMental, (updatedPlayer.mentalCondition ?? 50) + happinessBonus);
      modifications.push({ stat: 'mental', diff: happinessBonus });
    } else {
      updatedPlayer = applyHappinessChange(updatedPlayer, happinessBonus, 'weekend_bonus', rules || ({} as any), statRules);
      modifications.push({ stat: 'happiness', diff: happinessBonus });
    }
  } else {
    let bonusModifier = card.potentialBonusMin;
    if (card.potentialBonusMax > card.potentialBonusMin) {
      if (card.tier === 'cheap') {
        bonusModifier = cost >= 15 ? 2 : 1;
      } else if (card.tier === 'medium') {
        bonusModifier = cost >= 40 ? 3 : 2;
      } else if (card.tier === 'expensive') {
        bonusModifier = Math.max(3, Math.min(5, Math.floor(cost / 20)));
      }
    }

    if (bonusModifier > 0 && card.targetStat) {
      if (card.targetStat === 'mental') {
        if (rules?.usePhysicalMentalConditions) {
          const maxMental = updatedPlayer.mentalConditionMax ?? statRules?.maxMentalCondition ?? 50;
          updatedPlayer.mentalCondition = Math.min(maxMental, (updatedPlayer.mentalCondition ?? 50) + bonusModifier);
          modifications.push({ stat: 'mental', diff: bonusModifier });
        } else {
          updatedPlayer = applyHappinessChange(updatedPlayer, bonusModifier, 'weekend_bonus', rules || ({} as any), statRules);
          modifications.push({ stat: 'happiness', diff: bonusModifier });
        }
        happinessBonus = bonusModifier;
      } else if (card.targetStat === 'dependability') {
        updatedPlayer.dependability = Math.min(100, (updatedPlayer.dependability || 20) + bonusModifier);
        modifications.push({ stat: 'dependability', diff: bonusModifier });
      } else if (card.targetStat === 'social') {
        updatedPlayer.social = Math.min(100, (updatedPlayer.social || 10) + bonusModifier);
        modifications.push({ stat: 'social', diff: bonusModifier });
      } else if (card.targetStat === 'physical') {
        if (rules?.usePhysicalMentalConditions) {
          const maxPhysical = updatedPlayer.physicalConditionMax ?? statRules?.initialPhysicalMax ?? 50;
          updatedPlayer.physicalCondition = Math.min(maxPhysical, (updatedPlayer.physicalCondition ?? 50) + bonusModifier);
          modifications.push({ stat: 'physical', diff: bonusModifier });
        }
      }
    }
  }

  // Any unused tickets expire
  if (updatedPlayer.inventory?.tickets) {
    updatedPlayer.inventory.tickets = {
      baseball: 0,
      theatre: 0,
      concert: 0
    };
  }

  // Maintain decks
  maintainDecksOnChoice(updatedPlayer, card, cards, rng);

  // Clamp limits if needed
  if (rules?.usePhysicalMentalConditions) {
    const maxPhysical = updatedPlayer.physicalConditionMax ?? statRules?.initialPhysicalMax ?? 50;
    const maxMental = updatedPlayer.mentalConditionMax ?? statRules?.maxMentalCondition ?? 50;
    updatedPlayer.physicalCondition = Math.min(maxPhysical, updatedPlayer.physicalCondition ?? maxPhysical);
    updatedPlayer.mentalCondition = Math.min(maxMental, updatedPlayer.mentalCondition ?? maxMental);
  }

  const finalMods = mergeWeekendModifications(modifications, updatedPlayer.maintenanceModifications);
  updatedPlayer.maintenanceModifications = undefined;

  updatedPlayer.weekendResult = {
    event: { key: card.eventKey },
    cost,
    happinessBonus,
    modifications: finalMods,
    chosenCard: card
  };

  updatedPlayer.offeredWeekendCards = undefined;
  return updatedPlayer;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIC / LEGACY SINGLE-EVENT WEEKEND FALLBACK
// ─────────────────────────────────────────────────────────────────────────────

export function processWeekend(
  player: PlayerState, 
  turnNumber: number, 
  previousPlayerWeekends: string[],
  weekendData: WeekendDef,
  rng: Random,
  rules?: import('./gameState').GameRules,
  campaign?: import('./dataLoader').CampaignBundle
): PlayerState {
  let newPlayer: PlayerState = { ...player, inventory: { ...player.inventory, tickets: { ...player.inventory.tickets } } };
  
  let weekendEvent: GameEvent | null = null;
  let priceType: 'cheap' | 'medium' | 'expensive' = 'cheap';
  let happinessBonus: number | undefined = undefined;

  // 1. Tickets
  if (player.inventory.tickets.baseball > 0 && weekendData.ticketWeekends.baseball) {
    weekendEvent = { key: 'events.weekend.ticket_baseball' };
    newPlayer.inventory.tickets.baseball--;
    priceType = 'medium';
  } else if (player.inventory.tickets.theatre > 0 && weekendData.ticketWeekends.theatre) {
    weekendEvent = { key: 'events.weekend.ticket_theatre' };
    newPlayer.inventory.tickets.theatre--;
    priceType = 'medium';
  } else if (player.inventory.tickets.concert > 0 && weekendData.ticketWeekends.concert) {
    weekendEvent = { key: 'events.weekend.ticket_concert' };
    newPlayer.inventory.tickets.concert--;
    priceType = 'medium';
  } 
  // 2. Durables
  else {
    let triggeredDurableWeekend = false;
    const shuffledAppliances = rng.shuffle(newPlayer.inventory.appliances);
    
    for (const app of shuffledAppliances) {
      if (app.isBroken) continue;
      if (app.id === 'vcr') {
        const hasTv = newPlayer.inventory.appliances.some(a => (a.id === 'color_tv' || a.id === 'bw_tv') && !a.isBroken);
        if (!hasTv) continue;
      }
      if (weekendData.durableWeekends[app.id]) {
        if (rng.next() < 0.20) {
          const candidateEvent = { key: `events.weekend.durable_${app.id}` };
          if (!previousPlayerWeekends.includes(candidateEvent.key)) {
            weekendEvent = candidateEvent;
            priceType = 'cheap';
            triggeredDurableWeekend = true;
            break;
          }
        }
      }
    }

    // 3. Random Weekends
    if (!triggeredDurableWeekend) {
      if (newPlayer.money < 5) {
        weekendEvent = { key: 'events.weekend.too_broke' };
        newPlayer.weekendResult = {
          event: weekendEvent,
          cost: 0
        };
        return newPlayer;
      }

      let chosenIndex = -1;
      let attempts = 0;
      while (attempts < 100) {
        chosenIndex = Math.floor(rng.next() * weekendData.randomWeekends.length);
        const candidateKey = `events.weekend.random_${chosenIndex}`;
        if (!previousPlayerWeekends.includes(candidateKey)) {
          break;
        }
        attempts++;
      }
      
      weekendEvent = { key: `events.weekend.random_${chosenIndex}` };
      
      if (chosenIndex < 28) {
        priceType = 'cheap';
      } else if (chosenIndex < 35) {
        priceType = 'medium';
      } else {
        priceType = turnNumber >= 8 ? 'expensive' : 'medium';
      }

      if (chosenIndex === 41) {
        happinessBonus = Math.floor(rng.next() * 3) + 2;
      }
    }
  }

  const cost = getWeekendCost(priceType, newPlayer.money, rng);
  newPlayer.money -= cost;
  
  if (happinessBonus !== undefined) {
    newPlayer = applyHappinessChange(newPlayer, happinessBonus, 'weekend_bonus', rules || ({} as any), campaign?.config.statRules);
  }

  if (rules?.usePhysicalMentalConditions) {
    const statRules = campaign?.config.statRules;
    const maxPhysical = newPlayer.physicalConditionMax ?? statRules?.initialPhysicalMax ?? 50;
    const maxMental = newPlayer.mentalConditionMax ?? statRules?.maxMentalCondition ?? 50;

    newPlayer.physicalCondition = Math.min(maxPhysical, newPlayer.physicalCondition ?? maxPhysical);
    newPlayer.mentalCondition = Math.min(maxMental, newPlayer.mentalCondition ?? maxMental);
  }

  newPlayer.weekendResult = {
    event: weekendEvent!,
    cost,
    happinessBonus
  };

  return newPlayer;
}

