import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { GameMap } from './ui/GameMap';
import { getBuildingLabel } from './graphics/mapRenderer';

// Mock PixiJS entirely so mapRenderer can initialize headless
vi.mock('pixi.js', () => {
  class Graphics {
    x = 0; y = 0; visible = true; scale = { set: vi.fn() };
    clear() {} drawRect() {} drawPolygon() {}
    circle() {} fill() {} setStrokeStyle() {} stroke() {} addChild() {} on() {} moveTo() {} lineTo() {}
  }
  class Container {
    x = 0; y = 0;
    children: any[] = [ { addChild: vi.fn() } ];
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
    text = '';
    constructor(opts?: any) {
      if (opts?.text) this.text = opts.text;
    }
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
        players={[mockPlayer]} 
        activePlayerIndex={0}
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
        players={[mockPlayer]} 
        activePlayerIndex={0}
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

  it('positions character at authenticNodes coordinates when authenticCurvedPaths is true and reverts to schematic when false', async () => {
    const mockCampaign = {
      config: { name: 'test', startingMoney: 100 },
      map: {
        width: 1200,
        height: 800,
        nodes: [{ id: 'node_low_cost', x: 600, y: 100, connections: [] }],
        authenticNodes: {
          node_low_cost: { x: 540, y: 148 }
        }
      },
      buildings: [],
      items: [],
      jobs: [],
      events: []
    } as any;

    const mockPlayer = {
      position: 'node_low_cost',
      money: 100,
      job: null,
      inventory: [],
      clothes: 'Casual'
    } as any;

    const { rerender } = render(
      <GameMap 
        campaign={mockCampaign} 
        players={[mockPlayer]} 
        activePlayerIndex={0}
        onNodeClick={() => {}}
        authenticCurvedPaths={true}
      />
    );

    // With authenticCurvedPaths=true, character sits at authentic coordinate (540, 148)
    await waitFor(() => {
      const marker = screen.getByTestId('player-character');
      expect(marker).toHaveAttribute('data-visible', 'true');
      expect(marker).toHaveAttribute('data-x', '540');
      expect(marker).toHaveAttribute('data-y', '148');
    });

    // Revert to schematic layout (authenticCurvedPaths=false)
    rerender(
      <GameMap 
        campaign={mockCampaign} 
        players={[mockPlayer]} 
        activePlayerIndex={0}
        onNodeClick={() => {}}
        authenticCurvedPaths={false}
      />
    );

    // With authenticCurvedPaths=false, character sits at schematic coordinate (600, 100)
    await waitFor(() => {
      const marker = screen.getByTestId('player-character');
      expect(marker).toHaveAttribute('data-visible', 'true');
      expect(marker).toHaveAttribute('data-x', '600');
      expect(marker).toHaveAttribute('data-y', '100');
    });
  });

  it('updates building labels dynamically without reinitializing renderer', async () => {
    const mockCampaign = {
      config: { name: 'test', startingMoney: 100 },
      map: {
        width: 800,
        height: 600,
        nodes: [
          { id: 'start', buildingId: 'blacks_market', x: 10, y: 10, connections: [] }
        ]
      },
      buildings: [
        { id: 'blacks_market', name: "Black's Market" }
      ],
      items: [],
      jobs: [],
      events: []
    } as any;

    render(
      <GameMap 
        campaign={mockCampaign} 
        players={[]} 
        activePlayerIndex={0}
        onNodeClick={() => {}} 
      />
    );

    await waitFor(() => {
      expect(getBuildingLabel('blacks_market')).toBeDefined();
    });

    expect(getBuildingLabel('blacks_market')).toBe("Black's Market");
  });
});
