import React, { useState } from 'react';

interface SetupScreenProps {
  onConfirm: (goals: { wealth: number; happiness: number; education: number; career: number }) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onConfirm }) => {
  const [goals, setGoals] = useState({
    wealth: 25,
    happiness: 25,
    education: 25,
    career: 25,
  });

  const total = goals.wealth + goals.happiness + goals.education + goals.career;

  const handleChange = (key: keyof typeof goals, value: number) => {
    const newVal = Math.max(0, Math.min(100, value));
    const diff = newVal - goals[key];
    if (total + diff <= 100) {
      setGoals({ ...goals, [key]: newVal });
    }
  };

  return (
    <div className="fullscreen-overlay">
      <div className="setup-screen">
        <h2>Set Your Goals</h2>
        <div className="setup-screen__total">
          Remaining Points: {100 - total}
        </div>
        
        <div className="setup-screen__slider-group">
          <label><span>Wealth</span> <span>{goals.wealth}%</span></label>
          <input type="range" min="0" max="100" value={goals.wealth} onChange={(e) => handleChange('wealth', parseInt(e.target.value))} />
        </div>
        
        <div className="setup-screen__slider-group">
          <label><span>Happiness</span> <span>{goals.happiness}%</span></label>
          <input type="range" min="0" max="100" value={goals.happiness} onChange={(e) => handleChange('happiness', parseInt(e.target.value))} />
        </div>
        
        <div className="setup-screen__slider-group">
          <label><span>Education</span> <span>{goals.education}%</span></label>
          <input type="range" min="0" max="100" value={goals.education} onChange={(e) => handleChange('education', parseInt(e.target.value))} />
        </div>
        
        <div className="setup-screen__slider-group">
          <label><span>Career</span> <span>{goals.career}%</span></label>
          <input type="range" min="0" max="100" value={goals.career} onChange={(e) => handleChange('career', parseInt(e.target.value))} />
        </div>
        
        <button 
          className="action-panel__btn" 
          onClick={() => onConfirm(goals)}
          disabled={total !== 100}
        >
          Start Life
        </button>
      </div>
    </div>
  );
};
