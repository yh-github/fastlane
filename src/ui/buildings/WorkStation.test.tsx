import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkStation } from "./JobBoard";

describe("WorkStation", () => {
  it('WorkStation renders prominent Work Work default option and prorates partial hours', () => {
    const mockPlayer = {
      name: 'Tester',
      currentWage: 20,
      hoursRemaining: 3, // Partial shift (3 hrs out of 6)
      physicalCondition: 30,
      mentalCondition: 30,
      workActionsThisTurn: 0,
      degrees: ['cs_degree'],
      inventory: {}
    } as any;

    const mockJob = {
      id: 'job_dev',
      title: 'Developer',
      baseWage: 20,
      locationId: 'tech_office',
      requirements: { dependability: 10, experience: 10, degrees: [] }
    } as any;

    const mockCampaign = {
      config: {
        gameRules: { usePhysicalMentalConditions: true, helpfulUI: true },
        timeRules: { workSessionCost: 6 },
        statRules: { workPhysicalCost: 1, workNormalMentalCost: 0 }
      }
    } as any;

    const mockOnAction = vi.fn();

    render(
      <WorkStation
        player={mockPlayer}
        job={mockJob}
        onAction={mockOnAction}
        campaign={mockCampaign}
      />
    );

    // Inline strategy options are displayed directly without a modal
    expect(screen.getByTestId('work-mode-work_work')).toBeInTheDocument();
    expect(screen.getByText(/3h/i)).toBeInTheDocument();

    const workWorkBtn = screen.getByTestId('work-mode-work_work');
    expect(workWorkBtn).toBeInTheDocument();
    // 3/6 hours * $160 = $80
    expect(workWorkBtn.textContent).toContain('$80');

    // Click Work Work
    fireEvent.click(workWorkBtn);
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'work', jobId: 'job_dev', mode: 'work_work' });
  });

});
