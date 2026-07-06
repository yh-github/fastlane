/**
 * dataLoader.ts — Campaign data parser and validator.
 *
 * Responsible for loading, parsing, and validating all JSON data
 * from /campaigns/<campaign_id>/. This is the single gateway
 * between raw campaign data files and the engine's typed models.
 *
 * Design principle: The engine never hard-codes game content.
 * All entities (jobs, items, buildings, etc.) come from campaign JSON.
 */

// ─── Campaign Data Types ────────────────────────────────────────

export interface CampaignConfig {
  name: string;
  version: string;
  startingMoney: number;
  winConditions: WinCondition[];
  mapRules: Record<string, unknown>;
}

export interface WinCondition {
  stat: string;
  target: number;
  label: string;
}

export interface BuildingDef {
  id: string;
  name: string;
  archetype: string;
  spritePath: string;
  description: string;
}

export interface JobDef {
  id: string;
  title: string;
  locationId: string;
  wage: number;
  requirements: JobRequirement[];
}

export interface JobRequirement {
  stat: string;
  minValue: number;
}

export interface ItemDef {
  id: string;
  name: string;
  category: 'food' | 'clothes' | 'appliance' | 'luxury';
  price: number;
  happinessBonus: number;
  description: string;
}

export interface EducationDef {
  id: string;
  degreeName: string;
  classes: EducationClass[];
  totalCreditsRequired: number;
}

export interface EducationClass {
  name: string;
  cost: number;
  creditsAwarded: number;
}

export interface HousingDef {
  id: string;
  name: string;
  rentPerWeek: number;
  deposit: number;
  robberyModifier: number;
  description: string;
}

export interface EventDef {
  id: string;
  name: string;
  description: string;
  phase: 'weekday' | 'weekend' | 'any';
  probability: number;
  effects: EventEffect[];
}

export interface EventEffect {
  stat: string;
  delta: number;
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

// ─── Campaign Bundle ────────────────────────────────────────────

export interface CampaignBundle {
  config: CampaignConfig;
  buildings: BuildingDef[];
  jobs: JobDef[];
  items: ItemDef[];
  education: EducationDef[];
  housing: HousingDef[];
  events: EventDef[];
  map: MapData;
}

// ─── Loader Functions ───────────────────────────────────────────

/**
 * Load a single JSON file from a campaign directory.
 * Uses Vite's dynamic import to resolve from /campaigns/.
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
 * Throws descriptive errors for missing/invalid data.
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
  const [config, buildings, jobs, items, education, housing, events, map] =
    await Promise.all([
      loadJSON<CampaignConfig>(campaignId, 'config.json'),
      loadJSON<BuildingDef[]>(campaignId, 'buildings.json'),
      loadJSON<JobDef[]>(campaignId, 'jobs.json'),
      loadJSON<ItemDef[]>(campaignId, 'items.json'),
      loadJSON<EducationDef[]>(campaignId, 'education.json'),
      loadJSON<HousingDef[]>(campaignId, 'housing.json'),
      loadJSON<EventDef[]>(campaignId, 'events.json'),
      loadJSON<MapData>(campaignId, 'map.json'),
    ]);

  // Validate critical files
  validateConfig(config);

  return { config, buildings, jobs, items, education, housing, events, map };
}

/**
 * List available campaign IDs.
 * In production this would scan the /campaigns/ directory;
 * for now we maintain a static registry.
 */
export function getAvailableCampaigns(): string[] {
  return ['classic_1990'];
}
