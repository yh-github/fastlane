import { describe, it, expect, beforeEach } from 'vitest';
import { loadCampaign } from '../src/engine/dataLoader';
import { createInitialGameState, type GameState } from '../src/engine/gameState';
import { processTurnStart } from '../src/engine/turnProcessor';
import { gameReducer, type ReducerContext } from '../src/engine/gameReducer';
import { calcLoanAssessment } from '../src/engine/statMath';
import { Random } from '../src/utils/rng';

describe('Bank Loan System (Authentic Sierra SCI & Mechanics)', () => {
  let campaign: any;

  beforeEach(async () => {
    campaign = await loadCampaign('1990_classic_floppy');
  });

  describe('Loan Underwriting Formula', () => {
    it('calculates borrowing capacity and risk using authentic SCI integer division', () => {
      const player = {
        currentJobId: 'clerk',
        currentWage: 15,
        money: 800,
        bankSavings: 1500,
        rentDebt: 200,
        loanDebt: 100,
        timesDefaulted: 1,
        loanPaymentDeadline: 8,
      } as any;

      // Liquid assets = 800 + 1500 - 200 - 100 = 2000.
      // Liquidity = 15 + trunc(2000 / 1000) = 17.
      // Risk = 5 + 1 (default) + floor(100 / 100) (1) + 1 (has debt) = 8.
      // Loan Offered = (17 - 8) * 100 = 900.
      const assessment = calcLoanAssessment(player, campaign, 6);
      expect(assessment.liquidAssets).toBe(2000);
      expect(assessment.liquidity).toBe(17);
      expect(assessment.risk).toBe(8);
      expect(assessment.eligible).toBe(true);
      expect(assessment.estimatedAmount).toBe(900);
    });

    it('allows unemployed players with sufficient savings to qualify under authentic rules', () => {
      const player = {
        currentJobId: null,
        currentWage: 0,
        money: 500,
        bankSavings: 5500,
        rentDebt: 0,
        loanDebt: 0,
        timesDefaulted: 0,
        loanPaymentDeadline: 0,
      } as any;

      // Liquid assets = 6000. Liquidity = 0 + trunc(6000 / 1000) = 6. Risk = 5.
      // Loan Offered = (6 - 5) * 100 = 100.
      const assessment = calcLoanAssessment(player, campaign, 1);
      expect(assessment.eligible).toBe(true);
      expect(assessment.estimatedAmount).toBe(100);
    });

    it('enforces requireJobForLoan when rule is explicitly enabled', () => {
      const player = {
        currentJobId: null,
        currentWage: 0,
        money: 500,
        bankSavings: 5500,
        rentDebt: 0,
        loanDebt: 0,
        timesDefaulted: 0,
        loanPaymentDeadline: 0,
      } as any;

      const assessment = calcLoanAssessment(player, campaign, 1, { requireJobForLoan: true } as any);
      expect(assessment.eligible).toBe(false);
      expect(assessment.reason).toBe('unemployed');
    });
  });

  describe('Loan Repayments & Deadline Stacking Fix', () => {
    it('does not stack +4 weeks per payment when making multiple payments in the same cycle', () => {
      const player = {
        id: 'player_1',
        money: 300,
        loanDebt: 200,
        loanPaymentDeadline: 4,
        happiness: 50,
        hoursRemaining: 50,
        turnFlags: { loanPaidThisTurn: false, loanPayableWarning: true },
        inventory: { appliances: [], books: [], stocks: { tBills: 0, holdings: {} }, pawnedItems: [] },
      } as any;

      const context: ReducerContext = {
        campaign,
        rules: campaign.config.gameRules,
        turn: 4,
        economicIndex: 0,
        rng: new Random(123),
        state: {} as any
      };

      // First $50 payment on Week 4
      const res1 = gameReducer(player, { type: 'pay_loan' }, context);
      expect(res1.updatedPlayer.money).toBe(250);
      expect(res1.updatedPlayer.loanDebt).toBe(155); // $45 principal, $5 fee
      expect(res1.updatedPlayer.loanPaymentDeadline).toBe(8); // Moves to next month
      expect(res1.updatedPlayer.turnFlags.loanPaidThisTurn).toBe(true);
      expect(res1.updatedPlayer.turnFlags.loanPayableWarning).toBe(false);

      // Second $50 payment on the same turn (Week 4)
      const res2 = gameReducer(res1.updatedPlayer, { type: 'pay_loan' }, context);
      expect(res2.updatedPlayer.money).toBe(200);
      expect(res2.updatedPlayer.loanDebt).toBe(110);
      // Deadline MUST remain 8, NOT jump to 12!
      expect(res2.updatedPlayer.loanPaymentDeadline).toBe(8);
      expect(res2.updatedPlayer.turnFlags.loanPaidThisTurn).toBe(true);

      // Third $50 payment
      const res3 = gameReducer(res2.updatedPlayer, { type: 'pay_loan' }, context);
      expect(res3.updatedPlayer.money).toBe(150);
      expect(res3.updatedPlayer.loanDebt).toBe(65);
      expect(res3.updatedPlayer.loanPaymentDeadline).toBe(8);

      // Final payment to pay off completely ($50 when debt is $65 -> leaves $20 debt)
      const res4 = gameReducer(res3.updatedPlayer, { type: 'pay_loan' }, context);
      expect(res4.updatedPlayer.loanDebt).toBe(20);
      expect(res4.updatedPlayer.loanPaymentDeadline).toBe(8);

      // Pay off remaining $20 (balance < $50)
      const res5 = gameReducer(res4.updatedPlayer, { type: 'pay_loan' }, context);
      expect(res5.updatedPlayer.money).toBe(80); // $100 - $20
      expect(res5.updatedPlayer.loanDebt).toBe(0);
      expect(res5.updatedPlayer.loanPaymentDeadline).toBe(0); // Reset to 0!
    });
  });

  describe('Turn-by-Turn Billing Cycle & Default Timing', () => {
    function setupGameWithLoan(rollingDeadline = false) {
      let state = createInitialGameState(
        campaign,
        [{ name: 'Player 1', isAi: false, goals: { wealth: 50, happiness: 50, education: 50, career: 50 } }],
        'node_low_cost',
        { rollingLoanDeadline: rollingDeadline },
        12345
      );
      state = processTurnStart(state, campaign); // Starts turn 1
      state.players[0].money = 1000;
      state.players[0].currentWage = 20;
      state.players[0].currentJobId = 'factory_worker';

      const context: ReducerContext = {
        campaign,
        rules: state.rules,
        turn: state.turn,
        economicIndex: state.economicIndex,
        rng: new Random(1),
        state
      };

      // Take a loan on Turn 1
      const loanResult = gameReducer(state.players[0], { type: 'take_loan' }, context);
      state.players[0] = loanResult.updatedPlayer;
      return state;
    }

    it('notifies player at start of billing turn (Week 4) and avoids default if paid during Week 4', () => {
      let state = setupGameWithLoan(false);
      expect(state.turn).toBe(1);
      expect(state.players[0].loanDebt).toBeGreaterThan(0);
      expect(state.players[0].loanPaymentDeadline).toBe(4);

      // Advance Turn 1 -> Turn 2
      state = processTurnStart(state, campaign);
      expect(state.turn).toBe(2);
      expect(state.players[0].turnFlags.loanPayableWarning).toBe(false);
      expect(state.players[0].turnEvents.some(e => e.key === 'events.loan.due')).toBe(false);

      // Advance Turn 2 -> Turn 3
      state = processTurnStart(state, campaign);
      expect(state.turn).toBe(3);
      expect(state.players[0].turnFlags.loanPayableWarning).toBe(false);

      // Advance Turn 3 -> Turn 4 (billing turn start!)
      state = processTurnStart(state, campaign);
      expect(state.turn).toBe(4);
      // Notice 5 arrived!
      expect(state.players[0].turnFlags.loanPayableWarning).toBe(true);
      expect(state.players[0].turnEvents.some(e => e.key === 'events.loan.due')).toBe(true);

      // Player services debt during Turn 4
      const context: ReducerContext = {
        campaign,
        rules: state.rules,
        turn: 4,
        economicIndex: 0,
        rng: new Random(2),
        state
      };
      const payResult = gameReducer(state.players[0], { type: 'pay_loan' }, context);
      state.players[0] = payResult.updatedPlayer;
      expect(state.players[0].turnFlags.loanPaidThisTurn).toBe(true);

      // Advance Turn 4 -> Turn 5 (end of billing turn)
      state = processTurnStart(state, campaign);
      expect(state.turn).toBe(5);
      // Zero defaults assessed!
      expect(state.players[0].timesDefaulted).toBe(0);
      expect(state.players[0].turnFlags.loanDefaultWarning).toBe(false);
      expect(state.players[0].turnEvents.some(e => e.key === 'events.loan.overdue')).toBe(false);
      expect(state.players[0].loanPaymentDeadline).toBe(8); // Due Week 8
    });

    it('assesses default penalty if player ends Week 4 without paying', () => {
      let state = setupGameWithLoan(false);
      const initialHappiness = state.players[0].happiness;

      // Advance 1 -> 2 -> 3 -> 4
      state = processTurnStart(state, campaign); // 2
      state = processTurnStart(state, campaign); // 3
      state = processTurnStart(state, campaign); // 4
      expect(state.turn).toBe(4);
      expect(state.players[0].turnFlags.loanPayableWarning).toBe(true);

      // Player DOES NOT pay during Turn 4!

      // Advance Turn 4 -> Turn 5
      state = processTurnStart(state, campaign);
      expect(state.turn).toBe(5);

      // Default penalty assessed!
      expect(state.players[0].timesDefaulted).toBe(1);
      expect(state.players[0].turnFlags.loanDefaultWarning).toBe(true);
      expect(state.players[0].turnEvents.some(e => e.key === 'events.loan.overdue')).toBe(true);
      expect(state.players[0].happiness).toBeLessThan(initialHappiness);
      expect(state.players[0].loanPaymentDeadline).toBe(8); // Deferred to next month
    });

    it('supports rolling loan deadlines (4 weeks from loan date)', () => {
      let state = createInitialGameState(
        campaign,
        [{ name: 'Player 1', isAi: false, goals: { wealth: 50, happiness: 50, education: 50, career: 50 } }],
        'node_low_cost',
        { rollingLoanDeadline: true },
        12345
      );
      state = processTurnStart(state, campaign); // 1
      state = processTurnStart(state, campaign); // 2
      expect(state.turn).toBe(2);

      // Take loan on Turn 2
      state.players[0].money = 1000;
      state.players[0].currentWage = 20;
      state.players[0].currentJobId = 'factory_worker';
      const context: ReducerContext = {
        campaign,
        rules: state.rules,
        turn: 2,
        economicIndex: 0,
        rng: new Random(1),
        state
      };
      const loanRes = gameReducer(state.players[0], { type: 'take_loan' }, context);
      state.players[0] = loanRes.updatedPlayer;

      // Deadline is turn 2 + 4 = 6!
      expect(state.players[0].loanPaymentDeadline).toBe(6);

      // Advance 2 -> 3 -> 4 -> 5: no warning
      state = processTurnStart(state, campaign); // 3
      state = processTurnStart(state, campaign); // 4
      state = processTurnStart(state, campaign); // 5
      expect(state.turn).toBe(5);
      expect(state.players[0].turnFlags.loanPayableWarning).toBe(false);

      // Advance 5 -> 6: Due Week 6!
      state = processTurnStart(state, campaign);
      expect(state.turn).toBe(6);
      expect(state.players[0].turnFlags.loanPayableWarning).toBe(true);
      expect(state.players[0].turnEvents.some(e => e.key === 'events.loan.due')).toBe(true);
    });
  });
});
