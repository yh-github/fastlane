import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { CampaignBundle } from '../../engine/dataLoader';
import type { GameRules } from '../../engine/gameState';
import { calcEconomyPrice } from '../../engine/economyEngine';
import { calcMovingFee, calcUsedSpace, calcLandlordStanding } from '../../engine/statMath';
import type { InteractionProps } from './types';

export function RentOffice({ player, onAction, campaign, turn = 1, economicIndex = 0, rules }: InteractionProps & { campaign?: CampaignBundle, turn?: number, economicIndex?: number, rules?: GameRules }) {
  const { t } = useTranslation();
  const [confirmMove, setConfirmMove] = useState<{housingId: string, baseCost: number, movingFee: number, totalCost: number, newAptName: string} | null>(null);
  const currentHousing = campaign?.housing.find(h => h.id === player.currentHousingId);

  const rentOwed = player.rentDebt;
  const isWeek4 = turn % 4 === 0;
  const rentDue = player.rentPaidUntilWeek <= turn;
  const isJobHere = !!(player.currentJobId && campaign?.jobs.some(j => j.id === player.currentJobId && j.locationId === 'apartment_complex'));
  const isOpen = isWeek4 || rentDue || player.turnFlags.rentPaidThisTurn || (isJobHere && !!rules?.allowEmployedRentPayment);

  const availableHousingList = (campaign?.housing || [
    { id: 'low_cost', name: 'Low-Cost Housing', baseRent: 325, spaceCap: 100 },
    { id: 'security', name: 'Security Apartments', baseRent: 475, spaceCap: 250 }
  ]).filter(h => h.id !== 'street');

  const isAdvanced = !!rules?.usePhysicalMentalConditions;
  const marketRent = currentHousing
    ? calcEconomyPrice(currentHousing.baseRent, economicIndex)
    : player.currentRentPrice;
  const landlordStandingInfo = isAdvanced ? calcLandlordStanding(player, rules, turn) : null;

  const rentAdvanceCost = rules?.fluctuatingRent && currentHousing && !isAdvanced
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

            {isAdvanced && currentHousing && (
              <div 
                data-testid="landlord-standing-panel"
                style={{ padding: '10px', border: '1px solid #55a', borderRadius: '6px', background: 'rgba(20, 20, 45, 0.4)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '13px' }}>🤝 {t('rentOffice.landlordStanding')}</strong>
                  <span style={{ 
                    fontWeight: 'bold', 
                    padding: '2px 8px', 
                    borderRadius: '10px',
                    fontSize: '12px',
                    backgroundColor: (landlordStandingInfo?.standing ?? 50) >= 50 ? 'rgba(46, 204, 113, 0.2)' : ((landlordStandingInfo?.standing ?? 50) >= 35 ? 'rgba(241, 196, 15, 0.2)' : 'rgba(231, 76, 60, 0.2)'),
                    color: (landlordStandingInfo?.standing ?? 50) >= 50 ? '#2ecc71' : ((landlordStandingInfo?.standing ?? 50) >= 35 ? '#f1c40f' : '#e74c3c'),
                    border: `1px solid ${(landlordStandingInfo?.standing ?? 50) >= 50 ? '#2ecc71' : ((landlordStandingInfo?.standing ?? 50) >= 35 ? '#f1c40f' : '#e74c3c')}`
                  }}>
                    {landlordStandingInfo?.standing}/100
                  </span>
                </div>

                <div style={{ background: '#333', height: '6px', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${landlordStandingInfo?.standing ?? 50}%`,
                    backgroundColor: (landlordStandingInfo?.standing ?? 50) >= 50 ? '#2ecc71' : ((landlordStandingInfo?.standing ?? 50) >= 35 ? '#f1c40f' : '#e74c3c'),
                    transition: 'width 0.3s ease'
                  }} />
                </div>

                <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '6px' }}>
                  <div>🏠 {t('rentOffice.currentLeaseRate')}: <strong>${player.currentRentPrice}/mo</strong></div>
                  <div>📈 {t('rentOffice.marketRate')}: <strong style={{ color: marketRent < player.currentRentPrice ? '#2ecc71' : (marketRent > player.currentRentPrice ? '#e74c3c' : '#ccc') }}>${marketRent}/mo</strong></div>
                </div>

                <div style={{ fontSize: '10px', color: '#aaa', margin: '6px 0', borderTop: '1px dashed #444', paddingTop: '4px' }}>
                  {landlordStandingInfo?.breakdown.map((b, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{b.label}</span>
                      <span style={{ color: b.value >= 0 ? '#2ecc71' : '#e74c3c' }}>{b.value >= 0 ? `+${b.value}` : b.value}</span>
                    </div>
                  ))}
                </div>

                {marketRent < player.currentRentPrice ? (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#2ecc71', marginBottom: '4px' }}>
                      💰 {t('rentOffice.renegotiateSavings', { savings: player.currentRentPrice - marketRent })}
                    </div>
                    <button
                      data-testid="btn-renegotiate-rent"
                      onClick={() => onAction({ type: 'renegotiate_rent' })}
                      disabled={player.hoursRemaining < 1}
                      style={{
                        width: '100%',
                        backgroundColor: player.hoursRemaining < 1 ? '#555' : '#2980b9',
                        cursor: player.hoursRemaining < 1 ? 'not-allowed' : 'pointer',
                        opacity: player.hoursRemaining < 1 ? 0.6 : 1
                      }}
                    >
                      {t('rentOffice.renegotiateBtn')} (⏳ 1 hr, -2 {t('stats.mental', { defaultValue: 'Mental' })})
                    </button>
                    <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
                      {(landlordStandingInfo?.standing ?? 0) >= 50
                        ? t('rentOffice.standingGood')
                        : ((landlordStandingInfo?.standing ?? 0) >= 35 ? t('rentOffice.standingFair') : t('rentOffice.standingPoor'))}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
                    ℹ️ {t('rentOffice.marketNotLower', { currentRent: player.currentRentPrice, marketRent })}
                    {(landlordStandingInfo?.standing ?? 0) < 40 && (
                      <div style={{ color: '#e67e22', marginTop: '4px', fontSize: '10px' }}>
                        {t('rentOffice.standingPoorWarning')}
                      </div>
                    )}
                  </div>
                )}
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
              {availableHousingList.map(h => {
                const movePrice = calcEconomyPrice(h.baseRent, economicIndex);
                const isCurrent = player.currentHousingId === h.id;
                const durablesSpace = calcUsedSpace(player, campaign, false);
                const targetCap = h.spaceCap ?? 999999;
                const hasSpace = !rules?.spaceCapping || durablesSpace <= targetCap;

                if (rules?.helpfulUI && isCurrent) return null;

                return (
                  <div key={h.id} className="store-item" style={{ padding: '12px', borderRadius: '6px', border: '1px solid #444', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong>{t(`housing.${h.id}`, { defaultValue: h.name })}</strong>
                      <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>${movePrice}/mo</span>
                    </div>
                    {rules?.spaceCapping && h.spaceCap !== undefined && (
                      <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '6px' }}>
                        📦 Capacity: <strong>{h.spaceCap} space</strong>
                        {!hasSpace && <span style={{ color: '#e74c3c', marginLeft: '6px' }}>(You own {durablesSpace} space)</span>}
                      </div>
                    )}
                    <button 
                      onClick={() => handleInitiateMove(h.id, movePrice, t(`housing.${h.id}`, { defaultValue: h.name }))}
                      disabled={(rules?.helpfulUI && isCurrent) || (rules?.helpfulUI && !hasSpace)}
                      style={{ width: '100%', opacity: !hasSpace ? 0.6 : 1 }}
                    >
                      🏠 {isCurrent ? t('rentOffice.currentApt', { defaultValue: 'Current' }) : (hasSpace ? t('rentOffice.moveIn') : 'Possessions Exceed Space')}
                    </button>
                  </div>
                );
              })}
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
