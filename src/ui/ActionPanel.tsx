/**
 * ActionPanel.tsx — Side drawer for player interactions.
 */

interface ActionPanelProps {
  currentBuildingId: string | null;
  actionsRemaining: number;
  onAction: (actionType: string) => void;
}

export function ActionPanel({ currentBuildingId, actionsRemaining, onAction }: ActionPanelProps) {
  return (
    <aside className="action-panel">
      <h2 className="action-panel__title">Actions</h2>
      <div className="action-panel__budget">
        {actionsRemaining} action{actionsRemaining !== 1 ? 's' : ''} remaining
      </div>
      {currentBuildingId ? (
        <div className="action-panel__context">
          <p>At: <strong>{currentBuildingId}</strong></p>
          <button className="action-panel__btn" onClick={() => onAction('interact')} disabled={actionsRemaining <= 0}>
            Interact
          </button>
        </div>
      ) : (
        <p className="action-panel__hint">Move to a building to see available actions.</p>
      )}
      <button className="action-panel__btn action-panel__btn--secondary" onClick={() => onAction('end-phase')}>
        End Phase
      </button>
    </aside>
  );
}
