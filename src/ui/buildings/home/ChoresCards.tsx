import React from 'react';
import { useTranslation } from 'react-i18next';

interface ChoresCardsProps {
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
}

export const ChoresCards: React.FC<ChoresCardsProps> = ({
  hoursToClean,
  cleanPhysGain,
  isCleanDisabled,
  cleanSubtext,
  onCleanClick,
  cleaningServiceCost,
  cleaningServicePrice,
  isServiceDisabled,
  serviceSubtext,
  onServiceClick
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* 1. Clean Apartment Card */}
      <div
        className="weekend-card"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '290px',
          minHeight: '380px',
          padding: '16px',
          borderRadius: '16px',
          border: '3px solid #38bdf8',
          boxShadow: '0 0 20px rgba(56, 189, 248, 0.4), 0 8px 24px rgba(0,0,0,0.6)',
          background: 'linear-gradient(165deg, #0c213b 0%, #06111f 100%)',
          boxSizing: 'border-box'
        }}
      >
        <div>
          {/* Header Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 'bold',
              letterSpacing: '0.08em',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid #38bdf8'
            }}>
              CHORE
            </span>

            <span style={{
              fontSize: '0.82rem',
              fontWeight: 'bold',
              padding: '3px 10px',
              borderRadius: '12px',
              backgroundColor: '#075985',
              color: '#e0f2fe',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              ⏳ {hoursToClean}h
            </span>
          </div>

          {/* Artwork Frame */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '75px',
            margin: '6px 0 12px',
            borderRadius: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '2.5rem'
          }}>
            <span role="img" aria-label="Clean">🧹</span>
          </div>

          {/* Title */}
          <h3 style={{
            margin: '0 0 6px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#ffffff',
            textAlign: 'center'
          }}>
            {t('homeRelax.cleanTitle', { defaultValue: 'Clean Apartment' })}
          </h3>

          {/* Fluff Narrative */}
          <p style={{
            fontSize: '0.82rem',
            lineHeight: '1.4',
            color: '#cbd5e1',
            fontStyle: 'italic',
            textAlign: 'center',
            margin: '0 0 12px',
            padding: '0 4px',
            minHeight: '52px'
          }}>
            "Roll up your sleeves, grab the broom, and sweep away the dust and clutter. Hard physical labor, but nothing beats the calm of a tidy, spotless home."
          </p>
        </div>

        {/* Benefits Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            padding: '8px 10px',
            borderRadius: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.78rem',
            textAlign: 'center',
            color: '#85ffb5',
            fontWeight: 'bold'
          }}>
            <div>🧹 Reduces Apartment Mess</div>
            <div style={{ color: '#ff9999', fontSize: '0.74rem', marginTop: '2px' }}>
              {cleanSubtext || `Physical Effort: -${cleanPhysGain} 💪`}
            </div>
          </div>

          {/* Clean Button */}
          <button
            data-action-target="clean"
            onClick={onCleanClick}
            disabled={isCleanDisabled}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: isCleanDisabled ? '#4b5563' : '#0284c7',
              color: isCleanDisabled ? '#9ca3af' : '#fff',
              fontWeight: 'bold',
              fontSize: '0.92rem',
              cursor: isCleanDisabled ? 'not-allowed' : 'pointer',
              boxShadow: isCleanDisabled ? 'none' : '0 4px 12px rgba(2, 132, 199, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            🧹 Clean Apartment (⏳ {hoursToClean}h)
          </button>
        </div>
      </div>

      {/* 2. Call Cleaning Service Card */}
      <div
        className="weekend-card"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '290px',
          minHeight: '380px',
          padding: '16px',
          borderRadius: '16px',
          border: '3px solid #c084fc',
          boxShadow: '0 0 20px rgba(192, 132, 252, 0.4), 0 8px 24px rgba(0,0,0,0.6)',
          background: 'linear-gradient(165deg, #231238 0%, #11081c 100%)',
          boxSizing: 'border-box'
        }}
      >
        <div>
          {/* Header Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 'bold',
              letterSpacing: '0.08em',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: 'rgba(192, 132, 252, 0.15)',
              color: '#c084fc',
              border: '1px solid #c084fc'
            }}>
              SERVICE
            </span>

            <span style={{
              fontSize: '0.82rem',
              fontWeight: 'bold',
              padding: '3px 10px',
              borderRadius: '12px',
              backgroundColor: '#581c87',
              color: '#f3e8ff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              ⏳ {cleaningServiceCost}h | ${cleaningServicePrice}
            </span>
          </div>

          {/* Artwork Frame */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '75px',
            margin: '6px 0 12px',
            borderRadius: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '2.5rem'
          }}>
            <span role="img" aria-label="Service">🧼</span>
          </div>

          {/* Title */}
          <h3 style={{
            margin: '0 0 6px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#ffffff',
            textAlign: 'center'
          }}>
            {t('homeRelax.serviceTitle', { defaultValue: 'Call Cleaning Service' })}
          </h3>

          {/* Fluff Narrative */}
          <p style={{
            fontSize: '0.82rem',
            lineHeight: '1.4',
            color: '#cbd5e1',
            fontStyle: 'italic',
            textAlign: 'center',
            margin: '0 0 12px',
            padding: '0 4px',
            minHeight: '52px'
          }}>
            "Why spend your weekend scrubbing floors? Hire a professional cleaning team to make the entire apartment gleam like new while you relax."
          </p>
        </div>

        {/* Benefits Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            padding: '8px 10px',
            borderRadius: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.78rem',
            textAlign: 'center',
            color: '#d8b4fe',
            fontWeight: 'bold'
          }}>
            <div>✨ Professional Deep Clean (-10 🧹)</div>
            <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '2px' }}>
              Cost: ${cleaningServicePrice} • No physical exhaustion
            </div>
          </div>

          {/* Service Button */}
          <button
            data-action-target="call-cleaning-service"
            onClick={onServiceClick}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: isServiceDisabled ? '#4b5563' : '#9333ea',
              color: isServiceDisabled ? '#9ca3af' : '#fff',
              fontWeight: 'bold',
              fontSize: '0.92rem',
              cursor: 'pointer',
              boxShadow: isServiceDisabled ? 'none' : '0 4px 12px rgba(147, 51, 234, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            <div>🧼 Call Cleaning Service (${cleaningServicePrice})</div>
            {serviceSubtext && (
              <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px', fontWeight: 'normal' }}>
                {serviceSubtext}
              </div>
            )}
          </button>
        </div>
      </div>
    </>
  );
};
