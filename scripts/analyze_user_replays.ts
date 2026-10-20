import fs from 'fs';
import path from 'path';

// Polyfill fetch for node
global.fetch = async (url: string | URL | Request): Promise<Response> => {
  const urlStr = url.toString();
  if (urlStr.startsWith('/campaigns/')) {
    const filePath = path.join(process.cwd(), 'public', urlStr);
    if (!fs.existsSync(filePath)) {
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: { get: () => null }
      } as any;
    }
    const data = await fs.promises.readFile(filePath, 'utf-8');
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => JSON.parse(data),
      text: async () => data,
    } as any;
  }
  throw new Error(`Unhandled fetch: ${urlStr}`);
};

import { loadCampaign } from '../src/engine/dataLoader';
import { gameReducer } from '../src/engine/gameReducer';
import { processTurnStart } from '../src/engine/turnProcessor';
import { type ReplayData, type ReplayContext } from '../src/engine/replayTypes';
import { Random } from '../src/utils/rng';

const REPLAY_FILES = [
  {
    name: 'Replay 1 (Advanced, 750 steps, Seed 432857444)',
    path: '/home/yoavh/.gemini/antigravity/brain/51287c3d-e1fb-4c95-9d09-8b53b0dba752/.user_uploaded/media_1792484304339_dac259c9.json',
    campaignId: 'advanced'
  },
  {
    name: 'Replay 2 (Advanced, 620 steps, Seed 1542545223)',
    path: '/home/yoavh/.gemini/antigravity/brain/51287c3d-e1fb-4c95-9d09-8b53b0dba752/.user_uploaded/media_1792484304339_1571cc56.json',
    campaignId: 'advanced'
  },
  {
    name: 'Replay 3 (QoL Improved, 391 steps, Seed 1661367310)',
    path: '/home/yoavh/.gemini/antigravity/brain/51287c3d-e1fb-4c95-9d09-8b53b0dba752/.user_uploaded/media_1792484304339_90e501b6.json',
    campaignId: 'qol_improved'
  }
];

async function analyzeReplay(replayConfig: typeof REPLAY_FILES[0]) {
  console.log(`\n========================================================================`);
  console.log(`ANALYZING: ${replayConfig.name}`);
  console.log(`========================================================================`);

  const replayData: ReplayData = JSON.parse(fs.readFileSync(replayConfig.path, 'utf8'));
  const campaign = await loadCampaign(replayConfig.campaignId);
  let currentState = replayData.startingState;

  let currentTurn = currentState.turn;
  let workCountThisTurn = 0;
  let coastCountThisTurn = 0;

  const logTurnHeader = () => {
    const p = currentState.players[0];
    const econIdx = currentState.economicIndex;
    const econTrend = currentState.economicTrend;
    const simGoods = currentState.economySimulation?.goods?.reading;
    const simMain = currentState.economySimulation?.main?.reading;
    console.log(`\n[Week ${currentState.turn}] Econ: ${econIdx} (trend ${econTrend}, goodsReading ${simGoods}, mainReading ${simMain}) | Job: ${p.currentJobId ?? 'NONE'} @ $${p.currentWage}/hr | Dep: ${p.dependability} | Exp: ${p.experience} | Ment: ${p.mentalCondition ?? p.happiness} | Phys: ${p.physicalCondition ?? 'N/A'} | Cash: $${p.money}`);
  };

  logTurnHeader();

  for (let i = 0; i < replayData.steps.length; i++) {
    const step = replayData.steps[i];
    const action = step.action;

    if (action.type === 'end_turn') {
      const replayCtx: ReplayContext = { inDecisions: step.engineDecisions || [], outDecisions: [] };
      currentState = processTurnStart(currentState, campaign, replayCtx);
      
      const p = currentState.players[0];
      // Check turn events for interesting occurrences
      if (p.turnEvents && p.turnEvents.length > 0) {
        for (const ev of p.turnEvents) {
          if (ev.key.includes('Crash') || ev.key.includes('Boom') || ev.key.includes('job') || ev.key.includes('wage') || ev.key.includes('fired')) {
            console.log(`   ★ TurnEvent: ${ev.key}`, ev.params || '');
          }
        }
      }
      logTurnHeader();
    } else {
      const player = currentState.players[0];
      const prevJob = player.currentJobId;
      const prevWage = player.currentWage;
      const prevDep = player.dependability;
      const prevMent = player.mentalCondition;

      const replayCtx: ReplayContext = { inDecisions: step.engineDecisions || [], outDecisions: [] };
      const context = {
        campaign,
        rules: currentState.rules,
        turn: currentState.turn,
        economicIndex: currentState.economicIndex,
        rng: new Random(currentState.rngState),
        state: currentState,
        replayContext: replayCtx
      };

      const { updatedPlayer, updatedPawnShopItemsForSale, actionLog } = gameReducer(player, action as any, context);

      currentState = {
        ...currentState,
        rngState: context.rng.getState(),
        pawnShopItemsForSale: updatedPawnShopItemsForSale ?? currentState.pawnShopItemsForSale,
        players: [updatedPlayer]
      };

      // Check if job changed
      if (action.type === 'apply') {
        const success = updatedPlayer.currentJobId === (action as any).jobId && prevJob !== updatedPlayer.currentJobId;
        const raiseSuccess = (action as any).jobId === prevJob && updatedPlayer.currentWage > prevWage;
        console.log(`   -> Action: apply for ${(action as any).jobId} (offered: $${(action as any).offeredWage}/hr) => ${success ? 'HIRED!' : (raiseSuccess ? `RAISE APPROVED ($${updatedPlayer.currentWage}/hr)` : 'REJECTED/SAME')}, log: ${JSON.stringify(actionLog)}`);
      } else if (action.type === 'work') {
        const mode = (action as any).mode || 'work_work';
        const fired = prevJob !== null && updatedPlayer.currentJobId === null;
        if (fired) {
          console.log(`   🚨 FIRED DURING WORK! Action: work ${(action as any).jobId} [mode: ${mode}] | Dep was ${prevDep} -> ${updatedPlayer.dependability}, Ment was ${prevMent} -> ${updatedPlayer.mentalCondition} (diff: ${(updatedPlayer.mentalCondition ?? 0) - (prevMent ?? 0)}) | actionLog: ${JSON.stringify(actionLog)}`);
        } else if (mode === 'look_busy') {
          console.log(`   .. Coast (look_busy) on ${(action as any).jobId} | Dep: ${prevDep} -> ${updatedPlayer.dependability}`);
        }
      }
    }
  }

  console.log(`\nFinal state of ${replayConfig.name}:`);
  const finalP = currentState.players[0];
  console.log(`Turn: ${currentState.turn}, Winner: ${currentState.winnerId}, Money: $${finalP.money}, Savings: $${finalP.bankSavings}, Job: ${finalP.currentJobId} @ $${finalP.currentWage}/hr, Econ: ${currentState.economicIndex}`);
}

async function run() {
  for (const r of REPLAY_FILES) {
    await analyzeReplay(r);
  }
}

run().catch(console.error);
