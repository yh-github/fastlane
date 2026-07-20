import fs from 'fs';
import path from 'path';

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
import { generateDomain, generateProblem } from './generatePDDL';

async function main() {
  const campaign = await loadCampaign('1990_classic_cdrom');
  const state = createInitialGameState(
    campaign, 
    [{ name: 'AI', isAi: true, goals: { wealth: 50, happiness: 50, education: 50, career: 50 } }],
    'node_low_cost'
  );
  state.players[0].money = 200; // Force money

  const domainStr = generateDomain(campaign);
  const probStr = generateProblem(campaign, state, state.players[0]);

  fs.writeFileSync('/tmp/fastlane_domain.pddl', domainStr);
  fs.writeFileSync('/tmp/fastlane_prob.pddl', probStr);
  console.log('Saved to /tmp/fastlane_domain.pddl and /tmp/fastlane_prob.pddl');
}

main().catch(console.error);
