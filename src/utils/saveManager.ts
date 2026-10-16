/**
 * saveManager.ts — Auto-save and state serialization manager.
 *
 * Handles saving and restoring exact game states to/from localStorage,
 * validating saved states, and exporting game state and replays.
 */

import type { GameState } from '../engine/gameState';
import type { LogEntry } from '../hooks/gameEngine';
import type { ReplayData } from '../engine/replayTypes';
import type { ActiveModal } from '../types/modal';
import defaultCampaigns from '../campaigns/campaigns.json';

export const AUTOSAVE_STORAGE_KEY = 'fastlane_autosave';

export interface AutoSaveData {
  version: number;
  campaignId: string;
  gameState: GameState;
  logs?: LogEntry[];
  replayData?: ReplayData | null;
  activePlayerIndex?: number;
  activeModal?: ActiveModal;
  timestamp: number;
}

/**
 * Resolves a campaign ID or display name to a valid folder campaign ID.
 */
export function resolveCampaignId(campaignIdOrName: string): string {
  if (!campaignIdOrName) return 'qol_improved';
  const match = defaultCampaigns.find(
    (c) => c.id === campaignIdOrName || c.name.toLowerCase() === campaignIdOrName.toLowerCase()
  );
  if (match) return match.id;

  const lower = campaignIdOrName.toLowerCase();
  if (lower.includes('advanced')) return 'advanced';
  if (lower.includes('qol') || lower.includes('improved')) return 'qol_improved';
  if (lower.includes('cdrom') || lower.includes('cd-rom') || lower.includes('1992')) return '1990_classic_cdrom';
  if (lower.includes('floppy') || lower.includes('1990')) return '1990_classic_floppy';

  return campaignIdOrName;
}

/**
 * Returns human-readable campaign name from campaign ID or name.
 */
export function getCampaignDisplayName(campaignIdOrName: string): string {
  const resolved = resolveCampaignId(campaignIdOrName);
  const match = defaultCampaigns.find((c) => c.id === resolved);
  return match ? match.name : campaignIdOrName;
}

/**
 * Saves current game state to localStorage.
 * Skips saving if the game is already in 'game-over' phase or has a winner.
 */
export function saveAutoSave(data: AutoSaveData): boolean {
  if (typeof localStorage === 'undefined') return false;
  if (!data?.gameState) return false;

  // Never save if game is won or in game-over phase
  if (data.gameState.phase === 'game-over' || data.gameState.winnerId) {
    clearAutoSave();
    return false;
  }

  try {
    const payload: AutoSaveData = {
      version: 1,
      campaignId: resolveCampaignId(data.campaignId),
      gameState: data.gameState,
      logs: data.logs,
      replayData: data.replayData ?? null,
      activePlayerIndex: data.activePlayerIndex ?? 0,
      activeModal: data.activeModal ?? null,
      timestamp: data.timestamp || Date.now(),
    };
    localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('[saveManager] Failed to write autosave to localStorage:', err);
    return false;
  }
}

/**
 * Loads and validates auto-saved game from localStorage.
 * If the saved game is corrupt or ended, cleans it up and returns null.
 */
export function loadAutoSave(): AutoSaveData | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as AutoSaveData;
    if (!data || typeof data !== 'object') {
      clearAutoSave();
      return null;
    }

    if (!data.gameState || typeof data.gameState !== 'object') {
      clearAutoSave();
      return null;
    }

    if (typeof data.gameState.turn !== 'number' || !Array.isArray(data.gameState.players)) {
      clearAutoSave();
      return null;
    }

    // A completed or won game is no longer valid for resume
    if (data.gameState.phase === 'game-over' || data.gameState.winnerId) {
      clearAutoSave();
      return null;
    }

    return {
      ...data,
      campaignId: resolveCampaignId(data.campaignId),
    };
  } catch (err) {
    console.warn('[saveManager] Failed to load autosave:', err);
    clearAutoSave();
    return null;
  }
}

/**
 * Removes the auto-saved game from localStorage.
 */
export function clearAutoSave(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
  } catch (err) {
    console.warn('[saveManager] Failed to clear autosave:', err);
  }
}

/**
 * Checks if a valid auto-saved game exists.
 */
export function hasAutoSave(): boolean {
  return loadAutoSave() !== null;
}

/**
 * Exports exact game save data to a downloaded JSON file.
 */
export function exportSaveToFile(data: AutoSaveData, filenamePrefix = 'fastlane-save'): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenamePrefix}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports replay data to a downloaded JSON file.
 */
export function exportReplayToFile(replayData: ReplayData): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([JSON.stringify(replayData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fastlane-replay-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
