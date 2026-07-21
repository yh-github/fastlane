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
  statRules?: StatRules;
  eventRules?: EventRules;
  gameRules?: Partial<GameRules>;
  baseCampaign?: string;
}

export type {
  GameRules,
  EventRules,
  StatRules,
  WinCondition,
  TimeRules,
  EconomyRules,
} from './rules';

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
  tags?: string[];
}

export interface ItemDef {
  id: string;
  name: string;
  category: 'appliance' | 'clothes' | 'food' | 'book' | 'ticket' | 'junk';
  subcategory?: string;
  store: string;
  basePrice: number;
  happinessBonus: number;
  weeks?: number;
  units?: number;
  tags?: string[];
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

export interface SynergyEffect {
  type: string;
  value: number;
  operation: 'MAX' | 'ADD' | 'SET';
}

export interface SynergyDef {
  id: string;
  name: string;
  requires: string[];
  effects: SynergyEffect[];
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
  synergies: SynergyDef[];
}

// ─── Loader Functions ───────────────────────────────────────────

/**
 * Deep merge utility for merging delta configs on top of a base.
 */
function deepMerge<T>(base: any, delta: any): T {
  if (base === undefined || base === null) return delta as T;
  if (delta === undefined || delta === null) return base as T;

  if (Array.isArray(base) && Array.isArray(delta)) {
    if (delta.length > 0 && typeof delta[0] === 'object' && delta[0] !== null && 'id' in delta[0]) {
      const merged = [...base];
      for (const dItem of delta) {
        if (typeof dItem === 'object' && dItem !== null && 'id' in dItem) {
          const bIndex = merged.findIndex((bItem: any) => typeof bItem === 'object' && bItem !== null && bItem.id === dItem.id);
          if (bIndex !== -1) {
            merged[bIndex] = deepMerge(merged[bIndex], dItem);
          } else {
            merged.push(dItem);
          }
        } else {
          merged.push(dItem);
        }
      }
      return merged as unknown as T;
    } else {
      return delta as unknown as T;
    }
  }

  if (typeof base === 'object' && typeof delta === 'object') {
    const merged = { ...base };
    for (const key in delta) {
      if (Object.prototype.hasOwnProperty.call(delta, key)) {
        merged[key] = deepMerge(base[key], delta[key]);
      }
    }
    return merged as T;
  }

  return delta as T;
}

/**
 * Load a single JSON file from a campaign directory.
 */
async function loadJSON<T>(campaignId: string, filename: string, optional: boolean = false): Promise<T | null> {
  const url = `/campaigns/${campaignId}/${filename}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    if (optional && response.status === 404) {
      return null;
    }
    throw new Error(
      `Failed to load campaign data: ${url} (${response.status} ${response.statusText})`
    );
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/html')) {
    if (optional) {
      return null;
    }
    throw new Error(
      `Failed to load campaign data: ${url} (Expected JSON, got HTML)`
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
  const config = await loadJSON<CampaignConfig>(campaignId, 'config.json', false);
  if (!config) throw new Error('config.json missing');

  let baseBundle: CampaignBundle | null = null;
  if (config.baseCampaign) {
    baseBundle = await loadCampaign(config.baseCampaign);
  }

  const isDelta = !!baseBundle;

  const [buildings, jobs, items, education, housing, events, stocks, map, messages, weekends, synergies] =
    await Promise.all([
      loadJSON<BuildingDef[]>(campaignId, 'buildings.json', isDelta),
      loadJSON<JobDef[]>(campaignId, 'jobs.json', isDelta),
      loadJSON<ItemDef[]>(campaignId, 'items.json', isDelta),
      loadJSON<EducationDef[]>(campaignId, 'education.json', isDelta),
      loadJSON<HousingDef[]>(campaignId, 'housing.json', isDelta),
      loadJSON<EventDef[]>(campaignId, 'events.json', isDelta),
      loadJSON<StockDef[]>(campaignId, 'stocks.json', isDelta),
      loadJSON<MapData>(campaignId, 'map.json', isDelta),
      loadJSON<Record<string, string>>(campaignId, 'messages.json', true).catch(() => null),
      loadJSON<WeekendDef>(campaignId, 'weekends.json', isDelta),
      loadJSON<SynergyDef[]>(campaignId, 'synergies.json', true).catch(() => null)
    ]);

  const partialBundle: Partial<CampaignBundle> = { config };
  if (buildings) partialBundle.buildings = buildings;
  if (jobs) partialBundle.jobs = jobs;
  if (items) partialBundle.items = items;
  if (education) partialBundle.education = education;
  if (housing) partialBundle.housing = housing;
  if (events) partialBundle.events = events;
  if (stocks) partialBundle.stocks = stocks;
  if (map) partialBundle.map = map;
  if (messages) partialBundle.messages = messages;
  if (weekends) partialBundle.weekends = weekends;
  if (synergies) partialBundle.synergies = synergies;

  let finalBundle: CampaignBundle;
  if (baseBundle) {
    finalBundle = deepMerge<CampaignBundle>(baseBundle, partialBundle);
  } else {
    finalBundle = {
      config,
      buildings: buildings || [],
      jobs: jobs || [],
      items: items || [],
      education: education || [],
      housing: housing || [],
      events: events || [],
      stocks: stocks || [],
      map: map || { width: 0, height: 0, nodes: [] },
      messages: messages || {},
      weekends: weekends || { ticketWeekends: {}, durableWeekends: {}, randomWeekends: [] },
      synergies: synergies || []
    };
  }

  validateConfig(finalBundle.config);

  return finalBundle;
}

export interface CampaignInfo {
  id: string;
  name: string;
  description: string;
}

/**
 * List available campaigns (hardcoded for now, as there's no backend to list folders).
 */
export function getAvailableCampaigns(): CampaignInfo[] {
  return [
    {
      id: '1990_classic_floppy',
      name: 'Classic 1990 (Floppy)',
      description: 'The original harsh rules: early robberies, low charity threshold, tough entry-level jobs.'
    },
    {
      id: '1990_classic_cdrom',
      name: 'Classic 1990 (CD-ROM)',
      description: 'More forgiving rules with entry-level jobs, delayed robberies, and higher charity bounds.'
    },
    {
      id: 'qol_improved',
      name: 'QoL Improved (Recommended)',
      description: 'Based on CD-ROM but adds helpful UI elements and strict eviction logic.'
    }
  ];
}
