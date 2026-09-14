import { useTranslation } from 'react-i18next';
import type { GameEvent } from '../engine/gameState';

interface NewspaperModalProps {
  headline: GameEvent | null;
  onClose: () => void;
}

export function NewspaperModal({ headline, onClose }: NewspaperModalProps) {
  const { t } = useTranslation();
  if (!headline) return null;

  const stockTip = headline.stockTip;

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
        backgroundColor: '#fff', color: '#000', padding: '24px', borderRadius: '4px',
        maxWidth: '520px', width: '100%', textAlign: 'center', border: '5px double #333',
        fontFamily: '"Times New Roman", Times, serif',
        animation: 'newspaperSpinZoom 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards',
        boxSizing: 'border-box'
      }}>
        <div style={{ borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '18px' }}>
          <h1 style={{ margin: 0, fontSize: '36px', letterSpacing: '2px' }}>{t('newspaper.title', 'THE DAILY NEWS')}</h1>
        </div>
        
        <h2 style={{ fontSize: '24px', margin: '16px 0', textTransform: 'uppercase', lineHeight: '1.2' }}>
          {t(headline.key, headline.params as any) as string}
        </h2>

        {stockTip && (
          <div data-testid="market-watch-column" style={{
            marginTop: '20px',
            borderTop: '2px dashed #444',
            textAlign: 'start',
            backgroundColor: '#f8f9fa',
            padding: '14px 16px',
            borderRadius: '4px',
            border: '1px solid #ddd',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              borderBottom: '1px solid #ccc',
              paddingBottom: '6px',
            }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 'bold',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: '#444',
              }}>
                📈 {t('newspaper.marketWatchTitle', 'MARKET WATCH & FINANCIAL DESK')}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 'bold',
                padding: '2px 8px',
                borderRadius: '3px',
                backgroundColor: stockTip.action === 'buy' ? '#2e7d32' : stockTip.action === 'sell' ? '#c62828' : '#e65100',
                color: '#fff',
                textTransform: 'uppercase',
                fontFamily: 'sans-serif'
              }}>
                {stockTip.action === 'buy' 
                  ? t('newspaper.actionStrongBuy', 'STRONG BUY') 
                  : stockTip.action === 'sell' 
                  ? t('newspaper.actionStrongSell', 'STRONG SELL') 
                  : t('newspaper.actionHold', 'HOLD / NEUTRAL')}
              </span>
            </div>
            <h3 style={{
              margin: '6px 0 4px 0',
              fontSize: '16px',
              textTransform: 'uppercase',
              color: '#111',
            }}>
              {t(stockTip.headlineKey)}
            </h3>
            <p style={{
              margin: 0,
              fontSize: '13px',
              lineHeight: '1.4',
              color: '#333',
              fontStyle: 'italic',
            }}>
              {t(stockTip.detailKey)}
            </p>
          </div>
        )}
        
        <div style={{ marginTop: '24px' }}>
          <button onClick={onClose} style={{
            padding: '8px 20px', backgroundColor: '#333', color: '#fff', border: 'none',
            borderRadius: '4px', cursor: 'pointer', fontFamily: 'sans-serif', fontWeight: 'bold'
          }}>{t('newspaper.close', 'Close Newspaper')}</button>
        </div>
      </div>
    </div>
  );
}
