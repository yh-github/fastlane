import React, { useEffect, useState } from 'react';
import { getAvailableCampaigns, loadCampaign, type CampaignBundle, type CampaignInfo } from '../engine/dataLoader';
import { DEFAULT_GAME_RULES, RULE_DESCRIPTIONS, type GameRules, type EventRules, type TimeRules, type EconomyRules, type StatRules } from '../engine/rules';

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
}

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

export const RulesScreen: React.FC<RulesScreenProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [campaignData, setCampaignData] = useState<LoadedCampaignData[]>([]);
  
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [diffMode, setDiffMode] = useState<boolean>(false);

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
            eventRules: flattenObject(bundle.config.eventRules)
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

  // Render a primitive value cell (booleans, strings, numbers)
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

  const renderTable = (title: string, categoryKey: keyof LoadedCampaignData) => {
    const selectedData = campaignData.filter(c => selectedCampaignIds.has(c.info.id));
    if (selectedData.length === 0) return null;

    // Collect all unique keys for this category across selected campaigns
    const allKeys = Array.from(new Set(
      selectedData.flatMap(c => Object.keys(c[categoryKey] as Record<string, any>))
    ));

    // Filter rules based on Diff Mode
    let filteredKeys = allKeys;
    if (diffMode && selectedData.length > 1) {
      filteredKeys = allKeys.filter(key => {
        const firstVal = (selectedData[0][categoryKey] as Record<string, any>)[key];
        // Check if ANY subsequent selected campaign has a different value
        for (let i = 1; i < selectedData.length; i++) {
          const val = (selectedData[i][categoryKey] as Record<string, any>)[key];
          if (val !== firstVal) return true; // Difference found, keep this row
        }
        return false; // All identical, hide this row
      });
    }

    if (filteredKeys.length === 0) return null;

    const currentSort = sortState[categoryKey] || { col: 'key', dir: 'asc' };

    // Sort keys
    const sortedKeys = filteredKeys.sort((keyA, keyB) => {
      if (currentSort.col === 'key') {
        return compareValues(keyA, keyB, currentSort.dir);
      }
      if (currentSort.col === 'description') {
        const descA = RULE_DESCRIPTIONS[keyA] || '';
        const descB = RULE_DESCRIPTIONS[keyB] || '';
        return compareValues(descA, descB, currentSort.dir);
      }
      // Campaign column sort
      const campaignTarget = selectedData.find(c => c.info.id === currentSort.col);
      const valA = campaignTarget ? (campaignTarget[categoryKey] as Record<string, any>)[keyA] : undefined;
      const valB = campaignTarget ? (campaignTarget[categoryKey] as Record<string, any>)[keyB] : undefined;
      return compareValues(valA, valB, currentSort.dir);
    });

    const headerStyle: React.CSSProperties = {
      padding: '1rem',
      borderBottom: '2px solid #52525b',
      cursor: 'pointer',
      userSelect: 'none',
    };

    return (
      <div key={categoryKey} style={{ marginBottom: '3rem' }}>
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

  return (
    <div className="fullscreen-overlay" style={{ background: '#1a1a1a', color: '#f3f4f6', overflowY: 'auto', padding: '2rem 2rem 4rem 2rem', justifyContent: 'flex-start', alignItems: 'stretch' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingTop: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', margin: 0, color: '#fff' }}>Rules Comparison Matrix</h1>
            <p style={{ color: '#9ca3af', marginTop: '0.25rem' }}>Dynamic optional rules configuration loaded across all campaign versions</p>
          </div>
          <button onClick={onClose} style={{ padding: '0.6rem 1.2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
            Back to Title
          </button>
        </div>

        {/* UI Controls Container */}
        <div style={{ background: '#27272a', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid #3f3f46' }}>
          
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

        {/* Render all tables dynamically */}
        {renderTable('Game Rules', 'gameRules')}
        {renderTable('Time Rules', 'timeRules')}
        {renderTable('Economy Rules', 'economyRules')}
        {renderTable('Stat Rules', 'statRules')}
        {renderTable('Event Rules', 'eventRules')}
        
        {selectedCampaignIds.size === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af', background: '#27272a', borderRadius: '8px', border: '1px dashed #52525b' }}>
            <h2>No versions selected</h2>
            <p>Please select at least one campaign version above to view rules.</p>
          </div>
        )}

      </div>
    </div>
  );
};
