import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { CampaignBundle } from '../../../engine/dataLoader';
import type { PlayerState, GameRules, OwnedAppliance } from '../../../engine/gameState';
import type { GameAction } from '../../../engine/actions/types';
import { calcDiySuccessChance, calcRepairmanCost, calcThrowOutMess } from '../../../engine/actions/maintenanceActions';
import { MessIcon } from '../../icons/MessIcon';

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

const DEFAULT_APPLIANCE_SPACE: Record<string, number> = {
  refrigerator: 40,
  freezer: 30,
  stove: 40,
  microwave: 20,
  color_tv: 20,
  bw_tv: 20,
  tv: 20,
  stereo: 20,
  '8track': 20,
  vcr: 10,
  computer: 30,
  hot_tub: 50,
  encyclopedia: 20,
  dictionary: 10,
  atlas: 10,
  capote: 10,
  spare_parts: 2,
  knick_knack: 2,
  knick_knacks: 2
};

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

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

  const hasAllBooks = Boolean(
    player?.inventory?.books?.includes('dictionary') &&
    player?.inventory?.books?.includes('encyclopedia') &&
    player?.inventory?.books?.includes('atlas')
  );

  const conditionLabel = !isOwned 
    ? '🏬 Not Owned' 
    : (isSpareParts 
        ? `⚙️ Spare Parts (${player?.inventory.spareParts || 0})` 
        : (isCurio 
            ? `🏺 Curio Collection (${totalCurios})` 
            : (isBroken ? '⚠️ BROKEN' : (isNew ? '✨ Brand New' : (durable.isBook ? '📚 Book' : '📦 Used')))));
  const conditionDetail = !isOwned
    ? (durable.isBook 
        ? 'Available at Socket City / Z-Mart. Reference literature for your apartment.'
        : (isCurio
            ? 'Available at Pawn Shop rummage bins. Furnish your home shelves to gain aesthetic charm!'
            : (isSpareParts
                ? 'Available at Pawn Shop rummage bins. Keep a box handy to boost your DIY appliance repair odds!'
                : 'Available at Socket City (Brand New) or Z-Mart & Pawn Shop (Used). Furnish your home to gain its perks!')))
    : (isSpareParts
        ? (rules?.spaceCapping 
            ? `Assorted repair materials from pawn shop rummage bins. Occupies 2 space per box. You currently own ${player?.inventory.spareParts || 0} box(es).`
            : `Assorted repair materials from pawn shop rummage bins. You currently own ${player?.inventory.spareParts || 0} box(es).`)
        : (isCurio
            ? (rules?.spaceCapping
                ? (uninspectedKnickKnacks > 0 && knickKnacks > 0
                    ? `Curios & knick-knacks salvaged from pawn shop bins. Occupies 2 space each. You currently own ${totalCurios} curio(s) (${knickKnacks} on display, ${uninspectedKnickKnacks} pending weekend appraisal).`
                    : (uninspectedKnickKnacks > 0
                        ? `Curios & knick-knacks salvaged from pawn shop bins. Occupies 2 space each. You currently own ${uninspectedKnickKnacks} curio(s) pending weekend appraisal.`
                        : `Curios & knick-knacks salvaged from pawn shop bins. Occupies 2 space each. You currently have ${knickKnacks} on display.`))
                : (uninspectedKnickKnacks > 0 && knickKnacks > 0
                    ? `Curios & knick-knacks salvaged from pawn shop bins. You currently own ${totalCurios} curio(s) (${knickKnacks} on display, ${uninspectedKnickKnacks} pending weekend appraisal).`
                    : (uninspectedKnickKnacks > 0
                        ? `Curios & knick-knacks salvaged from pawn shop bins. You currently own ${uninspectedKnickKnacks} curio(s) pending weekend appraisal.`
                        : `Curios & knick-knacks salvaged from pawn shop bins. You currently have ${knickKnacks} on display.`)))
            : (isBroken
                ? 'Broken down and in need of maintenance. Choose a repair option below to restore functionality, or throw it out.'
                : (isNew 
                    ? 'Purchased brand new from Socket City. Clean and pristine working condition.'
                    : (durable.isBook ? 'Reference book in your apartment collection.' : 'Second-hand from Z-Mart or Pawn Shop. Fully functional and broken-in.')))));

  // Gameplay descriptions for durables:
  const getGameplayDescription = (id: string, isBook?: boolean): string => {
    if (isBook) {
      const isRefBook = id === 'dictionary' || id === 'encyclopedia' || id === 'atlas';
      const synergyText = 'Part of the 3-book Reference Library (Dictionary, Encyclopedia, Atlas): owning all 3 grants a bonus study credit (-1 lesson required) for university degrees.';

      if (id === 'dictionary') {
        return rules?.usePhysicalMentalConditions
          ? `Language and vocabulary reference. ${synergyText} Continuously increases Max Mental capacity (+1).`
          : `Language and vocabulary reference. ${synergyText}`;
      }
      if (id === 'encyclopedia') {
        return rules?.usePhysicalMentalConditions
          ? `Comprehensive general knowledge reference set. ${synergyText} Continuously increases Max Mental capacity (+1).`
          : `Comprehensive general knowledge reference set. ${synergyText}`;
      }
      if (id === 'atlas') {
        return rules?.usePhysicalMentalConditions
          ? `World maps and geopolitical cartography. ${synergyText} Continuously increases Max Mental capacity (+1).`
          : `World maps and geopolitical cartography. ${synergyText}`;
      }
      if (id === 'capote') {
        return rules?.usePhysicalMentalConditions
          ? 'Literary prose anthology. Continuously increases Max Mental capacity (+1).'
          : 'Literary prose anthology. Reference literature for your home collection.';
      }
      return isRefBook ? synergyText : 'Reference literature for your home apartment.';
    }

    switch (id) {
      case 'refrigerator':
        return 'Prevents fresh grocery spoilage for up to 6 food units at turn end. Without a refrigerator, unpreserved food rots into mess.';
      case 'freezer':
        return 'Expands food preservation capacity from 6 up to 12 units per turn. Requires an active Refrigerator to function; does not prevent spoilage on its own.';
      case 'stove':
        return rules?.usePhysicalMentalConditions
          ? 'Cook hot meals at home. Restores +1 Physical when relaxing.'
          : 'Cook hot meals at home. Awards +1 Happiness every turn.';
      case 'microwave':
        return rules?.usePhysicalMentalConditions
          ? 'Quickly reheat meals. Restores +1 Physical when relaxing and +1 Social when socializing.'
          : 'Quickly reheat meals. Awards +1 Happiness every turn.';
      case 'color_tv':
        return rules?.usePhysicalMentalConditions
          ? 'Color television set. Boosts guest socializing (+2 Social) and enhances apartment lifestyle.'
          : 'Color television set. Living room entertainment for your apartment.';
      case 'bw_tv':
        return rules?.usePhysicalMentalConditions
          ? 'Vintage black-and-white television. Boosts guest socializing (+1 Social) and enables VCR socializing synergy.'
          : 'Vintage black-and-white television. Affordable living room entertainment.';
      case 'vcr':
        return rules?.usePhysicalMentalConditions
          ? 'Home video cassette recorder. Pairs with an active TV (Color or B&W) to boost weekend socializing (+1 Social) and lifestyle.'
          : 'Home video cassette recorder for movie playback.';
      case 'stereo':
      case '8track':
        return rules?.usePhysicalMentalConditions
          ? 'Home audio music player. Boosts guest socializing (+1 Social) and elevates apartment lifestyle.'
          : 'Home audio music player. Plays music throughout your apartment.';
      case 'computer':
        return rules?.usePhysicalMentalConditions
          ? 'Personal microcomputer workstation. Awards a bonus credit when studying for university degrees (-1 lesson required), expands Max Mental (+3), and offers a chance each turn for freelance income ($10–$150).'
          : 'Personal microcomputer workstation. Awards a bonus credit when studying for university degrees (-1 lesson required), plus a chance each turn for freelance income ($10–$150).';
      case 'hot_tub':
        return rules?.usePhysicalMentalConditions
          ? 'Pinnacle home luxury. Prevents relaxation decay from dropping to dangerously low levels, restores condition each turn, and adds major lifestyle prestige.'
          : 'Pinnacle home luxury. Prevents natural relaxation decay from dropping below critical medical illness threshold.';
      case 'spare_parts':
        return rules?.spaceCapping
          ? 'Assorted machine parts from pawn shop rummage bins. Kept in your apartment to boost DIY appliance repair success rates by +20% to +30%. Occupies 2 space per box.'
          : 'Assorted machine parts from pawn shop rummage bins. Kept in your apartment to boost DIY appliance repair success rates by +20% to +30%.';
      case 'knick_knack':
      case 'knick_knacks':
        return rules?.usePhysicalMentalConditions
          ? 'Collectibles salvaged from pawn shop rummage bins. Furnishes aesthetic charm (+2.8 × √Count, max +15) and triggers weekend appraisal events.'
          : 'Collectibles salvaged from pawn shop rummage bins. Unique knick-knacks for your home shelves.';
      default:
        return 'A quality piece of home furnishings that elevates your standard of living and makes your apartment feel like home.';
    }
  };

  // Compile mechanical effects:
  interface EffectBadge {
    label: React.ReactNode;
    isOneTime?: boolean;
  }
  const effectBadges: EffectBadge[] = [];

  // Core gameplay appliance mechanics:
  if (durable.id === 'refrigerator') {
    effectBadges.push({ label: '🧊 Preserves up to 6 Fresh Food/turn' });
  } else if (durable.id === 'freezer') {
    effectBadges.push({ label: '🧊 Stores up to 12 Food (Needs Refrigerator)' });
    if (!rules?.usePhysicalMentalConditions && itemDef?.happinessBonus) {
      effectBadges.push({ label: `🎁 One-time: +${itemDef.happinessBonus} 😊 on buy`, isOneTime: true });
    }
  } else if (durable.id === 'stove') {
    if (!rules?.usePhysicalMentalConditions) {
      effectBadges.push({ label: '🍳 +1 😊/turn' });
    }
  } else if (durable.id === 'microwave') {
    if (!rules?.usePhysicalMentalConditions) {
      effectBadges.push({ label: '⚡ +1 😊/turn' });
    }
  } else if (durable.id === 'computer') {
    effectBadges.push({ label: '🎓 Bonus Study Credit (-1 Lesson)' });
    effectBadges.push({ label: '💻 Freelance Income ($10–$150/turn chance)' });
    if (!rules?.usePhysicalMentalConditions && itemDef?.happinessBonus) {
      effectBadges.push({ label: `🎁 One-time: +${itemDef.happinessBonus} 😊 on buy`, isOneTime: true });
    }
  } else if (durable.id === 'hot_tub') {
    effectBadges.push({ label: '🛁 Prevents relaxation collapse' });
    if (!rules?.usePhysicalMentalConditions && itemDef?.happinessBonus) {
      effectBadges.push({ label: `🎁 One-time: +${itemDef.happinessBonus} 😊 on buy`, isOneTime: true });
    }
  }

  // Reference book 3-book set synergy (Dictionary, Encyclopedia, Atlas):
  if (durable.isBook && (durable.id === 'dictionary' || durable.id === 'encyclopedia' || durable.id === 'atlas')) {
    effectBadges.push({
      label: hasAllBooks 
        ? '📚 3-Book Synergy: -1 Lesson (Active)' 
        : '📚 3-Book Synergy: -1 Lesson (Needs All 3)'
    });
  }

  // Stat triggers from effects list:
  if (itemDef?.effects) {
    for (const eff of itemDef.effects) {
      if (eff.trigger === 'on_relax') {
        if (eff.stat === 'physical') effectBadges.push({ label: `+${eff.value} 💪 On Relax` });
        else if (eff.stat === 'mental') effectBadges.push({ label: `+${eff.value} 🧠 On Relax` });
        else if (eff.stat === 'mess') effectBadges.push({
          label: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              +{eff.value} <MessIcon /> On Relax
            </span>
          )
        });
      } else if (eff.trigger === 'on_socialize') {
        if (eff.stat === 'social') effectBadges.push({ label: `+${eff.value} 👥 On Socialize` });
      } else if (eff.trigger === 'continuous' && eff.stat === 'mental_max') {
        effectBadges.push({ label: `+${eff.value} Max 🧠 (Continuous)` });
      } else if (eff.trigger === 'turn_start') {
        effectBadges.push({ label: `+${eff.value} ${eff.stat === 'physical' ? '💪' : '🧠'} Every Turn` });
      }
    }
  }

  // Fallback one-time happiness bonus for classic items in Base mode:
  if (
    !rules?.usePhysicalMentalConditions &&
    itemDef?.happinessBonus &&
    durable.id !== 'freezer' &&
    durable.id !== 'stove' &&
    durable.id !== 'microwave' &&
    durable.id !== 'computer' &&
    durable.id !== 'hot_tub' &&
    !effectBadges.some(b => b.isOneTime)
  ) {
    effectBadges.push({ label: `🎁 One-time: +${itemDef.happinessBonus} 😊 on buy`, isOneTime: true });
  }

  if (isSpareParts) {
    effectBadges.push({ label: '+20% to +30% DIY Repair' });
  }
  if (isCurio) {
    if (rules?.usePhysicalMentalConditions) {
      const curioLifestyle = Math.min(15, Math.floor(2.8 * Math.sqrt(totalCurios || 1)));
      effectBadges.push({ label: `🏺 Lifestyle Synergy (+${curioLifestyle})` });
      effectBadges.push({ label: '📈 2.8 × √Count (Max +15)' });
      effectBadges.push({ label: '+1 🧠 Turn Novelty (First Curio)' });
      effectBadges.push({ label: '🎲 Weekend Appraisal (Decor/Mental/Cash)' });
    } else {
      effectBadges.push({ label: '+1 😊 Happiness' });
      effectBadges.push({ label: '🏺 Curio Collection' });
    }
  }

  const hasTv = player?.inventory.appliances.some(a => (a.id === 'color_tv' || a.id === 'bw_tv') && !a.isBroken);
  const isVcrWithoutTv = durable.id === 'vcr' && isOwned && !hasTv;
  if (durable.id === 'vcr' && isVcrWithoutTv && rules?.usePhysicalMentalConditions) {
    effectBadges.push({ label: '⚠️ Requires TV (Inactive)' });
  }

  const spaceCost = isSpareParts || isCurio
    ? 2
    : ((itemDef?.space && itemDef.space > 0) ? itemDef.space : (DEFAULT_APPLIANCE_SPACE[durable.id] ?? (durable.isBook ? 10 : 20)));
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
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '12px',
        boxSizing: 'border-box'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '320px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '14px',
          border: isBroken
            ? '2px solid #ef4444'
            : `2px solid ${isNew ? '#2ecc71' : '#3498db'}`,
          boxShadow: isBroken
            ? '0 0 25px rgba(239, 68, 68, 0.4), 0 10px 30px rgba(0,0,0,0.8)'
            : (isNew 
              ? '0 0 25px rgba(46, 204, 113, 0.4), 0 10px 30px rgba(0,0,0,0.8)' 
              : '0 0 25px rgba(52, 152, 219, 0.4), 0 10px 30px rgba(0,0,0,0.8)'),
          background: 'linear-gradient(165deg, #161b2e 0%, #0d111d 100%)',
          padding: '12px 14px',
          color: '#fff',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {/* Top-Right Dismiss Button */}
        <button
          type="button"
          data-testid="btn-close-durable-card"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '8px',
            right: '10px',
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            padding: '4px',
            lineHeight: 1,
            zIndex: 10
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
        >
          ✕
        </button>
        {/* Top Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '22px' }}>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 'bold',
            letterSpacing: '0.08em',
            padding: '2px 6px',
            borderRadius: '5px',
            backgroundColor: durable.isBook ? 'rgba(155, 89, 182, 0.2)' : 'rgba(52, 152, 219, 0.2)',
            color: durable.isBook ? '#d7bde2' : '#aed6f1',
            border: `1px solid ${durable.isBook ? '#9b59b6' : '#3498db'}`
          }}>
            {durable.isBook ? '📚 BOOK' : '🛋️ APPLIANCE'}
          </span>

          <span style={{
            fontSize: '0.70rem',
            fontWeight: 'bold',
            padding: '2px 8px',
            borderRadius: '10px',
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
          height: '56px',
          borderRadius: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)'
        }}>
          <img 
            src={`/assets/raw_images/${durable.id}.png`} 
            alt={itemName}
            style={{ 
              maxWidth: '48px', 
              maxHeight: '48px', 
              objectFit: 'contain',
              filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.7))'
            }}
            onError={(e) => { 
              (e.target as HTMLImageElement).style.display = 'none'; 
            }}
          />
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: 'bold' }}>
            {itemName}
          </h3>
          <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '2px' }}>
            {conditionDetail}
          </div>
        </div>

        {/* Gameplay Mechanic Narrative */}
        <p style={{
          fontSize: '0.76rem',
          lineHeight: '1.35',
          color: '#cbd5e1',
          textAlign: 'center',
          margin: 0,
          padding: '0 2px'
        }}>
          {getGameplayDescription(durable.id, durable.isBook)}
        </p>

        {/* Specs & Effect Chips */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.35)',
          padding: '8px 10px',
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px'
        }}>
          {(Boolean(rules?.spaceCapping) || Boolean(lifestyleVal > 0 && rules?.usePhysicalMentalConditions)) && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#aaa',
              borderBottom: effectBadges.length > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              paddingBottom: '3px'
            }}>
              {rules?.spaceCapping ? (
                <span>Space: <strong style={{ color: '#00e5ff' }}>{spaceCost} space</strong></span>
              ) : <span />}
              {lifestyleVal > 0 && rules?.usePhysicalMentalConditions && (
                <span>Lifestyle: <strong style={{ color: '#f1c40f' }}>+{lifestyleVal}</strong></span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
            {effectBadges.map((badge, idx) => (
              <span 
                key={idx}
                style={{
                  fontSize: '0.70rem',
                  fontWeight: 'bold',
                  color: isBroken ? '#94a3b8' : (badge.isOneTime ? '#facc15' : '#2ecc71'),
                  textDecoration: isBroken ? 'line-through' : 'none',
                  background: isBroken 
                    ? 'rgba(148, 163, 184, 0.1)' 
                    : (badge.isOneTime ? 'rgba(250, 204, 21, 0.12)' : 'rgba(46, 204, 113, 0.12)'),
                  border: `1px solid ${isBroken ? 'rgba(148, 163, 184, 0.25)' : (badge.isOneTime ? 'rgba(250, 204, 21, 0.3)' : 'rgba(46, 204, 113, 0.3)')}`,
                  borderRadius: '4px',
                  padding: '2px 5px'
                }}
              >
                {badge.label}
              </span>
            ))}
            {isBroken && effectBadges.length > 0 && (
              <div style={{ fontSize: '0.68rem', color: '#f87171', fontStyle: 'italic', width: '100%', marginTop: '2px' }}>
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
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
                  <span>Discards appliance permanently. Leaves +{throwMess}</span>
                  <MessIcon />
                  <span>in apartment.</span>
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
        ) : null}

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            padding: '7px 12px',
            backgroundColor: '#334155',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '0.78rem',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            marginTop: '2px'
          }}
        >
          ✕ Back to Apartment
        </button>
      </div>
    </div>,
    document.body
  );
};
