import React, { useState, useEffect, useRef } from 'react';
import type { PlayerState, GameRules } from '../../../engine/gameState';
import type { CampaignBundle } from '../../../engine/dataLoader';
import { calcEconomyPrice } from '../../../engine/economyEngine';
import { EMPLOYMENT_OFFICE_DIALOGUE } from './employmentOfficeData';

interface AuthenticEmploymentOfficeProps {
  player: PlayerState;
  onAction: (action: any) => Promise<any> | any;
  onClose: () => void;
  campaign: CampaignBundle;
  economicIndex?: number;
  rules?: GameRules;
}

export const AuthenticEmploymentOffice: React.FC<AuthenticEmploymentOfficeProps> = ({
  player,
  onAction,
  onClose,
  campaign,
  economicIndex = 0,
  rules: _rules,
}) => {
  const isCdrom = campaign.config.name === '1990_classic_cdrom';
  const talkerFolder = isCdrom ? 'talker_cdrom' : 'talker_floppy';
  const talkerCelCount = isCdrom ? 11 : 6;
  const basePath = '/assets/authentic/buildings/employment_office';

  const [activeSpeech, setActiveSpeech] = useState<string>('');
  const [talkerCel, setTalkerCel] = useState<number>(0);
  const [selectedBldId, setSelectedBldId] = useState<string | null>(null);
  const [hoveredEmployerId, setHoveredEmployerId] = useState<string | null>(null);
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
  const selectedBuilding = employers.find(b => b.id === selectedBldId);
  const jobsForBld = selectedBldId ? campaign.jobs.filter(j => j.locationId === selectedBldId) : [];

  const handleApply = async (job: any) => {
    if ((player.hoursRemaining ?? 0) < 4) {
      triggerSpeech(EMPLOYMENT_OFFICE_DIALOGUE.closingSoon, 3000);
      return;
    }

    if (player.currentJobId === job.id) {
      triggerSpeech('You currently hold this position!', 2500);
      return;
    }

    const offeredWage = calcEconomyPrice(job.baseWage, economicIndex);
    const actionResult: any = await onAction({ type: 'apply', jobId: job.id, offeredWage });

    const actionLog = actionResult?.actionLog ?? actionResult;
    const logKey = actionLog?.key;

    if (logKey === 'action.job.gotJob') {
      triggerSpeech(EMPLOYMENT_OFFICE_DIALOGUE.congratsJob, 3200);
    } else if (logKey === 'action.job.raiseSuccess') {
      triggerSpeech(EMPLOYMENT_OFFICE_DIALOGUE.congratsRaise, 3200);
    } else if (logKey === 'action.job.rejected') {
      const reasons = actionLog?.params?.reasons || '';
      if (reasons.toLowerCase().includes('education') || reasons.toLowerCase().includes('degree')) {
        triggerSpeech(EMPLOYMENT_OFFICE_DIALOGUE.notEnoughEdu, 2800);
      } else if (reasons.toLowerCase().includes('experience')) {
        triggerSpeech(EMPLOYMENT_OFFICE_DIALOGUE.notEnoughExp, 2800);
      } else if (reasons.toLowerCase().includes('history') || reasons.toLowerCase().includes('dependability')) {
        triggerSpeech(EMPLOYMENT_OFFICE_DIALOGUE.poorHistory, 2800);
      } else {
        triggerSpeech(reasons || EMPLOYMENT_OFFICE_DIALOGUE.requestDenied, 2800);
      }
    } else if (logKey === 'action.job.noOpenings' || logKey === 'action.job.noOpeningsProbation') {
      triggerSpeech(EMPLOYMENT_OFFICE_DIALOGUE.noOpenings, 2800);
    } else if (logKey === 'action.error.notEnoughTimeInterview') {
      triggerSpeech("Sorry. We're closing. You'll have to come back next week.", 2800);
    } else {
      if (player.currentJobId === job.id) {
        triggerSpeech(EMPLOYMENT_OFFICE_DIALOGUE.congratsJob, 3200);
      } else {
        triggerSpeech(EMPLOYMENT_OFFICE_DIALOGUE.requestDenied, 2800);
      }
    }
  };

  const handleDone = () => {
    if (selectedBldId) {
      setSelectedBldId(null);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (key === 'ESCAPE' || key === 'D') {
        e.preventDefault();
        handleDone();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBldId, onClose]);

  return (
    <div
      data-testid="authentic-employment-office"
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
              minHeight: '22px',
              backgroundColor: '#ffffea',
              border: '1px solid #000',
              borderRadius: '2px',
              padding: '2px 4px',
              boxSizing: 'border-box',
              fontFamily: 'monospace, "Courier New"',
              fontSize: '5.5px',
              lineHeight: '6.5px',
              color: '#000',
              zIndex: 15,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            <div
              data-testid="speech-tail-right"
              style={{
                position: 'absolute',
                right: '-7px',
                top: '10px',
                width: 0,
                height: 0,
                borderTop: '3px solid transparent',
                borderBottom: '3px solid transparent',
                borderLeft: '7px solid #000',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '-7px',
                  top: '-2px',
                  width: 0,
                  height: 0,
                  borderTop: '2px solid transparent',
                  borderBottom: '2px solid transparent',
                  borderLeft: '5.5px solid #ffffea',
                }}
              />
            </div>
            {activeSpeech}
          </div>
        )}

        {/* View 1: Employer Locations List (when selectedBldId === null) */}
        {!selectedBldId && (
          <div
            data-testid="employment-employers-container"
            style={{
              position: 'absolute',
              left: '14px',
              top: '32px',
              width: '95px',
              overflow: 'hidden',
              zIndex: 4,
            }}
          >
            {employers.map((bld) => {
              const isHovered = hoveredEmployerId === bld.id;
              return (
                <div
                  key={bld.id}
                  data-testid={`employer-${bld.id}`}
                  onClick={() => {
                    setSelectedBldId(bld.id);
                    triggerSpeech(`${bld.name} jobs. Click a position to apply!`, 2500);
                  }}
                  onMouseEnter={() => setHoveredEmployerId(bld.id)}
                  onMouseLeave={() => setHoveredEmployerId(null)}
                  style={{
                    cursor: 'pointer',
                    fontFamily: 'monospace, "Courier New"',
                    fontSize: '5.5px',
                    lineHeight: '7px',
                    fontWeight: 'bold',
                    color: isHovered ? '#ffffff' : '#000000',
                    backgroundColor: isHovered ? '#1e3a8a' : 'transparent',
                    padding: '0.5px 2px',
                    marginBottom: '1px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    userSelect: 'none',
                  }}
                  title={bld.name}
                >
                  {bld.name}
                </div>
              );
            })}
          </div>
        )}

        {/* View 2: Jobs at Selected Employer (when selectedBldId !== null) */}
        {selectedBldId && (
          <div
            data-testid="employment-jobs-container"
            style={{
              position: 'absolute',
              left: '14px',
              top: '24px',
              width: '95px',
              overflow: 'hidden',
              zIndex: 4,
            }}
          >
            {/* Header */}
            <div
              data-testid="employment-jobs-header"
              style={{
                fontFamily: 'monospace, "Courier New"',
                fontSize: '5.5px',
                lineHeight: '7px',
                fontWeight: 'bold',
                color: '#000000',
                marginBottom: '4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {selectedBuilding?.name || 'Store'} Jobs Available:
            </div>

            {/* Jobs List (0 scrollbars, fits neatly into VGA screen) */}
            <div style={{ overflow: 'hidden' }}>
              {jobsForBld.map((job) => {
                const isCurrent = player.currentJobId === job.id;
                const isHovered = hoveredJobId === job.id;
                const wage = calcEconomyPrice(job.baseWage, economicIndex);

                return (
                  <div
                    key={job.id}
                    data-testid={`job-${job.id}`}
                    onClick={() => handleApply(job)}
                    onMouseEnter={() => setHoveredJobId(job.id)}
                    onMouseLeave={() => setHoveredJobId(null)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      fontFamily: 'monospace, "Courier New"',
                      fontSize: '5.5px',
                      lineHeight: '7px',
                      fontWeight: 'bold',
                      color: isCurrent ? '#15803d' : isHovered ? '#ffffff' : '#000000',
                      backgroundColor: isHovered ? '#1e3a8a' : 'transparent',
                      padding: '0.5px 2px',
                      marginBottom: '1px',
                      whiteSpace: 'nowrap',
                      userSelect: 'none',
                    }}
                    title={`${job.title} ($${wage}/hr) - Click to Apply`}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isCurrent ? '★ ' : ''}{job.title}
                    </span>
                    <span style={{ flexShrink: 0, marginLeft: '4px' }}>
                      ${wage}/hr
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Done Action Button (view.250 Loop 0 Cel 0 at nsLeft: 143, nsTop: 108 sticking 3px out) */}
        <img
          data-testid="btn-employment-done"
          src={`${basePath}/buttons/done.png`}
          alt="Done"
          onClick={handleDone}
          style={{
            position: 'absolute',
            left: '143px',
            top: '108px',
            width: '30px',
            height: '7px',
            cursor: 'pointer',
            zIndex: 10,
          }}
          title={selectedBldId ? 'Back to Employers List (Esc / D)' : 'Done / Exit (Esc / D)'}
        />
      </div>
    </div>
  );
};
