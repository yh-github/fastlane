import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { PlayerState, GameRules } from '../../../engine/gameState';
import type { CampaignBundle } from '../../../engine/dataLoader';
import { calcEconomyPrice } from '../../../engine/economyEngine';
import { calcRequiredLessons } from '../../../engine/educationEngine';
import { UNIVERSITY_DIALOGUE, UNIVERSITY_COURSE_BOOKS } from './universityData';

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
  economicIndex,
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

  // Filter available courses: must not be already completed, and all prerequisites satisfied (script.207 addCourse)
  const availableCourses = useMemo(() => {
    const list = (campaign.education ?? []).filter((deg) => {
      if (player.degrees?.includes(deg.id)) return false;
      const prereqs = deg.prerequisites ?? [];
      if (prereqs.length > 0 && !prereqs.every((p: string) => player.degrees?.includes(p))) {
        return false;
      }
      return true;
    });
    // Order courses according to authentic shelf book order (Trade School top, Jr. College bottom)
    return [...list].sort((a, b) => {
      const idxA = UNIVERSITY_COURSE_BOOKS[a.id]?.bookIndex ?? 999;
      const idxB = UNIVERSITY_COURSE_BOOKS[b.id]?.bookIndex ?? 999;
      return idxA - idxB;
    });
  }, [campaign.education, player.degrees]);

  // Maximum of 4 courses can fit on the authentic bookshelf (cels 0-3 in view.707)
  const visibleCourses = useMemo(() => availableCourses.slice(0, 4), [availableCourses]);

  // Selected course on shelf
  const [selectedDegreeId, setSelectedDegreeId] = useState<string | null>(() => {
    return visibleCourses[0]?.id ?? null;
  });

  // Ensure selectedDegreeId stays valid when visibleCourses change
  useEffect(() => {
    if (!selectedDegreeId || !visibleCourses.some(c => c.id === selectedDegreeId)) {
      setSelectedDegreeId(visibleCourses[0]?.id ?? null);
    }
  }, [visibleCourses, selectedDegreeId]);

  const selectedDegree = visibleCourses.find(c => c.id === selectedDegreeId) ?? visibleCourses[0];

  // NOTE: enrolledClasses[id] is 0 right after enrolling, so test key presence, never truthiness.
  const isEnrolledIn = (id: string) =>
    Object.prototype.hasOwnProperty.call(player.enrolledClasses ?? {}, id);

  const credits = player.enrolledCredits ?? 0;
  const activeEnrolledCount = Object.keys(player.enrolledClasses ?? {}).filter(k => !k.endsWith('_req')).length;
  const maxEnrolled = _rules?.maxEnrolledClasses ?? 4;
  const enrollmentFee = calcEconomyPrice(
    (campaign.education ?? [])[0]?.baseTuitionFee ?? 50,
    economicIndex,
  );

  const handleSelectDegree = (deg: any) => {
    setSelectedDegreeId(deg.id);
  };

  // Original script.207: the Enroll button charges the enrollment fee and grants an enrollment
  // credit; only afterwards may a class (book) be chosen.
  const handleEnroll = async () => {
    if (credits > 0) {
      triggerSpeech(UNIVERSITY_DIALOGUE.selectClass, 2800);
      return;
    }
    const res: any = await onAction({ type: 'buy_education_credit', baseFee: (campaign.education ?? [])[0]?.baseTuitionFee ?? 50 });
    const log = Array.isArray(res) ? res[0] : res;
    if (log?.key === 'action.error.notEnoughMoney') {
      triggerSpeech(UNIVERSITY_DIALOGUE.notEnoughCash, 2800);
      return;
    }
    triggerSpeech(
      `Your enrollment fee of $${enrollmentFee} has been accepted. ${UNIVERSITY_DIALOGUE.selectClass}`,
      3500,
    );
  };

  // Handle Study Session
  const handleStudy = async (degree: any) => {
    const res: any = await onAction({ type: 'study', degreeId: degree.id });
    const log = Array.isArray(res) ? res[0] : res;
    if (log?.key === 'action.error.notEnoughTime') {
      triggerSpeech(UNIVERSITY_DIALOGUE.noTime, 2800);
      return;
    }
    triggerSpeech(`Attending class in ${degree.name}... Keep up the hard work!`, 3000);
  };

  const handleBookClick = (deg: any) => {
    setSelectedDegreeId(deg.id);
    if (isEnrolledIn(deg.id)) {
      handleStudy(deg);
      return;
    }
    if (credits <= 0) {
      triggerSpeech(UNIVERSITY_DIALOGUE.needToEnroll, 2800);
      return;
    }
    if (activeEnrolledCount >= maxEnrolled) {
      triggerSpeech(`You may only take ${maxEnrolled} classes at a time.`, 2800);
      return;
    }
    onAction({ type: 'enroll', degreeId: deg.id });
    const banter = UNIVERSITY_DIALOGUE.clerkBanter[
      Math.floor(Math.random() * UNIVERSITY_DIALOGUE.clerkBanter.length)
    ];
    triggerSpeech(`Enrolled in ${deg.name}! ${banter}`, 3500);
  };

  // Check if player is employed at the university
  const playerJobHere = player.currentJobId
    ? campaign.jobs.find(j => j.id === player.currentJobId && j.locationId === 'university')
    : null;

  const handleWorkShift = () => {
    if (!playerJobHere) return;

    if ((player.hoursRemaining ?? 0) <= 0) {
      triggerSpeech('You do not have enough time left to work today.', 2800);
      return;
    }

    setIsPunchingCard(true);
    setPunchCel(0);

    addAnimTimer(() => setPunchCel(1), 120);
    addAnimTimer(() => setPunchCel(2), 240);
    addAnimTimer(() => setPunchCel(3), 360);
    addAnimTimer(() => {
      // Keep punch card in the window after work
      setPunchCel(3);
      onAction({ type: 'work', jobId: playerJobHere.id });
      triggerSpeech('Class dismissed! Your faculty work shift is finished.', 3000);
    }, 550);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (key === 'ESCAPE' || key === 'D') {
        e.preventDefault();
        onClose();
      } else if (key === 'E') {
        e.preventDefault();
        handleEnroll();
      } else if (key === 'S' && selectedDegree && isEnrolledIn(selectedDegree.id)) {
        e.preventDefault();
        handleStudy(selectedDegree);
      } else if (key === 'W' && playerJobHere) {
        e.preventDefault();
        handleWorkShift();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerJobHere, player.hoursRemaining, player.money, selectedDegree, player.enrolledClasses, player.enrolledCredits]);

  const numCourses = visibleCourses.length;
  // Choose authentic shelf sprite from 0 to 3 (view.707 Loop 0)
  const shelfIdx = Math.min(3, Math.max(0, numCourses - 1));

  return (
    <div
      data-testid="authentic-university"
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

        {/* Talker Frame (view.357 at x=0, y=0 with 1px black right and bottom border) */}
        <div
          data-testid="university-talker-frame"
          style={{
            position: 'absolute',
            left: '0px',
            top: '0px',
            width: '68px',
            height: '55px',
            boxSizing: 'border-box',
            backgroundColor: '#009050',
            borderRight: '1px solid #000000',
            borderBottom: '1px solid #000000',
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        >
          <img
            data-testid="university-talker"
            src={`${basePath}/${talkerFolder}/talker_${talkerCel}.png`}
            alt="Registrar"
            style={{
              position: 'absolute',
              left: '0px',
              top: '0px',
              width: '68px',
              height: '55px',
              display: 'block',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Speech Bubble on right with pointer tail pointing to registrar's face */}
        {activeSpeech && (
          <div
            data-testid="university-speech-bubble"
            style={{
              position: 'absolute',
              left: '71px',
              top: '4px',
              width: '108px',
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
              data-testid="speech-tail-left"
              style={{
                position: 'absolute',
                left: '-7px',
                top: '9px',
                width: 0,
                height: 0,
                borderTop: '3px solid transparent',
                borderBottom: '3px solid transparent',
                borderRight: '7px solid #000',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '1.5px',
                  top: '-2px',
                  width: 0,
                  height: 0,
                  borderTop: '2px solid transparent',
                  borderBottom: '2px solid transparent',
                  borderRight: '5px solid #ffffea',
                }}
              />
            </div>
            {activeSpeech}
          </div>
        )}

        {/* Bookshelf Backdrop (view.707 Loop 0 at x=71, y=42 resting at y=105) */}
        {numCourses > 0 && (
          <img
            data-testid="university-bookshelf"
            src={`${basePath}/shelves/shelf_${shelfIdx}.png`}
            alt="Bookshelf"
            style={{
              position: 'absolute',
              left: '71px',
              top: '42px',
              width: '111px',
              height: '63px',
              pointerEvents: 'none',
              zIndex: 4,
            }}
          />
        )}

        {/* Books as Classes on Shelves (view.707 Loop 2, 86x9 each, perfectly resting on shelves at x=76) */}
        <div
          data-testid="university-books-container"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '183px',
            height: '112px',
            pointerEvents: 'none',
            zIndex: 6,
          }}
        >
          {visibleCourses.map((deg, idx) => {
            const isEnrolled = isEnrolledIn(deg.id);
            const degDef = deg.lessonsRequired !== undefined ? deg : { ...deg, lessonsRequired: (deg as any).unitsRequired ?? 10 };
            const requiredLessons = calcRequiredLessons(player, degDef, _rules);
            const lessonsCompleted = player.enrolledClasses?.[deg.id] ?? 0;
            const remainingLessons = Math.max(0, requiredLessons - lessonsCompleted);
            const bookMeta = UNIVERSITY_COURSE_BOOKS[deg.id] ?? { bookIndex: idx % 11, title: deg.name };
            const bookTop = 94 - (visibleCourses.length - 1 - idx) * 14;

            return (
              <div
                key={deg.id}
                data-testid={`course-book-${deg.id}`}
                onClick={() => handleBookClick(deg)}
                onMouseEnter={() => handleSelectDegree(deg)}
                style={{
                  position: 'absolute',
                  left: '76px',
                  top: `${bookTop}px`,
                  width: '86px',
                  height: '9px',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  outline: 'none',
                  backgroundColor: 'transparent',
                }}
                title={`${deg.name} - ${isEnrolled ? `Enrolled (${remainingLessons} remaining lessons. Click to study)` : 'Click to select / enroll'}`}
              >
                <img
                  src={`${basePath}/books/book_${bookMeta.bookIndex}.png`}
                  alt={deg.name}
                  style={{
                    width: '86px',
                    height: '9px',
                    display: 'block',
                    imageRendering: 'pixelated',
                    pointerEvents: 'none',
                  }}
                />
                {isEnrolled && (
                  <span
                    data-testid={`enrolled-badge-${deg.id}`}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '0px',
                      color: '#000000',
                      fontFamily: 'monospace, "Courier New"',
                      fontSize: '6.5px',
                      fontWeight: 'bold',
                      lineHeight: '9px',
                      pointerEvents: 'none',
                      backgroundColor: 'transparent',
                    }}
                  >
                    {remainingLessons}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons (view.250): Work at x=71, Enroll at x=105, Done at x=147, all at nsTop: 108 sticking 3px out */}
        {playerJobHere && (
          <img
            data-testid="btn-university-work"
            src={`${basePath}/buttons/work.png`}
            alt="Work"
            onClick={handleWorkShift}
            style={{
              position: 'absolute',
              left: '71px',
              top: '108px',
              width: '30px',
              height: '7px',
              cursor: 'pointer',
              zIndex: 10,
            }}
            title="Work Faculty Shift (W)"
          />
        )}

        {/* Sierra Authentic Enroll Button (view.250 Loop 10 Cel 0 at nsLeft: 105, nsTop: 108) */}
        {credits <= 0 && visibleCourses.length > 0 && (
          <img
            data-testid="btn-university-enroll"
            src={`${basePath}/buttons/enroll.png`}
            alt="Enroll"
            onClick={handleEnroll}
            style={{
              position: 'absolute',
              left: '105px',
              top: '108px',
              width: '38px',
              height: '7px',
              cursor: 'pointer',
              zIndex: 10,
            }}
            title={`Enroll (fee $${enrollmentFee}) (E)`}
          />
        )}

        {/* Exit / Done Action Button (view.250 Loop 0 Cel 0 at nsLeft: 147, nsTop: 108) */}
        <img
          data-testid="btn-university-done"
          src={`${basePath}/buttons/done.png`}
          alt="Done"
          onClick={onClose}
          style={{
            position: 'absolute',
            left: '147px',
            top: '108px',
            width: '30px',
            height: '7px',
            cursor: 'pointer',
            zIndex: 10,
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
