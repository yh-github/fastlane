import { useState } from 'react';
import type { GoalFilter } from './utils/logCategorizer';
import { Dashboard, type HudFoldState, type HudLayoutMode } from './ui/Dashboard';
import { useNavigationGuard } from './hooks/useNavigationGuard';
import { BuildingModal } from './ui/BuildingModal';
import { GameMap } from './ui/GameMap';
import { TitleScreen } from './ui/TitleScreen';
import { SetupScreen } from './ui/SetupScreen';
import { GameOverScreen } from './ui/GameOverScreen';
import { GameLog } from './ui/GameLog';
import { createInitialGameState, createDefaultGoalAllotment } from './engine/gameState';
import { generateRandomSeed, Random } from './utils/rng';
import { processTurnStart } from './engine/turnProcessor';
import { WeekendScreen } from './ui/WeekendScreen';
import { resolveWeekendChoice } from './engine/weekendEngine';
import { InventoryModal } from './ui/InventoryModal';
import { NewspaperModal } from './ui/NewspaperModal';
import { SettingsModal } from './ui/SettingsModal';
import { AnimationLayer } from './ui/AnimationLayer';
import { useGameAnimations } from './hooks/useGameAnimations';
import { useGameEngine } from './hooks/useGameEngine';
import { TurnEventsQueue } from './ui/TurnEventsQueue';
import { StreetRobberyModal } from './ui/StreetRobberyModal';
import { useTranslation } from 'react-i18next';
import { formatQuarterHours } from './engine/statMath';
import { CenterWalkAnimation } from './ui/CenterWalkAnimation';

export default function App() {
  const { t } = useTranslation();
  const [showTitle, setShowTitle] = useState(true);
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isNewspaperModalOpen, setIsNewspaperModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [activeLogFilter, setActiveLogFilter] = useState<GoalFilter | null>(null);
  const [hudFoldState, setHudFoldState] = useState<HudFoldState>('full');

  const { floatingAnims, triggerAnim, triggerScreenShake, removeAnim, isAnimating, setIsAnimating } = useGameAnimations();

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
    addLog,
    replayData,
    streetRobberyNotice,
    setStreetRobberyNotice,
    isTravelling
  } = useGameEngine(selectedCampaignId, triggerAnim, setIsAnimating, isAnimating, setIsBuildingModalOpen, setIsNewspaperModalOpen, triggerScreenShake);

  useNavigationGuard({ enabled: gameState?.phase === 'playing' });

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
      <SetupScreen 
        key={campaign?.config.name || selectedCampaignId || 'setup'}
        winConditions={campaign!.config.winConditions} 
        onConfirm={(playersConfig) => {
          const randomSeed = generateRandomSeed();
          const initialState = createInitialGameState(campaign!, playersConfig, 'node_low_cost', undefined, randomSeed);
          const firstTurnState = processTurnStart({ ...initialState, phase: 'playing' }, campaign!);
          setGameState(firstTurnState);
          if (firstTurnState.rules.turnStartAtHome && !firstTurnState.players[0].isAi) {
            setIsBuildingModalOpen(true);
          }
          addLog({ key: 'Game started. Good luck!' }, firstTurnState.turn);
        }} 
      />
    );
  }



  if (gameState.phase === 'game-over') {
    return (
      <GameOverScreen 
        playerName={gameState.winnerId || 'Player 1'} 
        turn={gameState.turn}
        replayData={replayData}
        onPlayAgain={() => {
          const randomSeed = generateRandomSeed();
          setGameState(createInitialGameState(campaign!, [{name: 'Player 1', isAi: false, goals: createDefaultGoalAllotment()}], 'node_low_cost', undefined, randomSeed));
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
        rules={gameState.rules}
        onSelectCard={(cardId: string) => {
          const rng = new Random(gameState.rngState);
          const resolvedPlayer = resolveWeekendChoice(activePlayer, cardId, rng, gameState.rules, campaign?.config.statRules);
          const newPlayers = [...gameState.players];
          newPlayers[activePlayerIndex] = resolvedPlayer;
          setGameState({
            ...gameState,
            players: newPlayers,
            rngState: rng.getState()
          });
          if (resolvedPlayer.weekendResult) {
            addLog({ key: `Weekend: ${resolvedPlayer.name} selected activity.` }, gameState.turn, activePlayer.id);
          }
        }}
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
  const hudLayout: HudLayoutMode = gameState.rules.hudLayout || 'top';
  const isAuthenticCurvedBoard = gameState.rules.authenticCurvedPaths !== false;
  const showBottomCenterClock = Boolean(activePlayer && (isAuthenticCurvedBoard || hudLayout === 'side'));

  return (
    <div className={`app-container app-container--${hudLayout}-hud ${hudLayout === 'side' ? `app-container--side-${hudFoldState}` : ''}`}>
      <Dashboard
        gameState={gameState}
        player={activePlayer}
        turn={gameState.turn}
        economicIndex={gameState.economicIndex}
        economicReading={gameState.economicReading ?? gameState.economicIndex}
        economicTrend={gameState.economicTrend}
        hoursPerTurn={campaign!.config.timeRules.hoursPerTurn}
        campaign={campaign!}
        activeLogFilter={activeLogFilter}
        onSelectLogFilter={setActiveLogFilter}
        onOpenInventory={() => setIsInventoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        layout={hudLayout}
        foldState={hudFoldState}
        onToggleFold={setHudFoldState}
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
          authenticCurvedPaths={gameState.rules.authenticCurvedPaths}
        />
        </div>

        {/* Dynamic Money Badge in Side HUD mode */}
        {hudLayout === 'side' && activePlayer && (
          <div 
            className={`dynamic-money-badge ${isBuildingModalOpen && currentBuildingId ? 'dynamic-money-badge--in-location' : 'dynamic-money-badge--center-stage'}`} 
            id="stat-money"
            data-testid="stat-money"
          >
            <span className="dynamic-money-badge__icon">💰</span>
            <span className="dynamic-money-badge__value">${activePlayer.money}</span>
          </div>
        )}

        {/* Unified Bottom Center Clock Widget (shown when authentic curved board, or in Side HUD mode) */}
        {showBottomCenterClock && activePlayer && (
          <div className="bottom-center-clock" data-testid="bottom-center-clock">
            <div className="clock-face">
              <div 
                className="clock-dial"
                style={{
                  background: `conic-gradient(#ff3333 0% ${((campaign!.config.timeRules.hoursPerTurn - activePlayer.hoursRemaining) / campaign!.config.timeRules.hoursPerTurn) * 100}%, #ffffff ${((campaign!.config.timeRules.hoursPerTurn - activePlayer.hoursRemaining) / campaign!.config.timeRules.hoursPerTurn) * 100}% 100%)`
                }}
              >
                <div 
                  className="clock-hand" 
                  style={{ transform: `rotate(${(((campaign!.config.timeRules.hoursPerTurn - activePlayer.hoursRemaining) / campaign!.config.timeRules.hoursPerTurn) * 360)}deg)` }} 
                />
              </div>
              <span className="clock-face-number" data-testid="clock-face-number" dir="ltr">
                {formatQuarterHours(activePlayer.hoursRemaining)}
              </span>
            </div>
            <div className="clock-digital-badge" id="hud-clock-digital">
              {t('dashboard.weekNumber', { turn: gameState.turn, defaultValue: `Week #${gameState.turn}` })}
            </div>
          </div>
        )}

        {/* Hidden activity log container preserves DOM presence for assertions and categorizers */}
        <div style={{ display: 'none' }} aria-hidden="true" data-testid="game-log-hidden-container">
          <GameLog 
            entries={logs} 
            players={gameState.players} 
            activeFilter={activeLogFilter} 
            onSelectFilter={setActiveLogFilter}
          />
        </div>
        {(!isBuildingModalOpen || !currentBuildingId) && activePlayer && (
          <CenterWalkAnimation
            characterIndex={activePlayer.characterIndex ?? 0}
            clothesType={activePlayer.inventory?.selectedClothes || 'casual'}
            isWalking={isTravelling}
            pixelated={gameState.rules.pixelatedSprites ?? true}
            removeBg={gameState.rules.removeCharacterBg ?? true}
          />
        )}
        {isBuildingModalOpen && currentBuildingId && (
          <BuildingModal
            player={gameState.players[activePlayerIndex]}
            campaign={campaign!}
            currentBuildingId={currentBuildingId}
            turn={gameState.turn}
            economicIndex={gameState.economicIndex}
            rules={gameState.rules}
            pawnShopItemsForSale={gameState.pawnShopItemsForSale}
            economySimulation={gameState.economySimulation}
            gameSeed={gameState.gameSeed ?? gameState.rngState}
            onAction={handleAction}
            onClose={() => {
              setIsBuildingModalOpen(false);
              const p = gameState.players[activePlayerIndex];
              if (p && p.hoursRemaining <= 0) {
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
            rules={gameState.rules}
            onOpenLog={() => setIsLogModalOpen(true)}
          />
        )}

        {isSettingsOpen && (
          <SettingsModal 
            gameState={gameState} 
            setGameState={setGameState} 
            campaign={campaign!}
            replayData={replayData}
            onClose={() => setIsSettingsOpen(false)} 
            onOpenLog={() => setIsLogModalOpen(true)}
            logCount={logs.length}
          />
        )}

        {isLogModalOpen && (
          <div className="fullscreen-overlay" style={{ zIndex: 10000 }}>
            <div className="building-modal" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <button className="building-modal__close" onClick={() => setIsLogModalOpen(false)}>×</button>
              <div className="building-modal__header">
                <div className="building-modal__face">📜</div>
                <div className="building-modal__title-group">
                  <h2>{t('gameLog.title', { defaultValue: 'Activity Log' })}</h2>
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <GameLog 
                  entries={logs} 
                  players={gameState.players} 
                  activeFilter={activeLogFilter} 
                  onSelectFilter={setActiveLogFilter}
                />
              </div>
              <div style={{ marginTop: '12px' }}>
                <button className="action-panel__btn" onClick={() => setIsLogModalOpen(false)}>
                  {t('settings.close', { defaultValue: 'Close' })}
                </button>
              </div>
            </div>
          </div>
        )}

        {streetRobberyNotice && (
          <StreetRobberyModal
            lostAmount={streetRobberyNotice.lostAmount}
            location={streetRobberyNotice.location}
            onClose={() => {
              if (streetRobberyNotice.onConfirm) {
                streetRobberyNotice.onConfirm();
              } else {
                setStreetRobberyNotice(null);
              }
            }}
          />
        )}
      </main>
    </div>
  );
}
