import React, { useState } from 'react';
import type { 
  LoadedCampaignData, 
  DiffInfo, 
  SortDirection 
} from './rulesScreenUtils';
import { RulesTab } from './RulesTab';
import { JobsTab } from './JobsTab';
import { ItemsTab } from './ItemsTab';
import { LocationsTab } from './LocationsTab';
import { GoalsHousingTab } from './GoalsHousingTab';

export interface AllDiffsTabProps {
  selectedData: LoadedCampaignData[];
  diffInfo: DiffInfo;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectAllCampaigns: () => void;
  sortState: Record<string, { col: string; dir: SortDirection }>;
  onSortClick: (categoryKey: string, col: string) => void;
}

export const AllDiffsTab: React.FC<AllDiffsTabProps> = ({
  selectedData,
  diffInfo,
  searchQuery,
  setSearchQuery,
  selectAllCampaigns,
  sortState,
  onSortClick,
}) => {
  const [showIdenticalLocations, setShowIdenticalLocations] = useState(false);

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
            <RulesTab title="Game Rules" categoryKey="gameRules" selectedData={selectedData} diffInfo={diffInfo} diffMode={true} forcedDiffOnly={true} searchQuery={searchQuery} sortState={sortState} onSortClick={onSortClick} />
            <RulesTab title="Time Rules" categoryKey="timeRules" selectedData={selectedData} diffInfo={diffInfo} diffMode={true} forcedDiffOnly={true} searchQuery={searchQuery} sortState={sortState} onSortClick={onSortClick} />
            <RulesTab title="Economy Rules" categoryKey="economyRules" selectedData={selectedData} diffInfo={diffInfo} diffMode={true} forcedDiffOnly={true} searchQuery={searchQuery} sortState={sortState} onSortClick={onSortClick} />
            <RulesTab title="Stat Rules" categoryKey="statRules" selectedData={selectedData} diffInfo={diffInfo} diffMode={true} forcedDiffOnly={true} searchQuery={searchQuery} sortState={sortState} onSortClick={onSortClick} />
            <RulesTab title="Event Rules" categoryKey="eventRules" selectedData={selectedData} diffInfo={diffInfo} diffMode={true} forcedDiffOnly={true} searchQuery={searchQuery} sortState={sortState} onSortClick={onSortClick} />
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
        <JobsTab selectedData={selectedData} diffInfo={diffInfo} diffMode={true} forcedDiffOnly={true} searchQuery={searchQuery} sortState={sortState} onSortClick={onSortClick} />
      </div>

      {/* 3. Item Differences Section */}
      <div id="sec-items" style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.6rem', margin: 0, color: '#60a5fa' }}>
            📦 Item Differences ({diffInfo.diffItemIds.length})
          </h2>
        </div>
        <ItemsTab selectedData={selectedData} diffInfo={diffInfo} diffMode={true} forcedDiffOnly={true} searchQuery={searchQuery} sortState={sortState} onSortClick={onSortClick} />
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
            <LocationsTab selectedData={selectedData} diffInfo={diffInfo} diffMode={true} forcedDiffOnly={true} searchQuery={searchQuery} sortState={sortState} onSortClick={onSortClick} />
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
        <GoalsHousingTab selectedData={selectedData} diffInfo={diffInfo} diffMode={true} forcedDiffOnly={true} />
      </div>
    </div>
  );
};
