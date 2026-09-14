import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SetupScreen } from './SetupScreen';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => options?.defaultValue || key,
  }),
}));

describe('SetupScreen Character Selector', () => {
  const mockWinConditions = [
    { stat: 'wealth', label: 'Wealth', target: 50 },
    { stat: 'happiness', label: 'Happiness', target: 50 },
  ];

  it('renders default Player 1 with Character 1 selected', () => {
    render(<SetupScreen winConditions={mockWinConditions} onConfirm={() => {}} />);

    // Check that character selector buttons 1, 2, 3, 4, and 0 (Jones) are rendered
    expect(screen.getByTestId('player-0-char-1')).toBeInTheDocument();
    expect(screen.getByTestId('player-0-char-2')).toBeInTheDocument();
    expect(screen.getByTestId('player-0-char-3')).toBeInTheDocument();
    expect(screen.getByTestId('player-0-char-4')).toBeInTheDocument();
    expect(screen.getByTestId('player-0-char-0')).toBeInTheDocument();

    // Player 1 defaults to Character 1 (has cyan border / active styling)
    const char1Btn = screen.getByTestId('player-0-char-1');
    expect(char1Btn.style.border).toContain('var(--accent-cyan');
  });

  it('updates selected character when clicking a character button', () => {
    const onConfirm = vi.fn();
    render(<SetupScreen winConditions={mockWinConditions} onConfirm={onConfirm} />);

    // Click Character 3
    const char3Btn = screen.getByTestId('player-0-char-3');
    fireEvent.click(char3Btn);

    // Confirm game start
    const startBtn = screen.getByRole('button', { name: /startLife|Start Life/i });
    fireEvent.click(startBtn);

    expect(onConfirm).toHaveBeenCalled();
    const playersConfig = onConfirm.mock.calls[0][0];
    expect(playersConfig[0].characterIndex).toBe(3);
  });

  it('defaults additional players to sequential character indices', () => {
    const onConfirm = vi.fn();
    render(<SetupScreen winConditions={mockWinConditions} onConfirm={onConfirm} />);

    // Add Player 2
    const addPlayerBtn = screen.getByRole('button', { name: /addPlayer|Add Player/i });
    fireEvent.click(addPlayerBtn);

    // Confirm game start
    const startBtn = screen.getByRole('button', { name: /startLife|Start Life/i });
    fireEvent.click(startBtn);

    expect(onConfirm).toHaveBeenCalled();
    const playersConfig = onConfirm.mock.calls[0][0];
    expect(playersConfig[0].characterIndex).toBe(1);
    expect(playersConfig[1].characterIndex).toBe(2);
  });
});
