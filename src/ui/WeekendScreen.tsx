import type { PlayerState } from '../engine/gameState';

interface WeekendScreenProps {
  player: PlayerState;
  turn: number;
  onStartWeek: () => void;
}

export function WeekendScreen({ player, turn, onStartWeek }: WeekendScreenProps) {
  return (
    <div className="weekend-screen" style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.90)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', color: 'white', zIndex: 1000, overflowY: 'auto', padding: '40px 20px'
    }}>
      <h1 style={{ color: '#00e5ff', textShadow: '0 0 10px #00e5ff' }}>Weekend!</h1>
      <h2>Week {turn} Summary for {player.name}</h2>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', margin: '20px 0', maxWidth: '800px' }}>
          <div className="weekend-player-summary" style={{
            padding: '20px', backgroundColor: '#2c3e50', borderRadius: '8px', 
            width: '350px', border: '2px solid #34495e', textAlign: 'center'
          }}>
            <h3 style={{ borderBottom: '1px solid #555', paddingBottom: '10px', margin: '0 0 15px 0' }}>
              Your Weekend Activities
            </h3>
            
            {player.weekendResult ? (
              <>
                <h4 style={{ color: '#f1c40f', margin: '0 0 10px 0' }}>What you did this weekend:</h4>
                <p style={{ fontSize: '1.1em', fontStyle: 'italic', marginBottom: '10px' }}>
                  "{player.weekendResult.text}"
                </p>
                <p style={{ color: '#e74c3c', fontWeight: 'bold', margin: '5px 0' }}>
                  Cost: ${player.weekendResult.cost}
                </p>
                {player.weekendResult.happinessBonus && (
                  <p style={{ color: '#2ecc71', fontWeight: 'bold', margin: '5px 0' }}>
                    Happiness +{player.weekendResult.happinessBonus}
                  </p>
                )}
              </>
            ) : (
              <p style={{ fontStyle: 'italic', color: '#aaa', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Nothing special happened this weekend.
              </p>
            )}

            {player.turnEvents && player.turnEvents.length > 0 && (
              <div style={{ marginTop: '15px', borderTop: '1px solid #555', paddingTop: '15px' }}>
                <h5 style={{ margin: '0 0 10px 0', color: '#ccc' }}>Other Events:</h5>
                <ul style={{ paddingLeft: '20px', textAlign: 'left', margin: 0, fontSize: '0.9em' }}>
                  {player.turnEvents.map((event, idx) => (
                    <li key={idx} style={{ marginBottom: '5px' }}>{event}</li>
                  ))}
                </ul>
              </div>
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
        Start Week {turn}
      </button>
    </div>
  );
}
