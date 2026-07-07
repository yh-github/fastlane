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
let playerToken: Graphics | null = null;

/**
 * Initialize the PixiJS renderer and load map assets.
 *
 * @param config — Renderer configuration
 * @returns        Cleanup function to destroy the PixiJS application
 */
export async function initMapRenderer(
  config: MapRendererConfig
): Promise<() => void> {
  app = new Application();
  
  await app.init({
    width: config.mapData.width,
    height: config.mapData.height,
    backgroundAlpha: 0, // Transparent to show CSS background
    resizeTo: config.container,
  });

  config.container.appendChild(app.canvas);

  const mapContainer = new Container();
  
  // Center map in container if container is larger
  mapContainer.x = (config.container.clientWidth - config.mapData.width) / 2;
  mapContainer.y = (config.container.clientHeight - config.mapData.height) / 2;

  app.stage.addChild(mapContainer);

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

  // Create player token (magenta neon)
  playerToken = new Graphics();
  playerToken.circle(0, 0, 12);
  playerToken.fill({ color: 0xff4081 });
  playerToken.setStrokeStyle({ width: 3, color: 0xffffff });
  playerToken.stroke();
  
  // Hide initially until movePlayerTo is called
  playerToken.visible = false;
  mapContainer.addChild(playerToken);

  console.log('[MapRenderer] Initialized');

  return () => {
    if (app) {
      app.destroy(true, { children: true, texture: true });
      app = null;
    }
    console.log('[MapRenderer] Destroyed');
  };
}

/**
 * Update the player token position on the map.
 */
export function movePlayerTo(position: PlayerPosition): void {
  if (playerToken) {
    playerToken.x = position.x;
    playerToken.y = position.y;
    playerToken.visible = true;
  }
}

/**
 * Highlight reachable nodes from the player's current position.
 */
export function highlightReachableNodes(nodeIds: string[]): void {
  // TODO: Add visual overlay to reachable nodes in Sprint 3 polish
  console.log('[MapRenderer] Reachable nodes: ', nodeIds);
}
