import type { PlayerState } from '../engine/gameState';
import type { CampaignBundle } from '../engine/dataLoader';
import { JobBoard, StoreFront, UniversityRegistry, WorkStation, HomeRelax } from './BuildingInteractions';

interface BuildingModalProps {
  player: PlayerState | null;
  campaign: CampaignBundle | null;
  currentBuildingId: string | null;
  onAction: (actionPayload: any) => void;
  onClose: () => void;
}

export function BuildingModal({ player, campaign, currentBuildingId, onAction, onClose }: BuildingModalProps) {
  if (!player || !campaign || !currentBuildingId) return null;

  const building = campaign.buildings.find(b => b.id === currentBuildingId);
  if (!building) return null;

  // Check if the player's current job is at this building
  const playerJobHere = player.currentJobId 
    ? campaign.jobs.find(j => j.id === player.currentJobId && j.locationId === currentBuildingId)
    : null;

  // Items available at this building
  const itemsHere = campaign.items.filter(i => i.store === building.id);

  const getFace = (archetype: string) => {
    switch (archetype) {
      case 'employment': return '👨‍💼';
      case 'workplace': return '👷';
      case 'restaurant': return '👨‍🍳';
      case 'education': return '👨‍🏫';
      case 'shop':
      case 'grocery':
      case 'pawnshop': return '🧑‍🌾';
      case 'home':
      case 'housing': return '🛌';
      case 'bank': return '🏦';
      default: return '😐';
    }
  };

  return (
    <div className="building-modal">
      <button className="building-modal__close" onClick={onClose}>&times;</button>
      
      <div className="building-modal__header">
        <div className="building-modal__face">{getFace(building.archetype)}</div>
        <div className="building-modal__title-group">
          <h2>{building.name}</h2>
          <p>{building.description}</p>
        </div>
      </div>

      <div className="building-modal__content">
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

        {/* Home: relax to end turn */}
        {building.archetype === 'home' && (
          <HomeRelax 
            player={player}
            onAction={onAction}
          />
        )}
      </div>
    </div>
  );
}
