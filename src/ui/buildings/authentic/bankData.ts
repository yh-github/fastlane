/**
 * bankData.ts
 * Reverse-engineered text, dialogue, and spatial layout for First National Bank (P.I.G.G.Y. Bank, Room 204).
 * Sources: original_resources/floppy/script.204.txt, text.204, view.804, view.354, view.704, view.250.
 */

export interface BankMenuOption {
  id: 'deposit' | 'withdraw' | 'loan_payment' | 'apply_loan' | 'see_broker';
  label: string;
  prefix: string;
  left: number;
  top: number;
  hotkey: string;
}

export const BANK_MENU_OPTIONS: BankMenuOption[] = [
  {
    id: 'deposit',
    label: 'Deposit',
    prefix: 'Deposit   ',
    left: 80,
    top: 35,
    hotkey: '1',
  },
  {
    id: 'withdraw',
    label: 'Withdraw',
    prefix: 'Withdraw  ',
    left: 80,
    top: 50,
    hotkey: '2',
  },
  {
    id: 'loan_payment',
    label: 'Loan Payment',
    prefix: 'Loan Payment ',
    left: 80,
    top: 65,
    hotkey: '3',
  },
  {
    id: 'apply_loan',
    label: 'Apply For Loan',
    prefix: 'Apply For Loan',
    left: 80,
    top: 80,
    hotkey: '4',
  },
  {
    id: 'see_broker',
    label: 'See The Broker',
    prefix: 'See The Broker',
    left: 80,
    top: 95,
    hotkey: '5',
  },
];

export const BANK_GREETINGS = [
  'Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. We take very little interest in you.',
  "Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. You'll always find yourself a loan here!",
  'Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. No charge for deposits!',
  'Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Tuesdays are Double Dollar Days!',
  'Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Have you gotten your free Toast Point Tongs?',
  'Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Our fixed-rate CDs spin at 1500 RPM!',
  'Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. This little P.I.G.G.Y. plays the market!',
  'Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Where we do Savings and Loans without a crisis!',
  'Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Our loan officers are real Yes-men!',
  'Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Our San Andreas branch is in default!',
];

export const BANK_DIALOGUE = {
  notEnoughCash: 'You do not have enough cash.',
  depositThankYou: 'Thank you for depositing on us.',
  depositNoCash: 'You do not have any cash to deposit.',
  withdrawPenalty: 'There is always a penalty for early withdrawal.',
  withdrawNoSavings: 'You do not have any savings.',
  loanPaymentThankYou: 'Thank You for your payment.',
  loanPaymentNoLoan: "You don't have a loan.",
  loanExtendPrompt: 'Sure, I can extend your loan for another $%d \nWould you like to do that?',
  loanGrantPrompt: 'Sure, you can have a loan for $%d \nWould you like to do that?',
  loanApproved: 'Here is your $%d, payable the 1st of each month.',
  loanDeclinedOffer: 'Well then, come back and see us any time.',
  loanIneligibleExtend: "I'm terribly sorry, but you need more money or a better job in order to get an extension on your loan.",
  loanIneligible: "I'm terribly sorry, but you need more money or a better job in order to get a loan.",
  loanNoTime: 'No time is left to apply for a loan.',
  brokerNoTime: 'No time is left to see the broker.',
};
