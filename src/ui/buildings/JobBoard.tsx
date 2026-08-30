import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { JobDef, BuildingDef, CampaignBundle } from '../../engine/dataLoader';
import { calcEconomyPrice } from '../../engine/economyEngine';
import { calcEmployabilityScore, roundToResolution } from '../../engine/statMath';
import type { InteractionProps } from './types';

/**
 * JobBoard — Shown at the Employment Office.
 * Lists ALL jobs across the game for applying, grouped by building.
 */
export function JobBoard({ player, onAction, availableJobs, buildings, economicIndex = 0, campaign, rules }: InteractionProps & { availableJobs: JobDef[], buildings: BuildingDef[], economicIndex?: number, campaign: CampaignBundle, rules?: import('../../engine/gameState').GameRules }) {
  const { t } = useTranslation();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

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
            return (
              <div key={loc} className="interaction-item interaction-item--clickable" style={{ margin: 0, padding: '10px 14px', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer' }} onClick={() => setSelectedLocation(loc)}>
                <strong style={{ color: 'var(--accent-cyan)' }}>{t(`building.${loc}`, { defaultValue: buildings.find(b => b.id === loc)?.name || loc })}</strong>
                <div style={{ fontSize: '12px', marginTop: '4px', color: '#bbb' }}>{t('jobBoard.positions', { count: jobCount })}</div>
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

  return (
    <div className="interaction-panel">
      <h3 style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
        <button onClick={() => setSelectedLocation(null)} style={{ marginInlineEnd: '10px', padding: '4px 10px', fontSize: '12px' }}>{t('jobBoard.back')}</button>
        <span>{t('jobBoard.jobsAt', { location: t(`building.${selectedLocation}`, { defaultValue: buildings.find(b => b.id === selectedLocation)?.name || selectedLocation }) })}</span>
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
        {jobsAtLocation.map(job => {
          const isCurrentJob = player.currentJobId === job.id;
          const missingExp = player.experience < job.requirements.experience;
          const missingDep = player.dependability < job.requirements.dependability;
          const missingDegrees = job.requirements.degrees.filter(d => !player.degrees.includes(d));
          const offeredWage = calcEconomyPrice(job.baseWage, economicIndex);
          
          return (
            <div key={job.id} className="interaction-item" style={{ margin: 0, padding: '12px', border: '1px solid #444', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                  <strong>{t(`job.${job.id}`, { defaultValue: job.title })}</strong>
                  <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>${offeredWage}/hr</span>
                </div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>
                  {t('jobBoard.base')}: ${job.baseWage}/hr
                </div>
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

  const actionCount = (player.workActionsThisTurn || 0) + 1;
  const overtimeThreshold = statRules?.workOvertimeThreshold ?? 8;
  const grindThreshold = statRules?.workGrindThreshold ?? 4;

  let basePhys = 1;
  let baseMental = 0;
  let tierLabel = '';

  if (actionCount >= overtimeThreshold) {
    basePhys = statRules?.workOvertimePhysicalCost ?? 2;
    baseMental = statRules?.workOvertimeMentalCost ?? 2;
    tierLabel = ' [Overtime]';
  } else if (actionCount >= grindThreshold) {
    basePhys = statRules?.workGrindPhysicalCost ?? 1;
    baseMental = statRules?.workGrindMentalCost ?? 1;
    tierLabel = ' [Grind]';
  }

  const curPhys = player.physicalCondition ?? 50;
  const fatigueMental = curPhys < 10 ? 1 : 0;
  const halfFatigueMental = curPhys < 10 ? 0.5 : 0;
  const hasDegrees = player.degrees && player.degrees.length > 0;
  const faceTimeDep = 1 + Math.ceil((player.social || 1) / 25) / 2;

  const shiftCost = campaign?.config.timeRules?.workSessionCost ?? 6;
  const hoursToWork = player.hoursRemaining > 0 ? Math.min(shiftCost, player.hoursRemaining) : shiftCost;
  const workRatio = hoursToWork / shiftCost;

  const modes = [
    {
      id: 'work_work',
      label: `💼 ${t('action.workModal.workWork', { defaultValue: 'Work Work' })}`,
      physCost: roundToResolution(basePhys * 1.0 * workRatio, 0.5),
      mentalCost: roundToResolution((baseMental * 1.0 + fatigueMental) * workRatio, 0.5),
      wage: Math.floor(player.currentWage * 8 * workRatio),
      rewardText: hoursToWork < shiftCost ? `+${roundToResolution(1 * workRatio, 0.5)} 🤝, +${roundToResolution(1 * workRatio, 0.5)} 👌` : '+1 🤝, +1 👌',
      color: '#2ecc71',
      isDefault: true,
      disabled: false
    },
    {
      id: 'look_busy',
      label: `👀 ${t('action.workModal.lookBusy', { defaultValue: 'Look Busy' })}`,
      physCost: roundToResolution(basePhys * 0.5 * workRatio, 0.5),
      mentalCost: roundToResolution((baseMental * 0.5 + halfFatigueMental) * workRatio, 0.5),
      wage: Math.floor(player.currentWage * 8 * workRatio),
      rewardText: '+0 🤝, +0 👌',
      color: '#3498db',
      isDefault: false,
      disabled: false
    },
    {
      id: 'face_time',
      label: `🤝 ${t('action.workModal.faceTime', { defaultValue: 'Face Time' })}`,
      physCost: roundToResolution(basePhys * 0.5 * workRatio, 0.5),
      mentalCost: roundToResolution((baseMental * 1.0 + 2.0 + halfFatigueMental) * workRatio, 0.5),
      wage: 0,
      rewardText: `+${roundToResolution(faceTimeDep * workRatio, 0.5)} 🤝, +👥`,
      color: '#9b59b6',
      isDefault: false,
      disabled: false
    },
    {
      id: 'innovate',
      label: `💡 ${t('action.workModal.innovate', { defaultValue: 'Innovate' })}`,
      physCost: roundToResolution(basePhys * 1.0 * workRatio, 0.5),
      mentalCost: roundToResolution((baseMental + 2.0 + (player.innovationCount || 0) + fatigueMental) * workRatio, 0.5),
      wage: Math.floor(player.currentWage * 8 * 0.5 * workRatio),
      rewardText: hasDegrees ? t('action.workModal.innovateReward', { defaultValue: '🎲 2d2-2 🤝 & 👌 (Cap Buster)' }) : t('action.workModal.requiresDegree', { defaultValue: 'Requires Degree 🎓' }),
      color: '#e67e22',
      isDefault: false,
      disabled: !hasDegrees
    }
  ];

  return (
    <div className="interaction-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        <h3 style={{ margin: 0 }}>{t('workStation.title', { jobTitle: t(`job.${job.id}`, { defaultValue: job.title }) })}</h3>
        <span style={{ fontSize: '12px', color: '#00e5ff', fontWeight: 'bold' }}>${player.currentWage}/hr (⏳{hoursToWork}h) {tierLabel}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
        {modes.map(m => {
          const hasEnoughTime = player.hoursRemaining > 0;
          const hasEnoughPhys = curPhys - m.physCost >= 1.0;
          const hasEnoughMental = (player.mentalCondition ?? 50) - m.mentalCost >= 1.0;
          const canAfford = hasEnoughTime && hasEnoughPhys && hasEnoughMental && !m.disabled;
          const isWorkWork = m.id === 'work_work';
          const costStr = m.mentalCost > 0
            ? `-${m.physCost} 💪, -${m.mentalCost} 🧠`
            : `-${m.physCost} 💪`;

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
                cursor: 'pointer',
                opacity: canAfford ? 1 : 0.55,
                textAlign: 'left',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', color: canAfford ? (isWorkWork ? '#2ecc71' : m.color) : '#888', fontSize: isWorkWork ? '1.05em' : '0.98em' }}>
                  {m.label}
                </span>
                {isWorkWork && (
                  <span style={{ fontSize: '0.65em', padding: '1px 5px', background: canAfford ? '#2ecc71' : '#555', color: '#111', borderRadius: '3px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {t('action.workModal.defaultBadge', { defaultValue: 'Default' })}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.78em', marginTop: '3px', color: canAfford ? '#bbb' : '#777' }}>
                {costStr} | ${m.wage} | {m.rewardText}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
