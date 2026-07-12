import type { CampaignBundle } from '../engine/dataLoader';
import type { GameRules, PlayerState } from '../engine/gameState';
import { 
  JobBoard, 
  StoreFront, 
  UniversityRegistry, 
  WorkStation,
  HomeRelax,
  RentOffice,
  BankInterface,
  PawnShop 
} from './BuildingInteractions';

interface BuildingModalProps {
  player: PlayerState | null;
  campaign: CampaignBundle | null;
  currentBuildingId: string | null;
  turn: number;
  economicIndex: number;
  rules: GameRules;
  onAction: (actionPayload: any) => void;
  onClose: () => void;
}

export function BuildingModal({ player, campaign, currentBuildingId, turn, economicIndex, rules, onAction, onClose }: BuildingModalProps) {
  if (!player || !campaign || !currentBuildingId) return null;

  const building = campaign.buildings.find(b => b.id === currentBuildingId);
  if (!building) return null;

  // Check if the player's current job is at this building
  const playerJobHere = player.currentJobId 
    ? campaign.jobs.find(j => j.id === player.currentJobId && j.locationId === currentBuildingId)
    : null;

  // Items available at this building
  let itemsHere = campaign.items.filter(i => i.store === building.id);

  // Z-Mart randomization (show 6 items consistently per week per player)
  if (building.id === 'z_mart' && itemsHere.length > 6) {
    let seed = turn * 1337 + (player.id.charCodeAt(player.id.length - 1) || 0) * 12345;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    let shuffled = [...itemsHere];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    itemsHere = shuffled.slice(0, 6);
  }

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
            buildings={campaign.buildings}
            economicIndex={economicIndex}
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
            rules={rules}
            campaign={campaign}
            economicIndex={economicIndex}
          />
        )}

        {/* Home: relax to end turn */}
        {/* Home: relax to end turn */}
        {building.archetype === 'housing' && (
          <RentOffice 
            player={player}
            campaign={campaign}
            turn={turn}
            economicIndex={economicIndex}
            rules={rules}
            onAction={onAction}
          />
        )}
        {building.archetype === 'bank' && (
          <BankInterface 
            player={player}
            campaign={campaign}
            turn={turn}
            economicIndex={economicIndex}
            rules={rules}
            onAction={onAction}
          />
        )}
        {building.archetype === 'pawnshop' && (
          <PawnShop 
            player={player}
            onAction={onAction}
            economicIndex={economicIndex}
          />
        )}
        {building.archetype === 'home' && (() => {
          const housing = campaign.housing.find(h => h.id === player.currentHousingId);
          const homeNode = campaign.map.nodes.find(n => n.id === housing?.homeNodeId);
          const livesHere = homeNode?.buildingId === building.id;

          return livesHere ? (
            <HomeRelax 
              player={player}
              onAction={onAction}
            />
          ) : (
            <div className="interaction-panel">
              <h3>{building.name}</h3>
              <p style={{ fontSize: '12px' }}>You don't live here.</p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
