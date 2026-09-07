import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { PlayerState } from '../../../engine/gameState';
import type { CampaignBundle, JobDef } from '../../../engine/dataLoader';
import type { WorkMode, WorkShiftSummary } from '../../../engine/jobEngine';
import { hasJobTag } from '../../../engine/jobTags';

export interface WorkCardHelpModalProps {
  mode: WorkMode;
  job: JobDef;
  player: PlayerState;
  onClose: () => void;
  campaign?: CampaignBundle;
  summary?: WorkShiftSummary;
}

interface SectionItem {
  icon: string;
  title: string;
  desc: string;
}

export const WorkCardHelpModal: React.FC<WorkCardHelpModalProps> = ({
  mode,
  job,
  player,
  onClose,
  summary
}) => {
  const { t } = useTranslation();

  const isHeavyPhysical = hasJobTag(job, 'heavy_physical');
  const isFrontline = hasJobTag(job, 'frontline_service');
  const isTech = hasJobTag(job, 'technical');
  const isMiddleMgmt = hasJobTag(job, 'middle_management');
  const isExecMgmt = hasJobTag(job, 'executive_management');
  const isMgmt = isMiddleMgmt || isExecMgmt;
  const hasDegree = !!(player.degrees && player.degrees.length > 0);

  let title = '';
  let icon = '💼';
  let badge = 'STRATEGY GUIDE';
  let themeColor = '#10b981';
  let glowColor = 'rgba(16, 185, 129, 0.4)';
  let fluff = '';
  let rationale = '';
  const inputs: SectionItem[] = [];
  const outputs: SectionItem[] = [];
  const tips: string[] = [];

  switch (mode) {
    case 'work_work':
      title = t('action.workModal.workWork', { defaultValue: 'Work Work (Standard Shift)' });
      icon = '💼';
      badge = 'CORE SHIFT';
      themeColor = '#10b981';
      glowColor = 'rgba(16, 185, 129, 0.4)';
      fluff = 'Put your head down and grind through the queue. Reliable output earns steady respect and raises. The backbone of every business is the honest shift performed without shortcuts.';
      rationale = 'Represents focused, routine labor where personal reliability directly translates into career advancement and dependable income.';
      
      inputs.push(
        {
          icon: '⏳',
          title: 'Shift Duration',
          desc: 'Consumes 6 hours per standard session (or remaining hours). Partial shifts prorate pay and fatigue proportionally.'
        },
        {
          icon: '💪',
          title: 'Physical Threshold',
          desc: isHeavyPhysical
            ? 'Heavy Physical job: Physical mistake risk triggers below 20 Physical condition (2.5% per point below 20).'
            : 'Normal job: Physical mistake risk triggers below 10 Physical condition (2.5% per point below 10).'
        },
        {
          icon: '🧠',
          title: 'Mental Threshold',
          desc: 'Mental mistake risk triggers below 10 Mental condition. If both conditions are low, mistake probabilities compound.'
        }
      );

      if (isFrontline) {
        inputs.push({
          icon: '🏷️',
          title: 'Frontline Service Tag',
          desc: 'Working customer-facing shifts 1–3 builds +1 Social. Shifts 4–7 are neutral. Overtime (Shift 8+) drains -1 Social due to burnout.'
        });
      }
      if (isTech) {
        inputs.push({
          icon: '🔧',
          title: 'Technical Tag',
          desc: 'Builds Technical Skill (+0.25 per Exp earned) to fulfill technical prerequisites for promotions.'
        });
      }
      if (isMgmt) {
        inputs.push({
          icon: '👔',
          title: 'Management Tag',
          desc: isExecMgmt ? 'Awards +0.50 Management Skill per Exp earned.' : 'Awards +0.25 Management Skill per Exp earned.'
        });
      }

      outputs.push(
        {
          icon: '💵',
          title: 'Full Wages',
          desc: `Earns 100% of your hourly wage ($${player.currentWage || job.baseWage}/hr) for all hours worked.`
        },
        {
          icon: '🤝',
          title: 'Dependability (+1.0)',
          desc: 'Builds vital Dependability needed to qualify for promotions, raises, and job security.'
        },
        {
          icon: '👌',
          title: 'Experience',
          desc: isHeavyPhysical ? 'Builds +0.5 Experience (halved on manual labor roles).' : 'Builds +1.0 Experience toward career advancement.'
        },
        {
          icon: '⚠️',
          title: 'Mistake Demerits',
          desc: 'Mistakes reduce your max condition by -1, add a location demerit, and risk immediate termination on 3 mistakes in one turn.'
        }
      );

      tips.push(
        'Best used early in the turn when your energy is high (> 20 Physical & Mental) to bank steady wages safely.',
        'Prioritize this mode when you need Dependability to meet the requirements for an upcoming raise or promotion.',
        'Watch out when entering Grind (Shift 4+) or Overtime (Shift 8+) as fatigue penalties increase significantly.'
      );
      break;

    case 'look_busy':
      title = t('action.workModal.lookBusy', { defaultValue: 'Look Busy (Coasting & Rest)' });
      icon = '👀';
      badge = 'ENERGY CONSERVATION';
      themeColor = '#f59e0b';
      glowColor = 'rgba(245, 158, 11, 0.4)';
      fluff = 'Shuffle papers, keep spreadsheets open, and master the art of looking swamped while resting your legs. In large workplaces, looking productive is half the battle.';
      rationale = 'Real-world pacing. Sometimes survival requires doing the bare minimum to stay afloat and conserve energy for what matters.';

      inputs.push(
        {
          icon: '💪',
          title: 'Reduced Fatigue',
          desc: 'Drains only 50% of the normal physical cost, letting you rest your body while staying on the clock.'
        },
        {
          icon: '🧠',
          title: 'Half Mental Drain',
          desc: 'Reduces mental fatigue drain by half, significantly lowering the risk of cognitive mistakes.'
        }
      );

      if (isMiddleMgmt) {
        inputs.push({
          icon: '🚫',
          title: 'Middle Management Restriction',
          desc: 'Disabled! Supervisors are closely scrutinized and cannot afford to coast visibly.'
        });
      }

      if (isHeavyPhysical) {
        inputs.push({
          icon: '⚠️',
          title: 'Heavy Physical Penalty',
          desc: 'Harder to fake manual labor on the floor; incurs an immediate -1.0 Dependability penalty.'
        });
      }

      if (isFrontline) {
        outputs.push({
          icon: '👥',
          title: 'Frontline Service Penalty (-1 Social)',
          desc: 'Coasting and ignoring customers in customer-facing roles damages your reputation (-1 Social standing).'
        });
      }

      outputs.push(
        {
          icon: '💵',
          title: 'Full Wages',
          desc: `You still collect your full hourly wage ($${player.currentWage || job.baseWage}/hr) for coasting through the shift.`
        },
        {
          icon: '🤝',
          title: 'No Dependability Growth',
          desc: 'Awards +0 Dependability (or -1.0 on heavy physical jobs). Your supervisor notices you are coasting.'
        },
        {
          icon: '👌',
          title: 'No Experience Gain',
          desc: 'Awards +0 Experience. You cannot sharpen your skills while doing the bare minimum.'
        }
      );

      if (isFrontline) {
        tips.push('Warning: Looking busy on Frontline Service jobs costs -1 Social standing because customers notice your absence!');
      }
      tips.push(
        'Ideal when your Physical condition drops below 10 (or 20 for heavy jobs) and you need cash without risking devastating mistakes.',
        'Great when your Dependability is already safely above your job requirements and you need to conserve stamina for studying or chores.',
        'Avoid this mode if you are actively working towards an upcoming promotion that requires Dependability gains.'
      );
      break;

    case 'face_time':
      title = t('action.workModal.faceTime', { defaultValue: 'Face Time (Politics & Networking)' });
      icon = '🤝';
      badge = 'CORPORATE POLITICS';
      themeColor = '#0ea5e9';
      glowColor = 'rgba(14, 165, 233, 0.4)';
      fluff = "Linger by the water cooler, chat up supervisors, and build alliances that open corporate doors. Success isn't just about what you know—it's about who you know.";
      rationale = 'Corporate ladder climbing where relationship-building and office politics substitute for raw technical output.';

      inputs.push(
        {
          icon: '👥',
          title: 'Social Standing',
          desc: 'Higher current Social standing increases your probability of successfully impressing colleagues and winning alliances.'
        }
      );

      if (isHeavyPhysical) {
        inputs.push({
          icon: '🚫',
          title: 'Manual Labor Restriction',
          desc: 'Disabled! There are no water coolers or political lounges on the assembly line or construction floor.'
        });
      }

      if (isMgmt) {
        inputs.push({
          icon: '👔',
          title: 'Executive Affinity',
          desc: 'Guarantees +0.25 Management Skill growth on every successful Face Time session.'
        });
      }

      outputs.push(
        {
          icon: '💵',
          title: 'Unpaid Shift ($0 Pay)',
          desc: 'Earns $0 wages. You are investing shift hours into political capital rather than billable output.'
        },
        {
          icon: '🤝',
          title: 'High Dependability Boost',
          desc: 'Builds +1.0 to +2.5 Dependability through visible presence and active loyalty displays.'
        },
        {
          icon: '👥',
          title: 'Social Skill Roll',
          desc: 'Rolls for +1 permanent Social stat growth to elevate your standing in the city.'
        }
      );

      tips.push(
        'Use when your bank balance is healthy and you want to fast-track promotions into high-paying management tiers.',
        'Great way to raise Social standing to unlock luxury housing or bypass strict interview requirements.',
        'Remember that it pays $0! Always ensure you have enough savings to cover upcoming rent and food.'
      );
      break;

    case 'innovate':
      title = t('action.workModal.innovate', { defaultValue: 'Innovate (R&D Breakthroughs)' });
      icon = '💡';
      badge = 'CAP BUSTER';
      themeColor = '#a855f7';
      glowColor = 'rgba(168, 85, 247, 0.4)';
      fluff = "Pitch ambitious ideas and experiment with bold processes. Requires a degree to break past normal limits. True visionaries don't just follow protocols—they rewrite them.";
      rationale = 'High-risk, high-reward creative endeavor where formal education and ambition unlock breakthroughs beyond routine operational limits.';

      inputs.push(
        {
          icon: hasDegree ? '🎓' : '❌',
          title: hasDegree ? 'College Degree (Satisfied)' : 'College Degree Required (Missing)',
          desc: hasDegree
            ? `You hold ${player.degrees.length} degree(s), satisfying the prerequisite to attempt innovations.`
            : 'Hard prerequisite! You must hold at least one University Degree to unlock and attempt innovation breakthroughs.'
        },
        {
          icon: '🧠',
          title: 'Escalating Mental Cost',
          desc: 'Each completed innovation breakthrough at this job makes subsequent breakthroughs mentally more taxing.'
        }
      );

      outputs.push(
        {
          icon: '💵',
          title: 'Half Pay (50% Wages)',
          desc: `Earns 50% of your hourly wage ($${Math.floor((player.currentWage || job.baseWage) * 0.5)}/hr) as company research stipend.`
        },
        {
          icon: '🎲',
          title: 'Cap Buster Roll (2d2 - 2)',
          desc: 'Rolls 2d2-2 (0 to 2 points) for BOTH Dependability and Experience simultaneously.'
        },
        {
          icon: '🚀',
          title: 'Stat Cap Expansion',
          desc: 'Can push your Dependability and Experience past the normal maximum limits of your current job tier!'
        },
        {
          icon: '🛡️',
          title: 'Firing Protection',
          desc: 'Each completed innovation grants an Innovation Token that protects against firing and discounts future raise requests.'
        }
      );

      tips.push(
        'Essential when you have reached your job tier cap and need higher stats to qualify for executive promotions.',
        'Invaluable for high-intellect characters aiming to secure a permanent legacy and bulletproof job security.',
        'Mental drain is high; ensure you relax and recharge your mental condition before attempting innovative shifts.'
      );
      break;
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="work-card-help-backdrop"
      data-testid={`work-help-modal-${mode}`}
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px',
        boxSizing: 'border-box'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '540px',
          maxHeight: '85vh',
          overflowY: 'auto',
          borderRadius: '14px',
          border: `2px solid ${themeColor}`,
          boxShadow: `0 10px 40px rgba(0, 0, 0, 0.9), 0 0 25px ${glowColor}`,
          background: 'linear-gradient(170deg, #131b2e 0%, #0a0f1d 100%)',
          padding: '20px',
          color: '#fff',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.6rem' }}>{icon}</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff', fontWeight: 'bold' }}>
                {title}
              </h3>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 'bold',
                letterSpacing: '0.08em',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: `${themeColor}22`,
                color: themeColor,
                border: `1px solid ${themeColor}`,
                display: 'inline-block',
                marginTop: '3px'
              }}>
                {badge}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            data-testid="btn-close-help"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: '#ddd',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              transition: 'all 0.15s ease'
            }}
          >
            ✕
          </button>
        </div>

        {/* Active Shift Tracker if summary provided */}
        {summary && (
          <div style={{
            padding: '6px 12px',
            borderRadius: '6px',
            background: summary.tier === 'overtime'
              ? 'rgba(239, 68, 68, 0.2)'
              : (summary.tier === 'grind' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)'),
            border: summary.tier === 'overtime'
              ? '1px solid #ef4444'
              : (summary.tier === 'grind' ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)'),
            fontSize: '0.78rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: summary.tier === 'overtime' ? '#fca5a5' : (summary.tier === 'grind' ? '#fde68a' : '#cbd5e1')
          }}>
            <span>Current Progress: Shift #{summary.actionCount}</span>
            <span>
              {summary.tier === 'overtime' && '🔥 OVERTIME TIER (Doubled Fatigue & Permanent Stat Drop!)'}
              {summary.tier === 'grind' && '⚡ GRIND TIER (+1.0 🧠 Mental Cost Active)'}
              {summary.tier === 'normal' && 'Baseline Fatigue'}
            </span>
          </div>
        )}

        {/* Fluff Lore Quote */}
        <div style={{
          padding: '10px 14px',
          background: 'rgba(0, 0, 0, 0.35)',
          borderRadius: '8px',
          borderLeft: `4px solid ${themeColor}`,
          fontStyle: 'italic',
          fontSize: '0.82rem',
          lineHeight: '1.4',
          color: '#cbd5e1'
        }}>
          "{fluff}"
        </div>

        {/* Inputs: What Affects This Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h4 style={{ margin: 0, fontSize: '0.88rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ⚙️ What Affects This Action (Inputs & Mechanics)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {inputs.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
                <div style={{ fontSize: '0.78rem' }}>
                  <strong style={{ color: '#fff', display: 'block', marginBottom: '2px' }}>{item.title}</strong>
                  <span style={{ color: '#94a3b8', lineHeight: '1.35' }}>{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outputs: What It Produces & Impacts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h4 style={{ margin: 0, fontSize: '0.88rem', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📈 Outputs & Career Impacts
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {outputs.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
                <div style={{ fontSize: '0.78rem' }}>
                  <strong style={{ color: '#fff', display: 'block', marginBottom: '2px' }}>{item.title}</strong>
                  <span style={{ color: '#94a3b8', lineHeight: '1.35' }}>{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shift Fatigue Tiers Guide */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '10px',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <h4 style={{ margin: 0, fontSize: '0.88rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ⚡ Shift Fatigue Tiers (Normal → Grind → Overtime)
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '0.74rem' }}>
            {/* Tier 1: Baseline Shifts 1-3 */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '6px',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <strong style={{ color: '#34d399', fontSize: '0.76rem' }}>
                🟢 Shifts 1–3
              </strong>
              <div style={{ color: '#cbd5e1', lineHeight: '1.3' }}>• 1.0 💪, 0.0 🧠</div>
              <div style={{ color: '#94a3b8', lineHeight: '1.3' }}>• Zero wear & tear</div>
              {isFrontline && <div style={{ color: '#67e8f9', fontWeight: 'bold' }}>• +1 👥 Social</div>}
            </div>

            {/* Tier 2: Grind Shifts 4-7 */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '6px',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <strong style={{ color: '#fbbf24', fontSize: '0.76rem' }}>
                ⚡ Shifts 4–7 (Grind)
              </strong>
              <div style={{ color: '#fbbf24', fontWeight: 'bold', lineHeight: '1.3' }}>• +1.0 🧠 Mental Drain</div>
              {isHeavyPhysical && <div style={{ color: '#f87171', fontWeight: 'bold' }}>• -0.5 Max 💪 Condition</div>}
              {isFrontline && <div style={{ color: '#94a3b8' }}>• 0 👥 Social (burnout)</div>}
            </div>

            {/* Tier 3: Overtime Shifts 8+ */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '6px',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <strong style={{ color: '#f87171', fontSize: '0.76rem' }}>
                🔥 Shifts 8+ (Overtime)
              </strong>
              <div style={{ color: '#f87171', fontWeight: 'bold', lineHeight: '1.3' }}>• 2.0 💪, 2.0 🧠 (Doubled!)</div>
              <div style={{ color: '#fca5a5', fontWeight: 'bold', lineHeight: '1.3' }}>• -0.5 Max 💪 on ALL jobs!</div>
              {isFrontline && <div style={{ color: '#f87171', fontWeight: 'bold' }}>• -1 👥 Social penalty</div>}
            </div>
          </div>
        </div>

        {/* Tactical Strategy Tips */}
        <div style={{
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '8px',
          padding: '10px 12px'
        }}>
          <h4 style={{ margin: '0 0 6px', fontSize: '0.85rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            💡 Tactical Strategy Tips
          </h4>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px', lineHeight: '1.35' }}>
            {tips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>

        {/* Mechanics Rationale */}
        <div style={{
          fontSize: '0.72rem',
          color: '#64748b',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '8px',
          fontStyle: 'italic'
        }}>
          <strong>Design Rationale:</strong> {rationale}
        </div>

        {/* Close Action Button */}
        <button
          onClick={onClose}
          style={{
            padding: '10px',
            backgroundColor: '#334155',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            marginTop: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#475569'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#334155'}
        >
          ✕ {t('common.gotIt', { defaultValue: 'Got It, Back to Work' })}
        </button>
      </div>
    </div>,
    document.body
  );
};
