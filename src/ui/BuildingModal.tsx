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
  PawnShop,
  DiscountAndPawnShop
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
  const [activeTab, setActiveTab] = useState<'shop' | 'pawn'>('shop');
  const [isWorkOpen, setIsWorkOpen] = useState<boolean>(true);
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

  if (!player || !campaign || !currentBuildingId || !building) return null;

  // Check if the player's current job is at this building
  const playerJobHere = player.currentJobId 
    ? campaign.jobs.find(j => j.id === player.currentJobId && j.locationId === currentBuildingId)
    : null;

  // Items available at this building
  let itemsHere = (building.inventory || [])
    .map(inv => {
      const baseItem = campaign.items.find(i => i.id === inv.itemId);
      if (!baseItem) return null;
      return {
        ...baseItem,
        basePrice: inv.priceOverride ?? baseItem.basePrice ?? 0
      };
    })
    .filter(Boolean) as import('../engine/dataLoader').ItemDef[];

  // Z-Mart & Discount Store randomization (show 6 items consistently per week per player)
  if ((building.id === 'z_mart' || building.id === 'discount_and_pawn' || building.archetype === 'discount_and_pawn') && itemsHere.length > 6) {
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
      const isErrorLog = (log: any) => log?.key?.includes?.('.error') || log?.key === 'action.loan.refused' || log?.key === 'action.rent.extensionDenied';
      const mainLog = Array.isArray(actionLog) ? actionLog[0] : actionLog;

      if (mainLog?.key === 'action.error.cannotWork') {
        nextMsg = "No time is left to work.";
      } else if (mainLog?.key?.startsWith?.('action.error.notEnoughTime')) {
        if (payload.type === 'enroll' || payload.type === 'study') {
          nextMsg = "No time is left to go to class.";
        } else if (payload.type === 'work') {
          nextMsg = String(t(mainLog.key, mainLog.params as any));
        } else {
          nextMsg = "Sorry. We're closing. You'll have to come back next week.";
        }
      } else if (mainLog?.key?.startsWith?.('action.error.too')) {
        nextMsg = String(t(mainLog.key, mainLog.params as any));
      } else {
        const success = Array.isArray(actionLog) ? !actionLog.some(isErrorLog) : !isErrorLog(actionLog);

        if (payload.type === 'buy') {
          if (success) {
            let key = `clerkDialogs.${building.id}.buySuccess`;
            if (building.id === 'discount_and_pawn' || building.archetype === 'discount_and_pawn') {
              key = 'clerkDialogs.z_mart.buySuccess';
            }
            nextMsg = getRandomMessage(key, t('clerkDialogs.default.buySuccess'));
          } else if (mainLog?.key === 'action.error.notEnoughSpace') {
            nextMsg = String(t('action.error.notEnoughSpace', mainLog.params));
          } else {
            nextMsg = "You do not have enough cash.";
          }
        } else if (payload.type === 'pawn_item') {
          if (success) {
            let key = `clerkDialogs.${building.id}.pawnSuccess`;
            if (building.id === 'discount_and_pawn' || building.archetype === 'discount_and_pawn') {
              key = 'clerkDialogs.pawn_shop.pawnSuccess';
            }
            nextMsg = getRandomMessage(key, t('clerkDialogs.default.buySuccess'));
          } else {
            nextMsg = t(mainLog.key, { defaultValue: 'Pawn failed.' });
          }
        } else if (payload.type === 'redeem_item' || payload.type === 'buy_pawn_item') {
          if (success) {
            let key = `clerkDialogs.${building.id}.redeemSuccess`;
            if (building.id === 'discount_and_pawn' || building.archetype === 'discount_and_pawn') {
              key = 'clerkDialogs.pawn_shop.redeemSuccess';
            }
            nextMsg = getRandomMessage(key, t('clerkDialogs.default.buySuccess'));
          } else if (mainLog?.key === 'action.error.notEnoughSpace') {
            nextMsg = String(t('action.error.notEnoughSpace', mainLog.params));
          } else {
            nextMsg = "You do not have enough cash.";
          }
        } else if (payload.type === 'study') {
          if (success) {
            nextMsg = getRandomMessage(`clerkDialogs.university.studySuccess`, 'Good job studying!');
          }
        } else if (payload.type === 'enroll') {
          if (success) {
            nextMsg = getRandomMessage(`clerkDialogs.university.enrollSuccess`, 'Welcome to the class!');
          } else {
            nextMsg = "You do not have enough cash.";
          }
        } else if (payload.type === 'apply') {
          if (mainLog.key === 'action.job.raiseSuccess') {
            nextMsg = String(t('action.job.raiseSuccess', mainLog.params));
          } else if (mainLog.key === 'action.job.raiseDenied') {
            nextMsg = String(t('action.job.raiseDenied', { defaultValue: 'Raise denied.' }));
          } else if (mainLog.key === 'action.job.hired' || mainLog.key === 'action.job.gotJob') {
            nextMsg = String(t(mainLog.key, mainLog.params));
          } else if (mainLog.key === 'action.job.raiseWaste') {
            nextMsg = String(t('action.job.raiseWaste'));
          } else if (mainLog.key === 'action.job.raiseSame') {
            nextMsg = String(t('action.job.raiseSame'));
          } else if (mainLog.key === 'action.job.raiseLess') {
            nextMsg = String(t('action.job.raiseLess'));
          } else if (mainLog.key === 'action.job.rejected') {
            const reasons = mainLog.params?.reasons || t('jobBoard.missingReq');
            nextMsg = `Sorry. You didn't get the job for the following reasons:\n\n${reasons}`;
          } else if (mainLog.key === 'action.job.noOpenings') {
            nextMsg = `Sorry. You didn't get the job for the following reasons:\n\nNo openings.`;
          }
        } else if (payload.type === 'work') {
          if (Array.isArray(actionLog)) {
            const speechParts = actionLog
              .filter(l => l.key !== 'action.job.worked')
              .map(l => String(t(l.key, l.params as any)));
            if (speechParts.length > 0) {
              nextMsg = speechParts.join('\n\n');
            }
          } else if (mainLog.key !== 'action.job.worked') {
            nextMsg = String(t(mainLog.key, mainLog.params as any));
          }
        } else if (payload.type === 'ask_rent_extension') {
          if (mainLog.key === 'action.rent.alreadyGranted') {
            nextMsg = "I already told you yes!";
          } else if (mainLog.key === 'action.rent.extensionApproved') {
            nextMsg = getRandomMessage(`clerkDialogs.apartment_complex.extensionApproved`, 'Sure, you can pay next week.');
          } else {
            nextMsg = getRandomMessage(`clerkDialogs.apartment_complex.extensionDenied`, 'Sorry, your rent must be paid now.');
          }
        } else if (payload.type === 'move_apartment') {
          if (mainLog.key === 'action.rent.alreadyLiveHere') {
            const aptName = mainLog.params?.name || 'apartment';
            nextMsg = `You already live at the ${aptName}!`;
          } else if (mainLog.key === 'action.rent.moved') {
            nextMsg = getRandomMessage(`clerkDialogs.apartment_complex.moved`, 'Here are your new keys. Enjoy your stay.');
          } else if (mainLog.key === 'action.error.notEnoughSpaceMove') {
            nextMsg = String(t('action.error.notEnoughSpaceMove', mainLog.params));
          } else if (success) {
            const isLowCost = payload.housingId === 'low_cost' || payload.housingId === 'low_cost_housing';
            const moveKey = isLowCost ? 'moveInLowCost' : 'moveInSecurity';
            nextMsg = getRandomMessage(`clerkDialogs.apartment_complex.${moveKey}`, 'Welcome.');
          } else {
            nextMsg = "You do not have enough cash.";
          }
        } else if (payload.type === 'bank_transaction') {
          if (success) {
            if (payload.amount > 0) {
              nextMsg = getRandomMessage(`clerkDialogs.bank.depositSuccess`, 'Deposit accepted.');
            } else {
              nextMsg = getRandomMessage(`clerkDialogs.bank.withdrawSuccess`, 'Here is your cash.');
            }
          } else {
            nextMsg = "Transaction could not be completed.";
          }
        } else if (payload.type === 'stock_transaction') {
          if (success) {
            if (payload.shares > 0) {
              nextMsg = getRandomMessage(`clerkDialogs.bank.stockBuySuccess`, 'Shares purchased.');
            } else {
              nextMsg = getRandomMessage(`clerkDialogs.bank.stockSellSuccess`, 'Shares sold.');
            }
          } else {
            nextMsg = "You do not have enough funds or shares.";
          }
        } else if (payload.type === 'take_loan') {
          if (success) {
            nextMsg = getRandomMessage(`clerkDialogs.bank.loanApproved`, 'Loan approved.');
          } else {
            nextMsg = getRandomMessage(`clerkDialogs.bank.loanDenied`, 'Loan application denied.');
          }
        } else if (payload.type === 'pay_loan') {
          if (success) {
            nextMsg = t('action.loan.paidInstallment', mainLog.params) as string;
          } else {
            nextMsg = "You do not have enough cash.";
          }
        } else if (payload.type === 'pay_rent_advance') {
          if (success) {
            nextMsg = getRandomMessage(`clerkDialogs.apartment_complex.rentPaidAdvance`, 'Thank you for paying your rent in advance.');
          } else {
            nextMsg = "You do not have enough cash to pay rent in advance.";
          }
        } else if (payload.type === 'rent_transaction') {
          if (success) {
            nextMsg = getRandomMessage(`clerkDialogs.apartment_complex.rentPaid`, 'Thank you for paying your rent.');
          } else {
            nextMsg = "You do not have enough cash.";
          }
        }
      }
    }

    if (nextMsg) {
      setClerkMessage(nextMsg);
      justUpdatedMessageRef.current = true;
    }
    return actionLog;
  };

  const getFace = (id: string, archetype: string) => {
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
  };

  const housing = campaign.housing.find(h => h.id === player.currentHousingId);
  const homeNode = campaign.map.nodes.find(n => n.id === housing?.homeNodeId);
  const livesHere = homeNode?.buildingId === building.id;

  const isWeek4 = turn % 4 === 0;
  const rentDue = player.rentPaidUntilWeek <= turn + 1;
  const isRentOfficeOpen = isWeek4 || rentDue || player.turnFlags.rentPaidThisTurn || !!playerJobHere;
  const isDiscountAndPawn = building.archetype === 'discount_and_pawn';
  const shouldShowSpeechBubble = building.archetype !== 'home' && (building.id !== 'apartment_complex' || isRentOfficeOpen);

  // Reset tab on building change
  useEffect(() => {
    setActiveTab('shop');
    setIsWorkOpen(true);
  }, [building.id]);

  let currentFace = getFace(building.id, building.archetype);
  if (building.archetype === 'home' && !livesHere) {
    currentFace = '🚫';
  } else if (building.id === 'apartment_complex' && !isRentOfficeOpen) {
    currentFace = '🚫';
  }

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
            </div>
          </div>
        ) : (
          /* Single Column: When not employed here */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

            {/* Other Buildings: Primary service/shop menu */}
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
          </div>
        )}
      </div>
    </div>
  );
}
