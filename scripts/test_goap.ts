import { executeAITurn } from './src/engine/aiEngine.ts';
import { createInitialGameState } from './src/engine/gameState.ts';

const mockCampaign = {
    items: [
      { id: 'food_1week', basePrice: 55, category: 'food', subcategory: 'fresh_food', store: 'blacks_market' },
      { id: 'casual_clothes', basePrice: 35, category: 'clothes', subcategory: 'casual', store: 'department_store' }
    ],
    jobs: [
      { id: 'job_clerk', baseWage: 4, requirements: { experience: 0, dependability: 0, degrees: [] }, locationId: 'building_clerk' },
      { id: 'job_manager', baseWage: 10, requirements: { experience: 10, dependability: 10, degrees: [] } }
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
  };

  let state = createInitialGameState(mockCampaign, [{name: 'AI', isAi: true, goals: {wealth: 0, happiness: 0, education: 0, career: 0}}], 'node1', 'bundle');
  let aiPlayer = state.players[0];
  aiPlayer.inventory.freshFoodUnits = 10; 
  aiPlayer.rentPaidUntilWeek = 0; 
  state.turn = 0;
  aiPlayer.money = 200;
  aiPlayer.currentRentPrice = 150;
  aiPlayer.hoursRemaining = 60;

  const actions = executeAITurn(aiPlayer, state, mockCampaign);
  console.log("CHOSEN ACTION:", actions);
