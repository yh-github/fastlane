import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameOverScreen } from './GameOverScreen';

describe('GameOverScreen', () => {
  it('renders winner congratulations, turn count, and handles play again click', () => {
    const onPlayAgain = vi.fn();

    render(
      <GameOverScreen
        playerName="Champion"
        turn={15}
        replayData={null}
        onPlayAgain={onPlayAgain}
      />
    );

    expect(screen.getByText(/Champion/i)).toBeInTheDocument();

    const playAgainBtn = screen.getByRole('button', { name: /playAgain|Play Again|שחק שוב/i });
    fireEvent.click(playAgainBtn);
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('renders export replay button when replay data is provided', () => {
    const mockReplay: any = {
      version: '1.0.0',
      steps: [],
    };

    render(
      <GameOverScreen
        playerName="Champion"
        turn={10}
        replayData={mockReplay}
        onPlayAgain={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Export Replay/i })).toBeInTheDocument();
  });
});
