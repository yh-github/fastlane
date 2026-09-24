import React, { useEffect, useState, useMemo } from 'react';
import { 
  getAvailableCampaigns, 
  loadCampaign, 
  type CampaignBundle, 
  type CampaignInfo, 
  type JobDef, 
  type ItemDef, 
  type BuildingDef
} from '../engine/dataLoader';
import { DEFAULT_GAME_RULES, RULE_DESCRIPTIONS } from '../engine/rules';

export type TabType = 'all-diffs' | 'rules' | 'jobs' | 'items' | 'locations' | 'goals-housing';
type SortDirection = 'asc' | 'desc';

export interface RulesScreenProps {
  onClose: () => void;
  initialTab?: TabType;
  initialDiffMode?: boolean;
}

interface LoadedCampaignData {
  info: CampaignInfo;
  gameRules: Record<string, any>;
  timeRules: Record<string, any>;
  economyRules: Record<string, any>;
  statRules: Record<string, any>;
  eventRules: Record<string, any>;
  bundle: CampaignBundle;
}

// Utility to flatten nested objects (like eventRules.charity.maxCash)
function flattenObject(ob: any, prefix = ''): Record<string, any> {
  if (!ob) return {};
  let toReturn: Record<string, any> = {};
  for (const i in ob) {
    if (!ob.hasOwnProperty(i)) continue;
    if ((typeof ob[i]) === 'object' && ob[i] !== null && !Array.isArray(ob[i])) {
      const flatObject = flattenObject(ob[i], prefix + i + '.');
      for (const x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue;
        toReturn[x] = flatObject[x];
      }
    } else {
      toReturn[prefix + i] = ob[i];
    }
  }
  return toReturn;
}

function areJobsEqual(j1?: JobDef, j2?: JobDef): boolean {
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

function areItemsEqual(i1?: ItemDef, i2?: ItemDef): boolean {
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

function areBuildingsEqual(b1?: BuildingDef, b2?: BuildingDef): boolean {
  if (!b1 && !b2) return true;
  if (!b1 || !b2) return false;
  if (b1.name !== b2.name) return false;
  if (b1.archetype !== b2.archetype) return false;
  if ((b1 as any).cost !== (b2 as any).cost) return false;
  if ((b1 as any).entryCost !== (b2 as any).entryCost) return false;
  const inv1 = (b1.inventory || [])
    .map(i => `${i.itemId}:${i.priceOverride ?? ''}:${(i.tags || []).slice().sort().join(',')}`)
    .sort()
    .join(';');
  const inv2 = (b2.inventory || [])
    .map(i => `${i.itemId}:${i.priceOverride ?? ''}:${(i.tags || []).slice().sort().join(',')}`)
    .sort()
    .join(';');
  if (inv1 !== inv2) return false;
  return true;
}

export const RulesScreen: React.FC<RulesScreenProps> = ({ 
  onClose, 
  initialTab = 'rules', 
  initialDiffMode = false 
}) => {
  const [loading, setLoading] = useState(true);
  const [campaignData, setCampaignData] = useState<LoadedCampaignData[]>([]);
  
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [diffMode, setDiffMode] = useState<boolean>(initialDiffMode);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showIdenticalLocations, setShowIdenticalLocations] = useState<boolean>(false);

  // Sorting states for each category
  const [sortState, setSortState] = useState<Record<string, { col: string, dir: SortDirection }>>({});

  useEffect(() => {
    async function fetchAll() {
      const available = getAvailableCampaigns();
      const loadedData: LoadedCampaignData[] = [];
      const defaultSelected = new Set<string>();
      
      for (const info of available) {
        try {
          const bundle: CampaignBundle = await loadCampaign(info.id);
          const finalGameRules = {
            ...DEFAULT_GAME_RULES,
            ...(bundle.config.gameRules || {})
          };
          loadedData.push({
            info,
            gameRules: flattenObject(finalGameRules),
            timeRules: flattenObject(bundle.config.timeRules),
            economyRules: flattenObject(bundle.config.economyRules),
            statRules: flattenObject(bundle.config.statRules),
            eventRules: flattenObject(bundle.config.eventRules),
            bundle
          });
          defaultSelected.add(info.id);
        } catch (e) {
          console.error(`Failed to load campaign ${info.id} for rules display`, e);
        }
      }
      setCampaignData(loadedData);
      setSelectedCampaignIds(defaultSelected);
      setLoading(false);
    }
    
    fetchAll();
  }, []);

  const selectedData = useMemo(() => {
    return campaignData.filter(c => selectedCampaignIds.has(c.info.id));
  }, [campaignData, selectedCampaignIds]);

  // Compute differences across selected campaigns
  const diffInfo = useMemo(() => {
    if (selectedData.length <= 1) {
      return {
        ruleDiffKeys: {} as Record<string, string[]>,
        diffRulesCount: 0,
        diffJobIds: [] as string[],
        diffItemIds: [] as string[],
        diffBuildingIds: [] as string[],
        identicalBuildingIds: [] as string[],
        hasWinConditionDiffs: false,
        diffHousingIds: [] as string[],
        diffGoalsHousingCount: 0,
        totalDiffs: 0,
      };
    }

    // Rules differences
    const ruleCats: (keyof LoadedCampaignData)[] = ['gameRules', 'timeRules', 'economyRules', 'statRules', 'eventRules'];
    const ruleDiffKeys: Record<string, string[]> = {};
    let diffRulesCount = 0;

    for (const cat of ruleCats) {
      const allKeys = Array.from(new Set(
        selectedData.flatMap(c => Object.keys(c[cat] as Record<string, any>))
      ));
      const diffKeys = allKeys.filter(key => {
        const firstVal = (selectedData[0][cat] as Record<string, any>)[key];
        for (let i = 1; i < selectedData.length; i++) {
          const val = (selectedData[i][cat] as Record<string, any>)[key];
          if (val !== firstVal) return true;
        }
        return false;
      });
      ruleDiffKeys[cat] = diffKeys;
      diffRulesCount += diffKeys.length;
    }

    // Jobs differences
    const allJobIds = Array.from(new Set(
      selectedData.flatMap(c => (c.bundle.jobs || []).map(j => j.id))
    ));
    const diffJobIds = allJobIds.filter(jobId => {
      const firstJob = selectedData[0].bundle.jobs?.find(j => j.id === jobId);
      for (let i = 1; i < selectedData.length; i++) {
        const nextJob = selectedData[i].bundle.jobs?.find(j => j.id === jobId);
        if (!areJobsEqual(firstJob, nextJob)) return true;
      }
      return false;
    });

    // Items differences
    const allItemIds = Array.from(new Set(
      selectedData.flatMap(c => (c.bundle.items || []).map(i => i.id))
    ));
    const diffItemIds = allItemIds.filter(itemId => {
      const firstItem = selectedData[0].bundle.items?.find(i => i.id === itemId);
      for (let i = 1; i < selectedData.length; i++) {
        const nextItem = selectedData[i].bundle.items?.find(i => i.id === itemId);
        if (!areItemsEqual(firstItem, nextItem)) return true;
      }
      return false;
    });

    // Locations / Buildings differences
    const allBuildingIds = Array.from(new Set(
      selectedData.flatMap(c => (c.bundle.buildings || []).map(b => b.id))
    ));
    const diffBuildingIds = allBuildingIds.filter(bId => {
      const firstB = selectedData[0].bundle.buildings?.find(b => b.id === bId);
      for (let i = 1; i < selectedData.length; i++) {
        const nextB = selectedData[i].bundle.buildings?.find(b => b.id === bId);
        if (!areBuildingsEqual(firstB, nextB)) return true;
      }
      return false;
    });
    const identicalBuildingIds = allBuildingIds.filter(bId => !diffBuildingIds.includes(bId));

    // Win Conditions differences
    const firstWinCondStr = JSON.stringify(
      (selectedData[0].bundle.config.winConditions || []).map(w => ({ stat: w.stat, target: w.target })).sort((a, b) => a.stat.localeCompare(b.stat))
    );
    let hasWinConditionDiffs = false;
    for (let i = 1; i < selectedData.length; i++) {
      const winCondStr = JSON.stringify(
        (selectedData[i].bundle.config.winConditions || []).map(w => ({ stat: w.stat, target: w.target })).sort((a, b) => a.stat.localeCompare(b.stat))
      );
      if (winCondStr !== firstWinCondStr) {
        hasWinConditionDiffs = true;
        break;
      }
    }

    // Housing differences
    const allHousingIds = Array.from(new Set(
      selectedData.flatMap(c => (c.bundle.housing || []).map(h => h.id))
    ));
    const diffHousingIds = allHousingIds.filter(hId => {
      const firstH = selectedData[0].bundle.housing?.find(h => h.id === hId);
      for (let i = 1; i < selectedData.length; i++) {
        const nextH = selectedData[i].bundle.housing?.find(h => h.id === hId);
        if (!firstH && !nextH) continue;
        if (!firstH || !nextH || firstH.baseRent !== nextH.baseRent) return true;
      }
      return false;
    });

    const diffGoalsHousingCount = (hasWinConditionDiffs ? 1 : 0) + diffHousingIds.length;
    const totalDiffs = diffRulesCount + diffJobIds.length + diffItemIds.length + diffBuildingIds.length + diffGoalsHousingCount;

    return {
      ruleDiffKeys,
      diffRulesCount,
      diffJobIds,
      diffItemIds,
      diffBuildingIds,
      identicalBuildingIds,
      hasWinConditionDiffs,
      diffHousingIds,
      diffGoalsHousingCount,
      totalDiffs,
    };
  }, [selectedData]);

  if (loading) {
    return (
      <div className="fullscreen-overlay" style={{ background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2>Loading Rules Configuration...</h2>
      </div>
    );
  }

  const handleSortClick = (categoryKey: string, col: string) => {
    setSortState(prev => {
      const current = prev[categoryKey] || { col: 'key', dir: 'asc' };
      if (current.col === col) {
        return { ...prev, [categoryKey]: { col, dir: current.dir === 'asc' ? 'desc' : 'asc' } };
      }
      return { ...prev, [categoryKey]: { col, dir: 'asc' } };
    });
  };

  const toggleCampaign = (id: string) => {
    setSelectedCampaignIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllCampaigns = () => {
    setSelectedCampaignIds(new Set(campaignData.map(c => c.info.id)));
  };

  const renderValueCell = (value: any, isDiffering: boolean = false) => {
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
  };

  const renderSortIndicator = (categoryKey: string, col: string) => {
    const current = sortState[categoryKey] || { col: 'key', dir: 'asc' };
    if (current.col !== col) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
    return <span style={{ color: '#60a5fa', marginLeft: '4px' }}>{current.dir === 'asc' ? '▲' : '▼'}</span>;
  };

  const compareValues = (a: any, b: any, dir: SortDirection) => {
    let res = 0;
    if (typeof a === 'boolean' && typeof b === 'boolean') {
      res = (a === b ? 0 : a ? 1 : -1);
    } else if (typeof a === 'number' && typeof b === 'number') {
      res = a - b;
    } else {
      res = String(a ?? '').localeCompare(String(b ?? ''));
    }
    return dir === 'asc' ? res : -res;
  };

  const headerStyle: React.CSSProperties = {
    padding: '0.8rem 1rem',
    borderBottom: '2px solid #52525b',
    cursor: 'pointer',
    userSelect: 'none',
  };

  // ─── Render Rules Tables ───────────────────────────────────────
  const renderRuleTable = (title: string, categoryKey: keyof LoadedCampaignData, forcedDiffOnly: boolean = false) => {
    if (selectedData.length === 0) return null;

    const allKeys = Array.from(new Set(
      selectedData.flatMap(c => Object.keys(c[categoryKey] as Record<string, any>))
    ));

    const effectiveDiffOnly = forcedDiffOnly || (diffMode && selectedData.length > 1);

    let filteredKeys = allKeys;
    if (effectiveDiffOnly && selectedData.length > 1) {
      filteredKeys = diffInfo.ruleDiffKeys[categoryKey] || [];
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filteredKeys = filteredKeys.filter(key => 
        key.toLowerCase().includes(q) || (RULE_DESCRIPTIONS[key] || '').toLowerCase().includes(q)
      );
    }

    if (filteredKeys.length === 0) return null;

    const currentSort = sortState[categoryKey] || { col: 'key', dir: 'asc' };

    const sortedKeys = [...filteredKeys].sort((keyA, keyB) => {
      if (currentSort.col === 'key') {
        return compareValues(keyA, keyB, currentSort.dir);
      }
      if (currentSort.col === 'description') {
        const descA = RULE_DESCRIPTIONS[keyA] || '';
        const descB = RULE_DESCRIPTIONS[keyB] || '';
        return compareValues(descA, descB, currentSort.dir);
      }
      const campaignTarget = selectedData.find(c => c.info.id === currentSort.col);
      const valA = campaignTarget ? (campaignTarget[categoryKey] as Record<string, any>)[keyA] : undefined;
      const valB = campaignTarget ? (campaignTarget[categoryKey] as Record<string, any>)[keyB] : undefined;
      return compareValues(valA, valB, currentSort.dir);
    });

    return (
      <div key={categoryKey} style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ borderBottom: '2px solid #374151', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#60a5fa' }}>
          {title}
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#27272a', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)' }}>
          <thead>
            <tr style={{ background: '#3f3f46', textAlign: 'left' }}>
              <th style={{ ...headerStyle, width: '220px' }} onClick={() => handleSortClick(categoryKey, 'key')}>
                Rule Key {renderSortIndicator(categoryKey, 'key')}
              </th>
              <th style={{ ...headerStyle, minWidth: '300px' }} onClick={() => handleSortClick(categoryKey, 'description')}>
                Description {renderSortIndicator(categoryKey, 'description')}
              </th>
              {selectedData.map(c => (
                <th key={c.info.id} style={{ ...headerStyle, textAlign: 'center', minWidth: '120px' }} onClick={() => handleSortClick(categoryKey, c.info.id)}>
                  {c.info.name} {renderSortIndicator(categoryKey, c.info.id)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedKeys.map((key) => {
              const isDiffRow = (diffInfo.ruleDiffKeys[categoryKey] || []).includes(key);
              return (
                <tr key={key} style={{ 
                  borderBottom: '1px solid #3f3f46',
                  background: isDiffRow && selectedData.length > 1 ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                }}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: isDiffRow ? '#60a5fa' : '#93c5fd', fontWeight: 'bold' }}>
                    {key}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.95rem' }}>
                    {RULE_DESCRIPTIONS[key] || <span style={{ color: '#fbbf24', fontStyle: 'italic' }}>Missing description</span>}
                  </td>
                  {selectedData.map(c => {
                    const val = (c[categoryKey] as Record<string, any>)[key];
                    return (
                      <td key={c.info.id} style={{ 
                        padding: '0.75rem 1rem', 
                        textAlign: 'center',
                        background: isDiffRow && selectedData.length > 1 ? 'rgba(59, 130, 246, 0.08)' : 'transparent'
                      }}>
                        {renderValueCell(val, isDiffRow)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ─── Render Jobs Table ─────────────────────────────────────────
  const renderJobsTab = (forcedDiffOnly: boolean = false) => {
    if (selectedData.length === 0) return null;

    const allJobIds = Array.from(new Set(
      selectedData.flatMap(c => (c.bundle.jobs || []).map(j => j.id))
    ));

    const effectiveDiffOnly = forcedDiffOnly || (diffMode && selectedData.length > 1);

    let filteredJobIds = effectiveDiffOnly && selectedData.length > 1
      ? diffInfo.diffJobIds
      : allJobIds;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filteredJobIds = filteredJobIds.filter(jobId => {
        const sampleJob = selectedData.map(c => c.bundle.jobs?.find(j => j.id === jobId)).find(Boolean);
        return jobId.toLowerCase().includes(q) || 
          (sampleJob?.title || '').toLowerCase().includes(q) ||
          (sampleJob?.locationId || '').toLowerCase().includes(q);
      });
    }

    const currentSort = sortState['jobs'] || { col: 'title', dir: 'asc' };

    const sortedJobIds = [...filteredJobIds].sort((idA, idB) => {
      const getSampleJob = (id: string) => {
        for (const c of selectedData) {
          const found = c.bundle.jobs?.find(j => j.id === id);
          if (found) return found;
        }
        return undefined;
      };
      const jA = getSampleJob(idA);
      const jB = getSampleJob(idB);

      if (currentSort.col === 'title') {
        return compareValues(jA?.title || idA, jB?.title || idB, currentSort.dir);
      }
      if (currentSort.col === 'location') {
        return compareValues(jA?.locationId || '', jB?.locationId || '', currentSort.dir);
      }
      const camp = selectedData.find(c => c.info.id === currentSort.col);
      const wageA = camp?.bundle.jobs?.find(j => j.id === idA)?.baseWage ?? -1;
      const wageB = camp?.bundle.jobs?.find(j => j.id === idB)?.baseWage ?? -1;
      return compareValues(wageA, wageB, currentSort.dir);
    });

    if (sortedJobIds.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', background: '#27272a', borderRadius: '8px', border: '1px solid #3f3f46' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💼</div>
          <h3 style={{ color: '#93c5fd', margin: '0 0 0.5rem 0' }}>No Job Differences Found in Diff Mode</h3>
          <p style={{ margin: 0, color: '#d1d5db' }}>All selected campaign versions have identical job definitions, wages, and requirements.</p>
        </div>
      );
    }

    return (
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ borderBottom: '2px solid #374151', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#60a5fa' }}>
          Jobs Comparison ({sortedJobIds.length} {sortedJobIds.length === 1 ? 'Job' : 'Jobs'})
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#27272a', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)' }}>
          <thead>
            <tr style={{ background: '#3f3f46', textAlign: 'left' }}>
              <th style={{ ...headerStyle, width: '220px' }} onClick={() => handleSortClick('jobs', 'title')}>
                Job Title {renderSortIndicator('jobs', 'title')}
              </th>
              <th style={{ ...headerStyle, width: '160px' }} onClick={() => handleSortClick('jobs', 'location')}>
                Location {renderSortIndicator('jobs', 'location')}
              </th>
              {selectedData.map(c => (
                <th key={c.info.id} style={{ ...headerStyle, textAlign: 'center', minWidth: '180px' }} onClick={() => handleSortClick('jobs', c.info.id)}>
                  {c.info.name} {renderSortIndicator('jobs', c.info.id)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedJobIds.map(jobId => {
              const sampleJob = selectedData.map(c => c.bundle.jobs?.find(j => j.id === jobId)).find(Boolean);
              const isDiffRow = diffInfo.diffJobIds.includes(jobId);
              
              // Check if wage specifically differs
              const presentWages = selectedData.map(c => c.bundle.jobs?.find(j => j.id === jobId)?.baseWage).filter(w => w !== undefined);
              const wageDiffers = new Set(presentWages).size > 1;

              return (
                <tr key={jobId} style={{ 
                  borderBottom: '1px solid #3f3f46',
                  background: isDiffRow && selectedData.length > 1 ? 'rgba(59, 130, 246, 0.04)' : 'transparent'
                }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 'bold', color: '#93c5fd' }}>{sampleJob?.title || jobId}</div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#888' }}>{jobId}</div>
                    {isDiffRow && selectedData.length > 1 && (
                      <span style={{ display: 'inline-block', marginTop: '4px', background: 'rgba(234, 179, 8, 0.2)', color: '#fbbf24', fontSize: '10px', padding: '1px 6px', borderRadius: '4px' }}>
                        Differs
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.9rem' }}>
                    {sampleJob?.locationId ? sampleJob.locationId.replace(/_/g, ' ') : '—'}
                  </td>
                  {selectedData.map(c => {
                    const job = c.bundle.jobs?.find(j => j.id === jobId);
                    if (!job) {
                      return (
                        <td key={c.info.id} style={{ 
                          padding: '0.75rem 1rem', 
                          textAlign: 'center', 
                          color: '#9ca3af', 
                          fontStyle: 'italic', 
                          fontSize: '0.85rem',
                          background: 'rgba(239, 68, 68, 0.05)'
                        }}>
                          — Not Available —
                        </td>
                      );
                    }
                    return (
                      <td key={c.info.id} style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', verticalAlign: 'top' }}>
                        <div style={{ 
                          fontWeight: 'bold', 
                          color: '#4ade80', 
                          fontSize: '1rem', 
                          marginBottom: '4px',
                          display: 'inline-block',
                          background: wageDiffers ? 'rgba(74, 222, 128, 0.15)' : 'transparent',
                          padding: wageDiffers ? '1px 6px' : '0',
                          borderRadius: '4px'
                        }}>
                          ${job.baseWage}/hr
                        </div>
                        <div style={{ color: '#d1d5db', lineHeight: '1.4' }}>
                          <div>👔 Uniform: <strong>{job.requirements.uniform}</strong></div>
                          <div>⭐ Min Exp: <strong>{job.requirements.experience}</strong> | 🤝 Dep: <strong>{job.requirements.dependability}</strong></div>
                          {job.requirements.degrees && job.requirements.degrees.length > 0 && (
                            <div style={{ color: '#fbbf24' }}>🎓 {job.requirements.degrees.join(', ')}</div>
                          )}
                        </div>
                        {job.tags && job.tags.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '6px' }}>
                            {job.tags.map(t => (
                              <span key={t} style={{ background: '#374151', color: '#93c5fd', padding: '1px 5px', borderRadius: '3px', fontSize: '10px' }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {job.perks && job.perks.length > 0 && (
                          <div style={{ color: '#a78bfa', fontSize: '11px', marginTop: '4px' }}>
                            ✨ {job.perks.join(', ')}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ─── Render Items Table ────────────────────────────────────────
  const renderItemsTab = (forcedDiffOnly: boolean = false) => {
    if (selectedData.length === 0) return null;

    const allItemIds = Array.from(new Set(
      selectedData.flatMap(c => (c.bundle.items || []).map(i => i.id))
    ));

    const effectiveDiffOnly = forcedDiffOnly || (diffMode && selectedData.length > 1);

    let filteredItemIds = effectiveDiffOnly && selectedData.length > 1
      ? diffInfo.diffItemIds
      : allItemIds;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filteredItemIds = filteredItemIds.filter(itemId => {
        const sampleItem = selectedData.map(c => c.bundle.items?.find(i => i.id === itemId)).find(Boolean);
        return itemId.toLowerCase().includes(q) || 
          (sampleItem?.name || '').toLowerCase().includes(q) ||
          (sampleItem?.category || '').toLowerCase().includes(q);
      });
    }

    const currentSort = sortState['items'] || { col: 'name', dir: 'asc' };

    const sortedItemIds = [...filteredItemIds].sort((idA, idB) => {
      const getSampleItem = (id: string) => {
        for (const c of selectedData) {
          const found = c.bundle.items?.find(i => i.id === id);
          if (found) return found;
        }
        return undefined;
      };
      const iA = getSampleItem(idA);
      const iB = getSampleItem(idB);

      if (currentSort.col === 'name') {
        return compareValues(iA?.name || idA, iB?.name || idB, currentSort.dir);
      }
      if (currentSort.col === 'category') {
        return compareValues(iA?.category || '', iB?.category || '', currentSort.dir);
      }
      const camp = selectedData.find(c => c.info.id === currentSort.col);
      const priceA = camp?.bundle.items?.find(i => i.id === idA)?.basePrice ?? -1;
      const priceB = camp?.bundle.items?.find(i => i.id === idB)?.basePrice ?? -1;
      return compareValues(priceA, priceB, currentSort.dir);
    });

    if (sortedItemIds.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', background: '#27272a', borderRadius: '8px', border: '1px solid #3f3f46' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
          <h3 style={{ color: '#93c5fd', margin: '0 0 0.5rem 0' }}>No Item Differences Found in Diff Mode</h3>
          <p style={{ margin: 0, color: '#d1d5db' }}>All selected campaign versions have identical item configurations and prices.</p>
        </div>
      );
    }

    return (
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ borderBottom: '2px solid #374151', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#60a5fa' }}>
          Items Comparison ({sortedItemIds.length} {sortedItemIds.length === 1 ? 'Item' : 'Items'})
        </h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#27272a', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)' }}>
          <thead>
            <tr style={{ background: '#3f3f46', textAlign: 'left' }}>
              <th style={{ ...headerStyle, width: '220px' }} onClick={() => handleSortClick('items', 'name')}>
                Item Name {renderSortIndicator('items', 'name')}
              </th>
              <th style={{ ...headerStyle, width: '140px' }} onClick={() => handleSortClick('items', 'category')}>
                Category {renderSortIndicator('items', 'category')}
              </th>
              {selectedData.map(c => (
                <th key={c.info.id} style={{ ...headerStyle, textAlign: 'center', minWidth: '170px' }} onClick={() => handleSortClick('items', c.info.id)}>
                  {c.info.name} {renderSortIndicator('items', c.info.id)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedItemIds.map(itemId => {
              const sampleItem = selectedData.map(c => c.bundle.items?.find(i => i.id === itemId)).find(Boolean);
              const isDiffRow = diffInfo.diffItemIds.includes(itemId);

              // Check if price specifically differs
              const presentPrices = selectedData.map(c => c.bundle.items?.find(i => i.id === itemId)?.basePrice).filter(p => p !== undefined);
              const priceDiffers = new Set(presentPrices).size > 1;

              return (
                <tr key={itemId} style={{ 
                  borderBottom: '1px solid #3f3f46',
                  background: isDiffRow && selectedData.length > 1 ? 'rgba(59, 130, 246, 0.04)' : 'transparent'
                }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 'bold', color: '#93c5fd' }}>{sampleItem?.name || itemId}</div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#888' }}>{itemId}</div>
                    {isDiffRow && selectedData.length > 1 && (
                      <span style={{ display: 'inline-block', marginTop: '4px', background: 'rgba(234, 179, 8, 0.2)', color: '#fbbf24', fontSize: '10px', padding: '1px 6px', borderRadius: '4px' }}>
                        Differs
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.85rem' }}>
                    <div>{sampleItem?.category}</div>
                    {sampleItem?.subcategory && <div style={{ fontSize: '11px', color: '#888' }}>({sampleItem.subcategory})</div>}
                  </td>
                  {selectedData.map(c => {
                    const item = c.bundle.items?.find(i => i.id === itemId);
                    if (!item) {
                      return (
                        <td key={c.info.id} style={{ 
                          padding: '0.75rem 1rem', 
                          textAlign: 'center', 
                          color: '#9ca3af', 
                          fontStyle: 'italic', 
                          fontSize: '0.85rem',
                          background: 'rgba(239, 68, 68, 0.05)'
                        }}>
                          — Not Available —
                        </td>
                      );
                    }
                    return (
                      <td key={c.info.id} style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', verticalAlign: 'top' }}>
                        <div style={{ 
                          fontWeight: 'bold', 
                          color: item.basePrice !== undefined ? '#4ade80' : '#888', 
                          fontSize: '0.95rem', 
                          marginBottom: '3px',
                          display: 'inline-block',
                          background: priceDiffers ? 'rgba(74, 222, 128, 0.15)' : 'transparent',
                          padding: priceDiffers ? '1px 5px' : '0',
                          borderRadius: '4px'
                        }}>
                          {item.basePrice !== undefined ? `$${item.basePrice}` : 'Price N/A'}
                        </div>
                        <div style={{ color: '#d1d5db', lineHeight: '1.4' }}>
                          {item.happinessBonus !== 0 && (
                            <div style={{ color: '#60a5fa' }}>😊 Happiness: <strong>+{item.happinessBonus}</strong></div>
                          )}
                          {item.lifestyleValue !== undefined && item.lifestyleValue > 0 && (
                            <div style={{ color: '#f59e0b' }}>⭐ Lifestyle: <strong>{item.lifestyleValue}</strong></div>
                          )}
                          {item.mentalBonus !== undefined && item.mentalBonus > 0 && (
                            <div style={{ color: '#a78bfa' }}>🧠 Mental: <strong>+{item.mentalBonus}</strong></div>
                          )}
                          {item.space !== undefined && (
                            <div style={{ color: '#9ca3af' }}>📦 Space: <strong>{item.space}</strong></div>
                          )}
                        </div>
                        {item.effects && item.effects.length > 0 && (
                          <div style={{ marginTop: '4px', fontSize: '10px', color: '#34d399' }}>
                            {item.effects.map((e, idx) => (
                              <div key={idx}>⚡ {e.trigger}: {e.stat} {e.value > 0 ? `+${e.value}` : e.value}</div>
                            ))}
                          </div>
                        )}
                        {item.tags && item.tags.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
                            {item.tags.map(t => (
                              <span key={t} style={{ background: '#374151', color: '#cbd5e1', padding: '1px 4px', borderRadius: '3px', fontSize: '9px' }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ─── Render Locations Table ────────────────────────────────────
  const renderLocationsTab = (forcedDiffOnly: boolean = false) => {
    if (selectedData.length === 0) return null;

    const allBuildingIds = Array.from(new Set(
      selectedData.flatMap(c => (c.bundle.buildings || []).map(b => b.id))
    ));

    const effectiveDiffOnly = forcedDiffOnly || (diffMode && selectedData.length > 1);

    let filteredBuildingIds = effectiveDiffOnly && selectedData.length > 1
      ? diffInfo.diffBuildingIds
      : allBuildingIds;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filteredBuildingIds = filteredBuildingIds.filter(bId => {
        const sampleB = selectedData.map(c => c.bundle.buildings?.find(b => b.id === bId)).find(Boolean);
        return bId.toLowerCase().includes(q) || 
          (sampleB?.name || '').toLowerCase().includes(q) ||
          (sampleB?.archetype || '').toLowerCase().includes(q);
      });
    }

    const currentSort = sortState['locations'] || { col: 'name', dir: 'asc' };

    const sortedBuildingIds = [...filteredBuildingIds].sort((idA, idB) => {
      const getSampleB = (id: string) => {
        for (const c of selectedData) {
          const found = c.bundle.buildings?.find(b => b.id === id);
          if (found) return found;
        }
        return undefined;
      };
      const bA = getSampleB(idA);
      const bB = getSampleB(idB);

      if (currentSort.col === 'name') {
        return compareValues(bA?.name || idA, bB?.name || idB, currentSort.dir);
      }
      if (currentSort.col === 'archetype') {
        return compareValues(bA?.archetype || '', bB?.archetype || '', currentSort.dir);
      }
      const camp = selectedData.find(c => c.info.id === currentSort.col);
      const countA = camp?.bundle.buildings?.find(b => b.id === idA)?.inventory?.length ?? -1;
      const countB = camp?.bundle.buildings?.find(b => b.id === idB)?.inventory?.length ?? -1;
      return compareValues(countA, countB, currentSort.dir);
    });

    if (sortedBuildingIds.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', background: '#27272a', borderRadius: '8px', border: '1px solid #3f3f46' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏬</div>
          <h3 style={{ color: '#93c5fd', margin: '0 0 0.5rem 0' }}>All Locations & Buildings are Identical</h3>
          <p style={{ margin: '0 0 1.5rem 0', color: '#d1d5db' }}>
            All {selectedData.length} selected campaign versions have the exact same {allBuildingIds.length} locations and store inventories.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '800px', margin: '0 auto' }}>
            {allBuildingIds.map(bId => {
              const sample = selectedData.map(c => c.bundle.buildings?.find(b => b.id === bId)).find(Boolean);
              return (
                <div key={bId} style={{ background: '#3f3f46', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 'bold', color: '#f3f4f6' }}>{sample?.name || bId}</span>
                  <span style={{ color: '#9ca3af', marginLeft: '6px', fontSize: '0.75rem' }}>({sample?.archetype})</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #374151', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, color: '#60a5fa' }}>
            Locations & Buildings Comparison ({sortedBuildingIds.length} {sortedBuildingIds.length === 1 ? 'Location' : 'Locations'})
          </h2>
          {diffInfo.identicalBuildingIds.length > 0 && effectiveDiffOnly && (
            <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
              ({diffInfo.identicalBuildingIds.length} identical locations hidden)
            </span>
          )}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#27272a', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)' }}>
          <thead>
            <tr style={{ background: '#3f3f46', textAlign: 'left' }}>
              <th style={{ ...headerStyle, width: '220px' }} onClick={() => handleSortClick('locations', 'name')}>
                Location Name {renderSortIndicator('locations', 'name')}
              </th>
              <th style={{ ...headerStyle, width: '150px' }} onClick={() => handleSortClick('locations', 'archetype')}>
                Archetype {renderSortIndicator('locations', 'archetype')}
              </th>
              {selectedData.map(c => (
                <th key={c.info.id} style={{ ...headerStyle, textAlign: 'center', minWidth: '180px' }} onClick={() => handleSortClick('locations', c.info.id)}>
                  {c.info.name} {renderSortIndicator('locations', c.info.id)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedBuildingIds.map(bId => {
              const sampleB = selectedData.map(c => c.bundle.buildings?.find(b => b.id === bId)).find(Boolean);
              const isDiffRow = diffInfo.diffBuildingIds.includes(bId);

              return (
                <tr key={bId} style={{ 
                  borderBottom: '1px solid #3f3f46',
                  background: isDiffRow && selectedData.length > 1 ? 'rgba(59, 130, 246, 0.04)' : 'transparent'
                }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 'bold', color: '#93c5fd' }}>{sampleB?.name || bId}</div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#888' }}>{bId}</div>
                    {isDiffRow && selectedData.length > 1 && (
                      <span style={{ display: 'inline-block', marginTop: '4px', background: 'rgba(234, 179, 8, 0.2)', color: '#fbbf24', fontSize: '10px', padding: '1px 6px', borderRadius: '4px' }}>
                        Differs
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 'bold' }}>{sampleB?.archetype || '—'}</div>
                    {sampleB?.description && (
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', fontStyle: 'italic' }}>
                        {sampleB.description}
                      </div>
                    )}
                  </td>
                  {selectedData.map(c => {
                    const b = c.bundle.buildings?.find(item => item.id === bId);
                    if (!b) {
                      return (
                        <td key={c.info.id} style={{ 
                          padding: '0.75rem 1rem', 
                          textAlign: 'center', 
                          color: '#9ca3af', 
                          fontStyle: 'italic', 
                          fontSize: '0.85rem',
                          background: 'rgba(239, 68, 68, 0.05)'
                        }}>
                          — Not Available —
                        </td>
                      );
                    }
                    const inv = b.inventory || [];
                    const cost = (b as any).cost;
                    return (
                      <td key={c.info.id} style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', verticalAlign: 'top' }}>
                        {inv.length > 0 ? (
                          <>
                            <div style={{ fontWeight: 'bold', color: '#e5e7eb', marginBottom: '4px' }}>
                              📦 {inv.length} {inv.length === 1 ? 'item' : 'items'}
                            </div>
                            <div style={{ maxHeight: '100px', overflowY: 'auto', fontSize: '11px', color: '#aaa', background: 'rgba(0,0,0,0.2)', padding: '4px 6px', borderRadius: '4px' }}>
                              {inv.map(i => (
                                <div key={i.itemId}>
                                  • {i.itemId}{i.priceOverride !== undefined ? ` ($${i.priceOverride})` : ''}
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                            {b.archetype === 'home' ? '🏠 Apartment' :
                             b.archetype === 'restaurant' ? '🍔 Restaurant' :
                             b.archetype === 'workplace' ? '🏭 Workplace' :
                             b.archetype === 'employment' ? '📋 Job Board' :
                             b.archetype === 'education' ? '🎓 College' :
                             b.archetype === 'bank' ? '🏦 Bank' :
                             b.archetype === 'housing' ? '🏢 Housing Office' :
                             b.archetype === 'pawnshop' ? '💰 Pawn Shop' : 'Available'}
                          </div>
                        )}
                        {cost !== undefined && (
                          <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '4px' }}>
                            ⏱️ Entry Cost: {cost} hr
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ─── Render Goals & Housing Tab ────────────────────────────────
  const renderGoalsHousingTab = (forcedDiffOnly: boolean = false) => {
    if (selectedData.length === 0) return null;

    const allWinStats = Array.from(new Set(
      selectedData.flatMap(c => (c.bundle.config.winConditions || []).map(w => w.stat))
    ));

    const allHousingIds = Array.from(new Set(
      selectedData.flatMap(c => (c.bundle.housing || []).map(h => h.id))
    ));

    const effectiveDiffOnly = forcedDiffOnly || (diffMode && selectedData.length > 1);

    const filteredWinStats = effectiveDiffOnly && selectedData.length > 1
      ? (diffInfo.hasWinConditionDiffs ? allWinStats.filter(stat => {
          const first = selectedData[0].bundle.config.winConditions?.find(w => w.stat === stat);
          return selectedData.some(c => {
            const cur = c.bundle.config.winConditions?.find(w => w.stat === stat);
            return (cur?.target !== first?.target);
          });
        }) : [])
      : allWinStats;

    const filteredHousingIds = effectiveDiffOnly && selectedData.length > 1
      ? diffInfo.diffHousingIds
      : allHousingIds;

    return (
      <div style={{ marginBottom: '2.5rem' }}>
        {/* Win Conditions */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ borderBottom: '2px solid #374151', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#60a5fa' }}>
            Win Conditions Comparison
          </h2>
          {filteredWinStats.length === 0 ? (
            <div style={{ padding: '1.5rem', background: '#27272a', borderRadius: '8px', color: '#9ca3af', textAlign: 'center' }}>
              All win conditions are identical across selected versions.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#27272a', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)' }}>
              <thead>
                <tr style={{ background: '#3f3f46', textAlign: 'left' }}>
                  <th style={{ ...headerStyle, width: '220px' }}>Goal / Stat</th>
                  {selectedData.map(c => (
                    <th key={c.info.id} style={{ ...headerStyle, textAlign: 'center' }}>
                      {c.info.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredWinStats.map(stat => (
                  <tr key={stat} style={{ borderBottom: '1px solid #3f3f46' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#93c5fd', textTransform: 'capitalize' }}>
                      {stat}
                    </td>
                    {selectedData.map(c => {
                      const cond = c.bundle.config.winConditions?.find(w => w.stat === stat);
                      if (!cond) {
                        return (
                          <td key={c.info.id} style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>
                            — Not Required —
                          </td>
                        );
                      }
                      return (
                        <td key={c.info.id} style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#4ade80', fontWeight: 'bold' }}>
                          Target: {cond.target}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Housing Options */}
        <div>
          <h2 style={{ borderBottom: '2px solid #374151', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#60a5fa' }}>
            Housing & Rent Comparison
          </h2>
          {filteredHousingIds.length === 0 ? (
            <div style={{ padding: '1.5rem', background: '#27272a', borderRadius: '8px', color: '#9ca3af', textAlign: 'center' }}>
              All housing options and rents are identical across selected versions.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#27272a', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)' }}>
              <thead>
                <tr style={{ background: '#3f3f46', textAlign: 'left' }}>
                  <th style={{ ...headerStyle, width: '220px' }}>Apartment Name</th>
                  {selectedData.map(c => (
                    <th key={c.info.id} style={{ ...headerStyle, textAlign: 'center' }}>
                      {c.info.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredHousingIds.map(hId => {
                  const sampleH = selectedData.map(c => c.bundle.housing?.find(h => h.id === hId)).find(Boolean);
                  return (
                    <tr key={hId} style={{ borderBottom: '1px solid #3f3f46' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 'bold', color: '#93c5fd' }}>{sampleH?.name || hId}</div>
                        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#888' }}>{hId}</div>
                      </td>
                      {selectedData.map(c => {
                        const house = c.bundle.housing?.find(h => h.id === hId);
                        if (!house) {
                          return (
                            <td key={c.info.id} style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>
                              — Not Available —
                            </td>
                          );
                        }
                        return (
                          <td key={c.info.id} style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#4ade80', fontWeight: 'bold' }}>
                            ${house.baseRent}/month
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  // ─── Render All Differences Unified View ───────────────────────
  const renderAllDiffsTab = () => {
    if (selectedData.length <= 1) {
      return (
        <div style={{ textAlign: 'center', padding: '3.5rem', background: '#27272a', borderRadius: '8px', border: '1px solid #3f3f46' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
          <h2 style={{ color: '#60a5fa', margin: '0 0 0.5rem 0' }}>Select Multiple Campaigns to View Differences</h2>
          <p style={{ color: '#d1d5db', maxWidth: '600px', margin: '0 auto 1.5rem auto' }}>
            Check at least two campaign versions above to see a complete breakdown of all differences in rules, jobs, items, locations, and win conditions.
          </p>
          <button 
            onClick={selectAllCampaigns}
            style={{ padding: '0.6rem 1.2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Select All Versions
          </button>
        </div>
      );
    }

    const allBuildingIds = Array.from(new Set(
      selectedData.flatMap(c => (c.bundle.buildings || []).map(b => b.id))
    ));

    return (
      <div>
        {/* Executive Summary Card */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1e293b 0%, #1e1b4b 100%)', 
          border: '1px solid #3b82f6', 
          borderRadius: '10px', 
          padding: '1.5rem', 
          marginBottom: '2rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '1.4rem' }}>⚡</span>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#fff' }}>
                  All Version Differences ({diffInfo.totalDiffs} Detected)
                </h2>
              </div>
              <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem' }}>
                Comparing <strong>{selectedData.map(c => c.info.name).join(' vs ')}</strong>
              </p>
            </div>
            
            {/* Quick Filter Search */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder="Filter by keyword..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  padding: '0.5rem 0.8rem', 
                  borderRadius: '6px', 
                  border: '1px solid #4b5563', 
                  background: '#111827', 
                  color: '#fff',
                  fontSize: '0.9rem',
                  width: '220px'
                }}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  style={{ marginLeft: '6px', padding: '0.5rem', background: '#374151', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Quick-Jump Section Anchors */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem', alignSelf: 'center', marginRight: '4px' }}>Jump to:</span>
            {[
              { id: 'sec-rules', label: '⚙️ Rules', count: diffInfo.diffRulesCount },
              { id: 'sec-jobs', label: '💼 Jobs', count: diffInfo.diffJobIds.length },
              { id: 'sec-items', label: '📦 Items', count: diffInfo.diffItemIds.length },
              { id: 'sec-locations', label: '🏬 Locations', count: diffInfo.diffBuildingIds.length, isLocations: true },
              { id: 'sec-goals', label: '🏆 Goals & Housing', count: diffInfo.diffGoalsHousingCount },
            ].map(sec => (
              <button
                key={sec.id}
                onClick={() => document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth' })}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{sec.label}</span>
                <span style={{ 
                  background: sec.count > 0 ? '#3b82f6' : '#64748b', 
                  color: '#fff', 
                  padding: '1px 6px', 
                  borderRadius: '10px', 
                  fontSize: '11px' 
                }}>
                  {sec.isLocations && sec.count === 0 ? 'All Identical' : sec.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 1. Rule Differences Section */}
        <div id="sec-rules" style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.6rem', margin: 0, color: '#60a5fa' }}>
              ⚙️ Rule Differences ({diffInfo.diffRulesCount})
            </h2>
          </div>
          {diffInfo.diffRulesCount === 0 ? (
            <div style={{ padding: '1.25rem', background: '#27272a', borderRadius: '8px', color: '#9ca3af', border: '1px solid #3f3f46' }}>
              All game rules, time rules, economy rules, stat rules, and event rules are identical across selected versions.
            </div>
          ) : (
            <>
              {renderRuleTable('Game Rules', 'gameRules', true)}
              {renderRuleTable('Time Rules', 'timeRules', true)}
              {renderRuleTable('Economy Rules', 'economyRules', true)}
              {renderRuleTable('Stat Rules', 'statRules', true)}
              {renderRuleTable('Event Rules', 'eventRules', true)}
            </>
          )}
        </div>

        {/* 2. Job Differences Section */}
        <div id="sec-jobs" style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.6rem', margin: 0, color: '#60a5fa' }}>
              💼 Job Differences ({diffInfo.diffJobIds.length})
            </h2>
          </div>
          {renderJobsTab(true)}
        </div>

        {/* 3. Item Differences Section */}
        <div id="sec-items" style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.6rem', margin: 0, color: '#60a5fa' }}>
              📦 Item Differences ({diffInfo.diffItemIds.length})
            </h2>
          </div>
          {renderItemsTab(true)}
        </div>

        {/* 4. Locations Differences Section */}
        <div id="sec-locations" style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.6rem', margin: 0, color: '#60a5fa' }}>
              🏬 Locations & Buildings ({diffInfo.diffBuildingIds.length === 0 ? 'All Identical' : `${diffInfo.diffBuildingIds.length} Differences`})
            </h2>
          </div>
          
          {diffInfo.diffBuildingIds.length === 0 ? (
            <div style={{ background: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#93c5fd', fontWeight: 'bold', fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                <span>✓ All {allBuildingIds.length} Locations & Buildings are Identical</span>
                <span style={{ fontSize: '11px', background: '#1e3a5f', color: '#93c5fd', padding: '2px 8px', borderRadius: '12px' }}>
                  No differences
                </span>
              </div>
              <p style={{ color: '#d1d5db', fontSize: '0.9rem', marginBottom: '1rem' }}>
                All selected versions share the exact same location map nodes, building archetypes, and shop inventories:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {allBuildingIds.map(bId => {
                  const sample = selectedData.map(c => c.bundle.buildings?.find(b => b.id === bId)).find(Boolean);
                  return (
                    <div key={bId} style={{ background: '#3f3f46', borderRadius: '6px', padding: '6px 12px', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 'bold', color: '#f3f4f6' }}>{sample?.name || bId}</span>
                      <span style={{ color: '#9ca3af', marginLeft: '6px', fontSize: '0.75rem' }}>({sample?.archetype})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {renderLocationsTab(true)}
              {diffInfo.identicalBuildingIds.length > 0 && (
                <div style={{ marginTop: '1rem', background: '#27272a', padding: '1rem', borderRadius: '8px', border: '1px solid #3f3f46' }}>
                  <button
                    onClick={() => setShowIdenticalLocations(prev => !prev)}
                    style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', padding: 0 }}
                  >
                    {showIdenticalLocations ? '▼ Hide' : '▶ Show'} {diffInfo.identicalBuildingIds.length} identical locations shared across versions
                  </button>
                  {showIdenticalLocations && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '0.75rem' }}>
                      {diffInfo.identicalBuildingIds.map(bId => {
                        const sample = selectedData.map(c => c.bundle.buildings?.find(b => b.id === bId)).find(Boolean);
                        return (
                          <div key={bId} style={{ background: '#3f3f46', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem', color: '#d1d5db' }}>
                            {sample?.name || bId} ({sample?.archetype})
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* 5. Goals & Housing Differences Section */}
        <div id="sec-goals" style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.6rem', margin: 0, color: '#60a5fa' }}>
              🏆 Goals & Housing Differences ({diffInfo.diffGoalsHousingCount})
            </h2>
          </div>
          {renderGoalsHousingTab(true)}
        </div>
      </div>
    );
  };

  return (
    <div className="fullscreen-overlay" style={{ background: '#1a1a1a', color: '#f3f4f6', overflowY: 'auto', padding: '2rem 2rem 4rem 2rem', justifyContent: 'flex-start', alignItems: 'stretch' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        {/* Screen Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingTop: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', margin: 0, color: '#fff' }}>Rules Comparison Matrix</h1>
            <p style={{ color: '#9ca3af', marginTop: '0.25rem' }}>
              View all differences between versions: rules, jobs, items, locations, and win conditions
            </p>
          </div>
          <button 
            onClick={onClose} 
            style={{ padding: '0.6rem 1.2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
          >
            Back to Title
          </button>
        </div>

        {/* Controls Container */}
        <div style={{ background: '#27272a', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid #3f3f46' }}>
          
          {/* Campaign Selection Checkboxes */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 'bold', color: '#e5e7eb' }}>Compare Versions:</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={selectAllCampaigns}
                  style={{ background: '#3f3f46', border: 'none', color: '#93c5fd', fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedCampaignIds(new Set())}
                  style={{ background: '#3f3f46', border: 'none', color: '#9ca3af', fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Clear All
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {campaignData.map(c => (
                <label key={c.info.id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', background: selectedCampaignIds.has(c.info.id) ? '#3f3f46' : '#27272a', padding: '0.4rem 0.8rem', borderRadius: '4px', border: selectedCampaignIds.has(c.info.id) ? '1px solid #3b82f6' : '1px solid #52525b' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedCampaignIds.has(c.info.id)} 
                    onChange={() => toggleCampaign(c.info.id)}
                    style={{ marginRight: '0.5rem', cursor: 'pointer' }}
                  />
                  {c.info.name}
                </label>
              ))}
            </div>
          </div>

          {/* Controls Bar: Diff Mode Toggle & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none', color: '#60a5fa', fontWeight: 'bold' }}>
                <input 
                  type="checkbox" 
                  checked={diffMode} 
                  onChange={(e) => setDiffMode(e.target.checked)}
                  style={{ marginRight: '0.5rem', transform: 'scale(1.2)', cursor: 'pointer' }}
                />
                Show Differences Only (Diff Mode)
              </label>
              <span style={{ color: '#9ca3af', marginLeft: '1rem', fontSize: '0.9rem' }}>
                Hides rows where all selected versions have the exact same configuration.
              </span>
            </div>

            {/* Quick Filter Input */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder="Search rows..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  padding: '0.4rem 0.75rem', 
                  borderRadius: '4px', 
                  border: '1px solid #52525b', 
                  background: '#18181b', 
                  color: '#fff',
                  fontSize: '0.85rem',
                  width: '180px'
                }}
              />
            </div>
          </div>

        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', borderBottom: '2px solid #3f3f46', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
          {[
            { id: 'all-diffs', label: '🔍 All Differences', count: diffInfo.totalDiffs },
            { id: 'rules', label: '⚙️ Rules', count: diffInfo.diffRulesCount },
            { id: 'jobs', label: '💼 Jobs', count: diffInfo.diffJobIds.length },
            { id: 'items', label: '📦 Items', count: diffInfo.diffItemIds.length },
            { id: 'locations', label: '🏬 Locations & Buildings', count: diffInfo.diffBuildingIds.length },
            { id: 'goals-housing', label: '🏆 Goals & Housing', count: diffInfo.diffGoalsHousingCount },
          ].map(tab => (
            <button
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id as TabType)}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: activeTab === tab.id ? '#3b82f6' : '#27272a',
                color: activeTab === tab.id ? '#fff' : '#9ca3af',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{tab.label}</span>
              {selectedData.length > 1 && (
                <span style={{
                  fontSize: '11px',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  background: activeTab === tab.id 
                    ? 'rgba(255,255,255,0.25)' 
                    : (tab.count > 0 ? (tab.id === 'all-diffs' ? '#2563eb' : '#7c3aed') : '#52525b'),
                  color: '#fff'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        {selectedCampaignIds.size === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af', background: '#27272a', borderRadius: '8px', border: '1px dashed #52525b' }}>
            <h2>No versions selected</h2>
            <p>Please select at least one campaign version above to view comparison matrix.</p>
          </div>
        ) : (
          <>
            {activeTab === 'all-diffs' && renderAllDiffsTab()}
            {activeTab === 'rules' && (
              <>
                {renderRuleTable('Game Rules', 'gameRules')}
                {renderRuleTable('Time Rules', 'timeRules')}
                {renderRuleTable('Economy Rules', 'economyRules')}
                {renderRuleTable('Stat Rules', 'statRules')}
                {renderRuleTable('Event Rules', 'eventRules')}
              </>
            )}
            {activeTab === 'jobs' && renderJobsTab()}
            {activeTab === 'items' && renderItemsTab()}
            {activeTab === 'locations' && renderLocationsTab()}
            {activeTab === 'goals-housing' && renderGoalsHousingTab()}
          </>
        )}

      </div>
    </div>
  );
};
