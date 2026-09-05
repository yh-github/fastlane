import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CampaignBundle } from '../../../engine/dataLoader';
import type { FastFoodEntry } from '../../../engine/gameState';

interface PantryCardProps {
  freshFoodUnits: number;
  fastFoodItems: FastFoodEntry[];
  hasFridge: boolean;
  hasFreezer: boolean;
  campaign?: CampaignBundle;
}

export const PantryCard: React.FC<PantryCardProps> = ({
  freshFoodUnits,
  fastFoodItems,
  hasFridge,
  hasFreezer,
  campaign
}) => {
  const { t } = useTranslation();
  const totalFood = freshFoodUnits + (fastFoodItems?.length || 0);

  return (
    <div
      className="weekend-card"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: '360px',
        minHeight: '260px',
        padding: '10px 14px',
        borderRadius: '12px',
        border: '2px solid #10b981',
        boxShadow: '0 0 16px rgba(16, 185, 129, 0.3), 0 4px 14px rgba(0,0,0,0.6)',
        background: 'linear-gradient(165deg, #092618 0%, #04120b 100%)',
        boxSizing: 'border-box'
      }}
    >
      <div>
        {/* Header Banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 'bold',
            letterSpacing: '0.08em',
            padding: '2px 6px',
            borderRadius: '5px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            border: '1px solid #10b981'
          }}>
            PANTRY & STORAGE
          </span>

          <span style={{
            fontSize: '0.78rem',
            fontWeight: 'bold',
            padding: '2px 8px',
            borderRadius: '10px',
            backgroundColor: hasFridge ? '#064e3b' : '#7c2d12',
            color: hasFridge ? '#a7f3d0' : '#fed7aa',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            {hasFridge ? (hasFreezer ? '🧊 Fridge + Freezer' : '🧊 Fridge Active') : '⚠️ No Fridge'}
          </span>
        </div>

        {/* Artwork Frame */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '48px',
          margin: '4px 0 8px',
          borderRadius: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '1.8rem'
        }}>
          <span role="img" aria-label="Pantry">🥫</span>
        </div>

        {/* Title */}
        <h3 style={{
          margin: '0 0 4px',
          fontSize: '1.02rem',
          fontWeight: 'bold',
          color: '#ffffff',
          textAlign: 'center'
        }}>
          {t('homeRelax.pantryCardTitle', { defaultValue: 'Pantry & Food Supplies' })}
        </h3>

        {/* Fluff Narrative */}
        <p style={{
          fontSize: '0.76rem',
          lineHeight: '1.3',
          color: '#cbd5e1',
          fontStyle: 'italic',
          textAlign: 'center',
          margin: '0 0 8px',
          padding: '0 4px'
        }}>
          "A well-stocked pantry is essential. Proper cold storage shields fresh ingredients from spoiling."
        </p>
      </div>

      {/* Pantry Inventory Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* Fresh Food Units */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.4)',
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.1rem' }}>🥗</span>
            <div>
              <div style={{ fontSize: '0.80rem', fontWeight: 'bold', color: '#fff' }}>
                {t('inventoryModal.freshFood', { defaultValue: 'Fresh Food' })}
              </div>
              <div style={{ fontSize: '0.68rem', color: hasFridge ? '#2ecc71' : '#e67e22' }}>
                {hasFridge ? 'Protected from spoilage' : 'Will spoil without refrigerator'}
              </div>
            </div>
          </div>
          <span style={{
            fontSize: '0.92rem',
            fontWeight: 'bold',
            color: freshFoodUnits > 0 ? '#10b981' : '#ef4444'
          }}>
            {freshFoodUnits} units
          </span>
        </div>

        {/* Fast Food Items */}
        {fastFoodItems && fastFoodItems.length > 0 && (
          <div style={{
            background: 'rgba(0,0,0,0.4)',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#bbb', fontWeight: 'bold', marginBottom: '4px' }}>
              🍔 Fast Food Meals ({fastFoodItems.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {fastFoodItems.map((ff, idx) => {
                const itemDef = campaign?.items?.find(i => i.id === ff.itemId);
                const itemName = itemDef ? t(`item.${itemDef.id}`, { defaultValue: itemDef.name }) : ff.itemId;
                return (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.70rem',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff'
                    }}
                  >
                    {itemName} {ff.happinessBonus > 0 && <span style={{ color: '#f59e0b' }}>+{ff.happinessBonus} 😊</span>}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty Warning */}
        {totalFood === 0 && (
          <div style={{
            padding: '6px 10px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '6px',
            fontSize: '0.70rem',
            color: '#fca5a5',
            textAlign: 'center'
          }}>
            ⚠️ Pantry empty! Ending turn without food causes hunger and permanent stat decay.
          </div>
        )}
      </div>
    </div>
  );
};
