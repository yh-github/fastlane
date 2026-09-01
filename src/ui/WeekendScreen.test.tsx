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
    expect(screen.getByText(/-?\$45/i)).toBeInTheDocument();
    expect(screen.getByText(/\+3 😊/i)).toBeInTheDocument();

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

  it('renders mental condition icon when mental condition is active', () => {
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
    expect(screen.getByText(/\+2 🧠/i)).toBeInTheDocument();
    expect(screen.getByText(/-?\$30/i)).toBeInTheDocument();
  });

  it('renders complete list of weekly modifications with icons when helpfulUI is true or undefined', () => {
    const player = createTestPlayer({
      name: 'Dana',
      mentalCondition: 30,
      dependability: 25,
      mess: 15,
      social: 8,
      physicalCondition: 45,
      weekendResult: {
        event: { key: 'events.weekend.random_3', params: {} },
        cost: 25,
        happinessBonus: 1,
        modifications: [
          { stat: 'money', diff: -25 },
          { stat: 'mental', diff: 1 },
          { stat: 'dependability', diff: -3 },
          { stat: 'mess', diff: 3 },
          { stat: 'social', diff: -1 },
          { stat: 'physical', diff: 1 },
        ]
      }
    });

    render(<WeekendScreen player={player} turn={5} onStartWeek={vi.fn()} />);

    expect(screen.getByText(/-\$25/)).toBeInTheDocument();
    expect(screen.getByText(/\+1 🧠/)).toBeInTheDocument();
    expect(screen.getByText(/-3 🤝/)).toBeInTheDocument();
    expect(screen.getByText(/\+3 🧹/)).toBeInTheDocument();
    expect(screen.getByText(/-1 👥/)).toBeInTheDocument();
    expect(screen.getByText(/\+1 💪/)).toBeInTheDocument();

    // Verify Weekly Adjustments card is NOT rendered
    expect(screen.queryByText('Weekly Adjustments')).not.toBeInTheDocument();
  });

  it('renders only money spent when helpfulUI is false', () => {
    const player = createTestPlayer({
      name: 'Dana',
      mentalCondition: 30,
      dependability: 25,
      mess: 15,
      social: 8,
      physicalCondition: 45,
      weekendResult: {
        event: { key: 'events.weekend.random_3', params: {} },
        cost: 25,
        happinessBonus: 1,
        modifications: [
          { stat: 'money', diff: -25 },
          { stat: 'mental', diff: 1 },
          { stat: 'dependability', diff: -3 },
          { stat: 'mess', diff: 3 },
          { stat: 'social', diff: -1 },
          { stat: 'physical', diff: 1 },
        ]
      }
    });

    render(<WeekendScreen player={player} turn={5} onStartWeek={vi.fn()} rules={{ helpfulUI: false } as any} />);

    expect(screen.getByText(/-\$25/)).toBeInTheDocument();
    expect(screen.queryByText(/\+1 🧠/)).not.toBeInTheDocument();
    expect(screen.queryByText(/-3 🤝/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+3 🧹/)).not.toBeInTheDocument();
    expect(screen.queryByText(/-1 👥/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+1 💪/)).not.toBeInTheDocument();
  });
});

