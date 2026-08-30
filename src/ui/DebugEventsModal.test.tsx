import { createTestGameState, createMockCampaign } from '../engine/testFactories';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DebugEventsModal } from './DebugEventsModal';

const mockCampaign = createMockCampaign();

describe('DebugEventsModal UI', () => {
  it('renders global economy controls and updates state', () => {
    const state = createTestGameState(mockCampaign, [{ name: 'Player 1', isAi: false, goals: {} }], 'node_low_cost');
    const setGameState = vi.fn();
    const onClose = vi.fn();

    render(
      <DebugEventsModal
        gameState={state}
        setGameState={setGameState}
        campaign={mockCampaign}
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Debug Events & Economy/i)).toBeDefined();
    expect(screen.getByText(/Global Economy Controls/i)).toBeDefined();

    // Check sliders / number inputs exist
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.length).toBeGreaterThanOrEqual(2);

    // Update economic index
    fireEvent.change(inputs[0], { target: { value: '85' } });
    expect(setGameState).toHaveBeenCalled();
  });

  it('allows queuing and dequeuing events for a player', () => {
    const state = createTestGameState(mockCampaign, [{ name: 'Player 1', isAi: false, goals: {} }], 'node_low_cost');
    state.players[0].inventory.lotteryTickets = 3;
    let currentState = state;
    const setGameState = vi.fn((updater) => {
      if (typeof updater === 'function') {
        currentState = updater(currentState);
      } else {
        currentState = updater;
      }
    });
    const onClose = vi.fn();

    const { rerender } = render(
      <DebugEventsModal
        gameState={currentState}
        setGameState={setGameState}
        campaign={mockCampaign}
        onClose={onClose}
      />
    );

    // Switch to Player 1 tab
    const playerTab = screen.getByText(/Player 1/i);
    fireEvent.click(playerTab);

    // Find Lottery Win row and click its Queue button
    const queueButtons = screen.getAllByRole('button', { name: /Queue \(Next Turn\)/i });
    const enabledQueueButton = queueButtons.find(b => !b.hasAttribute('disabled'));
    expect(enabledQueueButton).toBeDefined();
    fireEvent.click(enabledQueueButton!);

    expect(setGameState).toHaveBeenCalled();
    expect(currentState.debugQueue?.length).toBe(1);

    // Rerender with updated state
    rerender(
      <DebugEventsModal
        gameState={currentState}
        setGameState={setGameState}
        campaign={mockCampaign}
        onClose={onClose}
      />
    );

    // Dequeue button should now be visible
    const dequeueBtn = screen.getByText(/Dequeue/i);
    expect(dequeueBtn).toBeDefined();
    fireEvent.click(dequeueBtn);
    expect(currentState.debugQueue?.length).toBe(0);
  });
});
