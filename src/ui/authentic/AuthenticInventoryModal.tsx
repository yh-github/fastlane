import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { PlayerState, GameRules } from '../../engine/gameState';
import type { CampaignBundle } from '../../engine/dataLoader';
import { getClothesSwitchingRule } from '../../engine/rules';
import {
  calcEmployabilityScore,
  calcEffectiveRobberyChance,
  calcMaxDependability,
  calcMaxExperience,
  calcRaiseThreshold
} from '../../engine/statMath';

interface AuthenticInventoryModalProps {
  player: PlayerState;
  campaign?: CampaignBundle;
  turn?: number;
  onAction?: (action: any) => void;
  onClose: () => void;
  rules?: GameRules;
  onOpenGoals?: () => void;
  onOpenDiploma?: (degreeId: string, degreeName: string) => void;
  onOpenLottery?: (prizeAmount: number) => void;
  onOpenLog?: () => void;
  scrollToSection?: string | null;
}

export const AuthenticInventoryModal: React.FC<AuthenticInventoryModalProps> = ({
  player,
  campaign,
  turn = 1,
  onAction,
  onClose,
  rules,
  onOpenGoals,
  onOpenDiploma,
  onOpenLottery,
  onOpenLog,
  scrollToSection
}) => {
  const [showFormulas, setShowFormulas] = useState(false);
  const [scrollIndex, setScrollIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const basePath = '/assets/authentic/status';
  const effectiveRules = rules || campaign?.config.gameRules;

  // Job and Housing
  const currentJob = campaign?.jobs.find(j => j.id === player.currentJobId);
  const currentWorkplace = currentJob
    ? campaign?.buildings?.find(b => b.id === currentJob.locationId)?.name || currentJob.locationId
    : null;

  // Total Goods Value calculation
  const totalGoodsValue = useMemo(() => {
    let sum = 0;
    for (const app of player.inventory.appliances) {
      const itemDef = campaign?.items.find(i => i.id === app.id);
      const price = app.purchasePrice ?? itemDef?.basePrice ?? 100;
      sum += price;
    }
    return sum;
  }, [player.inventory.appliances, campaign?.items]);

  // Investment Total calculation (Stocks + T-Bills)
  const investmentTotal = useMemo(() => {
    let sum = (player.inventory.stocks.tBills || 0) * 10000;
    for (const [stockId, shares] of Object.entries(player.inventory.stocks.holdings)) {
      if (shares > 0) {
        const stockDef = campaign?.stocks?.find(s => s.id === stockId);
        const curPrice = stockDef?.basePrice ?? 25;
        sum += shares * curPrice;
      }
    }
    return sum;
  }, [player.inventory.stocks, campaign?.stocks]);

  // Net Worth calculation
  const netWorth = (player.money || 0) +
    (player.bankSavings || 0) +
    totalGoodsValue +
    investmentTotal -
    (player.loanDebt || 0) -
    (player.rentDebt || 0);

  // Weeks of Food (in Sierra Jones, 6 food units = 1 week)
  const totalFoodUnits = (player.inventory.freshFoodUnits || 0) + (player.inventory.cannedFoodUnits || 0);
  const weeksOfFood = Math.floor(totalFoodUnits / 6);

  // Clothes rule & status
  const clothesRule = getClothesSwitchingRule(rules);
  const canSwitchClothes = clothesRule === 'anywhere';

  // Format the Sierra SCI lines for invSelector
  interface TextLine {
    text: string;
    isHeader?: boolean;
    isClickable?: boolean;
    onClick?: () => void;
    highlight?: boolean;
  }

  const lines = useMemo<TextLine[]>(() => {
    const res: TextLine[] = [];

    // Helper: Center text within 25 characters
    const center = (str: string, width = 25) => {
      const s = str.slice(0, width);
      const leftPad = Math.max(0, Math.floor((width - s.length) / 2));
      return ' '.repeat(leftPad) + s;
    };

    // 1. Centered Player Name
    res.push({ text: center(player.name), isHeader: true });

    // 2. Job Info
    if (currentJob && currentWorkplace) {
      res.push({ text: `Works at ${currentWorkplace.slice(0, 16)}` });
      res.push({ text: `As a ${currentJob.title.slice(0, 20)}` });
      res.push({ text: `Hourly wage: $${player.currentWage ?? currentJob.baseWage}` });
    } else {
      res.push({ text: '' });
      res.push({ text: center('Unemployed') });
      res.push({ text: '' });
    }

    // 3. Finances
    res.push({ text: `Cash: $${player.money}` });
    res.push({ text: `Savings: $${player.bankSavings}` });
    res.push({ text: `Rent Owed: $${player.rentDebt}` });
    res.push({ text: `Loan Balance: $${player.loanDebt}` });
    res.push({ text: `Total Goods: $${totalGoodsValue}` });
    res.push({ text: `Investment Total: $${investmentTotal}` });
    res.push({ text: `Net Worth: $${netWorth}` });

    // 4. Goods Header
    res.push({ text: '-----GOODS-----', isHeader: true });

    // Clothes entries
    const curWorn = player.inventory.selectedClothes;
    if (player.inventory.casualClothesWeeks > 0 || curWorn === 'casual') {
      const isWorn = curWorn === 'casual';
      const label = `Casual Clothes ${isWorn ? '(Worn)' : ''}`;
      res.push({
        text: label.padEnd(25).slice(0, 25),
        isClickable: canSwitchClothes && !isWorn,
        highlight: isWorn,
        onClick: () => {
          if (canSwitchClothes && onAction) onAction({ type: 'change_clothes', clothes: 'casual' });
        }
      });
    }

    if (player.inventory.dressClothesWeeks > 0 || curWorn === 'dress') {
      const isWorn = curWorn === 'dress';
      const label = `Dress Clothes  ${isWorn ? '(Worn)' : ''}`;
      res.push({
        text: label.padEnd(25).slice(0, 25),
        isClickable: canSwitchClothes && !isWorn,
        highlight: isWorn,
        onClick: () => {
          if (canSwitchClothes && onAction) onAction({ type: 'change_clothes', clothes: 'dress' });
        }
      });
    }

    if (player.inventory.businessClothesWeeks > 0 || curWorn === 'business') {
      const isWorn = curWorn === 'business';
      const label = `Business Suit  ${isWorn ? '(Worn)' : ''}`;
      res.push({
        text: label.padEnd(25).slice(0, 25),
        isClickable: canSwitchClothes && !isWorn,
        highlight: isWorn,
        onClick: () => {
          if (canSwitchClothes && onAction) onAction({ type: 'change_clothes', clothes: 'business' });
        }
      });
    }

    // Food
    if (weeksOfFood > 0 || totalFoodUnits > 0) {
      res.push({ text: `${String(weeksOfFood).padStart(3)} Weeks of Food` });
    }

    // Appliances / Durables
    for (const app of player.inventory.appliances) {
      const itemDef = campaign?.items.find(i => i.id === app.id);
      const name = itemDef?.name || app.id.replace(/_/g, ' ');
      const brokenFlag = app.isBroken ? ' [BROKEN]' : '';
      const display = `  1 ${name}${brokenFlag}`;
      res.push({ text: display.slice(0, 25) });
    }

    // Lottery Tickets
    const lotteryCount = player.inventory.lotteryTickets || 0;
    if (lotteryCount > 0) {
      res.push({
        text: `  ${lotteryCount} Lottery Tickets`.slice(0, 25),
        isClickable: !!onOpenLottery,
        onClick: onOpenLottery ? () => onOpenLottery(0) : undefined,
      });
    }

    // 5. Education Header
    if (player.degrees && player.degrees.length > 0) {
      res.push({ text: '---EDUCATION---', isHeader: true });
      for (const d of player.degrees) {
        const eduDef = campaign?.education?.find(e => e.id === d);
        const name = eduDef?.name || d.replace(/_/g, ' ');
        res.push({
          text: `  ${name}`.slice(0, 25),
          isClickable: !!onOpenDiploma,
          onClick: onOpenDiploma ? () => onOpenDiploma(d, name) : undefined,
        });
      }
    }

    // 6. Investments Header
    const hasTbills = (player.inventory.stocks.tBills || 0) > 0;
    const hasStocks = Object.values(player.inventory.stocks.holdings).some(s => s > 0);
    if (hasTbills || hasStocks) {
      res.push({ text: '--INVESTMENTS--', isHeader: true });
      if (hasTbills) {
        res.push({ text: `  ${player.inventory.stocks.tBills} T-Bills`.slice(0, 25) });
      }
      for (const [stkId, shares] of Object.entries(player.inventory.stocks.holdings)) {
        if (shares > 0) {
          const stkDef = campaign?.stocks?.find(s => s.id === stkId);
          const name = stkDef?.name || stkId;
          res.push({ text: `${String(shares).padStart(4)} ${name}`.slice(0, 25) });
        }
      }
    }

    return res;
  }, [
    player,
    currentJob,
    currentWorkplace,
    totalGoodsValue,
    investmentTotal,
    netWorth,
    weeksOfFood,
    totalFoodUnits,
    canSwitchClothes,
    campaign,
    onAction
  ]);

  // Jump to clothes section if requested
  useEffect(() => {
    if (scrollToSection === 'clothes') {
      const clothesIdx = lines.findIndex(l => l.text.includes('GOODS'));
      if (clothesIdx !== -1) {
        setScrollIndex(Math.max(0, clothesIdx - 1));
      }
    }
  }, [scrollToSection, lines]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'F6') {
        e.preventDefault();
        onOpenGoals?.();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setScrollIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setScrollIndex(prev => Math.min(Math.max(0, lines.length - 7), prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onOpenGoals, lines.length]);

  // Visible lines (7 lines like Sierra DSelector)
  const visibleLines = lines.slice(scrollIndex, scrollIndex + 7);

  // Helpful formula stats
  const employabilityScore = calcEmployabilityScore(
    player.dependability || 0,
    player.experience || 0,
    player.degrees?.length || 0,
    0,
    player.social || 0
  );
  const robberyRisk = (effectiveRules && campaign?.config?.eventRules)
    ? (calcEffectiveRobberyChance(player, effectiveRules, turn, campaign) * 100).toFixed(1)
    : '0.0';
  const jobReqDep = currentJob ? currentJob.requirements.dependability : 0;
  const jobReqExp = currentJob ? currentJob.requirements.experience : 0;
  const maxDep = calcMaxDependability(jobReqDep, player.degreeDepBoost || 0, player.depMaxBonus || 0);
  const maxExp = calcMaxExperience(jobReqExp, player.degreeExpBoost || 0, player.xpMaxBonus || 0);
  const raiseThreshold = currentJob ? calcRaiseThreshold(jobReqDep, player.raisesAtCurrentJob || 0, player.innovationCount || 0) : null;

  return (
    <div
      className="building-modal building-modal--authentic building-modal--curved"
      data-testid="inventory-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        imageRendering: 'pixelated',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 183x112 Native Resolution Viewport Scaled Pixelated */}
      <div
        style={{
          width: '183px',
          height: '112px',
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%) scale(calc(var(--board-scale, 1) * 3.75))',
          transformOrigin: 'center center',
          imageRendering: 'pixelated',
          userSelect: 'none',
        }}
      >
        {/* Card Background: view.505 Loop 4 Cel 0 */}
        <img
          src={`${basePath}/bg_inventory.png`}
          alt="Inventory Background"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '183px',
            height: '112px',
            imageRendering: 'pixelated',
            pointerEvents: 'none',
          }}
        />

        {/* Top Header Buttons (Goals Switch & Helpful Toggle) */}
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: '12px',
            right: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          {onOpenGoals && (
            <button
              onClick={onOpenGoals}
              data-testid="btn-switch-to-goals"
              style={{
                background: '#000088',
                color: '#ffffff',
                border: '1px solid #ffffff',
                fontSize: '6px',
                lineHeight: '7px',
                padding: '1px 4px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                textTransform: 'uppercase',
              }}
              title="View Goals Screen (F6)"
            >
              🏆 Goals
            </button>
          )}

          {rules?.helpfulUI && (
            <button
              onClick={() => setShowFormulas(!showFormulas)}
              data-testid="btn-toggle-formulas"
              style={{
                background: showFormulas ? '#aa5500' : '#444444',
                color: '#ffffff',
                border: '1px solid #aaaaaa',
                fontSize: '6px',
                lineHeight: '7px',
                padding: '1px 4px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                marginLeft: 'auto',
              }}
            >
              {showFormulas ? 'Status' : 'Formulas'}
            </button>
          )}
        </div>

        {/* Standard View: DSelector Scrollable Text List */}
        {!showFormulas ? (
          <div
            ref={scrollContainerRef}
            data-testid="inventory-selector"
            style={{
              position: 'absolute',
              left: '16px',
              top: '16px',
              width: '151px',
              height: '84px',
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '8px',
              lineHeight: '11px',
              color: '#000000',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
            }}
            onWheel={(e) => {
              if (e.deltaY > 0) {
                setScrollIndex(prev => Math.min(Math.max(0, lines.length - 7), prev + 1));
              } else if (e.deltaY < 0) {
                setScrollIndex(prev => Math.max(0, prev - 1));
              }
            }}
          >
            {visibleLines.map((line, idx) => (
              <div
                key={`${scrollIndex + idx}-${line.text}`}
                data-testid={`inventory-line-${scrollIndex + idx}`}
                onClick={line.onClick}
                style={{
                  height: '11px',
                  whiteSpace: 'pre',
                  fontWeight: line.isHeader ? 'bold' : 'normal',
                  color: line.highlight ? '#0066cc' : '#000000',
                  cursor: line.isClickable ? 'pointer' : 'default',
                  textDecoration: line.isClickable ? 'underline' : 'none',
                }}
              >
                {line.text}
              </div>
            ))}
          </div>
        ) : (
          /* Helpful UI Formulas Screen */
          <div
            data-testid="inventory-formulas"
            style={{
              position: 'absolute',
              left: '16px',
              top: '16px',
              width: '151px',
              height: '84px',
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '7px',
              lineHeight: '9px',
              color: '#000000',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '2px', textAlign: 'center' }}>FORMULA ATTRIBUTES</div>
            <div>Employability: {employabilityScore}/100</div>
            <div>Robbery Risk: {robberyRisk}%</div>
            <div>Dependability: {player.dependability}/{maxDep}</div>
            <div>Experience: {player.experience}/{maxExp}</div>
            <div>Raise Req: {raiseThreshold !== null ? `${player.dependability}/${raiseThreshold}` : 'N/A'}</div>
            {onOpenLog && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLog();
                }}
                data-testid="btn-open-log-from-status"
                style={{
                  marginTop: '4px',
                  width: '100%',
                  background: '#005577',
                  color: '#ffffff',
                  border: '1px solid #000',
                  fontSize: '6px',
                  padding: '2px',
                  cursor: 'pointer',
                }}
              >
                📜 Activity Log
              </button>
            )}
          </div>
        )}

        {/* Scroll Arrows on the right side if lines exceed 7 */}
        {!showFormulas && lines.length > 7 && (
          <div
            style={{
              position: 'absolute',
              right: '6px',
              top: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '40px',
              zIndex: 10,
            }}
          >
            <button
              onClick={() => setScrollIndex(prev => Math.max(0, prev - 1))}
              disabled={scrollIndex === 0}
              data-testid="btn-inventory-scroll-up"
              style={{
                width: '8px',
                height: '8px',
                padding: 0,
                fontSize: '6px',
                lineHeight: '6px',
                cursor: scrollIndex > 0 ? 'pointer' : 'default',
                opacity: scrollIndex > 0 ? 1 : 0.3,
                background: '#dddddd',
                border: '1px solid #888888',
              }}
            >
              ▲
            </button>
            <button
              onClick={() => setScrollIndex(prev => Math.min(Math.max(0, lines.length - 7), prev + 1))}
              disabled={scrollIndex >= lines.length - 7}
              data-testid="btn-inventory-scroll-down"
              style={{
                width: '8px',
                height: '8px',
                padding: 0,
                fontSize: '6px',
                lineHeight: '6px',
                cursor: scrollIndex < lines.length - 7 ? 'pointer' : 'default',
                opacity: scrollIndex < lines.length - 7 ? 1 : 0.3,
                background: '#dddddd',
                border: '1px solid #888888',
              }}
            >
              ▼
            </button>
          </div>
        )}

        {/* Done Button: view.250 Loop 2 Cel 0 at nsTop: 108 (0x6c), nsLeft: 143 (0x8f) */}
        <button
          onClick={onClose}
          data-testid="btn-inventory-done"
          aria-label="Done"
          style={{
            position: 'absolute',
            left: '143px',
            top: '101px',
            width: '30px',
            height: '7px',
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            imageRendering: 'pixelated',
          }}
        >
          <img
            src={`${basePath}/buttons/done.png`}
            alt="Done"
            style={{
              width: '30px',
              height: '7px',
              imageRendering: 'pixelated',
              display: 'block',
            }}
          />
        </button>

        {/* Hidden close button to satisfy generic tests expecting status-modal-close */}
        <button
          onClick={onClose}
          data-testid="status-modal-close"
          style={{ display: 'none' }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
};
