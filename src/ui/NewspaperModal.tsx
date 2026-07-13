import { useTranslation } from 'react-i18next';
import type { GameEvent } from '../engine/gameState';

interface NewspaperModalProps {
  headline: GameEvent | null;
  onClose: () => void;
}

export function NewspaperModal({ headline, onClose }: NewspaperModalProps) {
  const { t } = useTranslation();
  if (!headline) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, insetInlineStart: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <style>
        {`
          @keyframes newspaperSpinZoom {
            0% {
              transform: scale(0.01) rotate(1440deg);
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            100% {
              transform: scale(1) rotate(0deg);
              opacity: 1;
            }
          }
        `}
      </style>
      <div className="modal-content" style={{
        backgroundColor: '#fff', color: '#000', padding: '20px', borderRadius: '4px',
        maxWidth: '500px', width: '100%', textAlign: 'center', border: '5px double #333',
        fontFamily: '"Times New Roman", Times, serif',
        animation: 'newspaperSpinZoom 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards'
      }}>
        <div style={{ borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '36px', letterSpacing: '2px' }}>{t('newspaper.title', 'THE DAILY NEWS')}</h1>
        </div>
        
        <h2 style={{ fontSize: '28px', margin: '20px 0', textTransform: 'uppercase' }}>
          {t(headline.key, headline.params as any) as string}
        </h2>
        
        <div style={{ marginTop: '30px' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', backgroundColor: '#333', color: '#fff', border: 'none',
            borderRadius: '4px', cursor: 'pointer', fontFamily: 'sans-serif'
          }}>{t('newspaper.close', 'Close Newspaper')}</button>
        </div>
      </div>
    </div>
  );
}
