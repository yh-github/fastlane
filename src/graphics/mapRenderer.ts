/**
 * mapRenderer.ts — PixiJS-based board and entity rendering.
 *
 * Responsible for drawing the game board, buildings, character sprites,
 * and handling visual state transitions. Consumes MapData and BuildingDef
 * from the campaign bundle to render the world.
 */

import { Application, Graphics, Container, Text } from 'pixi.js';
import type { MapData, BuildingDef } from '../engine/dataLoader';

// ─── Renderer Interface ─────────────────────────────────────────

export interface MapRendererConfig {
  /** The HTML canvas element or container div to render into */
  container: HTMLElement;
  /** Map spatial data from campaign */
  mapData: MapData;
  /** Building definitions for sprite loading */
  buildings: BuildingDef[];
  /** Base path for campaign assets (e.g., "/campaigns/classic_1990") */
  assetBasePath: string;
  /** Callback fired when a node is clicked */
  onNodeClick: (nodeId: string) => void;
}

export interface PlayerPosition {
  nodeId: string;
  x: number;
  y: number;
}

// Keep references to movable sprites/graphics
let app: Application | null = null;
let playerTokens: Graphics[] = [];
let testMarker: HTMLDivElement | null = null;
let activeInstanceId = 0;

/**
 * Initialize the PixiJS renderer and load map assets.
 *
 * @param config — Renderer configuration
 * @returns        Cleanup function to destroy the PixiJS application
 */
export async function initMapRenderer(
  config: MapRendererConfig
): Promise<() => void> {
  const instanceId = ++activeInstanceId;
  const localApp = new Application();
  
  await localApp.init({
    width: config.mapData.width,
    height: config.mapData.height,
    backgroundAlpha: 0, // Transparent to show CSS background
    resizeTo: config.container,
  });

  if (!localApp.renderer) {
    localApp.destroy(true);
    return () => {};
  }

  if (instanceId !== activeInstanceId) {
    localApp.destroy(true, { children: true });
    return () => {};
  }

  if (app) {
    app.destroy(true, { children: true });
  }

  app = localApp;
  config.container.appendChild(localApp.canvas);

  const mapContainer = new Container();
  
  // Center map in container if container is larger
  mapContainer.x = (config.container.clientWidth - config.mapData.width) / 2;
  mapContainer.y = (config.container.clientHeight - config.mapData.height) / 2;

  localApp.stage.addChild(mapContainer);

  const edgesLayer = new Graphics();
  mapContainer.addChild(edgesLayer);

  // Draw connections (neon cyan)
  edgesLayer.setStrokeStyle({ width: 3, color: 0x00e5ff, alpha: 0.5 });
  
  const nodeMap = new Map(config.mapData.nodes.map(n => [n.id, n]));

  // Draw all edges
  for (const node of config.mapData.nodes) {
    for (const connId of node.connections) {
      const target = nodeMap.get(connId);
      if (target) {
        edgesLayer.moveTo(node.x, node.y);
        edgesLayer.lineTo(target.x, target.y);
        edgesLayer.stroke();
      }
    }
  }

  // Draw nodes and make them interactive
  for (const node of config.mapData.nodes) {
    const nodeGraphic = new Graphics();
    
    // Check if it's a building
    if (node.buildingId) {
      // Building nodes: larger, amber glow
      nodeGraphic.circle(0, 0, 24);
      nodeGraphic.fill({ color: 0x141428 });
      nodeGraphic.setStrokeStyle({ width: 3, color: 0xffb300, alpha: 0.8 });
      nodeGraphic.stroke();
      
      const buildingDef = config.buildings.find(b => b.id === node.buildingId);
      const name = buildingDef ? buildingDef.name : node.buildingId;
      
      const label = new Text({
        text: name,
        style: { fill: 0xffffff, fontSize: 12, fontWeight: 'bold', align: 'center', dropShadow: { alpha: 0.8, color: 0x000000, blur: 2, distance: 0 } }
      });
      label.anchor.set(0.5, 0.5);
      label.x = 0;
      label.y = 0;
      nodeGraphic.addChild(label);
      
    } else {
      // Waypoint nodes: smaller, cyan
      nodeGraphic.circle(0, 0, 15);
      nodeGraphic.fill({ color: 0x141428 });
      nodeGraphic.setStrokeStyle({ width: 2, color: 0x00e5ff });
      nodeGraphic.stroke();
    }
    
    nodeGraphic.x = node.x;
    nodeGraphic.y = node.y;
    nodeGraphic.eventMode = 'static';
    nodeGraphic.cursor = 'pointer';
    nodeGraphic.on('pointerdown', () => {
      config.onNodeClick(node.id);
    });
    
    // Hover effects
    nodeGraphic.on('pointerover', () => {
      nodeGraphic.scale.set(1.1);
    });
    nodeGraphic.on('pointerout', () => {
      nodeGraphic.scale.set(1.0);
    });

    mapContainer.addChild(nodeGraphic);
  }

  // We will create player tokens dynamically in updatePlayers

  // Sync with a DOM element for testability
  if (testMarker) {
    testMarker.remove();
  }
  testMarker = document.createElement('div');
  testMarker.dataset.testid = 'player-character';
  testMarker.style.display = 'none';
  testMarker.dataset.visible = 'false';
  config.container.appendChild(testMarker);

  console.log('[MapRenderer] Initialized');

  return () => {
    if (instanceId === activeInstanceId) {
      if (app) {
        app.destroy(true, { children: true });
        app = null;
        playerTokens = [];
      }
      if (testMarker) {
        testMarker.remove();
        testMarker = null;
      }
      console.log('[MapRenderer] Destroyed');
    }
  };
}

/**
 * Update the player tokens on the map.
 */
export function updatePlayers(players: { position: PlayerPosition, index: number, isActive: boolean }[]): void {
  if (!app) return;
  const mapContainer = app.stage.children[0] as Container;
  
  // Create missing tokens
  while (playerTokens.length < players.length) {
    const token = new Graphics();
    mapContainer.addChild(token);
    playerTokens.push(token);
  }

  // Hide all tokens first
  playerTokens.forEach(t => t.visible = false);

  const colors = [0xff4081, 0x00e5ff, 0x76ff03, 0xffeb3b]; // Magenta, Cyan, Light Green, Yellow

  players.forEach((p, i) => {
    const token = playerTokens[p.index];
    if (!token) return;
    
    token.clear();
    const color = colors[p.index % colors.length];
    
    // Different shapes for color blindness
    if (p.index === 0) {
      token.circle(0, 0, p.isActive ? 14 : 10); // Player 1: Circle
    } else if (p.index === 1) {
      token.drawRect(p.isActive ? -12 : -8, p.isActive ? -12 : -8, p.isActive ? 24 : 16, p.isActive ? 24 : 16); // Player 2: Square
    } else if (p.index === 2) {
      token.drawPolygon([-14, 12, 14, 12, 0, -14]); // Player 3: Triangle
    } else {
      token.circle(0, 0, p.isActive ? 14 : 10);
    }
    
    token.fill({ color });
    token.setStrokeStyle({ width: 3, color: p.isActive ? 0xffffff : 0x555555 });
    token.stroke();

    // Prevent overriding position if this token is currently animating
    if (!(token as any).isAnimating) {
      token.x = p.position.x;
      token.y = p.position.y;
    }
    
    token.visible = true; // Show all players now that jitter bug is fixed
    
    // To prevent overlapping tokens from perfectly hiding each other, offset slightly based on index
    if (p.isActive && players.filter(other => other.position.nodeId === p.position.nodeId && other.isActive).length > 1) {
       token.x += (p.index - (players.length / 2)) * 6;
       token.y += (p.index - (players.length / 2)) * 6;
    }

    if (p.isActive && testMarker) {
      testMarker.dataset.x = p.position.x.toString();
      testMarker.dataset.y = p.position.y.toString();
      testMarker.dataset.visible = 'true';
    }
  });
}

/**
 * Highlight reachable nodes from the player's current position.
 */
export function highlightReachableNodes(nodeIds: string[]): void {
  // TODO: Add visual overlay to reachable nodes in Sprint 3 polish
  console.log('[MapRenderer] Reachable nodes: ', nodeIds);
}

/**
 * Animate the player token along a path of nodes.
 * @param path - Array of positions to visit in order
 * @param speedMs - Time in milliseconds per step
 */
export async function animatePlayerPath(path: PlayerPosition[], playerIndex: number, speedMs: number = 300, onStep?: () => void): Promise<void> {
  if (path.length === 0 || !playerTokens[playerIndex]) return;
  const token = playerTokens[playerIndex];
  token.visible = true;

  for (const pos of path) {
    await new Promise<void>((resolve) => {
      const startX = token.x;
      const startY = token.y;
      const targetX = pos.x;
      const targetY = pos.y;
      
      const startTime = performance.now();
      
      function step(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / speedMs, 1);
        
        token.x = startX + (targetX - startX) * progress;
        token.y = startY + (targetY - startY) * progress;
        
        if (testMarker) {
          testMarker.dataset.x = token.x.toString();
          testMarker.dataset.y = token.y.toString();
        }

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          if (onStep) onStep();
          (token as any).isAnimating = false;
          resolve();
        }
      }
      (token as any).isAnimating = true;
      requestAnimationFrame(step);
    });
  }
}

/**
 * Pulse a specific player token to draw attention to it.
 */
export async function pulsePlayer(playerIndex: number): Promise<void> {
  if (!playerTokens[playerIndex]) return;
  const token = playerTokens[playerIndex];
  
  return new Promise<void>((resolve) => {
    const startTime = performance.now();
    const duration = 600; // 600ms pulse
    const originalScale = 1;
    
    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const scale = originalScale + Math.sin(progress * Math.PI) * 0.8;
      token.scale.set(scale, scale);
      
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        token.scale.set(originalScale, originalScale);
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

/**
 * Show a visual ping/click indication on the map at the given coordinates.
 */
export function showMapClick(x: number, y: number): void {
  if (!app) return;
  const mapContainer = app.stage.children[0] as Container;
  
  const ping = new Graphics();
  ping.circle(0, 0, 10);
  ping.fill({ color: 0xffffff, alpha: 0.8 });
  ping.setStrokeStyle({ width: 2, color: 0x00e5ff });
  ping.stroke();
  ping.x = x;
  ping.y = y;
  mapContainer.addChild(ping);

  const startTime = performance.now();
  const duration = 500;
  
  function step(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const scale = 1 + progress * 4;
    ping.scale.set(scale, scale);
    ping.alpha = 1 - (progress * progress); // non-linear fade
    
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      ping.destroy();
    }
  }
  requestAnimationFrame(step);
}
