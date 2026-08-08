import React, { useEffect, useState } from 'react';
import { getAvailableCampaigns, loadCampaign, type CampaignBundle, type CampaignInfo } from '../engine/dataLoader';
import { DEFAULT_GAME_RULES, RULE_DESCRIPTIONS, type GameRules, type EventRules } from '../engine/rules';

interface RulesScreenProps {
  onClose: () => void;
}

interface LoadedCampaignData {
  info: CampaignInfo;
  gameRules: GameRules;
  eventRules?: EventRules;
}

type SortDirection = 'asc' | 'desc';

export const RulesScreen: React.FC<RulesScreenProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [campaignData, setCampaignData] = useState<LoadedCampaignData[]>([]);

  // Sorting state for Game Rules table
  const [gameSortCol, setGameSortCol] = useState<string>('key');
  const [gameSortDir, setGameSortDir] = useState<SortDirection>('asc');

  // Sorting state for Event Rules table
  const [eventSortCol, setEventSortCol] = useState<string>('key');
  const [eventSortDir, setEventSortDir] = useState<SortDirection>('asc');

  useEffect(() => {
    async function fetchAll() {
      const available = getAvailableCampaigns();
      const loadedData: LoadedCampaignData[] = [];
      
      for (const info of available) {
        try {
          const bundle: CampaignBundle = await loadCampaign(info.id);
          const finalGameRules = {
            ...DEFAULT_GAME_RULES,
            ...(bundle.config.gameRules || {})
          };
          loadedData.push({
            info,
            gameRules: finalGameRules,
            eventRules: bundle.config.eventRules
          });
        } catch (e) {
          console.error(`Failed to load campaign ${info.id} for rules display`, e);
        }
      }
      setCampaignData(loadedData);
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

  // Handle header click for sorting
  const handleSortClick = (col: string, isEvent: boolean) => {
    if (isEvent) {
      if (eventSortCol === col) {
        setEventSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setEventSortCol(col);
        setEventSortDir('asc');
      }
    } else {
      if (gameSortCol === col) {
        setGameSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setGameSortCol(col);
        setGameSortDir('asc');
      }
    }
  };

  // Render a cell based on key and campaign
  const renderCell = (key: string, campaign: LoadedCampaignData) => {
    const value = campaign.gameRules[key as keyof GameRules];
    if (key === 'relaxationDoctorThreshold') {
      if (!campaign.gameRules.enableRelaxationDoctor || campaign.gameRules.usePhysicalMentalConditions) {
        return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>N/A</span>;
      }
    }
    if (typeof value === 'boolean') {
      return value ? <span style={{ color: '#4ade80', fontWeight: 'bold' }}>ON</span> : <span style={{ color: '#f87171', fontWeight: 'bold' }}>OFF</span>;
    }
    return String(value ?? '-');
  };

  const renderSortIndicator = (col: string, activeCol: string, activeDir: SortDirection) => {
    if (col !== activeCol) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
    return <span style={{ color: '#60a5fa', marginLeft: '4px' }}>{activeDir === 'asc' ? '▲' : '▼'}</span>;
  };

  // Helper comparator for primitive values
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

  // Collect all unique game rule keys from defaults and loaded campaigns
  const allGameRuleKeys = Array.from(
    new Set([
      ...Object.keys(DEFAULT_GAME_RULES),
      ...campaignData.flatMap(c => Object.keys(c.gameRules))
    ])
  ) as Array<keyof GameRules>;

  // Sort Game Rules
  const sortedGameRuleKeys = allGameRuleKeys.sort((keyA, keyB) => {
    if (gameSortCol === 'key') {
      return compareValues(keyA, keyB, gameSortDir);
    }
    if (gameSortCol === 'description') {
      const descA = RULE_DESCRIPTIONS[keyA] || '';
      const descB = RULE_DESCRIPTIONS[keyB] || '';
      return compareValues(descA, descB, gameSortDir);
    }
    // Campaign column sort
    const campaignA = campaignData.find(c => c.info.id === gameSortCol);
    const valA = campaignA ? campaignA.gameRules[keyA] : undefined;
    const valB = campaignA ? campaignA.gameRules[keyB] : undefined;
    return compareValues(valA, valB, gameSortDir);
  });

  // Event Rules items setup
  const rawEventRuleItems = [
    { key: 'marketCrashDivisor', valGetter: (c: LoadedCampaignData) => c.eventRules?.marketCrashDivisor },
    { key: 'willyRobberyStartWeek', valGetter: (c: LoadedCampaignData) => c.eventRules?.willyRobberyStartWeek },
    { key: 'charity.maxCash', valGetter: (c: LoadedCampaignData) => c.eventRules?.charity?.maxCash },
    { key: 'charity.maxWealth', valGetter: (c: LoadedCampaignData) => c.eventRules?.charity?.maxWealth },
    { key: 'charity.wealthMetric', valGetter: (c: LoadedCampaignData) => c.eventRules?.charity?.wealthMetric },
  ];

  // Sort Event Rules
  const sortedEventRuleItems = [...rawEventRuleItems].sort((itemA, itemB) => {
    if (eventSortCol === 'key') {
      return compareValues(itemA.key, itemB.key, eventSortDir);
    }
    if (eventSortCol === 'description') {
      const descA = RULE_DESCRIPTIONS[itemA.key] || '';
      const descB = RULE_DESCRIPTIONS[itemB.key] || '';
      return compareValues(descA, descB, eventSortDir);
    }
    // Campaign column sort
    const campaignTarget = campaignData.find(c => c.info.id === eventSortCol);
    const valA = campaignTarget ? itemA.valGetter(campaignTarget) : undefined;
    const valB = campaignTarget ? itemB.valGetter(campaignTarget) : undefined;
    return compareValues(valA, valB, eventSortDir);
  });

  const headerStyle: React.CSSProperties = {
    padding: '1rem',
    borderBottom: '2px solid #52525b',
    cursor: 'pointer',
    userSelect: 'none',
  };

  return (
    <div className="fullscreen-overlay" style={{ background: '#1a1a1a', color: '#f3f4f6', overflowY: 'auto', padding: '2rem 2rem 4rem 2rem', justifyContent: 'flex-start', alignItems: 'stretch' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingTop: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', margin: 0, color: '#fff' }}>Rules Comparison Matrix</h1>
            <p style={{ color: '#9ca3af', marginTop: '0.25rem' }}>Dynamic optional rules configuration loaded across all campaign versions (Click headers to sort)</p>
          </div>
          <button onClick={onClose} style={{ padding: '0.6rem 1.2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
            Back to Title
          </button>
        </div>

        {/* GAME RULES TABLE */}
        <h2 style={{ borderBottom: '2px solid #374151', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#60a5fa' }}>Game Rules</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3rem', background: '#27272a', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)' }}>
          <thead>
            <tr style={{ background: '#3f3f46', textAlign: 'left' }}>
              <th style={{ ...headerStyle, width: '220px' }} onClick={() => handleSortClick('key', false)}>
                Rule Key {renderSortIndicator('key', gameSortCol, gameSortDir)}
              </th>
              <th style={{ ...headerStyle, minWidth: '300px' }} onClick={() => handleSortClick('description', false)}>
                Description {renderSortIndicator('description', gameSortCol, gameSortDir)}
              </th>
              {campaignData.map(c => (
                <th key={c.info.id} style={{ ...headerStyle, textAlign: 'center', minWidth: '120px' }} onClick={() => handleSortClick(c.info.id, false)}>
                  {c.info.name} {renderSortIndicator(c.info.id, gameSortCol, gameSortDir)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedGameRuleKeys.map((key) => (
              <tr key={key} style={{ borderBottom: '1px solid #3f3f46' }}>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#93c5fd', fontWeight: 'bold' }}>{key}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.95rem' }}>{RULE_DESCRIPTIONS[key] || '-'}</td>
                {campaignData.map(c => (
                  <td key={c.info.id} style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    {renderCell(key, c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* EVENT RULES TABLE */}
        <h2 style={{ borderBottom: '2px solid #374151', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#60a5fa' }}>Event Rules</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', background: '#27272a', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)' }}>
          <thead>
            <tr style={{ background: '#3f3f46', textAlign: 'left' }}>
              <th style={{ ...headerStyle, width: '220px' }} onClick={() => handleSortClick('key', true)}>
                Rule Key {renderSortIndicator('key', eventSortCol, eventSortDir)}
              </th>
              <th style={{ ...headerStyle, minWidth: '300px' }} onClick={() => handleSortClick('description', true)}>
                Description {renderSortIndicator('description', eventSortCol, eventSortDir)}
              </th>
              {campaignData.map(c => (
                <th key={c.info.id} style={{ ...headerStyle, textAlign: 'center', minWidth: '120px' }} onClick={() => handleSortClick(c.info.id, true)}>
                  {c.info.name} {renderSortIndicator(c.info.id, eventSortCol, eventSortDir)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedEventRuleItems.map(({ key, valGetter }) => (
              <tr key={key} style={{ borderBottom: '1px solid #3f3f46' }}>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#93c5fd', fontWeight: 'bold' }}>{key}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.95rem' }}>{RULE_DESCRIPTIONS[key] || '-'}</td>
                {campaignData.map(c => (
                  <td key={c.info.id} style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    {renderCell(valGetter(c) ?? 'Default')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
