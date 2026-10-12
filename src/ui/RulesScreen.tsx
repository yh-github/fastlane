import React, { useEffect, useState, useMemo } from 'react';
import { 
  getAvailableCampaigns, 
  loadCampaign, 
  type CampaignBundle, 
} from '../engine/dataLoader';
import { DEFAULT_GAME_RULES } from '../engine/rules';
import { 
  type TabType, 
  type SortDirection, 
  type LoadedCampaignData, 
  type DiffInfo, 
  flattenObject, 
  areJobsEqual, 
  areItemsEqual, 
  areBuildingsEqual 
} from './rules/rulesScreenUtils';
import { RulesTab } from './rules/RulesTab';
import { JobsTab } from './rules/JobsTab';
import { ItemsTab } from './rules/ItemsTab';
import { LocationsTab } from './rules/LocationsTab';
import { GoalsHousingTab } from './rules/GoalsHousingTab';
import { AllDiffsTab } from './rules/AllDiffsTab';

export type { TabType } from './rules/rulesScreenUtils';

export interface RulesScreenProps {
  onClose: () => void;
  initialTab?: TabType;
  initialDiffMode?: boolean;
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
  const diffInfo: DiffInfo = useMemo(() => {
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
            {activeTab === 'all-diffs' && (
              <AllDiffsTab 
                selectedData={selectedData} 
                diffInfo={diffInfo} 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectAllCampaigns={selectAllCampaigns}
                sortState={sortState} 
                onSortClick={handleSortClick} 
              />
            )}
            {activeTab === 'rules' && (
              <>
                <RulesTab title="Game Rules" categoryKey="gameRules" selectedData={selectedData} diffInfo={diffInfo} diffMode={diffMode} searchQuery={searchQuery} sortState={sortState} onSortClick={handleSortClick} />
                <RulesTab title="Time Rules" categoryKey="timeRules" selectedData={selectedData} diffInfo={diffInfo} diffMode={diffMode} searchQuery={searchQuery} sortState={sortState} onSortClick={handleSortClick} />
                <RulesTab title="Economy Rules" categoryKey="economyRules" selectedData={selectedData} diffInfo={diffInfo} diffMode={diffMode} searchQuery={searchQuery} sortState={sortState} onSortClick={handleSortClick} />
                <RulesTab title="Stat Rules" categoryKey="statRules" selectedData={selectedData} diffInfo={diffInfo} diffMode={diffMode} searchQuery={searchQuery} sortState={sortState} onSortClick={handleSortClick} />
                <RulesTab title="Event Rules" categoryKey="eventRules" selectedData={selectedData} diffInfo={diffInfo} diffMode={diffMode} searchQuery={searchQuery} sortState={sortState} onSortClick={handleSortClick} />
              </>
            )}
            {activeTab === 'jobs' && (
              <JobsTab selectedData={selectedData} diffInfo={diffInfo} diffMode={diffMode} searchQuery={searchQuery} sortState={sortState} onSortClick={handleSortClick} />
            )}
            {activeTab === 'items' && (
              <ItemsTab selectedData={selectedData} diffInfo={diffInfo} diffMode={diffMode} searchQuery={searchQuery} sortState={sortState} onSortClick={handleSortClick} />
            )}
            {activeTab === 'locations' && (
              <LocationsTab selectedData={selectedData} diffInfo={diffInfo} diffMode={diffMode} searchQuery={searchQuery} sortState={sortState} onSortClick={handleSortClick} />
            )}
            {activeTab === 'goals-housing' && (
              <GoalsHousingTab selectedData={selectedData} diffInfo={diffInfo} diffMode={diffMode} />
            )}
          </>
        )}

      </div>
    </div>
  );
};
