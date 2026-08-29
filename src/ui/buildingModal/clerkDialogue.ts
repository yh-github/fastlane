import type { BuildingDef, CampaignBundle, ItemDef } from '../../engine/dataLoader';

export function getClerkFace(id: string, archetype: string): string {
  switch (id) {
    case 'burger_palace': return '🧑‍🍳'; // Burger Palace: Cook / Chef
    case 'qt_clothing': return '💁‍♂️'; // QT Clothing: Male clerk (often pink shirt)
    case 'bank': return '👩‍💼'; // Bank: Female in a suit
    case 'z_mart':
    case 'discount_and_pawn': return '🧔🏽‍♂️'; // Z-Mart / Discount & Pawn: Brown man with beard
    case 'socket_city': return '👨‍💻'; // Socket City: Technologist
    case 'blacks_market': return '👨‍🦰'; // Black's Market: Red haired man
    case 'pawn_shop': return '👳🏽‍♂️'; // Pawn Shop: Brown man with turban
  }

  // Fallbacks by archetype
  switch (archetype) {
    case 'employment': return '👨‍💼';
    case 'workplace': return '👩‍🏭';
    case 'restaurant': return '🧑‍🍳';
    case 'education': return '👨‍🏫';
    case 'discount_and_pawn': return '🧔🏽‍♂️';
    case 'shop':
    case 'grocery':
    case 'pawnshop': return '💁‍♂️';
    case 'home':
    case 'housing': return '🛌';
    case 'bank': return '👩‍💼';
    default: return '🤔';
  }
}

export function getAvailableItemsForBuilding(
  building: BuildingDef,
  campaign: CampaignBundle,
  turn: number,
  playerId: string
): ItemDef[] {
  let itemsHere = (building.inventory || [])
    .map(inv => {
      const baseItem = campaign.items.find(i => i.id === inv.itemId);
      if (!baseItem) return null;
      return {
        ...baseItem,
        basePrice: inv.priceOverride ?? baseItem.basePrice ?? 0
      };
    })
    .filter(Boolean) as ItemDef[];

  // Z-Mart & Discount Store randomization (show 6 items consistently per week per player)
  if ((building.id === 'z_mart' || building.id === 'discount_and_pawn' || building.archetype === 'discount_and_pawn') && itemsHere.length > 6) {
    let seed = turn * 1337 + (playerId.charCodeAt(playerId.length - 1) || 0) * 12345;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    let shuffled = [...itemsHere];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    itemsHere = shuffled.slice(0, 6);
  }

  return itemsHere;
}

export function computeClerkResponse(
  payload: any,
  actionLog: any,
  building: BuildingDef,
  t: (key: string, options?: any) => any,
  getRandomMessage: (key: string, defaultValue: string) => string
): string {
  if (!actionLog) return '';

  const isErrorLog = (log: any) => log?.key?.includes?.('.error') || log?.key === 'action.loan.refused' || log?.key === 'action.rent.extensionDenied';
  const mainLog = Array.isArray(actionLog) ? actionLog[0] : actionLog;

  if (mainLog?.key === 'action.error.cannotWork') {
    return "No time is left to work.";
  } else if (mainLog?.key?.startsWith?.('action.error.notEnoughTime')) {
    if (payload.type === 'enroll' || payload.type === 'study') {
      return "No time is left to go to class.";
    } else if (payload.type === 'work') {
      return String(t(mainLog.key, mainLog.params as any));
    } else {
      return "Sorry. We're closing. You'll have to come back next week.";
    }
  } else if (mainLog?.key?.startsWith?.('action.error.too')) {
    return String(t(mainLog.key, mainLog.params as any));
  } else {
    const success = Array.isArray(actionLog) ? !actionLog.some(isErrorLog) : !isErrorLog(actionLog);

    if (payload.type === 'buy') {
      if (success) {
        let key = `clerkDialogs.${building.id}.buySuccess`;
        if (building.id === 'discount_and_pawn' || building.archetype === 'discount_and_pawn') {
          key = 'clerkDialogs.z_mart.buySuccess';
        }
        return getRandomMessage(key, t('clerkDialogs.default.buySuccess'));
      } else if (mainLog?.key === 'action.error.notEnoughSpace') {
        return String(t('action.error.notEnoughSpace', mainLog.params));
      } else {
        return "You do not have enough cash.";
      }
    } else if (payload.type === 'pawn_item') {
      if (success) {
        let key = `clerkDialogs.${building.id}.pawnSuccess`;
        if (building.id === 'discount_and_pawn' || building.archetype === 'discount_and_pawn') {
          key = 'clerkDialogs.pawn_shop.pawnSuccess';
        }
        return getRandomMessage(key, t('clerkDialogs.default.buySuccess'));
      } else {
        return t(mainLog.key, { defaultValue: 'Pawn failed.' });
      }
    } else if (payload.type === 'redeem_item' || payload.type === 'buy_pawn_item') {
      if (success) {
        let key = `clerkDialogs.${building.id}.redeemSuccess`;
        if (building.id === 'discount_and_pawn' || building.archetype === 'discount_and_pawn') {
          key = 'clerkDialogs.pawn_shop.redeemSuccess';
        }
        return getRandomMessage(key, t('clerkDialogs.default.buySuccess'));
      } else if (mainLog?.key === 'action.error.notEnoughSpace') {
        return String(t('action.error.notEnoughSpace', mainLog.params));
      } else {
        return "You do not have enough cash.";
      }
    } else if (payload.type === 'study') {
      if (success) {
        return getRandomMessage(`clerkDialogs.university.studySuccess`, 'Good job studying!');
      }
    } else if (payload.type === 'enroll') {
      if (success) {
        return getRandomMessage(`clerkDialogs.university.enrollSuccess`, 'Welcome to the class!');
      } else {
        return "You do not have enough cash.";
      }
    } else if (payload.type === 'apply') {
      if (mainLog.key === 'action.job.raiseSuccess') {
        return String(t('action.job.raiseSuccess', mainLog.params));
      } else if (mainLog.key === 'action.job.raiseDenied') {
        return String(t('action.job.raiseDenied', { defaultValue: 'Raise denied.' }));
      } else if (mainLog.key === 'action.job.hired' || mainLog.key === 'action.job.gotJob') {
        return String(t(mainLog.key, mainLog.params));
      } else if (mainLog.key === 'action.job.raiseWaste') {
        return String(t('action.job.raiseWaste'));
      } else if (mainLog.key === 'action.job.raiseSame') {
        return String(t('action.job.raiseSame'));
      } else if (mainLog.key === 'action.job.raiseLess') {
        return String(t('action.job.raiseLess'));
      } else if (mainLog.key === 'action.job.rejected') {
        const reasons = mainLog.params?.reasons || t('jobBoard.missingReq');
        return `Sorry. You didn't get the job for the following reasons:\n\n${reasons}`;
      } else if (mainLog.key === 'action.job.noOpenings') {
        return `Sorry. You didn't get the job for the following reasons:\n\nNo openings.`;
      }
    } else if (payload.type === 'work') {
      if (Array.isArray(actionLog)) {
        const speechParts = actionLog
          .filter(l => l.key !== 'action.job.worked')
          .map(l => String(t(l.key, l.params as any)));
        if (speechParts.length > 0) {
          return speechParts.join('\n\n');
        }
      } else if (mainLog.key !== 'action.job.worked') {
        return String(t(mainLog.key, mainLog.params as any));
      }
    } else if (payload.type === 'ask_rent_extension') {
      if (mainLog.key === 'action.rent.alreadyGranted') {
        return "I already told you yes!";
      } else if (mainLog.key === 'action.rent.extensionApproved') {
        return getRandomMessage(`clerkDialogs.apartment_complex.extensionApproved`, 'Sure, you can pay next week.');
      } else {
        return getRandomMessage(`clerkDialogs.apartment_complex.extensionDenied`, 'Sorry, your rent must be paid now.');
      }
    } else if (payload.type === 'move_apartment') {
      if (mainLog.key === 'action.rent.alreadyLiveHere') {
        const aptName = mainLog.params?.name || 'apartment';
        return `You already live at the ${aptName}!`;
      } else if (mainLog.key === 'action.rent.moved') {
        return getRandomMessage(`clerkDialogs.apartment_complex.moved`, 'Here are your new keys. Enjoy your stay.');
      } else if (mainLog.key === 'action.error.notEnoughSpaceMove') {
        return String(t('action.error.notEnoughSpaceMove', mainLog.params));
      } else if (success) {
        const isLowCost = payload.housingId === 'low_cost' || payload.housingId === 'low_cost_housing';
        const moveKey = isLowCost ? 'moveInLowCost' : 'moveInSecurity';
        return getRandomMessage(`clerkDialogs.apartment_complex.${moveKey}`, 'Welcome.');
      } else {
        return "You do not have enough cash.";
      }
    } else if (payload.type === 'bank_transaction') {
      if (success) {
        if (payload.amount > 0) {
          return getRandomMessage(`clerkDialogs.bank.depositSuccess`, 'Deposit accepted.');
        } else {
          return getRandomMessage(`clerkDialogs.bank.withdrawSuccess`, 'Here is your cash.');
        }
      } else {
        return "Transaction could not be completed.";
      }
    } else if (payload.type === 'stock_transaction') {
      if (success) {
        if (payload.shares > 0) {
          return getRandomMessage(`clerkDialogs.bank.stockBuySuccess`, 'Shares purchased.');
        } else {
          return getRandomMessage(`clerkDialogs.bank.stockSellSuccess`, 'Shares sold.');
        }
      } else {
        return "You do not have enough funds or shares.";
      }
    } else if (payload.type === 'take_loan') {
      if (success) {
        return getRandomMessage(`clerkDialogs.bank.loanApproved`, 'Loan approved.');
      } else {
        return getRandomMessage(`clerkDialogs.bank.loanDenied`, 'Loan application denied.');
      }
    } else if (payload.type === 'pay_loan') {
      if (success) {
        return t('action.loan.paidInstallment', mainLog.params) as string;
      } else {
        return "You do not have enough cash.";
      }
    } else if (payload.type === 'pay_rent_advance') {
      if (success) {
        return getRandomMessage(`clerkDialogs.apartment_complex.rentPaidAdvance`, 'Thank you for paying your rent in advance.');
      } else {
        return "You do not have enough cash to pay rent in advance.";
      }
    } else if (payload.type === 'rent_transaction') {
      if (success) {
        return getRandomMessage(`clerkDialogs.apartment_complex.rentPaid`, 'Thank you for paying your rent.');
      } else {
        return "You do not have enough cash.";
      }
    }
  }

  return '';
}
