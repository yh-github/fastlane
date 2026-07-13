import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from './App';

// Mock map graphics since PixiJS won't run in jsdom
vi.mock('./graphics/mapRenderer', () => ({
  animatePlayerPath: async (path: any[], _speed: number, onStep?: () => void) => {
    // Instantly simulate walking the path by invoking the callback
    for (let i = 0; i < path.length; i++) {
      if (onStep) onStep();
    }
  },
  initMapRenderer: vi.fn().mockResolvedValue(() => {}),
  movePlayerTo: vi.fn(),
}));

// Mock the GameMap component to provide simple clickable buttons for nodes
vi.mock('./ui/GameMap', () => ({
  GameMap: ({ onNodeClick }: any) => (
    <div data-testid="mock-game-map">
      <button data-testid="node-burger" onClick={() => onNodeClick('node_burger')}>
        Burger Node
      </button>
    </div>
  )
}));

// Mock pathfinding so we definitely get a valid path
vi.mock('./graphics/pathfinding', () => ({
  buildAdjacencyMap: () => new Map(),
  findShortestPath: () => ({
    found: true,
    steps: 1,
    path: ['node_low_cost', 'node_burger']
  }),
}));

describe('App Integration & StrictMode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
    await new Promise(r => setTimeout(r, 100));

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
  });
});
