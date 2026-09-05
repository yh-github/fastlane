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
        maxWidth: '380px',
        minHeight: '380px',
        padding: '20px',
        borderRadius: '16px',
        border: '3px solid #10b981',
        boxShadow: '0 0 20px rgba(16, 185, 129, 0.4), 0 8px 24px rgba(0,0,0,0.6)',
        background: 'linear-gradient(165deg, #092618 0%, #04120b 100%)',
        boxSizing: 'border-box'
      }}
    >
      <div>
        {/* Header Banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 'bold',
            letterSpacing: '0.08em',
            padding: '3px 8px',
            borderRadius: '6px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            border: '1px solid #10b981'
          }}>
            PANTRY & STORAGE
          </span>

          <span style={{
            fontSize: '0.82rem',
            fontWeight: 'bold',
            padding: '3px 10px',
            borderRadius: '12px',
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
          height: '80px',
          margin: '6px 0 14px',
          borderRadius: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '2.8rem'
        }}>
          <span role="img" aria-label="Pantry">🥫</span>
        </div>

        {/* Title */}
        <h3 style={{
          margin: '0 0 6px',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          color: '#ffffff',
          textAlign: 'center'
        }}>
          {t('homeRelax.pantryCardTitle', { defaultValue: 'Pantry & Food Supplies' })}
        </h3>

        {/* Fluff Narrative */}
        <p style={{
          fontSize: '0.84rem',
          lineHeight: '1.45',
          color: '#cbd5e1',
          fontStyle: 'italic',
          textAlign: 'center',
          margin: '0 0 14px',
          padding: '0 4px'
        }}>
          "A well-stocked pantry is the cornerstone of healthy living. Proper cold storage shields fresh ingredients from spoilage, keeping you nourished and sharp."
        </p>
      </div>

      {/* Pantry Inventory Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Fresh Food Units */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.4)',
          padding: '10px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>🥗</span>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>
                {t('inventoryModal.freshFood', { defaultValue: 'Fresh Food' })}
              </div>
              <div style={{ fontSize: '0.72rem', color: hasFridge ? '#2ecc71' : '#e67e22' }}>
                {hasFridge ? 'Protected from spoilage' : 'Will spoil without a refrigerator'}
              </div>
            </div>
          </div>
          <span style={{
            fontSize: '1rem',
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
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{ fontSize: '0.78rem', color: '#bbb', fontWeight: 'bold', marginBottom: '6px' }}>
              🍔 Fast Food Meals ({fastFoodItems.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {fastFoodItems.map((ff, idx) => {
                const itemDef = campaign?.items?.find(i => i.id === ff.itemId);
                const itemName = itemDef ? t(`item.${itemDef.id}`, { defaultValue: itemDef.name }) : ff.itemId;
                return (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.75rem',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '3px 8px',
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
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '8px',
            fontSize: '0.75rem',
            color: '#fca5a5',
            textAlign: 'center'
          }}>
            ⚠️ Pantry is completely empty! Relaxing or ending turn without food causes hunger and permanent stat decay.
          </div>
        )}
      </div>
    </div>
  );
};
