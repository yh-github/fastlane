import type { PlayerState } from '../engine/gameState';
import type { CampaignBundle } from '../engine/dataLoader';
import { useTranslation } from 'react-i18next';
import {
  calcLuckScore,
  calcRobberyChance,
  calcMaxDependability,
  calcMaxExperience,
  calcRaiseThreshold
} from '../engine/statMath';

interface InventoryModalProps {
  player: PlayerState;
  campaign?: CampaignBundle;
  turn?: number;
  onAction?: (payload: any) => void;
  onClose: () => void;
}

export function InventoryModal({ player, campaign, turn, onAction, onClose }: InventoryModalProps) {
  const { t } = useTranslation();
  const { inventory } = player;

  const currentJob = campaign?.jobs.find(j => j.id === player.currentJobId);
  const currentHousing = campaign?.housing.find(h => h.id === player.currentHousingId);
  const totalStocks = Object.values(inventory.stocks.holdings).reduce((a, b) => a + b, 0);

  const luckScore = calcLuckScore(player.dependability || 0, player.experience || 0, player.degrees?.length || 0);
  const robberyRisk = (calcRobberyChance(player.relaxation || 0) * 100).toFixed(1);
  const jobReqDep = currentJob ? currentJob.requirements.dependability : 0;
  const jobReqExp = currentJob ? currentJob.requirements.experience : 0;
  const maxDep = calcMaxDependability(jobReqDep, player.degrees.length);
  const maxExp = calcMaxExperience(jobReqExp, player.degrees.length);
  const raiseThreshold = currentJob ? calcRaiseThreshold(jobReqDep, player.raisesAtCurrentJob || 0) : null;

  return (
    <div className="building-modal-overlay" style={{
      position: 'absolute', top: 0, insetInlineStart: 0, insetInlineEnd: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 900,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div className="building-modal-content" style={{
        backgroundColor: '#2c3e50', padding: '20px', borderRadius: '8px',
        width: '400px', maxWidth: '90%', maxHeight: '80%', overflowY: 'auto',
        color: '#fff', border: '2px solid #34495e', position: 'relative'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: '10px', insetInlineEnd: '10px',
            background: 'none', border: 'none', color: '#aaa', cursor: 'pointer',
            fontSize: '1.2em'
          }}
        >
          ✖
        </button>
        
        <h2 style={{ marginTop: 0, borderBottom: '1px solid #555', paddingBottom: '10px' }}>{t('statusModal.title', 'Your Status')}</h2>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#f39c12', marginBottom: '5px' }}>Overview</h3>
          <ul style={{ margin: 0, paddingInlineStart: '20px' }}>
            <li><strong>Job:</strong> {currentJob ? `${currentJob.title} @ ${t(`building.${currentJob.locationId}`, { defaultValue: currentJob.locationId })}` : 'Unemployed'} {currentJob ? `($${player.currentWage}/hr)` : ''}</li>
            <li><strong>Finances:</strong> Cash: ${player.money} | Savings: ${player.bankSavings} | T-Bills: {inventory.stocks.tBills} | Stocks: {totalStocks} shares</li>
            <li><strong>Debt:</strong> Loans: ${player.loanDebt} | Rent Arrears: ${player.rentDebt}</li>
            <li><strong>Housing:</strong> {currentHousing ? t(`building.${currentHousing.id}`, { defaultValue: currentHousing.name }) : 'Homeless'} | Rent Paid Until Week {player.rentPaidUntilWeek} (Next due: Week {Math.max(turn || 1, player.rentPaidUntilWeek - 1)})</li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#f39c12', marginBottom: '5px' }}>{t('statusModal.attributesTitle', 'Formula Attributes & Caps')}</h3>
          <ul style={{ margin: 0, paddingInlineStart: '20px' }}>
            <li><strong>{t('statusModal.luckScore', 'Luck Score (Hiring Roll Threshold):')}</strong> {luckScore} / 100</li>
            <li><strong>{t('statusModal.robberyRisk', 'Home Robbery Risk:')}</strong> {robberyRisk}%</li>
            <li><strong>{t('statusModal.dependabilityCap', 'Dependability Cap:')}</strong> {player.dependability} / {maxDep} (Current / Max Cap)</li>
            <li><strong>{t('statusModal.experienceCap', 'Experience Cap:')}</strong> {player.experience} / {maxExp} (Current / Max Cap)</li>
            <li><strong>{t('statusModal.nextRaiseReq', 'Dependability for Next Raise:')}</strong> {raiseThreshold !== null ? `${player.dependability} / ${raiseThreshold}` : t('statusModal.notEmployed', 'N/A (Unemployed)')}</li>
          </ul>
        </div>

        {(player.turnFlags.freeNewspaper || player.turnFlags.readNewspaper) && player.newspaperHeadline && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#f39c12', marginBottom: '5px' }}>Newspaper Headline</h3>
            <p style={{ margin: 0, fontStyle: 'italic', paddingInlineStart: '20px' }}>
              {t(player.newspaperHeadline.key, player.newspaperHeadline.params as any) as string}
            </p>
          </div>
        )}

        {player.turnEvents && player.turnEvents.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ color: '#f39c12', marginBottom: '5px' }}>Notices (This Turn)</h3>
            <ul style={{ margin: 0, paddingInlineStart: '20px' }}>
              {player.turnEvents.map((evt, i) => (
                <li key={i}>{t(evt.key, evt.params as any) as string}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#f39c12', marginBottom: '5px' }}>{t('statusModal.education', 'Education')}</h3>
          <ul style={{ margin: 0, paddingInlineStart: '20px' }}>
            <li>{t('statusModal.degrees', 'Degrees')}: {player.degrees.length > 0 ? player.degrees.map(d => t(`education.${d}`, { defaultValue: d.replaceAll('_', ' ') })).join(', ') : t('statusModal.none', 'None')}</li>
            <li>{t('statusModal.enrolled', 'Currently Enrolled')}: {
              Object.keys(player.enrolledClasses || {}).length > 0 
                ? Object.keys(player.enrolledClasses).map(d => t(`education.${d}`, { defaultValue: d.replaceAll('_', ' ') })).join(', ')
                : t('statusModal.none', 'None')
            }</li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#f39c12', marginBottom: '5px' }}>{t('inventoryModal.food', 'Food')}</h3>
          <ul style={{ margin: 0, paddingInlineStart: '20px' }}>
            <li>{t('inventoryModal.freshFood', 'Fresh Food')}: {inventory.freshFoodUnits} {t('inventoryModal.units', 'units')}</li>
            <li>{t('inventoryModal.fastFood', 'Fast Food')}: {inventory.fastFoodItems.length} {t('inventoryModal.meals', 'meals')}</li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#f39c12', marginBottom: '5px' }}>{t('inventoryModal.clothes', 'Clothes')}</h3>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ marginInlineEnd: '10px' }}>{t('inventoryModal.wearing', 'Wearing:')}</label>
            <select 
              value={inventory.selectedClothes || 'none'} 
              onChange={(e) => onAction && onAction({ type: 'change_clothes', clothes: e.target.value })}
              style={{ padding: '4px' }}
            >
              <option value="none">{t('inventoryModal.none', 'None')}</option>
              <option value="casual" disabled={inventory.casualClothesWeeks <= 0}>{t('inventoryModal.casual', 'Casual')}</option>
              <option value="dress" disabled={inventory.dressClothesWeeks <= 0}>{t('inventoryModal.dress', 'Dress')}</option>
              <option value="business" disabled={inventory.businessClothesWeeks <= 0}>{t('inventoryModal.business', 'Business')}</option>
            </select>
          </div>
          <ul style={{ margin: 0, paddingInlineStart: '20px' }}>
            <li>{t('inventoryModal.casualClothes', 'Casual Clothes')}: {inventory.casualClothesWeeks > 0 ? t('inventoryModal.weeksLeft', `${inventory.casualClothesWeeks} weeks left`, { count: inventory.casualClothesWeeks }) : t('inventoryModal.none')}</li>
            <li>{t('inventoryModal.dressClothes', 'Dress Clothes')}: {inventory.dressClothesWeeks > 0 ? t('inventoryModal.weeksLeft', `${inventory.dressClothesWeeks} weeks left`, { count: inventory.dressClothesWeeks }) : t('inventoryModal.none')}</li>
            <li>{t('inventoryModal.businessSuit', 'Business Suit')}: {inventory.businessClothesWeeks > 0 ? t('inventoryModal.weeksLeft', `${inventory.businessClothesWeeks} weeks left`, { count: inventory.businessClothesWeeks }) : t('inventoryModal.none')}</li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#f39c12', marginBottom: '5px' }}>{t('inventoryModal.appliances', 'Appliances')}</h3>
          {inventory.appliances.length > 0 ? (
            <ul style={{ margin: 0, paddingInlineStart: '20px' }}>
              {inventory.appliances.map((a, i) => <li key={`${a.id}-${i}`}>{t(`item.${a.id}`, { defaultValue: a.id.replaceAll('_', ' ') })}</li>)}
            </ul>
          ) : <p style={{ margin: 0, fontStyle: 'italic', color: '#888' }}>{t('inventoryModal.none')}</p>}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#f39c12', marginBottom: '5px' }}>{t('inventoryModal.books', 'Books')}</h3>
          {inventory.books.length > 0 ? (
            <ul style={{ margin: 0, paddingInlineStart: '20px' }}>
              {inventory.books.map((b, i) => <li key={`${b}-${i}`}>{t(`item.${b}`, { defaultValue: b.replaceAll('_', ' ') })}</li>)}
            </ul>
          ) : <p style={{ margin: 0, fontStyle: 'italic', color: '#888' }}>{t('inventoryModal.none')}</p>}
        </div>

        <div>
          <h3 style={{ color: '#f39c12', marginBottom: '5px' }}>{t('inventoryModal.entertainment', 'Entertainment')}</h3>
          <ul style={{ margin: 0, paddingInlineStart: '20px' }}>
            <li>{t('inventoryModal.baseballTickets', 'Baseball Tickets')}: {inventory.tickets.baseball}</li>
            <li>{t('inventoryModal.theatreTickets', 'Theatre Tickets')}: {inventory.tickets.theatre}</li>
            <li>{t('inventoryModal.concertTickets', 'Concert Tickets')}: {inventory.tickets.concert}</li>
            <li>{t('inventoryModal.lotteryTickets', 'Lottery Tickets')}: {inventory.lotteryTickets}</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
