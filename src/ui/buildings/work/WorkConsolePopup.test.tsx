import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  beforeEach(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

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
      versionClass: 'advanced',
      gameRules: { versionClass: 'advanced', usePhysicalMentalConditions: true, useSkills: true, helpfulUI: true },
      timeRules: { workSessionCost: 6 },
      statRules: {
        workPhysicalCost: 1,
        workNormalMentalCost: 0,
        workGrindThreshold: 4,
        workGrindMentalCost: 1,
        workOvertimeThreshold: 8,
        workOvertimePhysicalCost: 2,
        workOvertimeMentalCost: 2,
        resilienceDropThreshold: 3,
        enableAdvancedStats: true,
        baseSkillCap: 2.5,
        maxSkillCap: 10.0
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

  it('displays rounded mistake chance and driver breakdown in selected mode panel', () => {
    const player = createTestPlayer({
      hoursRemaining: 12,
      physicalCondition: 7, // threshold 10 -> (10 - 7) * 0.025 = 0.075 (7.5%) -> rounds to 8%
      mentalCondition: 50,
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

    const mistakeRisk = screen.getByTestId('selected-mode-mistake-risk');
    expect(mistakeRisk).toBeInTheDocument();
    // Mistake percentage must be rounded integer on badge, with detailed breakdown in title attribute
    expect(mistakeRisk.textContent).toContain('8% Risk');
    expect(mistakeRisk.getAttribute('title')).toContain('Physical Fatigue');
    expect(mistakeRisk.textContent).not.toContain('0.075');
    expect(mistakeRisk.textContent).not.toContain('7.5%');
  });

  it('renders minimalistic selection rows without modifier clutter and shows all active modifiers in dedicated panel', () => {
    const player = createTestPlayer({
      hoursRemaining: 12,
      physicalCondition: 40,
      mentalCondition: 40,
      experience: 50,
      workActionsThisTurn: 8, // Overtime shift
      rentDebt: 100,
      mistakesByLocation: { [dummyJob.locationId]: 1 }
    });

    render(
      <WorkConsolePopup
        player={player}
        job={dummyJob}
        campaign={dummyCampaign}
        onAction={vi.fn()}
      />
    );

    // 1. Selection row is minimalistic: does NOT contain modifier badges
    const workWorkRow = screen.getByTestId('work-mode-option-work_work');
    expect(workWorkRow.textContent).not.toContain('-$100 Debt');
    expect(workWorkRow.textContent).not.toContain('-0.5 MAX 💪');
    expect(workWorkRow.textContent).not.toContain('+0.25 🔧');

    // 2. Dedicated modifiers panel displays all active modifiers for work_work
    const modPanel = screen.getByTestId('selected-mode-modifiers-panel');
    expect(modPanel).toBeInTheDocument();
    expect(modPanel.textContent).toContain('-$100 Debt');
    expect(modPanel.textContent).toContain('-0.5 MAX 💪');
    expect(modPanel.textContent).toContain('+0.25 🔧');
    expect(modPanel.textContent).toContain('⚠️ 1 Demerits');

    // 3. Switch mode to show_initiative: panel updates to display initiative modifiers (and resilience since mental cost is 5 >= 3)
    const initOption = screen.getByTestId('work-mode-option-show_initiative');
    fireEvent.click(initOption);

    expect(modPanel.textContent).toContain('🃏 2 Cards');
    expect(modPanel.textContent).not.toContain('-1 ⚠️ Demerit');
    expect(modPanel.textContent).toContain('+1 🌟');
    expect(modPanel.textContent).toContain('+1 MAX 🧠');

    // 4. Switch mode to face_time: panel shows -1 ⚠️ Demerit (defensive clearing)
    const faceTimeOption = screen.getByTestId('work-mode-option-face_time');
    fireEvent.click(faceTimeOption);
    expect(modPanel.textContent).toContain('-1 ⚠️ Demerit');
  });

  it('clamps popup vertical bounds to avoid covering the bottom center clock', () => {
    // Add dummy bottom center clock
    const clockEl = document.createElement('div');
    clockEl.className = 'bottom-center-clock';
    clockEl.setAttribute('data-testid', 'bottom-center-clock');
    clockEl.getBoundingClientRect = () => ({
      top: 550,
      bottom: 610,
      left: 400,
      right: 500,
      width: 100,
      height: 60,
      x: 400,
      y: 550,
      toJSON: () => {}
    });
    document.body.appendChild(clockEl);

    try {
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

      const popup = screen.getByTestId('work-console-popup');
      const topPx = parseInt(popup.style.top, 10);
      // Popup height is ~290px. With clock top at 550, top + height must stay <= 550 - 8 = 542
      expect(topPx + 290).toBeLessThanOrEqual(550);
    } finally {
      document.body.removeChild(clockEl);
    }
  });

  it('persists selected work mode in sessionStorage across component remounts', () => {
    const player = createTestPlayer({
      hoursRemaining: 12,
      physicalCondition: 40,
      mentalCondition: 40,
      experience: 50
    });

    // Initial render: defaults to work_work
    const { unmount } = render(
      <WorkConsolePopup
        player={player}
        job={dummyJob}
        campaign={dummyCampaign}
        onAction={vi.fn()}
      />
    );

    // Click show_initiative mode
    const initOption = screen.getByTestId('work-mode-option-show_initiative');
    fireEvent.click(initOption);

    const radioInit = screen.getByTestId('radio-work-mode-show_initiative') as HTMLInputElement;
    expect(radioInit.checked).toBe(true);
    expect(sessionStorage.getItem('fastlane_selected_work_mode')).toBe('show_initiative');

    // Simulate dilemma triggering and work station unmounting
    unmount();

    // Re-mount after resolving dilemma
    render(
      <WorkConsolePopup
        player={player}
        job={dummyJob}
        campaign={dummyCampaign}
        onAction={vi.fn()}
      />
    );

    // Verify it stays on show_initiative and did not jump back to work_work
    const remountedRadioInit = screen.getByTestId('radio-work-mode-show_initiative') as HTMLInputElement;
    expect(remountedRadioInit.checked).toBe(true);
    const remountedRadioWork = screen.getByTestId('radio-work-mode-work_work') as HTMLInputElement;
    expect(remountedRadioWork.checked).toBe(false);
  });
});

