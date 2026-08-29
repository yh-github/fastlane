import { useState, useEffect, useRef, useCallback } from 'react';
import type { CampaignBundle } from '../engine/dataLoader';
import type { GameRules, PlayerState, PawnedItem } from '../engine/gameState';
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
import { getClerkFace, getAvailableItemsForBuilding, computeClerkResponse } from './buildingModal';

interface BuildingModalProps {
  player: PlayerState | null;
  campaign: CampaignBundle | null;
  currentBuildingId: string | null;
  turn: number;
  economicIndex: number;
  rules: GameRules;
  pawnShopItemsForSale?: PawnedItem[];
  onAction: (actionPayload: any) => Promise<any>;
  onClose: () => void;
}

export function BuildingModal({
  player,
  campaign,
  currentBuildingId,
  turn,
  economicIndex,
  rules,
  pawnShopItemsForSale,
  onAction,
  onClose
}: BuildingModalProps) {
  const { t } = useTranslation();
  const [clerkMessage, setClerkMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'shop' | 'pawn'>('shop');
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

  // Initialize greeting on entering building
  useEffect(() => {
    if (!building) return;
    const isWeek4 = turn % 4 === 0;
    const rentDue = player?.rentPaidUntilWeek !== undefined && player.rentPaidUntilWeek <= turn;
    const hasJobAtRentOffice = !!(player?.currentJobId && campaign?.jobs.some(j => j.id === player.currentJobId && j.locationId === 'apartment_complex'));
    const isRentOfficeOpen = isWeek4 || rentDue || !!player?.turnFlags?.rentPaidThisTurn || hasJobAtRentOffice;
    const shouldShow = building.archetype !== 'home' && (building.id !== 'apartment_complex' || isRentOfficeOpen);

    if (shouldShow) {
      let greetingKey = `clerkDialogs.${building.id}.greeting`;
      if (building.id === 'discount_and_pawn' || building.archetype === 'discount_and_pawn') {
        greetingKey = 'clerkDialogs.z_mart.greeting';
      }
      setClerkMessage(getRandomMessage(greetingKey, t('clerkDialogs.default.greeting')));
    } else {
      setClerkMessage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBuildingId]);

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

  // Reset tab on building change
  useEffect(() => {
    setActiveTab('shop');
  }, [currentBuildingId]);

  if (!player || !campaign || !currentBuildingId || !building) return null;

  // Check if the player's current job is at this building
  const playerJobHere = player.currentJobId 
    ? campaign.jobs.find(j => j.id === player.currentJobId && j.locationId === currentBuildingId)
    : null;

  const itemsHere = getAvailableItemsForBuilding(building, campaign, turn, player.id);

  const handleActionIntercept = async (payload: any) => {
    const actionLog = await onAction(payload);
    const nextMsg = computeClerkResponse(payload, actionLog, building, t, getRandomMessage);
    if (nextMsg) {
      setClerkMessage(nextMsg);
      justUpdatedMessageRef.current = true;
    }
    return actionLog;
  };

  const housing = campaign.housing.find(h => h.id === player.currentHousingId);
  const homeNode = campaign.map.nodes.find(n => n.id === housing?.homeNodeId);
  const livesHere = homeNode?.buildingId === building.id;

  const isWeek4 = turn % 4 === 0;
  const rentDue = player.rentPaidUntilWeek <= turn + 1;
  const isRentOfficeOpen = isWeek4 || rentDue || player.turnFlags.rentPaidThisTurn || !!playerJobHere;
  const isDiscountAndPawn = building.archetype === 'discount_and_pawn';
  const shouldShowSpeechBubble = building.archetype !== 'home' && (building.id !== 'apartment_complex' || isRentOfficeOpen);

  let currentFace = getClerkFace(building.id, building.archetype);
  if (building.archetype === 'home' && !livesHere) {
    currentFace = '🚫';
  } else if (building.id === 'apartment_complex' && !isRentOfficeOpen) {
    currentFace = '🚫';
  }

  const renderBuildingServices = () => (
    <>
      {/* Discount & Pawn Shop: Tabs for Shop and Pawn */}
      {isDiscountAndPawn && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            data-testid="tab-shop"
            onClick={() => setActiveTab('shop')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '6px',
              fontWeight: 'bold',
              background: activeTab === 'shop' ? 'var(--accent-cyan, #00e5ff)' : 'rgba(255,255,255,0.05)',
              color: activeTab === 'shop' ? '#000' : '#fff',
              border: activeTab === 'shop' ? '1px solid var(--accent-cyan, #00e5ff)' : '1px solid #444',
              cursor: 'pointer'
            }}
          >
            🛒 {t('buildingModal.tabShop', { defaultValue: 'Shop' })}
          </button>
          <button
            data-testid="tab-pawn"
            onClick={() => setActiveTab('pawn')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '6px',
              fontWeight: 'bold',
              background: activeTab === 'pawn' ? 'var(--accent-cyan, #00e5ff)' : 'rgba(255,255,255,0.05)',
              color: activeTab === 'pawn' ? '#000' : '#fff',
              border: activeTab === 'pawn' ? '1px solid var(--accent-cyan, #00e5ff)' : '1px solid #444',
              cursor: 'pointer'
            }}
          >
            ⚖️ {t('buildingModal.tabPawn', { defaultValue: 'Pawn' })}
          </button>
        </div>
      )}

      {/* Discount & Pawn Shop contents */}
      {isDiscountAndPawn && activeTab === 'shop' && (
        <StoreFront 
          player={player} 
          onAction={handleActionIntercept} 
          availableItems={itemsHere} 
          economicIndex={economicIndex}
          rules={rules}
          campaign={campaign}
        />
      )}
      {isDiscountAndPawn && activeTab === 'pawn' && (
        <PawnShop 
          player={player}
          onAction={handleActionIntercept}
          economicIndex={economicIndex}
          pawnShopItemsForSale={pawnShopItemsForSale}
          rules={rules}
          campaign={campaign}
        />
      )}

      {/* Other Services */}
      {!isDiscountAndPawn && (
        <>
          {building.archetype === 'employment' && (
            <JobBoard 
              player={player} 
              onAction={handleActionIntercept} 
              availableJobs={campaign.jobs} 
              buildings={campaign.buildings}
              economicIndex={economicIndex}
              campaign={campaign}
              rules={rules}
            />
          )}
          {itemsHere.length > 0 && (
            <StoreFront 
              player={player} 
              onAction={handleActionIntercept} 
              availableItems={itemsHere} 
              economicIndex={economicIndex}
              rules={rules}
              campaign={campaign}
            />
          )}
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
              rules={rules}
              campaign={campaign}
            />
          )}
          {building.archetype === 'home' && (
            livesHere ? (
              <HomeRelax 
                player={player}
                campaign={campaign}
                rules={rules}
                economicIndex={economicIndex}
                onAction={handleActionIntercept}
              />
            ) : (
              <div className="interaction-panel">
                <h3>{t(`building.${building.id}`, { defaultValue: building.name })}</h3>
                <p style={{ fontSize: '12px' }}>{t('buildingModal.dontLiveHere', "You don't live here.")}</p>
              </div>
            )
          )}
        </>
      )}
    </>
  );

  return (
    <div className="building-modal">
      <button className="building-modal__close" onClick={onClose}>&times;</button>
      
      <div className="building-modal__header">
        <div className="building-modal__face" style={{ position: 'relative' }}>
          {currentFace}
          {clerkMessage && shouldShowSpeechBubble && <SpeechBubble message={clerkMessage} />}
        </div>
        <div className="building-modal__title-group">
          <h2>{t(`building.${building.id}`, { defaultValue: building.name })}</h2>
          <p>{t(`buildingDesc.${building.id}`, { defaultValue: building.description })}</p>
        </div>
      </div>

      <div className="building-modal__content">
        {playerJobHere ? (
          <div 
            className="building-modal__columns"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 320px) 1fr',
              gap: '16px',
              alignItems: 'start'
            }}
          >
            {/* Left Column: Work Station */}
            <div 
              data-testid="tab-work"
              style={{
                background: 'rgba(41, 128, 185, 0.12)',
                border: '1px solid rgba(52, 152, 219, 0.35)',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2em' }}>💼</span>
                <div>
                  <strong style={{ color: 'var(--accent-cyan)', display: 'block', fontSize: '1.0em' }}>
                    {t('workStation.title', { jobTitle: t(`job.${playerJobHere.id}`, { defaultValue: playerJobHere.title }) })}
                  </strong>
                  <span style={{ fontSize: '0.85em', color: '#bbb' }}>
                    ${player.currentWage}/hr
                  </span>
                </div>
              </div>

              <WorkStation
                player={player}
                onAction={handleActionIntercept}
                job={playerJobHere}
                campaign={campaign}
              />
            </div>

            {/* Right Column: Shop & Building Services */}
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {renderBuildingServices()}
            </div>
          </div>
        ) : (
          /* Single Column: When not employed here */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {renderBuildingServices()}
          </div>
        )}
      </div>
    </div>
  );
}
