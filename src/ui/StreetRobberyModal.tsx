import { useTranslation } from 'react-i18next';

interface StreetRobberyModalProps {
  lostAmount: number;
  location: string;
  onClose: () => void;
}

export function StreetRobberyModal({ lostAmount, location, onClose }: StreetRobberyModalProps) {
  const { t } = useTranslation();
  
  const locationName = t(`building.${location}`, { defaultValue: location });

  return (
    <div 
      className="building-modal-overlay" 
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute', top: 0, insetInlineStart: 0, insetInlineEnd: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000,
        display: 'flex', justifyContent: 'center', alignItems: 'center'
      }}
    >
      <div 
        className="building-modal-content" 
        onClick={e => e.stopPropagation()}
        style={{
        background: 'linear-gradient(135deg, #2c3e50 0%, #1a252f 100%)',
        padding: '24px',
        borderRadius: '12px',
        width: '420px',
        maxWidth: '90%',
        color: '#fff',
        border: '3px solid #e74c3c',
        boxShadow: '0 0 20px rgba(231, 76, 60, 0.4)',
        textAlign: 'center',
        animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
      }}>
        <div style={{ fontSize: '3em', marginBottom: '10px' }}>🏃💨 👤</div>
        <h2 style={{ marginTop: 0, color: '#e74c3c', textTransform: 'uppercase', letterSpacing: '1px' }}>
          ⚠️ Street Robbery!
        </h2>
        <p style={{ fontSize: '1.1em', lineHeight: '1.5', margin: '20px 0' }}>
          As you walked out of the <strong>{locationName}</strong>, a thief jumped out of the shadows, cornered you, and stole all your cash!
        </p>
        <div style={{
          background: 'rgba(231, 76, 60, 0.15)',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid rgba(231, 76, 60, 0.3)',
          marginBottom: '24px',
          fontWeight: 'bold',
          fontSize: '1.2em',
          color: '#ff7675'
        }}>
          Loss: -${lostAmount}
        </div>
        <button 
          onClick={onClose}
          style={{
            backgroundColor: '#e74c3c',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '1em',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c0392b'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#e74c3c'}
        >
          OK
        </button>
      </div>
    </div>
  );
}
