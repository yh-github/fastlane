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

export function initPlayerWeekendDecks(player: PlayerState, weekendData: WeekendDef, rng: Random): PlayerState {
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
    for (const app of player.inventory.appliances) {
      if (app.isBroken) continue;
      const cardId = `durable_${app.id}`;
      if (!cheapCards.includes(cardId)) {
        cheapCards.push(cardId);
      }
    }
  }

  return {
    ...player,
    weekendDecks: {
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
    recentWeekendTiers: player.recentWeekendTiers ? [...player.recentWeekendTiers] : []
  };
}

export function addApplianceCardToDeck(player: PlayerState, applianceId: string, rng?: Random): PlayerState {
  if (!player.weekendDecks) return player;
  const cardId = `durable_${applianceId}`;
  const cheap = { ...player.weekendDecks.cheap };
  if (cheap.drawPile.includes(cardId) || cheap.discardPile.includes(cardId)) {
    return player;
  }
  const newDraw = [...cheap.drawPile, cardId];
  cheap.drawPile = rng ? rng.shuffle(newDraw) : newDraw;
  return {
    ...player,
    weekendDecks: {
      ...player.weekendDecks,
      cheap
    }
  };
}

export function removeApplianceCardFromDeck(player: PlayerState, applianceId: string): PlayerState {
  if (!player.weekendDecks) return player;
  const cardId = `durable_${applianceId}`;
  return {
    ...player,
    weekendDecks: {
      ...player.weekendDecks,
      cheap: {
        drawPile: player.weekendDecks.cheap.drawPile.filter(id => id !== cardId),
        discardPile: player.weekendDecks.cheap.discardPile.filter(id => id !== cardId)
      }
    }
  };
}

export function generateWeekendChoices(
  player: PlayerState,
  _turnNumber: number,
  weekendData: WeekendDef,
  rng: Random
): { player: PlayerState; cards: WeekendCard[] } {
  let updatedPlayer = player.weekendDecks ? { ...player } : initPlayerWeekendDecks(player, weekendData, rng);
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

  // 2. Normal / Solvents (money >= 5): 3 choices
  const drawnCards: WeekendCard[] = [];
  const chosenCardIds: { id: string; tier: WeekendDeckTier }[] = [];

  // 2a. Ticket guarantee: If holding ticket, guarantee 1 ticket card
  const tickets = updatedPlayer.inventory.tickets;
  let heldTicketType: 'baseball' | 'theatre' | 'concert' | null = null;
  if (tickets.baseball > 0 && weekendData.ticketWeekends.baseball) heldTicketType = 'baseball';
  else if (tickets.theatre > 0 && weekendData.ticketWeekends.theatre) heldTicketType = 'theatre';
  else if (tickets.concert > 0 && weekendData.ticketWeekends.concert) heldTicketType = 'concert';

  if (heldTicketType) {
    const stats: ('mental' | 'social' | 'dependability')[] = ['mental', 'social', 'dependability'];
    const statIdx = Math.floor(rng.next() * stats.length);
    const targetStat = stats[statIdx];
    const ticketIcons: Record<string, string> = {
      baseball: '⚾',
      theatre: '🎭',
      concert: '🎸'
    };

    drawnCards.push({
      id: `ticket_${heldTicketType}`,
      tier: 'medium',
      type: 'ticket',
      eventKey: `events.weekend.ticket_${heldTicketType}`,
      titleKey: `weekendScreen.card.ticket_${heldTicketType}`,
      fluff: weekendData.ticketWeekends[heldTicketType]?.text || 'Enjoyed an exciting live event with your ticket!',
      icon: ticketIcons[heldTicketType] || '🎟️',
      costMin: 15,
      costMax: 55,
      targetStat,
      potentialBonusMin: Math.floor(15 / 25),
      potentialBonusMax: Math.floor(55 / 25)
    });
  }

  // 2b. Draw remaining cards from decks
  const slotsNeeded = 3 - drawnCards.length;

  // Determine affordable tiers
  const affordableTiers: WeekendDeckTier[] = ['cheap'];
  if (updatedPlayer.money >= 15) affordableTiers.push('medium');
  if (updatedPlayer.money >= 50) affordableTiers.push('expensive');

  // Calculate weights based on recent choices (bias towards last 3 choices)
  const recentPicks = updatedPlayer.recentWeekendTiers || [];

  for (let slot = 0; slot < slotsNeeded; slot++) {
    // Build weights for affordable tiers
    const tierWeights: { tier: WeekendDeckTier; weight: number }[] = affordableTiers.map(t => {
      let w = 1.0;
      for (const pick of recentPicks) {
        if (pick === t) w += 1.0;
      }
      return { tier: t, weight: w };
    });

    const totalWeight = tierWeights.reduce((sum, tw) => sum + tw.weight, 0);
    let r = rng.next() * totalWeight;
    let selectedTier: WeekendDeckTier = affordableTiers[0];
    for (const tw of tierWeights) {
      if (r <= tw.weight) {
        selectedTier = tw.tier;
        break;
      }
      r -= tw.weight;
    }

    // Draw card from selected tier
    const deck = decks[selectedTier];
    if (deck.drawPile.length === 0) {
      if (deck.discardPile.length > 0) {
        deck.drawPile = rng.shuffle([...deck.discardPile]);
        deck.discardPile = [];
      } else {
        // Fallback to cheap deck if this deck is completely exhausted
        selectedTier = 'cheap';
        if (decks.cheap.drawPile.length === 0 && decks.cheap.discardPile.length > 0) {
          decks.cheap.drawPile = rng.shuffle([...decks.cheap.discardPile]);
          decks.cheap.discardPile = [];
        }
      }
    }

    const cardId = deck.drawPile.pop() || 'random_0';
    chosenCardIds.push({ id: cardId, tier: selectedTier });

    // Determine cost range
    let costMin = 5;
    let costMax = 20;
    if (selectedTier === 'medium') {
      costMin = 15;
      costMax = 55;
    } else if (selectedTier === 'expensive') {
      costMin = 50;
      costMax = 100;
    }

    // Parse card
    if (cardId.startsWith('random_')) {
      const idx = parseInt(cardId.replace('random_', ''), 10);
      const fluff = weekendData.randomWeekends[idx] || 'Spent a relaxing weekend.';
      const isSpecial = idx === 41; // Special #42 event

      if (isSpecial) {
        const bonus = Math.floor(rng.next() * 3) + 2; // 2, 3, or 4
        drawnCards.push({
          id: cardId,
          tier: selectedTier,
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
        });
      } else {
        const stats: ('mental' | 'social' | 'dependability')[] = ['mental', 'social', 'dependability'];
        const targetStat = stats[Math.floor(rng.next() * stats.length)];
        const iconMap = { mental: '🧠', social: '👥', dependability: '🤝' };

        drawnCards.push({
          id: cardId,
          tier: selectedTier,
          type: 'random',
          eventKey: `events.weekend.random_${idx}`,
          titleKey: `weekendScreen.card.${selectedTier}Title`,
          fluff,
          icon: iconMap[targetStat] || '🎲',
          costMin,
          costMax,
          targetStat,
          potentialBonusMin: Math.floor(costMin / 25),
          potentialBonusMax: Math.floor(costMax / 25)
        });
      }
    } else if (cardId.startsWith('durable_')) {
      const appName = cardId.replace('durable_', '');
      const fluff = weekendData.durableWeekends[appName]?.text || 'Spent time with your home appliances.';
      const stats: ('mental' | 'social' | 'dependability')[] = ['mental', 'social', 'dependability'];
      const targetStat = stats[Math.floor(rng.next() * stats.length)];

      drawnCards.push({
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
        potentialBonusMin: Math.floor(5 / 25),
        potentialBonusMax: Math.floor(20 / 25)
      });
    }
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

  // Handle Broke Cards
  if (card.id === 'broke_stay_home') {
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

  if (card.id === 'broke_deep_clean') {
    const physicalCost = 2;
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

  // Normal Card / Ticket Resolution
  if (card.type === 'ticket') {
    const ticketType = card.id.replace('ticket_', '') as 'baseball' | 'theatre' | 'concert';
    if (updatedPlayer.inventory.tickets[ticketType] > 0) {
      updatedPlayer.inventory.tickets[ticketType]--;
    }
  }

  // Roll actual cost
  const rawCost = Math.floor(rng.next() * (card.costMax - card.costMin + 1)) + card.costMin;
  const cost = Math.min(rawCost, updatedPlayer.money);
  updatedPlayer.money -= cost;
  if (cost > 0) {
    modifications.push({ stat: 'money', diff: -cost });
  }

  // Stat Modifier: floor(cost / 25)
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
    const bonusModifier = Math.floor(cost / 25);
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
      }
    }
  }

  // Deck maintenance:
  // Move chosen card to discard pile
  // Shuffle unchosen cards back into their draw piles immediately
  if (updatedPlayer.weekendDecks && card.type !== 'ticket') {
    const tier = card.tier as WeekendDeckTier;
    if (updatedPlayer.weekendDecks[tier]) {
      updatedPlayer.weekendDecks[tier].discardPile.push(card.id);
    }

    // Return unchosen cards back to draw pile and shuffle immediately
    for (const otherCard of cards) {
      if (otherCard.id !== card.id && otherCard.type !== 'ticket') {
        const oTier = otherCard.tier as WeekendDeckTier;
        if (updatedPlayer.weekendDecks[oTier]) {
          updatedPlayer.weekendDecks[oTier].drawPile.push(otherCard.id);
          updatedPlayer.weekendDecks[oTier].drawPile = rng.shuffle([...updatedPlayer.weekendDecks[oTier].drawPile]);
        }
      }
    }
  }

  // Update lifestyle momentum history (track last 3 tiers)
  if (card.tier === 'cheap' || card.tier === 'medium' || card.tier === 'expensive') {
    const currentRecent = updatedPlayer.recentWeekendTiers || [];
    updatedPlayer.recentWeekendTiers = [...currentRecent, card.tier].slice(-3);
  }

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

