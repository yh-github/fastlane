import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerState, GameRules } from '../../engine/gameState';
import type { CampaignBundle } from '../../engine/dataLoader';
import { calcEconomyPrice } from '../../engine/economyEngine';
import { formatHours } from '../../engine/statMath';

interface HospitalServicesProps {
  player: PlayerState;
  onAction: (action: any) => Promise<any>;
  economicIndex?: number;
  rules?: GameRules;
  campaign?: CampaignBundle;
}

export const HospitalServices: React.FC<HospitalServicesProps> = ({
  player,
  onAction,
  economicIndex = 0,
  rules
}) => {
  const { t } = useTranslation();

  const isHospitalStaff = Boolean(
    rules?.hospitalEmployeeHealthcare && player.currentJobId?.startsWith('hospital_')
  );

  const curPhys = player.physicalCondition ?? 50;
  const maxMental = player.mentalConditionMax ?? 65;

  // Prices
  const urgentCareBase = isHospitalStaff ? 40 : 80;
  const urgentCareCost = calcEconomyPrice(urgentCareBase, economicIndex);

  const therapyBase = isHospitalStaff ? 60 : 120;
  const therapyCost = calcEconomyPrice(therapyBase, economicIndex);

  const cafeteriaBase = isHospitalStaff ? 12 : 20;
  const cafeteriaCost = calcEconomyPrice(cafeteriaBase, economicIndex);

  // Status flags
  const hasDonatedBlood = Boolean(player.turnFlags?.donatedBloodThisTurn);
  const isTooWeakToDonate = curPhys < 20;
  const hasAteCafeteria = Boolean(player.turnFlags?.ateHospitalCafeteriaThisTurn);

  // Proportional Urgent Care preview
  let urgentCareTierText = '';
  if (curPhys < 20) {
    urgentCareTierText = t('hospital.urgentCareCriticalPreview', {
      defaultValue: 'Critical Triage: Emergency IV & stabilization (+8 to +12 Physical, repairs Max Physical)'
    });
  } else if (curPhys < 35) {
    urgentCareTierText = t('hospital.urgentCareModeratePreview', {
      defaultValue: 'Restorative Care: Prescription therapy & clinical rest (+5 Physical)'
    });
  } else {
    urgentCareTierText = t('hospital.urgentCareHealthyPreview', {
      defaultValue: 'Routine Consultation: Minor observation (+1 Physical)'
    });
  }

  return (
    <div className="interaction-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {isHospitalStaff && (
        <div style={{
          padding: '8px 12px',
          background: 'rgba(56, 189, 248, 0.12)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: '#38bdf8'
        }}>
          <span>🩺</span>
          <strong>{t('hospital.staffPerkActive', { defaultValue: 'Hospital Staff Benefit: 50% discount on urgent care & counseling, 40% discount on cafeteria!' })}</strong>
        </div>
      )}

      {/* 1. Walk-in Urgent Care */}
      <div style={{
        padding: '12px 14px',
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid #334155',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.2rem' }}>🩺</span>
            <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>
              {t('hospital.urgentCareTitle', { defaultValue: 'Walk-in Urgent Care' })}
            </strong>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '3px' }}>
            ⏳ {formatHours(6)} • 💰 ${urgentCareCost} {isHospitalStaff ? `(${t('hospital.staffRate', { defaultValue: 'Staff Rate' })})` : ''}
          </div>
          <div style={{
            fontSize: '0.78rem',
            color: curPhys < 20 ? '#f87171' : (curPhys < 35 ? '#fbbf24' : '#94a3b8'),
            marginTop: '4px',
            fontStyle: 'italic'
          }}>
            {urgentCareTierText}
          </div>
        </div>
        <button
          type="button"
          className="game-button btn-primary"
          disabled={player.hoursRemaining < 6 || player.money < urgentCareCost}
          onClick={() => onAction({ type: 'hospital_urgent_care' })}
          style={{ whiteSpace: 'nowrap', padding: '8px 14px', fontSize: '0.85rem' }}
        >
          {t('hospital.urgentCareBtn', { defaultValue: 'Receive Care' })} (${urgentCareCost})
        </button>
      </div>

      {/* 2. Psychiatric Counseling */}
      <div style={{
        padding: '12px 14px',
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid #334155',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.2rem' }}>🧠</span>
            <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>
              {t('hospital.therapyTitle', { defaultValue: 'Psychiatric Counseling' })}
            </strong>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '3px' }}>
            ⏳ {formatHours(6)} • 💰 ${therapyCost} {isHospitalStaff ? `(${t('hospital.staffRate', { defaultValue: 'Staff Rate' })})` : ''}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#c084fc', marginTop: '4px' }}>
            {t('hospital.therapyDesc', { defaultValue: 'Clinical cognitive therapy. Permanently expands cognitive capacity (+1 Max Mental) and restores +3 Mental.' })}
          </div>
        </div>
        <button
          type="button"
          className="game-button btn-secondary"
          disabled={player.hoursRemaining < 6 || player.money < therapyCost || maxMental >= 100}
          onClick={() => onAction({ type: 'hospital_therapy' })}
          style={{ whiteSpace: 'nowrap', padding: '8px 14px', fontSize: '0.85rem' }}
        >
          {t('hospital.therapyBtn', { defaultValue: 'Attend Session' })} (${therapyCost})
        </button>
      </div>

      {/* 3. Blood Donation */}
      <div style={{
        padding: '12px 14px',
        background: 'rgba(255, 255, 255, 0.04)',
        border: hasDonatedBlood ? '1px solid #22c55e' : (isTooWeakToDonate ? '1px solid #f87171' : '1px solid #334155'),
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.2rem' }}>🩸</span>
            <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>
              {t('hospital.bloodDonationTitle', { defaultValue: 'Emergency Blood Donation' })}
            </strong>
            {hasDonatedBlood && (
              <span style={{ fontSize: '10px', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                {t('hospital.donatedBadge', { defaultValue: '✓ Donated this week' })}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '3px' }}>
            ⏳ {formatHours(2)} • 💰 <strong style={{ color: '#4ade80' }}>+$40 Cash Payout</strong> • -3 Physical • +1 Social
          </div>
          <div style={{ fontSize: '0.78rem', color: isTooWeakToDonate ? '#f87171' : '#94a3b8', marginTop: '4px' }}>
            {isTooWeakToDonate
              ? t('hospital.tooWeakToDonate', { defaultValue: '⚠️ Too weak to donate. Requires Physical Condition >= 20.' })
              : t('hospital.bloodDonationDesc', { defaultValue: 'Emergency cash relief for healthy donors. Includes free juice & cookie.' })}
          </div>
        </div>
        <button
          type="button"
          className="game-button"
          disabled={player.hoursRemaining < 2 || hasDonatedBlood || isTooWeakToDonate}
          onClick={() => onAction({ type: 'hospital_donate_blood' })}
          style={{
            whiteSpace: 'nowrap',
            padding: '8px 14px',
            fontSize: '0.85rem',
            background: hasDonatedBlood ? 'rgba(255,255,255,0.1)' : 'rgba(239, 68, 68, 0.25)',
            border: '1px solid rgba(239, 68, 68, 0.6)',
            color: hasDonatedBlood ? '#94a3b8' : '#fca5a5'
          }}
        >
          {hasDonatedBlood
            ? t('hospital.donatedBtn', { defaultValue: 'Donated' })
            : t('hospital.donateBloodBtn', { defaultValue: 'Donate Blood (+$40)' })}
        </button>
      </div>

      {/* 4. Hospital Cafeteria */}
      <div style={{
        padding: '12px 14px',
        background: 'rgba(255, 255, 255, 0.04)',
        border: hasAteCafeteria ? '1px solid #22c55e' : '1px solid #334155',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.2rem' }}>🍲</span>
            <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>
              {t('hospital.cafeteriaTitle', { defaultValue: 'Basement Cafeteria' })}
            </strong>
            {hasAteCafeteria && (
              <span style={{ fontSize: '10px', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                {t('hospital.cafeteriaFedBadge', { defaultValue: '✓ Fed for the week' })}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '3px' }}>
            ⏳ {formatHours(1)} • 💰 ${cafeteriaCost} {isHospitalStaff ? `(${t('hospital.staffRate', { defaultValue: 'Staff Rate' })})` : ''} • +1 Physical • -2 Mental
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
            {t('hospital.cafeteriaDesc', { defaultValue: 'Convenient institutional steam-table meal. Prevents weekend starvation without refrigerator or groceries.' })}
          </div>
        </div>
        <button
          type="button"
          className="game-button btn-secondary"
          disabled={player.hoursRemaining < 1 || player.money < cafeteriaCost || hasAteCafeteria}
          onClick={() => onAction({ type: 'hospital_cafeteria' })}
          style={{ whiteSpace: 'nowrap', padding: '8px 14px', fontSize: '0.85rem' }}
        >
          {hasAteCafeteria
            ? t('hospital.cafeteriaFedBtn', { defaultValue: 'Fed' })
            : `${t('hospital.cafeteriaBtn', { defaultValue: 'Buy Meal Tray' })} ($${cafeteriaCost})`}
        </button>
      </div>
    </div>
  );
};
