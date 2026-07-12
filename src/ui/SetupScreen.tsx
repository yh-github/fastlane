import React, { useState } from 'react';
import type { PlayerConfig, GoalAllotment } from '../engine/gameState';

interface SetupScreenProps {
  onConfirm: (playersConfig: PlayerConfig[]) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onConfirm }) => {
  const [players, setPlayers] = useState<PlayerConfig[]>([
    {
      name: 'Player 1',
      isAi: false,
      goals: { wealth: 25, happiness: 25, education: 25, career: 25 },
    }
  ]);

  const addPlayer = () => {
    if (players.length < 4) {
      setPlayers([
        ...players,
        {
          name: `Player ${players.length + 1}`,
          isAi: false,
          goals: { wealth: 25, happiness: 25, education: 25, career: 25 },
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
        <h2>Game Setup</h2>
        
        <div className="setup-players-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
          {players.map((player, index) => {
            return (
              <div key={`player-setup-${index}`} className="player-setup-card" style={{ background: 'var(--color-bg)', padding: '15px', borderRadius: '8px', border: '2px solid var(--color-border)', width: '320px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <h3>Player {index + 1}</h3>
                  {players.length > 1 && (
                    <button onClick={() => removePlayer(index)} style={{ background: 'red', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>X</button>
                  )}
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label>Name: </label>
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
                    Is AI (Jones)?
                  </label>
                </div>

                <div className="setup-screen__slider-group" style={{ marginTop: '10px' }}>
                  <label><span>Wealth</span> <span>{player.goals.wealth}%</span></label>
                  <input type="range" min="0" max="100" value={player.goals.wealth} onChange={(e) => updateGoal(index, 'wealth', parseInt(e.target.value))} />
                </div>
                
                <div className="setup-screen__slider-group">
                  <label><span>Happiness</span> <span>{player.goals.happiness}%</span></label>
                  <input type="range" min="0" max="100" value={player.goals.happiness} onChange={(e) => updateGoal(index, 'happiness', parseInt(e.target.value))} />
                </div>
                
                <div className="setup-screen__slider-group">
                  <label><span>Education</span> <span>{player.goals.education}%</span></label>
                  <input type="range" min="0" max="100" value={player.goals.education} onChange={(e) => updateGoal(index, 'education', parseInt(e.target.value))} />
                </div>
                
                <div className="setup-screen__slider-group">
                  <label><span>Career</span> <span>{player.goals.career}%</span></label>
                  <input type="range" min="0" max="100" value={player.goals.career} onChange={(e) => updateGoal(index, 'career', parseInt(e.target.value))} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
          {players.length < 4 && (
            <button className="action-panel__btn" onClick={addPlayer} style={{ background: '#4CAF50' }}>
              Add Player
            </button>
          )}
          <button 
            className="action-panel__btn" 
            onClick={() => onConfirm(players)}
            disabled={!isAllValid}
          >
            Start Life
          </button>
        </div>
      </div>
    </div>
  );
};
