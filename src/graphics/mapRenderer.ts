/**
 * mapRenderer.ts — PixiJS-based board and entity rendering.
 *
 * Responsible for drawing the game board, buildings, character sprites,
 * and handling visual state transitions. Consumes MapData and BuildingDef
 * from the campaign bundle to render the world.
 */

import { Application, Graphics, Container, Text, Sprite, Assets } from 'pixi.js';
import type { MapData, BuildingDef } from '../engine/dataLoader';
import { AUTHENTIC_BOARD_WIDTH, AUTHENTIC_BOARD_HEIGHT, AUTHENTIC_BUILDINGS, AUTHENTIC_OCCLUDERS } from './authenticData';

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
  /** GUI presentation style: 'generated' or 'authentic' */
  guiStyle?: 'generated' | 'authentic';
  /** Base path for authentic assets (defaults to '/assets/authentic') */
  authenticBasePath?: string;
}

export interface PlayerPosition {
  nodeId: string;
  x: number;
  y: number;
}

// Keep references to movable sprites/graphics
let app: Application | null = null;
let playerTokens: any[] = [];
let buildingLabels: Map<string, Text> = new Map();
let testMarker: HTMLDivElement | null = null;
let activeInstanceId = 0;
let activeGuiStyle: 'generated' | 'authentic' = 'generated';
let authenticBasePath = '/assets/authentic';
interface DoorInfo {
  sprite: any;
  basePath: string;
  currentCel: number;
  targetCel: number;
  animating: boolean;
}
let buildingDoors: Map<string, DoorInfo> = new Map();
let roofsLayer: Container | null = null;
let tokensLayer: Container | null = null;


function safeDestroyApp(targetApp: Application | null): void {
  if (!targetApp) return;
  try {
    if ((targetApp as any).renderer) {
      targetApp.destroy({ removeView: true }, false);
    }
  } catch (err) {
    console.warn('[MapRenderer] Warning during app destroy:', err);
  }
}

function animateDoorTo(doorInfo: DoorInfo, targetCel: number, bId: string) {
  if (doorInfo.targetCel === targetCel && !doorInfo.animating && doorInfo.currentCel === targetCel) return;
  doorInfo.targetCel = targetCel;
  if (doorInfo.animating) return;

  doorInfo.animating = true;
  // Exact authentic Sierra SCI timing: 6 ticks @ 60Hz = 100ms per cel (Wait 6 in script.001 openDoor)
  const frameDelay = 100;

  function nextStep() {
    if (!doorInfo.sprite || !doorInfo.sprite.parent || doorInfo.sprite.destroyed) {
      doorInfo.animating = false;
      return;
    }
    if (doorInfo.currentCel === doorInfo.targetCel) {
      doorInfo.animating = false;
      return;
    }
    const step = doorInfo.targetCel > doorInfo.currentCel ? 1 : -1;
    doorInfo.currentCel += step;
    const doorTex = (Assets.get ? Assets.get(`${doorInfo.basePath}/doors/${bId}_cel_${doorInfo.currentCel}.png`) : null)
      || (Sprite.from(`${doorInfo.basePath}/doors/${bId}_cel_${doorInfo.currentCel}.png`) as any)?.texture;
    if (doorTex && doorInfo.sprite) {
      doorInfo.sprite.texture = doorTex;
    }
    setTimeout(nextStep, frameDelay);
  }

  setTimeout(nextStep, frameDelay);
}

/**
 * Open the door of an entered building and close all other doors.
 * Doors animate sequentially through cels 0 -> 1 -> 2 -> 3 with authentic pacing.
 */
export function setEnteredBuilding(buildingId: string | null): void {
  if (activeGuiStyle !== 'authentic' || buildingDoors.size === 0) return;
  for (const [bId, doorInfo] of buildingDoors.entries()) {
    const targetCel = (buildingId === bId) ? 3 : 0;
    animateDoorTo(doorInfo, targetCel, bId);
  }
}

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

  activeGuiStyle = config.guiStyle || 'generated';
  const isAuthentic = activeGuiStyle === 'authentic';
  const authenticBase = config.authenticBasePath || '/assets/authentic';
  authenticBasePath = authenticBase;
  playerTokens = [];
  buildingDoors.clear();
  roofsLayer = null;
  tokensLayer = null;

  const initW = isAuthentic ? AUTHENTIC_BOARD_WIDTH : config.mapData.width;
  const initH = isAuthentic ? AUTHENTIC_BOARD_HEIGHT : config.mapData.height;
  
  await localApp.init({
    width: initW,
    height: initH,
    backgroundAlpha: 0, // Transparent to show CSS background
    resizeTo: config.container,
  });

  if (!localApp.renderer) {
    safeDestroyApp(localApp);
    return () => {};
  }

  if (instanceId !== activeInstanceId) {
    safeDestroyApp(localApp);
    return () => {};
  }

  if (app) {
    safeDestroyApp(app);
    app = null;
  }

  app = localApp;
  buildingLabels.clear();
  localApp.canvas.style.position = 'absolute';
  localApp.canvas.style.top = '0';
  localApp.canvas.style.left = '0';
  localApp.canvas.style.width = '100%';
  localApp.canvas.style.height = '100%';
  localApp.canvas.style.display = 'block';
  config.container.appendChild(localApp.canvas);

  const mapContainer = new Container();
  localApp.stage.addChild(mapContainer);

  const useAuthentic = config.authenticCurvedPaths !== false && !!config.mapData.authenticNodes;

  const nodeMap = new Map(config.mapData.nodes.map(n => [n.id, n]));
  const nodePositionMap = new Map<string, { x: number; y: number }>();
  for (const node of config.mapData.nodes) {
    const authPos = useAuthentic ? config.mapData.authenticNodes?.[node.id] : undefined;
    nodePositionMap.set(node.id, authPos ? { x: authPos.x, y: authPos.y } : { x: node.x, y: node.y });
  }

  // Calculate visual vertical center of board elements to achieve true vertical centering
  let minY = Infinity;
  let maxY = -Infinity;
  for (const node of config.mapData.nodes) {
    const pos = nodePositionMap.get(node.id) || { x: node.x, y: node.y };
    const radius = node.buildingId ? 44 : 22;
    minY = Math.min(minY, pos.y - radius);
    maxY = Math.max(maxY, pos.y + radius);
  }
  if (useAuthentic) {
    maxY = Math.max(maxY, 785);
  }
  const visualCenterY = (isFinite(minY) && isFinite(maxY)) ? (minY + maxY) / 2 : config.mapData.height / 2;
  const verticalOffset = config.mapData.height / 2 - visualCenterY;

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

    const baseW = isAuthentic ? AUTHENTIC_BOARD_WIDTH : config.mapData.width;
    const baseH = isAuthentic ? AUTHENTIC_BOARD_HEIGHT : config.mapData.height;

    // Uniformly scale map to fit container, taking full advantage of available space
    const scale = Math.min(containerW / baseW, containerH / baseH);
    const boardW = baseW * scale;
    const boardH = baseH * scale;
    const boardX = (containerW - boardW) / 2;
    const boardY = (containerH - boardH) / 2 + (isAuthentic ? 0 : verticalOffset * scale);

    mapContainer.scale.set(scale);
    mapContainer.x = boardX;
    mapContainer.y = boardY;

    // Expose exact board bounds and scale via CSS custom properties on viewport
    const viewport = (config.container.closest('.game-viewport') as HTMLElement) || config.container;
    const canonicalScale = isAuthentic ? (scale * AUTHENTIC_BOARD_WIDTH / config.mapData.width) : scale;
    viewport.style.setProperty('--board-scale', `${canonicalScale}`);
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

  if (isAuthentic) {
    // ─── Authentic Sierra Board Layers ─────────────────────────────
    // 1. Preload authentic textures via Assets.load (required in PixiJS v8)
    const [bgTexture, roofTexture] = await Promise.all([
      Assets.load(`${authenticBase}/board.png`),
      Assets.load(`${authenticBase}/roof_patch.png`)
    ]);
    if (bgTexture?.source) {
      bgTexture.source.scaleMode = 'nearest';
    }
    if (roofTexture?.source) {
      roofTexture.source.scaleMode = 'nearest';
    }

    // Painted background picture
    const bgSprite = new Sprite(bgTexture);
    mapContainer.addChild(bgSprite);

    // Preload player marbles
    await Promise.all([0, 1, 2, 3].map(i => Assets.load(`${authenticBase}/marbles/marble_${i}.png`)));

    // 2. Animated building doors
    const doorsContainer = new Container();
    mapContainer.addChild(doorsContainer);
    for (const [bId, b] of Object.entries(AUTHENTIC_BUILDINGS)) {
      const textures = await Promise.all([0, 1, 2, 3].map(c => Assets.load(`${authenticBase}/doors/${bId}_cel_${c}.png`)));
      textures.forEach(t => {
        if (t?.source) {
          t.source.scaleMode = 'nearest';
        }
      });
      const doorTexture = textures[0];
      const door = new Sprite(doorTexture);
      const dw = (doorTexture as any).width || 10;
      const dh = (doorTexture as any).height || 10;
      door.x = b.doorX - Math.floor(dw / 2);
      door.y = b.doorY - dh + 1;
      doorsContainer.addChild(door);
      buildingDoors.set(bId, { sprite: door, basePath: authenticBase, currentCel: 0, targetCel: 0, animating: false });
    }

    // 3. Tokens layer (under roofs layer)
    tokensLayer = new Container();
    mapContainer.addChild(tokensLayer);

    // 4. Rooftop Occluders layer (above tokens layer)
    roofsLayer = new Container();
    mapContainer.addChild(roofsLayer);

    // Load and place all building rooftop/foreground occluders (roofPatch, bank, qt, clock)
    for (const occ of AUTHENTIC_OCCLUDERS) {
      const tex = await Assets.load(`${authenticBase}/${occ.file}`);
      if (tex?.source) {
        tex.source.scaleMode = 'nearest';
      }
      const sprite = new Sprite(tex);
      sprite.x = occ.x;
      sprite.y = occ.y;
      roofsLayer.addChild(sprite);
    }

    // Background preload robber frames for interception animation
    const robberUrls = [
      ...Array.from({ length: 6 }, (_, i) => `${authenticBase}/robber/run_left_${i}.png`),
      ...Array.from({ length: 6 }, (_, i) => `${authenticBase}/robber/run_right_${i}.png`),
      `${authenticBase}/robber/club_left.png`,
      `${authenticBase}/robber/club_right.png`
    ];
    Promise.all(robberUrls.map(u => Assets.load(u))).catch(() => {});

    // 5. Interactive Hitboxes layer (on top of roofs for mouse/touch interactivity)
    const hitboxesLayer = new Container();
    mapContainer.addChild(hitboxesLayer);
    for (const b of Object.values(AUTHENTIC_BUILDINGS)) {
      const [top, left, bottom, right] = b.hitbox;
      const hitBox = new Graphics();
      hitBox.rect(left, top, right - left, bottom - top);
      hitBox.fill({ color: 0x000000, alpha: 0.001 });
      hitBox.eventMode = 'static';
      hitBox.cursor = 'pointer';
      hitBox.on('pointertap', () => {
        config.onNodeClick(b.nodeId);
      });
      hitBox.on('pointerover', () => {
        hitBox.clear();
        hitBox.rect(left, top, right - left, bottom - top);
        hitBox.fill({ color: 0xffb300, alpha: 0.15 });
        hitBox.setStrokeStyle({ width: 1, color: 0xffb300, alpha: 0.8 });
        hitBox.stroke();
      });
      hitBox.on('pointerout', () => {
        hitBox.clear();
        hitBox.rect(left, top, right - left, bottom - top);
        hitBox.fill({ color: 0x000000, alpha: 0.001 });
      });
      hitboxesLayer.addChild(hitBox);
    }
  } else {
    // ─── Generated Vector Board Layers ──────────────────────────────
    const edgesLayer = new Graphics();
    mapContainer.addChild(edgesLayer);

    const waypointsLayer = new Graphics();
    mapContainer.addChild(waypointsLayer);


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
          fontSize: 20,
          lineHeight: 22,
          fontWeight: 'bold',
          align: 'center',
          wordWrap: true,
          wordWrapWidth: 84,
          stroke: { color: 0x000000, width: 3.5 },
          dropShadow: { alpha: 0.95, color: 0x000000, blur: 4, distance: 1 }
        }
      });
      label.anchor.set(0.5, 0.5);
      label.x = 0;
      label.y = 0;
      nodeGraphic.addChild(label);
      if (node.buildingId) {
        buildingLabels.set(node.buildingId, label);
      }
      
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
    nodeGraphic.on('pointertap', () => {
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
      safeDestroyApp(app);
      app = null;
      playerTokens = [];
      buildingDoors.clear();
      roofsLayer = null;
      tokensLayer = null;
      buildingLabels.clear();
      if (testMarker) {
        testMarker.remove();
        testMarker = null;
      }
      console.log('[MapRenderer] Destroyed');
    }
  };
}

/**
 * Dynamically update building text labels (e.g. upon language switch)
 * without tearing down the WebGL canvas.
 */
export function updateBuildingLabels(buildings: { id: string; name: string }[]): void {
  for (const b of buildings) {
    const label = buildingLabels.get(b.id);
    if (label) {
      label.text = b.name;
    }
  }
}

/**
 * Read the current text label of a building (useful for tests and verification).
 */
export function getBuildingLabel(buildingId: string): string | undefined {
  return buildingLabels.get(buildingId)?.text;
}

/**
 * Read the current text style of a building label (useful for tests and verification).
 */
export function getBuildingLabelStyle(buildingId: string): any {
  return (buildingLabels.get(buildingId) as any)?.style;
}

/**
 * Update the player tokens on the map.
 */
export function updatePlayers(players: { position: PlayerPosition, index: number, isActive: boolean }[]): void {
  if (!app) return;
  const isAuthentic = activeGuiStyle === 'authentic';
  const targetParent = (isAuthentic && tokensLayer) ? tokensLayer : (app.stage.children[0] as Container);
  const coordScale = isAuthentic ? (1 / 3.75) : 1;
  
  // Create missing tokens
  while (playerTokens.length < players.length) {
    const idx = playerTokens.length;
    let token: any;
    if (isAuthentic) {
      const marbleTex = (Assets.get ? Assets.get(`${authenticBasePath}/marbles/marble_${idx % 4}.png`) : null)
        || (Sprite.from(`${authenticBasePath}/marbles/marble_${idx % 4}.png`) as any)?.texture;
      token = new Sprite(marbleTex);
      if (token.anchor) {
        token.anchor.set(0.5, 0.5);
      }
    } else {
      token = new Graphics();
    }
    targetParent.addChild(token);
    playerTokens.push(token);
  }

  // Hide all tokens first
  playerTokens.forEach(t => t.visible = false);

  const colors = [0xff4081, 0x00e5ff, 0x76ff03, 0xffeb3b]; // Magenta, Cyan, Light Green, Yellow

  players.forEach((p) => {
    const token = playerTokens[p.index];
    if (!token) return;
    
    if (isAuthentic) {
      if (token.scale) {
        token.scale.set(p.isActive ? 1.0 : 0.85);
      }
    } else {
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
    }

    // Prevent overriding position if this token is currently animating
    if (!(token as any).isAnimating) {
      token.x = p.position.x * coordScale;
      token.y = p.position.y * coordScale;
    }
    
    token.visible = true; // Show all players now that jitter bug is fixed
    
    // To prevent overlapping tokens from perfectly hiding each other, offset slightly based on index
    if (p.isActive && players.filter(other => other.position.nodeId === p.position.nodeId && other.isActive).length > 1) {
       const offsetAmt = isAuthentic ? 2 : 6;
       token.x += (p.index - (players.length / 2)) * offsetAmt;
       token.y += (p.index - (players.length / 2)) * offsetAmt;
    }

    if (p.isActive && testMarker) {
      testMarker.dataset.x = (p.position.x * coordScale).toString();
      testMarker.dataset.y = (p.position.y * coordScale).toString();
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
  const isAuthentic = activeGuiStyle === 'authentic';
  const coordScale = isAuthentic ? (1 / 3.75) : 1;

  for (const pos of path) {
    await new Promise<void>((resolve) => {
      const startX = token.x;
      const startY = token.y;
      const targetX = pos.x * coordScale;
      const targetY = pos.y * coordScale;
      
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
  const isAuthentic = activeGuiStyle === 'authentic';
  const mapContainer = (isAuthentic && tokensLayer) ? tokensLayer : (app.stage.children[0] as Container);
  const coordScale = isAuthentic ? (1 / 3.75) : 1;
  const radius = isAuthentic ? 3 : 10;
  
  const ping = new Graphics();
  ping.circle(0, 0, radius);
  ping.fill({ color: 0xffffff, alpha: 0.8 });
  ping.setStrokeStyle({ width: isAuthentic ? 1 : 2, color: 0x00e5ff });
  ping.stroke();
  ping.x = x * coordScale;
  ping.y = y * coordScale;
  mapContainer.addChild(ping);

  const startTime = performance.now();
  const duration = 500;
  
  function step(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const scale = 1 + progress * (isAuthentic ? 2 : 4);
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
  const isAuthentic = activeGuiStyle === 'authentic';
  const mapContainer = (isAuthentic && tokensLayer) ? tokensLayer : (app.stage.children[0] as Container);
  const pToken = playerTokens[playerIndex];

  if (isAuthentic) {
    const robber = Sprite.from(`${authenticBasePath}/robber/run_left_0.png`);
    if (robber.anchor) robber.anchor.set(0.5, 0.5);
    robber.x = pToken.x + 35;
    robber.y = pToken.y;
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

        const frameIdx = Math.floor((elapsed / 80) % 6);
        const nextTex = (Sprite.from(`${authenticBasePath}/robber/run_left_${frameIdx}.png`) as any)?.texture;
        if (nextTex) robber.texture = nextTex;

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          const clubTex = (Sprite.from(`${authenticBasePath}/robber/club_left.png`) as any)?.texture;
          if (clubTex) robber.texture = clubTex;

          setTimeout(() => {
            const flash = new Graphics();
            flash.circle(0, 0, 15);
            flash.fill({ color: 0xe74c3c, alpha: 0.6 });
            flash.x = targetX;
            flash.y = targetY;
            mapContainer.addChild(flash);

            setTimeout(() => {
              flash.destroy();
              robber.destroy();
              resolve();
            }, 250);
          }, 200);
        }
      }
      requestAnimationFrame(step);
    });
    return;
  }
  
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
