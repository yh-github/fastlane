// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { executeAITurn } from './aiEngine';
import { createInitialGameState } from './gameState';
import type { CampaignBundle } from './dataLoader';

describe('AI Engine', () => {
  const mockCampaign = {
    items: [
      { id: 'food_1week', basePrice: 55, category: 'food', subcategory: 'fresh_food', store: 'blacks_market' },
      { id: 'casual_clothes', basePrice: 35, category: 'clothes', subcategory: 'casual', store: 'department_store' }
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
      { id: 'blacks_market', archetype: 'grocery', name: 'Black Market' },
      { id: 'rent_office', archetype: 'housing', name: 'Rent' },
      { id: 'department_store', archetype: 'shop', name: 'Dept' },
      { id: 'employment_office', archetype: 'employment', name: 'Emp' },
      { id: 'building_clerk', archetype: 'workplace', name: 'Work' }
    ]
  } as unknown as CampaignBundle;

  it('should buy food if starving and has money', () => {
    let state = createInitialGameState(mockCampaign, [{name: 'AI', isAi: true, goals: {wealth: 0, happiness: 0, education: 0, career: 0}}], 'node1', 'bundle');
    let aiPlayer = state.players[0];
    aiPlayer.inventory.freshFoodUnits = 0;
    aiPlayer.inventory.appliances = ['refrigerator'];
    aiPlayer.money = 100;
    aiPlayer.hoursRemaining = 60;

    const actions = executeAITurn(aiPlayer, state, mockCampaign);
    
    // The first action should be moving to the market
    expect(actions[0]).toEqual({ type: 'move', nodeId: 'node_blacks_market' });
  });

  it('should pay rent if due and has money', () => {
    let state = createInitialGameState(mockCampaign, [{name: 'AI', isAi: true, goals: {wealth: 0, happiness: 0, education: 0, career: 0}}], 'node1', 'bundle');
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
    let state = createInitialGameState(mockCampaign, [{name: 'AI', isAi: true, goals: {wealth: 0, happiness: 0, education: 0, career: 0}}], 'node1', 'bundle');
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
    let state = createInitialGameState(mockCampaign, [{name: 'AI', isAi: true, goals: {wealth: 25, happiness: 25, education: 25, career: 25}}], 'node1', 'bundle');
    let aiPlayer = state.players[0];
    aiPlayer.inventory.freshFoodUnits = 10; 
    aiPlayer.rentPaidUntilWeek = 10; 
    aiPlayer.inventory.casualClothesWeeks = 10; 
    aiPlayer.money = 100;
    aiPlayer.hoursRemaining = 60;
    aiPlayer.currentJobId = 'job_clerk';
    aiPlayer.experience = 100;
    aiPlayer.dependability = 100; // Meets requirements for manager

    const actions = executeAITurn(aiPlayer, state, mockCampaign);
    
    // First action should be move to employment office
    expect(actions[0]).toEqual({ type: 'move', nodeId: 'node_employment_office' });
  });

  it('should just relax if not enough time for anything else', () => {
    let state = createInitialGameState(mockCampaign, [{name: 'AI', isAi: true, goals: {wealth: 0, happiness: 0, education: 0, career: 0}}], 'node1', 'bundle');
    let aiPlayer = state.players[0];
    aiPlayer.inventory.freshFoodUnits = 10; 
    aiPlayer.rentPaidUntilWeek = 10; 
    aiPlayer.inventory.casualClothesWeeks = 10; 
    aiPlayer.hoursRemaining = 1; // Not enough to move (2) or do anything. Must relax.

    const actions = executeAITurn(aiPlayer, state, mockCampaign);
    
    expect(actions.length).toBe(0);
  });
});
