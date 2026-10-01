import { useState, useEffect } from 'react';
import type { GoalFilter } from './utils/logCategorizer';
import { Dashboard, type HudFoldState } from './ui/Dashboard';
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
import { useIsLandscape } from './hooks/useScreenOrientation';

export default function App() {
  const { t } = useTranslation();
  const isLandscape = useIsLandscape();
  const [showTitle, setShowTitle] = useState(true);
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isNewspaperModalOpen, setIsNewspaperModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [inventoryScrollSection, setInventoryScrollSection] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [activeLogFilter, setActiveLogFilter] = useState<GoalFilter | null>(null);
  const [hudFoldState, setHudFoldState] = useState<HudFoldState>('full');

  const handleOpenInventory = (section?: string) => {
    setInventoryScrollSection(section || null);
    setIsLogModalOpen(false);
    setIsInventoryOpen(true);
  };

  const handleOpenLog = () => {
    setIsInventoryOpen(false);
    setIsLogModalOpen(true);
  };

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

  // Global Esc key closes top active window/modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (streetRobberyNotice) {
          if (streetRobberyNotice.onConfirm) {
            streetRobberyNotice.onConfirm();
          } else {
            setStreetRobberyNotice(null);
          }
          return;
        }
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
          return;
        }
        if (isInventoryOpen) {
          setIsInventoryOpen(false);
          setInventoryScrollSection(null);
          return;
        }
        if (isLogModalOpen) {
          setIsLogModalOpen(false);
          return;
        }
        if (isNewspaperModalOpen) {
          setIsNewspaperModalOpen(false);
          return;
        }
        const activeP = gameState?.players?.[activePlayerIndex] || null;
        const currentBldId = (activeP && campaign) 
          ? (campaign.map.nodes.find(n => n.id === activeP.position)?.buildingId || null)
          : null;
        const isWknd = Boolean(activeP && !activeP.turnFlags?.hasSeenWeekend && (gameState?.turn ?? 0) > 1);

        if (isBuildingModalOpen && currentBldId && !isWknd) {
          setIsBuildingModalOpen(false);
          if (activeP && activeP.hoursRemaining <= 0) {
            handleAction({ type: 'end-turn' });
          } else if (activeP && gameState?.rules?.reenterCurrentLocationCost) {
            handleAction({ type: 'exit_building' });
          }
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    streetRobberyNotice,
    setStreetRobberyNotice,
    isSettingsOpen,
    isInventoryOpen,
    setInventoryScrollSection,
    isLogModalOpen,
    isNewspaperModalOpen,
    isBuildingModalOpen,
    setIsBuildingModalOpen,
    campaign,
    gameState,
    activePlayerIndex,
    handleAction
  ]);

  if (showTitle) {
    return <TitleScreen onStartGame={(campaignId) => {
      setSelectedCampaignId(campaignId);
      setIsBuildingModalOpen(false);
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
          } else {
            setIsBuildingModalOpen(false);
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
          setIsBuildingModalOpen(false);
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

  const isWeekend = Boolean(activePlayer && !activePlayer.turnFlags.hasSeenWeekend && gameState.turn > 1);

  const isAiTurn = activePlayer?.isAi || false;
  const hudSetting = gameState.rules.hudLayout || 'auto';
  const effectiveHudLayout: 'side' | 'top' = hudSetting === 'auto'
    ? (isLandscape ? 'side' : 'top')
    : hudSetting;
  const isAuthenticCurvedBoard = gameState.rules.authenticCurvedPaths !== false;
  const showBottomCenterClock = Boolean(activePlayer && (isAuthenticCurvedBoard || effectiveHudLayout === 'side'));


  return (
    <div className={`app-container app-container--${effectiveHudLayout}-hud ${effectiveHudLayout === 'side' ? `app-container--side-${hudFoldState}` : ''}`}>
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
        onSelectLogFilter={(filter) => {
          setActiveLogFilter(filter);
          if (filter) {
            handleOpenLog();
          }
        }}
        onOpenInventory={handleOpenInventory}
        onOpenSettings={() => setIsSettingsOpen(true)}
        layout={effectiveHudLayout}
        foldState={hudFoldState}
        onToggleFold={setHudFoldState}
      />
      <main className="game-viewport">
        {isWeekend && activePlayer && (
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
        )}
        <AnimationLayer 
          animations={floatingAnims} 
          onAnimationComplete={removeAnim} 
        />
        <div className={`map-container flex-grow relative overflow-hidden bg-black ${isAiTurn ? 'pointer-events-none' : ''}`}>
        <GameMap 
          campaign={campaign!} 
          players={gameState.players} 
          activePlayerIndex={activePlayerIndex}
          onNodeClick={isAiTurn ? () => {} : (nodeId) => {
            setIsInventoryOpen(false);
            setIsLogModalOpen(false);
            handleNodeClick(nodeId);
          }}
          authenticCurvedPaths={gameState.rules.authenticCurvedPaths}
        />
        </div>

        {/* Dynamic Money Badge in Side HUD mode */}
        {effectiveHudLayout === 'side' && activePlayer && (
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
              {(() => {
                const totalHours = campaign!.config.timeRules.hoursPerTurn;
                const spentPct = Math.max(0, Math.min(100, ((totalHours - activePlayer.hoursRemaining) / totalHours) * 100));
                const smoothMin = Math.max(0, spentPct - 0.25);
                const smoothMax = Math.min(100, spentPct + 0.25);
                return (
                  <div 
                    className="clock-dial"
                    style={{
                      background: `conic-gradient(#ff3333 0%, #ff3333 ${smoothMin}%, #ffffff ${smoothMax}%, #ffffff 100%)`
                    }}
                  >
                    <div 
                      className="clock-hand" 
                      style={{ transform: `rotate(${(spentPct / 100) * 360}deg)` }} 
                    />
                  </div>
                );
              })()}
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
        {(!isBuildingModalOpen || !currentBuildingId) && !isInventoryOpen && !isLogModalOpen && activePlayer && (
          <CenterWalkAnimation
            characterIndex={activePlayer.characterIndex ?? 0}
            clothesType={activePlayer.inventory?.selectedClothes || 'casual'}
            isWalking={isTravelling}
            pixelated={gameState.rules.pixelatedSprites ?? true}
            removeBg={gameState.rules.removeCharacterBg ?? true}
            onClick={() => handleOpenInventory()}
          />
        )}
        {isBuildingModalOpen && currentBuildingId && !isWeekend && (
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
              } else if (p && gameState.rules.reenterCurrentLocationCost) {
                handleAction({ type: 'exit_building' });
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
            onClose={() => {
              setIsInventoryOpen(false);
              setInventoryScrollSection(null);
            }}
            rules={gameState.rules}
            onOpenLog={handleOpenLog}
            scrollToSection={inventoryScrollSection}
          />
        )}

        {isSettingsOpen && (
          <SettingsModal 
            gameState={gameState} 
            setGameState={setGameState} 
            campaign={campaign!}
            replayData={replayData}
            onClose={() => setIsSettingsOpen(false)} 
            onOpenLog={handleOpenLog}
            logCount={logs.length}
            onQuitGame={() => {
              const randomSeed = generateRandomSeed();
              setGameState(createInitialGameState(campaign!, [{name: 'Player 1', isAi: false, goals: createDefaultGoalAllotment()}], 'node_low_cost', undefined, randomSeed));
              setShowTitle(true);
              setIsBuildingModalOpen(false);
              setIsSettingsOpen(false);
              setIsInventoryOpen(false);
              setIsLogModalOpen(false);
              setLogs([]);
              setActivePlayerIndex(0);
            }}
          />
        )}

        {isLogModalOpen && (
          <div 
            className={`building-modal ${gameState.rules.authenticCurvedPaths !== false ? 'building-modal--curved' : 'building-modal--schematic'}`}
            style={{ zIndex: 55, display: 'flex', flexDirection: 'column' }}
            data-testid="log-window"
          >
            <button 
              className="building-modal__close" 
              onClick={() => setIsLogModalOpen(false)}
              aria-label="Close"
              data-testid="log-modal-close"
            >
              &times;
            </button>
            <div className="building-modal__header">
              <div className="building-modal__face">📜</div>
              <div className="building-modal__title-group">
                <h2>{t('gameLog.title', { defaultValue: 'Activity Log' })}</h2>
              </div>
            </div>
            <div className="building-modal__content building-modal-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <GameLog 
                  entries={logs} 
                  players={gameState.players} 
                  activeFilter={activeLogFilter} 
                  onSelectFilter={setActiveLogFilter}
                />
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
