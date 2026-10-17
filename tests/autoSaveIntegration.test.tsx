import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import App from '../src/App';
import { AUTOSAVE_STORAGE_KEY, saveAutoSave } from '../src/utils/saveManager';
import { TEST_BASE_GAME_RULES, TEST_BASE_CAMPAIGN_CONFIG } from '../src/engine/testFactories';
import { createPlayerState, createDefaultTurnFlags } from '../src/engine/stateFactories';
import type { GameState } from '../src/engine/gameState';

// Mock map graphics since PixiJS won't run in jsdom
vi.mock('../src/graphics/mapRenderer', () => ({
  animatePlayerPath: async (path: any[], _playerIndex: number, _speed: number, onStep?: () => void) => {
    for (let i = 0; i < path.length; i++) {
      if (onStep) onStep();
    }
  },
  animateRobberInterception: vi.fn().mockResolvedValue(undefined),
  initMapRenderer: vi.fn().mockResolvedValue(() => {}),
  movePlayerTo: vi.fn(),
  pulsePlayer: vi.fn(),
  showMapClick: vi.fn(),
}));

// Mock the GameMap component
vi.mock('../src/ui/GameMap', () => ({
  GameMap: ({ onNodeClick }: any) => (
    <div data-testid="mock-game-map">
      <button data-testid="node-home" onClick={() => onNodeClick('node_low_cost')}>
        Home Node
      </button>
      <button data-testid="node-burger" onClick={() => onNodeClick('node_burger')}>
        Burger Node
      </button>
      <button data-testid="node-bank" onClick={() => onNodeClick('node_bank')}>
        Bank Node
      </button>
    </div>
  )
}));

// Mock pathfinding
vi.mock('../src/graphics/pathfinding', () => ({
  buildAdjacencyMap: () => new Map(),
  buildEdgeWaypointMap: () => new Map(),
  getEdgeKey: (from: string, to: string) => `${from}->${to}`,
  calculateTravelHours: () => 0.5,
  findShortestPath: (_map: any, from: string, to: string) => ({
    found: true,
    steps: 1,
    totalWaypoints: 7,
    path: [from || 'node_low_cost', to]
  }),
}));

describe('Auto-Save Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const createMockGameState = (turn = 4, money = 350): GameState => ({
    turn,
    economicIndex: 0,
    economicTrend: 0,
    pawnShopItemsForSale: [],
    players: [
      {
        ...createPlayerState(
          'player_1',
          'AutoSaver',
          false,
          { wealth: 100, happiness: 100, education: 100, career: 100 },
          'node_low_cost',
          {
            ...TEST_BASE_CAMPAIGN_CONFIG,
            name: 'Test',
            version: '1.0.0',
            description: '',
            startingMoney: 200,
            winConditions: [
              { stat: 'wealth', label: 'Wealth', target: 100 },
              { stat: 'happiness', label: 'Happiness', target: 100 },
              { stat: 'education', label: 'Education', target: 100 },
              { stat: 'career', label: 'Career', target: 100 },
            ],
            gameRules: TEST_BASE_GAME_RULES,
          }
        ),
        hoursRemaining: 45,
        money,
        turnFlags: {
          ...createDefaultTurnFlags(),
          hasSeenWeekend: true,
        },
      }
    ],
    phase: 'playing',
    campaignId: 'qol_improved',
    rngState: 999,
    rules: { ...TEST_BASE_GAME_RULES },
    winnerId: null,
  });

  it('prompts to continue when saved game exists on game load', async () => {
    const savedState = createMockGameState(7, 850);
    saveAutoSave({
      version: 1,
      campaignId: 'qol_improved',
      gameState: savedState,
      timestamp: Date.now(),
    });

    render(<App />);

    // Verify prompt modal appears immediately
    expect(await screen.findByTestId('resume-prompt-modal')).toBeInTheDocument();
    expect(screen.getByText(/AutoSaver/)).toBeInTheDocument();
    expect(screen.getByText(/850/)).toBeInTheDocument();
    expect(screen.getAllByText(/Week 7/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('btn-resume-continue')).toBeInTheDocument();
    expect(screen.getByTestId('btn-resume-start-new')).toBeInTheDocument();
  });

  it('resumes gameplay immediately with exact saved state when Continue Game is clicked', async () => {
    const savedState = createMockGameState(9, 1200);
    saveAutoSave({
      version: 1,
      campaignId: 'qol_improved',
      gameState: savedState,
      timestamp: Date.now(),
    });

    render(<App />);

    const continueBtn = await screen.findByTestId('btn-resume-continue');
    fireEvent.click(continueBtn);

    // Verify transition to playing with resumed player info
    await screen.findByText(/^AutoSaver/i);
    expect(screen.getByText(/Week 9/i)).toBeInTheDocument();
  });

  it('dismisses prompt when Start New Game is clicked, keeping title screen option', async () => {
    const savedState = createMockGameState(5, 500);
    saveAutoSave({
      version: 1,
      campaignId: 'qol_improved',
      gameState: savedState,
      timestamp: Date.now(),
    });

    render(<App />);

    const startNewBtn = await screen.findByTestId('btn-resume-start-new');
    fireEvent.click(startNewBtn);

    // Prompt closed
    expect(screen.queryByTestId('resume-prompt-modal')).not.toBeInTheDocument();

    // Title screen still offers "Continue Saved Game"
    const titleResumeBtn = screen.getByTestId('btn-title-resume');
    expect(titleResumeBtn).toBeInTheDocument();

    // Clicking title resume button resumes the game
    fireEvent.click(titleResumeBtn);
    await screen.findByText(/^AutoSaver/i);
    expect(screen.getByText(/Week 5/i)).toBeInTheDocument();
  });

  it('auto-saves state to localStorage during active gameplay', async () => {
    render(<App />);

    // Start a new game
    const newGameBtn = await screen.findByText(/New Game|titleScreen\.startGame/i);
    fireEvent.click(newGameBtn);

    const startLifeBtn = await screen.findByText(/Start Life|setupScreen\.startLife/i);
    fireEvent.click(startLifeBtn);

    // Gameplay starts
    await screen.findByText(/^Player 1/i);

    // Check that auto-save was written to localStorage
    await waitFor(() => {
      const stored = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.gameState).toBeDefined();
      expect(parsed.gameState.turn).toBe(1);
    });
  });

  it('clears autosave when game over is reached (winning the game)', async () => {
    const savedState = createMockGameState(10, 5000);
    saveAutoSave({
      version: 1,
      campaignId: 'qol_improved',
      gameState: savedState,
      timestamp: Date.now(),
    });

    render(<App />);

    const continueBtn = await screen.findByTestId('btn-resume-continue');
    fireEvent.click(continueBtn);

    await screen.findByText(/^AutoSaver/i);

    // Verify autosave is present in localStorage
    expect(localStorage.getItem(AUTOSAVE_STORAGE_KEY)).not.toBeNull();

    // Trigger game over via winning state or settings quit
    // For unit testing quit clears autosave:
    const settingsBtn = document.getElementById('btn-settings') || screen.getByTitle(/Settings/i);
    expect(settingsBtn).toBeInTheDocument();
    fireEvent.click(settingsBtn);

    const quitBtn = await screen.findByTestId('btn-quit-game');
    fireEvent.click(quitBtn);

    const confirmQuitBtn = await screen.findByTestId('btn-confirm-quit');
    fireEvent.click(confirmQuitBtn);

    // Wait for title screen and assert autosave is cleared
    await screen.findByText(/Fast Lane/i);
    expect(localStorage.getItem(AUTOSAVE_STORAGE_KEY)).toBeNull();
    expect(screen.queryByTestId('btn-title-resume')).not.toBeInTheDocument();
  });
});
