import { describe, it, expect, vi } from 'vitest';
import { applyForJob, workShift } from './jobEngine';
import { createInitialGameState } from './gameState';
import type { JobDef } from './dataLoader';

describe('jobEngine', () => {
  describe('applyForJob', () => {
    it('always succeeds for burger_cook', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      let player = state.players[0];
      
      const job: JobDef = {
        id: 'burger_cook',
        title: 'Burger Cook',
        baseWage: 4,
        requirements: { experience: 10, dependability: 20, degrees: [], uniform: 'casual' }
      };
      
      const result = applyForJob(player, job);
      expect(result.success).toBe(true);
      expect(result.updated.currentJobId).toBe('burger_cook');
      expect(result.updated.currentWage).toBe(4);
    });

    it('rejects if player lacks experience', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      let player = state.players[0];
      player.experience = 10;
      
      const job: JobDef = {
        id: 'manager',
        title: 'Manager',
        baseWage: 20,
        requirements: { experience: 50, dependability: 50, degrees: [], uniform: 'business' }
      };
      
      const result = applyForJob(player, job);
      expect(result.success).toBe(false);
      expect(result.message).toContain('experience');
    });

    it('fails randomly based on luck', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      let player = state.players[0];
      player.experience = 50;
      player.dependability = 50;
      
      const job: JobDef = {
        id: 'clerk',
        title: 'Clerk',
        baseWage: 10,
        requirements: { experience: 10, dependability: 20, degrees: [], uniform: 'casual' }
      };
      
      // Luck is 40 + 50 + 50 = 140. We need luck to be less than roll for it to fail.
      // But max roll is 100, so luck 140 means it NEVER fails.
      vi.spyOn(Math, 'random').mockReturnValue(0.99); // roll = 100
      let result = applyForJob(player, job);
      expect(result.success).toBe(true);

      // What if luck is 70? (base 40 + exp 10 + dep 20) => 70. Roll 100 > 70, so it fails.
      player.experience = 10;
      player.dependability = 20;
      result = applyForJob(player, job);
      expect(result.success).toBe(false);
      expect(result.message).toContain('hire someone else');
    });
  });

  describe('workShift', () => {
    it('calculates prorated wages', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      let player = state.players[0];
      player.currentJobId = 'job1';
      player.currentWage = 10;
      player.hoursRemaining = 3; // Partial shift (3 out of 6)
      player.inventory.selectedClothes = 'casual';
      player.inventory.casualClothesWeeks = 4;
      
      const job: JobDef = {
        id: 'job1',
        title: 'Job 1',
        baseWage: 10,
        requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' }
      };
      
      const result = workShift(player, job);
      expect(result.success).toBe(true);
      
      // Full shift wage: 10 * 8 = 80.
      // Prorated: 80 * (3 / 6) = 40.
      expect(result.wagesEarned).toBe(40);
    });

    it('rejects if clothes are inadequate', () => {
      let state = createInitialGameState('test', [{name: 'Test', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
      let player = state.players[0];
      player.currentJobId = 'job1';
      player.inventory.selectedClothes = 'casual';
      player.inventory.casualClothesWeeks = 4;
      
      const job: JobDef = {
        id: 'job1',
        title: 'Job 1',
        baseWage: 10,
        requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'business' }
      };
      
      const result = workShift(player, job);
      expect(result.success).toBe(false);
      expect(result.wagesEarned).toBe(0);
      expect(result.message).toContain('need business clothes');
    });
  });
});
