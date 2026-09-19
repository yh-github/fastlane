import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import type { PlayerState } from '../engine/gameState';

describe('Side HUD Layout & Folding', () => {
  const mockPlayer = {
    name: 'Player 1',
    money: 250,
    happiness: 30,
    dependability: 20,
    experience: 15,
    degrees: ['business'],
    currentJobId: 'clerk',
    goalAllotment: {
      wealth: 50,
      happiness: 50,
      education: 50,
      career: 50
    },
    inventory: {
      selectedClothes: 'casual',
      stocks: { tBills: 0, holdings: {} }
    },
    hoursRemaining: 24,
    skillMgmt: 2.5,
    skillTech: 1.0,
    physicalCondition: 45,
    mentalCondition: 40
  } as unknown as PlayerState;

  const mockGameState = {
    rules: {
      helpfulUI: true,
      hudLayout: 'side' as const,
      usePhysicalMentalConditions: true
    },
    turn: 3,
    economicIndex: 10
  } as any;

  it('renders Side HUD with Column 1 (Life/Goals) and Column 2 (Career/Skills in exact order)', () => {
    render(
      <Dashboard
        player={mockPlayer}
        gameState={mockGameState}
        turn={3}
        hoursPerTurn={30}
        layout="side"
        foldState="full"
        onOpenInventory={() => {}}
        onOpenSettings={() => {}}
      />
    );

    // Side HUD container
    expect(screen.getByTestId('side-hud-full')).toBeInTheDocument();

    // Column 1 elements
    expect(screen.getByText(/Player 1 - Week 3/i)).toBeInTheDocument();
    expect(screen.getByTitle('Victory')).toBeInTheDocument();
    expect(screen.getByTitle('Happiness')).toBeInTheDocument();
    expect(screen.getByTitle('Education')).toBeInTheDocument();
    expect(screen.getByTitle('Wealth')).toBeInTheDocument();
    expect(screen.getByTitle('Physical')).toBeInTheDocument();
    expect(screen.getByTitle('Mental')).toBeInTheDocument();

    // Column 2 elements — strictly ordered: Career, Employability, Dep, Exp, Mgmt, Tech
    const careerCol = screen.getByTestId('side-hud-full').querySelector('.side-hud__col--career');
    expect(careerCol).toBeInTheDocument();

    const badges = careerCol!.querySelectorAll('.stat-badge');
    expect(badges.length).toBe(6);
    expect(badges[0].id).toBe('stat-career');
    expect(badges[1].id).toBe('stat-employability');
    expect(badges[2].id).toBe('stat-dependability');
    expect(badges[3].id).toBe('stat-experience');
    expect(badges[4].id).toBe('stat-skill-mgmt');
    expect(badges[5].id).toBe('stat-skill-tech');
  });

  it('folds Column 2 in compact mode and allows expanding back to full or minimizing', () => {
    const onToggleFold = vi.fn();

    const { rerender } = render(
      <Dashboard
        player={mockPlayer}
        gameState={mockGameState}
        turn={3}
        hoursPerTurn={30}
        layout="side"
        foldState="full"
        onToggleFold={onToggleFold}
        onOpenInventory={() => {}}
        onOpenSettings={() => {}}
      />
    );

    // In Full mode: Clicking fold triggers compact
    const foldBtn = screen.getByTestId('side-hud-fold');
    fireEvent.click(foldBtn);
    expect(onToggleFold).toHaveBeenCalledWith('compact');

    // Rerender in Compact mode
    rerender(
      <Dashboard
        player={mockPlayer}
        gameState={mockGameState}
        turn={3}
        hoursPerTurn={30}
        layout="side"
        foldState="compact"
        onToggleFold={onToggleFold}
        onOpenInventory={() => {}}
        onOpenSettings={() => {}}
      />
    );

    expect(screen.getByTestId('side-hud-compact')).toBeInTheDocument();
    // Career column is folded away
    expect(screen.getByTestId('side-hud-compact').querySelector('.side-hud__col--career')).toBeNull();

    // Column 1 is still visible
    expect(screen.getByTitle('Happiness')).toBeInTheDocument();

    // Expand Career button
    const expandCareerBtn = screen.getByTestId('side-hud-expand-career');
    fireEvent.click(expandCareerBtn);
    expect(onToggleFold).toHaveBeenCalledWith('full');

    // Minimize button
    const minimizeBtn = screen.getByTestId('side-hud-minimize');
    fireEvent.click(minimizeBtn);
    expect(onToggleFold).toHaveBeenCalledWith('minimized');
  });

  it('renders minimized tab when foldState is minimized', () => {
    const onToggleFold = vi.fn();

    render(
      <Dashboard
        player={mockPlayer}
        gameState={mockGameState}
        turn={3}
        hoursPerTurn={30}
        layout="side"
        foldState="minimized"
        onToggleFold={onToggleFold}
        onOpenInventory={() => {}}
        onOpenSettings={() => {}}
      />
    );

    expect(screen.getByTestId('side-hud-minimized')).toBeInTheDocument();
    const expandBtn = screen.getByTestId('side-hud-expand');
    fireEvent.click(expandBtn);
    expect(onToggleFold).toHaveBeenCalledWith('compact');
  });
});
