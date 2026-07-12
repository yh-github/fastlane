// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { executeAITurn } from './aiEngine';
import { createInitialGameState } from './gameState';
import type { CampaignBundle } from './dataLoader';

describe('AI Engine', () => {
  const mockCampaign = {
    items: [
      { id: 'food_1week', basePrice: 55 },
      { id: 'casual_clothes', basePrice: 35 }
    ],
    jobs: [
      { id: 'job_clerk', baseWage: 4, requirements: { experience: 0, dependability: 0, degrees: [] } },
      { id: 'job_manager', baseWage: 10, requirements: { experience: 10, dependability: 10, degrees: [] } }
    ],
    config: {
      name: 'test',
      startingMoney: 200,
      timeRules: { hoursPerTurn: 60 }
    }
  } as unknown as CampaignBundle;

  it('should buy food if starving and has money', () => {
    let state = createInitialGameState(mockCampaign, [{name: 'AI', isAi: true, goals: {wealth: 0, happiness: 0, education: 0, career: 0}}], 'node1', 'bundle');
    let aiPlayer = state.players[0];
    aiPlayer.inventory.freshFoodUnits = 0;
    aiPlayer.money = 100;
    aiPlayer.hoursRemaining = 60;

    const actions = executeAITurn(aiPlayer, state, mockCampaign);
    
    // The first action should be buying food
    expect(actions[0]).toEqual({ type: 'buy', itemId: 'food_1week' });
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
    
    expect(actions[0]).toEqual({ type: 'rent_transaction', amount: 150 });
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
    
    expect(actions[0]).toEqual({ type: 'buy', itemId: 'casual_clothes' });
  });

  it('should apply for a better job if possible', () => {
    let state = createInitialGameState(mockCampaign, [{name: 'AI', isAi: true, goals: {wealth: 0, happiness: 0, education: 0, career: 0}}], 'node1', 'bundle');
    let aiPlayer = state.players[0];
    aiPlayer.inventory.freshFoodUnits = 10; 
    aiPlayer.rentPaidUntilWeek = 10; 
    aiPlayer.inventory.casualClothesWeeks = 10; 
    aiPlayer.money = 50;
    aiPlayer.hoursRemaining = 60;
    aiPlayer.currentJobId = 'job_clerk';
    aiPlayer.experience = 20;
    aiPlayer.dependability = 20; // Meets requirements for manager

    const actions = executeAITurn(aiPlayer, state, mockCampaign);
    
    // First action should be apply for manager, then work the old job
    expect(actions[0]).toEqual({ type: 'apply', jobId: 'job_manager' });
    expect(actions[1]).toEqual({ type: 'work', jobId: 'job_clerk' });
  });

  it('should just relax if not enough time for anything else', () => {
    let state = createInitialGameState(mockCampaign, [{name: 'AI', isAi: true, goals: {wealth: 0, happiness: 0, education: 0, career: 0}}], 'node1', 'bundle');
    let aiPlayer = state.players[0];
    aiPlayer.inventory.freshFoodUnits = 10; 
    aiPlayer.rentPaidUntilWeek = 10; 
    aiPlayer.inventory.casualClothesWeeks = 10; 
    aiPlayer.hoursRemaining = 3; // Not enough to apply (4) or work (6)

    const actions = executeAITurn(aiPlayer, state, mockCampaign);
    
    expect(actions[0]).toEqual({ type: 'relax' });
  });
});
