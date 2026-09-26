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

  it('renders unified All Differences tab when initialTab is all-diffs', async () => {
    render(<RulesScreen onClose={() => {}} initialTab="all-diffs" initialDiffMode={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Rules Comparison Matrix')).toBeInTheDocument();
    });

    // Executive summary card
    expect(screen.getByText(/All Version Differences/)).toBeInTheDocument();

    // All category diff sections should be visible simultaneously
    expect(screen.getByText(/Rule Differences/)).toBeInTheDocument();
    expect(screen.getByText(/Job Differences/)).toBeInTheDocument();
    expect(screen.getByText(/Item Differences/)).toBeInTheDocument();
    expect(screen.getAllByText(/Locations & Buildings/).length).toBeGreaterThan(0);

    // Verify differing jobs and items are rendered directly in the diffs view
    expect(screen.getByText('Dishwasher')).toBeInTheDocument();
    expect(screen.getByText('Microwave')).toBeInTheDocument();
  });

  it('switches to Goals & Housing tab and renders win conditions', async () => {
    render(<RulesScreen onClose={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByText('Rules Comparison Matrix')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tab-goals-housing'));
    expect(screen.getByText('Win Conditions Comparison')).toBeInTheDocument();
    expect(screen.getByText('Housing & Rent Comparison')).toBeInTheDocument();
  });

  it('filters rows with the search query input', async () => {
    render(<RulesScreen onClose={() => {}} initialTab="jobs" />);
    
    await waitFor(() => {
      expect(screen.getByText('Rules Comparison Matrix')).toBeInTheDocument();
    });

    expect(screen.getByText('Dishwasher')).toBeInTheDocument();

    // Type non-matching search query
    const searchInput = screen.getByPlaceholderText('Search rows...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent_job_xyz' } });

    // Job should be filtered out
    expect(screen.queryByText('Dishwasher')).not.toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Dishwasher')).toBeInTheDocument();
  });
});

