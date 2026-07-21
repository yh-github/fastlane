import { GameAction } from './gameReducer';
import { GameState, PlayerState } from './gameState';
import { CampaignBundle } from './dataLoader';
import { buildAdjacencyMap, findShortestPath } from '../graphics/pathfinding';
import { calcEconomyPrice } from './economyEngine';

export interface ActionChoice {
  label: string;
  action: GameAction | { type: 'enter_building' } | { type: 'exit_building' };
}

export function getAvailableActions(
  player: PlayerState, 
  state: GameState, 
  campaign: CampaignBundle, 
  isInside: boolean
): ActionChoice[] {
  const options: ActionChoice[] = [];
  const helpful = state.rules.helpfulUI;
  const currentNode = campaign.map.nodes.find(n => n.id === player.position);

  // If inside a building
  if (isInside && currentNode?.buildingId) {
    options.push({ label: "Exit Building", action: { type: 'exit_building' } });
    
    const bId = currentNode.buildingId;
    const bDef = campaign.buildings.find(b => b.id === bId);
    
    // Home Building
    const currentHousingDef = campaign.housing.find(h => h.id === player.currentHousingId);
    if (bDef?.archetype === 'home' && currentNode?.id === currentHousingDef?.homeNodeId) {
      const cost = campaign.config.timeRules.relaxCost;
      const gain = !player.turnFlags.relaxedThisTurn ? 2 : 0;
      const label = helpful 
        ? `Relax (-${cost}h, +${gain} Happiness)` 
        : `Relax`;
      options.push({ label, action: { type: 'relax' } });
    }
    
    // Housing / Rent Office
    if (bDef?.archetype === 'housing') {
      const rentCost = player.currentRentPrice;
      const rentLabel = helpful ? `Pay Rent (-$${rentCost})` : `Pay Rent`;
      options.push({ label: rentLabel, action: { type: 'rent_transaction', amount: rentCost } });
      
      options.push({ label: "Ask for Rent Extension", action: { type: 'ask_rent_extension' } });
      
      campaign.housing.forEach(h => {
        if (h.id !== player.currentHousingId) {
          const adjustedRent = calcEconomyPrice(h.baseRent, state.economicIndex);
          const moveLabel = helpful ? `Move to ${h.name} (-$${adjustedRent})` : `Move to ${h.name}`;
          options.push({ label: moveLabel, action: { type: 'move_apartment', housingId: h.id, cost: adjustedRent } });
        }
      });
    }

    // Bank
    if (bDef?.archetype === 'bank') {
      const depositLabel = helpful ? `Deposit $100` : `Deposit Money`;
      options.push({ label: depositLabel, action: { type: 'bank_transaction', amount: 100 } });
      
      const withdrawLabel = helpful ? `Withdraw $100` : `Withdraw Money`;
      options.push({ label: withdrawLabel, action: { type: 'bank_transaction', amount: -100 } });
      
      options.push({ label: "Take Loan", action: { type: 'take_loan' } });
      
      if (player.loanDebt > 0) {
        const payLoanLabel = helpful ? `Pay Loan (-$${campaign.config.economyRules.loanPaymentAmount})` : `Pay Loan`;
        options.push({ label: payLoanLabel, action: { type: 'pay_loan' } });
      }
    }

    // Pawn Shop
    if (bDef?.archetype === 'pawnshop') {
      player.inventory.appliances.forEach(app => {
        const value = Math.floor(calcEconomyPrice(app.purchasePrice, state.economicIndex) * campaign.config.economyRules.pawnPayoutRate);
        const pawnLabel = helpful ? `Pawn ${app.id} (+$${value})` : `Pawn ${app.id}`;
        options.push({ label: pawnLabel, action: { type: 'pawn_item', item: app, value } });
      });
      
      player.inventory.pawnedItems?.forEach(pawned => {
        const redeemLabel = helpful ? `Redeem ${pawned.itemId} (-$${pawned.redeemCost})` : `Redeem ${pawned.itemId}`;
        options.push({ label: redeemLabel, action: { type: 'redeem_item', item: pawned, cost: pawned.redeemCost } });
      });

      state.pawnShopItemsForSale?.forEach(pawned => {
        const cost = Math.floor(pawned.originalPrice * 0.5);
        const buyLabel = helpful ? `Buy ${pawned.itemId} from Pawn Shop (-$${cost})` : `Buy ${pawned.itemId}`;
        options.push({ label: buyLabel, action: { type: 'buy_pawn_item', item: pawned, cost } });
      });
    }

    // Employment Office
    if (bDef?.archetype === 'employment') {
      const appCost = campaign.config.timeRules.jobApplicationCost;
      campaign.jobs.forEach(job => {
        // Filter jobs: Show jobs player qualifies for, OR is only slightly underqualified for (1 tier higher)
        // Close enough = missing at most 1 degree, and within 20 points of exp/dep
        const missingDegrees = job.requirements.degrees.filter(d => !player.degrees.includes(d)).length;
        const closeEnoughExp = player.experience >= (job.requirements.experience - 20);
        const closeEnoughDep = player.dependability >= (job.requirements.dependability - 20);
        
        if (missingDegrees <= 1 && closeEnoughExp && closeEnoughDep) {
          const jobLocationDef = campaign.buildings.find(b => b.id === job.locationId);
          const locationName = jobLocationDef ? jobLocationDef.name : job.locationId;
          
          const offeredWage = calcEconomyPrice(job.baseWage, state.economicIndex);
          const applyLabel = helpful 
            ? `Apply for ${job.title} @ ${locationName} (-${appCost}h, Wage: $${offeredWage}/h, Min Exp: ${job.requirements.experience}, Min Dep: ${job.requirements.dependability})` 
            : `Apply for ${job.title} @ ${locationName}`;
          options.push({ label: applyLabel, action: { type: 'apply', jobId: job.id } });
        }
      });
    }

    // Education
    if (bDef?.archetype === 'education') {
      const studyCost = campaign.config.timeRules.studySessionCost;
      campaign.education.forEach(deg => {
        if (!player.degrees.includes(deg.id) && player.enrolledClasses[deg.id] === undefined) {
          const adjustedTuition = calcEconomyPrice(deg.baseTuitionFee, state.economicIndex);
          const enrollLabel = helpful ? `Enroll in ${deg.name} (-$${adjustedTuition})` : `Enroll in ${deg.name}`;
          options.push({ label: enrollLabel, action: { type: 'enroll', degreeId: deg.id } });
        } else if (player.enrolledClasses[deg.id] !== undefined) {
          const studyLabel = helpful ? `Study ${deg.name} (-${studyCost}h)` : `Study ${deg.name}`;
          options.push({ label: studyLabel, action: { type: 'study', degreeId: deg.id } });
        }
      });
    }

    // Shopping (General store, electronics, grocery, clothing)
    const itemsAtStore = campaign.items.filter(i => i.store === bId);
    itemsAtStore.forEach(item => {
      const timeCost = item.id === 'newspaper' ? campaign.config.timeRules.newspaperCost : 0;
      const timeString = timeCost > 0 ? `, -${timeCost}h` : '';
      const adjustedPrice = item.id === 'newspaper' ? item.basePrice : calcEconomyPrice(item.basePrice, state.economicIndex);
      const buyLabel = helpful ? `Buy ${item.name} (-$${adjustedPrice}${timeString})` : `Buy ${item.name}`;
      options.push({ label: buyLabel, action: { type: 'buy', itemId: item.id } });
    });

    // Workplace
    if (player.currentJobId) {
      const myJob = campaign.jobs.find(j => j.id === player.currentJobId);
      if (myJob && myJob.locationId === bId) {
        const workCost = campaign.config.timeRules.workSessionCost;
        const wage = player.currentWage * workCost;
        const workLabel = helpful ? `Work Shift: ${myJob.title} (-${workCost}h, +$${wage})` : `Work Shift: ${myJob.title}`;
        options.push({ label: workLabel, action: { type: 'work', jobId: myJob.id } });
      }
    }
  } else {
    // If outside
    if (currentNode?.buildingId) {
      const bDef = campaign.buildings.find(b => b.id === currentNode.buildingId);
      options.push({ label: `Enter ${bDef?.name}`, action: { type: 'enter_building' } });
    }
    
    // Travel options
    const movementCost = (campaign.config.mapRules as any)?.movementCostPerNode ?? 1;
    const entryCost = campaign.config.timeRules?.buildingEntryCost ?? 2;
    const adjacencyMap = buildAdjacencyMap(campaign.map.nodes);
    
    campaign.map.nodes.forEach(node => {
      if (node.id !== player.position && node.buildingId) {
        const bDef = campaign.buildings.find(b => b.id === node.buildingId);
        const path = findShortestPath(adjacencyMap, player.position, node.id);
        if (path.found) {
          const totalCost = (path.steps * movementCost) + entryCost;
          const travelLabel = helpful 
            ? `Travel to and Enter ${bDef?.name} (-${totalCost}h)` 
            : `Travel to and Enter ${bDef?.name}`;
          
          options.push({ 
            label: travelLabel, 
            action: { type: 'move', nodeId: node.id }
          });
        }
      }
    });
  }

  return options;
}
