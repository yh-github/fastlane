import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkShiftCards } from './WorkShiftCards';
import { createTestPlayer } from '../../../engine/testFactories';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (typeof options === 'string') return options;
      if (options?.defaultValue) return options.defaultValue;
      return key;
    }
  }),
}));

describe('WorkShiftCards Component', () => {
  const dummyJob = {
    id: 'job_middle_manager',
    title: 'Operations Manager',
    baseWage: 30,
    locationId: 'tech_office',
    tags: ['middle_management'],
    requirements: { dependability: 20, experience: 20, degrees: [] }
  } as any;

  const dummyCampaign = {
    config: {
      gameRules: { usePhysicalMentalConditions: true, helpfulUI: true },
      timeRules: { workSessionCost: 6 },
      statRules: {
        workPhysicalCost: 1,
        workNormalMentalCost: 0,
        workGrindMentalCost: 1,
        workOvertimeMentalCost: 2
      }
    }
  } as any;

  it('renders cards with zero redundant badges or titles and uniform fixed height', () => {
    const player = createTestPlayer({
      hoursRemaining: 12,
      physicalCondition: 40,
      mentalCondition: 40,
      experience: 50
    });

    const { container } = render(
      <WorkShiftCards
        player={player}
        job={dummyJob}
        campaign={dummyCampaign}
        onAction={vi.fn()}
        layoutMode="grid"
      />
    );

    // 1. Verify fake tag badges (DEFAULT, SLACKING, NETWORKING, LEADERSHIP) and 'Safe' are NOT present
    expect(screen.queryByText(/^DEFAULT$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^SLACKING$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^NETWORKING$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^LEADERSHIP$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Safe/i)).not.toBeInTheDocument();

    // 2. Verify all rendered shift cards have uniform fixed height
    const cards = container.querySelectorAll('.work-shift-card');
    expect(cards.length).toBeGreaterThan(0);
    cards.forEach((card) => {
      const el = card as HTMLElement;
      expect(el.style.height).toBe('128px');
      expect(el.style.minHeight).toBe('128px');
      expect(el.style.maxHeight).toBe('135px');
    });
  });

  it('softly disables Show Initiative and displays ActionReasonModal when clicked without sufficient experience', () => {
    const onAction = vi.fn();
    const player = createTestPlayer({
      hoursRemaining: 12,
      physicalCondition: 40,
      mentalCondition: 40,
      experience: 5 // job requires 20, initiative needs 20 + 10 = 30 -> locked
    });

    render(
      <WorkShiftCards
        player={player}
        job={dummyJob}
        campaign={dummyCampaign}
        onAction={onAction}
        layoutMode="grid"
      />
    );

    const initiativeBtn = screen.getByTestId('work-mode-show_initiative');
    expect(initiativeBtn).toBeInTheDocument();
    expect(initiativeBtn.textContent).toContain('🔒');

    // Click softly disabled initiative button
    fireEvent.click(initiativeBtn);

    // Verify onAction was NOT dispatched
    expect(onAction).not.toHaveBeenCalled();

    // Verify ActionReasonModal appeared with reason explanation
    expect(screen.getByText(/Initiative Unavailable/i)).toBeInTheDocument();

    // Dismiss modal
    const okBtn = screen.getByRole('button', { name: /OK/i });
    fireEvent.click(okBtn);
    expect(screen.queryByText(/Initiative Unavailable/i)).not.toBeInTheDocument();
  });

  it('displays detailed condition cost & modifier computation in help modal upon clicking ?', () => {
    const player = createTestPlayer({
      hoursRemaining: 12,
      physicalCondition: 40,
      mentalCondition: 40,
      workActionsThisTurn: 3 // next shift is #4 -> Grind tier
    });

    render(
      <WorkShiftCards
        player={player}
        job={dummyJob}
        campaign={dummyCampaign}
        onAction={vi.fn()}
        layoutMode="flanking"
      />
    );

    const helpBtn = screen.getByTestId('help-btn-work_work');
    fireEvent.click(helpBtn);

    // Verify help modal opens
    expect(screen.getByTestId('work-help-modal-work_work')).toBeInTheDocument();

    // Verify Condition Cost & Modifier Computation section is rendered
    const breakdown = screen.getByTestId('work-help-modifier-breakdown');
    expect(breakdown).toBeInTheDocument();

    // Breakdown details should include base shift cost, middle management tag demand, and grind time fatigue
    expect(breakdown.textContent).toContain('Mental Condition Cost');
    expect(breakdown.textContent).toContain('Middle Management oversight');
    expect(breakdown.textContent).toContain('Grind time');
    expect(breakdown.textContent).toContain('Physical Condition Cost');
  });

  it('renders +1 Social badge on work_work and -1 Social on look_busy for frontline_service jobs', () => {
    const frontlineJob = {
      id: 'job_clerk',
      title: 'Store Clerk',
      baseWage: 12,
      locationId: 'zmart',
      tags: ['frontline_service'],
      requirements: { dependability: 0, experience: 0, degrees: [] }
    } as any;

    const player = createTestPlayer({
      hoursRemaining: 12,
      physicalCondition: 40,
      mentalCondition: 40,
      workActionsThisTurn: 0 // Shift #1: normal shift -> +1 Social on work_work
    });

    render(
      <WorkShiftCards
        player={player}
        job={frontlineJob}
        campaign={dummyCampaign}
        onAction={vi.fn()}
        layoutMode="flanking"
      />
    );

    // Should display +1 👥 Social badge for work_work and face_time
    const socialGainBadges = screen.getAllByText('+1 👥 Social');
    expect(socialGainBadges.length).toBe(2);

    // Should display -1 👥 Social penalty badge for look_busy
    expect(screen.getByText('-1 👥 Social')).toBeInTheDocument();
  });

  it('renders 0 👥 Social (Grind) badge on work_work for frontline_service jobs on grind shifts', () => {
    const frontlineJob = {
      id: 'job_clerk',
      title: 'Store Clerk',
      baseWage: 12,
      locationId: 'zmart',
      tags: ['frontline_service'],
      requirements: { dependability: 0, experience: 0, degrees: [] }
    } as any;

    const player = createTestPlayer({
      hoursRemaining: 12,
      physicalCondition: 40,
      mentalCondition: 40,
      workActionsThisTurn: 3 // Shift #4: grind shift -> 0 Social on work_work
    });

    render(
      <WorkShiftCards
        player={player}
        job={frontlineJob}
        campaign={dummyCampaign}
        onAction={vi.fn()}
        layoutMode="flanking"
      />
    );

    expect(screen.getByText('0 👥 Social (Grind)')).toBeInTheDocument();
    expect(screen.getByText('-1 👥 Social')).toBeInTheDocument(); // Coast still penalizes
  });

  it('hides and disables pointer events on flanking wings when unmeasured', () => {
    const player = createTestPlayer({
      hoursRemaining: 12,
      physicalCondition: 40,
      mentalCondition: 40,
    });

    const modalRef = {
      current: null
    };

    render(
      <WorkShiftCards
        player={player}
        job={dummyJob}
        campaign={dummyCampaign}
        onAction={vi.fn()}
        layoutMode="flanking"
        modalRef={modalRef}
      />
    );

    const leftWing = document.querySelector('.work-wing-left') as HTMLElement;
    expect(leftWing).toBeInTheDocument();
    expect(leftWing.style.visibility).toBe('hidden');
    expect(leftWing.style.pointerEvents).toBe('none');
  });
});
