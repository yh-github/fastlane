import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import App from './App';

// Mock map graphics since PixiJS won't run in jsdom
vi.mock('./graphics/mapRenderer', () => ({
  animatePlayerPath: async (path: any[], _playerIndex: number, _speed: number, onStep?: () => void) => {
    // Instantly simulate walking the path by invoking the callback
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

// Mock the GameMap component to provide simple clickable buttons for nodes
vi.mock('./ui/GameMap', () => ({
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

// Mock pathfinding so we definitely get a valid path
vi.mock('./graphics/pathfinding', () => ({
  buildAdjacencyMap: () => new Map(),
  findShortestPath: (_map: any, from: string, to: string) => ({
    found: true,
    steps: 1,
    path: [from || 'node_low_cost', to]
  }),
}));

describe('App Integration & StrictMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not double-execute side effects when in StrictMode (e.g. buying an item)', async () => {
    // Mount App inside StrictMode exactly as it runs in development.
    // If the functional updater double-invocation bug is present, this will catch it.
    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    // Wait for the Title Screen
    const newGameBtn = await screen.findByText(/New Game|titleScreen\.startGame/i);
    fireEvent.click(newGameBtn);

    // Wait for Setup Screen
    const startGameBtn = await screen.findByText(/Start Life|setupScreen\.startLife/i);
    fireEvent.click(startGameBtn);

    // Wait for the app to finish loading the campaign and transition to gameplay
    await screen.findByText(/Player 1 - Week/i);

    // Find the Burger Node button on our mocked map
    const burgerNodeBtn = screen.getByTestId('node-burger');

    // Click once to walk there
    fireEvent.click(burgerNodeBtn);

    // Wait a tick for the pathfinding and mock animation to complete and React to re-render
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    // Click again to open the building modal
    fireEvent.click(burgerNodeBtn);

    // Wait for the storefront modal to open and display the Cheeseburger
    const cheeseburgerItem = await screen.findByText(/Cheeseburger|cheeseburger/i);
    
    // Click on the Cheeseburger to buy it
    fireEvent.click(cheeseburgerItem);

    // Wait for the log to register the purchase
    await waitFor(() => {
      expect(screen.queryByText(/action.buy/i)).toBeInTheDocument();
    });

    // Assert that the side-effect ONLY triggered once!
    // We search the entire DOM for all elements matching the log text.
    const logs = screen.getAllByText(/action.buy/i);
    expect(logs.length).toBe(1);

    // Flush any pending async state updates (like SpeechBubble timeouts) before unmounting
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });
  });

  it('advances turn when hours reach 0 and location is exited, progressing to Week 2 with reset hours', async () => {
    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    // Title Screen -> New Game
    const newGameBtn = await screen.findByText(/New Game|titleScreen\.startGame/i);
    fireEvent.click(newGameBtn);

    // Setup Screen -> Start Life
    const startGameBtn = await screen.findByText(/Start Life|setupScreen\.startLife/i);
    fireEvent.click(startGameBtn);

    // Wait for gameplay
    await screen.findByText(/Player 1 - Week/i);

    // Open Home modal if not already open
    const homeNodeBtn = screen.getByTestId('node-home');
    if (!screen.queryByTestId('btn-relax')) {
      fireEvent.click(homeNodeBtn);
      await act(async () => {
        await new Promise(r => setTimeout(r, 50));
      });
      fireEvent.click(homeNodeBtn);
    }

    // Relax in home modal to spend down hours
    const relaxBtn = await screen.findByTestId('btn-relax');
    expect(relaxBtn).toBeInTheDocument();

    for (let i = 0; i < 10; i++) {
      fireEvent.click(relaxBtn);
      await act(async () => {
        await new Promise(r => setTimeout(r, 20));
      });
    }

    // Exit location by clicking close button on modal
    const closeBtn = document.querySelector('.building-modal__close');
    if (closeBtn) {
      fireEvent.click(closeBtn);
    }

    // Wait for turn event modal (e.g. starvation) to appear and dismiss all event pages
    const firstEventBtn = await screen.findByRole('button', { name: /Next|Continue/i });
    fireEvent.click(firstEventBtn);
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });

    let nextOrContinue = screen.queryByRole('button', { name: /Next|Continue/i });
    while (nextOrContinue) {
      fireEvent.click(nextOrContinue);
      await act(async () => {
        await new Promise(r => setTimeout(r, 50));
      });
      nextOrContinue = screen.queryByRole('button', { name: /Next|Continue/i });
    }

    // Wait for Weekend Screen and click start week
    const startWeekBtn = await screen.findByText(/Start Week 2|weekendScreen\.startWeek/i);
    expect(startWeekBtn).toBeInTheDocument();
    fireEvent.click(startWeekBtn);

    // Verify Week 2 begins
    await screen.findByText(/Player 1 - Week 2/i);

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });
  });

  it('renders Bank modal with visible Stocks tab and allows viewing stock market offerings', async () => {
    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    // Title screen -> Start game
    const newGameBtn = await screen.findByText(/New Game|titleScreen\.startGame/i);
    fireEvent.click(newGameBtn);

    // Setup screen -> Start life
    const startGameBtn = await screen.findByText(/Start Life|setupScreen\.startLife/i);
    fireEvent.click(startGameBtn);

    await screen.findByText(/Player 1 - Week/i);

    // Close any automatically open home modal first
    const closeBtn = document.querySelector('.building-modal__close');
    if (closeBtn) {
      fireEvent.click(closeBtn);
      await act(async () => {
        await new Promise(r => setTimeout(r, 50));
      });
    }

    // Walk to Bank
    const bankNodeBtn = screen.getByTestId('node-bank');
    fireEvent.click(bankNodeBtn);

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    // Open Bank modal if not open
    if (!screen.queryByTestId('tab-stocks')) {
      fireEvent.click(bankNodeBtn);
    }

    // Verify Stocks tab is present in Bank modal!
    const stocksTabBtn = await screen.findByTestId('tab-stocks');
    expect(stocksTabBtn).toBeInTheDocument();

    // Click Stocks tab
    fireEvent.click(stocksTabBtn);

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    // Verify stocks are listed (Treasury Bills / T-Bills, Blue Chip, Penny Stocks)
    await waitFor(() => {
      expect(screen.getByText(/Treasury Bills|T-Bills/i)).toBeInTheDocument();
      expect(screen.getByText(/Blue Chip/i)).toBeInTheDocument();
      expect(screen.getByText(/Penny Stocks/i)).toBeInTheDocument();
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });
  });
});
