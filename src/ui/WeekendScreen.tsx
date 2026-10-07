import { useState, useEffect, useRef } from 'react';
import type { PlayerState, StatModification, GameRules } from '../engine/gameState';
import { useTranslation } from 'react-i18next';
import { WeekendCardView } from './WeekendCardView';
import { MessIcon } from './icons/MessIcon';

interface WeekendScreenProps {
  player: PlayerState;
  turn: number;
  onStartWeek: () => void;
  onSelectCard?: (cardId: string) => void;
  rules?: GameRules;
}

export function WeekendScreen({ player, turn, onStartWeek, onSelectCard, rules }: WeekendScreenProps) {
  const { t } = useTranslation();
  const offeredCards = player.offeredWeekendCards || [];
  const isSelectionMode = offeredCards.length > 0 && !player.weekendResult;
  const [selectedCardId, setSelectedCardId] = useState<string>(offeredCards[0]?.id || '');

  const isHelpfulUI = rules?.helpfulUI ?? true;

  const getStatInfo = (stat: string) => {
    switch (stat) {
      case 'money':
        return { icon: '$', label: t('weekendScreen.cost', { defaultValue: 'Money' }) };
      case 'mental':
        return { icon: '🧠', label: t('weekendScreen.mental', { defaultValue: 'Mental Condition' }) };
      case 'physical':
        return { icon: '💪', label: t('weekendScreen.physical', { defaultValue: 'Physical Condition' }) };
      case 'dependability':
        return { icon: '🤝', label: t('weekendScreen.dependability', { defaultValue: 'Dependability' }) };
      case 'mess':
        return { icon: <MessIcon />, label: t('weekendScreen.mess', { defaultValue: 'Apartment Mess' }) };
      case 'social':
        return { icon: '👥', label: t('weekendScreen.social', { defaultValue: 'Social Standing' }) };
      case 'happiness':
        return { icon: '😊', label: t('weekendScreen.happiness', { defaultValue: 'Happiness' }) };
      case 'relaxation':
        return { icon: '🛌', label: t('weekendScreen.relaxation', { defaultValue: 'Relaxation' }) };
      default:
        return { icon: '', label: stat };
    }
  };

  const rawModifications: StatModification[] = (() => {
    if (player.weekendResult?.modifications && player.weekendResult.modifications.length > 0) {
      return player.weekendResult.modifications;
    }
    if (!player.weekendResult) {
      return [];
    }
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

  const modifications = isHelpfulUI 
    ? rawModifications 
    : rawModifications.filter(mod => mod.stat === 'money');

  // Dynamic screen dimensions detection for adaptive card layout
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  }));

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToCard = (cardId: string) => {
    setSelectedCardId(cardId);
    const el = cardRefs.current[cardId];
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const count = offeredCards.length;
  // Cards in spacious form need ~270px width each + 20px gap, plus ~680px height
  const neededWidthForFull = count * 270 + (count - 1) * 20 + 48;
  const neededHeightForFull = 680;
  const canShowAllFull = dimensions.width >= neededWidthForFull && dimensions.height >= neededHeightForFull;
  const isCompact = !canShowAllFull;

  // Narrow screen / carousel check: when width is too small for compact cards side-by-side (width < count * 180 + 32, or mobile <= 640px)
  const neededWidthForCompactRow = count * 180 + (count - 1) * 12 + 32;
  const isCarouselMode = isCompact && (dimensions.width < neededWidthForCompactRow || dimensions.width < 640);

  // ───────────────────────────────────────────────────────────────────────────
  // CARD SELECTION MODE
  // ───────────────────────────────────────────────────────────────────────────
  if (isSelectionMode) {
    const handleConfirm = (cardId: string) => {
      if (onSelectCard) {
        onSelectCard(cardId);
      }
    };

    const selectedCard = offeredCards.find(c => c.id === selectedCardId);

    return (
      <div className={`weekend-screen weekend-screen--selection ${isCompact ? 'weekend-screen--compact' : ''}`} style={{
        position: 'absolute', top: 0, insetInlineStart: 0, width: '100%', height: '100%',
        backgroundColor: 'rgba(5, 8, 15, 0.95)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', color: 'white', zIndex: 40, overflowY: 'auto',
        padding: isCompact ? '16px 12px' : '30px 16px',
        boxSizing: 'border-box'
      }}>
        <h1 style={{
          color: '#00e5ff',
          textShadow: '0 0 12px #00e5ff',
          margin: '0 0 4px',
          textAlign: 'center',
          fontSize: isCompact ? '1.3rem' : '1.8rem'
        }}>
          {t('weekendScreen.cardChoiceTitle', { defaultValue: 'Weekend Plans' })}
        </h1>
        <h2 style={{
          color: '#94a3b8',
          fontSize: isCompact ? '0.88rem' : '1.1rem',
          margin: isCompact ? '0 0 10px' : '0 0 20px',
          textAlign: 'center'
        }}>
          {t('weekendScreen.cardChoiceSubtitle', { defaultValue: 'Choose how {{name}} will spend the weekend before Week {{turn}} begins.', name: player.name, turn })}
        </h2>

        {/* Touch Carousel Quick Pill Selector (when in carousel mode) */}
        {isCarouselMode && (
          <div className="weekend-carousel-indicator" role="tablist" aria-label="Weekend card quick select">
            {offeredCards.map((card, idx) => {
              const isCardActive = selectedCardId === card.id;
              return (
                <button
                  key={card.id}
                  role="tab"
                  aria-selected={isCardActive}
                  className={`weekend-carousel-indicator__btn ${isCardActive ? 'weekend-carousel-indicator__btn--active' : ''}`}
                  onClick={() => scrollToCard(card.id)}
                >
                  <span>{card.icon}</span>
                  <span>{idx + 1}. {t(card.titleKey, { defaultValue: card.type === 'durable' ? 'Comfort' : card.type === 'ticket' ? 'Live' : 'Activity' })}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Responsive Card Spread / Carousel Container */}
        <div
          data-testid="weekend-cards-container"
          className={isCarouselMode ? "weekend-cards-carousel" : "weekend-cards-container"}
          style={!isCarouselMode ? {
            display: 'flex',
            flexWrap: 'wrap',
            gap: isCompact ? '12px' : '20px',
            justifyContent: 'center',
            alignItems: 'stretch',
            width: '100%',
            maxWidth: isCompact ? '900px' : '960px',
            margin: isCompact ? '4px 0 16px' : '10px 0 24px',
            padding: isCompact ? '4px 2px' : '10px 4px'
          } : undefined}
        >
          {offeredCards.map((card) => {
            const isSelected = selectedCardId === card.id;
            return (
              <WeekendCardView
                key={card.id}
                ref={(el) => { cardRefs.current[card.id] = el; }}
                card={card}
                isSelected={isSelected}
                onSelect={() => scrollToCard(card.id)}
                onConfirm={() => handleConfirm(card.id)}
                compact={isCompact}
              />
            );
          })}
        </div>

        {/* Sticky Mobile Friendly Confirm Bar */}
        {selectedCardId && (
          <div style={{
            position: 'sticky',
            bottom: isCompact ? '8px' : '16px',
            zIndex: 10,
            marginTop: 'auto',
            padding: isCompact ? '8px 16px' : '12px 24px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: isCompact ? '10px' : '12px',
            border: '1px solid rgba(0, 229, 255, 0.4)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            gap: isCompact ? '10px' : '16px',
            alignItems: 'center',
            maxWidth: '90%',
            boxSizing: 'border-box'
          }}>
            <span style={{ fontSize: isCompact ? '0.84rem' : '0.95rem', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedCard
                ? t('weekendScreen.selectedCardPrompt', {
                    defaultValue: `Selected: {{name}}`,
                    name: t(selectedCard.titleKey, { defaultValue: selectedCard.type === 'durable' ? 'Home Comfort' : selectedCard.type === 'ticket' ? 'Live Entertainment' : 'Weekend Activity' })
                  })
                : t('weekendScreen.selectedPrompt', { defaultValue: 'Ready to commit your plans?' })}
            </span>
            <button
              onClick={() => handleConfirm(selectedCardId)}
              style={{
                padding: isCompact ? '8px 18px' : '10px 24px',
                fontSize: isCompact ? '0.9rem' : '1rem',
                minHeight: isCompact ? '38px' : '42px',
                cursor: 'pointer',
                backgroundColor: '#00e5ff',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                boxShadow: '0 0 10px #00e5ff',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {t('weekendScreen.confirmSelection', { defaultValue: 'Lock In Weekend' })}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SUMMARY / RESOLUTION MODE
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="weekend-screen weekend-screen--summary" style={{
      position: 'absolute', top: 0, insetInlineStart: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.90)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', color: 'white', zIndex: 40, overflowY: 'auto', padding: '40px 20px',
      boxSizing: 'border-box'
    }}>
      <h1 style={{ color: '#00e5ff', textShadow: '0 0 10px #00e5ff' }}>{t('weekendScreen.title')}</h1>
      <h2>{t('weekendScreen.summary', { turn, name: player.name })}</h2>
      
      <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0', width: '100%', maxWidth: '520px' }}>
        <div className="weekend-player-summary" style={{
          padding: '24px', backgroundColor: '#2c3e50', borderRadius: '12px', 
          width: '100%', border: '2px solid #34495e', textAlign: 'center',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
        }}>
          <h3 style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.2)', paddingBottom: '12px', margin: '0 0 16px 0' }}>
            {t('weekendScreen.activities')}
          </h3>
          
          {player.weekendResult ? (
            <>
              {player.weekendResult.chosenCard && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(0, 229, 255, 0.12)',
                  border: '1px solid rgba(0, 229, 255, 0.3)',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  marginBottom: '12px',
                  fontSize: '0.9rem',
                  color: '#00e5ff'
                }}>
                  <span>{player.weekendResult.chosenCard.icon}</span>
                  <span>{t(player.weekendResult.chosenCard.titleKey, { defaultValue: 'Weekend Choice' })}</span>
                </div>
              )}

              <h4 style={{ color: '#f1c40f', margin: '0 0 12px 0' }}>{t('weekendScreen.whatYouDid')}</h4>
              <p style={{ fontSize: '1.15em', fontStyle: 'italic', marginBottom: '18px', lineHeight: 1.4 }}>
                "{player.weekendResult.chosenCard ? player.weekendResult.chosenCard.fluff : (t(player.weekendResult.event.key, player.weekendResult.event.params as any) as string)}"
              </p>

              {modifications.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  justifyContent: 'center',
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.15)'
                }}>
                  {modifications.map((mod, idx) => {
                    const info = getStatInfo(mod.stat);
                    const isMoney = mod.stat === 'money';

                    let text: React.ReactNode = '';
                    let textSummary = '';
                    if (isMoney) {
                      text = mod.diff < 0 ? `-$${Math.abs(mod.diff)}` : (mod.diff > 0 ? `+$${mod.diff}` : `$0`);
                      textSummary = String(text);
                    } else {
                      const sign = mod.diff > 0 ? '+' : '';
                      textSummary = `${sign}${mod.diff} ${info.label}`;
                      text = info.icon ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {sign}{mod.diff} {info.icon}
                        </span>
                      ) : textSummary;
                    }

                    let isPositive = false;
                    let isNegative = false;
                    if (isMoney) {
                      if (mod.diff < 0) isNegative = true;
                      else if (mod.diff > 0) isPositive = true;
                    } else if (mod.stat === 'mess') {
                      if (mod.diff > 0) isNegative = true;
                      else if (mod.diff < 0) isPositive = true;
                    } else {
                      if (mod.diff > 0) isPositive = true;
                      else if (mod.diff < 0) isNegative = true;
                    }

                    let color = '#94a3b8';
                    let bg = 'rgba(148, 163, 184, 0.15)';
                    let border = '1px solid rgba(148, 163, 184, 0.3)';

                    if (isPositive) {
                      color = '#4ade80';
                      bg = 'rgba(74, 222, 128, 0.18)';
                      border = '1px solid rgba(74, 222, 128, 0.35)';
                    } else if (isNegative) {
                      color = mod.stat === 'mess' ? '#fb923c' : '#f87171';
                      bg = mod.stat === 'mess' ? 'rgba(251, 146, 60, 0.18)' : 'rgba(248, 113, 113, 0.18)';
                      border = mod.stat === 'mess' ? '1px solid rgba(251, 146, 60, 0.35)' : '1px solid rgba(248, 113, 113, 0.35)';
                    }

                    return (
                      <span
                        key={idx}
                        title={info.label}
                        aria-label={`${info.label}: ${textSummary}`}
                        dir="ltr"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontWeight: 'bold',
                          fontSize: '1em',
                          color,
                          backgroundColor: bg,
                          border,
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                          unicodeBidi: 'isolate'
                        }}
                      >
                        {text}
                      </span>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <p style={{ fontStyle: 'italic', color: '#aaa', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {t('weekendScreen.nothingSpecial')}
            </p>
          )}
        </div>
      </div>

      <button 
        onClick={onStartWeek}
        style={{
          padding: '10px 30px', fontSize: '1.2em', cursor: 'pointer', marginTop: '20px',
          backgroundColor: '#00e5ff', color: '#000', border: 'none', borderRadius: '4px',
          fontWeight: 'bold', boxShadow: '0 0 10px #00e5ff'
        }}
      >
        {t('weekendScreen.startWeek', { turn })}
      </button>
    </div>
  );
}

