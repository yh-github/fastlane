import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { loadCampaign } from '../src/engine/dataLoader';
import { createInitialGameState } from '../src/engine/stateFactories';
import { processTurnStart } from '../src/engine/turnProcessor';
import { gameReducer } from '../src/engine/gameReducer';
import { calcRequiredLessons } from '../src/engine/educationEngine';
import { Random } from '../src/utils/rng';
import { UniversityRegistry } from '../src/ui/buildings/UniversityRegistry';

describe('Advanced 2000 Education Progress & Extra Credit Discounts', () => {
  it('all degrees in advanced_2000 curriculum have base lessonsRequired of 10', async () => {
    const campaign = await loadCampaign('advanced_2000');
    for (const degree of campaign.education) {
      expect(
        degree.lessonsRequired,
        `Degree ${degree.id} (${degree.name}) should have 10 base lessons, but got ${degree.lessonsRequired}`
      ).toBe(10);
    }
  });

  it('progresses by 12.5 pp per 6h study click for publishing and medical_school when owning computer and all 3 books (-2 lessons)', async () => {
    const campaign = await loadCampaign('advanced_2000');
    const baseInitialState = createInitialGameState(
      campaign,
      [{ name: 'Player 1', isAi: false, goals: { wealth: 25, happiness: 25, education: 25, career: 25 } }],
      'node_low_cost',
      campaign.config.gameRules,
      12345
    );
    const state = processTurnStart({ ...baseInitialState, phase: 'playing' }, campaign);
    let player = {
      ...state.players[0],
      money: 50000,
      hoursRemaining: 50,
      degrees: ['academic', 'graduate_school', 'life_sciences', 'physiology', 'biochemistry'],
      inventory: {
        ...state.players[0].inventory,
        appliances: [{ id: 'computer', purchasePrice: 1599, purchaseSource: 'socket_city', condition: 'new' as const }],
        books: ['dictionary', 'encyclopedia', 'atlas']
      }
    };

    const context = {
      campaign,
      rules: state.rules,
      turn: state.turn,
      economicIndex: state.economicIndex,
      rng: new Random(state.rngState),
      state
    };

    // Publishing test
    const pubDegree = campaign.education.find(d => d.id === 'publishing')!;
    expect(calcRequiredLessons(player, pubDegree, context.rules)).toBe(8);

    player = gameReducer(player, { type: 'enroll', degreeId: 'publishing' }, context).updatedPlayer;
    const pubStudyRes = gameReducer(player, { type: 'study', degreeId: 'publishing' }, context);
    
    // With -2 lessons discount, required is 8 lessons -> 100 / 8 = 12.5 pp per click (NOT 10 pp!)
    expect(pubStudyRes.updatedPlayer.enrolledClasses['publishing']).toBe(12.5);

    // Medical school test
    const medDegree = campaign.education.find(d => d.id === 'medical_school')!;
    expect(calcRequiredLessons(player, medDegree, context.rules)).toBe(8);

    player = gameReducer(player, { type: 'enroll', degreeId: 'medical_school' }, context).updatedPlayer;
    const medStudyRes = gameReducer(player, { type: 'study', degreeId: 'medical_school' }, context);

    // With -2 lessons discount, required is 8 lessons -> 100 / 8 = 12.5 pp per click (NOT 10 pp!)
    expect(medStudyRes.updatedPlayer.enrolledClasses['medical_school']).toBe(12.5);
  });

  it('renders UniversityRegistry with -2 lessons Extra Credit badge and correct required lessons for publishing', async () => {
    const campaign = await loadCampaign('advanced_2000');
    const mockPlayer = {
      name: 'Player 1',
      money: 5000,
      hoursRemaining: 30,
      degrees: ['academic', 'graduate_school'],
      enrolledClasses: {
        publishing: 12.5
      },
      inventory: {
        appliances: [{ id: 'computer', purchasePrice: 1599, purchaseSource: 'socket_city', condition: 'new' }],
        books: ['dictionary', 'encyclopedia', 'atlas']
      }
    } as any;

    render(
      <UniversityRegistry
        player={mockPlayer}
        campaign={campaign}
        rules={{ ...campaign.config.gameRules, percentageEducation: true, helpfulUI: true } as any}
        onAction={vi.fn().mockResolvedValue({})}
      />
    );

    const extraCreditBadge = screen.getByTestId('university-extra-credit-badge');
    expect(extraCreditBadge).toBeInTheDocument();
    expect(extraCreditBadge.textContent).toContain('-2 lessons');

    // Progress text for publishing should show 12.5% / 100%
    expect(screen.getByText('12.5% / 100%')).toBeInTheDocument();
  });
});
