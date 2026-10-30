import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { StatModification } from '../../engine/gameState';
import { StatModifierPills } from '../StatModifierPills';

interface AuthenticStreetRobberyModalProps {
  lostAmount: number;
  location: string;
  onClose: () => void;
  modifications?: StatModification[];
  isHelpfulUI?: boolean;
}

const BASE_WIDTH = 183;
const BASE_HEIGHT = 112;

export function AuthenticStreetRobberyModal({
  lostAmount,
  location,
  onClose,
  modifications,
  isHelpfulUI = true,
}: AuthenticStreetRobberyModalProps) {
  const { t } = useTranslation();
  const [scale, setScale] = useState(3);
  const [phase, setPhase] = useState<'anim' | 'alert'>('anim');
  const [willyX, setWillyX] = useState(20);
  const [willyCel, setWillyCel] = useState(0);
  const [animSubPhase, setAnimSubPhase] = useState<'walk' | 'snatch' | 'flee'>('walk');

  const locationName = t(`building.${location}`, { defaultValue: location });

  const effectiveModifications: StatModification[] =
    modifications && modifications.length > 0
      ? modifications
      : [{ stat: 'money', diff: -lostAmount }];

  // Responsive scale factor
  useEffect(() => {
    const updateScale = () => {
      const sw = (window.innerWidth - 32) / BASE_WIDTH;
      const sh = (window.innerHeight - 32) / BASE_HEIGHT;
      const s = Math.max(1, Math.min(sw, sh, 4.5));
      setScale(s);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Wild Willy Mugging Animation Cycle (Script 114)
  useEffect(() => {
    if (phase !== 'anim') return;

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < 8) {
        // Approaching walk
        setAnimSubPhase('walk');
        setWillyX((x) => x + 7);
        setWillyCel(step % 6);
      } else if (step < 12) {
        // Snatching wallet
        setAnimSubPhase('snatch');
        setWillyCel(step % 2);
      } else if (step < 20) {
        // Fleeing with loot
        setAnimSubPhase('flee');
        setWillyX((x) => x + 9);
        setWillyCel(step % 6);
      } else {
        clearInterval(interval);
        setPhase('alert');
      }
    }, 80);

    return () => clearInterval(interval);
  }, [phase]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (phase === 'anim') {
          setPhase('alert');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, onClose]);

  const skipAnim = () => {
    if (phase === 'anim') setPhase('alert');
  };

  return (
    <div
      className="building-modal-overlay authentic-street-robbery-overlay"
      data-testid="authentic-street-robbery-modal"
      onClick={skipAnim}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        userSelect: 'none',
      }}
    >
      {/* 1. Animation Phase (Script 114 Willy Mugging Walk & Snatch) */}
      {phase === 'anim' ? (
        <div
          data-testid="willy-mugging-stage"
          style={{
            position: 'relative',
            width: `${BASE_WIDTH}px`,
            height: '60px',
            backgroundColor: '#1b1b1b',
            border: '2px solid #5a3c1e',
            borderRadius: '2px',
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            imageRendering: 'pixelated',
            overflow: 'hidden',
          }}
        >
          {/* Street sidewalk backdrop */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '18px',
              backgroundColor: '#555',
              borderTop: '2px solid #888',
            }}
          />

          {/* Player Marble standing on street */}
          <div
            style={{
              position: 'absolute',
              left: '75px',
              bottom: '12px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              boxShadow: '0 0 4px #000',
            }}
            title="You"
          />

          {/* Willy animated sprite */}
          <img
            data-testid="willy-sprite"
            src={
              animSubPhase === 'snatch'
                ? `/assets/authentic/willy/snatch/willy_snatch_${willyCel}.png`
                : animSubPhase === 'flee'
                ? `/assets/authentic/willy/walk/willy_flee_${willyCel}.png`
                : `/assets/authentic/willy/walk/willy_walk_${willyCel}.png`
            }
            alt="Wild Willy"
            style={{
              position: 'absolute',
              left: `${willyX}px`,
              bottom: '10px',
              height: '25px',
              imageRendering: 'pixelated',
              display: 'block',
            }}
          />

          {/* Prompt to skip */}
          <div
            style={{
              position: 'absolute',
              top: '4px',
              left: 0,
              right: 0,
              textAlign: 'center',
              fontSize: '5.5px',
              fontFamily: 'monospace',
              color: '#bbb',
            }}
          >
            ⚠️ WILD WILLY ATTACK! (Click or press Space to skip)
          </div>
        </div>
      ) : (
        /* 2. Alert Phase: Authentic Sierra Robbery Dialog */
        <div
          className="building-modal-content authentic-willy-alert"
          data-testid="willy-alert-dialog"
          style={{
            position: 'relative',
            width: `${BASE_WIDTH}px`,
            minHeight: `${BASE_HEIGHT}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            backgroundColor: '#cbb692',
            border: '2px solid #4a2d12',
            boxShadow: '0 0 0 2px #000, 4px 4px 0px rgba(0,0,0,0.6)',
            imageRendering: 'pixelated',
            boxSizing: 'border-box',
            fontFamily: "'Courier New', monospace",
            color: '#2a1a08',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Header */}
          <div>
            <div
              style={{
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '8.5px',
                color: '#8b0000',
                borderBottom: '1px solid #7c5832',
                paddingBottom: '3px',
                marginBottom: '5px',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
              }}
            >
              ⚠️ Street Robbery!
            </div>

            {/* Narrative text */}
            <p
              style={{
                fontSize: '6.5px',
                lineHeight: '8.5px',
                margin: '3px 0 6px 0',
                color: '#1a1005',
              }}
            >
              As you walked out of the <strong>{locationName}</strong>, Wild Willy jumped out of the shadows, cornered you, and stole all your cash!
            </p>

            {/* Loss Badge */}
            <div
              style={{
                backgroundColor: 'rgba(139, 0, 0, 0.15)',
                border: '1px solid #8b0000',
                padding: '2px 4px',
                borderRadius: '2px',
                fontWeight: 'bold',
                fontSize: '7.5px',
                color: '#8b0000',
                textAlign: 'center',
                marginBottom: '5px',
              }}
            >
              {`Loss: -$${lostAmount}`}
            </div>

            {/* Stat Modifiers */}
            {isHelpfulUI && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                <StatModifierPills modifications={effectiveModifications} isHelpfulUI={isHelpfulUI} />
              </div>
            )}
          </div>

          {/* OK / Done Button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
            <button
              type="button"
              data-testid="willy-dismiss-btn"
              onClick={onClose}
              style={{
                padding: '2px 12px',
                backgroundColor: '#8b0000',
                color: '#fff',
                border: '1px solid #4a0000',
                borderRadius: '2px',
                fontSize: '7.5px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: "'Courier New', monospace",
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
