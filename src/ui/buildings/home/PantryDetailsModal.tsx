import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerState } from '../../../engine/gameState';
import type { CampaignBundle } from '../../../engine/dataLoader';

interface PantryDetailsModalProps {
  player: PlayerState;
  campaign?: CampaignBundle;
  onClose: () => void;
}

export const PantryDetailsModal: React.FC<PantryDetailsModalProps> = ({
  player,
  campaign,
  onClose
}) => {
  const { t } = useTranslation();

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
    a => a.id === 'refrigerator' || campaign?.items?.find(i => i.id === a.id)?.tags?.includes('refrigerator')
  ) ?? false;
  const hasFreezer = player.inventory?.appliances?.some(
    a => a.id === 'freezer' || campaign?.items?.find(i => i.id === a.id)?.tags?.includes('freezer')
  ) ?? false;

  const freshUnits = player.inventory?.freshFoodUnits || 0;
  const fastFoodItems = player.inventory?.fastFoodItems || [];

  return (
    <div
      data-testid="pantry-details-modal"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 100,
        borderRadius: '12px'
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
          position: 'relative'
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
            marginBottom: '18px',
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
            <span style={{ fontWeight: 'bold', color: hasFridge ? '#2ecc71' : '#e67e22' }}>
              {hasFridge ? (hasFreezer ? '🧊 Refrigerator + Freezer' : '🧊 Refrigerator Active') : '⚠️ No Fridge'}
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

          {fastFoodItems.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '6px' }}>
              <div style={{ color: '#94a3b8', marginBottom: '4px', fontSize: '0.8rem' }}>Fast Food:</div>
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

          {freshUnits === 0 && fastFoodItems.length === 0 && (
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
};
