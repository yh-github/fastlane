import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ResumePromptModal } from './ResumePromptModal';
import { TEST_BASE_GAME_RULES } from '../engine/testFactories';
import type { AutoSaveData } from '../utils/saveManager';
import type { GameState } from '../engine/gameState';

describe('ResumePromptModal', () => {
  const dummyGameState: GameState = {
    turn: 4,
    economicIndex: 0,
    economicTrend: 0,
    pawnShopItemsForSale: [],
    players: [
      {
        id: 'player_1',
        name: 'Jones',
        hoursRemaining: 36,
        money: 420,
        bankSavings: 50,
        rentDebt: 0,
        loanDebt: 0,
        timesDefaulted: 0,
        loanPaymentDeadline: 0,
        happiness: 60,
        experience: 25,
        dependability: 30,
        degreeExpBoost: 0,
        degreeDepBoost: 0,
        relaxation: 40,
        currentJobId: 'clerk',
        currentWage: 12,
        raisesAtCurrentJob: 1,
        currentHousingId: 'low_cost',
        rentPaidUntilWeek: 4,
        currentRentPrice: 150,
        degrees: [],
        position: 'node_low_cost',
        turnFlags: {} as any,
        inventory: {} as any,
        goalAllotment: { wealth: 100, happiness: 100, education: 100, career: 100 },
      } as any as import('../engine/gameState').PlayerState
    ],
    phase: 'playing',
    campaignId: 'qol_improved',
    rngState: 789,
    rules: { ...TEST_BASE_GAME_RULES },
    winnerId: null,
  };

  const dummySaveData: AutoSaveData = {
    version: 1,
    campaignId: 'qol_improved',
    gameState: dummyGameState,
    activePlayerIndex: 0,
    timestamp: 1700000000000,
  };

  it('renders save summary information accurately', () => {
    render(
      <ResumePromptModal
        savedGame={dummySaveData}
        onResume={() => {}}
        onStartNew={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByTestId('resume-prompt-modal')).toBeInTheDocument();
    expect(screen.getByText('Jones')).toBeInTheDocument();
    expect(screen.getByText(/420/)).toBeInTheDocument();
    expect(screen.getByText(/36h left/i)).toBeInTheDocument();
    expect(screen.getByTestId('btn-resume-continue')).toBeInTheDocument();
    expect(screen.getByTestId('btn-resume-start-new')).toBeInTheDocument();
  });

  it('triggers onResume when Continue Game button is clicked', () => {
    const onResume = vi.fn();
    render(
      <ResumePromptModal
        savedGame={dummySaveData}
        onResume={onResume}
        onStartNew={() => {}}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('btn-resume-continue'));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('triggers onStartNew when Start New Game button is clicked', () => {
    const onStartNew = vi.fn();
    render(
      <ResumePromptModal
        savedGame={dummySaveData}
        onResume={() => {}}
        onStartNew={onStartNew}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('btn-resume-start-new'));
    expect(onStartNew).toHaveBeenCalledTimes(1);
  });

  it('triggers onClose when close button or Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <ResumePromptModal
        savedGame={dummySaveData}
        onResume={() => {}}
        onStartNew={() => {}}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByTestId('btn-resume-close'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('triggers onDiscard when Discard Save button is clicked', () => {
    const onDiscard = vi.fn();
    render(
      <ResumePromptModal
        savedGame={dummySaveData}
        onResume={() => {}}
        onStartNew={() => {}}
        onDiscard={onDiscard}
        onClose={() => {}}
      />
    );

    const discardBtn = screen.getByTestId('btn-resume-discard');
    expect(discardBtn).toBeInTheDocument();
    fireEvent.click(discardBtn);
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});
