import type { PlayerState } from '../engine/gameState';

interface WeekendScreenProps {
  player: PlayerState;
  turn: number;
  onNextWeek: () => void;
}

export function WeekendScreen({ player, turn, onNextWeek }: WeekendScreenProps) {
  return (
    <div className="weekend-screen" style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', color: 'white', zIndex: 1000
    }}>
      <h1 style={{ color: '#00e5ff', textShadow: '0 0 10px #00e5ff' }}>Weekend!</h1>
      <h2>Week {turn} Summary</h2>
      
      <div style={{
        marginTop: '20px', marginBottom: '30px', padding: '20px', 
        backgroundColor: '#2c3e50', borderRadius: '8px', minWidth: '400px', maxWidth: '600px',
        border: '2px solid #34495e', textAlign: 'center'
      }}>
        {player.weekendResult ? (
          <>
            <h3 style={{ color: '#f1c40f', marginBottom: '10px' }}>What you did this weekend:</h3>
            <p style={{ fontSize: '1.2em', fontStyle: 'italic', marginBottom: '15px' }}>
              "{player.weekendResult.text}"
            </p>
            <p style={{ color: '#e74c3c', fontWeight: 'bold' }}>
              Cost: ${player.weekendResult.cost}
            </p>
            {player.weekendResult.happinessBonus && (
              <p style={{ color: '#2ecc71', fontWeight: 'bold', marginTop: '5px' }}>
                Happiness +{player.weekendResult.happinessBonus}
              </p>
            )}
          </>
        ) : (
          <p style={{ fontStyle: 'italic', color: '#aaa' }}>Nothing special happened this weekend.</p>
        )}

        {player.turnEvents && player.turnEvents.length > 0 && (
          <div style={{ marginTop: '20px', borderTop: '1px solid #555', paddingTop: '15px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#ccc' }}>Other Events:</h4>
            <ul style={{ paddingLeft: '20px', textAlign: 'left', margin: 0, fontSize: '0.9em' }}>
              {player.turnEvents.map((event, idx) => (
                <li key={idx} style={{ marginBottom: '5px' }}>{event}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button 
        onClick={onNextWeek}
        style={{
          padding: '10px 30px', fontSize: '1.2em', cursor: 'pointer',
          backgroundColor: '#00e5ff', color: '#000', border: 'none', borderRadius: '4px',
          fontWeight: 'bold', boxShadow: '0 0 10px #00e5ff'
        }}
      >
        Start Next Week
      </button>
    </div>
  );
}
