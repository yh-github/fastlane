import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processApartmentRobbery, processDoctorVisit, processStreetRobbery, processStarvation } from './eventEngine';
import type { PlayerState } from './gameState';

describe('Event Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('processApartmentRobbery', () => {
    it('robbery steals stealable appliances', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001); // Trigger robbery AND 25% steal chance
      const player = { 
        currentHousingId: 'low_cost', 
        money: 1000, 
        relaxation: 50,
        turnEvents: [],
        inventory: { appliances: [
          { id: 'tv', purchasePrice: 500, purchaseSource: 'socket_city' }, // Stealable
          { id: 'refrigerator', purchasePrice: 500, purchaseSource: 'socket_city' } // Immune
        ] } 
      } as PlayerState;
      
      const { updated, robbed } = processApartmentRobbery(player);
      expect(robbed).toBe(true);
      expect(updated.money).toBe(1000); // Money untouched
      expect(updated.inventory.appliances.length).toBe(1); // TV stolen, fridge kept
      expect(updated.inventory.appliances[0].id).toBe('refrigerator');
    });

    it('no robbery if chance fails', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99); // No robbery
      const player = { currentHousingId: 'low_cost', money: 1000 } as PlayerState;
      const { updated, robbed } = processApartmentRobbery(player);
      expect(robbed).toBe(false);
      expect(updated.money).toBe(1000);
    });
  });

  describe('processDoctorVisit', () => {
    it('charges money and handles debt correctly', () => {
      const player = { money: 1000, bankSavings: 1000 } as PlayerState;
      const updated = processDoctorVisit(player);
      expect(updated.money + updated.bankSavings).toBeLessThan(2000); // Charged some money
    });
  });

  describe('processStreetRobbery', () => {
    it('steals money and lowers happiness', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.001); 
      const player = { money: 100, happiness: 50 } as PlayerState;
      const updated = processStreetRobbery(player, 'bank', 5);
      expect(updated.money).toBe(0);
      expect(updated.happiness).toBe(47); // 50 - 3
    });
  });

  describe('processStarvation', () => {
    it('drops happiness and may trigger doctor', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01); // Trigger doctor (25%)
      const player = { hoursRemaining: 60, happiness: 50 } as PlayerState;
      const { updated, doctorTriggered } = processStarvation(player);
      expect(updated.happiness).toBe(48); // 50 - 2
      expect(updated.hoursRemaining).toBeLessThan(60);
      expect(doctorTriggered).toBe(true);
    });
  });
});
