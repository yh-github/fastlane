import React from 'react';
import { RULE_DESCRIPTIONS } from '../../engine/rules';
import { 
  type LoadedCampaignData, 
  type DiffInfo, 
  type SortDirection, 
  compareValues, 
  renderValueCell, 
  renderSortIndicator, 
  headerStyle 
} from './rulesScreenUtils';

export interface RulesTabProps {
  title: string;
  categoryKey: 'gameRules' | 'timeRules' | 'economyRules' | 'statRules' | 'eventRules';
  selectedData: LoadedCampaignData[];
  diffInfo: DiffInfo;
  diffMode: boolean;
  forcedDiffOnly?: boolean;
  searchQuery: string;
  sortState: Record<string, { col: string; dir: SortDirection }>;
  onSortClick: (categoryKey: string, col: string) => void;
}

export const RulesTab: React.FC<RulesTabProps> = ({
  title,
  categoryKey,
  selectedData,
  diffInfo,
  diffMode,
  forcedDiffOnly = false,
  searchQuery,
  sortState,
  onSortClick,
}) => {
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
            <th style={{ ...headerStyle, width: '220px' }} onClick={() => onSortClick(categoryKey, 'key')}>
              Rule Key {renderSortIndicator(currentSort, 'key')}
            </th>
            <th style={{ ...headerStyle, minWidth: '300px' }} onClick={() => onSortClick(categoryKey, 'description')}>
              Description {renderSortIndicator(currentSort, 'description')}
            </th>
            {selectedData.map(c => (
              <th key={c.info.id} style={{ ...headerStyle, textAlign: 'center', minWidth: '120px' }} onClick={() => onSortClick(categoryKey, c.info.id)}>
                {c.info.name} {renderSortIndicator(currentSort, c.info.id)}
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
