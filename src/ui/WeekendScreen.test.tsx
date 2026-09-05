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

  describe('Interactive Card Selection Mode', () => {
    it('renders 3 cards with fluff and potential outcomes when offeredWeekendCards are present', () => {
      const onSelectCard = vi.fn();
      const player = createTestPlayer({
        name: 'Eva',
        offeredWeekendCards: [
          {
            id: 'card_cheap',
            tier: 'cheap',
            type: 'random',
            eventKey: 'events.cheap',
            titleKey: 'weekendScreen.card.cheapTitle',
            fluff: 'Went to the local park.',
            icon: '🌳',
            costMin: 5,
            costMax: 20,
            targetStat: 'mental',
            potentialBonusMin: 0,
            potentialBonusMax: 0
          },
          {
            id: 'card_medium',
            tier: 'medium',
            type: 'random',
            eventKey: 'events.medium',
            titleKey: 'weekendScreen.card.mediumTitle',
            fluff: 'Dinner with colleagues.',
            icon: '👥',
            costMin: 15,
            costMax: 55,
            targetStat: 'social',
            potentialBonusMin: 0,
            potentialBonusMax: 2
          },
          {
            id: 'card_expensive',
            tier: 'expensive',
            type: 'random',
            eventKey: 'events.expensive',
            titleKey: 'weekendScreen.card.expensiveTitle',
            fluff: 'Luxury weekend resort getaway.',
            icon: '✨',
            costMin: 50,
            costMax: 100,
            targetStat: 'mental',
            potentialBonusMin: 2,
            potentialBonusMax: 4
          }
        ]
      });

      render(
        <WeekendScreen
          player={player}
          turn={3}
          onStartWeek={vi.fn()}
          onSelectCard={onSelectCard}
        />
      );

      // Verify fluff and cost ranges appear
      expect(screen.getByText(/"Went to the local park\."/)).toBeInTheDocument();
      expect(screen.getByText(/"Dinner with colleagues\."/)).toBeInTheDocument();
      expect(screen.getByText(/"Luxury weekend resort getaway\."/)).toBeInTheDocument();
      expect(screen.getByText('$5 – $20')).toBeInTheDocument();
      expect(screen.getByText('$15 – $55')).toBeInTheDocument();
      expect(screen.getByText('$50 – $100')).toBeInTheDocument();

      // Click second card to select it
      const mediumCardFluff = screen.getByText(/"Dinner with colleagues\."/);
      fireEvent.click(mediumCardFluff);

      // Confirm selection
      const chooseBtn = screen.getByText(/Lock In Weekend/i);
      fireEvent.click(chooseBtn);

      expect(onSelectCard).toHaveBeenCalledWith('card_medium');
    });

    it('displays chosenCard icon and narrative on summary screen after card resolution', () => {
      const player = createTestPlayer({
        name: 'Frank',
        weekendResult: {
          event: { key: 'events.weekend.random_5' },
          cost: 30,
          chosenCard: {
            id: 'card_medium',
            tier: 'medium',
            type: 'random',
            eventKey: 'events.weekend.random_5',
            titleKey: 'weekendScreen.card.mediumTitle',
            fluff: 'Went bowling with good friends all night long.',
            icon: '🎳',
            costMin: 15,
            costMax: 55,
            targetStat: 'social',
            potentialBonusMin: 0,
            potentialBonusMax: 2
          },
          modifications: [
            { stat: 'money', diff: -30 },
            { stat: 'social', diff: 1 }
          ]
        }
      });

      render(<WeekendScreen player={player} turn={4} onStartWeek={vi.fn()} />);

      expect(screen.getByText(/Went bowling with good friends all night long\./)).toBeInTheDocument();
      expect(screen.getByText('🎳')).toBeInTheDocument();
      expect(screen.getByText(/-\$30/)).toBeInTheDocument();
      expect(screen.getByText(/\+1 👥/)).toBeInTheDocument();
    });
  });
});

