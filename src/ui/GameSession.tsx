import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { GoalFilter } from '../utils/logCategorizer';
import { Dashboard, type HudFoldState } from './Dashboard';
import { useNavigationGuard } from '../hooks/useNavigationGuard';
import { BuildingModal } from './BuildingModal';
import { GameMap } from './GameMap';
import { GameLog } from './GameLog';
import { WeekendScreen } from './WeekendScreen';
import { resolveWeekendChoice } from '../engine/weekendEngine';
import { InventoryModal } from './InventoryModal';
import { NewspaperModal } from './NewspaperModal';
import { SettingsModal } from './SettingsModal';
import { AnimationLayer } from './AnimationLayer';
import { useGameAnimations } from '../hooks/useGameAnimations';
import { useGameEngine } from '../hooks/useGameEngine';
import { TurnEventsQueue } from './TurnEventsQueue';
import { StreetRobberyModal } from './StreetRobberyModal';
import { useTranslation } from 'react-i18next';
import { formatQuarterHours } from '../engine/statMath';
import { CenterWalkAnimation } from './CenterWalkAnimation';
import { useIsLandscape } from '../hooks/useScreenOrientation';
import type { GameState } from '../engine/gameState';
import type { CampaignBundle } from '../engine/dataLoader';
import type { ReplayData } from '../engine/replayTypes';
import { Random } from '../utils/rng';
import type { ActiveModal } from '../types/modal';

export interface GameSessionProps {
  campaign: CampaignBundle;
  initialGameState: GameState;
  onGameOver: (info: { playerName: string; turn: number; replayData: ReplayData | null }) => void;
  onQuitToTitle: () => void;
}

export const GameSession: React.FC<GameSessionProps> = ({
  campaign,
  initialGameState,
  onGameOver,
  onQuitToTitle,
}) => {
  const { t } = useTranslation();
  const isLandscape = useIsLandscape();
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const previousModalRef = useRef<ActiveModal>(null);
  const [activeLogFilter, setActiveLogFilter] = useState<GoalFilter | null>(null);
  const [hudFoldState, setHudFoldState] = useState<HudFoldState>('full');

  const openModal = useCallback((modal: ActiveModal) => {
    setActiveModal((current) => {
      if (current?.type === 'building' && (modal?.type === 'inventory' || modal?.type === 'settings' || modal?.type === 'log')) {
        previousModalRef.current = current;
      } else if (modal?.type !== 'inventory' && modal?.type !== 'settings' && modal?.type !== 'log') {
        previousModalRef.current = null;
      }
      return modal;
    });
  }, []);

  const closeModal = useCallback(() => {
    if (previousModalRef.current) {
      const prev = previousModalRef.current;
      previousModalRef.current = null;
      setActiveModal(prev);
    } else {
      setActiveModal(null);
    }
  }, []);

  const handleOpenInventory = useCallback((section?: string) => {
    openModal({ type: 'inventory', section: section || null });
  }, [openModal]);

  const handleOpenLog = useCallback(() => {
    openModal({ type: 'log' });
  }, [openModal]);

  const {
    floatingAnims,
    triggerAnim,
    triggerScreenShake,
    removeAnim,
    clearFloatingAnims,
    isAnimating,
    setIsAnimating,
  } = useGameAnimations();

  const {
    gameState,
    setGameState,
    logs,
    activePlayerIndex,
    handleAction,
    handleNodeClick,
    replayData,
    streetRobberyNotice,
    setStreetRobberyNotice,
    isTravelling,
  } = useGameEngine(
    campaign,
    initialGameState,
    triggerAnim,
    setIsAnimating,
    isAnimating,
    openModal,
    closeModal,
    triggerScreenShake,
    clearFloatingAnims
  );

  useNavigationGuard({ enabled: gameState?.phase === 'playing' });

  // Handle Game Over transition
  useEffect(() => {
    if (gameState?.phase === 'game-over') {
      onGameOver({
        playerName: gameState.winnerId || 'Player 1',
        turn: gameState.turn,
        replayData,
      });
    }
  }, [gameState?.phase, gameState?.winnerId, gameState?.turn, replayData, onGameOver]);

  // Global Esc key closes top active window/modal scoped to this session
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
        if (
          activeModal?.type === 'settings' ||
          activeModal?.type === 'inventory' ||
          activeModal?.type === 'log' ||
          activeModal?.type === 'newspaper'
        ) {
          closeModal();
          return;
        }
        const activeP = gameState?.players?.[activePlayerIndex] || null;
        const currentBldId = (activeP && campaign)
          ? (campaign.map.nodes.find((n) => n.id === activeP.position)?.buildingId || null)
          : null;
        const isWknd = Boolean(activeP && !activeP.turnFlags?.hasSeenWeekend && (gameState?.turn ?? 0) > 1);

        if (activeModal?.type === 'building' && currentBldId && !isWknd) {
          closeModal();
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
    activeModal,
    closeModal,
    campaign,
    gameState,
    activePlayerIndex,
    handleAction,
  ]);

  const activePlayer = gameState?.players?.[activePlayerIndex] || null;
  const currentBuildingId = (activePlayer && campaign)
    ? (campaign.map.nodes.find((n) => n.id === activePlayer.position)?.buildingId || null)
    : null;

  useEffect(() => {
    if (!gameState || !activePlayer) return;
    if (typeof window !== 'undefined') {
      (window as any).__openBuilding = (buildingId: string) => {
        const node = campaign?.map.nodes.find((n) => n.buildingId === buildingId);
        if (node && activePlayer) {
          const newPlayers = [...gameState.players];
          newPlayers[activePlayerIndex] = {
            ...activePlayer,
            position: node.id,
          };
          setGameState({ ...gameState, players: newPlayers });
          openModal({ type: 'building' });
        }
      };
      (window as any).__triggerAppraisalDilemma = (dilemma?: any) => {
        if (activePlayer) {
          const newPlayers = [...gameState.players];
          newPlayers[activePlayerIndex] = {
            ...activePlayer,
            pendingMiniGame: dilemma || {
              itemTitle: 'Antique Swiss Tourbillon Pocketwatch',
              options: [
                { type: 'cash', title: 'Quick Escapement Adjustment', description: 'Clean gears for quick tip.', cashAmount: 25 },
                { type: 'standing', title: 'Master Horology Certification', description: 'Authenticate for shop record.', depAmount: 2, mentalAmount: 1 },
                { type: 'item', title: 'Vintage Horological Curio', description: 'Take piece for display.', itemType: 'knick_knack' },
                { type: 'skill', title: 'Study Mechanical Escapement', description: 'Disassemble mechanism.', techSkillAmount: 0.25, mentalAmount: 2 }
              ]
            }
          };
          setGameState({ ...gameState, players: newPlayers });
          openModal({ type: 'building' });
        }
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__openBuilding;
        delete (window as any).__triggerAppraisalDilemma;
      }
    };
  }, [campaign, activePlayer, activePlayerIndex, gameState, openModal, setGameState]);

  if (!gameState) return null;

  if (activePlayer && !activePlayer.turnFlags.hasSeenEvents && activePlayer.turnEvents && activePlayer.turnEvents.length > 0 && gameState.turn > 1) {
    return (
      <TurnEventsQueue 
        events={activePlayer.turnEvents}
        onComplete={() => {
          const newPlayers = [...gameState.players];
          newPlayers[activePlayerIndex] = {
            ...activePlayer,
            turnFlags: { ...activePlayer.turnFlags, hasSeenEvents: true },
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
        hoursPerTurn={campaign.config.timeRules.hoursPerTurn}
        campaign={campaign}
        activeLogFilter={activeLogFilter}
        onSelectLogFilter={(filter) => {
          setActiveLogFilter(filter);
          if (filter) {
            handleOpenLog();
          }
        }}
        onOpenInventory={handleOpenInventory}
        onOpenSettings={() => openModal({ type: 'settings' })}
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
              const resolvedPlayer = resolveWeekendChoice(activePlayer, cardId, rng, gameState.rules, campaign.config.statRules);
              const newPlayers = [...gameState.players];
              newPlayers[activePlayerIndex] = resolvedPlayer;
              setGameState({
                ...gameState,
                players: newPlayers,
                rngState: rng.getState(),
              });
              if (resolvedPlayer.weekendResult) {
                // Log event
              }
            }}
            onStartWeek={() => {
              const newPlayers = [...gameState.players];
              newPlayers[activePlayerIndex] = {
                ...activePlayer,
                turnFlags: { ...activePlayer.turnFlags, hasSeenWeekend: true },
              };
              setGameState({ ...gameState, players: newPlayers });
            }}
          />
        )}
        <AnimationLayer 
          animations={floatingAnims} 
          onAnimationComplete={removeAnim} 
        />
        <div className={`map-container flex-grow relative overflow-hidden bg-black ${isAiTurn ? 'pointer-events-none' : ''}`}>
          <GameMap 
            campaign={campaign} 
            players={gameState.players} 
            activePlayerIndex={activePlayerIndex}
            onNodeClick={isAiTurn ? () => {} : (nodeId) => {
              closeModal();
              handleNodeClick(nodeId);
            }}
            authenticCurvedPaths={gameState.rules.authenticCurvedPaths}
          />
        </div>

        {/* Dynamic Money Badge in Side HUD mode */}
        {effectiveHudLayout === 'side' && activePlayer && (
          <div 
            className={`dynamic-money-badge ${activeModal?.type === 'building' && currentBuildingId ? 'dynamic-money-badge--in-location' : 'dynamic-money-badge--center-stage'}`} 
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
                const totalHours = campaign.config.timeRules.hoursPerTurn;
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

        {(!activeModal || (activeModal.type === 'building' && !currentBuildingId)) && activePlayer && (
          <CenterWalkAnimation
            characterIndex={activePlayer.characterIndex ?? 0}
            clothesType={activePlayer.inventory?.selectedClothes || 'casual'}
            isWalking={isTravelling}
            pixelated={gameState.rules.pixelatedSprites ?? true}
            removeBg={gameState.rules.removeCharacterBg ?? true}
            onClick={() => handleOpenInventory()}
          />
        )}

        {activeModal?.type === 'building' && currentBuildingId && !isWeekend && (
          <BuildingModal
            player={gameState.players[activePlayerIndex]}
            campaign={campaign}
            currentBuildingId={currentBuildingId}
            turn={gameState.turn}
            economicIndex={gameState.economicIndex}
            rules={gameState.rules}
            pawnShopItemsForSale={gameState.pawnShopItemsForSale}
            economySimulation={gameState.economySimulation}
            gameSeed={gameState.gameSeed ?? gameState.rngState}
            onAction={handleAction}
            onClose={() => {
              closeModal();
              const p = gameState.players[activePlayerIndex];
              if (p && p.hoursRemaining <= 0) {
                handleAction({ type: 'end-turn' });
              } else if (p && gameState.rules.reenterCurrentLocationCost) {
                handleAction({ type: 'exit_building' });
              }
            }}
          />
        )}

        {activeModal?.type === 'newspaper' && (
          <NewspaperModal 
            headline={activePlayer?.newspaperHeadline || null} 
            onClose={closeModal} 
          />
        )}

        {activeModal?.type === 'inventory' && activePlayer && (
          <InventoryModal
            player={activePlayer}
            campaign={campaign}
            turn={gameState.turn}
            onAction={handleAction}
            onClose={closeModal}
            rules={gameState.rules}
            onOpenLog={handleOpenLog}
            scrollToSection={activeModal.section || null}
          />
        )}

        {activeModal?.type === 'settings' && (
          <SettingsModal 
            gameState={gameState} 
            setGameState={setGameState} 
            campaign={campaign}
            replayData={replayData}
            onClose={closeModal} 
            onOpenLog={handleOpenLog}
            logCount={logs.length}
            onQuitGame={onQuitToTitle}
          />
        )}

        {activeModal?.type === 'log' && (
          <div 
            className={`building-modal ${gameState.rules.authenticCurvedPaths !== false ? 'building-modal--curved' : 'building-modal--schematic'}`}
            style={{ zIndex: 55, display: 'flex', flexDirection: 'column' }}
            data-testid="log-window"
          >
            <button 
              className="building-modal__close" 
              onClick={closeModal}
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
};
