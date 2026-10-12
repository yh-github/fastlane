import { describe, it, expect } from 'vitest';
import { createTurnEvent, getEventModifications } from './eventModifiers';
import type { GameEvent, StatModification } from './gameState';

describe('eventModifiers', () => {
  describe('createTurnEvent', () => {
    it('creates an event with key and params without modifications when none provided', () => {
      const event = createTurnEvent('events.test', { foo: 'bar' });
      expect(event).toEqual({
        key: 'events.test',
        params: { foo: 'bar' },
      });
      expect(event.modifications).toBeUndefined();
    });

    it('creates an event with explicit modifications when provided', () => {
      const mods: StatModification[] = [
        { stat: 'money', diff: 100 },
        { stat: 'mental', diff: 2 },
      ];
      const event = createTurnEvent('events.test', { foo: 'bar' }, mods);
      expect(event.modifications).toEqual(mods);
    });

    it('does not attach empty modifications array', () => {
      const event = createTurnEvent('events.test', undefined, []);
      expect(event.modifications).toBeUndefined();
    });
  });

  describe('getEventModifications', () => {
    it('returns explicit modifications if already present on event', () => {
      const explicitMods: StatModification[] = [{ stat: 'skillTech', diff: 0.25 }];
      const event: GameEvent = {
        key: 'events.custom',
        modifications: explicitMods,
      };
      expect(getEventModifications(event)).toBe(explicitMods);
    });

    it('infers food spoiled modifiers for classic rules', () => {
      const event: GameEvent = {
        key: 'events.foodSpoiled.noFridge',
        params: { amount: 3 },
      };
      const mods = getEventModifications(event, { usePhysicalMentalConditions: false });
      expect(mods).toEqual([
        { stat: 'mess', diff: 3 },
        { stat: 'happiness', diff: -2 },
      ]);
    });

    it('infers food spoiled modifiers for advanced rules (mental condition)', () => {
      const event: GameEvent = {
        key: 'events.foodSpoiled.ateSpoiled',
        params: { amount: 2 },
      };
      const mods = getEventModifications(event, { usePhysicalMentalConditions: true });
      expect(mods).toEqual([
        { stat: 'mess', diff: 2 },
        { stat: 'mental', diff: -2 },
      ]);
    });

    it('infers food spoiled tooMuch modifiers', () => {
      const event: GameEvent = {
        key: 'events.foodSpoiled.tooMuch',
        params: { amount: 1 },
      };
      const mods = getEventModifications(event, { usePhysicalMentalConditions: true });
      expect(mods).toEqual([
        { stat: 'mess', diff: 1 },
        { stat: 'mental', diff: -1 },
      ]);
    });

    it('infers computer profit modifiers for advanced rules including tech skill', () => {
      const event: GameEvent = {
        key: 'events.computerProfit',
        params: { profit: 75 },
      };
      const mods = getEventModifications(event, { usePhysicalMentalConditions: true });
      expect(mods).toEqual([
        { stat: 'money', diff: 75 },
        { stat: 'mental', diff: 3 },
        { stat: 'skillTech', diff: 0.25 },
      ]);
    });

    it('infers computer profit modifiers for classic rules (happiness and no tech skill)', () => {
      const event: GameEvent = {
        key: 'events.computerProfit',
        params: { profit: 50 },
      };
      const mods = getEventModifications(event, { usePhysicalMentalConditions: false });
      expect(mods).toEqual([
        { stat: 'money', diff: 50 },
        { stat: 'happiness', diff: 3 },
      ]);
    });

    it('infers lottery win modifiers for small and jackpot amounts', () => {
      const smallWin: GameEvent = {
        key: 'events.lottery',
        params: { amount: 250 },
      };
      expect(getEventModifications(smallWin)).toEqual([
        { stat: 'money', diff: 250 },
        { stat: 'happiness', diff: 5 },
      ]);

      const bigWin: GameEvent = {
        key: 'events.lottery',
        params: { amount: 5000 },
      };
      expect(getEventModifications(bigWin, { usePhysicalMentalConditions: true })).toEqual([
        { stat: 'money', diff: 5000 },
        { stat: 'mental', diff: 10 },
      ]);
    });

    it('infers apartment robbery modifiers', () => {
      const event: GameEvent = { key: 'events.robbery.apartment' };
      expect(getEventModifications(event, { usePhysicalMentalConditions: true })).toEqual([
        { stat: 'mental', diff: -4 },
      ]);
      expect(getEventModifications(event, { usePhysicalMentalConditions: false })).toEqual([
        { stat: 'happiness', diff: -4 },
      ]);
    });

    it('infers appliance breakdown modifiers', () => {
      const brokeWithRepair: GameEvent = {
        key: 'events.applianceBroke',
        params: { repairCost: 80 },
      };
      expect(getEventModifications(brokeWithRepair, { usePhysicalMentalConditions: false })).toEqual([
        { stat: 'money', diff: -80 },
        { stat: 'happiness', diff: -1 },
      ]);

      const brokeNeedRepair: GameEvent = {
        key: 'events.applianceBrokeNeedRepair',
      };
      expect(getEventModifications(brokeNeedRepair, { usePhysicalMentalConditions: true })).toEqual([
        { stat: 'mental', diff: -1 },
      ]);
    });

    it('infers starvation modifiers', () => {
      const event: GameEvent = { key: 'events.starvation' };
      expect(getEventModifications(event, { usePhysicalMentalConditions: true })).toEqual([
        { stat: 'mental', diff: -10 },
      ]);
      expect(getEventModifications(event, { usePhysicalMentalConditions: false })).toEqual([
        { stat: 'happiness', diff: -2 },
      ]);
    });

    it('infers doctor visit modifiers', () => {
      const event: GameEvent = {
        key: 'events.doctorVisit',
        params: { cost: 150 },
      };
      expect(getEventModifications(event, { usePhysicalMentalConditions: true })).toEqual([
        { stat: 'money', diff: -150 },
        { stat: 'physical', diff: 4 },
      ]);
      expect(getEventModifications(event, { usePhysicalMentalConditions: false })).toEqual([
        { stat: 'money', diff: -150 },
        { stat: 'happiness', diff: -4 },
      ]);
    });

    it('infers burnout and low spirits bounce back', () => {
      expect(getEventModifications({ key: 'events.burnout', params: { amount: 5 } })).toEqual([
        { stat: 'mental', diff: 5 },
      ]);
      expect(getEventModifications({ key: 'events.lowSpiritsBounceBack', params: { amount: 3 } })).toEqual([
        { stat: 'mental', diff: 3 },
      ]);
    });

    it('infers curio modifiers (decor, mental, cash)', () => {
      expect(getEventModifications({ key: 'events.curioDecor', params: { lifestyle: 2 } })).toEqual([
        { stat: 'lifestyle', diff: 2 },
      ]);
      expect(getEventModifications({ key: 'events.curioMental', params: { mental: 4 } })).toEqual([
        { stat: 'mental', diff: 4 },
      ]);
      expect(getEventModifications({ key: 'events.curioCash', params: { amount: 120 } })).toEqual([
        { stat: 'money', diff: 120 },
      ]);
    });

    it('infers donation modifiers', () => {
      expect(getEventModifications({ key: 'events.donation', params: { amount: 50 } })).toEqual([
        { stat: 'money', diff: 50 },
      ]);
    });

    it('infers rent charged modifiers', () => {
      expect(getEventModifications({ key: 'events.rent.charged', params: { amount: 400 } })).toEqual([
        { stat: 'rentDebt', diff: 400 },
      ]);
    });

    it('infers market crash bank savings lost modifiers', () => {
      expect(getEventModifications({ key: 'events.marketCrash.bankSavingsLost', params: { amount: 200 } })).toEqual([
        { stat: 'money', diff: -200 },
      ]);
    });

    it('returns empty array for unknown events', () => {
      expect(getEventModifications({ key: 'events.unknown' })).toEqual([]);
    });
  });
});
