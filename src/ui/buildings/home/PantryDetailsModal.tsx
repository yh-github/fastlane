import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { PlayerState, GameRules } from '../../../engine/gameState';
import type { CampaignBundle } from '../../../engine/dataLoader';
import type { GameAction } from '../../../engine/actions/types';

interface PantryDetailsModalProps {
  player: PlayerState;
  campaign?: CampaignBundle;
  rules?: GameRules;
  onAction?: (action: GameAction) => void | Promise<any>;
  onClose: () => void;
}

export const PantryDetailsModal: React.FC<PantryDetailsModalProps> = ({
  player,
  campaign,
  rules,
  onAction,
  onClose
}) => {
  const { t } = useTranslation();
  const [actionFeedback, setActionFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  const hasFridge = player.inventory?.appliances?.some(
    a => (a.id === 'refrigerator' || campaign?.items?.find(i => i.id === a.id)?.tags?.includes('refrigerator')) && !a.isBroken
  ) ?? false;
  const hasFreezer = player.inventory?.appliances?.some(
    a => (a.id === 'freezer' || campaign?.items?.find(i => i.id === a.id)?.tags?.includes('freezer')) && !a.isBroken
  ) ?? false;
  const hasStove = player.inventory?.appliances?.some(
    a => (a.id === 'stove' || campaign?.items?.find(i => i.id === a.id)?.tags?.includes('stove')) && !a.isBroken
  ) ?? false;
  const hasMicrowave = player.inventory?.appliances?.some(
    a => (a.id === 'microwave' || campaign?.items?.find(i => i.id === a.id)?.tags?.includes('microwave')) && !a.isBroken
  ) ?? false;

  const freshUnits = player.inventory?.freshFoodUnits || 0;
  const cannedUnits = player.inventory?.cannedFoodUnits || 0;
  const fastFoodItems = player.inventory?.fastFoodItems || [];

  const hasEaten = Boolean(player.turnFlags?.hasEaten);
  const currentPhys = player.physicalCondition ?? 50;

  // Cooking calculations
  let cookTime = hasMicrowave ? 1.5 : 2.5;
  if (hasFreezer && !hasFridge && !hasMicrowave) {
    cookTime += 1.0;
  }
  const coldTime = (hasFreezer && !hasFridge && !hasMicrowave) ? 1.5 : 0.5;
  const cannedTime = hasMicrowave ? 0.5 : 1.0;

  // Dynamically select best fresh food prep method
  type FreshMealType = 'home_cooked' | 'microwave' | 'cold_meal';
  let bestFreshMethod: FreshMealType = 'cold_meal';
  let freshMethodTitle = 'Cold Meal (Sandwich & Salad)';
  let freshMethodIcon = '🥗';
  let freshMethodDesc = `⏳ ${coldTime}h • 0 💪 • 0 🧹 → +0.5 🧠 (No appliances needed)`;
  let freshTimeNeeded = coldTime;
  let canCookFresh = false;
  let freshDisabledReason = '';

  if (hasStove && currentPhys >= 1.5 && player.hoursRemaining >= cookTime) {
    bestFreshMethod = 'home_cooked';
    freshMethodTitle = 'Home Cooked Meal';
    freshMethodIcon = '🍳';
    freshMethodDesc = `Stove ${hasMicrowave ? '+ Microwave (defrost)' : ''} • ⏳ ${cookTime}h • -1.0 💪 • +${hasMicrowave ? 1 : 2} 🧹 → Net +1.5 💪, +2.0 🧠`;
    freshTimeNeeded = cookTime;
    canCookFresh = freshUnits >= 1;
  } else if (hasMicrowave && player.hoursRemaining >= 1.0) {
    bestFreshMethod = 'microwave';
    freshMethodTitle = 'Microwave Meal';
    freshMethodIcon = '⚡';
    freshMethodDesc = `Microwave • ⏳ 1.0h • 0 💪 • +1 🧹 → +0.5 💪, +1.0 🧠`;
    freshTimeNeeded = 1.0;
    canCookFresh = freshUnits >= 1;
  } else {
    bestFreshMethod = 'cold_meal';
    freshMethodTitle = (hasStove && currentPhys < 1.5)
      ? 'Cold Meal (Too exhausted for stove)'
      : 'Cold Meal (Sandwich & Salad)';
    freshMethodIcon = '🥗';
    freshMethodDesc = `⏳ ${coldTime}h • 0 💪 • 0 🧹 → +0.5 🧠 (No appliances)`;
    freshTimeNeeded = coldTime;
    canCookFresh = freshUnits >= 1 && player.hoursRemaining >= coldTime;
  }

  if (freshUnits < 1) {
    freshDisabledReason = 'No Fresh Food';
  } else if (player.hoursRemaining < freshTimeNeeded) {
    freshDisabledReason = `Need ${freshTimeNeeded}h`;
  }

  const canPrepCanned = cannedUnits >= 1 && player.hoursRemaining >= cannedTime;
  const cannedDisabledReason = cannedUnits < 1
    ? 'No Cans'
    : player.hoursRemaining < cannedTime
    ? `Need ${cannedTime}h`
    : '';

  const handlePrep = async (mealType: 'home_cooked' | 'microwave' | 'cold_meal' | 'canned') => {
    setActionFeedback(null);
    if (!onAction) return;
    try {
      const res = await onAction({ type: 'prep_meal', mealType });
      if (res) {
        const log = Array.isArray(res) ? res[0] : res;
        if (log?.key?.includes('error')) {
          setActionFeedback({ message: String(t(log.key, log.params || { defaultValue: log.key })), isError: true });
          return;
        }
      }
      if (mealType === 'home_cooked') {
        setActionFeedback({ message: '🍳 Cooked and ate home meal! Net +1.5 💪, +2.0 🧠', isError: false });
      } else if (mealType === 'microwave') {
        setActionFeedback({ message: '⚡ Heated fresh meal in microwave! +0.5 💪, +1.0 🧠', isError: false });
      } else if (mealType === 'cold_meal') {
        setActionFeedback({ message: '🥗 Prepared cold groceries (sandwich/salad)! +0.5 🧠 (Fed)', isError: false });
      } else if (mealType === 'canned') {
        setActionFeedback({ message: '🥫 Heated canned rations. Staved off hunger, but spirits dropped (-1.5 🧠).', isError: false });
      }
    } catch (err: any) {
      setActionFeedback({ message: err?.message || 'Action failed', isError: true });
    }
  };

  const modalContent = (
    <div
      data-testid="pantry-details-modal"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 1150
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #072218 0%, #0e3b2b 100%)',
          border: '2px solid #2ecc71',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.85), 0 0 24px rgba(46, 204, 113, 0.25)',
          borderRadius: '14px',
          padding: '20px 22px',
          maxWidth: '380px',
          width: '92%',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <button
          type="button"
          onClick={onClose}
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

        <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🥫</div>
        <h3 style={{ margin: '0 0 10px', color: '#2ecc71', fontSize: '1.2rem', fontWeight: 800 }}>
          {t('homeRelax.pantryTitle', { defaultValue: 'Pantry & Food Supplies' })}
        </h3>

        <div
          style={{
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
            gap: '8px'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              paddingBottom: '6px'
            }}
          >
            <span style={{ color: '#94a3b8' }}>Appliance Status:</span>
            <span style={{ fontWeight: 'bold', color: hasFridge || hasFreezer ? '#2ecc71' : '#e67e22', fontSize: '0.8rem' }}>
              {hasFridge && hasFreezer ? '🧊 Fridge + Freezer' : hasFridge ? '🧊 Refrigerator Active' : hasFreezer ? '❄️ Deep Freezer Active' : '⚠️ No Cold Storage'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
              <span>🥗</span> {t('inventoryModal.freshFood', { defaultValue: 'Fresh Food' })}:
            </span>
            <span style={{ fontWeight: 'bold', color: freshUnits > 0 ? '#2ecc71' : '#e74c3c' }}>
              {freshUnits} {t('inventoryModal.units', { defaultValue: 'units' })}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
              <span>🥫</span> {t('homeRelax.cannedReserves', { defaultValue: 'Canned Food' })}:
            </span>
            <span style={{ fontWeight: 'bold', color: cannedUnits > 0 ? '#38bdf8' : '#64748b' }}>
              {cannedUnits} {t('inventoryModal.units', { defaultValue: 'units' })}
            </span>
          </div>

          {!rules?.enableCookingSystem && fastFoodItems.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '6px' }}>
              <div style={{ color: '#94a3b8', marginBottom: '4px', fontSize: '0.8rem' }}>Fast Food Takeout:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {fastFoodItems.map((ff, idx) => {
                  const itemDef = campaign?.items?.find(i => i.id === ff.itemId);
                  const itemName = itemDef ? t(`item.${itemDef.id}`, { defaultValue: itemDef.name }) : ff.itemId;
                  return (
                    <span
                      key={idx}
                      style={{
                        fontSize: '0.78em',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid rgba(255,255,255,0.08)'
                      }}
                    >
                      🍔 {itemName} {ff.happinessBonus > 0 && <span style={{ color: '#f1c40f' }}>+{ff.happinessBonus} 😊</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {freshUnits === 0 && cannedUnits === 0 && (!rules?.enableCookingSystem ? fastFoodItems.length === 0 : true) && (
            <div
              style={{
                padding: '6px 8px',
                background: 'rgba(231,76,60,0.12)',
                border: '1px solid rgba(231,76,60,0.3)',
                borderRadius: '4px',
                fontSize: '0.78em',
                color: '#ff9999'
              }}
            >
              ⚠️ {t('homeRelax.pantryEmptyWarning', { defaultValue: 'Pantry is empty! Hunger penalty on turn end.' })}
            </div>
          )}
        </div>

        {/* Weekly Meal Preparation Section (Advanced Cooking System) */}
        {rules?.enableCookingSystem && (
          <div
            data-testid="cooking-module-section"
            style={{
              background: 'rgba(0, 0, 0, 0.45)',
              border: `1.5px solid ${hasEaten ? '#059669' : '#f59e0b'}`,
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '16px',
              maxWidth: '340px',
              width: '100%',
              fontSize: '0.82rem',
              textAlign: 'start',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.88rem' }}>
                🍳 Weekly Meal Prep
              </span>
              <span style={{
                background: hasEaten ? '#064e3b' : '#78350f',
                color: hasEaten ? '#6ee7b7' : '#fde68a',
                fontSize: '0.68rem',
                fontWeight: 'bold',
                padding: '2px 6px',
                borderRadius: '4px',
                border: `1px solid ${hasEaten ? '#059669' : '#d97706'}`
              }}>
                {hasEaten ? '✓ Fed & Fuelled' : '⚠️ Unfed'}
              </span>
            </div>

            {actionFeedback && (
              <div
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: actionFeedback.isError ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                  border: `1px solid ${actionFeedback.isError ? '#ef4444' : '#10b981'}`,
                  color: actionFeedback.isError ? '#fca5a5' : '#6ee7b7',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}
              >
                {actionFeedback.message}
              </div>
            )}

            {hasEaten ? (
              <div
                style={{
                  background: 'rgba(6, 78, 59, 0.45)',
                  border: '1px solid #10b981',
                  borderRadius: '8px',
                  padding: '14px 12px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginTop: '4px'
                }}
              >
                <div style={{ fontSize: '1.5rem' }}>🥗</div>
                <div style={{ fontWeight: 'bold', color: '#6ee7b7', fontSize: '0.92rem' }}>
                  Weekly Nutrition Secured!
                </div>
                <div style={{ color: '#a7f3d0', fontSize: '0.78rem', lineHeight: 1.4 }}>
                  You are fed and fuel-ready for the week ({player.nutritionTier === 'home_cooked' ? 'Home Cooked' : player.nutritionTier === 'microwave' ? 'Microwave' : player.nutritionTier === 'cold_meal' ? 'Cold Meal' : player.nutritionTier === 'fast_food' ? 'Fast Food' : player.nutritionTier === 'canned' ? 'Canned' : 'Fed'}). Relaxing will provide full physical & mental recovery.
                </div>
                <button
                  type="button"
                  data-testid="btn-pantry-done"
                  onClick={onClose}
                  style={{
                    marginTop: '4px',
                    padding: '9px 16px',
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    border: '1px solid #10b981',
                    borderRadius: '6px',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  ✓ {t('homeRelax.btnReadyToRelax', { defaultValue: 'Ready to Relax (Back to Apartment)' })}
                </button>
              </div>
            ) : (
              <>
                <div style={{ color: '#fed7aa', fontSize: '0.75rem', lineHeight: 1.35 }}>
                  Prepare food for the week. Relaxing without eating causes permanent exhaustion penalties (-1 Max 💪 & 🧠).
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  {/* Option 1: Prepare Fresh Food (Adapts to best available appliances) */}
                  <button
                    type="button"
                    data-testid={bestFreshMethod === 'home_cooked' ? 'btn-cook-home-meal' : bestFreshMethod === 'microwave' ? 'btn-cook-microwave' : 'btn-cook-cold-meal'}
                    data-fresh-testid="btn-cook-fresh-meal"
                    disabled={!canCookFresh}
                    onClick={() => handlePrep(bestFreshMethod)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '6px',
                      background: canCookFresh ? 'linear-gradient(135deg, #065f46 0%, #047857 100%)' : 'rgba(255,255,255,0.06)',
                      border: canCookFresh ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                      color: canCookFresh ? '#fff' : '#64748b',
                      cursor: canCookFresh ? 'pointer' : 'not-allowed',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.84rem' }}>
                        {freshMethodIcon} Prepare Fresh Food ({freshMethodTitle})
                      </div>
                      <div style={{ fontSize: '0.68rem', opacity: 0.85, marginTop: '2px' }}>
                        {freshMethodDesc}
                      </div>
                    </div>
                    {!canCookFresh && (
                      <span style={{ fontSize: '0.66rem', color: '#f87171', maxWidth: '85px', textAlign: 'right' }}>
                        {freshDisabledReason}
                      </span>
                    )}
                  </button>

                  {/* Option 2: Prepare Canned Food */}
                  <button
                    type="button"
                    data-testid="btn-cook-canned"
                    disabled={!canPrepCanned}
                    onClick={() => handlePrep('canned')}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '6px',
                      background: canPrepCanned ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' : 'rgba(255,255,255,0.06)',
                      border: canPrepCanned ? '1px solid #64748b' : '1px solid rgba(255,255,255,0.1)',
                      color: canPrepCanned ? '#fff' : '#64748b',
                      cursor: canPrepCanned ? 'pointer' : 'not-allowed',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.84rem' }}>🥫 Prepare Canned Food (Heated Rations)</div>
                      <div style={{ fontSize: '0.68rem', opacity: 0.85, marginTop: '2px' }}>
                        ⏳ {cannedTime}h {hasMicrowave ? '(Microwave)' : ''} • 0 💪 • -1.5 🧠 (Emergency food)
                      </div>
                    </div>
                    {!canPrepCanned && (
                      <span style={{ fontSize: '0.66rem', color: '#f87171', maxWidth: '85px', textAlign: 'right' }}>
                        {cannedDisabledReason}
                      </span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <button
          type="button"
          className="action-panel__btn"
          data-testid="btn-close-pantry-popup"
          onClick={onClose}
          style={{
            backgroundColor: '#2ecc71',
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
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
