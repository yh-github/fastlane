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
  const canCookHome = freshUnits >= 1 && hasStove && currentPhys >= 1.5 && player.hoursRemaining >= cookTime;
  const cookDisabledReason = !hasStove
    ? 'Requires working Stove'
    : freshUnits < 1
    ? 'No Fresh Food'
    : currentPhys < 1.5
    ? 'Too exhausted (need ≥ 1.5 💪)'
    : player.hoursRemaining < cookTime
    ? `Need ${cookTime}h`
    : '';

  const cannedTime = hasMicrowave ? 0.5 : 1.0;
  const canPrepCanned = cannedUnits >= 1 && player.hoursRemaining >= cannedTime;

  const canEatFastFood = fastFoodItems.length >= 1;

  // Microwave fresh food calculation
  const canMicrowave = freshUnits >= 1 && hasMicrowave && player.hoursRemaining >= 1.0;
  const microwaveDisabledReason = !hasMicrowave
    ? 'Requires Microwave'
    : freshUnits < 1
    ? 'No Fresh Food'
    : player.hoursRemaining < 1.0
    ? 'Need 1.0h'
    : '';

  // Cold / simple groceries prep (no appliances needed)
  const coldTime = (hasFreezer && !hasFridge && !hasMicrowave) ? 1.5 : 0.5;
  const canColdMeal = freshUnits >= 1 && player.hoursRemaining >= coldTime;
  const coldDisabledReason = freshUnits < 1
    ? 'No Fresh Food'
    : player.hoursRemaining < coldTime
    ? `Need ${coldTime}h`
    : '';

  const handlePrep = async (mealType: 'home_cooked' | 'microwave' | 'cold_meal' | 'canned' | 'fast_food') => {
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
      } else {
        setActionFeedback({ message: '🍔 Ate fast food takeout! (+1.0 🧠, +1.0 👥)', isError: false });
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

          {fastFoodItems.length > 0 && (
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

          {freshUnits === 0 && cannedUnits === 0 && fastFoodItems.length === 0 && (
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
              <div style={{ color: '#a7f3d0', fontSize: '0.75rem', lineHeight: 1.35 }}>
                Your weekly nutrition is secured ({player.nutritionTier || 'prepared'})! Relaxing will provide full physical & mental recovery.
              </div>
            ) : (
              <div style={{ color: '#fed7aa', fontSize: '0.75rem', lineHeight: 1.35 }}>
                Prepare your food for the week. Relaxing without eating causes permanent exhaustion penalties.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              {/* Option 1: Home Cooked (Stove) */}
              <button
                type="button"
                data-testid="btn-cook-home-meal"
                disabled={!canCookHome}
                onClick={() => handlePrep('home_cooked')}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: canCookHome ? 'linear-gradient(135deg, #065f46 0%, #047857 100%)' : 'rgba(255,255,255,0.06)',
                  border: canCookHome ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                  color: canCookHome ? '#fff' : '#64748b',
                  cursor: canCookHome ? 'pointer' : 'not-allowed',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.82rem' }}>🍳 Home Cooked (Stove)</div>
                  <div style={{ fontSize: '0.68rem', opacity: 0.85 }}>
                    ⏳ {cookTime}h • -1.0 💪 • +{hasMicrowave ? 1 : 2} 🧹 → Net +1.5 💪, +2.0 🧠
                  </div>
                </div>
                {!canCookHome && (
                  <span style={{ fontSize: '0.65rem', color: '#f87171', maxWidth: '85px', textAlign: 'right' }}>
                    {cookDisabledReason}
                  </span>
                )}
              </button>

              {/* Option 2: Microwave Meal */}
              <button
                type="button"
                data-testid="btn-cook-microwave"
                disabled={!canMicrowave}
                onClick={() => handlePrep('microwave')}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: canMicrowave ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'rgba(255,255,255,0.06)',
                  border: canMicrowave ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                  color: canMicrowave ? '#fff' : '#64748b',
                  cursor: canMicrowave ? 'pointer' : 'not-allowed',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.82rem' }}>⚡ Microwave Meal</div>
                  <div style={{ fontSize: '0.68rem', opacity: 0.85 }}>
                    ⏳ 1.0h • 0 💪 • +1 🧹 → +0.5 💪, +1.0 🧠
                  </div>
                </div>
                {!canMicrowave && (
                  <span style={{ fontSize: '0.65rem', color: '#f87171', maxWidth: '85px', textAlign: 'right' }}>
                    {microwaveDisabledReason}
                  </span>
                )}
              </button>

              {/* Option 3: Cold / Raw Groceries Prep */}
              <button
                type="button"
                data-testid="btn-cook-cold-meal"
                disabled={!canColdMeal}
                onClick={() => handlePrep('cold_meal')}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: canColdMeal ? 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' : 'rgba(255,255,255,0.06)',
                  border: canColdMeal ? '1px solid #2dd4bf' : '1px solid rgba(255,255,255,0.1)',
                  color: canColdMeal ? '#fff' : '#64748b',
                  cursor: canColdMeal ? 'pointer' : 'not-allowed',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.82rem' }}>🥗 Cold Meal (Sandwich & Salad)</div>
                  <div style={{ fontSize: '0.68rem', opacity: 0.85 }}>
                    ⏳ {coldTime}h • 0 💪 • 0 🧹 → +0.5 🧠 (No appliances needed)
                  </div>
                </div>
                {!canColdMeal && (
                  <span style={{ fontSize: '0.65rem', color: '#f87171', maxWidth: '85px', textAlign: 'right' }}>
                    {coldDisabledReason}
                  </span>
                )}
              </button>

              {/* Option 4: Canned Stew */}
              <button
                type="button"
                data-testid="btn-cook-canned"
                disabled={!canPrepCanned}
                onClick={() => handlePrep('canned')}
                style={{
                  padding: '8px 10px',
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
                  <div style={{ fontWeight: 'bold', fontSize: '0.82rem' }}>🥫 Canned Stew / Rations</div>
                  <div style={{ fontSize: '0.68rem', opacity: 0.85 }}>
                    ⏳ {cannedTime}h • 0 💪 • -1.5 🧠 (Emergency food)
                  </div>
                </div>
                {!canPrepCanned && (
                  <span style={{ fontSize: '0.65rem', color: '#f87171' }}>
                    {cannedUnits < 1 ? 'No Cans' : `Need ${cannedTime}h`}
                  </span>
                )}
              </button>

              {/* Option 5: Fast Food Takeout */}
              <button
                type="button"
                data-testid="btn-eat-fast-food"
                disabled={!canEatFastFood}
                onClick={() => handlePrep('fast_food')}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: canEatFastFood ? 'linear-gradient(135deg, #854d0e 0%, #a16207 100%)' : 'rgba(255,255,255,0.06)',
                  border: canEatFastFood ? '1px solid #eab308' : '1px solid rgba(255,255,255,0.1)',
                  color: canEatFastFood ? '#fff' : '#64748b',
                  cursor: canEatFastFood ? 'pointer' : 'not-allowed',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.82rem' }}>🍔 Eat Fast Food Takeout</div>
                  <div style={{ fontSize: '0.68rem', opacity: 0.85 }}>
                    ⏳ 0h • 0 💪 • +1.0 🧠 • +1.0 👥
                  </div>
                </div>
                {!canEatFastFood && (
                  <span style={{ fontSize: '0.65rem', color: '#f87171' }}>
                    No Fast Food
                  </span>
                )}
              </button>
            </div>

            {hasEaten && (
              <button
                type="button"
                data-testid="btn-pantry-done"
                onClick={onClose}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  border: '1px solid #10b981',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  marginTop: '6px',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>✓</span>
                <span>{t('homeRelax.btnReadyToRelax', { defaultValue: 'Ready to Relax (Back to Apartment)' })}</span>
              </button>
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
