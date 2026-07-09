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
        backgroundColor: '#2c3e50', borderRadius: '8px', minWidth: '300px',
        border: '2px solid #34495e'
      }}>
        <h3 style={{ marginTop: 0, borderBottom: '1px solid #555', paddingBottom: '10px' }}>What happened:</h3>
        
        {player.turnEvents && player.turnEvents.length > 0 ? (
          <ul style={{ paddingLeft: '20px', textAlign: 'left' }}>
            {player.turnEvents.map((event, idx) => (
              <li key={idx} style={{ marginBottom: '8px' }}>{event}</li>
            ))}
          </ul>
        ) : (
          <p style={{ fontStyle: 'italic', color: '#aaa' }}>Nothing special happened this weekend.</p>
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
