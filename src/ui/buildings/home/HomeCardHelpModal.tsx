import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { PlayerState, GameRules } from '../../../engine/gameState';
import type { CampaignBundle } from '../../../engine/dataLoader';
import { formatHours } from '../../../engine/statMath';

export type HomeActionType = 'relax' | 'host' | 'clean' | 'service' | 'pantry';

export interface HomeCardHelpModalProps {
  action: HomeActionType;
  onClose: () => void;
  player?: PlayerState;
  rules?: GameRules;
  campaign?: CampaignBundle;
  hoursToRelax?: number;
  physGain?: number;
  mentalGain?: number;
  scaledMess?: number;
  hasFood?: boolean;
  socialParams?: {
    minReward?: number;
    maxReward?: number;
    minCashNeeded?: number;
    maxCashNeeded?: number;
    timeCost?: number;
    isHalfRewardExpected?: boolean;
    isCappedBySpace?: boolean;
  };
  hoursToClean?: number;
  cleanPhysGain?: number;
  cleaningServiceCost?: number;
  cleaningServicePrice?: number;
  hasFridge?: boolean;
  hasFreezer?: boolean;
}

interface SectionItem {
  icon: string;
  title: string;
  desc: string;
}

export const HomeCardHelpModal: React.FC<HomeCardHelpModalProps> = ({
  action,
  onClose,
  rules,
  hoursToRelax = 6,
  physGain = 5,
  mentalGain = 10,
  scaledMess = 2,
  hasFood = true,
  socialParams,
  hoursToClean = 2,
  cleanPhysGain = 1,
  cleaningServiceCost = 1,
  cleaningServicePrice = 50,
  hasFridge = false,
  hasFreezer = false
}) => {
  const { t } = useTranslation();

  let title = '';
  let icon = '🛋️';
  let badge = 'HOME STRATEGY GUIDE';
  let themeColor = '#10b981';
  let glowColor = 'rgba(16, 185, 129, 0.4)';
  let fluff = '';
  let rationale = '';
  const inputs: SectionItem[] = [];
  const outputs: SectionItem[] = [];
  const tips: string[] = [];

  switch (action) {
    case 'relax':
      title = t('homeRelax.relaxTitle', { defaultValue: 'Relax & Recharge' });
      icon = '🧘';
      badge = 'LEISURE';
      themeColor = '#34d399';
      glowColor = 'rgba(52, 211, 153, 0.4)';
      fluff = '"Sink into your favorite armchair, kick off your shoes, and let the city\'s grind melt away. A quiet evening restores your vitality."';
      rationale = 'Spending dedicated downtime at home replenishes essential physical energy and mental clarity needed to avoid exhaustion and career burnout.';
      inputs.push({
        icon: '⏳',
        title: 'Time Investment',
        desc: `${formatHours(hoursToRelax)} hours of your week`
      });
      if (rules?.usePhysicalMentalConditions) {
        inputs.push({
          icon: hasFood ? '🥗' : '⚠️',
          title: hasFood ? 'Pantry Sustenance' : 'Pantry Depleted (Starving)',
          desc: hasFood
            ? 'Food available in your pantry provides full recovery nutrients.'
            : `Without food, you still recover condition (+${physGain} Physical, +${mentalGain} Mental), but suffer -1 to maximum permanent stats!`
        });
        outputs.push({
          icon: '💪',
          title: 'Physical Vitality',
          desc: `+${physGain} Physical Condition recovered`
        });
        outputs.push({
          icon: '🧠',
          title: 'Mental Clarity',
          desc: `+${mentalGain} Mental Condition restored`
        });
        if (rules?.trackMess && scaledMess > 0) {
          outputs.push({
            icon: '🧹',
            title: 'Apartment Mess',
            desc: `+${scaledMess} Mess generated from spending time living at home`
          });
        }
      } else {
        outputs.push({
          icon: '😊',
          title: 'Happiness Boost',
          desc: 'Increases personal happiness and relaxation score.'
        });
      }
      tips.push('Ensure your pantry is stocked before relaxing so you do not suffer starvation penalties.');
      tips.push('Appliances like TV, Stereo, Microwave, and Hot Tub improve relaxation gains.');
      break;

    case 'host': {
      title = t('homeRelax.socializeTitle', { defaultValue: 'Host a Gathering' });
      icon = '🎉';
      badge = 'HOSPITALITY';
      themeColor = '#38bdf8';
      glowColor = 'rgba(56, 189, 248, 0.4)';
      fluff = '"Invite friends and colleagues over for lively banter, drinks, and good times. Genuine hospitality elevates your social standing, but leaves dishes and clutter in its wake!"';
      rationale = 'Hosting gatherings is the fastest route to boosting your social score and professional networking, though it demands cash for refreshments and cleanup effort afterwards.';
      const timeCost = socialParams?.timeCost ?? 6;
      const minCash = socialParams?.minCashNeeded ?? 15;
      const maxCash = socialParams?.maxCashNeeded ?? 30;
      const minReward = socialParams?.minReward ?? 4;
      const maxReward = socialParams?.maxReward ?? 8;
      inputs.push({
        icon: '⏳',
        title: 'Time Investment',
        desc: `${timeCost} hours hosting guests`
      });
      inputs.push({
        icon: '💵',
        title: 'Hospitality Expenses',
        desc: minCash === maxCash ? `$${minCash} for food and drinks` : `$${minCash}–$${maxCash} depending on guest count and furnishings`
      });
      outputs.push({
        icon: '👥',
        title: 'Social Standing',
        desc: `+${minReward}..+${maxReward} Social bonus points`
      });
      outputs.push({
        icon: '💪',
        title: 'Hosting Fatigue',
        desc: '-1 Physical Condition from entertaining and running the gathering'
      });
      outputs.push({
        icon: '🧹',
        title: 'Post-Party Mess',
        desc: 'Generates significant clutter and dishes that will need cleaning'
      });
      tips.push('Higher apartment space allows more guests, yielding larger social gains.');
      tips.push('Ensure you have enough cash to cover refreshments before hosting.');
      break;
    }

    case 'clean':
      title = t('homeRelax.cleanTitle', { defaultValue: 'Clean Apartment' });
      icon = '🧹';
      badge = 'CHORE';
      themeColor = '#0284c7';
      glowColor = 'rgba(2, 132, 199, 0.4)';
      fluff = '"Roll up your sleeves, grab the broom, and sweep away dust and clutter. Hard work, but nothing beats a spotless home."';
      rationale = 'Manually cleaning reduces your apartment mess score without costing money, preventing negative lifestyle decay and pests.';
      inputs.push({
        icon: '⏳',
        title: 'Time Required',
        desc: `${formatHours(hoursToClean)} hours of manual sweeping and scrubbing`
      });
      if (cleanPhysGain > 0) {
        inputs.push({
          icon: '💪',
          title: 'Physical Effort',
          desc: `-${cleanPhysGain} Physical Condition from labor`
        });
      }
      outputs.push({
        icon: '🧹',
        title: 'Mess Reduction',
        desc: 'Significantly reduces clutter and dirty dishes'
      });
      tips.push('Clean regularly to avoid pest infestations and moving penalty fees.');
      tips.push('If low on stamina, consider hiring a cleaning service instead.');
      break;

    case 'service':
      title = t('homeRelax.cleaningServiceBasic', { cost: cleaningServicePrice, defaultValue: `Cleaning Service ($${cleaningServicePrice})` });
      icon = '✨';
      badge = 'PROFESSIONAL SERVICE';
      themeColor = '#c084fc';
      glowColor = 'rgba(192, 132, 252, 0.4)';
      fluff = '"Hire professional cleaners to take care of the heavy lifting. They\'ll leave your apartment sparkling clean without you breaking a sweat."';
      rationale = 'Hiring a service removes 10 units of accumulated apartment mess with minimal time cost (1 hour) and zero physical exertion.';
      inputs.push({
        icon: '💵',
        title: 'Service Fee',
        desc: `$${cleaningServicePrice} cash paid to the cleaning crew`
      });
      inputs.push({
        icon: '⏳',
        title: 'Quick Coordination',
        desc: `${cleaningServiceCost} hour to let them in and inspect`
      });
      outputs.push({
        icon: '🧹',
        title: '10 Mess Reduction',
        desc: 'Removes 10 units of accumulated apartment mess.'
      });
      tips.push('Best utilized when mess has accumulated or when you are too tired for manual cleaning.');
      tips.push('Saves physical stamina when you are too tired for manual cleaning.');
      break;

    case 'pantry':
      title = t('homeRelax.pantryCardTitle', { defaultValue: 'Pantry & Food Supplies' });
      icon = '🥫';
      badge = 'FOOD & COLD STORAGE';
      themeColor = '#f59e0b';
      glowColor = 'rgba(245, 158, 11, 0.4)';
      fluff = '"A well-stocked pantry is essential. Proper cold storage shields fresh ingredients from spoiling between turns."';
      rationale = 'Maintaining food reserves prevents starvation damage when turns end or when resting at home.';
      inputs.push({
        icon: '🧊',
        title: 'Cold Storage Equipment',
        desc: hasFreezer ? 'Refrigerator + Freezer (Full spoilage protection)' : (hasFridge ? 'Refrigerator active (Shields fresh food from rot)' : 'No Refrigerator (Fresh food risks spoiling at turn end!)')
      });
      outputs.push({
        icon: '🥗',
        title: 'Fresh Food',
        desc: 'Purchased at Black\'s Market. Best nutrition, but requires refrigeration.'
      });
      outputs.push({
        icon: '🥫',
        title: 'Canned Food',
        desc: 'Purchased at Z-Mart / Black\'s. Shelf-stable emergency reserves.'
      });
      tips.push('Buy a refrigerator at Socket City or Z-Mart to keep fresh groceries fresh.');
      tips.push('Keep a few cans of emergency food in case you run out of time to shop.');
      break;
  }

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          backgroundColor: '#0a0d14',
          border: `1.5px solid ${themeColor}`,
          borderRadius: '14px',
          boxShadow: `0 0 35px ${glowColor}, 0 20px 40px rgba(0,0,0,0.9)`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Header Bar */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.6rem', filter: `drop-shadow(0 0 8px ${themeColor})` }}>{icon}</span>
            <div>
              <div style={{
                fontSize: '0.65rem',
                fontWeight: 800,
                color: themeColor,
                letterSpacing: '0.1em',
                textTransform: 'uppercase'
              }}>
                {badge}
              </div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff', fontWeight: 700 }}>
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.4)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#cbd5e1';
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: '16px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Flavor Text / Narrative */}
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderLeft: `3px solid ${themeColor}`,
            fontSize: '0.84rem',
            lineHeight: 1.45,
            color: '#cbd5e1',
            fontStyle: 'italic'
          }}>
            {fluff}
          </div>

          {/* Mechanic Rationale */}
          <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4 }}>
            <strong style={{ color: '#e2e8f0' }}>Why this action matters: </strong>
            {rationale}
          </div>

          {/* Two-Column Grid: Inputs & Outputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Inputs / Costs */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f87171', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Requirements & Costs
              </div>
              {inputs.map((inp, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '6px', fontSize: '0.78rem' }}>
                  <span>{inp.icon}</span>
                  <div>
                    <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{inp.title}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.74rem' }}>{inp.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Outputs / Benefits */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34d399', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Outcomes & Rewards
              </div>
              {outputs.map((out, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '6px', fontSize: '0.78rem' }}>
                  <span>{out.icon}</span>
                  <div>
                    <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{out.title}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.74rem' }}>{out.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategy Tips */}
          {tips.length > 0 && (
            <div style={{
              background: 'rgba(56, 189, 248, 0.06)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '8px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                💡 Strategy Tips
              </div>
              {tips.map((tip, idx) => (
                <div key={idx} style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'flex', gap: '6px' }}>
                  <span style={{ color: '#38bdf8' }}>•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 18px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          justifyContent: 'flex-end',
          flexShrink: 0
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              background: themeColor,
              color: '#000',
              fontWeight: 700,
              fontSize: '0.82rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: `0 2px 8px ${glowColor}`
            }}
          >
            {t('common.gotIt', { defaultValue: 'Got It' })}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
