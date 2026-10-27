import React, { useState, useEffect, useRef } from 'react';
import type { PlayerState, GameRules } from '../../../engine/gameState';
import type { CampaignBundle } from '../../../engine/dataLoader';
import { calcLoanAssessment } from '../../../engine/statMath';
import {
  BANK_MENU_OPTIONS,
  BANK_GREETINGS,
  BANK_DIALOGUE,
  type BankMenuOption
} from './bankData';

interface AuthenticBankProps {
  player: PlayerState;
  onAction: (action: any) => void;
  onClose: () => void;
  campaign: CampaignBundle;
  turn?: number;
  economicIndex?: number;
  rules?: GameRules;
  onSeeBroker?: () => void;
}

export const AuthenticBank: React.FC<AuthenticBankProps> = ({
  player,
  onAction,
  onClose,
  campaign,
  turn = 1,
  economicIndex: _economicIndex = 0,
  rules,
  onSeeBroker
}) => {
  const isCdrom = campaign.config.name === '1990_classic_cdrom';
  const talkerCelCount = isCdrom ? 11 : 6;
  const talkerFolder = isCdrom ? 'talker_cdrom' : 'talker_floppy';
  const basePath = '/assets/authentic/buildings/bank';

  // Check if player works as bank teller / employee here
  const playerJobHere = player.currentJobId
    ? campaign.jobs.find(j => j.id === player.currentJobId && j.locationId === 'bank')
    : null;

  const [activeSpeech, setActiveSpeech] = useState<string>('');
  const [talkerCel, setTalkerCel] = useState<number>(0);
  const [piggyCel, setPiggyCel] = useState<number>(0);
  const [isPunchingCard, setIsPunchingCard] = useState<boolean>(false);
  const [punchCel, setPunchCel] = useState<number>(0);
  const [hoveredOptionId, setHoveredOptionId] = useState<string | null>(null);
  const [loanOffer, setLoanOffer] = useState<{ amount: number; isExtension: boolean } | null>(null);

  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);
  const talkerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animTimersRef = useRef<NodeJS.Timeout[]>([]);

  const addAnimTimer = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    animTimersRef.current.push(t);
    return t;
  };

  // Speak dialogue and animate mouth
  const triggerSpeech = (text: string, durationMs: number = 3200) => {
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    if (talkerIntervalRef.current) clearInterval(talkerIntervalRef.current);

    setActiveSpeech(text);

    // Mouth animation cycling
    talkerIntervalRef.current = setInterval(() => {
      const nextCel = Math.floor(Math.random() * (talkerCelCount - 1)) + 1;
      setTalkerCel(nextCel);
    }, 100);

    speechTimerRef.current = setTimeout(() => {
      setTalkerCel(0); // Mouth closed
      setActiveSpeech('');
      if (talkerIntervalRef.current) clearInterval(talkerIntervalRef.current);
    }, durationMs);
  };

  // Initial random entrance greeting
  useEffect(() => {
    const greeting = BANK_GREETINGS[Math.floor(Math.random() * BANK_GREETINGS.length)];
    triggerSpeech(greeting, 3500);

    return () => {
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      if (talkerIntervalRef.current) clearInterval(talkerIntervalRef.current);
      animTimersRef.current.forEach(clearTimeout);
      animTimersRef.current = [];
    };
  }, []);

  // Piggy bank animation for deposit (cels 0 -> 1 -> 2 -> 3 -> 4 -> 0)
  const animateDeposit = () => {
    setPiggyCel(0);
    addAnimTimer(() => setPiggyCel(1), 80);
    addAnimTimer(() => setPiggyCel(2), 160);
    addAnimTimer(() => setPiggyCel(3), 240);
    addAnimTimer(() => setPiggyCel(4), 320);
    addAnimTimer(() => setPiggyCel(0), 450);
  };

  // Piggy bank animation for withdrawal (cels 4 -> 3 -> 2 -> 1 -> 0)
  const animateWithdraw = () => {
    setPiggyCel(4);
    addAnimTimer(() => setPiggyCel(3), 80);
    addAnimTimer(() => setPiggyCel(2), 160);
    addAnimTimer(() => setPiggyCel(1), 240);
    addAnimTimer(() => setPiggyCel(0), 320);
  };

  // Handle Deposit (up to $100 per click)
  const handleDeposit = () => {
    setLoanOffer(null);
    if ((player.money ?? 0) <= 0) {
      triggerSpeech(BANK_DIALOGUE.depositNoCash, 2800);
      return;
    }

    const depositAmount = Math.min(100, player.money);
    onAction({ type: 'bank_transaction', amount: depositAmount });
    animateDeposit();
    triggerSpeech(BANK_DIALOGUE.depositThankYou, 3000);
  };

  // Handle Withdraw (up to $100 per click)
  const handleWithdraw = () => {
    setLoanOffer(null);
    if ((player.bankSavings ?? 0) <= 0) {
      triggerSpeech(BANK_DIALOGUE.withdrawNoSavings, 2800);
      return;
    }

    const withdrawAmount = Math.min(100, player.bankSavings);
    onAction({ type: 'bank_transaction', amount: -withdrawAmount });
    animateWithdraw();
    triggerSpeech(BANK_DIALOGUE.withdrawPenalty, 3000);
  };

  // Handle Loan Payment ($50 per click or remaining loan debt)
  const handleLoanPayment = () => {
    setLoanOffer(null);
    const loanDebt = player.loanDebt ?? 0;
    if (loanDebt <= 0) {
      triggerSpeech(BANK_DIALOGUE.loanPaymentNoLoan, 2800);
      return;
    }

    const paymentAmount = Math.min(50, loanDebt);
    if ((player.money ?? 0) < paymentAmount) {
      triggerSpeech(BANK_DIALOGUE.notEnoughCash, 2800);
      return;
    }

    onAction({ type: 'pay_loan' });
    animateDeposit();
    triggerSpeech(BANK_DIALOGUE.loanPaymentThankYou, 3000);
  };

  // Handle Apply For Loan
  const handleApplyForLoan = () => {
    const timeCost = campaign.config?.timeRules?.loanCost ?? 2;
    if ((player.hoursRemaining ?? 0) < timeCost) {
      triggerSpeech(BANK_DIALOGUE.loanNoTime, 2800);
      return;
    }

    const assessment = calcLoanAssessment(player, campaign, turn, rules);
    const hasExistingLoan = (player.loanDebt ?? 0) > 0;

    if (!assessment.eligible || assessment.estimatedAmount <= 0) {
      const msg = hasExistingLoan ? BANK_DIALOGUE.loanIneligibleExtend : BANK_DIALOGUE.loanIneligible;
      triggerSpeech(msg, 3800);
      return;
    }

    // Offer eligible loan amount with confirmation prompt
    setLoanOffer({
      amount: assessment.estimatedAmount,
      isExtension: hasExistingLoan
    });
  };

  // Confirm Loan Offer
  const handleAcceptLoan = () => {
    if (!loanOffer) return;
    const amount = loanOffer.amount;
    setLoanOffer(null);
    onAction({ type: 'take_loan' });
    animateWithdraw();
    triggerSpeech(BANK_DIALOGUE.loanApproved.replace('%d', amount.toString()), 3500);
  };

  // Decline Loan Offer
  const handleDeclineLoan = () => {
    setLoanOffer(null);
    triggerSpeech(BANK_DIALOGUE.loanDeclinedOffer, 2800);
  };

  // Handle See The Broker
  const handleSeeBroker = () => {
    setLoanOffer(null);
    const timeCost = campaign.config?.timeRules?.brokerCost ?? 2;
    if ((player.hoursRemaining ?? 0) < timeCost) {
      triggerSpeech(BANK_DIALOGUE.brokerNoTime, 2800);
      return;
    }

    if (onSeeBroker) {
      onSeeBroker();
    } else {
      onAction({ type: 'open_broker' });
    }
  };

  // Handle working a teller shift
  const handleWorkShift = () => {
    setLoanOffer(null);
    if (!playerJobHere) return;

    const shiftCost = campaign.config?.timeRules?.workSessionCost ?? 6;
    const hasEnoughHours = (player.hoursRemaining ?? 0) >= shiftCost;

    if (!hasEnoughHours) {
      triggerSpeech('You do not have enough time left to work a full shift today.', 2800);
      return;
    }

    // Animate punch card on teller desk (view.750 at left 0, top 57)
    setIsPunchingCard(true);
    setPunchCel(0);
    addAnimTimer(() => setPunchCel(1), 120);
    addAnimTimer(() => setPunchCel(2), 240);
    addAnimTimer(() => setPunchCel(3), 360);
    addAnimTimer(() => {
      setIsPunchingCard(false);
      animateDeposit();
      onAction({ type: 'work', jobId: playerJobHere.id });
      triggerSpeech('Have a nice day.', 2500);
    }, 480);
  };

  // Option click router
  const handleOptionClick = (optionId: BankMenuOption['id']) => {
    switch (optionId) {
      case 'deposit':
        handleDeposit();
        break;
      case 'withdraw':
        handleWithdraw();
        break;
      case 'loan_payment':
        handleLoanPayment();
        break;
      case 'apply_loan':
        handleApplyForLoan();
        break;
      case 'see_broker':
        handleSeeBroker();
        break;
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loanOffer) {
        if (e.key === 'y' || e.key === 'Y' || e.key === 'Enter') {
          handleAcceptLoan();
          return;
        } else if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
          handleDeclineLoan();
          return;
        }
      }

      if (e.key === 'Escape' || e.key === 'x' || e.key === 'X') {
        onClose();
      } else if (e.key === 'w' || e.key === 'W') {
        if (playerJobHere) handleWorkShift();
      } else if (e.key === '1') {
        handleDeposit();
      } else if (e.key === '2') {
        handleWithdraw();
      } else if (e.key === '3') {
        handleLoanPayment();
      } else if (e.key === '4') {
        handleApplyForLoan();
      } else if (e.key === '5') {
        handleSeeBroker();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerJobHere, player.money, player.bankSavings, player.loanDebt, player.hoursRemaining, loanOffer]);

  // Dynamic label calculation matching Sierra SCI format
  const getOptionDisplay = (opt: BankMenuOption) => {
    if (opt.id === 'deposit') {
      const depositAmt = Math.min(100, Math.max(0, player.money ?? 0));
      return `${opt.prefix} $ ${depositAmt.toString().padStart(3, ' ')}`;
    }
    if (opt.id === 'withdraw') {
      const withdrawAmt = Math.min(100, Math.max(0, player.bankSavings ?? 0));
      return `${opt.prefix} $ ${withdrawAmt.toString().padStart(3, ' ')}`;
    }
    if (opt.id === 'loan_payment') {
      const paymentAmt = Math.min(50, Math.max(0, player.loanDebt ?? 0));
      return `${opt.prefix} $ ${paymentAmt.toString().padStart(3, ' ')}`;
    }
    return opt.label;
  };

  return (
    <div
      data-testid="authentic-bank"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        imageRendering: 'pixelated',
        userSelect: 'none',
        overflow: 'hidden',
        backgroundColor: '#000000',
      }}
    >
      {/* 183x112 Native Resolution Viewport Scaled to Courtyard Area */}
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
        }}
      >
        {/* Layer 1: Background (view.804) */}
        <img
          src={`${basePath}/bg.png`}
          alt="Bank Interior"
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

        {/* Layer 2: The Talker / Teller (view.354 at x=0, y=0) */}
        <img
          data-testid="bank-talker"
          src={`${basePath}/${talkerFolder}/talker_${talkerCel}.png`}
          alt="Bank Teller"
          style={{
            position: 'absolute',
            left: '0px',
            top: '0px',
            width: '68px',
            height: '55px',
            imageRendering: 'pixelated',
            pointerEvents: 'none',
          }}
        />

        {/* Layer 3: Teller Desk & Piggy Bank (view.704 at x=0, y=57) */}
        <div
          data-testid="bank-piggy"
          style={{
            position: 'absolute',
            left: '0px',
            top: '57px',
            width: '68px',
            height: '55px',
            pointerEvents: 'none',
          }}
        >
          <img
            src={`${basePath}/desk/piggy_${piggyCel}.png`}
            alt="Piggy Bank"
            style={{ width: '68px', height: '55px', imageRendering: 'pixelated' }}
          />
        </div>

        {/* Layer 4: Interactive Bank Menu Options on the right */}
        {BANK_MENU_OPTIONS.map((opt) => {
          const isHovered = hoveredOptionId === opt.id;
          const displayText = getOptionDisplay(opt);

          return (
            <div
              key={opt.id}
              data-testid={`bank-option-${opt.id}`}
              onClick={() => handleOptionClick(opt.id)}
              onMouseEnter={() => setHoveredOptionId(opt.id)}
              onMouseLeave={() => setHoveredOptionId(null)}
              style={{
                position: 'absolute',
                left: `${opt.left}px`,
                top: `${opt.top}px`,
                cursor: 'pointer',
                fontFamily: 'monospace, "Courier New"',
                fontSize: '6.5px',
                fontWeight: 'bold',
                lineHeight: '7px',
                color: isHovered ? '#ffffff' : '#000000',
                backgroundColor: isHovered ? '#1e3a8a' : 'transparent',
                padding: '0 2px',
                whiteSpace: 'pre',
                letterSpacing: '-0.3px',
                zIndex: 5,
              }}
              title={`${opt.label} (${opt.hotkey})`}
            >
              {displayText}
            </div>
          );
        })}

        {/* Layer 5: Buttons (view.250) */}
        {playerJobHere && (
          <img
            data-testid="btn-bank-work"
            src={`${basePath}/buttons/work.png`}
            alt="Work"
            onClick={handleWorkShift}
            style={{
              position: 'absolute',
              left: '77px',
              top: '104px',
              width: '30px',
              height: '7px',
              cursor: 'pointer',
              imageRendering: 'pixelated',
              zIndex: 6,
            }}
            title="Work Shift (W)"
          />
        )}

        <img
          data-testid="btn-bank-done"
          src={`${basePath}/buttons/done.png`}
          alt="Done"
          onClick={onClose}
          style={{
            position: 'absolute',
            left: '144px',
            top: '104px',
            width: '30px',
            height: '7px',
            cursor: 'pointer',
            imageRendering: 'pixelated',
            zIndex: 6,
          }}
          title="Done (Exit)"
        />

        {/* Layer 6: Punch Card Overlay during Work (view.750 at 0, 57) */}
        {isPunchingCard && (
          <div
            data-testid="bank-punch-card"
            style={{
              position: 'absolute',
              left: '0px',
              top: '57px',
              width: '68px',
              height: '55px',
              zIndex: 20,
              pointerEvents: 'none',
            }}
          >
            <img
              src={`/assets/authentic/punch_card/punch_${punchCel}.png`}
              alt="Punch Card"
              style={{ width: '68px', height: '55px', imageRendering: 'pixelated' }}
            />
          </div>
        )}

        {/* Layer 7: Classic Sierra Speech Box & Loan Dialog (at left 71, top 7) */}
        {(activeSpeech || loanOffer) && (
          <div
            data-testid="bank-speech-bubble"
            onClick={loanOffer ? undefined : () => setActiveSpeech('')}
            style={{
              position: 'absolute',
              left: '71px',
              top: '6px',
              width: '105px',
              backgroundColor: '#ffffea',
              border: '1.5px solid #000000',
              boxShadow: '1.5px 1.5px 0px rgba(0,0,0,0.6)',
              padding: '2px 4px',
              fontFamily: 'monospace, "Courier New"',
              fontSize: '5.5px',
              lineHeight: '6.5px',
              color: '#000000',
              zIndex: 15,
              cursor: loanOffer ? 'default' : 'pointer',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
            }}
          >
            {/* Speech bubble tail pointing towards teller face on the left */}
            <div
              data-testid="speech-tail-left"
              style={{
                position: 'absolute',
                left: '-7px',
                top: '12px',
                width: 0,
                height: 0,
                borderTop: '3.5px solid transparent',
                borderBottom: '3.5px solid transparent',
                borderRight: '7px solid #000000',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '1.5px',
                  top: '-2.5px',
                  width: 0,
                  height: 0,
                  borderTop: '2.5px solid transparent',
                  borderBottom: '2.5px solid transparent',
                  borderRight: '5.5px solid #ffffea',
                }}
              />
            </div>
            {loanOffer ? (
              <div>
                <div style={{ marginBottom: '3px' }}>
                  {loanOffer.isExtension
                    ? BANK_DIALOGUE.loanExtendPrompt.replace('%d', loanOffer.amount.toString())
                    : BANK_DIALOGUE.loanGrantPrompt.replace('%d', loanOffer.amount.toString())}
                </div>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '2px' }}>
                  <button
                    type="button"
                    data-testid="btn-loan-yes"
                    onClick={handleAcceptLoan}
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '5px',
                      padding: '1px 4px',
                      cursor: 'pointer',
                      border: '1px solid #000',
                      backgroundColor: '#e2e8f0',
                      fontWeight: 'bold'
                    }}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    data-testid="btn-loan-no"
                    onClick={handleDeclineLoan}
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '5px',
                      padding: '1px 4px',
                      cursor: 'pointer',
                      border: '1px solid #000',
                      backgroundColor: '#e2e8f0',
                      fontWeight: 'bold'
                    }}
                  >
                    No
                  </button>
                </div>
              </div>
            ) : (
              activeSpeech
            )}
          </div>
        )}
      </div>
    </div>
  );
};
