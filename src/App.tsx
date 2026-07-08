import { useState, useEffect, useMemo } from 'react';
import { Dashboard } from './ui/Dashboard';
import { ActionPanel } from './ui/ActionPanel';
import { GameMap } from './ui/GameMap';
import { TitleScreen } from './ui/TitleScreen';
import { SetupScreen } from './ui/SetupScreen';
import { GameOverScreen } from './ui/GameOverScreen';
import { GameLog, type LogEntry } from './ui/GameLog';
import { createInitialGameState, type GameState } from './engine/gameState';
import { processTurnStart } from './engine/turnProcessor';
import { spendHours } from './engine/timeManager';
import { loadCampaign, type CampaignBundle } from './engine/dataLoader';
import { buildAdjacencyMap, findShortestPath } from './graphics/pathfinding';
import { initMapRenderer, movePlayerTo, animatePlayerPath, type PlayerPosition } from './graphics/mapRenderer';
import { applyForJob, workShift } from './engine/jobEngine';
import { buyItem } from './engine/shoppingEngine';
import { enrollInDegree, study } from './engine/educationEngine';

type AppStatus = 'loading' | 'ready' | 'error';

export default function App() {
  const [status, setStatus] = useState<AppStatus>('loading');
  const [campaign, setCampaign] = useState<CampaignBundle | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTitle, setShowTitle] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  // For single player MVP, track active player
  const activePlayerIndex = 0;

  useEffect(() => {
    loadCampaign('classic_1990')
      .then((bundle) => {
        setCampaign(bundle);
        const initialState = createInitialGameState('classic_1990', ['Player 1'], 'node_low_cost', 'cdrom');
        setGameState(initialState);
        setStatus('ready');
      })
      .catch((err) => {
        console.error('[App] Campaign load failed:', err);
        setErrorMsg(err.message);
        setStatus('error');
      });
  }, []);

  const adjacencyMap = useMemo(() => {
    if (!campaign) return new Map<string, string[]>();
    return buildAdjacencyMap(campaign.map.nodes);
  }, [campaign]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-19), { week: gameState?.turn || 1, message: msg }]);
  };

  const handleAction = (payload: any) => {
    if (!gameState || !campaign) return;

    if (payload.type === 'end-turn') {
      const nextState = processTurnStart(gameState);
      setGameState(nextState);
      addLog(`Week ${nextState.turn} begins.`);
      return;
    }

    let updatedPlayers = [...gameState.players];
    let player = { ...updatedPlayers[activePlayerIndex] };
    
    if (payload.type === 'apply') {
      const jobDef = campaign.jobs.find(j => j.id === payload.jobId);
      if (jobDef) {
        const result = applyForJob(player, jobDef);
        player = result.updated;
        addLog(result.message);
      }
    } else if (payload.type === 'work') {
      const jobDef = campaign.jobs.find(j => j.id === payload.jobId);
      if (jobDef) {
        const result = workShift(player, jobDef);
        player = result.updated;
        addLog(`Worked at ${jobDef.title}: Earned $${result.wagesEarned}`);
      }
    } else if (payload.type === 'buy') {
      const itemDef = campaign.items.find(i => i.id === payload.itemId);
      if (itemDef) {
        const result = buyItem(player, itemDef);
        player = result.updated;
        addLog(result.message);
      }
    } else if (payload.type === 'enroll') {
      const degDef = campaign.education.find(d => d.id === payload.degreeId);
      if (degDef) {
        const result = enrollInDegree(player, degDef);
        player = result.updated;
        addLog(result.message);
      }
    } else if (payload.type === 'study') {
      const degDef = campaign.education.find(d => d.id === payload.degreeId);
      if (degDef) {
        const result = study(player, degDef);
        player = result.updated;
        addLog(result.message);
      }
    }

    updatedPlayers[activePlayerIndex] = player;
    setGameState({ ...gameState, players: updatedPlayers });
  };

  const handleNodeClick = async (nodeId: string) => {
    if (!gameState || !campaign || isAnimating) return;
    
    let updatedPlayers = [...gameState.players];
    let player = { ...updatedPlayers[activePlayerIndex] };

    // Don't move if we are already there
    if (player.position === nodeId) return;

    const pathResult = findShortestPath(adjacencyMap, player.position, nodeId);
    
    if (pathResult.found) {
      // Basic movement cost: 1 hour per step
      const moveCost = pathResult.steps;
      if (player.hoursRemaining >= moveCost) {
        setIsAnimating(true);
        
        // Build the physical path for animation
        const pathCoords: PlayerPosition[] = pathResult.path.map(id => {
          const node = campaign.map.nodes.find(n => n.id === id);
          return { nodeId: id, x: node!.x, y: node!.y };
        });

        // The first node in pathCoords is the current position, so slice it off if length > 1
        // (Wait, findShortestPath includes start node, so we slice(1))
        await animatePlayerPath(pathCoords.slice(1));

        player = spendHours(player, moveCost);
        player.position = nodeId;
        
        updatedPlayers[activePlayerIndex] = player;
        setGameState({ ...gameState, players: updatedPlayers });
        setIsAnimating(false);
      } else {
        addLog(`Not enough hours to move. Needed: ${moveCost}, Have: ${player.hoursRemaining}`);
      }
    }
  };

  if (status === 'loading') {
    return <div className="loading-screen">Loading campaign data…</div>;
  }

  if (status === 'error') {
    return <div className="error-screen">Error: {errorMsg}</div>;
  }

  if (showTitle) {
    return <TitleScreen onStartGame={() => setShowTitle(false)} />;
  }

  if (!gameState) return null;

  if (gameState.phase === 'setup') {
    return (
      <SetupScreen onConfirm={(goals) => {
        const updatedPlayers = [...gameState.players];
        updatedPlayers[0].goalAllotment = goals;
        const firstTurnState = processTurnStart({ ...gameState, phase: 'playing', players: updatedPlayers });
        setGameState(firstTurnState);
        addLog('Game started. Good luck!');
      }} />
    );
  }

  if (gameState.phase === 'game-over') {
    return (
      <GameOverScreen 
        playerName={gameState.winnerId || 'Player 1'} 
        turn={gameState.turn}
        onPlayAgain={() => {
          setGameState(createInitialGameState('classic_1990', ['Player 1'], 'node_low_cost', 'cdrom'));
          setShowTitle(true);
          setLogs([]);
        }}
      />
    );
  }

  const activePlayer = gameState.players[activePlayerIndex] || null;
  const currentBuildingId = (activePlayer && campaign) 
    ? (campaign.map.nodes.find(n => n.id === activePlayer.position)?.buildingId || null)
    : null;

  return (
    <div className="app-container">
      <Dashboard 
        player={activePlayer} 
        turn={gameState.turn} 
        economicIndex={gameState.economicIndex} 
      />
      <main className="game-viewport">
        <GameMap 
          campaign={campaign!} 
          player={activePlayer} 
          onNodeClick={handleNodeClick} 
        />
        <GameLog entries={logs} />
      </main>
      <ActionPanel
        player={activePlayer}
        campaign={campaign!}
        currentBuildingId={currentBuildingId}
        onAction={handleAction}
      />
    </div>
  );
}
