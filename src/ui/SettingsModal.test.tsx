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

  it('renders user display settings (Show Item Graphics, Enable Animations, Allow Over-Achieving)', () => {
    render(
      <SettingsModal
        gameState={dummyGameState}
        setGameState={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Show Item Graphics')).toBeInTheDocument();
    expect(screen.getByText('Enable Animations')).toBeInTheDocument();
    expect(screen.getByText('Allow Over-Achieving Goals')).toBeInTheDocument();
  });

  it('does NOT render campaign optional rules in Settings modal', () => {
    render(
      <SettingsModal
        gameState={dummyGameState}
        setGameState={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.queryByText('Bypass Doctor Visit if Cash is $0')).not.toBeInTheDocument();
    expect(screen.queryByText('Enable Doctor Visit from Low Relaxation')).not.toBeInTheDocument();
    expect(screen.queryByText('Low Relaxation Threshold')).not.toBeInTheDocument();
  });

  it('switches to Graphics submenu tab and toggles pixelated sprites and remove background', () => {
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

    // Switch to Graphics tab
    const graphicsTabBtn = screen.getByTestId('tab-settings-graphics');
    fireEvent.click(graphicsTabBtn);

    // Verify Graphics submenu items appear
    expect(screen.getByText('Crisp Pixel Art')).toBeInTheDocument();
    expect(screen.getByText('Remove Character Background')).toBeInTheDocument();

    // Toggle Pixelated Sprites
    const pixelatedItem = screen.getByTestId('setting-pixelated-sprites');
    fireEvent.click(pixelatedItem);
    expect(setGameState).toHaveBeenCalled();
    expect(state.rules.pixelatedSprites).toBe(false);

    // Toggle Remove Character Background
    const removeBgItem = screen.getByTestId('setting-remove-character-bg');
    fireEvent.click(removeBgItem);
    expect(state.rules.removeCharacterBg).toBe(true);

    // Re-render and verify updated checkbox states
    rerender(
      <SettingsModal
        gameState={state}
        setGameState={setGameState}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('Remove Character Background')).toBeInTheDocument();
  });
});
