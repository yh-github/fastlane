import type { PlayerState } from '../engine/gameState';
import { useTranslation } from 'react-i18next';

interface WeekendScreenProps {
  player: PlayerState;
  turn: number;
  onStartWeek: () => void;
}

export function WeekendScreen({ player, turn, onStartWeek }: WeekendScreenProps) {
  const { t } = useTranslation();
  return (
    <div className="weekend-screen" style={{
      position: 'absolute', top: 0, insetInlineStart: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.90)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', color: 'white', zIndex: 1000, overflowY: 'auto', padding: '40px 20px'
    }}>
      <h1 style={{ color: '#00e5ff', textShadow: '0 0 10px #00e5ff' }}>{t('weekendScreen.title')}</h1>
      <h2>{t('weekendScreen.summary', { turn, name: player.name })}</h2>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', margin: '20px 0', maxWidth: '800px' }}>
          <div className="weekend-player-summary" style={{
            padding: '20px', backgroundColor: '#2c3e50', borderRadius: '8px', 
            width: '350px', border: '2px solid #34495e', textAlign: 'center'
          }}>
            <h3 style={{ borderBottom: '1px solid #555', paddingBottom: '10px', margin: '0 0 15px 0' }}>
              {t('weekendScreen.activities')}
            </h3>
            
            {player.weekendResult ? (
              <>
                <h4 style={{ color: '#f1c40f', margin: '0 0 10px 0' }}>{t('weekendScreen.whatYouDid')}</h4>
                <p style={{ fontSize: '1.1em', fontStyle: 'italic', marginBottom: '10px' }}>
                  "{t(player.weekendResult.event.key, player.weekendResult.event.params as any) as string}"
                </p>
                <p style={{ color: '#e74c3c', fontWeight: 'bold', margin: '5px 0' }}>
                  {t('weekendScreen.cost')}: ${player.weekendResult.cost}
                </p>
                {player.weekendResult.happinessBonus && (
                  <p style={{ color: '#2ecc71', fontWeight: 'bold', margin: '5px 0' }}>
                    {t('weekendScreen.happiness')} +{player.weekendResult.happinessBonus}
                  </p>
                )}
              </>
            ) : (
              <p style={{ fontStyle: 'italic', color: '#aaa', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t('weekendScreen.nothingSpecial')}
              </p>
            )}


          </div>
      </div>

      <button 
        onClick={onStartWeek}
        style={{
          padding: '10px 30px', fontSize: '1.2em', cursor: 'pointer', marginTop: '20px',
          backgroundColor: '#00e5ff', color: '#000', border: 'none', borderRadius: '4px',
          fontWeight: 'bold', boxShadow: '0 0 10px #00e5ff'
        }}
      >
        {t('weekendScreen.startWeek', { turn })}
      </button>
    </div>
  );
}
