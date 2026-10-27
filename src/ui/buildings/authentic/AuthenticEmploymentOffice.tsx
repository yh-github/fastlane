import React, { useState, useEffect, useRef } from 'react';
import type { PlayerState, GameRules } from '../../../engine/gameState';
import type { CampaignBundle } from '../../../engine/dataLoader';
import { EMPLOYMENT_OFFICE_DIALOGUE } from './employmentOfficeData';

interface AuthenticEmploymentOfficeProps {
  player: PlayerState;
  onAction: (action: any) => void;
  onClose: () => void;
  campaign: CampaignBundle;
  rules?: GameRules;
}

export const AuthenticEmploymentOffice: React.FC<AuthenticEmploymentOfficeProps> = ({
  player,
  onAction,
  onClose,
  campaign,
  rules: _rules,
}) => {
  const isCdrom = campaign.config.name === '1990_classic_cdrom';
  const talkerFolder = isCdrom ? 'talker_cdrom' : 'talker_floppy';
  const talkerCelCount = isCdrom ? 11 : 6;
  const basePath = '/assets/authentic/buildings/employment_office';

  const [activeSpeech, setActiveSpeech] = useState<string>('');
  const [talkerCel, setTalkerCel] = useState<number>(0);
  const [selectedBldId, setSelectedBldId] = useState<string | null>('burger_palace');
  const [hoveredJobId, setHoveredJobId] = useState<string | null>(null);

  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);
  const talkerIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    const greetings = EMPLOYMENT_OFFICE_DIALOGUE.welcomeGreetings;
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    triggerSpeech(greeting, 3500);

    return () => {
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      if (talkerIntervalRef.current) clearInterval(talkerIntervalRef.current);
    };
  }, []);

  const employers = campaign.buildings.filter(b => campaign.jobs.some(j => j.locationId === b.id));
  const jobsForBld = selectedBldId ? campaign.jobs.filter(j => j.locationId === selectedBldId) : [];

  const handleApply = (job: any) => {
    if (player.currentJobId === job.id) {
      triggerSpeech('You currently hold this position!', 2500);
      return;
    }

    // Check prerequisites
    const req = job.requirements ?? {};
    if (req.degrees && req.degrees.length > 0) {
      const hasDegrees = req.degrees.every((d: string) => player.degrees?.includes(d));
      if (!hasDegrees) {
        triggerSpeech(EMPLOYMENT_OFFICE_DIALOGUE.notEnoughEdu, 2800);
        return;
      }
    }
    if (req.experience && (player.experience ?? 0) < req.experience) {
      triggerSpeech(EMPLOYMENT_OFFICE_DIALOGUE.notEnoughExp, 2800);
      return;
    }

    onAction({ type: 'apply_job', jobId: job.id });
    triggerSpeech(EMPLOYMENT_OFFICE_DIALOGUE.congratsJob, 3200);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (key === 'ESCAPE' || key === 'D') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      data-testid="authentic-employment-office"
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
        {/* Background (view.706) */}
      <img
        src={`${basePath}/bg.png`}
        alt="Employment Office Backdrop"
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

      {/* Talker (view.356 at x=115, y=17) */}
      <img
        data-testid="employment-office-talker"
        src={`${basePath}/${talkerFolder}/talker_${talkerCel}.png`}
        alt="Agent"
        style={{
          position: 'absolute',
          left: '115px',
          top: '17px',
          width: '68px',
          height: '55px',
          display: 'block',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      {/* Speech Bubble on left with pointer tail pointing to agent's face */}
      {activeSpeech && (
        <div
          data-testid="employment-speech-bubble"
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

      {/* Left Column: Employer Locations List */}
      <div
        style={{
          position: 'absolute',
          left: '6px',
          top: '36px',
          width: '54px',
          maxHeight: '66px',
          overflowY: 'auto',
          zIndex: 4,
        }}
      >
        {employers.map((bld) => {
          const isSelected = selectedBldId === bld.id;
          return (
            <div
              key={bld.id}
              data-testid={`employer-${bld.id}`}
              onClick={() => setSelectedBldId(bld.id)}
              style={{
                cursor: 'pointer',
                fontFamily: 'monospace, "Courier New"',
                fontSize: '5.5px',
                fontWeight: isSelected ? 'bold' : 'normal',
                color: isSelected ? '#1e3a8a' : '#000',
                backgroundColor: isSelected ? '#e0f2fe' : 'transparent',
                padding: '1px 2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={bld.name}
            >
              {isSelected ? '▶ ' : ''}{bld.name}
            </div>
          );
        })}
      </div>

      {/* Middle/Right Column: Jobs at Selected Employer */}
      <div
        style={{
          position: 'absolute',
          left: '62px',
          top: '36px',
          width: '56px',
          maxHeight: '66px',
          overflowY: 'auto',
          zIndex: 4,
        }}
      >
        {jobsForBld.map((job) => {
          const isCurrent = player.currentJobId === job.id;
          const isHovered = hoveredJobId === job.id;

          return (
            <div
              key={job.id}
              data-testid={`job-${job.id}`}
              onClick={() => handleApply(job)}
              onMouseEnter={() => setHoveredJobId(job.id)}
              onMouseLeave={() => setHoveredJobId(null)}
              style={{
                cursor: 'pointer',
                fontFamily: 'monospace, "Courier New"',
                fontSize: '5.5px',
                fontWeight: 'bold',
                color: isCurrent ? '#166534' : isHovered ? '#ffffff' : '#000000',
                backgroundColor: isHovered ? '#1e3a8a' : 'transparent',
                padding: '1px 2px',
                marginBottom: '1px',
                whiteSpace: 'nowrap',
              }}
              title={`${job.title} ($${job.baseWage}/hr) - Click to Apply`}
            >
              {isCurrent ? '★ ' : '• '}{job.title} ${job.baseWage}
            </div>
          );
        })}
      </div>

      {/* Done Action Button (view.250) */}
      <img
        data-testid="btn-employment-done"
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
      </div>
    </div>
  );
};
