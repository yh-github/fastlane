import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { CampaignBundle } from '../../engine/dataLoader';
import { type GameRules, collectItemEffects } from '../../engine/gameState';
import { calcEconomyPrice } from '../../engine/economyEngine';
import { calcMaxMess, roundToResolution } from '../../engine/statMath';
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
  const isMessTooHighForSocial = currentMess > 25;
  const cleaningServiceCost = campaign?.config.timeRules?.cleaningServiceCost ?? 1;
  const cleaningServiceBasePrice = campaign?.config.economyRules?.cleaningServiceBasePrice ?? 100;
  const cleaningServicePrice = calcEconomyPrice(cleaningServiceBasePrice, economicIndex);
  const canAffordCleaning = player.money >= cleaningServicePrice;

  const socializeCost = campaign?.config.timeRules?.socializeCost ?? 6;
  const isTooExhaustedForSocial = !!rules?.usePhysicalMentalConditions && ((player.physicalCondition ?? 50) - 1 < 1.0);
  const isNotEnoughTimeForSocial = player.hoursRemaining < socializeCost;
  const isSocialDisabled = isMessTooHighForSocial || isNotEnoughTimeForSocial || isTooExhaustedForSocial;
  const socialSubtext = '-1 💪, +👥 (generates 🧹)';

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

  return (
    <div className="interaction-panel" style={{ width: '100%' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        🏠 {t('homeRelax.title', { defaultValue: 'Home Management' })}
      </h3>

      {actionFeedback && (
        <div style={{
          padding: '10px 14px',
          marginBottom: '12px',
          borderRadius: '6px',
          backgroundColor: actionFeedback.isError ? 'rgba(231, 76, 60, 0.2)' : 'rgba(46, 204, 113, 0.2)',
          border: `1px solid ${actionFeedback.isError ? '#e74c3c' : '#2ecc71'}`,
          color: actionFeedback.isError ? '#ff8585' : '#85ffb5',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{actionFeedback.isError ? '⚠️' : '✓'}</span>
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {rules?.trackMess && (
        <div className="mess-visual-card" style={{ 
          marginBottom: '16px', 
          padding: '12px 14px', 
          background: 'linear-gradient(135deg, rgba(20,20,35,0.85) 0%, rgba(35,35,55,0.85) 100%)', 
          borderRadius: '8px',
          border: `1px solid ${messBarColor}`,
          boxShadow: `0 0 10px ${messBarColor}33`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.95em' }}>
              {messIcon} Apartment Mess: <span style={{ color: messBarColor }}>{messLabel}</span>
            </span>
            <span style={{ fontWeight: 'bold', fontSize: '0.9em', color: messBarColor }}>
              {currentMess} / {maxMessHousing} mess
            </span>
          </div>

          <div style={{ width: '100%', height: '10px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{
              width: `${messPercentage}%`,
              height: '100%',
              backgroundColor: messBarColor,
              transition: 'width 0.5s ease-in-out, background-color 0.5s ease'
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.75em', color: '#aaa' }}>
            <span>0 (Spotless)</span>
            <span>Social limit: 25</span>
            <span>Max: {maxMessHousing}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        {/* Left Side: Rest & Entertaining */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#00e5ff', fontSize: '0.9em' }}>🛋️ Rest & Entertaining</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              data-testid="btn-relax"
              data-action-target="relax" 
              onClick={handleRelaxClick}
              style={{
                backgroundColor: isRelaxDisabled ? '#444' : '#27ae60',
                color: isRelaxDisabled ? '#bbb' : '#fff',
                border: 'none',
                padding: '10px',
                borderRadius: '4px',
                cursor: isRelaxDisabled ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                textAlign: 'left',
                opacity: isRelaxDisabled ? 0.65 : 1
              }}
            >
              <div>🧘 {t('homeRelax.button', { cost: hoursToRelax, defaultValue: `Relax (⏳ ${hoursToRelax}h)` })}</div>
              {rules?.usePhysicalMentalConditions ? (
                <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px', color: '#e8f8f5' }}>
                  {hasFood 
                    ? `+${physGain} 💪, +${mentalGain} 🧠${rules?.trackMess && scaledMess > 0 ? ` (+${scaledMess} 🧹)` : ''}`
                    : `⚠️ No food: +${physGain} 💪, +${mentalGain} 🧠 (-1 Max 💪 & 🧠)${rules?.trackMess && scaledMess > 0 ? ` (+${scaledMess} 🧹)` : ''}`}
                </div>
              ) : (
                <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px', color: '#e8f8f5' }}>
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
                  background: '#2c1e1e', padding: '24px', borderRadius: '10px', maxWidth: '450px', width: '100%', maxHeight: '90vh',
                  overflowY: 'auto', boxSizing: 'border-box', border: '1px solid #e74c3c', color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
                }}>
                  <h3 style={{ margin: '0 0 12px 0', color: '#e74c3c' }}>
                    ⚠️ {t('action.unfedRelaxModal.title', { defaultValue: 'Relax Without Food?' })}
                  </h3>
                  <p style={{ fontSize: '0.95em', lineHeight: '1.5', marginBottom: '20px' }}>
                    {t('action.unfedRelaxModal.warning', { defaultValue: 'You have no food in your inventory! Relaxing while starving will permanently reduce your Max Physical and Max Mental capacity by 1.' })}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                      onClick={() => setShowUnfedWarning(false)}
                      style={{ padding: '8px 16px', background: '#555', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
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
                      style={{ padding: '8px 16px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
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
                  backgroundColor: isSocialDisabled ? '#444' : '#d35400', 
                  color: isSocialDisabled ? '#bbb' : '#fff', 
                  border: 'none', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold', 
                  textAlign: 'left',
                  opacity: isSocialDisabled ? 0.65 : 1
                }}
              >
                <div>🎉 Socialize / Entertain Guests (⏳ {socializeCost}h)</div>
                <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px', color: isSocialDisabled ? '#ffb3b3' : 'inherit' }}>
                  {socialSubtext}
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Cleaning & Maintenance */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#3498db', fontSize: '0.9em' }}>🧹 Cleaning & Maintenance</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rules?.trackMess ? (
              <>
                <button 
                  data-action-target="clean" 
                  onClick={() => handleHomeAction({ type: 'clean' })}
                  style={{ 
                    backgroundColor: isCleanDisabled ? '#444' : '#2980b9', 
                    color: isCleanDisabled ? '#bbb' : '#fff', 
                    border: 'none', 
                    padding: '10px', 
                    borderRadius: '4px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold', 
                    textAlign: 'left', 
                    opacity: isCleanDisabled ? 0.65 : 1 
                  }}
                >
                  <div>🧹 Clean Apartment (⏳ {hoursToClean}h)</div>
                  <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px', color: isCleanDisabled ? '#ffb3b3' : 'inherit' }}>
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
                    padding: '10px', 
                    borderRadius: '4px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold', 
                    textAlign: 'left', 
                    opacity: isServiceDisabled ? 0.65 : 1 
                  }}
                >
                  <div>🧼 Call Cleaning Service (⏳ {cleaningServiceCost}h, ${cleaningServicePrice})</div>
                  <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px', color: isServiceDisabled ? '#ffb3b3' : 'inherit' }}>
                    {serviceSubtext}
                  </div>
                </button>
              </>
            ) : (
              <div style={{ fontSize: '0.85em', color: '#aaa', fontStyle: 'italic' }}>
                Mess tracking disabled in this campaign.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Home Amenities & Storage Section (Durables & Food) */}
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h4 style={{ margin: 0, color: 'var(--accent-cyan)', fontSize: '0.95em', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🛋️ {t('homeRelax.amenitiesTitle', { defaultValue: 'Home Amenities & Storage' })}
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {/* Food & Pantry Card */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
              <strong style={{ color: '#2ecc71', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🥫 {t('homeRelax.pantryTitle', { defaultValue: 'Pantry & Food Supplies' })}
              </strong>
              <span style={{ fontSize: '0.8em', color: hasFridge ? '#2ecc71' : '#e67e22', fontWeight: 'bold' }}>
                {hasFridge ? (hasFreezer ? '🧊 Refrigerator + Freezer' : '🧊 Refrigerator Active') : '⚠️ No Fridge (Spoilage Risk)'}
              </span>
            </div>

            {/* Fresh Food Units */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img 
                  src="/assets/raw_images/food_1week.png" 
                  alt="Fresh Food" 
                  style={{ width: '28px', height: '28px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '4px' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div>
                  <div style={{ fontSize: '0.85em', fontWeight: 'bold', color: '#fff' }}>
                    🥗 {t('inventoryModal.freshFood', { defaultValue: 'Fresh Food' })}
                  </div>
                  <div style={{ fontSize: '0.75em', color: '#aaa' }}>
                    {hasFridge ? 'Protected from spoilage' : 'Will spoil without a refrigerator'}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.95em', fontWeight: 'bold', color: (player.inventory?.freshFoodUnits || 0) > 0 ? '#2ecc71' : '#e74c3c' }}>
                {player.inventory?.freshFoodUnits || 0} {t('inventoryModal.units', { defaultValue: 'units' })}
              </span>
            </div>

            {/* Fast Food Items */}
            {player.inventory?.fastFoodItems && player.inventory.fastFoodItems.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.8em', color: '#bbb', fontWeight: 'bold' }}>
                  🍔 {t('inventoryModal.fastFood', { defaultValue: 'Fast Food Meals' })} ({player.inventory.fastFoodItems.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {player.inventory.fastFoodItems.map((ff, idx) => {
                    const itemDef = campaign?.items?.find(i => i.id === ff.itemId);
                    const itemName = itemDef ? t(`item.${itemDef.id}`, { defaultValue: itemDef.name }) : ff.itemId;
                    return (
                      <div 
                        key={idx} 
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78em' }}
                      >
                        <img 
                          src={`/assets/raw_images/${ff.itemId}.png`} 
                          alt={ff.itemId} 
                          style={{ width: '20px', height: '20px', objectFit: 'contain', borderRadius: '3px', backgroundColor: '#000' }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <span>{itemName}</span>
                        {ff.happinessBonus > 0 && (
                          <span style={{ color: '#f1c40f', fontWeight: 'bold' }}>+{ff.happinessBonus} 😊</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty Food Alert if 0 food */}
            {(player.inventory?.freshFoodUnits || 0) === 0 && (!player.inventory?.fastFoodItems || player.inventory.fastFoodItems.length === 0) && (
              <div style={{ padding: '8px 10px', background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: '6px', fontSize: '0.78em', color: '#ff9999', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚠️</span>
                <span>Pantry is empty! Relaxing or ending turn without food causes hunger penalties.</span>
              </div>
            )}
          </div>

          {/* Durables & Appliances Card */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
              <strong style={{ color: '#3498db', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🛋️ {t('inventoryModal.appliances', { defaultValue: 'Appliances & Durables' })}
              </strong>
              <span style={{ fontSize: '0.8em', color: '#aaa' }}>
                {(player.inventory?.appliances?.length || 0) + (player.inventory?.books?.length || 0)} items
              </span>
            </div>

            {/* Appliances Grid */}
            {player.inventory?.appliances && player.inventory.appliances.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
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
                    <div 
                      key={`${app.id}-${idx}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '6px',
                        padding: '6px 4px',
                        gap: '4px'
                      }}
                    >
                      <img 
                        src={`/assets/raw_images/${app.id}.png`} 
                        alt={app.id} 
                        style={{ width: '28px', height: '28px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '4px' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span style={{ fontSize: '0.78em', fontWeight: 'bold', color: '#e0e0ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                        {itemName}
                      </span>
                      {effectBadges.length > 0 && (
                        <span style={{ fontSize: '0.68em', color: '#00e5ff', background: 'rgba(0,229,255,0.1)', padding: '1px 4px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
                          {effectBadges.join(', ')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Bookshelf Grid */}
            {player.inventory?.books && player.inventory.books.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: player.inventory?.appliances?.length ? '4px' : '0' }}>
                <div style={{ fontSize: '0.8em', color: '#bbb', fontWeight: 'bold' }}>
                  📚 {t('inventoryModal.books', { defaultValue: 'Bookshelf' })} ({player.inventory.books.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {player.inventory.books.map((bId, idx) => {
                    const itemDef = campaign?.items?.find(i => i.id === bId);
                    const bookName = itemDef ? t(`item.${itemDef.id}`, { defaultValue: itemDef.name }) : bId;
                    return (
                      <div 
                        key={idx} 
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78em' }}
                      >
                        <img 
                          src={`/assets/raw_images/${bId}.png`} 
                          alt={bId} 
                          style={{ width: '20px', height: '20px', objectFit: 'contain', borderRadius: '3px', backgroundColor: '#000' }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <span>{bookName}</span>
                        <span style={{ color: '#00e5ff', fontSize: '0.85em', fontWeight: 'bold' }}>+1 Max 🧠</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty Durables State */}
            {(!player.inventory?.appliances || player.inventory.appliances.length === 0) && (!player.inventory?.books || player.inventory.books.length === 0) && (
              <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: '1px dashed #555', borderRadius: '6px', fontSize: '0.78em', color: '#888', textAlign: 'center' }}>
                📦 No appliances or books owned yet.<br />Visit Socket City or Z-Mart to furnish your apartment!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
