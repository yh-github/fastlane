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

  it('renders prominent spacious cards on large screen (1440x900) without blacking out screen', () => {
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

    const overlay = document.body.querySelector('.appraisal-dilemma-overlay') as HTMLElement;
    expect(overlay).toBeInTheDocument();
    // Verify non-blackout: semi-transparent backdrop and z-index below HUD (60 < 100)
    expect(overlay.style.zIndex).toBe('60');
    expect(overlay.style.backgroundColor).toBe('rgba(5, 10, 20, 0.45)');

    const cards = document.body.querySelectorAll('.appraisal-card');
    expect(cards.length).toBe(4);
    expect(document.body.querySelector('.appraisal-card--compact')).toBeNull();
    expect(document.body.querySelector('.appraisal-cards-carousel')).toBeNull();

    // Clicking an option action button triggers confirmation
    const selectBtn = cards[0].querySelector('.card-action-btn') as HTMLElement;
    expect(selectBtn).toBeInTheDocument();
    fireEvent.click(selectBtn);
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

    // Verify option titles and rewards appear on card face
    expect(screen.getByText('+$25')).toBeInTheDocument();
    expect(screen.getByText(/\+2 🤝,\s*\+1 🧠/)).toBeInTheDocument();
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

  it('renders initiative cards with canonical icons on card face, clean buttons, no top badges, and per-card ? help', () => {
    const initiativeDilemma = {
      gameType: 'work_initiative' as const,
      title: 'Workplace Initiative: Career Boost',
      subtitle: 'Select an opportunity to advance your career:',
      options: [
        {
          type: 'initiative' as const,
          badge: 'EXPERIENCE', // Should NOT be rendered as a top tag
          title: 'Role Mentorship',
          description: 'Shadow senior developers.',
          icon: '👌',
          expAmount: 1.5,
          depAmount: 1.0
        },
        {
          type: 'initiative' as const,
          badge: 'EXPENSIVE', // Should NOT be rendered as a top tag
          title: 'Crunch Sprint',
          description: 'High stakes delivery.',
          icon: '👔',
          leadershipSkillAmount: 0.5,
          mentalAmount: -2.0,
          burnoutRisk: true
        }
      ]
    };

    render(
      <AppraisalDilemmaModal
        dilemma={initiativeDilemma}
        player={createTestPlayer({ name: 'Clara' })}
        onSelectOption={vi.fn()}
      />
    );

    // 1. Modifiers appear in the Outcome box on the card face
    expect(screen.getByText(/\+1\.5 👌,\s*\+1 🤝/)).toBeInTheDocument();
    expect(screen.getByText(/\+0\.5 👔,\s*-2 🧠/)).toBeInTheDocument();

    // 2. Buttons are clean action buttons (NO stat text crammed into buttons)
    const selectButtons = screen.getAllByRole('button', { name: /select|accept/i });
    selectButtons.forEach(btn => {
      // The button text should NOT contain the stat modifiers
      expect(btn.textContent).not.toMatch(/\+1\.5 👌/);
      expect(btn.textContent).not.toMatch(/-2 🧠/);
    });

    // 3. Top tags like "EXPERIENCE", "EXPENSIVE", "ETHICS", "BOUNTY" must NOT be rendered
    expect(screen.queryByText('EXPERIENCE')).not.toBeInTheDocument();
    expect(screen.queryByText('EXPENSIVE')).not.toBeInTheDocument();
    expect(screen.queryByText('ETHICS')).not.toBeInTheDocument();
    expect(screen.queryByText('BOUNTY')).not.toBeInTheDocument();

    // 4. Per-card '?' help button exists on each card
    const card0HelpBtn = screen.getByTestId('card-help-btn-0');
    const card1HelpBtn = screen.getByTestId('card-help-btn-1');
    expect(card0HelpBtn).toBeInTheDocument();
    expect(card1HelpBtn).toBeInTheDocument();

    // Card 0 help panel is initially closed
    expect(screen.queryByTestId('card-help-panel-0')).not.toBeInTheDocument();

    // Clicking Card 0 help button opens Card 0 specific explanation
    fireEvent.click(card0HelpBtn);
    expect(screen.getByTestId('card-help-panel-0')).toBeInTheDocument();
    expect(screen.getByText(/👌 Experience \(\+1\.5\)/i)).toBeInTheDocument();
    expect(screen.getByText(/🤝 Dependability \(\+1\)/i)).toBeInTheDocument();
    // Card 1 panel is not open
    expect(screen.queryByTestId('card-help-panel-1')).not.toBeInTheDocument();

    // Close Card 0 help
    const closeBtn = screen.getByRole('button', { name: /close help/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('card-help-panel-0')).not.toBeInTheDocument();

    // Clicking Card 1 help button opens Card 1 specific explanation (Leadership, Burnout Risk)
    fireEvent.click(card1HelpBtn);
    expect(screen.getByTestId('card-help-panel-1')).toBeInTheDocument();
    expect(screen.getByText(/👔 Leadership \(\+0\.5\)/i)).toBeInTheDocument();
    expect(screen.getByText(/⚠️ Burnout Risk/i)).toBeInTheDocument();
  });

  it('portals inside .game-viewport when present to protect HUD visibility, and handles direct card clicks', () => {
    window.innerWidth = 1440;
    window.innerHeight = 900;

    // Setup a simulated game-viewport
    const viewport = document.createElement('div');
    viewport.className = 'game-viewport';
    document.body.appendChild(viewport);

    const onSelectOption = vi.fn();
    const player = createTestPlayer({ name: 'Clara' });

    render(
      <AppraisalDilemmaModal
        dilemma={dummyDilemma}
        player={player}
        onSelectOption={onSelectOption}
      />
    );

    // Verify modal is mounted inside .game-viewport (leaving HUD untouched outside)
    const overlayInViewport = viewport.querySelector('.appraisal-dilemma-overlay');
    expect(overlayInViewport).toBeInTheDocument();

    // Clicking anywhere on the card container directly calls onSelectOption in grid mode
    const cards = viewport.querySelectorAll('.appraisal-card');
    fireEvent.click(cards[2]);
    expect(onSelectOption).toHaveBeenCalledWith(2);

    // Cleanup
    document.body.removeChild(viewport);
  });
});
