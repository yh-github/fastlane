import type { PlayerState, StatModification, GameEvent, MiniGameOption, MiniGameState, ParkDecksState } from '../gameState';
import type { ReducerContext, ActionHandlerResult } from './types';
import { spendHours } from '../timeManager';
import { requireAdvancedStatRules, requireConfig, type GameRules } from '../rules';
import { resolveDecision, type ReplayContext } from '../replayTypes';
import { roundToResolution, calcMaxSkillCap } from '../statMath';
import { formatHours } from '../math/formatters';

export const ARCADE_ENCOUNTER_CARDS: MiniGameOption[] = [
  {
    type: 'arcade_encounter',
    cardId: 'arcade_space_ace',
    title: 'Space Buccaneer High Score',
    description: 'You top the glowing leaderboard and collect a side-bet pot from the crowd.',
    badge: 'High Score',
    icon: '🕹️',
    mentalAmount: 1,
    cashAmount: 5
  },
  {
    type: 'arcade_encounter',
    cardId: 'arcade_beatemup',
    title: 'Co-Op Beat-Em-Up Run',
    description: 'Drop quarters alongside a regular and clear the final boss together.',
    badge: 'Co-Op',
    icon: '🤝',
    socialAmount: 2,
    mentalAmount: 0.5
  },
  {
    type: 'arcade_encounter',
    cardId: 'arcade_pcb_tinker',
    title: 'Dipswitch & Joystick Fix',
    description: 'Pop open the sticky coin door, reseat a microswitch, and get in a sharp run.',
    badge: 'Tinker',
    icon: '🔧',
    techSkillAmount: 0.1,
    mentalAmount: 1
  },
  {
    type: 'arcade_encounter',
    cardId: 'arcade_pinball',
    title: 'Sea-Wolf Pinball Flow',
    description: 'Lock in multiball combos and shake off work stress in total arcade focus.',
    badge: 'Focus',
    icon: '⚡',
    mentalAmount: 1.5
  },
  {
    type: 'arcade_encounter',
    cardId: 'arcade_claw',
    title: 'Pirate Claw Jackpot',
    description: 'Snag a boxed figurine right at the chute and trade it cleanly at the counter.',
    badge: 'Jackpot',
    icon: '🧸',
    cashAmount: 8,
    mentalAmount: 0.5
  },
  {
    type: 'arcade_encounter',
    cardId: 'arcade_crt_tune',
    title: 'CRT Scanline Tune-Up',
    description: 'Dial in a flickering monitor with a regular spectator and chat about hardware.',
    badge: 'Tech Chat',
    icon: '🛠️',
    techSkillAmount: 0.1,
    socialAmount: 1
  }
];

export const ARCADE_GLITCH_CARD: MiniGameOption = {
  type: 'arcade_encounter',
  cardId: 'arcade_coin_jam',
  title: 'Sticky Coin Mech & Tilt',
  description: 'The cabinet eats two extra tokens and resets your run on the last boss.',
  badge: 'Glitch',
  icon: '👾',
  cashAmount: -2,
  mentalAmount: -0.5
};

export function handlePlayArcadeAction(
  player: PlayerState,
  _action: { type: 'play_arcade' },
  context: ReducerContext,
  replayContext?: ReplayContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  const costHours = 2;
  const allowPartial = Boolean(context.rules.allowPartialHours || context.rules.proportionalDivisibleActions);

  if (nextPlayer.hoursRemaining <= 0 || (!allowPartial && nextPlayer.hoursRemaining < costHours)) {
    return { nextPlayer, actionLog: { key: 'action.error.notEnoughTime' } };
  }

  const actualHours = Math.min(costHours, nextPlayer.hoursRemaining);
  const ratio = actualHours / costHours;
  const cashCost = (allowPartial && actualHours < costHours) ? Math.max(1, Math.round(8 * ratio)) : 8;

  if (nextPlayer.money < cashCost) {
    return { nextPlayer, actionLog: { key: 'action.error.notEnoughMoney' } };
  }

  nextPlayer = spendHours(nextPlayer, actualHours);
  nextPlayer.money -= cashCost;

  const playsThisTurn = nextPlayer.turnFlags?.arcadePlaysThisTurn || 0;
  nextPlayer.turnFlags = {
    ...nextPlayer.turnFlags,
    arcadePlaysThisTurn: playsThisTurn + 1
  };

  if (context.rules.usePhysicalMentalConditions) {
    const statRules = requireAdvancedStatRules(context.campaign.config.statRules);
    const maxMental = nextPlayer.mentalConditionMax ?? requireConfig(statRules.maxMentalCondition, 'statRules.maxMentalCondition');
    const startingMental = requireConfig(statRules.startingMentalCondition, 'statRules.startingMentalCondition');
    const startingPhys = requireConfig(statRules.startingPhysicalCondition, 'statRules.startingPhysicalCondition');
    const minPhys = requireConfig(statRules.minPhysicalCondition, 'statRules.minPhysicalCondition');
    const maxSocial = requireConfig(statRules.maxSocial, 'statRules.maxSocial');
    const startingSocial = requireConfig(statRules.startingSocial, 'statRules.startingSocial');
    const modifications: StatModification[] = [{ stat: 'money', diff: -cashCost }];
    const conditionRes = context.rules.conditionResolution ?? 0.5;
    const isPartial = Boolean(context.rules.proportionalDivisibleActions && actualHours < costHours);

    let mentalDelta = 0;
    let physDelta = 0;
    let socialDelta = 0;

    if (playsThisTurn === 0) {
      mentalDelta = 2;
      socialDelta = context.rules.trackSocial ? 1 : 0;
    } else if (playsThisTurn === 1) {
      mentalDelta = 1;
      physDelta = -0.5;
    } else {
      mentalDelta = 0;
      physDelta = -1;
    }

    if (isPartial) {
      if (mentalDelta > 0) mentalDelta = Math.max(conditionRes, roundToResolution(mentalDelta * ratio, conditionRes));
      if (physDelta < 0) physDelta = -Math.max(conditionRes, roundToResolution(Math.abs(physDelta) * ratio, conditionRes));
      if (socialDelta > 0) socialDelta = Math.max(1, Math.round(socialDelta * ratio));
    }

    if (mentalDelta > 0) {
      nextPlayer.mentalCondition = Math.min(maxMental, roundToResolution((nextPlayer.mentalCondition ?? startingMental) + mentalDelta, conditionRes));
      modifications.push({ stat: 'mental', diff: mentalDelta });
    }
    if (socialDelta > 0) {
      nextPlayer.social = Math.min(maxSocial, (nextPlayer.social ?? startingSocial) + socialDelta);
      modifications.push({ stat: 'social', diff: socialDelta });
    }
    if (physDelta < 0) {
      nextPlayer.physicalCondition = Math.max(minPhys, roundToResolution((nextPlayer.physicalCondition ?? startingPhys) + physDelta, conditionRes));
      modifications.push({ stat: 'physical', diff: physDelta });
    }

    const actionLogs: GameEvent[] = [{
      key: 'action.arcade.played',
      modifications
    }];

    const encounterRes = resolveArcadeEncounter(nextPlayer, playsThisTurn, isPartial, ratio, conditionRes, context, replayContext);
    nextPlayer = encounterRes.nextPlayer;
    if (encounterRes.extraLog) actionLogs.push(encounterRes.extraLog);

    return {
      nextPlayer,
      actionLog: actionLogs.length === 1 ? actionLogs[0] : actionLogs
    };
  }

  // Classic rules (usePhysicalMentalConditions is false)
  const modifications: StatModification[] = [{ stat: 'money', diff: -cashCost }];
  if (playsThisTurn === 0) {
    nextPlayer.happiness = Math.min(100, nextPlayer.happiness + 2);
    modifications.push({ stat: 'happiness', diff: 2 });
  }

  const actionLogs: GameEvent[] = [{
    key: 'action.arcade.played',
    modifications
  }];

  const conditionRes = context.rules.conditionResolution ?? 0.5;
  const isPartial = Boolean(context.rules.proportionalDivisibleActions && actualHours < costHours);
  const encounterRes = resolveArcadeEncounter(nextPlayer, playsThisTurn, isPartial, ratio, conditionRes, context, replayContext);
  nextPlayer = encounterRes.nextPlayer;
  if (encounterRes.extraLog) actionLogs.push(encounterRes.extraLog);

  return {
    nextPlayer,
    actionLog: actionLogs.length === 1 ? actionLogs[0] : actionLogs
  };
}

/**
 * Draws arcade cabinet encounter cards (80% 2-card choice, 20% mild glitch) on every play.
 */
function resolveArcadeEncounter(
  player: PlayerState,
  playsThisTurn: number,
  isPartial: boolean,
  ratio: number,
  conditionRes: number,
  context: ReducerContext,
  replayContext?: ReplayContext
): { nextPlayer: PlayerState; extraLog?: GameEvent } {
  let nextPlayer = player;
  const effectiveReplay: ReplayContext = replayContext ?? {
    inDecisions: context.engineDecisions || [],
    outDecisions: []
  };
  const keySuffix = playsThisTurn === 0 ? '' : `_${playsThisTurn}`;

  const isGlitch = resolveDecision(
    effectiveReplay,
    `arcade_glitch_${nextPlayer.id}_${context.turn}${keySuffix}`,
    () => context.rng.next() < 0.20
  );

  if (isGlitch) {
    const rawGlitch = structuredClone(ARCADE_GLITCH_CARD);
    const glitchCard = isPartial ? scaleParkCard(rawGlitch, ratio, conditionRes) : rawGlitch;
    if (nextPlayer.isAi) {
      const res = applyParkCardEffects(nextPlayer, glitchCard, context);
      return {
        nextPlayer: res.nextPlayer,
        extraLog: {
          key: 'action.arcade.glitch',
          params: { title: glitchCard.title, desc: glitchCard.description },
          modifications: res.modifications
        }
      };
    }
    const miniGameState: MiniGameState = {
      gameType: 'arcade_encounter',
      title: '👾 Arcade Glitch!',
      subtitle: 'A cabinet hiccupped near the end of your run:',
      options: [glitchCard]
    };
    nextPlayer.pendingMiniGame = miniGameState;
    nextPlayer.pendingAppraisalDilemma = miniGameState;
    return { nextPlayer };
  }

  const pool = shuffleArray(
    ARCADE_ENCOUNTER_CARDS,
    context.rng,
    effectiveReplay,
    `arcade_draw_${nextPlayer.id}_${context.turn}${keySuffix}`
  );
  const picked = pool.slice(0, 2).map(card => {
    const cloned = structuredClone(card);
    return isPartial ? scaleParkCard(cloned, ratio, conditionRes) : cloned;
  });

  if (nextPlayer.isAi) {
    const bestIdx = chooseBestParkCard(picked);
    const chosenCard = picked[bestIdx] || picked[0];
    const res = applyParkCardEffects(nextPlayer, chosenCard, context);
    return {
      nextPlayer: res.nextPlayer,
      extraLog: {
        key: 'action.arcade.cardResolved',
        params: { title: chosenCard.title, desc: chosenCard.description },
        modifications: res.modifications
      }
    };
  }

  const miniGameState: MiniGameState = {
    gameType: 'arcade_encounter',
    title: '🕹️ Pirate Arcade Corner',
    subtitle: 'Pick a cabinet to finish your session:',
    options: picked
  };
  nextPlayer.pendingMiniGame = miniGameState;
  nextPlayer.pendingAppraisalDilemma = miniGameState;
  return { nextPlayer };
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

export const PARK_OUTFIT_MUGGING_CARDS: Record<'dress' | 'business', MiniGameOption> = {
  dress: {
    type: 'park_encounter',
    cardId: 'hazard_outfit_mugging',
    title: 'Flashy Target',
    description: "Your Dress Clothes caught a mugger's eye in the park.",
    icon: '🦹',
    mentalAmount: -1
  },
  business: {
    type: 'park_encounter',
    cardId: 'hazard_outfit_mugging',
    title: 'Prime Target',
    description: 'Your expensive Business Suit drew an opportunistic mugger in the park.',
    icon: '🦹',
    mentalAmount: -1
  }
};

export interface ParkEncounterOdds {
  outfitTier: 'dress' | 'business' | null;
  outfitMuggingChance: number;
  hazardChance: number;
  goodChance: number;
  totalBadChance: number;
  totalMuggingChance: number;
}

export type ParkEncounterOutcome = 'mugging' | 'hazard' | 'good';

/**
 * Computes park encounter/hazard/mugging probabilities.
 * Outfit-based mugging bonuses (+5pp Dress, +10pp Business) apply only when `enableParkSystem` is enabled.
 */
export function getParkEncounterOdds(
  player: PlayerState,
  rules?: Partial<GameRules>
): ParkEncounterOdds {
  const enablePark = Boolean(rules?.enableParkSystem);
  const selected = player.inventory?.selectedClothes;
  const outfitTier: 'dress' | 'business' | null = enablePark
    ? (selected === 'dress' ? 'dress' : (selected === 'business' ? 'business' : null))
    : null;
  const outfitMuggingChance = outfitTier === 'business' ? 0.10 : (outfitTier === 'dress' ? 0.05 : 0);
  const hazardChance = 0.25;
  const goodChance = Number((1 - hazardChance - outfitMuggingChance).toFixed(4));
  const totalBadChance = Number((hazardChance + outfitMuggingChance).toFixed(4));
  const totalMuggingChance = Number((outfitMuggingChance + hazardChance / PARK_HAZARD_CARDS.length).toFixed(4));
  return {
    outfitTier,
    outfitMuggingChance,
    hazardChance,
    goodChance,
    totalBadChance,
    totalMuggingChance
  };
}

/**
 * Resolves cash stolen and narrative description for park pickpocket and outfit-mugging cards.
 */
export function resolveParkMuggingCard(
  card: MiniGameOption,
  player: PlayerState,
  outfitTier?: 'dress' | 'business' | null
): MiniGameOption {
  if (player.money >= 150) {
    const stolen = Math.min(100, Math.max(25, Math.floor(player.money * 0.15)));
    if (card.cardId === 'hazard_outfit_mugging') {
      const outfitLabel = outfitTier === 'business' ? 'Business Suit' : 'Dress Clothes';
      return {
        ...card,
        cashAmount: -stolen,
        mentalAmount: -2,
        description: `Wearing your ${outfitLabel} made you an easy mark — a mugger cornered you and lifted $${stolen} cash!`
      };
    }
    return {
      ...card,
      cashAmount: -stolen,
      mentalAmount: -2,
      description: `A pickpocket bumped into you and lifted $${stolen} cash!`
    };
  }

  if (card.cardId === 'hazard_outfit_mugging') {
    const outfitLabel = outfitTier === 'business' ? 'Business Suit' : 'Dress Clothes';
    return {
      ...card,
      cashAmount: 0,
      mentalAmount: -1,
      description: `Your ${outfitLabel} drew a mugger, but they found nothing in your pockets!`
    };
  }

  return {
    ...card,
    cashAmount: 0,
    mentalAmount: -1,
    description: 'A pickpocket bumped into you and found nothing in your pockets!'
  };
}

export interface ParkWorkoutBaseline {
  workoutsBefore: number;
  maxPhysGain: number;
  physCost: number;
  mentalDelta: number;
}

/**
 * Computes baseline conditioning modifiers for a park workout session.
 * Every session grants +1 Max Physical (up to globalMax), while Physical cost (1 + n)
 * and Mental cost (n) escalate by 1 each session within a turn, with a +2 Mental on-first bonus.
 */
export function getParkWorkoutBaseline(
  player: PlayerState,
  rules: Partial<GameRules> | undefined,
  statRules: { initialPhysicalMax: number; globalMaxPhysicalCondition: number } | undefined,
  actualHours: number = 3,
  costHours: number = 3
): ParkWorkoutBaseline {
  const workoutsBefore = player.turnFlags?.parkWorkoutsThisTurn || 0;
  const conditionRes = rules?.conditionResolution ?? 0.5;
  const ratio = costHours > 0 ? actualHours / costHours : 1;
  const scalePartial = Boolean(rules?.proportionalDivisibleActions && actualHours < costHours);

  const rawMaxBoost = scalePartial ? roundToResolution(1 * ratio, conditionRes) : 1;
  const curMax = player.physicalConditionMax ?? statRules?.initialPhysicalMax;
  const globalMax = statRules?.globalMaxPhysicalCondition;
  const maxPhysGain = (curMax !== undefined && globalMax !== undefined)
    ? Math.min(Math.max(0, roundToResolution(globalMax - curMax, conditionRes)), rawMaxBoost)
    : rawMaxBoost;

  const rawPhysCost = 1 + workoutsBefore;
  const physCost = scalePartial
    ? Math.max(conditionRes, roundToResolution(rawPhysCost * ratio, conditionRes))
    : rawPhysCost;

  const rawMentalDelta = workoutsBefore === 0 ? 2 : -workoutsBefore;
  let mentalDelta = rawMentalDelta;
  if (scalePartial) {
    if (rawMentalDelta > 0) {
      mentalDelta = Math.max(conditionRes, roundToResolution(rawMentalDelta * ratio, conditionRes));
    } else if (rawMentalDelta < 0) {
      mentalDelta = -Math.max(conditionRes, roundToResolution(Math.abs(rawMentalDelta) * ratio, conditionRes));
    }
  }

  return { workoutsBefore, maxPhysGain, physCost, mentalDelta };
}

export function chooseBestParkCard(options: MiniGameOption[]): number {
  let bestIdx = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const score =
      (opt.maxPhysAmount || 0) * 15 +
      (opt.maxMentalAmount || 0) * 15 +
      (opt.techSkillAmount || 0) * 15 +
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
    const statRules = requireAdvancedStatRules(context.campaign.config.statRules);
    const initMaxPhys = requireConfig(statRules.initialPhysicalMax, 'statRules.initialPhysicalMax');
    const defaultMaxMental = requireConfig(statRules.maxMentalCondition, 'statRules.maxMentalCondition');
    const startingPhys = requireConfig(statRules.startingPhysicalCondition, 'statRules.startingPhysicalCondition');
    const startingMental = requireConfig(statRules.startingMentalCondition, 'statRules.startingMentalCondition');
    const minPhys = requireConfig(statRules.minPhysicalCondition, 'statRules.minPhysicalCondition');
    const minMental = requireConfig(statRules.minMentalCondition, 'statRules.minMentalCondition');
    const globalMaxPhys = requireConfig(statRules.globalMaxPhysicalCondition, 'statRules.globalMaxPhysicalCondition');
    const globalMaxMental = requireConfig(statRules.globalMaxMentalCondition, 'statRules.globalMaxMentalCondition');

    if (choice.mentalAmount) {
      const maxMental = nextPlayer.mentalConditionMax ?? defaultMaxMental;
      nextPlayer.mentalCondition = Math.max(minMental, Math.min(maxMental, (nextPlayer.mentalCondition ?? startingMental) + choice.mentalAmount));
      mods.push({ stat: 'mental', diff: choice.mentalAmount });
    }
    if (choice.physicalAmount) {
      const maxPhys = nextPlayer.physicalConditionMax ?? initMaxPhys;
      nextPlayer.physicalCondition = Math.max(minPhys, Math.min(maxPhys, (nextPlayer.physicalCondition ?? startingPhys) + choice.physicalAmount));
      mods.push({ stat: 'physical', diff: choice.physicalAmount });
    }
    if (choice.maxPhysAmount) {
      const curMax = nextPlayer.physicalConditionMax ?? initMaxPhys;
      if (curMax < globalMaxPhys) {
        const gain = Math.min(globalMaxPhys - curMax, choice.maxPhysAmount);
        nextPlayer.physicalConditionMax = curMax + gain;
        mods.push({ stat: 'maxPhysical', diff: gain });
      }
    }
    if (choice.maxMentalAmount) {
      const curMax = nextPlayer.mentalConditionMax ?? defaultMaxMental;
      if (curMax < globalMaxMental) {
        const gain = Math.min(globalMaxMental - curMax, choice.maxMentalAmount);
        nextPlayer.mentalConditionMax = curMax + gain;
        // Persist through recalculatePlayerEffects (which recomputes mentalConditionMax from resilienceBonus)
        nextPlayer.resilienceBonus = (nextPlayer.resilienceBonus || 0) + gain;
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
    const statRules = requireAdvancedStatRules(context.campaign.config.statRules);
    const minSocial = requireConfig(statRules.minSocial, 'statRules.minSocial');
    const maxSocial = requireConfig(statRules.maxSocial, 'statRules.maxSocial');
    const startingSocial = requireConfig(statRules.startingSocial, 'statRules.startingSocial');
    nextPlayer.social = Math.max(minSocial, Math.min(maxSocial, (nextPlayer.social ?? startingSocial) + choice.socialAmount));
    mods.push({ stat: 'social', diff: choice.socialAmount });
  }

  if (choice.techSkillAmount && context.rules.useSkills) {
    const statRules = context.campaign.config.statRules as any;
    const maxTech = statRules
      ? calcMaxSkillCap(nextPlayer, 'skillTech', context.campaign.education || [], statRules, context.rules)
      : 10;
    const curTech = nextPlayer.skillTech || 0;
    const nextTech = Math.min(maxTech, roundToResolution(curTech + choice.techSkillAmount, 0.05));
    const techDiff = roundToResolution(nextTech - curTech, 0.05);
    if (techDiff > 0) {
      nextPlayer.skillTech = nextTech;
      mods.push({ stat: 'skillTech', diff: techDiff });
    }
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
    const origCash = scaled.cashAmount;
    scaled.cashAmount = Math.round(scaled.cashAmount * ratio);
    if ((scaled.cardId === 'hazard_pickpocket' || scaled.cardId === 'hazard_outfit_mugging') && origCash < 0 && scaled.cashAmount !== origCash) {
      scaled.description = scaled.description.replace(`$${Math.abs(origCash)}`, `$${Math.abs(scaled.cashAmount)}`);
    }
  }
  if (scaled.durabilityAmount !== undefined && scaled.durabilityAmount !== 0) {
    scaled.durabilityAmount = Math.min(-1, Math.round(scaled.durabilityAmount * ratio));
  }
  if (scaled.techSkillAmount !== undefined && scaled.techSkillAmount !== 0) {
    scaled.techSkillAmount = Math.max(0.05, roundToResolution(scaled.techSkillAmount * ratio, 0.05));
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
  decisionPrefix: string,
  replayContext?: ReplayContext
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

  const effectiveReplay: ReplayContext = replayContext ?? {
    inDecisions: context.engineDecisions || [],
    outDecisions: []
  };

  if (deck.drawPile.length < count) {
    let pool = [...deck.discardPile];
    deck.discardPile = [];
    if (pool.length === 0) {
      pool = [...allCardIds];
    }
    const shuffled = shuffleArray(pool, context.rng, effectiveReplay, `${decisionPrefix}_reshuffle_${deckType}`);
    deck.drawPile = [...deck.drawPile, ...shuffled];
  }

  if (deck.drawPile.length < count) {
    const extra = allCardIds.filter(id => !deck.drawPile.includes(id));
    const shuffled = shuffleArray(extra, context.rng, effectiveReplay, `${decisionPrefix}_refill_${deckType}`);
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
      card = resolveParkMuggingCard(card, player);
    }
    return card;
  });

  return { cards: drawnCards, updatedDecks: decks };
}

// ── CORE ACTIONS ──

function rollParkEncounterOutcome(
  replayContext: ReplayContext,
  decisionKey: string,
  rng: { next: () => number },
  odds: ParkEncounterOdds
): ParkEncounterOutcome {
  const raw = resolveDecision<ParkEncounterOutcome | boolean>(
    replayContext,
    decisionKey,
    () => {
      const r = rng.next();
      if (odds.outfitMuggingChance > 0 && r < odds.outfitMuggingChance) {
        return 'mugging';
      }
      if (r < odds.outfitMuggingChance + odds.hazardChance) {
        return 'hazard';
      }
      return 'good';
    }
  );
  if (raw === true) return 'hazard';
  if (raw === false) return 'good';
  return raw;
}

function resolveParkEncounterBranch(params: {
  player: PlayerState;
  deckType: 'relax' | 'workout';
  badDecisionKey: string;
  hazardPrefix: string;
  goodPrefix: string;
  hazardSubtitle: string;
  goodTitle: string;
  goodSubtitle: string;
  ratio: number;
  actualHours: number;
  costHours: number;
  conditionRes: number;
  context: ReducerContext;
  replayContext: ReplayContext;
  actionLogs: GameEvent[];
}): PlayerState {
  const {
    deckType,
    badDecisionKey,
    hazardPrefix,
    goodPrefix,
    hazardSubtitle,
    goodTitle,
    goodSubtitle,
    ratio,
    actualHours,
    costHours,
    conditionRes,
    context,
    replayContext,
    actionLogs
  } = params;
  let nextPlayer = params.player;
  const scalePartial = Boolean(context.rules.proportionalDivisibleActions && actualHours < costHours);
  const odds = getParkEncounterOdds(nextPlayer, context.rules);
  const outcome = rollParkEncounterOutcome(replayContext, badDecisionKey, context.rng, odds);

  if (outcome === 'mugging' && odds.outfitTier) {
    const rawMugging = resolveParkMuggingCard(
      PARK_OUTFIT_MUGGING_CARDS[odds.outfitTier],
      nextPlayer,
      odds.outfitTier
    );
    const muggingCard = scalePartial ? scaleParkCard(rawMugging, ratio, conditionRes) : rawMugging;

    if (nextPlayer.isAi) {
      const res = applyParkCardEffects(nextPlayer, muggingCard, context);
      nextPlayer = res.nextPlayer;
      actionLogs.push({
        key: 'events.park.hazard',
        params: { title: muggingCard.title, desc: muggingCard.description },
        modifications: res.modifications
      });
    } else {
      const miniGameState: MiniGameState = {
        gameType: 'park_hazard',
        title: 'Park Mugging!',
        subtitle: 'Your upscale outfit attracted unwanted attention:',
        options: [muggingCard]
      };
      nextPlayer.pendingMiniGame = miniGameState;
      nextPlayer.pendingAppraisalDilemma = miniGameState;
      actionLogs.push({
        key: 'events.park.hazard',
        params: { title: muggingCard.title, desc: muggingCard.description }
      });
    }
    return nextPlayer;
  }

  if (outcome === 'hazard' || outcome === 'mugging') {
    const { cards: [rawHazardCard], updatedDecks } = drawParkCards(
      nextPlayer,
      'hazard',
      1,
      context,
      hazardPrefix,
      replayContext
    );
    nextPlayer.parkDecks = updatedDecks;
    const hazardCard = scalePartial ? scaleParkCard(rawHazardCard, ratio, conditionRes) : rawHazardCard;

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
        subtitle: hazardSubtitle,
        options: [hazardCard]
      };
      nextPlayer.pendingMiniGame = miniGameState;
      nextPlayer.pendingAppraisalDilemma = miniGameState;
      actionLogs.push({
        key: 'events.park.hazard',
        params: { title: hazardCard.title, desc: hazardCard.description }
      });
    }
    return nextPlayer;
  }

  const { cards: rawCards, updatedDecks } = drawParkCards(
    nextPlayer,
    deckType,
    3,
    context,
    goodPrefix,
    replayContext
  );
  nextPlayer.parkDecks = updatedDecks;

  const cards = scalePartial ? rawCards.map(c => scaleParkCard(c, ratio, conditionRes)) : rawCards;

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
    const miniGameState: MiniGameState = {
      gameType: 'park_encounter',
      title: goodTitle,
      subtitle: goodSubtitle,
      options: cards
    };
    nextPlayer.pendingMiniGame = miniGameState;
    nextPlayer.pendingAppraisalDilemma = miniGameState;
    actionLogs.push({
      key: 'action.park.cardsDrawn',
      params: { count: cards.length }
    });
  }
  return nextPlayer;
}

export function handleRelaxParkAction(
  player: PlayerState,
  _action: { type: 'relax_park' } | { type: 'stroll_park' } | { type: 'rest_bench' },
  context: ReducerContext,
  replayContext?: ReplayContext
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
  const effectiveReplay: ReplayContext = replayContext ?? {
    inDecisions: context.engineDecisions || [],
    outDecisions: []
  };
  const enableEncounters = Boolean(context.rules.enableParkSystem ?? context.rules.usePhysicalMentalConditions);

  // Apply deterministic baseline rest
  if (context.rules.usePhysicalMentalConditions) {
    const statRules = requireAdvancedStatRules(context.campaign.config.statRules);
    const maxPhys = nextPlayer.physicalConditionMax ?? requireConfig(statRules.initialPhysicalMax, 'statRules.initialPhysicalMax');
    const maxMental = nextPlayer.mentalConditionMax ?? requireConfig(statRules.maxMentalCondition, 'statRules.maxMentalCondition');
    const startingPhys = requireConfig(statRules.startingPhysicalCondition, 'statRules.startingPhysicalCondition');
    const startingMental = requireConfig(statRules.startingMentalCondition, 'statRules.startingMentalCondition');
    const conditionRes = context.rules.conditionResolution ?? 0.5;

    let physGain = 0;
    let mentalGain = 0;
    if (relaxes === 0) {
      // Base (+1 Phys, +1 Mental) + first-time park bonus (+2 Phys, +2 Mental)
      physGain = 3;
      mentalGain = 3;
    } else if (relaxes === 1) {
      physGain = 1;
      mentalGain = 1;
    }

    if (context.rules.proportionalDivisibleActions && actualHours < costHours) {
      if (physGain > 0) physGain = Math.max(conditionRes, roundToResolution(physGain * ratio, conditionRes));
      if (mentalGain > 0) mentalGain = Math.max(conditionRes, roundToResolution(mentalGain * ratio, conditionRes));
    }

    if (physGain > 0) {
      nextPlayer.physicalCondition = Math.min(maxPhys, (nextPlayer.physicalCondition ?? startingPhys) + physGain);
    }
    if (mentalGain > 0) {
      nextPlayer.mentalCondition = Math.min(maxMental, (nextPlayer.mentalCondition ?? startingMental) + mentalGain);
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
  // Baseline stats applied above; now draw 1 Event Card (encounter / hazard / outfit mugging)
  const conditionRes = context.rules.conditionResolution ?? 0.5;
  const isPartial = Boolean(context.rules.proportionalDivisibleActions && actualHours < costHours);
  nextPlayer = resolveParkEncounterBranch({
    player: nextPlayer,
    deckType: 'relax',
    badDecisionKey: `park_roll_bad_${nextPlayer.id}_${context.turn}_${relaxes}`,
    hazardPrefix: `park_hazard_${nextPlayer.id}_${context.turn}_${relaxes}`,
    goodPrefix: `park_relax_${nextPlayer.id}_${context.turn}_${relaxes}`,
    hazardSubtitle: 'An unexpected incident interrupted your visit:',
    goodTitle: 'Park Encounter',
    goodSubtitle: isPartial
      ? `Quick Park Visit (${formatHours(actualHours)}h / 3h) - Proportional Effects:`
      : 'Choose how to spend your time in the park:',
    ratio,
    actualHours,
    costHours,
    conditionRes,
    context,
    replayContext: effectiveReplay,
    actionLogs
  });

  return {
    nextPlayer,
    actionLog: actionLogs.length === 1 ? actionLogs[0] : actionLogs
  };
}

export function handleWorkoutParkAction(
  player: PlayerState,
  _action: { type: 'workout_park' } | { type: 'jog_park' },
  context: ReducerContext,
  replayContext?: ReplayContext
): ActionHandlerResult {
  let nextPlayer = structuredClone(player);
  const costHours = 3;
  const allowPartial = Boolean(context.rules.allowPartialHours || context.rules.proportionalDivisibleActions);
  if (nextPlayer.hoursRemaining <= 0 || (!allowPartial && nextPlayer.hoursRemaining < costHours)) {
    return { nextPlayer, actionLog: { key: 'action.error.notEnoughTime' } };
  }

  const advStatRules = context.rules.usePhysicalMentalConditions
    ? requireAdvancedStatRules(context.campaign.config.statRules)
    : undefined;
  const startingPhys = advStatRules
    ? requireConfig(advStatRules.startingPhysicalCondition, 'statRules.startingPhysicalCondition')
    : 50;
  const startingMental = advStatRules
    ? requireConfig(advStatRules.startingMentalCondition, 'statRules.startingMentalCondition')
    : 50;

  if (context.rules.usePhysicalMentalConditions && (nextPlayer.physicalCondition ?? startingPhys) < 15) {
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
  const effectiveReplay: ReplayContext = replayContext ?? {
    inDecisions: context.engineDecisions || [],
    outDecisions: []
  };
  const enableEncounters = Boolean(context.rules.enableParkSystem ?? context.rules.usePhysicalMentalConditions);
  const conditionRes = context.rules.conditionResolution ?? 0.5;

  const phys = nextPlayer.physicalCondition ?? startingPhys;
  const mental = nextPlayer.mentalCondition ?? startingMental;
  let hadFatigueMistake = false;

  if (context.rules.usePhysicalMentalConditions && (phys < 20 || mental < 20)) {
    const mistakeChance = Math.min(
      0.60,
      Math.max(0, (20 - phys) * 0.05) + Math.max(0, (20 - mental) * 0.05)
    );
    hadFatigueMistake = resolveDecision(
      effectiveReplay,
      `park_workout_fatigue_${nextPlayer.id}_${context.turn}_${workouts}`,
      () => context.rng.next() < mistakeChance
    );
  }

  if (hadFatigueMistake) {
    const minPhys = advStatRules
      ? requireConfig(advStatRules.minPhysicalCondition, 'statRules.minPhysicalCondition')
      : 1;
    nextPlayer.physicalCondition = Math.max(minPhys, phys - 2);
    actionLogs.push({
      key: 'action.park.workoutPulledMuscle',
      modifications: [{ stat: 'physical', diff: -2 }]
    });
    return { nextPlayer, actionLog: actionLogs[0] };
  }

  if (context.rules.usePhysicalMentalConditions && advStatRules) {
    const initMaxPhys = requireConfig(advStatRules.initialPhysicalMax, 'statRules.initialPhysicalMax');
    const globalMax = requireConfig(advStatRules.globalMaxPhysicalCondition, 'statRules.globalMaxPhysicalCondition');
    const defaultMaxMental = requireConfig(advStatRules.maxMentalCondition, 'statRules.maxMentalCondition');
    const minPhys = requireConfig(advStatRules.minPhysicalCondition, 'statRules.minPhysicalCondition');
    const minMental = requireConfig(advStatRules.minMentalCondition, 'statRules.minMentalCondition');
    const curMax = nextPlayer.physicalConditionMax ?? initMaxPhys;

    const baseline = getParkWorkoutBaseline(
      player,
      context.rules,
      { initialPhysicalMax: initMaxPhys, globalMaxPhysicalCondition: globalMax },
      actualHours,
      costHours
    );

    if (baseline.maxPhysGain > 0) {
      nextPlayer.physicalConditionMax = curMax + baseline.maxPhysGain;
    }

    const effectivePhysMax = nextPlayer.physicalConditionMax ?? initMaxPhys;
    const effectiveMentalMax = nextPlayer.mentalConditionMax ?? defaultMaxMental;
    nextPlayer.physicalCondition = Math.max(minPhys, Math.min(effectivePhysMax, phys - baseline.physCost));
    nextPlayer.mentalCondition = Math.max(minMental, Math.min(effectiveMentalMax, mental + baseline.mentalDelta));

    const mods: StatModification[] = [
      { stat: 'physical', diff: -baseline.physCost },
      ...(baseline.mentalDelta !== 0 ? [{ stat: 'mental' as const, diff: baseline.mentalDelta }] : [])
    ];
    if (baseline.maxPhysGain > 0) mods.push({ stat: 'maxPhysical', diff: baseline.maxPhysGain });

    actionLogs.push({
      key: workouts === 0 ? 'action.park.workout' : 'action.park.workoutOvertraining',
      modifications: mods
    });
  } else if (workouts > 0) {
    // Classic rules (repeat workout)
    let relCost = workouts;
    if (context.rules.proportionalDivisibleActions && actualHours < costHours) {
      relCost = Math.max(0.5, roundToResolution(relCost * ratio, 0.5));
    }
    nextPlayer.relaxation = Math.max(0, nextPlayer.relaxation - relCost);
    actionLogs.push({
      key: 'action.park.workoutOvertraining',
      modifications: [{ stat: 'relaxation', diff: -relCost }]
    });
  } else {
    // Classic rules (first workout)
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

  // Encounters active: draw 1 Event Card (encounter / hazard / outfit mugging)
  const isPartial = Boolean(context.rules.proportionalDivisibleActions && actualHours < costHours);
  nextPlayer = resolveParkEncounterBranch({
    player: nextPlayer,
    deckType: 'workout',
    badDecisionKey: `park_workout_bad_${nextPlayer.id}_${context.turn}_${workouts}`,
    hazardPrefix: `park_hazard_workout_${nextPlayer.id}_${context.turn}_${workouts}`,
    goodPrefix: `park_workout_deck_${nextPlayer.id}_${context.turn}_${workouts}`,
    hazardSubtitle: 'An unexpected incident interrupted your workout:',
    goodTitle: 'Park Workout Encounter',
    goodSubtitle: isPartial
      ? `Quick Workout (${formatHours(actualHours)}h / 3h) - Proportional Effects:`
      : 'Select an athletic training focus:',
    ratio,
    actualHours,
    costHours,
    conditionRes,
    context,
    replayContext: effectiveReplay,
    actionLogs
  });

  return {
    nextPlayer,
    actionLog: actionLogs.length === 1 ? actionLogs[0] : actionLogs
  };
}

// ── BACKWARDS-COMPATIBLE ALIASES ──

export function handleParkStrollAction(
  player: PlayerState,
  action: { type: 'stroll_park' },
  context: ReducerContext,
  replayContext?: ReplayContext
): ActionHandlerResult {
  return handleRelaxParkAction(player, action, context, replayContext);
}

export function handleParkRestAction(
  player: PlayerState,
  action: { type: 'rest_bench' },
  context: ReducerContext,
  replayContext?: ReplayContext
): ActionHandlerResult {
  return handleRelaxParkAction(player, action, context, replayContext);
}

export function handleParkJogAction(
  player: PlayerState,
  action: { type: 'jog_park' },
  context: ReducerContext,
  replayContext?: ReplayContext
): ActionHandlerResult {
  return handleWorkoutParkAction(player, action, context, replayContext);
}
