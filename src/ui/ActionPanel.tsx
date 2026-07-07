/**
 * ActionPanel.tsx — Side drawer for player interactions.
 */

import { PlayerState, COST_BUILDING_ENTRY, COST_WORK_SESSION, COST_STUDY_SESSION } from '../engine/gameState';

interface ActionPanelProps {
  player: PlayerState | null;
  currentBuildingId: string | null;
  onAction: (actionType: string) => void;
}

export function ActionPanel({ player, currentBuildingId, onAction }: ActionPanelProps) {
  if (!player) return <aside className="action-panel">Loading...</aside>;

  return (
    <aside className="action-panel">
      <h2 className="action-panel__title">Actions</h2>
      <div className="action-panel__budget">
        {player.hoursRemaining} hour{player.hoursRemaining !== 1 ? 's' : ''} remaining
      </div>
      {currentBuildingId ? (
        <div className="action-panel__context">
          <p>At: <strong>{currentBuildingId}</strong></p>
          <div className="action-panel__buttons">
            <button 
              className="action-panel__btn" 
              onClick={() => onAction('enter')} 
              disabled={player.hoursRemaining < 1}
              title={`Costs ${COST_BUILDING_ENTRY} hours`}
            >
              Enter ({COST_BUILDING_ENTRY}h)
            </button>
            <button 
              className="action-panel__btn" 
              onClick={() => onAction('work')} 
              disabled={player.hoursRemaining < 1}
              title={`Costs up to ${COST_WORK_SESSION} hours`}
            >
              Work (up to {COST_WORK_SESSION}h)
            </button>
            <button 
              className="action-panel__btn" 
              onClick={() => onAction('study')} 
              disabled={player.hoursRemaining < 1}
              title={`Costs up to ${COST_STUDY_SESSION} hours`}
            >
              Study (up to {COST_STUDY_SESSION}h)
            </button>
          </div>
        </div>
      ) : (
        <p className="action-panel__hint">Move to a building to see available actions.</p>
      )}
      <button className="action-panel__btn action-panel__btn--secondary" onClick={() => onAction('end-turn')}>
        End Turn
      </button>
    </aside>
  );
}
