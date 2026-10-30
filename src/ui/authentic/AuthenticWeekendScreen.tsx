import { useState, useEffect } from 'react';
import type { PlayerState, GameRules, StatModification } from '../../engine/gameState';
import { useTranslation } from 'react-i18next';
import { StatModifierPills } from '../StatModifierPills';
import { WeekendBreakdownModal } from '../WeekendBreakdownModal';

interface AuthenticWeekendScreenProps {
  player: PlayerState;
  turn: number;
  onStartWeek: () => void;
  onSelectCard?: (cardId: string) => void;
  rules?: GameRules;
}

const BASE_WIDTH = 183;
const BASE_HEIGHT = 112;

export function AuthenticWeekendScreen({
  player,
  turn,
  onStartWeek,
  onSelectCard,
  rules,
}: AuthenticWeekendScreenProps) {
  const { t } = useTranslation();
  const offeredCards = player.offeredWeekendCards || [];
  const isSelectionMode = offeredCards.length > 0 && !player.weekendResult;
  const [selectedCardId, setSelectedCardId] = useState<string>(offeredCards[0]?.id || '');
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [scale, setScale] = useState(3);

  const isHelpfulUI = rules?.helpfulUI ?? true;

  // Responsive scale factor for pixel-perfect Sierra SCI viewport
  useEffect(() => {
    const updateScale = () => {
      // If selection mode with multiple cards, we might need slightly more space, or keep 183x112
      const targetW = isSelectionMode ? Math.max(BASE_WIDTH, offeredCards.length * 90) : BASE_WIDTH;
      const targetH = isSelectionMode ? 140 : BASE_HEIGHT;
      const sw = (window.innerWidth - 32) / targetW;
      const sh = (window.innerHeight - 32) / targetH;
      const s = Math.max(1, Math.min(sw, sh, 4.5));
      setScale(s);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [isSelectionMode, offeredCards.length]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showBreakdownModal) return;
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        if (isSelectionMode) {
          if (selectedCardId && onSelectCard) {
            onSelectCard(selectedCardId);
          }
        } else {
          onStartWeek();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionMode, selectedCardId, onSelectCard, onStartWeek, showBreakdownModal]);

  const rawModifications: StatModification[] = (() => {
    if (player.weekendResult?.modifications && player.weekendResult.modifications.length > 0) {
      return player.weekendResult.modifications;
    }
    if (!player.weekendResult) return [];
    const mods: StatModification[] = [];
    if (player.weekendResult.cost > 0) {
      mods.push({ stat: 'money', diff: -player.weekendResult.cost });
    }
    if (player.weekendResult.happinessBonus) {
      if (player.mentalCondition !== undefined) {
        mods.push({ stat: 'mental', diff: player.weekendResult.happinessBonus });
      } else {
        mods.push({ stat: 'happiness', diff: player.weekendResult.happinessBonus });
      }
    }
    return mods;
  })();

  // ───────────────────────────────────────────────────────────────────────────
  // CARD SELECTION MODE (Advanced Weekend Mode with Sierra Retro Frame)
  // ───────────────────────────────────────────────────────────────────────────
  if (isSelectionMode) {
    const handleConfirm = (cardId: string) => {
      if (onSelectCard) {
        onSelectCard(cardId);
      }
    };

    return (
      <div
        className="weekend-screen weekend-screen--selection authentic-weekend-overlay"
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
          data-testid="weekend-selection-modal"
          style={{
            position: 'relative',
            width: `${Math.max(BASE_WIDTH, offeredCards.length * 85 + 20)}px`,
            padding: '10px',
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            backgroundColor: '#c8b496',
            border: '2px solid #5a3c1e',
            boxShadow: '0 0 0 2px #000, 4px 4px 0px rgba(0,0,0,0.6)',
            imageRendering: 'pixelated',
            fontFamily: "'Courier New', monospace",
            color: '#2a1a08',
          }}
        >
          {/* Header */}
          <div
            style={{
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '9px',
              borderBottom: '1px solid #7c5832',
              paddingBottom: '4px',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {t('weekendScreen.title', { defaultValue: 'Weekend Activities' })}
          </div>

          {/* Cards Grid */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              justifyContent: 'center',
              marginBottom: '10px',
            }}
          >
            {offeredCards.map((card) => {
              const isSelected = card.id === selectedCardId;
              return (
                <div
                  key={card.id}
                  onClick={() => setSelectedCardId(card.id)}
                  style={{
                    flex: '1 1 70px',
                    maxWidth: '85px',
                    padding: '5px',
                    backgroundColor: isSelected ? '#fff9e6' : '#dfcca8',
                    border: isSelected ? '2px solid #0055aa' : '1px solid #8e6c46',
                    cursor: 'pointer',
                    borderRadius: '2px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: '14px', marginBottom: '2px' }}>{card.icon}</span>
                  <span style={{ fontSize: '7.5px', fontWeight: 'bold', marginBottom: '2px' }}>
                    {t(card.titleKey, { defaultValue: card.titleKey })}
                  </span>
                  <span style={{ fontSize: '6px', color: '#555', marginBottom: '4px', lineHeight: '8px' }}>
                    {card.fluff}
                  </span>
                  <span style={{ fontSize: '6.5px', fontWeight: 'bold', color: card.costMin > 0 ? '#8b0000' : '#006400' }}>
                    {card.costMin > 0 ? `$${card.costMin}-${card.costMax}` : 'Free'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <button
              type="button"
              data-testid="weekend-confirm-btn"
              onClick={() => handleConfirm(selectedCardId)}
              style={{
                padding: '2px 8px',
                backgroundColor: '#3a6ea5',
                color: '#fff',
                border: '1px solid #1c3b60',
                borderRadius: '2px',
                fontSize: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {t('weekendScreen.confirmSelection', { defaultValue: 'Confirm' })}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SUMMARY / RESOLUTION MODE (Script 232 Authentic Desk Calendar)
  // ───────────────────────────────────────────────────────────────────────────
  const eventFluff = player.weekendResult
    ? (player.weekendResult.chosenCard
        ? player.weekendResult.chosenCard.fluff
        : (t(player.weekendResult.event.key, player.weekendResult.event.params as any) as string))
    : (t('weekendScreen.nothingSpecial', { defaultValue: 'You stayed home and did absolutely nothing this weekend.' }) as string);

  const cost = player.weekendResult?.cost || 0;

  return (
    <div
      className="weekend-screen weekend-screen--summary authentic-weekend-overlay"
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
        className="weekend-player-summary authentic-weekend-viewport"
        data-testid="weekend-summary-card"
        style={{
          position: 'relative',
          width: `${BASE_WIDTH}px`,
          height: `${BASE_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          backgroundImage: 'url(/assets/authentic/weekend/bg_weekend.png)',
          backgroundSize: '183px 112px',
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
          fontFamily: "'Courier New', monospace",
          color: '#1a1e24',
        }}
      >
        {/* Help & Close buttons at top right */}
        <div
          style={{
            position: 'absolute',
            top: '3px',
            right: '4px',
            display: 'flex',
            gap: '3px',
            zIndex: 10,
          }}
        >
          <button
            type="button"
            data-testid="weekend-breakdown-help-btn"
            onClick={() => setShowBreakdownModal(true)}
            title={t('weekendScreen.helpTooltip', { defaultValue: 'Stat Breakdown' })}
            aria-label={t('weekendScreen.helpTooltip', { defaultValue: 'Stat Breakdown' })}
            style={{
              width: '10px',
              height: '8px',
              lineHeight: '7px',
              fontSize: '6px',
              fontWeight: 'bold',
              padding: 0,
              backgroundColor: '#d8c4a0',
              border: '1px solid #5a3c1e',
              borderRadius: '1px',
              cursor: 'pointer',
              color: '#301808',
            }}
          >
            ?
          </button>
          <button
            type="button"
            data-testid="weekend-close-btn"
            onClick={onStartWeek}
            title={t('weekendScreen.close', { defaultValue: 'Close' })}
            aria-label={t('weekendScreen.close', { defaultValue: 'Close' })}
            style={{
              width: '10px',
              height: '8px',
              lineHeight: '7px',
              fontSize: '6px',
              fontWeight: 'bold',
              padding: 0,
              backgroundColor: '#d8c4a0',
              border: '1px solid #5a3c1e',
              borderRadius: '1px',
              cursor: 'pointer',
              color: '#301808',
            }}
          >
            &times;
          </button>
        </div>

        {/* Player Name Display (Sierra SCI Display call 1 at x=13, y=35) */}
        <div
          style={{
            position: 'absolute',
            left: '13px',
            top: '26px',
            fontSize: '8px',
            fontWeight: 'bold',
            color: '#10223a',
            letterSpacing: '0.2px',
          }}
        >
          {player.name}
        </div>

        {/* Weekend Fluff Narrative (Sierra SCI Display call 2 at x=13, y=47) */}
        {player.weekendResult ? (
          <div
            style={{
              position: 'absolute',
              left: '13px',
              top: '38px',
              width: '156px',
              maxHeight: '44px',
              fontSize: '6.5px',
              lineHeight: '8.5px',
              fontWeight: 'bold',
              color: '#1a1e24',
              overflow: 'hidden',
              wordWrap: 'break-word',
            }}
          >
            {eventFluff}
          </div>
        ) : (
          <p
            className="weekend-summary-empty"
            style={{
              position: 'absolute',
              left: '13px',
              top: '38px',
              width: '156px',
              fontSize: '6.5px',
              lineHeight: '8.5px',
              fontWeight: 'bold',
              color: '#555',
            }}
          >
            {t('weekendScreen.nothingSpecial', { defaultValue: 'You stayed home and did absolutely nothing this weekend.' })}
          </p>
        )}

        {/* Stat Modifiers / Helpful UI Pills */}
        {isHelpfulUI && rawModifications.length > 0 && (
          <div
            style={{
              position: 'absolute',
              left: '13px',
              top: '84px',
              display: 'flex',
              alignItems: 'center',
              transform: 'scale(0.75)',
              transformOrigin: 'left center',
            }}
          >
            <StatModifierPills
              modifications={rawModifications}
              isHelpfulUI={isHelpfulUI}
              align="start"
              style={{ margin: 0, padding: 0 }}
            />
          </div>
        )}

        {/* Spending Cost Text (Sierra SCI Display call 3: "You spent $%d.") */}
        {cost > 0 && (
          <div
            style={{
              position: 'absolute',
              left: '13px',
              top: isHelpfulUI && rawModifications.length > 0 ? '75px' : '84px',
              fontSize: '6.5px',
              fontWeight: 'bold',
              color: '#8b0000',
            }}
          >
            {`You spent $${cost}.`}
          </div>
        )}

        {/* Souvenir Badge if applicable */}
        {player.weekendResult?.souvenir && (
          <div
            data-testid="weekend-souvenir-callout"
            style={{
              position: 'absolute',
              left: '13px',
              bottom: '10px',
              fontSize: '6.5px',
              fontWeight: 'bold',
              color: '#2d4b1f',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            <span>🎁</span>
            <span>{player.weekendResult.souvenir.icon}</span>
            <span>{player.weekendResult.souvenir.name}</span>
          </div>
        )}

        {/* Sierra SCI Done Button (view.250 at nsLeft $8f=143, nsTop $6c=108 -> top: 101px) */}
        <button
          type="button"
          data-testid="weekend-start-week-btn"
          onClick={onStartWeek}
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
          aria-label={t('weekendScreen.startWeek', { turn })}
        >
          <img
            src="/assets/authentic/weekend/buttons/done.png"
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

      {showBreakdownModal && (
        <WeekendBreakdownModal
          weekendResult={player.weekendResult}
          isHelpfulUI={isHelpfulUI}
          onClose={() => setShowBreakdownModal(false)}
        />
      )}
    </div>
  );
}
