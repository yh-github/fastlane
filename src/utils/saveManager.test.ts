// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AUTOSAVE_STORAGE_KEY,
  saveAutoSave,
  loadAutoSave,
  clearAutoSave,
  hasAutoSave,
  resolveCampaignId,
  getCampaignDisplayName,
  exportSaveToFile,
  exportReplayToFile,
  type AutoSaveData
} from './saveManager';
import { DEFAULT_GAME_RULES } from '../engine/rules';
import type { GameState } from '../engine/gameState';

describe('saveManager', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const mockGameState: GameState = {
    turn: 3,
    economicIndex: 5,
    economicTrend: 1,
    pawnShopItemsForSale: [],
    players: [
      {
        id: 'player_1',
        name: 'Player 1',
        hoursRemaining: 40,
        money: 250,
        bankSavings: 100,
        rentDebt: 0,
        loanDebt: 0,
        timesDefaulted: 0,
        loanPaymentDeadline: 0,
        happiness: 55,
        experience: 20,
        dependability: 25,
        degreeExpBoost: 0,
        degreeDepBoost: 0,
        relaxation: 30,
        currentJobId: 'janitor',
        currentWage: 8,
        raisesAtCurrentJob: 0,
        currentHousingId: 'low_cost',
        rentPaidUntilWeek: 4,
        currentRentPrice: 150,
        degrees: [],
        position: 'node_bank',
        turnFlags: {} as any,
        inventory: {} as any,
        goalAllotment: { wealth: 100, happiness: 100, education: 100, career: 100 },
      } as any as import('../engine/gameState').PlayerState
    ],
    phase: 'playing',
    campaignId: 'qol_improved',
    rngState: 456,
    rules: { ...DEFAULT_GAME_RULES },
    winnerId: null,
  };

  const mockSaveData: AutoSaveData = {
    version: 1,
    campaignId: 'qol_improved',
    gameState: mockGameState,
    logs: [{ week: 3, event: { key: 'Moved to bank' } }],
    activePlayerIndex: 0,
    activeModal: { type: 'building' },
    timestamp: 1700000000000,
  };

  it('saves and loads valid game state correctly', () => {
    const success = saveAutoSave(mockSaveData);
    expect(success).toBe(true);

    const loaded = loadAutoSave();
    expect(loaded).not.toBeNull();
    expect(loaded?.version).toBe(1);
    expect(loaded?.campaignId).toBe('qol_improved');
    expect(loaded?.gameState.turn).toBe(3);
    expect(loaded?.gameState.players[0].money).toBe(250);
    expect(loaded?.logs).toHaveLength(1);
    expect(loaded?.activeModal).toEqual({ type: 'building' });
    expect(hasAutoSave()).toBe(true);
  });

  it('does NOT save if game phase is game-over or winnerId is present, and clears existing save', () => {
    // First save valid state
    saveAutoSave(mockSaveData);
    expect(hasAutoSave()).toBe(true);

    // Try saving a won game
    const gameOverState: GameState = {
      ...mockGameState,
      phase: 'game-over',
      winnerId: 'player_1',
    };
    const wonSaveData: AutoSaveData = {
      ...mockSaveData,
      gameState: gameOverState,
    };

    const success = saveAutoSave(wonSaveData);
    expect(success).toBe(false);
    expect(loadAutoSave()).toBeNull();
    expect(hasAutoSave()).toBe(false);
  });

  it('clears autosave when clearAutoSave is called', () => {
    saveAutoSave(mockSaveData);
    expect(hasAutoSave()).toBe(true);

    clearAutoSave();
    expect(hasAutoSave()).toBe(false);
    expect(loadAutoSave()).toBeNull();
  });

  it('handles corrupted JSON or invalid data by clearing and returning null', () => {
    localStorage.setItem(AUTOSAVE_STORAGE_KEY, '{ invalid json');
    expect(loadAutoSave()).toBeNull();
    expect(localStorage.getItem(AUTOSAVE_STORAGE_KEY)).toBeNull();

    localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify({ version: 1 }));
    expect(loadAutoSave()).toBeNull();

    localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify({
      gameState: { phase: 'game-over' }
    }));
    expect(loadAutoSave()).toBeNull();
  });

  it('resolves campaign ID properly from name or id', () => {
    expect(resolveCampaignId('qol_improved')).toBe('qol_improved');
    expect(resolveCampaignId('The Fast Lane — Improved Version (QoL)')).toBe('qol_improved');
    expect(resolveCampaignId('Classic 1990 (Floppy)')).toBe('1990_classic_floppy');
    expect(resolveCampaignId('Classic 1992 (CD-ROM)')).toBe('1990_classic_cdrom');
    expect(resolveCampaignId('Advanced Edition')).toBe('advanced');
    expect(resolveCampaignId('')).toBe('qol_improved');

    expect(getCampaignDisplayName('qol_improved')).toContain('QoL');
    expect(getCampaignDisplayName('1990_classic_floppy')).toContain('1990');
  });

  it('exports save data to file', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURLMock = vi.fn();
    const clickMock = vi.fn();

    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    });

    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      set href(_val: string) {},
      set download(_val: string) {},
      click: clickMock,
    } as any);

    exportSaveToFile(mockSaveData);

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:test');

    createElementSpy.mockRestore();
  });

  it('exports replay data to file', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:replay');
    const revokeObjectURLMock = vi.fn();
    const clickMock = vi.fn();

    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    });

    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      set href(_val: string) {},
      set download(_val: string) {},
      click: clickMock,
    } as any);

    exportReplayToFile({
      version: '1.0.0',
      commitHash: 'abc',
      campaignId: 'qol_improved',
      rules: DEFAULT_GAME_RULES,
      startingState: mockGameState,
      steps: [],
      endStateHash: 'xyz',
    });

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:replay');

    createElementSpy.mockRestore();
  });
});
