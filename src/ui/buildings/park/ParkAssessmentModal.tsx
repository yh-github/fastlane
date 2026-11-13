import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerState, GameRules, MiniGameOption, StatModification } from '../../../engine/gameState';
import {
  PARK_RELAX_CARDS,
  PARK_WORKOUT_CARDS,
  PARK_HAZARD_CARDS,
  scaleParkCard
} from '../../../engine/actions/parkActions';
import { formatHours } from '../../../engine/math/formatters';
import { roundToResolution } from '../../../engine/statMath';
import { StatModifierPills } from '../../StatModifierPills';

export interface ParkAssessmentModalProps {
  mode: 'relax' | 'workout';
  player: PlayerState;
  rules?: GameRules;
  onClose: () => void;
}

function cardToMods(c: MiniGameOption): StatModification[] {
  const mods: StatModification[] = [];
  if (c.maxPhysAmount) mods.push({ stat: 'maxPhysical', diff: c.maxPhysAmount });
  if (c.maxMentalAmount) mods.push({ stat: 'maxMental', diff: c.maxMentalAmount });
  if (c.physicalAmount) mods.push({ stat: 'physical', diff: c.physicalAmount });
  if (c.mentalAmount) mods.push({ stat: 'mental', diff: c.mentalAmount });
  if (c.socialAmount) mods.push({ stat: 'social', diff: c.socialAmount });
  if (c.cashAmount) mods.push({ stat: 'money', diff: c.cashAmount });
  if (c.durabilityAmount) mods.push({ stat: 'clothes', diff: c.durabilityAmount });
  return mods;
}

export const ParkAssessmentModal: React.FC<ParkAssessmentModalProps> = ({
  mode,
  player,
  rules,
  onClose
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'cards' | 'hazards'>('overview');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const costHours = 3;
  const allowPartial = Boolean(rules?.allowPartialHours || rules?.proportionalDivisibleActions);
  const actualHours = allowPartial ? Math.min(costHours, player.hoursRemaining) : costHours;
  const ratio = actualHours / costHours;
  const isPartial = allowPartial && actualHours < costHours;
  const conditionRes = rules?.conditionResolution ?? 0.5;

  const phys = player.physicalCondition ?? 50;
  const mental = player.mentalCondition ?? 50;
  const workoutsThisTurn = player.turnFlags?.parkWorkoutsThisTurn || 0;
  const isOvertraining = mode === 'workout' && workoutsThisTurn > 0;

  // Fatigue mistake chance calculation
  let mistakeChance = 0;
  if (mode === 'workout' && (phys < 20 || mental < 20)) {
    mistakeChance = Math.min(0.60, Math.max(0, (20 - phys) * 0.05) + Math.max(0, (20 - mental) * 0.05));
  }

  // Pickpocket dynamic calculation
  const getDynamicHazardPool = (): MiniGameOption[] => {
    return PARK_HAZARD_CARDS.map(raw => {
      let card = structuredClone(raw);
      if (card.cardId === 'hazard_pickpocket') {
        if (player.money >= 150) {
          const stolen = Math.min(100, Math.max(25, Math.floor(player.money * 0.15)));
          card = {
            ...card,
            cashAmount: -stolen,
            mentalAmount: -2,
            description: `A pickpocket bumps into you in the crowd and steals $${stolen} cash!`
          };
        } else {
          card = {
            ...card,
            cashAmount: 0,
            mentalAmount: -1,
            description: 'A pickpocket targets you but finds empty pockets ($0 stolen).'
          };
        }
      }
      return isPartial ? scaleParkCard(card, ratio, conditionRes) : card;
    });
  };

  const rawDeck = mode === 'relax' ? PARK_RELAX_CARDS : PARK_WORKOUT_CARDS;
  const computedCards = rawDeck.map(c => isPartial ? scaleParkCard(c, ratio, conditionRes) : c);
  const computedHazards = getDynamicHazardPool();

  // Summary ranges
  const calcRange = (key: keyof MiniGameOption) => {
    const vals = computedCards.map(c => (c[key] as number) || 0);
    return { min: Math.min(...vals), max: Math.max(...vals) };
  };

  const mentalRange = calcRange('mentalAmount');
  const physRange = calcRange('physicalAmount');
  const maxPhysRange = calcRange('maxPhysAmount');
  const maxMentalRange = calcRange('maxMentalAmount');
  const socialRange = calcRange('socialAmount');
  const cashRange = calcRange('cashAmount');

  const modalTitle = mode === 'relax'
    ? t('park.helpRelaxTitle', { defaultValue: '🌳 Park Relax — Encounter & Outcome Assessment' })
    : t('park.helpWorkoutTitle', { defaultValue: '🏃 Park Workout — Training & Hazard Assessment' });

  return (
    <div
      className="modal-overlay"
      data-testid="park-assessment-modal"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
        padding: '16px',
        userSelect: 'none'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'linear-gradient(160deg, #1e222d, #11141c)',
          border: '1px solid #38bdf8',
          borderRadius: '12px',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.7), 0 0 24px rgba(56, 189, 248, 0.2)',
          maxWidth: '620px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          color: '#f8fafc',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>{mode === 'relax' ? '🌳' : '🏃'}</span>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#38bdf8', fontWeight: 'bold' }}>
              {modalTitle}
            </h3>
          </div>
          <button
            type="button"
            data-testid="btn-close-park-help"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(0, 0, 0, 0.2)'
          }}
        >
          <button
            type="button"
            data-testid="park-help-tab-overview"
            onClick={() => setActiveTab('overview')}
            style={{
              flex: 1,
              padding: '10px 8px',
              background: activeTab === 'overview' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'overview' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'overview' ? '#38bdf8' : '#94a3b8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            📊 {t('park.tabOverview', { defaultValue: 'Overview & Odds' })}
          </button>
          <button
            type="button"
            data-testid="park-help-tab-cards"
            onClick={() => setActiveTab('cards')}
            style={{
              flex: 1,
              padding: '10px 8px',
              background: activeTab === 'cards' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'cards' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'cards' ? '#38bdf8' : '#94a3b8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            🎴 {mode === 'relax' ? t('park.tabCardsRelax', { defaultValue: 'Encounter Cards (8)' }) : t('park.tabCardsWorkout', { defaultValue: 'Workout Focus (7)' })}
          </button>
          <button
            type="button"
            data-testid="park-help-tab-hazards"
            onClick={() => setActiveTab('hazards')}
            style={{
              flex: 1,
              padding: '10px 8px',
              background: activeTab === 'hazards' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'hazards' ? '2px solid #ef4444' : '2px solid transparent',
              color: activeTab === 'hazards' ? '#f87171' : '#94a3b8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            ⚠️ {t('park.tabHazards', { defaultValue: 'Hazards Deck (6)' })}
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {activeTab === 'overview' && (
            <>
              {/* Baseline Benefits Box */}
              <div
                style={{
                  background: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: '8px',
                  padding: '12px 14px'
                }}
              >
                <div style={{ fontSize: '11px', color: '#86efac', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 'bold' }}>
                  {t('park.baselineTitle', { defaultValue: 'Guaranteed Activity Baseline (Applied on Click)' })}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  {mode === 'relax' ? (
                    <>
                      <span style={{ fontSize: '13px', color: '#4ade80', fontWeight: 'bold' }}>
                        +{isPartial ? Math.max(conditionRes, roundToResolution(2 * ratio, conditionRes)) : 2} 💪 Physical
                      </span>
                      <span style={{ fontSize: '13px', color: '#a855f7', fontWeight: 'bold' }}>
                        +{isPartial ? Math.max(conditionRes, roundToResolution(2 * ratio, conditionRes)) : 2} 🧠 Mental
                      </span>
                      {player.turnFlags?.parkRelaxesThisTurn ? (
                        <span style={{ fontSize: '11px', color: '#facc15' }}>
                          ({t('park.diminishedRepeat', { defaultValue: 'Diminished on repeat visits' })})
                        </span>
                      ) : null}
                    </>
                  ) : isOvertraining ? (
                    <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: 'bold' }}>
                      -2 💪 Physical, -1 🧠 Mental (Overtraining Exhaustion)
                    </span>
                  ) : (
                    <>
                      <span style={{ fontSize: '13px', color: '#fdba74', fontWeight: 'bold' }}>
                        +{isPartial ? roundToResolution(1 * ratio, conditionRes) : 1} Max 💪
                      </span>
                      <span style={{ fontSize: '13px', color: '#f87171', fontWeight: 'bold' }}>
                        -{isPartial ? Math.max(conditionRes, roundToResolution(1 * ratio, conditionRes)) : 1} 💪 Physical
                      </span>
                      <span style={{ fontSize: '13px', color: '#a855f7', fontWeight: 'bold' }}>
                        +{isPartial ? Math.max(conditionRes, roundToResolution(1 * ratio, conditionRes)) : 1} 🧠 Mental
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Timing & Scaling Box */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '12px 14px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>{t('park.timeCostLabel', { defaultValue: 'Activity Time Required:' })}</span>
                  <span style={{ fontWeight: 'bold', color: '#facc15' }}>⏳ {formatHours(actualHours)}h / {costHours}h</span>
                </div>
                {isPartial && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '6px 10px', borderRadius: '4px' }}>
                    ℹ️ <strong>Proportional Divisible Scaling:</strong> Because only {formatHours(actualHours)}h are remaining, all card outcomes are scaled to {Math.round(ratio * 100)}% of full strength!
                  </div>
                )}
                {isOvertraining && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.15)', padding: '6px 10px', borderRadius: '4px' }}>
                    ⚠️ <strong>Overtraining Notice:</strong> You have already worked out in the park this turn! Pushing through another workout will trigger exhaustion (-2 💪, -1 🧠) with no positive training cards.
                  </div>
                )}
              </div>

              {/* Odds Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#86efac', textTransform: 'uppercase' }}>🌟 Encounter Odds</div>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#4ade80' }}>75%</div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1' }}>1 Card (Pick 1 of 3)</div>
                </div>

                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#fca5a5', textTransform: 'uppercase' }}>⚠️ Hazard Risk</div>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#f87171' }}>25%</div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1' }}>1 Mishap Card</div>
                </div>

                {mode === 'workout' && (
                  <div style={{ background: mistakeChance > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)', border: mistakeChance > 0 ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: mistakeChance > 0 ? '#fde047' : '#94a3b8', textTransform: 'uppercase' }}>🩹 Strain Risk</div>
                    <div style={{ fontSize: '22px', fontWeight: 'bold', color: mistakeChance > 0 ? '#f59e0b' : '#38bdf8' }}>
                      {Math.round(mistakeChance * 100)}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                      {mistakeChance > 0 ? 'Low condition risk' : 'Condition nominal'}
                    </div>
                  </div>
                )}
              </div>

              {/* Expected Outcome Ranges */}
              <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '12px 14px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>
                  {t('park.expectedRangesTitle', { defaultValue: 'Expected Event Card Bonus Range (Good Outcomes)' })}
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {maxPhysRange.max > 0 && (
                    <span style={{ fontSize: '12px', background: 'rgba(249, 115, 22, 0.15)', border: '1px solid #f97316', padding: '4px 8px', borderRadius: '4px', color: '#fdba74' }}>
                      💪 Max Physical: +{maxPhysRange.min} to +{maxPhysRange.max}
                    </span>
                  )}
                  {maxMentalRange.max > 0 && (
                    <span style={{ fontSize: '12px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid #a855f7', padding: '4px 8px', borderRadius: '4px', color: '#d8b4fe' }}>
                      🧠 Max Mental: +{maxMentalRange.min} to +{maxMentalRange.max}
                    </span>
                  )}
                  {physRange.max !== 0 || physRange.min !== 0 ? (
                    <span style={{ fontSize: '12px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', padding: '4px 8px', borderRadius: '4px', color: '#7dd3fc' }}>
                      💪 Physical: {physRange.min > 0 ? `+${physRange.min}` : physRange.min} to {physRange.max > 0 ? `+${physRange.max}` : physRange.max}
                    </span>
                  ) : null}
                  {mentalRange.max !== 0 || mentalRange.min !== 0 ? (
                    <span style={{ fontSize: '12px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid #a855f7', padding: '4px 8px', borderRadius: '4px', color: '#d8b4fe' }}>
                      🧠 Mental: {mentalRange.min > 0 ? `+${mentalRange.min}` : mentalRange.min} to +{mentalRange.max}
                    </span>
                  ) : null}
                  {socialRange.max > 0 && (
                    <span style={{ fontSize: '12px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid #6366f1', padding: '4px 8px', borderRadius: '4px', color: '#a5b4fc' }}>
                      👥 Social: +{socialRange.min} to +{socialRange.max}
                    </span>
                  )}
                  {cashRange.max > 0 && (
                    <span style={{ fontSize: '12px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', padding: '4px 8px', borderRadius: '4px', color: '#86efac' }}>
                      💵 Loose Cash: $0 to +${cashRange.max}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'cards' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {isPartial ? `All card effects dynamically scaled to ${Math.round(ratio * 100)}%:` : 'Standard full session card pool:'}
              </span>
              {computedCards.map((c, idx) => (
                <div
                  key={c.cardId || idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '18px' }}>{c.icon || '🎴'}</span>
                      <strong style={{ fontSize: '14px', color: '#f8fafc' }}>{c.title}</strong>
                      {c.badge && (
                        <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px' }}>
                          {c.badge}
                        </span>
                      )}
                    </div>
                    <StatModifierPills modifications={cardToMods(c)} />
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{c.description}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'hazards' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#f87171' }}>
                ⚠️ 25% chance to encounter 1 random hazard from this pool:
              </span>
              {computedHazards.map((h, idx) => (
                <div
                  key={h.cardId || idx}
                  style={{
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '18px' }}>{h.icon || '⚠️'}</span>
                      <strong style={{ fontSize: '14px', color: '#fca5a5' }}>{h.title}</strong>
                    </div>
                    <StatModifierPills modifications={cardToMods(h)} />
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#cbd5e1' }}>{h.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Close Button */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="game-button btn-secondary"
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '6px'
            }}
          >
            {t('common.close', { defaultValue: 'Close' })}
          </button>
        </div>
      </div>
    </div>
  );
};
