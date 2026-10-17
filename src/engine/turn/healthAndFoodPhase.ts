import type { PlayerState, GameState, StatModification } from '../gameState';
import type { CampaignBundle } from '../dataLoader';
import type { Random } from '../../utils/rng';
import { resolveDecision, type ReplayContext } from '../replayTypes';
import { applyMoraleEffect } from '../statEffects';
import { processStarvation, processDoctorVisit } from '../eventEngine';
import { isBaseVersion, requireAdvancedStatRules, requireConfig } from '../rules';

/**
 * Frozen Base Pipeline: Health, Food Spoilage, Starvation & Doctor Phase (Floppy, CD-ROM, QoL).
 * Never mutates p.mess or emits 'mess' stat modifications.
 */
export function processBaseHealthAndFood(
  player: PlayerState,
  state: GameState,
  campaign: CampaignBundle,
  rng: Random,
  replay?: ReplayContext,
  preRobberyStorage: number = 0
): PlayerState {
  let p = player;
  const maxStorage = state.rules.delayRobberyFoodSpoilage ? preRobberyStorage : (p.activeEffects['set_food_storage'] || 0);
  let doctorNeeded = false;
  const doctorReasons: string[] = [];

  const hasEatenFastFood = p.inventory.fastFoodItems.length > 0;
  p.inventory.fastFoodItems = [];
  const hasCannedFood = (p.inventory.cannedFoodUnits || 0) > 0;

  if (maxStorage === 0 && p.inventory.freshFoodUnits > 0) {
    const lostFood = p.inventory.freshFoodUnits;
    p.inventory.freshFoodUnits = 0;
    p = applyMoraleEffect(p, -2, 'food_spoilage', state.rules, campaign.config.statRules);

    if (hasEatenFastFood || hasCannedFood) {
      if (!hasEatenFastFood && hasCannedFood) {
        p.inventory.cannedFoodUnits!--;
      }
      p.turnFlags.hasEaten = true;
      const key = state.rules.helpfulUI ? 'events.foodSpoiled.noFridge_qol' : 'events.foodSpoiled.noFridge';
      p.turnEvents.push({
        key,
        params: { amount: lostFood },
        modifications: [
          { stat: 'happiness', diff: -2 }
        ]
      });
    } else {
      p.turnFlags.hasEaten = true;
      const key = state.rules.helpfulUI ? 'events.foodSpoiled.ateSpoiled_qol' : 'events.foodSpoiled.ateSpoiled';
      p.turnEvents.push({
        key,
        params: { amount: lostFood },
        modifications: [
          { stat: 'happiness', diff: -2 }
        ]
      });
      if (p.money > 0) {
        const sickDecisionKey = state.rules.allowEatingSpoiledFood ? `spoiled_food_sick_2_${p.id}` : `spoiled_food_sick_1_${p.id}`;
        const sickTrigger = resolveDecision(replay, sickDecisionKey, () => rng.next() < 0.5);
        if (sickTrigger) {
          doctorNeeded = true;
          doctorReasons.push('Spoiled food');
          p.turnEvents.push({ key: 'events.foodSpoiled.sick' });
        }
      }
    }
  } else if (maxStorage > 0 && p.inventory.freshFoodUnits > maxStorage) {
    const lostFood = p.inventory.freshFoodUnits - maxStorage;
    p.inventory.freshFoodUnits = maxStorage;
    p = applyMoraleEffect(p, -1, 'food_spoilage', state.rules, campaign.config.statRules);
    const key = state.rules.helpfulUI ? 'events.foodSpoiled.tooMuch_qol' : 'events.foodSpoiled.tooMuch';
    p.turnEvents.push({
      key,
      params: { amount: lostFood, capacity: maxStorage },
      modifications: [
        { stat: 'happiness', diff: -1 }
      ]
    });
  }

  if (!p.turnFlags.hasEaten) {
    if (hasEatenFastFood) {
      p.turnFlags.hasEaten = true;
    } else if (p.inventory.freshFoodUnits > 0) {
      p.inventory.freshFoodUnits--;
      p.turnFlags.hasEaten = true;
    } else if ((p.inventory.cannedFoodUnits || 0) > 0) {
      p.inventory.cannedFoodUnits!--;
      p.turnFlags.hasEaten = true;
    } else {
      const starvationPenalty = requireConfig(campaign.config.timeRules.starvationPenalty, 'timeRules.starvationPenalty');
      const { updated, doctorTriggered } = processStarvation(p, starvationPenalty, rng, state.rules, replay, campaign.config.statRules);
      p = updated;
      p.turnEvents.push({
        key: 'events.starvation',
        modifications: [{ stat: 'happiness', diff: -2 }]
      });
      if (doctorTriggered) {
        doctorNeeded = true;
        doctorReasons.push('Starvation');
      }
    }
  }

  // Doctor Visit Check (Debug Queue)
  const queuedDoctor = state.debugQueue?.find(e => e.type === 'doctor_visit' && (e.playerId === p.id || !e.playerId));
  if (queuedDoctor) {
    const canVisit = !state.rules.bypassDoctorIfBroke || p.money > 0;
    const isEligible = canVisit && state.rules.enableRelaxationDoctor && p.relaxation <= state.rules.relaxationDoctorThreshold;
    if (isEligible) {
      doctorNeeded = true;
      doctorReasons.push('Doctor Visit (Forced)');
    } else {
      p.turnEvents.push({
        key: 'debug.event_cancelled',
        params: {
          event: 'Doctor Visit',
          reason: canVisit ? 'Health / relaxation above thresholds' : 'Player carries $0 and bypass rule is active',
        },
      });
    }
  }

  if (state.rules.enableRelaxationDoctor) {
    const threshold = state.rules.relaxationDoctorThreshold;
    const chance = campaign.config.statRules.relaxationDoctorChance;
    if (p.relaxation <= threshold) {
      const lowRelaxSickTrigger = resolveDecision(replay, `low_relax_sick_${p.id}`, () => rng.next() < chance);
      if (lowRelaxSickTrigger) {
        doctorNeeded = true;
        doctorReasons.push('Relaxation critically low');
      }
    }
  }

  if (doctorNeeded) {
    const moneyBefore = p.money;
    const loanBefore = p.loanDebt || 0;
    const hapBefore = p.happiness;
    const doctorPenalty = requireConfig(campaign.config.timeRules.doctorPenalty, 'timeRules.doctorPenalty');
    p = processDoctorVisit(p, doctorPenalty, rng, state.rules.bypassDoctorIfBroke, state.rules, replay, campaign.config.statRules);
    const totalPaid = (moneyBefore - p.money) + ((p.loanDebt || 0) - loanBefore);
    if (totalPaid > 0 || !state.rules.bypassDoctorIfBroke) {
      const moneyDiff = moneyBefore - p.money;
      const loanDiff = (p.loanDebt || 0) - loanBefore;
      const docMods: StatModification[] = [];
      if (moneyDiff > 0) {
        docMods.push({ stat: 'money', diff: -moneyDiff });
      }
      if (loanDiff > 0) {
        docMods.push({ stat: 'loanDebt', diff: loanDiff });
      }
      const hapDiff = p.happiness - hapBefore;
      if (hapDiff !== 0) {
        docMods.push({ stat: 'happiness', diff: hapDiff });
      }

      const evtParams: Record<string, string | number> = { cost: totalPaid };
      if (loanDiff > 0) {
        evtParams.loanDebt = loanDiff;
      }
      let key = 'events.doctorVisit';
      if (state.rules.helpfulUI && doctorReasons.length > 0) {
        evtParams.reasons = doctorReasons.join(', ');
        key = 'events.doctorVisit_reasons';
      }
      p.turnEvents.push({ key, params: evtParams, modifications: docMods });
    }
  }

  return p;
}

/**
 * Advanced Pipeline: Health, Food Spoilage, Starvation & Doctor Phase.
 */
export function processAdvancedHealthAndFood(
  player: PlayerState,
  state: GameState,
  campaign: CampaignBundle,
  rng: Random,
  replay?: ReplayContext,
  preRobberyStorage: number = 0
): PlayerState {
  let p = player;
  let spoiledFoodSickMultiplier = 1;
  const maxStorage = state.rules.delayRobberyFoodSpoilage ? preRobberyStorage : (p.activeEffects['set_food_storage'] || 0);
  let doctorNeeded = false;
  const doctorReasons: string[] = [];
  const sr = requireAdvancedStatRules(campaign.config.statRules);

  const hasEatenFastFood = p.inventory.fastFoodItems.length > 0;
  p.inventory.fastFoodItems = [];
  const hasCannedFood = (p.inventory.cannedFoodUnits || 0) > 0;

  let ateSpoiledThisTurn = false;
  let starvedThisTurn = false;

  if (maxStorage === 0 && p.inventory.freshFoodUnits > 0) {
    const lostFood = p.inventory.freshFoodUnits;
    p.inventory.freshFoodUnits = 0;
    if (state.rules.trackMess) {
      p.mess = Math.min(sr.globalMessMax, (p.mess || 0) + lostFood);
    }
    p = applyMoraleEffect(p, -2, 'food_spoilage', state.rules, sr);

    const mods: StatModification[] = [];
    if (state.rules.trackMess) {
      mods.push({ stat: 'mess', diff: lostFood });
    }
    mods.push({ stat: state.rules.usePhysicalMentalConditions ? 'mental' : 'happiness', diff: -2 });

    if (hasEatenFastFood || hasCannedFood) {
      if (!hasEatenFastFood && hasCannedFood) {
        p.inventory.cannedFoodUnits!--;
      }
      p.turnFlags.hasEaten = true;
      const key = state.rules.helpfulUI ? 'events.foodSpoiled.noFridge_qol' : 'events.foodSpoiled.noFridge';
      p.turnEvents.push({
        key,
        params: { amount: lostFood },
        modifications: mods
      });
    } else {
      ateSpoiledThisTurn = true;
      p.turnFlags.hasEaten = true;
      const key = state.rules.helpfulUI ? 'events.foodSpoiled.ateSpoiled_qol' : 'events.foodSpoiled.ateSpoiled';
      p.turnEvents.push({
        key,
        params: { amount: lostFood },
        modifications: mods
      });
    }
  } else if (maxStorage > 0 && p.inventory.freshFoodUnits > maxStorage) {
    const lostFood = p.inventory.freshFoodUnits - maxStorage;
    p.inventory.freshFoodUnits = maxStorage;
    p = applyMoraleEffect(p, -1, 'food_spoilage', state.rules, sr);
    if (state.rules.trackMess) {
      p.mess = Math.min(sr.globalMessMax, (p.mess || 0) + lostFood);
    }
    const key = state.rules.helpfulUI ? 'events.foodSpoiled.tooMuch_qol' : 'events.foodSpoiled.tooMuch';
    const mods: StatModification[] = [];
    if (state.rules.trackMess) {
      mods.push({ stat: 'mess', diff: lostFood });
    }
    mods.push({ stat: state.rules.usePhysicalMentalConditions ? 'mental' : 'happiness', diff: -1 });
    p.turnEvents.push({
      key,
      params: { amount: lostFood, capacity: maxStorage },
      modifications: mods
    });
  }

  if (!p.turnFlags.hasEaten) {
    if (hasEatenFastFood) {
      p.turnFlags.hasEaten = true;
    } else if (p.inventory.freshFoodUnits > 0) {
      p.inventory.freshFoodUnits--;
      p.turnFlags.hasEaten = true;
    } else if ((p.inventory.cannedFoodUnits || 0) > 0) {
      p.inventory.cannedFoodUnits!--;
      p.turnFlags.hasEaten = true;
    } else {
      starvedThisTurn = true;
    }
  }

  if (ateSpoiledThisTurn) {
    p.minPhysicalCondition = Math.max(sr.globalPhysicalMin, (p.minPhysicalCondition ?? sr.initialMinPhysical) - 1);
    p.physicalConditionMax = Math.max(sr.minMaxPhysical, (p.physicalConditionMax ?? sr.initialPhysicalMax) - 1);
    const currentPhys = p.physicalCondition ?? sr.startingPhysicalCondition;
    p.physicalCondition = Math.max(p.minPhysicalCondition, Math.min(currentPhys - 5, Math.floor(10 * currentPhys / p.physicalConditionMax)));
    const mentalDrop = 5;
    p.mentalCondition = Math.max(sr.minMentalCondition, (p.mentalCondition ?? sr.startingMentalCondition) - mentalDrop);
    if (mentalDrop >= sr.resilienceDropThreshold) p.resilienceBonus = (p.resilienceBonus || 0) + 1;
    spoiledFoodSickMultiplier = 2;

    const foodEvent = p.turnEvents.find(e => e.key.startsWith('events.foodSpoiled.ateSpoiled'));
    if (foodEvent && foodEvent.modifications) {
      const existingMental = foodEvent.modifications.find(m => m.stat === 'mental');
      if (existingMental) {
        existingMental.diff -= mentalDrop;
      } else {
        foodEvent.modifications.push({ stat: 'mental', diff: -mentalDrop });
      }
      const physDelta = p.physicalCondition - currentPhys;
      if (physDelta !== 0) {
        foodEvent.modifications.push({ stat: 'physical', diff: physDelta });
      }
    }
  }

  if (starvedThisTurn) {
    const starvationDrop = sr.starvationMaxPhysicalPenalty;
    p.minPhysicalCondition = Math.max(sr.globalPhysicalMin, (p.minPhysicalCondition ?? sr.initialMinPhysical) - 1);
    p.physicalConditionMax = Math.max(sr.minMaxPhysical, (p.physicalConditionMax ?? sr.initialPhysicalMax) - starvationDrop);
    const prevPhys = p.physicalCondition ?? sr.startingPhysicalCondition;
    p.physicalCondition = p.minPhysicalCondition;
    const mentalDrop = 10;
    p.mentalCondition = Math.max(sr.minMentalCondition, (p.mentalCondition ?? sr.startingMentalCondition) - mentalDrop);
    if (mentalDrop >= sr.resilienceDropThreshold) p.resilienceBonus = (p.resilienceBonus || 0) + 1;
    p.turnEvents.push({
      key: 'events.starvation',
      modifications: [
        { stat: 'mental', diff: -mentalDrop },
        { stat: 'physical', diff: p.minPhysicalCondition - prevPhys }
      ]
    });
  }

  // Doctor Visit Check
  const queuedDoctor = state.debugQueue?.find(e => e.type === 'doctor_visit' && (e.playerId === p.id || !e.playerId));
  if (queuedDoctor) {
    const canVisit = !state.rules.bypassDoctorIfBroke || p.money > 0;
    let isEligible = false;
    if (canVisit) {
      const physThreshold = sr.physicalDoctorThreshold;
      const mentalThreshold = sr.lowSpiritsThreshold;
      if (
        (p.physicalCondition !== undefined && p.physicalCondition < physThreshold) ||
        (p.mentalCondition !== undefined && p.mentalCondition < mentalThreshold)
      ) {
        isEligible = true;
      }
    }
    if (isEligible) {
      doctorNeeded = true;
      doctorReasons.push('Doctor Visit (Forced)');
    } else {
      p.turnEvents.push({
        key: 'debug.event_cancelled',
        params: {
          event: 'Doctor Visit',
          reason: canVisit ? 'Health / relaxation above thresholds' : 'Player carries $0 and bypass rule is active',
        },
      });
    }
  }

  const physThreshold = sr.physicalDoctorThreshold;
  const physChance = sr.physicalDoctorChancePerPoint * spoiledFoodSickMultiplier;

  if (p.physicalCondition !== undefined && p.physicalCondition < physThreshold) {
    const chance = Math.min(1.0, (physThreshold - p.physicalCondition) * physChance);
    const physSickTrigger = resolveDecision(replay, `phys_sick_${p.id}`, () => rng.next() < chance);
    if (physSickTrigger) {
      doctorNeeded = true;
      doctorReasons.push('Physical condition critically low');
    }
  }

  if (doctorNeeded) {
    const moneyBefore = p.money;
    const loanBefore = p.loanDebt || 0;
    const physBefore = p.physicalCondition;
    const doctorPenalty = requireConfig(campaign.config.timeRules.doctorPenalty, 'timeRules.doctorPenalty');
    p = processDoctorVisit(p, doctorPenalty, rng, state.rules.bypassDoctorIfBroke, state.rules, replay, sr);
    const totalPaid = (moneyBefore - p.money) + ((p.loanDebt || 0) - loanBefore);
    if (totalPaid > 0 || !state.rules.bypassDoctorIfBroke) {
      const moneyDiff = moneyBefore - p.money;
      const loanDiff = (p.loanDebt || 0) - loanBefore;
      const docMods: StatModification[] = [];
      if (moneyDiff > 0) {
        docMods.push({ stat: 'money', diff: -moneyDiff });
      }
      if (loanDiff > 0) {
        docMods.push({ stat: 'loanDebt', diff: loanDiff });
      }
      const physDiff = (p.physicalCondition || 0) - (physBefore || 0);
      if (physDiff !== 0) {
        docMods.push({ stat: 'physical', diff: physDiff });
      }

      const evtParams: Record<string, string | number> = { cost: totalPaid };
      if (loanDiff > 0) {
        evtParams.loanDebt = loanDiff;
      }
      let key = 'events.doctorVisit';
      if (state.rules.helpfulUI && doctorReasons.length > 0) {
        evtParams.reasons = doctorReasons.join(', ');
        key = 'events.doctorVisit_reasons';
      }
      p.turnEvents.push({ key, params: evtParams, modifications: docMods });
    }
  }

  return p;
}

export function processHealthAndFoodPhase(
  p: PlayerState,
  state: GameState,
  campaign: CampaignBundle,
  rng: Random,
  replay?: ReplayContext,
  preRobberyStorage: number = 0
): PlayerState {
  if (isBaseVersion(state.rules) && !state.rules.usePhysicalMentalConditions) {
    return processBaseHealthAndFood(p, state, campaign, rng, replay, preRobberyStorage);
  }
  return processAdvancedHealthAndFood(p, state, campaign, rng, replay, preRobberyStorage);
}
