/**
 * ActionPanel.tsx — Side drawer for player interactions.
 *
 * In the classic 1990 version:
 * - Job applications all happen at the Employment Office
 * - You can only WORK at the building where your job is located
 * - Items for sale appear at the building's storefront (shops, restaurant, grocery)
 */

import { type PlayerState } from '../engine/gameState';
import type { CampaignBundle } from '../engine/dataLoader';
import { JobBoard, StoreFront, UniversityRegistry, WorkStation } from './BuildingInteractions';

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

  // Check if the player's current job is at this building
  const playerJobHere = player.currentJobId 
    ? campaign.jobs.find(j => j.id === player.currentJobId && j.locationId === currentBuildingId)
    : null;

  // Items available at this building
  const itemsHere = building 
    ? campaign.items.filter(i => i.store === building.id)
    : [];

  return (
    <aside className="action-panel">
      <h2 className="action-panel__title">Actions</h2>
      <div className="action-panel__budget">
        {player.hoursRemaining} hour{player.hoursRemaining !== 1 ? 's' : ''} remaining
      </div>
      
      {building ? (
        <div className="action-panel__context">
          <p>At: <strong>{building.name}</strong></p>
          <p style={{ fontSize: '12px', fontStyle: 'italic', marginBottom: '10px' }}>{building.description}</p>
          
          <hr style={{ margin: '15px 0', borderColor: '#333' }} />

          {/* If your job is at this building, show the Work button prominently at the top */}
          {playerJobHere && (
            <div style={{ padding: '10px', background: '#2c3e50', borderRadius: '4px', marginBottom: '15px' }}>
              <WorkStation
                player={player}
                onAction={onAction}
                job={playerJobHere}
              />
            </div>
          )}

          {/* Employment Office: show ALL jobs for applying */}
          {building.archetype === 'employment' && (
            <JobBoard 
              player={player} 
              onAction={onAction} 
              availableJobs={campaign.jobs} 
            />
          )}

          {/* Any building with items for sale: shops, restaurant, grocery */}
          {itemsHere.length > 0 && (
            <StoreFront 
              player={player} 
              onAction={onAction} 
              availableItems={itemsHere} 
            />
          )}

          {/* University: enrollment and study */}
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
