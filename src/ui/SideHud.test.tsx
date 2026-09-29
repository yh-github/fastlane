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

  it('in Advanced mode, Side HUD renders Lifestyle and Wellbeing win conditions instead of Happiness', () => {
    const advancedCampaign = {
      config: {
        winConditions: [
          { stat: 'wealth', target: 100, label: 'Wealth' },
          { stat: 'lifestyle', target: 100, label: 'Lifestyle' },
          { stat: 'education', target: 100, label: 'Education' },
          { stat: 'career', target: 100, label: 'Career' },
          { stat: 'wellbeing', target: 100, label: 'Well-being' }
        ]
      },
      jobs: []
    } as any;

    const advPlayer = {
      ...mockPlayer,
      lifestyle: 42,
      goalAllotment: {
        wealth: 50,
        lifestyle: 50,
        education: 50,
        career: 50,
        wellbeing: 50
      }
    } as any;

    render(
      <Dashboard
        player={advPlayer}
        gameState={mockGameState}
        campaign={advancedCampaign}
        turn={3}
        hoursPerTurn={30}
        layout="side"
        foldState="full"
        onOpenInventory={() => {}}
        onOpenSettings={() => {}}
      />
    );

    // Should render Lifestyle and Wellbeing
    expect(screen.getByTitle('Lifestyle')).toBeInTheDocument();
    expect(screen.getByTitle('Well-being')).toBeInTheDocument();
    expect(screen.getByTitle('Wealth')).toBeInTheDocument();
    expect(screen.getByTitle('Education')).toBeInTheDocument();

    // Should NOT render Happiness badge
    expect(screen.queryByTitle('Happiness')).toBeNull();
  });

  it('in base mode (helpfulUI: true, useSkills: false), neither Side HUD nor Top HUD renders Mgmt/Tech skill badges', () => {
    const baseGameState = {
      rules: {
        helpfulUI: true,
        useSkills: false,
        usePhysicalMentalConditions: false,
        hudLayout: 'side' as const
      },
      turn: 1,
      economicIndex: 0
    } as any;

    const { rerender } = render(
      <Dashboard
        player={mockPlayer}
        gameState={baseGameState}
        turn={1}
        hoursPerTurn={30}
        layout="side"
        foldState="full"
        onOpenInventory={() => {}}
        onOpenSettings={() => {}}
      />
    );

    // Side HUD has Career, Employability, Dep, Exp, but NOT Mgmt or Tech
    const careerCol = screen.getByTestId('side-hud-full').querySelector('.side-hud__col--career');
    expect(careerCol).toBeInTheDocument();
    expect(careerCol!.querySelector('#stat-career')).toBeInTheDocument();
    expect(careerCol!.querySelector('#stat-employability')).toBeInTheDocument();
    expect(careerCol!.querySelector('#stat-dependability')).toBeInTheDocument();
    expect(careerCol!.querySelector('#stat-experience')).toBeInTheDocument();
    expect(careerCol!.querySelector('#stat-skill-mgmt')).toBeNull();
    expect(careerCol!.querySelector('#stat-skill-tech')).toBeNull();

    // Rerender as Top HUD: also must NOT render Mgmt or Tech
    rerender(
      <Dashboard
        player={mockPlayer}
        gameState={baseGameState}
        turn={1}
        hoursPerTurn={30}
        layout="top"
        onOpenInventory={() => {}}
        onOpenSettings={() => {}}
      />
    );

    expect(screen.queryByTitle('Mgmt')).toBeNull();
    expect(screen.queryByTitle('Tech')).toBeNull();
  });

  it('auto layout detects landscape (side HUD) vs portrait (top HUD)', () => {
    const autoGameState = {
      rules: {
        helpfulUI: true,
        hudLayout: 'auto' as const
      },
      turn: 1,
      economicIndex: 0
    } as any;

    // Simulate landscape viewport
    window.innerWidth = 1024;
    window.innerHeight = 768;

    const { rerender } = render(
      <Dashboard
        player={mockPlayer}
        gameState={autoGameState}
        turn={1}
        hoursPerTurn={30}
        layout="auto"
        foldState="full"
        onOpenInventory={() => {}}
        onOpenSettings={() => {}}
      />
    );

    // Should resolve to Side HUD
    expect(screen.getByTestId('side-hud-full')).toBeInTheDocument();

    // Simulate portrait viewport
    window.innerWidth = 400;
    window.innerHeight = 800;

    rerender(
      <Dashboard
        player={mockPlayer}
        gameState={autoGameState}
        turn={1}
        hoursPerTurn={30}
        layout="auto"
        foldState="full"
        onOpenInventory={() => {}}
        onOpenSettings={() => {}}
      />
    );

    // Should resolve to Top HUD (no side HUD testid)
    expect(screen.queryByTestId('side-hud-full')).toBeNull();
    expect(screen.getByText(/hrs left/i)).toBeInTheDocument();
  });
});
