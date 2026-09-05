import React from 'react';

interface HomeCardDeckProps {
  title?: string;
  icon?: string;
  onClose?: () => void;
  children: React.ReactNode;
}

export const HomeCardDeck: React.FC<HomeCardDeckProps> = ({
  children
}) => {
  return (
    <div
      className="home-card-deck-inline"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 auto',
        minHeight: 0,
        background: 'linear-gradient(180deg, rgba(16, 20, 36, 0.95) 0%, rgba(10, 12, 22, 0.98) 100%)',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        padding: '6px 8px',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Cards Tray */}
      <div style={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '12px',
        overflowY: 'auto',
        flex: '1 1 auto',
        minHeight: 0,
        padding: '2px',
        justifyItems: 'center',
        alignItems: 'stretch',
        boxSizing: 'border-box'
      }}>
        {children}
      </div>
    </div>
  );
};
