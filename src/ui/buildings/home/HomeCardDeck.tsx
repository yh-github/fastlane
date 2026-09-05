import React from 'react';

interface HomeCardDeckProps {
  title: string;
  icon?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const HomeCardDeck: React.FC<HomeCardDeckProps> = ({
  title,
  icon,
  onClose,
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
        padding: '10px 12px',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Top Header Bar */}
      <div style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
        flexShrink: 0
      }}>
        <h4 style={{
          margin: 0,
          fontSize: '0.95rem',
          color: 'var(--accent-cyan)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {icon && <span>{icon}</span>}
          <span>{title}</span>
        </h4>

        <button
          onClick={onClose}
          style={{
            padding: '4px 10px',
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#cbd5e1',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            fontSize: '0.74rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
        >
          ✕ Back to Furnishings
        </button>
      </div>

      {/* Cards Tray */}
      <div style={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '12px',
        overflowY: 'auto',
        flex: '1 1 auto',
        minHeight: 0,
        padding: '4px',
        justifyItems: 'center',
        alignItems: 'stretch',
        boxSizing: 'border-box'
      }}>
        {children}
      </div>
    </div>
  );
};
