import fs from 'fs'
import path from 'path'
import { loadCampaign } from './src/engine/dataLoader'
import { createInitialGameState, GameState, createDefaultGoalAllotment } from './src/engine/gameState'
import { executeAITurn } from './src/engine/aiEngine'
import { gameReducer } from './src/engine/gameReducer'
import { processTurnStart } from './src/engine/turnProcessor'

// Polyfill fetch for node
const originalFetch = global.fetch;
global.fetch = async (url: string | URL | globalThis.Request, init?: RequestInit): Promise<Response> => {
  const urlStr = url.toString();
  if (urlStr.startsWith('/campaigns/')) {
    const filePath = path.join(process.cwd(), 'public', urlStr);
    try {
      const data = await fs.promises.readFile(filePath, 'utf-8');
      return {
        ok: true,
        json: async () => JSON.parse(data),
        text: async () => data,
        headers: new Headers({ 'content-type': 'application/json' }),
        status: 200,
        statusText: 'OK'
      } as any;
    } catch (e) {
      return { ok: false, status: 404, statusText: 'Not Found' } as any;
    }
  }
  return originalFetch(url, init);
};

import { Random } from './src/utils/rng'

async function runAIGame() {
  const campaign = await loadCampaign('qol_improved')
  
  // Create state with goals all at 50%
  const goals = { wealth: 50, happiness: 50, education: 50, career: 50 }
  const housingNode = campaign.housing[0]?.homeNodeId || campaign.map.nodes[0].id
  let state = createInitialGameState(campaign, [{ name: 'AI Player', isAi: true, goals }], housingNode, {}, 12345)
  state.phase = 'playing'

  console.log(`Starting game with goals: W:${goals.wealth} H:${goals.happiness} E:${goals.education} C:${goals.career}`)
  
  const MAX_TURNS = 40
  let turnsPassed = 0
  
  while (turnsPassed < MAX_TURNS && state.phase !== 'game-over') {
    let player = state.players[0]
    let attempts = 0
    
    while (player.hoursRemaining > 0 && attempts < 40) {
      attempts++
      let actions = executeAITurn(player, state, campaign)
      
      if (actions.length === 0) {
        player = { ...player, hoursRemaining: 0 }
        state.players[0] = player
        break
      }

      const action = actions[0]
      const context = {
        campaign,
        rules: state.rules,
        turn: state.turn,
        economicIndex: state.economicIndex,
        rng: new Random(state.rngState),
        state: state
      }

      const result = gameReducer(player, action, context)
      
      player = result.updatedPlayer
      state.players[0] = player
      state = {
        ...state,
        rngState: context.rng.getState(),
        pawnShopItemsForSale: result.updatedPawnShopItemsForSale ?? state.pawnShopItemsForSale
      }
    }

    state = processTurnStart(state, campaign)
    turnsPassed++
  }

  const p = state.players[0]
  if (p.hasWon) {
    console.log(`\n🎉 WON THE GAME IN ${turnsPassed} WEEKS! 🎉`)
  } else {
    console.log(`\n❌ Did not win within 40 weeks. Stopped at week ${turnsPassed}.`)
  }
  
  console.log(`Final Money: $${p.money}`)
  console.log(`Final Happiness: ${p.happiness}`)
  console.log(`Final Degrees: ${p.degrees.length}`)
  console.log(`Final Job: ${p.currentJobId}`)
}

runAIGame().catch(console.error)
