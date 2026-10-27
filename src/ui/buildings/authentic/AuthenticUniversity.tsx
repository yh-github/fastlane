import React, { useState, useEffect, useRef } from 'react';
import type { PlayerState, GameRules } from '../../../engine/gameState';
import type { CampaignBundle } from '../../../engine/dataLoader';
import { UNIVERSITY_DIALOGUE } from './universityData';

interface AuthenticUniversityProps {
  player: PlayerState;
  onAction: (action: any) => void;
  onClose: () => void;
  campaign: CampaignBundle;
  economicIndex: number;
  rules?: GameRules;
}

export const AuthenticUniversity: React.FC<AuthenticUniversityProps> = ({
  player,
  onAction,
  onClose,
  campaign,
  rules: _rules,
}) => {
  const isCdrom = campaign.config.name === '1990_classic_cdrom';
  const talkerFolder = isCdrom ? 'talker_cdrom' : 'talker_floppy';
  const talkerCelCount = isCdrom ? 11 : 6;
  const basePath = '/assets/authentic/buildings/university';

  const [activeSpeech, setActiveSpeech] = useState<string>('');
  const [talkerCel, setTalkerCel] = useState<number>(0);
  const [isPunchingCard, setIsPunchingCard] = useState<boolean>(false);
  const [punchCel, setPunchCel] = useState<number>(0);
  const [hoveredDegreeId, setHoveredDegreeId] = useState<string | null>(null);

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
    const greetings = UNIVERSITY_DIALOGUE.welcomeGreetings;
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    triggerSpeech(greeting, 3500);

    return () => {
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      if (talkerIntervalRef.current) clearInterval(talkerIntervalRef.current);
      animTimersRef.current.forEach(clearTimeout);
      animTimersRef.current = [];
    };
  }, []);

  const degrees = campaign.education ?? [];

  const handleEnrollDegree = (degree: any) => {
    if (player.degrees?.includes(degree.id)) {
      triggerSpeech('You have already completed this degree!', 2500);
      return;
    }

    const cost = degree.baseTuitionFee ?? 60;
    if (player.money < cost) {
      triggerSpeech(UNIVERSITY_DIALOGUE.notEnoughCash, 2800);
      return;
    }

    onAction({ type: 'enroll_education', degreeId: degree.id });
    const banter = UNIVERSITY_DIALOGUE.clerkBanter[
      Math.floor(Math.random() * UNIVERSITY_DIALOGUE.clerkBanter.length)
    ];
    triggerSpeech(banter, 3200);
  };

  const playerJobHere = player.currentJobId
    ? campaign.jobs.find(j => j.id === player.currentJobId && j.locationId === 'university')
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
      triggerSpeech('Class dismissed! Your faculty work shift is finished.', 3000);
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerJobHere, player.hoursRemaining, player.money]);

  return (
    <div
      data-testid="authentic-university"
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
        {/* Background (view.807) */}
      <img
        src={`${basePath}/bg.png`}
        alt="Hi-Tech U Backdrop"
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

      {/* Talker (view.357 at x=0, y=1) */}
      <img
        data-testid="university-talker"
        src={`${basePath}/${talkerFolder}/talker_${talkerCel}.png`}
        alt="Registrar"
        style={{
          position: 'absolute',
          left: '0px',
          top: '1px',
          width: '68px',
          height: '55px',
          display: 'block',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      {/* Speech Bubble on right with pointer tail pointing to registrar's face */}
      {activeSpeech && (
        <div
          data-testid="university-speech-bubble"
          style={{
            position: 'absolute',
            left: '71px',
            top: '6px',
            width: '106px',
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
            data-testid="speech-tail-left"
            style={{
              position: 'absolute',
              left: '-7px',
              top: '12px',
              width: 0,
              height: 0,
              borderTop: '3.5px solid transparent',
              borderBottom: '3.5px solid transparent',
              borderRight: '7px solid #000',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '1.5px',
                top: '-2.5px',
                width: 0,
                height: 0,
                borderTop: '2.5px solid transparent',
                borderBottom: '2.5px solid transparent',
                borderRight: '5.5px solid #ffffea',
              }}
            />
          </div>
          {activeSpeech}
        </div>
      )}

      {/* Degree Offerings List */}
      <div
        style={{
          position: 'absolute',
          left: '71px',
          top: '38px',
          width: '108px',
          maxHeight: '62px',
          overflowY: 'auto',
          zIndex: 4,
        }}
      >
        {degrees.map((deg) => {
          const isCompleted = player.degrees?.includes(deg.id);
          const isEnrolled = !!player.enrolledClasses?.[deg.id];
          const cost = deg.baseTuitionFee ?? 60;
          const isHovered = hoveredDegreeId === deg.id;

          return (
            <div
              key={deg.id}
              data-testid={`degree-item-${deg.id}`}
              onClick={() => handleEnrollDegree(deg)}
              onMouseEnter={() => setHoveredDegreeId(deg.id)}
              onMouseLeave={() => setHoveredDegreeId(null)}
              style={{
                cursor: isCompleted ? 'default' : 'pointer',
                fontFamily: 'monospace, "Courier New"',
                fontSize: '6px',
                fontWeight: 'bold',
                color: isCompleted ? '#166534' : isEnrolled ? '#1e3a8a' : isHovered ? '#ffffff' : '#000000',
                backgroundColor: isHovered ? '#1e3a8a' : 'transparent',
                padding: '0 2px',
                marginBottom: '1px',
                whiteSpace: 'nowrap',
              }}
              title={`${deg.name} ($${cost}/wk) - ${isCompleted ? 'Completed' : isEnrolled ? 'Attending' : 'Click to Enroll'}`}
            >
              {isCompleted ? '✓ ' : isEnrolled ? '▶ ' : '• '}
              {deg.name} ${cost}
            </div>
          );
        })}
      </div>

      {/* Work & Done Action Buttons (view.250) */}
      {playerJobHere && (
        <img
          data-testid="btn-university-work"
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
        data-testid="btn-university-done"
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
            top: '38px',
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
