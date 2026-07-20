import { useTranslation } from 'react-i18next';
import { type GameState } from '../engine/gameState';

interface SettingsModalProps {
  gameState: GameState;
  setGameState: (updater: GameState | ((prev: GameState | null) => GameState | null)) => void;
  onClose: () => void;
}

export function SettingsModal({ gameState, setGameState, onClose }: SettingsModalProps) {
  const { t } = useTranslation();

  const handleToggleAnimations = () => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          enableAnimations: !prev.rules.enableAnimations
        }
      };
    });
  };

  const handleToggleOverAchieve = () => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          allowOverAchievingGoals: !prev.rules.allowOverAchievingGoals
        }
      };
    });
  };

  const handleToggleBypassDoctor = () => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          bypassDoctorIfBroke: !prev.rules.bypassDoctorIfBroke
        }
      };
    });
  };

  const handleToggleRelaxationDoctor = () => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          enableRelaxationDoctor: !prev.rules.enableRelaxationDoctor
        }
      };
    });
  };

  const handleChangeRelaxationThreshold = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 0 || val > 100) return;
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: {
          ...prev.rules,
          relaxationDoctorThreshold: val
        }
      };
    });
  };

  return (
    <div className="fullscreen-overlay" style={{ zIndex: 9999 }}>
      <div className="building-modal">
        <button className="building-modal__close" onClick={onClose}>×</button>
        <div className="building-modal__header">
          <div className="building-modal__face">⚙️</div>
          <div className="building-modal__title-group">
            <h2>{t('settings.title', { defaultValue: 'Settings' })}</h2>
          </div>
        </div>

        <div className="interaction-panel">
          <div 
            className="interaction-item interaction-item--clickable"
            onClick={handleToggleAnimations}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('settings.animations', { defaultValue: 'Enable Animations' })}</span>
              <input 
                type="checkbox" 
                checked={gameState.rules.enableAnimations} 
                readOnly
                style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
              />
            </div>
          </div>
          <div 
            className="interaction-item interaction-item--clickable"
            onClick={handleToggleOverAchieve}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('settings.overachieve', { defaultValue: 'Allow Over-Achieving Goals' })}</span>
              <input 
                type="checkbox" 
                checked={gameState.rules.allowOverAchievingGoals} 
                readOnly
                style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
              />
            </div>
          </div>
          <div 
            className="interaction-item interaction-item--clickable"
            onClick={handleToggleBypassDoctor}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('settings.bypassDoctorIfBroke', { defaultValue: 'Bypass Doctor Visit if Cash is $0' })}</span>
              <input 
                type="checkbox" 
                checked={gameState.rules.bypassDoctorIfBroke} 
                readOnly
                style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
              />
            </div>
          </div>
          <div 
            className="interaction-item interaction-item--clickable"
            onClick={handleToggleRelaxationDoctor}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('settings.enableRelaxationDoctor', { defaultValue: 'Enable Doctor Visit from Low Relaxation' })}</span>
              <input 
                type="checkbox" 
                checked={gameState.rules.enableRelaxationDoctor} 
                readOnly
                style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
              />
            </div>
          </div>
          {gameState.rules.enableRelaxationDoctor && (
            <div className="interaction-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t('settings.relaxationDoctorThreshold', { defaultValue: 'Low Relaxation Threshold' })}</span>
                <input 
                  type="number"
                  min="0"
                  max="100"
                  value={gameState.rules.relaxationDoctorThreshold} 
                  onChange={handleChangeRelaxationThreshold}
                  style={{ width: '60px', padding: '4px', backgroundColor: '#111', color: '#fff', border: '1px solid #333' }}
                />
              </div>
            </div>
          )}
        </div>

        <button className="action-panel__btn" onClick={onClose} style={{ marginTop: 'auto' }}>
          {t('settings.close', { defaultValue: 'Close' })}
        </button>
      </div>
    </div>
  );
}
