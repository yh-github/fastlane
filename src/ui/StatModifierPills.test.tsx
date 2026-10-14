import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatModifierPills } from './StatModifierPills';

describe('StatModifierPills', () => {
  it('renders pill with label in title and aria-label', () => {
    render(
      <StatModifierPills
        modifications={[
          { stat: 'mental', diff: 2, label: 'Weekend Choice' }
        ]}
      />
    );

    const pill = screen.getByTestId('stat-pill-mental');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveAttribute('title', 'Mental Condition: +2 Mental Condition (Weekend Choice)');
    expect(pill).toHaveAttribute('aria-label', 'Mental Condition: +2 Mental Condition (Weekend Choice)');
  });

  it('renders pill with multi-source breakdown in tooltip', () => {
    render(
      <StatModifierPills
        modifications={[
          {
            stat: 'mental',
            diff: 1,
            breakdown: [
              { source: 'Weekend Activity', diff: 2 },
              { source: 'Weekly Upkeep', diff: -1 },
            ]
          }
        ]}
      />
    );

    const pill = screen.getByTestId('stat-pill-mental');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveAttribute(
      'title',
      'Mental Condition: +1 Mental Condition (Weekend Activity: +2, Weekly Upkeep: -1)'
    );
  });

  it('filters out non-economic pills when isHelpfulUI is false', () => {
    render(
      <StatModifierPills
        modifications={[
          { stat: 'money', diff: -50, label: 'Cost' },
          { stat: 'mental', diff: 2, label: 'Rest' },
          { stat: 'mess', diff: 1, label: 'Dust' }
        ]}
        isHelpfulUI={false}
      />
    );

    expect(screen.getByText(/-\$50/i)).toBeInTheDocument();
    expect(screen.queryByText(/\+2 🧠/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+1/i)).not.toBeInTheDocument();
  });

  it('renders nothing when modifications array is empty or diffs are 0', () => {
    const { container } = render(
      <StatModifierPills
        modifications={[
          { stat: 'money', diff: 0 },
          { stat: 'mental', diff: 0 }
        ]}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('bunches duplicate modifications for the same stat into a single pill', () => {
    render(
      <StatModifierPills
        modifications={[
          { stat: 'mental', diff: -2, label: 'Food Spoilage' },
          { stat: 'mental', diff: -5, label: 'Sick' }
        ]}
      />
    );

    const mentalPills = screen.getAllByTestId('stat-pill-mental');
    expect(mentalPills.length).toBe(1);
    expect(mentalPills[0].textContent).toContain('-7');
  });
});
