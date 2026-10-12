import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WeekendBreakdownModal } from './WeekendBreakdownModal';
import type { WeekendResult } from '../engine/gameState';

describe('WeekendBreakdownModal', () => {
  it('renders concept guide and itemized sections, and closes on buttons', () => {
    const onClose = vi.fn();
    const weekendResult: WeekendResult = {
      event: { key: 'events.weekend.ticket_concert' },
      cost: 50,
      activityModifications: [
        { stat: 'money', diff: -50, label: 'Concert Ticket' },
        { stat: 'mental', diff: 3, label: 'Rock Show' },
      ],
      maintenanceModifications: [
        { stat: 'mess', diff: 2, label: 'Apartment Mess' },
      ],
      modifications: [
        { stat: 'money', diff: -50 },
        { stat: 'mental', diff: 3 },
        { stat: 'mess', diff: 2 },
      ],
      chosenCard: {
        id: 'ticket_concert',
        type: 'ticket',
        tier: 'medium',
        titleKey: 'weekend.concert',
        eventKey: 'events.weekend.ticket_concert',
        fluff: 'Went to a rock concert.',
        icon: '🎸',
        costMin: 50,
        costMax: 50,
        targetStat: 'mental',
        potentialBonusMin: 3,
        potentialBonusMax: 3,
      },
    };

    render(
      <WeekendBreakdownModal
        weekendResult={weekendResult}
        isHelpfulUI={true}
        onClose={onClose}
      />
    );

    expect(screen.getByText(/How Weekends & Turns Work/i)).toBeInTheDocument();
    expect(screen.getByText(/Weekly Life Cycle/i)).toBeInTheDocument();
    expect(screen.getByText(/No Double Deductions/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Weekend Activity/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Weekly Upkeep & Maintenance/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Net Weekly Change/i)).toBeInTheDocument();

    // Verify close button
    const closeBtn = screen.getByTestId('close-breakdown-modal-btn');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Verify Got It! button
    const gotItBtn = screen.getByRole('button', { name: /Got It!/i });
    fireEvent.click(gotItBtn);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('renders placeholder messages when activity or maintenance modifications are empty', () => {
    const weekendResult: WeekendResult = {
      event: { key: 'events.weekend.random_0' },
      cost: 0,
      activityModifications: [],
      maintenanceModifications: [],
      modifications: [],
    };

    render(
      <WeekendBreakdownModal
        weekendResult={weekendResult}
        isHelpfulUI={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/No attribute modifications/i)).toBeInTheDocument();
    expect(screen.getByText(/Everything stayed clean and steady this week/i)).toBeInTheDocument();
    expect(screen.getByText(/No net changes/i)).toBeInTheDocument();
  });
});
