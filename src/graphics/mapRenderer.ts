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
  /** If true, renders authentic curved sidewalks and proportionate waypoint positions */
  authenticCurvedPaths?: boolean;
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
  localApp.canvas.style.position = 'absolute';
  localApp.canvas.style.top = '0';
  localApp.canvas.style.left = '0';
  localApp.canvas.style.width = '100%';
  localApp.canvas.style.height = '100%';
  localApp.canvas.style.display = 'block';
  config.container.appendChild(localApp.canvas);

  const mapContainer = new Container();
  localApp.stage.addChild(mapContainer);

  const updateBoardTransform = () => {
    if (!config.container || !localApp.renderer) return;
    const containerW = config.container.clientWidth;
    const containerH = config.container.clientHeight;
    if (containerW === 0 || containerH === 0) return;

    if (typeof (localApp as any).resize === 'function') {
      (localApp as any).resize();
    } else if (typeof (localApp.renderer as any).resize === 'function') {
      (localApp.renderer as any).resize(containerW, containerH);
    }

    // Uniformly scale map to fit container if smaller, or center at 1:1 if larger
    const scale = Math.min(1, Math.min(containerW / config.mapData.width, containerH / config.mapData.height));
    const boardW = config.mapData.width * scale;
    const boardH = config.mapData.height * scale;
    const boardX = (containerW - boardW) / 2;
    const boardY = (containerH - boardH) / 2;

    mapContainer.scale.set(scale);
    mapContainer.x = boardX;
    mapContainer.y = boardY;

    // Expose exact board bounds and scale via CSS custom properties on viewport
    const viewport = (config.container.closest('.game-viewport') as HTMLElement) || config.container;
    viewport.style.setProperty('--board-scale', `${scale}`);
    viewport.style.setProperty('--board-x', `${boardX}px`);
    viewport.style.setProperty('--board-y', `${boardY}px`);
    viewport.style.setProperty('--board-width', `${boardW}px`);
    viewport.style.setProperty('--board-height', `${boardH}px`);
  };

  updateBoardTransform();

  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updateBoardTransform();
    });
    resizeObserver.observe(config.container);
  }
  window.addEventListener('resize', updateBoardTransform);

  const edgesLayer = new Graphics();
  mapContainer.addChild(edgesLayer);

  const waypointsLayer = new Graphics();
  mapContainer.addChild(waypointsLayer);

  const useAuthentic = config.authenticCurvedPaths !== false && !!config.mapData.authenticNodes;

  const nodeMap = new Map(config.mapData.nodes.map(n => [n.id, n]));
  const nodePositionMap = new Map<string, { x: number; y: number }>();
  for (const node of config.mapData.nodes) {
    const authPos = useAuthentic ? config.mapData.authenticNodes?.[node.id] : undefined;
    nodePositionMap.set(node.id, authPos ? { x: authPos.x, y: authPos.y } : { x: node.x, y: node.y });
  }

  // Build edge waypoint lookup and edge object lookup
  const edgeWaypointMap = new Map<string, number>();
  const edgeObjMap = new Map<string, any>();
  if (config.mapData.edges) {
    for (const edge of config.mapData.edges) {
      edgeWaypointMap.set(`${edge.from}->${edge.to}`, edge.waypoints);
      edgeWaypointMap.set(`${edge.to}->${edge.from}`, edge.waypoints);
      edgeObjMap.set(`${edge.from}->${edge.to}`, edge);
      edgeObjMap.set(`${edge.to}->${edge.from}`, edge);
    }
  }

  // Draw all edges and their waypoint beads
  const drawnEdges = new Set<string>();
  for (const node of config.mapData.nodes) {
    const fromPos = nodePositionMap.get(node.id) || { x: node.x, y: node.y };
    for (const conn of node.connections) {
      const connId = typeof conn === 'string' ? conn : (conn as any).nodeId;
      const pairKey = [node.id, connId].sort().join('--');
      if (drawnEdges.has(pairKey)) continue;
      drawnEdges.add(pairKey);

      const target = nodeMap.get(connId);
      const toPos = nodePositionMap.get(connId) || (target ? { x: target.x, y: target.y } : undefined);
      if (target && toPos) {
        const edgeObj = edgeObjMap.get(`${node.id}->${connId}`);
        const hasPath = useAuthentic && edgeObj?.path && edgeObj.path.length > 0;

        if (hasPath && edgeObj?.path) {
          // Orient path in direction node -> connId
          const pathCoords = edgeObj.from === node.id ? edgeObj.path : [...edgeObj.path].reverse();

          // Base road curved connection line
          edgesLayer.setStrokeStyle({ width: 3.5, color: 0x00e5ff, alpha: 0.4 });
          edgesLayer.moveTo(fromPos.x, fromPos.y);
          for (const pt of pathCoords) {
            edgesLayer.lineTo(pt.x, pt.y);
          }
          edgesLayer.lineTo(toPos.x, toPos.y);
          edgesLayer.stroke();

          // Draw authentic waypoint beads
          const dotRadius = 3;
          for (const pt of pathCoords) {
            waypointsLayer.circle(pt.x, pt.y, dotRadius);
            waypointsLayer.fill({ color: 0x00e5ff, alpha: 0.85 });
            waypointsLayer.setStrokeStyle({ width: 1, color: 0xffffff, alpha: 0.7 });
            waypointsLayer.stroke();
          }
        } else {
          // Base road connection line
          edgesLayer.setStrokeStyle({ width: 3, color: 0x00e5ff, alpha: 0.35 });
          edgesLayer.moveTo(fromPos.x, fromPos.y);
          edgesLayer.lineTo(toPos.x, toPos.y);
          edgesLayer.stroke();

          // Draw waypoint dots/bars
          const waypoints = edgeWaypointMap.get(`${node.id}->${connId}`) ?? (typeof conn === 'object' && conn !== null ? (conn as any).waypoints : undefined);
          if (waypoints && waypoints > 0) {
            const dx = toPos.x - fromPos.x;
            const dy = toPos.y - fromPos.y;
            const edgeLength = Math.sqrt(dx * dx + dy * dy);

            // Clear building circles (node radius is 44, hit area is 52)
            const marginStart = 52;
            const marginEnd = 52;
            const usableLength = edgeLength - (marginStart + marginEnd);

            if (usableLength > 0) {
              const dotRadius = Math.min(3, Math.max(1.8, (usableLength / waypoints) * 0.35));
              for (let k = 1; k <= waypoints; k++) {
                const distAlongRoad = marginStart + ((k - 0.5) / waypoints) * usableLength;
                const t = distAlongRoad / edgeLength;
                const px = fromPos.x + t * dx;
                const py = fromPos.y + t * dy;

                // Waypoint bead: luminous cyan dot with subtle inner core
                waypointsLayer.circle(px, py, dotRadius);
                waypointsLayer.fill({ color: 0x00e5ff, alpha: 0.75 });
                waypointsLayer.setStrokeStyle({ width: 1, color: 0xffffff, alpha: 0.6 });
                waypointsLayer.stroke();
              }
            }
          }
        }
      }
    }
  }

  // Draw nodes and make them interactive
  for (const node of config.mapData.nodes) {
    const nodeGraphic = new Graphics();
    const pos = nodePositionMap.get(node.id) || { x: node.x, y: node.y };
    
    // Check if it's a building
    if (node.buildingId) {
      // Extended touch hit area for mobile/touch screens
      nodeGraphic.circle(0, 0, 52);
      nodeGraphic.fill({ color: 0x000000, alpha: 0.001 });

      // Outer subtle ambient glow ring
      nodeGraphic.circle(0, 0, 48);
      nodeGraphic.setStrokeStyle({ width: 1, color: 0xffb300, alpha: 0.25 });
      nodeGraphic.stroke();

      // Building nodes: larger, amber glow
      nodeGraphic.circle(0, 0, 44);
      nodeGraphic.fill({ color: 0x141428 });
      nodeGraphic.setStrokeStyle({ width: 3.5, color: 0xffb300, alpha: 0.95 });
      nodeGraphic.stroke();
      
      const buildingDef = config.buildings.find(b => b.id === node.buildingId);
      const name = buildingDef ? buildingDef.name : node.buildingId;
      
      const label = new Text({
        text: name,
        style: {
          fill: 0xffffff,
          fontSize: 17,
          fontWeight: 'bold',
          align: 'center',
          wordWrap: true,
          wordWrapWidth: 80,
          stroke: { color: 0x000000, width: 3.5 },
          dropShadow: { alpha: 0.95, color: 0x000000, blur: 4, distance: 1 }
        }
      });
      label.anchor.set(0.5, 0.5);
      label.x = 0;
      label.y = 0;
      nodeGraphic.addChild(label);
      
    } else {
      // Extended touch hit area for waypoints
      nodeGraphic.circle(0, 0, 36);
      nodeGraphic.fill({ color: 0x000000, alpha: 0.001 });

      // Waypoint nodes: cyan ring
      nodeGraphic.circle(0, 0, 22);
      nodeGraphic.fill({ color: 0x141428 });
      nodeGraphic.setStrokeStyle({ width: 2.5, color: 0x00e5ff });
      nodeGraphic.stroke();
    }
    
    nodeGraphic.x = pos.x;
    nodeGraphic.y = pos.y;
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
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    window.removeEventListener('resize', updateBoardTransform);
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

  players.forEach((p, _i) => {
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

/**
 * Animate a robber intercepting the player at their current location on the map.
 */
export async function animateRobberInterception(playerIndex: number, speedMs: number = 600): Promise<void> {
  if (!app || !playerTokens[playerIndex]) return;
  const mapContainer = app.stage.children[0] as Container;
  const pToken = playerTokens[playerIndex];
  
  const robber = new Graphics();
  robber.circle(0, 0, 12);
  robber.fill({ color: 0x000000 });
  robber.setStrokeStyle({ width: 3, color: 0xe74c3c });
  robber.stroke();
  
  const label = new Text({
    text: '👤',
    style: { fill: 0xe74c3c, fontSize: 16 }
  });
  label.anchor.set(0.5, 0.5);
  robber.addChild(label);
  
  robber.x = pToken.x + 80;
  robber.y = pToken.y - 40;
  mapContainer.addChild(robber);
  
  await new Promise<void>((resolve) => {
    const startX = robber.x;
    const startY = robber.y;
    const targetX = pToken.x;
    const targetY = pToken.y;
    const startTime = performance.now();
    
    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / speedMs, 1);
      
      robber.x = startX + (targetX - startX) * progress;
      robber.y = startY + (targetY - startY) * progress;
      
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        const flashGraphic = new Graphics();
        flashGraphic.circle(0, 0, 30);
        flashGraphic.fill({ color: 0xe74c3c, alpha: 0.5 });
        flashGraphic.x = targetX;
        flashGraphic.y = targetY;
        mapContainer.addChild(flashGraphic);
        
        let flashStartTime = performance.now();
        function fadeFlash(fNow: number) {
          const fElapsed = fNow - flashStartTime;
          const fProgress = Math.min(fElapsed / 300, 1);
          flashGraphic.alpha = 0.5 * (1 - fProgress);
          if (fProgress < 1) {
            requestAnimationFrame(fadeFlash);
          } else {
            flashGraphic.destroy();
            robber.destroy();
            resolve();
          }
        }
        requestAnimationFrame(fadeFlash);
      }
    }
    requestAnimationFrame(step);
  });
}
