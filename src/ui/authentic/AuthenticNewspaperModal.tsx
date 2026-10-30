import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameEvent, GameRules } from '../../engine/gameState';

interface AuthenticNewspaperModalProps {
  headline: GameEvent | null;
  onClose: () => void;
  rules?: GameRules;
}

const BASE_WIDTH = 183;
const BASE_HEIGHT = 112;

export function AuthenticNewspaperModal({
  headline,
  onClose,
  rules: _rules,
}: AuthenticNewspaperModalProps) {
  const { t } = useTranslation();
  const [scale, setScale] = useState(3);
  const [isSpinning, setIsSpinning] = useState(true);
  const [spinCel, setSpinCel] = useState(0);

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

  // Spinning animation cycle (Script 215 DCIcon cycleSpeed 6)
  useEffect(() => {
    if (!isSpinning) return;
    const interval = setInterval(() => {
      setSpinCel((prev) => {
        if (prev >= 5) {
          clearInterval(interval);
          setIsSpinning(false);
          return 5;
        }
        return prev + 1;
      });
    }, 70);
    return () => clearInterval(interval);
  }, [isSpinning]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (isSpinning) {
          setIsSpinning(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpinning, onClose]);

  if (!headline) return null;

  const stockTip = headline.stockTip;
  const headlineText = (t(headline.key, headline.params as any) as string).toUpperCase();

  return (
    <div
      className="modal-overlay authentic-newspaper-overlay"
      data-testid="authentic-newspaper-modal"
      onClick={() => {
        if (isSpinning) setIsSpinning(false);
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
      {/* 1. Spinning Animation Phase */}
      {isSpinning ? (
        <div
          data-testid="newspaper-spinning-anim"
          style={{
            position: 'relative',
            width: '80px',
            height: '55px',
            transform: `scale(${scale * 1.5})`,
            transformOrigin: 'center center',
            imageRendering: 'pixelated',
          }}
        >
          <img
            src={`/assets/authentic/newspaper/spinning/spin_${spinCel}.png`}
            alt="Spinning Newspaper"
            style={{
              width: '80px',
              height: '55px',
              display: 'block',
              imageRendering: 'pixelated',
            }}
          />
        </div>
      ) : (
        /* 2. Authentic Front Page (Script 215 View 603 Loop 1 Cel 0) */
        <div
          className="modal-content authentic-newspaper-viewport"
          data-testid="newspaper-front-page"
          style={{
            position: 'relative',
            width: `${BASE_WIDTH}px`,
            height: `${BASE_HEIGHT}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            backgroundImage: 'url(/assets/authentic/newspaper/bg_newspaper.png)',
            backgroundSize: '183px 112px',
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated',
            boxSizing: 'border-box',
            fontFamily: '"Times New Roman", Times, serif',
            color: '#1a1a1a',
          }}
        >
          {/* Main Headline Display (Centered across front page masthead) */}
          <div
            style={{
              position: 'absolute',
              left: '12px',
              right: '12px',
              top: '36px',
              minHeight: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              fontWeight: '900',
              fontSize: headlineText.length > 50 ? '6px' : headlineText.length > 30 ? '7px' : '8px',
              lineHeight: headlineText.length > 50 ? '8px' : '9px',
              letterSpacing: '0.2px',
              color: '#0a0a0a',
              textShadow: '0 0 1px rgba(0,0,0,0.2)',
            }}
          >
            {headlineText}
          </div>

          {/* Market Watch / Stock Tip Desk (If Present) */}
          {stockTip && (
            <div
              data-testid="market-watch-column"
              style={{
                position: 'absolute',
                left: '14px',
                top: '68px',
                width: '120px',
                padding: '2px 4px',
                backgroundColor: 'rgba(235, 230, 215, 0.9)',
                border: '1px solid #7c6853',
                borderRadius: '1px',
                fontFamily: "'Courier New', monospace",
                fontSize: '5.5px',
                lineHeight: '7px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '0.5px solid #a8947e',
                  paddingBottom: '1px',
                  marginBottom: '1px',
                  fontWeight: 'bold',
                }}
              >
                <span>📈 MARKET WATCH</span>
                <span
                  style={{
                    backgroundColor:
                      stockTip.action === 'buy'
                        ? '#1b5e20'
                        : stockTip.action === 'sell'
                        ? '#b71c1c'
                        : '#e65100',
                    color: '#fff',
                    padding: '0 2px',
                    borderRadius: '1px',
                    fontSize: '5px',
                  }}
                >
                  {stockTip.action.toUpperCase()}
                </span>
              </div>
              <div style={{ fontWeight: 'bold', color: '#111', fontSize: '5.5px' }}>
                {t(stockTip.headlineKey)}
              </div>
            </div>
          )}

          {/* Sierra SCI Done Button (view.250 at nsLeft $8f=143, nsTop $6c=108 -> top: 101px) */}
          <button
            type="button"
            data-testid="newspaper-done-btn"
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
            }}
            aria-label={t('newspaper.close', { defaultValue: 'Close Newspaper' })}
          >
            <img
              src="/assets/authentic/newspaper/buttons/done.png"
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
      )}
    </div>
  );
}
