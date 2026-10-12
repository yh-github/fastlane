import React from 'react';
import { 
  type LoadedCampaignData, 
  type DiffInfo, 
  headerStyle 
} from './rulesScreenUtils';

export interface GoalsHousingTabProps {
  selectedData: LoadedCampaignData[];
  diffInfo: DiffInfo;
  diffMode: boolean;
  forcedDiffOnly?: boolean;
}

export const GoalsHousingTab: React.FC<GoalsHousingTabProps> = ({
  selectedData,
  diffInfo,
  diffMode,
  forcedDiffOnly = false,
}) => {
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
