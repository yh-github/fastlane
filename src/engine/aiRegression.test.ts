import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { loadCampaign } from './dataLoader';
import { createInitialGameState } from './gameState';
import { processTurnStart } from './turnProcessor';
import { gameReducer } from './gameReducer';
import { executeAITurn } from './aiEngine';
import { executeAITurnPDDL } from './pddl/runENHSP';
import { Random } from '../utils/rng';

describe('Full-Game AI Integration Regression', () => {
  beforeEach(() => {
    // We do NOT mock Math.random here either. We rely on the deterministic Random class
    // seeded properly in the test.
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs a deterministic 2-player game for 200 turns using standard AI without crashing', async () => {
    // 1. Load the real campaign data directly (vitest setup handles this via happy-dom or node fetch polyfill)
    const campaign = await loadCampaign('qol_improved');

    // 2. Initialize 2 players
    const initialPlayers = [
      { name: 'AI_Player1', isAi: true, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } },
      { name: 'AI_Player2', isAi: true, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }
    ];

    let currentState = createInitialGameState(campaign, initialPlayers, 'node_low_cost', {}, 1337);

    // Fast-forward phase to 'playing'
    currentState = { ...currentState, phase: 'playing' };

    let turnsPassed = 0;
    const MAX_TURNS = 200;

    while (turnsPassed < MAX_TURNS && currentState.phase !== 'game-over') {
      // Each player acts until their hours are 0
      for (let i = 0; i < currentState.players.length; i++) {
        let player = currentState.players[i];
        
        let attempts = 0; // prevent infinite loop if AI gets stuck
        while (player.hoursRemaining > 0 && attempts < 20) {
          attempts++;
          
          let actions = executeAITurn(player, currentState, campaign);
          if (turnsPassed >= 90) console.log(`Turn ${turnsPassed}, Player ${player.name}, Actions:`, actions);
          
          if (actions.length === 0) {
            // AI decided to do nothing, force end of their turn
            player = { ...player, hoursRemaining: 0 };
            currentState.players[i] = player;
            break;
          }

          // Execute the first action returned by the AI
          const action = actions[0];
          
          const context = {
            campaign,
            rules: currentState.rules,
            turn: currentState.turn,
            economicIndex: currentState.economicIndex,
            rng: new Random(currentState.rngState),
            state: currentState
          };

          const result = gameReducer(player, action, context);
          
          // Update player and state
          player = result.updatedPlayer;
          currentState.players[i] = player;
          currentState = {
            ...currentState,
            rngState: context.rng.getState(),
            pawnShopItemsForSale: result.updatedPawnShopItemsForSale ?? currentState.pawnShopItemsForSale
          };
        }
      }

      // Advance turn
      currentState = processTurnStart(currentState, campaign);
      turnsPassed++;
    }

    console.log("FINAL STATE AFTER 100 TURNS:");
    console.log(currentState.players.map(p => ({
        money: p.money,
        exp: p.experience,
        deg: p.degrees.length,
        dep: p.dependability,
        happiness: p.happiness,
        hasWon: p.hasWon,
        nakedTurns: p.nakedTurns
    })));

    // Assert that the AI successfully won the game
    expect(currentState.phase).toBe('game-over');
    
    for (const player of currentState.players) {
      // The AI should not go bankrupt within 10 turns
      expect(player.money).toBeGreaterThanOrEqual(0);
      // The AI should have successfully found some housing/jobs/actions
      expect(player.nakedTurns).toBe(0);
    }
  }, 120000); // 120 second timeout for the Java planner overhead
});
