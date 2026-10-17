import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkCardHelpModal } from './WorkCardHelpModal';
import { calcWorkShiftSummary } from '../../../engine/job/jobShiftSummary';
import { createTestPlayer, TEST_ADVANCED_CAMPAIGN_CONFIG, TEST_ADVANCED_GAME_RULES } from '../../../engine/testFactories';
import type { JobDef } from '../../../engine/dataLoader';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (typeof options === 'string') return options;
      if (options?.defaultValue) return options.defaultValue;
      return key;
    }
  }),
}));

describe('WorkCardHelpModal Component', () => {
  const execJob: JobDef = {
    id: 'fastfood_manager',
    title: 'Fastfood General Manager',
    locationId: 'fastfood',
    baseWage: 25,
    requirements: { experience: 20, dependability: 20, degrees: [], uniform: 'dress' },
    tags: ['executive_management'],
    perks: []
  };

  it('renders dynamic config-driven mistake breakdown for executive roles', () => {
    // Player with 20 Exp (0 margin over req 20, missing 20 buffer margin)
    const player = createTestPlayer({
      hoursRemaining: 6,
      currentWage: 25,
      physicalCondition: 50,
      mentalCondition: 50,
      social: 50,
      experience: 20,
      workActionsThisTurn: 0
    });

    const summary = calcWorkShiftSummary(player, execJob, 6, TEST_ADVANCED_GAME_RULES, TEST_ADVANCED_CAMPAIGN_CONFIG.statRules);

    render(
      <WorkCardHelpModal
        mode="work_work"
        job={execJob}
        player={player}
        onClose={vi.fn()}
        campaign={{ config: TEST_ADVANCED_CAMPAIGN_CONFIG } as any}
        summary={summary}
        statRules={TEST_ADVANCED_CAMPAIGN_CONFIG.statRules}
      />
    );

    // Modal renders
    expect(screen.getByTestId('work-help-modal-work_work')).toBeInTheDocument();

    // Mistake breakdown container renders
    const breakdown = screen.getByTestId('work-help-mistake-breakdown');
    expect(breakdown).toBeInTheDocument();

    // Total mistake risk is displayed
    expect(breakdown.textContent).toContain('10.0%');
    expect(breakdown.textContent).toContain('Compound formula');

    // Executive Blunder Risk row is triggered
    expect(breakdown.textContent).toContain('Executive Blunder Risk');
    expect(breakdown.textContent).toContain('10.0% Risk');
    expect(breakdown.textContent).toContain('20.0 Exp below safety buffer');

    // Physical and Mental are safe
    expect(breakdown.textContent).toContain('Physical Fatigue');
    expect(breakdown.textContent).toContain('Mental Exhaustion');
    expect(breakdown.textContent).toContain('✓ 0.0% (Safe)');

    // Inputs list displays Executive Experience Buffer
    expect(screen.getByText('Executive Experience Buffer')).toBeInTheDocument();
    expect(screen.getByText(/Requires a buffer of \+20 Experience above the role requirement/)).toBeInTheDocument();
  });

  it('adapts thresholds dynamically when custom statRules are passed', () => {
    const customStatRules = {
      ...TEST_ADVANCED_CAMPAIGN_CONFIG.statRules,
      workMistakePhysicalThreshold: 30,
      workMistakePhysicalChancePerPoint: 0.05
    };

    const player = createTestPlayer({
      hoursRemaining: 6,
      currentWage: 25,
      physicalCondition: 25, // 5 points below 30 = 25% risk
      mentalCondition: 50,
      social: 50,
      experience: 50,
      workActionsThisTurn: 0
    });

    const summary = calcWorkShiftSummary(player, execJob, 6, TEST_ADVANCED_GAME_RULES, customStatRules);

    render(
      <WorkCardHelpModal
        mode="work_work"
        job={execJob}
        player={player}
        onClose={vi.fn()}
        summary={summary}
        statRules={customStatRules}
      />
    );

    const breakdown = screen.getByTestId('work-help-mistake-breakdown');
    expect(breakdown.textContent).toContain('Physical Fatigue');
    expect(breakdown.textContent).toContain('25.0% Risk');
    expect(breakdown.textContent).toContain('5.0 pts below threshold (30)');
  });
});
