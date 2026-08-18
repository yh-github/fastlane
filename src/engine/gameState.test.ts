import { createTestGameState } from './testFactories';
import { describe, it, expect } from 'vitest';
import { collectItemEffects, type PlayerState } from './gameState';
import { type CampaignBundle } from './dataLoader';

describe('createTestGameState', () => {
  it('initializes players with starting relaxation of 16', () => {
    const mockCampaign = {
      config: { name: 'test', startingMoney: 200, timeRules: { hoursPerTurn: 60, starvationPenalty: 20, doctorPenalty: 10 }, economyRules: { repairCostMin: 0.05, repairCostMax: 0.25 } } as any,

      items: [],
      jobs: [],
      buildings: [],
      housing: [],
      events: []
    } as unknown as CampaignBundle;

    const state = createTestGameState(
      mockCampaign,
      [{ name: 'TestPlayer', isAi: false, goals: { wealth: 50, happiness: 50, education: 50, career: 50 } }],
      'low_cost'
);

    expect(state.players[0].relaxation).toBe(16);
  });
});

describe('collectItemEffects', () => {
  it('accumulates effects by trigger and deduplicates duplicate items', () => {
    const mockCampaign = {
      items: [
        {
          id: 'stove',
          category: 'appliance',
          happinessBonus: 1,
          effects: [{ trigger: 'turn_start', stat: 'physical', value: 1 }]
        },
        {
          id: 'hot_tub',
          category: 'appliance',
          happinessBonus: 3,
          effects: [
            { trigger: 'turn_start', stat: 'physical', value: 1 },
            { trigger: 'turn_start', stat: 'mental', value: 1 },
            { trigger: 'on_relax', stat: 'physical', value: 1 }
          ]
        },
        {
          id: 'encyclopedia',
          category: 'book',
          happinessBonus: 1,
          effects: [{ trigger: 'continuous', stat: 'mental_max', value: 1 }]
        }
      ]
    } as unknown as CampaignBundle;

    const player = {
      inventory: {
        appliances: [
          { id: 'stove', purchasePrice: 400, purchaseSource: 'z_mart' },
          { id: 'stove', purchasePrice: 400, purchaseSource: 'z_mart' }, // duplicate!
          { id: 'hot_tub', purchasePrice: 1000, purchaseSource: 'z_mart' }
        ],
        books: ['encyclopedia']
      }
    } as unknown as PlayerState;

    const turnStartEffects = collectItemEffects(player, mockCampaign, 'turn_start');
    // Stove (+1 phys) + Hot Tub (+1 phys, +1 mental). Duplicate stove is ignored.
    expect(turnStartEffects.get('physical')).toBe(2);
    expect(turnStartEffects.get('mental')).toBe(1);

    const continuousEffects = collectItemEffects(player, mockCampaign, 'continuous');
    expect(continuousEffects.get('mental_max')).toBe(1);
  });
});
