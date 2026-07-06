/**
 * mapRenderer.ts — PixiJS-based board and entity rendering.
 *
 * Responsible for drawing the game board, buildings, character sprites,
 * and handling visual state transitions. Consumes MapData and BuildingDef
 * from the campaign bundle to render the world.
 *
 * TODO (Sprint 2+): Implement full PixiJS rendering pipeline.
 * Current file defines the interface contract for the renderer.
 */

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
}

export interface PlayerPosition {
  nodeId: string;
  x: number;
  y: number;
}

/**
 * Initialize the PixiJS renderer and load map assets.
 *
 * @param config — Renderer configuration
 * @returns        Cleanup function to destroy the PixiJS application
 */
export async function initMapRenderer(
  _config: MapRendererConfig
): Promise<() => void> {
  // TODO: Initialize PixiJS Application
  // TODO: Load building sprites from campaign images folder
  // TODO: Draw map grid/nodes from mapData
  // TODO: Set up camera/viewport controls

  console.log('[MapRenderer] Stub initialized — awaiting Sprint 2 implementation');

  return () => {
    console.log('[MapRenderer] Destroyed');
  };
}

/**
 * Update the player token position on the map.
 */
export function movePlayerTo(_position: PlayerPosition): void {
  // TODO: Animate player sprite to new node position
  console.log('[MapRenderer] movePlayerTo — stub');
}

/**
 * Highlight reachable nodes from the player's current position.
 */
export function highlightReachableNodes(_nodeIds: string[]): void {
  // TODO: Draw highlight overlays on reachable map nodes
  console.log('[MapRenderer] highlightReachableNodes — stub');
}
