import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WeekendScreen } from './WeekendScreen';
import { createTestPlayer } from '../engine/testFactories';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.name) return `Summary for ${options.name}`;
      if (options?.defaultValue) return options.defaultValue;
      return key;
    }
  }),
}));
describe('WeekendScreen', () => {
  it('renders weekend summary with activities, cost, happiness, and continues to next week', () => {
    const player = createTestPlayer({
      name: 'Alice',
      weekendResult: {
        event: { key: 'weekend.baseball', params: { activity: 'Went to baseball game' } },
        cost: 45,
        happinessBonus: 3,
      },
    });

    const onStartWeek = vi.fn();
    render(<WeekendScreen player={player} turn={4} onStartWeek={onStartWeek} />);

    expect(screen.getByText(/Alice/i)).toBeInTheDocument();
    expect(screen.getByText(/45/i)).toBeInTheDocument();

    const startWeekBtn = screen.getByRole('button');
    fireEvent.click(startWeekBtn);
    expect(onStartWeek).toHaveBeenCalledTimes(1);
  });

  it('renders empty activity message when no weekend activity occurred', () => {
    const player = createTestPlayer({
      name: 'Bob',
      weekendResult: undefined,
    });

    render(<WeekendScreen player={player} turn={2} onStartWeek={vi.fn()} />);
    expect(screen.getByText(/Bob/i)).toBeInTheDocument();
  });

  it('renders Mental Condition instead of Happiness when mental condition is active', () => {
    const player = createTestPlayer({
      name: 'Charlie',
      mentalCondition: 45,
      weekendResult: {
        event: { key: 'weekend.theatre', params: {} },
        cost: 30,
        happinessBonus: 2,
      },
    });

    render(<WeekendScreen player={player} turn={3} onStartWeek={vi.fn()} />);
    expect(screen.getByText(/Mental Condition:/i)).toBeInTheDocument();
    expect(screen.getByText(/\+2/)).toBeInTheDocument();
  });
});
