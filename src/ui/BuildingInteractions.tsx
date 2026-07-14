import type { PlayerState } from '../engine/gameState';

import type { JobDef, ItemDef, EducationDef, BuildingDef, CampaignBundle } from '../engine/dataLoader';

interface InteractionProps {
  player: PlayerState;
  onAction: (actionPayload: any) => void;
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * JobBoard — Shown at the Employment Office.
 * Lists ALL jobs across the game for applying, grouped by building.
 */
export function JobBoard({ player, onAction, availableJobs, buildings, economicIndex = 0, campaign, rules }: InteractionProps & { availableJobs: JobDef[], buildings: BuildingDef[], economicIndex?: number, campaign: CampaignBundle, rules?: import('../engine/gameState').GameRules }) {
  const { t } = useTranslation();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  // Group jobs by locationId
  const locations = Array.from(new Set(availableJobs.map(j => j.locationId)));

  if (!selectedLocation) {
    return (
      <div className="interaction-panel">
        <h3>{t('jobBoard.title')}</h3>
        {locations.map(loc => {
          const jobCount = availableJobs.filter(j => j.locationId === loc).length;
          return (
            <div key={loc} className="interaction-item" style={{ marginBottom: '10px', padding: '5px', border: '1px solid #444', cursor: 'pointer' }} onClick={() => setSelectedLocation(loc)}>
              <strong>{t(`building.${loc}`, { defaultValue: buildings.find(b => b.id === loc)?.name || loc })}</strong>
              <div style={{ fontSize: '12px' }}>{t('jobBoard.positions', { count: jobCount })}</div>
            </div>
          );
        })}
      </div>
    );
  }

  const jobsAtLocation = availableJobs.filter(j => j.locationId === selectedLocation);

  return (
    <div className="interaction-panel">
      <h3>
        <button onClick={() => setSelectedLocation(null)} style={{ marginInlineEnd: '10px', padding: '2px 5px' }}>{t('jobBoard.back')}</button>
        {t('jobBoard.jobsAt', { location: t(`building.${selectedLocation}`, { defaultValue: buildings.find(b => b.id === selectedLocation)?.name || selectedLocation }) })}
      </h3>
      {jobsAtLocation.map(job => {
        const isCurrentJob = player.currentJobId === job.id;
        const missingExp = player.experience < job.requirements.experience;
        const missingDep = player.dependability < job.requirements.dependability;
        const missingDegrees = job.requirements.degrees.filter(d => !player.degrees.includes(d));
        const offeredWage = calcEconomyPrice(job.baseWage, economicIndex);
        
        return (
          <div key={job.id} className="interaction-item" style={{ marginBottom: '10px', padding: '10px', border: '1px solid #444', borderRadius: '4px' }}>
            <strong>{t(`job.${job.id}`, { defaultValue: job.title })}</strong> — ${offeredWage}/hr ({t('jobBoard.base')}: ${job.baseWage})
            <div style={{ fontSize: '12px', marginTop: '5px' }}>
              <span style={{ color: missingExp ? '#e74c3c' : '#2ecc71' }}>{t('jobBoard.exp')}: {job.requirements.experience}</span> | 
              <span style={{ color: missingDep ? '#e74c3c' : '#2ecc71', marginInlineStart: '5px' }}>{t('jobBoard.dep')}: {job.requirements.dependability}</span>
              {job.requirements.degrees.length > 0 && (
                <span style={{ color: missingDegrees.length > 0 ? '#e74c3c' : '#2ecc71', marginInlineStart: '5px' }}>
                  | {t('jobBoard.degrees')}: {job.requirements.degrees.map(d => t(`education.${d}`, { defaultValue: d })).join(', ')}
                </span>
              )}
            </div>
            {(missingExp || missingDep || missingDegrees.length > 0) && (
              <div style={{ fontSize: '11px', color: '#e74c3c', fontStyle: 'italic', marginTop: '2px' }}>
                {t('jobBoard.missingReq')}
              </div>
            )}
            <div style={{ marginTop: '10px' }}>
              {isCurrentJob ? (
                (!rules?.transparentGUI || offeredWage > player.currentWage) ? (
                  <button onClick={() => onAction({ type: 'apply', jobId: job.id, offeredWage })}>
                    {t('jobBoard.askRaise', { wage: offeredWage, cost: campaign.config.timeRules?.jobApplicationCost ?? 4 })}
                  </button>
                ) : (
                  <span style={{ color: '#4caf50', fontWeight: 'bold' }}>✓ {t('jobBoard.currentJob', { wage: player.currentWage })}</span>
                )
              ) : (
                <button onClick={() => onAction({ type: 'apply', jobId: job.id, offeredWage })}>
                  {t('jobBoard.apply', { cost: campaign.config.timeRules?.jobApplicationCost ?? 4 })}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * WorkStation — Shown at workplace buildings where the player is employed.
 * Allows the player to work a shift.
 */
export function WorkStation({ onAction, job, campaign }: InteractionProps & { job: JobDef, campaign: CampaignBundle }) {
  const { t } = useTranslation();
  return (
    <div className="interaction-panel">
      <h3>{t('workStation.title', { jobTitle: t(`job.${job.id}`, { defaultValue: job.title }) })}</h3>
      <p style={{ fontSize: '12px', marginBottom: '10px' }}>${job.baseWage}/hr</p>
      <button onClick={() => onAction({ type: 'work', jobId: job.id })}>
        {t('workStation.workShift', { cost: campaign.config.timeRules?.workSessionCost ?? 6 })}
      </button>
    </div>
  );
}

export function StoreFront({ player, onAction, availableItems }: InteractionProps & { availableItems: ItemDef[] }) {
  const { t } = useTranslation();
  return (
    <div className="interaction-panel">
      <h3>{t('storeFront.title')}</h3>
      {availableItems.map(item => {
        const canAfford = player.money >= item.basePrice;
        return (
          <div 
            key={item.id} 
            className={`interaction-item ${canAfford ? 'interaction-item--clickable' : 'interaction-item--disabled'}`} 
            style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}
            onClick={() => {
              if (canAfford) onAction({ type: 'buy', itemId: item.id });
            }}
          >
            <span>{t(`item.${item.id}`, { defaultValue: item.name })}</span>
            <span>${item.basePrice}</span>
          </div>
        );
      })}
    </div>
  );
}

export function HomeRelax({ onAction, campaign }: InteractionProps & { campaign?: CampaignBundle }) {
  const { t } = useTranslation();
  const relaxCost = campaign?.config.timeRules?.relaxCost ?? 6;
  return (
    <div className="interaction-panel">
      <h3>{t('homeRelax.title')}</h3>
      <p style={{ fontSize: '12px', marginBottom: '10px' }}>{t('homeRelax.desc', { cost: relaxCost })}</p>
      <button onClick={() => onAction({ type: 'relax' })}>
        {t('homeRelax.button', { cost: relaxCost })}
      </button>
    </div>
  );
}

import { calcEconomyPrice, calcStockPrice } from '../engine/economyEngine';
import { calcRequiredLessons } from '../engine/educationEngine';

import type { GameRules } from '../engine/gameState';

export function RentOffice({ player, onAction, campaign, turn = 1, economicIndex = 0, rules }: InteractionProps & { campaign?: CampaignBundle, turn?: number, economicIndex?: number, rules?: GameRules }) {
  const { t } = useTranslation();
  const currentHousing = campaign?.housing.find(h => h.id === player.currentHousingId);
  const lowCostHousing = campaign?.housing.find(h => h.id === 'low_cost');
  const securityHousing = campaign?.housing.find(h => h.id === 'security');

  const rentOwed = player.rentDebt;
  const isWeek4 = turn % 4 === 0;
  // Rent is due if the paid-until week is the start of next week or earlier.
  const rentDue = player.rentPaidUntilWeek <= turn + 1;
  const isOpen = isWeek4 || rentDue || player.turnFlags.rentPaidThisTurn;

  // The cost to move is always market rate (economy adjusted)
  const lowCostMovePrice = lowCostHousing ? calcEconomyPrice(lowCostHousing.baseRent, economicIndex) : 0;
  const securityMovePrice = securityHousing ? calcEconomyPrice(securityHousing.baseRent, economicIndex) : 0;

  // The cost to pay advance rent depends on the rule
  const rentAdvanceCost = rules?.fluctuatingRent && currentHousing
    ? calcEconomyPrice(currentHousing.baseRent, economicIndex)
    : player.currentRentPrice;

  return (
    <div className="interaction-panel">
      <h3>{t('rentOffice.title')}</h3>
      <p style={{ fontSize: '12px', marginBottom: '10px' }}>{t('rentOffice.current')}: {currentHousing ? t(`housing.${currentHousing.id}`, { defaultValue: currentHousing.name }) : t('rentOffice.homeless')}</p>
      
      {!isOpen ? (
        <div style={{ padding: '10px', backgroundColor: '#555', borderRadius: '4px', fontStyle: 'italic' }}>
          {t('rentOffice.closed')}
        </div>
      ) : (
        <>
          {rentOwed > 0 && (
            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e74c3c', borderRadius: '4px' }}>
              <strong>{t('rentOffice.rentDue', { amount: rentOwed })}</strong>
              <br/>
              <button 
                onClick={() => onAction({ type: 'rent_transaction', amount: rentOwed })}
                style={{ marginTop: '10px', backgroundColor: '#c0392b' }}
                disabled={player.money < rentOwed}
              >
                {t('rentOffice.payRentDebt')}
              </button>
            </div>
          )}

          {currentHousing && (
            <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #4aa' }}>
              <strong>{t('rentOffice.paidUntil', { week: player.rentPaidUntilWeek })}</strong>
              <p style={{ fontSize: '12px' }}>{t('rentOffice.weeksPaid', { count: player.rentPaidUntilWeek - turn })}</p>
              
              <button 
                onClick={() => onAction({ type: 'pay_rent_advance', amount: rentAdvanceCost })}
                style={{ marginTop: '5px' }}
                disabled={player.money < rentAdvanceCost}
              >
                {t('rentOffice.payAdvance', { cost: rentAdvanceCost })}
              </button>
            </div>
          )}

          {rentDue && !player.rentExtensionsDeniedPermanently && (!rules?.transparentGUI || (!player.rentExtensionActive && !player.turnFlags.askedForExtension)) && (
            <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #c93' }}>
              <strong>{t('rentOffice.rentIsDue')}</strong>
              <p style={{ fontSize: '12px' }}>{t('rentOffice.canAskExtension')}</p>
              <button 
                onClick={() => onAction({ type: 'ask_rent_extension' })}
                style={{ marginTop: '5px', backgroundColor: '#e67e22' }}
              >
                {t('rentOffice.askExtension')}
              </button>
            </div>
          )}
          {player.rentExtensionActive && (
            <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #27ae60', color: '#27ae60' }}>
              <strong>{t('rentOffice.extensionGranted')}</strong>
              <p style={{ fontSize: '12px', margin: 0 }}>{t('rentOffice.dueByEnd')}</p>
            </div>
          )}
          {player.turnFlags.askedForExtension && !player.rentExtensionActive && (
            <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #e74c3c', color: '#e74c3c' }}>
              <strong>{t('rentOffice.extensionDenied')}</strong>
              <p style={{ fontSize: '12px', margin: 0 }}>{t('rentOffice.mustPay')}</p>
            </div>
          )}
          {player.rentExtensionsDeniedPermanently && (
            <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #e74c3c', color: '#e74c3c' }}>
              <strong>{t('rentOffice.permanentlyDenied')}</strong>
              <p style={{ fontSize: '12px', margin: 0 }}>{t('rentOffice.neverAnother')}</p>
            </div>
          )}

          <h4>{t('rentOffice.availableApts')}:</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            {lowCostHousing && (!rules?.transparentGUI || player.currentHousingId !== lowCostHousing.id) && (
              <div className="store-item">
                <span>{t(`housing.${lowCostHousing.id}`, { defaultValue: lowCostHousing.name })} - ${lowCostMovePrice}/mo</span>
                <button 
                  onClick={() => onAction({ type: 'move_apartment', housingId: lowCostHousing.id, cost: lowCostMovePrice })}
                  disabled={player.money < lowCostMovePrice || (rules?.transparentGUI && player.currentHousingId === lowCostHousing.id)}
                >
                  {player.currentHousingId === lowCostHousing.id ? t('rentOffice.currentApt', { defaultValue: 'Current' }) : t('rentOffice.moveIn')}
                </button>
              </div>
            )}
            
            {securityHousing && (!rules?.transparentGUI || player.currentHousingId !== securityHousing.id) && (
              <div className="store-item">
                <span>{t(`housing.${securityHousing.id}`, { defaultValue: securityHousing.name })} - ${securityMovePrice}/mo</span>
                <button 
                  onClick={() => onAction({ type: 'move_apartment', housingId: securityHousing.id, cost: securityMovePrice })}
                  disabled={player.money < securityMovePrice || (rules?.transparentGUI && player.currentHousingId === securityHousing.id)}
                >
                  {player.currentHousingId === securityHousing.id ? t('rentOffice.currentApt', { defaultValue: 'Current' }) : t('rentOffice.moveIn')}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
export function StockTradeRow({ stock, price, owned, playerMoney, onAction }: { stock: import('../engine/dataLoader').StockDef, price: number, owned: number, playerMoney: number, onAction: (payload: any) => void }) {
  const { t } = useTranslation();
  const [tradeMode, setTradeMode] = useState<'shares' | 'cash'>('shares');
  const [inputValue, setInputValue] = useState<number | ''>('');

  const sellFee = stock.sellFeePercent ? Math.floor(price * (stock.sellFeePercent / 100)) : 0;
  const sellRevenuePerShare = Math.max(0, price - sellFee);

  const numShares = tradeMode === 'shares' 
    ? (typeof inputValue === 'number' ? inputValue : 0)
    : (typeof inputValue === 'number' ? Math.floor(inputValue / price) : 0);

  const totalCost = numShares * price;
  const totalRevenue = numShares * sellRevenuePerShare;

  const canBuy = numShares > 0 && playerMoney >= totalCost;
  const canSell = numShares > 0 && owned >= numShares;

  return (
    <div style={{ padding: '10px', border: '1px solid #4aa', borderRadius: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <strong>{t(`stock.${stock.id}`, { defaultValue: stock.name })}</strong>
        <span>{t('stocks.price', { price, defaultValue: `Price: $${price}/share` })}</span>
      </div>
      <div style={{ fontSize: '12px', marginBottom: '10px', color: '#ccc' }}>{t('stocks.owned', { count: owned, defaultValue: `Owned: ${owned} shares` })}</div>
      
      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', alignItems: 'center' }}>
        <button 
          style={{ padding: '2px 8px', fontSize: '11px', background: tradeMode === 'shares' ? '#4aa' : '#333' }}
          onClick={() => { setTradeMode('shares'); setInputValue(''); }}
        >
          Shares
        </button>
        <button 
          style={{ padding: '2px 8px', fontSize: '11px', background: tradeMode === 'cash' ? '#4aa' : '#333' }}
          onClick={() => { setTradeMode('cash'); setInputValue(''); }}
        >
          Cash ($)
        </button>
      </div>

      <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginBottom: '10px' }}>
        <input 
          type="number" 
          min="0"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value ? parseInt(e.target.value) : '')}
          style={{ width: '80px', padding: '4px', background: '#222', color: 'white', border: '1px solid #555' }}
          placeholder={tradeMode === 'shares' ? t('stocks.sharesPlaceholder', { defaultValue: '0 shares' }) : '$0'}
        />
        {tradeMode === 'cash' && typeof inputValue === 'number' && (
          <span style={{ fontSize: '12px', color: '#aaa' }}>
            ({numShares} shares)
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '5px' }}>
        <button 
          onClick={() => onAction({ type: 'buy_stock', stockId: stock.id, quantity: numShares, cost: totalCost })} 
          disabled={!canBuy}
          style={{ flex: 1, background: canBuy ? '#2ecc71' : '#555', color: canBuy ? '#000' : '#888' }}
        >
          {t('stocks.buyBtn', { cost: totalCost, defaultValue: `Buy (-$${totalCost})` })}
        </button>
        <button 
          onClick={() => onAction({ type: 'sell_stock', stockId: stock.id, quantity: numShares, revenue: totalRevenue })} 
          disabled={!canSell}
          style={{ flex: 1, background: canSell ? '#e74c3c' : '#555', color: canSell ? '#000' : '#888' }}
        >
          {t('stocks.sellBtn', { revenue: totalRevenue, defaultValue: `Sell (+$${totalRevenue})` })}
        </button>
      </div>
      {stock.sellFeePercent !== undefined && stock.sellFeePercent > 0 && canSell && (
        <div style={{ fontSize: '11px', color: '#e74c3c', marginTop: '4px' }}>
          {t('stocks.fee', { fee: stock.sellFeePercent, defaultValue: `*${stock.sellFeePercent}% transaction fee applied to sale.` })}
        </div>
      )}
    </div>
  );
}

export function BankInterface({ player, onAction, campaign, turn = 1, economicIndex = 0, rules }: InteractionProps & { campaign?: CampaignBundle, turn?: number, economicIndex?: number, rules?: GameRules }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'banking'|'stocks'|'loans'>('banking');
  const [customBankAmount, setCustomBankAmount] = useState<number | ''>('');
  const bankDepositSmall = campaign?.config.economyRules?.bankTransactionIncrementSmall ?? 50;
  const bankDepositLarge = campaign?.config.economyRules?.bankTransactionIncrementLarge ?? 100;
  const loanPaymentAmount = campaign?.config.economyRules?.loanPaymentAmount ?? 50;
  
  return (
    <div className="interaction-panel">
      <h3>{t('bank.title', { defaultValue: 'Bank of Jones' })}</h3>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button onClick={() => setTab('banking')} style={{ fontWeight: tab === 'banking' ? 'bold' : 'normal' }}>{t('bank.tabBanking', { defaultValue: 'Bank' })}</button>
        {(!rules || rules.classicStockMarket) && (
          <button onClick={() => {
            if (tab !== 'stocks') {
              onAction({ type: 'open_broker' });
            }
            setTab('stocks');
          }} style={{ fontWeight: tab === 'stocks' ? 'bold' : 'normal' }}>{t('bank.tabStocks', { defaultValue: 'Stocks' })}</button>
        )}
        <button onClick={() => setTab('loans')} style={{ fontWeight: tab === 'loans' ? 'bold' : 'normal' }}>{t('bank.tabLoans', { defaultValue: 'Loans' })}</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <strong>{t('bank.cash', { defaultValue: 'Cash:' })}</strong> ${player.money}
        </div>
        {tab === 'banking' && (
          <div>
            <strong>{t('bank.savings', { defaultValue: 'Savings:' })}</strong> ${player.bankSavings}
          </div>
        )}
        {tab === 'loans' && (
          <div>
            <strong>{t('bank.debt', { defaultValue: 'Debt:' })}</strong> ${player.loanDebt || 0}
          </div>
        )}
      </div>
      
      {tab === 'banking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input 
              type="number" 
              min="1"
              value={customBankAmount}
              onChange={(e) => setCustomBankAmount(e.target.value ? parseInt(e.target.value) : '')}
              style={{ flex: 1, padding: '8px', background: '#222', color: 'white', border: '1px solid #555' }}
              placeholder={t('bank.customPlaceholder', { defaultValue: 'Custom amount...' })}
            />
            <button 
              onClick={() => {
                if (typeof customBankAmount === 'number' && customBankAmount > 0) {
                  onAction({ type: 'bank_transaction', amount: Math.min(customBankAmount, player.money) });
                  setCustomBankAmount('');
                }
              }} 
              disabled={player.money <= 0 || !customBankAmount || customBankAmount <= 0}
              style={{ background: player.money > 0 && typeof customBankAmount === 'number' && customBankAmount > 0 ? '#2ecc71' : '#555', color: player.money > 0 && typeof customBankAmount === 'number' && customBankAmount > 0 ? '#000' : '#888' }}
            >
              {t('bank.depositBtn', { defaultValue: 'Deposit' })}
            </button>
            <button 
              onClick={() => {
                if (typeof customBankAmount === 'number' && customBankAmount > 0) {
                  onAction({ type: 'bank_transaction', amount: -Math.min(customBankAmount, player.bankSavings) });
                  setCustomBankAmount('');
                }
              }} 
              disabled={player.bankSavings <= 0 || !customBankAmount || customBankAmount <= 0}
              style={{ background: player.bankSavings > 0 && typeof customBankAmount === 'number' && customBankAmount > 0 ? '#e74c3c' : '#555', color: player.bankSavings > 0 && typeof customBankAmount === 'number' && customBankAmount > 0 ? '#000' : '#888' }}
            >
              {t('bank.withdrawBtn', { defaultValue: 'Withdraw' })}
            </button>
          </div>
          <hr style={{ borderColor: '#444', margin: '5px 0' }} />
          <button 
            onClick={() => onAction({ type: 'bank_transaction', amount: Math.min(bankDepositSmall, player.money) })} 
            disabled={player.money <= 0}
          >
            {t('bank.depositAmount', { amount: bankDepositSmall, defaultValue: `Deposit $${bankDepositSmall} (or remainder)` })}
          </button>
          <button 
            onClick={() => onAction({ type: 'bank_transaction', amount: Math.min(bankDepositLarge, player.money) })} 
            disabled={player.money <= 0}
          >
            {t('bank.depositAmount', { amount: bankDepositLarge, defaultValue: `Deposit $${bankDepositLarge} (or remainder)` })}
          </button>
          <button 
            onClick={() => onAction({ type: 'bank_transaction', amount: -Math.min(bankDepositSmall, player.bankSavings) })} 
            disabled={player.bankSavings <= 0}
          >
            {t('bank.withdrawAmount', { amount: bankDepositSmall, defaultValue: `Withdraw $${bankDepositSmall} (or remainder)` })}
          </button>
          <button 
            onClick={() => onAction({ type: 'bank_transaction', amount: -Math.min(bankDepositLarge, player.bankSavings) })} 
            disabled={player.bankSavings <= 0}
          >
            {t('bank.withdrawAmount', { amount: bankDepositLarge, defaultValue: `Withdraw $${bankDepositLarge} (or remainder)` })}
          </button>
        </div>
      )}

      {tab === 'stocks' && campaign?.stocks && (!rules || rules.classicStockMarket) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {campaign.stocks.map(stock => {
            let price = stock.basePrice;
            if (stock.type === 'fluctuating') {
              const seed = turn * 997 + stock.id.charCodeAt(0) * 31;
              price = calcStockPrice(stock.basePrice, economicIndex, seed);
            }
            const owned = stock.id === 'tbills' 
              ? player.inventory.stocks.tBills 
              : (player.inventory.stocks.holdings[stock.id] || 0);

            return <StockTradeRow key={stock.id} stock={stock} price={price} owned={owned} playerMoney={player.money} onAction={onAction} />;
          })}
        </div>
      )}

      {tab === 'loans' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => onAction({ type: 'take_loan' })}>
            {t('bank.applyLoan', { cost: campaign?.config.timeRules?.loanCost ?? 2, defaultValue: `Apply for Loan (Costs ${campaign?.config.timeRules?.loanCost ?? 2} Hours)` })}
          </button>
          <button 
            onClick={() => onAction({ type: 'pay_loan' })} 
            disabled={player.money < Math.min(loanPaymentAmount, player.loanDebt || 0) || (player.loanDebt || 0) === 0}
          >
            {t('bank.makePayment', { amount: loanPaymentAmount, defaultValue: `Make Loan Payment ($${loanPaymentAmount} or remainder)` })}
          </button>
        </div>
      )}
    </div>
  );
}

export function PawnShop({ player, onAction, economicIndex = 0, pawnShopItemsForSale = [] }: InteractionProps & { economicIndex?: number, pawnShopItemsForSale?: import('../engine/gameState').PawnedItem[] }) {
  const { t } = useTranslation();
  const pawnableAppliances = player.inventory.appliances;
  const redeemableItems = player.inventory.pawnedItems || [];

  return (
    <div className="interaction-panel">
      <h3>{t('pawnShop.title', { defaultValue: 'Pawn Shop' })}</h3>
      
      <h4>{t('pawnShop.sellTitle', { defaultValue: 'Sell Items (40% Value)' })}</h4>
      {pawnableAppliances.length === 0 ? (
        <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#888' }}>{t('pawnShop.noSell', { defaultValue: 'You have no appliances to pawn.' })}</p>
      ) : (
        <ul className="store-list">
          {pawnableAppliances.map((app, idx) => {
            const pawnValue = Math.floor(calcEconomyPrice(app.purchasePrice, economicIndex) * 0.4);
            return (
              <li key={idx} className="store-item" onClick={() => onAction({ type: 'pawn_item', item: app, value: pawnValue })}>
                <span>{t(`item.${app.id}`, { defaultValue: app.id.replaceAll('_', ' ') })}</span>
                <span style={{ color: '#2ecc71' }}>+${pawnValue}</span>
              </li>
            );
          })}
        </ul>
      )}

      <h4 style={{ marginTop: '20px' }}>{t('pawnShop.buyTitle', { defaultValue: 'Buy Back (50% Value)' })}</h4>
      {redeemableItems.length === 0 ? (
        <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#888' }}>{t('pawnShop.noBuy', { defaultValue: 'You have no items pawned.' })}</p>
      ) : (
        <ul className="store-list">
          {redeemableItems.map((app, idx) => {
            const redeemCost = app.redeemCost;
            return (
              <li key={idx} className="store-item" onClick={() => onAction({ type: 'redeem_item', item: app, cost: redeemCost })}>
                <span>{t(`item.${app.itemId}`, { defaultValue: app.itemId.replaceAll('_', ' ') })}</span>
                <span style={{ color: '#e74c3c' }}>-${redeemCost}</span>
              </li>
            );
          })}
        </ul>
      )}

      {pawnShopItemsForSale.length > 0 && (
        <>
          <h4 style={{ marginTop: '20px' }}>{t('pawnShop.secondHandTitle', { defaultValue: 'Second Hand Items (50% Value)' })}</h4>
          <ul className="store-list">
            {pawnShopItemsForSale.map((app, idx) => {
              const buyCost = Math.floor(app.originalPrice * 0.5);
              return (
                <li key={idx} className="store-item" onClick={() => onAction({ type: 'buy_pawn_item', item: app, cost: buyCost })}>
                  <span>{t(`item.${app.itemId}`, { defaultValue: app.itemId.replaceAll('_', ' ') })}</span>
                  <span style={{ color: '#e74c3c' }}>-${buyCost}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export function UniversityRegistry({ player, onAction, availableDegrees, rules, campaign, economicIndex = 0 }: InteractionProps & { availableDegrees: EducationDef[], rules?: import('../engine/gameState').GameRules, campaign: CampaignBundle, economicIndex?: number }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'available'|'tree'>('available');

  const rootDegrees = availableDegrees.filter(d => d.prerequisites.length === 0);

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
          <h4>{t('university.available', { defaultValue: 'Available Degrees' })}</h4>
          {availableDegrees
            .filter(deg => deg.prerequisites.every(prereq => player.degrees.includes(prereq)))
            .filter(deg => !player.degrees.includes(deg.id))
            .map(deg => {
              const required = calcRequiredLessons(player, deg);
              const hasBonus = required < deg.lessonsRequired;
              const isEnrolled = player.enrolledClasses?.[deg.id] !== undefined;
              const lessonsCompleted = player.enrolledClasses?.[deg.id] || 0;

              const tuitionFee = calcEconomyPrice(deg.baseTuitionFee, economicIndex);

              return (
                <div key={deg.id} className="interaction-item" style={{ marginBottom: '10px', padding: '10px', border: '1px solid #4aa', borderRadius: '4px' }}>
                  <strong>{t(`education.${deg.id}`, { defaultValue: deg.name })}</strong> {isEnrolled ? '' : t('university.tuition', { fee: tuitionFee, defaultValue: `- Tuition: $${tuitionFee}` })}
                  {hasBonus && <span style={{ color: '#2ecc71', fontSize: '11px', marginInlineStart: '5px', fontWeight: 'bold' }}>{t('university.bonus', { defaultValue: '★ Bonus' })}</span>}
                  
                  {isEnrolled ? (
                    <>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>{t('university.lessons', { completed: lessonsCompleted, required, defaultValue: `Lessons: ${lessonsCompleted} / ${required}` })}</div>
                      <button 
                        style={{ marginTop: '5px', background: '#3498db' }} 
                        onClick={() => onAction({ type: 'study', degreeId: deg.id })} 
                        disabled={player.hoursRemaining < (rules?.allowPartialHours ? 1 : campaign.config.timeRules.studySessionCost)}
                      >
                        {t('university.studyBtn', { cost: campaign.config.timeRules.studySessionCost, defaultValue: `Study (${campaign.config.timeRules.studySessionCost}h)` })}
                      </button>
                    </>
                  ) : (
                    <button 
                      style={{ marginTop: '5px', background: '#2ecc71', color: '#000' }} 
                      onClick={() => onAction({ type: 'enroll', degreeId: deg.id })} 
                      disabled={player.money < tuitionFee}
                    >
                      {t('university.enrollBtn', { defaultValue: 'Enroll' })}
                    </button>
                  )}
                </div>
              );
            })}
          {availableDegrees.filter(deg => deg.prerequisites.every(prereq => player.degrees.includes(prereq)) && !player.degrees.includes(deg.id)).length === 0 && (
            <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#888' }}>{t('university.noClasses', { defaultValue: 'No classes available to take right now.' })}</p>
          )}
        </>
      )}

      {tab === 'tree' && (
        <div style={{ marginTop: '10px', padding: '10px', background: '#222', borderRadius: '4px', overflowX: 'auto' }}>
          {rootDegrees.map(root => (
            <ClassTreeNode key={root.id} degreeId={root.id} availableDegrees={availableDegrees} player={player} />
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

