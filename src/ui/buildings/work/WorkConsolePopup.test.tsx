import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkConsolePopup } from './WorkConsolePopup';
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

describe('WorkConsolePopup Component', () => {
  const dummyJob = {
    id: 'job_dev',
    title: 'Senior Developer',
    baseWage: 35,
    locationId: 'tech_office',
    tags: ['technical'],
    requirements: { dependability: 15, experience: 20, degrees: [] }
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

  it('renders movable popup with radio buttons defaulting to work_work', () => {
    const onAction = vi.fn();
    const onClose = vi.fn();
    const player = createTestPlayer({
      hoursRemaining: 12,
      physicalCondition: 40,
      mentalCondition: 40,
      experience: 50
    });

    render(
      <WorkConsolePopup
        player={player}
        job={dummyJob}
        campaign={dummyCampaign}
        onAction={onAction}
        onClose={onClose}
      />
    );

    // Verify popup container exists
    expect(screen.getByTestId('work-console-popup')).toBeInTheDocument();
    expect(screen.getByText('Senior Developer')).toBeInTheDocument();
    expect(screen.getByText('$35/hr')).toBeInTheDocument();
    expect(screen.getByText(/Shift #1/i)).toBeInTheDocument();

    // Verify radio button for work_work is checked by default
    const radioWorkWork = screen.getByTestId('radio-work-mode-work_work') as HTMLInputElement;
    expect(radioWorkWork).toBeInTheDocument();
    expect(radioWorkWork.checked).toBe(true);

    // Verify prominent execute button is rendered for work_work
    const executeBtn = screen.getByTestId('work-mode-work_work');
    expect(executeBtn).toBeInTheDocument();
    expect(executeBtn.textContent).toContain('Work Shift');
    expect(executeBtn.textContent).toContain('+$280');

    // Click execute button
    fireEvent.click(executeBtn);
    expect(onAction).toHaveBeenCalledWith({
      type: 'work',
      jobId: 'job_dev',
      mode: 'work_work'
    });
  });

  it('allows changing mode via radio buttons and executes selected mode', () => {
    const onAction = vi.fn();
    const player = createTestPlayer({
      hoursRemaining: 12,
      physicalCondition: 40,
      mentalCondition: 40,
      experience: 50
    });

    render(
      <WorkConsolePopup
        player={player}
        job={dummyJob}
        campaign={dummyCampaign}
        onAction={onAction}
      />
    );

    // Select look_busy (Coast) mode
    const lookBusyOption = screen.getByTestId('work-mode-option-look_busy');
    fireEvent.click(lookBusyOption);

    const radioLookBusy = screen.getByTestId('radio-work-mode-look_busy') as HTMLInputElement;
    expect(radioLookBusy.checked).toBe(true);

    // Verify execute button is now bound to look_busy
    const executeBtn = screen.getByTestId('work-mode-look_busy');
    expect(executeBtn).toBeInTheDocument();
    expect(executeBtn.textContent).toContain('Coast');

    fireEvent.click(executeBtn);
    expect(onAction).toHaveBeenCalledWith({
      type: 'work',
      jobId: 'job_dev',
      mode: 'look_busy'
    });
  });

  it('clicking close button calls onClose', () => {
    const onClose = vi.fn();
    const player = createTestPlayer({
      hoursRemaining: 12,
      physicalCondition: 40,
      mentalCondition: 40,
      experience: 50
    });

    render(
      <WorkConsolePopup
        player={player}
        job={dummyJob}
        campaign={dummyCampaign}
        onAction={vi.fn()}
        onClose={onClose}
      />
    );

    const closeBtn = screen.getByTestId('btn-close-work-wings');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('opens help modal when clicking the ? button on a mode', () => {
    const player = createTestPlayer({
      hoursRemaining: 12,
      physicalCondition: 40,
      mentalCondition: 40,
      experience: 50
    });

    render(
      <WorkConsolePopup
        player={player}
        job={dummyJob}
        campaign={dummyCampaign}
        onAction={vi.fn()}
      />
    );

    const helpBtn = screen.getByTestId('help-btn-work_work');
    fireEvent.click(helpBtn);

    expect(screen.getByTestId('work-help-modal-work_work')).toBeInTheDocument();
  });

  it('clicking locked mode opens ActionReasonModal', () => {
    const player = createTestPlayer({
      hoursRemaining: 12,
      physicalCondition: 40,
      mentalCondition: 40,
      experience: 5 // job requires 20, initiative needs 20+10=30 -> locked
    });

    render(
      <WorkConsolePopup
        player={player}
        job={dummyJob}
        campaign={dummyCampaign}
        onAction={vi.fn()}
      />
    );

    const lockedOption = screen.getByTestId('work-mode-option-show_initiative');
    fireEvent.click(lockedOption);

    expect(screen.getByTestId('action-reason-modal')).toBeInTheDocument();
  });

  it('supports pointer drag on header bar', () => {
    const player = createTestPlayer({
      hoursRemaining: 12,
      physicalCondition: 40,
      mentalCondition: 40,
      experience: 50
    });

    render(
      <WorkConsolePopup
        player={player}
        job={dummyJob}
        campaign={dummyCampaign}
        onAction={vi.fn()}
      />
    );

    const header = document.querySelector('.work-console-popup__header');
    expect(header).toBeInTheDocument();

    // Simulate pointer events
    fireEvent.pointerDown(header!, { clientX: 200, clientY: 200 });
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 250, clientY: 260 }));
    window.dispatchEvent(new PointerEvent('pointerup'));

    const popup = screen.getByTestId('work-console-popup');
    expect(popup).toBeInTheDocument();
  });
});
