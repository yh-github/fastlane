import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CampaignBundle } from '../../../engine/dataLoader';
import type { OwnedAppliance } from '../../../engine/gameState';
import { LeisureCards } from './LeisureCards';
import { ChoresCards } from './ChoresCards';
import { PantryCard } from './PantryCard';
import { HomeCardDeck } from './HomeCardDeck';

interface ApartmentMockupSandboxProps {
  campaign?: CampaignBundle;
  onClose: () => void;
  onApplyToPlayer?: (state: {
    housingId: string;
    mess: number;
    money: number;
    appliances: OwnedAppliance[];
    books: string[];
  }) => void;
}

const ALL_APPLIANCES = [
  { id: 'refrigerator', name: 'Refrigerator', space: 4, category: 'kitchen', defaultSource: 'socket_city' },
  { id: 'freezer', name: 'Freezer', space: 3, category: 'kitchen', defaultSource: 'z_mart' },
  { id: 'stove', name: 'Stove', space: 4, category: 'kitchen', defaultSource: 'socket_city' },
  { id: 'microwave', name: 'Microwave', space: 2, category: 'kitchen', defaultSource: 'z_mart' },
  { id: 'color_tv', name: 'Color TV', space: 2, category: 'living', defaultSource: 'socket_city' },
  { id: 'bw_tv', name: 'B&W TV', space: 2, category: 'living', defaultSource: 'z_mart' },
  { id: 'stereo', name: 'Stereo', space: 2, category: 'living', defaultSource: 'socket_city' },
  { id: 'vcr', name: 'VCR', space: 1, category: 'living', defaultSource: 'z_mart' },
  { id: 'computer', name: 'Computer', space: 4, category: 'study', defaultSource: 'socket_city' },
  { id: 'hot_tub', name: 'Hot Tub', space: 9, category: 'luxury', defaultSource: 'socket_city' }
];

const ALL_BOOKS = [
  { id: 'dictionary', name: 'Dictionary', space: 1, category: 'study' },
  { id: 'encyclopedia', name: 'Encyclopedia', space: 2, category: 'study' },
  { id: 'atlas', name: 'Atlas', space: 1, category: 'study' }
];

const HOUSING_OPTIONS = [
  { id: 'low_cost', name: 'Low-Cost Housing', spaceCap: 10, maxMess: 50, icon: '🏚️' },
  { id: 'security_apartments', name: 'Security Apartments', spaceCap: 15, maxMess: 75, icon: '🏢' },
  { id: 'penthouse', name: 'Penthouse Suite', spaceCap: 25, maxMess: 125, icon: '🏙️' }
];

export const ApartmentMockupSandbox: React.FC<ApartmentMockupSandboxProps> = ({
  campaign,
  onClose,
  onApplyToPlayer
}) => {
  const { t: _t } = useTranslation();

  // Sandbox Live Controls State
  const [selectedHousingId, setSelectedHousingId] = useState<string>('low_cost');
  const [mess, setMess] = useState<number>(0);
  const [money] = useState<number>(500);
  const [ownedApplianceMap, setOwnedApplianceMap] = useState<Record<string, { owned: boolean; condition: 'new' | 'used' }>>({
    refrigerator: { owned: false, condition: 'new' },
    color_tv: { owned: false, condition: 'new' },
    stereo: { owned: false, condition: 'new' }
  });
  const [ownedBooks, setOwnedBooks] = useState<string[]>([]);
  const [activeConcept, setActiveConcept] = useState<'A_silhouettes' | 'B_space_squares' | 'C_room_zones'>('A_silhouettes');

  // Preview modals
  const [activeDeck, setActiveDeck] = useState<'leisure' | 'chores' | 'pantry' | null>(null);

  const currentHousing = HOUSING_OPTIONS.find(h => h.id === selectedHousingId) || HOUSING_OPTIONS[0];

  // Derived lists
  const ownedAppliancesList: OwnedAppliance[] = Object.entries(ownedApplianceMap)
    .filter(([_, v]) => v.owned)
    .map(([id, v]) => ({
      id,
      purchasePrice: 200,
      purchaseSource: v.condition === 'new' ? 'socket_city' : 'z_mart',
      condition: v.condition
    }));

  const durablesSpace = ownedAppliancesList.reduce((sum, a) => {
    const itemDef = ALL_APPLIANCES.find(i => i.id === a.id);
    return sum + (itemDef?.space || 1);
  }, 0) + ownedBooks.reduce((sum, b) => {
    const itemDef = ALL_BOOKS.find(i => i.id === b);
    return sum + (itemDef?.space || 1);
  }, 0);

  const freeSpace = Math.max(0, currentHousing.spaceCap - durablesSpace);
  const overflow = Math.max(0, durablesSpace - currentHousing.spaceCap);

  // Toggles
  const toggleAppliance = (id: string) => {
    setOwnedApplianceMap(prev => {
      const current = prev[id] || { owned: false, condition: 'new' };
      return {
        ...prev,
        [id]: { ...current, owned: !current.owned }
      };
    });
  };

  const toggleCondition = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOwnedApplianceMap(prev => {
      const current = prev[id] || { owned: true, condition: 'new' };
      return {
        ...prev,
        [id]: { ...current, condition: current.condition === 'new' ? 'used' : 'new' }
      };
    });
  };

  const toggleBook = (id: string) => {
    setOwnedBooks(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  const furnishAll = (condition: 'new' | 'used' = 'new') => {
    const allApps: Record<string, { owned: boolean; condition: 'new' | 'used' }> = {};
    ALL_APPLIANCES.forEach(a => {
      allApps[a.id] = { owned: true, condition };
    });
    setOwnedApplianceMap(allApps);
    setOwnedBooks(ALL_BOOKS.map(b => b.id));
  };

  const clearAll = () => {
    setOwnedApplianceMap({});
    setOwnedBooks([]);
    setMess(0);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 7, 15, 0.92)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1040px',
          maxHeight: '94vh',
          backgroundColor: '#0d111d',
          border: '2px solid var(--accent-cyan, #00e5ff)',
          borderRadius: '16px',
          boxShadow: '0 0 35px rgba(0, 229, 255, 0.25), 0 20px 40px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(16, 22, 38, 0.8)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>🎨</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>
                Apartment Visual Mockups & Playground
              </h2>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#888' }}>
                Test interactive layouts, space squares, silhouette progression, and mess visualization without leaving this screen.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onApplyToPlayer && (
              <button
                onClick={() => {
                  onApplyToPlayer({
                    housingId: selectedHousingId,
                    mess,
                    money,
                    appliances: ownedAppliancesList,
                    books: ownedBooks
                  });
                  onClose();
                }}
                style={{
                  padding: '6px 14px',
                  backgroundColor: '#10b981',
                  color: '#000',
                  fontWeight: 'bold',
                  fontSize: '0.82rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                ✓ Apply to Player
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                padding: '6px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '0.9rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer'
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Top Sandbox Controls Toolstrip */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            alignItems: 'center',
            fontSize: '0.82rem'
          }}
        >
          {/* Housing Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#aaa', fontWeight: 600 }}>Apartment:</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {HOUSING_OPTIONS.map(h => (
                <button
                  key={h.id}
                  onClick={() => setSelectedHousingId(h.id)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: selectedHousingId === h.id ? '1.5px solid var(--accent-cyan, #00e5ff)' : '1px solid #333',
                    background: selectedHousingId === h.id ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                    color: selectedHousingId === h.id ? '#00e5ff' : '#ccc',
                    cursor: 'pointer',
                    fontSize: '0.76rem',
                    fontWeight: selectedHousingId === h.id ? 'bold' : 'normal'
                  }}
                >
                  {h.icon} {h.name.split(' ')[0]} ({h.spaceCap})
                </button>
              ))}
            </div>
          </div>

          {/* Mess Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: mess > 20 ? '#e74c3c' : '#aaa', fontWeight: 600 }}>
              🧹 Mess: <strong>{mess}</strong>
            </span>
            <input
              type="range"
              min={0}
              max={currentHousing.maxMess}
              value={mess}
              onChange={(e) => setMess(Number(e.target.value))}
              style={{ width: '100px', accentColor: '#f39c12', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', gap: '3px' }}>
              <button
                onClick={() => setMess(0)}
                style={{ padding: '2px 5px', fontSize: '0.7rem', background: '#222', color: '#85ffb5', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer' }}
              >
                0 (Clean)
              </button>
              <button
                onClick={() => setMess(15)}
                style={{ padding: '2px 5px', fontSize: '0.7rem', background: '#222', color: '#f39c12', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer' }}
              >
                15
              </button>
              <button
                onClick={() => setMess(30)}
                style={{ padding: '2px 5px', fontSize: '0.7rem', background: '#222', color: '#e74c3c', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer' }}
              >
                30
              </button>
            </div>
          </div>

          {/* Preset Actions */}
          <div style={{ display: 'flex', gap: '6px', marginInlineStart: 'auto' }}>
            <button
              onClick={clearAll}
              style={{
                padding: '4px 8px',
                background: 'rgba(231, 76, 60, 0.15)',
                color: '#ff8585',
                border: '1px solid rgba(231, 76, 60, 0.3)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              📦 Empty Apt (Unfurnished)
            </button>
            <button
              onClick={() => furnishAll('used')}
              style={{
                padding: '4px 8px',
                background: 'rgba(52, 152, 219, 0.15)',
                color: '#85c1e9',
                border: '1px solid rgba(52, 152, 219, 0.3)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              📦 Furnish All (Used)
            </button>
            <button
              onClick={() => furnishAll('new')}
              style={{
                padding: '4px 8px',
                background: 'rgba(46, 204, 113, 0.15)',
                color: '#85ffb5',
                border: '1px solid rgba(46, 204, 113, 0.3)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              ✨ Furnish All (New)
            </button>
          </div>
        </div>

        {/* Interactive Concept Switcher Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: 'rgba(10, 14, 26, 0.95)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <button
            onClick={() => setActiveConcept('A_silhouettes')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: activeConcept === 'A_silhouettes' ? '2px solid #00e5ff' : '1px solid rgba(255,255,255,0.1)',
              background: activeConcept === 'A_silhouettes' ? 'rgba(0, 229, 255, 0.18)' : 'rgba(255,255,255,0.03)',
              color: activeConcept === 'A_silhouettes' ? '#00e5ff' : '#aaa',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.84rem'
            }}
          >
            <span>✨</span>
            <span>Concept 1: Collectible Silhouette Slots ("Get Them All!")</span>
          </button>

          <button
            onClick={() => setActiveConcept('B_space_squares')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: activeConcept === 'B_space_squares' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
              background: activeConcept === 'B_space_squares' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255,255,255,0.03)',
              color: activeConcept === 'B_space_squares' ? '#10b981' : '#aaa',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.84rem'
            }}
          >
            <span>🧱</span>
            <span>Concept 2: Visual Space Floorplan Squares (Durables & Mess Grid)</span>
          </button>

          <button
            onClick={() => setActiveConcept('C_room_zones')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: activeConcept === 'C_room_zones' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
              background: activeConcept === 'C_room_zones' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255,255,255,0.03)',
              color: activeConcept === 'C_room_zones' ? '#f59e0b' : '#aaa',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.84rem'
            }}
          >
            <span>🛋️</span>
            <span>Concept 3: Room Zones (Living, Kitchen, Study)</span>
          </button>
        </div>

        {/* Active Mockup Display Canvas */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px 20px',
            backgroundColor: '#0a0d18',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {/* Top Mini Header: Housing Name & Space/Mess Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>{currentHousing.icon}</span>
              <strong style={{ color: '#fff', fontSize: '0.98rem' }}>{currentHousing.name}</strong>
              <span style={{
                fontSize: '0.72rem',
                color: overflow > 0 ? '#ff8585' : '#85ffb5',
                background: overflow > 0 ? 'rgba(231,76,60,0.2)' : 'rgba(46,204,113,0.15)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: overflow > 0 ? '1px solid #e74c3c' : '1px solid #2ecc71'
              }}>
                {overflow > 0 ? `⚠️ Overcrowded (+${overflow} space)` : `${freeSpace} / ${currentHousing.spaceCap} space free`}
              </span>
            </div>

            {/* Mess Status Tag */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: mess > 25 ? '#e74c3c' : (mess > 0 ? '#f39c12' : '#2ecc71'), fontWeight: 'bold' }}>
                {mess === 0 ? '✨ Spotless (0 Mess)' : (mess > 25 ? `⚠️ Cluttered (${mess} Mess - No Guests!)` : `🧹 Mild Mess (${mess})`)}
              </span>
            </div>
          </div>

          {/* CONCEPT 1: COLLECTIBLE SILHOUETTE SLOTS */}
          {activeConcept === 'A_silhouettes' && (
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {/* Durables Grid Showcase */}
              <div
                style={{
                  background: 'linear-gradient(180deg, rgba(16, 20, 36, 0.9) 0%, rgba(10, 12, 22, 0.95) 100%)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '12px',
                  boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.6)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--accent-cyan, #00e5ff)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🛋️ Apartment Furnishings & Books ({ownedAppliancesList.length + ownedBooks.length} / {ALL_APPLIANCES.length + ALL_BOOKS.length} Collected)
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#777' }}>
                    Click item to toggle • Click badge to flip New/Used
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
                    gap: '10px',
                    justifyItems: 'center'
                  }}
                >
                  {/* Appliances */}
                  {ALL_APPLIANCES.map(app => {
                    const ownedState = ownedApplianceMap[app.id];
                    const isOwned = ownedState?.owned;
                    const isNew = ownedState?.condition === 'new';

                    return (
                      <div
                        key={app.id}
                        onClick={() => toggleAppliance(app.id)}
                        style={{
                          width: '68px',
                          height: '76px',
                          borderRadius: '8px',
                          border: isOwned
                            ? (isNew ? '1.5px solid #2ecc71' : '1.5px solid #3498db')
                            : '1px dashed rgba(255, 255, 255, 0.15)',
                          backgroundColor: isOwned ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.02)',
                          boxShadow: isOwned
                            ? (isNew ? '0 0 10px rgba(46, 204, 113, 0.3)' : '0 0 10px rgba(52, 152, 219, 0.3)')
                            : 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          position: 'relative',
                          padding: '4px',
                          boxSizing: 'border-box',
                          transition: 'all 0.2s ease',
                          opacity: isOwned ? 1 : 0.4
                        }}
                        title={isOwned ? `${app.name} (${isNew ? 'New' : 'Used'}) - Click to toggle` : `${app.name} (Unfurnished) - Click to furnish`}
                      >
                        <img
                          src={`/assets/raw_images/${app.id}.png`}
                          alt={app.name}
                          style={{
                            width: '38px',
                            height: '38px',
                            objectFit: 'contain',
                            filter: isOwned ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' : 'grayscale(100%) brightness(50%)'
                          }}
                        />
                        <span style={{
                          fontSize: '0.62rem',
                          color: isOwned ? '#fff' : '#666',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '62px',
                          marginTop: '2px'
                        }}>
                          {app.name}
                        </span>

                        {/* Condition Badge */}
                        {isOwned && (
                          <span
                            onClick={(e) => toggleCondition(app.id, e)}
                            title="Click to toggle New / Used"
                            style={{
                              position: 'absolute',
                              top: '2px',
                              right: '3px',
                              fontSize: '0.6rem',
                              cursor: 'pointer'
                            }}
                          >
                            {isNew ? '✨' : '📦'}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Books */}
                  {ALL_BOOKS.map(book => {
                    const isOwned = ownedBooks.includes(book.id);

                    return (
                      <div
                        key={book.id}
                        onClick={() => toggleBook(book.id)}
                        style={{
                          width: '68px',
                          height: '76px',
                          borderRadius: '8px',
                          border: isOwned ? '1.5px solid #9b59b6' : '1px dashed rgba(255, 255, 255, 0.15)',
                          backgroundColor: isOwned ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.02)',
                          boxShadow: isOwned ? '0 0 10px rgba(155, 89, 182, 0.3)' : 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          position: 'relative',
                          padding: '4px',
                          boxSizing: 'border-box',
                          transition: 'all 0.2s ease',
                          opacity: isOwned ? 1 : 0.4
                        }}
                        title={isOwned ? `${book.name} (Book) - Click to toggle` : `${book.name} (Unread) - Click to acquire`}
                      >
                        <img
                          src={`/assets/raw_images/${book.id}.png`}
                          alt={book.name}
                          style={{
                            width: '38px',
                            height: '38px',
                            objectFit: 'contain',
                            filter: isOwned ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' : 'grayscale(100%) brightness(50%)'
                          }}
                        />
                        <span style={{
                          fontSize: '0.62rem',
                          color: isOwned ? '#fff' : '#666',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '62px',
                          marginTop: '2px'
                        }}>
                          {book.name}
                        </span>
                        {isOwned && (
                          <span style={{ position: 'absolute', top: '2px', right: '3px', fontSize: '0.6rem' }}>
                            📚
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* CONCEPT 2: SPACE FLOORPLAN SQUARES */}
          {activeConcept === 'B_space_squares' && (
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div
                style={{
                  background: 'linear-gradient(180deg, rgba(16, 20, 36, 0.9) 0%, rgba(10, 12, 22, 0.95) 100%)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '12px',
                  boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.6)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 'bold' }}>
                    🧱 Floorplan Space Capacity ({currentHousing.spaceCap} Tiles Total)
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#888' }}>
                    Each square represents 1 unit of living space
                  </span>
                </div>

                {/* Squares Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.min(currentHousing.spaceCap, 10)}, 1fr)`,
                    gap: '6px',
                    padding: '8px',
                    background: 'rgba(0,0,0,0.4)',
                    borderRadius: '8px'
                  }}
                >
                  {Array.from({ length: currentHousing.spaceCap }).map((_, idx) => {
                    const isOccupiedByDurable = idx < durablesSpace;
                    const messTiles = Math.min(currentHousing.spaceCap - durablesSpace, Math.floor(mess / 3));
                    const isOccupiedByMess = idx >= durablesSpace && idx < durablesSpace + messTiles;
                    const isEmpty = !isOccupiedByDurable && !isOccupiedByMess;

                    return (
                      <div
                        key={idx}
                        style={{
                          aspectRatio: '1/1',
                          minHeight: '38px',
                          borderRadius: '6px',
                          border: isOccupiedByDurable
                            ? '1px solid #00e5ff'
                            : (isOccupiedByMess ? '1px solid #f39c12' : '1px dashed rgba(255,255,255,0.12)'),
                          background: isOccupiedByDurable
                            ? 'rgba(0, 229, 255, 0.18)'
                            : (isOccupiedByMess ? 'rgba(243, 156, 18, 0.22)' : 'rgba(255,255,255,0.02)'),
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.9rem',
                          position: 'relative'
                        }}
                      >
                        {isOccupiedByDurable && <span>🛋️</span>}
                        {isOccupiedByMess && <span>🧹</span>}
                        {isEmpty && <span style={{ fontSize: '0.6rem', color: '#444' }}>{idx + 1}</span>}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '0.74rem', justifyContent: 'center' }}>
                  <span style={{ color: '#00e5ff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '10px', height: '10px', backgroundColor: '#00e5ff', borderRadius: '2px', display: 'inline-block' }} />
                    Durables Space ({durablesSpace})
                  </span>
                  <span style={{ color: '#f39c12', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '10px', height: '10px', backgroundColor: '#f39c12', borderRadius: '2px', display: 'inline-block' }} />
                    Clutter Space
                  </span>
                  <span style={{ color: '#888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '10px', height: '10px', border: '1px dashed #666', borderRadius: '2px', display: 'inline-block' }} />
                    Free Floor ({freeSpace})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CONCEPT 3: ROOM ZONES */}
          {activeConcept === 'C_room_zones' && (
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '4px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px'
              }}
            >
              {/* Kitchen Zone */}
              <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold', marginBottom: '6px' }}>
                  🍳 Kitchen & Dining
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {ALL_APPLIANCES.filter(a => a.category === 'kitchen').map(a => (
                    <div
                      key={a.id}
                      onClick={() => toggleAppliance(a.id)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: ownedApplianceMap[a.id]?.owned ? '1px solid #10b981' : '1px dashed #444',
                        background: ownedApplianceMap[a.id]?.owned ? 'rgba(16,185,129,0.2)' : 'transparent',
                        color: ownedApplianceMap[a.id]?.owned ? '#fff' : '#666',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      {a.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Living Zone */}
              <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 'bold', marginBottom: '6px' }}>
                  🛋️ Living & Lounge
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {ALL_APPLIANCES.filter(a => a.category === 'living').map(a => (
                    <div
                      key={a.id}
                      onClick={() => toggleAppliance(a.id)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: ownedApplianceMap[a.id]?.owned ? '1px solid #38bdf8' : '1px dashed #444',
                        background: ownedApplianceMap[a.id]?.owned ? 'rgba(56,189,248,0.2)' : 'transparent',
                        color: ownedApplianceMap[a.id]?.owned ? '#fff' : '#666',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      {a.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Study Zone */}
              <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.8rem', color: '#9b59b6', fontWeight: 'bold', marginBottom: '6px' }}>
                  📚 Study & Workstation
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {ALL_APPLIANCES.filter(a => a.category === 'study').concat(ALL_BOOKS as any).map(a => {
                    const isBook = a.space === 1 || a.space === 2;
                    return (
                      <div
                        key={a.id}
                        onClick={() => isBook ? toggleBook(a.id) : toggleAppliance(a.id)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: (isBook ? ownedBooks.includes(a.id) : ownedApplianceMap[a.id]?.owned) ? '1px solid #9b59b6' : '1px dashed #444',
                          background: (isBook ? ownedBooks.includes(a.id) : ownedApplianceMap[a.id]?.owned) ? 'rgba(155,89,182,0.2)' : 'transparent',
                          color: (isBook ? ownedBooks.includes(a.id) : ownedApplianceMap[a.id]?.owned) ? '#fff' : '#666',
                          fontSize: '0.72rem',
                          cursor: 'pointer'
                        }}
                      >
                        {a.name}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Balcony Zone */}
              <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold', marginBottom: '6px' }}>
                  🛁 Luxury Balcony
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {ALL_APPLIANCES.filter(a => a.category === 'luxury').map(a => (
                    <div
                      key={a.id}
                      onClick={() => toggleAppliance(a.id)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: ownedApplianceMap[a.id]?.owned ? '1px solid #f59e0b' : '1px dashed #444',
                        background: ownedApplianceMap[a.id]?.owned ? 'rgba(245,158,11,0.2)' : 'transparent',
                        color: ownedApplianceMap[a.id]?.owned ? '#fff' : '#666',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      {a.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DOCKED BOTTOM ACTION BAR (ZERO SCROLL GUARANTEE) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '12px',
              paddingTop: '10px',
              marginTop: '8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.12)',
              backgroundColor: 'rgba(10, 13, 24, 0.95)',
              flexShrink: 0,
              zIndex: 5
            }}
          >
            {/* Leisure Button */}
            <button
              onClick={() => setActiveDeck('leisure')}
              style={{
                padding: '10px 8px',
                background: 'linear-gradient(145deg, #10b981 0%, #059669 100%)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>🛋️</span>
              <span>Leisure</span>
              <span style={{ fontSize: '0.65rem', color: '#064e3b', fontWeight: 'bold' }}>Relax & Socialize</span>
            </button>

            {/* Chores Button */}
            <button
              onClick={() => setActiveDeck('chores')}
              style={{
                padding: '10px 8px',
                background: 'linear-gradient(145deg, #0284c7 0%, #0369a1 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>🧹</span>
              <span>Chores</span>
              <span style={{ fontSize: '0.65rem', color: '#e0f2fe' }}>Clean & Service</span>
            </button>

            {/* Pantry Button */}
            <button
              onClick={() => setActiveDeck('pantry')}
              style={{
                padding: '10px 8px',
                background: 'linear-gradient(145deg, #f59e0b 0%, #d97706 100%)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>🥫</span>
              <span>Pantry</span>
              <span style={{ fontSize: '0.65rem', color: '#78350f', fontWeight: 'bold' }}>4 units</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card Deck Previews */}
      {activeDeck === 'leisure' && (
        <HomeCardDeck title="Leisure & Living" icon="🛋️" onClose={() => setActiveDeck(null)}>
          <LeisureCards
            hoursToRelax={6}
            isRelaxDisabled={false}
            hasFood={true}
            physGain={3}
            mentalGain={5}
            scaledMess={1}
            trackMess={true}
            usePhysicalMental={true}
            classicGain={3}
            classicFirstBonus={2}
            onRelaxClick={() => setActiveDeck(null)}
            socialParams={{
              isDisabled: mess > 25,
              disabledReasonKey: mess > 25 ? 'Mess too high' : undefined,
              isHalfRewardExpected: false,
              minReward: 2,
              maxReward: 4,
              minCashNeeded: 10,
              maxCashNeeded: 30,
              timeCost: 6
            }}
            onSocializeClick={() => setActiveDeck(null)}
          />
        </HomeCardDeck>
      )}

      {activeDeck === 'chores' && (
        <HomeCardDeck title="Chores & Maintenance" icon="🧹" onClose={() => setActiveDeck(null)}>
          <ChoresCards
            hoursToClean={2}
            cleanPhysGain={1}
            isCleanDisabled={mess === 0}
            cleanSubtext={mess === 0 ? 'Apartment is spotless' : 'Reduces mess to 0'}
            onCleanClick={() => { setMess(0); setActiveDeck(null); }}
            cleaningServiceCost={1}
            cleaningServicePrice={100}
            isServiceDisabled={mess === 0}
            serviceSubtext={mess === 0 ? 'Apartment is spotless' : 'Professional service'}
            onServiceClick={() => { setMess(0); setActiveDeck(null); }}
          />
        </HomeCardDeck>
      )}

      {activeDeck === 'pantry' && (
        <HomeCardDeck title="Kitchen & Pantry" icon="🥫" onClose={() => setActiveDeck(null)}>
          <PantryCard
            freshFoodUnits={4}
            cannedFoodUnits={2}
            fastFoodItems={[{ itemId: 'cheeseburger', happinessBonus: 3 }]}
            hasFridge={!!ownedApplianceMap['refrigerator']?.owned}
            hasFreezer={!!ownedApplianceMap['freezer']?.owned}
            campaign={campaign}
          />
        </HomeCardDeck>
      )}
    </div>
  );
};
