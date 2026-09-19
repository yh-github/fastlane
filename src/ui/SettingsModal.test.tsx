import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SettingsModal } from './SettingsModal';
import { DEFAULT_GAME_RULES } from '../engine/rules';
import type { GameState } from '../engine/gameState';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => options?.defaultValue || key,
  }),
}));

describe('SettingsModal', () => {
  const dummyGameState: GameState = {
    turn: 1,
    economicIndex: 0,
    economicTrend: 0,
    pawnShopItemsForSale: [],
    players: [],
    phase: 'turn-start',
    campaignId: 'classic',
    rngState: 123,
    rules: { ...DEFAULT_GAME_RULES, showItemImages: true, enableAnimations: true },
    winnerId: null,
  };

  it('renders Interface & Assistance settings (Helpful Interface, Floating Stat Popups, Show Item Graphics)', () => {
    render(
      <SettingsModal
        gameState={dummyGameState}
        setGameState={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Helpful Interface')).toBeInTheDocument();
    expect(screen.getByText('Floating Stat Popups & Effects')).toBeInTheDocument();
    expect(screen.getByText('Show Item Graphics')).toBeInTheDocument();
    expect(screen.queryByText('Allow Over-Achieving Goals')).not.toBeInTheDocument();
  });

  it('does NOT render campaign optional rules or win condition rules in Settings modal', () => {
    render(
      <SettingsModal
        gameState={dummyGameState}
        setGameState={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.queryByText('Allow Over-Achieving Goals')).not.toBeInTheDocument();
    expect(screen.queryByText('Bypass Doctor Visit if Cash is $0')).not.toBeInTheDocument();
    expect(screen.queryByText('Enable Doctor Visit from Low Relaxation')).not.toBeInTheDocument();
    expect(screen.queryByText('Low Relaxation Threshold')).not.toBeInTheDocument();
  });

  it('toggles Helpful Interface, Pixelated Sprites, and Remove Background on the single screen', () => {
    let state = { ...dummyGameState };
    const setGameState = vi.fn().mockImplementation((updater) => {
      state = updater(state);
    });

    const { rerender } = render(
      <SettingsModal
        gameState={state}
        setGameState={setGameState}
        onClose={() => {}}
      />
    );

    // Verify Graphics items are visible on the single screen
    expect(screen.getByText('Crisp Pixel Art')).toBeInTheDocument();
    expect(screen.getByText('Remove Character Background')).toBeInTheDocument();

    // Toggle Helpful Interface (default false -> true)
    const helpfulItem = screen.getByTestId('setting-helpful-ui');
    fireEvent.click(helpfulItem);
    expect(setGameState).toHaveBeenCalled();
    expect(state.rules.helpfulUI).toBe(true);

    // Toggle Pixelated Sprites (default true -> false)
    const pixelatedItem = screen.getByTestId('setting-pixelated-sprites');
    fireEvent.click(pixelatedItem);
    expect(state.rules.pixelatedSprites).toBe(false);

    // Toggle Remove Character Background (starts true by default -> toggles to false)
    const removeBgItem = screen.getByTestId('setting-remove-character-bg');
    fireEvent.click(removeBgItem);
    expect(state.rules.removeCharacterBg).toBe(false);

    // Re-render and verify updated state reflects
    rerender(
      <SettingsModal
        gameState={state}
        setGameState={setGameState}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('Remove Character Background')).toBeInTheDocument();
  });

  it('folds and expands categories when clicking category headers', () => {
    render(
      <SettingsModal
        gameState={dummyGameState}
        setGameState={() => {}}
        onClose={() => {}}
      />
    );

    // Interface items initially visible
    expect(screen.getByText('Helpful Interface')).toBeInTheDocument();

    // Click to fold Interface category
    const interfaceHeader = screen.getByTestId('category-header-interface');
    fireEvent.click(interfaceHeader);

    // Interface items should now be folded/hidden
    expect(screen.queryByText('Helpful Interface')).not.toBeInTheDocument();

    // Click again to expand Interface category
    fireEvent.click(interfaceHeader);
    expect(screen.getByText('Helpful Interface')).toBeInTheDocument();

    // Fold Graphics category
    expect(screen.getByText('Crisp Pixel Art')).toBeInTheDocument();
    const graphicsHeader = screen.getByTestId('category-header-graphics');
    fireEvent.click(graphicsHeader);
    expect(screen.queryByText('Crisp Pixel Art')).not.toBeInTheDocument();
  });

  it('toggles HUD Layout Style between top and side and stores in localStorage', () => {
    let state = { ...dummyGameState, rules: { ...dummyGameState.rules, hudLayout: 'top' as const } };
    const setGameState = vi.fn().mockImplementation((updater) => {
      state = updater(state);
    });

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    const { rerender } = render(
      <SettingsModal
        gameState={state}
        setGameState={setGameState}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('HUD Layout Style')).toBeInTheDocument();
    expect(screen.getByText('TOP')).toBeInTheDocument();

    const hudLayoutItem = screen.getByTestId('setting-hud-layout');
    fireEvent.click(hudLayoutItem);

    expect(setGameState).toHaveBeenCalled();
    expect(state.rules.hudLayout).toBe('side');
    expect(setItemSpy).toHaveBeenCalledWith('fastlane_hud_layout', 'side');

    rerender(
      <SettingsModal
        gameState={state}
        setGameState={setGameState}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('SIDE')).toBeInTheDocument();

    fireEvent.click(hudLayoutItem);
    expect(state.rules.hudLayout).toBe('top');
    expect(setItemSpy).toHaveBeenCalledWith('fastlane_hud_layout', 'top');

    setItemSpy.mockRestore();
  });

  it('toggles Authentic Curved Board and stores in localStorage', () => {
    let state = { ...dummyGameState, rules: { ...dummyGameState.rules, authenticCurvedPaths: true } };
    const setGameState = vi.fn().mockImplementation((updater) => {
      state = updater(state);
    });

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    render(
      <SettingsModal
        gameState={state}
        setGameState={setGameState}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Authentic Curved Board')).toBeInTheDocument();
    const curvedToggle = screen.getByTestId('setting-authentic-curved-paths');
    fireEvent.click(curvedToggle);

    expect(setGameState).toHaveBeenCalled();
    expect(state.rules.authenticCurvedPaths).toBe(false);
    expect(setItemSpy).toHaveBeenCalledWith('fastlane_curved_board', 'false');

    fireEvent.click(curvedToggle);
    expect(state.rules.authenticCurvedPaths).toBe(true);
    expect(setItemSpy).toHaveBeenCalledWith('fastlane_curved_board', 'true');

    setItemSpy.mockRestore();
  });
});

