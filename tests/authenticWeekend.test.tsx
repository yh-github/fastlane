import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthenticWeekendScreen } from '../src/ui/authentic/AuthenticWeekendScreen';
import { createTestPlayer } from '../src/engine/testFactories';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.defaultValue) return options.defaultValue;
      if (key === 'weekend.baseball') return 'You went to the baseball game this weekend.';
      if (key === 'weekendScreen.nothingSpecial') return 'You stayed home and did absolutely nothing this weekend.';
      return key;
    },
  }),
}));

describe('AuthenticWeekendScreen (Script 232)', () => {
  it('renders authentic desk calendar viewport with player name, fluff narrative, and cost', () => {
    const player = createTestPlayer({
      name: 'Jones',
      weekendResult: {
        event: { key: 'weekend.baseball', params: {} },
        cost: 45,
        happinessBonus: 3,
      },
    });

    const onStartWeek = vi.fn();
    const { container } = render(
      <AuthenticWeekendScreen
        player={player}
        turn={2}
        onStartWeek={onStartWeek}
        rules={{ guiStyle: 'authentic', helpfulUI: true } as any}
      />
    );

    // Verify 183x112 viewport with bg_weekend.png
    const viewport = container.querySelector('.authentic-weekend-viewport');
    expect(viewport).toBeInTheDocument();
    expect(viewport?.getAttribute('style')).toContain('/assets/authentic/weekend/bg_weekend.png');

    // Verify player name and text
    expect(screen.getByText('Jones')).toBeInTheDocument();
    expect(screen.getByText(/baseball game/i)).toBeInTheDocument();
    expect(screen.getByText(/You spent \$45/i)).toBeInTheDocument();

    // Verify authentic Done button
    const doneBtn = screen.getByTestId('weekend-start-week-btn');
    expect(doneBtn).toBeInTheDocument();
    expect(doneBtn.querySelector('img')?.getAttribute('src')).toBe('/assets/authentic/weekend/buttons/done.png');

    // Click Done button
    fireEvent.click(doneBtn);
    expect(onStartWeek).toHaveBeenCalledTimes(1);
  });

  it('triggers onStartWeek via Enter and Escape key shortcuts', () => {
    const player = createTestPlayer({
      name: 'Jones',
      weekendResult: {
        event: { key: 'weekend.baseball', params: {} },
        cost: 20,
      },
    });

    const onStartWeek = vi.fn();
    render(
      <AuthenticWeekendScreen
        player={player}
        turn={3}
        onStartWeek={onStartWeek}
        rules={{ guiStyle: 'authentic' } as any}
      />
    );

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onStartWeek).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onStartWeek).toHaveBeenCalledTimes(2);
  });

  it('renders empty weekend message when no activity occurred', () => {
    const player = createTestPlayer({
      name: 'Smith',
      weekendResult: undefined,
    });

    render(
      <AuthenticWeekendScreen
        player={player}
        turn={1}
        onStartWeek={vi.fn()}
        rules={{ guiStyle: 'authentic' } as any}
      />
    );

    expect(screen.getByText('Smith')).toBeInTheDocument();
    expect(screen.getByText(/nothing this weekend/i)).toBeInTheDocument();
  });

  it('supports interactive card selection in authentic mode and confirms choice', () => {
    const player = createTestPlayer({
      name: 'Jones',
      offeredWeekendCards: [
        {
          id: 'card_park',
          tier: 'cheap',
          type: 'random',
          eventKey: 'e1',
          titleKey: 'Park Stroll',
          fluff: 'Walked in the park.',
          icon: '🌳',
          costMin: 0,
          costMax: 0,
          targetStat: 'happiness',
          potentialBonusMin: 1,
          potentialBonusMax: 2,
        },
        {
          id: 'card_concert',
          tier: 'medium',
          type: 'random',
          eventKey: 'e2',
          titleKey: 'Rock Concert',
          fluff: 'Front row seats!',
          icon: '🎸',
          costMin: 35,
          costMax: 50,
          targetStat: 'happiness',
          potentialBonusMin: 2,
          potentialBonusMax: 4,
        },
      ],
    });

    const onSelectCard = vi.fn();
    render(
      <AuthenticWeekendScreen
        player={player}
        turn={4}
        onStartWeek={vi.fn()}
        onSelectCard={onSelectCard}
        rules={{ guiStyle: 'authentic' } as any}
      />
    );

    // Shows selection modal
    expect(screen.getByTestId('weekend-selection-modal')).toBeInTheDocument();
    expect(screen.getByText(/Park Stroll/i)).toBeInTheDocument();
    expect(screen.getByText(/Rock Concert/i)).toBeInTheDocument();

    // Select second card and confirm
    fireEvent.click(screen.getByText(/Rock Concert/i));
    const confirmBtn = screen.getByTestId('weekend-confirm-btn');
    fireEvent.click(confirmBtn);

    expect(onSelectCard).toHaveBeenCalledWith('card_concert');
  });

  it('renders souvenir callout when souvenir was acquired', () => {
    const player = createTestPlayer({
      name: 'Jones',
      weekendResult: {
        event: { key: 'weekend.baseball', params: {} },
        cost: 15,
        souvenir: {
          id: 'baseball_cap',
          name: 'Team Cap',
          icon: '🧢',
        },
      },
    });

    render(
      <AuthenticWeekendScreen
        player={player}
        turn={2}
        onStartWeek={vi.fn()}
        rules={{ guiStyle: 'authentic' } as any}
      />
    );

    const souvenirEl = screen.getByTestId('weekend-souvenir-callout');
    expect(souvenirEl).toBeInTheDocument();
    expect(souvenirEl).toHaveTextContent('Team Cap');
    expect(souvenirEl).toHaveTextContent('🧢');
  });
});
