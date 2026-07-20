import fs from 'fs';
import path from 'path';

// Mock fetch for local testing
global.fetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const urlStr = url.toString();
  const filePath = path.join(process.cwd(), 'public', urlStr);
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return {
      ok: true,
      status: 200,
      json: async () => JSON.parse(data),
      headers: new Headers({ 'content-type': 'application/json' })
    } as Response;
  } catch (e: any) {
    return {
      ok: false,
      status: 404,
      statusText: e.message
    } as Response;
  }
};

import { loadCampaign } from '../dataLoader';
import { createInitialGameState } from '../gameState';
import { gameReducer, ReducerContext } from '../gameReducer';
import { executeAITurnPDDL } from './runENHSP';
import { processTurnStart } from '../turnProcessor';
import { Random } from '../../utils/rng';

async function main() {
  console.log("Loading campaign...");
  const campaign = await loadCampaign('1990_classic_cdrom');
  
  let state = createInitialGameState(
    campaign, 
    [{ name: 'AI', isAi: true, goals: { wealth: 50, happiness: 50, education: 50, career: 50 } }],
    'node_low_cost'
  );
  state.phase = 'playing'; // ensure we are in playing phase

  console.log("Starting simulation with ENHSP...");

  for (let turn = 1; turn <= 10; turn++) {
    const player = state.players[0];
    console.log(`\n--- Turn ${turn} ---`);
    console.log(`Initial Stats: Hours=${player.hoursRemaining}, Money=$${player.money}, Happiness=${player.happiness}`);
    
    console.log("Planning...");
    const actions = await executeAITurnPDDL(player, state, campaign);
    
    if (actions.length === 0) {
      console.log("AI returned no actions! (Planner might have skipped the turn)");
    } else {
      console.log("Executing planned actions:");
      for (const action of actions) {
        console.log(` -> ${JSON.stringify(action)}`);
        const context: ReducerContext = {
          campaign,
          rules: state.rules,
          turn: state.turn,
          economicIndex: state.economicIndex,
          rng: new Random(123),
          state
        };
        const result = gameReducer(state.players[0], action, context);
        state.players[0] = result.updatedPlayer;
        if (state.players[0].hoursRemaining <= 0) break;
      }
    }
    
    console.log("Ending turn...");
    state = processTurnStart(state, campaign, new Random(123)); // For next turn


    const updatedPlayer = state.players[0];
    console.log(`End Stats: Money=$${updatedPlayer.money}, Happiness=${updatedPlayer.happiness}, Exp=${updatedPlayer.experience}, Dep=${updatedPlayer.dependability}`);
    
    if (updatedPlayer.happiness >= 52) {
      console.log("Goal Reached! (Happiness >= 52)");
      break;
    }
  }
}

main().catch(console.error);
