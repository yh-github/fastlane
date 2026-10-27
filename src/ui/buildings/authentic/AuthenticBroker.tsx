import React, { useState, useEffect, useRef } from 'react';
import type { PlayerState, GameRules, EconomySimulationState } from '../../../engine/gameState';
import type { CampaignBundle } from '../../../engine/dataLoader';
import { calcStockPrice } from '../../../engine/economyEngine';
import { BROKER_STOCK_ITEMS, BROKER_DIALOGUE, type BrokerStockItem } from './brokerData';

interface AuthenticBrokerProps {
  player: PlayerState;
  onAction: (action: any) => void;
  onClose: () => void;
  onReturn?: () => void;
  campaign: CampaignBundle;
  turn?: number;
  economicIndex?: number;
  economySimulation?: EconomySimulationState;
  rules?: GameRules;
}

export const AuthenticBroker: React.FC<AuthenticBrokerProps> = ({
  player,
  onAction,
  onClose,
  onReturn,
  campaign,
  turn = 1,
  economicIndex = 0,
  economySimulation,
  rules: _rules
}) => {
  const basePath = '/assets/authentic/buildings/broker';

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [activeSpeech, setActiveSpeech] = useState<string>('');
  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSpeech = (text: string, durationMs: number = 3200) => {
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    setActiveSpeech(text);
    speechTimerRef.current = setTimeout(() => {
      setActiveSpeech('');
    }, durationMs);
  };

  useEffect(() => {
    return () => {
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    };
  }, []);

  const getStockPrice = (item: BrokerStockItem): { buyPrice: number; netSellPrice: number } => {
    const stockDef = campaign.stocks?.find(s => s.id === item.id) ?? {
      id: item.id,
      name: item.name,
      type: item.id === 'tbills' ? ('fixed' as const) : ('fluctuating' as const),
      basePrice: item.fixedPrice ?? 100,
      sellFeePercent: item.id === 'tbills' ? 3 : 0
    };

    let rawPrice = stockDef.basePrice;
    if (stockDef.type === 'fluctuating') {
      const seed = turn * 997 + stockDef.id.charCodeAt(0) * 31;
      rawPrice = calcStockPrice(stockDef.basePrice, economicIndex, seed, economySimulation, stockDef.id, campaign?.config?.economyRules);
    }

    const sellFeePercent = stockDef.sellFeePercent || 0;
    const sellFeePerShare = Math.floor(rawPrice * (sellFeePercent / 100));
    const netSellPrice = Math.max(0, rawPrice - sellFeePerShare);
    return { buyPrice: rawPrice, netSellPrice };
  };

  const getOwnedShares = (stockId: string): number => {
    if (stockId === 'tbills') {
      return player.inventory?.stocks?.tBills || 0;
    }
    return player.inventory?.stocks?.holdings?.[stockId] || 0;
  };

  const handleBuy = () => {
    const item = BROKER_STOCK_ITEMS[selectedIndex];
    const { buyPrice } = getStockPrice(item);
    if ((player.money ?? 0) < buyPrice) {
      triggerSpeech(BROKER_DIALOGUE.notEnoughCash);
      return;
    }
    onAction({ type: 'buy_stock', stockId: item.id, quantity: 1, cost: buyPrice });
    triggerSpeech(BROKER_DIALOGUE.boughtShare.replace('%s', item.name));
  };

  const handleSell = () => {
    const item = BROKER_STOCK_ITEMS[selectedIndex];
    const owned = getOwnedShares(item.id);
    if (owned <= 0) {
      triggerSpeech(BROKER_DIALOGUE.noShares);
      return;
    }
    const { netSellPrice } = getStockPrice(item);
    onAction({ type: 'sell_stock', stockId: item.id, quantity: 1, revenue: netSellPrice });
    if (item.id === 'tbills') {
      triggerSpeech(`${BROKER_DIALOGUE.soldShare.replace('%s', item.name)} (${BROKER_DIALOGUE.tBillFee})`);
    } else {
      triggerSpeech(BROKER_DIALOGUE.soldShare.replace('%s', item.name));
    }
  };

  const handleDone = () => {
    if (onReturn) {
      onReturn();
    } else {
      onClose();
    }
  };

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'escape' || key === 'x') {
        e.preventDefault();
        handleDone();
      } else if (key === 'b') {
        e.preventDefault();
        handleBuy();
      } else if (key === 's') {
        e.preventDefault();
        handleSell();
      } else if (key === 'arrowdown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % BROKER_STOCK_ITEMS.length);
      } else if (key === 'arrowup') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + BROKER_STOCK_ITEMS.length) % BROKER_STOCK_ITEMS.length);
      } else if (['1', '2', '3', '4', '5', '6'].includes(key)) {
        e.preventDefault();
        const idx = parseInt(key, 10) - 1;
        if (idx >= 0 && idx < BROKER_STOCK_ITEMS.length) {
          setSelectedIndex(idx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, player.money, player.inventory]);

  return (
    <div
      data-testid="authentic-broker"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* 183x112 Sierra SCI Viewport */}
      <div
        data-testid="authentic-broker-viewport"
        style={{
          position: 'relative',
          width: '183px',
          height: '112px',
          backgroundColor: '#000000',
          imageRendering: 'pixelated',
          overflow: 'hidden',
        }}
      >
        {/* Layer 1: Background (view.696 loop 0) */}
        <img
          src={`${basePath}/bg.png`}
          alt="Broker Interior"
          data-testid="broker-bg"
          style={{
            position: 'absolute',
            left: '0px',
            top: '0px',
            width: '183px',
            height: '112px',
            imageRendering: 'pixelated',
            pointerEvents: 'none',
          }}
        />

        {/* Column Headers */}
        <div
          style={{
            position: 'absolute',
            left: '110px',
            top: '8px',
            width: '32px',
            textAlign: 'center',
            fontFamily: 'monospace, "Courier New"',
            fontSize: '5.5px',
            lineHeight: '6px',
            fontWeight: 'bold',
            color: '#000000',
            whiteSpace: 'pre',
            pointerEvents: 'none',
          }}
        >
          {BROKER_DIALOGUE.marketValueHeader}
        </div>

        <div
          style={{
            position: 'absolute',
            left: '144px',
            top: '8px',
            width: '32px',
            textAlign: 'center',
            fontFamily: 'monospace, "Courier New"',
            fontSize: '5.5px',
            lineHeight: '6px',
            fontWeight: 'bold',
            color: '#000000',
            whiteSpace: 'pre',
            pointerEvents: 'none',
          }}
        >
          {BROKER_DIALOGUE.yourHoldingsHeader}
        </div>

        {/* Layer 2: 6 Stock Rows */}
        {BROKER_STOCK_ITEMS.map((item, index) => {
          const isSelected = selectedIndex === index;
          const { buyPrice } = getStockPrice(item);
          const owned = getOwnedShares(item.id);

          return (
            <div
              key={item.id}
              data-testid={`broker-row-${item.id}`}
              onClick={() => setSelectedIndex(index)}
              style={{
                position: 'absolute',
                left: '6px',
                top: `${item.top}px`,
                width: '171px',
                height: '11px',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.18)' : 'transparent',
                outline: isSelected ? '1px dotted #000000' : 'none',
                padding: '1px 2px',
                boxSizing: 'border-box',
                zIndex: 5,
              }}
            >
              {/* Asset Name Banner Sprite (97x9) */}
              <img
                src={`${basePath}/items/${item.bannerFile}`}
                alt={item.name}
                style={{
                  width: '97px',
                  height: '9px',
                  imageRendering: 'pixelated',
                  pointerEvents: 'none',
                }}
              />

              {/* Market Value ($) */}
              <div
                data-testid={`stock-price-${item.id}`}
                style={{
                  width: '32px',
                  textAlign: 'right',
                  fontFamily: 'monospace, "Courier New"',
                  fontSize: '6px',
                  fontWeight: 'bold',
                  color: '#000000',
                  marginRight: '6px',
                }}
              >
                ${buyPrice}
              </div>

              {/* Your Holdings */}
              <div
                data-testid={`stock-holdings-${item.id}`}
                style={{
                  width: '30px',
                  textAlign: 'right',
                  fontFamily: 'monospace, "Courier New"',
                  fontSize: '6px',
                  fontWeight: 'bold',
                  color: '#000000',
                }}
              >
                {owned}
              </div>
            </div>
          );
        })}

        {/* Layer 3: Buttons on bottom (view.250, y=103) */}
        {/* BUY Button at x=7 */}
        <img
          src={`${basePath}/buttons/buy.png`}
          alt="Buy"
          data-testid="btn-broker-buy"
          onClick={handleBuy}
          title="Buy 1 share (B)"
          style={{
            position: 'absolute',
            left: '7px',
            top: '103px',
            width: '30px',
            height: '7px',
            cursor: 'pointer',
            imageRendering: 'pixelated',
            zIndex: 6,
          }}
        />

        {/* SELL Button at x=77 */}
        <img
          src={`${basePath}/buttons/sell.png`}
          alt="Sell"
          data-testid="btn-broker-sell"
          onClick={handleSell}
          title="Sell 1 share (S)"
          style={{
            position: 'absolute',
            left: '77px',
            top: '103px',
            width: '30px',
            height: '7px',
            cursor: 'pointer',
            imageRendering: 'pixelated',
            zIndex: 6,
          }}
        />

        {/* DONE Button at x=143 */}
        <img
          src={`${basePath}/buttons/done.png`}
          alt="Done"
          data-testid="btn-broker-done"
          onClick={handleDone}
          title="Done (Exit)"
          style={{
            position: 'absolute',
            left: '143px',
            top: '103px',
            width: '30px',
            height: '7px',
            cursor: 'pointer',
            imageRendering: 'pixelated',
            zIndex: 6,
          }}
        />

        {/* Layer 4: Classic Sierra Speech / Notice Box */}
        {activeSpeech && (
          <div
            data-testid="broker-speech-bubble"
            onClick={() => setActiveSpeech('')}
            style={{
              position: 'absolute',
              left: '25px',
              top: '25px',
              width: '133px',
              backgroundColor: '#ffffea',
              border: '1.5px solid #000000',
              boxShadow: '1.5px 1.5px 0px rgba(0,0,0,0.6)',
              padding: '3px 6px',
              fontFamily: 'monospace, "Courier New"',
              fontSize: '6px',
              lineHeight: '7.5px',
              color: '#000000',
              zIndex: 15,
              cursor: 'pointer',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              textAlign: 'center',
            }}
          >
            {activeSpeech}
          </div>
        )}
      </div>
    </div>
  );
};
