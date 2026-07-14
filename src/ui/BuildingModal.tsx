import { useState, useEffect, useRef, useCallback } from 'react';
import type { CampaignBundle } from '../engine/dataLoader';
import type { GameRules, PlayerState } from '../engine/gameState';
import { useTranslation } from 'react-i18next';
import { 
  JobBoard, 
  StoreFront, 
  UniversityRegistry, 
  WorkStation,
  HomeRelax,
  RentOffice,
  BankInterface,
  PawnShop 
} from './BuildingInteractions';
import { SpeechBubble } from './SpeechBubble';

interface BuildingModalProps {
  player: PlayerState | null;
  campaign: CampaignBundle | null;
  currentBuildingId: string | null;
  turn: number;
  economicIndex: number;
  rules: GameRules;
  pawnShopItemsForSale?: import('../engine/gameState').PawnedItem[];
  onAction: (actionPayload: any) => Promise<any>;
  onClose: () => void;
}
export function BuildingModal({ player, campaign, currentBuildingId, turn, economicIndex, rules, pawnShopItemsForSale, onAction, onClose }: BuildingModalProps) {
  const { t } = useTranslation();
  const [clerkMessage, setClerkMessage] = useState<string>('');
  const justUpdatedMessageRef = useRef(false);

  // Helper to pick random string if translation is an array
  const getRandomMessage = useCallback((key: string, defaultValue: string) => {
    const messages = t(key, { returnObjects: true, defaultValue });
    if (Array.isArray(messages)) {
      return messages[Math.floor(Math.random() * messages.length)];
    }
    return messages as unknown as string;
  }, [t]);

  const building = campaign?.buildings.find(b => b.id === currentBuildingId) || null;

  // Initialize greeting
  useEffect(() => {
    if (!building) return;
    const isWeek4 = turn % 4 === 0;
    const rentDue = player?.rentPaidUntilWeek !== undefined && player.rentPaidUntilWeek <= turn + 1;
    const isRentOfficeOpen = isWeek4 || rentDue || !!player?.turnFlags?.rentPaidThisTurn;
    const shouldShow = building.archetype !== 'home' && (building.id !== 'apartment_complex' || isRentOfficeOpen);

    if (shouldShow) {
      setClerkMessage(getRandomMessage(`clerkDialogs.${building.id}.greeting`, t('clerkDialogs.default.greeting')));
    } else {
      setClerkMessage('');
    }
  }, [building, t, getRandomMessage, turn, player?.rentPaidUntilWeek, player?.turnFlags?.rentPaidThisTurn]);

  // Handle global click to close speech bubble
  useEffect(() => {
    if (!clerkMessage) return;

    const handleGlobalClick = () => {
      if (justUpdatedMessageRef.current) {
        justUpdatedMessageRef.current = false;
        return;
      }
      setClerkMessage('');
    };

    // Tiny delay to prevent the click that triggered the speech bubble from instantly closing it
    const timeoutId = setTimeout(() => {
      window.addEventListener('click', handleGlobalClick);
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [clerkMessage]);

  if (!player || !campaign || !currentBuildingId || !building) return null;

  // Check if the player's current job is at this building
  const playerJobHere = player.currentJobId 
    ? campaign.jobs.find(j => j.id === player.currentJobId && j.locationId === currentBuildingId)
    : null;

  // Items available at this building
  let itemsHere = campaign.items.filter(i => i.store === building.id);

  // Z-Mart randomization (show 6 items consistently per week per player)
  if (building.id === 'z_mart' && itemsHere.length > 6) {
    let seed = turn * 1337 + (player.id.charCodeAt(player.id.length - 1) || 0) * 12345;
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


  const handleActionIntercept = async (payload: any) => {
    const actionLog = await onAction(payload);
    let nextMsg = '';

    if (actionLog) {
      if (actionLog.key === 'action.error.cannotWork') {
        nextMsg = "No time is left to work.";
      } else if (actionLog.key.startsWith('action.error.notEnoughTime')) {
        if (payload.type === 'enroll' || payload.type === 'study') {
          nextMsg = "No time is left to go to class.";
        } else {
          nextMsg = "Sorry. We're closing. You'll have to come back next week.";
        }
      } else {
        const success = !actionLog.key.includes('.error') && 
                        actionLog.key !== 'action.loan.refused' && 
                        actionLog.key !== 'action.rent.extensionDenied';

        if (payload.type === 'buy') {
          if (success) {
            nextMsg = getRandomMessage(`clerkDialogs.${building.id}.buySuccess`, t('clerkDialogs.default.buySuccess'));
          } else {
            nextMsg = "You do not have enough cash.";
          }
        } else if (payload.type === 'pawn_item') {
          if (success) {
            nextMsg = getRandomMessage(`clerkDialogs.${building.id}.pawnSuccess`, t('clerkDialogs.default.buySuccess'));
          } else {
            nextMsg = t(actionLog.key, { defaultValue: 'Pawn failed.' });
          }
        } else if (payload.type === 'redeem_item' || payload.type === 'buy_pawn_item') {
          if (success) {
            nextMsg = getRandomMessage(`clerkDialogs.${building.id}.redeemSuccess`, t('clerkDialogs.default.buySuccess'));
          } else {
            nextMsg = "You do not have enough cash.";
          }
        } else if (payload.type === 'apply') {
          if (actionLog.key === 'action.job.gotJob') {
            nextMsg = getRandomMessage(`clerkDialogs.employment_office.buySuccess`, t('clerkDialogs.employment_office.buySuccess'));
          } else if (actionLog.key === 'action.job.rejected') {
            const reasons = actionLog.params?.reasons || t('jobBoard.missingReq');
            nextMsg = `Sorry. You didn't get the job for the following reasons:\n\n${reasons}`;
          } else if (actionLog.key === 'action.job.noOpenings') {
            nextMsg = `Sorry. You didn't get the job for the following reasons:\n\nNo openings.`;
          } else if (actionLog.key === 'action.job.raiseSuccess') {
            nextMsg = t('action.job.raiseSuccess');
          } else if (actionLog.key === 'action.job.raiseDenied') {
            nextMsg = t('action.job.raiseDenied');
          } else if (actionLog.key === 'action.job.raiseWaste') {
            nextMsg = t('action.job.raiseWaste');
          } else if (actionLog.key === 'action.job.raiseSame') {
            nextMsg = "Why are you asking for the same wage?";
          }
        } else if (payload.type === 'ask_rent_extension') {
          if (actionLog.key === 'action.rent.alreadyGranted') {
            nextMsg = "I already told you yes!";
          } else if (actionLog.key === 'action.rent.extensionApproved') {
            nextMsg = getRandomMessage(`clerkDialogs.apartment_complex.extensionApproved`, 'Sure, you can pay next week.');
          } else {
            nextMsg = getRandomMessage(`clerkDialogs.apartment_complex.extensionDenied`, 'Sorry, your rent must be paid now.');
          }
        } else if (payload.type === 'move_apartment') {
          if (actionLog.key === 'action.rent.alreadyLiveHere') {
            const aptName = actionLog.params?.name || 'apartment';
            nextMsg = `You already live at the ${aptName}!`;
          } else if (actionLog.key === 'action.rent.moved') {
            nextMsg = getRandomMessage(`clerkDialogs.apartment_complex.moved`, 'Here are your new keys. Enjoy your stay.');
          } else if (success) {
            const isLowCost = payload.housingId === 'low_cost' || payload.housingId === 'low_cost_housing';
            const moveKey = isLowCost ? 'moveInLowCost' : 'moveInSecurity';
            nextMsg = getRandomMessage(`clerkDialogs.apartment_complex.${moveKey}`, 'Welcome.');
          } else {
            nextMsg = "You do not have enough cash.";
          }
        } else if (payload.type === 'bank_transaction') {
          if (success) {
            if (actionLog.key === 'action.bank.withdraw') {
              nextMsg = getRandomMessage(`clerkDialogs.bank.withdrawSuccess`, 'There is always a penalty for early withdrawal.');
            } else {
              nextMsg = getRandomMessage(`clerkDialogs.bank.buySuccess`, 'Transaction complete.');
            }
          } else {
            nextMsg = "You do not have enough cash.";
          }
        } else if (payload.type === 'take_loan') {
          if (actionLog.key === 'action.loan.approved') {
            nextMsg = t('action.loan.approved', { loanSize: actionLog.params?.loanSize });
          } else {
            nextMsg = t('action.loan.refused');
          }
        } else if (payload.type === 'pay_loan') {
          if (actionLog.key === 'action.loan.paidOff') {
            nextMsg = t('action.loan.paidOff', { amount: actionLog.params?.amount });
          } else if (actionLog.key === 'action.loan.paidInstallment') {
            nextMsg = t('action.loan.paidInstallment', { payment: actionLog.params?.payment });
          } else {
            nextMsg = "You do not have enough cash.";
          }
        } else if (payload.type === 'rent_transaction' || payload.type === 'pay_rent_advance') {
          if (success) {
            nextMsg = getRandomMessage(`clerkDialogs.apartment_complex.buySuccess`, t('clerkDialogs.default.buySuccess'));
          } else {
            nextMsg = "You do not have enough cash.";
          }
        } else if (payload.type === 'enroll') {
          if (success) {
            nextMsg = getRandomMessage(`clerkDialogs.university.buySuccess`, 'You are now enrolled.');
          } else {
            nextMsg = "You do not have enough cash.";
          }
        }
      }
    }

    if (nextMsg) {
      justUpdatedMessageRef.current = true;
      setClerkMessage(nextMsg);
    }
  };

  const getFace = (archetype: string) => {
    switch (archetype) {
      case 'employment': return '🧑‍💼';
      case 'workplace': return '👨‍🏭';
      case 'restaurant': return '🧑‍🍳';
      case 'education': return '🤓';
      case 'shop':
      case 'grocery':
      case 'pawnshop': return '💁‍♂️';
      case 'home':
      case 'housing': return '🤵';
      case 'bank': return '🤑';
      default: return '🤔';
    }
  };

  const isWeek4 = turn % 4 === 0;
  const rentDue = player.rentPaidUntilWeek <= turn + 1;
  const isRentOfficeOpen = isWeek4 || rentDue || player.turnFlags.rentPaidThisTurn;
  const shouldShowSpeechBubble = building.archetype !== 'home' && (building.id !== 'apartment_complex' || isRentOfficeOpen);

  return (
    <div className="building-modal">
      <button className="building-modal__close" onClick={onClose}>&times;</button>
      
      <div className="building-modal__header">
        <div className="building-modal__face" style={{ position: 'relative' }}>
          {getFace(building.archetype)}
          {clerkMessage && shouldShowSpeechBubble && <SpeechBubble message={clerkMessage} />}
        </div>
        <div className="building-modal__title-group">
          <h2>{t(`building.${building.id}`, { defaultValue: building.name })}</h2>
          <p>{t(`buildingDesc.${building.id}`, { defaultValue: building.description })}</p>
        </div>
      </div>

      <div className="building-modal__content">
        {/* If your job is at this building, show the Work button prominently at the top */}
        {playerJobHere && (
          <div style={{ padding: '10px', background: '#2c3e50', borderRadius: '4px', marginBottom: '15px' }}>
            <WorkStation
              player={player}
              onAction={handleActionIntercept}
              job={playerJobHere}
              campaign={campaign}
            />
          </div>
        )}

        {/* Employment Office: show ALL jobs for applying */}
        {building.archetype === 'employment' && (
          <JobBoard 
            player={player} 
            onAction={handleActionIntercept} 
            availableJobs={campaign.jobs} 
            buildings={campaign.buildings}
            economicIndex={economicIndex}
            campaign={campaign}
          />
        )}

        {/* Any building with items for sale: shops, restaurant, grocery */}
        {itemsHere.length > 0 && (
          <StoreFront 
            player={player} 
            onAction={handleActionIntercept} 
            availableItems={itemsHere} 
          />
        )}

        {/* University: enrollment and study */}
        {building.archetype === 'education' && (
          <UniversityRegistry 
            player={player} 
            onAction={handleActionIntercept} 
            availableDegrees={campaign.education} 
            rules={rules}
            campaign={campaign}
            economicIndex={economicIndex}
          />
        )}

        {/* Home: relax to end turn */}
        {/* Home: relax to end turn */}
        {building.archetype === 'housing' && (
          <RentOffice 
            player={player}
            campaign={campaign}
            turn={turn}
            economicIndex={economicIndex}
            rules={rules}
            onAction={handleActionIntercept}
          />
        )}
        {building.archetype === 'bank' && (
          <BankInterface 
            player={player}
            campaign={campaign}
            turn={turn}
            economicIndex={economicIndex}
            rules={rules}
            onAction={handleActionIntercept}
          />
        )}
        {building.archetype === 'pawnshop' && (
          <PawnShop 
            player={player}
            onAction={handleActionIntercept}
            economicIndex={economicIndex}
            pawnShopItemsForSale={pawnShopItemsForSale}
          />
        )}
        {building.archetype === 'home' && (() => {
          const housing = campaign.housing.find(h => h.id === player.currentHousingId);
          const homeNode = campaign.map.nodes.find(n => n.id === housing?.homeNodeId);
          const livesHere = homeNode?.buildingId === building.id;

          return livesHere ? (
            <HomeRelax 
              player={player}
              campaign={campaign}
              onAction={handleActionIntercept}
            />
          ) : (
            <div className="interaction-panel">
              <h3>{t(`building.${building.id}`, { defaultValue: building.name })}</h3>
              <p style={{ fontSize: '12px' }}>{t('buildingModal.dontLiveHere', "You don't live here.")}</p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
