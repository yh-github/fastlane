import type { PlayerState } from '../engine/gameState';

import type { JobDef, ItemDef, EducationDef, BuildingDef, CampaignBundle } from '../engine/dataLoader';

interface InteractionProps {
  player: PlayerState;
  onAction: (actionPayload: any) => void;
}

import { useState } from 'react';

/**
 * JobBoard — Shown at the Employment Office.
 * Lists ALL jobs across the game for applying, grouped by building.
 */
export function JobBoard({ player, onAction, availableJobs, buildings, economicIndex = 0 }: InteractionProps & { availableJobs: JobDef[], buildings: BuildingDef[], economicIndex?: number }) {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  // Group jobs by locationId
  const locations = Array.from(new Set(availableJobs.map(j => j.locationId)));

  if (!selectedLocation) {
    return (
      <div className="interaction-panel">
        <h3>Job Board: Select Location</h3>
        {locations.map(loc => {
          const jobCount = availableJobs.filter(j => j.locationId === loc).length;
          return (
            <div key={loc} className="interaction-item" style={{ marginBottom: '10px', padding: '5px', border: '1px solid #444', cursor: 'pointer' }} onClick={() => setSelectedLocation(loc)}>
              <strong>{buildings.find(b => b.id === loc)?.name || loc}</strong>
              <div style={{ fontSize: '12px' }}>{jobCount} position(s) available</div>
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
        <button onClick={() => setSelectedLocation(null)} style={{ marginRight: '10px', padding: '2px 5px' }}>← Back</button>
        Jobs at {buildings.find(b => b.id === selectedLocation)?.name || selectedLocation}
      </h3>
      {jobsAtLocation.map(job => {
        const isCurrentJob = player.currentJobId === job.id;
        const missingExp = player.experience < job.requirements.experience;
        const missingDep = player.dependability < job.requirements.dependability;
        const missingDegrees = job.requirements.degrees.filter(d => !player.degrees.includes(d));
        const offeredWage = calcEconomyPrice(job.baseWage, economicIndex);
        
        return (
          <div key={job.id} className="interaction-item" style={{ marginBottom: '10px', padding: '10px', border: '1px solid #444', borderRadius: '4px' }}>
            <strong>{job.title}</strong> — ${offeredWage}/hr (Base: ${job.baseWage})
            <div style={{ fontSize: '12px', marginTop: '5px' }}>
              <span style={{ color: missingExp ? '#e74c3c' : '#2ecc71' }}>Exp: {job.requirements.experience}</span> | 
              <span style={{ color: missingDep ? '#e74c3c' : '#2ecc71', marginLeft: '5px' }}>Dep: {job.requirements.dependability}</span>
              {job.requirements.degrees.length > 0 && (
                <span style={{ color: missingDegrees.length > 0 ? '#e74c3c' : '#2ecc71', marginLeft: '5px' }}>
                  | Degrees: {job.requirements.degrees.join(', ')}
                </span>
              )}
            </div>
            {(missingExp || missingDep || missingDegrees.length > 0) && (
              <div style={{ fontSize: '11px', color: '#e74c3c', fontStyle: 'italic', marginTop: '2px' }}>
                You do not meet the minimum requirements for this position.
              </div>
            )}
            <div style={{ marginTop: '10px' }}>
              {isCurrentJob ? (
                offeredWage > player.currentWage ? (
                  <button onClick={() => onAction({ type: 'apply', jobId: job.id, offeredWage })}>
                    Ask for Raise to ${offeredWage}/hr (4h)
                  </button>
                ) : (
                  <span style={{ color: '#4caf50', fontWeight: 'bold' }}>✓ Current Job (${player.currentWage}/hr)</span>
                )
              ) : (
                <button onClick={() => onAction({ type: 'apply', jobId: job.id, offeredWage })}>
                  Apply (4h)
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
export function WorkStation({ onAction, job }: InteractionProps & { job: JobDef }) {
  return (
    <div className="interaction-panel">
      <h3>Your Job: {job.title}</h3>
      <p style={{ fontSize: '12px', marginBottom: '10px' }}>${job.baseWage}/hr</p>
      <button onClick={() => onAction({ type: 'work', jobId: job.id })}>
        Work Shift (up to 6h)
      </button>
    </div>
  );
}

export function StoreFront({ player, onAction, availableItems }: InteractionProps & { availableItems: ItemDef[] }) {
  return (
    <div className="interaction-panel">
      <h3>Storefront</h3>
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
            <span>{item.name}</span>
            <span>${item.basePrice}</span>
          </div>
        );
      })}
    </div>
  );
}

export function HomeRelax({ onAction }: InteractionProps) {
  return (
    <div className="interaction-panel">
      <h3>Home Sweet Home</h3>
      <p style={{ fontSize: '12px', marginBottom: '10px' }}>Relax to restore happiness. Costs 5 hours.</p>
      <button onClick={() => onAction({ type: 'relax' })}>
        Relax (5h)
      </button>
    </div>
  );
}

import { calcEconomyPrice, calcStockPrice } from '../engine/economyEngine';
import { calcRequiredLessons } from '../engine/educationEngine';

import type { GameRules } from '../engine/gameState';

export function RentOffice({ player, onAction, campaign, turn = 1, economicIndex = 0, rules }: InteractionProps & { campaign?: CampaignBundle, turn?: number, economicIndex?: number, rules?: GameRules }) {
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
      <h3>Rent Office</h3>
      <p style={{ fontSize: '12px', marginBottom: '10px' }}>Current Residence: {currentHousing ? currentHousing.name : 'Homeless'}</p>
      
      {!isOpen ? (
        <div style={{ padding: '10px', backgroundColor: '#555', borderRadius: '4px', fontStyle: 'italic' }}>
          The Rent Office is closed. Come back during Week 4 to pay your rent or move to a new apartment.
        </div>
      ) : (
        <>
          {rentOwed > 0 && (
            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e74c3c', borderRadius: '4px' }}>
              <strong>Rent Due: ${rentOwed}</strong>
              <br/>
              <button 
                onClick={() => onAction({ type: 'rent_transaction', amount: rentOwed })}
                style={{ marginTop: '10px', backgroundColor: '#c0392b' }}
                disabled={player.money < rentOwed}
              >
                Pay Rent Debt
              </button>
            </div>
          )}

          {currentHousing && (
            <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #4aa' }}>
              <strong>Rent Paid Until: Week {player.rentPaidUntilWeek}</strong>
              <p style={{ fontSize: '12px' }}>(You have {player.rentPaidUntilWeek - turn} weeks of rent paid)</p>
              
              <button 
                onClick={() => onAction({ type: 'pay_rent_advance', amount: rentAdvanceCost })}
                style={{ marginTop: '5px' }}
                disabled={player.money < rentAdvanceCost}
              >
                Pay Rent Advance (${rentAdvanceCost} / mo)
              </button>
            </div>
          )}

          {rentDue && !player.rentExtensionActive && !player.turnFlags.askedForExtension && !player.rentExtensionsDeniedPermanently && (
            <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #c93' }}>
              <strong>Rent is Due!</strong>
              <p style={{ fontSize: '12px' }}>You can ask for a 1-week extension.</p>
              <button 
                onClick={() => onAction({ type: 'ask_rent_extension' })}
                style={{ marginTop: '5px', backgroundColor: '#e67e22' }}
              >
                Ask for Extension
              </button>
            </div>
          )}
          {player.rentExtensionActive && (
            <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #27ae60', color: '#27ae60' }}>
              <strong>Extension Granted</strong>
              <p style={{ fontSize: '12px', margin: 0 }}>Rent is due by the end of this week.</p>
            </div>
          )}
          {player.turnFlags.askedForExtension && !player.rentExtensionActive && (
            <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #e74c3c', color: '#e74c3c' }}>
              <strong>Extension Denied</strong>
              <p style={{ fontSize: '12px', margin: 0 }}>The Rent Officer denied your request. You must pay by the end of the week.</p>
            </div>
          )}
          {player.rentExtensionsDeniedPermanently && (
            <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #e74c3c', color: '#e74c3c' }}>
              <strong>Extensions Permanently Denied</strong>
              <p style={{ fontSize: '12px', margin: 0 }}>Due to past debts, you can never receive another rent extension.</p>
            </div>
          )}

          <h4>Available Apartments:</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            {lowCostHousing && player.currentHousingId !== lowCostHousing.id && (
              <div className="store-item">
                <span>{lowCostHousing.name} - ${lowCostMovePrice}/mo</span>
                <button 
                  onClick={() => onAction({ type: 'move_apartment', housingId: lowCostHousing.id, cost: lowCostMovePrice })}
                  disabled={player.money < lowCostMovePrice}
                >
                  Move In
                </button>
              </div>
            )}
            
            {securityHousing && player.currentHousingId !== securityHousing.id && (
              <div className="store-item">
                <span>{securityHousing.name} - ${securityMovePrice}/mo</span>
                <button 
                  onClick={() => onAction({ type: 'move_apartment', housingId: securityHousing.id, cost: securityMovePrice })}
                  disabled={player.money < securityMovePrice}
                >
                  Move In
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
function StockTradeRow({ stock, price, owned, playerMoney, onAction }: any) {
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
        <strong>{stock.name}</strong>
        <span>Price: ${price}</span>
      </div>
      <div style={{ fontSize: '12px', marginBottom: '10px', color: '#ccc' }}>Owned: {owned} shares</div>
      
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
          placeholder={tradeMode === 'shares' ? '0 shares' : '$0'}
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
          Buy (-${totalCost})
        </button>
        <button 
          onClick={() => onAction({ type: 'sell_stock', stockId: stock.id, quantity: numShares, revenue: totalRevenue })} 
          disabled={!canSell}
          style={{ flex: 1, background: canSell ? '#e74c3c' : '#555', color: canSell ? '#000' : '#888' }}
        >
          Sell (+${totalRevenue})
        </button>
      </div>
      {stock.sellFeePercent > 0 && canSell && (
        <div style={{ fontSize: '11px', color: '#e74c3c', marginTop: '4px' }}>
          *{stock.sellFeePercent}% transaction fee applied to sale.
        </div>
      )}
    </div>
  );
}

export function BankInterface({ player, onAction, campaign, turn = 1, economicIndex = 0, rules }: InteractionProps & { campaign?: CampaignBundle, turn?: number, economicIndex?: number, rules?: GameRules }) {
  const [tab, setTab] = useState<'bank'|'stocks'|'loans'>('bank');
  const [customBankAmount, setCustomBankAmount] = useState<number | ''>('');
  
  return (
    <div className="interaction-panel">
      <h3>Bank of Jones</h3>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button onClick={() => setTab('bank')} style={{ fontWeight: tab === 'bank' ? 'bold' : 'normal' }}>Bank</button>
        {(!rules || rules.classicStockMarket) && (
          <button onClick={() => setTab('stocks')} style={{ fontWeight: tab === 'stocks' ? 'bold' : 'normal' }}>Stocks</button>
        )}
        <button onClick={() => setTab('loans')} style={{ fontWeight: tab === 'loans' ? 'bold' : 'normal' }}>Loans</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <strong>Cash:</strong> ${player.money}
        </div>
        {tab === 'bank' && (
          <div>
            <strong>Savings:</strong> ${player.bankSavings}
          </div>
        )}
        {tab === 'loans' && (
          <div>
            <strong>Debt:</strong> ${player.loanDebt || 0}
          </div>
        )}
      </div>
      
      {tab === 'bank' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input 
              type="number" 
              min="1"
              value={customBankAmount}
              onChange={(e) => setCustomBankAmount(e.target.value ? parseInt(e.target.value) : '')}
              style={{ flex: 1, padding: '8px', background: '#222', color: 'white', border: '1px solid #555' }}
              placeholder="Custom amount..."
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
              Deposit
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
              Withdraw
            </button>
          </div>
          <hr style={{ borderColor: '#444', margin: '5px 0' }} />
          <button 
            onClick={() => onAction({ type: 'bank_transaction', amount: Math.min(50, player.money) })} 
            disabled={player.money <= 0}
          >
            Deposit $50 (or remainder)
          </button>
          <button 
            onClick={() => onAction({ type: 'bank_transaction', amount: Math.min(100, player.money) })} 
            disabled={player.money <= 0}
          >
            Deposit $100 (or remainder)
          </button>
          <button 
            onClick={() => onAction({ type: 'bank_transaction', amount: -Math.min(50, player.bankSavings) })} 
            disabled={player.bankSavings <= 0}
          >
            Withdraw $50 (or remainder)
          </button>
          <button 
            onClick={() => onAction({ type: 'bank_transaction', amount: -Math.min(100, player.bankSavings) })} 
            disabled={player.bankSavings <= 0}
          >
            Withdraw $100 (or remainder)
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
            Apply for Loan (Costs 2 Hours)
          </button>
          <button 
            onClick={() => onAction({ type: 'pay_loan' })} 
            disabled={player.money < Math.min(50, player.loanDebt || 0) || (player.loanDebt || 0) === 0}
          >
            Make Loan Payment ($50 or remainder)
          </button>
        </div>
      )}
    </div>
  );
}

export function PawnShop({ player, onAction, economicIndex = 0 }: InteractionProps & { economicIndex?: number }) {
  const pawnableAppliances = player.inventory.appliances;
  const redeemableItems = player.inventory.pawnedItems || [];

  return (
    <div className="interaction-panel">
      <h3>Pawn Shop</h3>
      
      <h4>Sell Items (40% Value)</h4>
      {pawnableAppliances.length === 0 ? (
        <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#888' }}>You have no appliances to pawn.</p>
      ) : (
        <ul className="store-list">
          {pawnableAppliances.map((app, idx) => {
            const pawnValue = Math.floor(calcEconomyPrice(app.purchasePrice, economicIndex) * 0.4);
            return (
              <li key={idx} className="store-item" onClick={() => onAction({ type: 'pawn_item', item: app, value: pawnValue })}>
                <span>{app.id.replaceAll('_', ' ')}</span>
                <span style={{ color: '#2ecc71' }}>+${pawnValue}</span>
              </li>
            );
          })}
        </ul>
      )}

      <h4 style={{ marginTop: '20px' }}>Buy Back (50% Value)</h4>
      {redeemableItems.length === 0 ? (
        <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#888' }}>You have no items pawned.</p>
      ) : (
        <ul className="store-list">
          {redeemableItems.map((app, idx) => {
            const redeemCost = app.redeemCost;
            return (
              <li key={idx} className="store-item" onClick={() => onAction({ type: 'redeem_item', item: app, cost: redeemCost })}>
                <span>{app.itemId.replaceAll('_', ' ')}</span>
                <span style={{ color: '#e74c3c' }}>-${redeemCost}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function UniversityRegistry({ player, onAction, availableDegrees, rules, campaign, economicIndex = 0 }: InteractionProps & { availableDegrees: EducationDef[], rules?: import('../engine/gameState').GameRules, campaign: CampaignBundle, economicIndex?: number }) {
  return (
    <div className="interaction-panel">
      <h3>University Registry</h3>

      <h4>Available Degrees</h4>
      {availableDegrees
        .filter(deg => deg.prerequisites.every(prereq => player.degrees.includes(prereq)))
        .map(deg => {
        const hasDegree = player.degrees.includes(deg.id);
        if (hasDegree) return (
          <div key={deg.id} className="interaction-item" style={{ marginBottom: '10px', padding: '5px', border: '1px solid #444' }}>
            <strong>{deg.name}</strong>
            <div style={{ color: '#2ecc71', fontWeight: 'bold' }}>Completed ✓</div>
          </div>
        );

        const required = calcRequiredLessons(player, deg);
        const hasBonus = required < deg.lessonsRequired;
        const isEnrolled = player.enrolledClasses?.[deg.id] !== undefined;
        const lessonsCompleted = player.enrolledClasses?.[deg.id] || 0;

        const tuitionFee = calcEconomyPrice(deg.baseTuitionFee, economicIndex);

        return (
          <div key={deg.id} className="interaction-item" style={{ marginBottom: '10px', padding: '5px', border: '1px solid #4aa' }}>
            <strong>{deg.name}</strong> {isEnrolled ? '' : `- Tuition: $${tuitionFee}`}
            {hasBonus && <span style={{ color: '#2ecc71', fontSize: '11px', marginLeft: '5px', fontWeight: 'bold' }}>★ Bonus</span>}
            
            {isEnrolled ? (
              <>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>Lessons: {lessonsCompleted} / {required}</div>
                <button 
                  style={{ marginTop: '5px' }} 
                  onClick={() => onAction({ type: 'study', degreeId: deg.id })} 
                  disabled={player.hoursRemaining < (rules?.studyWithPartialHours ? 1 : campaign.config.timeRules.studySessionCost)}
                >
                  Study ({campaign.config.timeRules.studySessionCost}h)
                </button>
              </>
            ) : (
              <button 
                style={{ marginTop: '5px' }} 
                onClick={() => onAction({ type: 'enroll', degreeId: deg.id })} 
                disabled={player.money < tuitionFee}
              >
                Enroll
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

