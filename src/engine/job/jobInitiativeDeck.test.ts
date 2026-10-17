import { describe, it, expect } from 'vitest';
import { getJobInitiativeTier, generateInitiativeCards, locationHasTechnicalJobs, locationHasManagementJobs } from './jobInitiativeDeck';
import type { JobDef, CampaignBundle } from '../dataLoader';
import type { PlayerState } from '../gameState';
import { Random } from '../../utils/rng';

describe('jobInitiativeDeck', () => {
  const burgerCook: JobDef = {
    id: 'burger_cook',
    title: 'Short Order Cook',
    locationId: 'burger_joint',
    baseWage: 5,
    requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' },
    perks: [],
    tags: ['always_hiring']
  };

  const socketRepairman: JobDef = {
    id: 'socket_repairman',
    title: 'Electronics Repairman',
    locationId: 'socket_city',
    baseWage: 9,
    requirements: { experience: 20, dependability: 20, degrees: [], uniform: 'casual' },
    perks: [],
    tags: ['technical']
  };

  const bankManager: JobDef = {
    id: 'bank_mgr',
    title: 'Branch Manager',
    locationId: 'bank',
    baseWage: 15,
    requirements: { experience: 60, dependability: 60, degrees: [], uniform: 'business' },
    perks: [],
    tags: ['executive_management']
  };

  const mockCampaign: CampaignBundle = {
    jobs: [burgerCook, socketRepairman, bankManager],
  } as unknown as CampaignBundle;

  const basePlayer: PlayerState = {
    id: 'p1',
    money: 100,
    experience: 30,
    dependability: 50,
    mentalCondition: 50,
    physicalCondition: 50,
    social: 50,
    currentWage: 5,
    inventory: {}
  } as unknown as PlayerState;

  it('correctly categorizes jobs into Tiers 1, 2, and 3', () => {
    expect(getJobInitiativeTier(burgerCook)).toBe(1);
    expect(getJobInitiativeTier(socketRepairman)).toBe(2);
    expect(getJobInitiativeTier(bankManager)).toBe(3);
  });

  it('detects technical and management presence at locations', () => {
    expect(locationHasTechnicalJobs('socket_city', mockCampaign)).toBe(true);
    expect(locationHasTechnicalJobs('burger_joint', mockCampaign)).toBe(false);

    expect(locationHasManagementJobs('bank', mockCampaign)).toBe(true);
    expect(locationHasManagementJobs('burger_joint', mockCampaign)).toBe(false);
  });

  it('draws 2 cards for Tier 1 and Tier 2, and 3 cards for Tier 3', () => {
    const rng = new Random(42);

    const t1Cards = generateInitiativeCards(basePlayer, burgerCook, mockCampaign, rng, undefined, 1);
    expect(t1Cards.length).toBe(2);

    const t2Cards = generateInitiativeCards(basePlayer, socketRepairman, mockCampaign, rng, undefined, 1);
    expect(t2Cards.length).toBe(2);

    const t3Cards = generateInitiativeCards(basePlayer, bankManager, mockCampaign, rng, undefined, 1);
    expect(t3Cards.length).toBe(3);
  });

  it('scales cash bonuses proportionally to base wage when at or near merit cap', () => {
    // Generate over multiple seeds to find bounty cards
    let t1Cash = 0;
    let t3Cash = 0;
    const playerWithStanding: PlayerState = {
      ...basePlayer,
      initiativesByLocation: {
        burger_joint: 1,
        bank: 2
      }
    };

    for (let seed = 1; seed <= 20; seed++) {
      const cards1 = generateInitiativeCards(playerWithStanding, burgerCook, mockCampaign, new Random(seed), undefined, 1);
      const bounty1 = cards1.find(c => c.badge === 'BOUNTY');
      if (bounty1?.cashAmount && !t1Cash) t1Cash = bounty1.cashAmount;

      const cards3 = generateInitiativeCards(playerWithStanding, bankManager, mockCampaign, new Random(seed), undefined, 1);
      const bounty3 = cards3.find(c => c.badge === 'BOUNTY' && c.cashAmount);
      if (bounty3?.cashAmount && !t3Cash) t3Cash = bounty3.cashAmount;
    }

    expect(t1Cash).toBeGreaterThanOrEqual(10);
    expect(t1Cash).toBeLessThanOrEqual(25);

    expect(t3Cash).toBeGreaterThanOrEqual(60);
  });

  it('includes ethics/aesthetics cards that restore Mental condition (+4.0)', () => {
    let foundEthics = false;
    for (let seed = 1; seed <= 25; seed++) {
      const cards = generateInitiativeCards(basePlayer, socketRepairman, mockCampaign, new Random(seed), undefined, 1);
      const ethicsCard = cards.find(c => c.badge === 'ETHICS');
      if (ethicsCard) {
        foundEthics = true;
        expect(ethicsCard.mentalAmount).toBe(4.0);
        break;
      }
    }
    expect(foundEthics).toBe(true);
  });

  it('includes expensive high-tier cards with mental/social costs and burnoutRisk', () => {
    let foundExpensive = false;
    for (let seed = 1; seed <= 25; seed++) {
      const cards = generateInitiativeCards(basePlayer, bankManager, mockCampaign, new Random(seed), undefined, 1);
      const expensiveCard = cards.find(c => c.burnoutRisk === true);
      if (expensiveCard) {
        foundExpensive = true;
        expect(expensiveCard.mentalAmount! < 0 || expensiveCard.socialAmount! < 0).toBe(true);
        break;
      }
    }
    expect(foundExpensive).toBe(true);
  });
});
