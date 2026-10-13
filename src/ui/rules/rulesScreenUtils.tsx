import React from 'react';
import type { 
  CampaignBundle, 
  CampaignInfo, 
  JobDef, 
  ItemDef, 
  BuildingDef,
  SynergyDef 
} from '../../engine/dataLoader';

export type TabType = 'all-diffs' | 'rules' | 'jobs' | 'items' | 'locations' | 'goals-housing';
export type SortDirection = 'asc' | 'desc';

export interface LoadedCampaignData {
  info: CampaignInfo;
  gameRules: Record<string, any>;
  timeRules: Record<string, any>;
  economyRules: Record<string, any>;
  statRules: Record<string, any>;
  eventRules: Record<string, any>;
  bundle: CampaignBundle;
}

export interface DiffInfo {
  ruleDiffKeys: Record<string, string[]>;
  diffRulesCount: number;
  diffJobIds: string[];
  diffItemIds: string[];
  diffBuildingIds: string[];
  identicalBuildingIds: string[];
  hasWinConditionDiffs: boolean;
  diffHousingIds: string[];
  diffGoalsHousingCount: number;
  totalDiffs: number;
}

// Utility to flatten nested objects (like eventRules.charity.maxCash)
export function flattenObject(ob: any, prefix = ''): Record<string, any> {
  if (!ob) return {};
  let toReturn: Record<string, any> = {};
  for (const i in ob) {
    if (!Object.prototype.hasOwnProperty.call(ob, i)) continue;
    if ((typeof ob[i]) === 'object' && ob[i] !== null && !Array.isArray(ob[i])) {
      const flatObject = flattenObject(ob[i], prefix + i + '.');
      for (const x in flatObject) {
        if (!Object.prototype.hasOwnProperty.call(flatObject, x)) continue;
        toReturn[x] = flatObject[x];
      }
    } else {
      toReturn[prefix + i] = ob[i];
    }
  }
  return toReturn;
}

export function areJobsEqual(j1?: JobDef, j2?: JobDef): boolean {
  if (!j1 && !j2) return true;
  if (!j1 || !j2) return false;
  if (j1.title !== j2.title) return false;
  if (j1.locationId !== j2.locationId) return false;
  if (j1.baseWage !== j2.baseWage) return false;
  if (j1.requirements.experience !== j2.requirements.experience) return false;
  if (j1.requirements.dependability !== j2.requirements.dependability) return false;
  if (j1.requirements.uniform !== j2.requirements.uniform) return false;
  const deg1 = (j1.requirements.degrees || []).slice().sort().join(',');
  const deg2 = (j2.requirements.degrees || []).slice().sort().join(',');
  if (deg1 !== deg2) return false;
  const tags1 = (j1.tags || []).slice().sort().join(',');
  const tags2 = (j2.tags || []).slice().sort().join(',');
  if (tags1 !== tags2) return false;
  const perks1 = (j1.perks || []).slice().sort().join(',');
  const perks2 = (j2.perks || []).slice().sort().join(',');
  if (perks1 !== perks2) return false;
  return true;
}

export function areItemsEqual(i1?: ItemDef, i2?: ItemDef): boolean {
  if (!i1 && !i2) return true;
  if (!i1 || !i2) return false;
  if (i1.name !== i2.name) return false;
  if (i1.category !== i2.category) return false;
  if (i1.subcategory !== i2.subcategory) return false;
  if (i1.basePrice !== i2.basePrice) return false;
  if (i1.happinessBonus !== i2.happinessBonus) return false;
  if ((i1.lifestyleValue ?? 0) !== (i2.lifestyleValue ?? 0)) return false;
  if ((i1.mentalBonus ?? 0) !== (i2.mentalBonus ?? 0)) return false;
  if ((i1.space ?? 0) !== (i2.space ?? 0)) return false;
  const tags1 = (i1.tags || []).slice().sort().join(',');
  const tags2 = (i2.tags || []).slice().sort().join(',');
  if (tags1 !== tags2) return false;
  const eff1 = JSON.stringify(i1.effects || []);
  const eff2 = JSON.stringify(i2.effects || []);
  if (eff1 !== eff2) return false;
  return true;
}

export function areBuildingsEqual(b1?: BuildingDef, b2?: BuildingDef): boolean {
  if (!b1 && !b2) return true;
  if (!b1 || !b2) return false;
  if (b1.name !== b2.name) return false;
  if (b1.archetype !== b2.archetype) return false;
  if ((b1 as any).cost !== (b2 as any).cost) return false;
  if ((b1 as any).entryCost !== (b2 as any).entryCost) return false;
  const inv1 = (b1.inventory || [])
    .map(i => `${i.itemId}:${i.priceOverride ?? ''}:${i.weeksOverride ?? ''}:${i.nameOverride ?? ''}:${(i.tags || []).slice().sort().join(',')}`)
    .sort()
    .join(';');
  const inv2 = (b2.inventory || [])
    .map(i => `${i.itemId}:${i.priceOverride ?? ''}:${i.weeksOverride ?? ''}:${i.nameOverride ?? ''}:${(i.tags || []).slice().sort().join(',')}`)
    .sort()
    .join(';');
  if (inv1 !== inv2) return false;
  return true;
}

export function getTagSynergyDescriptions(tag: string, synergies?: SynergyDef[]): string[] {
  const descriptions: string[] = [];
  
  if (synergies && synergies.length > 0) {
    const relevant = synergies.filter(s => s.requires && s.requires.includes(`tag:${tag}`));
    for (const syn of relevant) {
      if (syn.description) {
        descriptions.push(`${syn.name}: ${syn.description}`);
      } else {
        const effectDescs = syn.effects.map(e => {
          switch (e.type) {
            case 'prevent_relaxation_decay':
              return 'Prevents natural relaxation decay from dropping below doctor threshold';
            case 'add_turn_happiness':
              return `${e.value > 0 ? `+${e.value}` : e.value} Happiness/turn when food eaten (shared MAX bonus with Stove/Microwave)`;
            case 'set_food_storage':
              return syn.requires.length > 1
                ? `Extends food storage up to ${e.value} weeks (with Refrigerator)`
                : `Enables food storage up to ${e.value} weeks`;
            case 'computer_income_chance':
              return 'Freelance computer income ($10–$150/turn) plus +3 Happiness';
            default:
              return `${e.type}: ${e.value}`;
          }
        });
        descriptions.push(`${syn.name}: ${effectDescs.join(', ')}`);
      }
    }
  }

  // Fallback for standard tags if synergies not loaded
  if (descriptions.length === 0) {
    switch (tag) {
      case 'hot_tub':
        descriptions.push('Hot Tub Relaxation: Prevents natural relaxation decay from dropping below doctor threshold');
        break;
      case 'microwave':
        descriptions.push('Microwave Happiness: +1 Happiness/turn when food eaten (shared MAX bonus with Stove)');
        break;
      case 'stove':
        descriptions.push('Cooking Happiness: +1 Happiness/turn when food eaten (shared MAX bonus with Microwave)');
        break;
      case 'refrigerator':
        descriptions.push('Base Refrigeration: Food storage up to 6 weeks');
        break;
      case 'freezer':
        descriptions.push('Full Refrigeration: Food storage up to 12 weeks (with Refrigerator)');
        break;
      case 'computer':
        descriptions.push('Computer Income: Freelance income ($10–$150/turn) plus +3 Happiness');
        break;
    }
  }

  return descriptions;
}

export function compareValues(a: any, b: any, dir: SortDirection): number {
  let res = 0;
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    res = (a === b ? 0 : a ? 1 : -1);
  } else if (typeof a === 'number' && typeof b === 'number') {
    res = a - b;
  } else {
    res = String(a ?? '').localeCompare(String(b ?? ''));
  }
  return dir === 'asc' ? res : -res;
}

export function renderValueCell(value: any, isDiffering: boolean = false) {
  if (typeof value === 'boolean') {
    return value 
      ? <span style={{ color: '#4ade80', fontWeight: 'bold' }}>ON</span> 
      : <span style={{ color: '#f87171', fontWeight: 'bold' }}>OFF</span>;
  }
  return (
    <span style={{ 
      fontWeight: isDiffering ? 'bold' : 'normal', 
      color: isDiffering ? '#60a5fa' : 'inherit' 
    }}>
      {String(value ?? '-')}
    </span>
  );
}

export function renderSortIndicator(currentSort?: { col: string; dir: SortDirection }, col?: string) {
  if (!currentSort || currentSort.col !== col) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
  return <span style={{ color: '#60a5fa', marginLeft: '4px' }}>{currentSort.dir === 'asc' ? '▲' : '▼'}</span>;
}

export const headerStyle: React.CSSProperties = {
  padding: '0.8rem 1rem',
  borderBottom: '2px solid #52525b',
  cursor: 'pointer',
  userSelect: 'none',
};
