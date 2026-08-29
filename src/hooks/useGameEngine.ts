import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { type GameState, type PlayerState, createInitialGameState, recalculatePlayerEffects } from '../engine/gameState';
import { processTurnStart } from '../engine/turnProcessor';
import { spendHours } from '../engine/timeManager';
import { loadCampaign, type CampaignBundle } from '../engine/dataLoader';
import { buildAdjacencyMap, findShortestPath } from '../graphics/pathfinding';
import { animatePlayerPath, pulsePlayer, showMapClick, animateRobberInterception } from '../graphics/mapRenderer';
import { processStreetRobbery } from '../engine/eventEngine';
import { executeAITurn } from '../engine/aiEngine';
import { simulateActionVisuals } from '../engine/aiTranslator';
import { gameReducer, type GameAction } from '../engine/gameReducer';
import type { GameEvent } from '../engine/gameState';
import { Random, generateRandomSeed } from '../utils/rng';
import type { ReplayData, EngineDecision, ReplayContext } from '../engine/replayTypes';
import { calculateStatDiffsAndAnimate, type AppStatus, type LogEntry } from './gameEngine';

export type { AppStatus, LogEntry };

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
  const [streetRobberyNotice, setStreetRobberyNotice] = useState<{ lostAmount: number; location: string; onConfirm?: () => void } | null>(null);
  const lastPulsedRef = useRef({ turn: -1, playerIndex: -1 });
  const replayDataRef = useRef<ReplayData | null>(null);
  const pendingDestinationRef = useRef<string | null>(null);
  const isMovingRef = useRef<boolean>(false);

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
        const randomSeed = generateRandomSeed();
        const initialState = createInitialGameState(bundle, [{name: 'Player 1', isAi: false, goals: {wealth:25, happiness:25, education:25, career:25}}], 'node_low_cost', undefined, randomSeed);
        setGameState(initialState);
        replayDataRef.current = {
          version: '1.0.0', // Can be dynamically injected from package.json in future
          commitHash: 'unknown', 
          campaignId: bundle.config.name,
          rules: initialState.rules,
          startingState: initialState,
          steps: [],
          endStateHash: ''
        };
        setStatus('ready');
        if (initialState && initialState.rules.turnStartAtHome && !initialState.players[0].isAi) {
          setIsBuildingModalOpen(true);
        }
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
      const outDecisions: EngineDecision[] = [];
      const replayCtx: ReplayContext = { outDecisions };
      const nextState = processTurnStart({ ...gameStateRef.current!, players: updatedPlayers }, campaign!, replayCtx);
      
      if (replayDataRef.current) {
        if (!replayDataRef.current.steps) replayDataRef.current.steps = [];
        replayDataRef.current.steps.push({
          turn: gameStateRef.current!.turn,
          action: { type: 'end_turn' },
          engineDecisions: outDecisions
        });
      }

      setGameState(nextState);
      setActivePlayerIndex(0);
      if (nextState.rules.turnStartAtHome && !nextState.players[0].isAi) {
        setIsBuildingModalOpen(true);
      }
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
      let targetNodeId = payload.nodeId;
      let updatedPlayers = [...currentState.players];
      let player = { ...updatedPlayers[activePlayerIndex] };
      const activePlayer = updatedPlayers[activePlayerIndex];

      // If out of hours, attempting to exit/move anywhere immediately ends the turn and runs home
      if (!activePlayer.isAi && player.hoursRemaining <= 0) {
        addLog({ key: 'log.outOfTime', params: { name: player.name } }, undefined, player.id);
        await endTurnSequence(updatedPlayers);
        return;
      }

      // If we are already there, just open the modal if it's a building
      if (player.position === targetNodeId) {
        const destNode = campaign.map.nodes.find(n => n.id === targetNodeId);
        if (!activePlayer.isAi && campaign!.buildings.some(b => b.id === destNode?.buildingId)) {
          setIsBuildingModalOpen(true);
        }
        return;
      }

      setIsBuildingModalOpen(false); // Auto close menu immediately when walking away
      setIsAnimating(true);
      isMovingRef.current = true;
      pendingDestinationRef.current = null;

      try {
        const currentBuilding = campaign.map.nodes.find(n => n.id === player.position)?.buildingId;
        if (currentBuilding === 'bank' || currentBuilding === 'blacks_market') {
          const preRobberyMoney = player.money;
          const rng = new Random(currentState.rngState);
          const outDecisions: EngineDecision[] = [];
          const replayCtx: ReplayContext = { outDecisions };
          const isForced = !!currentState.debugQueue?.some(e => e.type === 'street_robbery' && (e.playerId === player.id || !e.playerId));
          player = processStreetRobbery(player, currentBuilding, currentState.turn, rng, campaign, replayCtx, isForced);
          
          if (isForced) {
            setGameState(prev => prev ? {
              ...prev,
              debugQueue: (prev.debugQueue || []).filter(e => !(e.type === 'street_robbery' && (e.playerId === player.id || !e.playerId)))
            } : prev);
          }
          
          if (replayDataRef.current) {
            if (!replayDataRef.current.steps) replayDataRef.current.steps = [];
            replayDataRef.current.steps.push({
              turn: currentState.turn,
              action: { type: 'move', nodeId: targetNodeId },
              engineDecisions: outDecisions
            });
          }

          if (player.money < preRobberyMoney) {
            const lostAmount = preRobberyMoney - player.money;
            addLog({ key: 'log.robbery' }, undefined, player.id);
            if (currentState.rules.enableAnimations) {
              const diff = player.money - preRobberyMoney;
              triggerAnim('text', `${diff} 💸`, { sourceId: 'stat-money', customClass: 'anim-negative' });
            }
            player.newspaperHeadline = { key: 'newspaper.robbery' };

            // Triggers map robbery interception animation
            await animateRobberInterception(activePlayerIndex);

            if (!player.isAi) {
              await new Promise<void>(resolve => {
                setStreetRobberyNotice({
                  lostAmount,
                  location: currentBuilding || '',
                  onConfirm: () => {
                    setStreetRobberyNotice(null);
                    resolve();
                  }
                });
              });
            }
          }
          // Save the RNG state back since we used it!
          setGameState(prev => prev ? { ...prev, rngState: rng.getState() } : prev);
        }
        
        const movementCost = (campaign.config.mapRules as any)?.movementCostPerNode || 1;
        let pRef = { ...player };
        let stepsTaken = 0;

        while (pRef.hoursRemaining >= movementCost) {
          // Check if destination was redirected while moving
          if (pendingDestinationRef.current && pendingDestinationRef.current !== targetNodeId) {
            targetNodeId = pendingDestinationRef.current;
            pendingDestinationRef.current = null;
          }

          if (pRef.position === targetNodeId) {
            break;
          }

          const pathResult = findShortestPath(adjacencyMap, pRef.position, targetNodeId);
          if (!pathResult.found || pathResult.path.length < 2) {
            break;
          }

          const nextNodeId = pathResult.path[1];
          const nextNode = campaign.map.nodes.find(n => n.id === nextNodeId);
          if (!nextNode) break;

          await animatePlayerPath([{ nodeId: nextNodeId, x: nextNode.x, y: nextNode.y }], activePlayerIndex, 300);

          pRef = spendHours(pRef, movementCost);
          pRef.position = nextNodeId;
          stepsTaken++;

          setGameState(prev => {
            if (!prev) return prev;
            const newPlayers = [...prev.players];
            newPlayers[activePlayerIndex] = { ...pRef };
            return { ...prev, players: newPlayers };
          });
        }

        player = { ...pRef };

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

        if (stepsTaken > 0 && !['bank', 'blacks_market'].includes(currentBuilding || '')) {
          if (replayDataRef.current) {
            if (!replayDataRef.current.steps) replayDataRef.current.steps = [];
            replayDataRef.current.steps.push({
              turn: currentState.turn,
              action: { type: 'move', nodeId: targetNodeId },
              engineDecisions: []
            });
          }
        }

        if (player.hoursRemaining <= 0) {
          addLog({ key: 'log.outOfTime', params: { name: player.name } }, undefined, player.id);
          await endTurnSequence(updatedPlayers);
        } else {
          // If we reached the target destination and it has a building, apply entry cost
          const destNode = campaign.map.nodes.find(n => n.id === player.position);
          if (destNode && destNode.buildingId && player.position === targetNodeId) {
            const entryCost = campaign.config.timeRules.buildingEntryCost || 2;
            player = spendHours(player, entryCost);
            updatedPlayers[activePlayerIndex] = player;
          }

          setGameState(prev => {
            if (!prev) return prev;
            return { ...prev, players: updatedPlayers };
          });
          
          if (!activePlayer.isAi && player.position === targetNodeId) {
            const destNode = campaign.map.nodes.find(n => n.id === player.position);
            if (destNode && campaign.buildings.some(b => b.id === destNode.buildingId)) {
              setIsBuildingModalOpen(true);
            }
          }
        }
      } finally {
        isMovingRef.current = false;
        pendingDestinationRef.current = null;
        setIsAnimating(false);
      }
      return;
    }

    let resultActionLog: GameEvent | GameEvent[] | undefined = undefined;

    setGameState(prevState => {
      if (!prevState) return prevState;

      let updatedPlayers = [...prevState.players];
      let oldPlayer = { ...updatedPlayers[activePlayerIndex] };
      const rng = new Random(prevState.rngState);
      
      const { updatedPlayer: player, actionLog, updatedPawnShopItemsForSale, outEngineDecisions } = gameReducer(
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

      if (replayDataRef.current) {
        if (!replayDataRef.current.steps) replayDataRef.current.steps = [];
        replayDataRef.current.steps.push({
          turn: prevState.turn,
          action: payload,
          engineDecisions: outEngineDecisions || []
        });
      }

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
        const logsArray = Array.isArray(actionLog) ? actionLog : [actionLog];
        const diffStr = calculateStatDiffsAndAnimate(player, oldPlayer, prevState.rules, triggerAnim);
        
        logsArray.forEach((log, index) => {
          let finalActionLog: GameEvent = { ...log, params: { ...log.params } };
          if (index === 0 && diffStr) {
            finalActionLog.params = { ...finalActionLog.params, diff: diffStr };
          }
          addLog(finalActionLog, prevState.turn, player.id);
        });
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
    if (!gameStateRef.current || !campaign) return;
    const activePlayer = gameStateRef.current.players[activePlayerIndex];
    if (activePlayer?.isAi) return;

    const node = campaign.map.nodes.find(n => n.id === nodeId);
    if (node) {
      showMapClick(node.x, node.y);
    }

    if (isMovingRef.current) {
      pendingDestinationRef.current = nodeId;
      return;
    }

    if (isAnimating) return;

    await handleAction({ type: 'move', nodeId });
  };

  useEffect(() => {
    // Human player pulse at start of turn
    const currentTurn = gameState?.turn;
    const playerFlags = gameState?.players[activePlayerIndex]?.turnFlags;
    if (gameState?.phase === 'playing' && !gameState.players[activePlayerIndex]?.isAi && playerFlags?.hasSeenWeekend) {
      if (lastPulsedRef.current.turn !== currentTurn || lastPulsedRef.current.playerIndex !== activePlayerIndex) {
        lastPulsedRef.current = { turn: currentTurn!, playerIndex: activePlayerIndex };
        pulsePlayer(activePlayerIndex);
      }
    }

    const hasSeenWeekend = gameState?.players[activePlayerIndex]?.turnFlags?.hasSeenWeekend;
    if (gameState?.phase === 'playing' && gameState.players[activePlayerIndex]?.isAi && hasSeenWeekend) {
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
          if (actions[0].type === 'move') {
            const moveAct = actions[0] as { type: 'move'; nodeId: string };
            const targetNode = campaign!.map.nodes.find(n => n.id === moveAct.nodeId);
            if (targetNode) {
              showMapClick(targetNode.x, targetNode.y);
            }
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    addLog,
    replayData: replayDataRef.current,
    streetRobberyNotice,
    setStreetRobberyNotice
  };
}
