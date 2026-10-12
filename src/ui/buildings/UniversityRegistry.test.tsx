import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UniversityRegistry } from "./UniversityRegistry";

describe("UniversityRegistry", () => {
  it('UniversityRegistry renders percentage progress bar when percentageEducation is enabled', () => {
    const mockPlayer = {
      name: 'Tester',
      money: 1000,
      hoursRemaining: 4,
      degrees: [],
      enrolledClasses: {
        'trade_school': 45.5
      },
      inventory: {}
    } as any;

    const mockCampaign = {
      degrees: [
        {
          id: 'trade_school',
          name: 'Trade School',
          baseTuitionFee: 100,
          lessonsRequired: 10,
          prerequisites: [],
          rewards: { dependability: 5, happiness: 10, maxDepBoost: 5, maxExpBoost: 5 }
        }
      ],
      config: {
        timeRules: { studySessionCost: 6 },
        statRules: {}
      }
    } as any;

    const mockOnAction = vi.fn();

    render(
      <UniversityRegistry
        player={mockPlayer}
        onAction={mockOnAction}
        campaign={mockCampaign}
        rules={{ percentageEducation: true, helpfulUI: true } as any}
      />
    );

    expect(screen.getByText(/45.5% \/ 100%/i)).toBeInTheDocument();
    const studyBtn = screen.getByTestId('study-trade_school');
    expect(studyBtn.textContent).toContain('Study');
    expect(studyBtn.textContent).toContain('4h');

    fireEvent.click(studyBtn);
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'study', degreeId: 'trade_school' });
  });

  it('UniversityRegistry handles dedicated bottom ENROLL button, confirmation dialog, and class selection with credits', () => {
    const mockPlayerNoCredits = {
      name: 'Tester',
      money: 500,
      hoursRemaining: 50,
      degrees: [],
      enrolledClasses: {},
      enrolledCredits: 0,
      inventory: {}
    } as any;

    const mockCampaign = {
      degrees: [
        {
          id: 'trade_school',
          name: 'Trade School',
          baseTuitionFee: 100,
          lessonsRequired: 10,
          prerequisites: [],
          rewards: { dependability: 5, happiness: 10, maxDepBoost: 5, maxExpBoost: 5 }
        }
      ],
      config: {
        timeRules: { studySessionCost: 6 },
        statRules: {}
      }
    } as any;

    const mockOnAction = vi.fn();

    const { unmount } = render(
      <UniversityRegistry
        player={mockPlayerNoCredits}
        onAction={mockOnAction}
        campaign={mockCampaign}
        rules={{ helpfulUI: true } as any}
      />
    );

    // Verify dedicated bottom ENROLL button is present
    const enrollBtn = screen.getByTestId('btn-enroll');
    expect(enrollBtn).toBeInTheDocument();
    expect(enrollBtn.textContent).toContain('ENROLL');

    // Individual class card should NOT have an enroll button when credits === 0 and should NOT say Available
    expect(screen.queryByTestId('choose-class-trade_school')).not.toBeInTheDocument();
    expect(screen.queryByText('Available')).not.toBeInTheDocument();
    expect(screen.getByTestId('unenrolled-class-trade_school')).toBeInTheDocument();

    // Click ENROLL button opens confirmation dialog
    fireEvent.click(enrollBtn);
    expect(screen.getByTestId('enroll-confirm-dialog')).toBeInTheDocument();
    expect(screen.getByText(/Enroll in university course/i)).toBeInTheDocument();

    // Click confirm in dialog
    const confirmBtn = screen.getByTestId('btn-confirm-enroll');
    fireEvent.click(confirmBtn);
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'buy_education_credit', baseFee: 100 });
    expect(screen.queryByTestId('enroll-confirm-dialog')).not.toBeInTheDocument();

    unmount();

    // Render with 1 credit:
    const mockPlayerWithCredits = {
      ...mockPlayerNoCredits,
      enrolledCredits: 1
    };

    render(
      <UniversityRegistry
        player={mockPlayerWithCredits}
        onAction={mockOnAction}
        campaign={mockCampaign}
        rules={{ helpfulUI: true } as any}
      />
    );

    // Verify credits banner is displayed
    expect(screen.getByTestId('enrolled-credits-banner')).toBeInTheDocument();
    expect(screen.getByText(/Enrolled Class Credits: 1/i)).toBeInTheDocument();

    // Verify class card now has "Choose Class" button
    const chooseClassBtn = screen.getByTestId('choose-class-trade_school');
    expect(chooseClassBtn).toBeInTheDocument();
    expect(chooseClassBtn.textContent).toContain('Choose Class');

    fireEvent.click(chooseClassBtn);
    expect(mockOnAction).toHaveBeenCalledWith({ type: 'enroll', degreeId: 'trade_school' });
  });

  it('UniversityRegistry renders extra credit in title and notifies clerk when clicking unenrolled class', () => {
    const mockPlayerWithComputer = {
      name: 'Tester',
      money: 50,
      hoursRemaining: 50,
      degrees: [],
      enrolledClasses: {},
      enrolledCredits: 0,
      inventory: {
        appliances: [{ id: 'computer' }]
      }
    } as any;

    const mockCampaign = {
      degrees: [
        {
          id: 'trade_school',
          name: 'Trade School',
          baseTuitionFee: 100,
          lessonsRequired: 10,
          prerequisites: [],
          rewards: {}
        }
      ],
      config: {
        timeRules: { studySessionCost: 6 },
        statRules: {}
      }
    } as any;

    const mockSpeak = vi.fn();

    render(
      <UniversityRegistry
        player={mockPlayerWithComputer}
        onAction={vi.fn()}
        campaign={mockCampaign}
        onClerkSpeak={mockSpeak}
      />
    );

    // Extra credit badge is rendered in the title
    const extraCreditBadge = screen.getByTestId('university-extra-credit-badge');
    expect(extraCreditBadge).toBeInTheDocument();
    expect(extraCreditBadge.textContent).toContain('Extra Credit');
    expect(extraCreditBadge.textContent).toContain('-1');

    // Individual card does NOT have a separate bonus tag or tuition
    expect(screen.queryByText('★ Bonus')).not.toBeInTheDocument();
    expect(screen.queryByText(/Tuition:/i)).not.toBeInTheDocument();

    // Clicking unenrolled card calls onClerkSpeak
    const unenrolledCard = screen.getByTestId('unenrolled-class-trade_school');
    fireEvent.click(unenrolledCard);
    expect(mockSpeak).toHaveBeenCalledWith('You are not enrolled in this class.');
  });

});
