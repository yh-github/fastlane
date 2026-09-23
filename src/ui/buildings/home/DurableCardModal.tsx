import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { CampaignBundle } from '../../../engine/dataLoader';
import type { PlayerState, GameRules, OwnedAppliance } from '../../../engine/gameState';
import type { GameAction } from '../../../engine/actions/types';
import { calcDiySuccessChance, calcRepairmanCost, calcThrowOutMess } from '../../../engine/actions/maintenanceActions';

interface DurableCardModalProps {
  durable: {
    id: string;
    isBook?: boolean;
    applianceData?: OwnedAppliance;
    isOwned?: boolean;
  };
  player?: PlayerState;
  campaign?: CampaignBundle;
  rules?: GameRules;
  economicIndex?: number;
  onAction?: (action: GameAction) => void;
  onClose: () => void;
}

export const DurableCardModal: React.FC<DurableCardModalProps> = ({
  durable,
  player,
  campaign,
  rules,
  economicIndex = 0,
  onAction,
  onClose
}) => {
  const { t } = useTranslation();
  const itemDef = campaign?.items.find(i => i.id === durable.id);
  const itemName = itemDef ? t(`item.${itemDef.id}`, { defaultValue: itemDef.name }) : durable.id;

  const currentAppliance = durable.isBook 
    ? undefined 
    : (player?.inventory.appliances.find(a => a.id === durable.id && a.isBroken) || player?.inventory.appliances.find(a => a.id === durable.id));
  const isBroken = Boolean(currentAppliance ? currentAppliance.isBroken : durable.applianceData?.isBroken);

  const isSpareParts = durable.id === 'spare_parts';
  const isCurio = durable.id === 'knick_knack' || durable.id === 'knick_knacks';

  const knickKnacks = player?.inventory.knickKnacks || 0;
  const uninspectedKnickKnacks = player?.inventory.uninspectedKnickKnacks || 0;
  const totalCurios = knickKnacks + uninspectedKnickKnacks;

  const isOwned = isCurio 
    ? (durable.isOwned !== false && totalCurios > 0)
    : (isSpareParts ? (durable.isOwned !== false && (player?.inventory.spareParts || 0) > 0) : durable.isOwned !== false);
  const isNew = durable.isBook 
    ? false 
    : ((currentAppliance?.condition ?? durable.applianceData?.condition) === 'new' || (currentAppliance?.purchaseSource ?? durable.applianceData?.purchaseSource) === 'socket_city');

  const conditionLabel = !isOwned 
    ? '🏬 Not Owned' 
    : (isSpareParts 
        ? `⚙️ Spare Parts (${player?.inventory.spareParts || 0})` 
        : (isCurio 
            ? `🏺 Curio Collection (${totalCurios})` 
            : (isBroken ? '⚠️ BROKEN' : (isNew ? '✨ Brand New' : (durable.isBook ? '📚 Book' : '📦 Used')))));
  const conditionDetail = !isOwned
    ? (durable.isBook 
        ? 'Available at Z-Mart. Purchase to study and permanently boost your cognitive reserves.'
        : (isCurio
            ? 'Available at Pawn Shop rummage bins. Furnish your home to gain aesthetic charm and lifestyle synergy!'
            : (isSpareParts
                ? 'Available at Pawn Shop rummage bins. Keep a box handy to boost your DIY appliance repair odds!'
                : 'Available at Socket City (Brand New) or Z-Mart & Pawn Shop (Used). Furnish your home to gain its perks!')))
    : (isSpareParts
        ? `Assorted repair materials from pawn shop rummage bins. Occupies 2 space per box. You currently own ${player?.inventory.spareParts || 0} box(es).`
        : (isCurio
            ? (uninspectedKnickKnacks > 0 && knickKnacks > 0
                ? `Curios & knick-knacks salvaged from pawn shop bins. Occupies 2 space each. You currently own ${totalCurios} curio(s) (${knickKnacks} on display, ${uninspectedKnickKnacks} pending weekend appraisal).`
                : (uninspectedKnickKnacks > 0
                    ? `Curios & knick-knacks salvaged from pawn shop bins. Occupies 2 space each. You currently own ${uninspectedKnickKnacks} curio(s) pending weekend appraisal.`
                    : `Curios & knick-knacks salvaged from pawn shop bins. Occupies 2 space each. You currently have ${knickKnacks} on display.`))
            : (isBroken
                ? 'Broken down and in need of maintenance. Choose a repair option below to restore functionality, or throw it out.'
                : (isNew 
                    ? 'Purchased brand new from Socket City. Clean and pristine working condition.'
                    : (durable.isBook ? 'Reference book in your apartment collection.' : 'Second-hand from Z-Mart or Pawn Shop. Fully functional and broken-in.')))));

  // Fluff descriptions for durables:
  const getFluffDescription = (id: string, isBook?: boolean): string => {
    if (isBook) {
      switch (id) {
        case 'encyclopedia':
          return 'Volumes of comprehensive human knowledge and history. Browsing its entries permanently expands your mental capacity.';
        case 'dictionary':
          return 'Mastery over language, definitions, and rhetoric. Enhances your cognitive precision and maximum intellect.';
        case 'atlas':
          return 'Detailed cartography and geopolitical charts of the world. Expands your worldview and cognitive reserves.';
        case 'capote':
          return "An anthology of Truman Capote's literary masterpieces. Engaging and provocative prose that expands your cognitive capacity.";
        default:
          return 'Engaging literature and reference material. Reading sharpens your mind and grants permanent cognitive capacity.';
      }
    }

    switch (id) {
      case 'refrigerator':
        return 'Keeps your groceries crisp, fresh, and safe from spoilage. Essential for staying well-fed without running out for fast food every night.';
      case 'freezer':
        return 'Sub-zero preservation giving you unmatched food security. Keep plenty of backup provisions stored away safely.';
      case 'stove':
        return 'A hot home-cooked meal works wonders after a grueling day on the clock. Restores extra physical energy when you relax.';
      case 'microwave':
        return 'Warm up a hearty meal in sixty seconds flat. Quick, ultra-convenient sustenance for the busy urban climber.';
      case 'color_tv':
        return 'Vibrant late-night sitcoms, weekend sports, and entertainment. The living room centerpiece that charms any guest you host.';
      case 'bw_tv':
        return 'A vintage cathode-ray television. Humble black-and-white broadcasts that still bring people together for an evening show.';
      case 'stereo':
        return 'Crank the volume and fill the apartment with your favorite tunes. Sets an upbeat, festive mood whenever you entertain.';
      case '8track':
        return 'A vintage 8-track magnetic tape player. Plays your favorite classic jams with humble fidelity to get the party started.';
      case 'vcr':
        return 'Pop in a video cassette for a cozy movie night. Classic Hollywood cinema right from the comfort of your own couch.';
      case 'spare_parts':
        return 'A box of assorted gears, fuses, and machine screws. Greatly increases your chances of successful DIY appliance repair (+20% to +30%).';
      case 'knick_knack':
      case 'knick_knacks':
        return 'A unique curio or collectible trinket salvaged from the pawn shop rummage bins. Adds aesthetic charm to your apartment.';
      case 'hot_tub':
        return 'The pinnacle of home luxury. Steam away physical fatigue and mental burnout while impressing everyone who visits.';
      case 'computer':
        return 'High-performance microcomputer workstation. Expands your intellectual horizons and unlocks greater mental potential.';
      default:
        return 'A quality piece of home furnishings that elevates your standard of living and makes your apartment feel like home.';
    }
  };

  // Compile mechanical effects:
  const effectBadges: string[] = [];
  if (itemDef?.effects) {
    for (const eff of itemDef.effects) {
      if (eff.trigger === 'on_relax') {
        if (eff.stat === 'physical') effectBadges.push(`+${eff.value} 💪 On Relax`);
        else if (eff.stat === 'mental') effectBadges.push(`+${eff.value} 🧠 On Relax`);
        else if (eff.stat === 'mess') effectBadges.push(`+${eff.value} 🧹 Mess On Relax`);
      } else if (eff.trigger === 'on_socialize') {
        if (eff.stat === 'social') effectBadges.push(`+${eff.value} 👥 On Socialize`);
      } else if (eff.trigger === 'continuous' && eff.stat === 'mental_max') {
        effectBadges.push(`+${eff.value} Max 🧠 (Continuous)`);
      } else if (eff.trigger === 'turn_start') {
        effectBadges.push(`+${eff.value} ${eff.stat === 'physical' ? '💪' : '🧠'} Every Turn`);
      }
    }
  }
  if (itemDef?.tags?.includes('refrigerator')) {
    effectBadges.push('🧊 Preserves Fresh Food');
  }
  if (itemDef?.tags?.includes('computer')) {
    effectBadges.push('💻 R&D and Income Potential');
  }
  if (!rules?.usePhysicalMentalConditions && itemDef?.happinessBonus && effectBadges.length === 0) {
    effectBadges.push(`+${itemDef.happinessBonus} 😊 Happiness`);
  }

  if (isSpareParts) {
    effectBadges.push('+20% to +30% DIY Repair');
  }
  if (isCurio) {
    if (rules?.usePhysicalMentalConditions) {
      const curioLifestyle = Math.min(15, Math.floor(2.8 * Math.sqrt(totalCurios || 1)));
      effectBadges.push(`🏺 Lifestyle Synergy (+${curioLifestyle})`);
      effectBadges.push('📈 2.8 × √Count (Max +15)');
      effectBadges.push('+1 🧠 Turn Novelty (First Curio)');
      effectBadges.push('🎲 Weekend Appraisal (40% Decor, 40% Mental, 20% Cash)');
    } else {
      effectBadges.push('+1 😊 Happiness');
      effectBadges.push('🏺 Curio Collection');
    }
  }

  const hasTv = player?.inventory.appliances.some(a => (a.id === 'color_tv' || a.id === 'bw_tv') && !a.isBroken);
  const isVcrWithoutTv = durable.id === 'vcr' && isOwned && !hasTv;
  if (isVcrWithoutTv) {
    effectBadges.push('⚠️ Requires TV (Inactive)');
  }

  const spaceCost = isSpareParts || isCurio ? 2 : (itemDef?.space ?? 0);
  const lifestyleVal = isVcrWithoutTv ? 0 : (isCurio ? Math.min(15, Math.floor(2.8 * Math.sqrt(totalCurios))) : (itemDef?.lifestyleValue ?? 0));

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div 
      data-testid="durable-card-modal-backdrop"
      className="durable-card-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
          maxWidth: '340px',
          borderRadius: '16px',
          border: isBroken
            ? '2px solid #ef4444'
            : `2px solid ${isNew ? '#2ecc71' : '#3498db'}`,
          boxShadow: isBroken
            ? '0 0 25px rgba(239, 68, 68, 0.4), 0 10px 30px rgba(0,0,0,0.8)'
            : (isNew 
              ? '0 0 25px rgba(46, 204, 113, 0.4), 0 10px 30px rgba(0,0,0,0.8)' 
              : '0 0 25px rgba(52, 152, 219, 0.4), 0 10px 30px rgba(0,0,0,0.8)'),
          background: 'linear-gradient(165deg, #161b2e 0%, #0d111d 100%)',
          padding: '20px',
          color: '#fff',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {/* Top Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 'bold',
            letterSpacing: '0.08em',
            padding: '3px 8px',
            borderRadius: '6px',
            backgroundColor: durable.isBook ? 'rgba(155, 89, 182, 0.2)' : 'rgba(52, 152, 219, 0.2)',
            color: durable.isBook ? '#d7bde2' : '#aed6f1',
            border: `1px solid ${durable.isBook ? '#9b59b6' : '#3498db'}`
          }}>
            {durable.isBook ? '📚 BOOK' : '🛋️ APPLIANCE'}
          </span>

          <span style={{
            fontSize: '0.75rem',
            fontWeight: 'bold',
            padding: '3px 10px',
            borderRadius: '12px',
            backgroundColor: isBroken
              ? 'rgba(239, 68, 68, 0.25)'
              : (isNew ? 'rgba(46, 204, 113, 0.2)' : 'rgba(52, 152, 219, 0.2)'),
            color: isBroken
              ? '#ef4444'
              : (isNew ? '#2ecc71' : '#5dade2'),
            border: `1px solid ${isBroken ? '#ef4444' : (isNew ? '#2ecc71' : '#3498db')}`
          }}>
            {conditionLabel}
          </span>
        </div>

        {/* Artwork Frame */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100px',
          borderRadius: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)'
        }}>
          <img 
            src={`/assets/raw_images/${durable.id}.png`} 
            alt={itemName}
            style={{ 
              maxWidth: '80px', 
              maxHeight: '80px', 
              objectFit: 'contain',
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.7))'
            }}
            onError={(e) => { 
              (e.target as HTMLImageElement).style.display = 'none'; 
            }}
          />
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', fontWeight: 'bold' }}>
            {itemName}
          </h3>
          <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '3px' }}>
            {conditionDetail}
          </div>
        </div>

        {/* Fluff Narrative */}
        <p style={{
          fontSize: '0.84rem',
          lineHeight: '1.45',
          color: '#cbd5e1',
          fontStyle: 'italic',
          textAlign: 'center',
          margin: 0,
          padding: '0 4px'
        }}>
          "{getFluffDescription(durable.id, durable.isBook)}"
        </p>

        {/* Specs & Effect Chips */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.35)',
          padding: '10px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#aaa', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '4px' }}>
            <span>Space: <strong style={{ color: '#00e5ff' }}>{spaceCost} space</strong></span>
            {lifestyleVal > 0 && <span>Lifestyle: <strong style={{ color: '#f1c40f' }}>+{lifestyleVal}</strong></span>}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
            {effectBadges.map((badge, idx) => (
              <span 
                key={idx}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  color: isBroken ? '#94a3b8' : '#2ecc71',
                  textDecoration: isBroken ? 'line-through' : 'none',
                  background: isBroken ? 'rgba(148, 163, 184, 0.1)' : 'rgba(46, 204, 113, 0.12)',
                  border: `1px solid ${isBroken ? 'rgba(148, 163, 184, 0.25)' : 'rgba(46, 204, 113, 0.3)'}`,
                  borderRadius: '4px',
                  padding: '2px 6px'
                }}
              >
                {badge}
              </span>
            ))}
            {isBroken && effectBadges.length > 0 && (
              <div style={{ fontSize: '0.70rem', color: '#f87171', fontStyle: 'italic', width: '100%', marginTop: '2px' }}>
                ⚠️ Inactive while broken
              </div>
            )}
          </div>
        </div>

        {/* Maintenance / Special Action Hook */}
        {isBroken && isOwned ? (() => {
          const diyBreakdown = player ? calcDiySuccessChance(player, campaign, rules, undefined, durable.id) : { baseChance: 25, techBonus: 0, electronicsBonus: 0, partsBonus: 0, complexityPenalty: 0, totalChance: 25 };
          const hasDiyHours = (player?.hoursRemaining ?? 0) >= 6;
          const curPhys = player?.physicalCondition ?? 50;
          const curMental = player?.mentalCondition ?? 50;
          const hasDiyStamina = !rules?.usePhysicalMentalConditions || (curPhys - 2 >= 1.0 && curMental - 1 >= 1.0);
          const isDiyDisabled = !player || !hasDiyHours || !hasDiyStamina || !onAction;
          const diyDisabledReason = !hasDiyHours ? 'Need 6h' : (!hasDiyStamina ? 'Exhausted' : '');

          const repairCost = calcRepairmanCost(durable.id, economicIndex, campaign);
          const hasRepairHours = (player?.hoursRemaining ?? 0) >= 1;
          const hasRepairMoney = (player?.money ?? 0) >= repairCost;
          const isRepairDisabled = !player || !hasRepairHours || !hasRepairMoney || !onAction;
          const repairDisabledReason = !hasRepairHours ? 'Need 1h' : (!hasRepairMoney ? `Need $${repairCost}` : '');

          const throwMess = calcThrowOutMess(durable.id, campaign);

          return (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '10px 12px'
            }}>
              <div style={{
                fontSize: '0.80rem',
                fontWeight: 'bold',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>🛠️ {t('homeDurable.maintenanceTitle', { defaultValue: 'Appliance Maintenance' })}</span>
                <span style={{ fontSize: '0.70rem', color: '#fca5a5' }}>Choose option:</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#fca5a5', lineHeight: '1.3' }}>
                {t('homeDurable.brokenDesc', { defaultValue: 'This appliance has broken down and does not function until repaired.' })}
              </div>

              {/* 1. DIY Fix */}
              <div style={{
                background: 'rgba(0,0,0,0.35)',
                borderRadius: '8px',
                padding: '8px 10px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '0.82rem', color: '#38bdf8' }}>🔧 DIY Fix</strong>
                  <span style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>{rules?.helpfulUI ? '⏳ 6h | -2 💪 | -1 🧠' : '-2 💪 | -1 🧠'}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#85ffb5', marginBottom: '2px' }}>
                  Success: <strong>{diyBreakdown.totalChance}%</strong> ({diyBreakdown.baseChance}% Base + {diyBreakdown.techBonus}% Tech + {diyBreakdown.electronicsBonus}% Electronics{diyBreakdown.partsBonus ? ` + ${diyBreakdown.partsBonus}% Parts` : ''} - {diyBreakdown.complexityPenalty} Complexity)
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '6px' }}>
                  Success: Restores to Used, +3 🧠, +0.5 Tech Skill • Fail: Remains broken, +0.1 Tech Skill
                </div>
                <button
                  data-action-target="diy-fix"
                  disabled={isDiyDisabled}
                  onClick={() => {
                    onAction?.({ type: 'appliance_maintenance', applianceId: durable.id, option: 'diy' });
                  }}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '6px',
                    border: 'none',
                    background: isDiyDisabled ? '#475569' : '#0284c7',
                    color: isDiyDisabled ? '#94a3b8' : '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '0.78rem',
                    cursor: isDiyDisabled ? 'not-allowed' : 'pointer',
                    boxShadow: isDiyDisabled ? 'none' : '0 2px 8px rgba(2, 132, 199, 0.4)'
                  }}
                >
                  🔧 Attempt DIY Fix {diyDisabledReason ? `(${diyDisabledReason})` : ''}
                </button>
              </div>

              {/* 2. Call Repairman */}
              <div style={{
                background: 'rgba(0,0,0,0.35)',
                borderRadius: '8px',
                padding: '8px 10px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '0.82rem', color: '#c084fc' }}>📞 Call Repairman</strong>
                  <span style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>{rules?.helpfulUI ? `⏳ 1h | $${repairCost}` : `$${repairCost}`}</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '6px' }}>
                  Professional repair. Guaranteed fix, restores to ✨ Brand New condition.
                </div>
                <button
                  data-action-target="call-repairman"
                  disabled={isRepairDisabled}
                  onClick={() => {
                    onAction?.({ type: 'appliance_maintenance', applianceId: durable.id, option: 'repairman' });
                  }}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '6px',
                    border: 'none',
                    background: isRepairDisabled ? '#475569' : '#9333ea',
                    color: isRepairDisabled ? '#94a3b8' : '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '0.78rem',
                    cursor: isRepairDisabled ? 'not-allowed' : 'pointer',
                    boxShadow: isRepairDisabled ? 'none' : '0 2px 8px rgba(147, 51, 234, 0.4)'
                  }}
                >
                  📞 Hire Repairman (${repairCost}) {repairDisabledReason ? `(${repairDisabledReason})` : ''}
                </button>
              </div>

              {/* 3. Throw Out */}
              <div style={{
                background: 'rgba(0,0,0,0.35)',
                borderRadius: '8px',
                padding: '8px 10px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '0.82rem', color: '#f87171' }}>🗑️ Throw Out</strong>
                  <span style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>{rules?.helpfulUI ? '⏳ 0h | Free' : 'Free'}</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '6px' }}>
                  Discards appliance permanently. Leaves +{throwMess} 🧹 Mess in apartment.
                </div>
                <button
                  data-action-target="throw-out-appliance"
                  disabled={!onAction}
                  onClick={() => {
                    onAction?.({ type: 'appliance_maintenance', applianceId: durable.id, option: 'throw_out' });
                    onClose();
                  }}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)'
                  }}
                >
                  🗑️ Throw Out (+{throwMess} Mess)
                </button>
              </div>
            </div>
          );
        })() : isSpareParts ? (
          (player?.inventory.spareParts || 0) > 0 ? (
            <button
              data-testid="btn-discard-spare-parts"
              onClick={() => {
                onAction?.({ type: 'discard_inventory_item', itemType: 'spare_parts', count: 1 });
                onClose();
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)'
              }}
            >
              🗑️ Throw Away 1 Box of Parts (Frees 2 Space)
            </button>
          ) : (
            <div style={{
              padding: '6px 10px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '6px',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              fontSize: '0.72rem',
              color: '#777',
              textAlign: 'center',
              fontStyle: 'italic'
            }}>
              No spare parts in inventory. Find them rummaging at the Pawn Shop.
            </div>
          )
        ) : isCurio ? (
          totalCurios > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
              <button
                data-testid="btn-discard-knick-knacks"
                onClick={() => {
                  onAction?.({ type: 'discard_inventory_item', itemType: 'knick_knacks', count: 1 });
                  onClose();
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)'
                }}
              >
                🗑️ Throw Away 1 Curio (Frees 2 Space)
              </button>
              <div style={{ fontSize: '0.70rem', color: '#94a3b8', textAlign: 'center', lineHeight: '1.3' }}>
                {knickKnacks > 0 && <span>• {knickKnacks} on display shelf (+{Math.min(15, Math.floor(2.8 * Math.sqrt(knickKnacks)))} Lifestyle) </span>}
                {uninspectedKnickKnacks > 0 && <span style={{ color: '#38bdf8' }}>• {uninspectedKnickKnacks} pending weekend appraisal</span>}
              </div>
            </div>
          ) : (
            <div style={{
              padding: '6px 10px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '6px',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              fontSize: '0.72rem',
              color: '#777',
              textAlign: 'center',
              fontStyle: 'italic'
            }}>
              No curios in inventory. Find them rummaging at the Pawn Shop.
            </div>
          )
        ) : (
          <div style={{
            padding: '6px 10px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '6px',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
            fontSize: '0.72rem',
            color: '#777',
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            ⚡ Interactive durable actions coming in a future update
          </div>
        )}

        {/* Close Button */}
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
            transition: 'background-color 0.2s'
          }}
        >
          ✕ Back to Apartment
        </button>
      </div>
    </div>,
    document.body
  );
};
