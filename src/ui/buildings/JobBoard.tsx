import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobDef, BuildingDef, CampaignBundle } from '../../engine/dataLoader';
import { calcEconomyPrice } from '../../engine/economyEngine';
import { calcEmployabilityScore, calcAdvancedJobEmployabilityScore } from '../../engine/statMath';
import type { InteractionProps } from './types';

/**
 * JobBoard — Shown at the Employment Office.
 * Lists ALL jobs across the game for applying, grouped by building.
 */
export function JobBoard({ player, onAction, availableJobs, buildings, economicIndex = 0, campaign, rules }: InteractionProps & { availableJobs: JobDef[], buildings: BuildingDef[], economicIndex?: number, campaign: CampaignBundle, rules?: import('../../engine/gameState').GameRules }) {
  const { t } = useTranslation();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const isAdvanced = !!rules?.usePhysicalMentalConditions;
  const employabilityScore = calcEmployabilityScore(player.dependability || 0, player.experience || 0, player.degrees?.length || 0, 0, player.social || 0);

  // Group jobs by locationId
  const locations = Array.from(new Set(availableJobs.map(j => j.locationId)));

  if (!selectedLocation) {
    return (
      <div className="interaction-panel">
        <h3>{t('jobBoard.title')} <span style={{ fontSize: '12px', opacity: 0.8, fontWeight: 'normal' }}>({t('jobBoard.score', { defaultValue: 'Score' })}: {employabilityScore})</span></h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
          {locations.map(loc => {
            const jobCount = availableJobs.filter(j => j.locationId === loc).length;
            const isFiredThisTurn = player.turnFlags?.firedLocationsThisTurn?.includes(loc);
            const locMistakes = player.mistakesByLocation?.[loc] || 0;
            const locInnovations = player.innovationsByLocation?.[loc] || 0;

            return (
              <div key={loc} className="interaction-item interaction-item--clickable" style={{ margin: 0, padding: '10px 14px', border: isFiredThisTurn ? '1px solid #ff4d4d' : '1px solid #444', borderRadius: '6px', cursor: 'pointer' }} onClick={() => setSelectedLocation(loc)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: isFiredThisTurn ? '#ff6b6b' : 'var(--accent-cyan)' }}>{t(`building.${loc}`, { defaultValue: buildings.find(b => b.id === loc)?.name || loc })}</strong>
                  {isFiredThisTurn && (
                    <span style={{ fontSize: '10px', background: 'rgba(255, 77, 77, 0.2)', color: '#ff6b6b', border: '1px solid #ff4d4d', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                      {t('jobBoard.probationBadge')}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginTop: '4px', color: '#bbb' }}>
                  <span>{t('jobBoard.positions', { count: jobCount })}</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {locInnovations > 0 && (
                      <span style={{ fontSize: '11px', color: '#00e5ff' }}>💡 {t('jobBoard.innovationsBadge', { count: locInnovations, bonus: locInnovations * 5, defaultValue: `${locInnovations} Innovations (+${locInnovations * 5})` })}</span>
                    )}
                    {locMistakes > 0 && (
                      <span style={{ fontSize: '11px', color: '#ffb300' }}>⚠️ {t('jobBoard.mistakesBadge', { count: locMistakes })}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const jobsAtLocation = availableJobs
    .filter(j => j.locationId === selectedLocation)
    .sort((a, b) => {
      if (a.baseWage !== b.baseWage) return a.baseWage - b.baseWage;
      if (a.requirements.experience !== b.requirements.experience) return a.requirements.experience - b.requirements.experience;
      if (a.requirements.dependability !== b.requirements.dependability) return a.requirements.dependability - b.requirements.dependability;
      return a.id.localeCompare(b.id);
    });

  const isSelectedFired = player.turnFlags?.firedLocationsThisTurn?.includes(selectedLocation);
  const selectedLocMistakes = player.mistakesByLocation?.[selectedLocation] || 0;
  const selectedLocInnovations = player.innovationsByLocation?.[selectedLocation] || 0;
  const locationScore = calcEmployabilityScore(player.dependability || 0, player.experience || 0, player.degrees?.length || 0, selectedLocMistakes, player.social || 0, isSelectedFired);

  return (
    <div className="interaction-panel">
      <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button onClick={() => setSelectedLocation(null)} style={{ marginInlineEnd: '10px', padding: '4px 10px', fontSize: '12px' }}>{t('jobBoard.back')}</button>
          <span>{t('jobBoard.jobsAt', { location: t(`building.${selectedLocation}`, { defaultValue: buildings.find(b => b.id === selectedLocation)?.name || selectedLocation }) })}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
          {isSelectedFired && (
            <span style={{ background: 'rgba(255, 77, 77, 0.2)', color: '#ff6b6b', border: '1px solid #ff4d4d', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
              🚫 {t('jobBoard.probationBadge')}
            </span>
          )}
          {selectedLocInnovations > 0 && (
            <span style={{ color: '#00e5ff', background: 'rgba(0,229,255,0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid #00e5ff' }}>
              💡 {t('jobBoard.innovationsBadge', { count: selectedLocInnovations, bonus: selectedLocInnovations * 5, defaultValue: `${selectedLocInnovations} Innovations (+${selectedLocInnovations * 5})` })}
            </span>
          )}
          {selectedLocMistakes > 0 && (
            <span style={{ color: '#ffb300', background: 'rgba(255,179,0,0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid #ffb300' }}>
              ⚠️ {t('jobBoard.mistakesBadge', { count: selectedLocMistakes })}
            </span>
          )}
          <span style={{ color: '#00e5ff', opacity: 0.9 }}>
            ({t('jobBoard.score', { defaultValue: 'Score' })}: {locationScore})
          </span>
        </div>
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
        {jobsAtLocation.map(job => {
          const isCurrentJob = player.currentJobId === job.id;
          const isTechnical = isAdvanced && job.tags?.includes('technical');
          const isMiddleMgmt = isAdvanced && job.tags?.includes('middle_management');
          const isExecMgmt = isAdvanced && job.tags?.includes('executive_management');
          const isManagement = isMiddleMgmt || isExecMgmt;
          const isFrontline = job.tags?.includes('frontline_service');

          const techSkill = isTechnical ? (player.skillTech || 0) : 0;
          const mgmtSkill = isManagement ? (player.skillMgmt || 0) : 0;
          const effectiveExp = (player.experience || 0) + techSkill + mgmtSkill;
          const effectiveDep = (player.dependability || 0) + techSkill + mgmtSkill;
          const reqMgmt = isExecMgmt ? Math.floor(job.requirements.experience / 10) : 0;
          const missingMgmt = isExecMgmt && ((player.skillMgmt || 0) < reqMgmt);
          const missingExp = effectiveExp < job.requirements.experience;
          const missingDep = effectiveDep < job.requirements.dependability;
          const missingDegrees = job.requirements.degrees.filter(d => !player.degrees.includes(d));
          const hasMissingReqs = missingExp || missingDep || missingDegrees.length > 0 || missingMgmt;
          const offeredWage = calcEconomyPrice(job.baseWage, economicIndex);
          const isAlwaysHiring = job.tags?.includes('always_hiring') || job.tags?.includes('auto_accept');
          
          const jobScore = isAlwaysHiring ? (hasMissingReqs ? 0 : 100) : (isAdvanced
            ? calcAdvancedJobEmployabilityScore(
                player.dependability || 0,
                player.experience || 0,
                player.degrees?.length || 0,
                job.requirements.dependability,
                job.requirements.experience,
                player.innovationsByLocation?.[selectedLocation] || 0,
                selectedLocMistakes,
                player.social || 0,
                economicIndex,
                isSelectedFired,
                isFrontline,
                player.skillTech || 0,
                isTechnical,
                player.skillMgmt || 0,
                isManagement
              )
            : locationScore);
          
          return (
            <div key={job.id} className="interaction-item" style={{ margin: 0, padding: '12px', border: '1px solid #444', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                  <strong>{t(`job.${job.id}`, { defaultValue: job.title })}</strong>
                  <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>${offeredWage}/hr</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#888', marginBottom: '6px' }}>
                  <span>{t('jobBoard.base')}: ${job.baseWage}/hr</span>
                  <span style={{ color: isAlwaysHiring ? (hasMissingReqs ? '#e74c3c' : '#2ecc71') : (jobScore >= 70 ? '#2ecc71' : (jobScore >= 45 ? '#00e5ff' : '#f39c12')), fontWeight: 'bold' }}>
                    {isAlwaysHiring ? (hasMissingReqs ? '🎯 0%' : `🎯 100% (${t('jobBoard.alwaysHiring', { defaultValue: 'Always Hiring' })})`) : `🎯 ${jobScore}%`}
                  </span>
                </div>
                {job.tags && job.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                    {job.tags.map(tg => (
                      <span key={tg} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.08)', color: '#bbb', padding: '1px 5px', borderRadius: '3px' }}>
                        {t(`tag.${tg}`, { defaultValue: tg })}
                      </span>
                    ))}
                  </div>
                )}
                {rules?.helpfulUI && (
                  <>
                    <div style={{ fontSize: '12px', marginTop: '5px' }}>
                      <span style={{ color: missingExp ? '#e74c3c' : '#2ecc71' }}>👌 {t('jobBoard.exp')}: {job.requirements.experience}</span> | 
                      <span style={{ color: missingDep ? '#e74c3c' : '#2ecc71', marginInlineStart: '5px' }}>🤝 {t('jobBoard.dep')}: {job.requirements.dependability}</span>
                      {isExecMgmt && (
                        <span style={{ color: missingMgmt ? '#e74c3c' : '#2ecc71', marginInlineStart: '5px' }}>
                          | 👔 {t('dashboard.skillMgmt', { defaultValue: 'Mgmt' })}: {reqMgmt}.00
                        </span>
                      )}
                      {job.requirements.degrees.length > 0 && (
                        <span style={{ color: missingDegrees.length > 0 ? '#e74c3c' : '#2ecc71', marginInlineStart: '5px' }}>
                          | 🎓 {t('jobBoard.degrees')}: {job.requirements.degrees.map(d => t(`education.${d}`, { defaultValue: d })).join(', ')}
                        </span>
                      )}
                    </div>
                    {hasMissingReqs && (
                      <div style={{ fontSize: '11px', color: '#e74c3c', fontStyle: 'italic', marginTop: '2px' }}>
                        {t('jobBoard.missingReq')}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div style={{ marginTop: '10px' }}>
                {isCurrentJob ? (
                  (!rules?.helpfulUI || offeredWage > player.currentWage) ? (
                    <button data-action-target={`apply-${job.id}`} onClick={() => onAction({ type: 'apply', jobId: job.id, offeredWage })}>
                      {t('jobBoard.askRaise', { wage: offeredWage, cost: campaign.config.timeRules?.jobApplicationCost ?? 4 })}
                    </button>
                  ) : (
                    <span style={{ color: '#4caf50', fontWeight: 'bold', display: 'block', textAlign: 'center', padding: '6px' }}>✓ {t('jobBoard.currentJob', { wage: player.currentWage })}</span>
                  )
                ) : (
                  <button data-action-target={`apply-${job.id}`} onClick={() => onAction({ type: 'apply', jobId: job.id, offeredWage })}>
                    💼 {t('jobBoard.apply', { cost: campaign.config.timeRules?.jobApplicationCost ?? 4 })}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { WorkShiftCards } from './work/WorkShiftCards';

/**
 * WorkStation — Shown at workplace buildings where the player is employed.
 * Allows the player to work a shift via the WorkShiftCards card GUI.
 */
export function WorkStation({ player, onAction, job, campaign, onClose, rules, layoutMode }: InteractionProps & { job: JobDef, campaign?: CampaignBundle, onClose?: () => void, rules?: import('../../engine/gameState').GameRules, layoutMode?: 'flanking' | 'grid' }) {
  return (
    <WorkShiftCards
      player={player}
      job={job}
      campaign={campaign}
      rules={rules}
      onAction={onAction}
      onClose={onClose}
      layoutMode={layoutMode}
    />
  );
}
