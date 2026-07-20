import { Random } from '../utils/rng';
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processApartmentRobbery, processDoctorVisit, processStreetRobbery, processStarvation, processDonations } from './eventEngine';
import type { PlayerState } from './gameState';

describe('Event Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('processApartmentRobbery', () => {
    it('robbery steals stealable appliances', () => {
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.001); // Trigger robbery AND 25% steal chance
      const player = { 
        currentHousingId: 'low_cost', 
        money: 1000, 
        happiness: 50,
        relaxation: 50,
        turnEvents: [],
        inventory: { appliances: [
          { id: 'tv', purchasePrice: 500, purchaseSource: 'socket_city' }, // Stealable
          { id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' } // Immune
        ] } 
      } as unknown as PlayerState;
      
      const { updated, robbed } = processApartmentRobbery(player, new Random(1), true);
      expect(robbed).toBe(true);
      expect(updated.money).toBe(1000); // Money untouched
      expect(updated.happiness).toBe(46); // 50 - 4
      expect(updated.inventory.appliances.length).toBe(1); // TV stolen, fridge kept
      expect(updated.inventory.appliances[0].id).toBe('refrigerator');
    });

    it('no robbery if chance fails', () => {
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.99); // No robbery
      const player = { currentHousingId: 'low_cost', money: 1000 } as PlayerState;
      const { updated, robbed } = processApartmentRobbery(player, new Random(1));
      expect(robbed).toBe(false);
      expect(updated.money).toBe(1000);
    });
  });

  describe('processDoctorVisit', () => {
    it('charges money and handles debt correctly', () => {
      const player = { money: 1000, bankSavings: 1000, happiness: 50, hoursRemaining: 60 } as PlayerState;
      const updated = processDoctorVisit(player, 10, new Random(1));
      expect(updated.money).toBeLessThan(1000); // Charged some money
      expect(updated.happiness).toBe(46);
      expect(updated.hoursRemaining).toBe(50);
    });

    it('bypasses completely if money is 0 and bypassDoctorIfBroke is true', () => {
      const player = { money: 0, happiness: 50, hoursRemaining: 60 } as PlayerState;
      const updated = processDoctorVisit(player, 10, new Random(1), true);
      expect(updated.money).toBe(0);
      expect(updated.happiness).toBe(50); // Unchanged
      expect(updated.hoursRemaining).toBe(60); // Unchanged
    });

    it('does not bypass if money is 0 and bypassDoctorIfBroke is false', () => {
      const player = { money: 0, happiness: 50, hoursRemaining: 60 } as PlayerState;
      const updated = processDoctorVisit(player, 10, new Random(1), false);
      expect(updated.money).toBe(0);
      expect(updated.happiness).toBe(46); // Penalized
      expect(updated.hoursRemaining).toBe(50); // Penalized
    });
  });

  describe('processStreetRobbery', () => {
    it('steals money and lowers happiness', () => {
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.001); 
      const player = { money: 100, happiness: 50 } as PlayerState;
      const dummyCampaign = { config: { eventRules: { willyRobberyStartWeek: 1 } } } as any;
      const updated = processStreetRobbery(player, 'bank', 5, new Random(1), dummyCampaign);
      expect(updated.money).toBe(0);
      expect(updated.happiness).toBe(47); // 50 - 3
    });
  });

  describe('processStarvation', () => {
    it('drops happiness and may trigger doctor', () => {
      vi.spyOn(Random.prototype, 'next').mockReturnValue(0.01); // Trigger doctor (25%)
      const player = { hoursRemaining: 60, happiness: 50 } as PlayerState;
      const { updated, doctorTriggered } = processStarvation(player, 20, new Random(1));
      expect(updated.happiness).toBe(48); // 50 - 2
      expect(updated.hoursRemaining).toBeLessThan(60);
      expect(doctorTriggered).toBe(true);
    });
  });
  describe('processDonations', () => {
    it('does nothing if nakedTurns < 2', () => {
      const player = { nakedTurns: 1, money: 0, turnEvents: [], inventory: { appliances: [], pawnedItems: [] } } as any;
      const state = { economicIndex: 0 } as any;
      const campaign = { jobs: [], items: [] } as any;
      
      const updated = processDonations(player, state, campaign, new Random(1));
      
      expect(updated).toBe(player);
    });

    it('triggers in CD-ROM if money and net worth < 300', () => {
      const player = { 
        nakedTurns: 2, 
        money: 100, 
        bankSavings: 50, 
        turnEvents: [], 
        inventory: { appliances: [], pawnedItems: [] } 
      } as any;
      const state = { economicIndex: 0 } as any;
      const campaign = { config: { eventRules: { charity: { maxCash: 299, maxWealth: 299, wealthMetric: 'netWorth' } } }, jobs: [], items: [] } as any;
      
      const updated = processDonations(player, state, campaign, new Random(1));
      
      expect(updated.money).toBeGreaterThan(100);
      expect(updated.nakedTurns).toBe(0);
      expect(updated.turnEvents.length).toBe(1);
    });

    it('triggers in Floppy if money == 0 and durableValue < 200', () => {
      const player = { 
        nakedTurns: 2, 
        money: 0, 
        bankSavings: 500, // Bank savings do not matter for floppy check 
        turnEvents: [], 
        inventory: { appliances: [{ id: 'tv', purchasePrice: 150 }], pawnedItems: [] } 
      } as any;
      const state = { economicIndex: 0 } as any;
      const campaign = { config: { eventRules: { charity: { maxCash: 0, maxWealth: 199, wealthMetric: 'durableValue' } } }, jobs: [], items: [] } as any;
      
      const updated = processDonations(player, state, campaign, new Random(1));
      
      expect(updated.money).toBeGreaterThan(0);
      expect(updated.nakedTurns).toBe(0);
    });

    it('calculates durable value properly for floppy', () => {
      // 2 TVs, last purchased at 500. Total durable value = 1000.
      const player = { 
        nakedTurns: 2, 
        money: 0, 
        bankSavings: 0, 
        turnEvents: [], 
        inventory: { 
          appliances: [
            { id: 'tv', purchasePrice: 400 },
            { id: 'tv', purchasePrice: 500 }
          ], 
          pawnedItems: [] 
        } 
      } as any;
      const state = { economicIndex: 0 } as any;
      const campaign = {
        config: { eventRules: { charity: { maxCash: 0, maxWealth: 199, wealthMetric: 'durableValue' } } },
        jobs: [], items: []
      } as any;
      
      const updated = processDonations(player, state, campaign, new Random(1));
      
      // 1000 >= 200, so NO donation should be triggered!
      expect(updated).toBe(player);
      expect(updated.money).toBe(0);
    });
  });
});
