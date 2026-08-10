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
});
