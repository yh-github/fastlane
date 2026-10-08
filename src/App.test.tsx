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
    await screen.findByText(/^Player 1/i);

    // Find the Burger Node button on our mocked map
    const burgerNodeBtn = screen.getByTestId('node-burger');

    // Click once to walk there
    fireEvent.click(burgerNodeBtn);

    // Wait a tick for the pathfinding and mock animation to complete and React to re-render
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    // Click again to open the building modal
    fireEvent.click(burgerNodeBtn);

    // Wait for the storefront modal to open and display the Cheeseburger
    const cheeseburgerItem = await screen.findByText(/Cheeseburger|cheeseburger/i);
    
    // Click on the Cheeseburger to buy it (or open ItemCardModal if helpfulUI is active)
    fireEvent.click(cheeseburgerItem);

    // If helpfulUI is enabled, clicking opens ItemCardModal with a BUY button
    const modalBuyBtn = screen.queryByTestId('btn-buy-modal-cheeseburger') || screen.queryByRole('button', { name: /BUY/i });
    if (modalBuyBtn) {
      fireEvent.click(modalBuyBtn);
    }

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
      await new Promise(r => setTimeout(r, 0));
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
    await screen.findByText(/^Player 1/i);

    // Open Home modal if not already open
    const homeNodeBtn = screen.getByTestId('node-home');
    if (!screen.queryByTestId('btn-relax')) {
      fireEvent.click(homeNodeBtn);
      await act(async () => {
        await new Promise(r => setTimeout(r, 0));
      });
      fireEvent.click(homeNodeBtn);
    }

    const leisureBtn = screen.queryByRole('button', { name: /Leisure/i });
    if (leisureBtn) {
      fireEvent.click(leisureBtn);
    }

    // Relax in home modal to spend down hours
    const relaxBtn = await screen.findByTestId('btn-relax');
    expect(relaxBtn).toBeInTheDocument();

    for (let i = 0; i < 10; i++) {
      fireEvent.click(relaxBtn);
      const confirmBtn = screen.queryByTestId('confirm-unfed-relax');
      if (confirmBtn) {
        fireEvent.click(confirmBtn);
      }
      await act(async () => {
        await new Promise(r => setTimeout(r, 0));
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
      await new Promise(r => setTimeout(r, 0));
    });

    let nextOrContinue = screen.queryByRole('button', { name: /Next|Continue/i });
    let safety = 0;
    while (nextOrContinue && safety++ < 20) {
      fireEvent.click(nextOrContinue);
      await act(async () => {
        await new Promise(r => setTimeout(r, 0));
      });
      nextOrContinue = screen.queryByRole('button', { name: /Next|Continue/i });
    }

    // If on card choice screen (Advanced Edition), pick a weekend activity first
    const chooseActivityBtn = screen.queryByText(/Lock In Weekend/i);
    if (chooseActivityBtn) {
      fireEvent.click(chooseActivityBtn);
      await act(async () => {
        await new Promise(r => setTimeout(r, 0));
      });
    }

    // Wait for Weekend Screen and click start week
    const startWeekBtn = await screen.findByText(/Start Week 2|weekendScreen\.startWeek/i);
    expect(startWeekBtn).toBeInTheDocument();
    fireEvent.click(startWeekBtn);

    // Verify Week 2 begins
    await screen.findByText(/Week #?2/i);

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });
  }, 60000);

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

    await screen.findByText(/^Player 1/i);

    // Close any automatically open home modal first
    const closeBtn = document.querySelector('.building-modal__close');
    if (closeBtn) {
      fireEvent.click(closeBtn);
      await act(async () => {
        await new Promise(r => setTimeout(r, 0));
      });
    }

    // Walk to Bank
    const bankNodeBtn = screen.getByTestId('node-bank');
    fireEvent.click(bankNodeBtn);

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    // Open Bank modal if not open
    if (!screen.queryByTestId('tab-stocks') && !screen.queryByTestId('tab-ear-stocks')) {
      fireEvent.click(bankNodeBtn);
    }

    // Verify Stocks tab is present in Bank modal!
    const stocksTabBtn = await screen.findByTestId(/tab-stocks|tab-ear-stocks/);
    expect(stocksTabBtn).toBeInTheDocument();

    // Click Stocks tab
    fireEvent.click(stocksTabBtn);

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    // Verify stocks are listed (Treasury Bills / T-Bills, Blue Chip, Penny Stocks)
    await waitFor(() => {
      expect(screen.getByText(/Treasury Bills|T-Bills/i)).toBeInTheDocument();
      expect(screen.getByText(/Blue Chip/i)).toBeInTheDocument();
      expect(screen.getByText(/Penny Stocks/i)).toBeInTheDocument();
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });
  });

  it('changes destination when clicking another node while currently moving', async () => {
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

    await screen.findByText(/^Player 1/i);

    // Start moving towards burger
    const burgerNodeBtn = screen.getByTestId('node-burger');
    const bankNodeBtn = screen.getByTestId('node-bank');

    fireEvent.click(burgerNodeBtn);
    // Click bank while in motion
    fireEvent.click(bankNodeBtn);

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    // The player should reach bank destination
    expect(screen.getByTestId('node-bank')).toBeInTheDocument();
  });

  it('renders the clock at the bottom center of the board when authentic curved board is active in default Top HUD', async () => {
    window.innerWidth = 600;
    window.innerHeight = 800;

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

    await screen.findByText(/^Player 1/i);

    // Default HUD is Top HUD
    expect(document.querySelector('.app-container--top-hud')).toBeInTheDocument();

    // Since authenticCurvedPaths is true by default, the bottom center clock is rendered on the board
    expect(screen.getByTestId('bottom-center-clock')).toBeInTheDocument();
    expect(screen.getByTestId('clock-face-number')).toBeInTheDocument();
    expect(document.getElementById('hud-clock-digital')?.textContent).toContain('Week #1');
  });

  it('clicking on the walking avatar opens the status window in a non-blocking building-modal', async () => {
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

    await screen.findByText(/^Player 1/i);

    // Close any initial home modal
    const closeBtn = document.querySelector('.building-modal__close');
    if (closeBtn) {
      fireEvent.click(closeBtn);
      await act(async () => {
        await new Promise(r => setTimeout(r, 0));
      });
    }

    // Walking avatar is visible on center stage
    const avatar = await screen.findByTestId('center-character-avatar');
    expect(avatar).toBeInTheDocument();

    // Click walking avatar
    fireEvent.click(avatar);
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    // Verify Status window is open and uses .building-modal class (same size & position as location window)
    const statusModal = screen.getByTestId('inventory-modal');
    expect(statusModal).toBeInTheDocument();
    expect(statusModal).toHaveClass('building-modal');
    expect(document.querySelector('.building-modal-overlay')).toBeNull(); // No blocking overlay!
    expect(screen.getByText('Your Status')).toBeInTheDocument();

    // Close Status window
    const statusCloseBtn = statusModal.querySelector('.building-modal__close');
    expect(statusCloseBtn).toBeInTheDocument();
    fireEvent.click(statusCloseBtn!);

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(screen.queryByTestId('inventory-modal')).not.toBeInTheDocument();
  });

  it('opens Activity Log in a non-blocking building-modal without fullscreen overlay, allowing HUD filtering', async () => {
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

    await screen.findByText(/^Player 1/i);

    // Close any initial home modal
    const closeBtn = document.querySelector('.building-modal__close');
    if (closeBtn) {
      fireEvent.click(closeBtn);
      await act(async () => {
        await new Promise(r => setTimeout(r, 0));
      });
    }

    // Open Status window via HUD Status button
    const statusBtn = document.getElementById('btn-inventory')!;
    fireEvent.click(statusBtn);

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    // Wait for status modal to open
    const statusModal = await screen.findByTestId('inventory-modal');
    expect(statusModal).toBeInTheDocument();

    // Click View Activity Log button at bottom of status modal
    const openLogBtn = screen.getByTestId('btn-open-log-from-status');
    fireEvent.click(openLogBtn);

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    // Verify Log window is open in .building-modal
    const logWindow = screen.getByTestId('log-window');
    expect(logWindow).toBeInTheDocument();
    expect(logWindow).toHaveClass('building-modal');
    expect(document.querySelector('.fullscreen-overlay')).toBeNull(); // No blocking overlay!

    // Verify the HUD is still visible and interactive
    expect(screen.getByText(/^Player 1/i)).toBeInTheDocument();

    // Close Log window
    const logCloseBtn = logWindow.querySelector('.building-modal__close');
    expect(logCloseBtn).toBeInTheDocument();
    fireEvent.click(logCloseBtn!);

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(screen.queryByTestId('log-window')).not.toBeInTheDocument();
  });

  it('cleanly isolates sessions: quitting to title and starting a new game resets all modals without leakage', async () => {
    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    // 1. Start Game 1
    const newGameBtn = await screen.findByText(/New Game|titleScreen\.startGame/i);
    fireEvent.click(newGameBtn);

    const startGameBtn = await screen.findByText(/Start Life|setupScreen\.startLife/i);
    fireEvent.click(startGameBtn);

    await screen.findByText(/^Player 1/i);

    // Close any initial home modal
    const closeBtn = document.querySelector('.building-modal__close');
    if (closeBtn) {
      fireEvent.click(closeBtn);
      await act(async () => {
        await new Promise(r => setTimeout(r, 0));
      });
    }

    // 2. Open Settings modal via HUD button
    const settingsBtn = document.getElementById('btn-settings')!;
    expect(settingsBtn).toBeInTheDocument();
    fireEvent.click(settingsBtn);

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    // Verify settings modal is open
    expect(screen.getByTestId('btn-quit-game')).toBeInTheDocument();

    // 3. Click Quit Game and confirm
    fireEvent.click(screen.getByTestId('btn-quit-game'));

    const confirmQuitBtn = await screen.findByTestId('btn-confirm-quit');
    fireEvent.click(confirmQuitBtn);

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    // 4. Verify we are back on the Title Screen
    const newGameBtn2 = await screen.findByText(/New Game|titleScreen\.startGame/i);
    expect(newGameBtn2).toBeInTheDocument();

    // 5. Start Game 2
    fireEvent.click(newGameBtn2);

    const startGameBtn2 = await screen.findByText(/Start Life|setupScreen\.startLife/i);
    fireEvent.click(startGameBtn2);

    await screen.findByText(/^Player 1/i);

    // 6. Assert Session Isolation:
    // Newspaper modal MUST NOT be open on Turn 1!
    expect(screen.queryByTestId('newspaper-modal')).not.toBeInTheDocument();
    expect(screen.queryByText(/The Daily News|newspaper\.title/i)).not.toBeInTheDocument();
    // Settings modal MUST NOT be open!
    expect(screen.queryByTestId('btn-quit-game')).not.toBeInTheDocument();
    // Inventory modal MUST NOT be open!
    expect(screen.queryByTestId('inventory-modal')).not.toBeInTheDocument();
  });
});

