import React from 'react';
import { 
  type LoadedCampaignData, 
  type DiffInfo, 
  type SortDirection, 
  compareValues, 
  renderSortIndicator, 
  headerStyle 
} from './rulesScreenUtils';

export interface LocationsTabProps {
  selectedData: LoadedCampaignData[];
  diffInfo: DiffInfo;
  diffMode: boolean;
  forcedDiffOnly?: boolean;
  searchQuery: string;
  sortState: Record<string, { col: string; dir: SortDirection }>;
  onSortClick: (categoryKey: string, col: string) => void;
}

export const LocationsTab: React.FC<LocationsTabProps> = ({
  selectedData,
  diffInfo,
  diffMode,
  forcedDiffOnly = false,
  searchQuery,
  sortState,
  onSortClick,
}) => {
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
            <th style={{ ...headerStyle, width: '220px' }} onClick={() => onSortClick('locations', 'name')}>
              Location Name {renderSortIndicator(currentSort, 'name')}
            </th>
            <th style={{ ...headerStyle, width: '150px' }} onClick={() => onSortClick('locations', 'archetype')}>
              Archetype {renderSortIndicator(currentSort, 'archetype')}
            </th>
            {selectedData.map(c => (
              <th key={c.info.id} style={{ ...headerStyle, textAlign: 'center', minWidth: '180px' }} onClick={() => onSortClick('locations', c.info.id)}>
                {c.info.name} {renderSortIndicator(currentSort, c.info.id)}
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
