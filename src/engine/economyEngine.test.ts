import { describe, it, expect } from 'vitest';
import { calcEconomyPrice, fluctuateEconomy, applyMarketCrash, processRentDebt, calcStockPrice } from './economyEngine';
import { createInitialGameState, type PlayerState } from './gameState';

describe('economyEngine', () => {
  describe('calcEconomyPrice', () => {
    it('calculates price at 0 index', () => {
      expect(calcEconomyPrice(100, 0)).toBe(100);
    });

    it('calculates price at boom index', () => {
      expect(calcEconomyPrice(100, 60)).toBe(200);
      expect(calcEconomyPrice(100, 90)).toBe(250);
    });

    it('calculates price at depression index', () => {
      expect(calcEconomyPrice(100, -30)).toBe(50);
    });
  });

  describe('fluctuateEconomy', () => {
    it('keeps within bounds', () => {
      expect(fluctuateEconomy(90)).toBeLessThanOrEqual(90);
      expect(fluctuateEconomy(-30)).toBeGreaterThanOrEqual(-30);
    });
  });

  describe('applyMarketCrash', () => {
    it('minor crash penalizes happiness', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      let player = state.players[0];
      player.happiness = 50;
      
      player = applyMarketCrash('minor', player);
      expect(player.happiness).toBe(49);
    });

    it('major crash wipes savings and jobs', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      let player = state.players[0];
      player.happiness = 50;
      player.bankSavings = 5000;
      player.currentJobId = 'job1';
      player.currentWage = 500;
      player.raisesAtCurrentJob = 2;
      
      player = applyMarketCrash('major', player);
      
      expect(player.bankSavings).toBe(0);
      expect(player.currentJobId).toBeNull();
      expect(player.currentWage).toBe(0);
      expect(player.raisesAtCurrentJob).toBe(0);
      expect(player.happiness).toBe(40); // 50 - 3 (no stocks) - 7 (lost job)
    });
  });

  describe('processRentDebt', () => {
    it('returns unmodified player if no debt', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      let player = state.players[0];
      player.rentDebt = 0;
      
      const [updated, netWage] = processRentDebt(player, 100);
      expect(updated.rentDebt).toBe(0);
      expect(netWage).toBe(100);
    });

    it('garnishes 50% and adds $2 fee if partial payment', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      let player = state.players[0];
      player.rentDebt = 100;
      
      const [updated, netWage] = processRentDebt(player, 50); // 50% = 25 garnished
      // 100 - 25 = 75 + 2 = 77
      expect(updated.rentDebt).toBe(77);
      expect(netWage).toBe(25);
    });

    it('pays off fully without fee if garnished exceeds debt', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      let player = state.players[0];
      player.rentDebt = 20;
      
      const [updated, netWage] = processRentDebt(player, 100); // 50% = 50 garnished, which > 20
      expect(updated.rentDebt).toBe(0);
      expect(netWage).toBe(80); // 100 - 20
    });
  });
});
