import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CampaignBundle } from '../../../engine/dataLoader';
import type { PlayerState, GameRules, OwnedAppliance } from '../../../engine/gameState';
import { HomeCardDeck } from './HomeCardDeck';
import { LeisureCards } from './LeisureCards';
import { ChoresCards } from './ChoresCards';
import { PantryCard } from './PantryCard';
import { DurableCardModal } from './DurableCardModal';

interface HomeApartmentViewProps {
  player: PlayerState;
  campaign?: CampaignBundle;
  rules?: GameRules;
  housingName: string;
  actionFeedback: { message: string; isError: boolean } | null;

  // Space & Mess gauge props
  durablesSpace: number;
  totalUsedSpace: number;
  spaceCap: number;
  freeSpace: number;
  overflow: number;
  isOvercapacity: boolean;
  durablesPct: number;
  messPct: number;
  currentMess: number;
  maxMessHousing: number;
  messIcon: string;
  messLabel: string;
  messBarColor: string;
  messPercentage: number;

  // Leisure props
  hoursToRelax: number;
  isRelaxDisabled: boolean;
  hasFood: boolean;
  physGain: number;
  mentalGain: number;
  scaledMess: number;
  classicGain: number;
  classicFirstBonus: number;
  onRelaxClick: () => void;

  // Socialize props
  socialParams: any;
  onSocializeClick: () => void;

  // Chores props
  hoursToClean: number;
  cleanPhysGain: number;
  isCleanDisabled: boolean;
  cleanSubtext: string;
  onCleanClick: () => void;

  cleaningServiceCost: number;
  cleaningServicePrice: number;
  isServiceDisabled: boolean;
  serviceSubtext: string;
  onServiceClick: () => void;

  // Pantry props
  hasFridge: boolean;
  hasFreezer: boolean;
}

export const HomeApartmentView: React.FC<HomeApartmentViewProps> = ({
  player,
  campaign,
  rules,
  housingName,
  actionFeedback,
  durablesSpace,
  totalUsedSpace,
  spaceCap,
  freeSpace,
  overflow,
  isOvercapacity,
  durablesPct,
  messPct,
  currentMess,
  maxMessHousing,
  messIcon,
  messLabel,
  messBarColor,
  messPercentage,
  hoursToRelax,
  isRelaxDisabled,
  hasFood,
  physGain,
  mentalGain,
  scaledMess,
  classicGain,
  classicFirstBonus,
  onRelaxClick,
  socialParams,
  onSocializeClick,
  hoursToClean,
  cleanPhysGain,
  isCleanDisabled,
  cleanSubtext,
  onCleanClick,
  cleaningServiceCost,
  cleaningServicePrice,
  isServiceDisabled,
  serviceSubtext,
  onServiceClick,
  hasFridge,
  hasFreezer
}) => {
  const { t } = useTranslation();
  const [activeDeck, setActiveDeck] = useState<'leisure' | 'chores' | 'pantry' | null>(null);
  const [inspectedDurable, setInspectedDurable] = useState<{
    id: string;
    isBook?: boolean;
    applianceData?: OwnedAppliance;
  } | null>(null);

  // Group appliances so each unique ID has an entry, keeping 'new' if any copy is new
  const uniqueApplianceIds = Array.from(new Set(player.inventory?.appliances?.map(a => a.id) || []));
  const uniqueAppliances = uniqueApplianceIds.map(id => {
    const matching = player.inventory?.appliances?.filter(a => a.id === id) || [];
    const hasAnyNew = matching.some(a => a.condition === 'new' || a.purchaseSource === 'socket_city');
    const first = matching[0];
    return {
      ...first,
      condition: (hasAnyNew ? 'new' : 'used') as 'new' | 'used'
    };
  });

  const ownedBooks = player.inventory?.books || [];
  const totalDurablesCount = uniqueAppliances.length + ownedBooks.length;

  return (
    <div className="interaction-panel" style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* Title Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1em' }}>
          🏠 {housingName}
        </h3>
        <span style={{ fontSize: '0.82em', color: '#00e5ff', fontWeight: 'bold' }}>
          {t('homeRelax.title', { defaultValue: 'Apartment Life' })}
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

      {/* Space & Mess Opposing Gauge Bar */}
      {(rules?.trackMess || rules?.spaceCapping) && (
        <div className="mess-visual-card" style={{ 
          marginBottom: '14px', 
          padding: '8px 12px', 
          background: 'linear-gradient(135deg, rgba(20,20,35,0.85) 0%, rgba(35,35,55,0.85) 100%)', 
          borderRadius: '8px',
          border: isOvercapacity ? '1px solid #e74c3c' : `1px solid ${messBarColor}`,
          boxShadow: isOvercapacity ? '0 0 10px rgba(231,76,60,0.4)' : `0 0 8px ${messBarColor}22`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.85em', color: '#00e5ff' }}>
              🛋️ Durables: {durablesSpace} space
            </span>
            <span style={{ fontWeight: 'bold', fontSize: '0.85em', textAlign: 'center' }}>
              {rules?.spaceCapping ? (
                isOvercapacity ? (
                  <span style={{ color: '#e74c3c', background: 'rgba(231,76,60,0.2)', padding: '1px 6px', borderRadius: '3px' }}>
                    ⚠️ OVERCROWDED (+{overflow})
                  </span>
                ) : freeSpace === 0 ? (
                  <span style={{ color: '#f39c12' }}>FULL (0 free)</span>
                ) : (
                  <span style={{ color: '#2ecc71' }}>{freeSpace} free space</span>
                )
              ) : null}
            </span>
            <span style={{ fontWeight: 'bold', fontSize: '0.85em', color: messBarColor }}>
              {messIcon} Mess: {currentMess} <span style={{ fontSize: '0.85em', opacity: 0.9 }}>({messLabel})</span>
            </span>
          </div>

          {rules?.spaceCapping ? (
            <div 
              style={{ 
                width: '100%', 
                height: '12px', 
                backgroundColor: 'rgba(255,255,255,0.08)', 
                borderRadius: '6px', 
                overflow: 'hidden',
                position: 'relative'
              }}
              title={`Durables: ${durablesSpace} space | Mess: ${currentMess} space | Free: ${freeSpace} space${overflow > 0 ? ` (⚠️ ${overflow} space overcrowded!)` : ''}`}
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
            </div>
          ) : (
            <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${messPercentage}%`,
                height: '100%',
                backgroundColor: messBarColor,
                transition: 'width 0.5s ease-in-out, background-color 0.5s ease'
              }} />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.72em', color: '#aaa', flexWrap: 'wrap', gap: '4px' }}>
            {rules?.spaceCapping ? (
              <>
                <span style={{ color: '#00e5ff' }}>0 (Start)</span>
                <span>
                  Capacity: <strong>{spaceCap} space</strong>
                  {overflow > 0 && <span style={{ color: '#e74c3c', marginLeft: '4px' }}>(Total: {totalUsedSpace})</span>}
                </span>
                <span style={{ color: messBarColor }}>Max Mess: {maxMessHousing}</span>
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

      {/* FRONT AND CENTER: DURABLES SHOWCASE */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(16, 20, 36, 0.9) 0%, rgba(10, 12, 22, 0.95) 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '16px',
        marginBottom: '16px',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.6)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, color: 'var(--accent-cyan)', fontSize: '0.92em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🛋️ {t('homeRelax.durablesShowcase', { defaultValue: 'Apartment Furnishings & Belongings' })}
          </h4>
          <span style={{ fontSize: '0.75rem', color: '#888' }}>
            {totalDurablesCount} {totalDurablesCount === 1 ? 'durable' : 'durables'} owned (Click to inspect)
          </span>
        </div>

        {totalDurablesCount === 0 ? (
          <div style={{
            padding: '24px 16px',
            textAlign: 'center',
            borderRadius: '8px',
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px dashed rgba(255, 255, 255, 0.15)',
            color: '#94a3b8'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '6px' }}>📦</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '4px' }}>
              Your apartment is completely unfurnished!
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', maxWidth: '340px', margin: '0 auto' }}>
              Just bare floors and echoing walls. Visit Socket City or Z-Mart to buy appliances and books to furnish your home and improve your lifestyle.
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))',
            gap: '12px',
            justifyItems: 'center',
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '4px'
          }}>
            {/* Appliances */}
            {uniqueAppliances.map((app) => {
              const itemDef = campaign?.items?.find(i => i.id === app.id);
              const itemName = itemDef ? t(`item.${itemDef.id}`, { defaultValue: itemDef.name }) : app.id;
              const isNew = app.condition === 'new' || app.purchaseSource === 'socket_city';

              return (
                <div
                  key={app.id}
                  onClick={() => setInspectedDurable({ id: app.id, isBook: false, applianceData: app })}
                  title={`${itemName} (${isNew ? 'New' : 'Used'}) — Click to inspect`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '74px',
                    height: '84px',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: `1.5px solid ${isNew ? '#2ecc71' : '#3498db'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    boxShadow: isNew 
                      ? '0 0 10px rgba(46, 204, 113, 0.25)' 
                      : '0 0 10px rgba(52, 152, 219, 0.25)',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    padding: '6px 4px',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
                    e.currentTarget.style.boxShadow = isNew 
                      ? '0 0 16px rgba(46, 204, 113, 0.5)' 
                      : '0 0 16px rgba(52, 152, 219, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = isNew 
                      ? '0 0 10px rgba(46, 204, 113, 0.25)' 
                      : '0 0 10px rgba(52, 152, 219, 0.25)';
                  }}
                >
                  <img
                    src={`/assets/raw_images/${app.id}.png`}
                    alt={itemName}
                    style={{
                      width: '46px',
                      height: '46px',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span style={{
                    fontSize: '0.66rem',
                    color: '#e2e8f0',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '68px',
                    marginTop: '4px'
                  }}>
                    {itemName}
                  </span>
                  <span style={{
                    position: 'absolute',
                    top: '3px',
                    right: '4px',
                    fontSize: '0.65rem'
                  }}>
                    {isNew ? '✨' : '📦'}
                  </span>
                </div>
              );
            })}

            {/* Books */}
            {ownedBooks.map((bId) => {
              const itemDef = campaign?.items?.find(i => i.id === bId);
              const bookName = itemDef ? t(`item.${itemDef.id}`, { defaultValue: itemDef.name }) : bId;

              return (
                <div
                  key={bId}
                  onClick={() => setInspectedDurable({ id: bId, isBook: true })}
                  title={`${bookName} (Book) — Click to inspect`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '74px',
                    height: '84px',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1.5px solid #9b59b6',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    boxShadow: '0 0 10px rgba(155, 89, 182, 0.25)',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    padding: '6px 4px',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 0 16px rgba(155, 89, 182, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(155, 89, 182, 0.25)';
                  }}
                >
                  <img
                    src={`/assets/raw_images/${bId}.png`}
                    alt={bookName}
                    style={{
                      width: '46px',
                      height: '46px',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span style={{
                    fontSize: '0.66rem',
                    color: '#e2e8f0',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '68px',
                    marginTop: '4px'
                  }}>
                    {bookName}
                  </span>
                  <span style={{
                    position: 'absolute',
                    top: '3px',
                    right: '4px',
                    fontSize: '0.65rem'
                  }}>
                    📚
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ACTION CONTROLS BAR (Leisure, Chores, Pantry) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px'
      }}>
        {/* Leisure Button */}
        <button
          onClick={() => setActiveDeck('leisure')}
          style={{
            padding: '12px 10px',
            background: 'linear-gradient(145deg, #10b981 0%, #059669 100%)',
            color: '#000',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            transition: 'transform 0.15s ease'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'none'}
        >
          <span style={{ fontSize: '1.4rem' }}>🛋️</span>
          <span>{t('homeRelax.btnLeisure', { defaultValue: 'Leisure' })}</span>
          <span style={{ fontSize: '0.68rem', color: '#064e3b', fontWeight: 'bold' }}>Relax & Socialize</span>
        </button>

        {/* Chores Button */}
        <button
          onClick={() => setActiveDeck('chores')}
          style={{
            padding: '12px 10px',
            background: 'linear-gradient(145deg, #0284c7 0%, #0369a1 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            transition: 'transform 0.15s ease'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'none'}
        >
          <span style={{ fontSize: '1.4rem' }}>🧹</span>
          <span>{t('homeRelax.btnChores', { defaultValue: 'Chores' })}</span>
          <span style={{ fontSize: '0.68rem', color: '#e0f2fe', fontWeight: 'normal' }}>Clean & Service</span>
        </button>

        {/* Pantry Button */}
        <button
          onClick={() => setActiveDeck('pantry')}
          style={{
            padding: '12px 10px',
            background: 'linear-gradient(145deg, #f59e0b 0%, #d97706 100%)',
            color: '#000',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            transition: 'transform 0.15s ease'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'none'}
        >
          <span style={{ fontSize: '1.4rem' }}>🥫</span>
          <span>{t('homeRelax.btnPantry', { defaultValue: 'Pantry' })}</span>
          <span style={{ fontSize: '0.68rem', color: '#78350f', fontWeight: 'bold' }}>
            {player.inventory?.freshFoodUnits || 0} units
          </span>
        </button>
      </div>

      {/* CARD DECKS MODALS */}
      {activeDeck === 'leisure' && (
        <HomeCardDeck
          title={t('homeRelax.deckLeisure', { defaultValue: 'Leisure & Living' })}
          icon="🛋️"
          onClose={() => setActiveDeck(null)}
        >
          <LeisureCards
            hoursToRelax={hoursToRelax}
            isRelaxDisabled={isRelaxDisabled}
            hasFood={hasFood}
            physGain={physGain}
            mentalGain={mentalGain}
            scaledMess={scaledMess}
            trackMess={rules?.trackMess}
            usePhysicalMental={rules?.usePhysicalMentalConditions}
            classicGain={classicGain}
            classicFirstBonus={classicFirstBonus}
            onRelaxClick={() => {
              onRelaxClick();
            }}
            socialParams={socialParams}
            onSocializeClick={() => {
              onSocializeClick();
            }}
          />
        </HomeCardDeck>
      )}

      {activeDeck === 'chores' && (
        <HomeCardDeck
          title={t('homeRelax.deckChores', { defaultValue: 'Chores & Maintenance' })}
          icon="🧹"
          onClose={() => setActiveDeck(null)}
        >
          <ChoresCards
            hoursToClean={hoursToClean}
            cleanPhysGain={cleanPhysGain}
            isCleanDisabled={isCleanDisabled}
            cleanSubtext={cleanSubtext}
            onCleanClick={() => {
              onCleanClick();
            }}
            cleaningServiceCost={cleaningServiceCost}
            cleaningServicePrice={cleaningServicePrice}
            isServiceDisabled={isServiceDisabled}
            serviceSubtext={serviceSubtext}
            onServiceClick={() => {
              onServiceClick();
            }}
          />
        </HomeCardDeck>
      )}

      {activeDeck === 'pantry' && (
        <HomeCardDeck
          title={t('homeRelax.deckPantry', { defaultValue: 'Kitchen & Pantry' })}
          icon="🥫"
          onClose={() => setActiveDeck(null)}
        >
          <PantryCard
            freshFoodUnits={player.inventory?.freshFoodUnits || 0}
            fastFoodItems={player.inventory?.fastFoodItems || []}
            hasFridge={hasFridge}
            hasFreezer={hasFreezer}
            campaign={campaign}
          />
        </HomeCardDeck>
      )}

      {/* DURABLE CARD INSPECTION MODAL */}
      {inspectedDurable && (
        <DurableCardModal
          durable={inspectedDurable}
          campaign={campaign}
          onClose={() => setInspectedDurable(null)}
        />
      )}
    </div>
  );
};
