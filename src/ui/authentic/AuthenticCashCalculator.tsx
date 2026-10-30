import React from 'react';
import type { PlayerState } from '../../engine/gameState';

interface AuthenticCashCalculatorProps {
  player: PlayerState;
}

/**
 * AuthenticCashCalculator
 * Authentic Sierra 1990 SCI VGA Cash Calculator (view.000 loop 4 cel 0).
 * Stamped with '$' and red power key; LCD screen displays current cash balance.
 * Placed in the bottom-right corner of the authentic game board during building location visits.
 */
export const AuthenticCashCalculator: React.FC<AuthenticCashCalculatorProps> = ({ player }) => {
  return (
    <div
      data-testid="authentic-cash-calculator"
      style={{
        position: 'absolute',
        left: 'calc(var(--board-x, calc(50% - 600px)) + (948.75px * var(--board-scale, 1)))',
        top: 'calc(var(--board-y, calc(50% - 400px)) + (592.5px * var(--board-scale, 1)))',
        width: 'calc(221.25px * var(--board-scale, 1))',
        height: 'calc(120px * var(--board-scale, 1))',
        zIndex: 40,
        pointerEvents: 'none',
        userSelect: 'none',
        imageRendering: 'pixelated',
      }}
    >
      {/* 1x Authentic SCI view 0 loop 4 cel 0 bitmap */}
      <img
        src="/assets/authentic/calculator_base.png"
        alt="Cash Calculator"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          imageRendering: 'pixelated',
          pointerEvents: 'none',
        }}
      />

      {/* LCD Screen Numeric Readout */}
      <div
        id="stat-money"
        data-testid="stat-money"
        style={{
          position: 'absolute',
          left: '30.5%',
          top: '12.5%',
          width: '62.7%',
          height: '28.1%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '6%',
          boxSizing: 'border-box',
          fontFamily: 'monospace, "Courier New"',
          fontWeight: 'bold',
          fontSize: 'calc(24px * var(--board-scale, 1))',
          lineHeight: '1',
          color: '#1a2228',
          letterSpacing: 'calc(1px * var(--board-scale, 1))',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textShadow: '0.5px 0.5px 0px rgba(0,0,0,0.15)',
        }}
      >
        {player.money}
      </div>
    </div>
  );
};
