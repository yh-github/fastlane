import type { BuildingDef, CampaignBundle, ItemDef } from '../../engine/dataLoader';
import { CURIO_CATALOG } from '../../engine/curioCatalog';
import { formatDegreeName } from '../../engine/jobEngine';

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

export function getPawnShopWeeklyStock(
  campaign: CampaignBundle,
  turn: number,
  playerId: string,
  gameSeed?: number
): ItemDef[] {
  const seedPrefix = ((gameSeed ?? 0) % 233280) * 10007;
  let seed = (seedPrefix + turn * 7919 + (playerId.charCodeAt(playerId.length - 1) || 0) * 104729) % 233280;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const EXCLUDED_BROKEN_APPLIANCES = new Set(['computer', 'hot_tub', 'refrigerator', 'freezer']);
  const appliances = (campaign.items || []).filter(
    i => i.category === 'appliance' && (i.basePrice || 0) <= 500 && !EXCLUDED_BROKEN_APPLIANCES.has(i.id)
  );
  const stock: ItemDef[] = [];
  let hasBrokenAppliance = false;

  for (let i = 0; i < 6; i++) {
    const roll = random();
    // Broken appliance: rarer spawn, strictly at most 1 per week (checked on slot 0)
    if (i === 0 && !hasBrokenAppliance && appliances.length > 0 && roll < 0.35) {
      hasBrokenAppliance = true;
      const app = appliances[Math.floor(random() * appliances.length)];
      const discountedPrice = Math.max(10, Math.floor((app.basePrice || 100) * 0.3));
      stock.push({
        id: app.id,
        name: `Broken ${app.name}`,
        category: 'appliance',
        subcategory: app.subcategory,
        basePrice: discountedPrice,
        space: app.space || 3,
        happinessBonus: 0,
        tags: ['broken', 'used']
      });
    } else if (roll < 0.70) {
      // Curio from CURIO_CATALOG (most of them)
      const curioIdx = Math.floor(random() * CURIO_CATALOG.length);
      const curio = CURIO_CATALOG[curioIdx] || CURIO_CATALOG[0];
      stock.push({
        id: 'knick_knack',
        name: curio.name,
        category: 'junk',
        subcategory: 'curio',
        basePrice: 10,
        space: 2,
        happinessBonus: 1,
        tags: [curio.id, 'curio']
      });
    } else {
      // Spare parts
      stock.push({
        id: 'spare_parts',
        name: 'Box of Spare Parts',
        category: 'junk',
        subcategory: 'parts',
        basePrice: 15,
        space: 2,
        happinessBonus: 0
      });
    }
  }

  return stock;
}

export function getAvailableItemsForBuilding(
  building: BuildingDef,
  campaign: CampaignBundle,
  turn: number,
  playerId: string,
  gameSeed?: number
): ItemDef[] {
  // Pawn Shop weekly rotating stock of ~6 items (curios, spare parts, and broken appliances)
  if (building.id === 'pawn_shop' || building.archetype === 'pawnshop') {
    return getPawnShopWeeklyStock(campaign, turn, playerId, gameSeed);
  }

  let itemsHere = (building.inventory || [])
    .map(inv => {
      const baseItem = campaign.items.find(i => i.id === inv.itemId);
      if (!baseItem) return null;
      let happinessBonus = baseItem.happinessBonus;
      if (baseItem.id === 'microwave') {
        happinessBonus = building.id === 'socket_city' ? 2 : 1;
      }
      return {
        ...baseItem,
        happinessBonus,
        basePrice: inv.priceOverride ?? baseItem.basePrice ?? 0
      };
    })
    .filter(Boolean) as ItemDef[];

  // Z-Mart & Discount Store randomization (show 6 items consistently per week per player)
  if ((building.id === 'z_mart' || building.id === 'discount_and_pawn' || building.archetype === 'discount_and_pawn') && itemsHere.length > 6) {
    const seedPrefix = ((gameSeed ?? 0) % 233280) * 10007;
    let seed = (seedPrefix + turn * 1337 + (playerId.charCodeAt(playerId.length - 1) || 0) * 12345) % 233280;
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
    return t('action.error.cannotWork', { defaultValue: 'No time is left to work.' });
  } else if (mainLog?.key === 'action.error.notEnoughTimeNewspaper' || (payload.type === 'buy' && payload.itemId === 'newspaper' && mainLog?.key?.startsWith?.('action.error.notEnoughTime'))) {
    return String(t('clerkDialogs.noTimeToReadNewspaper', { defaultValue: 'No time to read the newspaper.' }));
  } else if (mainLog?.key?.startsWith?.('action.error.notEnoughTime')) {
    if (payload.type === 'enroll' || payload.type === 'study') {
      return t('action.error.notEnoughTimeEducation', { defaultValue: 'No time is left to go to class.' });
    } else if (payload.type === 'work') {
      return String(t(mainLog.key, mainLog.params as any));
    } else if (payload.type === 'apply') {
      return String(t(mainLog.key, { defaultValue: 'Not enough time for an interview.' }));
    } else {
      return t('clerkDialogs.closingSoon', { defaultValue: "Sorry. We're closing. You'll have to come back next week." });
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
        return t('action.error.notEnoughMoney', { defaultValue: 'You do not have enough cash.' });
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
        return t('action.error.notEnoughMoney', { defaultValue: 'You do not have enough cash.' });
      }
    } else if (payload.type === 'study') {
      if (success) {
        return getRandomMessage(`clerkDialogs.university.studySuccess`, 'Good job studying!');
      }
    } else if (payload.type === 'enroll') {
      if (success) {
        return getRandomMessage(`clerkDialogs.university.enrollSuccess`, 'Welcome to the class!');
      } else {
        return t('action.error.notEnoughMoneyTuition', { defaultValue: 'You do not have enough cash.' });
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
      } else if (mainLog.key === 'action.job.interviewMistake') {
        return String(t('action.job.interviewMistake'));
      } else if (mainLog.key === 'action.job.noOpeningsProbation') {
        const header = t('clerkDialogs.employment_office.rejectedHeader', {
          defaultValue: "Sorry. You didn't get the job for the following reasons:"
        });
        const probationMsg = t('action.job.noOpeningsProbation', {
          defaultValue: 'Application rejected: You were fired from this location this turn and remain on probation!'
        });
        return `${header}\n\n${probationMsg}`;
      } else if (mainLog.key === 'action.job.rejected') {
        let reasons = mainLog.params?.reasons || t('jobBoard.missingReq');
        const rawDegrees = mainLog.params?.missingDegrees;
        const missingDegreesList: string[] = typeof rawDegrees === 'string'
          ? rawDegrees.split(',').filter(Boolean)
          : (Array.isArray(rawDegrees) ? rawDegrees : []);

        if (missingDegreesList.length > 0) {
          const localizedDegrees = missingDegreesList
            .map((d: string) => t(`education.${d}`, { defaultValue: formatDegreeName(d) }))
            .join(', ');
          const localizedMissingEducation = t('jobBoard.missingEducationWithDegrees', {
            degrees: localizedDegrees,
            defaultValue: `Not enough education: missing ${localizedDegrees}.`
          });
          reasons = reasons.replace(/Not enough education: missing [^.]+\./, localizedMissingEducation);
        }

        reasons = reasons
          .replace(/Not enough experience\./g, t('jobBoard.missingExpReason', { defaultValue: 'Not enough experience.' }))
          .replace(/Poor Work History\./g, t('jobBoard.poorWorkHistory', { defaultValue: 'Poor Work History.' }))
          .replace(/Not enough education\./g, t('jobBoard.notEnoughEducation', { defaultValue: 'Not enough education.' }))
          .replace(/Requires at least ([0-9.]+) Management Skill \(Skill_Mgmt\)\. Gain experience in Middle Management\./g, (_: string, req: string) =>
            t('jobBoard.missingMgmtSkill', { reqMgmt: req, defaultValue: `Requires at least ${req} Management Skill (Skill_Mgmt). Gain experience in Middle Management.` })
          )
          .replace(/Requires at least ([0-9.]+) Technical Skill \(Skill_Tech\)\./g, (_: string, req: string) =>
            t('jobBoard.missingTechSkill', { reqTech: req, defaultValue: `Requires at least ${req} Technical Skill (Skill_Tech).` })
          )
          .replace(/Not physically fit enough for security guard work\. Requires Physical Condition >= 30\./g,
            t('jobBoard.missingPhysicalCondition', { defaultValue: 'Not physically fit enough for security guard work. Requires Physical Condition >= 30.' })
          )
          .replace(/Missing required degree: ([a-zA-Z0-9_]+)/g, (_: string, d: string) =>
            t('jobBoard.missingDegree', { degree: t(`education.${d}`, { defaultValue: formatDegreeName(d) }), defaultValue: `Missing required degree: ${t(`education.${d}`, { defaultValue: formatDegreeName(d) })}` })
          );

        const header = t('clerkDialogs.employment_office.rejectedHeader', {
          defaultValue: "Sorry. You didn't get the job for the following reasons:"
        });
        return `${header}\n\n${reasons}`;
      } else if (mainLog.key === 'action.job.noOpenings') {
        const header = t('clerkDialogs.employment_office.rejectedHeader', {
          defaultValue: "Sorry. You didn't get the job for the following reasons:"
        });
        const noOpenings = t('action.job.noOpenings', {
          defaultValue: 'No openings.'
        });
        return `${header}\n\n${noOpenings}`;
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
        return t('action.rent.alreadyGranted', { defaultValue: 'I already told you yes!' });
      } else if (mainLog.key === 'action.rent.extensionApproved') {
        return getRandomMessage(`clerkDialogs.apartment_complex.extensionApproved`, 'Sure, you can pay next week.');
      } else {
        return getRandomMessage(`clerkDialogs.apartment_complex.extensionDenied`, 'Sorry, your rent must be paid now.');
      }
    } else if (payload.type === 'move_apartment') {
      if (mainLog.key === 'action.rent.alreadyLiveHere') {
        const aptName = mainLog.params?.name || 'apartment';
        return t('action.rent.alreadyLiveHere', { name: aptName, defaultValue: `You already live at the ${aptName}!` });
      } else if (mainLog.key === 'action.rent.moved') {
        return getRandomMessage(`clerkDialogs.apartment_complex.moved`, 'Here are your new keys. Enjoy your stay.');
      } else if (mainLog.key === 'action.error.notEnoughSpaceMove') {
        return String(t('action.error.notEnoughSpaceMove', mainLog.params));
      } else if (success) {
        const isLowCost = payload.housingId === 'low_cost' || payload.housingId === 'low_cost_housing';
        const moveKey = isLowCost ? 'moveInLowCost' : 'moveInSecurity';
        return getRandomMessage(`clerkDialogs.apartment_complex.${moveKey}`, 'Welcome.');
      } else {
        return t('action.error.notEnoughMoneyMove', { defaultValue: 'You do not have enough cash.' });
      }
    } else if (payload.type === 'bank_transaction') {
      if (success) {
        if (payload.amount > 0) {
          return getRandomMessage(`clerkDialogs.bank.depositSuccess`, 'Deposit accepted.');
        } else {
          return getRandomMessage(`clerkDialogs.bank.withdrawSuccess`, 'Here is your cash.');
        }
      } else {
        return t('action.error.cannotTransact', { defaultValue: 'Transaction could not be completed.' });
      }
    } else if (payload.type === 'stock_transaction') {
      if (success) {
        if (payload.shares > 0) {
          return getRandomMessage(`clerkDialogs.bank.stockBuySuccess`, 'Shares purchased.');
        } else {
          return getRandomMessage(`clerkDialogs.bank.stockSellSuccess`, 'Shares sold.');
        }
      } else {
        return t('action.error.notEnoughSavings', { defaultValue: 'You do not have enough funds or shares.' });
      }
    } else if (payload.type === 'take_loan') {
      if (success) {
        return getRandomMessage(`clerkDialogs.bank.loanApproved`, 'Loan approved.');
      } else {
        return getRandomMessage(`clerkDialogs.bank.loanDenied`, 'Loan application denied.');
      }
    } else if (payload.type === 'pay_loan') {
      if (success) {
        if (mainLog?.key === 'action.loan.paidOff') {
          return t('action.loan.paidOff', { amount: 0, ...(mainLog.params || {}) }) as string;
        }
        const params = { payment: 0, principal: 0, interest: 0, ...(mainLog?.params || {}) };
        return t('action.loan.paidInstallment', params) as string;
      } else {
        if (mainLog?.key === 'action.error.noLoan') {
          return t('action.error.noLoan', { defaultValue: "You don't have a loan." }) as string;
        }
        return mainLog?.key 
          ? (t(mainLog.key, { defaultValue: mainLog.key === 'action.error.notEnoughMoneyPayment' ? 'Not enough money for payment.' : undefined, ...(mainLog.params || {}) }) as string) 
          : (t('action.error.noLoan', { defaultValue: "You don't have a loan." }) as string);
      }
    } else if (payload.type === 'pay_rent_advance') {
      if (success) {
        return getRandomMessage(`clerkDialogs.apartment_complex.rentPaidAdvance`, 'Thank you for paying your rent in advance.');
      } else {
        return t('action.error.notEnoughMoneyRentAdvance', { defaultValue: 'You do not have enough cash to pay rent in advance.' });
      }
    } else if (payload.type === 'rent_transaction') {
      if (success) {
        return getRandomMessage(`clerkDialogs.apartment_complex.rentPaid`, 'Thank you for paying your rent.');
      } else {
        return t('action.error.notEnoughMoneyRent', { defaultValue: 'You do not have enough cash.' });
      }
    } else if (payload.type === 'renegotiate_rent') {
      if (mainLog?.key) {
        return String(t(mainLog.key, { ...(mainLog.params || {}) }));
      }
    }
  }

  return '';
}
