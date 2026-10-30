import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AuthenticStreetRobberyModal } from '../src/ui/authentic/AuthenticStreetRobberyModal';
import { AuthenticLotteryModal } from '../src/ui/authentic/AuthenticLotteryModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (key === 'building.bank') return 'First National Bank';
      if (key === 'lottery.title') return 'Instant Scratchers';
      if (options?.defaultValue) return options.defaultValue;
      return key;
    },
  }),
}));

describe('AuthenticStreetRobberyModal (Script 114)', () => {
  it('plays Wild Willy mugging sequence then transitions to alert dialog', () => {
    vi.useFakeTimers();

    const onClose = vi.fn();
    render(
      <AuthenticStreetRobberyModal
        lostAmount={250}
        location="bank"
        onClose={onClose}
        isHelpfulUI={true}
      />
    );

    // Initial stage with Willy sprite
    expect(screen.getByTestId('willy-mugging-stage')).toBeInTheDocument();
    expect(screen.getByTestId('willy-sprite')).toBeInTheDocument();

    // Advance timers through all 20 frames (20 * 80ms = 1600ms)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Alert dialog is displayed
    expect(screen.getByTestId('willy-alert-dialog')).toBeInTheDocument();
    expect(screen.getByText(/Street Robbery!/i)).toBeInTheDocument();
    expect(screen.getByText(/First National Bank/i)).toBeInTheDocument();
    expect(screen.getByText(/Loss: -\$250/i)).toBeInTheDocument();

    // Click OK / Done button
    const okBtn = screen.getByTestId('willy-dismiss-btn');
    fireEvent.click(okBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('allows clicking overlay to skip animation directly to alert dialog', () => {
    const onClose = vi.fn();
    render(
      <AuthenticStreetRobberyModal
        lostAmount={100}
        location="bank"
        onClose={onClose}
      />
    );

    const overlay = screen.getByTestId('authentic-street-robbery-modal');
    expect(screen.getByTestId('willy-mugging-stage')).toBeInTheDocument();

    // Click to skip
    fireEvent.click(overlay);

    expect(screen.getByTestId('willy-alert-dialog')).toBeInTheDocument();
    expect(screen.getByText(/Loss: -\$100/i)).toBeInTheDocument();

    // Dismiss with Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('AuthenticLotteryModal (Script 116)', () => {
  it('renders scratch ticket with 3 boxes and allows scratching each box', () => {
    const onClose = vi.fn();
    render(
      <AuthenticLotteryModal
        prizeAmount={500}
        onClose={onClose}
      />
    );

    expect(screen.getByTestId('lottery-ticket')).toBeInTheDocument();

    // 3 boxes
    const box0 = screen.getByTestId('lottery-box-0');
    const box1 = screen.getByTestId('lottery-box-1');
    const box2 = screen.getByTestId('lottery-box-2');

    // Scratch box 0
    fireEvent.click(box0);
    expect(screen.getByText('$500')).toBeInTheDocument();

    // Scratch remaining boxes
    fireEvent.click(box1);
    fireEvent.click(box2);

    // Winning message displayed
    expect(screen.getByTestId('lottery-result-text')).toHaveTextContent(/MATCH 3! YOU WON \$500!/i);

    // Click Done button
    const doneBtn = screen.getByTestId('lottery-done-btn');
    fireEvent.click(doneBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows Scratch All button to reveal whole ticket at once', () => {
    const onClose = vi.fn();
    render(
      <AuthenticLotteryModal
        prizeAmount={0}
        onClose={onClose}
      />
    );

    const scratchAllBtn = screen.getByTestId('lottery-scratch-all-btn');
    fireEvent.click(scratchAllBtn);

    // Loss message displayed
    expect(screen.getByTestId('lottery-result-text')).toHaveTextContent(/NO MATCH!/i);

    // Dismiss with Enter key
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
