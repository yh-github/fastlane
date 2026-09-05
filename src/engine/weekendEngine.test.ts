import { Random } from '../utils/rng';
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PlayerState } from './gameState';
import {
  processWeekend,
  initPlayerWeekendDecks,
  addApplianceCardToDeck,
  removeApplianceCardFromDeck,
  generateWeekendChoices,
  resolveWeekendChoice
} from './weekendEngine';

describe('Weekend Engine', () => {
  const mockWeekendData = {
    ticketWeekends: {
      baseball: { text: "Went to a baseball game." },
      theatre: { text: "Went to the theatre." },
      concert: { text: "Went to a concert." }
    },
    durableWeekends: {
      tv: [{ text: "Watched TV." }],
      vcr: [{ text: "Watched a movie on VCR." }],
      stereo: [{ text: "Listened to the stereo." }],
      computer: [{ text: "Played games on the computer." }]
    },
    randomWeekends: ["Went to the park.", "Ate out.", "Saw a movie."]
  } as any;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('selects an event and charges the cost', () => {
    vi.spyOn(Random.prototype, 'next').mockReturnValue(0.01); // Picks first event (usually cheap like eating out)
    const player = { 
      money: 1000, 
      happiness: 50,
      inventory: { casualClothesWeeks: 0, dressClothesWeeks: 0, businessClothesWeeks: 0, tickets: { baseball: 0, theatre: 0, concert: 0 }, appliances: [] },
      turnEvents: []
    } as unknown as PlayerState;
    
    const nextPlayer = processWeekend(player, 1, [], mockWeekendData, new Random(1));
    expect(nextPlayer.weekendResult?.event.key).toBeDefined();
    expect(nextPlayer.money).toBeLessThan(1000); // Spent money
  });

  it('safely handles poor players without putting them in negative cash, but skips random events if broke', () => {
    vi.spyOn(Random.prototype, 'next').mockReturnValue(0.01); // First event
    const player = { 
      money: 2, // Less than cheapest cost (5)
      happiness: 50,
      inventory: { casualClothesWeeks: 0, dressClothesWeeks: 0, businessClothesWeeks: 0, tickets: { baseball: 0, theatre: 0, concert: 0 }, appliances: [] },
      turnEvents: []
    } as unknown as PlayerState;
    
    const nextPlayer = processWeekend(player, 1, [], mockWeekendData, new Random(1));
    expect(nextPlayer.money).toBe(2); // Should not drain their last 2 dollars
    expect(nextPlayer.weekendResult?.event.key).toBe('events.weekend.too_broke');
  });

  it('consumes exactly 1 ticket, not all of them', () => {
    const player = { 
      money: 100, 
      happiness: 50,
      inventory: { casualClothesWeeks: 0, dressClothesWeeks: 0, businessClothesWeeks: 0, tickets: { baseball: 3, theatre: 0, concert: 0 }, appliances: [] },
      turnEvents: []
    } as unknown as PlayerState;
    
    const nextPlayer = processWeekend(player, 1, [], mockWeekendData, new Random(1));
    expect(nextPlayer.inventory.tickets.baseball).toBe(2);
    expect(nextPlayer.weekendResult?.event.key).toBe('events.weekend.ticket_baseball');
  });

  describe('Alternative Weekend Decks & Choices', () => {
    const fullMockWeekendData = {
      ticketWeekends: {
        baseball: { text: "Baseball game." },
        theatre: { text: "Theatre play." },
        concert: { text: "Rock concert." }
      },
      durableWeekends: {
        refrigerator: { text: "Watched fridge." },
        stove: { text: "Baked cookies." }
      },
      randomWeekends: Array.from({ length: 42 }, (_, i) => `Random activity ${i}`)
    } as any;

    it('initializes 3 separate decks for cheap, medium, and expensive tiers', () => {
      const player = {
        id: 'p1',
        money: 100,
        inventory: { appliances: [{ id: 'refrigerator' }] },
        recentWeekendTiers: []
      } as unknown as PlayerState;

      const initialized = initPlayerWeekendDecks(player, fullMockWeekendData, new Random(42));
      expect(initialized.weekendDecks).toBeDefined();
      // 28 random (0-27) + 1 owned appliance = 29 cheap
      expect(initialized.weekendDecks!.cheap.drawPile.length).toBe(29);
      expect(initialized.weekendDecks!.cheap.drawPile).toContain('durable_refrigerator');
      // 7 medium (28-34)
      expect(initialized.weekendDecks!.medium.drawPile.length).toBe(7);
      // 7 expensive (35-41)
      expect(initialized.weekendDecks!.expensive.drawPile.length).toBe(7);
    });

    it('adds appliance card to cheap deck on purchase and removes it on pawn', () => {
      let player = {
        id: 'p1',
        money: 100,
        inventory: { appliances: [] }
      } as unknown as PlayerState;

      player = initPlayerWeekendDecks(player, fullMockWeekendData, new Random(42));
      expect(player.weekendDecks!.cheap.drawPile).not.toContain('durable_stove');

      // Add appliance card
      player = addApplianceCardToDeck(player, 'stove', new Random(1));
      expect(player.weekendDecks!.cheap.drawPile).toContain('durable_stove');

      // Remove appliance card
      player = removeApplianceCardFromDeck(player, 'stove');
      expect(player.weekendDecks!.cheap.drawPile).not.toContain('durable_stove');
      expect(player.weekendDecks!.cheap.discardPile).not.toContain('durable_stove');
    });

    it('offers exactly two $0 cards (Rest vs Clean) when player has < $5', () => {
      const player = {
        id: 'p1',
        money: 2,
        mentalCondition: 30,
        mentalConditionMax: 80,
        physicalCondition: 40,
        minPhysicalCondition: 1,
        mess: 15,
        inventory: { appliances: [], tickets: { baseball: 0, theatre: 0, concert: 0 } }
      } as unknown as PlayerState;

      const { player: updated, cards } = generateWeekendChoices(player, 2, fullMockWeekendData, new Random(1));
      expect(cards.length).toBe(2);
      expect(cards[0].costMax).toBe(0);
      expect(cards[1].costMax).toBe(0);
      expect(cards.some(c => c.id === 'broke_stay_home')).toBe(true);
      expect(cards.some(c => c.id === 'broke_deep_clean')).toBe(true);

      // Resolve Rest
      const afterRest = resolveWeekendChoice(updated, 'broke_stay_home', new Random(1), { usePhysicalMentalConditions: true, trackMess: true } as any);
      expect(afterRest.mentalCondition).toBe(31);
      expect(afterRest.mess).toBe(17);
      expect(afterRest.money).toBe(2);

      // Resolve Clean
      const afterClean = resolveWeekendChoice(updated, 'broke_deep_clean', new Random(1), { usePhysicalMentalConditions: true, trackMess: true } as any);
      expect(afterClean.physicalCondition).toBe(38); // -2
      expect(afterClean.mess).toBe(5); // 15 - 10
      expect(afterClean.money).toBe(2);
    });

    it('guarantees 1 ticket card among 3 choices when player holds an event ticket', () => {
      const player = {
        id: 'p1',
        money: 50,
        inventory: { appliances: [], tickets: { baseball: 1, theatre: 0, concert: 0 } }
      } as unknown as PlayerState;

      const { player: updated, cards } = generateWeekendChoices(player, 2, fullMockWeekendData, new Random(123));
      expect(cards.length).toBe(3);
      const ticketCard = cards.find(c => c.type === 'ticket');
      expect(ticketCard).toBeDefined();
      expect(ticketCard!.id).toBe('ticket_baseball');

      // Resolving ticket consumes it and rolls cost
      const resolved = resolveWeekendChoice(updated, ticketCard!.id, new Random(1));
      expect(resolved.inventory.tickets.baseball).toBe(0);
      expect(resolved.money).toBeLessThan(50);
    });

    it('shuffles unchosen cards back into draw pile and moves chosen card to discard pile', () => {
      const player = {
        id: 'p1',
        money: 200,
        inventory: { appliances: [], tickets: { baseball: 0, theatre: 0, concert: 0 } }
      } as unknown as PlayerState;

      const { player: pWithChoices, cards } = generateWeekendChoices(player, 2, fullMockWeekendData, new Random(99));
      expect(cards.length).toBe(3);

      const chosenCard = cards[0];
      const unchosenCards = cards.slice(1);

      const resolved = resolveWeekendChoice(pWithChoices, chosenCard.id, new Random(1));
      const tier = chosenCard.tier as 'cheap' | 'medium' | 'expensive';

      // Chosen card in discard pile
      expect(resolved.weekendDecks![tier].discardPile).toContain(chosenCard.id);

      // Unchosen cards should be back in draw pile
      for (const u of unchosenCards) {
        const uTier = u.tier as 'cheap' | 'medium' | 'expensive';
        expect(resolved.weekendDecks![uTier].drawPile).toContain(u.id);
      }
    });

    it('reshuffles discard pile into draw pile when draw pile is empty', () => {
      let player = {
        id: 'p1',
        money: 10, // only cheap affordable
        inventory: { appliances: [], tickets: { baseball: 0, theatre: 0, concert: 0 } }
      } as unknown as PlayerState;

      player = initPlayerWeekendDecks(player, fullMockWeekendData, new Random(1));
      // Manually empty cheap draw pile and put 2 cards in discard
      player.weekendDecks!.cheap.drawPile = [];
      player.weekendDecks!.cheap.discardPile = ['random_1', 'random_2'];

      const { player: updated, cards } = generateWeekendChoices(player, 2, fullMockWeekendData, new Random(1));
      expect(cards.length).toBeGreaterThan(0);
      // Discard pile was reshuffled into draw pile
      expect(updated.weekendDecks!.cheap.discardPile.length).toBe(0);
    });

    it('calculates stat modifier as floor(cost / 25) and retains special #42 bonus', () => {
      const player = {
        id: 'p1',
        money: 100,
        mentalCondition: 40,
        mentalConditionMax: 80,
        dependability: 50,
        social: 20,
        inventory: { appliances: [], tickets: { baseball: 0, theatre: 0, concert: 0 } },
        offeredWeekendCards: [
          {
            id: 'random_38',
            tier: 'expensive',
            type: 'random',
            eventKey: 'events.weekend.random_38',
            titleKey: 'weekendScreen.card.expensiveTitle',
            fluff: 'Expensive trip',
            icon: '👥',
            costMin: 75,
            costMax: 75,
            targetStat: 'social',
            potentialBonusMin: 3,
            potentialBonusMax: 3
          }
        ]
      } as unknown as PlayerState;

      // Cost 75 -> floor(75 / 25) = 3 social bonus
      const resolved = resolveWeekendChoice(player, 'random_38', new Random(1), { usePhysicalMentalConditions: true } as any);
      expect(resolved.money).toBe(25); // 100 - 75
      expect(resolved.social).toBe(23); // 20 + 3
      expect(resolved.recentWeekendTiers).toContain('expensive');
    });
  });
});

