/**
 * App.tsx — Main React entry point wrapping Canvas + UI overlay.
 */

import { useState, useEffect } from 'react';
import { Dashboard } from './ui/Dashboard';
import { ActionPanel } from './ui/ActionPanel';
import { createInitialGameState, GameState } from './engine/gameState';
import { processTurnStart } from './engine/turnProcessor';
import { spendHours } from './engine/timeManager';
import { loadCampaign, type CampaignBundle } from './engine/dataLoader';

type AppStatus = 'loading' | 'playing' | 'error';

export default function App() {
  const [status, setStatus] = useState<AppStatus>('loading');
  const [campaign, setCampaign] = useState<CampaignBundle | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // For single player MVP, track active player
  const activePlayerIndex = 0;

  useEffect(() => {
    loadCampaign('classic_1990')
      .then((bundle) => {
        setCampaign(bundle);
        const initialState = createInitialGameState('classic_1990', ['Player 1'], 'node_start', 'cdrom');
        
        // Start the first turn immediately
        const firstTurnState = processTurnStart(initialState);
        
        setGameState(firstTurnState);
        setStatus('playing');
      })
      .catch((err) => {
        console.error('[App] Campaign load failed:', err);
        setErrorMsg(err.message);
        setStatus('error');
      });
  }, []);

  const handleAction = (actionType: string) => {
    if (!gameState) return;

    if (actionType === 'end-turn') {
      const nextState = processTurnStart(gameState);
      setGameState(nextState);
      return;
    }

    // Temporary basic hour deduction logic until full building interaction is built
    let updatedPlayers = [...gameState.players];
    let player = { ...updatedPlayers[activePlayerIndex] };
    
    let cost = 0;
    if (actionType === 'enter') cost = 2;
    else if (actionType === 'work' || actionType === 'study') cost = 6;
    
    if (cost > 0 && player.hoursRemaining >= 1) {
      // You can do actions if you have at least 1 hour, but you only spend up to what you have
      const actualCost = Math.min(player.hoursRemaining, cost);
      player = spendHours(player, actualCost);
      updatedPlayers[activePlayerIndex] = player;
      setGameState({ ...gameState, players: updatedPlayers });
    }
  };

  if (status === 'loading') {
    return <div className="loading-screen">Loading campaign data…</div>;
  }

  if (status === 'error') {
    return <div className="error-screen">Error: {errorMsg}</div>;
  }

  const activePlayer = gameState?.players[activePlayerIndex] || null;

  return (
    <div className="app-container">
      <Dashboard 
        player={activePlayer} 
        turn={gameState?.turn || 1} 
        economicIndex={gameState?.economicIndex || 0} 
      />
      <main className="game-viewport">
        {/* Canvas mount point for PixiJS (Sprint 2) */}
        <div id="pixi-canvas" className="game-viewport__canvas">
          <div className="game-viewport__placeholder">
            <h2>🎮 Fast Lane Modernized</h2>
            <p>Engine Sprint — Canvas rendering coming in Sprint 2</p>
            {campaign && <p>Campaign loaded: <strong>{campaign.config.name}</strong></p>}
            {activePlayer && (
              <div style={{ marginTop: '20px', textAlign: 'left', background: 'rgba(0,0,0,0.1)', padding: '10px', borderRadius: '4px' }}>
                <p><strong>Dev State View</strong></p>
                <p>Position: {activePlayer.position}</p>
                <p>Bank: ${activePlayer.bankSavings}</p>
                <p>Dep: {activePlayer.dependability}</p>
                <p>Exp: {activePlayer.experience}</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <ActionPanel
        player={activePlayer}
        currentBuildingId={null} // Default null for now
        onAction={handleAction}
      />
    </div>
  );
}
