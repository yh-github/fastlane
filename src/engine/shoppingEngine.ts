import { type PlayerState, type GameRules, type GameEvent } from './gameState';
import type { ItemDef, CampaignBundle } from './dataLoader';
import { applyMentalChange, applyMoraleEffect } from './statEffects';
import { calcUsedSpace, calcHousingSpaceCap } from './statMath';

export interface ShoppingResult {
  updated: PlayerState;
  success: boolean;
  message: GameEvent;
}

export function buyItem(player: PlayerState, item: ItemDef, rules?: Partial<GameRules>, campaign?: CampaignBundle): ShoppingResult {
  const price = item.basePrice ?? 0;
  if (player.money < price) {
    return { updated: player, success: false, message: { key: 'action.error.notEnoughMoney' } };
  }

  if (item.id === 'computer' && player.inventory.appliances.some(a => a.id === 'computer')) {
    return { updated: player, success: false, message: { key: 'action.error.alreadyOwnComputer' } };
  }

  if (rules?.spaceCapping) {
    let itemSpace = item.space ?? 0;
    if (item.category === 'book' && itemSpace === 0) {
      itemSpace = item.id === 'encyclopedia' ? 2 : 1;
    }
    if (itemSpace > 0) {
      const currentSpace = calcUsedSpace(player, campaign, true);
      const maxSpace = calcHousingSpaceCap(player, campaign);
      if (currentSpace + itemSpace > maxSpace) {
        const housingDef = campaign?.housing?.find(h => h.id === player.currentHousingId);
        return {
          updated: player,
          success: false,
          message: {
            key: 'action.error.notEnoughSpace',
            params: {
              home: housingDef?.name || 'your home',
              item: item.name
            }
          }
        };
      }
    }
  }

  let happinessBonus = item.happinessBonus || 0;
  let mentalBonus = item.mentalBonus || 0;
  let newTurnFlags = { ...player.turnFlags };

  if (item.id === 'lottery_tickets') {
    if (!player.turnFlags?.lotteryHappinessGranted) {
      newTurnFlags.lotteryHappinessGranted = true;
    } else {
      happinessBonus = 0;
      mentalBonus = 0;
    }
  } else if (item.subcategory === 'fast_food') {
    if (!player.turnFlags?.fastFoodHappinessGranted) {
      newTurnFlags.fastFoodHappinessGranted = true;
    } else {
      happinessBonus = 0;
      mentalBonus = 0;
    }
  } else if (item.category === 'food' && item.subcategory !== 'fast_food') {
    if (!player.turnFlags?.freshFoodHappinessGranted) {
      newTurnFlags.freshFoodHappinessGranted = true;
      if (rules?.usePhysicalMentalConditions) {
        happinessBonus = 1;
        mentalBonus = 0;
      }
    } else {
      happinessBonus = 0;
      mentalBonus = 0;
    }
  } else if (item.category === 'junk' && (item.id === 'colas' || item.id === 'shakes')) {
    if (!player.turnFlags?.drinkHappinessGranted) {
      newTurnFlags.drinkHappinessGranted = true;
    } else {
      happinessBonus = 0;
      mentalBonus = 0;
    }
  } else if (item.category === 'ticket' && item.id !== 'lottery_tickets') {
    if (!player.turnFlags?.ticketHappinessGranted) {
      newTurnFlags.ticketHappinessGranted = true;
    } else {
      happinessBonus = 0;
      mentalBonus = 0;
    }
  }

  let updated: PlayerState = { 
    ...player, 
    money: player.money - price,
    inventory: { ...player.inventory },
    turnFlags: newTurnFlags
  };

  if (happinessBonus !== 0) {
    if (rules) {
      updated = applyMoraleEffect(updated, happinessBonus, 'shopping_bonus', rules);
    } else {
      updated.happiness = Math.max(0, Math.min(100, updated.happiness + happinessBonus));
    }
  }

  if (rules?.usePhysicalMentalConditions && mentalBonus !== 0) {
    updated = applyMentalChange(updated, mentalBonus);
  }

  if (rules?.usePhysicalMentalConditions && item.category === 'food' && item.subcategory !== 'fast_food' && !player.turnFlags?.freshFoodHappinessGranted) {
    const maxPhys = updated.physicalConditionMax ?? 50;
    updated.physicalCondition = Math.min(maxPhys, (updated.physicalCondition ?? 50) + 1);
  }

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
        purchasePrice: price,
        purchaseSource: (item.store as 'socket_city' | 'z_mart' | 'pawnshop') || 'z_mart'
      }];
      break;
    case 'book':
      const hadAllBooksBefore = player.inventory.books?.includes('dictionary') &&
                                player.inventory.books?.includes('encyclopedia') &&
                                player.inventory.books?.includes('atlas');
      if (!updated.inventory.books.includes(item.id)) {
        updated.inventory.books = [...updated.inventory.books, item.id];
      }
      const hasAllBooksNow = updated.inventory.books.includes('dictionary') &&
                             updated.inventory.books.includes('encyclopedia') &&
                             updated.inventory.books.includes('atlas');
      if (!hadAllBooksBefore && hasAllBooksNow) {
        updated.turnFlags = { ...updated.turnFlags, bookSetCompletedThisTurn: true };
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

  const messageParams: Record<string, any> = { itemName: item.name, itemId: item.id };
  if (!rules?.usePhysicalMentalConditions && happinessBonus !== 0) {
    messageParams.happinessBonus = happinessBonus;
  }
  if (mentalBonus !== 0) {
    messageParams.mentalBonus = mentalBonus;
  }
  return { updated, success: true, message: { key: 'action.buy', params: messageParams } };
}
