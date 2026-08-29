import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { StockDef, CampaignBundle } from '../../engine/dataLoader';
import type { GameRules } from '../../engine/gameState';
import { calcStockPrice } from '../../engine/economyEngine';
import { ActionReasonModal } from './ActionReasonModal';
import type { InteractionProps } from './types';

export function StockTradeDialog({ 
  stock, 
  price, 
  owned, 
  playerMoney, 
  mode, 
  onConfirm, 
  onClose 
}: { 
  stock: StockDef;
  price: number;
  owned: number;
  playerMoney: number;
  mode: 'buy' | 'sell';
  onConfirm: (quantity: number, amount: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [sharesInput, setSharesInput] = useState<string>('1');
  const [cashInput, setCashInput] = useState<string>(String(price));

  const sellFeePercent = stock.sellFeePercent || 0;
  const sellFeePerShare = Math.floor(price * (sellFeePercent / 100));
  const netSellPricePerShare = Math.max(0, price - sellFeePerShare);

  const numShares = Math.max(0, parseInt(sharesInput, 10) || 0);

  const handleSharesChange = (valStr: string) => {
    setSharesInput(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      const calculatedCash = mode === 'buy' ? parsed * price : parsed * netSellPricePerShare;
      setCashInput(String(calculatedCash));
    } else {
      setCashInput('');
    }
  };

  const handleCashChange = (valStr: string) => {
    setCashInput(valStr);
    const parsedCash = parseFloat(valStr);
    if (!isNaN(parsedCash) && parsedCash >= 0) {
      const targetPrice = mode === 'buy' ? price : netSellPricePerShare;
      const calculatedShares = targetPrice > 0 ? Math.floor(parsedCash / targetPrice) : 0;
      setSharesInput(String(calculatedShares));
    } else {
      setSharesInput('');
    }
  };

  const totalCost = numShares * price;
  const grossRevenue = numShares * price;
  const totalSellFee = numShares * sellFeePerShare;
  const netRevenue = numShares * netSellPricePerShare;

  const isBuy = mode === 'buy';
  const canConfirm = isBuy 
    ? (numShares > 0 && playerMoney >= totalCost)
    : (numShares > 0 && owned >= numShares);

  let validationError = '';
  if (numShares <= 0) {
    validationError = isBuy ? 'Enter a valid share or cash amount to buy.' : 'Enter a valid share or cash amount to sell.';
  } else if (isBuy && totalCost > playerMoney) {
    validationError = `Not enough cash (Costs $${totalCost}, you have $${playerMoney}).`;
  } else if (!isBuy && numShares > owned) {
    validationError = `You cannot sell more shares than you own (You have ${owned} shares).`;
  }

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--panel-bg, #13132c)', backdropFilter: 'blur(15px)', color: '#fff', padding: '24px', border: `1px solid ${isBuy ? '#2ecc71' : '#e74c3c'}`, borderRadius: '12px', boxShadow: `0 10px 30px rgba(0,0,0,0.8), 0 0 10px ${isBuy ? 'rgba(46,204,113,0.5)' : 'rgba(231,76,60,0.5)'}`, zIndex: 10000, maxWidth: '440px', width: '90%', textAlign: 'center' }}>
      <h3 style={{ margin: '0 0 10px 0', color: isBuy ? '#2ecc71' : '#e74c3c' }}>
        {isBuy ? `📈 Buy ${t(`stock.${stock.id}`, { defaultValue: stock.name })}` : `📉 Sell ${t(`stock.${stock.id}`, { defaultValue: stock.name })}`}
      </h3>

      <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '15px' }}>
        Price: <strong>${price}</strong> / share | {isBuy ? `Available Cash: $${playerMoney}` : `Owned Shares: ${owned}`}
      </div>

      <div style={{ background: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '8px', marginBottom: '15px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>
            Quantity of Shares:
          </label>
          <input 
            type="number"
            min="1"
            max={!isBuy ? owned : undefined}
            value={sharesInput}
            onChange={(e) => handleSharesChange(e.target.value)}
            style={{ width: '100%', padding: '8px', background: '#222', color: '#fff', border: '1px solid #555', borderRadius: '4px', boxSizing: 'border-box' }}
            placeholder="Shares count..."
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>
            {isBuy ? 'Total Cash Amount ($):' : 'Estimated Net Cash ($):'}
          </label>
          <input 
            type="number"
            min="0"
            value={cashInput}
            onChange={(e) => handleCashChange(e.target.value)}
            style={{ width: '100%', padding: '8px', background: '#222', color: '#fff', border: '1px solid #555', borderRadius: '4px', boxSizing: 'border-box' }}
            placeholder="$ Amount..."
          />
        </div>
      </div>

      <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '6px', marginBottom: '15px', fontSize: '12px', lineHeight: '1.6' }}>
        {isBuy ? (
          <>
            <div><strong>Total Cost:</strong> ${totalCost}</div>
            <div><strong>Cash Remaining:</strong> ${Math.max(0, playerMoney - totalCost)}</div>
          </>
        ) : (
          <>
            <div><strong>Gross Revenue:</strong> ${grossRevenue}</div>
            {sellFeePercent > 0 && (
              <div style={{ color: '#e74c3c' }}>✂️ <strong>Fee ({sellFeePercent}%):</strong> -${totalSellFee}</div>
            )}
            <div><strong>Net Revenue:</strong> ${netRevenue}</div>
            <div>📈 <strong>Shares Remaining:</strong> {Math.max(0, owned - numShares)}</div>
          </>
        )}
      </div>

      {validationError && (
        <div style={{ fontSize: '12px', color: '#e74c3c', marginBottom: '15px', fontWeight: 'bold' }}>
          ⚠️ {validationError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => onConfirm(numShares, isBuy ? totalCost : netRevenue)}
          disabled={!canConfirm}
          style={{ flex: 1, padding: '10px', background: canConfirm ? (isBuy ? '#2ecc71' : '#e74c3c') : '#555', color: canConfirm ? (isBuy ? '#000' : '#fff') : '#888', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: canConfirm ? 'pointer' : 'not-allowed' }}
        >
          {isBuy ? `Confirm Buy ($${totalCost})` : `Confirm Sell (+$${netRevenue})`}
        </button>
        <button 
          onClick={onClose}
          style={{ flex: 1, padding: '10px', background: 'transparent', color: '#fff', border: '1px solid #666', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
}

export function BankTransactionDialog({
  mode,
  playerCash,
  playerSavings,
  onConfirm,
  onClose
}: {
  mode: 'deposit' | 'withdraw';
  playerCash: number;
  playerSavings: number;
  onConfirm: (amount: number) => void;
  onClose: () => void;
}) {
  const [amountInput, setAmountInput] = useState<string>('50');

  const isDeposit = mode === 'deposit';
  const maxAvailable = isDeposit ? playerCash : playerSavings;
  const amount = Math.max(0, parseInt(amountInput, 10) || 0);

  const canConfirm = amount > 0 && amount <= maxAvailable;

  let validationError = '';
  if (amount <= 0) {
    validationError = 'Please enter an amount greater than zero.';
  } else if (amount > maxAvailable) {
    validationError = isDeposit 
      ? `Amount exceeds available cash ($${playerCash}).` 
      : `Amount exceeds bank savings ($${playerSavings}).`;
  }

  const updatedCash = isDeposit ? playerCash - amount : playerCash + amount;
  const updatedSavings = isDeposit ? playerSavings + amount : playerSavings - amount;

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--panel-bg, #13132c)', backdropFilter: 'blur(15px)', color: '#fff', padding: '24px', border: `1px solid ${isDeposit ? '#2ecc71' : '#3498db'}`, borderRadius: '12px', boxShadow: `0 10px 30px rgba(0,0,0,0.8), 0 0 10px ${isDeposit ? 'rgba(46,204,113,0.5)' : 'rgba(52,152,219,0.5)'}`, zIndex: 10000, maxWidth: '420px', width: '90%', textAlign: 'center' }}>
      <h3 style={{ margin: '0 0 10px 0', color: isDeposit ? '#2ecc71' : '#3498db' }}>
        {isDeposit ? '🏦 Deposit Money into Savings' : '🏧 Withdraw Savings to Cash'}
      </h3>

      <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '15px' }}>
        Current Cash: <strong>${playerCash}</strong> | Savings: <strong>${playerSavings}</strong>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '8px', marginBottom: '15px', textAlign: 'left' }}>
        <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>
          Exact Amount ($):
        </label>
        <input 
          type="number"
          min="1"
          max={maxAvailable}
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          style={{ width: '100%', padding: '8px', background: '#222', color: '#fff', border: '1px solid #555', borderRadius: '4px', boxSizing: 'border-box', marginBottom: '10px' }}
          placeholder="Enter amount..."
        />

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button"
            onClick={() => setAmountInput('50')}
            style={{ flex: 1, padding: '4px 8px', fontSize: '11px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer' }}
          >
            $50
          </button>
          <button 
            type="button"
            onClick={() => setAmountInput('100')}
            style={{ flex: 1, padding: '4px 8px', fontSize: '11px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer' }}
          >
            $100
          </button>
          <button 
            type="button"
            onClick={() => setAmountInput(String(maxAvailable))}
            style={{ flex: 1, padding: '4px 8px', fontSize: '11px', background: '#4aa', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Max (${maxAvailable})
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '6px', marginBottom: '15px', fontSize: '12px', lineHeight: '1.6' }}>
        <div><strong>Cash After Transaction:</strong> ${Math.max(0, updatedCash)}</div>
        <div>🏦 <strong>Savings After Transaction:</strong> ${Math.max(0, updatedSavings)}</div>
        {!isDeposit && (
          <div style={{ fontSize: '11px', color: '#e67e22', marginTop: '4px' }}>
            ℹ️ Early withdrawal fees apply if specified by rules.
          </div>
        )}
      </div>

      {validationError && (
        <div style={{ fontSize: '12px', color: '#e74c3c', marginBottom: '15px', fontWeight: 'bold' }}>
          ⚠️ {validationError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => onConfirm(amount)}
          disabled={!canConfirm}
          style={{ flex: 1, padding: '10px', background: canConfirm ? (isDeposit ? '#2ecc71' : '#3498db') : '#555', color: canConfirm ? (isDeposit ? '#000' : '#fff') : '#888', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: canConfirm ? 'pointer' : 'not-allowed' }}
        >
          {isDeposit ? `Confirm Deposit ($${amount})` : `Confirm Withdraw ($${amount})`}
        </button>
        <button 
          onClick={onClose}
          style={{ flex: 1, padding: '10px', background: 'transparent', color: '#fff', border: '1px solid #666', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
}

export function StockTradeRow({ stock, price, owned, playerMoney, onAction }: { stock: StockDef, price: number, owned: number, playerMoney: number, onAction: (payload: any) => void }) {
  const { t } = useTranslation();
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell' | null>(null);
  const [reasonMsg, setReasonMsg] = useState<string | null>(null);

  const canBuy = price > 0 && playerMoney >= price;
  const canSell = owned > 0;

  const handleBuyClick = () => {
    if (!canBuy) {
      setReasonMsg(`You need at least $${price} in cash to buy 1 share of ${stock.name}. You currently have $${playerMoney}.`);
    } else {
      setTradeMode('buy');
    }
  };

  const handleSellClick = () => {
    if (!canSell) {
      setReasonMsg(`You do not own any shares of ${stock.name} to sell.`);
    } else {
      setTradeMode('sell');
    }
  };

  return (
    <div style={{ padding: '12px', border: '1px solid #4aa', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <strong>{t(`stock.${stock.id}`, { defaultValue: stock.name })}</strong>
        <span style={{ color: '#00e5ff', fontWeight: 'bold' }}>
          {t('stocks.price', { price, defaultValue: `$${price}/share` })}
        </span>
      </div>
      <div style={{ fontSize: '12px', marginBottom: '12px', color: '#ccc' }}>
        {t('stocks.owned', { count: owned, defaultValue: `Owned: ${owned} shares` })}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={handleBuyClick}
          style={{ 
            flex: 1, 
            padding: '8px',
            background: canBuy ? '#2ecc71' : '#555', 
            color: canBuy ? '#000' : '#aaa', 
            border: 'none', 
            borderRadius: '4px', 
            fontWeight: 'bold', 
            cursor: 'pointer',
            opacity: canBuy ? 1 : 0.6
          }}
        >
          {t('stocks.buyBtn', { defaultValue: 'Buy' })}
        </button>
        <button 
          onClick={handleSellClick}
          style={{ 
            flex: 1, 
            padding: '8px',
            background: canSell ? '#e74c3c' : '#555', 
            color: canSell ? '#fff' : '#aaa', 
            border: 'none', 
            borderRadius: '4px', 
            fontWeight: 'bold', 
            cursor: 'pointer',
            opacity: canSell ? 1 : 0.6
          }}
        >
          {t('stocks.sellBtn', { defaultValue: 'Sell' })}
        </button>
      </div>

      {reasonMsg && (
        <ActionReasonModal 
          title="Stock Trade Unavailable" 
          reason={reasonMsg} 
          onClose={() => setReasonMsg(null)} 
        />
      )}

      {tradeMode && (
        <StockTradeDialog
          stock={stock}
          price={price}
          owned={owned}
          playerMoney={playerMoney}
          mode={tradeMode}
          onConfirm={(quantity, amount) => {
            if (tradeMode === 'buy') {
              onAction({ type: 'buy_stock', stockId: stock.id, quantity, cost: amount });
            } else {
              onAction({ type: 'sell_stock', stockId: stock.id, quantity, revenue: amount });
            }
            setTradeMode(null);
          }}
          onClose={() => setTradeMode(null)}
        />
      )}
    </div>
  );
}

export function BankInterface({ player, onAction, campaign, turn = 1, economicIndex = 0, rules: _rules }: InteractionProps & { campaign?: CampaignBundle, turn?: number, economicIndex?: number, rules?: GameRules }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'banking'|'stocks'|'loans'>('banking');
  const [bankDialogMode, setBankDialogMode] = useState<'deposit' | 'withdraw' | null>(null);
  const [reasonMsg, setReasonMsg] = useState<string | null>(null);

  const loanPaymentAmount = campaign?.config?.economyRules?.loanPaymentAmount ?? 50;

  const canDeposit = player.money > 0;
  const canWithdraw = player.bankSavings > 0;

  const handleDepositClick = () => {
    if (!canDeposit) {
      setReasonMsg("You don't have any cash to deposit.");
    } else {
      setBankDialogMode('deposit');
    }
  };

  const handleWithdrawClick = () => {
    if (!canWithdraw) {
      setReasonMsg("You don't have any bank savings to withdraw.");
    } else {
      setBankDialogMode('withdraw');
    }
  };
  
  return (
    <div className="interaction-panel">
      <h3>{t('bank.title', { defaultValue: 'Bank of Jones' })}</h3>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button onClick={() => setTab('banking')} style={{ fontWeight: tab === 'banking' ? 'bold' : 'normal' }}>{t('bank.tabBanking', { defaultValue: 'Bank' })}</button>
        {(!campaign || !campaign.stocks || campaign.stocks.length > 0) && (
          <button 
            data-testid="tab-stocks"
            onClick={() => {
              if (tab !== 'stocks') {
                onAction({ type: 'open_broker' });
              }
              setTab('stocks');
            }} 
            style={{ fontWeight: tab === 'stocks' ? 'bold' : 'normal' }}
          >
            {t('bank.tabStocks', { defaultValue: 'Stocks' })}
          </button>
        )}
        <button onClick={() => setTab('loans')} style={{ fontWeight: tab === 'loans' ? 'bold' : 'normal' }}>{t('bank.tabLoans', { defaultValue: 'Loans' })}</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <strong>{t('bank.cash', { defaultValue: 'Cash:' })}</strong> ${player.money}
        </div>
        {tab === 'banking' && (
          <div>
            <strong>{t('bank.savings', { defaultValue: 'Savings:' })}</strong> 🏦${player.bankSavings}
          </div>
        )}
        {tab === 'loans' && (
          <div>
            <strong>{t('bank.debt', { defaultValue: 'Debt:' })}</strong> ${player.loanDebt || 0}
          </div>
        )}
      </div>
      
      {tab === 'banking' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '10px' }}>
          <button 
            onClick={handleDepositClick}
            style={{
              padding: '16px',
              background: canDeposit ? '#2ecc71' : '#555',
              color: canDeposit ? '#000' : '#aaa',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '15px',
              cursor: canDeposit ? 'pointer' : 'not-allowed',
              opacity: canDeposit ? 1 : 0.6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span style={{ fontSize: '1.8rem' }}>📥</span>
            <span>{t('bank.depositBtn', { defaultValue: 'Deposit Money' })}</span>
          </button>
          <button 
            onClick={handleWithdrawClick}
            style={{
              padding: '16px',
              background: canWithdraw ? '#3498db' : '#555',
              color: canWithdraw ? '#fff' : '#aaa',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '15px',
              cursor: canWithdraw ? 'pointer' : 'not-allowed',
              opacity: canWithdraw ? 1 : 0.6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span style={{ fontSize: '1.8rem' }}>📤</span>
            <span>{t('bank.withdrawBtn', { defaultValue: 'Withdraw Money' })}</span>
          </button>
        </div>
      )}

      {reasonMsg && (
        <ActionReasonModal 
          title="Bank Action Unavailable" 
          reason={reasonMsg} 
          onClose={() => setReasonMsg(null)} 
        />
      )}

      {bankDialogMode && (
        <BankTransactionDialog
          mode={bankDialogMode}
          playerCash={player.money}
          playerSavings={player.bankSavings}
          onConfirm={(amount) => {
            const finalAmount = bankDialogMode === 'deposit' ? amount : -amount;
            onAction({ type: 'bank_transaction', amount: finalAmount });
            setBankDialogMode(null);
          }}
          onClose={() => setBankDialogMode(null)}
        />
      )}

      {tab === 'stocks' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          {(campaign?.stocks || [
            { id: 'tbills', name: 'Treasury Bills', type: 'fixed', basePrice: 100 },
            { id: 'blue_chip', name: 'Blue Chip Stocks', type: 'fluctuating', basePrice: 49 },
            { id: 'penny_stocks', name: 'Penny Stocks', type: 'fluctuating', basePrice: 7 }
          ]).map(stock => {
            let price = stock.basePrice;
            if (stock.type === 'fluctuating') {
              const seed = turn * 997 + stock.id.charCodeAt(0) * 31;
              price = calcStockPrice(stock.basePrice, economicIndex, seed);
            }
            const owned = stock.id === 'tbills' 
              ? (player.inventory?.stocks?.tBills || 0)
              : (player.inventory?.stocks?.holdings?.[stock.id] || 0);

            return <StockTradeRow key={stock.id} stock={stock as any} price={price} owned={owned} playerMoney={player.money} onAction={onAction} />;
          })}
        </div>
      )}

      {tab === 'loans' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '10px' }}>
          <button 
            onClick={() => onAction({ type: 'take_loan' })}
            style={{ padding: '14px', borderRadius: '8px' }}
          >
            📝 {t('bank.applyLoan', { cost: campaign?.config.timeRules?.loanCost ?? 2, defaultValue: `Apply for Loan (Costs ⏳ ${campaign?.config.timeRules?.loanCost ?? 2} Hours)` })}
          </button>
          <button 
            onClick={() => onAction({ type: 'pay_loan' })} 
            style={{ padding: '14px', borderRadius: '8px' }}
          >
            {t('bank.makePayment', { amount: loanPaymentAmount, defaultValue: `Make Loan Payment ($${loanPaymentAmount} or remainder)` })}
          </button>
        </div>
      )}
    </div>
  );
}
