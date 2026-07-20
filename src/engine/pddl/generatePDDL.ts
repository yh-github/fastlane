import { CampaignBundle } from '../dataLoader';
import { PlayerState, GameState } from '../gameState';

function getBuildingNodeByArchetype(campaign: CampaignBundle, archetype: string): string | null {
  const building = campaign.buildings.find(b => b.archetype === archetype);
  if (!building) return null;
  return campaign.map.nodes.find(n => n.buildingId === building.id)?.id || null;
}

function getBuildingNodeById(campaign: CampaignBundle, buildingId: string): string | null {
  return campaign.map.nodes.find(n => n.buildingId === buildingId)?.id || null;
}

export function generateDomain(campaign: CampaignBundle): string {
  const locations = new Set<string>();
  campaign.map.nodes.forEach(n => locations.add(n.id));

  let pddl = `(define (domain fastlane)
  (:requirements :typing :numeric-fluents :negative-preconditions :conditional-effects)
  
  (:types location)
  
  (:predicates
    (at ?l - location)
    (rent_paid)
    (relaxed_this_turn)
`;

  // Predicates for jobs and degrees
  campaign.jobs.forEach(j => {
    pddl += `    (has_job_${j.id})\n`;
  });
  campaign.education.forEach(d => {
    pddl += `    (has_degree_${d.id})\n`;
    pddl += `    (enrolled_${d.id})\n`;
  });

  pddl += `  )
  
  (:functions
    (hours)
    (money)
    (food)
    (clothes)
    (exp)
    (dep)
    (happiness)
    (week)
`;
  campaign.education.forEach(d => {
    pddl += `    (lessons_${d.id})\n`;
  });

  pddl += `  )
  
  ;; --- ACTIONS ---
  
  (:action move
    :parameters (?to - location)
    :precondition (and (>= (hours) 2) (not (at ?to)))
    :effect (and
      (decrease (hours) 2)
      (at ?to)
`;
  Array.from(locations).forEach(l => {
    pddl += `      (when (not (= ?to ${l})) (not (at ${l})))\n`;
  });
  pddl += `    )\n  )\n\n`;

  // Relax
  pddl += `  (:action relax
    :parameters ()
    :precondition (and (>= (hours) 6) (not (relaxed_this_turn)))
    :effect (and
      (decrease (hours) 6)
      (increase (happiness) 2)
      (relaxed_this_turn)
    )
  )\n\n`;

  // Buy Food
  const groceries = campaign.items.filter(i => i.category === 'food' && i.subcategory === 'groceries').sort((a, b) => a.basePrice - b.basePrice);
  if (groceries.length > 0) {
    const food = groceries[0];
    const storeNode = getBuildingNodeById(campaign, food.store);
    if (storeNode) {
      pddl += `  (:action buy_food
    :parameters ()
    :precondition (and (at ${storeNode}) (>= (money) ${food.basePrice}))
    :effect (and
      (decrease (money) ${food.basePrice})
      (increase (food) 14)
    )
  )\n\n`;
    }
  }

  // Pay Rent
  const rentNode = getBuildingNodeByArchetype(campaign, 'housing');
  if (rentNode) {
    pddl += `  (:action pay_rent
    :parameters ()
    :precondition (and (at ${rentNode}) (>= (money) 150) (not (rent_paid)))
    :effect (and
      (decrease (money) 150)
      (rent_paid)
    )
  )\n\n`;
  }

  // Buy Clothes
  const clothesItems = campaign.items.filter(i => i.category === 'clothes').sort((a, b) => a.basePrice - b.basePrice);
  clothesItems.forEach(item => {
    const storeNode = getBuildingNodeById(campaign, item.store);
    if (storeNode) {
      pddl += `  (:action buy_clothes_${item.id}
    :parameters ()
    :precondition (and (at ${storeNode}) (>= (money) ${item.basePrice}))
    :effect (and
      (decrease (money) ${item.basePrice})
      (increase (clothes) 11)
    )
  )\n\n`;
    }
  });

  // Jobs
  campaign.jobs.forEach(job => {
    const bId = getBuildingNodeById(campaign, job.locationId);
    if (!bId) return;
    
    // Work
    pddl += `  (:action work_${job.id}
    :parameters ()
    :precondition (and (at ${bId}) (has_job_${job.id}) (>= (hours) 6) (>= (clothes) 1))
    :effect (and
      (decrease (hours) 6)
      (increase (money) ${job.baseWage * 6})
      (increase (exp) 1)
      (increase (dep) 1)
      (decrease (clothes) 1)
    )
  )\n\n`;

    // Apply
    const empNode = getBuildingNodeByArchetype(campaign, 'employment');
    if (empNode) {
      let degreePrecs = job.requirements.degrees.map(d => `(has_degree_${d})`).join(' ');
      pddl += `  (:action apply_${job.id}
    :parameters ()
    :precondition (and 
      (at ${empNode}) 
      (>= (hours) 4) 
      (>= (exp) ${job.requirements.experience}) 
      (>= (dep) ${job.requirements.dependability})
      ${degreePrecs}
      (not (has_job_${job.id}))
    )
    :effect (and
      (decrease (hours) 4)
      (has_job_${job.id})
`;
      campaign.jobs.forEach(j2 => {
        if (j2.id !== job.id) {
          pddl += `      (not (has_job_${j2.id}))\n`;
        }
      });
      pddl += `    )\n  )\n\n`;
    }
  });

  // Education
  const uniNode = getBuildingNodeByArchetype(campaign, 'education');
  if (uniNode) {
    campaign.education.forEach(deg => {
      // Enroll
      let degreePrecs = deg.prerequisites.map(d => `(has_degree_${d})`).join(' ');
      pddl += `  (:action enroll_${deg.id}
    :parameters ()
    :precondition (and 
      (at ${uniNode}) 
      (>= (money) ${deg.baseTuitionFee}) 
      (not (has_degree_${deg.id}))
      (not (enrolled_${deg.id}))
      ${degreePrecs}
    )
    :effect (and
      (decrease (money) ${deg.baseTuitionFee})
      (enrolled_${deg.id})
    )
  )\n\n`;

      // Study
      pddl += `  (:action study_${deg.id}
    :parameters ()
    :precondition (and 
      (at ${uniNode}) 
      (>= (hours) 4) 
      (enrolled_${deg.id})
      (< (lessons_${deg.id}) ${deg.lessonsRequired})
    )
    :effect (and
      (decrease (hours) 4)
      (increase (lessons_${deg.id}) 1)
    )
  )\n\n`;

      // Graduate
      pddl += `  (:action graduate_${deg.id}
    :parameters ()
    :precondition (and 
      (enrolled_${deg.id})
      (>= (lessons_${deg.id}) ${deg.lessonsRequired})
    )
    :effect (and
      (not (enrolled_${deg.id}))
      (has_degree_${deg.id})
    )
  )

  (:action end_turn
    :parameters ()
    :precondition (<= (hours) 60)
    :effect (and
      (increase (hours) (- 60 (hours)))
      (increase (week) 1)
      (decrease (food) 14)
      (not (rent_paid))
      (not (relaxed_this_turn))
    )
  )

`;
    });
  }

  pddl += `)\n`;
  return pddl;
}

export function generateProblem(campaign: CampaignBundle, state: GameState, player: PlayerState): string {
  const locations = new Set<string>();
  campaign.map.nodes.forEach(n => locations.add(n.id));

  let pddl = `(define (problem fastlane_prob)
  (:domain fastlane)
  
  (:objects
`;
  pddl += `    ${Array.from(locations).join(' ')} - location\n`;
  pddl += `  )\n\n`;

  pddl += `  (:init\n`;
  pddl += `    (at ${player.position})\n`;
  
  if (player.currentJobId) {
    pddl += `    (has_job_${player.currentJobId})\n`;
  }
  
  player.degrees.forEach(d => {
    pddl += `    (has_degree_${d})\n`;
  });
  
  Object.keys(player.enrolledClasses).forEach(d => {
    pddl += `    (enrolled_${d})\n`;
  });
  
  if (player.rentPaidUntilWeek > state.turn + 1) {
    pddl += `    (rent_paid)\n`;
  }
  if (player.turnFlags.relaxedThisTurn) {
    pddl += `    (relaxed_this_turn)\n`;
  }

  pddl += `    (= (hours) ${player.hoursRemaining})\n`;
  pddl += `    (= (money) ${player.money})\n`;
  pddl += `    (= (food) ${player.inventory.freshFoodUnits})\n`;
  pddl += `    (= (clothes) ${player.inventory.casualClothesWeeks + player.inventory.dressClothesWeeks + player.inventory.businessClothesWeeks})\n`;
  pddl += `    (= (exp) ${player.experience})\n`;
  pddl += `    (= (dep) ${player.dependability})\n`;
  pddl += `    (= (happiness) ${player.happiness})\n`;
  pddl += `    (= (week) ${state.turn})\n`;

  campaign.education.forEach(d => {
    pddl += `    (= (lessons_${d.id}) ${player.enrolledClasses[d.id] || 0})\n`;
  });

  pddl += `  )\n\n`;

  // Goal
  pddl += `  (:goal (and
    (>= (happiness) 50)
    (>= (exp) 50)
    (>= (dep) 50)
    (>= (money) 50)
  ))\n`;

  // Note: For full accuracy, we'd add numeric goals for exactly 50 wealth points, but PDDL
  // doesn't support complex arithmetic in goal unless it's supported by ENHSP. 
  // ENHSP does support it! So we could write: (>= (+ (money) (* (exp) 10)) 5000)

  pddl += `)\n`;
  return pddl;
}
