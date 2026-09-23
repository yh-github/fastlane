import React, { useEffect, useState } from 'react';
import { getAvailableCampaigns, loadCampaign, type CampaignBundle, type CampaignInfo, type JobDef, type ItemDef, type BuildingDef } from '../engine/dataLoader';
import { DEFAULT_GAME_RULES, RULE_DESCRIPTIONS } from '../engine/rules';

interface RulesScreenProps {
  onClose: () => void;
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

type TabType = 'rules' | 'jobs' | 'items' | 'locations';
type SortDirection = 'asc' | 'desc';

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
  if (b1.archetype !== b2.archetype) return false;
  const inv1 = JSON.stringify(b1.inventory || []);
  const inv2 = JSON.stringify(b2.inventory || []);
  if (inv1 !== inv2) return false;
  return true;
}

export const RulesScreen: React.FC<RulesScreenProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [campaignData, setCampaignData] = useState<LoadedCampaignData[]>([]);
  
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [diffMode, setDiffMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('rules');

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

  const renderValueCell = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? <span style={{ color: '#4ade80', fontWeight: 'bold' }}>ON</span> : <span style={{ color: '#f87171', fontWeight: 'bold' }}>OFF</span>;
    }
    return String(value ?? '-');
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

  const selectedData = campaignData.filter(c => selectedCampaignIds.has(c.info.id));

  // ─── Render Rules Tables (Tab: rules) ──────────────────────────
  const renderRuleTable = (title: string, categoryKey: keyof LoadedCampaignData) => {
    if (selectedData.length === 0) return null;

    const allKeys = Array.from(new Set(
      selectedData.flatMap(c => Object.keys(c[categoryKey] as Record<string, any>))
    ));

    let filteredKeys = allKeys;
    if (diffMode && selectedData.length > 1) {
      filteredKeys = allKeys.filter(key => {
        const firstVal = (selectedData[0][categoryKey] as Record<string, any>)[key];
        for (let i = 1; i < selectedData.length; i++) {
          const val = (selectedData[i][categoryKey] as Record<string, any>)[key];
          if (val !== firstVal) return true;
        }
        return false;
      });
    }

    if (filteredKeys.length === 0) return null;

    const currentSort = sortState[categoryKey] || { col: 'key', dir: 'asc' };

    const sortedKeys = filteredKeys.sort((keyA, keyB) => {
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
        <h2 style={{ borderBottom: '2px solid #374151', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#60a5fa' }}>{title}</h2>
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
            {sortedKeys.map((key) => (
              <tr key={key} style={{ borderBottom: '1px solid #3f3f46' }}>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#93c5fd', fontWeight: 'bold' }}>{key}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.95rem' }}>{RULE_DESCRIPTIONS[key] || <span style={{ color: '#fbbf24', fontStyle: 'italic' }}>Missing description</span>}</td>
                {selectedData.map(c => (
                  <td key={c.info.id} style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    {renderValueCell((c[categoryKey] as Record<string, any>)[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ─── Render Jobs Table (Tab: jobs) ─────────────────────────────
  const renderJobsTab = () => {
    if (selectedData.length === 0) return null;

    const allJobIds = Array.from(new Set(
      selectedData.flatMap(c => (c.bundle.jobs || []).map(j => j.id))
    ));

    const filteredJobIds = diffMode && selectedData.length > 1
      ? allJobIds.filter(jobId => {
          const firstJob = selectedData[0].bundle.jobs?.find(j => j.id === jobId);
          for (let i = 1; i < selectedData.length; i++) {
            const nextJob = selectedData[i].bundle.jobs?.find(j => j.id === jobId);
            if (!areJobsEqual(firstJob, nextJob)) return true;
          }
          return false;
        })
      : allJobIds;

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
      // Sort by specific campaign wage
      const camp = selectedData.find(c => c.info.id === currentSort.col);
      const wageA = camp?.bundle.jobs?.find(j => j.id === idA)?.baseWage ?? -1;
      const wageB = camp?.bundle.jobs?.find(j => j.id === idB)?.baseWage ?? -1;
      return compareValues(wageA, wageB, currentSort.dir);
    });

    if (sortedJobIds.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', background: '#27272a', borderRadius: '8px' }}>
          <h3>No job differences found in Diff Mode</h3>
          <p>All selected campaign versions have identical job definitions.</p>
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
              return (
                <tr key={jobId} style={{ borderBottom: '1px solid #3f3f46' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 'bold', color: '#93c5fd' }}>{sampleJob?.title || jobId}</div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#888' }}>{jobId}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.9rem' }}>
                    {sampleJob?.locationId ? sampleJob.locationId.replace(/_/g, ' ') : '—'}
                  </td>
                  {selectedData.map(c => {
                    const job = c.bundle.jobs?.find(j => j.id === jobId);
                    if (!job) {
                      return (
                        <td key={c.info.id} style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#6b7280', fontStyle: 'italic', fontSize: '0.85rem' }}>
                          — Not Available —
                        </td>
                      );
                    }
                    return (
                      <td key={c.info.id} style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 'bold', color: '#4ade80', fontSize: '1rem', marginBottom: '4px' }}>
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

  // ─── Render Items Table (Tab: items) ───────────────────────────
  const renderItemsTab = () => {
    if (selectedData.length === 0) return null;

    const allItemIds = Array.from(new Set(
      selectedData.flatMap(c => (c.bundle.items || []).map(i => i.id))
    ));

    const filteredItemIds = diffMode && selectedData.length > 1
      ? allItemIds.filter(itemId => {
          const firstItem = selectedData[0].bundle.items?.find(i => i.id === itemId);
          for (let i = 1; i < selectedData.length; i++) {
            const nextItem = selectedData[i].bundle.items?.find(i => i.id === itemId);
            if (!areItemsEqual(firstItem, nextItem)) return true;
          }
          return false;
        })
      : allItemIds;

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
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', background: '#27272a', borderRadius: '8px' }}>
          <h3>No item differences found in Diff Mode</h3>
          <p>All selected campaign versions have identical item configurations.</p>
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
              return (
                <tr key={itemId} style={{ borderBottom: '1px solid #3f3f46' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 'bold', color: '#93c5fd' }}>{sampleItem?.name || itemId}</div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#888' }}>{itemId}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.85rem' }}>
                    <div>{sampleItem?.category}</div>
                    {sampleItem?.subcategory && <div style={{ fontSize: '11px', color: '#888' }}>({sampleItem.subcategory})</div>}
                  </td>
                  {selectedData.map(c => {
                    const item = c.bundle.items?.find(i => i.id === itemId);
                    if (!item) {
                      return (
                        <td key={c.info.id} style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#6b7280', fontStyle: 'italic', fontSize: '0.85rem' }}>
                          — Not Available —
                        </td>
                      );
                    }
                    return (
                      <td key={c.info.id} style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 'bold', color: item.basePrice !== undefined ? '#4ade80' : '#888', fontSize: '0.95rem', marginBottom: '3px' }}>
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

  // ─── Render Locations Table (Tab: locations) ───────────────────
  const renderLocationsTab = () => {
    if (selectedData.length === 0) return null;

    const allBuildingIds = Array.from(new Set(
      selectedData.flatMap(c => (c.bundle.buildings || []).map(b => b.id))
    ));

    const filteredBuildingIds = diffMode && selectedData.length > 1
      ? allBuildingIds.filter(bId => {
          const firstB = selectedData[0].bundle.buildings?.find(b => b.id === bId);
          for (let i = 1; i < selectedData.length; i++) {
            const nextB = selectedData[i].bundle.buildings?.find(b => b.id === bId);
            if (!areBuildingsEqual(firstB, nextB)) return true;
          }
          return false;
        })
      : allBuildingIds;

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
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', background: '#27272a', borderRadius: '8px' }}>
          <h3>No location differences found in Diff Mode</h3>
          <p>All selected campaign versions have identical locations and buildings.</p>
        </div>
      );
    }

    return (
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ borderBottom: '2px solid #374151', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#60a5fa' }}>
          Locations & Buildings Comparison ({sortedBuildingIds.length} {sortedBuildingIds.length === 1 ? 'Location' : 'Locations'})
        </h2>
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
              return (
                <tr key={bId} style={{ borderBottom: '1px solid #3f3f46' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 'bold', color: '#93c5fd' }}>{sampleB?.name || bId}</div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#888' }}>{bId}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.85rem' }}>
                    {sampleB?.archetype || '—'}
                  </td>
                  {selectedData.map(c => {
                    const b = c.bundle.buildings?.find(item => item.id === bId);
                    if (!b) {
                      return (
                        <td key={c.info.id} style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#6b7280', fontStyle: 'italic', fontSize: '0.85rem' }}>
                          — Not Available —
                        </td>
                      );
                    }
                    const inv = b.inventory || [];
                    return (
                      <td key={c.info.id} style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 'bold', color: '#e5e7eb', marginBottom: '4px' }}>
                          📦 {inv.length} {inv.length === 1 ? 'item' : 'items'}
                        </div>
                        {inv.length > 0 && (
                          <div style={{ maxHeight: '100px', overflowY: 'auto', fontSize: '11px', color: '#aaa', background: 'rgba(0,0,0,0.2)', padding: '4px 6px', borderRadius: '4px' }}>
                            {inv.map(i => (
                              <div key={i.itemId}>
                                • {i.itemId}{i.priceOverride !== undefined ? ` ($${i.priceOverride})` : ''}
                              </div>
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

  return (
    <div className="fullscreen-overlay" style={{ background: '#1a1a1a', color: '#f3f4f6', overflowY: 'auto', padding: '2rem 2rem 4rem 2rem', justifyContent: 'flex-start', alignItems: 'stretch' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingTop: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', margin: 0, color: '#fff' }}>Rules Comparison Matrix</h1>
            <p style={{ color: '#9ca3af', marginTop: '0.25rem' }}>Compare rules, jobs, items, and locations across all campaign editions</p>
          </div>
          <button onClick={onClose} style={{ padding: '0.6rem 1.2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
            Back to Title
          </button>
        </div>

        {/* UI Controls Container */}
        <div style={{ background: '#27272a', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid #3f3f46' }}>
          
          {/* Campaign Selection */}
          <div>
            <span style={{ fontWeight: 'bold', color: '#e5e7eb', marginRight: '1rem' }}>Compare Versions:</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
              {campaignData.map(c => (
                <label key={c.info.id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', background: '#3f3f46', padding: '0.4rem 0.8rem', borderRadius: '4px' }}>
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

          {/* Diff Mode Toggle */}
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

        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #3f3f46', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
          {[
            { id: 'rules', label: '⚙️ Rules' },
            { id: 'jobs', label: '💼 Jobs' },
            { id: 'items', label: '📦 Items' },
            { id: 'locations', label: '🏬 Locations & Buildings' }
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
                backgroundColor: activeTab === tab.id ? '#3b82f6' : '#27272a',
                color: activeTab === tab.id ? '#fff' : '#9ca3af',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
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
          </>
        )}

      </div>
    </div>
  );
};
