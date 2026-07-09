/**
 * dataLoader.ts — Campaign data parser and validator.
 *
 * Single gateway between raw campaign data files and the engine's typed models.
 */

// ─── Campaign Data Types ────────────────────────────────────────

export interface CampaignConfig {
  name: string;
  version: string;
  description: string;
  startingMoney: number;
  winConditions: WinCondition[];
  timeRules: TimeRules;
  economyRules: EconomyRules;
  mapRules: Record<string, unknown>;
}

export interface WinCondition {
  stat: string;
  target: number;
  label: string;
}

export interface TimeRules {
  hoursPerTurn: number;
  buildingEntryCost: number;
  workSessionCost: number;
  studySessionCost: number;
  jobApplicationCost: number;
  relaxCost: number;
  newspaperCost: number;
  starvationPenalty: number;
  doctorPenalty: number;
}

export interface EconomyRules {
  rentGarnishRate: number;
  rentFee: number;
  repairCostMin: number;
  repairCostMax: number;
  pawnPayoutRate: number;
  pawnRedeemRate: number;
}

export interface BuildingDef {
  id: string;
  name: string;
  archetype: string;
  spritePath: string;
  description: string;
}

export interface JobRequirements {
  experience: number;
  dependability: number;
  degrees: string[];
  uniform: 'casual' | 'dress' | 'business';
}

export interface JobDef {
  id: string;
  title: string;
  locationId: string;
  baseWage: number;
  requirements: JobRequirements;
  perks: string[];
}

export interface ItemDef {
  id: string;
  name: string;
  category: 'appliance' | 'clothes' | 'food' | 'book' | 'ticket' | 'junk';
  store: string;
  basePrice: number;
  happinessBonus: number;
  weeks?: number;
  units?: number;
}

export interface EducationDef {
  id: string;
  name: string;
  prerequisites: string[];
  baseTuitionFee: number;
  lessonsRequired: number;
  rewards: {
    happiness: number;
    dependability: number;
    maxDepBoost: number;
    maxExpBoost: number;
  };
}

export interface HousingDef {
  id: string;
  name: string;
  baseRent: number;
  isRobberyImmune: boolean;
  description: string;
  homeNodeId: string;
}

export interface EventDef {
  id: string;
  type: string;
  trigger: string;
  probability?: number;
  severity?: string;
  effects: Record<string, any>;
}

export interface StockDef {
  id: string;
  name: string;
  type: 'fixed' | 'fluctuating';
  basePrice: number;
  minPrice?: number;
  maxPrice?: number;
  sellFeePercent?: number;
}

export interface MapNode {
  id: string;
  x: number;
  y: number;
  buildingId?: string;
  connections: string[];
}

export interface MapData {
  width: number;
  height: number;
  nodes: MapNode[];
}

export interface WeekendDef {
  ticketWeekends: Record<string, { text: string }>;
  durableWeekends: Record<string, { text: string }>;
  randomWeekends: string[];
}

// ─── Campaign Bundle ────────────────────────────────────────────

export interface CampaignBundle {
  config: CampaignConfig;
  buildings: BuildingDef[];
  jobs: JobDef[];
  items: ItemDef[];
  education: EducationDef[];
  housing: HousingDef[];
  events: EventDef[];
  stocks: StockDef[];
  map: MapData;
  messages: Record<string, string>;
  weekends: WeekendDef;
}

// ─── Loader Functions ───────────────────────────────────────────

/**
 * Load a single JSON file from a campaign directory.
 */
async function loadJSON<T>(campaignId: string, filename: string): Promise<T> {
  const url = `/campaigns/${campaignId}/${filename}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to load campaign data: ${url} (${response.status} ${response.statusText})`
    );
  }
  return response.json() as Promise<T>;
}

/**
 * Validate that a loaded config has required fields.
 */
function validateConfig(config: unknown): asserts config is CampaignConfig {
  const c = config as Record<string, unknown>;
  if (typeof c.name !== 'string') throw new Error('config.json: missing "name"');
  if (typeof c.startingMoney !== 'number') throw new Error('config.json: missing "startingMoney"');
  if (!Array.isArray(c.winConditions)) throw new Error('config.json: missing "winConditions"');
}

/**
 * Load and validate an entire campaign bundle.
 *
 * @param campaignId — Folder name under /campaigns/ (e.g., "classic_1990")
 * @returns            Fully typed and validated campaign data
 */
export async function loadCampaign(campaignId: string): Promise<CampaignBundle> {
  const [config, buildings, jobs, items, education, housing, events, stocks, map, messages, weekends] =
    await Promise.all([
      loadJSON<CampaignConfig>(campaignId, 'config.json'),
      loadJSON<BuildingDef[]>(campaignId, 'buildings.json'),
      loadJSON<JobDef[]>(campaignId, 'jobs.json'),
      loadJSON<ItemDef[]>(campaignId, 'items.json'),
      loadJSON<EducationDef[]>(campaignId, 'education.json'),
      loadJSON<HousingDef[]>(campaignId, 'housing.json'),
      loadJSON<EventDef[]>(campaignId, 'events.json'),
      loadJSON<StockDef[]>(campaignId, 'stocks.json'),
      loadJSON<MapData>(campaignId, 'map.json'),
      loadJSON<Record<string, string>>(campaignId, 'messages.json').catch(() => ({})),
      loadJSON<WeekendDef>(campaignId, 'weekends.json')
    ]);

  // Validate critical files
  validateConfig(config);

  return { config, buildings, jobs, items, education, housing, events, stocks, map, messages, weekends };
}

/**
 * List available campaign IDs.
 */
export function getAvailableCampaigns(): string[] {
  return ['classic_1990'];
}
