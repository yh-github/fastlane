import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerConfig, GoalAllotment } from '../engine/gameState';
import type { WinCondition } from '../engine/rules';

interface SetupScreenProps {
  winConditions: WinCondition[];
  onConfirm: (playersConfig: PlayerConfig[]) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ winConditions, onConfirm }) => {
  const { t } = useTranslation();
  
  const generateDefaultGoals = () => {
    const goals: GoalAllotment = {};
    winConditions.forEach(c => goals[c.stat] = 50);
    return goals;
  };

  const [players, setPlayers] = useState<PlayerConfig[]>([
    {
      name: 'Player 1',
      isAi: false,
      goals: generateDefaultGoals(),
    }
  ]);

  const addPlayer = () => {
    if (players.length < 4) {
      setPlayers([
        ...players,
        {
          name: `Player ${players.length + 1}`,
          isAi: false,
          goals: generateDefaultGoals(),
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

                {winConditions.map((cond) => (
                  <div key={`${index}-${cond.stat}`} className="setup-screen__slider-group" style={{ marginTop: '10px' }}>
                    <label><span>{t(`setupScreen.${cond.stat}`, { defaultValue: cond.label })}</span> <span>{player.goals[cond.stat] || 0}%</span></label>
                    <input type="range" min="0" max="100" value={player.goals[cond.stat] || 0} onChange={(e) => updateGoal(index, cond.stat, parseInt(e.target.value))} />
                  </div>
                ))}
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
            onClick={() => onConfirm(players)}
            disabled={!isAllValid}
          >
            {t('setupScreen.startLife')}
          </button>
        </div>
      </div>
    </div>
  );
};
