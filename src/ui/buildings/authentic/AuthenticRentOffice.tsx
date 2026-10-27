import React, { useState, useEffect, useRef } from 'react';
import type { PlayerState, GameRules } from '../../../engine/gameState';
import type { CampaignBundle } from '../../../engine/dataLoader';
import { RENT_OFFICE_DIALOGUE } from './rentOfficeData';

interface AuthenticRentOfficeProps {
  player: PlayerState;
  onAction: (action: any) => void;
  onClose: () => void;
  campaign: CampaignBundle;
  rules?: GameRules;
}

export const AuthenticRentOffice: React.FC<AuthenticRentOfficeProps> = ({
  player,
  onAction,
  onClose,
  campaign,
  rules: _rules,
}) => {
  const isCdrom = campaign.config.name === '1990_classic_cdrom';
  const talkerFolder = isCdrom ? 'talker_cdrom' : 'talker_floppy';
  const talkerCelCount = isCdrom ? 11 : 6;
  const basePath = '/assets/authentic/buildings/rent_office';

  const [activeSpeech, setActiveSpeech] = useState<string>('');
  const [talkerCel, setTalkerCel] = useState<number>(0);
  const [isPunchingCard, setIsPunchingCard] = useState<boolean>(false);
  const [punchCel, setPunchCel] = useState<number>(0);

  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);
  const talkerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animTimersRef = useRef<NodeJS.Timeout[]>([]);

  const addAnimTimer = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    animTimersRef.current.push(t);
    return t;
  };

  const triggerSpeech = (text: string, durationMs: number = 3200) => {
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    if (talkerIntervalRef.current) clearInterval(talkerIntervalRef.current);

    setActiveSpeech(text);

    talkerIntervalRef.current = setInterval(() => {
      const nextCel = Math.floor(Math.random() * (talkerCelCount - 1)) + 1;
      setTalkerCel(nextCel);
    }, 100);

    speechTimerRef.current = setTimeout(() => {
      setTalkerCel(0);
      setActiveSpeech('');
      if (talkerIntervalRef.current) clearInterval(talkerIntervalRef.current);
    }, durationMs);
  };

  useEffect(() => {
    const greetings = RENT_OFFICE_DIALOGUE.welcomeGreetings;
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    triggerSpeech(greeting, 3500);

    return () => {
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      if (talkerIntervalRef.current) clearInterval(talkerIntervalRef.current);
      animTimersRef.current.forEach(clearTimeout);
      animTimersRef.current = [];
    };
  }, []);

  const currentHousing = campaign.housing.find(h => h.id === player.currentHousingId);
  const rentCost = (currentHousing?.baseRent ?? 75) * 4;

  const handlePayRent = () => {
    if (player.money < rentCost) {
      triggerSpeech(RENT_OFFICE_DIALOGUE.notEnoughCash, 2800);
      return;
    }
    onAction({ type: 'pay_rent' });
    triggerSpeech(RENT_OFFICE_DIALOGUE.paidThankYou, 3200);
  };

  const handleMoreTime = () => {
    // If player has good standing or random check
    const granted = Math.random() > 0.4;
    triggerSpeech(granted ? RENT_OFFICE_DIALOGUE.extensionYes : RENT_OFFICE_DIALOGUE.extensionNo, 3200);
  };

  const handleRentApartment = (housingId: string) => {
    if (player.currentHousingId === housingId) {
      triggerSpeech('You already live in that building!', 2500);
      return;
    }
    onAction({ type: 'change_apartment', housingId });
    const banter = RENT_OFFICE_DIALOGUE.clerkBanter[
      Math.floor(Math.random() * RENT_OFFICE_DIALOGUE.clerkBanter.length)
    ];
    triggerSpeech(banter, 3200);
  };

  const playerJobHere = player.currentJobId
    ? campaign.jobs.find(j => j.id === player.currentJobId && j.locationId === 'apartment_complex')
    : null;

  const handleWorkShift = () => {
    if (!playerJobHere) return;

    const shiftCost = campaign.config.timeRules.workSessionCost ?? 6;
    const hasEnoughHours = (player.hoursRemaining ?? 0) >= shiftCost;

    if (!hasEnoughHours) {
      triggerSpeech('You do not have enough time left to work a full shift today.', 2800);
      return;
    }

    setIsPunchingCard(true);
    setPunchCel(0);

    addAnimTimer(() => setPunchCel(1), 120);
    addAnimTimer(() => setPunchCel(2), 240);
    addAnimTimer(() => setPunchCel(3), 360);
    addAnimTimer(() => {
      setIsPunchingCard(false);
      onAction({ type: 'work' });
      triggerSpeech('Shift ended. Time to count the rent checks!', 3000);
    }, 550);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (key === 'ESCAPE' || key === 'D') {
        e.preventDefault();
        onClose();
      } else if (key === 'W' && playerJobHere) {
        e.preventDefault();
        handleWorkShift();
      } else if (key === '1') {
        e.preventDefault();
        handlePayRent();
      } else if (key === '2') {
        e.preventDefault();
        handleMoreTime();
      } else if (key === '3') {
        e.preventDefault();
        handleRentApartment('low_cost');
      } else if (key === '4') {
        e.preventDefault();
        handleRentApartment('security');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerJobHere, player.hoursRemaining, player.money, rentCost]);

  return (
    <div
      data-testid="authentic-rent-office"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        imageRendering: 'pixelated',
        userSelect: 'none',
        overflow: 'hidden',
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
        {/* Background (view.701) */}
      <img
        src={`${basePath}/bg.png`}
        alt="Rent Office Backdrop"
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

      {/* Talker (view.351 at x=115, y=0) */}
      <img
        data-testid="rent-office-talker"
        src={`${basePath}/${talkerFolder}/talker_${talkerCel}.png`}
        alt="Landlord"
        style={{
          position: 'absolute',
          left: '115px',
          top: '0px',
          width: '68px',
          height: '55px',
          display: 'block',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      {/* Speech Bubble on left with pointer tail pointing to landlord's face */}
      {activeSpeech && (
        <div
          data-testid="rent-office-speech-bubble"
          style={{
            position: 'absolute',
            left: '6px',
            top: '4px',
            width: '102px',
            minHeight: '26px',
            backgroundColor: '#ffffea',
            border: '1px solid #000',
            borderRadius: '2px',
            padding: '2px 4px',
            boxSizing: 'border-box',
            fontFamily: 'monospace, "Courier New"',
            fontSize: '6.5px',
            lineHeight: '7.5px',
            color: '#000',
            zIndex: 10,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          <div
            data-testid="speech-tail-right"
            style={{
              position: 'absolute',
              right: '-7px',
              top: '12px',
              width: 0,
              height: 0,
              borderTop: '3.5px solid transparent',
              borderBottom: '3.5px solid transparent',
              borderLeft: '7px solid #000',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '-7px',
                top: '-2.5px',
                width: 0,
                height: 0,
                borderTop: '2.5px solid transparent',
                borderBottom: '2.5px solid transparent',
                borderLeft: '5.5px solid #ffffea',
              }}
            />
          </div>
          {activeSpeech}
        </div>
      )}

      {/* Rent Office Options */}
      <div style={{ position: 'absolute', left: '16px', top: '48px', zIndex: 4 }}>
        <div
          data-testid="btn-pay-rent"
          onClick={handlePayRent}
          style={{
            cursor: 'pointer',
            fontFamily: 'monospace, "Courier New"',
            fontSize: '6.5px',
            fontWeight: 'bold',
            color: '#000',
            marginBottom: '4px',
          }}
          title={`Pay 1 month rent ($${rentCost}) - Press 1`}
        >
          1. Pay Rent (1 Month: ${rentCost})
        </div>

        <div
          data-testid="btn-more-time"
          onClick={handleMoreTime}
          style={{
            cursor: 'pointer',
            fontFamily: 'monospace, "Courier New"',
            fontSize: '6.5px',
            fontWeight: 'bold',
            color: '#000',
            marginBottom: '4px',
          }}
          title="Ask for More Time - Press 2"
        >
          2. Ask For More Time
        </div>

        <div
          data-testid="btn-rent-low-cost"
          onClick={() => handleRentApartment('low_cost')}
          style={{
            cursor: 'pointer',
            fontFamily: 'monospace, "Courier New"',
            fontSize: '6.5px',
            fontWeight: 'bold',
            color: '#000',
            marginBottom: '4px',
          }}
          title="Rent Low-Cost Apartment - Press 3"
        >
          3. Rent Low-Cost Apt
        </div>

        <div
          data-testid="btn-rent-security"
          onClick={() => handleRentApartment('security')}
          style={{
            cursor: 'pointer',
            fontFamily: 'monospace, "Courier New"',
            fontSize: '6.5px',
            fontWeight: 'bold',
            color: '#000',
          }}
          title="Rent Security Apartment - Press 4"
        >
          4. Rent Security Apt
        </div>
      </div>

      {/* Work & Done Action Buttons (view.250) */}
      {playerJobHere && (
        <img
          data-testid="btn-rent-office-work"
          src={`${basePath}/buttons/work.png`}
          alt="Work"
          onClick={handleWorkShift}
          style={{
            position: 'absolute',
            left: '75px',
            top: '104px',
            width: '30px',
            height: '7px',
            cursor: 'pointer',
            zIndex: 5,
          }}
          title="Work shift (W)"
        />
      )}

      <img
        data-testid="btn-rent-office-done"
        src={`${basePath}/buttons/done.png`}
        alt="Done"
        onClick={onClose}
        style={{
          position: 'absolute',
          left: '143px',
          top: '104px',
          width: '30px',
          height: '7px',
          cursor: 'pointer',
          zIndex: 5,
        }}
        title="Done / Exit (Esc / D)"
      />

      {/* Time Clock Punch Card Animation */}
      {isPunchingCard && (
        <img
          data-testid="punch-card-anim"
          src={`/assets/authentic/punch_card/punch_${punchCel}.png`}
          alt="Punching Card"
          style={{
            position: 'absolute',
            left: '0px',
            top: '0px',
            width: '68px',
            height: '55px',
            zIndex: 20,
            pointerEvents: 'none',
          }}
        />
      )}
      </div>
    </div>
  );
};
