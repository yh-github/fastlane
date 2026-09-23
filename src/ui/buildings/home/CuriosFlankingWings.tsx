import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerState, GameRules } from '../../../engine/gameState';
import { ensurePlayerCurios, getCurioDef } from '../../../engine/curioCatalog';

interface CuriosFlankingWingsProps {
  player: PlayerState;
  onAction?: (action: any) => void;
  onClose: () => void;
  turn?: number;
  rules?: GameRules;
}

export const CuriosFlankingWings: React.FC<CuriosFlankingWingsProps> = ({
  player,
  onAction,
  onClose,
  turn = 1,
  rules: _rules
}) => {
  const { t } = useTranslation();
  const curios = ensurePlayerCurios(player, turn);
  const curioCount = curios.length;

  const currentLifestyle = curioCount > 0 ? Math.min(15, Math.floor(2.8 * Math.sqrt(curioCount))) : 0;
  
  // Calculate how many curios are needed for the next lifestyle point
  let nextThreshold = curioCount;
  for (let c = curioCount + 1; c <= 35; c++) {
    if (Math.min(15, Math.floor(2.8 * Math.sqrt(c))) > currentLifestyle) {
      nextThreshold = c;
      break;
    }
  }
  const curiosNeededForNext = nextThreshold > curioCount ? nextThreshold - curioCount : 0;

  // Split curios across left and right wings
  const leftCurios = curios.filter((_, idx) => idx % 2 === 0);
  const rightCurios = curios.filter((_, idx) => idx % 2 === 1);

  const renderCurioCard = (c: any) => {
    const def = getCurioDef(c.catalogId);
    const icon = c.icon || def.icon || '🏺';
    const flavor = c.flavorText || def.description || '';

    return (
      <div
        key={c.id}
        data-testid={`curio-card-${c.id}`}
        style={{
          background: 'linear-gradient(165deg, rgba(28, 25, 23, 0.96) 0%, rgba(18, 16, 15, 0.98) 100%)',
          border: '1.5px solid rgba(234, 179, 8, 0.45)',
          borderRadius: '10px',
          padding: '8px 10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.6), 0 0 8px rgba(234, 179, 8, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxSizing: 'border-box'
        }}
      >
        {/* Header: Icon, Name, Week */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{
                color: '#fef08a',
                fontWeight: 'bold',
                fontSize: '0.78rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {c.name}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#a8a29e' }}>
                {t('homeRelax.acquiredWeek', { week: c.acquiredWeek || 1, defaultValue: `Week #${c.acquiredWeek || 1}` })} · 2 space
              </div>
            </div>
          </div>
        </div>

        {/* Flavor Lore */}
        {flavor && (
          <div style={{
            fontSize: '0.65rem',
            color: '#d6d3d1',
            lineHeight: 1.25,
            fontStyle: 'italic',
            background: 'rgba(0,0,0,0.3)',
            padding: '4px 6px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            "{flavor}"
          </div>
        )}

        {/* Discard Action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
          <button
            data-testid={`btn-discard-curio-${c.id}`}
            onClick={() => onAction?.({ type: 'discard_inventory_item', itemType: 'knick_knacks', curioId: c.id })}
            title={t('homeRelax.discardCurioTitle', { defaultValue: 'Discard this curio (frees 2 space)' })}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '4px',
              color: '#fca5a5',
              fontSize: '0.65rem',
              fontWeight: 'bold',
              padding: '2px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.35)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
          >
            <span>🗑️</span>
            <span>{t('homeRelax.discard', { defaultValue: 'Discard' })}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Left Wing: Status Overview + First half of curios */}
      <div
        className="curios-wing-left"
        data-testid="curios-wing-left"
        style={{
          position: 'absolute',
          right: 'calc(100% + 12px)',
          top: '20px',
          width: 'calc(215px * var(--board-scale, 1))',
          maxHeight: 'calc(500px * var(--board-scale, 1))',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 60,
          overflowY: 'auto',
          paddingRight: '2px'
        }}
      >
        {/* Left Wing Header: Synergy Status */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(41, 37, 36, 0.98) 0%, rgba(28, 25, 23, 0.98) 100%)',
          border: '1px solid #facc15',
          borderRadius: '8px',
          padding: '6px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          boxShadow: '0 0 12px rgba(234, 179, 8, 0.3), 0 4px 12px rgba(0,0,0,0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#fef08a' }}>
              🏺 Curios ({curioCount})
            </span>
            <span style={{
              fontSize: '0.64rem',
              fontWeight: 'bold',
              padding: '1px 5px',
              borderRadius: '4px',
              background: 'rgba(234, 179, 8, 0.2)',
              color: '#facc15',
              border: '1px solid #facc15'
            }}>
              +{currentLifestyle} Lifestyle
            </span>
          </div>
          <div style={{ fontSize: '0.64rem', color: '#d6d3d1', display: 'flex', justifyContent: 'space-between' }}>
            <span>📦 {curioCount * 2} Space</span>
            {curiosNeededForNext > 0 ? (
              <span style={{ color: '#38bdf8' }}>+{curiosNeededForNext} for next tier</span>
            ) : (
              <span style={{ color: '#34d399' }}>Max synergy!</span>
            )}
          </div>
        </div>

        {/* Curio Cards (Left) */}
        {leftCurios.map(c => renderCurioCard(c))}
      </div>

      {/* Right Wing: Lore & Second half of curios */}
      <div
        className="curios-wing-right"
        data-testid="curios-wing-right"
        style={{
          position: 'absolute',
          left: 'calc(100% + 12px)',
          top: '20px',
          width: 'calc(215px * var(--board-scale, 1))',
          maxHeight: 'calc(500px * var(--board-scale, 1))',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 60,
          overflowY: 'auto',
          paddingRight: '2px'
        }}
      >
        {/* Right Wing Header: Close button & Tips */}
        <div style={{
          background: 'rgba(28, 25, 23, 0.98)',
          border: '1px solid rgba(234, 179, 8, 0.45)',
          borderRadius: '8px',
          padding: '5px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          <span style={{ fontSize: '0.66rem', color: '#fef08a', fontWeight: 'bold' }}>
            ✨ Display Shelf
          </span>
          <button
            data-testid="btn-close-curios-wings"
            aria-label="Close Curios Display"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#a8a29e',
              fontSize: '0.80rem',
              cursor: 'pointer',
              padding: '0 2px',
              fontWeight: 'bold'
            }}
            title="Minimize Curios Console"
          >
            ✕
          </button>
        </div>

        {/* Curio Cards (Right) */}
        {rightCurios.map(c => renderCurioCard(c))}
      </div>
    </>
  );
};
