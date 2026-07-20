import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { CampaignBundle } from '../dataLoader';
import { PlayerState, GameState } from '../gameState';
import { GameAction } from '../gameReducer';
import { generateDomain, generateProblem } from './generatePDDL';

const execAsync = promisify(exec);

export async function executeAITurnPDDL(
  player: PlayerState, 
  gameState: GameState, 
  campaign: CampaignBundle
): Promise<GameAction[]> {
  const domainPath = path.join('/tmp', `fastlane_domain_${player.id}.pddl`);
  const probPath = path.join('/tmp', `fastlane_prob_${player.id}.pddl`);

  const domainStr = generateDomain(campaign);
  const probStr = generateProblem(campaign, gameState, player);

  fs.writeFileSync(domainPath, domainStr);
  fs.writeFileSync(probPath, probStr);

  const enhspJar = path.join(process.cwd(), '../../external/ENHSP-Public/enhsp-dist/enhsp.jar');

  try {
    const { stdout, stderr } = await execAsync(`java -jar ${enhspJar} -o ${domainPath} -f ${probPath} -s gbfs`);
    const actions = parsePlan(stdout, campaign);
    if (actions.length === 0) {
      console.log("No actions parsed. Planner stdout:");
      console.log(stdout);
    }
    return actions;
  } catch (error: any) {
    console.error("ENHSP Execution failed:");
    console.error(error.stdout);
    console.error(error.stderr);
    return [];
  }
}

function parsePlan(stdout: string, campaign: CampaignBundle): GameAction[] {
  const lines = stdout.split('\n');
  let planStarted = false;
  const actions: GameAction[] = [];

  for (const line of lines) {
    if (line.startsWith('Found Plan:')) {
      planStarted = true;
      continue;
    }
    if (planStarted) {
      if (line.trim() === '' || line.startsWith('Plan-Length:')) {
        break; // End of plan
      }
      // Line format: 0.0: (action_name arg1 arg2)
      const match = line.match(/\d+\.\d+: \((.+)\)/);
      if (match) {
        const actionParts = match[1].split(' ');
        const actionName = actionParts[0];

        if (actionName === 'end_turn') {
          break; // Only return actions for the CURRENT turn
        }

        const gameAction = mapPddlActionToGameAction(actionName, actionParts.slice(1), campaign);
        if (gameAction) {
          actions.push(gameAction);
        }
      }
    }
  }

  return actions;
}

function mapPddlActionToGameAction(actionName: string, args: string[], campaign: CampaignBundle): GameAction | null {
  if (actionName === 'move') {
    return { type: 'move', nodeId: args[0] };
  }
  if (actionName === 'relax') {
    return { type: 'relax' };
  }
  if (actionName === 'buy_food') {
    const food = campaign.items.find(i => i.category === 'food' && i.subcategory === 'groceries');
    return food ? { type: 'buy', itemId: food.id } : null;
  }
  if (actionName === 'pay_rent') {
    return { type: 'rent_transaction', amount: 150 }; // Hardcoded 150 for test or fetch from state in real usage
  }
  if (actionName.startsWith('buy_clothes_')) {
    const itemId = actionName.replace('buy_clothes_', '');
    return { type: 'buy', itemId };
  }
  if (actionName.startsWith('work_')) {
    const jobId = actionName.replace('work_', '');
    return { type: 'work', jobId };
  }
  if (actionName.startsWith('apply_')) {
    const jobId = actionName.replace('apply_', '');
    return { type: 'apply', jobId };
  }
  if (actionName.startsWith('enroll_')) {
    const degreeId = actionName.replace('enroll_', '');
    return { type: 'enroll', degreeId };
  }
  if (actionName.startsWith('study_')) {
    const degreeId = actionName.replace('study_', '');
    return { type: 'study', degreeId };
  }
  
  return null;
}
