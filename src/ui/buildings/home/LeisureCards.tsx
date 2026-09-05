import React from 'react';
import { useTranslation } from 'react-i18next';

interface LeisureCardsProps {
  hoursToRelax: number;
  isRelaxDisabled: boolean;
  hasFood: boolean;
  physGain: number;
  mentalGain: number;
  scaledMess: number;
  trackMess?: boolean;
  usePhysicalMental?: boolean;
  classicGain?: number;
  classicFirstBonus?: number;
  onRelaxClick: () => void;

  // Socialize props
  socialParams: {
    isDisabled: boolean;
    disabledReasonKey?: string;
    isHalfRewardExpected: boolean;
    minReward: number;
    maxReward: number;
    minCashNeeded: number;
    maxCashNeeded: number;
    timeCost: number;
    isCappedBySpace?: boolean;
  };
  onSocializeClick: () => void;
}

export const LeisureCards: React.FC<LeisureCardsProps> = ({
  hoursToRelax,
  isRelaxDisabled,
  hasFood,
  physGain,
  mentalGain,
  scaledMess,
  trackMess,
  usePhysicalMental,
  classicGain,
  classicFirstBonus,
  onRelaxClick,
  socialParams,
  onSocializeClick
}) => {
  const { t } = useTranslation();

  const rewardRange = socialParams.minReward === socialParams.maxReward
    ? `+${socialParams.minReward}`
    : `+${socialParams.minReward}..+${socialParams.maxReward}`;

  const costRange = socialParams.minCashNeeded === socialParams.maxCashNeeded
    ? `$${socialParams.minCashNeeded}`
    : `$${socialParams.minCashNeeded}–$${socialParams.maxCashNeeded}`;

  const spaceCappedNote = socialParams.isCappedBySpace ? ' (capped by space)' : '';

  return (
    <>
      {/* 1. Relax Card */}
      <div
        className="weekend-card"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '300px',
          minHeight: '260px',
          padding: '10px 12px',
          borderRadius: '12px',
          border: '2px solid #34d399',
          boxShadow: '0 0 16px rgba(52, 211, 153, 0.3), 0 4px 14px rgba(0,0,0,0.6)',
          background: 'linear-gradient(165deg, #0f2c1d 0%, #06160e 100%)',
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
              backgroundColor: 'rgba(52, 211, 153, 0.15)',
              color: '#34d399',
              border: '1px solid #34d399'
            }}>
              LEISURE
            </span>

            <span style={{
              fontSize: '0.78rem',
              fontWeight: 'bold',
              padding: '2px 8px',
              borderRadius: '10px',
              backgroundColor: '#064e3b',
              color: '#d1fae5',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              ⏳ {hoursToRelax}h
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
            <span role="img" aria-label="Relax">🧘</span>
          </div>

          {/* Title */}
          <h3 style={{
            margin: '0 0 4px',
            fontSize: '1.02rem',
            fontWeight: 'bold',
            color: '#ffffff',
            textAlign: 'center'
          }}>
            {t('homeRelax.relaxTitle', { defaultValue: 'Relax & Recharge' })}
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
            "Sink into your favorite armchair, kick off your shoes, and let the city's grind melt away. A quiet evening restores your vitality."
          </p>
        </div>

        {/* Benefits Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{
            padding: '6px 8px',
            borderRadius: '6px',
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.76rem'
          }}>
            {usePhysicalMental ? (
              hasFood ? (
                <div style={{ color: '#85ffb5', display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', fontWeight: 'bold' }}>
                  <span>+{physGain} 💪 Physical</span>
                  <span>+{mentalGain} 🧠 Mental</span>
                  {trackMess && scaledMess > 0 && <span style={{ color: '#f39c12' }}>+{scaledMess} 🧹 Mess</span>}
                </div>
              ) : (
                <div style={{ color: '#ff9999', textAlign: 'center', fontSize: '0.72rem' }}>
                  ⚠️ Starving: +{physGain} 💪, +{mentalGain} 🧠 (-1 Max 💪 & 🧠!)
                </div>
              )
            ) : (
              <div style={{ color: '#85ffb5', textAlign: 'center', fontWeight: 'bold' }}>
                +{classicGain} 🧘 Relaxation {classicFirstBonus && classicFirstBonus > 0 ? `(+${classicFirstBonus} 😊)` : ''}
              </div>
            )}
          </div>

          {/* Relax Button */}
          <button
            data-testid="btn-relax"
            data-action-target="relax"
            onClick={onRelaxClick}
            disabled={isRelaxDisabled}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isRelaxDisabled ? '#4b5563' : '#10b981',
              color: isRelaxDisabled ? '#9ca3af' : '#000',
              fontWeight: 'bold',
              fontSize: '0.88rem',
              cursor: isRelaxDisabled ? 'not-allowed' : 'pointer',
              boxShadow: isRelaxDisabled ? 'none' : '0 3px 10px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.15s ease'
            }}
          >
            🧘 {t('homeRelax.button', { cost: hoursToRelax, defaultValue: `Relax (${hoursToRelax}h)` })}
          </button>
        </div>
      </div>

      {/* 2. Entertain Guests Card */}
      {usePhysicalMental && (
        <div
          className="weekend-card"
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: '300px',
            minHeight: '260px',
            padding: '10px 12px',
            borderRadius: '12px',
            border: `2px solid ${socialParams.isHalfRewardExpected ? '#f59e0b' : '#38bdf8'}`,
            boxShadow: `0 0 16px ${socialParams.isHalfRewardExpected ? 'rgba(245, 158, 11, 0.3)' : 'rgba(56, 189, 248, 0.3)'}, 0 4px 14px rgba(0,0,0,0.6)`,
            background: 'linear-gradient(165deg, #0c213b 0%, #06111f 100%)',
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
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid #38bdf8'
              }}>
                HOSPITALITY
              </span>

              <span style={{
                fontSize: '0.78rem',
                fontWeight: 'bold',
                padding: '2px 8px',
                borderRadius: '10px',
                backgroundColor: '#075985',
                color: '#e0f2fe',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                ⏳ {socialParams.timeCost}h
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
              <span role="img" aria-label="Socialize">🎉</span>
            </div>

            {/* Title */}
            <h3 style={{
              margin: '0 0 4px',
              fontSize: '1.02rem',
              fontWeight: 'bold',
              color: '#ffffff',
              textAlign: 'center'
            }}>
              {t('homeRelax.socializeTitle', { defaultValue: 'Host a Gathering' })}
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
              "Invite friends over for lively banter and good times. Hospitality elevates social standing, but leaves mess behind!"
            </p>
          </div>

          {/* Benefits Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{
              padding: '6px 8px',
              borderRadius: '6px',
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.76rem'
            }}>
              <div style={{ color: '#38bdf8', display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', fontWeight: 'bold' }}>
                <span>{rewardRange} 👥 Social{spaceCappedNote}</span>
                <span style={{ color: '#ff9999' }}>-1 💪 Fatigue</span>
                <span>-{costRange}</span>
              </div>
              <div style={{ fontSize: '0.70rem', color: '#aaa', textAlign: 'center', marginTop: '2px' }}>
                {socialParams.isHalfRewardExpected ? '⚠️ Budget Hospitality (half social reward)' : '✨ Full Hospitality (generates mess 🧹)'}
              </div>
            </div>

            {/* Entertain Button */}
            <button
              data-action-target="socialize"
              onClick={onSocializeClick}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: socialParams.isDisabled ? '#4b5563' : (socialParams.isHalfRewardExpected ? '#f59e0b' : '#0ea5e9'),
                color: socialParams.isDisabled ? '#9ca3af' : '#fff',
                fontWeight: 'bold',
                fontSize: '0.88rem',
                cursor: socialParams.isDisabled ? 'not-allowed' : 'pointer',
                boxShadow: socialParams.isDisabled ? 'none' : '0 3px 10px rgba(14, 165, 233, 0.4)',
                transition: 'all 0.15s ease'
              }}
            >
              🎉 Socialize / Entertain Guests
            </button>
          </div>
        </div>
      )}
    </>
  );
};
