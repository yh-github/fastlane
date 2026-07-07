/**
 * ActionPanel.tsx — Side drawer for player interactions.
 */

import { type PlayerState } from '../engine/gameState';
import type { CampaignBundle } from '../engine/dataLoader';
import { JobBoard, StoreFront, UniversityRegistry } from './BuildingInteractions';

interface ActionPanelProps {
  player: PlayerState | null;
  campaign: CampaignBundle | null;
  currentBuildingId: string | null;
  onAction: (actionPayload: any) => void;
}

export function ActionPanel({ player, campaign, currentBuildingId, onAction }: ActionPanelProps) {
  if (!player || !campaign) return <aside className="action-panel">Loading...</aside>;

  const building = currentBuildingId 
    ? campaign.buildings.find(b => b.id === currentBuildingId) 
    : null;

  return (
    <aside className="action-panel">
      <h2 className="action-panel__title">Actions</h2>
      <div className="action-panel__budget">
        {player.hoursRemaining} hour{player.hoursRemaining !== 1 ? 's' : ''} remaining
      </div>
      
      {building ? (
        <div className="action-panel__context">
          <p>At: <strong>{building.name}</strong> ({building.archetype})</p>
          <p style={{ fontSize: '12px', fontStyle: 'italic', marginBottom: '10px' }}>{building.description}</p>
          
          <hr style={{ margin: '15px 0', borderColor: '#333' }} />

          {/* Archetype specific panels */}
          {(building.archetype === 'workplace' || building.archetype === 'restaurant') && (
            <JobBoard 
              player={player} 
              onAction={onAction} 
              availableJobs={campaign.jobs.filter(j => j.locationId === building.id)} 
            />
          )}

          {(building.archetype === 'shop' || building.archetype === 'grocery' || building.archetype === 'pawnshop') && (
            <StoreFront 
              player={player} 
              onAction={onAction} 
              availableItems={campaign.items.filter(i => i.store === building.id)} 
            />
          )}

          {building.archetype === 'education' && (
            <UniversityRegistry 
              player={player} 
              onAction={onAction} 
              availableDegrees={campaign.education} 
            />
          )}

        </div>
      ) : (
        <p className="action-panel__hint">Move to a building to see available actions.</p>
      )}
      <button className="action-panel__btn action-panel__btn--secondary" onClick={() => onAction({ type: 'end-turn' })} style={{ marginTop: 'auto' }}>
        End Turn
      </button>
    </aside>
  );
}
