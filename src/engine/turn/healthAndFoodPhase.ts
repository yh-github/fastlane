import type { PlayerState, GameState } from '../gameState';
import type { CampaignBundle } from '../dataLoader';
import type { Random } from '../../utils/rng';
import { resolveDecision, type ReplayContext } from '../replayTypes';
import { applyMoraleEffect } from '../statEffects';
import { processStarvation, processDoctorVisit } from '../eventEngine';
import { requireConfig } from '../rules';

export function processHealthAndFoodPhase(
  p: PlayerState,
  state: GameState,
  campaign: CampaignBundle,
  rng: Random,
  replay?: ReplayContext,
  preRobberyStorage: number = 0
): PlayerState {
  let spoiledFoodSickMultiplier = 1;
  const maxStorage = state.rules.delayRobberyFoodSpoilage ? preRobberyStorage : (p.activeEffects['set_food_storage'] || 0);
  let doctorNeeded = false;
  const doctorReasons: string[] = [];

  if (state.rules.usePhysicalMentalConditions) {
    const hasEatenFastFood = p.inventory.fastFoodItems.length > 0;
    p.inventory.fastFoodItems = [];

    let ateSpoiledThisTurn = false;
    let starvedThisTurn = false;

    if (maxStorage === 0 && p.inventory.freshFoodUnits > 0) {
      const lostFood = p.inventory.freshFoodUnits;
      p.inventory.freshFoodUnits = 0;
      p.mess = Math.min(99, (p.mess || 0) + lostFood);
      p = applyMoraleEffect(p, -2, 'food_spoilage', state.rules, campaign.config.statRules);

      if (hasEatenFastFood) {
        p.turnFlags.hasEaten = true;
        const key = state.rules.helpfulUI ? 'events.foodSpoiled.noFridge_qol' : 'events.foodSpoiled.noFridge';
        p.turnEvents.push({ key, params: { amount: lostFood } });
      } else {
        ateSpoiledThisTurn = true;
        p.turnFlags.hasEaten = true;
        const key = state.rules.helpfulUI ? 'events.foodSpoiled.ateSpoiled_qol' : 'events.foodSpoiled.ateSpoiled';
        p.turnEvents.push({ key, params: { amount: lostFood } });
      }
    } else if (maxStorage > 0 && p.inventory.freshFoodUnits > maxStorage) {
      const lostFood = p.inventory.freshFoodUnits - maxStorage;
      p.inventory.freshFoodUnits = maxStorage;
      p = applyMoraleEffect(p, -1, 'food_spoilage', state.rules, campaign.config.statRules);
      p.mess = Math.min(99, (p.mess || 0) + lostFood);
      const key = state.rules.helpfulUI ? 'events.foodSpoiled.tooMuch_qol' : 'events.foodSpoiled.tooMuch';
      p.turnEvents.push({ key, params: { amount: lostFood, capacity: maxStorage } });
    }

    if (!p.turnFlags.hasEaten) {
      if (hasEatenFastFood) {
        p.turnFlags.hasEaten = true;
      } else if (p.inventory.freshFoodUnits > 0) {
        p.inventory.freshFoodUnits--;
        p.turnFlags.hasEaten = true;
      } else {
        starvedThisTurn = true;
      }
    }

    if (ateSpoiledThisTurn) {
      p.minPhysicalCondition = Math.max(campaign.config.statRules?.globalPhysicalMin ?? 1, (p.minPhysicalCondition ?? 3) - 1);
      p.physicalConditionMax = Math.max(campaign.config.statRules?.minMaxPhysical ?? 10, (p.physicalConditionMax ?? 50) - 1);
      const currentPhys = p.physicalCondition ?? 50;
      p.physicalCondition = Math.max(p.minPhysicalCondition, Math.min(currentPhys - 5, Math.floor(10 * currentPhys / (p.physicalConditionMax || 50))));
      const mentalDrop = 5;
      p.mentalCondition = Math.max(campaign.config.statRules?.minMentalCondition ?? 5, (p.mentalCondition ?? 50) - mentalDrop);
      if (mentalDrop >= 3) p.resilienceBonus = (p.resilienceBonus || 0) + 1;
      spoiledFoodSickMultiplier = 2;
    }

    if (starvedThisTurn) {
      p.minPhysicalCondition = Math.max(campaign.config.statRules?.globalPhysicalMin ?? 1, (p.minPhysicalCondition ?? 3) - 1);
      p.physicalConditionMax = Math.max(campaign.config.statRules?.minMaxPhysical ?? 10, (p.physicalConditionMax ?? 50) - 1);
      p.physicalCondition = p.minPhysicalCondition;
      const mentalDrop = 10;
      p.mentalCondition = Math.max(campaign.config.statRules?.minMentalCondition ?? 5, (p.mentalCondition ?? 50) - mentalDrop);
      if (mentalDrop >= 3) p.resilienceBonus = (p.resilienceBonus || 0) + 1;
      p.turnEvents.push({ key: 'events.starvation' });
    }
  } else {
    const hasEatenFastFood = p.inventory.fastFoodItems.length > 0;
    p.inventory.fastFoodItems = [];

    if (maxStorage === 0 && p.inventory.freshFoodUnits > 0) {
      const lostFood = p.inventory.freshFoodUnits;
      p.inventory.freshFoodUnits = 0;
      p.mess = Math.min(20, (p.mess || 0) + lostFood);
      p = applyMoraleEffect(p, -2, 'food_spoilage', state.rules, campaign.config.statRules);

      if (hasEatenFastFood) {
        p.turnFlags.hasEaten = true;
        const key = state.rules.helpfulUI ? 'events.foodSpoiled.noFridge_qol' : 'events.foodSpoiled.noFridge';
        p.turnEvents.push({ key, params: { amount: lostFood } });
      } else {
        p.turnFlags.hasEaten = true;
        const key = state.rules.helpfulUI ? 'events.foodSpoiled.ateSpoiled_qol' : 'events.foodSpoiled.ateSpoiled';
        p.turnEvents.push({ key, params: { amount: lostFood } });
        if (p.money > 0) {
          const sickTrigger = resolveDecision(replay, `spoiled_food_sick_1_${p.id}`, () => rng.next() < 0.5);
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
      p.mess = Math.min(20, (p.mess || 0) + lostFood);
      const key = state.rules.helpfulUI ? 'events.foodSpoiled.tooMuch_qol' : 'events.foodSpoiled.tooMuch';
      p.turnEvents.push({ key, params: { amount: lostFood, capacity: maxStorage } });
    }

    if (!p.turnFlags.hasEaten) {
      if (hasEatenFastFood) {
        p.turnFlags.hasEaten = true;
      } else if (p.inventory.freshFoodUnits > 0) {
        p.inventory.freshFoodUnits--;
        p.turnFlags.hasEaten = true;
      } else {
        const starvationPenalty = requireConfig(campaign.config.timeRules?.starvationPenalty, 'timeRules.starvationPenalty');
        const { updated, doctorTriggered } = processStarvation(p, starvationPenalty, rng, state.rules, replay);
        p = updated;
        p.turnEvents.push({ key: 'events.starvation' });
        if (doctorTriggered) {
          doctorNeeded = true;
          doctorReasons.push('Starvation');
        }
      }
    }
  }

  // Doctor Visit Check
  const queuedDoctor = state.debugQueue?.find(e => e.type === 'doctor_visit' && (e.playerId === p.id || !e.playerId));
  if (queuedDoctor) {
    const canVisit = !state.rules.bypassDoctorIfBroke || p.money > 0;
    let isEligible = false;
    if (canVisit) {
      if (state.rules.usePhysicalMentalConditions) {
        const statRules = campaign.config.statRules;
        const physThreshold = statRules?.physicalDoctorThreshold ?? 10;
        const mentalThreshold = statRules?.lowSpiritsThreshold ?? 10;
        if (
          (p.physicalCondition !== undefined && p.physicalCondition < physThreshold) ||
          (p.mentalCondition !== undefined && p.mentalCondition < mentalThreshold)
        ) {
          isEligible = true;
        }
      } else if (state.rules.enableRelaxationDoctor) {
        const threshold = state.rules.relaxationDoctorThreshold ?? 10;
        if (p.relaxation <= threshold) {
          isEligible = true;
        }
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

  if (state.rules.usePhysicalMentalConditions) {
    const statRules = campaign.config.statRules;
    const physThreshold = statRules?.physicalDoctorThreshold ?? statRules?.doctorVisitPhysicalThreshold ?? 10;
    const physChance = (statRules?.physicalDoctorChancePerPoint ?? statRules?.doctorVisitPhysicalChancePerPoint ?? 0.05) * spoiledFoodSickMultiplier;

    // Physical Doctor
    if (p.physicalCondition !== undefined && p.physicalCondition < physThreshold) {
      const chance = Math.min(1.0, (physThreshold - p.physicalCondition) * physChance);
      const physSickTrigger = resolveDecision(replay, `phys_sick_${p.id}`, () => rng.next() < chance);
      if (physSickTrigger) {
        doctorNeeded = true;
        doctorReasons.push('Physical condition critically low');
      }
    }
  } else if (state.rules.enableRelaxationDoctor) {
    const threshold = state.rules.relaxationDoctorThreshold ?? 10;
    const chance = campaign.config.statRules?.relaxationDoctorChance ?? 0.20;
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
    const doctorPenalty = requireConfig(campaign.config.timeRules?.doctorPenalty, 'timeRules.doctorPenalty');
    p = processDoctorVisit(p, doctorPenalty, rng, state.rules.bypassDoctorIfBroke, state.rules, replay);
    const totalPaid = (moneyBefore - p.money) + ((p.loanDebt || 0) - loanBefore);
    if (totalPaid > 0 || !state.rules.bypassDoctorIfBroke) {
      const evtParams: any = { cost: totalPaid };
      let key = 'events.doctorVisit';
      if (state.rules.helpfulUI && doctorReasons.length > 0) {
        evtParams.reasons = doctorReasons.join(', ');
        key = 'events.doctorVisit_reasons';
      }
      p.turnEvents.push({ key, params: evtParams });
    }
  }

  return p;
}
