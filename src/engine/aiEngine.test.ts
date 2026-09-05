import { createTestGameState } from './testFactories';
// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { executeAITurn, selectAiWeekendCard } from './aiEngine';
import type { PlayerState, WeekendCard } from './gameState';
import type { CampaignBundle } from './dataLoader';

describe('AI Engine', () => {
  const mockCampaign = {
    items: [
      { id: 'food_1week', basePrice: 55, category: 'food', subcategory: 'fresh_food' },
      { id: 'casual_clothes', basePrice: 35, category: 'clothes', subcategory: 'casual' }
    ],
    education: [],
    jobs: [
      { id: 'job_clerk', baseWage: 4, requirements: { experience: 0, dependability: 0, degrees: [] }, buildingId: 'building_clerk' },
      { id: 'job_manager', baseWage: 10, requirements: { experience: 100, dependability: 100, degrees: [] } }
    ],
    config: {
      name: 'test',
      startingMoney: 200,
      timeRules: { hoursPerTurn: 60 }
    },
    map: {
      nodes: [
        { id: 'node_blacks_market', buildingId: 'blacks_market' },
        { id: 'node_rent_office', buildingId: 'rent_office' },
        { id: 'node_department_store', buildingId: 'department_store' },
        { id: 'node_employment_office', buildingId: 'employment_office' },
        { id: 'node_clerk_job', buildingId: 'building_clerk' },
        { id: 'node1' },
      ]
    },
    housing: [
      { id: 'low_cost', homeNodeId: 'node1' }
    ],
    buildings: [
      { id: 'blacks_market', archetype: 'grocery', name: 'Black Market', inventory: [{ itemId: 'food_1week' }] },
      { id: 'rent_office', archetype: 'housing', name: 'Rent' },
      { id: 'department_store', archetype: 'shop', name: 'Dept', inventory: [{ itemId: 'casual_clothes' }] },
      { id: 'employment_office', archetype: 'employment', name: 'Emp' },
      { id: 'building_clerk', archetype: 'workplace', name: 'Work' }
    ]
  } as unknown as CampaignBundle;

  it('should buy food if starving and has money', () => {
    let state = createTestGameState(mockCampaign, [{name: 'AI', isAi: true, goals: {wealth: 0, happiness: 0, education: 0, career: 0}}], 'node1');
    let aiPlayer = state.players[0];
    aiPlayer.inventory.freshFoodUnits = 0;
    aiPlayer.inventory.appliances = [{ id: 'refrigerator', purchasePrice: 400, purchaseSource: 'z_mart' }];
    aiPlayer.money = 100;
    aiPlayer.hoursRemaining = 60;

    const actions = executeAITurn(aiPlayer, state, mockCampaign);
    
    // The first action should be moving to the market
    expect(actions[0]).toEqual({ type: 'move', nodeId: 'node_blacks_market' });
  });

  it('should pay rent if due and has money', () => {
    let state = createTestGameState(mockCampaign, [{name: 'AI', isAi: true, goals: {wealth: 0, happiness: 0, education: 0, career: 0}}], 'node1');
    let aiPlayer = state.players[0];
    aiPlayer.inventory.freshFoodUnits = 10; // Not starving
    aiPlayer.rentPaidUntilWeek = 0; // Due
    state.turn = 0;
    aiPlayer.money = 200;
    aiPlayer.currentRentPrice = 150;
    aiPlayer.hoursRemaining = 60;

    const actions = executeAITurn(aiPlayer, state, mockCampaign);
    
    expect(actions[0]).toEqual({ type: 'move', nodeId: 'node_rent_office' });
  });

  it('should buy clothes if out of clothes', () => {
    let state = createTestGameState(mockCampaign, [{name: 'AI', isAi: true, goals: {wealth: 0, happiness: 0, education: 0, career: 0}}], 'node1');
    let aiPlayer = state.players[0];
    aiPlayer.inventory.freshFoodUnits = 10; 
    aiPlayer.rentPaidUntilWeek = 10; // Not due
    aiPlayer.inventory.casualClothesWeeks = 1; // Out of clothes
    aiPlayer.money = 50;
    aiPlayer.hoursRemaining = 60;

    const actions = executeAITurn(aiPlayer, state, mockCampaign);
    
    expect(actions[0]).toEqual({ type: 'move', nodeId: 'node_department_store' });
  });

  it('should apply for a better job if possible', () => {
    let state = createTestGameState(mockCampaign, [{name: 'AI', isAi: true, goals: {wealth: 25, happiness: 25, education: 25, career: 25}}], 'node1');
    let aiPlayer = state.players[0];
    aiPlayer.inventory.freshFoodUnits = 10; 
    aiPlayer.rentPaidUntilWeek = 10; 
    aiPlayer.inventory.casualClothesWeeks = 10; 
    aiPlayer.money = 500;
    aiPlayer.hoursRemaining = 60;
    aiPlayer.currentJobId = 'job_clerk';
    aiPlayer.experience = 100;
    aiPlayer.dependability = 100; // Meets requirements for manager

    const actions = executeAITurn(aiPlayer, state, mockCampaign);
    
    // First action should be move to employment office
    expect(actions[0]).toEqual({ type: 'move', nodeId: 'node_employment_office' });
  });

  it('should just relax if not enough time for anything else', () => {
    let state = createTestGameState(mockCampaign, [{name: 'AI', isAi: true, goals: {wealth: 0, happiness: 0, education: 0, career: 0}}], 'node1');
    let aiPlayer = state.players[0];
    aiPlayer.inventory.freshFoodUnits = 10; 
    aiPlayer.rentPaidUntilWeek = 10; 
    aiPlayer.inventory.casualClothesWeeks = 10; 
    aiPlayer.hoursRemaining = 1; // Not enough to move (2) or do anything. Must relax.

    const actions = executeAITurn(aiPlayer, state, mockCampaign);
    
    expect(actions.length).toBe(0);
  });

  describe('selectAiWeekendCard', () => {
    const mockCards: WeekendCard[] = [
      {
        id: 'card_cheap_mental',
        tier: 'cheap',
        type: 'random',
        eventKey: 'event.1',
        titleKey: 'title.1',
        fluff: 'fluff',
        icon: '🧠',
        costMin: 5,
        costMax: 20,
        targetStat: 'mental',
        potentialBonusMin: 0,
        potentialBonusMax: 0
      },
      {
        id: 'card_medium_dep',
        tier: 'medium',
        type: 'random',
        eventKey: 'event.2',
        titleKey: 'title.2',
        fluff: 'fluff',
        icon: '🤝',
        costMin: 25,
        costMax: 50,
        targetStat: 'dependability',
        potentialBonusMin: 1,
        potentialBonusMax: 2
      },
      {
        id: 'card_expensive_social',
        tier: 'expensive',
        type: 'random',
        eventKey: 'event.3',
        titleKey: 'title.3',
        fluff: 'fluff',
        icon: '👥',
        costMin: 75,
        costMax: 100,
        targetStat: 'social',
        potentialBonusMin: 3,
        potentialBonusMax: 4
      }
    ];

    it('selects affordable cheap card when low on cash', () => {
      const player = {
        money: 20,
        mentalCondition: 50,
        dependability: 50,
        social: 10
      } as unknown as PlayerState;

      const chosenId = selectAiWeekendCard(player, mockCards);
      expect(chosenId).toBe('card_cheap_mental');
    });

    it('prioritizes dependability card when dependability has a severe deficit', () => {
      const player = {
        money: 200,
        mentalCondition: 80,
        dependability: 20, // Severe deficit (80 - 20 = 60)
        social: 40
      } as unknown as PlayerState;

      const chosenId = selectAiWeekendCard(player, mockCards);
      expect(chosenId).toBe('card_medium_dep');
    });

    it('chooses clean over rest when broke and apartment mess is high', () => {
      const player = {
        money: 0,
        mess: 25,
        physicalCondition: 30,
        mentalCondition: 50
      } as unknown as PlayerState;

      const brokeCards: WeekendCard[] = [
        {
          id: 'broke_stay_home',
          tier: 'free',
          type: 'rest',
          eventKey: 'event.rest',
          titleKey: 'title.rest',
          fluff: 'fluff',
          icon: '🛋️',
          costMin: 0,
          costMax: 0,
          targetStat: 'mental',
          potentialBonusMin: 1,
          potentialBonusMax: 1
        },
        {
          id: 'broke_deep_clean',
          tier: 'free',
          type: 'clean',
          eventKey: 'event.clean',
          titleKey: 'title.clean',
          fluff: 'fluff',
          icon: '🧹',
          costMin: 0,
          costMax: 0,
          targetStat: 'mess',
          potentialBonusMin: 8,
          potentialBonusMax: 12
        }
      ];

      const chosenId = selectAiWeekendCard(player, brokeCards);
      expect(chosenId).toBe('broke_deep_clean');
    });
  });
});
