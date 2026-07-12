import type { WeekendDef } from './dataLoader';
import type { Random } from '../utils/rng';

// Helper to determine cost based on price range
function getWeekendCost(priceType: 'cheap' | 'medium' | 'expensive', playerMoney: number, rng: Random): number {
  let min = 0;
  let max = 0;
  switch (priceType) {
    case 'cheap': min = 5; max = 20; break;
    case 'medium': min = 15; max = 55; break;
    case 'expensive': min = 50; max = 100; break;
  }
  const cost = Math.floor(rng.next() * (max - min + 1)) + min;
  return Math.min(cost, playerMoney);
}

/**
 * Processes the weekend event for a player.
 * @param player The current player state
 * @param turnNumber The current game turn number
 * @param previousPlayerWeekends An array of weekend texts that previous players got (to prevent dupes for durables/random)
 * @returns The new player state after weekend processing
 */
export function processWeekend(
  player: PlayerState, 
  turnNumber: number, 
  previousPlayerWeekends: string[],
  weekendData: WeekendDef,
  rng: Random
): PlayerState {
  const newPlayer = { ...player, inventory: { ...player.inventory, tickets: { ...player.inventory.tickets } } };
  
  let weekendText = '';
  let priceType: 'cheap' | 'medium' | 'expensive' = 'cheap';
  let happinessBonus: number | undefined = undefined;

  // 1. Tickets
  if (player.inventory.tickets.baseball > 0 && weekendData.ticketWeekends.baseball) {
    weekendText = weekendData.ticketWeekends.baseball.text;
    newPlayer.inventory.tickets.baseball--;
    priceType = 'medium';
  } else if (player.inventory.tickets.theatre > 0 && weekendData.ticketWeekends.theatre) {
    weekendText = weekendData.ticketWeekends.theatre.text;
    newPlayer.inventory.tickets.theatre--;
    priceType = 'medium';
  } else if (player.inventory.tickets.concert > 0 && weekendData.ticketWeekends.concert) {
    weekendText = weekendData.ticketWeekends.concert.text;
    newPlayer.inventory.tickets.concert--;
    priceType = 'medium';
  } 
  // 2. Durables
  else {
    let triggeredDurableWeekend = false;
    // Shuffle the durables so if they have multiple, the order is random
    const shuffledAppliances = rng.shuffle(newPlayer.inventory.appliances);
    
    for (const app of shuffledAppliances) {
      if (weekendData.durableWeekends[app.id]) {
        // 20% chance to trigger
        if (rng.next() < 0.20) {
          const candidateText = weekendData.durableWeekends[app.id].text;
          if (!previousPlayerWeekends.includes(candidateText)) {
            weekendText = candidateText;
            priceType = 'cheap';
            triggeredDurableWeekend = true;
            break;
          }
        }
      }
    }

    // 3. Random Weekends
    if (!triggeredDurableWeekend) {
      if (newPlayer.money < 5) {
        // Player is too broke to afford even the cheapest random weekend.
        weekendText = "You were too broke to do anything this weekend.";
        
        newPlayer.weekendResult = {
          text: weekendText,
          cost: 0
        };
        return newPlayer;
      }

      let chosenIndex = -1;
      let attempts = 0;
      while (attempts < 100) {
        chosenIndex = Math.floor(rng.next() * weekendData.randomWeekends.length);
        const candidateText = weekendData.randomWeekends[chosenIndex];
        if (!previousPlayerWeekends.includes(candidateText)) {
          break;
        }
        attempts++;
      }
      
      weekendText = weekendData.randomWeekends[chosenIndex];
      
      // Determine price of random weekend
      // 0-27 (1-28): Cheap
      // 28-34 (29-35): Medium
      // 35-41 (36-42): Medium until week 8, then Expensive
      if (chosenIndex < 28) {
        priceType = 'cheap';
      } else if (chosenIndex < 35) {
        priceType = 'medium';
      } else {
        priceType = turnNumber >= 8 ? 'expensive' : 'medium';
      }

      // If they got #42 (index 41), +2 to +4 happiness
      if (chosenIndex === 41) {
        happinessBonus = Math.floor(rng.next() * 3) + 2; // 2, 3, or 4
      }
    }
  }

  const cost = getWeekendCost(priceType, newPlayer.money, rng);
  newPlayer.money -= cost;
  
  if (happinessBonus !== undefined) {
    newPlayer.happiness = Math.min(100, newPlayer.happiness + happinessBonus);
  }

  newPlayer.weekendResult = {
    text: weekendText,
    cost,
    happinessBonus
  };

  return newPlayer;
}
