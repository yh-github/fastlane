import { createInitialGameState } from './src/engine/gameState.js';
import { processTurnStart } from './src/engine/turnProcessor.js';
import { gameReducer } from './src/engine/gameReducer.js';
import { executeAITurn } from './src/engine/aiEngine.js';
import { Random } from './src/utils/rng.js';

// Define a minimal valid mock campaign
const mockCampaign: any = {
  buildings: [],
  map: { width: 1000, height: 1000, nodes: [
    { id: 'node_low_cost', x: 0, y: 0, connections: ['node_blacks_market', 'node_rent_office', 'node_employment_office'] },
    { id: 'node_blacks_market', x: 0, y: 0, connections: ['node_low_cost'] },
    { id: 'node_rent_office', x: 0, y: 0, connections: ['node_low_cost'] },
    { id: 'node_employment_office', buildingId: 'building_emp', x: 0, y: 0, connections: ['node_low_cost'] },
    { id: 'node_department_store', x: 0, y: 0, connections: ['node_low_cost'] }
  ]},
  items: [
    { id: 'item_food', name: 'Groceries', basePrice: 10, type: 'food', nutrition: 14 }
  ],
  jobs: [
    { id: 'job_clerk', baseWage: 4, requirements: { experience: 0, dependability: 0, degrees: [] }, buildingId: 'building_clerk' },
    { id: 'job_manager', baseWage: 10, requirements: { experience: 10, dependability: 10, degrees: [] } }
  ],
  config: {
    name: 'test',
    version: '1.0',
    description: 'test',
    startingMoney: 100,
    startingNode: 'node_low_cost',
    startingJob: 'job_clerk',
    timeRules: { relaxCost: 6 }
  },
  rules: {
    rentDueWeeks: 4,
    clothesWearOutWeeks: 10,
    foodNutritionUnits: 14,
    lotteryTicketPrice: 1,
    lotteryWinAmount: 100
  },
  weekends: {
    randomWeekends: [],
    requiredWeekends: []
  }
};

async function runBenchmark() {
  const initialPlayers = [
    { name: 'AI_Player1', isAi: true, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }
  ];

  let currentState = createInitialGameState(mockCampaign, initialPlayers, 'node_low_cost', {}, 1337);
  currentState = { ...currentState, phase: 'playing' };

  const MAX_TURNS = 200;
  let turnsPassed = 0;

  console.log("Starting benchmark for 200 turns (single player)...");
  const startTime = performance.now();

  while (turnsPassed < MAX_TURNS && currentState.phase !== 'game-over') {
    for (let i = 0; i < currentState.players.length; i++) {
      let player = currentState.players[i];
      let attempts = 0;
      
      while (player.hoursRemaining > 0 && attempts < 20) {
        attempts++;
        const actions = executeAITurn(player, currentState, mockCampaign);
        
        if (actions.length === 0) {
          player = { ...player, hoursRemaining: 0 };
          currentState.players[i] = player;
          break;
        }

        const action = actions[0];
        const context = {
          campaign: mockCampaign,
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
    }
    currentState = processTurnStart(currentState, mockCampaign);
    turnsPassed++;
  }

  const endTime = performance.now();
  const timeMs = endTime - startTime;
  
  console.log(`\nBenchmark Complete!`);
  console.log(`Total Turns Played: ${turnsPassed}`);
  console.log(`Total Time: ${(timeMs / 1000).toFixed(2)} seconds`);
  console.log(`Speed: ${(turnsPassed / (timeMs / 1000)).toFixed(2)} turns/sec`);
}

runBenchmark().catch(console.error);
