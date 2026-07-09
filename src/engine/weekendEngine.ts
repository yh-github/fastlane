import { PlayerState } from './gameState';

export const TICKET_WEEKENDS = {
  baseball: "You went to the baseball game this weekend and ate hotdogs till you puked.",
  theatre: "You went to the theatre this weekend and saw the one MAN version of Cats.",
  concert: "You had front row seats at a rock concert. The doctor said that the hearing loss shouldn't be permanent."
};

export const DURABLE_WEEKENDS: Record<string, string> = {
  refrigerator: "You spent the whole weekend watching some of the food in your refrigerator grow mold and spores. It sure was fun.",
  freezer: "You spent the whole weekend watching the water in your refrigerator freeze.",
  stove: "You spent the whole weekend baking oatmeal cookies.",
  color_tv: "You spent the entire weekend watching Star Trek reruns.",
  vcr: "You rented some movies and ate artificially flavored buttered popcorn.",
  stereo: "You spent the weekend playing your stereo and patching the plaster your speakers cracked.",
  microwave: "You spent the weekend cleaning your microwave after you tried to dry your pet rat in it. You also need a new pet rat.",
  hot_tub: "You and some friends had a hot tub party this weekend."
};

export const RANDOM_WEEKENDS = [
  "You watched them change the mannequins at QT Clothing this weekend.",
  "You washed and waxed your marble this weekend right before it rained.",
  "You stayed home and did absolutely nothing this weekend.",
  "You spent the weekend hiking around Yosemite.",
  "You listened to the Talking Bear 256 times this weekend.",
  "You read the 'Wall Street Journal' this weekend.",
  "You thought about what you would do on your next turn.",
  "You spent the weekend in a hotel because they had to fumigate your apartment.",
  "You played in a ping pong tournament this weekend.",
  "You pitched horseshoes in your apartment all weekend. The people downstairs love you.",
  "You sat around and played solitaire all weekend.",
  "You went panning for gold this weekend, but all you got was wet.",
  "You spent the weekend in the laundromat washing your clothes. Now that was exciting.",
  "You took a friend out to a cheap restaurant this weekend.",
  "You went out and caught your own froglegs this weekend.",
  "You crawled around on your knees chasing snails this weekend.",
  "You spent your weekend thinking about work. Eccch.",
  "You spent your weekend trying to remove the mildew between the shower tiles.",
  "You spent the weekend listening to the newlyweds in the next apartment set up a new waterbed.",
  "This weekend, you won first prize in a beauty contest and collected $10. Whoops, wrong game.",
  "This weekend, you closed your curtains, locked your doors, turned off the lights, and ate presweetened morning breakfast cereal, with little marshmallows!",
  "You played stickball this weekend with the neighborhood kids and ended up wrenching your back and spraining your ankle.",
  "You read a romance novel, NURSE'S TURN TO CRY, in one sitting.",
  "You took a long hot bath this weekend and emerged looking like a California Raisin.",
  "You watched a torrid romance movie, LIBRARIAN'S DILEMMA, this weekend.",
  "One of your fillings came loose this weekend. It's a good thing you're handy with a soldering iron.",
  "You spent the weekend examining yourself under the fluorescent lights in the bathroom. Eccch!",
  "You spent the weekend wondering if black holes were lit with black lights.",
  "This weekend, you hung out at the mall, filled up on junk food, and made your mother ashamed of you.",
  "You went bowling with friends this weekend.",
  "You played two rounds of golf this weekend.",
  "This weekend, you had to bail your nephew out of jail.",
  "You had your marble repainted this weekend.",
  "You played in a volleyball tournament this weekend.",
  "You took a friend out to an expensive restaurant this weekend.",
  "You went to San Diego to play in the Over The Line Tournament.",
  "You went to Las Vegas in a $20,000 car and came back in a $200,000 Greyhound bus.",
  "You tried to drive to Hawaii to watch a surfing contest.",
  "You went scuba diving in La Jolla.",
  "You went deep sea fishing this weekend.",
  "You volunteered to take the local scouts to Disneyland.",
  "You drove the senior citizens' bus this weekend and they drove you - crazy."
];

// Helper to determine cost based on price range
function getWeekendCost(priceType: 'cheap' | 'medium' | 'expensive', playerMoney: number): number {
  let min = 0;
  let max = 0;
  switch (priceType) {
    case 'cheap': min = 5; max = 20; break;
    case 'medium': min = 15; max = 55; break;
    case 'expensive': min = 50; max = 100; break;
  }
  const cost = Math.floor(Math.random() * (max - min + 1)) + min;
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
  previousPlayerWeekends: string[]
): PlayerState {
  const newPlayer = { ...player, inventory: { ...player.inventory, tickets: { ...player.inventory.tickets } } };
  
  let weekendText = '';
  let priceType: 'cheap' | 'medium' | 'expensive' = 'cheap';
  let happinessBonus: number | undefined = undefined;

  // 1. Tickets
  if (newPlayer.inventory.tickets.baseball > 0) {
    weekendText = TICKET_WEEKENDS.baseball;
    newPlayer.inventory.tickets.baseball = 0;
    priceType = 'medium';
  } else if (newPlayer.inventory.tickets.theatre > 0) {
    weekendText = TICKET_WEEKENDS.theatre;
    newPlayer.inventory.tickets.theatre = 0;
    priceType = 'medium';
  } else if (newPlayer.inventory.tickets.concert > 0) {
    weekendText = TICKET_WEEKENDS.concert;
    newPlayer.inventory.tickets.concert = 0;
    priceType = 'medium';
  } 
  // 2. Durables
  else {
    let triggeredDurableWeekend = false;
    // Shuffle the durables so if they have multiple, the order is random
    const shuffledAppliances = [...newPlayer.inventory.appliances].sort(() => Math.random() - 0.5);
    
    for (const app of shuffledAppliances) {
      if (DURABLE_WEEKENDS[app.id]) {
        // 20% chance to trigger
        if (Math.random() < 0.20) {
          const candidateText = DURABLE_WEEKENDS[app.id];
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
      let chosenIndex = -1;
      let attempts = 0;
      while (attempts < 100) {
        chosenIndex = Math.floor(Math.random() * RANDOM_WEEKENDS.length);
        const candidateText = RANDOM_WEEKENDS[chosenIndex];
        if (!previousPlayerWeekends.includes(candidateText)) {
          break;
        }
        attempts++;
      }
      
      weekendText = RANDOM_WEEKENDS[chosenIndex];
      
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
        happinessBonus = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4
      }
    }
  }

  const cost = getWeekendCost(priceType, newPlayer.money);
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
