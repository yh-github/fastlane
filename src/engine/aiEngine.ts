import type { GameState, PlayerState } from './gameState';
import type { CampaignBundle } from './dataLoader';
import type { GameAction } from './gameReducer';

function getBuildingNodeByArchetype(campaign: CampaignBundle, archetype: string): string | null {
  const building = campaign.buildings.find(b => b.archetype === archetype);
  if (!building) return null;
  return campaign.map.nodes.find(n => n.buildingId === building.id)?.id || null;
}

function getBuildingNodeById(campaign: CampaignBundle, buildingId: string): string | null {
  return campaign.map.nodes.find(n => n.buildingId === buildingId)?.id || null;
}

function getHomeNode(campaign: CampaignBundle, player: PlayerState): string {
  const housing = campaign.housing.find(h => h.id === player.currentHousingId);
  return housing ? housing.homeNodeId : 'node_low_cost';
}

export type GoapState = {
  nodeId: string;
  hours: number;
  money: number;
  food: number;
  clothes: number;
  hasFastFood: boolean;
  hasFridge: boolean;
  rentPaid: boolean;
  jobId: string | null;
  exp: number;
  dep: number;
  happiness: number;
  degrees: string[];
  rejectedJobs: string[];
  enrolledClasses: Record<string, number>;
  week: number;
  rentPrice: number;
  relaxation: number;
};

function extractState(player: PlayerState, turn: number): GoapState {
  const neededClothes = player.currentJobId ? 'casual' : 'casual'; // Simplified for Goap
  const clothesWeeks = player.inventory.casualClothesWeeks + player.inventory.dressClothesWeeks + player.inventory.businessClothesWeeks;
  
  return {
    nodeId: player.position,
    hours: player.hoursRemaining,
    money: player.money,
    food: player.inventory.freshFoodUnits,
    hasFastFood: (player.inventory.fastFoodItems?.length ?? 0) > 0,
    hasFridge: (player.inventory.appliances?.includes('refrigerator') ?? false),
    clothes: clothesWeeks,
    rentPaid: player.rentPaidUntilWeek > turn + 1,
    jobId: player.currentJobId || null,
    exp: player.experience || 0,
    dep: player.dependability || 0,
    happiness: player.happiness || 0,
    degrees: [...(player.degrees || [])],
    rejectedJobs: [...(player.turnFlags?.jobsRejectedThisTurn || [])],
    enrolledClasses: { ...(player.enrolledClasses || {}) },
    week: turn,
    rentPrice: player.currentRentPrice || 150,
    relaxation: player.relaxation || 0
  };
}

interface GoapAction {
  name: string;
  cost: number;
  precondition: (state: GoapState) => boolean;
  effect: (state: GoapState) => GoapState;
  createGameAction: (state: GoapState, campaign: CampaignBundle) => GameAction | null;
}

function buildActions(campaign: CampaignBundle): GoapAction[] {
  const actions: GoapAction[] = [];

  // Movement actions to all key buildings
  const addMove = (archetype: string, name: string) => {
    const bId = getBuildingNodeByArchetype(campaign, archetype);
    if (bId) {
      actions.push({
        name: `MoveTo_${name}`,
        cost: 2,
        precondition: (s) => s.nodeId !== bId && s.hours >= 2,
        effect: (s) => ({ ...s, nodeId: bId, hours: s.hours - 2 }),
        createGameAction: () => ({ type: 'move', nodeId: bId })
      });
    }
  };
  // Setup Move Actions for EVERY node in the map
  campaign.map.nodes.forEach(node => {
    actions.push({
      name: `MoveTo_${node.id}`,
      cost: 2,
      precondition: (s) => s.nodeId !== node.id && s.hours >= 2,
      effect: (s) => ({ ...s, nodeId: node.id, hours: s.hours - 2 }),
      createGameAction: () => ({ type: 'move', nodeId: node.id })
    });
  });

  // Action: Buy Food (for each item)
  const allFoodItems = campaign.items.filter(i => i.category === 'food');
  allFoodItems.forEach(item => {
    const storeNode = getBuildingNodeById(campaign, item.store);
    actions.push({
      name: `BuyFood_${item.id}`,
      cost: 1,
      precondition: (s) => s.nodeId === storeNode && s.hours >= 2 && s.money >= item.basePrice,
      effect: (s) => ({
        ...s,
        hours: s.hours - 2,
        money: s.money - item.basePrice,
        food: item.subcategory === 'fast_food' ? s.food : s.food + (item.units || 1),
        hasFastFood: item.subcategory === 'fast_food' ? true : s.hasFastFood
      }),
      createGameAction: () => ({ type: 'buy', itemId: item.id })
    });
  });

  // Action: Buy Fridge
  const fridgeItem = campaign.items.find(i => i.id === 'refrigerator' && i.store === 'z_mart') || campaign.items.find(i => i.id === 'refrigerator');
  if (fridgeItem) {
    const storeNode = getBuildingNodeById(campaign, fridgeItem.store);
    actions.push({
      name: 'BuyFridge',
      cost: 2,
      precondition: (s) => s.nodeId === storeNode && s.hours >= 2 && s.money >= fridgeItem.basePrice && !s.hasFridge,
      effect: (s) => ({ ...s, money: s.money - fridgeItem.basePrice, hours: s.hours - 2, hasFridge: true }),
      createGameAction: () => ({ type: 'buy', itemId: fridgeItem.id })
    });
  }

  // Action: Pay Rent
  const rentNode = getBuildingNodeByArchetype(campaign, 'housing');
  actions.push({
    name: 'PayRent',
    cost: 1,
    precondition: (s) => s.nodeId === rentNode && !s.rentPaid && s.money >= s.rentPrice,
    effect: (s) => ({ ...s, rentPaid: true, money: s.money - s.rentPrice }),
    createGameAction: (s) => ({ type: 'rent_transaction', amount: s.rentPrice })
  });

  // Action: Buy Clothes (for each item)
  const clothesItems = campaign.items.filter(i => i.category === 'clothes').sort((a, b) => a.basePrice - b.basePrice);
  clothesItems.forEach(item => {
    const storeNode = getBuildingNodeById(campaign, item.store);
    const cost = item.basePrice;
    actions.push({
      name: `BuyClothes_${item.id}_${item.store}`,
      cost: 0,
      precondition: (s) => s.nodeId === storeNode && s.money >= cost,
      effect: (s) => ({ ...s, money: s.money - cost, clothes: Math.max(s.clothes, 0) + 11 }),
      createGameAction: () => ({ type: 'buy', itemId: item.id })
    });
  });

  // Action: Work
  campaign.jobs.forEach(job => {
    const bId = getBuildingNodeById(campaign, job.locationId);
    actions.push({
      name: `Work_${job.id}`,
      cost: 6,
      precondition: (s) => s.nodeId === bId && s.hours >= 6 && s.jobId === job.id && s.clothes > 0,
      effect: (s) => ({ ...s, money: s.money + (job.baseWage * 6), hours: s.hours - 6, exp: s.exp + 1, dep: s.dep + 1, clothes: s.clothes - 1 }), // Approximate clothes wear
      createGameAction: () => ({ type: 'work', jobId: job.id })
    });
  });

  // Action: Apply Job
  const empNode = getBuildingNodeByArchetype(campaign, 'employment');
  campaign.jobs.forEach(job => {
      actions.push({
        name: `Apply_${job.id}`,
        cost: 4,
        precondition: (s) => {
          const depMet = s.dep >= job.requirements.dependability || (job.tags?.includes('auto_accept') ?? false);
          return s.nodeId === empNode && s.hours >= 4 && s.exp >= job.requirements.experience && depMet && job.requirements.degrees.every(d => s.degrees.includes(d)) && s.jobId !== job.id && !s.rejectedJobs.includes(job.id);
        },
        effect: (s) => ({ ...s, hours: s.hours - 4, jobId: job.id, rejectedJobs: [...s.rejectedJobs, job.id] }), // Mark as rejected in state just in case it plans it again
        createGameAction: (s) => ({ type: 'apply', jobId: job.id })
      });
    });
  // Action: Enroll and Study
  const uniNode = getBuildingNodeByArchetype(campaign, 'education');
  campaign.education.forEach(deg => {
    actions.push({
      name: `Enroll_${deg.id}`,
      cost: 0,
      precondition: (s) => s.nodeId === uniNode && s.money >= deg.baseTuitionFee && !s.degrees.includes(deg.id) && s.enrolledClasses[deg.id] === undefined,
      effect: (s) => ({ ...s, money: s.money - deg.baseTuitionFee, enrolledClasses: { ...s.enrolledClasses, [deg.id]: 0 } }),
      createGameAction: () => ({ type: 'enroll', degreeId: deg.id })
    });
    actions.push({
      name: `Study_${deg.id}`,
      cost: 4,
      precondition: (s) => s.nodeId === uniNode && s.hours >= 4 && !s.degrees.includes(deg.id) && s.enrolledClasses[deg.id] !== undefined,
      effect: (s) => {
        const currentLessons = (s.enrolledClasses[deg.id] || 0) + 1;
        if (currentLessons >= deg.lessonsRequired) {
          const newEnrolled = { ...s.enrolledClasses };
          delete newEnrolled[deg.id];
          return { ...s, hours: s.hours - 4, degrees: [...s.degrees, deg.id], enrolledClasses: newEnrolled };
        }
        return { ...s, hours: s.hours - 4, enrolledClasses: { ...s.enrolledClasses, [deg.id]: currentLessons } };
      },
      createGameAction: () => ({ type: 'study', degreeId: deg.id })
    });
  });

  // Action: Relax
  const relaxCost = campaign.config.timeRules?.relaxCost || 6;
  actions.push({
    name: 'Relax',
    cost: relaxCost,
    precondition: (s) => s.hours >= relaxCost,
    effect: (s) => ({ ...s, hours: s.hours - relaxCost, happiness: Math.min(100, s.happiness + 2) }),
    createGameAction: () => ({ type: 'relax' })
  });

  return actions;
}

export function executeAITurn(player: PlayerState, gameState: GameState, campaign: CampaignBundle): GameAction[] {
  if (player.hoursRemaining <= 0) return [];

  const s = extractState(player, gameState.turn);
  const actions = buildActions(campaign);

  function tryAction(name: string): GameAction | null {
    const a = actions.find(x => x.name === name);
    if (a && a.precondition(s)) return a.createGameAction(s, campaign);
    return null;
  }

  const moveTo = (archetypeOrId: string): GameAction | null => {
    let bId = getBuildingNodeByArchetype(campaign, archetypeOrId) || getBuildingNodeById(campaign, archetypeOrId);
    if (archetypeOrId === 'z_mart') {
       console.log(`[DEBUG-MOVETO] archetypeOrId: ${archetypeOrId}, bId: ${bId}, s.nodeId: ${s.nodeId}, s.hours: ${s.hours}`);
    }
    if (bId && s.nodeId !== bId && s.hours >= 2) {
      return { type: 'move', nodeId: bId };
    }
    return null;
  };

  // Pre-calculate targets based on Goal Allotments
  const targetWealth = player.goalAllotment.wealth * 100;
  const targetCareer = Math.ceil(player.goalAllotment.career / 1.25);
  const targetEducation = Math.ceil(Math.max(0, player.goalAllotment.education - 1) / 9);
  const targetHappiness = player.goalAllotment.happiness;

  const rentBuffer = ((s.week % 4 === 3) || !s.rentPaid) ? 150 : 0;
  const affordableFoodItemsPre = campaign.items
    .filter(i => i.category === 'food' && (s.hasFridge || i.subcategory === 'fast_food'))
    .sort((a, b) => a.basePrice - b.basePrice);
  const minFoodCost = affordableFoodItemsPre.length > 0 ? affordableFoodItemsPre[0].basePrice : 70;

  // 0. Clothes (Desperate - if naked we cannot work and will permanently deadlock)
  const clothesItems = campaign.items.filter(i => i.category === 'clothes').sort((a, b) => b.basePrice - a.basePrice);
  let targetClothes = clothesItems[clothesItems.length - 1]; // cheapest casual
  if (clothesItems.length > 0) {
    if (s.money > 1000 || (targetCareer >= 25 && s.money > rentBuffer + 200)) {
       targetClothes = clothesItems.find(i => i.id === 'dress_clothes') || targetClothes;
    }
    if (s.money > 2000 || (targetCareer >= 45 && s.money > rentBuffer + 500)) {
       targetClothes = clothesItems.find(i => i.id === 'business_clothes') || targetClothes;
    }
    const isDesperateForClothes = s.clothes <= 1;
    if (isDesperateForClothes && s.money >= targetClothes.basePrice) {
      const storeNode = targetClothes.store;
      const buyClothes = tryAction(`BuyClothes_${targetClothes.id}_${targetClothes.store}`);
      if (buyClothes) return [buyClothes];
      const move = moveTo(storeNode);
      if (move) return [move];
    }
  }

  // 1. Food (Survival First)
  // If we don't have a fridge, fresh food spoils immediately! So only buy fast food if no fridge.
  const affordableFoodItems = campaign.items
    .filter(i => i.category === 'food' && (s.hasFridge || i.subcategory === 'fast_food'))
    .sort((a, b) => a.basePrice - b.basePrice);
    
  const needsFood = s.hasFridge ? s.food <= 2 : !s.hasFastFood;
  if (needsFood && affordableFoodItems.length > 0 && s.money >= affordableFoodItems[0].basePrice) {
    const bestFoodToBuy = affordableFoodItems.filter(i => s.money >= i.basePrice).pop() || affordableFoodItems[0];
    const buyFood = tryAction(`BuyFood_${bestFoodToBuy.id}`);
    if (buyFood) return [buyFood];
    const move = moveTo(bestFoodToBuy.store);
    if (move) return [move];
  }

  // 2. Rent (If due and we have money)
  if (!s.rentPaid && s.money >= s.rentPrice) {
    const payRent = tryAction('PayRent');
    if (payRent) return [payRent];
    const move = moveTo('housing');
    if (move) return [move];
  }



  // 4. Critical Work
  // If rent is not paid and we DON'T have money, we MUST WORK! Or if we critically need money for food.
  const minimumComfortableMoney = rentBuffer + minFoodCost;
  const criticallyNeedsMoney = s.money < minimumComfortableMoney;
  if (criticallyNeedsMoney) {
     if (s.jobId && s.hours >= 6) {
        const work = tryAction(`Work_${s.jobId}`);
        if (work) return [work];
        const jobDef = campaign.jobs.find(j => j.id === s.jobId);
        if (jobDef) {
           const move = moveTo(jobDef.locationId);
           if (move) return [move];
        }
     }
  }

  // 5. Buy Needed Items (Refrigerator)
  const fridgeItemRef = campaign.items.find(i => i.id === 'refrigerator' && i.store === 'z_mart') || campaign.items.find(i => i.id === 'refrigerator');
  const fridgeCost = fridgeItemRef ? fridgeItemRef.basePrice : 650;
  if (!s.hasFridge && s.money >= fridgeCost + minimumComfortableMoney) {
    const buyFridge = tryAction('BuyFridge');
    if (buyFridge) return [buyFridge];
    const move = moveTo('department_store');
    if (move) return [move];
  }

  // 6. Education (Prioritize education to advance career)
  if (targetEducation > s.degrees.length) { 
    const enrolledDegree = Object.keys(s.enrolledClasses)[0];
    const nextDegree = campaign.education.find(deg => !s.degrees.includes(deg.id) && s.enrolledClasses[deg.id] === undefined && s.money >= deg.baseTuitionFee + minimumComfortableMoney && deg.prerequisites.every(p => s.degrees.includes(p)));
    
    if (enrolledDegree) {
       if (s.hours >= 4) {
           const studyAction = tryAction(`Study_${enrolledDegree}`);
           if (studyAction) return [studyAction];
           const move = moveTo('education');
           if (move) return [move];
       }
    } else if (nextDegree && s.hours >= 2) {
       const enrollAction = tryAction(`Enroll_${nextDegree.id}`);
       if (enrollAction) return [enrollAction];
       const move = moveTo('education');
       if (move) return [move];
    }
  }

  // 7. Relax (if relaxation is dangerously low, or if happiness is getting low)
  const dangerouslyLowRelaxation = s.relaxation <= 12; 
  if (!player.turnFlags.relaxedThisTurn && (dangerouslyLowRelaxation || s.happiness < Math.max(15, targetHappiness - 10))) {
    const relaxAction = tryAction('Relax');
    if (relaxAction) return [relaxAction];
  }

  // 8. Career Upgrade & Job Search
  const targetDependability = targetCareer > 0 ? targetCareer : 0; // targetCareer is ALREADY in Dependability units
  const targetCareerProgress = player.goalAllotment.career;

  if (targetDependability > 0 || targetWealth > 0 || !s.jobId) {
    let bestJob = null;
    let bestScore = -1;
    
    for (const job of campaign.jobs) {
      const depMet = s.dep >= job.requirements.dependability || (job.tags?.includes('auto_accept') ?? false);
      if (s.exp >= job.requirements.experience &&
          depMet &&
          job.requirements.degrees.every(d => s.degrees.includes(d))) {
          
          let score = job.baseWage * 10;
          
          const maxDepForJob = 20 + job.requirements.dependability + s.degrees.length * 5;
          const sustainableCareerProgress = Math.floor(1.25 * (maxDepForJob - 3));
          
          if (targetCareerProgress > 0 && sustainableCareerProgress >= targetCareerProgress) {
              score += 10000;
          } else if (sustainableCareerProgress < targetCareerProgress) {
             score += sustainableCareerProgress * 10;
          }

          if (score > bestScore && !s.rejectedJobs.includes(job.id)) {
              bestScore = score;
              bestJob = job;
          }
      }
    }
    
    const currentJob = campaign.jobs.find(j => j.id === s.jobId);
    let currentScore = -1;
    if (currentJob) {
       currentScore = currentJob.baseWage * 10;
       const maxDepForCurrentJob = 20 + currentJob.requirements.dependability + s.degrees.length * 5;
       const currentSustainableCareerProgress = Math.floor(1.25 * (maxDepForCurrentJob - 3));
       if (targetCareerProgress > 0 && currentSustainableCareerProgress >= targetCareerProgress) {
           currentScore += 10000;
       } else if (currentSustainableCareerProgress < targetCareerProgress) {
           currentScore += currentSustainableCareerProgress * 10;
       }
    }
    
    if (bestJob && bestScore > currentScore) {
      console.log(`[DEBUG-JOB-SEARCH] targetCareerProgress: ${targetCareerProgress}, bestJob: ${bestJob.id}, bestScore: ${bestScore}, currentScore: ${currentScore}`);
      const applyAction = tryAction(`Apply_${bestJob.id}`);
      if (applyAction) return [applyAction];
      const move = moveTo('employment');
      if (move) return [move];
    }
  }

  // 9. Clothes Upgrades (if we have comfortable money and want a career)
  if (clothesItems.length > 0) {
    const currentClothesType = player.inventory.selectedClothes;
    const currentScore = s.clothes > 0 ? (currentClothesType === 'business' ? 3 : (currentClothesType === 'dress' ? 2 : 1)) : 0;
    const targetScore = targetClothes.id.includes('business') ? 3 : (targetClothes.id.includes('dress') ? 2 : 1);
    
    const hasTargetClothes = currentScore >= targetScore && s.clothes > 1;
    const requiredMoney = targetClothes.basePrice + minimumComfortableMoney;
    
    if (!hasTargetClothes && s.money >= requiredMoney) {
      const storeNode = targetClothes.store;
      const buyClothes = tryAction(`BuyClothes_${targetClothes.id}_${targetClothes.store}`);
      if (buyClothes) return [buyClothes];
      const move = moveTo(storeNode);
      if (move) return [move];
    }
  }

  // 10. Work (Aggressive Wealth & Career Trajectory)
  // Work less if we met our goals and don't need money.
  const needsMoney = s.money < targetWealth + rentBuffer;
  // Work is needed for dependability and career progress
  const needsCareer = s.dep < targetCareer;
  if ((needsMoney || needsCareer) && s.jobId && s.hours >= 6) {
     const work = tryAction(`Work_${s.jobId}`);
     if (work) return [work];
     const jobDef = campaign.jobs.find(j => j.id === s.jobId);
     if (jobDef) {
        const move = moveTo(jobDef.locationId);
        if (move) return [move];
     }
  }

  // 11. Stockpile Food if rich
  if (s.money > 200 + rentBuffer && s.food < 10) {
    const buyFood = tryAction('BuyFood');
    if (buyFood) return [buyFood];
    const move = moveTo('grocery');
    if (move) return [move];
  }

  // 12. Fallback Relax
  const relaxAction = tryAction('Relax');
  if (relaxAction) return [relaxAction];

  // 13. Fallback Work
  if (s.jobId && s.hours >= 6) {
    const work = tryAction(`Work_${s.jobId}`);
    if (work) return [work];
    const jobDef = campaign.jobs.find(j => j.id === s.jobId);
    if (jobDef) {
       const move = moveTo(jobDef.locationId);
       if (move) return [move];
    }
  }



  console.log(`[DEBUG-AI-NO-ACTION] s.hours=${s.hours}, s.money=${s.money}, s.jobId=${s.jobId}, s.clothes=${s.clothes}, s.food=${s.food}, targetCareerProgress=${targetCareerProgress}`);
  return [];
}
