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
import { ApartmentMockupSandbox } from './buildings/home/ApartmentMockupSandbox';
import { MessIcon } from './icons/MessIcon';

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

  const [isMockupSandboxOpen, setIsMockupSandboxOpen] = useState<boolean>(false);
  const [applianceConditionToAdd, setApplianceConditionToAdd] = useState<'new' | 'used'>('new');

  const selectedPlayer = gameState.players.find(p => p.id === selectedPlayerId);

  const handleUpdatePlayerCash = (delta: number) => {
    if (!selectedPlayer) return;
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map(p => p.id === selectedPlayer.id ? { ...p, money: Math.max(0, p.money + delta) } : p)
      };
    });
  };

  const handleSetPlayerCash = (val: number) => {
    if (!selectedPlayer) return;
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map(p => p.id === selectedPlayer.id ? { ...p, money: Math.max(0, val) } : p)
      };
    });
  };

  const handleSetPlayerMess = (val: number) => {
    if (!selectedPlayer) return;
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map(p => p.id === selectedPlayer.id ? { ...p, mess: Math.max(0, val) } : p)
      };
    });
  };

  const handleSetPlayerHousing = (housingId: string) => {
    if (!selectedPlayer) return;
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map(p => p.id === selectedPlayer.id ? { ...p, currentHousingId: housingId } : p)
      };
    });
  };

  const handleToggleAppliance = (itemId: string) => {
    if (!selectedPlayer) return;
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map(p => {
          if (p.id !== selectedPlayer.id) return p;
          const exists = p.inventory.appliances.some(a => a.id === itemId);
          const updated = exists
            ? p.inventory.appliances.filter(a => a.id !== itemId)
            : [...p.inventory.appliances, {
                id: itemId,
                purchasePrice: 200,
                purchaseSource: applianceConditionToAdd === 'new' ? ('socket_city' as const) : ('z_mart' as const),
                condition: applianceConditionToAdd
              }];
          return {
            ...p,
            inventory: {
              ...p.inventory,
              appliances: updated
            }
          };
        })
      };
    });
  };

  const handleToggleBook = (bookId: string) => {
    if (!selectedPlayer) return;
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map(p => {
          if (p.id !== selectedPlayer.id) return p;
          const currentBooks = p.inventory.books || [];
          const exists = currentBooks.includes(bookId);
          const updated = exists ? currentBooks.filter(b => b !== bookId) : [...currentBooks, bookId];
          return {
            ...p,
            inventory: {
              ...p.inventory,
              books: updated
            }
          };
        })
      };
    });
  };

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
      newEvent.stolenItemIds = stolenApplianceIds;
    }

    setGameState(prev => {
      if (!prev) return prev;
      const filtered = (prev.debugQueue || []).filter(
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
    <div className="fullscreen-overlay debug-events-modal-overlay">
      <div 
        className="building-modal debug-events-modal-content"
        data-testid="debug-events-modal-content"
      >
        <button 
          className="building-modal__close debug-events-modal__close" 
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="building-modal__header">
          <div className="building-modal__face">🛠️</div>
          <div className="building-modal__title-group">
            <h2>{t('debug.modalTitle', { defaultValue: 'Debug Events & Economy' })}</h2>
            <div style={{ fontSize: '0.8rem', color: '#aaa', lineHeight: 1.3 }}>
              {t('debug.modalSubtitle', {
                defaultValue: 'Playtest rare events by bypassing RNG. Normal preconditions still apply.',
              })}
            </div>
          </div>
        </div>

        <div className="building-modal__content debug-events-modal__body">
          {/* Economy Controls Top Panel */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '8px',
              padding: '12px 14px',
              border: '1px solid rgba(0, 229, 255, 0.2)',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '8px', fontSize: '0.9rem' }}>
              📈 {t('debug.economyTitle', { defaultValue: 'Global Economy Controls' })}
            </div>
            <div className="debug-economy-grid">
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
                    style={{ flex: 1, accentColor: 'var(--accent-cyan)', cursor: 'pointer', height: '28px' }}
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
                      padding: '4px',
                      textAlign: 'center',
                      minHeight: '32px'
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
                    style={{ flex: 1, accentColor: 'var(--accent-amber)', cursor: 'pointer', height: '28px' }}
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
                      padding: '4px',
                      textAlign: 'center',
                      minHeight: '32px'
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.68rem', color: '#888', marginTop: '2px' }}>Range: -3 to +3</div>
              </div>
            </div>
          </div>

          {/* Player / Scope Selector Tabs */}
          <div className="debug-player-tabs" role="tablist">
            <button
              onClick={() => setSelectedPlayerId('global')}
              className="debug-player-tab"
              style={{
                border: selectedPlayerId === 'global' ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                background: selectedPlayerId === 'global' ? 'rgba(0, 229, 255, 0.15)' : 'rgba(0,0,0,0.3)',
                color: selectedPlayerId === 'global' ? 'var(--accent-cyan)' : '#aaa',
              }}
            >
              🌐 Global Events
            </button>
            {gameState.players.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPlayerId(p.id)}
                className="debug-player-tab"
                style={{
                  border: selectedPlayerId === p.id ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                  background: selectedPlayerId === p.id ? 'rgba(0, 229, 255, 0.15)' : 'rgba(0,0,0,0.3)',
                  color: selectedPlayerId === p.id ? 'var(--accent-cyan)' : '#aaa',
                }}
              >
                👤 {p.name}
              </button>
            ))}
          </div>

          {/* Player State & Apartment Sandbox Controls */}
          {selectedPlayerId !== 'global' && selectedPlayer && (
            <div
              style={{
                background: 'rgba(20, 26, 46, 0.75)',
                borderRadius: '8px',
                padding: '12px 14px',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontWeight: 600, color: 'var(--accent-cyan)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🛠️ Player & Apartment Sandbox ({selectedPlayer.name})
                </div>
                <button
                  onClick={() => setIsMockupSandboxOpen(true)}
                  style={{
                    padding: '6px 12px',
                    background: 'linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    minHeight: '34px',
                    touchAction: 'manipulation'
                  }}
                >
                  🎨 Open Mockup Playground
                </button>
              </div>

              {/* Cash Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', color: '#bbb', minWidth: '85px' }}>
                  💰 Cash: <strong style={{ color: '#85ffb5' }}>${selectedPlayer.money}</strong>
                </span>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleUpdatePlayerCash(500)}
                    style={{ padding: '4px 10px', fontSize: '0.76rem', background: '#1e293b', color: '#85ffb5', border: '1px solid #334155', borderRadius: '5px', cursor: 'pointer', minHeight: '32px', touchAction: 'manipulation' }}
                  >
                    +$500
                  </button>
                  <button
                    onClick={() => handleUpdatePlayerCash(2000)}
                    style={{ padding: '4px 10px', fontSize: '0.76rem', background: '#1e293b', color: '#85ffb5', border: '1px solid #334155', borderRadius: '5px', cursor: 'pointer', minHeight: '32px', touchAction: 'manipulation' }}
                  >
                    +$2,000
                  </button>
                  <button
                    onClick={() => handleUpdatePlayerCash(10000)}
                    style={{ padding: '4px 10px', fontSize: '0.76rem', background: '#1e293b', color: '#85ffb5', border: '1px solid #334155', borderRadius: '5px', cursor: 'pointer', minHeight: '32px', touchAction: 'manipulation' }}
                  >
                    +$10,000
                  </button>
                  <button
                    onClick={() => handleUpdatePlayerCash(-500)}
                    style={{ padding: '4px 10px', fontSize: '0.76rem', background: '#1e293b', color: '#ff8585', border: '1px solid #334155', borderRadius: '5px', cursor: 'pointer', minHeight: '32px', touchAction: 'manipulation' }}
                  >
                    -$500
                  </button>
                  <button
                    onClick={() => handleSetPlayerCash(0)}
                    style={{ padding: '4px 10px', fontSize: '0.76rem', background: '#1e293b', color: '#aaa', border: '1px solid #334155', borderRadius: '5px', cursor: 'pointer', minHeight: '32px', touchAction: 'manipulation' }}
                  >
                    $0 (Broke)
                  </button>
                </div>
              </div>

              {/* Mess Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', color: '#bbb', minWidth: '85px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <MessIcon size="1.2em" /> Mess: <strong style={{ color: (selectedPlayer.mess ?? 0) > 20 ? '#e74c3c' : '#f39c12' }}>{selectedPlayer.mess ?? 0}</strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={selectedPlayer.mess ?? 0}
                  onChange={(e) => handleSetPlayerMess(Number(e.target.value))}
                  style={{ width: '110px', accentColor: '#f39c12', cursor: 'pointer', height: '28px' }}
                />
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleSetPlayerMess(0)}
                    style={{ padding: '4px 8px', fontSize: '0.76rem', background: '#1e293b', color: '#85ffb5', border: '1px solid #334155', borderRadius: '5px', cursor: 'pointer', minHeight: '32px', touchAction: 'manipulation' }}
                  >
                    0 (Clean)
                  </button>
                  <button
                    onClick={() => handleSetPlayerMess(15)}
                    style={{ padding: '4px 8px', fontSize: '0.76rem', background: '#1e293b', color: '#f39c12', border: '1px solid #334155', borderRadius: '5px', cursor: 'pointer', minHeight: '32px', touchAction: 'manipulation' }}
                  >
                    15
                  </button>
                  <button
                    onClick={() => handleSetPlayerMess(30)}
                    style={{ padding: '4px 8px', fontSize: '0.76rem', background: '#1e293b', color: '#e74c3c', border: '1px solid #334155', borderRadius: '5px', cursor: 'pointer', minHeight: '32px', touchAction: 'manipulation' }}
                  >
                    30 (Dirty)
                  </button>
                  <button
                    onClick={() => handleSetPlayerMess(50)}
                    style={{ padding: '4px 8px', fontSize: '0.76rem', background: '#1e293b', color: '#e74c3c', border: '1px solid #334155', borderRadius: '5px', cursor: 'pointer', minHeight: '32px', touchAction: 'manipulation' }}
                  >
                    50 (Max)
                  </button>
                </div>
              </div>

              {/* Housing Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', color: '#bbb', minWidth: '85px' }}>
                  🏠 Housing:
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'low_cost', name: 'Low-Cost (10)', icon: '🏚️' },
                    { id: 'security_apartments', name: 'Security (15)', icon: '🏢' },
                    { id: 'penthouse', name: 'Penthouse (25)', icon: '🏙️' }
                  ].map(h => (
                    <button
                      key={h.id}
                      onClick={() => handleSetPlayerHousing(h.id)}
                      style={{
                        padding: '5px 10px',
                        fontSize: '0.76rem',
                        background: selectedPlayer.currentHousingId === h.id ? 'rgba(0, 229, 255, 0.2)' : '#1e293b',
                        color: selectedPlayer.currentHousingId === h.id ? '#00e5ff' : '#ccc',
                        border: selectedPlayer.currentHousingId === h.id ? '1px solid #00e5ff' : '1px solid #334155',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontWeight: selectedPlayer.currentHousingId === h.id ? 'bold' : 'normal',
                        minHeight: '34px',
                        touchAction: 'manipulation'
                      }}
                    >
                      {h.icon} {h.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Durables Toggle Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#aaa', fontWeight: 600 }}>
                    🛋️ Appliances ({selectedPlayer.inventory.appliances.length}) & Books ({selectedPlayer.inventory.books?.length || 0}):
                  </span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.72rem' }}>
                    <span style={{ color: '#888' }}>Add Condition:</span>
                    <button
                      onClick={() => setApplianceConditionToAdd('new')}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.72rem',
                        background: applianceConditionToAdd === 'new' ? '#064e3b' : '#111',
                        color: applianceConditionToAdd === 'new' ? '#85ffb5' : '#777',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        minHeight: '28px',
                        touchAction: 'manipulation'
                      }}
                    >
                      ✨ New
                    </button>
                    <button
                      onClick={() => setApplianceConditionToAdd('used')}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.72rem',
                        background: applianceConditionToAdd === 'used' ? '#075985' : '#111',
                        color: applianceConditionToAdd === 'used' ? '#85c1e9' : '#777',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        minHeight: '28px',
                        touchAction: 'manipulation'
                      }}
                    >
                      📦 Used
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {[
                    'refrigerator', 'freezer', 'stove', 'microwave',
                    'color_tv', 'bw_tv', 'stereo', 'vcr', 'computer', 'hot_tub'
                  ].map(id => {
                    const owned = selectedPlayer.inventory.appliances.some(a => a.id === id);
                    const itemApp = selectedPlayer.inventory.appliances.find(a => a.id === id);
                    const isNew = itemApp?.condition === 'new' || itemApp?.purchaseSource === 'socket_city';
                    const displayName = id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                    return (
                      <button
                        key={id}
                        onClick={() => handleToggleAppliance(id)}
                        style={{
                          padding: '4px 9px',
                          fontSize: '0.74rem',
                          background: owned ? (isNew ? 'rgba(46, 204, 113, 0.2)' : 'rgba(52, 152, 219, 0.2)') : 'rgba(255,255,255,0.03)',
                          color: owned ? (isNew ? '#85ffb5' : '#85c1e9') : '#888',
                          border: owned ? (isNew ? '1px solid #2ecc71' : '1px solid #3498db') : '1px dashed #444',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          minHeight: '32px',
                          touchAction: 'manipulation'
                        }}
                      >
                        {owned ? (isNew ? '✨' : '📦') : '+'} {displayName}
                      </button>
                    );
                  })}

                  {['dictionary', 'encyclopedia', 'atlas'].map(bId => {
                    const owned = selectedPlayer.inventory.books?.includes(bId);
                    const displayName = bId.charAt(0).toUpperCase() + bId.slice(1);

                    return (
                      <button
                        key={bId}
                        onClick={() => handleToggleBook(bId)}
                        style={{
                          padding: '4px 9px',
                          fontSize: '0.74rem',
                          background: owned ? 'rgba(155, 89, 182, 0.2)' : 'rgba(255,255,255,0.03)',
                          color: owned ? '#d7bde2' : '#888',
                          border: owned ? '1px solid #9b59b6' : '1px dashed #444',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          minHeight: '32px',
                          touchAction: 'manipulation'
                        }}
                      >
                        {owned ? '📚' : '+'} {displayName}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Event List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                  className="debug-event-card"
                  style={{
                    border: queuedEntry
                      ? '1px solid var(--accent-amber)'
                      : precheck.allowed
                      ? '1px solid rgba(255,255,255,0.1)'
                      : '1px solid rgba(255, 50, 50, 0.2)',
                  }}
                >
                  <div className="debug-event-card__inner">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>
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
                              whiteSpace: 'nowrap'
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
                              whiteSpace: 'nowrap'
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
                              whiteSpace: 'nowrap'
                            }}
                          >
                            ❌ DISABLED
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#bbb', lineHeight: 1.35 }}>
                        {t(meta.descKey, { defaultValue: 'Forces this event to occur next turn/trigger.' })}
                      </div>
                      {!precheck.allowed && (
                        <div style={{ fontSize: '0.74rem', color: '#ff6b8b', marginTop: '4px', lineHeight: 1.3 }}>
                          ⚠️ {precheck.reason}
                        </div>
                      )}
                    </div>

                    <div className="debug-event-card__controls">
                      {/* Configuration toggle if event supports options */}
                      {['market_crash', 'lottery_win', 'appliance_break', 'apartment_robbery'].includes(meta.type) && (
                        <button
                          onClick={() => setExpandedEvent(isExpanded ? null : meta.type)}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: '#ccc',
                            borderRadius: '5px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            fontSize: '0.76rem',
                            minHeight: '36px',
                            touchAction: 'manipulation'
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
                            padding: '6px 14px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            minHeight: '36px',
                            touchAction: 'manipulation'
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
                            padding: '6px 14px',
                            cursor: precheck.allowed ? 'pointer' : 'not-allowed',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            minHeight: '36px',
                            touchAction: 'manipulation'
                          }}
                        >
                          {meta.type === 'street_robbery' ? 'Queue (Next Exit / Turn End)' : 'Queue (Next Turn)'}
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
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {(['minor', 'moderate', 'major'] as const).map(sev => (
                              <label key={sev} style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', minHeight: '30px' }}>
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
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <label style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', minHeight: '30px' }}>
                              <input
                                type="radio"
                                name="lottery_tier"
                                checked={lotteryTier === 'small'}
                                onChange={() => setLotteryTier('small')}
                                style={{ accentColor: 'var(--accent-cyan)' }}
                              />
                              Small ($200)
                            </label>
                            <label style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', minHeight: '30px' }}>
                              <input
                                type="radio"
                                name="lottery_tier"
                                checked={lotteryTier === 'medium'}
                                onChange={() => setLotteryTier('medium')}
                                style={{ accentColor: 'var(--accent-cyan)' }}
                              />
                              Medium ($500)
                            </label>
                            <label style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', minHeight: '30px' }}>
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
                                padding: '6px 10px',
                                borderRadius: '5px',
                                width: '100%',
                                minHeight: '36px',
                                fontSize: '0.85rem'
                              }}
                            >
                              {selectedPlayer.inventory.appliances.map((app, idx) => (
                                <option key={`${app.id}_${idx}`} value={app.id}>
                                  {campaign?.items?.find(i => i.id === app.id)?.name || app.id.replaceAll('_', ' ')} (${app.purchasePrice})
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {selectedPlayer.inventory.appliances.map((app, idx) => (
                                <label
                                  key={`${app.id}_${idx}`}
                                  style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', minHeight: '28px' }}
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
                                  {campaign?.items?.find(i => i.id === app.id)?.name || app.id.replaceAll('_', ' ')} (${app.purchasePrice})
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

        <div className="debug-modal-footer">
          {(gameState.debugQueue?.length || 0) > 0 ? (
            <button
              onClick={handleClearAllQueue}
              className="action-panel__btn"
              style={{
                background: 'rgba(255, 64, 129, 0.15)',
                border: '1px solid var(--accent-magenta)',
                color: '#fff',
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

      {isMockupSandboxOpen && (
        <ApartmentMockupSandbox
          campaign={campaign}
          onClose={() => setIsMockupSandboxOpen(false)}
          onApplyToPlayer={selectedPlayer ? (state) => {
            setGameState(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                players: prev.players.map(p => p.id === selectedPlayer.id ? {
                  ...p,
                  currentHousingId: state.housingId,
                  mess: state.mess,
                  money: state.money,
                  inventory: {
                    ...p.inventory,
                    appliances: state.appliances,
                    books: state.books
                  }
                } : p)
              };
            });
          } : undefined}
        />
      )}
    </div>
  );
}
