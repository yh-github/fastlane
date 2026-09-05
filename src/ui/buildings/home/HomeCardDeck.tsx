import React from 'react';
import { createPortal } from 'react-dom';

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
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 7, 15, 0.82)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}
      >
        {/* Top Header Bar */}
        <div style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 4px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.3rem',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)'
          }}>
            {icon && <span>{icon}</span>}
            <span>{title}</span>
          </h2>

          <button
            onClick={onClose}
            style={{
              padding: '6px 14px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            ✕ Back to Apartment
          </button>
        </div>

        {/* Cards Tray */}
        <div style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          justifyItems: 'center',
          maxHeight: '80vh',
          overflowY: 'auto',
          padding: '4px'
        }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
