import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createPlayerState, createDefaultGoalAllotment } from '../src/engine/stateFactories';
import { scaleParkCard, handleRelaxParkAction, handleWorkoutParkAction, PARK_RELAX_CARDS, PARK_WORKOUT_CARDS, PARK_HAZARD_CARDS } from '../src/engine/actions/parkActions';
import { ParkHazardModal } from '../src/ui/buildings/park/ParkHazardModal';
import { ParkAssessmentModal } from '../src/ui/buildings/park/ParkAssessmentModal';
import { BuildingModal } from '../src/ui/BuildingModal';
import { loadCampaign, type CampaignBundle } from '../src/engine/dataLoader';
import { Random } from '../src/utils/rng';

describe('Park System Enhancements (Advanced 2000)', () => {
  let campaign2000: CampaignBundle;

  beforeAll(async () => {
    campaign2000 = await loadCampaign('advanced_2000');
  });
  describe('scaleParkCard for Partial Actions', () => {
    it('scales mental and physical stats to conditionResolution (0.5) when ratio is 0.5', () => {
      const card = {
        type: 'park_encounter' as const,
        title: 'Test Card',
        description: 'Testing scaling',
        mentalAmount: 2,
        physicalAmount: 1,
        maxPhysAmount: 1,
        socialAmount: 2,
        cashAmount: 10
      };

      const scaled = scaleParkCard(card, 0.5, 0.5);
      expect(scaled.mentalAmount).toBe(1);
      expect(scaled.physicalAmount).toBe(0.5);
      expect(scaled.maxPhysAmount).toBe(0.5);
      expect(scaled.socialAmount).toBe(1);
      expect(scaled.cashAmount).toBe(5);
    });

    it('ensures non-zero scaled values do not round down to 0 if original value was non-zero', () => {
      const card = {
        type: 'park_encounter' as const,
        title: 'Light Card',
        description: 'Testing non-zero preservation',
        mentalAmount: 1,
        maxPhysAmount: 1
      };

      // 1h spent out of 3h -> ratio = 1/3 = 0.33
      const scaled = scaleParkCard(card, 1 / 3, 0.5);
      expect(scaled.mentalAmount).toBe(0.5);
      expect(scaled.maxPhysAmount).toBe(0.5);
    });
  });

  describe('ParkHazardModal', () => {
    it('renders hazard title, description, and modifier pills, and dismisses on acknowledge', () => {
      const onClose = vi.fn();
      const hazardCard = {
        type: 'park_encounter' as const,
        cardId: 'hazard_dog_poop',
        title: 'Stepped in Dog Mess',
        description: 'An irresponsible pet owner ruined your shoes and completely spoiled your mood.',
        icon: '💩',
        durabilityAmount: -1,
        mentalAmount: -1
      };

      render(<ParkHazardModal hazard={hazardCard} onClose={onClose} armDelayMs={0} />);

      expect(screen.getByTestId('park-hazard-modal')).toBeInTheDocument();
      expect(screen.getByText('Stepped in Dog Mess')).toBeInTheDocument();
      expect(screen.getByText(/ruined your shoes/i)).toBeInTheDocument();
      expect(screen.getByText('💩')).toBeInTheDocument();

      const okBtn = screen.getByTestId('park-hazard-ok-btn');
      fireEvent.click(okBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('dismisses on Escape key when armed', () => {
      const onClose = vi.fn();
      const hazardCard = {
        type: 'park_encounter' as const,
        cardId: 'hazard_persistent_bee',
        title: 'Persistent Bee',
        description: 'A relentless bumblebee buzzes inches from your face.',
        icon: '🐝',
        mentalAmount: -1
      };

      render(<ParkHazardModal hazard={hazardCard} onClose={onClose} armDelayMs={0} />);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('ParkAssessmentModal (? Help Button)', () => {
    const getMockPlayer = () => {
      const p = createPlayerState(
        'p1',
        'Alex',
        false,
        createDefaultGoalAllotment(),
        'node_park_campus',
        campaign2000.config
      );
      p.money = 250;
      p.physicalCondition = 40;
      p.mentalCondition = 40;
      return p;
    };

    it('renders Relax assessment with 75% encounter odds, 25% hazard risk, and tab navigation', () => {
      const onClose = vi.fn();
      const mockPlayer = getMockPlayer();
      render(
        <ParkAssessmentModal
          mode="relax"
          player={mockPlayer}
          rules={campaign2000.config.gameRules}
          onClose={onClose}
        />
      );

      expect(screen.getByTestId('park-assessment-modal')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();

      // Check Cards tab
      fireEvent.click(screen.getByTestId('park-help-tab-cards'));
      expect(screen.getByText('Park Chess Match')).toBeInTheDocument();
      expect(screen.getByText('Friendly Golden Retriever')).toBeInTheDocument();

      // Check Hazards tab with dynamic pickpocket calculation (15% of $250 = $37)
      fireEvent.click(screen.getByTestId('park-help-tab-hazards'));
      expect(screen.getByText('Stepped in Dog Mess')).toBeInTheDocument();
      expect(screen.getByText('Sly Pickpocket')).toBeInTheDocument();
      expect(screen.getByText(/\$37 cash/i)).toBeInTheDocument();

      // Close button
      fireEvent.click(screen.getByTestId('btn-close-park-help'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calculates fatigue mistake risk when physical or mental condition is low in workout mode', () => {
      const lowCondPlayer = getMockPlayer();
      lowCondPlayer.physicalCondition = 16;
      lowCondPlayer.mentalCondition = 18;

      render(
        <ParkAssessmentModal
          mode="workout"
          player={lowCondPlayer}
          rules={campaign2000.config.gameRules}
          onClose={vi.fn()}
        />
      );

      // (20 - 16)*0.05 + (20 - 18)*0.05 = 0.20 + 0.10 = 30% strain risk
      expect(screen.getByText('30%')).toBeInTheDocument();
      expect(screen.getByText(/Low condition risk/i)).toBeInTheDocument();
    });

    it('indicates overtraining warning if player already worked out this turn', () => {
      const overtrainedPlayer = getMockPlayer();
      overtrainedPlayer.turnFlags = {
        ...overtrainedPlayer.turnFlags,
        parkWorkoutsThisTurn: 1
      };

      render(
        <ParkAssessmentModal
          mode="workout"
          player={overtrainedPlayer}
          rules={campaign2000.config.gameRules}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/Overtraining Notice:/i)).toBeInTheDocument();
    });
  });

  describe('BuildingModal Park Integration', () => {
    it('opens ParkAssessmentModal upon clicking the ? button on Relax in Park', () => {
      const player = createPlayerState(
        'p1',
        'Alex',
        false,
        createDefaultGoalAllotment(),
        'node_park_campus',
        campaign2000.config
      );

      render(
        <BuildingModal
          player={player}
          campaign={campaign2000}
          currentBuildingId="campus_park"
          turn={1}
          rules={campaign2000.config.gameRules}
          onAction={vi.fn().mockResolvedValue({})}
          onClose={vi.fn()}
        />
      );

      const helpRelaxBtn = screen.getByTestId('park-help-relax');
      fireEvent.click(helpRelaxBtn);

      expect(screen.getByTestId('park-assessment-modal')).toBeInTheDocument();
      expect(screen.getByText(/Park Relax — Encounter & Outcome Assessment/i)).toBeInTheDocument();
    });

    it('opens ParkAssessmentModal upon clicking the ? button on Workout in Park', () => {
      const player = createPlayerState(
        'p1',
        'Alex',
        false,
        createDefaultGoalAllotment(),
        'node_park_campus',
        campaign2000.config
      );

      render(
        <BuildingModal
          player={player}
          campaign={campaign2000}
          currentBuildingId="campus_park"
          turn={1}
          rules={campaign2000.config.gameRules}
          onAction={vi.fn().mockResolvedValue({})}
          onClose={vi.fn()}
        />
      );

      const helpWorkoutBtn = screen.getByTestId('park-help-workout');
      fireEvent.click(helpWorkoutBtn);

      expect(screen.getByTestId('park-assessment-modal')).toBeInTheDocument();
      expect(screen.getByText(/Park Workout — Training & Hazard Assessment/i)).toBeInTheDocument();
    });

    it('renders ParkHazardModal when a park_hazard miniGame is pending with environmental hazard', () => {
      const player = createPlayerState(
        'p1',
        'Alex',
        false,
        createDefaultGoalAllotment(),
        'node_park_campus',
        campaign2000.config
      );
      player.pendingMiniGame = {
        gameType: 'park_hazard',
        title: 'Park Hazard!',
        subtitle: 'An unexpected incident interrupted your visit:',
        options: [
          {
            type: 'park_encounter',
            cardId: 'hazard_dog_poop',
            title: 'Stepped in Dog Mess',
            description: 'An irresponsible pet owner ruined your shoes.',
            icon: '💩',
            durabilityAmount: -1,
            mentalAmount: -1
          }
        ]
      };

      const mockOnAction = vi.fn().mockResolvedValue({});

      render(
        <BuildingModal
          player={player}
          campaign={campaign2000}
          currentBuildingId="campus_park"
          turn={1}
          rules={campaign2000.config.gameRules}
          onAction={mockOnAction}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByTestId('park-hazard-modal')).toBeInTheDocument();
      expect(screen.getByText('Stepped in Dog Mess')).toBeInTheDocument();

      const okBtn = screen.getByTestId('park-hazard-ok-btn');
      fireEvent.click(okBtn);

      expect(mockOnAction).toHaveBeenCalledWith({
        type: 'resolve_mini_game',
        choiceIndex: 0
      });
    });

    it('renders StreetRobberyModal when a pickpocket hazard steals cash', () => {
      const player = createPlayerState(
        'p1',
        'Alex',
        false,
        createDefaultGoalAllotment(),
        'node_park_campus',
        campaign2000.config
      );
      player.pendingMiniGame = {
        gameType: 'park_hazard',
        title: 'Park Hazard!',
        subtitle: 'A pickpocket struck:',
        options: [
          {
            type: 'park_encounter',
            cardId: 'hazard_pickpocket',
            title: 'Sly Pickpocket',
            description: 'A pickpocket lifted $45 cash!',
            icon: '🦹',
            cashAmount: -45,
            mentalAmount: -2
          }
        ]
      };

      const mockOnAction = vi.fn().mockResolvedValue({});

      render(
        <BuildingModal
          player={player}
          campaign={campaign2000}
          currentBuildingId="campus_park"
          turn={1}
          rules={{ ...campaign2000.config.gameRules, guiStyle: 'modern' } as any}
          onAction={mockOnAction}
          onClose={vi.fn()}
        />
      );

      // Verify StreetRobberyModal is opened
      expect(screen.getByText(/Street Robbery/i)).toBeInTheDocument();
      expect(screen.getByText(/45/)).toBeInTheDocument();

      const okBtn = screen.getByTestId('street-robbery-ok-btn');
      fireEvent.click(okBtn);

      expect(mockOnAction).toHaveBeenCalledWith({
        type: 'resolve_mini_game',
        choiceIndex: 0
      });
    });
  });

  describe('Partial Actions in parkActions', () => {
    it('scales card modifiers proportionally when actualHours < costHours in relax_park', () => {
      const player = createPlayerState(
        'p1',
        'Alex',
        false,
        createDefaultGoalAllotment(),
        'node_park_campus',
        campaign2000.config
      );
      player.hoursRemaining = 1.5; // 1.5h out of 3h -> ratio 0.5
      player.physicalCondition = 30;
      player.mentalCondition = 30;

      const context = {
        campaign: campaign2000,
        rules: {
          ...campaign2000.config.gameRules,
          allowPartialHours: true,
          proportionalDivisibleActions: true,
          conditionResolution: 0.5
        },
        turn: 1,
        economicIndex: 100,
        rng: new Random(1),
        state: {} as any
      };

      // Mock RNG to guarantee good encounter (roll > 0.25)
      context.rng = {
        next: () => 0.8,
        nextInt: () => 0,
        getState: () => 1,
        setState: () => {}
      } as any;

      const res = handleRelaxParkAction(player, { type: 'relax_park' }, context);
      expect(res.nextPlayer.hoursRemaining).toBe(0);
      expect(res.nextPlayer.pendingMiniGame).toBeDefined();

      const options = res.nextPlayer.pendingMiniGame!.options;
      // All cards should be scaled by ratio 0.5
      for (const opt of options) {
        if (opt.mentalAmount) {
          // In PARK_RELAX_CARDS mentalAmount is 1 or 2. Scaled by 0.5 -> 0.5 or 1
          expect([0.5, 1]).toContain(opt.mentalAmount);
        }
      }
    });

    it('scales workout card maxPhysical conditioning proportionally when actualHours < costHours', () => {
      const player = createPlayerState(
        'p1',
        'Alex',
        false,
        createDefaultGoalAllotment(),
        'node_park_campus',
        campaign2000.config
      );
      player.hoursRemaining = 1.5; // ratio 0.5
      player.physicalCondition = 30;
      player.mentalCondition = 30;

      const context = {
        campaign: campaign2000,
        rules: {
          ...campaign2000.config.gameRules,
          allowPartialHours: true,
          proportionalDivisibleActions: true,
          conditionResolution: 0.5
        },
        turn: 1,
        economicIndex: 100,
        rng: {
          next: () => 0.8, // good encounter
          nextInt: () => 0,
          getState: () => 1,
          setState: () => {}
        } as any,
        state: {} as any
      };

      const res = handleWorkoutParkAction(player, { type: 'workout_park' }, context);
      expect(res.nextPlayer.hoursRemaining).toBe(0);
      expect(res.nextPlayer.pendingMiniGame).toBeDefined();

      const options = res.nextPlayer.pendingMiniGame!.options;
      for (const opt of options) {
        if (opt.maxPhysAmount) {
          // In PARK_WORKOUT_CARDS maxPhysAmount is 1 (or 2). Scaled by 0.5 -> 0.5 (or 1)
          expect([0.5, 1]).toContain(opt.maxPhysAmount);
        }
      }
    });

    it('awards baseline rest on click alongside event card pendingMiniGame', () => {
      const player = createPlayerState(
        'p1',
        'Alex',
        false,
        createDefaultGoalAllotment(),
        'node_park_campus',
        campaign2000.config
      );
      player.hoursRemaining = 20;
      player.physicalCondition = 30;
      player.mentalCondition = 30;

      const context = {
        campaign: campaign2000,
        rules: campaign2000.config.gameRules,
        turn: 1,
        economicIndex: 100,
        rng: {
          next: () => 0.8, // good encounter
          nextInt: () => 0,
          getState: () => 1,
          setState: () => {}
        } as any,
        state: {} as any
      };

      const res = handleRelaxParkAction(player, { type: 'relax_park' }, context);
      // Baseline rest is +2 Physical, +2 Mental
      expect(res.nextPlayer.physicalCondition).toBe(32);
      expect(res.nextPlayer.mentalCondition).toBe(32);
      expect(res.nextPlayer.hoursRemaining).toBe(17);
      expect(res.nextPlayer.pendingMiniGame).toBeDefined();
      expect(res.nextPlayer.pendingMiniGame?.options.length).toBe(3);
    });

    it('awards baseline workout conditioning on click alongside event card pendingMiniGame', () => {
      const player = createPlayerState(
        'p1',
        'Alex',
        false,
        createDefaultGoalAllotment(),
        'node_park_campus',
        campaign2000.config
      );
      player.hoursRemaining = 20;
      player.physicalCondition = 30;
      player.physicalConditionMax = 50;
      player.mentalCondition = 30;

      const context = {
        campaign: campaign2000,
        rules: campaign2000.config.gameRules,
        turn: 1,
        economicIndex: 100,
        rng: {
          next: () => 0.8, // good encounter
          nextInt: () => 0,
          getState: () => 1,
          setState: () => {}
        } as any,
        state: {} as any
      };

      const res = handleWorkoutParkAction(player, { type: 'workout_park' }, context);
      // Baseline workout: +1 Max Phys, -1 Phys, +1 Mental
      expect(res.nextPlayer.physicalConditionMax).toBe(51);
      expect(res.nextPlayer.physicalCondition).toBe(29);
      expect(res.nextPlayer.mentalCondition).toBe(31);
      expect(res.nextPlayer.hoursRemaining).toBe(17);
      expect(res.nextPlayer.pendingMiniGame).toBeDefined();
    });
  });
});
