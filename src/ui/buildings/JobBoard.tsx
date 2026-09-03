import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobDef, BuildingDef, CampaignBundle } from '../../engine/dataLoader';
import { calcEconomyPrice } from '../../engine/economyEngine';
import { calcEmployabilityScore, calcAdvancedJobEmployabilityScore } from '../../engine/statMath';
import type { InteractionProps } from './types';
import { calcWorkShiftSummary } from '../../engine/jobEngine';

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
          const missingExp = player.experience < job.requirements.experience;
          const missingDep = player.dependability < job.requirements.dependability;
          const missingDegrees = job.requirements.degrees.filter(d => !player.degrees.includes(d));
          const hasMissingReqs = missingExp || missingDep || missingDegrees.length > 0;
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
                isSelectedFired
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
                      {job.requirements.degrees.length > 0 && (
                        <span style={{ color: missingDegrees.length > 0 ? '#e74c3c' : '#2ecc71', marginInlineStart: '5px' }}>
                          | 🎓 {t('jobBoard.degrees')}: {job.requirements.degrees.map(d => t(`education.${d}`, { defaultValue: d })).join(', ')}
                        </span>
                      )}
                    </div>
                    {(missingExp || missingDep || missingDegrees.length > 0) && (
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

/**
 * WorkStation — Shown at workplace buildings where the player is employed.
 * Allows the player to work a shift.
 */
export function WorkStation({ player, onAction, job, campaign }: InteractionProps & { job: JobDef, campaign?: CampaignBundle }) {
  const { t } = useTranslation();
  const rules = campaign?.config?.gameRules;
  const statRules = campaign?.config?.statRules;
  const isAdvanced = !!rules?.usePhysicalMentalConditions;
  const workSessionCost = campaign?.config.timeRules?.workSessionCost ?? 6;

  if (!isAdvanced) {
    const canWork = player.hoursRemaining > 0;
    return (
      <div className="interaction-panel">
        <h3>{t('workStation.title', { jobTitle: t(`job.${job.id}`, { defaultValue: job.title }) })}</h3>
        <p style={{ fontSize: '12px', marginBottom: '10px' }}>${player.currentWage}/hr</p>
        <button
          data-action-target={`work-${job.id}`}
          onClick={() => onAction({ type: 'work', jobId: job.id })}
          style={{
            padding: '10px 16px',
            fontWeight: 'bold',
            backgroundColor: canWork ? '#2980b9' : '#444',
            color: canWork ? '#fff' : '#888',
            border: 'none',
            borderRadius: '6px',
            cursor: canWork ? 'pointer' : 'not-allowed',
            opacity: canWork ? 1 : 0.55
          }}
        >
          💼 {t('workStation.workShift', { cost: workSessionCost })}
        </button>
      </div>
    );
  }

  const shiftCost = campaign?.config.timeRules?.workSessionCost ?? 6;
  const summary = calcWorkShiftSummary(player, job, shiftCost, rules, statRules);
  const { hoursToWork, tierLabel, modes, innovationsCount, locationMistakes, turnMistakes } = summary;

  const modeLabels: Record<string, string> = {
    work_work: `💼 ${t('action.workModal.workWork', { defaultValue: 'Work Work' })}`,
    look_busy: `👀 ${t('action.workModal.lookBusy', { defaultValue: 'Look Busy' })}`,
    face_time: `🤝 ${t('action.workModal.faceTime', { defaultValue: 'Face Time' })}`,
    innovate: `💡 ${t('action.workModal.innovate', { defaultValue: 'Innovate' })}`
  };

  return (
    <div className="interaction-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        <h3 style={{ margin: 0 }}>{t('workStation.title', { jobTitle: t(`job.${job.id}`, { defaultValue: job.title }) })}</h3>
        <span style={{ fontSize: '12px', color: '#00e5ff', fontWeight: 'bold' }}>${player.currentWage}/hr (⏳{hoursToWork}h) {tierLabel}</span>
      </div>

      {(innovationsCount > 0 || locationMistakes > 0 || (isAdvanced && turnMistakes > 0)) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', marginBottom: '8px', fontSize: '11px' }}>
          {innovationsCount > 0 && (
            <span style={{ background: 'rgba(0, 229, 255, 0.15)', color: '#00e5ff', border: '1px solid #00e5ff', padding: '2px 6px', borderRadius: '4px' }}>
              💡 {t('workStation.innovations', { count: innovationsCount })}
            </span>
          )}
          {isAdvanced && turnMistakes > 0 && (
            <span style={{ background: 'rgba(255, 77, 77, 0.15)', color: '#ff6b6b', border: '1px solid #ff4d4d', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
              ⚠️ {t('workStation.mistakesThisTurn', { count: turnMistakes })}
            </span>
          )}
          {locationMistakes > 0 && (
            <span style={{ background: 'rgba(255, 179, 0, 0.15)', color: '#ffb300', border: '1px solid #ffb300', padding: '2px 6px', borderRadius: '4px' }}>
              ⚠️ {t('workStation.locationMistakes', { count: locationMistakes })}
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
        {modes.map(m => {
          const curPhys = player.physicalCondition ?? 50;
          const hasEnoughTime = player.hoursRemaining > 0;
          const hasEnoughPhys = curPhys - m.physCost >= 1.0;
          const hasEnoughMental = (player.mentalCondition ?? 50) - m.mentalCost >= 1.0;
          const canAfford = hasEnoughTime && hasEnoughPhys && hasEnoughMental && !m.disabled;
          const isWorkWork = m.id === 'work_work';
          const costStr = m.mentalCost > 0
            ? `-${m.physCost} 💪, -${m.mentalCost} 🧠`
            : `-${m.physCost} 💪`;

          const displayReward = m.disabledReasonKey
            ? t(m.disabledReasonKey)
            : (m.id === 'innovate'
                ? (player.degrees && player.degrees.length > 0
                    ? t('action.workModal.innovateReward', { defaultValue: '🎲 2d2-2 🤝 & 👌 (Cap Buster)' })
                    : t('action.workModal.requiresDegree', { defaultValue: 'Requires Degree 🎓' }))
                : m.rewardText);

          return (
            <button
              key={m.id}
              data-testid={`work-mode-${m.id}`}
              data-action-target={isWorkWork ? `work-${job.id}` : undefined}
              onClick={() => {
                onAction({ type: 'work', jobId: job.id, mode: m.id as any });
              }}
              style={{
                padding: isWorkWork ? '10px 14px' : '8px 12px',
                borderRadius: '6px',
                backgroundColor: isWorkWork && canAfford
                  ? 'rgba(46, 204, 113, 0.15)'
                  : (canAfford ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)'),
                border: isWorkWork && canAfford
                  ? '2px solid #2ecc71'
                  : `1px solid ${canAfford ? m.color : '#444'}`,
                boxShadow: isWorkWork && canAfford ? '0 0 10px rgba(46, 204, 113, 0.25)' : undefined,
                color: canAfford ? '#fff' : '#777',
                cursor: canAfford ? 'pointer' : 'not-allowed',
                opacity: canAfford ? 1 : 0.55,
                textAlign: 'left',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', color: canAfford ? (isWorkWork ? '#2ecc71' : m.color) : '#888', fontSize: isWorkWork ? '1.05em' : '0.98em' }}>
                  {modeLabels[m.id] || m.id}
                </span>
                {isWorkWork && (
                  <span style={{ fontSize: '0.65em', padding: '1px 5px', background: canAfford ? '#2ecc71' : '#555', color: '#111', borderRadius: '3px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {t('action.workModal.defaultBadge', { defaultValue: 'Default' })}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.78em', marginTop: '3px', color: canAfford ? '#bbb' : '#777' }}>
                {costStr} | ${m.wage} | {displayReward}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
