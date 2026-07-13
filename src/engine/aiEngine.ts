import type { GameState, PlayerState } from './gameState';
import type { CampaignBundle } from './dataLoader';

import type { GameAction } from './gameReducer';

function getBuildingNode(campaign: CampaignBundle, buildingId: string): string | null {
  return campaign.map.nodes.find(n => n.buildingId === buildingId)?.id || null;
}

function getHomeNode(campaign: CampaignBundle, player: PlayerState): string {
  const housing = campaign.housing.find(h => h.id === player.currentHousingId);
  return housing ? housing.homeNodeId : 'node_low_cost';
}

/**
 * Returns an array of action payloads representing the AI's desired next action.
 * Since the engine executes actions one by one in a loop, this only needs to return
 * the single most immediate action (e.g. move to a location, or perform an action).
 */
export function executeAITurn(player: PlayerState, gameState: GameState, campaign: CampaignBundle): GameAction[] {
  // If no time, do nothing (loop will end turn)
  if (player.hoursRemaining <= 0) return [];

  // Helper to check if we are at a building, and if not, move there.
  const executeAt = (buildingId: string, action: GameAction): GameAction[] => {
    const node = getBuildingNode(campaign, buildingId);
    if (!node) return [];
    if (player.position !== node) {
      return [{ type: 'move', nodeId: node }];
    }
    return [action];
  };

  // 1. Survival: Buy food if starving or empty fridge
  if (player.inventory.freshFoodUnits === 0 && player.money >= 55 && player.hoursRemaining >= 2) {
    return executeAt('blacks_market', { type: 'buy', itemId: 'food_1week' });
  }

  // 2. Pay rent if due
  if (player.rentPaidUntilWeek <= gameState.turn + 1 && player.money >= player.currentRentPrice && player.hoursRemaining >= 2) {
    return executeAt('rent_office', { type: 'rent_transaction', amount: player.currentRentPrice });
  }

  // 3. Buy clothes if out
  if (player.inventory.casualClothesWeeks <= 1 && player.money >= 35 && player.hoursRemaining >= 2) {
    return executeAt('department_store', { type: 'buy', itemId: 'casual_clothes' });
  }

  // 4. Try to get a better job if possible and unemployed or low wage
  if (player.hoursRemaining >= 4) {
    const bestJob = campaign.jobs
      .filter(j => 
        j.requirements.experience <= player.experience &&
        j.requirements.dependability <= player.dependability &&
        (j.requirements.degrees && j.requirements.degrees.length > 0 ? j.requirements.degrees.every(d => player.degrees.includes(d)) : true)
      )
      .sort((a, b) => b.baseWage - a.baseWage)[0];

    if (bestJob && bestJob.id !== player.currentJobId) {
      return executeAt('employment_office', { type: 'apply', jobId: bestJob.id });
    }
  }

  // 4.5. Study if enrolled
  const enrolledDegrees = Object.keys(player.enrolledClasses || {});
  if (enrolledDegrees.length > 0 && player.hoursRemaining >= 6) {
    return executeAt('university', { type: 'study', degreeId: enrolledDegrees[0] });
  }

  // 4.6 Enroll if we have high money and aren't enrolled
  if (enrolledDegrees.length === 0 && player.money > 1500) {
    const nextDegree = campaign.education.find(d => !player.degrees.includes(d.id) && d.prerequisites.every(p => player.degrees.includes(p)));
    if (nextDegree && player.money >= nextDegree.baseTuitionFee) {
      return executeAt('university', { type: 'enroll', degreeId: nextDegree.id });
    }
  }

  // 5. Work
  if (player.currentJobId && player.hoursRemaining >= 6) {
    const job = campaign.jobs.find(j => j.id === player.currentJobId);
    if (job) {
      return executeAt(job.locationId, { type: 'work', jobId: player.currentJobId });
    }
  }

  // 6. If can't work and have time, relax
  if (player.hoursRemaining > 0) {
    const homeNode = getHomeNode(campaign, player);
    if (player.position !== homeNode) {
      return [{ type: 'move', nodeId: homeNode }];
    }
    // Cannot relax if relaxCost is higher than remaining hours and partial hours is not allowed
    // But engine handles partial hours now. We just issue relax.
    return [{ type: 'relax' }];
  }

  return [];
}
