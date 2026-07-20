import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { type GameState, type PlayerState, createInitialGameState, recalculatePlayerEffects } from '../engine/gameState';
import { processTurnStart } from '../engine/turnProcessor';
import { spendHours } from '../engine/timeManager';
import { loadCampaign, type CampaignBundle } from '../engine/dataLoader';
import { buildAdjacencyMap, findShortestPath } from '../graphics/pathfinding';
import { animatePlayerPath, pulsePlayer, type PlayerPosition } from '../graphics/mapRenderer';
import { processStreetRobbery } from '../engine/eventEngine';
import { executeAITurn } from '../engine/aiEngine';
import { simulateActionVisuals } from '../engine/aiTranslator';
import { gameReducer, type GameAction } from '../engine/gameReducer';
import type { LogEntry } from '../ui/GameLog';
import type { GameEvent } from '../engine/gameState';
import { Random } from '../utils/rng';

export type AppStatus = 'loading' | 'ready' | 'error';

export function useGameEngine(
  campaignId: string | null,
  triggerAnim: (type: 'item' | 'emoji' | 'text', content: string, options?: any) => void,
  setIsAnimating: (val: boolean) => void,
  isAnimating: boolean,
  setIsBuildingModalOpen: (val: boolean) => void,
  setIsNewspaperModalOpen: (val: boolean) => void
) {
  const [status, setStatus] = useState<AppStatus>('loading');
  const [campaign, setCampaign] = useState<CampaignBundle | null>(null);
  const [gameState, _setGameState] = useState<GameState | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);


  const setGameState = useCallback((updater: GameState | null | ((prev: GameState | null) => GameState | null)) => {
    if (typeof updater === 'function') {
      gameStateRef.current = updater(gameStateRef.current);
    } else {
      gameStateRef.current = updater;
    }
    _setGameState(gameStateRef.current);
  }, []);

  useEffect(() => {
    if (!campaignId) return;
    setStatus('loading');
    loadCampaign(campaignId)
      .then((bundle) => {
        setCampaign(bundle);
        const randomSeed = Math.floor(Math.random() * 2147483647);
        const initialState = createInitialGameState(bundle, [{name: 'Player 1', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', undefined, randomSeed);
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
  }, [campaignId, setGameState, setIsNewspaperModalOpen]);

  const adjacencyMap = useMemo(() => {
    if (!campaign) return new Map<string, string[]>();
    return buildAdjacencyMap(campaign.map.nodes);
  }, [campaign]);

  const addLog = useCallback((event: GameEvent, weekOverride?: number, playerId?: string) => {
    setLogs(prev => [...prev.slice(-9999), { week: weekOverride ?? gameStateRef.current?.turn ?? 1, event, playerId }]);
  }, []);

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
        await animatePlayerPath(pathCoords.slice(1), activePlayerIndex, 150); // Double speed (150ms) when running home
      }
      setIsAnimating(false);
      // BUG FIX: Clone the array properly to prevent mutability leaks
      const newPlayers = [...updatedPlayers];
      player = { ...player, position: homeNodeId };
      newPlayers[activePlayerIndex] = player;
      updatedPlayers = newPlayers;
    }

    if (activePlayerIndex + 1 < updatedPlayers.length) {
      setGameState({ ...gameStateRef.current!, players: updatedPlayers });
      setActivePlayerIndex(activePlayerIndex + 1);
    } else {
      const nextState = processTurnStart({ ...gameStateRef.current!, players: updatedPlayers }, campaign!);
      setGameState(nextState);
      setActivePlayerIndex(0);
      if (nextState.players[0].turnFlags.freeNewspaper) {
        setIsNewspaperModalOpen(true);
      }
    }
  };

  const handleAction = async (payload: any) => {
    if (!gameStateRef.current || !campaign) return;
    const currentState = gameStateRef.current;

    if (payload.type === 'end-turn') {
      let updatedPlayers = [...currentState.players];
      // Zero out the remaining hours before running home
      updatedPlayers[activePlayerIndex] = { ...updatedPlayers[activePlayerIndex], hoursRemaining: 0 };
      setGameState({ ...currentState, players: updatedPlayers });
      
      // Allow a brief moment for the UI to update the hour counter to 0 before animating
      await new Promise(r => setTimeout(r, 100));

      await endTurnSequence(updatedPlayers);
      return;
    }

    if (payload.type === 'move') {
      const nodeId = payload.nodeId;
      const node = campaign.map.nodes.find(n => n.id === nodeId);
      let updatedPlayers = [...currentState.players];
      let player = { ...updatedPlayers[activePlayerIndex] };
      const activePlayer = updatedPlayers[activePlayerIndex];

      // If we are already there, just open the modal if it's a building
      if (player.position === nodeId) {
        // Only open the building modal if this is a HUMAN player moving to a building
        if (!activePlayer.isAi && campaign!.buildings.some(b => b.id === node?.buildingId)) {
          setIsBuildingModalOpen(true);
        }
        return;
      }

      const pathResult = findShortestPath(adjacencyMap, player.position, nodeId);
      
      if (pathResult.found) {
        setIsBuildingModalOpen(false); // Auto close menu immediately when walking away
        setIsAnimating(true);

        const currentBuilding = campaign.map.nodes.find(n => n.id === player.position)?.buildingId;
        if (currentBuilding === 'bank' || currentBuilding === 'blacks_market') {
          const preRobberyMoney = player.money;
          const rng = new Random(currentState.rngState);
          player = processStreetRobbery(player, currentBuilding, currentState.turn, rng, campaign);
          
          if (player.money < preRobberyMoney) {
            addLog({ key: 'log.robbery' }, undefined, player.id);
            if (currentState.rules.enableAnimations) {
              const diff = player.money - preRobberyMoney;
              triggerAnim('text', `${diff} 💸`, { sourceId: 'stat-money', customClass: 'anim-negative' });
            }
            player.newspaperHeadline = { key: 'newspaper.robbery' };
          }
          // Save the RNG state back since we used it!
          setGameState(prev => prev ? { ...prev, rngState: rng.getState() } : prev);
        }
        
        const movementCost = (campaign.config.mapRules as any)?.movementCostPerNode || 1;
        const requestedSteps = pathResult.steps;
        const maxAffordableSteps = Math.floor(player.hoursRemaining / movementCost);
        const actualSteps = Math.min(requestedSteps, maxAffordableSteps);

        if (actualSteps > 0) {
          // Build the physical path for animation, up to the actual steps we can take
          const pathCoords: PlayerPosition[] = pathResult.path.slice(0, actualSteps + 1).map(id => {
            const node = campaign.map.nodes.find(n => n.id === id);
            return { nodeId: id, x: node!.x, y: node!.y };
          });

          // Animate the path we can take
          let pRef = { ...player };
          await animatePlayerPath(pathCoords.slice(1), activePlayerIndex, 300, () => {
            pRef = spendHours(pRef, movementCost);
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
          
          if (currentState.rules.autoEquipBestClothes) {
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
            addLog({ key: 'log.outOfTime', params: { name: player.name } }, undefined, player.id);
            await endTurnSequence(updatedPlayers);
          } else {
            // If we reached the destination and it has a building, apply entry cost
            const destNode = campaign.map.nodes.find(n => n.id === player.position);
            if (destNode && destNode.buildingId && actualSteps === requestedSteps) {
              const entryCost = campaign.config.timeRules.buildingEntryCost || 2;
              player = spendHours(player, entryCost);
              updatedPlayers[activePlayerIndex] = player;
            }

            setGameState(prev => {
               if (!prev) return prev;
               return { ...prev, players: updatedPlayers };
            });
            
            if (!activePlayer.isAi) {
              setIsBuildingModalOpen(true);
            }
          }
        } else {
          // If they have no hours left to move
          addLog({ key: 'log.outOfTime', params: { name: player.name } }, undefined, player.id);
          await endTurnSequence(updatedPlayers);
        }
        setIsAnimating(false);
      }
      return;
    }

    let resultActionLog: GameEvent | undefined = undefined;

    setGameState(prevState => {
      if (!prevState) return prevState;

      let updatedPlayers = [...prevState.players];
      let oldPlayer = { ...updatedPlayers[activePlayerIndex] };
      const rng = new Random(prevState.rngState);
      
      const { updatedPlayer: player, actionLog, updatedPawnShopItemsForSale } = gameReducer(
        oldPlayer,
        payload as GameAction,
        {
          campaign: campaign!,
          rules: prevState.rules,
          turn: prevState.turn,
          economicIndex: prevState.economicIndex,
          rng,
          state: prevState
        }
      );

      resultActionLog = actionLog;

      // UI Side Effects
      if (payload.type === 'buy' && payload.itemId === 'newspaper') {
        if (player.money < oldPlayer.money) {
          setIsNewspaperModalOpen(true);
        }
      } else if (payload.type === 'buy' && player.inventory.appliances.length > oldPlayer.inventory.appliances.length) {
        if (prevState.rules.enableAnimations) {
          triggerAnim('item', '📦', { targetId: 'btn-inventory' });
        }
      }

      // Process explicit diffs and attach to log
      if (actionLog) {
        let finalActionLog: GameEvent = { ...actionLog, params: { ...actionLog.params } };
        let diffStr = [];
        const moneyDiff = player.money - oldPlayer.money;
        const hapDiff = player.happiness - oldPlayer.happiness;
        
        if (moneyDiff !== 0) {
          diffStr.push(`${moneyDiff > 0 ? '+' : ''}$${moneyDiff}`);
          if (prevState.rules.enableAnimations) {
            if (moneyDiff < 0) {
              triggerAnim('text', `-$${Math.abs(moneyDiff)}`, { sourceId: 'stat-money', customClass: 'anim-negative' });
            } else {
              triggerAnim('text', `+$${moneyDiff}`, { targetId: 'stat-money', customClass: 'anim-positive' });
            }
          }
        }
        if (hapDiff !== 0) {
          diffStr.push(`${hapDiff > 0 ? '+' : ''}${hapDiff} Happiness`);
          if (prevState.rules.enableAnimations) {
            if (hapDiff > 0) {
              triggerAnim('emoji', '😍', { targetId: 'stat-happiness' });
            } else {
              triggerAnim('emoji', '😟', { sourceId: 'stat-happiness' });
            }
          }
        }
        
        if (diffStr.length > 0) {
          finalActionLog.params!.diff = ` (${diffStr.join(', ')})`;
        }
        addLog(finalActionLog, prevState.turn, player.id);
      }

      updatedPlayers[activePlayerIndex] = player;
      
      const newState = { ...prevState, players: updatedPlayers, rngState: rng.getState() };
      if (updatedPawnShopItemsForSale) {
        newState.pawnShopItemsForSale = updatedPawnShopItemsForSale;
      }
      return newState;
    });

    return resultActionLog;
    // We intentionally do NOT auto-end the turn when hours drop to 0.
    // The player may still perform 0-cost actions (like buying items) while in the building.
    // Their turn will end when they attempt to move (leave the location).
  };

  const handleNodeClick = async (nodeId: string) => {
    if (!gameStateRef.current || !campaign || isAnimating) return;
    await handleAction({ type: 'move', nodeId });
  };

  useEffect(() => {
    // Only run AI if it's playing phase, it's an AI, AND they haven't just started their turn looking at the weekend screen
    if (gameState?.phase === 'playing' && gameState.players[activePlayerIndex]?.isAi && gameState.players[activePlayerIndex]?.turnFlags?.hasSeenWeekend) {
      const runAi = async () => {
        setIsAnimating(true);
        
        // Pulse the AI character to draw attention before they start moving
        await pulsePlayer(activePlayerIndex);
        
        let maxLoops = 20;
        const initialTurn = gameStateRef.current!.turn;
        const aiPlayerId = gameStateRef.current!.players[activePlayerIndex]?.id;
        
        while (maxLoops > 0) {
          let stateSnapshot = gameStateRef.current!;
          
          if (stateSnapshot.turn !== initialTurn) break; // Turn advanced, break out
          if (stateSnapshot.players[activePlayerIndex]?.id !== aiPlayerId) break; // Player changed
          
          let player = stateSnapshot.players[activePlayerIndex];
          
          if (player.hoursRemaining <= 0) {
            await handleAction({ type: 'end-turn' });
            break;
          }

          const actions = executeAITurn(player, stateSnapshot, campaign!);
          if (actions.length === 0) {
            await handleAction({ type: 'end-turn' });
            break;
          }

          // Pre-action visual pacing
          await simulateActionVisuals(actions[0], { setIsBuildingModalOpen });

          await handleAction(actions[0]);
          await new Promise(r => setTimeout(r, 600)); // slightly longer delay for visual pathfinding feedback

          // If the turn ended via the action (e.g. movement ran out of hours), stop
          let currentSnapshot = gameStateRef.current!;
          if (currentSnapshot.phase !== 'playing' || currentSnapshot.players[activePlayerIndex]?.hoursRemaining <= 0) {
            if (currentSnapshot.phase === 'playing') await handleAction({ type: 'end-turn' });
            break;
          }
          
          maxLoops--;
        }
        
        setIsAnimating(false);
      };
      runAi();
    }
  }, [gameState?.phase, activePlayerIndex, gameState?.players[activePlayerIndex]?.turnFlags?.hasSeenWeekend]);

  return {
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
  };
}
