import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameRules } from '../../engine/gameState';

interface AuthenticDiplomaModalProps {
  degreeName: string;
  playerName: string;
  onClose: () => void;
  rules?: GameRules;
}

const BASE_WIDTH = 183;
const BASE_HEIGHT = 112;

export function AuthenticDiplomaModal({
  degreeName,
  playerName,
  onClose,
  rules: _rules,
}: AuthenticDiplomaModalProps) {
  const { t } = useTranslation();
  const [scale, setScale] = useState(3);
  const [scrollCel, setScrollCel] = useState(0);

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

  // Unrolling scroll animation (Script 230 theDiploma DCIcon 5 cels)
  useEffect(() => {
    const interval = setInterval(() => {
      setScrollCel((prev) => {
        if (prev >= 4) {
          clearInterval(interval);
          return 4;
        }
        return prev + 1;
      });
    }, 60);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (scrollCel < 4) {
          setScrollCel(4);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollCel, onClose]);

  const isFullyUnrolled = scrollCel === 4;

  return (
    <div
      className="modal-overlay authentic-diploma-overlay"
      data-testid="authentic-diploma-modal"
      onClick={() => {
        if (scrollCel < 4) setScrollCel(4);
      }}
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
      <div
        className="modal-content authentic-diploma-viewport"
        data-testid="diploma-viewport"
        style={{
          position: 'relative',
          width: `${BASE_WIDTH}px`,
          height: `${BASE_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          backgroundImage: 'url(/assets/authentic/diploma/bg_diploma.png)',
          backgroundSize: '183px 112px',
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
          boxSizing: 'border-box',
          fontFamily: '"Times New Roman", Times, serif',
          color: '#1a1a1a',
        }}
      >
        {/* Scroll unrolling sprite (Script 230 Loop 0 Cels 0..4) */}
        <div
          data-testid="diploma-scroll-container"
          style={{
            position: 'absolute',
            left: '15px',
            top: '14px',
            width: '153px',
            height: '85px',
            imageRendering: 'pixelated',
          }}
        >
          <img
            data-testid="diploma-scroll-img"
            src={`/assets/authentic/diploma/scroll/scroll_${scrollCel}.png`}
            alt="Diploma Scroll"
            style={{
              width: '153px',
              height: '85px',
              display: 'block',
              imageRendering: 'pixelated',
            }}
          />

          {/* Certificate text overlay once fully unrolled */}
          {isFullyUnrolled && (
            <div
              data-testid="diploma-text-overlay"
              style={{
                position: 'absolute',
                left: '14px',
                top: '12px',
                width: '125px',
                height: '62px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  fontSize: '6.5px',
                  fontWeight: 'bold',
                  letterSpacing: '0.4px',
                  color: '#1c305c',
                  marginBottom: '2px',
                  textTransform: 'uppercase',
                }}
              >
                Hi-Tech University
              </div>
              <div
                style={{
                  fontSize: '4.5px',
                  fontStyle: 'italic',
                  color: '#444',
                  marginBottom: '1px',
                }}
              >
                This certifies that
              </div>
              <div
                style={{
                  fontSize: '7px',
                  fontWeight: 'bold',
                  color: '#000',
                  marginBottom: '1px',
                  letterSpacing: '0.2px',
                }}
              >
                {playerName}
              </div>
              <div
                style={{
                  fontSize: '4.5px',
                  fontStyle: 'italic',
                  color: '#444',
                  marginBottom: '2px',
                }}
              >
                has successfully completed the curriculum for
              </div>
              <div
                style={{
                  fontSize: '6.5px',
                  fontWeight: 'bold',
                  color: '#5c1c1c',
                  textTransform: 'uppercase',
                }}
              >
                {degreeName}
              </div>
            </div>
          )}
        </div>

        {/* Sierra SCI Done Button (view.250 at nsLeft $8f=143, nsTop $6c=108 -> top: 101px) */}
        <button
          type="button"
          data-testid="diploma-done-btn"
          onClick={onClose}
          style={{
            position: 'absolute',
            left: '143px',
            top: '101px',
            width: '30px',
            height: '7px',
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            outline: 'none',
            imageRendering: 'pixelated',
            zIndex: 10,
          }}
          aria-label={t('diploma.close', { defaultValue: 'Close Diploma' })}
        >
          <img
            src="/assets/authentic/diploma/buttons/done.png"
            alt="Done"
            style={{
              width: '30px',
              height: '7px',
              display: 'block',
              imageRendering: 'pixelated',
            }}
          />
        </button>
      </div>
    </div>
  );
}
