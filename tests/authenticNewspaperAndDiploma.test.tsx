import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AuthenticNewspaperModal } from '../src/ui/authentic/AuthenticNewspaperModal';
import { AuthenticDiplomaModal } from '../src/ui/authentic/AuthenticDiplomaModal';
import type { GameEvent } from '../src/engine/gameState';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.defaultValue) return options.defaultValue;
      if (key === 'news.lottery') return 'BIG LOTTERY WINNER!';
      if (key === 'stock.gold') return 'GOLD OUTLOOK IS GOOD';
      return key;
    },
  }),
}));

describe('AuthenticNewspaperModal (Script 215)', () => {
  it('renders spinning newspaper animation then reveals authentic 183x112 front page with headline', async () => {
    vi.useFakeTimers();

    const headline: GameEvent = {
      key: 'news.lottery',
    };

    const onClose = vi.fn();
    const { container } = render(
      <AuthenticNewspaperModal
        headline={headline}
        onClose={onClose}
        rules={{ guiStyle: 'authentic' } as any}
      />
    );

    // Initial spinning phase
    expect(screen.getByTestId('newspaper-spinning-anim')).toBeInTheDocument();

    // Advance timers through the 6 cels
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Spinning ends, front page revealed
    const frontPage = screen.getByTestId('newspaper-front-page');
    expect(frontPage).toBeInTheDocument();
    expect(frontPage.getAttribute('style')).toContain('/assets/authentic/newspaper/bg_newspaper.png');

    // Headline is displayed
    expect(screen.getByText('BIG LOTTERY WINNER!')).toBeInTheDocument();

    // Done button is present
    const doneBtn = screen.getByTestId('newspaper-done-btn');
    expect(doneBtn).toBeInTheDocument();
    expect(doneBtn.querySelector('img')?.getAttribute('src')).toBe('/assets/authentic/newspaper/buttons/done.png');

    // Clicking Done calls onClose
    fireEvent.click(doneBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('allows clicking overlay to skip spinning directly to front page', () => {
    const headline: GameEvent = {
      key: 'news.lottery',
    };

    render(
      <AuthenticNewspaperModal
        headline={headline}
        onClose={vi.fn()}
        rules={{ guiStyle: 'authentic' } as any}
      />
    );

    const overlay = screen.getByTestId('authentic-newspaper-modal');
    expect(screen.getByTestId('newspaper-spinning-anim')).toBeInTheDocument();

    // Click to skip
    fireEvent.click(overlay);

    expect(screen.getByTestId('newspaper-front-page')).toBeInTheDocument();
    expect(screen.getByText('BIG LOTTERY WINNER!')).toBeInTheDocument();
  });

  it('renders Market Watch column when stockTip is present', () => {
    const headline: GameEvent = {
      key: 'news.lottery',
      stockTip: {
        symbol: 'GOLD',
        action: 'buy',
        headlineKey: 'stock.gold',
        detailKey: 'Gold prices expected to jump.',
      },
    };

    render(
      <AuthenticNewspaperModal
        headline={headline}
        onClose={vi.fn()}
        rules={{ guiStyle: 'authentic' } as any}
      />
    );

    // Skip spinning
    fireEvent.click(screen.getByTestId('authentic-newspaper-modal'));

    expect(screen.getByTestId('market-watch-column')).toBeInTheDocument();
    expect(screen.getByText(/MARKET WATCH/i)).toBeInTheDocument();
    expect(screen.getByText('BUY')).toBeInTheDocument();
    expect(screen.getByText('GOLD OUTLOOK IS GOOD')).toBeInTheDocument();
  });
});

describe('AuthenticDiplomaModal (Script 230)', () => {
  it('renders unrolling diploma and displays player and degree name', () => {
    vi.useFakeTimers();

    const onClose = vi.fn();
    const { container } = render(
      <AuthenticDiplomaModal
        degreeName="Electronics Technology"
        playerName="Jones"
        onClose={onClose}
        rules={{ guiStyle: 'authentic' } as any}
      />
    );

    // Initial viewport with bg_diploma.png
    const viewport = screen.getByTestId('diploma-viewport');
    expect(viewport).toBeInTheDocument();
    expect(viewport.getAttribute('style')).toContain('/assets/authentic/diploma/bg_diploma.png');

    // Scroll container
    const scrollImg = screen.getByTestId('diploma-scroll-img');
    expect(scrollImg).toBeInTheDocument();

    // Advance unroll animation
    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Check certificate text overlay
    expect(screen.getByTestId('diploma-text-overlay')).toBeInTheDocument();
    expect(screen.getByText('Hi-Tech University')).toBeInTheDocument();
    expect(screen.getByText('Jones')).toBeInTheDocument();
    expect(screen.getByText('Electronics Technology')).toBeInTheDocument();

    // Done button is present
    const doneBtn = screen.getByTestId('diploma-done-btn');
    expect(doneBtn).toBeInTheDocument();
    expect(doneBtn.querySelector('img')?.getAttribute('src')).toBe('/assets/authentic/diploma/buttons/done.png');

    // Click Done calls onClose
    fireEvent.click(doneBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('handles Escape / Enter keys to complete unroll and close', () => {
    const onClose = vi.fn();
    render(
      <AuthenticDiplomaModal
        degreeName="Pre-Engineering"
        playerName="Smith"
        onClose={onClose}
        rules={{ guiStyle: 'authentic' } as any}
      />
    );

    // Escape completes unroll first if animating
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('diploma-text-overlay')).toBeInTheDocument();

    // Next Escape closes
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
