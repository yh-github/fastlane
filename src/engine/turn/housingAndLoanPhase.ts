import type { PlayerState, GameState } from '../gameState';
import type { CampaignBundle } from '../dataLoader';
import { calcEconomyPrice } from '../economyEngine';
import { applyHappinessChange } from '../statEffects';

export function processHousingAndLoanPhase(
  p: PlayerState,
  state: GameState,
  campaign: CampaignBundle
): PlayerState {
  // 12. Rent Notice
  if (p.rentPaidUntilWeek <= state.turn) {
    if (p.rentExtensionActive) {
      p.rentExtensionActive = false;
      p.turnEvents.push({ key: 'events.rent.extensionExpired' });
    } else {
      p.rentExtensionsDeniedPermanently = true; 
      const curHousing = campaign?.housing?.find(h => h.id === p.currentHousingId);
      const baseRent = curHousing?.baseRent ?? (p.currentHousingId === 'security' ? 475 : 325);
      const debtAmount = state.rules.fluctuatingRent ? calcEconomyPrice(baseRent, state.economicIndex) : p.currentRentPrice;
      p.rentDebt += debtAmount;
      p.rentPaidUntilWeek = state.turn + 4; 
      p.turnEvents.push({ key: 'events.rent.charged', params: { amount: debtAmount } });

      // Strict eviction: warning if debt > 1 month rent, eviction to low_cost if debt > 2 months rent
      if (state.rules.strictEviction) {
        const monthRent = debtAmount;
        if (p.rentDebt > 2 * monthRent) {
          if (p.currentHousingId !== 'low_cost') {
            p.currentHousingId = 'low_cost';
            p.currentRentPrice = 325;
            p.turnEvents.push({ key: 'events.rent.evicted' });
          }
        } else if (p.rentDebt > monthRent) {
          p.turnEvents.push({ key: 'events.rent.warning' });
        }
      }
    }
  } else if (p.rentPaidUntilWeek <= state.turn + 1) { 
    if (p.rentExtensionsDeniedPermanently) {
      p.turnEvents.push({ key: 'events.rent.due_nodenied' });
    } else {
      p.turnEvents.push({ key: 'events.rent.due' });
    }
  }

  // 13. Clothing Decay & Equipment
  if (state.rules.clothingDecaysAll) {
    if (p.inventory.casualClothesWeeks > 0) {
      p.inventory.casualClothesWeeks--;
      if (p.inventory.casualClothesWeeks === 1) p.turnEvents.push({ key: 'events.clothes.casual' });
    }
    if (p.inventory.dressClothesWeeks > 0) {
      p.inventory.dressClothesWeeks--;
      if (p.inventory.dressClothesWeeks === 1) p.turnEvents.push({ key: 'events.clothes.dress' });
    }
    if (p.inventory.businessClothesWeeks > 0) {
      p.inventory.businessClothesWeeks--;
      if (p.inventory.businessClothesWeeks === 1) p.turnEvents.push({ key: 'events.clothes.business' });
    }
  } else {
    if (p.inventory.selectedClothes === 'casual' && p.inventory.casualClothesWeeks > 0) {
      p.inventory.casualClothesWeeks--;
      if (p.inventory.casualClothesWeeks === 1) p.turnEvents.push({ key: 'events.clothes.casual' });
    } else if (p.inventory.selectedClothes === 'dress' && p.inventory.dressClothesWeeks > 0) {
      p.inventory.dressClothesWeeks--;
      if (p.inventory.dressClothesWeeks === 1) p.turnEvents.push({ key: 'events.clothes.dress' });
    } else if (p.inventory.selectedClothes === 'business' && p.inventory.businessClothesWeeks > 0) {
      p.inventory.businessClothesWeeks--;
      if (p.inventory.businessClothesWeeks === 1) p.turnEvents.push({ key: 'events.clothes.business' });
    }
  }

  const hasCasual = p.inventory.casualClothesWeeks > 0;
  const hasDress = p.inventory.dressClothesWeeks > 0;
  const hasBusiness = p.inventory.businessClothesWeeks > 0;
  let activeClothes: 'casual' | 'dress' | 'business' | 'none' = (p.inventory.selectedClothes as any) || 'none';

  if (state.rules.autoEquipBestClothes) {
    if (hasBusiness) activeClothes = 'business';
    else if (hasDress) activeClothes = 'dress';
    else if (hasCasual) activeClothes = 'casual';
    else activeClothes = 'none';
  } else {
    if (activeClothes === 'business' && !hasBusiness) activeClothes = hasDress ? 'dress' : (hasCasual ? 'casual' : 'none');
    if (activeClothes === 'dress' && !hasDress) activeClothes = hasBusiness ? 'business' : (hasCasual ? 'casual' : 'none');
    if (activeClothes === 'casual' && !hasCasual) activeClothes = hasDress ? 'dress' : (hasBusiness ? 'business' : 'none');
  }
  p.inventory.selectedClothes = activeClothes as any;

  if (activeClothes === 'none') {
    p.nakedTurns++;
  } else {
    p.nakedTurns = 0;
  }

  // 14. Loan Payments & Warnings
  if (p.loanDebt > 0) {
    if (state.turn % 4 === 1) { 
      if (p.loanPaymentDeadline < state.turn) {
        p.timesDefaulted += 1;
        p = applyHappinessChange(p, -1, 'loan_default', state.rules, campaign.config.statRules);
        p.turnFlags.loanDefaultWarning = true;
      }
    } else if (state.turn % 4 === 0) { 
      if (p.loanPaymentDeadline <= state.turn) {
        p.turnFlags.loanPayableWarning = true;
        p.turnEvents.push({ key: 'events.loan.due' });
      }
    }
  }

  return p;
}
