import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import i18n from '../i18n';
import en from './en.json';
import he from './he.json';

// Import UI components to test rendered DOM output
import { 
  BankInterface, 
  StockTradeRow, 
  JobBoard, 
  StoreFront, 
  HomeRelax, 
  RentOffice, 
  PawnShop, 
  UniversityRegistry 
} from '../ui/BuildingInteractions';
import { WeekendScreen } from '../ui/WeekendScreen';

// Helper to flatten nested JSON translation objects into dot-notated key/value pairs
function flattenTranslations(obj: Record<string, any>, prefix = ''): { key: string; value: string }[] {
  let results: { key: string; value: string }[] = [];
  for (const k of Object.keys(obj)) {
    const val = obj[k];
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof val === 'string') {
      results.push({ key: fullKey, value: val });
    } else if (Array.isArray(val)) {
      val.forEach((item, idx) => {
        if (typeof item === 'string') {
          results.push({ key: `${fullKey}.${idx}`, value: item });
        } else if (typeof item === 'object' && item !== null) {
          results = results.concat(flattenTranslations(item, `${fullKey}.${idx}`));
        }
      });
    } else if (typeof val === 'object' && val !== null) {
      results = results.concat(flattenTranslations(val, fullKey));
    }
  }
  return results;
}

describe('Translation Interpolation & Template Verification', () => {
  describe('Stock Trading Buttons', () => {
    it('en: buyBtn and sellBtn render plain labels without raw template placeholders', () => {
      i18n.changeLanguage('en');
      const buyText = i18n.t('stocks.buyBtn');
      const sellText = i18n.t('stocks.sellBtn');

      expect(buyText).toBe('Buy');
      expect(buyText).not.toContain('{{');
      expect(buyText).not.toContain('}}');

      expect(sellText).toBe('Sell');
      expect(sellText).not.toContain('{{');
      expect(sellText).not.toContain('}}');
    });

    it('he: buyBtn and sellBtn render Hebrew labels without raw template placeholders', () => {
      i18n.changeLanguage('he');
      const buyText = i18n.t('stocks.buyBtn');
      const sellText = i18n.t('stocks.sellBtn');

      expect(buyText).toBe('קנה');
      expect(buyText).not.toContain('{{');
      expect(buyText).not.toContain('}}');

      expect(sellText).toBe('מכור');
      expect(sellText).not.toContain('{{');
      expect(sellText).not.toContain('}}');
    });
  });

  describe('UI Interaction Buttons & Labels with Injected Values', () => {
    it('correctly injects values into English UI strings without leaving raw templates', () => {
      i18n.changeLanguage('en');

      // Stocks
      const priceText = i18n.t('stocks.price', { price: 49 });
      expect(priceText).toBe('Price: $49 / share');
      expect(priceText).not.toContain('{{');

      const ownedText = i18n.t('stocks.owned', { count: 12 });
      expect(ownedText).toBe('Owned: 12 shares');
      expect(ownedText).not.toContain('{{');

      // Job Board
      const askRaise = i18n.t('jobBoard.askRaise', { wage: 30, cost: 4 });
      expect(askRaise).toBe('Ask for Raise to $30/hr (4h)');
      expect(askRaise).not.toContain('{{');

      const currentJob = i18n.t('jobBoard.currentJob', { wage: 18 });
      expect(currentJob).toBe('Current Job ($18/hr)');
      expect(currentJob).not.toContain('{{');

      const applyJob = i18n.t('jobBoard.apply', { cost: 4 });
      expect(applyJob).toBe('Apply (4h)');
      expect(applyJob).not.toContain('{{');

      // Work Station
      const workTitle = i18n.t('workStation.title', { jobTitle: 'Senior Manager' });
      expect(workTitle).toBe('Your Job: Senior Manager');
      expect(workTitle).not.toContain('{{');

      const workShift = i18n.t('workStation.workShift', { cost: 6 });
      expect(workShift).toBe('Work Shift (up to 6h)');
      expect(workShift).not.toContain('{{');

      // Home Relax
      const relaxBtn = i18n.t('homeRelax.button', { cost: 6 });
      expect(relaxBtn).toBe('Relax (6h)');
      expect(relaxBtn).not.toContain('{{');

      // Bank
      const applyLoan = i18n.t('bank.applyLoan', { cost: 2 });
      expect(applyLoan).toBe('Apply for Loan (Costs 2h)');
      expect(applyLoan).not.toContain('{{');

      const makePayment = i18n.t('bank.makePayment', { amount: 50 });
      expect(makePayment).toBe('Make Loan Payment ($50 or remainder)');
      expect(makePayment).not.toContain('{{');

      // Rent Office
      const rentDue = i18n.t('rentOffice.rentDue', { amount: 450 });
      expect(rentDue).toBe('Rent Due: $450');
      expect(rentDue).not.toContain('{{');

      const paidUntil = i18n.t('rentOffice.paidUntil', { week: 4 });
      expect(paidUntil).toBe('Rent Paid Until: Week 4');
      expect(paidUntil).not.toContain('{{');

      const weeksPaid = i18n.t('rentOffice.weeksPaid', { count: 3 });
      expect(weeksPaid).toBe('(You have 3 weeks of rent paid)');
      expect(weeksPaid).not.toContain('{{');

      const payAdvance = i18n.t('rentOffice.payAdvance', { cost: 300 });
      expect(payAdvance).toBe('Pay Rent Advance ($300 / mo)');
      expect(payAdvance).not.toContain('{{');

      // Weekend Screen
      const startWeek = i18n.t('weekendScreen.startWeek', { turn: 2 });
      expect(startWeek).toBe('Start Week 2');
      expect(startWeek).not.toContain('{{');
    });

    it('correctly injects values into Hebrew UI strings without leaving raw templates', () => {
      i18n.changeLanguage('he');

      const priceText = i18n.t('stocks.price', { price: 49 });
      expect(priceText).toBe('מחיר: 49$ למניה');
      expect(priceText).not.toContain('{{');

      const ownedText = i18n.t('stocks.owned', { count: 12 });
      expect(ownedText).toBe('בבעלותך: 12 מניות');
      expect(ownedText).not.toContain('{{');

      const askRaise = i18n.t('jobBoard.askRaise', { wage: 30, cost: 4 });
      expect(askRaise).toBe('בקש העלאה ל-30$/שעה (4 שעות)');
      expect(askRaise).not.toContain('{{');

      const applyJob = i18n.t('jobBoard.apply', { cost: 4 });
      expect(applyJob).toBe('הגש מועמדות (4 שעות)');
      expect(applyJob).not.toContain('{{');

      const workShift = i18n.t('workStation.workShift', { cost: 6 });
      expect(workShift).toBe('משמרת עבודה (עד 6 שעות)');
      expect(workShift).not.toContain('{{');

      const relaxBtn = i18n.t('homeRelax.button', { cost: 6 });
      expect(relaxBtn).toBe('לנוח (6 שעות)');
      expect(relaxBtn).not.toContain('{{');

      const applyLoan = i18n.t('bank.applyLoan', { cost: 2 });
      expect(applyLoan).toBe('בקש הלוואה (עולה 2 שעות)');
      expect(applyLoan).not.toContain('{{');

      const makePayment = i18n.t('bank.makePayment', { amount: 50 });
      expect(makePayment).toBe('שלם הלוואה (50$ או שארית)');
      expect(makePayment).not.toContain('{{');
    });
  });

  describe('Action Logs and Notification Strings', () => {
    it('interpolates event and action log parameters accurately', () => {
      i18n.changeLanguage('en');

      // Bank transaction logs
      expect(i18n.t('action.bank.deposit', { amount: 150 })).toBe('Deposited $150 into savings');
      expect(i18n.t('action.bank.withdraw', { amount: 100 })).toBe('Withdrew $100 from savings');

      // Stock transaction logs
      expect(i18n.t('action.broker.buy', { quantity: 5, stockId: 'ACME' })).toBe('Bought 5 shares of ACME');
      expect(i18n.t('action.broker.sell', { quantity: 3, stockId: 'ACME' })).toBe('Sold 3 shares of ACME');

      // Loan logs
      expect(i18n.t('action.loan.paidInstallment', { payment: 50, principal: 45, interest: 5 }))
        .toBe('Made a loan payment of $50 (Principal: $45, Interest: $5)');
      expect(i18n.t('action.loan.paidOff', { amount: 200 })).toBe('Paid off the remaining loan ($200)');

      // Doctor visit
      expect(i18n.t('events.doctorVisit', { cost: 100 })).toBe('You had to visit the doctor. It cost you $100.');
      expect(i18n.t('events.doctorVisit_reasons', { reasons: 'Starvation', cost: 100 }))
        .toBe('You had to visit the doctor (Starvation). It cost you $100.');

      // Appliance broke
      expect(i18n.t('events.applianceBroke', { appliance: 'Television', repairCost: 50 }))
        .toBe('Your Television broke! Repair cost: $50');

      // Computer profit
      expect(i18n.t('events.computerProfit', { profit: 75 }))
        .toBe('You made $75 profit from your computer.');

      // Pawn shop
      expect(i18n.t('action.pawn.pawned', { itemName: 'Microwave', value: 80 }))
        .toBe('Pawned Microwave for $80');
      expect(i18n.t('action.pawn.redeemed', { itemName: 'Microwave', cost: 100 }))
        .toBe('Redeemed Microwave for $100');
      expect(i18n.t('action.pawn.bought', { itemName: 'Toaster', cost: 40 }))
        .toBe('Bought Toaster from Pawn Shop for $40');
    });
  });

  describe('Exhaustive Locale Files Scan', () => {
    it('scans all template strings in en.json and verifies every interpolation succeeds without residual {{ or }}', () => {
      i18n.changeLanguage('en');
      const allEntries = flattenTranslations(en);

      for (const { key, value } of allEntries) {
        const matches = value.match(/\{\{([^}]+)\}\}/g);
        if (matches && matches.length > 0) {
          const params: Record<string, string | number> = {};
          matches.forEach((m) => {
            const varName = m.replace(/[\{\}]/g, '').trim();
            params[varName] = `[${varName.toUpperCase()}]`;
          });

          const rendered = i18n.t(key, params);
          expect(rendered, `Key '${key}' in en.json failed to interpolate all variables: ${rendered}`).not.toMatch(/\{\{[^}]+\}\}/);
          expect(rendered).not.toContain('{{');
          expect(rendered).not.toContain('}}');
        }
      }
    });

    it('scans all template strings in he.json and verifies every interpolation succeeds without residual {{ or }}', () => {
      i18n.changeLanguage('he');
      const allEntries = flattenTranslations(he);

      for (const { key, value } of allEntries) {
        const matches = value.match(/\{\{([^}]+)\}\}/g);
        if (matches && matches.length > 0) {
          const params: Record<string, string | number> = {};
          matches.forEach((m) => {
            const varName = m.replace(/[\{\}]/g, '').trim();
            params[varName] = `[${varName.toUpperCase()}]`;
          });

          const rendered = i18n.t(key, params);
          expect(rendered, `Key '${key}' in he.json failed to interpolate all variables: ${rendered}`).not.toMatch(/\{\{[^}]+\}\}/);
          expect(rendered).not.toContain('{{');
          expect(rendered).not.toContain('}}');
        }
      }
    });
  });

  describe('Rendered UI Component DOM Absence of Raw Template Strings', () => {
    const mockPlayer = {
      id: 'p1',
      name: 'Player 1',
      money: 500,
      hoursRemaining: 40,
      bankSavings: 200,
      loanDebt: 0,
      currentWage: 15,
      currentJobId: 'janitor',
      currentHousingId: 'low_cost',
      rentPaidUntilWeek: 4,
      inventory: {
        clothes: { casual: 4, dress: 0, business: 0 },
        appliances: ['tv'],
        foodUnits: 5,
        education: [],
        degrees: [],
        stocks: { tBills: 2, holdings: { 'blue_chip': 5, 'penny_stocks': 10 } }
      },
      stats: { education: 10, experience: 20, dependability: 50 },
      turnFlags: {}
    } as any;

    const mockCampaign = {
      config: {
        timeRules: { hoursPerTurn: 60, jobApplicationCost: 4, workSessionCost: 6, relaxCost: 6, studySessionCost: 6, loanCost: 2 },
        economyRules: { loanPaymentAmount: 50 }
      },
      housing: [
        { id: 'low_cost', name: 'Low Cost Apt', baseRent: 300, homeNodeId: 'node_low_cost' },
        { id: 'security', name: 'Security Apt', baseRent: 600, homeNodeId: 'node_security' }
      ],
      stocks: [
        { id: 'tbills', name: 'Treasury Bills', type: 'fixed', basePrice: 100 },
        { id: 'blue_chip', name: 'Blue Chip Stocks', type: 'fluctuating', basePrice: 50 },
        { id: 'penny_stocks', name: 'Penny Stocks', type: 'fluctuating', basePrice: 10 }
      ],
      education: [],
      jobs: [
        { id: 'janitor', title: 'Janitor', locationId: 'monolith_burgers', baseWage: 10, requirements: { experience: 0, dependability: 0, degrees: [] } }
      ],
      buildings: [
        { id: 'monolith_burgers', name: 'Monolith Burgers' }
      ]
    } as any;

    it('renders BankInterface without any raw {{...}} template tags anywhere in the DOM', () => {
      i18n.changeLanguage('en');
      const { container } = render(
        <BankInterface 
          player={mockPlayer} 
          campaign={mockCampaign} 
          rules={{ classicStockMarket: true, helpfulUI: true } as any} 
          onAction={vi.fn()} 
        />
      );

      expect(container.textContent).not.toMatch(/\{\{[^}]+\}\}/);
      expect(container.textContent).not.toContain('{{');
      expect(container.textContent).not.toContain('}}');
    });

    it('renders StockTradeRow without any raw {{...}} template tags in the DOM', () => {
      i18n.changeLanguage('en');
      const stockDef = { id: 'blue_chip', name: 'Blue Chip Stocks', basePrice: 50, type: 'fluctuating' as const };
      const { container } = render(
        <StockTradeRow 
          stock={stockDef} 
          price={50} 
          owned={5} 
          playerMoney={500} 
          onAction={vi.fn()} 
        />
      );

      expect(container.textContent).not.toMatch(/\{\{[^}]+\}\}/);
      expect(container.textContent).not.toContain('{{');
      expect(container.textContent).not.toContain('}}');
      expect(container.textContent).toContain('Buy');
      expect(container.textContent).toContain('Sell');
      expect(container.textContent).toContain('Price: $50 / share');
      expect(container.textContent).toContain('Owned: 5 shares');
    });

    it('renders JobBoard without any raw {{...}} template tags in the DOM', () => {
      i18n.changeLanguage('en');
      const { container } = render(
        <JobBoard 
          player={mockPlayer} 
          availableJobs={mockCampaign.jobs} 
          buildings={mockCampaign.buildings} 
          campaign={mockCampaign} 
          onAction={vi.fn()} 
        />
      );

      expect(container.textContent).not.toMatch(/\{\{[^}]+\}\}/);
      expect(container.textContent).not.toContain('{{');
      expect(container.textContent).not.toContain('}}');
    });

    it('renders RentOffice without any raw {{...}} template tags in the DOM', () => {
      i18n.changeLanguage('en');
      const { container } = render(
        <RentOffice 
          player={mockPlayer} 
          housing={mockCampaign.housing} 
          turn={1} 
          economicIndex={0} 
          campaign={mockCampaign} 
          rules={{ helpfulUI: true } as any} 
          onAction={vi.fn()} 
        />
      );

      expect(container.textContent).not.toMatch(/\{\{[^}]+\}\}/);
      expect(container.textContent).not.toContain('{{');
      expect(container.textContent).not.toContain('}}');
    });

    it('renders HomeRelax without any raw {{...}} template tags in the DOM', () => {
      i18n.changeLanguage('en');
      const { container } = render(
        <HomeRelax 
          player={mockPlayer} 
          relaxCost={6} 
          campaign={mockCampaign} 
          rules={{ helpfulUI: true } as any} 
          onAction={vi.fn()} 
        />
      );

      expect(container.textContent).not.toMatch(/\{\{[^}]+\}\}/);
      expect(container.textContent).not.toContain('{{');
      expect(container.textContent).not.toContain('}}');
    });

    it('renders WeekendScreen without any raw {{...}} template tags in the DOM', () => {
      i18n.changeLanguage('en');
      const { container } = render(
        <WeekendScreen 
          turn={2} 
          player={mockPlayer} 
          onStartWeek={vi.fn()} 
          onActivitySelect={vi.fn()} 
        />
      );

      expect(container.textContent).not.toMatch(/\{\{[^}]+\}\}/);
      expect(container.textContent).not.toContain('{{');
      expect(container.textContent).not.toContain('}}');
      expect(container.textContent).toContain('Start Week 2');
    });
  });
});
