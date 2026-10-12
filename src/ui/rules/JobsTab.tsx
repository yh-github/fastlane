import React from 'react';
import { 
  JOB_TAG_REGISTRY, 
  type JobTag, 
  getJobSpecialRequirements 
} from '../../engine/jobTags';
import { 
  type LoadedCampaignData, 
  type DiffInfo, 
  type SortDirection, 
  compareValues, 
  renderSortIndicator, 
  headerStyle 
} from './rulesScreenUtils';

export interface JobsTabProps {
  selectedData: LoadedCampaignData[];
  diffInfo: DiffInfo;
  diffMode: boolean;
  forcedDiffOnly?: boolean;
  searchQuery: string;
  sortState: Record<string, { col: string; dir: SortDirection }>;
  onSortClick: (categoryKey: string, col: string) => void;
}

export const JobsTab: React.FC<JobsTabProps> = ({
  selectedData,
  diffInfo,
  diffMode,
  forcedDiffOnly = false,
  searchQuery,
  sortState,
  onSortClick,
}) => {
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
            <th style={{ ...headerStyle, width: '220px' }} onClick={() => onSortClick('jobs', 'title')}>
              Job Title {renderSortIndicator(currentSort, 'title')}
            </th>
            <th style={{ ...headerStyle, width: '160px' }} onClick={() => onSortClick('jobs', 'location')}>
              Location {renderSortIndicator(currentSort, 'location')}
            </th>
            {selectedData.map(c => (
              <th key={c.info.id} style={{ ...headerStyle, textAlign: 'center', minWidth: '180px' }} onClick={() => onSortClick('jobs', c.info.id)}>
                {c.info.name} {renderSortIndicator(currentSort, c.info.id)}
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
                  const isAdvancedCampaign = !!c.bundle.config.gameRules?.usePhysicalMentalConditions;
                  const specialReqs = getJobSpecialRequirements(job, isAdvancedCampaign);

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
                        {specialReqs.length > 0 && (
                          <div style={{ marginTop: '4px', fontSize: '11px', color: '#f472b6' }}>
                            {specialReqs.map((sr, idx) => (
                              <div key={idx}>⚠️ <strong>{sr.label}:</strong> {sr.detail}</div>
                            ))}
                          </div>
                        )}
                        {job.description && (
                          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '3px', fontStyle: 'italic' }}>
                            📝 {job.description}
                          </div>
                        )}
                      </div>
                      {job.tags && job.tags.length > 0 && (
                        <div style={{ marginTop: '6px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                            {job.tags.map(t => {
                              const def = JOB_TAG_REGISTRY[t as JobTag];
                              const tagTooltip = def ? def.descKey : t;
                              return (
                                <span 
                                  key={t} 
                                  title={tagTooltip}
                                  style={{ 
                                    background: '#374151', 
                                    color: '#93c5fd', 
                                    padding: '1px 5px', 
                                    borderRadius: '3px', 
                                    fontSize: '10px',
                                    cursor: 'help',
                                    borderBottom: '1px dotted #60a5fa'
                                  }}
                                >
                                  {t}
                                </span>
                              );
                            })}
                          </div>
                          {job.tags.map(t => {
                            const def = JOB_TAG_REGISTRY[t as JobTag];
                            if (!def) return null;
                            const descText = def.descKey === 'tag.always_hiring_desc' ? 'Walk-in hiring: auto-hire if requirements met.' :
                              def.descKey === 'tag.academic_freedom_desc' ? '+0.50 Experience bonus per shift.' :
                              def.descKey === 'tag.heavy_physical_desc' ? '+0.5 Physical cost per shift. Overworking risks injury.' :
                              def.descKey === 'tag.frontline_service_desc' ? 'Customer-facing: social score impacts shift earnings & tips.' :
                              def.descKey === 'tag.middle_management_desc' ? '+1 Mental cost, Look Busy disabled. Builds Skill_Mgmt.' :
                              def.descKey === 'tag.executive_management_desc' ? 'Requires Skill_Mgmt >= Exp/10. Builds +0.50 Skill_Mgmt/shift. High mental pressure: +1 weekly Dep decay, mental mistakes trigger < 20.' :
                              def.descKey === 'tag.high_downtime_desc' ? 'Low fatigue accumulation, protects dependability decay.' :
                              def.descKey === 'tag.technical_desc' ? 'Builds +0.25 Skill_Tech per shift.' :
                              def.descKey === 'tag.look_fit_desc' ? 'Requires Physical Condition >= 30. High fitness scales hiring chance.' :
                              def.descKey;
                            return (
                              <div key={t} style={{ fontSize: '10px', color: '#93c5fd', marginTop: '2px', lineHeight: '1.2' }}>
                                ℹ️ <strong>{t}:</strong> {descText}
                              </div>
                            );
                          })}
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
