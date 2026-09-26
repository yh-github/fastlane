import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TitleScreen } from './TitleScreen';

vi.mock('../engine/dataLoader', () => ({
  getAvailableCampaigns: () => [
    { id: '1990_classic_floppy', name: 'Classic 1990 (Floppy)', description: 'Floppy campaign' },
    { id: 'qol_improved', name: 'QoL Improved (Recommended)', description: 'QoL campaign' },
    { id: 'advanced', name: 'Advanced Edition', description: 'Advanced campaign' },
  ],
  loadCampaign: async (id: string) => ({
    info: { id, name: id },
    config: {
      name: id,
      version: '1.0.0',
      description: 'Test',
      startingMoney: 200,
      winConditions: [],
      timeRules: {},
      economyRules: {},
      mapRules: {},
      eventRules: {},
      gameRules: {},
    },
    buildings: [],
    jobs: [],
    items: [],
    education: [],
    housing: [],
    events: [],
    stocks: [],
    map: { width: 0, height: 0, nodes: [] },
    messages: {},
    weekends: { ticketWeekends: {}, durableWeekends: {}, randomWeekends: [] },
    synergies: [],
  }),
}));

describe('TitleScreen', () => {
  it('renders title screen and buttons', () => {
    render(<TitleScreen onStartGame={() => {}} />);
    expect(screen.getByText('Fast Lane')).toBeInTheDocument();
    expect(screen.getByText(/startGame/i)).toBeInTheDocument();
    expect(screen.getByTestId('btn-view-diffs')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-view-rules')).not.toBeInTheDocument();
  });

  it('opens Version Differences screen directly on All Differences tab', async () => {
    render(<TitleScreen onStartGame={() => {}} />);
    
    const viewDiffsBtn = screen.getByTestId('btn-view-diffs');
    fireEvent.click(viewDiffsBtn);

    await waitFor(() => {
      expect(screen.getByText('Rules Comparison Matrix')).toBeInTheDocument();
    });

    // Check that All Differences view is active
    expect(screen.getByText(/All Version Differences/)).toBeInTheDocument();
  });

  it('calls onStartGame with default recommended campaign (qol_improved)', () => {
    const handleStart = vi.fn();
    render(<TitleScreen onStartGame={handleStart} />);

    fireEvent.click(screen.getByText(/startGame/i));
    expect(handleStart).toHaveBeenCalledWith('qol_improved');
  });
});
