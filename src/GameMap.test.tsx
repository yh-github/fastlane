import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { GameMap } from './ui/GameMap';

// Mock PixiJS entirely so mapRenderer can initialize headless
vi.mock('pixi.js', () => {
  class Graphics {
    x = 0; y = 0; visible = true; scale = { set: vi.fn() };
    circle() {} fill() {} setStrokeStyle() {} stroke() {} addChild() {} on() {} moveTo() {} lineTo() {}
  }
  class Container {
    x = 0; y = 0;
    addChild() {}
  }
  class Application {
    stage = new Container();
    canvas = document.createElement('canvas');
    init = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
    get renderer() { return true; }
  }
  class Text {
    anchor = { set: vi.fn() };
    x = 0; y = 0;
  }
  return { Graphics, Container, Application, Text };
});

describe('GameMap Character GUI Tests', () => {
  it('renders the character on the board and updates its coordinates', async () => {
    const mockCampaign = {
      config: { name: 'test', startingMoney: 100 },
      map: { width: 800, height: 600, nodes: [{ id: 'start', x: 10, y: 10, connections: [] }, { id: 'next', x: 200, y: 300, connections: [] }] },
      buildings: [],
      items: [],
      jobs: [],
      events: []
    } as any;

    const mockPlayer = {
      position: 'start',
      money: 100,
      job: null,
      inventory: [],
      clothes: 'Casual'
    } as any;

    const { rerender } = render(
      <GameMap 
        campaign={mockCampaign} 
        player={mockPlayer} 
        onNodeClick={() => {}} 
      />
    );

    // Wait for the map to be ready and character to be visible
    await waitFor(() => {
      const marker = screen.getByTestId('player-character');
      expect(marker).toHaveAttribute('data-visible', 'true');
      expect(marker).toHaveAttribute('data-x', '10');
      expect(marker).toHaveAttribute('data-y', '10');
    });

    // Move character to a new node
    mockPlayer.position = 'next';
    rerender(
      <GameMap 
        campaign={mockCampaign} 
        player={mockPlayer} 
        onNodeClick={() => {}} 
      />
    );

    // Verify character coordinates updated
    await waitFor(() => {
      const marker = screen.getByTestId('player-character');
      expect(marker).toHaveAttribute('data-visible', 'true');
      expect(marker).toHaveAttribute('data-x', '200');
      expect(marker).toHaveAttribute('data-y', '300');
    });
  });
});
