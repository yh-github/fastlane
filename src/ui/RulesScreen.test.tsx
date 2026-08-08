import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RulesScreen } from './RulesScreen';

vi.mock('../engine/dataLoader', () => ({
  getAvailableCampaigns: () => [
    { id: '1990_classic_floppy', name: 'Classic 1990 (Floppy)', description: 'Floppy campaign' },
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
      eventRules: {
        marketCrashDivisor: 20,
        willyRobberyStartWeek: 1,
        charity: { maxCash: 0, maxWealth: 199, wealthMetric: 'durableValue' },
      },
      gameRules: {
        helpfulUI: false,
        enableRelaxationDoctor: false,
        usePhysicalMentalConditions: true,
      },
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

describe('RulesScreen', () => {
  it('renders without crashing after loading campaign data', async () => {
    render(<RulesScreen onClose={() => {}} />);
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.getByText('Rules Comparison Matrix')).toBeInTheDocument();
    });

    expect(screen.getByText('Game Rules')).toBeInTheDocument();
    expect(screen.getByText('Event Rules')).toBeInTheDocument();
  });
});
