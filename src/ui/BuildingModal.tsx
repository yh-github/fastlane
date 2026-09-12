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
import { AppraisalDilemmaModal } from './buildings/work/AppraisalDilemmaModal';
import { SpeechBubble } from './SpeechBubble';
import { getClerkFace, getAvailableItemsForBuilding, computeClerkResponse } from './buildingModal';
import { calcEffectiveRobberyChance } from '../engine/statMath';

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
  const [isWorkDeckOpen, setIsWorkDeckOpen] = useState(true);
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
    setIsWorkDeckOpen(true);
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
          {itemsHere.length > 0 && building.archetype !== 'pawnshop' && (
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
                turn={turn}
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
      {!player?.pendingAppraisalDilemma && (
        <button className="building-modal__close" onClick={onClose}>&times;</button>
      )}
      
      <div className="building-modal__header">
        <div className="building-modal__face" style={{ position: 'relative' }}>
          {currentFace}
          {clerkMessage && shouldShowSpeechBubble && <SpeechBubble message={clerkMessage} />}
        </div>
        <div className="building-modal__title-group">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <h2>{t(`building.${building.id}`, { defaultValue: building.name })}</h2>
            {rules?.helpfulUI && building.archetype === 'home' && livesHere && (() => {
              const robberyRate = (calcEffectiveRobberyChance(player, rules, turn, campaign) * 100).toFixed(1);
              const willyStartWeek = campaign?.config?.eventRules?.willyRobberyStartWeek ?? 4;
              const isInactive = turn < willyStartWeek;
              const isProtectedHousing = player.currentHousingId === 'security' || player.currentHousingId === 'security_apartments' || player.currentHousingId === 'penthouse';
              
              let homeTimeStr = '';
              if (rules?.useHomeTimeRobbery) {
                const history = [...(player.homeTimeHistory || []), player.homeTimeThisTurn || 0];
                const meanHome = history.length > 0 ? (history.reduce((a, b) => a + b, 0) / history.length) : 0;
                homeTimeStr = `${Math.round(meanHome)}h/wk · `;
              }

              return (
                <span 
                  data-testid="home-burglary-badge"
                  style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    background: 'rgba(0, 229, 255, 0.1)',
                    border: '1px solid var(--accent-cyan, #00e5ff)',
                    color: 'var(--accent-cyan, #00e5ff)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginInlineEnd: '48px',
                    marginTop: '10px'
                  }}
                  title={isProtectedHousing ? 'Protected by Security Housing' : (isInactive ? `Inactive until Week ${willyStartWeek}` : undefined)}
                >
                  🏠 {homeTimeStr}Break-in Risk: {robberyRate}%{isProtectedHousing ? ' (Protected)' : (isInactive ? ' (Inactive)' : '')}
                </span>
              );
            })()}
          </div>
          <p>{t(`buildingDesc.${building.id}`, { defaultValue: building.description })}</p>
        </div>
      </div>

      <div className="building-modal__content" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Full-width shop / services content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {renderBuildingServices()}
        </div>

        {/* Docked bottom WORK button when employed here */}
        {playerJobHere && (
          <div 
            className="building-modal__work-dock"
            data-testid="tab-work"
            style={{
              marginTop: 'auto',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexShrink: 0
            }}
          >
            <button
              data-testid="btn-toggle-work"
              data-action-target={`work-${playerJobHere.id}`}
              onClick={() => setIsWorkDeckOpen(!isWorkDeckOpen)}
              style={{
                width: '100%',
                maxWidth: '520px',
                padding: '9px 16px',
                background: isWorkDeckOpen
                  ? 'linear-gradient(145deg, #0284c7 0%, #0369a1 100%)'
                  : 'linear-gradient(145deg, #059669 0%, #047857 100%)',
                color: '#fff',
                border: isWorkDeckOpen ? '2px solid #38bdf8' : '2px solid #34d399',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '0.92rem',
                cursor: 'pointer',
                boxShadow: isWorkDeckOpen
                  ? '0 0 14px rgba(56, 189, 248, 0.4), 0 3px 10px rgba(0,0,0,0.5)'
                  : '0 0 14px rgba(52, 211, 153, 0.4), 0 3px 10px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>💼</span>
              <span>
                {isWorkDeckOpen
                  ? t('workStation.hideWorkDeck', { defaultValue: 'Hide Work Console' })
                  : t('workStation.showWorkDeck', {
                      defaultValue: `Work Shift (${playerJobHere.title} — $${player.currentWage || playerJobHere.baseWage}/hr)`
                    })}
              </span>
              <span style={{
                fontSize: '0.75rem',
                background: 'rgba(0,0,0,0.35)',
                padding: '2px 6px',
                borderRadius: '4px',
                color: '#cbd5e1'
              }}>
                ⏳ {player.hoursRemaining}h
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Flanking Radial Work Cards (Steals screen space from surrounding board, 0% obstruction of store!) */}
      {playerJobHere && isWorkDeckOpen && (
        <WorkStation
          player={player}
          onAction={handleActionIntercept}
          job={playerJobHere}
          campaign={campaign}
          rules={rules}
          layoutMode="flanking"
          onClose={() => setIsWorkDeckOpen(false)}
        />
      )}

      {player?.pendingAppraisalDilemma && (
        <AppraisalDilemmaModal
          dilemma={player.pendingAppraisalDilemma}
          onSelectOption={(idx) => handleActionIntercept({ type: 'resolve_appraisal_dilemma', choiceIndex: idx })}
        />
      )}
    </div>
  );
}
