import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeekendCardView } from './WeekendCardView';
import type { WeekendCard } from '../engine/gameState';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.defaultValue) return options.defaultValue;
      return key;
    }
  }),
}));

describe('WeekendCardView', () => {
  it('formats single bonus cleanly when min equals max instead of showing range like +1..+1', () => {
    const card: WeekendCard = {
      id: 'test_card',
      tier: 'cheap',
      type: 'work',
      titleKey: 'Test Card',
      eventKey: 'events.test',
      fluff: 'Test fluff',
      icon: '💼',
      costMin: 10,
      costMax: 10,
      targetStat: 'dependability',
      potentialBonusMin: 1,
      potentialBonusMax: 1
    };

    render(
      <WeekendCardView
        card={card}
        isSelected={false}
        onSelect={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText(/\+1 🤝/i)).toBeInTheDocument();
    expect(screen.queryByText(/\+1\.\.\+1/i)).not.toBeInTheDocument();
  });

  it('formats range when min and max differ', () => {
    const card: WeekendCard = {
      id: 'test_card_range',
      tier: 'medium',
      type: 'random',
      titleKey: 'Test Card Range',
      eventKey: 'events.test_range',
      fluff: 'Test range fluff',
      icon: '🎲',
      costMin: 20,
      costMax: 40,
      targetStat: 'dependability',
      potentialBonusMin: 2,
      potentialBonusMax: 3
    };

    render(
      <WeekendCardView
        card={card}
        isSelected={false}
        onSelect={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText(/\+2\.\.\+3 🤝/i)).toBeInTheDocument();
  });
});
