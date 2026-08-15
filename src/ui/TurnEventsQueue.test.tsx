import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TurnEventsQueue } from './TurnEventsQueue';
import type { GameEvent } from '../engine/gameState';

describe('TurnEventsQueue', () => {
  it('navigates through multiple events and fires onComplete when finished', () => {
    const events: GameEvent[] = [
      { key: 'events.doctor', params: { cost: 100 } },
      { key: 'events.rentDue', params: { amount: 300 } },
    ];
    const onComplete = vi.fn();

    render(<TurnEventsQueue events={events} onComplete={onComplete} />);

    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    const nextBtn = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    const continueBtn = screen.getByRole('button', { name: /Continue/i });
    fireEvent.click(continueBtn);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onComplete immediately when events array is empty', () => {
    const onComplete = vi.fn();
    render(<TurnEventsQueue events={[]} onComplete={onComplete} />);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
