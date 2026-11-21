import { describe, it, expect } from 'vitest';
import { loadCampaign } from './dataLoader';
import {
  createPlayerState,
  createInitialGameState,
  recalculateLifestyle,
  recalculatePlayerEffects,
  calcMaxLifestyle,
  calcCurioScaledLifestyle,
} from './gameState';
import { processTurnStart } from './turnProcessor';
import { getHudAttributeInfo } from '../ui/hudAttributeInfo';

const ALL_TOP_SHARED_APPLIANCES = [
  'refrigerator',
  'freezer',
  'stove',
  'microwave',
  'vcr',
  'stereo',
  'hot_tub',
  'computer',
];

const ALL_BOOKS = ['encyclopedia', 'dictionary', 'atlas', 'capote'];

describe('Calibrated Lifestyle Goal Scoring', () => {
  it('computes per-version 100 Lifestyle benchmarks accurately', async () => {
    const advanced = await loadCampaign('advanced');
    const adv2000 = await loadCampaign('advanced_2000');
    const scrubs = await loadCampaign('scrubs');

    // advanced: Penthouse above low_cost (40) + shared appliances/books (22) + color_tv (2) + business_suit (2) + 3 curios (4) = 70
    expect(calcMaxLifestyle(advanced)).toBe(70);
    // advanced_2000 & scrubs: plasma_tv (3) replaces color_tv (2) -> 71
    expect(calcMaxLifestyle(adv2000)).toBe(71);
    expect(calcMaxLifestyle(scrubs)).toBe(71);

    const noCuriosCampaign = {
      ...advanced,
      config: {
        ...advanced.config,
        gameRules: {
          ...advanced.config.gameRules,
          pawnRummageBins: false,
        },
      },
    };
    expect(calcMaxLifestyle(noCuriosCampaign)).toBe(66);
  });

  it('starts at exactly 0 Lifestyle on Turn 0 across all Advanced campaigns', async () => {
    for (const id of ['advanced', 'advanced_2000', 'scrubs']) {
      const campaign = await loadCampaign(id);
      const player = createPlayerState('p1', 'Hero', false, {}, 'node_low_cost', campaign.config);
      expect(player.lifestyle).toBe(0);
      expect(recalculateLifestyle(player, campaign)).toBe(0);
      expect(recalculatePlayerEffects(player, campaign).lifestyle).toBe(0);
    }
  });

  it('allows homelessness, high mess, and low social to push Lifestyle below 0', async () => {
    const advanced = await loadCampaign('advanced');

    // Homeless on the streets: -10 raw / 70 = -14
    const homeless = createPlayerState('p1', 'Hero', false, {}, 'node_low_cost', advanced.config);
    homeless.currentHousingId = 'street';
    expect(recalculateLifestyle(homeless, advanced)).toBe(-14);

    // Filthy empty starter apartment (mess=50 -> -5 raw / 70 = -7)
    const messy = createPlayerState('p1', 'Hero', false, {}, 'node_low_cost', advanced.config);
    messy.mess = 50;
    expect(recalculateLifestyle(messy, advanced)).toBe(-7);

    // Antisocial recluse (social=1, startingSocial=20 -> floor(-19/10) = -2 raw / 70 = -3)
    const recluse = createPlayerState('p1', 'Hero', false, {}, 'node_low_cost', advanced.config);
    recluse.social = 1;
    expect(recalculateLifestyle(recluse, advanced)).toBe(-3);
  });

  it('counts only the best working item per slot (TV, Audio, Clothes) and no duplicate stacking', async () => {
    const adv2000 = await loadCampaign('advanced_2000');
    const player = createPlayerState('p1', 'Hero', false, {}, 'node_low_cost', adv2000.config);

    // Own both crt_tv (1) and plasma_tv (3) + duplicate plasma_tv -> only best plasma_tv (3) counts
    player.inventory.appliances = [
      { id: 'crt_tv', purchasePrice: 140, purchaseSource: 'z_mart' },
      { id: 'plasma_tv', purchasePrice: 750, purchaseSource: 'socket_city' },
      { id: 'plasma_tv', purchasePrice: 750, purchaseSource: 'socket_city' },
    ];
    expect(recalculateLifestyle(player, adv2000)).toBe(Math.round((3 / 71) * 100));

    // Break plasma_tvs -> falls back to working crt_tv (1)
    player.inventory.appliances[1].isBroken = true;
    player.inventory.appliances[2].isBroken = true;
    expect(recalculateLifestyle(player, adv2000)).toBe(Math.round((1 / 71) * 100));

    // Break crt_tv too -> 0 TV lifestyle
    player.inventory.appliances[0].isBroken = true;
    expect(recalculateLifestyle(player, adv2000)).toBe(0);

    // Audio slot: 8track (1) + stereo (2) -> only stereo (2); if stereo broken -> falls back to 8track (1)
    player.inventory.appliances = [
      { id: '8track', purchasePrice: 75, purchaseSource: 'z_mart' },
      { id: 'stereo', purchasePrice: 412, purchaseSource: 'socket_city' },
    ];
    expect(recalculateLifestyle(player, adv2000)).toBe(Math.round((2 / 71) * 100));
    player.inventory.appliances[1].isBroken = true;
    expect(recalculateLifestyle(player, adv2000)).toBe(Math.round((1 / 71) * 100));

    // Clothes slot: dress_clothes (1) + business_suit (2) -> only business_suit (2), not 3
    player.inventory.appliances = [];
    player.inventory.dressClothesWeeks = 5;
    player.inventory.businessClothesWeeks = 10;
    expect(recalculateLifestyle(player, adv2000)).toBe(Math.round((2 / 71) * 100));

    // Duplicate non-slot appliances (2 hot tubs) only count once (5 raw, not 7)
    player.inventory.dressClothesWeeks = 0;
    player.inventory.businessClothesWeeks = 0;
    player.inventory.appliances = [
      { id: 'hot_tub', purchasePrice: 1255, purchaseSource: 'socket_city' },
      { id: 'hot_tub', purchasePrice: 1255, purchaseSource: 'socket_city' },
    ];
    expect(recalculateLifestyle(player, adv2000)).toBe(Math.round((5 / 71) * 100));
  });

  it('awards exact 100 Lifestyle for Penthouse + all top working durables + Business Suit + 3 curios', async () => {
    for (const [id, topTv] of [
      ['advanced', 'color_tv'],
      ['advanced_2000', 'plasma_tv'],
      ['scrubs', 'plasma_tv'],
    ] as const) {
      const campaign = await loadCampaign(id);
      const player = createPlayerState('p1', 'Hero', false, {}, 'node_security', campaign.config);
      player.currentHousingId = 'penthouse';
      player.inventory.appliances = [...ALL_TOP_SHARED_APPLIANCES, topTv].map(appId => ({
        id: appId,
        purchasePrice: 500,
        purchaseSource: 'socket_city',
      }));
      player.inventory.books = [...ALL_BOOKS];
      player.inventory.businessClothesWeeks = 10;
      player.inventory.knickKnacks = 3;

      expect(recalculateLifestyle(player, campaign)).toBe(100);

      // Missing the 3rd curio keeps score below 100 (at baseline social=20)
      player.inventory.knickKnacks = 2;
      expect(recalculateLifestyle(player, campaign)).toBeLessThan(100);

      // Social above baseline (e.g. social=40 -> +2 raw) acts as a buffer back to 100
      player.social = 40;
      expect(recalculateLifestyle(player, campaign)).toBe(100);
    }
  });

  it('curioDecor appraisal reflects real normalized Lifestyle gain without fake temp modifiers', async () => {
    const campaign = await loadCampaign('advanced');
    const state = createInitialGameState(
      campaign,
      [{ name: 'Hero', isAi: false, goals: { wealth: 50, lifestyle: 50, education: 50, career: 50, wellbeing: 50 } }],
      'node_low_cost',
      undefined,
      42
    );
    state.turn = 1;
    state.players[0].inventory.freshFoodUnits = 2;
    state.players[0].inventory.uninspectedKnickKnacks = 1;

    // Seed replay decisions so curio appraisal triggers winRoll < winChance and outcomeRoll < 0.40 (curioDecor)
    const nextState = processTurnStart(state, campaign, {
      inDecisions: [
        { type: 'curio_lottery_win_player_1_turn_1', result: 0.01 },
        { type: 'curio_catalog_player_1_turn_1', result: 0 },
        { type: 'curio_outcome_player_1_turn_1', result: 0.1 },
      ],
      outDecisions: [],
    });

    const p = nextState.players[0];
    const decorEvent = p.turnEvents.find(e => e.key === 'events.curioDecor');
    expect(decorEvent).toBeDefined();
    const expectedCurioGain = calcCurioScaledLifestyle(1, campaign);
    expect(decorEvent?.params?.lifestyle).toBe(expectedCurioGain);
    expect(p.lifestyle).toBe(recalculateLifestyle(p, campaign));
  });

  it('clamps HUD Lifestyle bar percentage at 0 while showing negative values', async () => {
    const campaign = await loadCampaign('advanced');
    const player = createPlayerState('p1', 'Hero', false, { lifestyle: 50 }, 'node_low_cost', campaign.config);
    player.currentHousingId = 'street';
    player.lifestyle = recalculateLifestyle(player, campaign);

    const hudInfo = getHudAttributeInfo({
      attributeId: 'lifestyle',
      player,
      campaign,
      rules: campaign.config.gameRules,
      turn: 1,
    });
    expect(hudInfo?.currentValue).toBe(-14);
    expect(hudInfo?.currentFormatted).toBe('-14');
    expect(hudInfo?.percentage).toBe(0);
  });
});
