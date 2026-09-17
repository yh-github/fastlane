import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerConfig, GoalAllotment } from '../engine/gameState';
import type { WinCondition } from '../engine/rules';

interface SetupScreenProps {
  winConditions: WinCondition[];
  onConfirm: (playersConfig: PlayerConfig[]) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ winConditions, onConfirm }) => {
  const { t } = useTranslation();
  
  const generateDefaultGoals = useCallback(() => {
    const goals: GoalAllotment = {};
    winConditions.forEach(c => goals[c.stat] = 50);
    return goals;
  }, [winConditions]);

  const [players, setPlayers] = useState<PlayerConfig[]>([
    {
      name: 'Player 1',
      isAi: false,
      goals: generateDefaultGoals(),
      characterIndex: 1,
    }
  ]);

  useEffect(() => {
    setPlayers(prev => prev.map(p => {
      const updatedGoals: GoalAllotment = { ...p.goals };
      let changed = false;
      winConditions.forEach(c => {
        if (updatedGoals[c.stat] === undefined) {
          updatedGoals[c.stat] = 50;
          changed = true;
        }
      });
      return changed ? { ...p, goals: updatedGoals } : p;
    }));
  }, [winConditions]);

  const addPlayer = () => {
    if (players.length < 4) {
      const nextChar = (players.length % 4) + 1;
      setPlayers([
        ...players,
        {
          name: `Player ${players.length + 1}`,
          isAi: false,
          goals: generateDefaultGoals(),
          characterIndex: nextChar,
        }
      ]);
    }
  };

  const removePlayer = (index: number) => {
    if (players.length > 1) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const updatePlayer = (index: number, key: keyof PlayerConfig, value: any) => {
    const updated = [...players];
    updated[index] = { ...updated[index], [key]: value };
    setPlayers(updated);
  };

  const updateGoal = (index: number, key: keyof GoalAllotment, value: number) => {
    const updated = [...players];
    const goals = updated[index].goals;
    const newVal = Math.max(0, Math.min(100, value));
    updated[index].goals = { ...goals, [key]: newVal };
    setPlayers(updated);
  };

  const isAllValid = players.every(p => {
    return p.name.trim() !== '';
  });

  const handleConfirm = () => {
    const sanitizedPlayers = players.map(p => {
      const finalGoals: GoalAllotment = { ...p.goals };
      winConditions.forEach(c => {
        if (finalGoals[c.stat] === undefined) {
          finalGoals[c.stat] = 50;
        }
      });
      return { ...p, goals: finalGoals };
    });
    onConfirm(sanitizedPlayers);
  };

  return (
    <div className="fullscreen-overlay">
      <div className="setup-screen" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2>{t('setupScreen.title')}</h2>
        
        <div className="setup-players-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
          {players.map((player, index) => {
            return (
              <div key={`player-setup-${index}`} className="player-setup-card" style={{ background: 'var(--color-bg)', padding: '15px', borderRadius: '8px', border: '2px solid var(--color-border)', width: '320px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <h3>{t('setupScreen.playerX', { count: index + 1 })}</h3>
                  {players.length > 1 && (
                    <button onClick={() => removePlayer(index)} style={{ background: 'red', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>X</button>
                  )}
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label>{t('setupScreen.name')}</label>
                  <input 
                    type="text" 
                    value={player.name} 
                    onChange={(e) => updatePlayer(index, 'name', e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label>
                    <input 
                      type="checkbox" 
                      checked={player.isAi} 
                      onChange={(e) => updatePlayer(index, 'isAi', e.target.checked)} 
                    />
                    {t('setupScreen.isAi')}
                  </label>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#94a3b8' }}>
                    {t('setupScreen.character', { defaultValue: 'Select Character' })}
                  </label>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between', alignItems: 'center' }}>
                    {[1, 2, 3, 4, 0].map((charIdx) => {
                      const isSelected = (player.characterIndex ?? ((index % 4) + 1)) === charIdx;
                      const charLabel = charIdx === 0 ? 'Jones' : `${charIdx}`;
                      return (
                        <button
                          key={`char-${charIdx}`}
                          type="button"
                          data-testid={`player-${index}-char-${charIdx}`}
                          onClick={() => updatePlayer(index, 'characterIndex', charIdx)}
                          style={{
                            flex: 1,
                            background: isSelected ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: isSelected ? '2px solid var(--accent-cyan, #00e5ff)' : '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '6px',
                            padding: '4px 2px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            transition: 'all 0.15s ease',
                            outline: 'none'
                          }}
                          title={charIdx === 0 ? 'Jones' : `Character ${charIdx}`}
                        >
                          <img
                            src={`/assets/chars/avatars/char_${charIdx}.png`}
                            alt={`Character ${charIdx}`}
                            style={{
                              height: '48px',
                              width: 'auto',
                              imageRendering: 'pixelated',
                              display: 'block'
                            }}
                          />
                          <span style={{ fontSize: '0.7rem', marginTop: '2px', color: isSelected ? 'var(--accent-cyan, #00e5ff)' : '#ccc', fontWeight: isSelected ? 700 : 400 }}>
                            {charLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {winConditions.map((cond) => {
                  const goalVal = player.goals[cond.stat] ?? 50;
                  return (
                    <div key={`${index}-${cond.stat}`} className="setup-screen__slider-group" style={{ marginTop: '10px' }}>
                      <label><span>{t(`setupScreen.${cond.stat}`, { defaultValue: cond.label })}</span> <span>{goalVal}%</span></label>
                      <input type="range" min="0" max="100" value={goalVal} onChange={(e) => updateGoal(index, cond.stat, parseInt(e.target.value))} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
          {players.length < 4 && (
            <button className="action-panel__btn" onClick={addPlayer} style={{ background: '#4CAF50' }}>
              {t('setupScreen.addPlayer')}
            </button>
          )}
          <button 
            className="action-panel__btn" 
            onClick={handleConfirm}
            disabled={!isAllValid}
          >
            {t('setupScreen.startLife')}
          </button>
        </div>
      </div>
    </div>
  );
};
