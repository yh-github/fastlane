import { useState, useEffect, useMemo } from 'react';
import { Dashboard } from './ui/Dashboard';
import { BuildingModal } from './ui/BuildingModal';
import { GameMap } from './ui/GameMap';
import { TitleScreen } from './ui/TitleScreen';
import { SetupScreen } from './ui/SetupScreen';
import { GameOverScreen } from './ui/GameOverScreen';
import { GameLog, type LogEntry } from './ui/GameLog';
import { createInitialGameState, recalculatePlayerEffects, type GameState, type PlayerState } from './engine/gameState';
import { processTurnStart } from './engine/turnProcessor';
import { spendHours } from './engine/timeManager';
import { loadCampaign, type CampaignBundle } from './engine/dataLoader';
import { buildAdjacencyMap, findShortestPath } from './graphics/pathfinding';
import { animatePlayerPath, type PlayerPosition } from './graphics/mapRenderer';
import { processStreetRobbery } from './engine/eventEngine';
import { executeAITurn } from './engine/aiEngine';
import { gameReducer, type GameAction } from './engine/gameReducer';

import { WeekendScreen } from './ui/WeekendScreen';
import { InventoryModal } from './ui/InventoryModal';
import { NewspaperModal } from './ui/NewspaperModal';
import { AnimationLayer, type FloatingAnimation } from './ui/AnimationLayer';

type AppStatus = 'loading' | 'ready' | 'error';

export default function App() {
  const [status, setStatus] = useState<AppStatus>('loading');
  const [campaign, setCampaign] = useState<CampaignBundle | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTitle, setShowTitle] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isNewspaperModalOpen, setIsNewspaperModalOpen] = useState(false);
  const [floatingAnims, setFloatingAnims] = useState<FloatingAnimation[]>([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);

  useEffect(() => {
    loadCampaign('classic_1990')
      .then((bundle) => {
        setCampaign(bundle);
        const initialState = createInitialGameState('classic_1990', [{name: 'Player 1', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom');
        setGameState(initialState);
        setStatus('ready');
      if (initialState && initialState.players[0].turnFlags.freeNewspaper) {
        setIsNewspaperModalOpen(true);
      }
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

  const addLog = (msg: string, weekOverride?: number) => {
    setLogs(prev => [...prev.slice(-19), { week: weekOverride ?? gameState?.turn ?? 1, message: msg }]);
  };

  const triggerAnim = (type: 'item' | 'emoji' | 'text', content: string, targetId: string) => {
    const targetEl = document.getElementById(targetId);
    let endX = window.innerWidth / 2;
    let endY = window.innerHeight / 2;
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      endX = rect.left + rect.width / 2;
      endY = rect.top + rect.height / 2;
    }
    const newAnim: FloatingAnimation = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content,
      startX: window.innerWidth / 2,
      startY: window.innerHeight / 2 - 100,
      endX,
      endY,
      duration: 1200,
    };
    setFloatingAnims(prev => [...prev, newAnim]);
  };

  const endTurnSequence = async (updatedPlayers: PlayerState[]) => {
    let player = updatedPlayers[activePlayerIndex];
    const housingDef = campaign!.housing.find(h => h.id === player.currentHousingId);
    const homeNodeId = housingDef ? housingDef.homeNodeId : 'node_low_cost';

    setIsBuildingModalOpen(false);

    if (player.position !== homeNodeId) {
      setIsAnimating(true);
      const pathResult = findShortestPath(adjacencyMap, player.position, homeNodeId);
      if (pathResult.found) {
        const pathCoords = pathResult.path.map(id => {
          const node = campaign!.map.nodes.find(n => n.id === id);
          return { nodeId: id, x: node!.x, y: node!.y };
        });
        await animatePlayerPath(pathCoords.slice(1), 150); // Double speed (150ms) when running home
      }
      setIsAnimating(false);
      // BUG FIX: Clone the array properly to prevent mutability leaks
      const newPlayers = [...updatedPlayers];
      player = { ...player, position: homeNodeId };
      newPlayers[activePlayerIndex] = player;
      updatedPlayers = newPlayers;
    }

    if (activePlayerIndex + 1 < updatedPlayers.length) {
      setGameState({ ...gameState!, players: updatedPlayers });
      setActivePlayerIndex(activePlayerIndex + 1);
    } else {
      const nextState = processTurnStart({ ...gameState!, players: updatedPlayers }, campaign!);
      if (nextState.phase !== 'game-over') {
        nextState.phase = 'weekend';
      }
      setGameState(nextState);
      setActivePlayerIndex(0);
      if (nextState.players[0].turnFlags.freeNewspaper) {
        setIsNewspaperModalOpen(true);
      }
    }
  };

  const handleAction = async (payload: any) => {
    if (!gameState || !campaign) return;

    if (payload.type === 'end-turn') {
      let updatedPlayers = [...gameState.players];
      // Zero out the remaining hours before running home
      updatedPlayers[activePlayerIndex] = { ...updatedPlayers[activePlayerIndex], hoursRemaining: 0 };
      setGameState({ ...gameState, players: updatedPlayers });
      
      // Allow a brief moment for the UI to update the hour counter to 0 before animating
      await new Promise(r => setTimeout(r, 100));

      await endTurnSequence(updatedPlayers);
      return;
    }

    setGameState(prevState => {
      if (!prevState) return prevState;

      let updatedPlayers = [...prevState.players];
      let oldPlayer = { ...updatedPlayers[activePlayerIndex] };
      
      const { updatedPlayer: player, actionLog } = gameReducer(
        oldPlayer,
        payload as GameAction,
        {
          campaign: campaign!,
          rules: prevState.rules,
          turn: prevState.turn
        }
      );

      // UI Side Effects
      if (payload.type === 'buy' && payload.itemId === 'newspaper') {
        if (player.money < oldPlayer.money) {
          setIsNewspaperModalOpen(true);
        }
      } else if (payload.type === 'buy' && player.inventory.appliances.length > oldPlayer.inventory.appliances.length) {
        triggerAnim('item', '📦', 'btn-inventory');
      }

      // Process explicit diffs and attach to log
      if (actionLog) {
        let finalActionLog = actionLog;
        let diffStr = [];
        const moneyDiff = player.money - oldPlayer.money;
        const hapDiff = player.happiness - oldPlayer.happiness;
        
        if (moneyDiff !== 0) {
          diffStr.push(`${moneyDiff > 0 ? '+' : ''}$${moneyDiff}`);
        }
        if (hapDiff !== 0) {
          diffStr.push(`${hapDiff > 0 ? '+' : ''}${hapDiff} Happiness`);
          if (hapDiff > 0) triggerAnim('emoji', '😍', 'stat-happiness');
        }
        
        if (diffStr.length > 0) {
          finalActionLog += ` (${diffStr.join(', ')})`;
        }
        addLog(finalActionLog, prevState.turn);
      }

      updatedPlayers[activePlayerIndex] = player;
      
      return { ...prevState, players: updatedPlayers };
    });

    // Check hours remaining asynchronously to end turn if needed.
    // We use a functional setState to ensure we have the absolute latest state to check.
    let needsEndTurn = false;
    let latestPlayers: PlayerState[] = [];
    setGameState(current => {
      if (!current) return current;
      if (current.players[activePlayerIndex].hoursRemaining <= 0) {
        needsEndTurn = true;
        latestPlayers = [...current.players];
      }
      return current;
    });

    if (needsEndTurn) {
      addLog(`${latestPlayers[activePlayerIndex].name} is out of time for the week!`);
      await endTurnSequence(latestPlayers);
    }
  };

  useEffect(() => {
    if (gameState?.phase === 'playing' && gameState.players[activePlayerIndex]?.isAi) {
      const runAi = async () => {
        setIsAnimating(true);
        // We get the actions initially.
        let stateSnapshot = gameState;
        const actions = executeAITurn(stateSnapshot.players[activePlayerIndex], stateSnapshot, campaign!);
        for (const action of actions) {
          // Since handleAction now uses functional state updates, we can just call it sequentially.
          // The delay gives React a moment to apply state, but handleAction handles its own state internally via setGameState(prev => ...)
          // However, executeAITurn is called once and gets all actions up-front.
          // That's fine because the AI makes decisions synchronously. 
          await handleAction(action);
          await new Promise(r => setTimeout(r, 200)); // small delay for visual feedback
        }
        setIsAnimating(false);
      };
      runAi();
    }
  }, [activePlayerIndex, gameState?.phase]);

  const handleNodeClick = async (nodeId: string) => {
    if (!gameState || !campaign || isAnimating) return;
    
    let updatedPlayers = [...gameState.players];
    let player = { ...updatedPlayers[activePlayerIndex] };

    // If we are already there, just open the modal if it's a building
    if (player.position === nodeId) {
      setIsBuildingModalOpen(true);
      return;
    }

    const pathResult = findShortestPath(adjacencyMap, player.position, nodeId);
    
    if (pathResult.found) {
      setIsBuildingModalOpen(false); // Auto close menu immediately when walking away
      setIsAnimating(true);

      const currentBuilding = campaign.map.nodes.find(n => n.id === player.position)?.buildingId;
      if (currentBuilding === 'bank' || currentBuilding === 'blacks_market') {
        const preRobberyMoney = player.money;
        player = processStreetRobbery(player, currentBuilding, gameState.turn);
        if (player.money < preRobberyMoney) {
          addLog("Wild Willy robbed you in the street!");
          triggerAnim('text', '-$$$', 'stat-money'); // stat-money is a guess, let's just trigger text at center
          player.newspaperHeadline = "WILD WILLY HAS LIFTED ANOTHER WALLET";
        }
      }
      
      const requestedSteps = pathResult.steps;
      const actualSteps = Math.min(requestedSteps, player.hoursRemaining);

      if (actualSteps > 0) {
        // Build the physical path for animation, up to the actual steps we can take
        const pathCoords: PlayerPosition[] = pathResult.path.slice(0, actualSteps + 1).map(id => {
          const node = campaign.map.nodes.find(n => n.id === id);
          return { nodeId: id, x: node!.x, y: node!.y };
        });

        // Animate the path we can take
        let pRef = { ...player };
        await animatePlayerPath(pathCoords.slice(1), 300, () => {
          pRef = spendHours(pRef, 1);
          setGameState(prev => {
            if (!prev) return prev;
            const newPlayers = [...prev.players];
            newPlayers[activePlayerIndex] = pRef;
            return { ...prev, players: newPlayers };
          });
        });

        // Ensure local player object matches the reference
        player = { ...pRef };
        player.position = pathResult.path[actualSteps];
        
        if (gameState.rules.autoEquipBestClothes) {
          const hasCasual = player.inventory.casualClothesWeeks > 0;
          const hasDress = player.inventory.dressClothesWeeks > 0;
          const hasBusiness = player.inventory.businessClothesWeeks > 0;
          
          if (hasBusiness) player.inventory.selectedClothes = 'business';
          else if (hasDress) player.inventory.selectedClothes = 'dress';
          else if (hasCasual) player.inventory.selectedClothes = 'casual';
          else player.inventory.selectedClothes = 'none';
        }
        
        player = recalculatePlayerEffects(player, campaign);
        updatedPlayers[activePlayerIndex] = player;
        
        if (player.hoursRemaining <= 0) {
          addLog(`${player.name} is out of time for the week!`);
          await endTurnSequence(updatedPlayers);
        } else {
          setGameState({ ...gameState, players: updatedPlayers });
          setIsBuildingModalOpen(true);
        }
      } else {
        // If they had exactly 0 hours but somehow clicked
        addLog(`${player.name} is out of time for the week!`);
      }
      setIsAnimating(false);
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
      <SetupScreen onConfirm={(playersConfig) => {
        const initialState = createInitialGameState('classic_1990', playersConfig, 'node_low_cost', 'cdrom');
        const firstTurnState = processTurnStart({ ...initialState, phase: 'playing' }, campaign!);
        setGameState(firstTurnState);
        addLog('Game started. Good luck!', firstTurnState.turn);
      }} />
    );
  }

  if (gameState.phase === 'weekend') {
    return (
      <WeekendScreen
        players={gameState.players}
        turn={gameState.turn - 1} // The current events were from the turn that just ended
        onNextWeek={() => {
          setGameState({ ...gameState, phase: 'playing' });
          addLog(`Week ${gameState.turn} begins.`, gameState.turn);
        }}
      />
    );
  }

  if (gameState.phase === 'game-over') {
    return (
      <GameOverScreen 
        playerName={gameState.winnerId || 'Player 1'} 
        turn={gameState.turn}
        onPlayAgain={() => {
          setGameState(createInitialGameState('classic_1990', [{name: 'Player 1', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom'));
          setShowTitle(true);
          setLogs([]);
          setActivePlayerIndex(0);
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
        onOpenInventory={() => setIsInventoryOpen(true)}
      />
      <main className="game-viewport">
        <AnimationLayer 
          animations={floatingAnims} 
          onAnimationComplete={(id) => setFloatingAnims(prev => prev.filter(a => a.id !== id))} 
        />
        <GameMap 
          campaign={campaign!} 
          player={activePlayer} 
          onNodeClick={handleNodeClick} 
        />
        <GameLog entries={logs} />
        {isBuildingModalOpen && currentBuildingId && (
          <BuildingModal
            player={activePlayer}
            campaign={campaign!}
            currentBuildingId={currentBuildingId}
            turn={gameState.turn}
            economicIndex={gameState.economicIndex}
            rules={gameState.rules}
            onAction={handleAction}
            onClose={() => setIsBuildingModalOpen(false)}
          />
        )}

        {isNewspaperModalOpen && (
          <NewspaperModal 
            headline={activePlayer?.newspaperHeadline || ""} 
            onClose={() => setIsNewspaperModalOpen(false)} 
          />
        )}

        {isInventoryOpen && activePlayer && (
          <InventoryModal
            player={activePlayer}
            onAction={handleAction}
            onClose={() => setIsInventoryOpen(false)}
          />
        )}
      </main>
    </div>
  );
}
