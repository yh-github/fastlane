import { type PlayerState, type GameRules } from './gameState';
import type { ItemDef } from './dataLoader';

export interface ShoppingResult {
  updated: PlayerState;
  success: boolean;
  message: string;
}

export function buyItem(player: PlayerState, item: ItemDef, rules?: GameRules): ShoppingResult {
  if (player.money < item.basePrice) {
    return { updated: player, success: false, message: 'Not enough money.' };
  }

  let happinessBonus = item.happinessBonus || 0;
  if (item.id === 'computer' && player.inventory.appliances.some(a => a.id === 'computer')) {
    happinessBonus = 0;
  }

  let updated = { 
    ...player, 
    money: player.money - item.basePrice,
    happiness: Math.max(0, Math.min(100, player.happiness + happinessBonus)),
    inventory: { ...player.inventory }
  };

  switch (item.category) {
    case 'food':
      if (item.subcategory === 'fast_food') {
        updated.inventory.fastFoodItems = [...updated.inventory.fastFoodItems, { itemId: item.id, happinessBonus: item.happinessBonus }];
      } else {
        updated.inventory.freshFoodUnits += (item.units || 1);
      }
      break;
    case 'clothes':
      if (item.subcategory === 'casual') updated.inventory.casualClothesWeeks += (item.weeks || 4);
      if (item.subcategory === 'dress') updated.inventory.dressClothesWeeks += (item.weeks || 4);
      if (item.subcategory === 'business') updated.inventory.businessClothesWeeks += (item.weeks || 4);
      
      if (rules?.autoEquipBestClothes) {
        const hasCasual = updated.inventory.casualClothesWeeks > 0;
        const hasDress = updated.inventory.dressClothesWeeks > 0;
        const hasBusiness = updated.inventory.businessClothesWeeks > 0;
        
        if (hasBusiness) updated.inventory.selectedClothes = 'business';
        else if (hasDress) updated.inventory.selectedClothes = 'dress';
        else if (hasCasual) updated.inventory.selectedClothes = 'casual';
      }
      break;
    case 'appliance':
      updated.inventory.appliances = [...updated.inventory.appliances, {
        id: item.id,
        purchasePrice: item.basePrice,
        purchaseSource: item.store as 'socket_city' | 'z_mart' | 'pawnshop'
      }];
      break;
    case 'book':
      if (!updated.inventory.books.includes(item.id)) {
        updated.inventory.books = [...updated.inventory.books, item.id];
      }
      break;
    case 'ticket':
      if (item.id === 'lottery_tickets') {
        updated.inventory.lotteryTickets += 10;
      } else if (item.id === 'baseball_tickets') {
        updated.inventory.tickets = { ...updated.inventory.tickets, baseball: updated.inventory.tickets.baseball + 1 };
      } else if (item.id === 'theatre_tickets') {
        updated.inventory.tickets = { ...updated.inventory.tickets, theatre: updated.inventory.tickets.theatre + 1 };
      } else if (item.id === 'concert_tickets') {
        updated.inventory.tickets = { ...updated.inventory.tickets, concert: updated.inventory.tickets.concert + 1 };
      }
      break;
    case 'junk':
      // Currently just gives happiness bonus
      break;
  }

  return { updated, success: true, message: `Purchased ${item.name}` };
}
