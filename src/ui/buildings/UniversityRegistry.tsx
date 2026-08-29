import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { EducationDef, CampaignBundle } from '../../engine/dataLoader';
import type { PlayerState, GameRules } from '../../engine/gameState';
import { calcEconomyPrice } from '../../engine/economyEngine';
import { calcRequiredLessons, formatDegreeProgress, getPrerequisiteChainDepth } from '../../engine/educationEngine';
import { roundToResolution } from '../../engine/statMath';
import type { InteractionProps } from './types';

export function UniversityRegistry({ player, onAction, availableDegrees, rules, campaign, economicIndex = 0 }: InteractionProps & { availableDegrees?: EducationDef[], rules?: GameRules, campaign: CampaignBundle, economicIndex?: number }) {
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
