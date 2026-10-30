import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BuildingModal } from '../src/ui/BuildingModal';
import { AuthenticBlacksMarket } from '../src/ui/buildings/authentic/AuthenticBlacksMarket';
import { AuthenticQtClothing } from '../src/ui/buildings/authentic/AuthenticQtClothing';
import { AuthenticSocketCity } from '../src/ui/buildings/authentic/AuthenticSocketCity';
import { AuthenticZMart } from '../src/ui/buildings/authentic/AuthenticZMart';
import { AuthenticPawnShop } from '../src/ui/buildings/authentic/AuthenticPawnShop';
import { AuthenticUniversity } from '../src/ui/buildings/authentic/AuthenticUniversity';
import { AuthenticEmploymentOffice } from '../src/ui/buildings/authentic/AuthenticEmploymentOffice';
import { AuthenticFactory } from '../src/ui/buildings/authentic/AuthenticFactory';
import { AuthenticRentOffice } from '../src/ui/buildings/authentic/AuthenticRentOffice';
import { AuthenticHome } from '../src/ui/buildings/authentic/AuthenticHome';

const mockCampaign: any = {
  config: {
    name: '1990_classic_floppy',
    economyRules: {
      loanPaymentAmount: 50,
      rentCostLow: 300,
      rentCostSec: 400
    },
    timeRules: {
      totalHoursPerWeekend: 12,
      hoursPerTurn: 12,
      workSessionCost: 6,
      classesSessionCost: 5,
      relaxSessionCost: 2,
      pawnTimeCost: 1,
      minTurnHours: 0,
      newspaperCost: 1,
      loanCost: 1,
      brokerCost: 2
    }
  },
  buildings: [
    { id: 'blacks_market', name: "Black's Market", archetype: 'store', spritePath: 'images/blacks.png' },
    { id: 'qt_clothing', name: 'QT Clothing', archetype: 'store', spritePath: 'images/qt.png' },
    { id: 'socket_city', name: 'Socket City', archetype: 'store', spritePath: 'images/socket.png' },
    { id: 'z_mart', name: 'Z-Mart', archetype: 'store', spritePath: 'images/zmart.png' },
    { id: 'pawn_shop', name: "Curly's Pawn Shop", archetype: 'pawnshop', spritePath: 'images/pawn.png' },
    { id: 'university', name: 'Hi-Tech University', archetype: 'university', spritePath: 'images/u.png' },
    { id: 'employment_office', name: 'Employment Office', archetype: 'employment_office', spritePath: 'images/emp.png' },
    { id: 'factory', name: 'Factory', archetype: 'factory', spritePath: 'images/factory.png' },
    { id: 'apartment_complex', name: 'Apartment Complex', archetype: 'real_estate', spritePath: 'images/apt.png' },
    { id: 'low_cost_housing', name: 'Low-Cost Housing', archetype: 'home', spritePath: 'images/home.png' }
  ],
  items: [],
  jobs: [
    {
      id: 'factory_worker',
      title: 'Factory Worker',
      locationId: 'factory',
      baseWage: 6,
      requirements: { experience: 0, dependability: 0, degrees: [], uniform: 'casual' }
    }
  ],
  education: [
    { id: 'trade_school', name: 'Trade School', tuition: 50, hoursRequired: 10 }
  ],
  housing: [
    { id: 'low_cost', name: 'Low-Cost Housing', rentPrice: 300, homeNodeId: 'node_home' },
    { id: 'security_apartments', name: 'Security Apartments', rentPrice: 400, homeNodeId: 'node_home' }
  ],
  map: {
    nodes: [
      { id: 'node_blacks', buildingId: 'blacks_market', x: 0, y: 0, connections: [] },
      { id: 'node_qt', buildingId: 'qt_clothing', x: 0, y: 0, connections: [] },
      { id: 'node_socket', buildingId: 'socket_city', x: 0, y: 0, connections: [] },
      { id: 'node_zmart', buildingId: 'z_mart', x: 0, y: 0, connections: [] },
      { id: 'node_pawn', buildingId: 'pawn_shop', x: 0, y: 0, connections: [] },
      { id: 'node_u', buildingId: 'university', x: 0, y: 0, connections: [] },
      { id: 'node_emp', buildingId: 'employment_office', x: 0, y: 0, connections: [] },
      { id: 'node_factory', buildingId: 'factory', x: 0, y: 0, connections: [] },
      { id: 'node_apt', buildingId: 'apartment_complex', x: 0, y: 0, connections: [] },
      { id: 'node_home', buildingId: 'low_cost_housing', x: 0, y: 0, connections: [] }
    ]
  },
  events: [],
  stocks: [],
  messages: {},
  weekends: {},
  synergies: []
};

const basePlayer: any = {
  id: 'p1',
  name: 'Jones',
  money: 500,
  savings: 200,
  debt: 0,
  career: 0,
  education: 0,
  happiness: 50,
  relaxation: 50,
  rentPaidUntilWeek: 4,
  currentHousingId: 'low_cost',
  hoursRemaining: 10,
  turnFlags: {},
  inventory: { selectedClothes: 'casual', clothes: ['casual'], appliances: [], possessionIds: [] },
  position: 'node_home',
  currentJobId: null
};

const authenticRules: any = {
  guiStyle: 'authentic'
};

describe('Authentic Locations Replica UI Components', () => {
  it('renders AuthenticBlacksMarket and triggers onClose', () => {
    const handleClose = vi.fn();
    render(
      <AuthenticBlacksMarket
        player={basePlayer}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={handleClose}
        campaign={mockCampaign}
        economicIndex={0}
      />
    );
    expect(screen.getByTestId('authentic-blacks-market')).toBeInTheDocument();
    expect(screen.getByTestId('blacks-market-talker')).toBeInTheDocument();
    expect(screen.getByTestId('speech-tail-right')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('btn-blacks-market-done'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders AuthenticQtClothing and triggers onClose', () => {
    const handleClose = vi.fn();
    render(
      <AuthenticQtClothing
        player={basePlayer}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={handleClose}
        campaign={mockCampaign}
        economicIndex={0}
      />
    );
    expect(screen.getByTestId('authentic-qt-clothing')).toBeInTheDocument();
    expect(screen.getByTestId('qt-clothing-talker')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('btn-qt-clothing-done'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders AuthenticSocketCity and triggers onClose', () => {
    const handleClose = vi.fn();
    render(
      <AuthenticSocketCity
        player={basePlayer}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={handleClose}
        campaign={mockCampaign}
        economicIndex={0}
      />
    );
    expect(screen.getByTestId('authentic-socket-city')).toBeInTheDocument();
    expect(screen.getByTestId('socket-city-talker')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('btn-socket-city-done'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders AuthenticZMart and triggers onClose', () => {
    const handleClose = vi.fn();
    render(
      <AuthenticZMart
        player={basePlayer}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={handleClose}
        campaign={mockCampaign}
        economicIndex={0}
      />
    );
    expect(screen.getByTestId('authentic-z-mart')).toBeInTheDocument();
    expect(screen.getByTestId('z-mart-talker')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('btn-z-mart-done'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders AuthenticPawnShop and triggers onClose', () => {
    const handleClose = vi.fn();
    render(
      <AuthenticPawnShop
        player={basePlayer}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={handleClose}
        campaign={mockCampaign}
        economicIndex={0}
      />
    );
    expect(screen.getByTestId('authentic-pawn-shop')).toBeInTheDocument();
    expect(screen.getByTestId('pawn-shop-talker')).toBeInTheDocument();
    expect(screen.getByTestId('speech-tail-left')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('btn-pawn-done'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders AuthenticUniversity and triggers onClose', () => {
    const handleClose = vi.fn();
    render(
      <AuthenticUniversity
        player={basePlayer}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={handleClose}
        campaign={mockCampaign}
        economicIndex={0}
      />
    );
    expect(screen.getByTestId('authentic-university')).toBeInTheDocument();
    expect(screen.getByTestId('university-talker')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('btn-university-done'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders AuthenticEmploymentOffice and triggers onClose', () => {
    const handleClose = vi.fn();
    render(
      <AuthenticEmploymentOffice
        player={basePlayer}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={handleClose}
        campaign={mockCampaign}
      />
    );
    expect(screen.getByTestId('authentic-employment-office')).toBeInTheDocument();
    expect(screen.getByTestId('employment-office-talker')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('btn-employment-done'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders AuthenticFactory with work button when employed', () => {
    const employedPlayer = { ...basePlayer, currentJobId: 'factory_worker' };
    const handleClose = vi.fn();
    render(
      <AuthenticFactory
        player={employedPlayer}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={handleClose}
        campaign={mockCampaign}
      />
    );
    expect(screen.getByTestId('authentic-factory')).toBeInTheDocument();
    expect(screen.getByTestId('factory-talker')).toBeInTheDocument();
    expect(screen.getByTestId('btn-factory-work')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('btn-factory-done'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders AuthenticRentOffice and triggers onClose', () => {
    const handleClose = vi.fn();
    render(
      <AuthenticRentOffice
        player={basePlayer}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={handleClose}
        campaign={mockCampaign}
      />
    );
    expect(screen.getByTestId('authentic-rent-office')).toBeInTheDocument();
    expect(screen.getByTestId('rent-office-talker')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('btn-rent-office-done'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders AuthenticHome and triggers relax and done', () => {
    const handleClose = vi.fn();
    const handleAction = vi.fn().mockResolvedValue({});
    render(
      <AuthenticHome
        player={basePlayer}
        onAction={handleAction}
        onClose={handleClose}
        campaign={mockCampaign}
      />
    );
    expect(screen.getByTestId('authentic-home')).toBeInTheDocument();
    expect(screen.getByTestId('btn-home-relax')).toBeInTheDocument();
    
    fireEvent.click(screen.getByTestId('btn-home-relax'));
    expect(handleAction).toHaveBeenCalledWith({ type: 'relax' });

    fireEvent.click(screen.getByTestId('btn-home-done'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe('BuildingModal Authentic Integration for All Locations', () => {
  const buildingTestCases = [
    { id: 'blacks_market', testId: 'authentic-blacks-market' },
    { id: 'qt_clothing', testId: 'authentic-qt-clothing' },
    { id: 'socket_city', testId: 'authentic-socket-city' },
    { id: 'z_mart', testId: 'authentic-z-mart' },
    { id: 'pawn_shop', testId: 'authentic-pawn-shop' },
    { id: 'university', testId: 'authentic-university' },
    { id: 'employment_office', testId: 'authentic-employment-office' },
    { id: 'factory', testId: 'authentic-factory' },
    { id: 'apartment_complex', testId: 'authentic-rent-office' },
    { id: 'low_cost_housing', testId: 'authentic-home' }
  ];

  for (const { id, testId } of buildingTestCases) {
    it(`mounts authentic replica ${testId} when opening ${id} in authentic guiStyle`, () => {
      const playerForTest = id === 'apartment_complex' ? { ...basePlayer, rentPaidUntilWeek: 1 } : basePlayer;
      render(
        <BuildingModal
          player={playerForTest}
          campaign={mockCampaign}
          currentBuildingId={id}
          turn={1}
          economicIndex={0}
          rules={authenticRules}
          onAction={vi.fn().mockResolvedValue({})}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    });
  }

  it('mounts authentic-rent-office displaying closed view (view.697) when rent office is closed', () => {
    render(
      <BuildingModal
        player={{ ...basePlayer, rentPaidUntilWeek: 4 }}
        campaign={mockCampaign}
        currentBuildingId="apartment_complex"
        turn={1}
        economicIndex={0}
        rules={authenticRules}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId('authentic-rent-office')).toBeInTheDocument();
    expect(screen.getByTestId('rent-office-bg-closed')).toBeInTheDocument();
    expect(screen.queryByTestId('rent-office-talker')).toBeNull();
    expect(screen.getByTestId('btn-rent-office-done')).toBeInTheDocument();
  });

  it('shows dontLiveHere panel and does not mount authentic-home when visiting security_apartments while living in low_cost', () => {
    const campaignWithSecurity = {
      ...mockCampaign,
      buildings: [
        ...mockCampaign.buildings,
        { id: 'security_apartments', name: 'Security Apartments', archetype: 'home', spritePath: '' }
      ]
    };
    render(
      <BuildingModal
        player={{ ...basePlayer, currentHousingId: 'low_cost' }}
        campaign={campaignWithSecurity}
        currentBuildingId="security_apartments"
        turn={1}
        economicIndex={0}
        rules={authenticRules}
        onAction={vi.fn().mockResolvedValue({})}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByTestId('authentic-home')).not.toBeInTheDocument();
    expect(screen.getByTestId('home-dont-live-here-panel')).toBeInTheDocument();
  });
});
