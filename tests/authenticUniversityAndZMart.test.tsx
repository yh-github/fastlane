import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AuthenticUniversity } from '../src/ui/buildings/authentic/AuthenticUniversity';
import { AuthenticZMart } from '../src/ui/buildings/authentic/AuthenticZMart';
import { AuthenticEmploymentOffice } from '../src/ui/buildings/authentic/AuthenticEmploymentOffice';

const mockCampaign: any = {
  config: {
    name: '1990_classic_floppy',
    timeRules: {
      totalHoursPerWeekend: 12,
      hoursPerTurn: 12,
      workSessionCost: 6,
      studySessionCost: 5,
      relaxSessionCost: 2,
      pawnTimeCost: 1,
      minTurnHours: 0,
      newspaperCost: 1,
      jobApplicationCost: 4,
    }
  },
  buildings: [
    {
      id: 'university',
      name: 'Hi-Tech U',
      archetype: 'university',
      spritePath: 'images/university.png',
      description: 'Higher education.'
    },
    {
      id: 'z_mart',
      name: 'Z-Mart',
      archetype: 'shop',
      spritePath: 'images/z_mart.png',
      description: 'Department store.',
      inventory: [
        { itemId: 'refrigerator', priceOverride: 650 },
        { itemId: 'stove', priceOverride: 490 },
        { itemId: 'stereo', priceOverride: 450 },
        { itemId: 'color_tv', priceOverride: 349 },
        { itemId: 'bw_tv', priceOverride: 110 },
        { itemId: 'microwave', priceOverride: 220 },
        { itemId: 'vcr', priceOverride: 250 },
        { itemId: 'encyclopedia', priceOverride: 475 },
      ]
    },
    {
      id: 'employment_office',
      name: 'Employment Office',
      archetype: 'employment_office',
      spritePath: 'images/employment.png',
      description: 'Job placement.'
    },
    {
      id: 'factory',
      name: 'Factory',
      archetype: 'factory',
      spritePath: 'images/factory.png',
      description: 'Factory work.'
    }
  ],
  education: [
    { id: 'trade_school', name: 'Trade School', baseTuitionFee: 60, unitsRequired: 10, prerequisites: [] },
    { id: 'junior_college', name: 'Junior College', baseTuitionFee: 50, unitsRequired: 10, prerequisites: [] },
    { id: 'electronics', name: 'Electronics', baseTuitionFee: 75, unitsRequired: 10, prerequisites: ['trade_school'] },
    { id: 'business_admin', name: 'Business Admin', baseTuitionFee: 80, unitsRequired: 10, prerequisites: ['junior_college'] },
  ],
  items: [
    { id: 'refrigerator', name: 'Refrigerator', basePrice: 650 },
    { id: 'stove', name: 'Stove', basePrice: 490 },
    { id: 'stereo', name: 'Stereo', basePrice: 450 },
    { id: 'color_tv', name: 'Color TV', basePrice: 349 },
    { id: 'bw_tv', name: 'Black & White TV', basePrice: 110 },
    { id: 'microwave', name: 'Microwave', basePrice: 220 },
    { id: 'vcr', name: 'VCR', basePrice: 250 },
    { id: 'encyclopedia', name: 'Encyclopedia', basePrice: 475 },
  ],
  jobs: [
    {
      id: 'factory_worker',
      title: 'Assembly Worker',
      locationId: 'factory',
      baseWage: 6,
      requirements: { experience: 0, dependability: 0, degrees: [] }
    },
    {
      id: 'uni_janitor',
      title: 'Janitor',
      locationId: 'university',
      baseWage: 5,
      requirements: { experience: 0, dependability: 0, degrees: [] }
    },
    {
      id: 'zmart_clerk',
      title: 'Clerk',
      locationId: 'z_mart',
      baseWage: 5,
      requirements: { experience: 0, dependability: 0, degrees: [] }
    }
  ]
};

const basePlayer: any = {
  id: 'p1',
  name: 'Jones',
  money: 500,
  savings: 0,
  debt: 0,
  hoursRemaining: 10,
  currentJobId: null,
  degrees: [],
  enrolledClasses: {},
  experience: 0
};

describe('Authentic University (Script 207)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('filters courses by prerequisites: only shows trade_school and junior_college initially', () => {
    render(
      <AuthenticUniversity
        player={basePlayer}
        onAction={vi.fn()}
        onClose={vi.fn()}
        campaign={mockCampaign}
        economicIndex={0}
      />
    );

    // Bookshelf backdrop is visible and perfectly positioned at (71, 42) with 111x63 dimensions
    const shelf = screen.getByTestId('university-bookshelf');
    expect(shelf).toBeInTheDocument();
    expect(shelf).toHaveStyle({ left: '71px', top: '42px', width: '111px', height: '63px' });

    // Trade School and Junior College books are present and vertically stacked on shelves at left: 76px
    const tradeBook = screen.getByTestId('course-book-trade_school');
    const jcBook = screen.getByTestId('course-book-junior_college');
    expect(tradeBook).toBeInTheDocument();
    expect(jcBook).toBeInTheDocument();
    // 2 courses: tradeSchool is upper shelf (80px), juniorCollege is bottom shelf (94px)
    expect(tradeBook).toHaveStyle({ left: '76px', top: '80px', width: '86px', height: '9px', outline: 'none' });
    expect(jcBook).toHaveStyle({ left: '76px', top: '94px', width: '86px', height: '9px', outline: 'none' });

    // Professor talker frame has authentic 1px black right and bottom borders and teal background
    const talkerFrame = screen.getByTestId('university-talker-frame');
    expect(talkerFrame).toBeInTheDocument();
    expect(talkerFrame).toHaveStyle({
      borderRight: '1px solid #000000',
      borderBottom: '1px solid #000000',
      backgroundColor: '#009050',
    });

    // Electronics and Business Admin must NOT be shown (missing prereqs)
    expect(screen.queryByTestId('course-book-electronics')).not.toBeInTheDocument();
    expect(screen.queryByTestId('course-book-business_admin')).not.toBeInTheDocument();
  });

  it('unlocks electronics when trade_school is completed, and removes completed trade_school', () => {
    const playerWithTrade: any = {
      ...basePlayer,
      degrees: ['trade_school']
    };

    render(
      <AuthenticUniversity
        player={playerWithTrade}
        onAction={vi.fn()}
        onClose={vi.fn()}
        campaign={mockCampaign}
        economicIndex={0}
      />
    );

    // Trade School completed -> not on shelf
    expect(screen.queryByTestId('course-book-trade_school')).not.toBeInTheDocument();
    // Junior College and Electronics unlocked
    expect(screen.getByTestId('course-book-junior_college')).toBeInTheDocument();
    expect(screen.getByTestId('course-book-electronics')).toBeInTheDocument();
  });

  it('Enroll button pays the fee (credit); then a class can be picked from the shelf', () => {
    const onAction = vi.fn();
    const { rerender } = render(
      <AuthenticUniversity
        player={basePlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaign}
        economicIndex={0}
      />
    );

    // Clicking a class before enrolling gives the original message and takes no action
    fireEvent.click(screen.getByTestId('course-book-trade_school'));
    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByTestId('university-speech-bubble')).toHaveTextContent('You need to enroll in a class first.');

    fireEvent.click(screen.getByTestId('btn-university-enroll'));
    expect(onAction).toHaveBeenCalledWith({ type: 'buy_education_credit', baseFee: 60 });

    // Credit granted -> picking a book enrolls
    rerender(
      <AuthenticUniversity
        player={{ ...basePlayer, money: 440, enrolledCredits: 1 }}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaign}
        economicIndex={0}
      />
    );
    fireEvent.click(screen.getByTestId('course-book-junior_college'));
    expect(onAction).toHaveBeenCalledWith({ type: 'enroll', degreeId: 'junior_college' });
  });

  it('treats a freshly enrolled class (0 lessons) as enrolled and studies on click', () => {
    const onAction = vi.fn();
    render(
      <AuthenticUniversity
        player={{ ...basePlayer, enrolledClasses: { trade_school: 0 } }}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaign}
        economicIndex={0}
      />
    );
    expect(screen.getByTestId('enrolled-badge-trade_school')).toBeInTheDocument();
    expect(screen.getByTestId('enrolled-badge-trade_school')).toHaveTextContent('10');
    fireEvent.click(screen.getByTestId('course-book-trade_school'));
    expect(onAction).toHaveBeenCalledWith({ type: 'study', degreeId: 'trade_school' });
  });

  it('dispatches study action when an enrolled course book is clicked and reflects bonus credits in remaining lessons count', () => {
    const onAction = vi.fn();
    const enrolledPlayer: any = {
      ...basePlayer,
      enrolledClasses: { trade_school: 3 },
      inventory: { appliances: [{ id: 'computer' }] } // bonus credit reduces required from 10 to 9
    };

    render(
      <AuthenticUniversity
        player={enrolledPlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaign}
        economicIndex={0}
      />
    );

    // Enrolled badge displays 6 remaining (9 required minus 3 completed)
    const badge = screen.getByTestId('enrolled-badge-trade_school');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('6');

    // Click course book to attend class / study
    fireEvent.click(screen.getByTestId('course-book-trade_school'));
    expect(onAction).toHaveBeenCalledWith({ type: 'study', degreeId: 'trade_school' });
  });

  it('displays work button and handles faculty work shift when employed here', () => {
    const onAction = vi.fn();
    const facultyPlayer: any = {
      ...basePlayer,
      currentJobId: 'uni_janitor'
    };

    render(
      <AuthenticUniversity
        player={facultyPlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaign}
        economicIndex={0}
      />
    );

    const workBtn = screen.getByTestId('btn-university-work');
    expect(workBtn).toBeInTheDocument();
    fireEvent.click(workBtn);

    expect(screen.getByTestId('punch-card-anim')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onAction).toHaveBeenCalledWith({ type: 'work', jobId: 'uni_janitor' });
  });
});

describe('Authentic Employment Office (Script 206)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders single-column employer list without scrollbars, switches to jobs view, and returns via Done', () => {
    const handleClose = vi.fn();
    const onAction = vi.fn().mockResolvedValue({ actionLog: { key: 'action.job.gotJob' } });

    render(
      <AuthenticEmploymentOffice
        player={basePlayer}
        onAction={onAction}
        onClose={handleClose}
        campaign={mockCampaign}
        economicIndex={0}
      />
    );

    // Initial View: employers container visible, jobs container NOT visible
    const empContainer = screen.getByTestId('employment-employers-container');
    expect(empContainer).toBeInTheDocument();
    expect(empContainer).toHaveStyle({ overflow: 'hidden' });
    expect(screen.queryByTestId('employment-jobs-container')).not.toBeInTheDocument();

    // Check employer buttons
    expect(screen.getByTestId('employer-factory')).toBeInTheDocument();
    expect(screen.getByTestId('employer-university')).toBeInTheDocument();

    // Click factory employer -> switches to jobs view
    fireEvent.click(screen.getByTestId('employer-factory'));

    // Employers container is gone, jobs container is visible without scrollbars
    expect(screen.queryByTestId('employment-employers-container')).not.toBeInTheDocument();
    const jobsContainer = screen.getByTestId('employment-jobs-container');
    expect(jobsContainer).toBeInTheDocument();
    expect(jobsContainer).toHaveStyle({ overflow: 'hidden' });

    // Header says 'Factory Jobs Available:'
    const header = screen.getByTestId('employment-jobs-header');
    expect(header).toHaveTextContent('Factory Jobs Available:');

    // Factory job is visible
    const jobItem = screen.getByTestId('job-factory_worker');
    expect(jobItem).toBeInTheDocument();

    // Done button now acts as Back (title includes Back)
    const doneBtn = screen.getByTestId('btn-employment-done');
    expect(doneBtn).toHaveAttribute('title', expect.stringContaining('Back to Employers List'));

    // Clicking Done returns to employers view
    fireEvent.click(doneBtn);
    expect(screen.getByTestId('employment-employers-container')).toBeInTheDocument();
    expect(screen.queryByTestId('employment-jobs-container')).not.toBeInTheDocument();

    // Clicking Done from employers view exits the building
    fireEvent.click(screen.getByTestId('btn-employment-done'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('dispatches apply action with jobId and offeredWage when job is clicked and receives congratulations', async () => {
    const onAction = vi.fn().mockResolvedValue({ actionLog: { key: 'action.job.gotJob' } });
    render(
      <AuthenticEmploymentOffice
        player={basePlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaign}
        economicIndex={0}
      />
    );

    // Switch to factory employer
    fireEvent.click(screen.getByTestId('employer-factory'));
    const jobItem = screen.getByTestId('job-factory_worker');
    expect(jobItem).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(jobItem);
    });

    // Must dispatch action type 'apply'
    expect(onAction).toHaveBeenCalledWith({ type: 'apply', jobId: 'factory_worker', offeredWage: 6 });

    // Speech bubble displays congratulatory message
    expect(screen.getByTestId('employment-speech-bubble')).toHaveTextContent(/Congratulations/i);
  });

  it('rejects application if player has less than 4 hours remaining', async () => {
    const onAction = vi.fn();
    const tiredPlayer = { ...basePlayer, hoursRemaining: 2 };
    render(
      <AuthenticEmploymentOffice
        player={tiredPlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaign}
        economicIndex={0}
      />
    );

    fireEvent.click(screen.getByTestId('employer-factory'));
    const jobItem = screen.getByTestId('job-factory_worker');

    await act(async () => {
      fireEvent.click(jobItem);
    });

    // Does NOT dispatch action
    expect(onAction).not.toHaveBeenCalled();
    // Informs player that office is closing
    expect(screen.getByTestId('employment-speech-bubble')).toHaveTextContent(/closing/i);
  });
});

describe('Authentic Z-Mart (Script 211)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays exactly 6 weekly stock items with canonical campaign names and no pagination', () => {
    render(
      <AuthenticZMart
        player={basePlayer}
        onAction={vi.fn()}
        onClose={vi.fn()}
        campaign={mockCampaign}
        economicIndex={0}
      />
    );

    // Exactly 6 items displayed
    const items = screen.getAllByTestId(/^z-mart-item-/);
    expect(items).toHaveLength(6);

    // Canonical item names are used
    expect(items[0]).toHaveTextContent(/Refrigerator|Stove|Stereo|Color TV/);
    // No weird mock names
    expect(screen.queryByText(/Truman Capote/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Baseball Tix/)).not.toBeInTheDocument();
  });

  it('dispatches buy action when an item is clicked', () => {
    const onAction = vi.fn();
    const richPlayer = { ...basePlayer, money: 5000 };
    render(
      <AuthenticZMart
        player={richPlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaign}
        economicIndex={0}
      />
    );

    const items = screen.getAllByTestId(/^z-mart-item-/);
    fireEvent.click(items[0]);

    expect(onAction).toHaveBeenCalledWith({ type: 'buy', itemId: expect.any(String) });
  });

  it('displays work button and dispatches work action when employed at Z-Mart', () => {
    const onAction = vi.fn();
    const zmartClerkPlayer: any = {
      ...basePlayer,
      currentJobId: 'zmart_clerk'
    };

    render(
      <AuthenticZMart
        player={zmartClerkPlayer}
        onAction={onAction}
        onClose={vi.fn()}
        campaign={mockCampaign}
        economicIndex={0}
      />
    );

    const workBtn = screen.getByTestId('btn-z-mart-work');
    expect(workBtn).toBeInTheDocument();
    fireEvent.click(workBtn);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onAction).toHaveBeenCalledWith({ type: 'work', jobId: 'zmart_clerk' });
  });
});
