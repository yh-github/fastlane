import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameRules } from '../../engine/gameState';

interface AuthenticLotteryModalProps {
  prizeAmount: number;
  onClose: () => void;
  rules?: GameRules;
}

const TICKET_WIDTH = 86;
const TICKET_HEIGHT = 84;

export function AuthenticLotteryModal({
  prizeAmount,
  onClose,
  rules: _rules,
}: AuthenticLotteryModalProps) {
  const { t } = useTranslation();
  const [scale, setScale] = useState(3.5);
  const [scratched, setScratched] = useState<[boolean, boolean, boolean]>([false, false, false]);

  const isWon = prizeAmount > 0;
  const allScratched = scratched[0] && scratched[1] && scratched[2];

  // Responsive scale factor
  useEffect(() => {
    const updateScale = () => {
      const sw = (window.innerWidth - 32) / (TICKET_WIDTH + 30);
      const sh = (window.innerHeight - 32) / (TICKET_HEIGHT + 40);
      const s = Math.max(1, Math.min(sw, sh, 4.5));
      setScale(s);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const handleScratch = (index: 0 | 1 | 2) => {
    setScratched((prev) => {
      const next = [...prev] as [boolean, boolean, boolean];
      next[index] = true;
      return next;
    });
  };

  const handleScratchAll = () => {
    setScratched([true, true, true]);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!allScratched) {
          handleScratchAll();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allScratched, onClose]);

  // Numbers to display in the 3 boxes:
  // If won: 3 matching amounts. If lost: mismatched amounts.
  const displayNumbers = isWon
    ? [prizeAmount, prizeAmount, prizeAmount]
    : [25, 100, 10];

  return (
    <div
      className="modal-overlay authentic-lottery-overlay"
      data-testid="authentic-lottery-modal"
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
        data-testid="lottery-modal-content"
        style={{
          position: 'relative',
          padding: '12px',
          backgroundColor: '#c4ad8b',
          border: '2px solid #5a3c1e',
          boxShadow: '0 0 0 2px #000, 4px 4px 0px rgba(0,0,0,0.6)',
          borderRadius: '2px',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          imageRendering: 'pixelated',
          fontFamily: "'Courier New', monospace",
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: '7.5px',
            fontWeight: 'bold',
            color: '#301808',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
          }}
        >
          {t('lottery.title', { defaultValue: 'Instant Scratchers' })}
        </div>

        {/* Authentic 86x84 Ticket Canvas */}
        <div
          data-testid="lottery-ticket"
          style={{
            position: 'relative',
            width: `${TICKET_WIDTH}px`,
            height: `${TICKET_HEIGHT}px`,
            backgroundImage: 'url(/assets/authentic/lottery/ticket.png)',
            backgroundSize: '86px 84px',
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated',
          }}
        >
          {/* 3 Scratch Boxes */}
          {[0, 1, 2].map((idx) => {
            const isScratched = scratched[idx as 0 | 1 | 2];
            const amount = displayNumbers[idx];
            // Box positions on 86x84 ticket:
            // Centered horizontally, spaced at y ~ 46px
            const leftPos = 14 + idx * 22;
            const topPos = 46;

            return (
              <div
                key={idx}
                data-testid={`lottery-box-${idx}`}
                onClick={() => handleScratch(idx as 0 | 1 | 2)}
                style={{
                  position: 'absolute',
                  left: `${leftPos}px`,
                  top: `${topPos}px`,
                  width: '18px',
                  height: '18px',
                  cursor: isScratched ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
                title={isScratched ? `$${amount}` : 'Click to scratch'}
              >
                {isScratched ? (
                  <div
                    style={{
                      fontSize: '6px',
                      fontWeight: 'bold',
                      color: isWon ? '#006400' : '#8b0000',
                    }}
                  >
                    ${amount}
                  </div>
                ) : (
                  <img
                    src={`/assets/authentic/lottery/cels/scratch_${idx * 2}.png`}
                    alt="Scratch Foil"
                    style={{
                      width: '18px',
                      height: '18px',
                      display: 'block',
                      imageRendering: 'pixelated',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Result Message */}
        <div
          data-testid="lottery-result-text"
          style={{
            marginTop: '6px',
            minHeight: '12px',
            fontSize: '6.5px',
            fontWeight: 'bold',
            textAlign: 'center',
            color: allScratched ? (isWon ? '#006400' : '#8b0000') : '#555',
          }}
        >
          {!allScratched
            ? 'Scratch all 3 boxes to see if you won!'
            : isWon
            ? `MATCH 3! YOU WON $${prizeAmount}!`
            : 'NO MATCH! BETTER LUCK NEXT TIME!'}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
          {!allScratched && (
            <button
              type="button"
              data-testid="lottery-scratch-all-btn"
              onClick={handleScratchAll}
              style={{
                padding: '2px 6px',
                fontSize: '6px',
                fontWeight: 'bold',
                backgroundColor: '#3a6ea5',
                color: '#fff',
                border: '1px solid #1c3b60',
                borderRadius: '2px',
                cursor: 'pointer',
              }}
            >
              Scratch All
            </button>
          )}

          <button
            type="button"
            data-testid="lottery-done-btn"
            onClick={onClose}
            style={{
              padding: 0,
              width: '30px',
              height: '7px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              outline: 'none',
              imageRendering: 'pixelated',
            }}
            aria-label={t('lottery.done', { defaultValue: 'Done' })}
          >
            <img
              src="/assets/authentic/lottery/buttons/done.png"
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
    </div>
  );
}
