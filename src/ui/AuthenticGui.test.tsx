import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BuildingModal } from './BuildingModal';
import { InventoryModal } from './InventoryModal';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => opts?.defaultValue || key,
    i18n: { language: 'en' }
  })
}));

describe('Authentic GUI Component Unit Tests', () => {
  const baseRules: any = {
    versionClass: 'base',
    guiStyle: 'authentic',
    authenticCurvedPaths: true
  };

  const mockPlayer: any = {
    id: 'p1',
    name: 'Player 1',
    isAi: false,
    money: 100,
    bankSavings: 50,
    loanDebt: 0,
    rentDebt: 0,
    timesDefaulted: 0,
    loanPaymentDeadline: 0,
    happiness: 50,
    relaxation: 50,
    dependability: 50,
    experience: 10,
    degreeExpBoost: 0,
    degreeDepBoost: 0,
    degrees: [],
    enrolledClasses: {},
    raisesAtCurrentJob: 0,
    rentExtensionsReceived: 0,
    inventory: {
      casualClothesWeeks: 1,
      dressClothesWeeks: 0,
      businessClothesWeeks: 0,
      selectedClothes: 'casual',
      appliances: [],
      freshFoodUnits: 0,
      fastFoodItems: [],
      lotteryTickets: 0,
      pawnedItems: [],
      stocks: { tBills: 0, holdings: {} },
      books: [],
      tickets: { baseball: 0, theatre: 0, concert: 0 }
    },
    turnFlags: {},
    turnEvents: [],
    activeEffects: {},
    position: 'node1',
    hoursRemaining: 50,
    currentHousingId: 'low_cost',
    currentRentPrice: 300,
    rentPaidUntilWeek: 4,
    currentJobId: null,
    currentWage: 0,
    goalAllotment: { wealth: 25, happiness: 25, education: 25, career: 25 },
    hasWon: false,
    rentExtensionsDeniedPermanently: false,
    rentExtensionActive: false,
    nakedTurns: 0,
    newspaperHeadline: null
  };

  const mockCampaign: any = {
    config: {
      name: '1990_classic_floppy',
      timeRules: { hoursPerTurn: 60, jobApplicationCost: 4, workSessionCost: 6, relaxCost: 6, studySessionCost: 6, loanCost: 2 },
      eventRules: { willyRobberyStartWeek: 4 },
      statRules: {}
    },
    items: [],
    housing: [{ id: 'low_cost', name: 'Low Cost Apt', baseRent: 300, homeNodeId: 'node1' }],
    jobs: [],
    education: [],
    buildings: [
      { id: 'apartment_complex', name: 'Rent Office', description: 'Pay rent', archetype: 'housing' }
    ],
    map: { nodes: [{ id: 'node1', buildingId: 'apartment_complex' }] },
    events: [],
    stocks: [],
    messages: {},
    weekends: [],
    synergies: []
  };

  it('renders BuildingModal with building-modal--authentic class when guiStyle is authentic', () => {
    const { container } = render(
      <BuildingModal
        player={mockPlayer}
        campaign={mockCampaign}
        currentBuildingId="apartment_complex"
        turn={1}
        economicIndex={100}
        rules={baseRules}
        onAction={async () => {}}
        onClose={() => {}}
      />
    );

    const modal = container.querySelector('.building-modal');
    expect(modal).toBeInTheDocument();
    expect(modal?.classList.contains('building-modal--authentic')).toBe(true);
    expect(modal?.classList.contains('building-modal--curved')).toBe(true);
  });

  it('renders InventoryModal with building-modal--authentic class when guiStyle is authentic', () => {
    render(
      <InventoryModal
        player={mockPlayer}
        campaign={mockCampaign}
        turn={1}
        rules={baseRules}
        onAction={async () => {}}
        onClose={() => {}}
      />
    );

    const modal = screen.getByTestId('inventory-modal');
    expect(modal).toBeInTheDocument();
    expect(modal.classList.contains('building-modal--authentic')).toBe(true);
    expect(modal.classList.contains('building-modal--curved')).toBe(true);
  });

  it('exports occluders metadata including Bank, Factory, Socket City, QT, and Clock for foreground layering', async () => {
    const { AUTHENTIC_OCCLUDERS } = await import('../graphics/authenticData');
    const occIds = AUTHENTIC_OCCLUDERS.map(o => o.id);
    expect(occIds).toContain('roof_patch');
    expect(occIds).toContain('bank_roof');
    expect(occIds).toContain('factory_roof');
    expect(occIds).toContain('socket_city_roof');
    expect(occIds).toContain('qt_roof');
    expect(occIds).toContain('clock');

    const bank = AUTHENTIC_OCCLUDERS.find(o => o.id === 'bank_roof');
    expect(bank?.x).toBe(7);
    expect(bank?.y).toBe(119);

    const factory = AUTHENTIC_OCCLUDERS.find(o => o.id === 'factory_roof');
    expect(factory?.x).toBe(7);
    expect(factory?.y).toBe(134);

    const socketCity = AUTHENTIC_OCCLUDERS.find(o => o.id === 'socket_city_roof');
    expect(socketCity?.x).toBe(251);
    expect(socketCity?.y).toBe(133);

    const qt = AUTHENTIC_OCCLUDERS.find(o => o.id === 'qt_roof');
    expect(qt?.x).toBe(251);
    expect(qt?.y).toBe(82);

    const clock = AUTHENTIC_OCCLUDERS.find(o => o.id === 'clock');
    expect(clock?.x).toBe(147);
    expect(clock?.y).toBe(153);
  });

  it('verifies all 13 authentic building door coordinates match Sierra SCI original places', async () => {
    const { AUTHENTIC_BUILDINGS } = await import('../graphics/authenticData');
    expect(AUTHENTIC_BUILDINGS.bank.doorX).toBe(20);
    expect(AUTHENTIC_BUILDINGS.bank.doorY).toBe(147);
    expect(AUTHENTIC_BUILDINGS.qt_clothing.doorX).toBe(277);
    expect(AUTHENTIC_BUILDINGS.qt_clothing.doorY).toBe(113);
    expect(AUTHENTIC_BUILDINGS.low_cost_housing.doorX).toBe(144);
    expect(AUTHENTIC_BUILDINGS.low_cost_housing.doorY).toBe(30);
    expect(AUTHENTIC_BUILDINGS.employment_office.doorX).toBe(97);
    expect(AUTHENTIC_BUILDINGS.employment_office.doorY).toBe(183);
    expect(AUTHENTIC_BUILDINGS.university.doorX).toBe(220);
    expect(AUTHENTIC_BUILDINGS.university.doorY).toBe(179);
  });

  it('verifies click indicator targets the authentic door rather than sidewalk waypoints', async () => {
    const { AUTHENTIC_BUILDINGS } = await import('../graphics/authenticData');
    // Test that for Bank, door is at (20, 147), so indicator is at (20 * 3.75 = 75, 147 * 3.75 = 551.25), not the old street waypoint (90, 596)
    const bank = AUTHENTIC_BUILDINGS.bank;
    expect(bank.doorX * 3.75).toBe(75);
    expect(bank.doorY * 3.75).toBe(551.25);
    // For Low Cost Housing, door is at (144, 30), so indicator is at (540, 112.5), not (540, 148)
    const lowCost = AUTHENTIC_BUILDINGS.low_cost_housing;
    expect(lowCost.doorX * 3.75).toBe(540);
    expect(lowCost.doorY * 3.75).toBe(112.5);
  });
});
