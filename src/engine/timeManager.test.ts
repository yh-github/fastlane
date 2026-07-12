import { describe, it, expect } from 'vitest';
import { canAffordAction, spendHours, resetPlayerClock, isGameOver } from './timeManager';
import { createInitialGameState } from './gameState';

describe('timeManager', () => {
  const mockCampaign = { config: { name: 'test', startingMoney: 200, timeRules: { hoursPerTurn: 60 } } } as any;

  it('canAffordAction non-strict', () => {
    let state = createInitialGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
    let player = state.players[0];
    
    player.hoursRemaining = 2;
    expect(canAffordAction(player, 6, false)).toBe(true);
    
    player.hoursRemaining = 0;
    expect(canAffordAction(player, 6, false)).toBe(false);
    expect(canAffordAction(player, 0, false)).toBe(true); // 0 cost is always allowed
  });

  it('canAffordAction strict', () => {
    let state = createInitialGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
    let player = state.players[0];
    
    player.hoursRemaining = 2;
    expect(canAffordAction(player, 6, true)).toBe(false);
    
    player.hoursRemaining = 6;
    expect(canAffordAction(player, 6, true)).toBe(true);
  });

  it('spendHours drops minimum to 0', () => {
    let state = createInitialGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
    let player = state.players[0];
    
    player.hoursRemaining = 2;
    const updated = spendHours(player, 6);
    expect(updated.hoursRemaining).toBe(0);
  });

  it('spendHours does not spend if already 0', () => {
    let state = createInitialGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
    let player = state.players[0];
    
    player.hoursRemaining = 0;
    const updated = spendHours(player, 6);
    expect(updated).toBe(player); // Reference equality check
    
    // Spend 0 hours when at 0 hours remaining
    const updatedZero = spendHours(player, 0);
    expect(updatedZero).toBe(player); // Reference equality check
  });

  it('resetPlayerClock applies caffeine debt', () => {
    let state = createInitialGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
    let player = state.players[0];
    
    player.turnFlags.caffeineDebt = 5;
    const updated = resetPlayerClock(player, 60);
    expect(updated.hoursRemaining).toBe(55);
    expect(updated.turnFlags.caffeineDebt).toBe(0);
  });

  it('isGameOver', () => {
    let state = createInitialGameState(mockCampaign, [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
    
    state.turn = 10;
    expect(isGameOver(state, 0)).toBe(false); // 0 means no limit
    expect(isGameOver(state, 20)).toBe(false);
    expect(isGameOver(state, 5)).toBe(true);
  });
});
