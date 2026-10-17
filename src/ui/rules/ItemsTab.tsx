import React from 'react';
import { 
  type LoadedCampaignData, 
  type DiffInfo, 
  type SortDirection, 
  compareValues, 
  getTagSynergyDescriptions, 
  renderSortIndicator, 
  headerStyle 
} from './rulesScreenUtils';

export interface ItemsTabProps {
  selectedData: LoadedCampaignData[];
  diffInfo: DiffInfo;
  diffMode: boolean;
  forcedDiffOnly?: boolean;
  searchQuery: string;
  sortState: Record<string, { col: string; dir: SortDirection }>;
  onSortClick: (categoryKey: string, col: string) => void;
}

export const ItemsTab: React.FC<ItemsTabProps> = ({
  selectedData,
  diffInfo,
  diffMode,
  forcedDiffOnly = false,
  searchQuery,
  sortState,
  onSortClick,
}) => {
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
      const allNames = selectedData.map(c => c.bundle.items?.find(i => i.id === itemId)?.name).filter(Boolean) as string[];
      const sampleItem = selectedData.map(c => c.bundle.items?.find(i => i.id === itemId)).find(Boolean);
      return itemId.toLowerCase().includes(q) || 
        allNames.some(name => name.toLowerCase().includes(q)) ||
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
            <th style={{ ...headerStyle, width: '220px' }} onClick={() => onSortClick('items', 'name')}>
              Item Name {renderSortIndicator(currentSort, 'name')}
            </th>
            <th style={{ ...headerStyle, width: '140px' }} onClick={() => onSortClick('items', 'category')}>
              Category {renderSortIndicator(currentSort, 'category')}
            </th>
            {selectedData.map(c => (
              <th key={c.info.id} style={{ ...headerStyle, textAlign: 'center', minWidth: '170px' }} onClick={() => onSortClick('items', c.info.id)}>
                {c.info.name} {renderSortIndicator(currentSort, c.info.id)}
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
                  {(() => {
                    const allNames = Array.from(new Set(
                      selectedData.map(c => c.bundle.items?.find(i => i.id === itemId)?.name).filter(Boolean)
                    )) as string[];
                    const altNames = allNames.filter(n => n !== sampleItem?.name);
                    if (altNames.length === 0) return null;
                    return (
                      <div style={{ fontSize: '11px', color: '#fbbf24', fontStyle: 'italic', marginTop: '2px' }}>
                        aka {altNames.map(n => `"${n}"`).join(', ')}
                      </div>
                    );
                  })()}
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
                  const isAdvancedCampaign = c.bundle.config.gameRules.versionClass === 'advanced';

                  return (
                    <td key={c.info.id} style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', verticalAlign: 'top' }}>
                      {item.name && sampleItem?.name && item.name !== sampleItem.name && (
                        <div style={{ 
                          color: '#fbbf24', 
                          fontWeight: 'bold', 
                          fontSize: '0.85rem', 
                          marginBottom: '4px',
                          background: 'rgba(234, 179, 8, 0.12)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          display: 'inline-block'
                        }}>
                          📛 "{item.name}"
                        </div>
                      )}
                      <div style={{ 
                        fontWeight: 'bold', 
                        color: item.basePrice !== undefined ? '#4ade80' : '#888', 
                        fontSize: '0.95rem', 
                        marginBottom: '3px',
                        display: 'block',
                        background: priceDiffers ? 'rgba(74, 222, 128, 0.15)' : 'transparent',
                        padding: priceDiffers ? '1px 5px' : '0',
                        borderRadius: '4px'
                      }}>
                        {item.basePrice !== undefined ? `$${item.basePrice}` : 'Price N/A'}
                      </div>
                      <div style={{ color: '#d1d5db', lineHeight: '1.4' }}>
                        {!isAdvancedCampaign && item.happinessBonus !== 0 && (
                          <div style={{ color: '#60a5fa' }}>😊 Happiness: <strong>{item.happinessBonus > 0 ? `+${item.happinessBonus}` : item.happinessBonus}</strong></div>
                        )}
                        {item.lifestyleValue !== undefined && item.lifestyleValue > 0 && (
                          <div style={{ color: '#f59e0b' }}>⭐ Lifestyle: <strong>{item.lifestyleValue}</strong></div>
                        )}
                        {item.mentalBonus !== undefined && item.mentalBonus !== 0 && (
                          <div style={{ color: '#a78bfa' }}>🧠 Mental: <strong>{item.mentalBonus > 0 ? `+${item.mentalBonus}` : item.mentalBonus}</strong></div>
                        )}
                        {item.space !== undefined && (
                          <div style={{ color: '#9ca3af' }}>📦 Space: <strong>{item.space}</strong></div>
                        )}
                        {item.description && (
                          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '3px', fontStyle: 'italic' }}>
                            📝 {item.description}
                          </div>
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
                        <div style={{ marginTop: '6px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                            {item.tags.map(t => {
                              const synDescs = getTagSynergyDescriptions(t, c.bundle.synergies);
                              const tooltip = synDescs.join(' | ');
                              return (
                                <span 
                                  key={t} 
                                  title={tooltip || t}
                                  style={{ 
                                    background: '#374151', 
                                    color: '#cbd5e1', 
                                    padding: '1px 5px', 
                                    borderRadius: '3px', 
                                    fontSize: '10px',
                                    cursor: synDescs.length > 0 ? 'help' : 'default',
                                    borderBottom: synDescs.length > 0 ? '1px dotted #34d399' : 'none'
                                  }}
                                >
                                  {t}
                                </span>
                              );
                            })}
                          </div>
                          {item.tags.flatMap(t => getTagSynergyDescriptions(t, c.bundle.synergies)).map((desc, idx) => (
                            <div key={idx} style={{ fontSize: '10px', color: '#34d399', marginTop: '2px', lineHeight: '1.2' }}>
                              ✨ {desc}
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
