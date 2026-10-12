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

  it('renders explicit modifier pills on event', () => {
    const events: GameEvent[] = [
      {
        key: 'events.foodSpoiled.noFridge',
        params: { amount: 3 },
        modifications: [
          { stat: 'mess', diff: 3 },
          { stat: 'mental', diff: -2 },
        ],
      },
    ];

    render(<TurnEventsQueue events={events} onComplete={vi.fn()} />);
    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.getByText(/-2 🧠/i)).toBeInTheDocument();
  });

  it('infers modifier pills for computer profit under advanced rules', () => {
    const events: GameEvent[] = [
      {
        key: 'events.computerProfit',
        params: { profit: 75 },
      },
    ];

    render(
      <TurnEventsQueue
        events={events}
        onComplete={vi.fn()}
        rules={{ helpfulUI: true, usePhysicalMentalConditions: true } as any}
      />
    );

    expect(screen.getByText(/\+\$75/i)).toBeInTheDocument();
    expect(screen.getByText(/\+3 🧠/i)).toBeInTheDocument();
    expect(screen.getByText(/\+0.25 💻/i)).toBeInTheDocument();
  });

  it('renders doctor visit with cash, loanDebt diversion, and physical condition', () => {
    const events: GameEvent[] = [
      {
        key: 'events.doctorVisit',
        params: { cost: 100 },
        modifications: [
          { stat: 'money', diff: -50 },
          { stat: 'loanDebt', diff: 50 },
          { stat: 'physical', diff: 4 },
        ],
      },
    ];

    render(
      <TurnEventsQueue
        events={events}
        onComplete={vi.fn()}
        rules={{ helpfulUI: true } as any}
      />
    );

    expect(screen.getByText(/-\$50/i)).toBeInTheDocument();
    expect(screen.getByText(/\+\$50 🏦/i)).toBeInTheDocument();
    expect(screen.getByText(/\+4 💪/i)).toBeInTheDocument();
  });

  it('suppresses non-economic modifier pills when helpfulUI is false', () => {
    const events: GameEvent[] = [
      {
        key: 'events.computerProfit',
        params: { profit: 75 },
        modifications: [
          { stat: 'money', diff: 75 },
          { stat: 'mental', diff: 3 },
          { stat: 'skillTech', diff: 0.25 },
        ],
      },
    ];

    render(
      <TurnEventsQueue
        events={events}
        onComplete={vi.fn()}
        rules={{ helpfulUI: false } as any}
      />
    );

    expect(screen.getByText(/\+\$75/i)).toBeInTheDocument();
    expect(screen.queryByText(/\+3 🧠/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+0.25 💻/i)).not.toBeInTheDocument();
  });
});

