import type { PlayerState, GameState } from '../gameState';
import type { CampaignBundle } from '../dataLoader';
import { calcEconomyPrice } from '../economyEngine';
import { applyHappinessChange } from '../statEffects';
import { calcLandlordStanding } from '../statMath';

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
      if (state.rules.usePhysicalMentalConditions && state.rules.fluctuatingRent) {
        const marketRent = calcEconomyPrice(baseRent, state.economicIndex);
        if (marketRent > p.currentRentPrice) {
          const { standing } = calcLandlordStanding(p, state.rules);
          if (standing < 40) {
            const oldRent = p.currentRentPrice;
            p.currentRentPrice = marketRent;
            p.rentPaymentsAtCurrentRate = 0;
            p.turnEvents.push({ key: 'events.rent.raised', params: { newRent: marketRent, oldRent } });
          }
        }
      }
      const debtAmount = state.rules.usePhysicalMentalConditions
        ? p.currentRentPrice
        : (state.rules.fluctuatingRent ? calcEconomyPrice(baseRent, state.economicIndex) : p.currentRentPrice);
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
            p.rentPaymentsAtCurrentRate = 0;
            p.turnEvents.push({ key: 'events.rent.evicted' });
          }
        } else if (p.rentDebt > monthRent) {
          p.turnEvents.push({ key: 'events.rent.warning' });
        }
      }
    }
  } else if (p.rentPaidUntilWeek <= state.turn + 1) { 
    const curHousing = campaign?.housing?.find(h => h.id === p.currentHousingId);
    const baseRent = curHousing?.baseRent ?? (p.currentHousingId === 'security' ? 475 : 325);
    const rentAmount = state.rules.usePhysicalMentalConditions
      ? p.currentRentPrice
      : (state.rules.fluctuatingRent ? calcEconomyPrice(baseRent, state.economicIndex) : p.currentRentPrice);
    const debtAmount = p.rentDebt || 0;
    if (p.rentExtensionsDeniedPermanently) {
      p.turnEvents.push({ key: 'events.rent.due_nodenied', params: { amount: rentAmount, debt: debtAmount } });
    } else {
      p.turnEvents.push({ key: 'events.rent.due', params: { amount: rentAmount, debt: debtAmount } });
    }
  }

  const prevPlayer = state.players.find(pl => pl.id === p.id);
  const prevCasual = prevPlayer?.inventory?.casualClothesWeeks ?? p.inventory.casualClothesWeeks ?? 0;
  const prevDress = prevPlayer?.inventory?.dressClothesWeeks ?? p.inventory.dressClothesWeeks ?? 0;
  const prevBusiness = prevPlayer?.inventory?.businessClothesWeeks ?? p.inventory.businessClothesWeeks ?? 0;

  // 13. Clothing Decay & Equipment
  if (state.rules.clothingDecaysAll) {
    if (p.inventory.casualClothesWeeks > 0) p.inventory.casualClothesWeeks--;
    if (p.inventory.dressClothesWeeks > 0) p.inventory.dressClothesWeeks--;
    if (p.inventory.businessClothesWeeks > 0) p.inventory.businessClothesWeeks--;
  } else {
    // Worn this turn: any clothes worn during the turn or currently selected at turn end
    const wornList = new Set<'casual' | 'dress' | 'business'>(prevPlayer?.turnFlags?.clothesWornThisTurn || []);
    if (p.inventory.selectedClothes && p.inventory.selectedClothes !== 'none') {
      wornList.add(p.inventory.selectedClothes);
    }
    if (prevPlayer?.inventory?.selectedClothes && prevPlayer.inventory.selectedClothes !== 'none') {
      wornList.add(prevPlayer.inventory.selectedClothes);
    }

    if (wornList.has('casual') && p.inventory.casualClothesWeeks > 0) {
      p.inventory.casualClothesWeeks--;
    }
    if (wornList.has('dress') && p.inventory.dressClothesWeeks > 0) {
      p.inventory.dressClothesWeeks--;
    }
    if (wornList.has('business') && p.inventory.businessClothesWeeks > 0) {
      p.inventory.businessClothesWeeks--;
    }
  }

  // Clothing wear notifications
  // Warn ONLY on decay transition to 1 week (was > 1, now == 1), preventing spam when clothes sit unworn
  if (state.rules.helpfulUI) {
    if (prevCasual > 1 && p.inventory.casualClothesWeeks === 1) p.turnEvents.push({ key: 'events.clothes.casual' });
    if (prevDress > 1 && p.inventory.dressClothesWeeks === 1) p.turnEvents.push({ key: 'events.clothes.dress' });
    if (prevBusiness > 1 && p.inventory.businessClothesWeeks === 1) p.turnEvents.push({ key: 'events.clothes.business' });
  } else {
    // Authentic Sierra SCI behavior (script.111.txt weeksOfClothing == 1):
    // Only warns when the player's longest-lasting clothes reach 1 week (anti-nudity warning).
    const prevMaxWeeks = Math.max(prevCasual, prevDress, prevBusiness);
    const maxWeeks = Math.max(
      p.inventory.casualClothesWeeks || 0,
      p.inventory.dressClothesWeeks || 0,
      p.inventory.businessClothesWeeks || 0
    );
    if (prevMaxWeeks > 1 && maxWeeks === 1) {
      p.turnEvents.push({ key: 'events.clothes.needNew' });
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
  const finishedTurn = state.turn;
  const startingTurn = state.turn + 1;

  if (p.loanDebt > 0) {
    // End-of-billing-turn default evaluation:
    // If the turn that just finished was a deadline turn and player didn't service debt this turn:
    if (finishedTurn > 0 && p.loanPaymentDeadline > 0 && finishedTurn >= p.loanPaymentDeadline) {
      const paidThisTurn = prevPlayer?.turnFlags?.loanPaidThisTurn ?? false;
      if (!paidThisTurn) {
        p.timesDefaulted = (p.timesDefaulted || 0) + 1;
        p = applyHappinessChange(p, -1, 'loan_default', state.rules, campaign.config.statRules);
        p.turnFlags.loanDefaultWarning = true;
        p.turnEvents.push({ key: 'events.loan.overdue' });
        if (state.rules.rollingLoanDeadline) {
          p.loanPaymentDeadline = finishedTurn + 4;
        } else {
          p.loanPaymentDeadline = Math.floor((finishedTurn - 1) / 4) * 4 + 8;
        }
      } else {
        if (p.loanPaymentDeadline <= finishedTurn) {
          if (state.rules.rollingLoanDeadline) {
            p.loanPaymentDeadline = finishedTurn + 4;
          } else {
            p.loanPaymentDeadline = Math.floor((finishedTurn - 1) / 4) * 4 + 8;
          }
        }
      }
    }

    // Start-of-turn warning:
    // If the turn starting is a deadline turn:
    if (p.loanPaymentDeadline > 0 && startingTurn >= p.loanPaymentDeadline) {
      p.turnFlags.loanPayableWarning = true;
      p.turnEvents.push({ key: 'events.loan.due' });
    }
  }

  return p;
}
