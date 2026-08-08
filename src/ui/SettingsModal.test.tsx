import { render, screen } from '@testing-library/react';
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
});
