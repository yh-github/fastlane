import { Random } from '../utils/rng';
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processWeekend } from './weekendEngine';
import type { PlayerState } from './gameState';

describe('Weekend Engine', () => {
  const mockWeekendData = {
    ticketWeekends: {
      baseball: { text: "Went to a baseball game." },
      theatre: { text: "Went to the theatre." },
      concert: { text: "Went to a concert." }
    },
    durableWeekends: {
      tv: [{ text: "Watched TV." }],
      vcr: [{ text: "Watched a movie on VCR." }],
      stereo: [{ text: "Listened to the stereo." }],
      computer: [{ text: "Played games on the computer." }]
    },
    randomWeekends: ["Went to the park.", "Ate out.", "Saw a movie."]
  } as any;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('selects an event and charges the cost', () => {
    vi.spyOn(Random.prototype, 'next').mockReturnValue(0.01); // Picks first event (usually cheap like eating out)
    const player = { 
      money: 1000, 
      happiness: 50,
      inventory: { casualClothesWeeks: 0, dressClothesWeeks: 0, businessClothesWeeks: 0, tickets: { baseball: 0, theatre: 0, concert: 0 }, appliances: [] },
      turnEvents: []
    } as unknown as PlayerState;
    
    const nextPlayer = processWeekend(player, 1, [], mockWeekendData, new Random(1));
    expect(nextPlayer.weekendResult?.event.key).toBeDefined();
    expect(nextPlayer.money).toBeLessThan(1000); // Spent money
  });

  it('safely handles poor players without putting them in negative cash, but skips random events if broke', () => {
    vi.spyOn(Random.prototype, 'next').mockReturnValue(0.01); // First event
    const player = { 
      money: 2, // Less than cheapest cost (5)
      happiness: 50,
      inventory: { casualClothesWeeks: 0, dressClothesWeeks: 0, businessClothesWeeks: 0, tickets: { baseball: 0, theatre: 0, concert: 0 }, appliances: [] },
      turnEvents: []
    } as unknown as PlayerState;
    
    const nextPlayer = processWeekend(player, 1, [], mockWeekendData, new Random(1));
    expect(nextPlayer.money).toBe(2); // Should not drain their last 2 dollars
    expect(nextPlayer.weekendResult?.event.key).toBe('events.weekend.too_broke');
  });

  it('consumes exactly 1 ticket, not all of them', () => {
    const player = { 
      money: 100, 
      happiness: 50,
      inventory: { casualClothesWeeks: 0, dressClothesWeeks: 0, businessClothesWeeks: 0, tickets: { baseball: 3, theatre: 0, concert: 0 }, appliances: [] },
      turnEvents: []
    } as unknown as PlayerState;
    
    const nextPlayer = processWeekend(player, 1, [], mockWeekendData, new Random(1));
    expect(nextPlayer.inventory.tickets.baseball).toBe(2);
    expect(nextPlayer.weekendResult?.event.key).toBe('events.weekend.ticket_baseball');
  });
});
