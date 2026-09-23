import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
        usePhysicalMentalConditions: id === 'advanced',
      },
    },
    buildings: [
      {
        id: 'socket_city',
        name: 'Socket City',
        archetype: 'appliance_store',
        spritePath: '',
        description: 'Appliances',
        inventory: id === 'advanced'
          ? [{ itemId: 'microwave' }, { itemId: 'vcr' }]
          : [{ itemId: 'microwave' }]
      }
    ],
    jobs: [
      {
        id: 'dishwasher',
        title: 'Dishwasher',
        locationId: 'monolith_burger',
        baseWage: id === 'advanced' ? 7 : 6,
        requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' as const },
        perks: [],
        tags: id === 'advanced' ? ['heavy_physical'] : []
      }
    ],
    items: [
      {
        id: 'microwave',
        name: 'Microwave',
        category: 'appliance' as const,
        basePrice: 150,
        happinessBonus: id === 'advanced' ? 1 : 2,
        space: 20
      }
    ],
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
    expect(screen.queryByText('Missing description')).not.toBeInTheDocument();
  });

  it('switches between Rules, Jobs, Items, and Locations tabs', async () => {
    render(<RulesScreen onClose={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByText('Rules Comparison Matrix')).toBeInTheDocument();
    });

    // Switch to Jobs tab
    fireEvent.click(screen.getByTestId('tab-jobs'));
    expect(screen.getByText(/Jobs Comparison/)).toBeInTheDocument();
    expect(screen.getByText('Dishwasher')).toBeInTheDocument();
    expect(screen.getByText('$6/hr')).toBeInTheDocument();
    expect(screen.getByText('$7/hr')).toBeInTheDocument();
    expect(screen.getByText('heavy_physical')).toBeInTheDocument();

    // Switch to Items tab
    fireEvent.click(screen.getByTestId('tab-items'));
    expect(screen.getByText(/Items Comparison/)).toBeInTheDocument();
    expect(screen.getByText('Microwave')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument(); // Floppy happinessBonus

    // Switch to Locations tab
    fireEvent.click(screen.getByTestId('tab-locations'));
    expect(screen.getByText(/Locations & Buildings Comparison/)).toBeInTheDocument();
    expect(screen.getByText('Socket City')).toBeInTheDocument();
    expect(screen.getByText(/1 item/)).toBeInTheDocument();
    expect(screen.getByText(/2 items/)).toBeInTheDocument();
  });

  it('filters rows correctly in Diff Mode across tabs', async () => {
    render(<RulesScreen onClose={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByText('Rules Comparison Matrix')).toBeInTheDocument();
    });

    // Toggle Diff Mode
    const diffCheckbox = screen.getByLabelText(/Show Differences Only/);
    fireEvent.click(diffCheckbox);

    // Jobs should still be visible because wages & tags differ
    fireEvent.click(screen.getByTestId('tab-jobs'));
    expect(screen.getByText('Dishwasher')).toBeInTheDocument();

    // Items should still be visible because happinessBonus differs
    fireEvent.click(screen.getByTestId('tab-items'));
    expect(screen.getByText('Microwave')).toBeInTheDocument();

    // Locations should still be visible because inventory counts differ
    fireEvent.click(screen.getByTestId('tab-locations'));
    expect(screen.getByText('Socket City')).toBeInTheDocument();
  });
});
