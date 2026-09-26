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

    it('requires an unbroken TV for durable_vcr in weekend decks', () => {
      let player = {
        id: 'p1',
        money: 100,
        inventory: { appliances: [{ id: 'vcr', purchasePrice: 250, purchaseSource: 'z_mart' }] }
      } as unknown as PlayerState;

      // Initializing deck without TV -> durable_vcr should NOT be added
      player = initPlayerWeekendDecks(player, fullMockWeekendData, new Random(42));
      expect(player.weekendDecks!.cheap.drawPile).not.toContain('durable_vcr');

      // Adding VCR directly without TV -> not added
      player = addApplianceCardToDeck(player, 'vcr', new Random(1));
      expect(player.weekendDecks!.cheap.drawPile).not.toContain('durable_vcr');

      // Add color_tv to inventory and deck -> durable_vcr added automatically
      player.inventory.appliances.push({ id: 'color_tv', purchasePrice: 400, purchaseSource: 'socket_city' });
      player = addApplianceCardToDeck(player, 'color_tv', new Random(1));
      expect(player.weekendDecks!.cheap.drawPile).toContain('durable_color_tv');
      expect(player.weekendDecks!.cheap.drawPile).toContain('durable_vcr');

      // Remove TV -> durable_vcr removed too
      player.inventory.appliances = player.inventory.appliances.filter(a => a.id !== 'color_tv');
      player = removeApplianceCardFromDeck(player, 'color_tv');
      expect(player.weekendDecks!.cheap.drawPile).not.toContain('durable_vcr');
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

    it('guarantees ticket attendance and resale cards among 3 choices when player holds an event ticket', () => {
      const player = {
        id: 'p1',
        money: 50,
        social: 20,
        inventory: { appliances: [], tickets: { baseball: 1, theatre: 0, concert: 0 } }
      } as unknown as PlayerState;

      const { player: updated, cards } = generateWeekendChoices(player, 2, fullMockWeekendData, new Random(123));
      expect(cards.length).toBe(3);
      const ticketCard = cards.find(c => c.type === 'ticket');
      const resaleCard = cards.find(c => c.type === 'ticket_resale');
      expect(ticketCard).toBeDefined();
      expect(ticketCard!.id).toBe('ticket_baseball');
      expect(resaleCard).toBeDefined();

      // Resolving ticket consumes it and costs $0 entry fee (pre-purchased)
      const resolved = resolveWeekendChoice(updated, ticketCard!.id, new Random(1));
      expect(resolved.inventory.tickets.baseball).toBe(0);
      expect(resolved.money).toBe(50);
      expect(resolved.social).toBe(22); // +2 social

      // Resolving resale grants cash profit (45 * 1.2 = 54) and consumes ticket
      const resolvedResale = resolveWeekendChoice(updated, resaleCard!.id, new Random(1));
      expect(resolvedResale.inventory.tickets.baseball).toBe(0);
      expect(resolvedResale.money).toBe(104); // 50 + 54
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

    it('merges turn maintenanceModifications (dependability decay, mess accumulation) into weekendResult.modifications', () => {
      const player = {
        id: 'p1',
        money: 100,
        inventory: { tickets: { baseball: 0, theatre: 0, concert: 0 } },
        maintenanceModifications: [
          { stat: 'dependability', diff: -1 },
          { stat: 'mess', diff: 3 },
          { stat: 'social', diff: -1 }
        ],
        offeredWeekendCards: [
          {
            id: 'random_1',
            type: 'random',
            tier: 'cheap',
            titleKey: 'weekend.card_1',
            eventKey: 'events.weekend.random_1',
            fluff: 'Chilled out.',
            icon: '☕',
            costMin: 25,
            costMax: 25,
            targetStat: 'mental',
            potentialBonusMin: 1,
            potentialBonusMax: 1
          }
        ]
      } as unknown as PlayerState;

      const resolved = resolveWeekendChoice(player, 'random_1', new Random(1), { usePhysicalMentalConditions: true } as any);
      expect(resolved.weekendResult).toBeDefined();
      const mods = resolved.weekendResult!.modifications!;
      expect(mods).toBeDefined();

      // Should include card money & mental, plus maintenance dependability, mess, and social
      expect(mods.find(m => m.stat === 'money')?.diff).toBe(-25);
      expect(mods.find(m => m.stat === 'mental')?.diff).toBe(1);
      expect(mods.find(m => m.stat === 'dependability')?.diff).toBe(-1);
      expect(mods.find(m => m.stat === 'mess')?.diff).toBe(3);
      expect(mods.find(m => m.stat === 'social')?.diff).toBe(-1);

      // Player maintenanceModifications should be cleared
      expect(resolved.maintenanceModifications).toBeUndefined();
    });

    describe('Advanced Weekend System Overhaul (Phases 1 & 2)', () => {
      it('draws predominantly cheap and free cards in early game (turns 1-3)', () => {
        const player = {
          id: 'p1',
          money: 500, // rich player who could afford expensive cards
          inventory: { appliances: [], tickets: { baseball: 0, theatre: 0, concert: 0 } },
          recentWeekendTiers: []
        } as unknown as PlayerState;

        let cheapOrFreeCount = 0;
        let expensiveCount = 0;
        for (let seed = 1; seed <= 20; seed++) {
          const { cards } = generateWeekendChoices(player, 2, fullMockWeekendData, new Random(seed));
          for (const card of cards) {
            if (card.tier === 'cheap' || card.tier === 'free') cheapOrFreeCount++;
            if (card.tier === 'expensive') expensiveCount++;
          }
        }
        // Out of 60 drawn cards in early game, cheap & free should heavily dominate
        expect(cheapOrFreeCount).toBeGreaterThan(45);
        expect(expensiveCount).toBeLessThan(10);
      });

      it('enforces card variety: no 3 cards of identical type and no matching type+tier', () => {
        const player = {
          id: 'p1',
          money: 200,
          inventory: { appliances: [{ id: 'refrigerator' }], tickets: { baseball: 0, theatre: 0, concert: 0 } },
          recentWeekendTiers: []
        } as unknown as PlayerState;

        for (let seed = 1; seed <= 30; seed++) {
          const { cards } = generateWeekendChoices(player, 4, fullMockWeekendData, new Random(seed));
          expect(cards.length).toBe(3);

          // Check 1: No 3 cards of the exact same type
          const types = cards.map(c => c.type);
          const allSameType = types[0] === types[1] && types[1] === types[2];
          expect(allSameType).toBe(false);

          // Check 2: If two cards share type, they must not share tier
          for (let i = 0; i < cards.length; i++) {
            for (let j = i + 1; j < cards.length; j++) {
              if (cards[i].type === cards[j].type) {
                expect(cards[i].tier).not.toBe(cards[j].tier);
              }
            }
          }
        }
      });

      it('allows solvent players to draw and resolve free cards (park walk, porch chat)', () => {
        const player = {
          id: 'p1',
          money: 300,
          social: 20,
          physicalCondition: 35,
          physicalConditionMax: 50,
          inventory: { appliances: [], tickets: { baseball: 0, theatre: 0, concert: 0 } },
          offeredWeekendCards: [
            {
              id: 'free_park_walk',
              tier: 'free',
              type: 'walk',
              eventKey: 'events.weekend.free_park_walk',
              titleKey: 'weekendScreen.card.parkWalkTitle',
              fluff: 'Walk in park',
              icon: '🌳',
              costMin: 0,
              costMax: 0,
              targetStat: 'physical',
              potentialBonusMin: 1,
              potentialBonusMax: 1
            },
            {
              id: 'free_porch_chat',
              tier: 'free',
              type: 'chat',
              eventKey: 'events.weekend.free_porch_chat',
              titleKey: 'weekendScreen.card.porchChatTitle',
              fluff: 'Chat on porch',
              icon: '🗣️',
              costMin: 0,
              costMax: 0,
              targetStat: 'social',
              potentialBonusMin: 1,
              potentialBonusMax: 1
            }
          ]
        } as unknown as PlayerState;

        // Resolve park walk: +1 physical condition
        const resWalk = resolveWeekendChoice(player, 'free_park_walk', new Random(1), { usePhysicalMentalConditions: true } as any);
        expect(resWalk.physicalCondition).toBe(36);
        expect(resWalk.money).toBe(300); // Free ($0)

        // Resolve porch chat: +1 social
        const resChat = resolveWeekendChoice(player, 'free_porch_chat', new Random(1), { usePhysicalMentalConditions: true } as any);
        expect(resChat.social).toBe(21);
        expect(resChat.money).toBe(300); // Free ($0)
      });

      it('scales ticket rewards by ticket quantity and differentiates by price tier', () => {
        // Theatre (30 base): 2 tickets = +2 Mental, +2 Social
        const playerTheatre = {
          id: 'p1',
          money: 100,
          inventory: { appliances: [], tickets: { baseball: 0, theatre: 2, concert: 0 } }
        } as unknown as PlayerState;

        const { cards: theatreCards } = generateWeekendChoices(playerTheatre, 4, fullMockWeekendData, new Random(1));
        const theatreCard = theatreCards.find(c => c.type === 'ticket')!;
        expect(theatreCard.potentialBonusMin).toBe(2); // Mental
        expect(theatreCard.potentialSecondaryBonusMin).toBe(2); // Social

        // Baseball (45 base): 3+ tickets = +3 Mental, +4 Social
        const playerBaseball = {
          id: 'p2',
          money: 100,
          inventory: { appliances: [], tickets: { baseball: 3, theatre: 0, concert: 0 } }
        } as unknown as PlayerState;

        const { cards: bbCards } = generateWeekendChoices(playerBaseball, 4, fullMockWeekendData, new Random(1));
        const bbCard = bbCards.find(c => c.type === 'ticket')!;
        expect(bbCard.potentialBonusMin).toBe(3); // Mental
        expect(bbCard.potentialSecondaryBonusMin).toBe(4); // Social
      });

      it('clears all held tickets from inventory even when skipping the event for another card', () => {
        const player = {
          id: 'p1',
          money: 100,
          mentalCondition: 40,
          mentalConditionMax: 80,
          inventory: { appliances: [], tickets: { baseball: 2, theatre: 0, concert: 0 } }
        } as unknown as PlayerState;

        const { player: withChoices, cards } = generateWeekendChoices(player, 4, fullMockWeekendData, new Random(42));
        expect(withChoices.inventory.tickets.baseball).toBe(2);

        // Player decides to pick the 3rd card (not the ticket or resale card)
        const altCard = cards.find(c => c.type !== 'ticket' && c.type !== 'ticket_resale') || cards[2];
        const resolved = resolveWeekendChoice(withChoices, altCard.id, new Random(1), { usePhysicalMentalConditions: true } as any);

        // All event tickets expired because the weekend passed!
        expect(resolved.inventory.tickets.baseball).toBe(0);
        expect(resolved.inventory.tickets.theatre).toBe(0);
        expect(resolved.inventory.tickets.concert).toBe(0);
      });

      it('biases appearance probability towards recently chosen tiers (lifestyle momentum)', () => {
        const player = {
          id: 'p1',
          money: 300,
          inventory: { appliances: [], tickets: { baseball: 0, theatre: 0, concert: 0 } },
          recentWeekendTiers: ['expensive', 'expensive', 'expensive']
        } as unknown as PlayerState;

        let expensiveCount = 0;
        for (let seed = 1; seed <= 30; seed++) {
          const { cards } = generateWeekendChoices(player, 8, fullMockWeekendData, new Random(seed));
          for (const card of cards) {
            if (card.tier === 'expensive') expensiveCount++;
          }
        }
        // With strong momentum on turn 8, expensive cards should appear very frequently
        expect(expensiveCount).toBeGreaterThan(25);
      });
    });
  });
});

