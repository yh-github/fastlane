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

    const startWeekBtn = screen.getByRole('button', { name: /startWeek/i });
    fireEvent.click(startWeekBtn);
    expect(onStartWeek).toHaveBeenCalledTimes(1);
  });

  it('opens and closes the breakdown and concept guide modal when clicking ? button', () => {
    const player = createTestPlayer({
      name: 'Alice',
      weekendResult: {
        event: { key: 'weekend.baseball', params: {} },
        cost: 30,
        happinessBonus: 2,
        activityModifications: [
          { stat: 'money', diff: -30, label: 'Game Ticket' },
          { stat: 'mental', diff: 2, label: 'Relaxation' },
        ],
        maintenanceModifications: [
          { stat: 'mess', diff: 2, label: 'Apartment Mess' },
          { stat: 'dependability', diff: -1, label: 'Dependability Decay' },
        ],
        modifications: [
          { stat: 'money', diff: -30 },
          { stat: 'mental', diff: 2 },
          { stat: 'mess', diff: 2 },
          { stat: 'dependability', diff: -1 },
        ],
      },
    });

    render(<WeekendScreen player={player} turn={3} onStartWeek={vi.fn()} />);

    // Verify ? button is present
    const helpBtn = screen.getByTestId('weekend-breakdown-help-btn');
    expect(helpBtn).toBeInTheDocument();

    // Modal is initially closed
    expect(screen.queryByTestId('weekend-breakdown-modal')).not.toBeInTheDocument();

    // Click ? button
    fireEvent.click(helpBtn);

    // Modal is now open
    const modal = screen.getByTestId('weekend-breakdown-modal');
    expect(modal).toBeInTheDocument();
    expect(screen.getByText(/Weekly Life Cycle/i)).toBeInTheDocument();
    expect(screen.getByText(/No Double Deductions/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Weekend Activity/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Weekly Upkeep & Maintenance/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Net Weekly Change/i)).toBeInTheDocument();

    // Click Got It! button to dismiss
    const gotItBtn = screen.getByRole('button', { name: /Got It!/i });
    fireEvent.click(gotItBtn);

    // Modal is closed
    expect(screen.queryByTestId('weekend-breakdown-modal')).not.toBeInTheDocument();
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
    expect(screen.getByText(/\+3/)).toBeInTheDocument();
    expect(screen.getByTestId('mess-icon')).toBeInTheDocument();
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
    expect(screen.queryByTestId('mess-icon')).not.toBeInTheDocument();
    expect(screen.queryByText(/-1 👥/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+1 💪/)).not.toBeInTheDocument();
  });

  it('renders souvenir callout when souvenir was acquired over the weekend', () => {
    const player = createTestPlayer({
      name: 'Elena',
      weekendResult: {
        event: { key: 'events.weekend.ticket_concert', params: {} },
        cost: 40,
        happinessBonus: 2,
        souvenir: {
          id: 'curio_vintage_tin_robot_123',
          name: 'Vintage Tin Robot',
          icon: '🤖'
        }
      }
    });

    render(<WeekendScreen player={player} turn={6} onStartWeek={vi.fn()} />);

    const souvenirBadge = screen.getByTestId('weekend-souvenir-callout');
    expect(souvenirBadge).toBeInTheDocument();
    expect(souvenirBadge).toHaveTextContent('Vintage Tin Robot');
    expect(souvenirBadge).toHaveTextContent('🤖');
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

    it('renders full-sized spacious cards on large screen (1440x900)', () => {
      window.innerWidth = 1440;
      window.innerHeight = 900;
      const player = createTestPlayer({
        name: 'Eva',
        offeredWeekendCards: [
          {
            id: 'c1',
            tier: 'cheap',
            type: 'random',
            eventKey: 'e1',
            titleKey: 't1',
            fluff: 'Park stroll',
            icon: '🌳',
            costMin: 5,
            costMax: 10,
            targetStat: 'mental',
            potentialBonusMin: 0,
            potentialBonusMax: 1
          },
          {
            id: 'c2',
            tier: 'medium',
            type: 'random',
            eventKey: 'e2',
            titleKey: 't2',
            fluff: 'Concert',
            icon: '🎸',
            costMin: 20,
            costMax: 40,
            targetStat: 'social',
            potentialBonusMin: 1,
            potentialBonusMax: 2
          }
        ]
      });

      const { container } = render(
        <WeekendScreen
          player={player}
          turn={3}
          onStartWeek={vi.fn()}
          onSelectCard={vi.fn()}
        />
      );

      const cards = container.querySelectorAll('.weekend-card');
      expect(cards.length).toBe(2);
      expect(container.querySelector('.weekend-card--compact')).toBeNull();
      expect(container.querySelector('.weekend-cards-carousel')).toBeNull();
    });

    it('renders compact side-by-side cards when screen height/width cannot fit full cards (800x600)', () => {
      window.innerWidth = 800;
      window.innerHeight = 600;
      const player = createTestPlayer({
        name: 'Eva',
        offeredWeekendCards: [
          {
            id: 'c1',
            tier: 'cheap',
            type: 'random',
            eventKey: 'e1',
            titleKey: 't1',
            fluff: 'Park stroll',
            icon: '🌳',
            costMin: 5,
            costMax: 10,
            targetStat: 'mental',
            potentialBonusMin: 0,
            potentialBonusMax: 1
          },
          {
            id: 'c2',
            tier: 'medium',
            type: 'random',
            eventKey: 'e2',
            titleKey: 't2',
            fluff: 'Concert',
            icon: '🎸',
            costMin: 20,
            costMax: 40,
            targetStat: 'social',
            potentialBonusMin: 1,
            potentialBonusMax: 2
          },
          {
            id: 'c3',
            tier: 'expensive',
            type: 'random',
            eventKey: 'e3',
            titleKey: 't3',
            fluff: 'Spa weekend',
            icon: '💆',
            costMin: 60,
            costMax: 90,
            targetStat: 'physical',
            potentialBonusMin: 2,
            potentialBonusMax: 3
          }
        ]
      });

      const { container } = render(
        <WeekendScreen
          player={player}
          turn={3}
          onStartWeek={vi.fn()}
          onSelectCard={vi.fn()}
        />
      );

      const compactCards = container.querySelectorAll('.weekend-card--compact');
      expect(compactCards.length).toBe(3);
      // In 800px width with 3 cards (3*180 + 2*12 + 32 = 596px <= 800px), row fits side-by-side without carousel
      expect(container.querySelector('.weekend-cards-carousel')).toBeNull();
    });

    it('activates touch carousel and indicator pills on narrow mobile viewports (390x844)', () => {
      window.innerWidth = 390;
      window.innerHeight = 844;
      const player = createTestPlayer({
        name: 'Eva',
        offeredWeekendCards: [
          {
            id: 'c1',
            tier: 'cheap',
            type: 'random',
            eventKey: 'e1',
            titleKey: 't1',
            fluff: 'Park stroll',
            icon: '🌳',
            costMin: 5,
            costMax: 10,
            targetStat: 'mental',
            potentialBonusMin: 0,
            potentialBonusMax: 1
          },
          {
            id: 'c2',
            tier: 'medium',
            type: 'random',
            eventKey: 'e2',
            titleKey: 't2',
            fluff: 'Concert',
            icon: '🎸',
            costMin: 20,
            costMax: 40,
            targetStat: 'social',
            potentialBonusMin: 1,
            potentialBonusMax: 2
          }
        ]
      });

      const { container } = render(
        <WeekendScreen
          player={player}
          turn={3}
          onStartWeek={vi.fn()}
          onSelectCard={vi.fn()}
        />
      );

      expect(container.querySelector('.weekend-cards-carousel')).not.toBeNull();
      const indicatorPills = container.querySelectorAll('.weekend-carousel-indicator__btn');
      expect(indicatorPills.length).toBe(2);
    });
  });

  describe('Responsive Summary Layout (Phone Landscape & Side HUD Protection)', () => {
    it('renders horizontal 2-column layout on phone landscape without overflowing or obscuring the side HUD', () => {
      window.innerWidth = 667;
      window.innerHeight = 375;

      const player = createTestPlayer({
        name: 'Jordan',
        weekendResult: {
          event: { key: 'weekend.concert' },
          cost: 35,
          happinessBonus: 2,
          chosenCard: {
            id: 'c_live',
            tier: 'medium',
            type: 'ticket',
            eventKey: 'weekend.concert',
            titleKey: 'weekendScreen.card.mediumTitle',
            fluff: 'Danced to energetic live music all night.',
            icon: '🎵',
            costMin: 20,
            costMax: 40,
            targetStat: 'social',
            potentialBonusMin: 1,
            potentialBonusMax: 2
          },
          souvenir: {
            id: 'wristband',
            name: 'Concert Wristband',
            icon: '🎗️'
          },
          modifications: [
            { stat: 'money', diff: -35 },
            { stat: 'happiness', diff: 2 }
          ]
        }
      });

      const onStartWeek = vi.fn();
      const { container } = render(
        <WeekendScreen
          player={player}
          turn={4}
          onStartWeek={onStartWeek}
        />
      );

      // Verify the summary container is bounded within the viewport (not position fixed breakout)
      const summaryScreen = container.querySelector('.weekend-screen--summary');
      expect(summaryScreen).toBeInTheDocument();

      // Verify horizontal grid structure
      const grid = container.querySelector('.weekend-summary-grid');
      expect(grid).toBeInTheDocument();

      const narrativeCol = container.querySelector('.weekend-summary-col--narrative');
      expect(narrativeCol).toBeInTheDocument();
      expect(narrativeCol?.textContent).toContain('Danced to energetic live music all night.');
      expect(narrativeCol?.textContent).toContain('Concert Wristband');

      const resultsCol = container.querySelector('.weekend-summary-col--results');
      expect(resultsCol).toBeInTheDocument();

      // Start week button is inside results column for more horizontal, less vertical presentation
      const startBtn = resultsCol?.querySelector('.weekend-summary-start-btn');
      expect(startBtn).toBeInTheDocument();
      fireEvent.click(startBtn!);
      expect(onStartWeek).toHaveBeenCalledTimes(1);

      // Verify compact header
      const header = container.querySelector('.weekend-summary-header');
      expect(header).toBeInTheDocument();
      expect(header?.textContent).toContain('Jordan');
      expect(screen.getByRole('button', { name: /startWeek/i })).toBeInTheDocument();
    });

    it('gracefully handles empty weekend results in horizontal layout', () => {
      window.innerWidth = 844;
      window.innerHeight = 390;

      const player = createTestPlayer({
        name: 'Sam',
        weekendResult: undefined
      });

      const { container } = render(
        <WeekendScreen
          player={player}
          turn={2}
          onStartWeek={vi.fn()}
        />
      );

      expect(container.querySelector('.weekend-summary-grid')).toBeInTheDocument();
      expect(container.querySelector('.weekend-summary-empty')).toBeInTheDocument();
      expect(container.querySelector('.weekend-summary-start-btn')).toBeInTheDocument();
    });
  });
});

