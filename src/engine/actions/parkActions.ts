import type { PlayerState, StatModification, GameEvent, MiniGameOption, MiniGameState, ParkDecksState } from '../gameState';
import type { ReducerContext, ActionHandlerResult } from './types';
import { spendHours } from '../timeManager';
import { requireAdvancedStatRules } from '../rules';
import { resolveDecision, type ReplayContext } from '../replayTypes';
import { roundToResolution } from '../statMath';
import { formatHours } from '../math/formatters';

export function handlePlayArcadeAction(
  player: PlayerState,
  _action: { type: 'play_arcade' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  if (nextPlayer.hoursRemaining < 3) {
    return { nextPlayer, actionLog: { key: 'action.error.notEnoughTime' } };
  }
  if (nextPlayer.money < 10) {
    return { nextPlayer, actionLog: { key: 'action.error.notEnoughMoney' } };
  }

  nextPlayer = spendHours(nextPlayer, 3);
  nextPlayer.money -= 10;

  const playsThisTurn = nextPlayer.turnFlags?.arcadePlaysThisTurn || 0;
  nextPlayer.turnFlags = {
    ...nextPlayer.turnFlags,
    arcadePlaysThisTurn: playsThisTurn + 1
  };

  if (context.rules.usePhysicalMentalConditions) {
    const modifications: StatModification[] = [{ stat: 'money', diff: -10 }];
    const maxMental = nextPlayer.mentalConditionMax ?? 50;
    const conditionRes = context.rules.conditionResolution ?? 0.5;

    // +2 Mental on both first and non-first buys
    nextPlayer.mentalCondition = Math.min(maxMental, roundToResolution((nextPlayer.mentalCondition ?? 50) + 2, conditionRes));
    modifications.push({ stat: 'mental', diff: 2 });

    if (playsThisTurn > 0) {
      // Non-first buys: -0.5 Physical fatigue
      nextPlayer.physicalCondition = Math.max(1, roundToResolution((nextPlayer.physicalCondition ?? 50) - 0.5, conditionRes));
      modifications.push({ stat: 'physical', diff: -0.5 });
    }

    return {
      nextPlayer,
      actionLog: {
        key: 'action.arcade.played',
        modifications
      }
    };
  }

  // Classic rules (usePhysicalMentalConditions is false)
  const modifications: StatModification[] = [{ stat: 'money', diff: -10 }];
  if (playsThisTurn === 0) {
    nextPlayer.happiness = Math.min(100, nextPlayer.happiness + 2);
    modifications.push({ stat: 'happiness', diff: 2 });
  }

  return {
    nextPlayer,
    actionLog: {
      key: 'action.arcade.played',
      modifications
    }
  };
}

// ── PARK CARD DECKS DEFINITION ──

export const PARK_RELAX_CARDS: MiniGameOption[] = [
  {
    type: 'park_encounter',
    cardId: 'park_chess',
    title: 'Park Chess Match',
    description: 'An elderly grandmaster invites you for a match in the shaded pavilion.',
    badge: 'Mind Game',
    icon: '♟️',
    socialAmount: 2,
    mentalAmount: 1,
    maxMentalAmount: 1
  },
  {
    type: 'park_encounter',
    cardId: 'park_dog',
    title: 'Friendly Golden Retriever',
    description: 'An energetic dog fetches a tennis ball and happily nudges your leg.',
    badge: 'Wholesome',
    icon: '🐕',
    socialAmount: 1,
    mentalAmount: 1
  },
  {
    type: 'park_encounter',
    cardId: 'park_busker',
    title: 'Acoustic Busker',
    description: 'A talented street musician plays soothing melodies beside the fountain.',
    badge: 'Music',
    icon: '🎸',
    mentalAmount: 2
  },
  {
    type: 'park_encounter',
    cardId: 'park_sunbathing',
    title: 'Sunny Meadow Rest',
    description: 'Warm sunshine and a gentle breeze help you completely unwind on the grass.',
    badge: 'Fresh Air',
    icon: '☀️',
    physicalAmount: 1,
    mentalAmount: 1
  },
  {
    type: 'park_encounter',
    cardId: 'park_dropped_bill',
    title: 'Found Loose Cash',
    description: 'You spot a crisp five-dollar bill tucked under the bench slats.',
    badge: 'Lucky',
    icon: '💵',
    cashAmount: 5,
    mentalAmount: 1
  },
  {
    type: 'park_encounter',
    cardId: 'park_reading',
    title: 'Reading Under the Oak',
    description: 'You lose yourself in a captivating paperback under a broad ancient oak.',
    badge: 'Literature',
    icon: '📖',
    mentalAmount: 2
  },
  {
    type: 'park_encounter',
    cardId: 'park_duck_pond',
    title: 'Feeding the Ducks',
    description: 'Watching ducklings glide peacefully across the pond brings calm and smiles.',
    badge: 'Nature',
    icon: '🦆',
    socialAmount: 1,
    mentalAmount: 1
  },
  {
    type: 'park_encounter',
    cardId: 'park_sketch_artist',
    title: 'Street Caricaturist',
    description: 'A friendly student artist sketches a cheerful portrait that makes you laugh.',
    badge: 'Art',
    icon: '🎨',
    socialAmount: 1,
    mentalAmount: 1
  }
];

export const PARK_WORKOUT_CARDS: MiniGameOption[] = [
  {
    type: 'park_encounter',
    cardId: 'workout_runners_high',
    title: "Runner's High",
    description: 'A sudden rush of endorphins dissolves your fatigue during the final stretch.',
    badge: 'Cardio',
    icon: '🏃',
    maxPhysAmount: 1,
    mentalAmount: 2
  },
  {
    type: 'park_encounter',
    cardId: 'workout_paced_runner',
    title: 'Paced by a Veteran',
    description: 'An experienced marathoner matches your pace and shares pacing tips.',
    badge: 'Technique',
    icon: '👟',
    maxPhysAmount: 1,
    socialAmount: 1
  },
  {
    type: 'park_encounter',
    cardId: 'workout_sprint_intervals',
    title: 'Sprint Intervals',
    description: 'High-intensity bursts push your lactate threshold and explosive conditioning.',
    badge: 'Speed',
    icon: '⚡',
    maxPhysAmount: 1,
    physicalAmount: 1
  },
  {
    type: 'park_encounter',
    cardId: 'workout_calisthenics',
    title: 'Park Calisthenics Routine',
    description: 'Pull-ups and dips on the outdoor fitness bars develop functional strength.',
    badge: 'Strength',
    icon: '🤸',
    maxPhysAmount: 1,
    mentalAmount: 1
  },
  {
    type: 'park_encounter',
    cardId: 'workout_hill_sprints',
    title: 'Hill Sprints Push',
    description: 'You charge up the steep park hill until your lungs burn. Brutal, but builds peak endurance.',
    badge: 'Endurance',
    icon: '⛰️',
    maxPhysAmount: 2,
    physicalAmount: -3
  },
  {
    type: 'park_encounter',
    cardId: 'workout_stretching_circle',
    title: 'Outdoor Yoga Group',
    description: 'You join a welcoming group for deep breathing and hip openers on the lawn.',
    badge: 'Flexibility',
    icon: '🧘',
    maxPhysAmount: 1,
    socialAmount: 1,
    mentalAmount: 1
  },
  {
    type: 'park_encounter',
    cardId: 'workout_hydration',
    title: 'Chilled Spring Water',
    description: 'Ice-cold artesian water refreshes your body and prevents cramping.',
    badge: 'Vitality',
    icon: '💧',
    maxPhysAmount: 1,
    physicalAmount: 2
  }
];

export const PARK_HAZARD_CARDS: MiniGameOption[] = [
  {
    type: 'park_encounter',
    cardId: 'hazard_persistent_bee',
    title: 'Persistent Bee',
    description: 'A relentless bumblebee buzzes inches from your face and refuses to leave.',
    icon: '🐝',
    mentalAmount: -1
  },
  {
    type: 'park_encounter',
    cardId: 'hazard_picnic_ants',
    title: 'Picnic Ants',
    description: 'A trail of red ants invades your sitting spot and ruins your peace.',
    icon: '🐜',
    mentalAmount: -1
  },
  {
    type: 'park_encounter',
    cardId: 'hazard_dog_poop',
    title: 'Stepped in Dog Mess',
    description: 'An irresponsible pet owner ruined your shoes and completely spoiled your mood.',
    icon: '💩',
    durabilityAmount: -1,
    mentalAmount: -1
  },
  {
    type: 'park_encounter',
    cardId: 'hazard_sudden_squall',
    title: 'Sudden Cold Rain',
    description: 'Dark clouds break with an icy downpour, leaving you shivering.',
    icon: '🌧️',
    physicalAmount: -1
  },
  {
    type: 'park_encounter',
    cardId: 'hazard_boombox',
    title: 'Blasting Boombox',
    description: 'A noisy group cranks distorted bass on a cheap stereo nearby.',
    icon: '📻',
    mentalAmount: -1
  },
  {
    type: 'park_encounter',
    cardId: 'hazard_pickpocket',
    title: 'Sly Pickpocket',
    description: 'A suspicious bump in the crowd tests your alertness.',
    icon: '🦹',
    mentalAmount: -1
  }
];

export function chooseBestParkCard(options: MiniGameOption[]): number {
  let bestIdx = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const score =
      (opt.maxPhysAmount || 0) * 15 +
      (opt.maxMentalAmount || 0) * 15 +
      (opt.mentalAmount || 0) * 4 +
      (opt.physicalAmount || 0) * 3 +
      (opt.socialAmount || 0) * 2 +
      (opt.cashAmount || 0) * 0.5 +
      (opt.durabilityAmount || 0) * 2;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function applyParkCardEffects(
  player: PlayerState,
  choice: MiniGameOption,
  context: ReducerContext
): { nextPlayer: PlayerState; modifications: StatModification[] } {
  const nextPlayer = structuredClone(player);
  const mods: StatModification[] = [];

  if (choice.cashAmount) {
    nextPlayer.money = Math.max(0, nextPlayer.money + choice.cashAmount);
    mods.push({ stat: 'money', diff: choice.cashAmount });
  }

  if (context.rules.usePhysicalMentalConditions) {
    if (choice.mentalAmount) {
      const maxMental = nextPlayer.mentalConditionMax ?? 50;
      nextPlayer.mentalCondition = Math.max(1, Math.min(maxMental, (nextPlayer.mentalCondition ?? 50) + choice.mentalAmount));
      mods.push({ stat: 'mental', diff: choice.mentalAmount });
    }
    if (choice.physicalAmount) {
      const maxPhys = nextPlayer.physicalConditionMax ?? 50;
      nextPlayer.physicalCondition = Math.max(1, Math.min(maxPhys, (nextPlayer.physicalCondition ?? 50) + choice.physicalAmount));
      mods.push({ stat: 'physical', diff: choice.physicalAmount });
    }
    if (choice.maxPhysAmount) {
      const globalMax = 100;
      const curMax = nextPlayer.physicalConditionMax ?? 50;
      if (curMax < globalMax) {
        const gain = Math.min(globalMax - curMax, choice.maxPhysAmount);
        nextPlayer.physicalConditionMax = curMax + gain;
        mods.push({ stat: 'maxPhysical', diff: gain });
      }
    }
    if (choice.maxMentalAmount) {
      const globalMax = 100;
      const curMax = nextPlayer.mentalConditionMax ?? 50;
      if (curMax < globalMax) {
        const gain = Math.min(globalMax - curMax, choice.maxMentalAmount);
        nextPlayer.mentalConditionMax = curMax + gain;
        mods.push({ stat: 'maxMental', diff: gain });
      }
    }
  } else {
    // Classic rules fallback
    if (choice.mentalAmount) {
      nextPlayer.happiness = Math.max(0, Math.min(100, nextPlayer.happiness + choice.mentalAmount));
      mods.push({ stat: 'happiness', diff: choice.mentalAmount });
    }
    if (choice.physicalAmount) {
      nextPlayer.relaxation = Math.max(0, Math.min(100, nextPlayer.relaxation + choice.physicalAmount));
      mods.push({ stat: 'relaxation', diff: choice.physicalAmount });
    }
  }

  if (choice.socialAmount && context.rules.trackSocial) {
    nextPlayer.social = Math.max(1, Math.min(99, (nextPlayer.social ?? 50) + choice.socialAmount));
    mods.push({ stat: 'social', diff: choice.socialAmount });
  }

  if (choice.durabilityAmount && nextPlayer.inventory?.selectedClothes) {
    const sel = nextPlayer.inventory.selectedClothes;
    if (sel === 'casual') {
      nextPlayer.inventory.casualClothesWeeks = Math.max(0, (nextPlayer.inventory.casualClothesWeeks || 0) + choice.durabilityAmount);
    } else if (sel === 'dress') {
      nextPlayer.inventory.dressClothesWeeks = Math.max(0, (nextPlayer.inventory.dressClothesWeeks || 0) + choice.durabilityAmount);
    } else if (sel === 'business') {
      nextPlayer.inventory.businessClothesWeeks = Math.max(0, (nextPlayer.inventory.businessClothesWeeks || 0) + choice.durabilityAmount);
    }
  }

  return { nextPlayer, modifications: mods };
}

export function scaleParkCard(
  card: MiniGameOption,
  ratio: number,
  conditionRes: number = 0.5
): MiniGameOption {
  if (ratio >= 1.0) return card;
  const scaled = structuredClone(card);

  if (scaled.mentalAmount !== undefined && scaled.mentalAmount !== 0) {
    const raw = scaled.mentalAmount * ratio;
    scaled.mentalAmount = roundToResolution(raw, conditionRes);
    if (scaled.mentalAmount === 0) {
      scaled.mentalAmount = raw > 0 ? conditionRes : -conditionRes;
    }
  }
  if (scaled.physicalAmount !== undefined && scaled.physicalAmount !== 0) {
    const raw = scaled.physicalAmount * ratio;
    scaled.physicalAmount = roundToResolution(raw, conditionRes);
    if (scaled.physicalAmount === 0) {
      scaled.physicalAmount = raw > 0 ? conditionRes : -conditionRes;
    }
  }
  if (scaled.maxPhysAmount !== undefined && scaled.maxPhysAmount !== 0) {
    const raw = scaled.maxPhysAmount * ratio;
    scaled.maxPhysAmount = roundToResolution(raw, conditionRes);
    if (scaled.maxPhysAmount === 0) {
      scaled.maxPhysAmount = conditionRes;
    }
  }
  if (scaled.maxMentalAmount !== undefined && scaled.maxMentalAmount !== 0) {
    const raw = scaled.maxMentalAmount * ratio;
    scaled.maxMentalAmount = roundToResolution(raw, conditionRes);
    if (scaled.maxMentalAmount === 0) {
      scaled.maxMentalAmount = conditionRes;
    }
  }
  if (scaled.socialAmount !== undefined && scaled.socialAmount !== 0) {
    scaled.socialAmount = Math.max(1, Math.round(scaled.socialAmount * ratio));
  }
  if (scaled.cashAmount !== undefined && scaled.cashAmount !== 0) {
    scaled.cashAmount = Math.round(scaled.cashAmount * ratio);
  }
  if (scaled.durabilityAmount !== undefined && scaled.durabilityAmount !== 0) {
    scaled.durabilityAmount = Math.min(-1, Math.round(scaled.durabilityAmount * ratio));
  }

  return scaled;
}

function shuffleArray<T>(array: T[], rng: { next: () => number }, replayContext: ReplayContext, seedKey: string): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const roll = resolveDecision(replayContext, `${seedKey}_shuffle_${i}`, () => rng.next());
    const j = Math.floor(roll * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function drawParkCards(
  player: PlayerState,
  deckType: 'relax' | 'workout' | 'hazard',
  count: number,
  context: ReducerContext,
  decisionPrefix: string
): { cards: MiniGameOption[]; updatedDecks: ParkDecksState } {
  const decks: ParkDecksState = player.parkDecks
    ? structuredClone(player.parkDecks)
    : {
        relax: { drawPile: [], discardPile: [] },
        workout: { drawPile: [], discardPile: [] },
        hazard: { drawPile: [], discardPile: [] }
      };

  const deck = decks[deckType];
  const cardPool = (
    deckType === 'relax' ? PARK_RELAX_CARDS :
    deckType === 'workout' ? PARK_WORKOUT_CARDS :
    PARK_HAZARD_CARDS
  );
  const allCardIds = cardPool.map(c => c.cardId!);

  const replayContext: ReplayContext = { inDecisions: context.engineDecisions || [], outDecisions: [] };

  if (deck.drawPile.length < count) {
    let pool = [...deck.discardPile];
    deck.discardPile = [];
    if (pool.length === 0) {
      pool = [...allCardIds];
    }
    const shuffled = shuffleArray(pool, context.rng, replayContext, `${decisionPrefix}_reshuffle_${deckType}`);
    deck.drawPile = [...deck.drawPile, ...shuffled];
  }

  if (deck.drawPile.length < count) {
    const extra = allCardIds.filter(id => !deck.drawPile.includes(id));
    const shuffled = shuffleArray(extra, context.rng, replayContext, `${decisionPrefix}_refill_${deckType}`);
    deck.drawPile = [...deck.drawPile, ...shuffled];
  }

  const drawnIds = deck.drawPile.splice(0, count);
  deck.discardPile.push(...drawnIds);

  const cardMap = new Map<string, MiniGameOption>();
  for (const c of cardPool) {
    cardMap.set(c.cardId!, c);
  }

  const drawnCards: MiniGameOption[] = drawnIds.map(id => {
    let card = structuredClone(cardMap.get(id) || cardPool[0]);
    if (card.cardId === 'hazard_pickpocket') {
      if (player.money >= 150) {
        const stolen = Math.min(100, Math.max(25, Math.floor(player.money * 0.15)));
        card = {
          ...card,
          cashAmount: -stolen,
          mentalAmount: -2,
          description: `A pickpocket bumped into you and lifted $${stolen} cash!`
        };
      } else {
        card = {
          ...card,
          cashAmount: 0,
          mentalAmount: -1,
          description: `A pickpocket bumped into you and found nothing in your pockets!`
        };
      }
    }
    return card;
  });

  return { cards: drawnCards, updatedDecks: decks };
}

// ── CORE ACTIONS ──

export function handleRelaxParkAction(
  player: PlayerState,
  _action: { type: 'relax_park' } | { type: 'stroll_park' } | { type: 'rest_bench' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  const costHours = 3;
  const allowPartial = Boolean(context.rules.allowPartialHours || context.rules.proportionalDivisibleActions);
  if (nextPlayer.hoursRemaining <= 0 || (!allowPartial && nextPlayer.hoursRemaining < costHours)) {
    return { nextPlayer, actionLog: { key: 'action.error.notEnoughTime' } };
  }

  const actualHours = Math.min(costHours, nextPlayer.hoursRemaining);
  const ratio = actualHours / costHours;
  nextPlayer = spendHours(nextPlayer, actualHours);

  const relaxes = nextPlayer.turnFlags?.parkRelaxesThisTurn || 0;
  nextPlayer.turnFlags = {
    ...nextPlayer.turnFlags,
    parkRelaxesThisTurn: relaxes + 1,
    parkStrollsThisTurn: (nextPlayer.turnFlags?.parkStrollsThisTurn || 0) + 1,
    parkBenchesThisTurn: (nextPlayer.turnFlags?.parkBenchesThisTurn || 0) + 1
  };

  const actionLogs: GameEvent[] = [];
  const replayContext: ReplayContext = { inDecisions: context.engineDecisions || [], outDecisions: [] };
  const enableEncounters = Boolean(context.rules.enableParkSystem ?? context.rules.usePhysicalMentalConditions);

  // Apply deterministic baseline rest
  if (context.rules.usePhysicalMentalConditions) {
    const maxPhys = nextPlayer.physicalConditionMax ?? 50;
    const maxMental = nextPlayer.mentalConditionMax ?? 50;
    const conditionRes = context.rules.conditionResolution ?? 0.5;

    let physGain = 0;
    let mentalGain = 0;
    if (relaxes === 0) {
      physGain = 2;
      mentalGain = 2;
    } else if (relaxes === 1) {
      physGain = 1;
      mentalGain = 1;
    }

    if (context.rules.proportionalDivisibleActions && actualHours < costHours) {
      if (physGain > 0) physGain = Math.max(conditionRes, roundToResolution(physGain * ratio, conditionRes));
      if (mentalGain > 0) mentalGain = Math.max(conditionRes, roundToResolution(mentalGain * ratio, conditionRes));
    }

    if (physGain > 0) {
      nextPlayer.physicalCondition = Math.min(maxPhys, (nextPlayer.physicalCondition ?? 50) + physGain);
    }
    if (mentalGain > 0) {
      nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? 50) + mentalGain);
    }

    const mods: StatModification[] = [];
    if (physGain > 0) mods.push({ stat: 'physical', diff: physGain });
    if (mentalGain > 0) mods.push({ stat: 'mental', diff: mentalGain });

    actionLogs.push({
      key: relaxes === 0 ? 'action.park.relax' : (relaxes === 1 ? 'action.park.relaxDiminished' : 'action.park.relaxExhausted'),
      modifications: mods
    });
  } else {
    // Classic rules
    let hapGain = 0;
    let relGain = 0;
    if (relaxes === 0) {
      hapGain = 2;
      relGain = 2;
    } else if (relaxes === 1) {
      hapGain = 1;
      relGain = 1;
    }

    if (context.rules.proportionalDivisibleActions && actualHours < costHours) {
      if (hapGain > 0) hapGain = Math.max(0.5, roundToResolution(hapGain * ratio, 0.5));
      if (relGain > 0) relGain = Math.max(0.5, roundToResolution(relGain * ratio, 0.5));
    }

    if (hapGain > 0) nextPlayer.happiness = Math.min(100, nextPlayer.happiness + hapGain);
    if (relGain > 0) nextPlayer.relaxation = Math.min(100, nextPlayer.relaxation + relGain);

    const mods: StatModification[] = [];
    if (hapGain > 0) mods.push({ stat: 'happiness', diff: hapGain });
    if (relGain > 0) mods.push({ stat: 'relaxation', diff: relGain });

    actionLogs.push({
      key: relaxes === 0 ? 'action.park.relax' : (relaxes === 1 ? 'action.park.relaxDiminished' : 'action.park.relaxExhausted'),
      modifications: mods
    });
  }

  if (!enableEncounters) {
    return { nextPlayer, actionLog: actionLogs[0] };
  }

  // Advanced 2000 Encounter System:
  // Baseline stats applied above; now draw 1 Event Card (75% encounter, 25% hazard)
  const conditionRes = context.rules.conditionResolution ?? 0.5;
  const isBadRoll = resolveDecision(
    replayContext,
    `park_roll_bad_${nextPlayer.id}_${context.turn}_${relaxes}`,
    () => context.rng.next() < 0.25
  );

    if (isBadRoll) {
      const { cards: [rawHazardCard], updatedDecks } = drawParkCards(
        nextPlayer,
        'hazard',
        1,
        context,
        `park_hazard_${nextPlayer.id}_${context.turn}_${relaxes}`
      );
      nextPlayer.parkDecks = updatedDecks;
      const hazardCard = (context.rules.proportionalDivisibleActions && actualHours < costHours)
        ? scaleParkCard(rawHazardCard, ratio, conditionRes)
        : rawHazardCard;

      if (nextPlayer.isAi) {
        const res = applyParkCardEffects(nextPlayer, hazardCard, context);
        nextPlayer = res.nextPlayer;
        actionLogs.push({
          key: 'events.park.hazard',
          params: { title: hazardCard.title, desc: hazardCard.description },
          modifications: res.modifications
        });
      } else {
        const miniGameState: MiniGameState = {
          gameType: 'park_hazard',
          title: 'Park Hazard!',
          subtitle: 'An unexpected incident interrupted your visit:',
          options: [hazardCard]
        };
        nextPlayer.pendingMiniGame = miniGameState;
        nextPlayer.pendingAppraisalDilemma = miniGameState;
        actionLogs.push({
          key: 'events.park.hazard',
          params: { title: hazardCard.title, desc: hazardCard.description }
        });
      }
    } else {
      const { cards: rawCards, updatedDecks } = drawParkCards(
        nextPlayer,
        'relax',
        3,
        context,
        `park_relax_${nextPlayer.id}_${context.turn}_${relaxes}`
      );
      nextPlayer.parkDecks = updatedDecks;

      const cards = (context.rules.proportionalDivisibleActions && actualHours < costHours)
        ? rawCards.map(c => scaleParkCard(c, ratio, conditionRes))
        : rawCards;

      if (nextPlayer.isAi) {
        const bestIdx = chooseBestParkCard(cards);
        const chosenCard = cards[bestIdx];
        const res = applyParkCardEffects(nextPlayer, chosenCard, context);
        nextPlayer = res.nextPlayer;
        actionLogs.push({
          key: 'action.park.cardResolved',
          params: { title: chosenCard.title },
          modifications: res.modifications
        });
      } else {
        const isPartial = context.rules.proportionalDivisibleActions && actualHours < costHours;
        const miniGameState: MiniGameState = {
          gameType: 'park_encounter',
          title: 'Park Encounter',
          subtitle: isPartial
            ? `Quick Park Visit (${formatHours(actualHours)}h / 3h) - Proportional Effects:`
            : 'Choose how to spend your time in the park:',
          options: cards
        };
        nextPlayer.pendingMiniGame = miniGameState;
        nextPlayer.pendingAppraisalDilemma = miniGameState;
        actionLogs.push({
          key: 'action.park.cardsDrawn',
          params: { count: cards.length }
        });
      }
    }

  return {
    nextPlayer,
    actionLog: actionLogs.length === 1 ? actionLogs[0] : actionLogs
  };
}

export function handleWorkoutParkAction(
  player: PlayerState,
  _action: { type: 'workout_park' } | { type: 'jog_park' },
  context: ReducerContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  const costHours = 3;
  const allowPartial = Boolean(context.rules.allowPartialHours || context.rules.proportionalDivisibleActions);
  if (nextPlayer.hoursRemaining <= 0 || (!allowPartial && nextPlayer.hoursRemaining < costHours)) {
    return { nextPlayer, actionLog: { key: 'action.error.notEnoughTime' } };
  }

  if (context.rules.usePhysicalMentalConditions && (nextPlayer.physicalCondition ?? 50) < 15) {
    return { nextPlayer, actionLog: { key: 'action.error.tooPhysicallyExhausted' } };
  }

  const actualHours = Math.min(costHours, nextPlayer.hoursRemaining);
  const ratio = actualHours / costHours;
  nextPlayer = spendHours(nextPlayer, actualHours);

  const workouts = nextPlayer.turnFlags?.parkWorkoutsThisTurn || 0;
  nextPlayer.turnFlags = {
    ...nextPlayer.turnFlags,
    parkWorkoutsThisTurn: workouts + 1,
    parkJogsThisTurn: (nextPlayer.turnFlags?.parkJogsThisTurn || 0) + 1
  };

  const actionLogs: GameEvent[] = [];
  const replayContext: ReplayContext = { inDecisions: context.engineDecisions || [], outDecisions: [] };
  const enableEncounters = Boolean(context.rules.enableParkSystem ?? context.rules.usePhysicalMentalConditions);
  const conditionRes = context.rules.conditionResolution ?? 0.5;

  const phys = nextPlayer.physicalCondition ?? 50;
  const mental = nextPlayer.mentalCondition ?? 50;
  let hadFatigueMistake = false;

  if (context.rules.usePhysicalMentalConditions && (phys < 20 || mental < 20)) {
    const mistakeChance = Math.min(
      0.60,
      Math.max(0, (20 - phys) * 0.05) + Math.max(0, (20 - mental) * 0.05)
    );
    hadFatigueMistake = resolveDecision(
      replayContext,
      `park_workout_fatigue_${nextPlayer.id}_${context.turn}_${workouts}`,
      () => context.rng.next() < mistakeChance
    );
  }

  if (hadFatigueMistake) {
    nextPlayer.physicalCondition = Math.max(1, phys - 2);
    actionLogs.push({
      key: 'action.park.workoutPulledMuscle',
      modifications: [{ stat: 'physical', diff: -2 }]
    });
    return { nextPlayer, actionLog: actionLogs[0] };
  }

  // Overtraining on 2nd+ workout: pushes too hard without adequate recovery
  if (workouts > 0) {
    if (context.rules.usePhysicalMentalConditions) {
      let physCost = 2;
      let mentalCost = 1;
      if (context.rules.proportionalDivisibleActions && actualHours < costHours) {
        physCost = Math.max(conditionRes, roundToResolution(physCost * ratio, conditionRes));
        mentalCost = Math.max(conditionRes, roundToResolution(mentalCost * ratio, conditionRes));
      }
      nextPlayer.physicalCondition = Math.max(1, phys - physCost);
      nextPlayer.mentalCondition = Math.max(1, mental - mentalCost);

      actionLogs.push({
        key: 'action.park.workoutOvertraining',
        modifications: [
          { stat: 'physical', diff: -physCost },
          { stat: 'mental', diff: -mentalCost }
        ]
      });
    } else {
      let relCost = 1;
      if (context.rules.proportionalDivisibleActions && actualHours < costHours) {
        relCost = Math.max(0.5, roundToResolution(relCost * ratio, 0.5));
      }
      nextPlayer.relaxation = Math.max(0, nextPlayer.relaxation - relCost);
      actionLogs.push({
        key: 'action.park.workoutOvertraining',
        modifications: [{ stat: 'relaxation', diff: -relCost }]
      });
    }
    return { nextPlayer, actionLog: actionLogs[0] };
  }

  // First workout baseline conditioning:
  if (context.rules.usePhysicalMentalConditions) {
    const statRules = requireAdvancedStatRules(context.campaign.config.statRules);
    const globalMax = statRules.initialPhysicalMax ?? 100;
    const curMax = nextPlayer.physicalConditionMax ?? 50;

    let maxDiff = 0;
    let baseMaxBoost = 1;
    if (context.rules.proportionalDivisibleActions && actualHours < costHours) {
      baseMaxBoost = roundToResolution(1 * ratio, conditionRes);
    }
    if (curMax < globalMax && baseMaxBoost > 0) {
      maxDiff = Math.min(globalMax - curMax, baseMaxBoost);
      nextPlayer.physicalConditionMax = curMax + maxDiff;
    }

    let physCost = 1;
    let mentalGain = 1;
    if (context.rules.proportionalDivisibleActions && actualHours < costHours) {
      physCost = Math.max(conditionRes, roundToResolution(physCost * ratio, conditionRes));
      mentalGain = Math.max(conditionRes, roundToResolution(mentalGain * ratio, conditionRes));
    }

    nextPlayer.physicalCondition = Math.max(1, Math.min(nextPlayer.physicalConditionMax ?? 50, phys - physCost));
    nextPlayer.mentalCondition = Math.min(nextPlayer.mentalConditionMax ?? 50, mental + mentalGain);

    const mods: StatModification[] = [
      { stat: 'physical', diff: -physCost },
      { stat: 'mental', diff: mentalGain }
    ];
    if (maxDiff > 0) mods.push({ stat: 'maxPhysical', diff: maxDiff });

    actionLogs.push({
      key: 'action.park.workout',
      modifications: mods
    });
  } else {
    // Classic rules
    let relGain = 2;
    let hapCost = 1;
    if (context.rules.proportionalDivisibleActions && actualHours < costHours) {
      relGain = Math.max(0.5, roundToResolution(relGain * ratio, 0.5));
      hapCost = Math.max(0.5, roundToResolution(hapCost * ratio, 0.5));
    }
    nextPlayer.relaxation = Math.min(100, nextPlayer.relaxation + relGain);
    nextPlayer.happiness = Math.max(0, nextPlayer.happiness - hapCost);
    actionLogs.push({
      key: 'action.park.workout',
      modifications: [
        { stat: 'relaxation', diff: relGain },
        { stat: 'happiness', diff: -hapCost }
      ]
    });
  }

  if (!enableEncounters) {
    return { nextPlayer, actionLog: actionLogs[0] };
  }

  // Encounters active: draw 1 Event Card (25% hazard, 75% workout cards)
  const isBadRoll = resolveDecision(
    replayContext,
    `park_workout_bad_${nextPlayer.id}_${context.turn}_${workouts}`,
    () => context.rng.next() < 0.25
  );

    if (isBadRoll) {
      const { cards: [rawHazardCard], updatedDecks } = drawParkCards(
        nextPlayer,
        'hazard',
        1,
        context,
        `park_hazard_workout_${nextPlayer.id}_${context.turn}_${workouts}`
      );
      nextPlayer.parkDecks = updatedDecks;
      const hazardCard = (context.rules.proportionalDivisibleActions && actualHours < costHours)
        ? scaleParkCard(rawHazardCard, ratio, conditionRes)
        : rawHazardCard;

      if (nextPlayer.isAi) {
        const res = applyParkCardEffects(nextPlayer, hazardCard, context);
        nextPlayer = res.nextPlayer;
        actionLogs.push({
          key: 'events.park.hazard',
          params: { title: hazardCard.title, desc: hazardCard.description },
          modifications: res.modifications
        });
      } else {
        const miniGameState: MiniGameState = {
          gameType: 'park_hazard',
          title: 'Park Hazard!',
          subtitle: 'An unexpected incident interrupted your workout:',
          options: [hazardCard]
        };
        nextPlayer.pendingMiniGame = miniGameState;
        nextPlayer.pendingAppraisalDilemma = miniGameState;
        actionLogs.push({
          key: 'events.park.hazard',
          params: { title: hazardCard.title, desc: hazardCard.description }
        });
      }
    } else {
      const { cards: rawCards, updatedDecks } = drawParkCards(
        nextPlayer,
        'workout',
        3,
        context,
        `park_workout_deck_${nextPlayer.id}_${context.turn}_${workouts}`
      );
      nextPlayer.parkDecks = updatedDecks;

      const cards = (context.rules.proportionalDivisibleActions && actualHours < costHours)
        ? rawCards.map(c => scaleParkCard(c, ratio, conditionRes))
        : rawCards;

      if (nextPlayer.isAi) {
        const bestIdx = chooseBestParkCard(cards);
        const chosenCard = cards[bestIdx];
        const res = applyParkCardEffects(nextPlayer, chosenCard, context);
        nextPlayer = res.nextPlayer;
        actionLogs.push({
          key: 'action.park.cardResolved',
          params: { title: chosenCard.title },
          modifications: res.modifications
        });
      } else {
        const isPartial = context.rules.proportionalDivisibleActions && actualHours < costHours;
        const miniGameState: MiniGameState = {
          gameType: 'park_encounter',
          title: 'Park Workout Encounter',
          subtitle: isPartial
            ? `Quick Workout (${formatHours(actualHours)}h / 3h) - Proportional Effects:`
            : 'Select an athletic training focus:',
          options: cards
        };
        nextPlayer.pendingMiniGame = miniGameState;
        nextPlayer.pendingAppraisalDilemma = miniGameState;
        actionLogs.push({
          key: 'action.park.cardsDrawn',
          params: { count: cards.length }
        });
      }
    }

  return {
    nextPlayer,
    actionLog: actionLogs.length === 1 ? actionLogs[0] : actionLogs
  };
}

// ── BACKWARDS-COMPATIBLE ALIASES ──

export function handleParkStrollAction(
  player: PlayerState,
  action: { type: 'stroll_park' },
  context: ReducerContext
): ActionHandlerResult {
  return handleRelaxParkAction(player, action, context);
}

export function handleParkRestAction(
  player: PlayerState,
  action: { type: 'rest_bench' },
  context: ReducerContext
): ActionHandlerResult {
  return handleRelaxParkAction(player, action, context);
}

export function handleParkJogAction(
  player: PlayerState,
  action: { type: 'jog_park' },
  context: ReducerContext
): ActionHandlerResult {
  return handleWorkoutParkAction(player, action, context);
}
