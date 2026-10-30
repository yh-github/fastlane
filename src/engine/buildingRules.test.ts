import { describe, it, expect } from 'vitest';
import { isRentOfficeOpen, getNextRentOfficeOpenWeek, playerLivesAt, canEnterBuilding } from './buildingRules';
import type { PlayerState } from './gameState';
import type { CampaignBundle } from './dataLoader';

describe('buildingRules', () => {
  const dummyCampaign: CampaignBundle = {
    config: { timeRules: { buildingEntryCost: 2 } } as any,
    buildings: [
      { id: 'low_cost_housing', name: 'Low-Cost Housing', archetype: 'home', spritePath: '', description: '' },
      { id: 'security_apartments', name: 'Security Apartments', archetype: 'home', spritePath: '', description: '' },
      { id: 'apartment_complex', name: 'Rent Office', archetype: 'housing', spritePath: '', description: '' },
      { id: 'bank', name: 'Bank', archetype: 'bank', spritePath: '', description: '' },
      { id: 'factory', name: 'Factory', archetype: 'workplace', spritePath: '', description: '' },
    ],
    housing: [
      { id: 'low_cost', name: 'Low-Cost Housing', baseRent: 325, isRobberyImmune: false, homeNodeId: 'node_low_cost', description: '' },
      { id: 'security', name: 'Security Apartments', baseRent: 475, isRobberyImmune: true, homeNodeId: 'node_security', description: '' },
    ],
    map: {
      nodes: [
        { id: 'node_low_cost', buildingId: 'low_cost_housing', connections: [] },
        { id: 'node_security', buildingId: 'security_apartments', connections: [] },
        { id: 'node_rent', buildingId: 'apartment_complex', connections: [] },
        { id: 'node_bank', buildingId: 'bank', connections: [] },
      ],
      edges: []
    } as any,
    jobs: [
      { id: 'landlord_clerk', locationId: 'apartment_complex', title: 'Clerk' } as any
    ],
    items: [],
    education: [],
    events: [],
    stocks: [],
    messages: {} as any,
    weekends: {} as any,
    synergies: []
  };

  const getDummyPlayer = (overrides?: Partial<PlayerState>): PlayerState => ({
    id: 'p1',
    name: 'Jones',
    money: 1000,
    hoursRemaining: 60,
    position: 'node_low_cost',
    currentHousingId: 'low_cost',
    currentRentPrice: 325,
    rentPaidUntilWeek: 4,
    rentDebt: 0,
    turnFlags: {},
    inventory: { appliances: [], clothes: ['casual'], books: [] } as any,
    ...overrides
  } as PlayerState);

  describe('isRentOfficeOpen & getNextRentOfficeOpenWeek', () => {
    it('is closed during regular weeks when rent is paid ahead', () => {
      const player = getDummyPlayer({ rentPaidUntilWeek: 4, rentDebt: 0 });
      expect(isRentOfficeOpen(player, 1, dummyCampaign)).toBe(false);
      expect(isRentOfficeOpen(player, 2, dummyCampaign)).toBe(false);
      expect(isRentOfficeOpen(player, 3, dummyCampaign)).toBe(false);
      expect(getNextRentOfficeOpenWeek(player, 1)).toBe(4);
    });

    it('is open on week 4, 8, 12 cycles', () => {
      const player = getDummyPlayer({ rentPaidUntilWeek: 8 });
      expect(isRentOfficeOpen(player, 4, dummyCampaign)).toBe(true);
      expect(isRentOfficeOpen(player, 8, dummyCampaign)).toBe(true);
    });

    it('is open when rent is due or overdue', () => {
      const player = getDummyPlayer({ rentPaidUntilWeek: 2 });
      expect(isRentOfficeOpen(player, 2, dummyCampaign)).toBe(true);
      expect(isRentOfficeOpen(player, 3, dummyCampaign)).toBe(true);
    });

    it('is open when player has outstanding rentDebt', () => {
      const player = getDummyPlayer({ rentPaidUntilWeek: 8, rentDebt: 325 });
      expect(isRentOfficeOpen(player, 1, dummyCampaign)).toBe(true);
    });

    it('is open when rent was paid or moved this turn', () => {
      const player = getDummyPlayer({ rentPaidUntilWeek: 8, turnFlags: { rentPaidThisTurn: true } as any });
      expect(isRentOfficeOpen(player, 1, dummyCampaign)).toBe(true);
    });

    it('handles player working at rent office according to allowEmployedRentPayment rule', () => {
      const player = getDummyPlayer({ currentJobId: 'landlord_clerk', rentPaidUntilWeek: 8 });
      // When allowEmployedRentPayment is true, rent payment counter is open
      expect(isRentOfficeOpen(player, 1, dummyCampaign, { allowEmployedRentPayment: true } as any)).toBe(true);

      // When allowEmployedRentPayment is false (as in classic floppy/cdrom/advanced), rent payment counter is closed
      expect(isRentOfficeOpen(player, 1, dummyCampaign, { allowEmployedRentPayment: false } as any)).toBe(false);

      // But in both cases, the employee can enter the building to work!
      expect(canEnterBuilding('apartment_complex', player, 1, dummyCampaign, { allowEmployedRentPayment: false } as any).canEnter).toBe(true);
      expect(canEnterBuilding('apartment_complex', player, 1, dummyCampaign, { allowEmployedRentPayment: true } as any).canEnter).toBe(true);
    });
  });

  describe('playerLivesAt', () => {
    it('returns true when low_cost player checks low-cost housing or node', () => {
      const player = getDummyPlayer({ currentHousingId: 'low_cost' });
      expect(playerLivesAt(player, 'low_cost_housing', dummyCampaign)).toBe(true);
      expect(playerLivesAt(player, 'node_low_cost', dummyCampaign)).toBe(true);
      expect(playerLivesAt(player, 'low_cost', dummyCampaign)).toBe(true);
    });

    it('returns false when low_cost player checks security apartments or node', () => {
      const player = getDummyPlayer({ currentHousingId: 'low_cost' });
      expect(playerLivesAt(player, 'security_apartments', dummyCampaign)).toBe(false);
      expect(playerLivesAt(player, 'node_security', dummyCampaign)).toBe(false);
      expect(playerLivesAt(player, 'security', dummyCampaign)).toBe(false);
    });

    it('returns true when security player checks security apartments or node', () => {
      const player = getDummyPlayer({ currentHousingId: 'security' });
      expect(playerLivesAt(player, 'security_apartments', dummyCampaign)).toBe(true);
      expect(playerLivesAt(player, 'node_security', dummyCampaign)).toBe(true);
      expect(playerLivesAt(player, 'low_cost_housing', dummyCampaign)).toBe(false);
      expect(playerLivesAt(player, 'node_low_cost', dummyCampaign)).toBe(false);
    });
  });

  describe('canEnterBuilding', () => {
    it('allows entry to public buildings regardless of housing or turn', () => {
      const player = getDummyPlayer();
      expect(canEnterBuilding('bank', player, 1, dummyCampaign).canEnter).toBe(true);
      expect(canEnterBuilding('factory', player, 1, dummyCampaign).canEnter).toBe(true);
    });

    it('prevents low-cost resident from entering security apartments', () => {
      const player = getDummyPlayer({ currentHousingId: 'low_cost' });
      const check = canEnterBuilding('security_apartments', player, 1, dummyCampaign);
      expect(check.canEnter).toBe(false);
      expect(check.reason).toBe('dont_live_here');
    });

    it('allows low-cost resident to enter low-cost housing', () => {
      const player = getDummyPlayer({ currentHousingId: 'low_cost' });
      const check = canEnterBuilding('low_cost_housing', player, 1, dummyCampaign);
      expect(check.canEnter).toBe(true);
    });

    it('allows any player to enter rent office even when closed to see the closed notice or work', () => {
      const player = getDummyPlayer({ rentPaidUntilWeek: 4 });
      const checkClosed = canEnterBuilding('apartment_complex', player, 1, dummyCampaign);
      expect(checkClosed.canEnter).toBe(true);

      const checkOpen = canEnterBuilding('apartment_complex', player, 4, dummyCampaign);
      expect(checkOpen.canEnter).toBe(true);
    });

    it('always allows employees to enter their workplace even when rent office is closed to tenants', () => {
      // Even with allowEmployedRentPayment: false and on a non-rent week (turn 1)
      const rules = { allowEmployedRentPayment: false } as any;
      const player = getDummyPlayer({ currentJobId: 'landlord_clerk', rentPaidUntilWeek: 8 });
      
      // Rent payment counter is closed:
      expect(isRentOfficeOpen(player, 1, dummyCampaign, rules)).toBe(false);

      // But employee can enter the building to work their shift:
      const check = canEnterBuilding('apartment_complex', player, 1, dummyCampaign, rules);
      expect(check.canEnter).toBe(true);
    });
  });
});
