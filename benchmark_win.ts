import { loadCampaign } from './src/engine/dataLoader.js';
import { createInitialGameState } from './src/engine/gameState.js';
import { processTurnStart } from './src/engine/turnProcessor.js';
import { gameReducer } from './src/engine/gameReducer.js';
import { executeAITurn } from './src/engine/aiEngine.js';
import { Random } from './src/utils/rng.js';
import * as fs from 'fs';
import * as path from 'path';

// Override fetch in dataLoader for the benchmark script to read local files
(global as any).fetch = async (url: string) => {
  const filePath = path.join(process.cwd(), 'public', url);
  if (!fs.existsSync(filePath)) {
    return { ok: false, status: 404 };
  }
  const data = fs.readFileSync(filePath, 'utf8');
  return {
    ok: true,
    headers: {
      get: (name: string) => name === 'content-type' ? 'application/json' : null
    },
    json: async () => JSON.parse(data)
  };
};

async function runBenchmark() {
  const campaign = await loadCampaign('qol_improved');
  
  const initialPlayers = [
    { name: 'AI_Player1', isAi: true, goals: { wealth: 50, happiness: 50, education: 50, career: 50 } }
  ];

  let currentState = createInitialGameState(campaign, initialPlayers, 'node_low_cost', {}, 1337);
  currentState = { ...currentState, phase: 'playing' };

  const MAX_TURNS = 40;
  let turnsPassed = 0;

  console.log("Starting benchmark for 40 turns (single player) on REAL CAMPAIGN...");
  const startTime = performance.now();

  while (turnsPassed < MAX_TURNS && currentState.phase !== 'game-over') {
    for (let i = 0; i < currentState.players.length; i++) {
      let player = currentState.players[i];
      let attempts = 0;
      
      while (player.hoursRemaining > 0 && attempts < 20) {
        attempts++;
        const actions = executeAITurn(player, currentState, campaign);
        
        if (actions.length === 0) {
          player = { ...player, hoursRemaining: 0 };
          currentState.players[i] = player;
          break;
        }

        const action = actions[0];
        
        // Log actions for debugging
        if (turnsPassed < 40) {
           console.log(`[Turn ${turnsPassed}] Action: ${action.type}`, action);
        }

        const context = {
          campaign: campaign,
          rules: currentState.rules,
          turn: currentState.turn,
          economicIndex: currentState.economicIndex,
          rng: new Random(currentState.rngState),
          state: currentState
        };

        const result = gameReducer(player, action, context);
        player = result.updatedPlayer;
        currentState.players[i] = player;
        currentState = {
          ...currentState,
          rngState: context.rng.getState(),
          pawnShopItemsForSale: result.updatedPawnShopItemsForSale ?? currentState.pawnShopItemsForSale
        };
      }
      
      if (turnsPassed < 40) {
        console.log(`--- End of Turn ${turnsPassed} --- Money: ${player.money}, Exp: ${player.experience}, Dep: ${player.dependability}, Happiness: ${player.happiness}, Edu: ${player.degrees.length}`);
      }
      
      if (player.hasWon) {
        console.log(`\nAI WON THE GAME IN ${turnsPassed} TURNS!`);
        return;
      }
    }
    currentState = processTurnStart(currentState, campaign);
    turnsPassed++;
  }

  console.log(`\nBenchmark Complete. AI failed to win within ${MAX_TURNS} turns.`);
}

runBenchmark().catch(console.error);
