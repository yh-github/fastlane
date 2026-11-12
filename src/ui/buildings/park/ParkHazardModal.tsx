import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { MiniGameOption, StatModification } from '../../../engine/gameState';
import { StatModifierPills } from '../../StatModifierPills';

export interface ParkHazardModalProps {
  hazard: MiniGameOption;
  onClose: () => void;
  armDelayMs?: number;
}

export const ParkHazardModal: React.FC<ParkHazardModalProps> = ({
  hazard,
  onClose,
  armDelayMs
}) => {
  const { t } = useTranslation();

  const effectiveArmDelay = armDelayMs !== undefined
    ? armDelayMs
    : ((typeof process !== 'undefined' && process.env.NODE_ENV === 'test') ? 0 : 350);

  const [isArmed, setIsArmed] = useState<boolean>(() => effectiveArmDelay <= 0);

  useEffect(() => {
    if (effectiveArmDelay <= 0) {
      setIsArmed(true);
      return;
    }
    const timer = setTimeout(() => setIsArmed(true), effectiveArmDelay);
    return () => clearTimeout(timer);
  }, [effectiveArmDelay]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isArmed) return;
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isArmed, onClose]);

  const modifications: StatModification[] = [];
  if (hazard.cashAmount) {
    modifications.push({ stat: 'money', diff: hazard.cashAmount });
  }
  if (hazard.mentalAmount) {
    modifications.push({ stat: 'mental', diff: hazard.mentalAmount });
  }
  if (hazard.physicalAmount) {
    modifications.push({ stat: 'physical', diff: hazard.physicalAmount });
  }
  if (hazard.durabilityAmount) {
    modifications.push({ stat: 'clothes', diff: hazard.durabilityAmount });
  }

  const icon = hazard.icon || '⚠️';

  return (
    <div
      className="modal-overlay park-hazard-backdrop"
      data-testid="park-hazard-modal"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: '16px',
        userSelect: 'none'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && isArmed) {
          onClose();
        }
      }}
    >
      <div
        className="park-hazard-card"
        style={{
          background: 'linear-gradient(145deg, #1f1b24, #141218)',
          border: '2px solid #ef4444',
          borderRadius: '12px',
          boxShadow: '0 12px 36px rgba(239, 68, 68, 0.3), 0 0 20px rgba(0, 0, 0, 0.8)',
          maxWidth: '440px',
          width: '100%',
          padding: '24px',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '16px'
        }}
      >
        {/* Top Warning Banner */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          <span>⚠️</span>
          <span>{t('park.hazardBanner', { defaultValue: 'Park Hazard Encounter' })}</span>
        </div>

        {/* Hazard Big Emoji Art */}
        <div
          style={{
            width: '84px',
            height: '84px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, rgba(239, 68, 68, 0.05) 70%, transparent 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            border: '2px solid rgba(239, 68, 68, 0.3)',
            boxShadow: '0 0 16px rgba(239, 68, 68, 0.2)'
          }}
        >
          {icon}
        </div>

        {/* Title and Description */}
        <div>
          <h2
            style={{
              margin: '0 0 8px 0',
              fontSize: '1.35rem',
              color: '#fca5a5',
              fontWeight: 800
            }}
          >
            {hazard.title}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: '0.95rem',
              color: '#cbd5e1',
              lineHeight: 1.45
            }}
          >
            {hazard.description}
          </p>
        </div>

        {/* Stat Penalties Pill Container */}
        {modifications.length > 0 && (
          <div
            style={{
              width: '100%',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              {t('park.penaltiesIncurred', { defaultValue: 'Penalties Incurred' })}
            </span>
            <StatModifierPills modifications={modifications} />
          </div>
        )}

        {/* Dismiss Button */}
        <button
          type="button"
          data-testid="park-hazard-ok-btn"
          disabled={!isArmed}
          onClick={onClose}
          className="game-button btn-secondary"
          style={{
            marginTop: '4px',
            width: '100%',
            padding: '10px 16px',
            fontWeight: 'bold',
            background: isArmed ? '#dc2626' : '#7f1d1d',
            color: '#ffffff',
            border: '1px solid #ef4444',
            borderRadius: '6px',
            cursor: isArmed ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
            opacity: isArmed ? 1 : 0.6
          }}
        >
          {t('park.hazardAcknowledge', { defaultValue: '⚠️ Acknowledge & Move On' })}
        </button>
      </div>
    </div>
  );
};
