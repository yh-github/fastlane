import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppraisalDilemmaModal } from './AppraisalDilemmaModal';
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

describe('AppraisalDilemmaModal', () => {
  const dummyDilemma = {
    itemTitle: 'Antique Swiss Tourbillon Pocketwatch',
    options: [
      {
        type: 'cash' as const,
        title: 'Quick Escapement Adjustment',
        description: 'Clean the escapement and gears for quick tip.',
        cashAmount: 25
      },
      {
        type: 'standing' as const,
        title: 'Master Horology Certification',
        description: 'Carefully log and authenticate the timepiece for the shop.',
        depAmount: 2,
        mentalAmount: 1
      },
      {
        type: 'item' as const,
        title: 'Vintage Horological Curio',
        description: 'Customer parts with the piece for pocket change.',
        itemType: 'knick_knack' as const
      },
      {
        type: 'skill' as const,
        title: 'Study Mechanical Escapement',
        description: 'Disassemble and study the mechanism up-close.',
        techSkillAmount: 0.25,
        mentalAmount: 2
      }
    ]
  };

  it('renders prominent spacious cards on large screen (1440x900)', () => {
    window.innerWidth = 1440;
    window.innerHeight = 900;

    const onSelectOption = vi.fn();
    const player = createTestPlayer({ name: 'Clara' });

    render(
      <AppraisalDilemmaModal
        dilemma={dummyDilemma}
        player={player}
        onSelectOption={onSelectOption}
      />
    );

    expect(screen.getByText('Antique Swiss Tourbillon Pocketwatch')).toBeInTheDocument();
    expect(screen.getByText('Quick Escapement Adjustment')).toBeInTheDocument();

    const cards = document.body.querySelectorAll('.appraisal-card');
    expect(cards.length).toBe(4);
    expect(document.body.querySelector('.appraisal-card--compact')).toBeNull();
    expect(document.body.querySelector('.appraisal-cards-carousel')).toBeNull();

    // Clicking an option triggers onSelectOption
    fireEvent.click(cards[0]);
    expect(onSelectOption).toHaveBeenCalledWith(0);
  });

  it('renders compact side-by-side cards when screen height/width is constrained (800x600)', () => {
    window.innerWidth = 800;
    window.innerHeight = 600;

    const onSelectOption = vi.fn();
    const player = createTestPlayer({ name: 'Clara' });

    render(
      <AppraisalDilemmaModal
        dilemma={dummyDilemma}
        player={player}
        onSelectOption={onSelectOption}
      />
    );

    const compactCards = document.body.querySelectorAll('.appraisal-card--compact');
    expect(compactCards.length).toBe(4);
    // In 800px width with 4 cards, they fit side-by-side in grid mode without carousel
    expect(document.body.querySelector('.appraisal-cards-carousel')).toBeNull();

    // Verify option titles and rewards appear in compact form
    expect(screen.getByText('+$25')).toBeInTheDocument();
    expect(screen.getByText(/\+2 Dep,\s*\+1 🧠/)).toBeInTheDocument();
  });

  it('activates touch carousel, indicator pills, and confirm bar on narrow mobile viewports (390x844)', () => {
    window.innerWidth = 390;
    window.innerHeight = 844;

    const onSelectOption = vi.fn();
    const player = createTestPlayer({ name: 'Clara' });

    render(
      <AppraisalDilemmaModal
        dilemma={dummyDilemma}
        player={player}
        onSelectOption={onSelectOption}
      />
    );

    expect(document.body.querySelector('.appraisal-cards-carousel')).not.toBeNull();
    const pills = document.body.querySelectorAll('.appraisal-carousel-indicator__btn');
    expect(pills.length).toBe(4);

    // Clicking a pill switches selection
    fireEvent.click(pills[1]);
    expect(pills[1]).toHaveClass('appraisal-carousel-indicator__btn--active');

    // Confirm button in sticky bottom bar
    const confirmBtn = screen.getByTestId('btn-confirm-appraisal-choice');
    expect(confirmBtn).toBeInTheDocument();
    fireEvent.click(confirmBtn);
    expect(onSelectOption).toHaveBeenCalledWith(1);
  });
});
