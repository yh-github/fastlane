import type { GameState, PlayerState } from './gameState';
import type { CampaignBundle } from './dataLoader';

/**
 * Returns an array of action payloads representing the AI's desired actions.
 * The AI evaluates its state and chooses actions deterministically.
 */
export function executeAITurn(player: PlayerState, gameState: GameState, campaign: CampaignBundle): any[] {
  const actions: any[] = [];
  let simulatedPlayer = { ...player };
  
  // Safe limit to prevent infinite loops if something goes wrong
  let maxActions = 20;

  while (simulatedPlayer.hoursRemaining > 0 && maxActions > 0) {
    maxActions--;

    // 1. Survival: Buy food if starving or empty fridge
    if (simulatedPlayer.inventory.freshFoodUnits === 0 && simulatedPlayer.money >= 55) {
      // Find food to buy. We'll buy 1 week of food for $55.
      const foodItem = campaign.items.find(i => i.id === 'food_1week');
      if (foodItem && simulatedPlayer.hoursRemaining >= 2) {
        actions.push({ type: 'buy', itemId: 'food_1week' });
        simulatedPlayer.money -= foodItem.basePrice;
        simulatedPlayer.inventory.freshFoodUnits += 6; // Approx
        simulatedPlayer.hoursRemaining -= 2; // Black's market entry
        continue;
      }
    }

    // 2. Pay rent if due
    if (simulatedPlayer.rentPaidUntilWeek <= gameState.turn + 1 && simulatedPlayer.money >= simulatedPlayer.currentRentPrice && simulatedPlayer.hoursRemaining >= 2) {
      actions.push({ type: 'rent_transaction', amount: simulatedPlayer.currentRentPrice });
      simulatedPlayer.money -= simulatedPlayer.currentRentPrice;
      simulatedPlayer.rentPaidUntilWeek += 4;
      simulatedPlayer.hoursRemaining -= 2; // Rent office entry
      continue;
    }

    // 3. Buy clothes if out
    if (simulatedPlayer.inventory.casualClothesWeeks <= 1 && simulatedPlayer.money >= 35 && simulatedPlayer.hoursRemaining >= 2) {
      // Buy casual clothes
      const clothesItem = campaign.items.find(i => i.id === 'casual_clothes');
      if (clothesItem) {
        actions.push({ type: 'buy', itemId: 'casual_clothes' });
        simulatedPlayer.money -= clothesItem.basePrice;
        simulatedPlayer.inventory.casualClothesWeeks += 9;
        simulatedPlayer.hoursRemaining -= 2; // Store entry
        continue;
      }
    }

    // 4. Try to get a better job if possible and unemployed or low wage
    if (simulatedPlayer.hoursRemaining >= 4) {
      const bestJob = campaign.jobs
        .filter(j => 
          j.requirements.experience <= simulatedPlayer.experience &&
          j.requirements.dependability <= simulatedPlayer.dependability &&
          (j.requirements.degrees && j.requirements.degrees.length > 0 ? j.requirements.degrees.every(d => simulatedPlayer.degrees.includes(d)) : true)
        )
        .sort((a, b) => b.baseWage - a.baseWage)[0];

      if (bestJob && bestJob.id !== simulatedPlayer.currentJobId) {
        actions.push({ type: 'apply', jobId: bestJob.id });
        simulatedPlayer.currentJobId = bestJob.id;
        simulatedPlayer.currentWage = bestJob.baseWage;
        simulatedPlayer.hoursRemaining -= 4; // Job app time + travel roughly
        continue;
      }
    }

    // 4.5. Study if enrolled
    const enrolledDegrees = Object.keys(simulatedPlayer.enrolledClasses || {});
    if (enrolledDegrees.length > 0 && simulatedPlayer.hoursRemaining >= 6) {
      actions.push({ type: 'study', degreeId: enrolledDegrees[0] });
      simulatedPlayer.hoursRemaining -= 6;
      continue;
    }

    // 4.6 Enroll if we have high money and aren't enrolled
    if (enrolledDegrees.length === 0 && simulatedPlayer.money > 1500) {
      const nextDegree = campaign.education.find(d => !simulatedPlayer.degrees.includes(d.id) && d.prerequisites.every(p => simulatedPlayer.degrees.includes(p)));
      if (nextDegree && simulatedPlayer.money >= nextDegree.baseTuitionFee) {
        actions.push({ type: 'enroll', degreeId: nextDegree.id });
        simulatedPlayer.money -= nextDegree.baseTuitionFee;
        simulatedPlayer.enrolledClasses[nextDegree.id] = 0;
        continue;
      }
    }

    // 5. Work
    if (simulatedPlayer.currentJobId && simulatedPlayer.hoursRemaining >= 6) {
      actions.push({ type: 'work', jobId: simulatedPlayer.currentJobId });
      simulatedPlayer.hoursRemaining -= 6;
      simulatedPlayer.money += simulatedPlayer.currentWage * 6; // Roughly
      continue;
    }

    // 6. If can't work and have time, relax
    if (simulatedPlayer.hoursRemaining > 0) {
      const relaxHours = Math.min(simulatedPlayer.hoursRemaining, 5);
      actions.push({ type: 'relax' });
      simulatedPlayer.hoursRemaining -= relaxHours;
      continue;
    }
  }

  // Always end turn explicitly
  actions.push({ type: 'end-turn' });

  return actions;
}
