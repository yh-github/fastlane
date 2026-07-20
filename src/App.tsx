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
import { SettingsModal } from './ui/SettingsModal';
import { AnimationLayer } from './ui/AnimationLayer';
import { useGameAnimations } from './hooks/useGameAnimations';
import { useGameEngine } from './hooks/useGameEngine';
import { TurnEventsQueue } from './ui/TurnEventsQueue';

export default function App() {
  const [showTitle, setShowTitle] = useState(true);
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isNewspaperModalOpen, setIsNewspaperModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

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
  } = useGameEngine(selectedCampaignId, triggerAnim, setIsAnimating, isAnimating, setIsBuildingModalOpen, setIsNewspaperModalOpen);

  if (showTitle) {
    return <TitleScreen onStartGame={(campaignId) => {
      setSelectedCampaignId(campaignId);
      setShowTitle(false);
    }} />;
  }

  if (status === 'loading') {
    return <div className="loading-screen">Loading campaign data…</div>;
  }

  if (status === 'error') {
    return <div className="error-screen">Error: {errorMsg}</div>;
  }

  if (!gameState) return null;

  if (gameState.phase === 'setup') {
    return (
      <SetupScreen onConfirm={(playersConfig) => {
        const randomSeed = Math.floor(Math.random() * 2147483647);
        const initialState = createInitialGameState(campaign!, playersConfig, 'node_low_cost', undefined, randomSeed);
        const firstTurnState = processTurnStart({ ...initialState, phase: 'playing' }, campaign!);
        setGameState(firstTurnState);
        addLog({ key: 'Game started. Good luck!' }, firstTurnState.turn);
      }} />
    );
  }



  if (gameState.phase === 'game-over') {
    return (
      <GameOverScreen 
        playerName={gameState.winnerId || 'Player 1'} 
        turn={gameState.turn}
        onPlayAgain={() => {
          const randomSeed = Math.floor(Math.random() * 2147483647);
          setGameState(createInitialGameState(campaign!, [{name: 'Player 1', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', undefined, randomSeed));
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

  if (activePlayer && !activePlayer.turnFlags.hasSeenEvents && activePlayer.turnEvents && activePlayer.turnEvents.length > 0 && gameState.turn > 1) {
    return (
      <TurnEventsQueue 
        events={activePlayer.turnEvents}
        onComplete={() => {
          const newPlayers = [...gameState.players];
          newPlayers[activePlayerIndex] = {
            ...activePlayer,
            turnFlags: { ...activePlayer.turnFlags, hasSeenEvents: true }
          };
          setGameState({ ...gameState, players: newPlayers });
        }}
      />
    );
  }

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
          addLog({ key: `Week ${gameState.turn} begins for ${activePlayer.name}.` }, gameState.turn, activePlayer.id);
        }}
      />
    );
  }

  const isAiTurn = activePlayer?.isAi || false;

  return (
    <div className="app-container">
      <Dashboard
        gameState={gameState}
        player={activePlayer}
        turn={gameState.turn}
        economicIndex={gameState.economicIndex}
        hoursPerTurn={campaign!.config.timeRules.hoursPerTurn}
        campaign={campaign!}
        onOpenInventory={() => setIsInventoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <main className="game-viewport">
        <AnimationLayer 
          animations={floatingAnims} 
          onAnimationComplete={removeAnim} 
        />
        <div className={`map-container flex-grow relative overflow-hidden bg-black ${isAiTurn ? 'pointer-events-none' : ''}`}>
        <GameMap 
          campaign={campaign!} 
          players={gameState.players} 
          activePlayerIndex={activePlayerIndex}
          onNodeClick={isAiTurn ? () => {} : handleNodeClick} 
        />
        </div>
        <GameLog entries={logs} players={gameState.players} />
        {isBuildingModalOpen && currentBuildingId && (
          <BuildingModal
            player={gameState.players[activePlayerIndex]}
            campaign={campaign!}
            currentBuildingId={currentBuildingId}
            turn={gameState.turn}
            economicIndex={gameState.economicIndex}
            rules={gameState.rules}
            pawnShopItemsForSale={gameState.pawnShopItemsForSale}
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
            headline={activePlayer?.newspaperHeadline || null} 
            onClose={() => setIsNewspaperModalOpen(false)} 
          />
        )}

        {isInventoryOpen && activePlayer && (
          <InventoryModal
            player={activePlayer}
            campaign={campaign!}
            turn={gameState.turn}
            onAction={handleAction}
            onClose={() => setIsInventoryOpen(false)}
          />
        )}

        {isSettingsOpen && (
          <SettingsModal 
            gameState={gameState} 
            setGameState={setGameState} 
            onClose={() => setIsSettingsOpen(false)} 
          />
        )}
      </main>
    </div>
  );
}
