import { describe, it, expect } from 'vitest';
import { loadCampaign, type CampaignBundle } from '../src/engine/dataLoader';
import { createInitialGameState, type GameState, type PlayerState } from '../src/engine/gameState';
import { processTurnStart } from '../src/engine/turnProcessor';
import { processControllerAction } from '../src/engine/gameController';
import { getAvailableActions } from '../src/engine/actionProvider';
import { executeAITurn } from '../src/engine/aiEngine';
import { Random } from '../src/utils/rng';

const CAMPAIGNS = ['1990_classic_floppy', '1990_classic_cdrom', 'qol_improved', 'advanced'];

/**
 * Validates all core domain state invariants for a player.
 */
function assertPlayerInvariants(player: PlayerState, campaign: CampaignBundle, turn: number) {
  const hoursPerTurn = campaign.config.timeRules.hoursPerTurn || 60;

  // 1. Time Invariant
  expect(Number.isNaN(player.hoursRemaining), `Turn ${turn}: player hours is NaN`).toBe(false);
  expect(
    player.hoursRemaining,
    `Turn ${turn}: hoursRemaining (${player.hoursRemaining}) out of bounds [0, ${hoursPerTurn}]`
  ).toBeGreaterThanOrEqual(0);
  expect(
    player.hoursRemaining,
    `Turn ${turn}: hoursRemaining (${player.hoursRemaining}) exceeds hoursPerTurn (${hoursPerTurn})`
  ).toBeLessThanOrEqual(hoursPerTurn);

  // 2. Financial Sanity
  expect(Number.isNaN(player.money), `Turn ${turn}: player money is NaN`).toBe(false);
  expect(Number.isNaN(player.bankSavings), `Turn ${turn}: player bankSavings is NaN`).toBe(false);
  expect(player.bankSavings, `Turn ${turn}: negative bank savings (${player.bankSavings})`).toBeGreaterThanOrEqual(0);
  expect(Number.isNaN(player.loanDebt), `Turn ${turn}: loanDebt is NaN`).toBe(false);
  expect(player.loanDebt, `Turn ${turn}: negative loan debt (${player.loanDebt})`).toBeGreaterThanOrEqual(0);
  expect(Number.isNaN(player.rentDebt), `Turn ${turn}: rentDebt is NaN`).toBe(false);
  expect(player.rentDebt, `Turn ${turn}: negative rent debt (${player.rentDebt})`).toBeGreaterThanOrEqual(0);

  // 3. Stat Boundaries
  expect(Number.isNaN(player.happiness), `Turn ${turn}: happiness is NaN`).toBe(false);
  expect(player.happiness, `Turn ${turn}: happiness (${player.happiness}) < 0`).toBeGreaterThanOrEqual(0);
  expect(player.happiness, `Turn ${turn}: happiness (${player.happiness}) > 100`).toBeLessThanOrEqual(100);

  expect(Number.isNaN(player.dependability), `Turn ${turn}: dependability is NaN`).toBe(false);
  expect(player.dependability, `Turn ${turn}: dependability (${player.dependability}) < 0`).toBeGreaterThanOrEqual(0);

  expect(Number.isNaN(player.experience), `Turn ${turn}: experience is NaN`).toBe(false);
  expect(player.experience, `Turn ${turn}: experience (${player.experience}) < 0`).toBeGreaterThanOrEqual(0);

  if (player.physicalCondition !== undefined) {
    expect(Number.isNaN(player.physicalCondition), `Turn ${turn}: physicalCondition is NaN`).toBe(false);
    expect(player.physicalCondition, `Turn ${turn}: physicalCondition (${player.physicalCondition}) < 0`).toBeGreaterThanOrEqual(0);
    expect(player.physicalCondition, `Turn ${turn}: physicalCondition (${player.physicalCondition}) > 100`).toBeLessThanOrEqual(100);
  }

  if (player.mentalCondition !== undefined) {
    expect(Number.isNaN(player.mentalCondition), `Turn ${turn}: mentalCondition is NaN`).toBe(false);
    expect(player.mentalCondition, `Turn ${turn}: mentalCondition (${player.mentalCondition}) < 0`).toBeGreaterThanOrEqual(0);
    expect(player.mentalCondition, `Turn ${turn}: mentalCondition (${player.mentalCondition}) > 100`).toBeLessThanOrEqual(100);
  }

  if (player.mess !== undefined) {
    expect(Number.isNaN(player.mess), `Turn ${turn}: mess is NaN`).toBe(false);
    expect(player.mess, `Turn ${turn}: mess (${player.mess}) < 0`).toBeGreaterThanOrEqual(0);
  }

  // 4. Inventory Non-Negativity
  expect(player.inventory.freshFoodUnits, `Turn ${turn}: negative fresh food`).toBeGreaterThanOrEqual(0);
  expect(player.inventory.casualClothesWeeks, `Turn ${turn}: negative casual clothes weeks`).toBeGreaterThanOrEqual(0);
  expect(player.inventory.dressClothesWeeks, `Turn ${turn}: negative dress clothes weeks`).toBeGreaterThanOrEqual(0);
  expect(player.inventory.businessClothesWeeks, `Turn ${turn}: negative business clothes weeks`).toBeGreaterThanOrEqual(0);

  // 5. Position Validity
  const validNode = campaign.map.nodes.some((n) => n.id === player.position);
  expect(validNode, `Turn ${turn}: player at invalid node position "${player.position}"`).toBe(true);
}

/**
 * Validates global game state invariants.
 */
function assertGameStateInvariants(state: GameState, campaign: CampaignBundle) {
  expect(state.turn).toBeGreaterThanOrEqual(0);
  expect(state.players.length).toBeGreaterThan(0);
  expect(state.rngState).toBeDefined();
  expect(Number.isNaN(state.rngState)).toBe(false);

  for (const player of state.players) {
    assertPlayerInvariants(player, campaign, state.turn);
  }
}

describe('State Invariant Fuzzing & Simulation Testing', () => {
  CAMPAIGNS.forEach((campaignId) => {
    describe(`Simulation Invariants: ${campaignId}`, () => {
      it(`maintains domain invariants over 50-turn AI gameplay`, async () => {
        const campaign = await loadCampaign(campaignId);
        const startNode = campaign.housing[0]?.homeNodeId || campaign.map.nodes[0].id;
        let state = createInitialGameState(
          campaign,
          [{ name: 'AI Player 1', isAi: true, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }],
          startNode,
          {},
          424242
        );
        state.phase = 'playing';
        state = processTurnStart(state, campaign);

        assertGameStateInvariants(state, campaign);

        const TOTAL_TURNS = 50;
        let insideBuilding = false;

        for (let turn = 1; turn <= TOTAL_TURNS; turn++) {
          if (state.phase === 'game-over') break;

          let stepCount = 0;
          const MAX_STEPS_PER_TURN = 50;

          while (state.players[0].hoursRemaining > 0 && stepCount < MAX_STEPS_PER_TURN) {
            stepCount++;

            // Clone previous state to test reducer immutability
            const previousStateSnapshot = JSON.stringify(state);

            const aiActions = executeAITurn(state.players[0], state, campaign);
            if (aiActions.length === 0) {
              break;
            }

            const chosenAction = aiActions[0];
            const result = processControllerAction(state, campaign, 0, insideBuilding, chosenAction);

            // Verify immutability: old state reference was not mutated in place
            // (Only check if newState is a different object)
            if (result.state !== state) {
              expect(JSON.stringify(state), 'Reducer mutated previous state snapshot in place').toBe(previousStateSnapshot);
            }

            state = result.state;
            insideBuilding = result.insideBuilding;

            // Invariant check after every single micro-action
            assertGameStateInvariants(state, campaign);
          }

          // Advance turn
          const turnEndResult = processControllerAction(state, campaign, 0, insideBuilding, { type: 'end_turn' });
          state = turnEndResult.state;
          insideBuilding = turnEndResult.insideBuilding;

          assertGameStateInvariants(state, campaign);
        }
      });

      it(`maintains domain invariants under randomized action fuzzing`, async () => {
        const campaign = await loadCampaign(campaignId);
        const startNode = campaign.housing[0]?.homeNodeId || campaign.map.nodes[0].id;
        const rng = new Random(98765);

        let state = createInitialGameState(
          campaign,
          [{ name: 'Fuzz Player', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }],
          startNode,
          {},
          98765
        );
        state.phase = 'playing';
        state = processTurnStart(state, campaign);

        const FUZZ_TURNS = 25;
        let insideBuilding = false;

        for (let t = 1; t <= FUZZ_TURNS; t++) {
          let step = 0;
          while (state.players[0].hoursRemaining > 0 && step < 30) {
            step++;
            const available = getAvailableActions(
              state.players[0],
              state,
              campaign,
              insideBuilding
            );

            if (available.length === 0) break;

            // Pick a random available action
            const actionIndex = Math.floor(rng.next() * available.length);
            const actionChoice = available[actionIndex];

            const result = processControllerAction(state, campaign, 0, insideBuilding, actionChoice.action);
            state = result.state;
            insideBuilding = result.insideBuilding;

            assertGameStateInvariants(state, campaign);
          }

          // End turn
          const endResult = processControllerAction(state, campaign, 0, insideBuilding, { type: 'end_turn' });
          state = endResult.state;
          insideBuilding = endResult.insideBuilding;

          assertGameStateInvariants(state, campaign);
        }
      });
    });
  });
});
