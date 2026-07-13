import { useState, useEffect } from 'react';
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
  onAction: (actionPayload: any) => void;
  onClose: () => void;
}
export function BuildingModal({ player, campaign, currentBuildingId, turn, economicIndex, rules, pawnShopItemsForSale, onAction, onClose }: BuildingModalProps) {
  const { t } = useTranslation();
  const [clerkMessage, setClerkMessage] = useState<string>('');
  const [pendingExtension, setPendingExtension] = useState(false);
  
  if (!player || !campaign || !currentBuildingId) return null;

  const building = campaign.buildings.find(b => b.id === currentBuildingId);
  if (!building) return null;

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

  // Helper to pick random string if translation is an array
  const getRandomMessage = (key: string, defaultValue: string) => {
    const messages = t(key, { returnObjects: true, defaultValue });
    if (Array.isArray(messages)) {
      return messages[Math.floor(Math.random() * messages.length)];
    }
    return messages as unknown as string;
  };

  // Initialize greeting
  useEffect(() => {
    setClerkMessage(getRandomMessage(`clerkDialogs.${building.id}.greeting`, t('clerkDialogs.default.greeting')));
    setPendingExtension(false);
  }, [building.id, t]);

  // Show extension result quote once engine resolves ask_rent_extension
  useEffect(() => {
    if (!pendingExtension || !player) return;
    if (player.turnFlags?.askedForExtension) {
      // Extension was processed — show approved or denied quote
      const approved = player.rentExtensionActive;
      const key = approved ? 'extensionApproved' : 'extensionDenied';
      setClerkMessage(getRandomMessage(`clerkDialogs.${building.id}.${key}`, approved ? 'Sure, you can pay next week.' : 'Sorry, you must pay now.'));
      setPendingExtension(false);
    }
  }, [player?.turnFlags?.askedForExtension, pendingExtension]);

  const handleActionIntercept = (payload: any) => {
    let nextMsg = '';
    
    if (payload.type === 'buy') {
      const item = campaign.items.find(i => i.id === payload.itemId);
      if (item && player.money >= (item.basePrice || 0)) {
         nextMsg = getRandomMessage(`clerkDialogs.${building.id}.buySuccess`, t('clerkDialogs.default.buySuccess'));
      } else {
         nextMsg = getRandomMessage(`clerkDialogs.${building.id}.insufficientFunds`, t('clerkDialogs.default.insufficientFunds'));
      }
    } else if (payload.type === 'pawn_item') {
      nextMsg = getRandomMessage(`clerkDialogs.${building.id}.pawnSuccess`, t('clerkDialogs.default.buySuccess'));
    } else if (payload.type === 'redeem_item' || payload.type === 'buy_pawn_item') {
      if (player.money >= payload.cost) {
        nextMsg = getRandomMessage(`clerkDialogs.${building.id}.redeemSuccess`, t('clerkDialogs.default.buySuccess'));
      } else {
        nextMsg = getRandomMessage(`clerkDialogs.${building.id}.insufficientFunds`, t('clerkDialogs.default.insufficientFunds'));
      }
    } else if (payload.type === 'ask_rent_extension') {
      // The engine decides approval/denial after this action fires.
      // Set a pending flag so our useEffect can show the result quote once state updates.
      setPendingExtension(true);
    } else if (payload.type === 'move_apartment') {
      // Pick quote pool based on the apartment type being moved into
      const isLowCost = payload.housingId === 'low_cost';
      const moveKey = isLowCost ? 'moveInLowCost' : 'moveInSecurity';
      nextMsg = getRandomMessage(`clerkDialogs.${building.id}.${moveKey}`, t('clerkDialogs.default.buySuccess'));
    } else if (payload.type === 'bank_transaction') {
      if (payload.amount < 0) {
        nextMsg = getRandomMessage(`clerkDialogs.${building.id}.withdrawSuccess`, "There is always a penalty for early withdrawal.");
      } else {
        if (player.money >= payload.amount) {
          nextMsg = getRandomMessage(`clerkDialogs.${building.id}.buySuccess`, t('clerkDialogs.default.buySuccess'));
        } else {
          nextMsg = getRandomMessage(`clerkDialogs.${building.id}.insufficientFunds`, t('clerkDialogs.default.insufficientFunds'));
        }
      }
    } else if (payload.type === 'rent_transaction' || payload.type === 'pay_rent_advance' || payload.type === 'enroll' || payload.type === 'take_loan' || payload.type === 'pay_loan') {
      let cost = payload.amount || payload.cost || 0;
      if (payload.type === 'enroll') {
        const deg = campaign.education.find(d => d.id === payload.degreeId);
        cost = deg ? deg.baseTuitionFee : 0; // ignoring economy index for rough estimate
      }
      
      if (player.money >= cost) {
        nextMsg = getRandomMessage(`clerkDialogs.${building.id}.buySuccess`, t('clerkDialogs.default.buySuccess'));
      } else {
        nextMsg = getRandomMessage(`clerkDialogs.${building.id}.insufficientFunds`, t('clerkDialogs.default.insufficientFunds'));
      }
    }

    if (nextMsg) {
       setClerkMessage(nextMsg);
    }
    
    onAction(payload);
  };

  const getFace = (archetype: string) => {
    switch (archetype) {
      case 'employment': return '👨‍💼';
      case 'workplace': return '👷';
      case 'restaurant': return '👨‍🍳';
      case 'education': return '👨‍🏫';
      case 'shop':
      case 'grocery':
      case 'pawnshop': return '🧑‍🌾';
      case 'home':
      case 'housing': return '🛌';
      case 'bank': return '🏦';
      default: return '😐';
    }
  };

  return (
    <div className="building-modal">
      <button className="building-modal__close" onClick={onClose}>&times;</button>
      
      <div className="building-modal__header">
        <div className="building-modal__face" style={{ position: 'relative' }}>
          {getFace(building.archetype)}
          {clerkMessage && <SpeechBubble message={clerkMessage} />}
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
