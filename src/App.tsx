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
import { applyForJob, workShift } from './engine/jobEngine';
import { buyItem } from './engine/shoppingEngine';
import { enrollInDegree, study } from './engine/educationEngine';
import { processStreetRobbery } from './engine/eventEngine';
import { executeAITurn } from './engine/aiEngine';

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
        await animatePlayerPath(pathCoords.slice(1));
      }
      setIsAnimating(false);
      player.position = homeNodeId;
      updatedPlayers[activePlayerIndex] = player;
    }

    if (activePlayerIndex + 1 < updatedPlayers.length) {
      setGameState({ ...gameState!, players: updatedPlayers });
      setActivePlayerIndex(activePlayerIndex + 1);
    } else {
      const nextState = processTurnStart({ ...gameState!, players: updatedPlayers }, campaign!);
      nextState.phase = 'weekend';
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
      await endTurnSequence([...gameState.players]);
      return;
    }

    let updatedPlayers = [...gameState.players];
    let oldPlayer = { ...updatedPlayers[activePlayerIndex] };
    let player = { ...oldPlayer };
    
    let actionLog = "";

    if (payload.type === 'apply') {
      const jobDef = campaign.jobs.find(j => j.id === payload.jobId);
      if (jobDef) {
        const result = applyForJob(player, jobDef, campaign.messages);
        player = result.updated;
        actionLog = result.message;
      }
    } else if (payload.type === 'work') {
      const jobDef = campaign.jobs.find(j => j.id === payload.jobId);
      if (jobDef) {
        const result = workShift(player, jobDef);
        player = result.updated;
        if (result.success) {
          const msg = result.message ? result.message : '';
          actionLog = `Worked at ${jobDef.title}! Earned $${result.wagesEarned}${msg}`;
        } else {
          actionLog = result.message || 'Could not work.';
        }
      }
    } else if (payload.type === 'buy') {
      const itemDef = campaign.items.find(i => i.id === payload.itemId);
      if (itemDef) {
        if (itemDef.id === 'newspaper') {
          if (player.hoursRemaining >= 1 && player.money >= itemDef.basePrice) {
            player = spendHours(player, 1);
            player.money -= itemDef.basePrice;
            actionLog = "Read the Newspaper.";
            setIsNewspaperModalOpen(true);
          } else if (player.money < itemDef.basePrice) {
            actionLog = "Not enough money for the newspaper.";
          } else {
            actionLog = "Not enough time to read the newspaper.";
          }
        } else {
          const result = buyItem(player, itemDef, gameState.rules);
          player = result.updated;
          actionLog = result.message;
          
          if (result.success) {
            triggerAnim('item', '📦', 'btn-inventory');
          }
        }
      }
    } else if (payload.type === 'enroll') {
      const degDef = campaign.education.find(d => d.id === payload.degreeId);
      if (degDef) {
        const result = enrollInDegree(player, degDef);
        player = result.updated;
        actionLog = result.message;
      }
    } else if (payload.type === 'study') {
      const degDef = campaign.education.find(d => d.id === payload.degreeId);
      if (degDef) {
        const result = study(player, degDef);
        player = result.updated;
        actionLog = result.message;
      }
    } else if (payload.type === 'relax') {
      const cost = Math.min(player.hoursRemaining, 5);
      if (cost > 0) {
        player = spendHours(player, cost);
        player.happiness = Math.min(100, player.happiness + 1);
        actionLog = `Relaxed at home for ${cost} hours.`;
      }
    } else if (payload.type === 'bank_transaction') {
      if (payload.amount > 0) { // Deposit
        if (player.money >= payload.amount) {
          player.money -= payload.amount;
          player.bankSavings += payload.amount;
          actionLog = `Deposited $${payload.amount}.`;
        } else {
          actionLog = "Not enough cash to deposit.";
        }
      } else { // Withdraw
        const absAmount = Math.abs(payload.amount);
        if (player.bankSavings >= absAmount) {
          player.bankSavings -= absAmount;
          player.money += absAmount;
          actionLog = `Withdrew $${absAmount}.`;
        } else {
          actionLog = "Not enough savings to withdraw.";
        }
      }
    } else if (payload.type === 'buy_stock') {
      if (player.money >= payload.cost) {
        player.money -= payload.cost;
        if (payload.stockId === 'tbills') {
          player.inventory.stocks.tBills += payload.quantity;
        } else {
          player.inventory.stocks.holdings[payload.stockId] = (player.inventory.stocks.holdings[payload.stockId] || 0) + payload.quantity;
        }
        actionLog = `Bought ${payload.quantity} shares of ${payload.stockId}.`;
      } else {
        actionLog = "Not enough cash to buy stocks.";
      }
    } else if (payload.type === 'sell_stock') {
      const owned = payload.stockId === 'tbills' 
        ? player.inventory.stocks.tBills 
        : (player.inventory.stocks.holdings[payload.stockId] || 0);
      
      if (owned >= payload.quantity) {
        if (payload.stockId === 'tbills') {
          player.inventory.stocks.tBills -= payload.quantity;
        } else {
          player.inventory.stocks.holdings[payload.stockId] -= payload.quantity;
        }
        player.money += payload.revenue;
        actionLog = `Sold ${payload.quantity} shares of ${payload.stockId}.`;
      } else {
        actionLog = "You do not own enough shares.";
      }
    } else if (payload.type === 'take_loan') {
      const liquidAssets = player.money + player.bankSavings;
      const liquidity = player.currentWage + (liquidAssets / 1000);
      let risk = 5;
      if (player.timesDefaulted > 0 || (player.loanDebt || 0) > 0) {
        risk = 5 + player.timesDefaulted + ((player.loanDebt || 0) / 100) + ((player.loanDebt || 0) > 0 ? 1 : 0);
      }
      const maxLoan = 100 * Math.max(0, liquidity - risk);
      const isDefaulted = player.loanPaymentDeadline > 0 && player.loanPaymentDeadline < gameState!.turn;

      if (isDefaulted || liquidity <= risk) {
        actionLog = "The bank refused to lend you money!";
        player.happiness = Math.max(10, player.happiness - 1);
      } else {
        const loanSize = Math.floor(maxLoan);
        if (loanSize > 0) {
          if ((player.loanDebt || 0) === 0) {
            player.loanPaymentDeadline = Math.floor((gameState!.turn - 1) / 4) * 4 + 4; // Week 4 of current month
          }
          player.money += loanSize;
          player.loanDebt = (player.loanDebt || 0) + loanSize;
          player.happiness = Math.min(100, player.happiness + 5);
          actionLog = `The bank approved a loan of $${loanSize}.`;
        } else {
          actionLog = "The bank refused to lend you money!";
          player.happiness = Math.max(10, player.happiness - 1);
        }
      }
      player = spendHours(player, 2);
    } else if (payload.type === 'pay_loan') {
      if ((player.loanDebt || 0) > 0) {
        if (player.loanDebt < 50 && player.money >= player.loanDebt) {
          const amount = player.loanDebt;
          player.money -= amount;
          player.loanDebt = 0;
          player.loanPaymentDeadline += 4;
          actionLog = `Paid off the remaining loan of $${amount}.`;
        } else if (player.money >= 50) {
          player.money -= 50;
          player.loanDebt = Math.max(0, player.loanDebt - 45);
          player.loanPaymentDeadline += 4;
          actionLog = `Made a $50 loan payment ($45 principal, $5 interest).`;
        } else {
          actionLog = "Not enough cash to make a payment.";
        }
        if (player.loanDebt === 0) {
          player.loanPaymentDeadline = 0;
        }
      } else {
        actionLog = "You do not have a loan.";
      }
    } else if (payload.type === 'rent_transaction') {
      if (player.money >= payload.amount) {
        player.money -= payload.amount;
        player.rentDebt = 0;
        player.turnFlags.rentPaidThisTurn = true;
        actionLog = `Paid $${payload.amount} for rent.`;
      } else {
        actionLog = "Not enough cash to pay rent.";
      }
    } else if (payload.type === 'move_apartment') {
      const housingDef = campaign.housing.find(h => h.id === payload.housingId);
      if (housingDef) {
        if (player.money >= payload.cost) {
          player.money -= payload.cost;
          player.currentHousingId = housingDef.id;
          player.currentRentPrice = payload.cost;
          player.rentPaidUntilWeek = gameState.turn + 4; // Pay for a month
          player.rentDebt = 0;
          player.rentExtensionActive = false;
          player.turnFlags.rentPaidThisTurn = true;
          actionLog = `Moved into ${housingDef.name} for $${payload.cost}.`;
        } else {
          actionLog = `Not enough cash to move to ${housingDef.name}.`;
        }
      }
    } else if (payload.type === 'pay_rent_advance') {
      if (player.money >= payload.amount) {
        player.money -= payload.amount;
        // Rent advance adds 4 weeks to lease
        player.rentPaidUntilWeek += 4;
        player.rentExtensionActive = false;
        player.turnFlags.rentPaidThisTurn = true;
        actionLog = `Paid $${payload.amount} rent advance.`;
      } else {
        actionLog = `Not enough cash for rent advance.`;
      }
    } else if (payload.type === 'pawn_item') {
      player.inventory.appliances = player.inventory.appliances.filter(a => a !== payload.item);
      if (!player.inventory.pawnedItems) player.inventory.pawnedItems = [];
      const pawnedItem = {
        itemId: payload.item.id,
        originalPrice: payload.item.purchasePrice,
        redeemCost: Math.floor(payload.item.purchasePrice * 0.5),
        weekPawned: gameState.turn,
        ownerId: player.id
      };
      player.inventory.pawnedItems.push(pawnedItem);
      player.money += payload.value;
      player.happiness = Math.max(0, player.happiness - 1);
      const itemName = payload.item.id.replace(/_/g, ' ');
      actionLog = `Pawned ${itemName} for $${payload.value}.`;
    } else if (payload.type === 'redeem_item') {
      if (player.money >= payload.cost) {
        player.money -= payload.cost;
        player.inventory.pawnedItems = player.inventory.pawnedItems.filter(a => a !== payload.item);
        player.inventory.appliances.push({
          id: payload.item.itemId,
          purchasePrice: payload.item.originalPrice,
          purchaseSource: 'pawnshop'
        });
        const itemName = payload.item.itemId.replace(/_/g, ' ');
        actionLog = `Bought back ${itemName} for $${payload.cost}.`;
      } else {
        actionLog = "Not enough cash to buy back item.";
      }
    } else if (payload.type === 'change_clothes') {
      player.inventory.selectedClothes = payload.clothes;
      // Do not use hours to change clothes, but do log it
      actionLog = `Selected ${payload.clothes} clothes.`;
    } else if (payload.type === 'ask_rent_extension') {
      player.turnFlags.askedForExtension = true;
      let approved = false;
      if (player.rentExtensionsReceived === 0) {
        approved = true;
      } else {
        const chance = Math.max(25, 100 - (player.rentExtensionsReceived * 25));
        const roll = Math.floor(Math.random() * 100);
        if (roll < chance) {
          approved = true;
        }
      }

      if (approved) {
        player.rentExtensionsReceived += 1;
        player.rentExtensionActive = true;
        actionLog = "Rent Office approved your 1-week extension! You have until the end of the week to pay.";
      } else {
        actionLog = "The Rent Office denied your extension request.";
      }
    }

    // Process explicit diffs and attach to log
    if (actionLog) {
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
        actionLog += ` (${diffStr.join(', ')})`;
      }
      addLog(actionLog);
    }

    player = recalculatePlayerEffects(player, campaign);
    updatedPlayers[activePlayerIndex] = player;

    if (player.hoursRemaining <= 0) {
      addLog(`${player.name} is out of time for the week!`);
      await endTurnSequence(updatedPlayers);
    } else {
      setGameState({ ...gameState, players: updatedPlayers });
    }
  };

  useEffect(() => {
    if (gameState?.phase === 'playing' && gameState.players[activePlayerIndex]?.isAi) {
      const runAi = async () => {
        setIsAnimating(true);
        const actions = executeAITurn(gameState.players[activePlayerIndex], gameState, campaign!);
        for (const action of actions) {
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
