import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthenticCashCalculator } from '../src/ui/authentic/AuthenticCashCalculator';
import type { PlayerState } from '../src/engine/gameState';

describe('AuthenticCashCalculator', () => {
  const mockPlayer: PlayerState = {
    id: 'p1',
    name: 'Jones',
    money: 126,
    bankSavings: 0,
    hoursRemaining: 10,
    happiness: 50,
    position: 'node_burger',
    currentHousingId: 'low_cost',
    currentRentPrice: 300,
    rentPaidUntilWeek: 4,
    rentDebt: 0,
    degrees: [],
    experience: 0,
    dependability: 50,
    currentJobId: null,
    currentWage: 0,
    turnFlags: {},
    inventory: {
      appliances: [],
      foodItems: [],
      fastFoodItems: [],
      lotteryTickets: [],
      books: [],
      pawnedItems: [],
      stocks: { tBills: 0, holdings: {} },
      selectedClothes: 'casual',
      casualClothesWeeks: 10,
      freshFoodUnits: 0,
      cannedFoodUnits: 0,
    },
  } as any;

  it('renders authentic cash calculator with LCD money readout matching player cash', () => {
    render(<AuthenticCashCalculator player={mockPlayer} />);

    expect(screen.getByTestId('authentic-cash-calculator')).toBeInTheDocument();
    const lcd = screen.getByTestId('stat-money');
    expect(lcd).toBeInTheDocument();
    expect(lcd).toHaveTextContent('126');

    const img = screen.getByAltText('Cash Calculator');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toBe('/assets/authentic/calculator_base.png');
  });

  it('updates cash readout dynamically when player money changes', () => {
    const { rerender } = render(<AuthenticCashCalculator player={mockPlayer} />);
    expect(screen.getByTestId('stat-money')).toHaveTextContent('126');

    rerender(<AuthenticCashCalculator player={{ ...mockPlayer, money: 88 }} />);
    expect(screen.getByTestId('stat-money')).toHaveTextContent('88');
  });
});
