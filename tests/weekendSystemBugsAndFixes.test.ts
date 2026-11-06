import { describe, it, expect } from 'vitest';
import { generateWeekendChoices, resolveWeekendChoice, initPlayerWeekendDecks } from '../src/engine/weekendEngine';
import { SPRINT_WEEKEND_CARDS, FREE_WEEKEND_CARDS } from '../src/engine/weekendCards';
import { selectAiWeekendCard } from '../src/engine/aiEngine';
import { Random } from '../src/utils/rng';
import { createTestPlayer } from '../src/engine/testFactories';
import type { PlayerState, GameRules, WeekendCard } from '../src/engine/gameState';
import type { CampaignBundle } from '../src/engine/dataLoader';
import enLocales from '../src/locales/en.json';
import heLocales from '../src/locales/he.json';

const mockWeekendData = {
  ticketWeekends: {
    baseball: { text: 'Went to baseball' },
    theatre: { text: 'Went to theatre' },
    concert: { text: 'Went to concert' }
  },
  durableWeekends: {
    refrigerator: { text: 'Watched mold grow' },
    microwave: { text: 'Cleaned microwave' },
    color_tv: { text: 'Watched Star Trek' },
    vcr: { text: 'Rented tapes' }
  },
  randomWeekends: Array.from({ length: 42 }, (_, i) => `Random event ${i}`)
};

const mock2000WeekendData = {
  ticketWeekends: {
    baseball: { text: 'Went to baseball' },
    theatre: { text: 'Went to theatre' },
    concert: { text: 'Went to concert' }
  },
  durableWeekends: {
    refrigerator: { text: 'Watched mold grow' }
  },
  randomWeekends: Array.from({ length: 16 }, (_, i) => `2000 event ${i}`)
};

const mockCampaign = {
  config: {
    statRules: {
      enableAdvancedStats: true,
      minPhysicalCondition: 1,
      initialPhysicalMax: 65,
      maxMentalCondition: 65,
      minMentalCondition: 1,
      minSocial: 1,
      maxSocial: 99
    }
  },
  jobs: [
    {
      id: 'pirate_cook',
      title: 'Pirate Cook',
      tags: ['technical']
    },
    {
      id: 'corporate_manager',
      title: 'Corporate Manager',
      tags: ['middle_management']
    }
  ],
  education: [
    {
      id: 'cert_tech',
      name: 'Tech Certificate',
      lessons: 4
    }
  ]
} as unknown as CampaignBundle;

const rules: GameRules = {
  usePhysicalMentalConditions: true,
  trackSocial: true,
  trackMess: true,
  useSkills: true,
  alternativeWeekends: true,
  enableCaffeineSystem: true
} as any;

describe('Weekend System Bug & Enhancement Verification', () => {
  describe('Bug 1: Missing campaign parameter in GameSession.tsx affects sprint cards', () => {
    it('resolving weekend_overtime_grind WITHOUT campaign fails to award skillTech or skillMgmt', () => {
      const player = createTestPlayer({
        currentJobId: 'pirate_cook',
        skillTech: 1.0,
        money: 100,
        physicalCondition: 40,
        mentalCondition: 40,
        offeredWeekendCards: [SPRINT_WEEKEND_CARDS.weekend_overtime_grind]
      });

      // When campaign is passed (as intended)
      const withCampaign = resolveWeekendChoice(player, 'weekend_overtime_grind', new Random(1), rules, mockCampaign.config.statRules, mockCampaign);
      expect(withCampaign.skillTech).toBe(1.2);

      // When campaign is omitted (the bug in GameSession.tsx)
      const withoutCampaign = resolveWeekendChoice(player, 'weekend_overtime_grind', new Random(1), rules, mockCampaign.config.statRules);
      // Bug reproduction: withoutCampaign.skillTech failed to advance
      expect(withoutCampaign.skillTech).toBe(1.0);
    });

    it('resolving weekend_cramming_sprint WITH campaign uses degree requiredLessons instead of hardcoded 10', () => {
      const player = createTestPlayer({
        enrolledClasses: { cert_tech: 0 },
        money: 100,
        physicalCondition: 40,
        mentalCondition: 40,
        offeredWeekendCards: [SPRINT_WEEKEND_CARDS.weekend_cramming_sprint]
      });

      // With cert_tech having 4 lessons, 1 lesson should be 1/4 = 25% (under percentageEducation) or 1 lesson
      const res = resolveWeekendChoice(player, 'weekend_cramming_sprint', new Random(1), { ...rules, percentageEducation: true } as any, mockCampaign.config.statRules, mockCampaign);
      expect(res.enrolledClasses['cert_tech']).toBe(25);
    });
  });

  describe('Bug 2: Advanced 2000 deck starvation (empty medium & expensive decks)', () => {
    it('initializes non-empty medium and expensive decks even when randomWeekends has fewer than 42 entries', () => {
      const player = createTestPlayer();
      const initialized = initPlayerWeekendDecks(player, mock2000WeekendData, new Random(1));

      // Bug reproduction: with 16 cards, medium and expensive were empty
      expect(initialized.weekendDecks!.medium.drawPile.length).toBeGreaterThan(0);
      expect(initialized.weekendDecks!.expensive.drawPile.length).toBeGreaterThan(0);
    });

    it('generates medium and expensive cards on Turn 8+ in Advanced 2000 for solvent players', () => {
      const player = createTestPlayer({
        money: 500,
        recentWeekendTiers: []
      });
      const initialized = initPlayerWeekendDecks(player, mock2000WeekendData, new Random(1));

      let drewMediumOrExpensive = false;
      for (let seed = 1; seed <= 15; seed++) {
        const { cards } = generateWeekendChoices(initialized, 8, mock2000WeekendData, new Random(seed), mockCampaign, rules);
        if (cards.some(c => c.tier === 'medium' || c.tier === 'expensive')) {
          drewMediumOrExpensive = true;
          break;
        }
      }
      expect(drewMediumOrExpensive).toBe(true);
    });
  });

  describe('Bug 3: free_park_walk should grant Physical + Mental and NOT increase mess', () => {
    it('free_park_walk awards +2 physical, +1 mental, and 0 mess', () => {
      const player = createTestPlayer({
        physicalCondition: 30,
        mentalCondition: 30,
        mess: 5,
        offeredWeekendCards: [FREE_WEEKEND_CARDS.free_park_walk]
      });

      const res = resolveWeekendChoice(player, 'free_park_walk', new Random(1), rules, mockCampaign.config.statRules, mockCampaign);
      expect(res.physicalCondition).toBe(32);
      expect(res.mentalCondition).toBe(31);
      expect(res.mess).toBe(5); // Should NOT have increased by 2!
    });
  });

  describe('Bug 4: Duplicate JSON "weekend" block in locales', () => {
    it('en.json and he.json have events.weekend.cramming_sprint and overtime_grind defined', () => {
      const enWeekend: any = (enLocales as any).events?.weekend;
      const heWeekend: any = (heLocales as any).events?.weekend;

      expect(enWeekend?.cramming_sprint).toBeDefined();
      expect(enWeekend?.overtime_grind).toBeDefined();
      expect(heWeekend?.cramming_sprint).toBeDefined();
      expect(heWeekend?.overtime_grind).toBeDefined();
    });
  });

  describe('Bug 5: AI utility evaluation blind spots', () => {
    it('AI evaluates ticket_resale positively when broke or needing cash', () => {
      const player = createTestPlayer({
        money: 2,
        physicalCondition: 50,
        mentalCondition: 50
      });
      const cards: WeekendCard[] = [
        {
          id: 'ticket_resale_baseball',
          tier: 'free',
          type: 'ticket_resale',
          eventKey: 'events.weekend.ticket_resale_baseball',
          titleKey: 'Resell',
          fluff: 'Resell',
          icon: '💵',
          costMin: 0,
          costMax: 0,
          resalePayout: 45
        },
        {
          id: 'free_stay_home',
          tier: 'free',
          type: 'rest',
          eventKey: 'events.weekend.free_stay_home',
          titleKey: 'Stay Home',
          fluff: 'Stay Home',
          icon: '🛋️',
          costMin: 0,
          costMax: 0,
          targetStat: 'mental',
          potentialBonusMin: 2,
          potentialBonusMax: 2
        }
      ];

      const chosen = selectAiWeekendCard(player, cards);
      expect(chosen).toBe('ticket_resale_baseball');
    });

    it('AI evaluates targetStat === physical when physical condition is depleted', () => {
      const player = createTestPlayer({
        money: 100,
        physicalCondition: 12,
        mentalCondition: 50
      });
      const cards: WeekendCard[] = [
        {
          id: 'free_park_walk',
          tier: 'free',
          type: 'walk',
          eventKey: 'events.weekend.free_park_walk',
          titleKey: 'Park Walk',
          fluff: 'Park Walk',
          icon: '🌳',
          costMin: 0,
          costMax: 0,
          targetStat: 'physical',
          potentialBonusMin: 2,
          potentialBonusMax: 2
        },
        {
          id: 'random_cheap_social',
          tier: 'cheap',
          type: 'random',
          eventKey: 'events.weekend.random_cheap_social',
          titleKey: 'Hangout',
          fluff: 'Hangout',
          icon: '👥',
          costMin: 10,
          costMax: 10,
          targetStat: 'social',
          potentialBonusMin: 1,
          potentialBonusMax: 1
        }
      ];

      const chosen = selectAiWeekendCard(player, cards);
      expect(chosen).toBe('free_park_walk');
    });
  });

  describe('Requirement 1: Broke player gets 2 random distinct cards out of the 4 free cards', () => {
    it('broke player receives 2 distinct cards from the 4 free cards with seed variety', () => {
      const player = createTestPlayer({
        money: 0,
        inventory: { tickets: { baseball: 0, theatre: 0, concert: 0 } }
      });

      const choicesSeen = new Set<string>();
      for (let seed = 1; seed <= 20; seed++) {
        const { cards } = generateWeekendChoices(player, 2, mockWeekendData, new Random(seed), mockCampaign, rules);
        expect(cards.length).toBe(2);
        expect(cards[0].id).not.toBe(cards[1].id);
        expect(cards[0].costMax).toBe(0);
        expect(cards[1].costMax).toBe(0);

        const pairKey = [cards[0].id, cards[1].id].sort().join(',');
        choicesSeen.add(pairKey);
      }

      // Should not be the exact same pair every turn!
      expect(choicesSeen.size).toBeGreaterThan(1);
    });
  });

  describe('Requirement 2: Ticket weekend souvenir is an authentic event-related item', () => {
    it('awards event-related souvenir for baseball game (e.g. ticket stub, foul ball, pennant)', () => {
      const player = createTestPlayer({
        money: 100,
        inventory: {
          tickets: { baseball: 2, theatre: 0, concert: 0 },
          curios: [],
          knickKnacks: 0
        },
        offeredWeekendCards: [
          {
            id: 'ticket_baseball',
            tier: 'medium',
            type: 'ticket',
            eventKey: 'events.weekend.ticket_baseball',
            titleKey: 'Baseball',
            fluff: 'Baseball',
            icon: '⚾',
            costMin: 30,
            costMax: 30,
            targetStat: 'mental',
            potentialBonusMin: 2,
            potentialBonusMax: 2,
            ticketCount: 2
          }
        ]
      });

      // Force souvenir hit with high roll probability or controlled RNG
      // If RNG succeeds on souvenir chance
      const luckyRng = {
        next: () => 0.05, // triggers souvenirChance (< 0.20)
        shuffle: <T>(arr: T[]) => arr
      } as unknown as Random;

      const res = resolveWeekendChoice(player, 'ticket_baseball', luckyRng, rules, mockCampaign.config.statRules, mockCampaign);
      expect(res.weekendResult?.souvenir).toBeDefined();

      const souvenir = res.weekendResult!.souvenir!;
      // Souvenir must be baseball-related, NOT a random rotary phone or tin robot
      const validBaseballSouvenirs = ['ticket_stub_baseball', 'foul_ball', 'team_pennant', 'autographed_card'];
      const isBaseballRelated = validBaseballSouvenirs.some(id => souvenir.id.includes(id));
      expect(isBaseballRelated).toBe(true);

      // Verify curio added to inventory is also baseball-related
      expect(res.inventory.curios).toHaveLength(1);
      expect(validBaseballSouvenirs.some(id => res.inventory.curios![0].catalogId.includes(id) || res.inventory.curios![0].id.includes(id))).toBe(true);
    });

    it('awards event-related souvenir for theatre show and concert', () => {
      const luckyRng = {
        next: () => 0.05,
        shuffle: <T>(arr: T[]) => arr
      } as unknown as Random;

      // Theatre
      const theatrePlayer = createTestPlayer({
        money: 100,
        inventory: { tickets: { theatre: 2, baseball: 0, concert: 0 }, curios: [] },
        offeredWeekendCards: [{ id: 'ticket_theatre', tier: 'medium', type: 'ticket', eventKey: 'events.weekend.ticket_theatre', titleKey: 'Theatre', fluff: '', icon: '🎭', costMin: 30, costMax: 30, ticketCount: 2 }]
      });
      const theatreRes = resolveWeekendChoice(theatrePlayer, 'ticket_theatre', luckyRng, rules, mockCampaign.config.statRules, mockCampaign);
      const theatreValid = ['ticket_stub_theatre', 'playbill', 'signed_program', 'stage_prop_replica'];
      expect(theatreValid.some(id => theatreRes.weekendResult?.souvenir?.id.includes(id))).toBe(true);

      // Concert
      const concertPlayer = createTestPlayer({
        money: 100,
        inventory: { tickets: { concert: 2, baseball: 0, theatre: 0 }, curios: [] },
        offeredWeekendCards: [{ id: 'ticket_concert', tier: 'expensive', type: 'ticket', eventKey: 'events.weekend.ticket_concert', titleKey: 'Concert', fluff: '', icon: '🎸', costMin: 50, costMax: 50, ticketCount: 2 }]
      });
      const concertRes = resolveWeekendChoice(concertPlayer, 'ticket_concert', luckyRng, rules, mockCampaign.config.statRules, mockCampaign);
      const concertValid = ['ticket_stub_concert', 'guitar_pick', 'backstage_pass', 'drumstick'];
      expect(concertValid.some(id => concertRes.weekendResult?.souvenir?.id.includes(id))).toBe(true);
    });
  });

  describe('Requirement 3: Momentum bias by card stat / type', () => {
    it('biases card generation towards recent picked stats (e.g. mental or social momentum)', () => {
      const playerWithMentalFocus = createTestPlayer({
        money: 300,
        recentWeekendTiers: ['cheap', 'cheap', 'cheap', 'cheap'],
        recentWeekendPicks: [
          { tier: 'cheap', type: 'study', targetStat: 'mental' },
          { tier: 'cheap', type: 'random', targetStat: 'mental' },
          { tier: 'cheap', type: 'random', targetStat: 'mental' },
          { tier: 'cheap', type: 'random', targetStat: 'mental' }
        ]
      });

      const playerWithSocialFocus = createTestPlayer({
        money: 300,
        recentWeekendTiers: ['cheap', 'cheap', 'cheap', 'cheap'],
        recentWeekendPicks: [
          { tier: 'cheap', type: 'chat', targetStat: 'social' },
          { tier: 'cheap', type: 'random', targetStat: 'social' },
          { tier: 'cheap', type: 'random', targetStat: 'social' },
          { tier: 'cheap', type: 'random', targetStat: 'social' }
        ]
      });

      let mentalCountForMentalFocus = 0;
      let mentalCountForSocialFocus = 0;

      for (let seed = 1; seed <= 40; seed++) {
        const { cards: mentalCards } = generateWeekendChoices(playerWithMentalFocus, 5, mockWeekendData, new Random(seed), mockCampaign, rules);
        for (const c of mentalCards) {
          if (c.targetStat === 'mental') mentalCountForMentalFocus++;
        }

        const { cards: socialCards } = generateWeekendChoices(playerWithSocialFocus, 5, mockWeekendData, new Random(seed), mockCampaign, rules);
        for (const c of socialCards) {
          if (c.targetStat === 'mental') mentalCountForSocialFocus++;
        }
      }

      // Player with mental momentum should draw noticeably more mental cards than player with social momentum
      expect(mentalCountForMentalFocus).toBeGreaterThan(mentalCountForSocialFocus);
    });
  });

  describe('Requirement 4: Anti-Monotony Rigorous Verification', () => {
    it('never offers duplicate cards, never 3 cards of same type, and never matching (type + tier)', () => {
      const player = createTestPlayer({
        money: 400,
        inventory: { appliances: [{ id: 'refrigerator' }, { id: 'microwave' }, { id: 'color_tv' }] }
      });

      for (let turn = 1; turn <= 15; turn++) {
        for (let seed = 1; seed <= 30; seed++) {
          const { cards } = generateWeekendChoices(player, turn, mockWeekendData, new Random(seed * 100 + turn), mockCampaign, rules);
          expect(cards.length).toBe(3);

          // 1. No duplicates
          const ids = cards.map(c => c.id);
          expect(new Set(ids).size).toBe(3);

          // 2. Never 3 cards of exact same type
          const types = cards.map(c => c.type);
          const allSameType = types[0] === types[1] && types[1] === types[2];
          expect(allSameType).toBe(false);

          // 3. Never two cards of same type AND same tier
          for (let i = 0; i < cards.length; i++) {
            for (let j = i + 1; j < cards.length; j++) {
              if (cards[i].type === cards[j].type) {
                expect(cards[i].tier).not.toBe(cards[j].tier);
              }
            }
          }

          // 4. Never 3 cards of exact same targetStat (when defined)
          const targetStats = cards.map(c => c.targetStat).filter(Boolean);
          if (targetStats.length === 3) {
            const allSameStat = targetStats[0] === targetStats[1] && targetStats[1] === targetStats[2];
            expect(allSameStat).toBe(false);
          }
        }
      }
    });
  });
});
