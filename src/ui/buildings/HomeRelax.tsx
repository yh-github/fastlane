import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { CampaignBundle } from '../../engine/dataLoader';
import { type GameRules, collectItemEffects } from '../../engine/gameState';
import { calcEconomyPrice } from '../../engine/economyEngine';
import { calcMaxMess, roundToResolution, calcUsedSpace, calcHousingSpaceCap } from '../../engine/statMath';
import type { InteractionProps } from './types';

export function HomeRelax({ player, onAction, campaign, rules, economicIndex = 0 }: InteractionProps & { campaign?: CampaignBundle, rules?: GameRules, economicIndex?: number }) {
  const { t } = useTranslation();
  const [showUnfedWarning, setShowUnfedWarning] = useState(false);
  const [warnedThisVisit, setWarnedThisVisit] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; isError: boolean } | null>(null);

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

  // Space calculation
  const durablesSpace = calcUsedSpace(player, campaign, false);
  const clutterSpace = (player.mess && player.mess > 0) ? Math.ceil(player.mess / 10) : 0;
  const totalUsedSpace = durablesSpace + clutterSpace;
  const spaceCap = calcHousingSpaceCap(player, campaign);
  const freeSpace = Math.max(0, spaceCap - totalUsedSpace);

  // Socialize logic
  const isNoSpaceForSocial = rules?.spaceCapping ? (freeSpace < 1) : (currentMess > 25);
  const cleaningServiceCost = campaign?.config.timeRules?.cleaningServiceCost ?? 1;
  const cleaningServiceBasePrice = campaign?.config.economyRules?.cleaningServiceBasePrice ?? 100;
  const cleaningServicePrice = calcEconomyPrice(cleaningServiceBasePrice, economicIndex);
  const canAffordCleaning = player.money >= cleaningServicePrice;

  const socializeCost = campaign?.config.timeRules?.socializeCost ?? 6;
  const isTooExhaustedForSocial = !!rules?.usePhysicalMentalConditions && ((player.physicalCondition ?? 50) - 1 < 1.0);
  const isNotEnoughTimeForSocial = player.hoursRemaining < socializeCost;
  const isSocialDisabled = isNoSpaceForSocial || isNotEnoughTimeForSocial || isTooExhaustedForSocial;

  // Pricing & multipliers for socialize
  const isPenthouse = player.currentHousingId === 'penthouse';
  const isSecurity = player.currentHousingId === 'security';
  const cashRate = isPenthouse 
    ? (campaign?.config.economyRules?.socializePenthouseCashCost ?? 75) 
    : isSecurity 
    ? (campaign?.config.economyRules?.socializeSecurityCashCost ?? 50) 
    : (campaign?.config.economyRules?.socializeLowCostCashCost ?? 25);
  const socialMultiplier = isPenthouse ? 3 : isSecurity ? 2 : 1;

  const minCashNeeded = cashRate;
  const currentMental = player.mentalCondition ?? 50;
  const hasSufficientCash = player.money >= minCashNeeded;
  const hasSufficientMental = currentMental >= 5;
  const isHalfRewardExpected = !hasSufficientCash || !hasSufficientMental;

  let socialSubtext = '-1 💪, +👥 (generates 🧹)';
  if (rules?.usePhysicalMentalConditions) {
    if (isSocialDisabled) {
      if (rules?.spaceCapping && freeSpace < 1) {
        socialSubtext = '⚠️ No room for guests (0 free space)';
      } else if (!rules?.spaceCapping && currentMess > 25) {
        socialSubtext = '-1 💪, +👥 (generates 🧹)';
      } else if (isNotEnoughTimeForSocial) {
        socialSubtext = `⚠️ Need ⏳ ${socializeCost}h`;
      } else if (isTooExhaustedForSocial) {
        socialSubtext = '⚠️ Too exhausted (-1 💪 would collapse)';
      }
    } else if (isHalfRewardExpected) {
      socialSubtext = `⚠️ Budget Hospitality: half social gain (-1 💪, +👥/2, generates 🧹)`;
    } else {
      socialSubtext = `✨ Full Hospitality (-1 💪, +${socialMultiplier * 1} to +${socialMultiplier * 3} 👥, -$${cashRate}-$${cashRate * 3})`;
    }
  }

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

  const hasFood = (player.inventory?.freshFoodUnits || 0) > 0 || (player.inventory?.fastFoodItems?.length || 0) > 0;

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
    messIcon = '🧹🧹🪰🪰🪳🪳 ☣️';
    messLabel = 'Biohazard Emergency!';
    messBarColor = '#e74c3c';
  } else if (currentMess > 50) {
    messIcon = '🧹🧹🪰🪰🪳🪳';
    messLabel = 'Severe Cockroach Infestation!';
    messBarColor = '#e74c3c';
  } else if (currentMess > 40) {
    messIcon = '🧹🧹🪰🪰🪳';
    messLabel = 'Pest & Cockroach Swarm!';
    messBarColor = '#e67e22';
  } else if (currentMess > 30) {
    messIcon = '🧹🧹🪰🪰';
    messLabel = 'Fly Swarm Warning!';
    messBarColor = '#e67e22';
  } else if (currentMess > 20) {
    messIcon = '🧹🧹🪰';
    messLabel = 'Flies Appearing!';
    messBarColor = '#f1c40f';
  } else if (currentMess > 10) {
    messIcon = '🧹🧹';
    messLabel = 'Messy';
    messBarColor = '#f1c40f';
  } else if (currentMess > 3) {
    messIcon = '🧹';
    messLabel = 'Minor Mess';
    messBarColor = '#2ecc71';
  }

  const messPercentage = Math.min(100, Math.round((currentMess / maxMessHousing) * 100));

  const hasFridge = player.inventory?.appliances?.some(a => a.id === 'refrigerator' || campaign?.items?.find(i => i.id === a.id)?.tags?.includes('refrigerator')) ?? false;
  const hasFreezer = player.inventory?.appliances?.some(a => a.id === 'freezer' || campaign?.items?.find(i => i.id === a.id)?.tags?.includes('freezer')) ?? false;

  const housingDef = campaign?.housing?.find(h => h.id === player.currentHousingId);
  const housingName = housingDef ? t(`housing.${housingDef.id}.name`, { defaultValue: housingDef.name }) : (isPenthouse ? 'Penthouse Suite' : isSecurity ? 'Security Apartments' : 'Low-Cost Housing');

  return (
    <div className="interaction-panel" style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* Title & Overview Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05em' }}>
          🏠 {housingName}
        </h3>
        <span style={{ fontSize: '0.82em', color: '#aaa' }}>
          {t('homeRelax.title', { defaultValue: 'Home Management' })}
        </span>
      </div>

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
          gap: '6px'
        }}>
          <span>{actionFeedback.isError ? '⚠️' : '✓'}</span>
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Unified Space & Mess Status Overview */}
      {(rules?.trackMess || rules?.spaceCapping) && (
        <div className="mess-visual-card" style={{ 
          marginBottom: '10px', 
          padding: '8px 12px', 
          background: 'linear-gradient(135deg, rgba(20,20,35,0.85) 0%, rgba(35,35,55,0.85) 100%)', 
          borderRadius: '6px',
          border: `1px solid ${messBarColor}`,
          boxShadow: `0 0 8px ${messBarColor}22`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.88em' }}>
              {messIcon} Apartment Mess: <span style={{ color: messBarColor }}>{messLabel}</span>
            </span>
            <span style={{ fontWeight: 'bold', fontSize: '0.85em', color: messBarColor }}>
              {currentMess} / {maxMessHousing} mess
            </span>
          </div>

          <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              width: `${messPercentage}%`,
              height: '100%',
              backgroundColor: messBarColor,
              transition: 'width 0.5s ease-in-out, background-color 0.5s ease'
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.72em', color: '#aaa', flexWrap: 'wrap', gap: '4px' }}>
            {rules?.spaceCapping ? (
              <>
                <span style={{ color: freeSpace < 1 ? '#e74c3c' : '#00e5ff', fontWeight: 'bold' }}>
                  📦 Space: {totalUsedSpace} / {spaceCap} ({freeSpace} free)
                </span>
                <span>Durables: {durablesSpace} | Clutter: {clutterSpace} 📦</span>
                <span>Max Mess: {maxMessHousing}</span>
              </>
            ) : (
              <>
                <span>0 (Spotless)</span>
                <span>Social limit: 25</span>
                <span>Max: {maxMessHousing}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Action Deck (2 Columns, 4 Buttons) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        {/* Left Side: Rest & Entertaining */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h4 style={{ margin: '0 0 6px 0', color: '#00e5ff', fontSize: '0.85em' }}>🛋️ Rest & Entertaining</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button 
              data-testid="btn-relax"
              data-action-target="relax" 
              onClick={handleRelaxClick}
              style={{
                backgroundColor: isRelaxDisabled ? '#444' : '#27ae60',
                color: isRelaxDisabled ? '#bbb' : '#fff',
                border: 'none',
                padding: '8px 10px',
                borderRadius: '4px',
                cursor: isRelaxDisabled ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                textAlign: 'left',
                opacity: isRelaxDisabled ? 0.65 : 1
              }}
            >
              <div style={{ fontSize: '0.9em' }}>🧘 {t('homeRelax.button', { cost: hoursToRelax, defaultValue: `Relax (⏳ ${hoursToRelax}h)` })}</div>
              {rules?.usePhysicalMentalConditions ? (
                <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '1px', color: '#e8f8f5' }}>
                  {hasFood 
                    ? `+${physGain} 💪, +${mentalGain} 🧠${rules?.trackMess && scaledMess > 0 ? ` (+${scaledMess} 🧹)` : ''}`
                    : `⚠️ No food: +${physGain} 💪, +${mentalGain} 🧠 (-1 Max 💪 & 🧠)${rules?.trackMess && scaledMess > 0 ? ` (+${scaledMess} 🧹)` : ''}`}
                </div>
              ) : (
                <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '1px', color: '#e8f8f5' }}>
                  +{classicGain} 🧘{classicFirstBonus > 0 ? ` (+${classicFirstBonus} 😊)` : ''}
                </div>
              )}
            </button>

            {showUnfedWarning && typeof document !== 'undefined' && createPortal(
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
            )}

            {rules?.usePhysicalMentalConditions && (
              <button 
                data-action-target="socialize" 
                onClick={() => handleHomeAction({ type: 'socialize_guests' })}
                style={{ 
                  backgroundColor: isSocialDisabled ? '#444' : (isHalfRewardExpected ? '#b9770e' : '#27ae60'), 
                  color: isSocialDisabled ? '#bbb' : '#fff', 
                  border: isSocialDisabled ? 'none' : (isHalfRewardExpected ? '1px solid #f39c12' : '1px solid #2ecc71'), 
                  padding: '8px 10px', 
                  borderRadius: '4px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold', 
                  textAlign: 'left',
                  opacity: isSocialDisabled ? 0.65 : 1
                }}
              >
                <div style={{ fontSize: '0.9em' }}>🎉 Socialize / Entertain Guests (⏳ {socializeCost}h)</div>
                <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '1px', color: isSocialDisabled ? '#ffb3b3' : '#e8f8f5' }}>
                  {socialSubtext}
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Cleaning & Maintenance */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h4 style={{ margin: '0 0 6px 0', color: '#3498db', fontSize: '0.85em' }}>🧹 Cleaning & Maintenance</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {rules?.trackMess ? (
              <>
                <button 
                  data-action-target="clean" 
                  onClick={() => handleHomeAction({ type: 'clean' })}
                  style={{ 
                    backgroundColor: isCleanDisabled ? '#444' : '#2980b9', 
                    color: isCleanDisabled ? '#bbb' : '#fff', 
                    border: 'none', 
                    padding: '8px 10px', 
                    borderRadius: '4px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold', 
                    textAlign: 'left', 
                    opacity: isCleanDisabled ? 0.65 : 1 
                  }}
                >
                  <div style={{ fontSize: '0.9em' }}>🧹 Clean Apartment (⏳ {hoursToClean}h)</div>
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
                    padding: '8px 10px', 
                    borderRadius: '4px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold', 
                    textAlign: 'left', 
                    opacity: isServiceDisabled ? 0.65 : 1 
                  }}
                >
                  <div style={{ fontSize: '0.9em' }}>🧼 Call Cleaning Service (⏳ {cleaningServiceCost}h, ${cleaningServicePrice})</div>
                  <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '1px', color: isServiceDisabled ? '#ffb3b3' : 'inherit' }}>
                    {serviceSubtext}
                  </div>
                </button>
              </>
            ) : (
              <div style={{ fontSize: '0.8em', color: '#aaa', fontStyle: 'italic', padding: '8px 0' }}>
                Mess tracking disabled in this campaign.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Home Amenities & Storage Section (Compact View) */}
      <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, color: 'var(--accent-cyan)', fontSize: '0.88em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🛋️ {t('homeRelax.amenitiesTitle', { defaultValue: 'Home Amenities & Storage' })}
          </h4>
          <span style={{ fontSize: '0.78em', color: '#aaa' }}>
            {(player.inventory?.appliances?.length || 0) + (player.inventory?.books?.length || 0)} items | {(player.inventory?.freshFoodUnits || 0) + (player.inventory?.fastFoodItems?.length || 0)} food
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {/* Food & Pantry Card */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
              <strong style={{ color: '#2ecc71', fontSize: '0.82em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🥫 {t('homeRelax.pantryTitle', { defaultValue: 'Pantry & Food Supplies' })}
              </strong>
              <span style={{ fontSize: '0.74em', color: hasFridge ? '#2ecc71' : '#e67e22', fontWeight: 'bold' }}>
                {hasFridge ? (hasFreezer ? '🧊 Refrigerator + Freezer' : '🧊 Refrigerator Active') : '⚠️ No Fridge'}
              </span>
            </div>

            {/* Fresh Food & Fast Food Summary */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.25)', padding: '4px 8px', borderRadius: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1em' }}>🥗</span>
                <span style={{ fontSize: '0.8em', color: '#fff' }}>{t('inventoryModal.freshFood', { defaultValue: 'Fresh Food' })}</span>
              </div>
              <span style={{ fontSize: '0.85em', fontWeight: 'bold', color: (player.inventory?.freshFoodUnits || 0) > 0 ? '#2ecc71' : '#e74c3c' }}>
                {player.inventory?.freshFoodUnits || 0} {t('inventoryModal.units', { defaultValue: 'units' })}
              </span>
            </div>

            {/* Fast Food Items */}
            {player.inventory?.fastFoodItems && player.inventory.fastFoodItems.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '45px', overflowY: 'auto' }}>
                {player.inventory.fastFoodItems.map((ff, idx) => {
                  const itemDef = campaign?.items?.find(i => i.id === ff.itemId);
                  const itemName = itemDef ? t(`item.${itemDef.id}`, { defaultValue: itemDef.name }) : ff.itemId;
                  return (
                    <span 
                      key={idx} 
                      style={{ fontSize: '0.74em', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      🍔 {itemName} {ff.happinessBonus > 0 && <span style={{ color: '#f1c40f' }}>+{ff.happinessBonus} 😊</span>}
                    </span>
                  );
                })}
              </div>
            ) : null}

            {(player.inventory?.freshFoodUnits || 0) === 0 && (!player.inventory?.fastFoodItems || player.inventory.fastFoodItems.length === 0) && (
              <div style={{ padding: '4px 6px', background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: '4px', fontSize: '0.74em', color: '#ff9999' }}>
                ⚠️ Pantry is empty! Hunger penalty on turn end.
              </div>
            )}
          </div>

          {/* Durables & Appliances Card */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
              <strong style={{ color: '#3498db', fontSize: '0.82em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🛋️ {t('inventoryModal.appliances', { defaultValue: 'Appliances & Durables' })}
              </strong>
              <span style={{ fontSize: '0.74em', color: '#aaa' }}>
                {(player.inventory?.appliances?.length || 0) + (player.inventory?.books?.length || 0)} items
              </span>
            </div>

            {/* Compact Appliances & Books List */}
            {player.inventory?.appliances && player.inventory.appliances.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '55px', overflowY: 'auto' }}>
                {player.inventory.appliances.map((app, idx) => {
                  const itemDef = campaign?.items?.find(i => i.id === app.id);
                  const itemName = itemDef ? t(`item.${itemDef.id}`, { defaultValue: itemDef.name }) : app.id;
                  const effectBadges: string[] = [];
                  if (itemDef?.effects) {
                    for (const eff of itemDef.effects) {
                      if (eff.trigger === 'on_relax') {
                        if (eff.stat === 'physical') effectBadges.push(`+${eff.value} 💪`);
                        else if (eff.stat === 'mental') effectBadges.push(`+${eff.value} 🧠`);
                        else if (eff.stat === 'mess') effectBadges.push(`+${eff.value} 🧹`);
                      } else if (eff.trigger === 'on_socialize') {
                        if (eff.stat === 'social') effectBadges.push(`+${eff.value} 👥`);
                      } else if (eff.trigger === 'continuous' && eff.stat === 'mental_max') {
                        effectBadges.push(`+${eff.value} Max 🧠`);
                      }
                    }
                  }
                  if (itemDef?.tags?.includes('refrigerator')) effectBadges.push('Preserves Food');
                  if (itemDef?.tags?.includes('computer')) effectBadges.push('R&D & Income');
                  if (itemDef?.happinessBonus && effectBadges.length === 0) effectBadges.push(`+${itemDef.happinessBonus} 😊`);

                  return (
                    <span 
                      key={`${app.id}-${idx}`}
                      style={{ fontSize: '0.74em', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.06)', color: '#e0e0ff' }}
                    >
                      📦 {itemName} {effectBadges.length > 0 && <span style={{ color: '#00e5ff' }}>({effectBadges.join(', ')})</span>}
                    </span>
                  );
                })}
              </div>
            ) : null}

            {player.inventory?.books && player.inventory.books.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '40px', overflowY: 'auto' }}>
                {player.inventory.books.map((bId, idx) => {
                  const itemDef = campaign?.items?.find(i => i.id === bId);
                  const bookName = itemDef ? t(`item.${itemDef.id}`, { defaultValue: itemDef.name }) : bId;
                  return (
                    <span key={idx} style={{ fontSize: '0.74em', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      📚 {bookName} <span style={{ color: '#00e5ff' }}>+1 Max 🧠</span>
                    </span>
                  );
                })}
              </div>
            )}

            {(!player.inventory?.appliances || player.inventory.appliances.length === 0) && (!player.inventory?.books || player.inventory.books.length === 0) && (
              <div style={{ padding: '4px 6px', background: 'rgba(255,255,255,0.02)', border: '1px dashed #555', borderRadius: '4px', fontSize: '0.74em', color: '#888', textAlign: 'center' }}>
                📦 No durables owned yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
