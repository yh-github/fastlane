import { describe, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { loadCampaign } from '../src/engine/dataLoader';
import { gameReducer } from '../src/engine/gameReducer';
import { processTurnStart } from '../src/engine/turnProcessor';
import { Random } from '../src/utils/rng';

describe('Death Spiral Analysis', () => {
  it('analyzes scratch/death_spiral.json', async () => {
    const replayPath = path.resolve('scratch/death_spiral.json');
    if (!fs.existsSync(replayPath)) return;
    const replayData = JSON.parse(fs.readFileSync(replayPath, 'utf8'));

    const campaign = await loadCampaign('advanced');

    let state = structuredClone(replayData.startingState);
    state.rules = { ...state.rules, ...campaign.config.gameRules };

    const logLines: string[] = [];
    const log = (...args: any[]) => logLines.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));

    let currentTurn = 1;

    for (let i = 0; i < replayData.steps.length; i++) {
      const step = replayData.steps[i];
      const player = state.players[0];

      if (step.action.type === 'end_turn') {
        log(`\n[Turn ${currentTurn} END] Cash: $${player.money}, LoanDebt: $${player.loanDebt || 0}, RentDebt: $${player.rentDebt || 0}, RentPaidUntil: Wk ${player.rentPaidUntilWeek}`);
        log(`  Phys: ${player.physicalCondition}/${player.physicalConditionMax} (Min: ${player.minPhysicalCondition}), Mental: ${player.mentalCondition}/${player.mentalConditionMax}`);
        log(`  Mess: ${player.mess}, Social: ${player.social}, Hours: ${player.hoursRemaining}`);
        log(`  Food: Fresh=${player.inventory?.freshFoodUnits}, Canned=${player.inventory?.cannedFoodUnits || 0}, FastFood=${player.inventory?.fastFoodItems?.length}`);
        log(`  Job: ${player.currentJobId}, Dep: ${player.dependability}, Position: ${player.position}`);

        const replayContext = {
          inDecisions: step.engineDecisions,
          outDecisions: []
        };

        state = processTurnStart(state, campaign, replayContext as any);
        currentTurn++;
        const pAfter = state.players[0];
        log(`>>> Turn ${currentTurn} START:`);
        const evtKeys = pAfter.turnEvents.map(e => `${e.key}${e.params ? `(${JSON.stringify(e.params)})` : ''}`).join(' | ');
        log(`  Events: ${evtKeys}`);
        log(`  Cash: $${pAfter.money}, LoanDebt: $${pAfter.loanDebt || 0}, RentDebt: $${pAfter.rentDebt || 0}`);
        log(`  Phys: ${pAfter.physicalCondition}/${pAfter.physicalConditionMax}, Mental: ${pAfter.mentalCondition}/${pAfter.mentalConditionMax}, Mess: ${pAfter.mess}`);
      } else {
        const context = {
          state,
          campaign,
          turn: currentTurn,
          economicIndex: state.economicIndex ?? 0,
          rng: new Random(state.rngState),
          rules: state.rules,
          engineDecisions: step.engineDecisions
        };
        const result = gameReducer(player, step.action, context as any);
        if (isNaN(result.updatedPlayer.money) && !isNaN(player.money)) {
          log(`!!! Money became NaN on Turn ${currentTurn}, action: ${JSON.stringify(step.action)} from: ${player.money}`);
        }
        state.players[0] = result.updatedPlayer;
        if (result.actionLog?.key?.startsWith('action.error')) {
          log(`  [Turn ${currentTurn}] ERROR: ${result.actionLog.key} - ${JSON.stringify(result.actionLog.params || {})}`);
        }
      }
    }

    fs.writeFileSync('/home/yoavh/.gemini/antigravity/brain/2c2d3430-845b-4f71-a6cd-b664704aff3a/scratch/death_spiral_log.txt', logLines.join('\n'), 'utf8');

    const finalP = state.players[0];
    console.log('\n=== FINAL SUMMARY ===');
    console.log(`Turn: ${currentTurn}, Job: ${finalP.currentJobId}, Dep: ${finalP.dependability}`);
    console.log(`Money: $${finalP.money}, LoanDebt: $${finalP.loanDebt}, RentDebt: $${finalP.rentDebt}`);
    console.log(`Phys: ${finalP.physicalCondition}/${finalP.physicalConditionMax}, Mental: ${finalP.mentalCondition}/${finalP.mentalConditionMax}`);
    console.log(`Mess: ${finalP.mess}, Social: ${finalP.social}`);
    console.log(`Inventory:`, JSON.stringify(finalP.inventory, null, 2));
  });
});
