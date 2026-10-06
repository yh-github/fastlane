import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { CampaignBundle } from '../../engine/dataLoader';
import { type GameRules, collectItemEffects, type OwnedAppliance } from '../../engine/gameState';
import { calcEconomyPrice } from '../../engine/economyEngine';
import { calcMaxMess, roundToResolution, calcUsedSpace, calcHousingSpaceCap, calcSocializeParameters, formatHours } from '../../engine/statMath';
import { HomeApartmentView } from './home/HomeApartmentView';
import { DurableCardModal } from './home/DurableCardModal';
import { ApartmentFurnishings } from './home/ApartmentFurnishings';
import { PantryDetailsModal } from './home/PantryDetailsModal';
import type { InteractionProps } from './types';

export function HomeRelax({ player, onAction, campaign, rules, economicIndex = 0, turn = 1 }: InteractionProps & { campaign?: CampaignBundle, rules?: GameRules, economicIndex?: number, turn?: number }) {
  const { t } = useTranslation();
  const [showUnfedWarning, setShowUnfedWarning] = useState(false);
  const [warnedThisVisit, setWarnedThisVisit] = useState(false);
  const [showMessDetails, setShowMessDetails] = useState(false);
  const [showPantryPopup, setShowPantryPopup] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const [inspectedDurable, setInspectedDurable] = useState<{
    id: string;
    isBook?: boolean;
    applianceData?: OwnedAppliance;
    isOwned?: boolean;
  } | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const [modalParent, setModalParent] = useState<HTMLElement | null>(null);

  // Esc key closes internal sub-popups first
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showUnfedWarning) {
          e.stopImmediatePropagation();
          setShowUnfedWarning(false);
          return;
        }
        if (showMessDetails) {
          e.stopImmediatePropagation();
          setShowMessDetails(false);
          return;
        }
        if (showPantryPopup) {
          e.stopImmediatePropagation();
          setShowPantryPopup(false);
          return;
        }
        if (inspectedDurable) {
          e.stopImmediatePropagation();
          setInspectedDurable(null);
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [showUnfedWarning, showMessDetails, showPantryPopup, inspectedDurable]);

  useEffect(() => {
    if (panelRef.current) {
      const modal = panelRef.current.closest<HTMLElement>('.building-modal');
      if (modal) {
        modal.style.overflow = 'visible';
        setModalParent(modal);
      }
      const content = panelRef.current.closest<HTMLElement>('.building-modal__content');
      const prevOverflow = content?.style.overflowY;
      const prevDisplay = content?.style.display;
      const prevDirection = content?.style.flexDirection;
      if (content) {
        content.style.overflowY = 'hidden';
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
      }
      const parent = panelRef.current.parentElement;
      const prevParentHeight = parent?.style.height;
      const prevParentFlex = parent?.style.flex;
      const prevParentMinHeight = parent?.style.minHeight;
      const prevParentDisplay = parent?.style.display;
      const prevParentDirection = parent?.style.flexDirection;
      if (parent && parent !== content) {
        parent.style.height = '100%';
        parent.style.flex = '1';
        parent.style.minHeight = '0';
        parent.style.display = 'flex';
        parent.style.flexDirection = 'column';
      }
      return () => {
        if (content) {
          content.style.overflowY = prevOverflow || '';
          content.style.display = prevDisplay || '';
          content.style.flexDirection = prevDirection || '';
        }
        if (parent && parent !== content) {
          parent.style.height = prevParentHeight || '';
          parent.style.flex = prevParentFlex || '';
          parent.style.minHeight = prevParentMinHeight || '';
          parent.style.display = prevParentDisplay || '';
          parent.style.flexDirection = prevParentDirection || '';
        }
      };
    }
  }, []);

  const handleHomeAction = async (payload: any) => {
    setActionFeedback(null);
    const result = await onAction(payload);
    if (result) {
      const log = Array.isArray(result) ? result[0] : result;
      if (log?.key?.includes?.('error')) {
        setActionFeedback({ message: String(t(log.key, log.params || { defaultValue: log.key })), isError: true });
      }
    }
    return result;
  };

  const relaxCost = campaign?.config.timeRules?.relaxCost ?? 6;
  const isDivisible = !!rules?.proportionalDivisibleActions;
  const hoursToRelax = player.hoursRemaining > 0 ? Math.min(relaxCost, player.hoursRemaining) : 0;
  const relaxRatio = relaxCost > 0 ? hoursToRelax / relaxCost : 1;
  const isRelaxDisabled = player.hoursRemaining <= 0 || (player.hoursRemaining < relaxCost && !rules?.allowPartialHours && !isDivisible);

  const currentMess = player.mess || 0;
  const maxMessHousing = calcMaxMess(player, campaign?.config.statRules);
  const isMessClean = currentMess <= 0;

  // Space & Mess calculation
  const durablesSpace = calcUsedSpace(player, campaign, false);
  const totalUsedSpace = durablesSpace + currentMess;
  const spaceCap = calcHousingSpaceCap(player, campaign);
  const freeSpace = Math.max(0, spaceCap - totalUsedSpace);
  const overflow = Math.max(0, totalUsedSpace - spaceCap);
  const isOvercapacity = overflow > 0;

  const durablesPct = spaceCap > 0 ? Math.min(100, (durablesSpace / spaceCap) * 100) : 0;
  const messPct = spaceCap > 0 ? Math.min(100, (currentMess / spaceCap) * 100) : 0;

  // Socialize logic
  const socialParams = calcSocializeParameters(player, campaign, rules);
  const cleaningServiceCost = campaign?.config.timeRules?.cleaningServiceCost ?? 1;
  const cleaningServiceBasePrice = campaign?.config.economyRules?.cleaningServiceBasePrice ?? 100;
  const cleaningServicePrice = calcEconomyPrice(cleaningServiceBasePrice, economicIndex);
  const canAffordCleaning = player.money >= cleaningServicePrice;

  const isPenthouse = player.currentHousingId === 'penthouse';
  const isSecurity = player.currentHousingId === 'security';

  const cleanPhysicalCost = campaign?.config.statRules?.cleanPhysicalCost ?? 1;
  const hoursToClean = player.hoursRemaining > 0 ? Math.min(3, player.hoursRemaining) : 3;
  const cleanRatio = hoursToClean / 3;
  const cleanPhysGain = Math.max(0.5, roundToResolution(cleanPhysicalCost * cleanRatio, 0.5));
  const isTooExhaustedForClean = !!rules?.usePhysicalMentalConditions && ((player.physicalCondition ?? 50) - cleanPhysGain < 1.0);
  const isNotEnoughTimeForClean = player.hoursRemaining <= 0;
  const isCleanDisabled = isMessClean || isNotEnoughTimeForClean || isTooExhaustedForClean;
  const cleanSubtext = `Cleans 🧹 ${rules?.usePhysicalMentalConditions ? `(-${cleanPhysGain} 💪)` : ''}`;

  const isNotEnoughTimeForService = player.hoursRemaining < cleaningServiceCost;
  const isCannotAffordService = !canAffordCleaning;
  const isServiceDisabled = isMessClean || isCannotAffordService || isNotEnoughTimeForService;
  const serviceSubtext = 'Professional cleaning (-10 🧹)';

  const hasFood = (player.inventory?.freshFoodUnits || 0) > 0 || (player.inventory?.fastFoodItems?.length || 0) > 0 || (player.inventory?.cannedFoodUnits || 0) > 0;

  const relaxEffects = collectItemEffects(player, campaign, 'on_relax');
  const physBonus = relaxEffects.get('physical') || 0;
  const mentalBonus = relaxEffects.get('mental') || 0;
  const extraMess = relaxEffects.get('mess') || 0;

  let physGain = 0;
  let mentalGain = 0;
  let scaledMess = 0;
  let classicGain = 0;
  let classicFirstBonus = 0;
  const conditionRes = rules?.conditionResolution ?? 0.5;

  if (rules?.usePhysicalMentalConditions) {
    if (hasFood) {
      const mentalStat = player.mentalCondition ?? 50;
      const rawPhysGain = 1 + Math.floor(mentalStat / 25) + physBonus;
      physGain = (isDivisible && hoursToRelax < relaxCost)
        ? Math.max(0.5, roundToResolution(rawPhysGain * relaxRatio, conditionRes))
        : rawPhysGain;

      const firstBonus = player.turnFlags?.relaxedThisTurn ? 0 : 2;
      const messPenalty = Math.floor((player.mess || 0) / 5);
      const socialMentalBonus = Math.floor((player.social || 0) / 15);
      const rawMentalGain = Math.max(0, firstBonus + 3 - messPenalty) + mentalBonus + socialMentalBonus;
      mentalGain = (isDivisible && hoursToRelax < relaxCost)
        ? Math.max(0.5, roundToResolution(rawMentalGain * relaxRatio, conditionRes))
        : rawMentalGain;

      if (rules.trackMess) {
        const baseRelaxMess = campaign?.config.statRules?.relaxMessIncrease ?? 1;
        const relaxMess = baseRelaxMess + extraMess;
        scaledMess = (isDivisible && hoursToRelax < relaxCost)
          ? Math.max(1, Math.round(relaxMess * relaxRatio))
          : relaxMess;
      }
    } else {
      const rawPhysGain = 1;
      const rawMentalGain = 1;
      physGain = (isDivisible && hoursToRelax < relaxCost)
        ? Math.max(0.5, roundToResolution(rawPhysGain * relaxRatio, conditionRes))
        : rawPhysGain;
      mentalGain = (isDivisible && hoursToRelax < relaxCost)
        ? Math.max(0.5, roundToResolution(rawMentalGain * relaxRatio, conditionRes))
        : rawMentalGain;

      if (rules.trackMess) {
        const baseRelaxMess = campaign?.config.statRules?.relaxMessIncrease ?? 1;
        scaledMess = (isDivisible && hoursToRelax < relaxCost)
          ? Math.max(1, Math.round(baseRelaxMess * relaxRatio))
          : baseRelaxMess;
      }
    }
  } else {
    const baseRelaxGain = campaign?.config.timeRules?.relaxGain ?? 3;
    classicGain = (isDivisible && hoursToRelax < relaxCost)
      ? Math.max(1, Math.round(baseRelaxGain * relaxRatio))
      : baseRelaxGain;
    classicFirstBonus = !player.turnFlags?.relaxedThisTurn ? 2 : 0;
  }

  const handleRelaxClick = () => {
    if (rules?.usePhysicalMentalConditions && !hasFood && !warnedThisVisit && player.hoursRemaining > 0) {
      setShowUnfedWarning(true);
    } else {
      handleHomeAction({ type: 'relax' });
    }
  };

  let messIcon = '🗑️';
  let messLabel = 'Spotless';
  let messBarColor = '#2ecc71';

  if (currentMess > 60) {
    messIcon = '🪰🪰🪳🪳 ☣️';
    messLabel = 'Biohazard Emergency!';
    messBarColor = '#e74c3c';
  } else if (currentMess > 50) {
    messIcon = '🪰🪰🪳🪳';
    messLabel = 'Severe Cockroach Infestation!';
    messBarColor = '#e74c3c';
  } else if (currentMess > 40) {
    messIcon = '🪰🪰🪳';
    messLabel = 'Pest & Cockroach Swarm!';
    messBarColor = '#e67e22';
  } else if (currentMess > 30) {
    messIcon = '🪰🪰';
    messLabel = 'Fly Swarm Warning!';
    messBarColor = '#e67e22';
  } else if (currentMess > 20) {
    messIcon = '🪰';
    messLabel = 'Flies Appearing!';
    messBarColor = '#f1c40f';
  } else if (currentMess > 10) {
    messIcon = '📦📦';
    messLabel = 'Messy';
    messBarColor = '#f1c40f';
  } else if (currentMess > 3) {
    messIcon = '📦';
    messLabel = 'Minor Mess';
    messBarColor = '#2ecc71';
  }

  const messPercentage = Math.min(100, Math.round((currentMess / maxMessHousing) * 100));

  const hasFridge = player.inventory?.appliances?.some(a => a.id === 'refrigerator' || campaign?.items?.find(i => i.id === a.id)?.tags?.includes('refrigerator')) ?? false;
  const hasFreezer = player.inventory?.appliances?.some(a => a.id === 'freezer' || campaign?.items?.find(i => i.id === a.id)?.tags?.includes('freezer')) ?? false;

  const housingDef = campaign?.housing?.find(h => h.id === player.currentHousingId);
  const housingName = housingDef ? t(`housing.${housingDef.id}`, { defaultValue: housingDef.name }) : (isPenthouse ? 'Penthouse Suite' : isSecurity ? 'Security Apartments' : 'Low-Cost Housing');

  const useAdvancedHome = rules?.advancedHomeGUI ?? rules?.usePhysicalMentalConditions ?? false;

  const unfedWarningPortal = showUnfedWarning && typeof document !== 'undefined' && createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
      padding: '16px', boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#2c1e1e', padding: '20px', borderRadius: '10px', maxWidth: '420px', width: '100%', maxHeight: '90vh',
        overflowY: 'auto', boxSizing: 'border-box', border: '1px solid #e74c3c', color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#e74c3c' }}>
          ⚠️ {t('action.unfedRelaxModal.title', { defaultValue: 'Relax Without Food?' })}
        </h3>
        <p style={{ fontSize: '0.9em', lineHeight: '1.4', marginBottom: '16px' }}>
          {t('action.unfedRelaxModal.warning', { defaultValue: 'You have no food in your inventory! Relaxing while starving will permanently reduce your Max Physical and Max Mental capacity by 1.' })}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={() => setShowUnfedWarning(false)}
            style={{ padding: '6px 12px', background: '#555', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            ✕ {t('action.unfedRelaxModal.cancel', { defaultValue: 'Cancel' })}
          </button>
          <button
            data-testid="confirm-unfed-relax"
            onClick={() => {
              setWarnedThisVisit(true);
              setShowUnfedWarning(false);
              handleHomeAction({ type: 'relax' });
            }}
            style={{ padding: '6px 12px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ⚠️ {t('action.unfedRelaxModal.confirm', { defaultValue: 'Relax Anyway' })}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

  if (useAdvancedHome) {
    return (
      <>
        <HomeApartmentView
          player={player}
          campaign={campaign}
          rules={rules}
          housingName={housingName}
          actionFeedback={actionFeedback}
          durablesSpace={durablesSpace}
          totalUsedSpace={totalUsedSpace}
          spaceCap={spaceCap}
          freeSpace={freeSpace}
          overflow={overflow}
          isOvercapacity={isOvercapacity}
          durablesPct={durablesPct}
          messPct={messPct}
          currentMess={currentMess}
          maxMessHousing={maxMessHousing}
          messIcon={messIcon}
          messLabel={messLabel}
          messBarColor={messBarColor}
          messPercentage={messPercentage}
          hoursToRelax={hoursToRelax}
          isRelaxDisabled={isRelaxDisabled}
          hasFood={hasFood}
          physGain={physGain}
          mentalGain={mentalGain}
          scaledMess={scaledMess}
          classicGain={classicGain}
          classicFirstBonus={classicFirstBonus}
          onRelaxClick={handleRelaxClick}
          socialParams={socialParams}
          onSocializeClick={() => handleHomeAction({ type: 'socialize_guests' })}
          hoursToClean={hoursToClean}
          cleanPhysGain={cleanPhysGain}
          isCleanDisabled={isCleanDisabled}
          cleanSubtext={cleanSubtext}
          onCleanClick={() => handleHomeAction({ type: 'clean' })}
          cleaningServiceCost={cleaningServiceCost}
          cleaningServicePrice={cleaningServicePrice}
          isServiceDisabled={isServiceDisabled}
          serviceSubtext={serviceSubtext}
          onServiceClick={() => handleHomeAction({ type: 'call_cleaning_service' })}
          hasFridge={hasFridge}
          hasFreezer={hasFreezer}
          economicIndex={economicIndex}
          turn={turn}
          onAction={handleHomeAction}
        />
        {unfedWarningPortal}
      </>
    );
  }

  return (
    <div 
      ref={panelRef}
      className="home-basic-panel" 
      style={{ 
        width: '100%', 
        height: '100%', 
        flex: '1 1 auto',
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: 0, 
        position: 'relative',
        paddingBottom: 0
      }}
    >
      {actionFeedback && (
        <div style={{
          padding: '6px 10px',
          marginBottom: '8px',
          borderRadius: '5px',
          backgroundColor: actionFeedback.isError ? 'rgba(231, 76, 60, 0.2)' : 'rgba(46, 204, 113, 0.2)',
          border: `1px solid ${actionFeedback.isError ? '#e74c3c' : '#2ecc71'}`,
          color: actionFeedback.isError ? '#ff8585' : '#85ffb5',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexShrink: 0
        }}>
          <span>{actionFeedback.isError ? '⚠️' : '✓'}</span>
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Main scrollable area */}
      <div style={{ flex: '1 1 auto', height: '100%', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* Unified Space & Mess Status Overview (Only if trackMess or spaceCapping is active) */}
        {(rules?.trackMess || rules?.spaceCapping) && (
          <div 
            className="mess-visual-card"
            data-testid="compact-mess-bar"
            onClick={() => setShowMessDetails(true)}
            style={{ 
              marginBottom: '4px', 
              padding: '6px 10px', 
              background: 'linear-gradient(135deg, rgba(20,20,35,0.85) 0%, rgba(35,35,55,0.85) 100%)', 
              borderRadius: '6px',
              border: isOvercapacity ? '1px solid #e74c3c' : `1px solid ${messBarColor}`,
              boxShadow: isOvercapacity ? '0 0 10px rgba(231,76,60,0.4)' : `0 0 8px ${messBarColor}22`,
              cursor: 'pointer'
            }}
            title={t('homeRelax.messClickDetails', { defaultValue: 'Click to view apartment space and mess breakdown' })}
          >
            {rules?.spaceCapping ? (
              <div 
                style={{ 
                  width: '100%', 
                  height: '20px', 
                  backgroundColor: 'rgba(255,255,255,0.08)', 
                  borderRadius: '6px', 
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 8px'
                }}
              >
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${durablesPct}%`,
                  backgroundColor: '#00e5ff',
                  transition: 'width 0.3s ease',
                  zIndex: 1
                }} />
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: `${messPct}%`,
                  background: isOvercapacity 
                    ? 'repeating-linear-gradient(45deg, #e74c3c, #e74c3c 6px, #f39c12 6px, #f39c12 12px)'
                    : messBarColor,
                  boxShadow: isOvercapacity ? '0 0 8px rgba(231,76,60,0.8)' : undefined,
                  transition: 'width 0.3s ease',
                  zIndex: 2
                }} />
                <span style={{ position: 'relative', zIndex: 5, fontWeight: 'bold', fontSize: '0.78rem', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                  🛋️ {durablesSpace} space
                </span>
                <span style={{ position: 'relative', zIndex: 5, fontWeight: 'bold', fontSize: '0.78rem', color: isOvercapacity ? '#ff6b6b' : '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                  {isOvercapacity ? `⚠️ OVERCROWDED (+${overflow})` : freeSpace === 0 ? 'FULL' : `${freeSpace} free`}
                </span>
                <span style={{ position: 'relative', zIndex: 5, fontWeight: 'bold', fontSize: '0.78rem', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                  {messIcon} {currentMess} ({messLabel})
                </span>
              </div>
            ) : (
              <div style={{ 
                width: '100%', 
                height: '20px', 
                backgroundColor: 'rgba(255,255,255,0.1)', 
                borderRadius: '6px', 
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 8px'
              }}>
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${messPercentage}%`,
                  backgroundColor: messBarColor,
                  transition: 'width 0.5s ease-in-out, background-color 0.5s ease',
                  zIndex: 1
                }} />
                <span style={{ position: 'relative', zIndex: 5, fontWeight: 'bold', fontSize: '0.78rem', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                  {messIcon} Mess: {currentMess}
                </span>
                <span style={{ position: 'relative', zIndex: 5, fontWeight: 'bold', fontSize: '0.78rem', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                  {messLabel}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Cleaning & Maintenance (Only if trackMess is active) */}
        {rules?.trackMess && (
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h4 style={{ margin: '0 0 6px 0', color: '#3498db', fontSize: '0.85em' }}>🧹 Cleaning & Maintenance</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                data-action-target="clean" 
                onClick={() => handleHomeAction({ type: 'clean' })}
                style={{ 
                  backgroundColor: isCleanDisabled ? '#444' : '#2980b9', 
                  color: isCleanDisabled ? '#bbb' : '#fff', 
                  border: 'none', 
                  padding: '6px 10px', 
                  borderRadius: '4px', 
                  cursor: isCleanDisabled ? 'not-allowed' : 'pointer', 
                  fontWeight: 'bold', 
                  textAlign: 'left', 
                  opacity: isCleanDisabled ? 0.65 : 1,
                  fontSize: '0.85em'
                }}
              >
                <div>🧹 {rules?.helpfulUI ? `Clean Apartment (⏳ ${formatHours(hoursToClean)}h)` : t('homeRelax.cleanBasic', { defaultValue: 'Clean Apartment' })}</div>
                <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '1px', color: isCleanDisabled ? '#ffb3b3' : 'inherit' }}>
                  {cleanSubtext}
                </div>
              </button>

              <button 
                data-action-target="call-cleaning-service" 
                onClick={() => handleHomeAction({ type: 'call_cleaning_service' })}
                style={{ 
                  backgroundColor: isServiceDisabled ? '#444' : '#8e44ad', 
                  color: isServiceDisabled ? '#bbb' : '#fff', 
                  border: 'none', 
                  padding: '6px 10px', 
                  borderRadius: '4px', 
                  cursor: isServiceDisabled ? 'not-allowed' : 'pointer', 
                  fontWeight: 'bold', 
                  textAlign: 'left', 
                  opacity: isServiceDisabled ? 0.65 : 1, 
                  fontSize: '0.85em'
                }}
              >
                <div>🧼 {rules?.helpfulUI ? `Call Cleaning Service (⏳ ${formatHours(cleaningServiceCost)}h, $${cleaningServicePrice})` : t('homeRelax.cleaningServiceBasic', { cost: cleaningServicePrice, defaultValue: `Call Cleaning Service ($${cleaningServicePrice})` })}</div>
                <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '1px', color: isServiceDisabled ? '#ffb3b3' : 'inherit' }}>
                  {serviceSubtext}
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Food & Pantry Pill Badge (Only when helpfulUI is active and not inside BuildingModal) */}
        {rules?.helpfulUI && !modalParent && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', margin: '2px 0' }}>
            <button
              type="button"
              data-testid="pantry-pill-badge"
              onClick={() => setShowPantryPopup(true)}
              title={t('homeRelax.pantryPillTooltip', { defaultValue: 'Pantry & Food Supplies' })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: (player.inventory?.freshFoodUnits || 0) > 0 ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
                border: `1px solid ${(player.inventory?.freshFoodUnits || 0) > 0 ? 'rgba(46, 204, 113, 0.4)' : 'rgba(231, 76, 60, 0.4)'}`,
                color: (player.inventory?.freshFoodUnits || 0) > 0 ? '#2ecc71' : '#ff7675',
                borderRadius: '16px',
                padding: '3px 10px',
                fontSize: '0.82rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span>🥗</span>
              <span>{player.inventory?.freshFoodUnits || 0}</span>
              {(player.inventory?.fastFoodItems?.length || 0) > 0 && (
                <span style={{ fontSize: '0.72rem', color: '#f1c40f', marginLeft: '2px' }}>
                  🍔 {player.inventory?.fastFoodItems?.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Apartment Furnishings & Belongings Centerpiece */}
        <ApartmentFurnishings
          player={player}
          campaign={campaign}
          rules={rules}
          onInspectDurable={setInspectedDurable}
        />
      </div>

      {/* Non-scrollable RELAX button portaled to bottom border of building-modal */}
      {(() => {
        const relaxButtonElement = (
          <div 
            className="home-relax-bottom-dock"
            style={{
              position: 'absolute',
              bottom: modalParent ? '0px' : 'calc(-18px * var(--board-scale, 1))',
              left: '50%',
              transform: 'translate(-50%, 50%)',
              zIndex: 60,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'auto'
            }}
          >
            <button
              data-action-target="relax"
              data-testid="btn-relax"
              onClick={handleRelaxClick}
              disabled={isRelaxDisabled}
              title={rules?.helpfulUI ? (classicFirstBonus > 0 ? `Relax (${formatHours(hoursToRelax)}h) +${classicGain} 🛌 (+${classicFirstBonus} 😊)` : `Relax (${formatHours(hoursToRelax)}h) +${classicGain} 🛌`) : undefined}
              style={{
                background: isRelaxDisabled ? '#333' : 'linear-gradient(180deg, #2ecc71 0%, #27ae60 100%)',
                color: isRelaxDisabled ? '#777' : '#fff',
                border: isRelaxDisabled ? '2px solid #555' : '2px solid #2ecc71',
                boxShadow: isRelaxDisabled ? 'none' : '0 4px 10px rgba(0,0,0,0.8), 0 0 10px rgba(46,204,113,0.5)',
                padding: '4px 18px',
                borderRadius: '4px',
                fontWeight: 'bold',
                fontSize: '0.92rem',
                letterSpacing: '1px',
                cursor: isRelaxDisabled ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                minWidth: 'auto',
                whiteSpace: 'nowrap'
              }}
            >
              {t('homeRelax.relaxBtnText', { defaultValue: 'RELAX' })}
            </button>
          </div>
        );

        return modalParent ? createPortal(relaxButtonElement, modalParent) : relaxButtonElement;
      })()}

      {unfedWarningPortal}

      {showMessDetails && (
        <div 
          data-testid="mess-details-popup"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 100,
            borderRadius: '12px',
            backdropFilter: 'blur(3px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMessDetails(false);
            }
          }}
        >
          <div
            style={{
              background: 'linear-gradient(145deg, #131b2e 0%, #1e293b 100%)',
              border: '2px solid #38bdf8',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.85), 0 0 24px rgba(56, 189, 248, 0.25)',
              borderRadius: '14px',
              padding: '20px 22px',
              maxWidth: '380px',
              width: '92%',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative'
            }}
          >
            <button
              type="button"
              onClick={() => setShowMessDetails(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '12px',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px 8px',
                lineHeight: 1
              }}
              aria-label={t('buildingModal.close', { defaultValue: 'Close' })}
            >
              ✕
            </button>
            <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🧹</div>
            <h3 style={{ margin: '0 0 10px', color: 'var(--accent-cyan, #00e5ff)', fontSize: '1.2rem', fontWeight: 800 }}>
              {t('homeRelax.messDetailsTitle', { defaultValue: 'Apartment Space & Mess Breakdown' })}
            </h3>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              maxWidth: '340px',
              width: '100%',
              fontSize: '0.85rem',
              textAlign: 'start',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '4px' }}>
                <span style={{ color: '#94a3b8' }}>Apartment:</span>
                <span style={{ fontWeight: 'bold' }}>{housingDef?.name || housingName || player.currentHousingId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Capacity:</span>
                <span style={{ fontWeight: 'bold' }}>{spaceCap} space</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#00e5ff' }}>Durables Space:</span>
                <span style={{ fontWeight: 'bold', color: '#00e5ff' }}>{durablesSpace} space</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: messBarColor }}>Current Mess:</span>
                <span style={{ fontWeight: 'bold', color: messBarColor }}>{currentMess} space ({messLabel})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Free Space:</span>
                <span style={{ fontWeight: 'bold', color: isOvercapacity ? '#e74c3c' : '#2ecc71' }}>
                  {isOvercapacity ? `⚠️ Overcrowded (+${overflow})` : `${freeSpace} space`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Max Mess Allowed:</span>
                <span style={{ fontWeight: 'bold' }}>{maxMessHousing}</span>
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '0.78rem', fontStyle: 'italic', marginTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '4px' }}>
                Mess reduces your relaxation rate and penalizes social visits if it exceeds 25. Clean DIY or hire a cleaning service.
              </div>
            </div>
            <button
              type="button"
              className="action-panel__btn"
              data-testid="btn-close-mess-popup"
              onClick={() => setShowMessDetails(false)}
              style={{
                backgroundColor: 'var(--accent-cyan, #00e5ff)',
                color: '#000',
                padding: '6px 20px',
                fontWeight: 'bold',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {t('buildingModal.close', { defaultValue: 'Close' })}
            </button>
          </div>
        </div>
      )}

      {showPantryPopup && (
        <PantryDetailsModal
          player={player}
          campaign={campaign}
          onClose={() => setShowPantryPopup(false)}
        />
      )}

      {/* DURABLE CARD INSPECTION MODAL */}
      {inspectedDurable && (
        <DurableCardModal
          durable={inspectedDurable}
          player={player}
          campaign={campaign}
          rules={rules}
          economicIndex={economicIndex}
          onAction={handleHomeAction}
          onClose={() => setInspectedDurable(null)}
        />
      )}
    </div>
  );
}
