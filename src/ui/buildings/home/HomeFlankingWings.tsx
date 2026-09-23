import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerState, GameRules } from '../../../engine/gameState';
import type { CampaignBundle } from '../../../engine/dataLoader';
import { formatHours, messGrowth } from '../../../engine/statMath';
import { HomeCardHelpModal, type HomeActionType } from './HomeCardHelpModal';

export interface HomeFlankingWingsProps {
  activeWing?: 'leisure' | 'chores' | null;
  onCloseWing?: () => void;
  player: PlayerState;
  rules?: GameRules;
  campaign?: CampaignBundle;
  // Leisure props
  hoursToRelax: number;
  isRelaxDisabled: boolean;
  hasFood: boolean;
  physGain: number;
  mentalGain: number;
  scaledMess: number;
  classicGain?: number;
  classicFirstBonus?: number;
  onRelaxClick: () => void;
  socialParams?: {
    isDisabled: boolean;
    disabledReasonKey?: string;
    isHalfRewardExpected: boolean;
    effectiveMinGuests?: number;
    effectiveMaxGuests?: number;
    minReward: number;
    maxReward: number;
    minCashNeeded: number;
    maxCashNeeded: number;
    timeCost: number;
    isCappedBySpace?: boolean;
  };
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

export const HomeFlankingWings: React.FC<HomeFlankingWingsProps> = ({
  activeWing,
  onCloseWing,
  player,
  rules,
  campaign,
  hoursToRelax,
  isRelaxDisabled,
  hasFood,
  physGain,
  mentalGain,
  scaledMess,
  classicGain,
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
  const [activeHelp, setActiveHelp] = useState<HomeActionType | null>(null);

  const usePhysicalMental = !!rules?.usePhysicalMentalConditions;
  const trackMess = !!rules?.trackMess;

  // Social formatting
  const socialRewardRange = socialParams
    ? (socialParams.minReward === socialParams.maxReward
        ? `+${socialParams.minReward}`
        : `+${socialParams.minReward}..+${socialParams.maxReward}`)
    : '+0';

  const socialCostRange = socialParams
    ? (socialParams.minCashNeeded === socialParams.maxCashNeeded
        ? `$${socialParams.minCashNeeded}`
        : `$${socialParams.minCashNeeded}–$${socialParams.maxCashNeeded}`)
    : '$0';

  // Mess range for Host
  const growth = messGrowth(player.mess || 0);
  const minGuests = socialParams?.effectiveMinGuests ?? 1;
  const maxGuests = socialParams?.effectiveMaxGuests ?? 3;
  const minMessAdded = minGuests * growth;
  const maxMessAdded = maxGuests * growth;
  const hostMessRangeStr = minMessAdded === maxMessAdded ? `+${minMessAdded}` : `+${minMessAdded}..+${maxMessAdded}`;

  const freshFoodUnits = player.inventory?.freshFoodUnits || 0;
  const cannedFoodUnits = player.inventory?.cannedFoodUnits || 0;
  const fastFoodCount = player.inventory?.fastFoodItems?.length || 0;

  const showLeisure = activeWing === undefined ? true : activeWing === 'leisure';
  const showChores = activeWing === undefined ? true : activeWing === 'chores';

  return (
    <>
      {/* Help Modal */}
      {activeHelp && (
        <HomeCardHelpModal
          action={activeHelp}
          onClose={() => setActiveHelp(null)}
          player={player}
          rules={rules}
          campaign={campaign}
          hoursToRelax={hoursToRelax}
          physGain={physGain}
          mentalGain={mentalGain}
          scaledMess={scaledMess}
          hasFood={hasFood}
          socialParams={socialParams}
          hoursToClean={hoursToClean}
          cleanPhysGain={cleanPhysGain}
          cleaningServiceCost={cleaningServiceCost}
          cleaningServicePrice={cleaningServicePrice}
          hasFridge={hasFridge}
          hasFreezer={hasFreezer}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          LEFT WING: LEISURE (Relax, Host)
         ───────────────────────────────────────────────────────────── */}
      {showLeisure && (
        <div
          className="home-wing-left"
          data-testid="home-wing-left"
          style={{
            position: 'absolute',
            right: 'calc(100% + 12px)',
            top: '10px',
            width: 'calc(210px * var(--board-scale, 1))',
            maxHeight: 'calc(520px * var(--board-scale, 1))',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 60,
            overflowY: 'auto',
            paddingRight: '2px'
          }}
        >
          {/* Close Wing Button */}
          {onCloseWing && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2px' }}>
              <button
                type="button"
                onClick={onCloseWing}
                data-testid="btn-close-wing-leisure"
                title={t('homeRelax.fold', { defaultValue: 'Fold' })}
                aria-label={t('homeRelax.fold', { defaultValue: 'Fold' })}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  cursor: 'pointer',
                  padding: '2px 7px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                ✕ {t('homeRelax.fold', { defaultValue: 'Fold' })}
              </button>
            </div>
          )}
        {/* 1. RELAX CARD */}
        <div
          data-testid="home-card-relax"
          style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.96) 0%, rgba(6, 22, 14, 0.98) 100%)',
            border: '1.5px solid #10b981',
            borderRadius: '10px',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
          }}
        >
          {/* Card Top Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '1rem' }}>🧘</span>
              <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#fff' }}>
                {t('homeRelax.buttonBasic', { defaultValue: 'Relax' })}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                background: '#064e3b',
                color: '#6ee7b7',
                fontSize: '0.66rem',
                fontWeight: 800,
                padding: '2px 5px',
                borderRadius: '4px',
                border: '1px solid #059669'
              }}>
                ⏳ {formatHours(hoursToRelax)}h
              </span>
              <button
                type="button"
                onClick={() => setActiveHelp('relax')}
                title="Help & Details"
                aria-label="Help & Details"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#cbd5e1',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                ?
              </button>
            </div>
          </div>

          {/* Modifiers / Impacts */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '6px',
            padding: '5px 6px',
            fontSize: '0.70rem',
            lineHeight: 1.3
          }}>
            {usePhysicalMental ? (
              hasFood ? (
                <div style={{ color: '#86efac', display: 'flex', flexWrap: 'wrap', gap: '4px', fontWeight: 600 }}>
                  <span>+{physGain} 💪 Phys</span>
                  <span>+{mentalGain} 🧠 Mental</span>
                  {trackMess && scaledMess > 0 && <span style={{ color: '#f59e0b' }}>+{scaledMess} 🧹 Mess</span>}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ color: '#86efac', display: 'flex', flexWrap: 'wrap', gap: '4px', fontWeight: 600 }}>
                    <span>+{physGain} 💪 Phys</span>
                    <span>+{mentalGain} 🧠 Mental</span>
                    {trackMess && scaledMess > 0 && <span style={{ color: '#f59e0b' }}>+{scaledMess} 🧹 Mess</span>}
                  </div>
                  <div style={{ color: '#fca5a5', fontWeight: 700, fontSize: '0.66rem' }}>
                    ⚠️ Starving: -1 Max 💪 & 🧠!
                  </div>
                </div>
              )
            ) : (
              <div style={{ color: '#86efac', fontWeight: 600 }}>
                +{classicGain} 🧘 Relaxation
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            data-testid="btn-relax"
            data-action-target="relax"
            onClick={onRelaxClick}
            disabled={isRelaxDisabled}
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              border: 'none',
              background: isRelaxDisabled ? '#374151' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: isRelaxDisabled ? '#9ca3af' : '#000',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: isRelaxDisabled ? 'not-allowed' : 'pointer',
              boxShadow: isRelaxDisabled ? 'none' : '0 2px 6px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.15s ease'
            }}
          >
            {t('homeRelax.buttonBasic', { defaultValue: 'Relax' })}
          </button>
        </div>

        {/* 2. HOST CARD (Socialize) */}
        {usePhysicalMental && socialParams && (
          <div
            data-testid="home-card-host"
            style={{
              background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.96) 0%, rgba(8, 20, 36, 0.98) 100%)',
              border: `1.5px solid ${socialParams.isHalfRewardExpected ? '#f59e0b' : '#38bdf8'}`,
              borderRadius: '10px',
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
            }}
          >
            {/* Card Top Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '1rem' }}>🎉</span>
                <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#fff' }}>
                  {t('homeRelax.btnHost', { defaultValue: 'Host' })}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  background: '#075985',
                  color: '#bae6fd',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  padding: '2px 5px',
                  borderRadius: '4px',
                  border: '1px solid #0284c7'
                }}>
                  ⏳ {socialParams.timeCost}h
                </span>
                <button
                  type="button"
                  onClick={() => setActiveHelp('host')}
                  title="Help & Details"
                  aria-label="Help & Details"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#cbd5e1',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  ?
                </button>
              </div>
            </div>

            {/* Modifiers / Impacts */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '6px',
              padding: '5px 6px',
              fontSize: '0.70rem',
              lineHeight: 1.3,
              display: 'flex',
              flexDirection: 'column',
              gap: '3px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', fontWeight: 600 }}>
                <span>{socialRewardRange} 👥 Social</span>
                <span style={{ color: '#f87171' }}>-{socialCostRange}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.66rem' }}>
                <span style={{ color: '#fca5a5' }}>-1 💪 Fatigue</span>
                <span style={{ color: '#f59e0b' }}>{hostMessRangeStr} 🧹 Mess</span>
              </div>
            </div>

            {/* Action Button */}
            <button
              data-testid="btn-socialize"
              data-action-target="socialize"
              onClick={onSocializeClick}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                border: 'none',
                background: socialParams.isDisabled ? '#374151' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: socialParams.isDisabled ? '#9ca3af' : '#fff',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: socialParams.isDisabled ? 'not-allowed' : 'pointer',
                boxShadow: socialParams.isDisabled ? 'none' : '0 2px 6px rgba(2, 132, 199, 0.4)',
                transition: 'all 0.15s ease'
              }}
            >
              {t('homeRelax.btnHost', { defaultValue: 'Host' })}
            </button>
          </div>
        )}
      </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          RIGHT WING: CHORES & PANTRY (Clean, Service, Pantry)
         ───────────────────────────────────────────────────────────── */}
      {showChores && (
        <div
          className="home-wing-right"
          data-testid="home-wing-right"
          style={{
            position: 'absolute',
            left: 'calc(100% + 12px)',
            top: '10px',
            width: 'calc(210px * var(--board-scale, 1))',
            maxHeight: 'calc(520px * var(--board-scale, 1))',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 60,
            overflowY: 'auto',
            paddingRight: '2px'
          }}
        >
          {/* Close Wing Button */}
          {onCloseWing && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '2px' }}>
              <button
                type="button"
                onClick={onCloseWing}
                data-testid="btn-close-wing-chores"
                title={t('homeRelax.fold', { defaultValue: 'Fold' })}
                aria-label={t('homeRelax.fold', { defaultValue: 'Fold' })}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  cursor: 'pointer',
                  padding: '2px 7px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                ✕ {t('homeRelax.fold', { defaultValue: 'Fold' })}
              </button>
            </div>
          )}

        {/* 1. CLEAN CARD (Manual) */}
        {trackMess && (
          <div
            data-testid="home-card-clean"
            style={{
              background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.96) 0%, rgba(8, 20, 36, 0.98) 100%)',
              border: '1.5px solid #38bdf8',
              borderRadius: '10px',
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
            }}
          >
            {/* Card Top Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '1rem' }}>🧹</span>
                <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#fff' }}>
                  {t('homeRelax.btnClean', { defaultValue: 'Clean' })}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  background: '#075985',
                  color: '#bae6fd',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  padding: '2px 5px',
                  borderRadius: '4px',
                  border: '1px solid #0284c7'
                }}>
                  ⏳ {formatHours(hoursToClean)}h
                </span>
                <button
                  type="button"
                  onClick={() => setActiveHelp('clean')}
                  title="Help & Details"
                  aria-label="Help & Details"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#cbd5e1',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  ?
                </button>
              </div>
            </div>

            {/* Modifiers / Impacts */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '6px',
              padding: '5px 6px',
              fontSize: '0.70rem',
              lineHeight: 1.3
            }}>
              <div style={{ color: '#86efac', fontWeight: 600 }}>🧹 Reduces Mess</div>
              <div style={{ color: '#fca5a5', fontSize: '0.66rem' }}>
                {cleanSubtext || `-${cleanPhysGain} 💪 Effort`}
              </div>
            </div>

            {/* Action Button */}
            <button
              data-testid="btn-clean"
              data-action-target="clean"
              onClick={onCleanClick}
              disabled={isCleanDisabled}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                border: 'none',
                background: isCleanDisabled ? '#374151' : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: isCleanDisabled ? '#9ca3af' : '#fff',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: isCleanDisabled ? 'not-allowed' : 'pointer',
                boxShadow: isCleanDisabled ? 'none' : '0 2px 6px rgba(2, 132, 199, 0.4)',
                transition: 'all 0.15s ease'
              }}
            >
              {t('homeRelax.btnClean', { defaultValue: 'Clean' })}
            </button>
          </div>
        )}

        {/* 2. CLEANING SERVICE CARD */}
        {trackMess && (
          <div
            data-testid="home-card-service"
            style={{
              background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.96) 0%, rgba(24, 12, 36, 0.98) 100%)',
              border: '1.5px solid #c084fc',
              borderRadius: '10px',
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
            }}
          >
            {/* Card Top Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '1rem' }}>✨</span>
                <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#fff' }}>
                  {t('homeRelax.btnHireService', { defaultValue: 'Service' })}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  background: '#075985',
                  color: '#bae6fd',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  padding: '2px 5px',
                  borderRadius: '4px',
                  border: '1px solid #0284c7'
                }}>
                  ⏳ {cleaningServiceCost}h
                </span>
                <span style={{
                  background: '#581c87',
                  color: '#e9d5ff',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  padding: '2px 5px',
                  borderRadius: '4px',
                  border: '1px solid #7e22ce'
                }}>
                  ${cleaningServicePrice}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveHelp('service')}
                  title="Help & Details"
                  aria-label="Help & Details"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#cbd5e1',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  ?
                </button>
              </div>
            </div>

            {/* Modifiers / Impacts */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '6px',
              padding: '5px 6px',
              fontSize: '0.70rem',
              lineHeight: 1.3
            }}>
              <div style={{ color: '#c084fc', fontWeight: 600 }}>🧹 -10 Mess reduction</div>
              <div style={{ color: '#94a3b8', fontSize: '0.66rem' }}>
                {serviceSubtext || `Professional cleaners (-10 🧹)`}
              </div>
            </div>

            {/* Action Button */}
            <button
              data-testid="btn-service"
              data-action-target="service"
              onClick={onServiceClick}
              disabled={isServiceDisabled}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                border: 'none',
                background: isServiceDisabled ? '#374151' : 'linear-gradient(135deg, #7e22ce 0%, #6b21a8 100%)',
                color: isServiceDisabled ? '#9ca3af' : '#fff',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: isServiceDisabled ? 'not-allowed' : 'pointer',
                boxShadow: isServiceDisabled ? 'none' : '0 2px 6px rgba(126, 34, 206, 0.4)',
                transition: 'all 0.15s ease'
              }}
            >
              {t('homeRelax.btnHireService', { defaultValue: 'Hire Service' })}
            </button>
          </div>
        )}

        {/* 3. PANTRY STATUS WIDGET */}
        <div
          data-testid="home-card-pantry"
          style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.96) 0%, rgba(28, 20, 10, 0.98) 100%)',
            border: '1.5px solid #f59e0b',
            borderRadius: '10px',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
          }}
        >
          {/* Card Top Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '1rem' }}>🥫</span>
              <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#fff' }}>
                {t('homeRelax.btnPantry', { defaultValue: 'Pantry' })}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                background: hasFridge ? '#064e3b' : '#78350f',
                color: hasFridge ? '#6ee7b7' : '#fde68a',
                fontSize: '0.62rem',
                fontWeight: 800,
                padding: '2px 5px',
                borderRadius: '4px',
                border: `1px solid ${hasFridge ? '#059669' : '#d97706'}`
              }}>
                {hasFreezer ? '❄️ Freeze' : (hasFridge ? '🧊 Fridge' : '⚠️ No Cold')}
              </span>
              <button
                type="button"
                onClick={() => setActiveHelp('pantry')}
                title="Help & Details"
                aria-label="Help & Details"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#cbd5e1',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                ?
              </button>
            </div>
          </div>

          {/* Pantry Supplies Counts */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '6px',
            padding: '5px 6px',
            fontSize: '0.70rem',
            lineHeight: 1.35,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0' }}>
              <span>🥗 Fresh: <strong>{freshFoodUnits}</strong></span>
              <span>🥫 Canned: <strong>{cannedFoodUnits}</strong></span>
            </div>
            {fastFoodCount > 0 && (
              <div style={{ color: '#fbbf24', fontSize: '0.68rem' }}>
                🍔 Fast Food: <strong>{fastFoodCount}</strong>
              </div>
            )}
            <div style={{
              color: hasFridge ? '#86efac' : (freshFoodUnits > 0 ? '#fca5a5' : '#94a3b8'),
              fontSize: '0.64rem',
              marginTop: '1px'
            }}>
              {hasFridge 
                ? '✓ Safe from spoilage' 
                : (freshFoodUnits > 0 
                    ? `⚠️ ${freshFoodUnits} fresh spoils at turn end!` 
                    : t('homeRelax.pantryStable', { defaultValue: '✓ Stable (no perishables)' }))}
            </div>
          </div>
        </div>
      </div>
      )}
    </>
  );
};
