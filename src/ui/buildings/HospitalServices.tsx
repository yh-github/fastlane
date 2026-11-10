import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [isTreatmentsModalOpen, setIsTreatmentsModalOpen] = useState(false);

  useEffect(() => {
    if (!isTreatmentsModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        setIsTreatmentsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isTreatmentsModalOpen]);

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

  // Cafeteria base fee is $40 (staff only)
  const cafeteriaBase = 40;
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
          <strong>{t('hospital.staffPerkActive', { defaultValue: 'Hospital Staff Benefit: 50% discount on urgent care & counseling, exclusive access to staff cafeteria!' })}</strong>
        </div>
      )}

      {/* 1. Combined Clinical Treatments Button */}
      <div 
        data-testid="hospital-treatments-panel"
        style={{
          padding: '12px 14px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid #334155',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1.2rem' }}>🩺</span>
            <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>
              {t('hospital.treatmentsModalTitle', { defaultValue: 'Hospital Clinical Treatments' })}
            </strong>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '3px' }}>
            {t('hospital.treatmentsModalSubtitle', { defaultValue: 'Select between Physical Triage & Restorative Care or Psychiatric Counseling.' })}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#38bdf8', marginTop: '4px' }}>
            {curPhys < 35 ? (
              <span style={{ color: curPhys < 20 ? '#f87171' : '#fbbf24' }}>
                ⚠️ {curPhys < 20 ? 'Critical condition: Urgent Care recommended' : 'Injured / Fatigued: Restorative Care available'}
              </span>
            ) : (
              <span>Urgent Care & Cognitive Counseling available</span>
            )}
          </div>
        </div>
        <button
          type="button"
          data-testid="btn-open-treatments"
          className="game-button btn-primary"
          onClick={() => setIsTreatmentsModalOpen(true)}
          style={{ whiteSpace: 'nowrap', padding: '8px 16px', fontSize: '0.85rem' }}
        >
          {t('hospital.treatmentsBtn', { defaultValue: 'Medical & Psychiatric Treatments...' })}
        </button>
      </div>

      {/* 2. Blood Donation */}
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

      {/* 3. Hospital Cafeteria (Staff only, $40 base fee) */}
      <div style={{
        padding: '12px 14px',
        background: 'rgba(255, 255, 255, 0.04)',
        border: hasAteCafeteria ? '1px solid #22c55e' : '1px solid #334155',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        opacity: isHospitalStaff ? 1 : 0.75
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
            {!isHospitalStaff && (
              <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                🔒 {t('hospital.staffOnlyCafeteria', { defaultValue: 'Staff Only' })}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '3px' }}>
            ⏳ {formatHours(1)} • 💰 ${cafeteriaCost} • +1 Physical • -2 Mental
          </div>
          <div style={{ fontSize: '0.78rem', color: isHospitalStaff ? '#94a3b8' : '#f87171', marginTop: '4px' }}>
            {isHospitalStaff
              ? t('hospital.cafeteriaDesc', { defaultValue: 'Convenient institutional steam-table meal. Prevents weekend starvation without refrigerator or groceries.' })
              : t('hospital.staffOnlyCafeteria', { defaultValue: 'Hospital staff only (Requires employment at Hospital)' })}
          </div>
        </div>
        <button
          type="button"
          data-testid="btn-hospital-cafeteria"
          className="game-button btn-secondary"
          disabled={!isHospitalStaff || player.hoursRemaining < 1 || player.money < cafeteriaCost || hasAteCafeteria}
          onClick={() => onAction({ type: 'hospital_cafeteria' })}
          style={{ whiteSpace: 'nowrap', padding: '8px 14px', fontSize: '0.85rem' }}
        >
          {hasAteCafeteria
            ? t('hospital.cafeteriaFedBtn', { defaultValue: 'Fed' })
            : !isHospitalStaff
            ? 'Staff Only'
            : `${t('hospital.cafeteriaBtn', { defaultValue: 'Buy Meal Tray' })} ($${cafeteriaCost})`}
        </button>
      </div>

      {/* Treatments Cards Modal Dialog */}
      {isTreatmentsModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          data-testid="hospital-treatments-modal-backdrop"
          onClick={() => setIsTreatmentsModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
            boxSizing: 'border-box'
          }}
        >
          <div
            data-testid="hospital-treatments-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '92vh',
              overflowY: 'auto',
              borderRadius: '14px',
              border: '2px solid rgba(56, 189, 248, 0.5)',
              boxShadow: '0 0 30px rgba(56, 189, 248, 0.3), 0 12px 36px rgba(0,0,0,0.85)',
              background: 'linear-gradient(165deg, #0f172a 0%, #090d16 100%)',
              padding: '16px 20px',
              color: '#fff',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🩺</span>
                  <span>{t('hospital.treatmentsModalTitle', { defaultValue: 'Hospital Clinical Treatments' })}</span>
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                  {t('hospital.treatmentsModalSubtitle', { defaultValue: 'Select between Physical Triage & Restorative Care or Psychiatric Counseling.' })}
                </p>
                {isHospitalStaff && (
                  <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '0.74rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '4px', padding: '2px 8px', fontWeight: 'bold' }}>
                    🩺 Staff Rate: 50% discount applied
                  </span>
                )}
              </div>
              <button
                type="button"
                data-testid="btn-close-treatments-modal"
                onClick={() => setIsTreatmentsModalOpen(false)}
                aria-label="Close"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '22px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            {/* Two Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '14px'
            }}>
              {/* Card 1: Physical Urgent Care */}
              <div
                data-testid="treatment-card-physical"
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '12px',
                  border: '2px solid #10b981',
                  boxShadow: '0 0 16px rgba(16, 185, 129, 0.3), 0 4px 14px rgba(0,0,0,0.6)',
                  background: 'linear-gradient(165deg, #062822 0%, #031512 100%)',
                  padding: '14px',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                      🏥 Physical Treatment
                    </span>
                    <span style={{ fontSize: '1.4rem' }}>🩺</span>
                  </div>
                  <h4 style={{ margin: '4px 0 0 0', fontSize: '1.05rem', color: '#fff', fontWeight: 'bold' }}>
                    {t('hospital.urgentCareTitle', { defaultValue: 'Walk-in Urgent Care' })}
                  </h4>

                  {/* Badges: Time & Cost */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '4px', padding: '3px 8px', color: '#a7f3d0' }}>
                      ⏳ {formatHours(6)}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '4px', padding: '3px 8px', color: player.money >= urgentCareCost ? '#34d399' : '#f87171' }}>
                      💰 ${urgentCareCost} {isHospitalStaff ? '(Staff Rate)' : ''}
                    </span>
                  </div>

                  {/* Triage Preview */}
                  <div style={{
                    marginTop: '10px',
                    padding: '8px 10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    lineHeight: '1.35',
                    color: curPhys < 20 ? '#f87171' : (curPhys < 35 ? '#fbbf24' : '#6ee7b7')
                  }}>
                    {urgentCareTierText}
                  </div>

                  {/* Benefit chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '10px' }}>
                    <span style={{ fontSize: '0.70rem', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.5)', color: '#a7f3d0', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                      + Physical Condition
                    </span>
                    <span style={{ fontSize: '0.70rem', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.5)', color: '#a7f3d0', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                      Repairs Max Physical
                    </span>
                  </div>
                </div>

                {/* Card Action Button */}
                <button
                  type="button"
                  data-testid="btn-treatment-physical"
                  disabled={player.hoursRemaining < 6 || player.money < urgentCareCost}
                  onClick={async () => {
                    await onAction({ type: 'hospital_urgent_care' });
                    setIsTreatmentsModalOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '0.88rem',
                    cursor: (player.hoursRemaining >= 6 && player.money >= urgentCareCost) ? 'pointer' : 'not-allowed',
                    background: (player.hoursRemaining >= 6 && player.money >= urgentCareCost)
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : '#334155',
                    color: (player.hoursRemaining >= 6 && player.money >= urgentCareCost) ? '#000' : '#94a3b8',
                    boxShadow: (player.hoursRemaining >= 6 && player.money >= urgentCareCost) ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none',
                    marginTop: '8px'
                  }}
                >
                  🩺 {t('hospital.urgentCareBtn', { defaultValue: 'Receive Care' })} (${urgentCareCost})
                </button>
              </div>

              {/* Card 2: Mental Psychiatric Counseling */}
              <div
                data-testid="treatment-card-mental"
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '12px',
                  border: '2px solid #a855f7',
                  boxShadow: '0 0 16px rgba(168, 85, 247, 0.3), 0 4px 14px rgba(0,0,0,0.6)',
                  background: 'linear-gradient(165deg, #1e1338 0%, #0d071a 100%)',
                  padding: '14px',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#d8b4fe', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                      🧠 Mental Treatment
                    </span>
                    <span style={{ fontSize: '1.4rem' }}>🧠</span>
                  </div>
                  <h4 style={{ margin: '4px 0 0 0', fontSize: '1.05rem', color: '#fff', fontWeight: 'bold' }}>
                    {t('hospital.therapyTitle', { defaultValue: 'Psychiatric Counseling' })}
                  </h4>

                  {/* Badges: Time & Cost */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '4px', padding: '3px 8px', color: '#e9d5ff' }}>
                      ⏳ {formatHours(6)}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '4px', padding: '3px 8px', color: player.money >= therapyCost ? '#c084fc' : '#f87171' }}>
                      💰 ${therapyCost} {isHospitalStaff ? '(Staff Rate)' : ''}
                    </span>
                  </div>

                  {/* Narrative Description */}
                  <div style={{
                    marginTop: '10px',
                    padding: '8px 10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    lineHeight: '1.35',
                    color: '#e2e8f0'
                  }}>
                    {t('hospital.therapyDesc', { defaultValue: 'Clinical cognitive therapy. Permanently expands cognitive capacity (+1 Max Mental) and restores +3 Mental.' })}
                  </div>

                  {/* Benefit chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '10px' }}>
                    <span style={{ fontSize: '0.70rem', background: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.5)', color: '#e9d5ff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                      +1 Max Mental (Permanent)
                    </span>
                    <span style={{ fontSize: '0.70rem', background: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.5)', color: '#e9d5ff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                      +3 Mental Condition
                    </span>
                  </div>
                </div>

                {/* Card Action Button */}
                <button
                  type="button"
                  data-testid="btn-treatment-mental"
                  disabled={player.hoursRemaining < 6 || player.money < therapyCost || maxMental >= 100}
                  onClick={async () => {
                    await onAction({ type: 'hospital_therapy' });
                    setIsTreatmentsModalOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '0.88rem',
                    cursor: (player.hoursRemaining >= 6 && player.money >= therapyCost && maxMental < 100) ? 'pointer' : 'not-allowed',
                    background: (player.hoursRemaining >= 6 && player.money >= therapyCost && maxMental < 100)
                      ? 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)'
                      : '#334155',
                    color: (player.hoursRemaining >= 6 && player.money >= therapyCost && maxMental < 100) ? '#fff' : '#94a3b8',
                    boxShadow: (player.hoursRemaining >= 6 && player.money >= therapyCost && maxMental < 100) ? '0 0 12px rgba(168, 85, 247, 0.4)' : 'none',
                    marginTop: '8px'
                  }}
                >
                  🧠 {t('hospital.therapyBtn', { defaultValue: 'Attend Session' })} (${therapyCost})
                </button>
              </div>
            </div>

            {/* Modal Bottom / Neither Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '10px' }}>
              <button
                type="button"
                data-testid="btn-cancel-treatment"
                onClick={() => setIsTreatmentsModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#cbd5e1',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {t('hospital.treatmentsNeitherBtn', { defaultValue: 'Neither (Close)' })}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
