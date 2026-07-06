/**
 * App.tsx — Main React entry point wrapping Canvas + UI overlay.
 */

import { useState, useEffect } from 'react';
import { Dashboard } from './ui/Dashboard';
import { ActionPanel } from './ui/ActionPanel';
import { createDefaultStats, type PlayerStats } from './engine/statMath';
import { createInitialTime, advancePhase, consumeAction, DEFAULT_TIME_CONFIG, type GameTime } from './engine/timeManager';
import { loadCampaign, type CampaignBundle } from './engine/dataLoader';

type GamePhase = 'loading' | 'playing' | 'error';

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('loading');
  const [campaign, setCampaign] = useState<CampaignBundle | null>(null);
  const [stats, setStats] = useState<PlayerStats>(createDefaultStats());
  const [time, setTime] = useState<GameTime>(createInitialTime());
  const [_error, _setError] = useState<string | null>(null);

  useEffect(() => {
    loadCampaign('classic_1990')
      .then((bundle) => {
        setCampaign(bundle);
        setStats(createDefaultStats({ money: bundle.config.startingMoney }));
        setPhase('playing');
      })
      .catch((err) => {
        console.warn('[App] Campaign load failed (expected during engine-only sprint):', err);
        // Fall back to playing without campaign data for engine testing
        setPhase('playing');
      });
  }, []);

  const handleAction = (actionType: string) => {
    if (actionType === 'end-phase') {
      setTime((t) => advancePhase(t, DEFAULT_TIME_CONFIG));
      return;
    }
    const next = consumeAction(time);
    if (next) setTime(next);
  };

  if (phase === 'loading') {
    return <div className="loading-screen">Loading campaign data…</div>;
  }

  if (phase === 'error') {
    return <div className="error-screen">Error: {_error}</div>;
  }

  return (
    <div className="app-container">
      <Dashboard stats={stats} time={time} />
      <main className="game-viewport">
        {/* Canvas mount point for PixiJS (Sprint 2) */}
        <div id="pixi-canvas" className="game-viewport__canvas">
          <div className="game-viewport__placeholder">
            <h2>🎮 Fast Lane Modernized</h2>
            <p>Engine Sprint — Canvas rendering coming in Sprint 2</p>
            {campaign && <p>Campaign loaded: <strong>{campaign.config.name}</strong></p>}
          </div>
        </div>
      </main>
      <ActionPanel
        currentBuildingId={null}
        actionsRemaining={time.actionsRemaining}
        onAction={handleAction}
      />
    </div>
  );
}
