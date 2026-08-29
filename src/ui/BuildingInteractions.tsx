import type { PlayerState, GameRules } from '../engine/gameState';
import { collectItemEffects } from '../engine/gameState';
import type { JobDef, ItemDef, EducationDef, BuildingDef, CampaignBundle, StockDef } from '../engine/dataLoader';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { calcEconomyPrice, calcItemPrice, calcStockPrice } from '../engine/economyEngine';
import { calcRequiredLessons, formatDegreeProgress, getPrerequisiteChainDepth } from '../engine/educationEngine';
import { calcEmployabilityScore, calcMovingFee, calcMaxMess, roundToResolution } from '../engine/statMath';

interface InteractionProps {
  player: PlayerState;
  onAction: (actionPayload: any) => void;
}

/**
 * JobBoard — Shown at the Employment Office.
 * Lists ALL jobs across the game for applying, grouped by building.
 */
export function JobBoard({ player, onAction, availableJobs, buildings, economicIndex = 0, campaign, rules }: InteractionProps & { availableJobs: JobDef[], buildings: BuildingDef[], economicIndex?: number, campaign: CampaignBundle, rules?: import('../engine/gameState').GameRules }) {
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
  const rules = campaign?.rules || campaign?.config?.gameRules;
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

  const shiftCost = campaign.config.timeRules?.workSessionCost ?? 6;
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

export function StoreFront({ player, onAction, availableItems, economicIndex = 0, rules }: InteractionProps & { availableItems: ItemDef[], economicIndex?: number, rules?: import('../engine/gameState').GameRules }) {
  const { t } = useTranslation();
  return (
    <div className="interaction-panel">
      <h3 style={{ marginBottom: '12px' }}>{t('storeFront.title')}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
        {availableItems.map(item => {
          const adjustedPrice = calcItemPrice(item, economicIndex);
          const canAfford = player.money >= adjustedPrice;
          let alreadyOwned = false;
          if (item.category === 'book') alreadyOwned = player.inventory.books.includes(item.id);
          else if (item.category === 'appliance') alreadyOwned = player.inventory.appliances.some(a => a.id === item.id);
          
          return (
            <div 
              key={item.id} 
              className={`interaction-item interaction-item--clickable ${!canAfford ? 'interaction-item--disabled' : ''}`}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                margin: 0,
                padding: '8px 12px',
                opacity: canAfford ? 1 : 0.5,
                cursor: canAfford ? 'pointer' : 'not-allowed',
                borderRadius: '6px'
              }}
              onClick={() => {
                onAction({ type: 'buy', itemId: item.id });
              }}
              data-action-target={`buy-${item.id}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                {rules?.showItemImages && (
                  <img 
                    src={`/assets/raw_images/${item.id}.png`} 
                    alt={item.name} 
                    style={{ width: '28px', height: '28px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '4px', flexShrink: 0 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t(`item.${item.id}`, { defaultValue: item.name })}
                  {rules?.helpfulUI && alreadyOwned && <span style={{ color: '#4caf50', marginLeft: '6px', fontWeight: 'bold' }}>✓ {t('storeFront.owned', { defaultValue: 'Owned' })}</span>}
                </span>
              </div>
              <span style={{ fontWeight: 'bold', fontSize: '13px', marginLeft: '8px', flexShrink: 0 }}>${adjustedPrice}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HomeRelax({ player, onAction, campaign, rules, economicIndex = 0 }: InteractionProps & { campaign?: CampaignBundle, rules?: GameRules, economicIndex?: number }) {
  const { t } = useTranslation();
  const [showUnfedWarning, setShowUnfedWarning] = useState(false);
  const [warnedThisVisit, setWarnedThisVisit] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  const handleHomeAction = async (payload: any) => {
    setActionFeedback(null);
    const result = await onAction(payload);
    if (result) {
      const log = Array.isArray(result) ? result[0] : result;
      if (log?.key?.includes?.('error')) {
        setActionFeedback({ message: String(t(log.key, log.params || { defaultValue: log.key })), isError: true });
      }
    }
    return result;
  };

  const relaxCost = campaign?.config.timeRules?.relaxCost ?? 6;
  const isDivisible = !!rules?.proportionalDivisibleActions;
  const hoursToRelax = player.hoursRemaining > 0 ? Math.min(relaxCost, player.hoursRemaining) : 0;
  const relaxRatio = relaxCost > 0 ? hoursToRelax / relaxCost : 1;
  const isRelaxDisabled = player.hoursRemaining <= 0 || (player.hoursRemaining < relaxCost && !rules?.allowPartialHours && !isDivisible);

  const currentMess = player.mess || 0;
  const maxMessHousing = calcMaxMess(player, campaign?.config.statRules);
  const isMessClean = currentMess <= 0;
  const isMessTooHighForSocial = currentMess > 25;
  const cleaningServiceCost = campaign?.config.timeRules?.cleaningServiceCost ?? 1;
  const cleaningServiceBasePrice = campaign?.config.economyRules?.cleaningServiceBasePrice ?? 100;
  const cleaningServicePrice = calcEconomyPrice(cleaningServiceBasePrice, economicIndex);
  const canAffordCleaning = player.money >= cleaningServicePrice;

  const socializeCost = campaign?.config.timeRules?.socializeCost ?? 6;
  const isTooExhaustedForSocial = !!rules?.usePhysicalMentalConditions && ((player.physicalCondition ?? 50) - 1 < 1.0);
  const isNotEnoughTimeForSocial = player.hoursRemaining < socializeCost;
  const isSocialDisabled = isMessTooHighForSocial || isNotEnoughTimeForSocial || isTooExhaustedForSocial;
  const socialSubtext = '-1 💪, +👥 (generates 🧹)';

  const cleanPhysicalCost = campaign?.config.statRules?.cleanPhysicalCost ?? 1;
  const hoursToClean = player.hoursRemaining > 0 ? Math.min(3, player.hoursRemaining) : 3;
  const cleanRatio = hoursToClean / 3;
  const cleanPhysGain = Math.max(0.5, roundToResolution(cleanPhysicalCost * cleanRatio, 0.5));
  const isTooExhaustedForClean = !!rules?.usePhysicalMentalConditions && ((player.physicalCondition ?? 50) - cleanPhysGain < 1.0);
  const isNotEnoughTimeForClean = player.hoursRemaining <= 0;
  const isCleanDisabled = isMessClean || isNotEnoughTimeForClean || isTooExhaustedForClean;
  const cleanSubtext = `Cleans 🧹 ${rules?.usePhysicalMentalConditions ? `(-${cleanPhysGain} 💪)` : ''}`;

  const isNotEnoughTimeForService = player.hoursRemaining < cleaningServiceCost;
  const isCannotAffordService = !canAffordCleaning;
  const isServiceDisabled = isMessClean || isCannotAffordService || isNotEnoughTimeForService;
  const serviceSubtext = 'Professional cleaning (-10 🧹)';

  const hasFood = (player.inventory?.freshFoodUnits || 0) > 0 || (player.inventory?.fastFoodItems?.length || 0) > 0;

  const relaxEffects = collectItemEffects(player, campaign, 'on_relax');
  const physBonus = relaxEffects.get('physical') || 0;
  const mentalBonus = relaxEffects.get('mental') || 0;
  const extraMess = relaxEffects.get('mess') || 0;

  let physGain = 0;
  let mentalGain = 0;
  let scaledMess = 0;
  let classicGain = 0;
  let classicFirstBonus = 0;
  const conditionRes = rules?.conditionResolution ?? 0.5;

  if (rules?.usePhysicalMentalConditions) {
    if (hasFood) {
      const mentalStat = player.mentalCondition ?? 50;
      const rawPhysGain = 1 + Math.floor(mentalStat / 25) + physBonus;
      physGain = (isDivisible && hoursToRelax < relaxCost)
        ? Math.max(0.5, roundToResolution(rawPhysGain * relaxRatio, conditionRes))
        : rawPhysGain;

      const firstBonus = player.turnFlags?.relaxedThisTurn ? 0 : 2;
      const messPenalty = Math.floor((player.mess || 0) / 5);
      const socialMentalBonus = Math.floor((player.social || 0) / 15);
      const rawMentalGain = Math.max(0, firstBonus + 3 - messPenalty) + mentalBonus + socialMentalBonus;
      mentalGain = (isDivisible && hoursToRelax < relaxCost)
        ? Math.max(0.5, roundToResolution(rawMentalGain * relaxRatio, conditionRes))
        : rawMentalGain;

      if (rules.trackMess) {
        const baseRelaxMess = campaign?.config.statRules?.relaxMessIncrease ?? 1;
        const relaxMess = baseRelaxMess + extraMess;
        scaledMess = (isDivisible && hoursToRelax < relaxCost)
          ? Math.max(1, Math.round(relaxMess * relaxRatio))
          : relaxMess;
      }
    } else {
      const rawPhysGain = 1;
      const rawMentalGain = 1;
      physGain = (isDivisible && hoursToRelax < relaxCost)
        ? Math.max(0.5, roundToResolution(rawPhysGain * relaxRatio, conditionRes))
        : rawPhysGain;
      mentalGain = (isDivisible && hoursToRelax < relaxCost)
        ? Math.max(0.5, roundToResolution(rawMentalGain * relaxRatio, conditionRes))
        : rawMentalGain;

      if (rules.trackMess) {
        const baseRelaxMess = campaign?.config.statRules?.relaxMessIncrease ?? 1;
        scaledMess = (isDivisible && hoursToRelax < relaxCost)
          ? Math.max(1, Math.round(baseRelaxMess * relaxRatio))
          : baseRelaxMess;
      }
    }
  } else {
    const baseRelaxGain = campaign?.config.timeRules?.relaxGain ?? 3;
    classicGain = (isDivisible && hoursToRelax < relaxCost)
      ? Math.max(1, Math.round(baseRelaxGain * relaxRatio))
      : baseRelaxGain;
    classicFirstBonus = !player.turnFlags?.relaxedThisTurn ? 2 : 0;
  }

  const handleRelaxClick = () => {
    if (rules?.usePhysicalMentalConditions && !hasFood && !warnedThisVisit && player.hoursRemaining > 0) {
      setShowUnfedWarning(true);
    } else {
      handleHomeAction({ type: 'relax' });
    }
  };

  let messIcon = '🗑️';
  let messLabel = 'Spotless';
  let messBarColor = '#2ecc71';

  if (currentMess > 60) {
    messIcon = '🧹🧹🪰🪰🪳🪳 ☣️';
    messLabel = 'Biohazard Emergency!';
    messBarColor = '#e74c3c';
  } else if (currentMess > 50) {
    messIcon = '🧹🧹🪰🪰🪳🪳';
    messLabel = 'Severe Cockroach Infestation!';
    messBarColor = '#e74c3c';
  } else if (currentMess > 40) {
    messIcon = '🧹🧹🪰🪰🪳';
    messLabel = 'Pest & Cockroach Swarm!';
    messBarColor = '#e67e22';
  } else if (currentMess > 30) {
    messIcon = '🧹🧹🪰🪰';
    messLabel = 'Fly Swarm Warning!';
    messBarColor = '#e67e22';
  } else if (currentMess > 20) {
    messIcon = '🧹🧹🪰';
    messLabel = 'Flies Appearing!';
    messBarColor = '#f1c40f';
  } else if (currentMess > 10) {
    messIcon = '🧹🧹';
    messLabel = 'Messy';
    messBarColor = '#f1c40f';
  } else if (currentMess > 3) {
    messIcon = '🧹';
    messLabel = 'Minor Mess';
    messBarColor = '#2ecc71';
  }

  const messPercentage = Math.min(100, Math.round((currentMess / maxMessHousing) * 100));

  const hasFridge = player.inventory?.appliances?.some(a => a.id === 'refrigerator' || campaign?.items?.find(i => i.id === a.id)?.tags?.includes('refrigerator')) ?? false;
  const hasFreezer = player.inventory?.appliances?.some(a => a.id === 'freezer' || campaign?.items?.find(i => i.id === a.id)?.tags?.includes('freezer')) ?? false;

  return (
    <div className="interaction-panel" style={{ width: '100%' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        🏠 {t('homeRelax.title', { defaultValue: 'Home Management' })}
      </h3>

      {actionFeedback && (
        <div style={{
          padding: '10px 14px',
          marginBottom: '12px',
          borderRadius: '6px',
          backgroundColor: actionFeedback.isError ? 'rgba(231, 76, 60, 0.2)' : 'rgba(46, 204, 113, 0.2)',
          border: `1px solid ${actionFeedback.isError ? '#e74c3c' : '#2ecc71'}`,
          color: actionFeedback.isError ? '#ff8585' : '#85ffb5',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{actionFeedback.isError ? '⚠️' : '✓'}</span>
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {rules?.trackMess && (
        <div className="mess-visual-card" style={{ 
          marginBottom: '16px', 
          padding: '12px 14px', 
          background: 'linear-gradient(135deg, rgba(20,20,35,0.85) 0%, rgba(35,35,55,0.85) 100%)', 
          borderRadius: '8px',
          border: `1px solid ${messBarColor}`,
          boxShadow: `0 0 10px ${messBarColor}33`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.95em' }}>
              {messIcon} Apartment Mess: <span style={{ color: messBarColor }}>{messLabel}</span>
            </span>
            <span style={{ fontWeight: 'bold', fontSize: '0.9em', color: messBarColor }}>
              {currentMess} / {maxMessHousing} mess
            </span>
          </div>

          <div style={{ width: '100%', height: '10px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{
              width: `${messPercentage}%`,
              height: '100%',
              backgroundColor: messBarColor,
              transition: 'width 0.5s ease-in-out, background-color 0.5s ease'
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.75em', color: '#aaa' }}>
            <span>0 (Spotless)</span>
            <span>Social limit: 25</span>
            <span>Max: {maxMessHousing}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        {/* Left Side: Rest & Entertaining */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#00e5ff', fontSize: '0.9em' }}>🛋️ Rest & Entertaining</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              data-testid="btn-relax"
              data-action-target="relax" 
              onClick={handleRelaxClick}
              style={{
                backgroundColor: isRelaxDisabled ? '#444' : '#27ae60',
                color: isRelaxDisabled ? '#bbb' : '#fff',
                border: 'none',
                padding: '10px',
                borderRadius: '4px',
                cursor: isRelaxDisabled ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                textAlign: 'left',
                opacity: isRelaxDisabled ? 0.65 : 1
              }}
            >
              <div>🧘 {t('homeRelax.button', { cost: hoursToRelax, defaultValue: `Relax (⏳ ${hoursToRelax}h)` })}</div>
              {rules?.usePhysicalMentalConditions ? (
                <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px', color: '#e8f8f5' }}>
                  {hasFood 
                    ? `+${physGain} 💪, +${mentalGain} 🧠${rules?.trackMess && scaledMess > 0 ? ` (+${scaledMess} 🧹)` : ''}`
                    : `⚠️ No food: +${physGain} 💪, +${mentalGain} 🧠 (-1 Max 💪 & 🧠)${rules?.trackMess && scaledMess > 0 ? ` (+${scaledMess} 🧹)` : ''}`}
                </div>
              ) : (
                <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px', color: '#e8f8f5' }}>
                  +{classicGain} 🧘{classicFirstBonus > 0 ? ` (+${classicFirstBonus} 😊)` : ''}
                </div>
              )}
            </button>

            {showUnfedWarning && typeof document !== 'undefined' && createPortal(
              <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
                padding: '16px', boxSizing: 'border-box'
              }}>
                <div style={{
                  background: '#2c1e1e', padding: '24px', borderRadius: '10px', maxWidth: '450px', width: '100%', maxHeight: '90vh',
                  overflowY: 'auto', boxSizing: 'border-box', border: '1px solid #e74c3c', color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
                }}>
                  <h3 style={{ margin: '0 0 12px 0', color: '#e74c3c' }}>
                    ⚠️ {t('action.unfedRelaxModal.title', { defaultValue: 'Relax Without Food?' })}
                  </h3>
                  <p style={{ fontSize: '0.95em', lineHeight: '1.5', marginBottom: '20px' }}>
                    {t('action.unfedRelaxModal.warning', { defaultValue: 'You have no food in your inventory! Relaxing while starving will permanently reduce your Max Physical and Max Mental capacity by 1.' })}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                      onClick={() => setShowUnfedWarning(false)}
                      style={{ padding: '8px 16px', background: '#555', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      ✕ {t('action.unfedRelaxModal.cancel', { defaultValue: 'Cancel' })}
                    </button>
                    <button
                      data-testid="confirm-unfed-relax"
                      onClick={() => {
                        setWarnedThisVisit(true);
                        setShowUnfedWarning(false);
                        handleHomeAction({ type: 'relax' });
                      }}
                      style={{ padding: '8px 16px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ⚠️ {t('action.unfedRelaxModal.confirm', { defaultValue: 'Relax Anyway' })}
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}

            {rules?.usePhysicalMentalConditions && (
              <button 
                data-action-target="socialize" 
                onClick={() => handleHomeAction({ type: 'socialize_guests' })}
                style={{ 
                  backgroundColor: isSocialDisabled ? '#444' : '#d35400', 
                  color: isSocialDisabled ? '#bbb' : '#fff', 
                  border: 'none', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  textAlign: 'left',
                  opacity: isSocialDisabled ? 0.65 : 1
                }}
              >
                <div>🎉 Socialize / Entertain Guests (⏳ {socializeCost}h)</div>
                <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px', color: isSocialDisabled ? '#ffb3b3' : 'inherit' }}>
                  {socialSubtext}
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Cleaning & Maintenance */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#3498db', fontSize: '0.9em' }}>🧹 Cleaning & Maintenance</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rules?.trackMess ? (
              <>
                <button 
                  data-action-target="clean" 
                  onClick={() => handleHomeAction({ type: 'clean' })}
                  style={{ 
                    backgroundColor: isCleanDisabled ? '#444' : '#2980b9', 
                    color: isCleanDisabled ? '#bbb' : '#fff', 
                    border: 'none', 
                    padding: '10px', 
                    borderRadius: '4px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    textAlign: 'left',
                    opacity: isCleanDisabled ? 0.65 : 1
                  }}
                >
                  <div>🧹 Clean Apartment (⏳ {hoursToClean}h)</div>
                  <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px', color: isCleanDisabled ? '#ffb3b3' : 'inherit' }}>
                    {cleanSubtext}
                  </div>
                </button>

                <button 
                  data-action-target="call-cleaning-service" 
                  onClick={() => handleHomeAction({ type: 'call_cleaning_service' })}
                  style={{ 
                    backgroundColor: isServiceDisabled ? '#444' : '#8e44ad', 
                    color: isServiceDisabled ? '#bbb' : '#fff', 
                    border: 'none', 
                    padding: '10px', 
                    borderRadius: '4px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold', 
                    textAlign: 'left', 
                    opacity: isServiceDisabled ? 0.65 : 1 
                  }}
                >
                  <div>🧼 Call Cleaning Service (⏳ {cleaningServiceCost}h, ${cleaningServicePrice})</div>
                  <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px', color: isServiceDisabled ? '#ffb3b3' : 'inherit' }}>
                    {serviceSubtext}
                  </div>
                </button>
              </>
            ) : (
              <div style={{ fontSize: '0.85em', color: '#aaa', fontStyle: 'italic' }}>
                Mess tracking disabled in this campaign.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Home Amenities & Storage Section (Durables & Food) */}
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h4 style={{ margin: 0, color: 'var(--accent-cyan)', fontSize: '0.95em', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🛋️ {t('homeRelax.amenitiesTitle', { defaultValue: 'Home Amenities & Storage' })}
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {/* Food & Pantry Card */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
              <strong style={{ color: '#2ecc71', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🥫 {t('homeRelax.pantryTitle', { defaultValue: 'Pantry & Food Supplies' })}
              </strong>
              <span style={{ fontSize: '0.8em', color: hasFridge ? '#2ecc71' : '#e67e22', fontWeight: 'bold' }}>
                {hasFridge ? (hasFreezer ? '🧊 Refrigerator + Freezer' : '🧊 Refrigerator Active') : '⚠️ No Fridge (Spoilage Risk)'}
              </span>
            </div>

            {/* Fresh Food Units */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img 
                  src="/assets/raw_images/food_1week.png" 
                  alt="Fresh Food" 
                  style={{ width: '28px', height: '28px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '4px' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div>
                  <div style={{ fontSize: '0.85em', fontWeight: 'bold', color: '#fff' }}>
                    🥗 {t('inventoryModal.freshFood', { defaultValue: 'Fresh Food' })}
                  </div>
                  <div style={{ fontSize: '0.75em', color: '#aaa' }}>
                    {hasFridge ? 'Protected from spoilage' : 'Will spoil without a refrigerator'}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '0.95em', fontWeight: 'bold', color: (player.inventory?.freshFoodUnits || 0) > 0 ? '#2ecc71' : '#e74c3c' }}>
                {player.inventory?.freshFoodUnits || 0} {t('inventoryModal.units', { defaultValue: 'units' })}
              </span>
            </div>

            {/* Fast Food Items */}
            {player.inventory?.fastFoodItems && player.inventory.fastFoodItems.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.8em', color: '#bbb', fontWeight: 'bold' }}>
                  🍔 {t('inventoryModal.fastFood', { defaultValue: 'Fast Food Meals' })} ({player.inventory.fastFoodItems.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {player.inventory.fastFoodItems.map((ff, idx) => {
                    const itemDef = campaign?.items?.find(i => i.id === ff.itemId);
                    const itemName = itemDef ? t(`item.${itemDef.id}`, { defaultValue: itemDef.name }) : ff.itemId;
                    return (
                      <div 
                        key={idx} 
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78em' }}
                      >
                        <img 
                          src={`/assets/raw_images/${ff.itemId}.png`} 
                          alt={ff.itemId} 
                          style={{ width: '20px', height: '20px', objectFit: 'contain', borderRadius: '3px', backgroundColor: '#000' }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <span>{itemName}</span>
                        {ff.happinessBonus > 0 && (
                          <span style={{ color: '#f1c40f', fontWeight: 'bold' }}>+{ff.happinessBonus} 😊</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty Food Alert if 0 food */}
            {(player.inventory?.freshFoodUnits || 0) === 0 && (!player.inventory?.fastFoodItems || player.inventory.fastFoodItems.length === 0) && (
              <div style={{ padding: '8px 10px', background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: '6px', fontSize: '0.78em', color: '#ff9999', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚠️</span>
                <span>Pantry is empty! Relaxing or ending turn without food causes hunger penalties.</span>
              </div>
            )}
          </div>

          {/* Durables & Appliances Card */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
              <strong style={{ color: '#3498db', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🛋️ {t('inventoryModal.appliances', { defaultValue: 'Appliances & Durables' })}
              </strong>
              <span style={{ fontSize: '0.8em', color: '#aaa' }}>
                {(player.inventory?.appliances?.length || 0) + (player.inventory?.books?.length || 0)} items
              </span>
            </div>

            {/* Appliances Grid */}
            {player.inventory?.appliances && player.inventory.appliances.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                {player.inventory.appliances.map((app, idx) => {
                  const itemDef = campaign?.items?.find(i => i.id === app.id);
                  const itemName = itemDef ? t(`item.${itemDef.id}`, { defaultValue: itemDef.name }) : app.id;
                  
                  const effectBadges: string[] = [];
                  if (itemDef?.effects) {
                    for (const eff of itemDef.effects) {
                      if (eff.trigger === 'on_relax') {
                        if (eff.stat === 'physical') effectBadges.push(`+${eff.value} 💪`);
                        else if (eff.stat === 'mental') effectBadges.push(`+${eff.value} 🧠`);
                        else if (eff.stat === 'mess') effectBadges.push(`+${eff.value} 🧹`);
                      } else if (eff.trigger === 'on_socialize') {
                        if (eff.stat === 'social') effectBadges.push(`+${eff.value} 👥`);
                      } else if (eff.trigger === 'continuous' && eff.stat === 'mental_max') {
                        effectBadges.push(`+${eff.value} Max 🧠`);
                      }
                    }
                  }
                  if (itemDef?.tags?.includes('refrigerator')) effectBadges.push('Preserves Food');
                  if (itemDef?.tags?.includes('computer')) effectBadges.push('R&D & Income');
                  if (itemDef?.happinessBonus && effectBadges.length === 0) effectBadges.push(`+${itemDef.happinessBonus} 😊`);

                  return (
                    <div 
                      key={`${app.id}-${idx}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '6px',
                        padding: '6px 4px',
                        gap: '4px'
                      }}
                    >
                      <img 
                        src={`/assets/raw_images/${app.id}.png`} 
                        alt={app.id} 
                        style={{ width: '28px', height: '28px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '4px' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span style={{ fontSize: '0.78em', fontWeight: 'bold', color: '#e0e0ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                        {itemName}
                      </span>
                      {effectBadges.length > 0 && (
                        <span style={{ fontSize: '0.68em', color: '#00e5ff', background: 'rgba(0,229,255,0.1)', padding: '1px 4px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
                          {effectBadges.join(', ')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Bookshelf Grid */}
            {player.inventory?.books && player.inventory.books.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: player.inventory?.appliances?.length ? '4px' : '0' }}>
                <div style={{ fontSize: '0.8em', color: '#bbb', fontWeight: 'bold' }}>
                  📚 {t('inventoryModal.books', { defaultValue: 'Bookshelf' })} ({player.inventory.books.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'gap', gap: '6px' }}>
                  {player.inventory.books.map((bId, idx) => {
                    const itemDef = campaign?.items?.find(i => i.id === bId);
                    const bookName = itemDef ? t(`item.${itemDef.id}`, { defaultValue: itemDef.name }) : bId;
                    return (
                      <div 
                        key={idx} 
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78em' }}
                      >
                        <img 
                          src={`/assets/raw_images/${bId}.png`} 
                          alt={bId} 
                          style={{ width: '20px', height: '20px', objectFit: 'contain', borderRadius: '3px', backgroundColor: '#000' }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <span>{bookName}</span>
                        <span style={{ color: '#00e5ff', fontSize: '0.85em', fontWeight: 'bold' }}>+1 Max 🧠</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty Durables State */}
            {(!player.inventory?.appliances || player.inventory.appliances.length === 0) && (!player.inventory?.books || player.inventory.books.length === 0) && (
              <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: '1px dashed #555', borderRadius: '6px', fontSize: '0.78em', color: '#888', textAlign: 'center' }}>
                📦 No appliances or books owned yet.<br />Visit Socket City or Z-Mart to furnish your apartment!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RentOffice({ player, onAction, campaign, turn = 1, economicIndex = 0, rules }: InteractionProps & { campaign?: CampaignBundle, turn?: number, economicIndex?: number, rules?: GameRules }) {
  const { t } = useTranslation();
  const [confirmMove, setConfirmMove] = useState<{housingId: string, baseCost: number, movingFee: number, totalCost: number, newAptName: string} | null>(null);
  const currentHousing = campaign?.housing.find(h => h.id === player.currentHousingId);
  const lowCostHousing = campaign?.housing.find(h => h.id === 'low_cost');
  const securityHousing = campaign?.housing.find(h => h.id === 'security');

  const rentOwed = player.rentDebt;
  const isWeek4 = turn % 4 === 0;
  const rentDue = player.rentPaidUntilWeek <= turn;
  const isJobHere = !!(player.currentJobId && campaign?.jobs.some(j => j.id === player.currentJobId && j.locationId === 'apartment_complex'));
  const isOpen = isWeek4 || rentDue || player.turnFlags.rentPaidThisTurn || (isJobHere && !!rules?.allowEmployedRentPayment);

  const lowCostMovePrice = lowCostHousing ? calcEconomyPrice(lowCostHousing.baseRent, economicIndex) : 0;
  const securityMovePrice = securityHousing ? calcEconomyPrice(securityHousing.baseRent, economicIndex) : 0;

  const rentAdvanceCost = rules?.fluctuatingRent && currentHousing
    ? calcEconomyPrice(currentHousing.baseRent, economicIndex)
    : player.currentRentPrice;

  const handleInitiateMove = (housingId: string, baseCost: number, newAptName: string) => {
    const movingFee = rules?.trackMess ? calcMovingFee(player.mess || 0, player.inventory.appliances.length, campaign?.config.economyRules) : 0;
    const totalCost = baseCost + movingFee;
    setConfirmMove({ housingId, baseCost, movingFee, totalCost, newAptName });
  };

  return (
    <div className="interaction-panel">
      <h3>{t('rentOffice.title')}</h3>
      <p style={{ fontSize: '12px', marginBottom: '12px' }}>🏠 {t('rentOffice.current')}: {currentHousing ? t(`housing.${currentHousing.id}`, { defaultValue: currentHousing.name }) : t('rentOffice.homeless')}</p>
      
      {!isOpen ? (
        <div style={{ padding: '10px', backgroundColor: '#555', borderRadius: '4px', fontStyle: 'italic' }}>
          {t('rentOffice.closed')}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Left Column: Current Lease, Debt, Advance, Extension */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ margin: 0, color: 'var(--accent-cyan)', fontSize: '0.95em' }}>Lease & Payments</h4>
            
            {rentOwed > 0 && (
              <div style={{ padding: '10px', backgroundColor: '#e74c3c', borderRadius: '6px' }}>
                <strong>{t('rentOffice.rentDue', { amount: rentOwed })}</strong>
                <br/>
                <button 
                  onClick={() => onAction({ type: 'rent_transaction', amount: rentOwed })}
                  style={{ marginTop: '10px', backgroundColor: '#c0392b' }}
                >
                  {t('rentOffice.payRentDebt')}
                </button>
              </div>
            )}

            {currentHousing && (
              <div style={{ padding: '10px', border: '1px solid #4aa', borderRadius: '6px', background: 'rgba(0,0,0,0.2)' }}>
                <strong>{t('rentOffice.paidUntil', { week: player.rentPaidUntilWeek })}</strong>
                <p style={{ fontSize: '12px', margin: '4px 0 8px 0', color: '#ccc' }}>{t('rentOffice.weeksPaid', { count: player.rentPaidUntilWeek - turn })}</p>
                
                <button 
                  onClick={() => onAction({ type: 'pay_rent_advance', amount: rentAdvanceCost })}
                  style={{ width: '100%' }}
                >
                  {t('rentOffice.payAdvance', { cost: rentAdvanceCost })}
                </button>
              </div>
            )}

            {(!rules?.helpfulUI || (rentDue && !player.rentExtensionActive && !player.turnFlags.askedForExtension)) && !player.rentExtensionsDeniedPermanently && (
              <div style={{ padding: '10px', border: '1px solid #c93', borderRadius: '6px', background: 'rgba(0,0,0,0.2)' }}>
                {rules?.helpfulUI && <strong>{t('rentOffice.rentIsDue')}</strong>}
                {rules?.helpfulUI && <p style={{ fontSize: '12px', margin: '4px 0 8px 0', color: '#ccc' }}>{t('rentOffice.canAskExtension')}</p>}
                <button 
                  onClick={() => onAction({ type: 'ask_rent_extension' })}
                  style={{ backgroundColor: '#e67e22', width: '100%' }}
                >
                  ⏳ {t('rentOffice.askExtension')}
                </button>
              </div>
            )}
            {player.rentExtensionActive && (
              <div style={{ padding: '10px', border: '1px solid #27ae60', borderRadius: '6px', color: '#2ecc71', background: 'rgba(0,0,0,0.2)' }}>
                <strong>{t('rentOffice.extensionGranted')}</strong>
                <p style={{ fontSize: '12px', margin: 0 }}>{t('rentOffice.dueByEnd')}</p>
              </div>
            )}
            {player.turnFlags.askedForExtension && !player.rentExtensionActive && (
              <div style={{ padding: '10px', border: '1px solid #e74c3c', borderRadius: '6px', color: '#e74c3c', background: 'rgba(0,0,0,0.2)' }}>
                <strong>{t('rentOffice.extensionDenied')}</strong>
                <p style={{ fontSize: '12px', margin: 0 }}>{t('rentOffice.mustPay')}</p>
              </div>
            )}
            {player.rentExtensionsDeniedPermanently && (
              <div style={{ padding: '10px', border: '1px solid #e74c3c', borderRadius: '6px', color: '#e74c3c', background: 'rgba(0,0,0,0.2)' }}>
                <strong>{t('rentOffice.permanentlyDenied')}</strong>
                <p style={{ fontSize: '12px', margin: 0 }}>{t('rentOffice.neverAnother')}</p>
              </div>
            )}
          </div>

          {/* Right Column: Available Apartments / Moving */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ margin: 0, color: 'var(--accent-cyan)', fontSize: '0.95em' }}>{t('rentOffice.availableApts')}:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {lowCostHousing && (!rules?.helpfulUI || player.currentHousingId !== lowCostHousing.id) && (
                <div className="store-item" style={{ padding: '12px', borderRadius: '6px', border: '1px solid #444', background: 'rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong>{t(`housing.${lowCostHousing.id}`, { defaultValue: lowCostHousing.name })}</strong>
                    <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>${lowCostMovePrice}/mo</span>
                  </div>
                  <button 
                    onClick={() => handleInitiateMove(lowCostHousing.id, lowCostMovePrice, t(`housing.${lowCostHousing.id}`, { defaultValue: lowCostHousing.name }))}
                    disabled={rules?.helpfulUI && player.currentHousingId === lowCostHousing.id}
                    style={{ width: '100%' }}
                  >
                    🏠 {player.currentHousingId === lowCostHousing.id ? t('rentOffice.currentApt', { defaultValue: 'Current' }) : t('rentOffice.moveIn')}
                  </button>
                </div>
              )}
              
              {securityHousing && (!rules?.helpfulUI || player.currentHousingId !== securityHousing.id) && (
                <div className="store-item" style={{ padding: '12px', borderRadius: '6px', border: '1px solid #444', background: 'rgba(0,0,0,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong>{t(`housing.${securityHousing.id}`, { defaultValue: securityHousing.name })}</strong>
                    <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>${securityMovePrice}/mo</span>
                  </div>
                  <button 
                    onClick={() => handleInitiateMove(securityHousing.id, securityMovePrice, t(`housing.${securityHousing.id}`, { defaultValue: securityHousing.name }))}
                    disabled={rules?.helpfulUI && player.currentHousingId === securityHousing.id}
                    style={{ width: '100%' }}
                  >
                    🏠 {player.currentHousingId === securityHousing.id ? t('rentOffice.currentApt', { defaultValue: 'Current' }) : t('rentOffice.moveIn')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {confirmMove && typeof document !== 'undefined' && createPortal(
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--panel-bg, #13132c)', backdropFilter: 'blur(15px)', color: '#fff', padding: '24px', border: '1px solid var(--accent-cyan, #00e5ff)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.8), var(--glow-cyan, 0 0 10px rgba(0,229,255,0.5))', zIndex: 10000, maxWidth: '440px', width: '90%', textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#00e5ff' }}>Confirm Apartment Move</h4>
              <p style={{ whiteSpace: 'pre-wrap', marginBottom: '15px', fontSize: '13px', lineHeight: '1.5', color: '#e0e0ff' }}>
                Are you sure you want to move to <strong>{confirmMove.newAptName}</strong>?
              </p>
              <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.4)', padding: '10px 15px', borderRadius: '6px', marginBottom: '20px', fontSize: '12px', lineHeight: '1.6' }}>
                <div>💵 <strong>First Month Rent:</strong> ${confirmMove.baseCost}</div>
                {confirmMove.movingFee > 0 && (
                  <div>📦 <strong>Moving Fee (Mess & Durables):</strong> ${confirmMove.movingFee}</div>
                )}
                <hr style={{ borderColor: '#444', margin: '6px 0' }} />
                <div style={{ color: '#00e5ff', fontWeight: 'bold' }}><strong>Total Cost:</strong> ${confirmMove.totalCost}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                <button 
                  onClick={() => {
                    onAction({ type: 'move_apartment', housingId: confirmMove.housingId, cost: confirmMove.baseCost });
                    setConfirmMove(null);
                  }}
                  disabled={player.money < confirmMove.totalCost}
                  style={{ flex: 1, padding: '8px 16px', background: player.money >= confirmMove.totalCost ? 'var(--accent-cyan, #00e5ff)' : '#555', color: player.money >= confirmMove.totalCost ? '#000' : '#888', border: 'none', fontWeight: 'bold', cursor: player.money >= confirmMove.totalCost ? 'pointer' : 'not-allowed' }}
                >
                  {player.money >= confirmMove.totalCost ? `✓ ${t('common.yes', { defaultValue: 'CONFIRM MOVE' })}` : 'NOT ENOUGH MONEY'}
                </button>
                <button 
                  onClick={() => setConfirmMove(null)}
                  style={{ flex: 1, padding: '8px 16px', background: 'transparent', color: '#fff', border: '1px solid #666', fontWeight: 'bold' }}
                >
                  ✕ {t('common.no', { defaultValue: 'CANCEL' })}
                </button>
              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}
export function ActionReasonModal({ title = "Action Unavailable", reason, onClose }: { title?: string, reason: string, onClose: () => void }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--panel-bg, #13132c)', backdropFilter: 'blur(15px)', color: '#fff', padding: '24px', border: '1px solid #e74c3c', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.8), 0 0 10px rgba(231,76,60,0.5)', zIndex: 10000, maxWidth: '400px', width: '90%', textAlign: 'center' }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#e74c3c' }}>⚠️ {title}</h4>
      <p style={{ whiteSpace: 'pre-wrap', marginBottom: '20px', fontSize: '13px', lineHeight: '1.5', color: '#e0e0ff' }}>
        {reason}
      </p>
      <button 
        onClick={onClose}
        style={{ padding: '8px 24px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        OK
      </button>
    </div>,
    document.body
  );
}

export function StockTradeDialog({ 
  stock, 
  price, 
  owned, 
  playerMoney, 
  mode, 
  onConfirm, 
  onClose 
}: { 
  stock: import('../engine/dataLoader').StockDef;
  price: number;
  owned: number;
  playerMoney: number;
  mode: 'buy' | 'sell';
  onConfirm: (quantity: number, amount: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [sharesInput, setSharesInput] = useState<string>('1');
  const [cashInput, setCashInput] = useState<string>(String(price));

  const sellFeePercent = stock.sellFeePercent || 0;
  const sellFeePerShare = Math.floor(price * (sellFeePercent / 100));
  const netSellPricePerShare = Math.max(0, price - sellFeePerShare);

  const numShares = Math.max(0, parseInt(sharesInput, 10) || 0);

  const handleSharesChange = (valStr: string) => {
    setSharesInput(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      const calculatedCash = mode === 'buy' ? parsed * price : parsed * netSellPricePerShare;
      setCashInput(String(calculatedCash));
    } else {
      setCashInput('');
    }
  };

  const handleCashChange = (valStr: string) => {
    setCashInput(valStr);
    const parsedCash = parseFloat(valStr);
    if (!isNaN(parsedCash) && parsedCash >= 0) {
      const targetPrice = mode === 'buy' ? price : netSellPricePerShare;
      const calculatedShares = targetPrice > 0 ? Math.floor(parsedCash / targetPrice) : 0;
      setSharesInput(String(calculatedShares));
    } else {
      setSharesInput('');
    }
  };

  const totalCost = numShares * price;
  const grossRevenue = numShares * price;
  const totalSellFee = numShares * sellFeePerShare;
  const netRevenue = numShares * netSellPricePerShare;

  const isBuy = mode === 'buy';
  const canConfirm = isBuy 
    ? (numShares > 0 && playerMoney >= totalCost)
    : (numShares > 0 && owned >= numShares);

  let validationError = '';
  if (numShares <= 0) {
    validationError = isBuy ? 'Enter a valid share or cash amount to buy.' : 'Enter a valid share or cash amount to sell.';
  } else if (isBuy && totalCost > playerMoney) {
    validationError = `Not enough cash (Costs $${totalCost}, you have $${playerMoney}).`;
  } else if (!isBuy && numShares > owned) {
    validationError = `You cannot sell more shares than you own (You have ${owned} shares).`;
  }

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--panel-bg, #13132c)', backdropFilter: 'blur(15px)', color: '#fff', padding: '24px', border: `1px solid ${isBuy ? '#2ecc71' : '#e74c3c'}`, borderRadius: '12px', boxShadow: `0 10px 30px rgba(0,0,0,0.8), 0 0 10px ${isBuy ? 'rgba(46,204,113,0.5)' : 'rgba(231,76,60,0.5)'}`, zIndex: 10000, maxWidth: '440px', width: '90%', textAlign: 'center' }}>
      <h3 style={{ margin: '0 0 10px 0', color: isBuy ? '#2ecc71' : '#e74c3c' }}>
        {isBuy ? `📈 Buy ${t(`stock.${stock.id}`, { defaultValue: stock.name })}` : `📉 Sell ${t(`stock.${stock.id}`, { defaultValue: stock.name })}`}
      </h3>

      <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '15px' }}>
        Price: <strong>${price}</strong> / share | {isBuy ? `Available Cash: $${playerMoney}` : `Owned Shares: ${owned}`}
      </div>

      <div style={{ background: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '8px', marginBottom: '15px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>
            Quantity of Shares:
          </label>
          <input 
            type="number"
            min="1"
            max={!isBuy ? owned : undefined}
            value={sharesInput}
            onChange={(e) => handleSharesChange(e.target.value)}
            style={{ width: '100%', padding: '8px', background: '#222', color: '#fff', border: '1px solid #555', borderRadius: '4px', boxSizing: 'border-box' }}
            placeholder="Shares count..."
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>
            {isBuy ? 'Total Cash Amount ($):' : 'Estimated Net Cash ($):'}
          </label>
          <input 
            type="number"
            min="0"
            value={cashInput}
            onChange={(e) => handleCashChange(e.target.value)}
            style={{ width: '100%', padding: '8px', background: '#222', color: '#fff', border: '1px solid #555', borderRadius: '4px', boxSizing: 'border-box' }}
            placeholder="$ Amount..."
          />
        </div>
      </div>

      <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '6px', marginBottom: '15px', fontSize: '12px', lineHeight: '1.6' }}>
        {isBuy ? (
          <>
            <div><strong>Total Cost:</strong> ${totalCost}</div>
            <div><strong>Cash Remaining:</strong> ${Math.max(0, playerMoney - totalCost)}</div>
          </>
        ) : (
          <>
            <div><strong>Gross Revenue:</strong> ${grossRevenue}</div>
            {sellFeePercent > 0 && (
              <div style={{ color: '#e74c3c' }}>✂️ <strong>Fee ({sellFeePercent}%):</strong> -${totalSellFee}</div>
            )}
            <div><strong>Net Revenue:</strong> ${netRevenue}</div>
            <div>📈 <strong>Shares Remaining:</strong> {Math.max(0, owned - numShares)}</div>
          </>
        )}
      </div>

      {validationError && (
        <div style={{ fontSize: '12px', color: '#e74c3c', marginBottom: '15px', fontWeight: 'bold' }}>
          ⚠️ {validationError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => onConfirm(numShares, isBuy ? totalCost : netRevenue)}
          disabled={!canConfirm}
          style={{ flex: 1, padding: '10px', background: canConfirm ? (isBuy ? '#2ecc71' : '#e74c3c') : '#555', color: canConfirm ? (isBuy ? '#000' : '#fff') : '#888', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: canConfirm ? 'pointer' : 'not-allowed' }}
        >
          {isBuy ? `Confirm Buy ($${totalCost})` : `Confirm Sell (+$${netRevenue})`}
        </button>
        <button 
          onClick={onClose}
          style={{ flex: 1, padding: '10px', background: 'transparent', color: '#fff', border: '1px solid #666', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
}

export function BankTransactionDialog({
  mode,
  playerCash,
  playerSavings,
  onConfirm,
  onClose
}: {
  mode: 'deposit' | 'withdraw';
  playerCash: number;
  playerSavings: number;
  onConfirm: (amount: number) => void;
  onClose: () => void;
}) {
  const [amountInput, setAmountInput] = useState<string>('50');

  const isDeposit = mode === 'deposit';
  const maxAvailable = isDeposit ? playerCash : playerSavings;
  const amount = Math.max(0, parseInt(amountInput, 10) || 0);

  const canConfirm = amount > 0 && amount <= maxAvailable;

  let validationError = '';
  if (amount <= 0) {
    validationError = 'Please enter an amount greater than zero.';
  } else if (amount > maxAvailable) {
    validationError = isDeposit 
      ? `Amount exceeds available cash ($${playerCash}).` 
      : `Amount exceeds bank savings ($${playerSavings}).`;
  }

  const updatedCash = isDeposit ? playerCash - amount : playerCash + amount;
  const updatedSavings = isDeposit ? playerSavings + amount : playerSavings - amount;

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--panel-bg, #13132c)', backdropFilter: 'blur(15px)', color: '#fff', padding: '24px', border: `1px solid ${isDeposit ? '#2ecc71' : '#3498db'}`, borderRadius: '12px', boxShadow: `0 10px 30px rgba(0,0,0,0.8), 0 0 10px ${isDeposit ? 'rgba(46,204,113,0.5)' : 'rgba(52,152,219,0.5)'}`, zIndex: 10000, maxWidth: '420px', width: '90%', textAlign: 'center' }}>
      <h3 style={{ margin: '0 0 10px 0', color: isDeposit ? '#2ecc71' : '#3498db' }}>
        {isDeposit ? '🏦 Deposit Money into Savings' : '🏧 Withdraw Savings to Cash'}
      </h3>

      <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '15px' }}>
        Current Cash: <strong>${playerCash}</strong> | Savings: <strong>${playerSavings}</strong>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '8px', marginBottom: '15px', textAlign: 'left' }}>
        <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>
          Exact Amount ($):
        </label>
        <input 
          type="number"
          min="1"
          max={maxAvailable}
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          style={{ width: '100%', padding: '8px', background: '#222', color: '#fff', border: '1px solid #555', borderRadius: '4px', boxSizing: 'border-box', marginBottom: '10px' }}
          placeholder="Enter amount..."
        />

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button"
            onClick={() => setAmountInput('50')}
            style={{ flex: 1, padding: '4px 8px', fontSize: '11px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer' }}
          >
            $50
          </button>
          <button 
            type="button"
            onClick={() => setAmountInput('100')}
            style={{ flex: 1, padding: '4px 8px', fontSize: '11px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer' }}
          >
            $100
          </button>
          <button 
            type="button"
            onClick={() => setAmountInput(String(maxAvailable))}
            style={{ flex: 1, padding: '4px 8px', fontSize: '11px', background: '#4aa', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Max (${maxAvailable})
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '6px', marginBottom: '15px', fontSize: '12px', lineHeight: '1.6' }}>
        <div><strong>Cash After Transaction:</strong> ${Math.max(0, updatedCash)}</div>
        <div>🏦 <strong>Savings After Transaction:</strong> ${Math.max(0, updatedSavings)}</div>
        {!isDeposit && (
          <div style={{ fontSize: '11px', color: '#e67e22', marginTop: '4px' }}>
            ℹ️ Early withdrawal fees apply if specified by rules.
          </div>
        )}
      </div>

      {validationError && (
        <div style={{ fontSize: '12px', color: '#e74c3c', marginBottom: '15px', fontWeight: 'bold' }}>
          ⚠️ {validationError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => onConfirm(amount)}
          disabled={!canConfirm}
          style={{ flex: 1, padding: '10px', background: canConfirm ? (isDeposit ? '#2ecc71' : '#3498db') : '#555', color: canConfirm ? (isDeposit ? '#000' : '#fff') : '#888', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: canConfirm ? 'pointer' : 'not-allowed' }}
        >
          {isDeposit ? `Confirm Deposit ($${amount})` : `Confirm Withdraw ($${amount})`}
        </button>
        <button 
          onClick={onClose}
          style={{ flex: 1, padding: '10px', background: 'transparent', color: '#fff', border: '1px solid #666', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
}

export function StockTradeRow({ stock, price, owned, playerMoney, onAction }: { stock: import('../engine/dataLoader').StockDef, price: number, owned: number, playerMoney: number, onAction: (payload: any) => void }) {
  const { t } = useTranslation();
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell' | null>(null);
  const [reasonMsg, setReasonMsg] = useState<string | null>(null);

  const canBuy = price > 0 && playerMoney >= price;
  const canSell = owned > 0;

  const handleBuyClick = () => {
    if (!canBuy) {
      setReasonMsg(`You need at least $${price} in cash to buy 1 share of ${stock.name}. You currently have $${playerMoney}.`);
    } else {
      setTradeMode('buy');
    }
  };

  const handleSellClick = () => {
    if (!canSell) {
      setReasonMsg(`You do not own any shares of ${stock.name} to sell.`);
    } else {
      setTradeMode('sell');
    }
  };

  return (
    <div style={{ padding: '12px', border: '1px solid #4aa', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <strong>{t(`stock.${stock.id}`, { defaultValue: stock.name })}</strong>
        <span style={{ color: '#00e5ff', fontWeight: 'bold' }}>
          {t('stocks.price', { price, defaultValue: `$${price}/share` })}
        </span>
      </div>
      <div style={{ fontSize: '12px', marginBottom: '12px', color: '#ccc' }}>
        {t('stocks.owned', { count: owned, defaultValue: `Owned: ${owned} shares` })}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={handleBuyClick}
          style={{ 
            flex: 1, 
            padding: '8px',
            background: canBuy ? '#2ecc71' : '#555', 
            color: canBuy ? '#000' : '#aaa', 
            border: 'none', 
            borderRadius: '4px', 
            fontWeight: 'bold', 
            cursor: 'pointer',
            opacity: canBuy ? 1 : 0.6
          }}
        >
          {t('stocks.buyBtn', { defaultValue: 'Buy' })}
        </button>
        <button 
          onClick={handleSellClick}
          style={{ 
            flex: 1, 
            padding: '8px',
            background: canSell ? '#e74c3c' : '#555', 
            color: canSell ? '#fff' : '#aaa', 
            border: 'none', 
            borderRadius: '4px', 
            fontWeight: 'bold', 
            cursor: 'pointer',
            opacity: canSell ? 1 : 0.6
          }}
        >
          {t('stocks.sellBtn', { defaultValue: 'Sell' })}
        </button>
      </div>

      {reasonMsg && (
        <ActionReasonModal 
          title="Stock Trade Unavailable" 
          reason={reasonMsg} 
          onClose={() => setReasonMsg(null)} 
        />
      )}

      {tradeMode && (
        <StockTradeDialog
          stock={stock}
          price={price}
          owned={owned}
          playerMoney={playerMoney}
          mode={tradeMode}
          onConfirm={(quantity, amount) => {
            if (tradeMode === 'buy') {
              onAction({ type: 'buy_stock', stockId: stock.id, quantity, cost: amount });
            } else {
              onAction({ type: 'sell_stock', stockId: stock.id, quantity, revenue: amount });
            }
            setTradeMode(null);
          }}
          onClose={() => setTradeMode(null)}
        />
      )}
    </div>
  );
}

export function BankInterface({ player, onAction, campaign, turn = 1, economicIndex = 0, rules: _rules }: InteractionProps & { campaign?: CampaignBundle, turn?: number, economicIndex?: number, rules?: GameRules }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'banking'|'stocks'|'loans'>('banking');
  const [bankDialogMode, setBankDialogMode] = useState<'deposit' | 'withdraw' | null>(null);
  const [reasonMsg, setReasonMsg] = useState<string | null>(null);

  const loanPaymentAmount = campaign?.config?.economyRules?.loanPaymentAmount ?? 50;

  const canDeposit = player.money > 0;
  const canWithdraw = player.bankSavings > 0;

  const handleDepositClick = () => {
    if (!canDeposit) {
      setReasonMsg("You don't have any cash to deposit.");
    } else {
      setBankDialogMode('deposit');
    }
  };

  const handleWithdrawClick = () => {
    if (!canWithdraw) {
      setReasonMsg("You don't have any bank savings to withdraw.");
    } else {
      setBankDialogMode('withdraw');
    }
  };
  
  return (
    <div className="interaction-panel">
      <h3>{t('bank.title', { defaultValue: 'Bank of Jones' })}</h3>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button onClick={() => setTab('banking')} style={{ fontWeight: tab === 'banking' ? 'bold' : 'normal' }}>{t('bank.tabBanking', { defaultValue: 'Bank' })}</button>
        {(!campaign || !campaign.stocks || campaign.stocks.length > 0) && (
          <button 
            data-testid="tab-stocks"
            onClick={() => {
              if (tab !== 'stocks') {
                onAction({ type: 'open_broker' });
              }
              setTab('stocks');
            }} 
            style={{ fontWeight: tab === 'stocks' ? 'bold' : 'normal' }}
          >
            {t('bank.tabStocks', { defaultValue: 'Stocks' })}
          </button>
        )}
        <button onClick={() => setTab('loans')} style={{ fontWeight: tab === 'loans' ? 'bold' : 'normal' }}>{t('bank.tabLoans', { defaultValue: 'Loans' })}</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <strong>{t('bank.cash', { defaultValue: 'Cash:' })}</strong> ${player.money}
        </div>
        {tab === 'banking' && (
          <div>
            <strong>{t('bank.savings', { defaultValue: 'Savings:' })}</strong> 🏦${player.bankSavings}
          </div>
        )}
        {tab === 'loans' && (
          <div>
            <strong>{t('bank.debt', { defaultValue: 'Debt:' })}</strong> ${player.loanDebt || 0}
          </div>
        )}
      </div>
      
      {tab === 'banking' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '10px' }}>
          <button 
            onClick={handleDepositClick}
            style={{
              padding: '16px',
              background: canDeposit ? '#2ecc71' : '#555',
              color: canDeposit ? '#000' : '#aaa',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '15px',
              cursor: canDeposit ? 'pointer' : 'not-allowed',
              opacity: canDeposit ? 1 : 0.6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span style={{ fontSize: '1.8rem' }}>📥</span>
            <span>{t('bank.depositBtn', { defaultValue: 'Deposit Money' })}</span>
          </button>
          <button 
            onClick={handleWithdrawClick}
            style={{
              padding: '16px',
              background: canWithdraw ? '#3498db' : '#555',
              color: canWithdraw ? '#fff' : '#aaa',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '15px',
              cursor: canWithdraw ? 'pointer' : 'not-allowed',
              opacity: canWithdraw ? 1 : 0.6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span style={{ fontSize: '1.8rem' }}>📤</span>
            <span>{t('bank.withdrawBtn', { defaultValue: 'Withdraw Money' })}</span>
          </button>
        </div>
      )}

      {reasonMsg && (
        <ActionReasonModal 
          title="Bank Action Unavailable" 
          reason={reasonMsg} 
          onClose={() => setReasonMsg(null)} 
        />
      )}

      {bankDialogMode && (
        <BankTransactionDialog
          mode={bankDialogMode}
          playerCash={player.money}
          playerSavings={player.bankSavings}
          onConfirm={(amount) => {
            const finalAmount = bankDialogMode === 'deposit' ? amount : -amount;
            onAction({ type: 'bank_transaction', amount: finalAmount });
            setBankDialogMode(null);
          }}
          onClose={() => setBankDialogMode(null)}
        />
      )}

      {tab === 'stocks' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          {(campaign?.stocks || [
            { id: 'tbills', name: 'Treasury Bills', type: 'fixed', basePrice: 100 },
            { id: 'blue_chip', name: 'Blue Chip Stocks', type: 'fluctuating', basePrice: 49 },
            { id: 'penny_stocks', name: 'Penny Stocks', type: 'fluctuating', basePrice: 7 }
          ]).map(stock => {
            let price = stock.basePrice;
            if (stock.type === 'fluctuating') {
              const seed = turn * 997 + stock.id.charCodeAt(0) * 31;
              price = calcStockPrice(stock.basePrice, economicIndex, seed);
            }
            const owned = stock.id === 'tbills' 
              ? (player.inventory?.stocks?.tBills || 0)
              : (player.inventory?.stocks?.holdings?.[stock.id] || 0);

            return <StockTradeRow key={stock.id} stock={stock as any} price={price} owned={owned} playerMoney={player.money} onAction={onAction} />;
          })}
        </div>
      )}

      {tab === 'loans' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '10px' }}>
          <button 
            onClick={() => onAction({ type: 'take_loan' })}
            style={{ padding: '14px', borderRadius: '8px' }}
          >
            📝 {t('bank.applyLoan', { cost: campaign?.config.timeRules?.loanCost ?? 2, defaultValue: `Apply for Loan (Costs ⏳ ${campaign?.config.timeRules?.loanCost ?? 2} Hours)` })}
          </button>
          <button 
            onClick={() => onAction({ type: 'pay_loan' })} 
            style={{ padding: '14px', borderRadius: '8px' }}
          >
            {t('bank.makePayment', { amount: loanPaymentAmount, defaultValue: `Make Loan Payment ($${loanPaymentAmount} or remainder)` })}
          </button>
        </div>
      )}
    </div>
  );
}

export function PawnShop({ player, onAction, economicIndex = 0, pawnShopItemsForSale = [], rules, campaign }: InteractionProps & { economicIndex?: number, pawnShopItemsForSale?: import('../engine/gameState').PawnedItem[], rules?: GameRules, campaign?: CampaignBundle }) {
  const { t } = useTranslation();
  const pawnableAppliances = player.inventory.appliances;
  const redeemableItems = player.inventory.pawnedItems || [];

  const formatItemName = (id: string) => campaign?.items.find(i => i.id === id)?.name || id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div className="interaction-panel">
      <h3>{t('pawnShop.title', { defaultValue: 'Pawn Shop' })}</h3>
      
      <h4 style={{ color: 'var(--accent-cyan)', margin: '12px 0 8px 0', fontSize: '0.95em' }}>{t('pawnShop.sellTitle', { defaultValue: 'Sell Items (40% Value)' })}</h4>
      {pawnableAppliances.length === 0 ? (
        <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#888' }}>{t('pawnShop.noSell', { defaultValue: 'You have no appliances to pawn.' })}</p>
      ) : (
        <ul className="store-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', listStyle: 'none', padding: 0, margin: 0 }}>
          {pawnableAppliances.map((app, idx) => {
            const pawnValue = Math.floor(calcEconomyPrice(app.purchasePrice, economicIndex) * 0.4);
            return (
              <li key={idx} className="store-item" onClick={() => onAction({ type: 'pawn_item', item: app, value: pawnValue })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  {rules?.showItemImages && (
                    <img 
                      src={`/assets/raw_images/${app.id}.png`} 
                      alt={app.id} 
                      style={{ width: '28px', height: '28px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '4px', flexShrink: 0 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(`item.${app.id}`, { defaultValue: formatItemName(app.id) })}</span>
                </div>
                <span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '13px', marginLeft: '8px', flexShrink: 0 }}>+${pawnValue}</span>
              </li>
            );
          })}
        </ul>
      )}

      <h4 style={{ color: 'var(--accent-cyan)', margin: '16px 0 8px 0', fontSize: '0.95em' }}>{t('pawnShop.buyTitle', { defaultValue: 'Buy Back (50% Value)' })}</h4>
      {redeemableItems.length === 0 ? (
        <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#888' }}>{t('pawnShop.noBuy', { defaultValue: 'You have no items pawned.' })}</p>
      ) : (
        <ul className="store-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', listStyle: 'none', padding: 0, margin: 0 }}>
          {redeemableItems.map((app, idx) => {
            const redeemCost = app.redeemCost;
            return (
              <li key={idx} className="store-item" onClick={() => onAction({ type: 'redeem_item', item: app, cost: redeemCost })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  {rules?.showItemImages && (
                    <img 
                      src={`/assets/raw_images/${app.itemId}.png`} 
                      alt={app.itemId} 
                      style={{ width: '28px', height: '28px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '4px', flexShrink: 0 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(`item.${app.itemId}`, { defaultValue: formatItemName(app.itemId) })}</span>
                </div>
                <span style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: '13px', marginLeft: '8px', flexShrink: 0 }}>-${redeemCost}</span>
              </li>
            );
          })}
        </ul>
      )}

      {pawnShopItemsForSale.length > 0 && (
        <>
          <h4 style={{ color: 'var(--accent-cyan)', margin: '16px 0 8px 0', fontSize: '0.95em' }}>{t('pawnShop.secondHandTitle', { defaultValue: 'Second Hand Items (50% Value)' })}</h4>
          <ul className="store-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px', listStyle: 'none', padding: 0, margin: 0 }}>
            {pawnShopItemsForSale.map((app, idx) => {
              const buyCost = Math.floor(app.originalPrice * 0.5);
              return (
                <li key={idx} className="store-item" onClick={() => onAction({ type: 'buy_pawn_item', item: app, cost: buyCost })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    {rules?.showItemImages && (
                      <img 
                        src={`/assets/raw_images/${app.itemId}.png`} 
                        alt={app.itemId} 
                        style={{ width: '28px', height: '28px', objectFit: 'contain', backgroundColor: '#000', borderRadius: '4px', flexShrink: 0 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(`item.${app.itemId}`, { defaultValue: formatItemName(app.itemId) })}</span>
                  </div>
                  <span style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: '13px', marginLeft: '8px', flexShrink: 0 }}>-${buyCost}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export function DiscountAndPawnShop({ player, onAction, availableItems, economicIndex = 0, pawnShopItemsForSale = [], rules, campaign }: InteractionProps & { availableItems: ItemDef[], economicIndex?: number, pawnShopItemsForSale?: import('../engine/gameState').PawnedItem[], rules?: GameRules, campaign?: CampaignBundle }) {
  const [activeTab, setActiveTab] = useState<'store' | 'pawn'>('store');

  return (
    <div className="interaction-panel discount-pawn-shop">
      <div className="tabs" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button 
          className={`tab-btn ${activeTab === 'store' ? 'active' : ''}`}
          onClick={() => setActiveTab('store')}
          style={{ flex: 1, padding: '10px', background: activeTab === 'store' ? '#4CAF50' : '#333', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          🛒 Retail Store
        </button>
        <button 
          className={`tab-btn ${activeTab === 'pawn' ? 'active' : ''}`}
          onClick={() => setActiveTab('pawn')}
          style={{ flex: 1, padding: '10px', background: activeTab === 'pawn' ? '#4CAF50' : '#333', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          ⚖️ Pawn & Trade
        </button>
      </div>

      {activeTab === 'store' && (
        <StoreFront 
          player={player}
          onAction={onAction}
          availableItems={availableItems}
          economicIndex={economicIndex}
          rules={rules}
        />
      )}
      
      {activeTab === 'pawn' && (
        <PawnShop 
          player={player}
          onAction={onAction}
          economicIndex={economicIndex}
          pawnShopItemsForSale={pawnShopItemsForSale}
          rules={rules}
          campaign={campaign}
        />
      )}
    </div>
  );
}

export function UniversityRegistry({ player, onAction, availableDegrees, rules, campaign, economicIndex = 0 }: InteractionProps & { availableDegrees?: EducationDef[], rules?: import('../engine/gameState').GameRules, campaign: CampaignBundle, economicIndex?: number }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'available'|'tree'>('available');

  const degreesList = availableDegrees || campaign?.degrees || [];
  const rootDegrees = degreesList.filter(d => d.prerequisites.length === 0);

  return (
    <div className="interaction-panel">
      <h3>{t('university.title', { defaultValue: 'University Registry' })}</h3>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button onClick={() => setTab('available')} style={{ fontWeight: tab === 'available' ? 'bold' : 'normal', background: tab === 'available' ? '#4aa' : '#333' }}>
          {t('university.tabAvailable', { defaultValue: 'Available Classes' })}
        </button>
        <button onClick={() => setTab('tree')} style={{ fontWeight: tab === 'tree' ? 'bold' : 'normal', background: tab === 'tree' ? '#4aa' : '#333' }}>
          {t('university.tabTree', { defaultValue: 'Class Tree' })}
        </button>
      </div>

      {tab === 'available' && (
        <>
          <h4 style={{ color: 'var(--accent-cyan)', margin: '0 0 10px 0', fontSize: '0.95em' }}>{t('university.available', { defaultValue: 'Available Degrees' })}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
            {degreesList
              .filter(deg => deg.prerequisites.every(prereq => player.degrees.includes(prereq)))
              .filter(deg => !player.degrees.includes(deg.id))
              .map(deg => {
                const required = calcRequiredLessons(player, deg);
                const hasBonus = required < deg.lessonsRequired;
                const isEnrolled = player.enrolledClasses?.[deg.id] !== undefined;
                const lessonsCompleted = player.enrolledClasses?.[deg.id] || 0;

                const tuitionFee = calcEconomyPrice(deg.baseTuitionFee, economicIndex);

                return (
                  <div key={deg.id} className="interaction-item" style={{ margin: 0, padding: '12px', border: '1px solid #4aa', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                        <strong>{t(`education.${deg.id}`, { defaultValue: deg.name })}</strong>
                        {hasBonus && <span style={{ color: '#2ecc71', fontSize: '11px', fontWeight: 'bold' }}>{t('university.bonus', { defaultValue: '★ Bonus' })}</span>}
                      </div>
                      {!isEnrolled && (
                        <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '6px' }}>
                          {t('university.tuition', { fee: tuitionFee, defaultValue: `Tuition: $${tuitionFee}` })}
                        </div>
                      )}
                      
                      {isEnrolled && (
                        <div style={{ marginTop: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--accent-cyan)', marginBottom: '3px' }}>
                            <span>{rules?.percentageEducation ? t('university.progress', { defaultValue: 'Progress' }) : t('university.lessons', { defaultValue: 'Lessons' })}:</span>
                            <span style={{ fontWeight: 'bold' }}>
                              {rules?.percentageEducation 
                                ? `${formatDegreeProgress(lessonsCompleted, true)} / 100%` 
                                : `${lessonsCompleted} / ${required}`}
                            </span>
                          </div>
                          {rules?.percentageEducation && (
                            <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, lessonsCompleted)}%`, height: '100%', backgroundColor: '#3498db', transition: 'width 0.3s ease' }} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '10px' }}>
                      {isEnrolled ? (() => {
                        const standardCost = campaign.config.timeRules.studySessionCost;
                        let maxSpend = standardCost;

                        if (rules?.percentageEducation && rules?.proportionalDivisibleActions) {
                          const totalRequiredHours = required * standardCost;
                          const currentProgress = lessonsCompleted;
                          const remainingPct = Math.max(0, 100 - currentProgress);
                          const hoursNeeded = (remainingPct / 100) * totalRequiredHours;
                          if (hoursNeeded < standardCost) {
                            maxSpend = Math.max(0.5, roundToResolution(hoursNeeded, 0.5));
                          }
                        }

                        const hoursToStudy = player.hoursRemaining > 0 ? Math.min(maxSpend, player.hoursRemaining) : maxSpend;
                        const studyRatio = hoursToStudy / standardCost;

                        return (
                          <button 
                            data-testid={`study-${deg.id}`}
                            data-action-target={`study-${deg.id}`}
                            style={{ width: '100%', background: '#3498db', opacity: player.hoursRemaining <= 0 ? 0.6 : 1, cursor: 'pointer' }} 
                            onClick={() => onAction({ type: 'study', degreeId: deg.id })} 
                          >
                            🎓 {t('university.studyBtn', { cost: hoursToStudy, defaultValue: `Study (⏳ ${hoursToStudy}h)` })}
                            {rules?.usePhysicalMentalConditions && (() => {
                              const sRules = campaign.config.statRules;
                              const nextStudyAction = (player.studyActionsThisTurn || 0) + 1;
                              const studyOvertimeThresh = sRules?.studyOvertimeThreshold ?? 8;
                              const studyGrindThresh = sRules?.studyGrindThreshold ?? 4;

                              let mCost = sRules?.studyMentalCost ?? sRules?.studyNormalMentalCost ?? 1;
                              let pCost = sRules?.studyNormalPhysicalCost ?? 0;
                              let studyTierLabel = '';

                              let depBonus = 0;
                              const currentJob = campaign.jobs.find(j => j.id === player.currentJobId);
                              const hasAcademicFreedom = currentJob?.tags?.includes('academic_freedom');

                              if (nextStudyAction >= studyOvertimeThresh) {
                                mCost = sRules?.studyOvertimeMentalCost ?? 2;
                                pCost = sRules?.studyOvertimePhysicalCost ?? 1;
                                studyTierLabel = ' [Hyper]';
                                if (hasAcademicFreedom) {
                                  depBonus = 2;
                                }
                              } else if (nextStudyAction >= studyGrindThresh) {
                                mCost = sRules?.studyGrindMentalCost ?? 2;
                                pCost = sRules?.studyGrindPhysicalCost ?? 0;
                                studyTierLabel = ' [Grind]';
                                if (hasAcademicFreedom) {
                                  depBonus = 1;
                                }
                              }

                              const prereqDepth = getPrerequisiteChainDepth(deg.id, campaign.education);
                              mCost += prereqDepth;

                              const scaledMCost = roundToResolution(mCost * studyRatio, 0.5);
                              const scaledPCost = roundToResolution(pCost * studyRatio, 0.5);
                              const scaledDepBonus = roundToResolution(depBonus * studyRatio, 0.5);

                              return (
                                <span style={{ fontSize: '11px', marginLeft: '5px' }}>
                                  (-{scaledMCost} 🧠{scaledPCost > 0 ? `, -${scaledPCost} 💪` : ''}{scaledDepBonus > 0 ? `, +${scaledDepBonus} 🤝` : ''}{studyTierLabel})
                                </span>
                              );
                            })()}
                          </button>
                        );
                      })() : (
                        <button 
                          style={{ width: '100%', background: '#2ecc71', color: '#000', cursor: 'pointer' }} 
                          onClick={() => onAction({ type: 'enroll', degreeId: deg.id })} 
                          data-action-target={`enroll-${deg.id}`}
                        >
                          🎓 {t('university.enrollBtn', { defaultValue: 'Enroll' })} (${tuitionFee})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
          {degreesList.filter(deg => deg.prerequisites.every(prereq => player.degrees.includes(prereq)) && !player.degrees.includes(deg.id)).length === 0 && (
            <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#888' }}>{t('university.noClasses', { defaultValue: 'No classes available to take right now.' })}</p>
          )}
        </>
      )}

      {tab === 'tree' && (
        <div style={{ marginTop: '10px', padding: '10px', background: '#222', borderRadius: '4px', overflowX: 'auto' }}>
          {rootDegrees.map(root => (
            <ClassTreeNode key={root.id} degreeId={root.id} availableDegrees={degreesList} player={player} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClassTreeNode({ degreeId, availableDegrees, player, depth = 0 }: { degreeId: string, availableDegrees: EducationDef[], player: PlayerState, depth?: number }) {
  const { t } = useTranslation();
  const degree = availableDegrees.find(d => d.id === degreeId);
  if (!degree) return null;

  const children = availableDegrees.filter(d => d.prerequisites.includes(degreeId));
  const isCompleted = player.degrees.includes(degreeId);
  const isEnrolled = player.enrolledClasses?.[degreeId] !== undefined;
  const canTake = degree.prerequisites.every(p => player.degrees.includes(p));

  let statusColor = '#666';
  let statusText = 'Locked';
  let bgColor = '#333';
  if (isCompleted) { statusColor = '#2ecc71'; statusText = 'Completed ✓'; bgColor = 'rgba(46, 204, 113, 0.1)'; }
  else if (isEnrolled) { statusColor = '#f39c12'; statusText = 'Enrolled'; bgColor = 'rgba(243, 156, 18, 0.1)'; }
  else if (canTake) { statusColor = '#3498db'; statusText = 'Available'; bgColor = 'rgba(52, 152, 219, 0.1)'; }

  return (
    <div style={{ marginLeft: depth > 0 ? '20px' : '0', position: 'relative', marginTop: '10px' }}>
      <div style={{ 
        padding: '8px 12px', 
        border: `1px solid ${statusColor}`, 
        borderRadius: '6px',
        display: 'inline-block',
        backgroundColor: bgColor,
        boxShadow: `0 0 5px ${bgColor}`
      }}>
        <strong>{t(`education.${degree.id}`, { defaultValue: degree.name })}</strong>
        <span style={{ fontSize: '11px', color: statusColor, marginLeft: '10px', fontWeight: 'bold' }}>{statusText}</span>
      </div>
      
      {children.length > 0 && (
        <div style={{ 
          borderLeft: `2px solid #555`, 
          marginLeft: '20px', 
          paddingTop: '5px',
          paddingBottom: '5px' 
        }}>
          {children.map(child => (
            <div key={child.id} style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '0',
                top: '25px',
                width: '15px',
                height: '2px',
                backgroundColor: '#555'
              }} />
              <div style={{ marginLeft: '15px' }}>
                <ClassTreeNode degreeId={child.id} availableDegrees={availableDegrees} player={player} depth={depth + 1} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

