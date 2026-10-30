import React, { useState, useEffect, useRef } from 'react';
import type { PlayerState } from '../../../engine/gameState';
import type { CampaignBundle, BuildingDef } from '../../../engine/dataLoader';
import { HOME_DIALOGUE } from './homeData';

interface AuthenticHomeProps {
  player: PlayerState;
  onAction: (action: any) => void;
  onClose: () => void;
  campaign: CampaignBundle;
  building?: BuildingDef;
}

export const AuthenticHome: React.FC<AuthenticHomeProps> = ({
  player,
  onAction,
  onClose,
  campaign,
  building,
}) => {
  const isSecurity = building
    ? (building.id === 'security_apartments' || building.id === 'security' || building.id === 'penthouse')
    : (player.currentHousingId === 'security' || player.currentHousingId === 'security_apartments' || player.currentHousingId === 'penthouse');
  const basePath = '/assets/authentic/buildings/home';
  const bgPath = isSecurity ? `${basePath}/bg_security.png` : `${basePath}/bg_low_cost.png`;

  const [activeSpeech, setActiveSpeech] = useState<string>('');
  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSpeech = (text: string, durationMs: number = 3000) => {
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    setActiveSpeech(text);
    speechTimerRef.current = setTimeout(() => {
      setActiveSpeech('');
    }, durationMs);
  };

  useEffect(() => {
    return () => {
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    };
  }, []);

  const hasAppliance = (id: string) => player.inventory?.appliances?.some(a => a.id === id);
  const hasTv = hasAppliance('color_tv') || hasAppliance('bw_tv');
  const hasVcr = hasAppliance('vcr');
  const hasStereo = hasAppliance('stereo');
  const hasBooks = (player.inventory?.books?.length ?? 0) > 0;

  const handleRelax = () => {
    const relaxCost = (campaign.config.timeRules as any).relaxSessionCost ?? 2;
    if ((player.hoursRemaining ?? 0) < relaxCost) {
      triggerSpeech(HOME_DIALOGUE.noTime, 2800);
      return;
    }

    onAction({ type: 'relax' });
    const quote = HOME_DIALOGUE.relaxingQuotes[
      Math.floor(Math.random() * HOME_DIALOGUE.relaxingQuotes.length)
    ];
    triggerSpeech(quote, 3000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (key === 'ESCAPE' || key === 'D') {
        e.preventDefault();
        onClose();
      } else if (key === 'R') {
        e.preventDefault();
        handleRelax();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player.hoursRemaining]);

  return (
    <div
      data-testid="authentic-home"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        imageRendering: 'pixelated',
        userSelect: 'none',
        overflow: 'visible',
        backgroundColor: '#000000',
      }}
    >
      <div
        style={{
          width: '183px',
          height: '112px',
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%) scale(calc(var(--board-scale, 1) * 3.75))',
          transformOrigin: 'center center',
          imageRendering: 'pixelated',
        }}
      >
        {/* Background (view.700 or view.699) */}
      <img
        src={bgPath}
        alt="Apartment Room Backdrop"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '183px',
          height: '112px',
          display: 'block',
          pointerEvents: 'none',
        }}
      />

      {/* Durables Overlays */}
      {hasTv && (
        <img
          src="/assets/authentic/homes/durable_tv.png"
          alt="TV"
          style={{ position: 'absolute', left: '130px', top: '50px', zIndex: 3 }}
        />
      )}
      {hasVcr && (
        <img
          src="/assets/authentic/homes/durable_vcr.png"
          alt="VCR"
          style={{ position: 'absolute', left: '130px', top: '75px', zIndex: 3 }}
        />
      )}
      {hasStereo && (
        <img
          src="/assets/authentic/homes/durable_stereo.png"
          alt="Stereo"
          style={{ position: 'absolute', left: '155px', top: '55px', zIndex: 3 }}
        />
      )}
      {hasBooks && (
        <img
          src="/assets/authentic/homes/durable_books.png"
          alt="Books"
          style={{ position: 'absolute', left: '10px', top: '55px', zIndex: 3 }}
        />
      )}

      {/* Speech / Status Notification Banner */}
      {activeSpeech && (
        <div
          data-testid="home-speech-bubble"
          style={{
            position: 'absolute',
            left: '30px',
            top: '12px',
            width: '123px',
            backgroundColor: '#ffffea',
            border: '1px solid #000',
            borderRadius: '2px',
            padding: '3px 5px',
            boxSizing: 'border-box',
            fontFamily: 'monospace, "Courier New"',
            fontSize: '5px',
            lineHeight: '8px',
            color: '#000',
            textAlign: 'center',
            zIndex: 10,
          }}
        >
          {activeSpeech}
        </div>
      )}

      {/* Action Buttons: Relax (R) and Done (D) */}
      <img
        data-testid="btn-home-relax"
        src={`${basePath}/buttons/relax.png`}
        alt="Relax"
        onClick={handleRelax}
        style={{
          position: 'absolute',
          left: '75px',
          top: '108px',
          width: '30px',
          height: '7px',
          cursor: 'pointer',
          zIndex: 10,
        }}
        title="Relax and recover happiness (R)"
      />

      <img
        data-testid="btn-home-done"
        src={`${basePath}/buttons/done.png`}
        alt="Done"
        onClick={onClose}
        style={{
          position: 'absolute',
          left: '143px',
          top: '108px',
          width: '30px',
          height: '7px',
          cursor: 'pointer',
          zIndex: 10,
        }}
        title="Done / Exit (Esc / D)"
      />
      </div>
    </div>
  );
};
