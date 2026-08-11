import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JobBoard } from './BuildingInteractions';
import type { PlayerState } from '../engine/gameState';
import type { CampaignBundle } from '../engine/dataLoader';

describe('BuildingInteractions', () => {
  it('renders JobBoard without crashing and displays buildings', () => {
    const mockPlayer = {
      name: 'Tester',
      dependability: 10,
      experience: 10,
      degrees: [],
      inventory: {}
    } as unknown as PlayerState;

    const mockCampaign = {
      jobs: [
        { id: 'burger_cook', title: 'Cook', locationId: 'burger_palace', baseWage: 5, requirements: { experience: 0, dependability: 0, degrees: [] } }
      ],
      buildings: [
        { id: 'burger_palace', name: 'Monolith Burgers' }
      ],
      items: [],
      config: {}
    } as unknown as CampaignBundle;

    render(
      <JobBoard
        player={mockPlayer}
        onAction={vi.fn()}
        availableJobs={mockCampaign.jobs}
        buildings={mockCampaign.buildings}
        economicIndex={0}
        campaign={mockCampaign}
      />
    );

    expect(screen.getByText(/Monolith Burgers/i)).toBeInTheDocument();
  });

  it('sorts jobs by baseWage ascending in JobBoard (Janitor before Manager)', () => {
    const mockPlayer = {
      name: 'Tester',
      dependability: 10,
      experience: 10,
      degrees: [],
      inventory: {}
    } as unknown as PlayerState;

    const mockCampaign = {
      jobs: [
        { id: 'qt_mgr', title: 'Manager', locationId: 'qt_clothing', baseWage: 12, requirements: { experience: 50, dependability: 50, degrees: [] } },
        { id: 'qt_janitor', title: 'Janitor', locationId: 'qt_clothing', baseWage: 6, requirements: { experience: 10, dependability: 20, degrees: [] } },
        { id: 'qt_salesperson', title: 'Salesperson', locationId: 'qt_clothing', baseWage: 8, requirements: { experience: 30, dependability: 30, degrees: [] } }
      ],
      buildings: [
        { id: 'qt_clothing', name: 'QT Clothing' }
      ],
      items: [],
      config: {}
    } as unknown as CampaignBundle;

    const { fireEvent } = require('@testing-library/react');

    render(
      <JobBoard
        player={mockPlayer}
        onAction={vi.fn()}
        availableJobs={mockCampaign.jobs}
        buildings={mockCampaign.buildings}
        economicIndex={0}
        campaign={mockCampaign}
      />
    );

    fireEvent.click(screen.getByText(/QT Clothing/i));

    const jobHeadings = screen.getAllByText(/Janitor|Salesperson|Manager/i);
    expect(jobHeadings[0].textContent).toContain('Janitor');
    expect(jobHeadings[1].textContent).toContain('Salesperson');
    expect(jobHeadings[2].textContent).toContain('Manager');
  });
});
