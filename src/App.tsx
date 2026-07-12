import { useState } from 'react';
import { Dashboard } from './ui/Dashboard';
import { BuildingModal } from './ui/BuildingModal';
import { GameMap } from './ui/GameMap';
import { TitleScreen } from './ui/TitleScreen';
import { SetupScreen } from './ui/SetupScreen';
import { GameOverScreen } from './ui/GameOverScreen';
import { GameLog } from './ui/GameLog';
import { createInitialGameState } from './engine/gameState';
import { processTurnStart } from './engine/turnProcessor';
import { WeekendScreen } from './ui/WeekendScreen';
import { InventoryModal } from './ui/InventoryModal';
import { NewspaperModal } from './ui/NewspaperModal';
import { AnimationLayer } from './ui/AnimationLayer';
import { useGameAnimations } from './hooks/useGameAnimations';
import { useGameEngine } from './hooks/useGameEngine';

export default function App() {
  const [showTitle, setShowTitle] = useState(true);
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isNewspaperModalOpen, setIsNewspaperModalOpen] = useState(false);

  const { floatingAnims, triggerAnim, removeAnim, isAnimating, setIsAnimating } = useGameAnimations();

  const {
    status,
    campaign,
    gameState,
    setGameState,
    errorMsg,
    logs,
    setLogs,
    activePlayerIndex,
    setActivePlayerIndex,
    handleAction,
    handleNodeClick,
    addLog
  } = useGameEngine(triggerAnim, setIsAnimating, isAnimating, setIsBuildingModalOpen, setIsNewspaperModalOpen);

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
        const initialState = createInitialGameState(campaign!, playersConfig, 'node_low_cost', 'cdrom');
        const firstTurnState = processTurnStart({ ...initialState, phase: 'playing' }, campaign!);
        setGameState(firstTurnState);
        addLog('Game started. Good luck!', firstTurnState.turn);
      }} />
    );
  }



  if (gameState.phase === 'game-over') {
    return (
      <GameOverScreen 
        playerName={gameState.winnerId || 'Player 1'} 
        turn={gameState.turn}
        onPlayAgain={() => {
          setGameState(createInitialGameState(campaign!, [{name: 'Player 1', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', 'cdrom'));
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

  if (activePlayer && !activePlayer.turnFlags.hasSeenWeekend && gameState.turn > 1) {
    return (
      <WeekendScreen
        player={activePlayer}
        turn={gameState.turn}
        onStartWeek={() => {
          const newPlayers = [...gameState.players];
          newPlayers[activePlayerIndex] = {
            ...activePlayer,
            turnFlags: { ...activePlayer.turnFlags, hasSeenWeekend: true }
          };
          setGameState({ ...gameState, players: newPlayers });
          addLog(`Week ${gameState.turn} begins for ${activePlayer.name}.`, gameState.turn);
        }}
      />
    );
  }

  return (
    <div className="app-container">
      <Dashboard
        player={activePlayer}
        turn={gameState.turn}
        economicIndex={gameState.economicIndex}
        hoursPerTurn={campaign!.config.timeRules.hoursPerTurn}
        onOpenInventory={() => setIsInventoryOpen(true)}
      />
      <main className="game-viewport">
        <AnimationLayer 
          animations={floatingAnims} 
          onAnimationComplete={removeAnim} 
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
            onClose={() => {
              setIsBuildingModalOpen(false);
              if (activePlayer.hoursRemaining <= 0) {
                handleAction({ type: 'end-turn' });
              }
            }}
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
