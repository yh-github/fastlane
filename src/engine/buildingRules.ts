import type { PlayerState, GameRules } from './gameState';
import type { CampaignBundle } from './dataLoader';

export interface BuildingEntryCheck {
  canEnter: boolean;
  reason?: 'dont_live_here' | 'rent_office_closed';
  nextOpenWeek?: number;
}

/**
 * Returns whether the Rent Office (apartment complex) is currently open for the given player and turn.
 *
 * The Rent Office is open if:
 * 1. It is a rent week (turn % 4 === 0)
 * 2. Rent is due/overdue (player.rentPaidUntilWeek <= turn)
 * 3. The player owes rent debt (player.rentDebt > 0)
 * 4. The player paid rent or moved this turn (player.turnFlags?.rentPaidThisTurn)
 * 5. The player is employed at the Rent Office (and allowEmployedRentPayment is true, or during their shift)
 */
export function isRentOfficeOpen(
  player: PlayerState,
  turn: number,
  campaign?: CampaignBundle | null,
  rules?: GameRules
): boolean {
  const isWeek4 = turn % 4 === 0;
  const rentDue = player.rentPaidUntilWeek <= turn;
  const hasRentDebt = (player.rentDebt || 0) > 0;
  const rentPaidThisTurn = Boolean(player.turnFlags?.rentPaidThisTurn);
  const isJobHere = Boolean(
    player.currentJobId &&
    campaign?.jobs?.some(j => j.id === player.currentJobId && j.locationId === 'apartment_complex')
  );

  return isWeek4 || rentDue || hasRentDebt || rentPaidThisTurn || (isJobHere && (rules?.allowEmployedRentPayment ?? true));
}

/**
 * Calculate the next turn when the Rent Office will be open.
 */
export function getNextRentOfficeOpenWeek(
  player: PlayerState,
  turn: number
): number {
  const nextWeek4 = Math.floor(turn / 4) * 4 + 4;
  const nextRentDueWeek = player.rentPaidUntilWeek > turn ? player.rentPaidUntilWeek : nextWeek4;
  return Math.min(nextWeek4, nextRentDueWeek);
}

/**
 * Returns whether a player lives at the specified building or map node.
 */
export function playerLivesAt(
  player: PlayerState,
  buildingOrNodeId: string,
  campaign?: CampaignBundle | null
): boolean {
  const currentHousing = campaign?.housing?.find(h => h.id === player.currentHousingId);
  if (currentHousing) {
    if (currentHousing.homeNodeId === buildingOrNodeId) return true;
    if (currentHousing.id === buildingOrNodeId) return true;
  }

  // Canonical mapping check for base campaigns (low_cost vs security)
  if (player.currentHousingId === 'low_cost') {
    if (buildingOrNodeId === 'low_cost_housing' || buildingOrNodeId === 'node_low_cost') return true;
  }
  if (player.currentHousingId === 'security') {
    if (buildingOrNodeId === 'security_apartments' || buildingOrNodeId === 'node_security') return true;
  }
  if (player.currentHousingId === 'penthouse') {
    if (buildingOrNodeId === 'security_apartments' || buildingOrNodeId === 'node_security' || buildingOrNodeId === 'penthouse') return true;
  }

  // Check campaign buildings by archetype
  const b = campaign?.buildings?.find(b => b.id === buildingOrNodeId);
  if (b && b.archetype === 'home') {
    if (currentHousing?.homeNodeId) {
      const node = campaign?.map?.nodes?.find(n => n.id === currentHousing.homeNodeId);
      if (node?.buildingId === b.id) return true;
    }
    return false;
  }

  // Check map node building
  const node = campaign?.map?.nodes?.find(n => n.id === buildingOrNodeId);
  if (node?.buildingId) {
    return playerLivesAt(player, node.buildingId, campaign);
  }

  return false;
}

/**
 * Checks whether a player can enter the given building.
 */
export function canEnterBuilding(
  buildingId: string,
  player: PlayerState,
  _turn?: number,
  campaign?: CampaignBundle | null,
  _rules?: GameRules
): BuildingEntryCheck {
  const building = campaign?.buildings?.find(b => b.id === buildingId);
  const archetype = building?.archetype;

  // Employees can always enter their workplace (e.g. to work their shift)
  const isEmployedHere = Boolean(
    player.currentJobId &&
    campaign?.jobs?.some(j => j.id === player.currentJobId && j.locationId === buildingId)
  );
  if (isEmployedHere) {
    return { canEnter: true };
  }

  // Home buildings: can only enter if the player actually lives here
  if (archetype === 'home' || buildingId === 'low_cost_housing' || buildingId === 'security_apartments') {
    if (!playerLivesAt(player, buildingId, campaign)) {
      return { canEnter: false, reason: 'dont_live_here' };
    }
  }

  return { canEnter: true };
}
