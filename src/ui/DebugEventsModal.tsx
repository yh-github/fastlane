import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type GameState, type PlayerState } from '../engine/gameState';
import { type CampaignBundle } from '../engine/dataLoader';
import {
  type DebugEventType,
  type DebugQueuedEvent,
  checkEventPreconditions,
  DEBUG_EVENT_METAS,
} from '../engine/debugEvents';

interface DebugEventsModalProps {
  gameState: GameState;
  setGameState: (updater: GameState | ((prev: GameState | null) => GameState | null)) => void;
  campaign: CampaignBundle;
  onClose: () => void;
}

export function DebugEventsModal({ gameState, setGameState, campaign, onClose }: DebugEventsModalProps) {
  const { t } = useTranslation();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | 'global'>('global');
  const [expandedEvent, setExpandedEvent] = useState<DebugEventType | null>(null);

  // Form options state for events needing inputs
  const [crashSeverity, setCrashSeverity] = useState<'minor' | 'moderate' | 'major'>('moderate');
  const [lotteryTier, setLotteryTier] = useState<'small' | 'medium' | 'large'>('large');
  const [selectedApplianceId, setSelectedApplianceId] = useState<string>('');
  const [stolenApplianceIds, setStolenApplianceIds] = useState<string[]>([]);

  const selectedPlayer = gameState.players.find(p => p.id === selectedPlayerId);

  const minEconReading = gameState.rules.minEconomicReading ?? -30;
  const maxEconReading = 90;

  const handleUpdateEconomyIndex = (val: number) => {
    const clamped = Math.max(minEconReading, Math.min(maxEconReading, val));
    setGameState(prev => (prev ? { ...prev, economicIndex: clamped } : prev));
  };

  const handleUpdateEconomyTrend = (val: number) => {
    const clamped = Math.max(-3, Math.min(3, val));
    setGameState(prev => (prev ? { ...prev, economicTrend: clamped } : prev));
  };

  const isQueued = (type: DebugEventType, playerId?: string): DebugQueuedEvent | undefined => {
    return gameState.debugQueue?.find(
      e => e.type === type && (playerId ? e.playerId === playerId : !e.playerId)
    );
  };

  const handleQueueEvent = (type: DebugEventType, player?: PlayerState) => {
    const newEvent: DebugQueuedEvent = {
      id: `debug_${type}_${player?.id || 'global'}_${Date.now()}`,
      type,
      playerId: player?.id,
    };

    if (type === 'market_crash') {
      newEvent.crashSeverity = crashSeverity;
    } else if (type === 'lottery_win') {
      newEvent.lotteryTier = lotteryTier;
    } else if (type === 'appliance_break') {
      newEvent.applianceId = selectedApplianceId || player?.inventory.appliances[0]?.id;
    } else if (type === 'apartment_robbery' && stolenApplianceIds.length > 0) {
      newEvent.stolenItemIds = [...stolenApplianceIds];
    }

    setGameState(prev => {
      if (!prev) return prev;
      const currentQueue = prev.debugQueue || [];
      // Remove any existing instance of the same event for the same scope
      const filtered = currentQueue.filter(
        e => !(e.type === type && (player ? e.playerId === player.id : !e.playerId))
      );
      return {
        ...prev,
        debugQueue: [...filtered, newEvent],
      };
    });
  };

  const handleDequeueEvent = (type: DebugEventType, playerId?: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        debugQueue: (prev.debugQueue || []).filter(
          e => !(e.type === type && (playerId ? e.playerId === playerId : !e.playerId))
        ),
      };
    });
  };

  const handleClearAllQueue = () => {
    setGameState(prev => (prev ? { ...prev, debugQueue: [] } : prev));
  };

  const relevantMetas = DEBUG_EVENT_METAS.filter(m => (selectedPlayerId === 'global' ? m.isGlobal : !m.isGlobal));

  return (
    <div className="fullscreen-overlay" style={{ zIndex: 10000 }}>
      <div className="building-modal" style={{ maxWidth: '650px', maxHeight: '90vh' }}>
        <button className="building-modal__close" onClick={onClose}>
          ×
        </button>

        <div className="building-modal__header">
          <div className="building-modal__face">🛠️</div>
          <div className="building-modal__title-group">
            <h2>{t('debug.modalTitle', { defaultValue: 'Debug Events & Economy' })}</h2>
            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
              {t('debug.modalSubtitle', {
                defaultValue: 'Playtest rare events by bypassing RNG. Normal preconditions still apply.',
              })}
            </div>
          </div>
        </div>

        <div className="building-modal__content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Economy Controls Top Panel */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '8px',
              padding: '12px 16px',
              border: '1px solid rgba(0, 229, 255, 0.2)',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '10px', fontSize: '0.9rem' }}>
              📈 {t('debug.economyTitle', { defaultValue: 'Global Economy Controls' })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#bbb', marginBottom: '4px' }}>
                  {t('debug.economicIndex', { defaultValue: 'Economic Index (Reading)' })}:
                  <strong style={{ color: '#fff', marginInlineStart: '6px' }}>{gameState.economicIndex}</strong>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min={minEconReading}
                    max={maxEconReading}
                    value={gameState.economicIndex}
                    onChange={e => handleUpdateEconomyIndex(Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
                  />
                  <input
                    type="number"
                    min={minEconReading}
                    max={maxEconReading}
                    value={gameState.economicIndex}
                    onChange={e => handleUpdateEconomyIndex(Number(e.target.value))}
                    style={{
                      width: '55px',
                      background: '#111',
                      border: '1px solid #444',
                      color: '#fff',
                      borderRadius: '4px',
                      padding: '2px 4px',
                      textAlign: 'center',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.68rem', color: '#888', marginTop: '2px' }}>
                  Range: {minEconReading} to {maxEconReading}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#bbb', marginBottom: '4px' }}>
                  {t('debug.economicTrend', { defaultValue: 'Economic Trend (Momentum)' })}:
                  <strong style={{ color: '#fff', marginInlineStart: '6px' }}>{gameState.economicTrend}</strong>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min={-3}
                    max={3}
                    value={gameState.economicTrend}
                    onChange={e => handleUpdateEconomyTrend(Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--accent-amber)', cursor: 'pointer' }}
                  />
                  <input
                    type="number"
                    min={-3}
                    max={3}
                    value={gameState.economicTrend}
                    onChange={e => handleUpdateEconomyTrend(Number(e.target.value))}
                    style={{
                      width: '45px',
                      background: '#111',
                      border: '1px solid #444',
                      color: '#fff',
                      borderRadius: '4px',
                      padding: '2px 4px',
                      textAlign: 'center',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.68rem', color: '#888', marginTop: '2px' }}>Range: -3 to +3</div>
              </div>
            </div>
          </div>

          {/* Player / Scope Selector Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
            <button
              onClick={() => setSelectedPlayerId('global')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: selectedPlayerId === 'global' ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                background: selectedPlayerId === 'global' ? 'rgba(0, 229, 255, 0.15)' : 'rgba(0,0,0,0.3)',
                color: selectedPlayerId === 'global' ? 'var(--accent-cyan)' : '#aaa',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              🌐 Global Events
            </button>
            {gameState.players.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPlayerId(p.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: selectedPlayerId === p.id ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                  background: selectedPlayerId === p.id ? 'rgba(0, 229, 255, 0.15)' : 'rgba(0,0,0,0.3)',
                  color: selectedPlayerId === p.id ? 'var(--accent-cyan)' : '#aaa',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                👤 {p.name}
              </button>
            ))}
          </div>

          {/* Event List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {relevantMetas.map(meta => {
              const precheck = checkEventPreconditions(
                meta.type,
                gameState,
                campaign,
                selectedPlayerId === 'global' ? undefined : selectedPlayer
              );
              const queuedEntry = isQueued(meta.type, selectedPlayerId === 'global' ? undefined : selectedPlayer?.id);
              const isExpanded = expandedEvent === meta.type;

              return (
                <div
                  key={meta.type}
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    borderRadius: '8px',
                    border: queuedEntry
                      ? '1px solid var(--accent-amber)'
                      : precheck.allowed
                      ? '1px solid rgba(255,255,255,0.1)'
                      : '1px solid rgba(255, 50, 50, 0.2)',
                    padding: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                          {t(meta.titleKey, { defaultValue: meta.type.replaceAll('_', ' ').toUpperCase() })}
                        </span>
                        {queuedEntry && (
                          <span
                            style={{
                              background: 'rgba(255, 179, 0, 0.2)',
                              color: 'var(--accent-amber)',
                              border: '1px solid var(--accent-amber)',
                              fontSize: '0.7rem',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            ⚠️ QUEUED
                          </span>
                        )}
                        {!queuedEntry && precheck.allowed && (
                          <span
                            style={{
                              background: 'rgba(0, 230, 118, 0.2)',
                              color: '#00e676',
                              fontSize: '0.7rem',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            ✅ READY
                          </span>
                        )}
                        {!queuedEntry && !precheck.allowed && (
                          <span
                            style={{
                              background: 'rgba(255, 64, 129, 0.2)',
                              color: 'var(--accent-magenta)',
                              fontSize: '0.7rem',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            ❌ DISABLED
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#bbb' }}>
                        {t(meta.descKey, { defaultValue: 'Forces this event to occur next turn/trigger.' })}
                      </div>
                      {!precheck.allowed && (
                        <div style={{ fontSize: '0.75rem', color: '#ff6b8b', marginTop: '4px' }}>
                          ⚠️ {precheck.reason}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {/* Configuration toggle if event supports options */}
                      {['market_crash', 'lottery_win', 'appliance_break', 'apartment_robbery'].includes(meta.type) && (
                        <button
                          onClick={() => setExpandedEvent(isExpanded ? null : meta.type)}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: '#ccc',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                          }}
                        >
                          ⚙️ {isExpanded ? 'Hide Options' : 'Options'}
                        </button>
                      )}

                      {queuedEntry ? (
                        <button
                          onClick={() => handleDequeueEvent(meta.type, selectedPlayerId === 'global' ? undefined : selectedPlayer?.id)}
                          style={{
                            background: 'rgba(255, 64, 129, 0.2)',
                            border: '1px solid var(--accent-magenta)',
                            color: '#fff',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                          }}
                        >
                          Dequeue
                        </button>
                      ) : (
                        <button
                          disabled={!precheck.allowed}
                          onClick={() => handleQueueEvent(meta.type, selectedPlayerId === 'global' ? undefined : selectedPlayer)}
                          style={{
                            background: precheck.allowed ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
                            border: 'none',
                            color: precheck.allowed ? '#000' : '#666',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            cursor: precheck.allowed ? 'pointer' : 'not-allowed',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                          }}
                        >
                          {meta.type === 'street_robbery' ? 'Queue (Next Exit)' : 'Queue (Next Turn)'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Accordion Options Panel */}
                  {isExpanded && (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '10px',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '6px',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {meta.type === 'market_crash' && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#bbb', marginBottom: '6px' }}>
                            Crash Severity:
                          </label>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            {(['minor', 'moderate', 'major'] as const).map(sev => (
                              <label key={sev} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                <input
                                  type="radio"
                                  name="crash_sev"
                                  value={sev}
                                  checked={crashSeverity === sev}
                                  onChange={() => setCrashSeverity(sev)}
                                  style={{ accentColor: 'var(--accent-cyan)' }}
                                />
                                {sev.charAt(0).toUpperCase() + sev.slice(1)}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {meta.type === 'lottery_win' && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#bbb', marginBottom: '6px' }}>
                            Lottery Prize Tier:
                          </label>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name="lottery_tier"
                                checked={lotteryTier === 'small'}
                                onChange={() => setLotteryTier('small')}
                                style={{ accentColor: 'var(--accent-cyan)' }}
                              />
                              Small ($200)
                            </label>
                            <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name="lottery_tier"
                                checked={lotteryTier === 'medium'}
                                onChange={() => setLotteryTier('medium')}
                                style={{ accentColor: 'var(--accent-cyan)' }}
                              />
                              Medium ($500)
                            </label>
                            <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name="lottery_tier"
                                checked={lotteryTier === 'large'}
                                onChange={() => setLotteryTier('large')}
                                style={{ accentColor: 'var(--accent-cyan)' }}
                              />
                              Jackpot ($5,000)
                            </label>
                          </div>
                        </div>
                      )}

                      {meta.type === 'appliance_break' && selectedPlayer && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#bbb', marginBottom: '6px' }}>
                            Select Appliance to Break:
                          </label>
                          {selectedPlayer.inventory.appliances.length > 0 ? (
                            <select
                              value={selectedApplianceId || selectedPlayer.inventory.appliances[0]?.id}
                              onChange={e => setSelectedApplianceId(e.target.value)}
                              style={{
                                background: '#111',
                                border: '1px solid #444',
                                color: '#fff',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                width: '100%',
                              }}
                            >
                              {selectedPlayer.inventory.appliances.map((app, idx) => (
                                <option key={`${app.id}_${idx}`} value={app.id}>
                                  {app.name || app.id.replaceAll('_', ' ')} (${app.purchasePrice})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#888' }}>No appliances owned</span>
                          )}
                        </div>
                      )}

                      {meta.type === 'apartment_robbery' && selectedPlayer && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#bbb', marginBottom: '6px' }}>
                            Items to Steal (leave unchecked for random stolen items):
                          </label>
                          {selectedPlayer.inventory.appliances.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {selectedPlayer.inventory.appliances.map((app, idx) => (
                                <label
                                  key={`${app.id}_${idx}`}
                                  style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={stolenApplianceIds.includes(app.id)}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setStolenApplianceIds(prev => [...prev, app.id]);
                                      } else {
                                        setStolenApplianceIds(prev => prev.filter(id => id !== app.id));
                                      }
                                    }}
                                    style={{ accentColor: 'var(--accent-cyan)' }}
                                  />
                                  {app.name || app.id.replaceAll('_', ' ')} (${app.purchasePrice})
                                </label>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#888' }}>No appliances owned</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
          {(gameState.debugQueue?.length || 0) > 0 ? (
            <button
              onClick={handleClearAllQueue}
              style={{
                background: 'rgba(255, 64, 129, 0.15)',
                border: '1px solid var(--accent-magenta)',
                color: '#fff',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Clear All Queued ({gameState.debugQueue?.length})
            </button>
          ) : (
            <div />
          )}

          <button className="action-panel__btn" onClick={onClose}>
            {t('settings.close', { defaultValue: 'Close' })}
          </button>
        </div>
      </div>
    </div>
  );
}
