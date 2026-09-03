import { describe, it, expect, beforeEach } from 'vitest';
import { GameState, PlayerState, createPlayerState, GameRules, StatRules, OwnedAppliance } from '../src/engine/gameState';
import { gameReducer } from '../src/engine/gameReducer';
import { processTurnStart } from '../src/engine/turnProcessor';
import { calcMaxMental, calcMaxMess, calcUsedSpace } from '../src/engine/statMath';
import { recalculateLifestyle } from '../src/engine/synergyEngine';
import { calcRequiredLessons, study } from '../src/engine/educationEngine';
import { processWeekend } from '../src/engine/weekendEngine';
import { Random } from '../src/utils/rng';
import type { CampaignBundle } from '../src/engine/dataLoader';

const mockStatRules: StatRules = {
  startingHappiness: 50,
  startingRelaxation: 25,
  relaxationDecayRate: 2,
  relaxationDoctorChance: 0.20,
  startingPhysicalCondition: 50,
  startingMentalCondition: 50,
  minPhysicalCondition: 5,
  maxPhysicalCondition: 50,
  minMentalCondition: 5,
  maxMentalCondition: 50,
  globalMaxMentalCondition: 99,
  mentalMaxBaseValue: 51,
  mentalMaxBookLimit: 3,
  mentalMaxBookBonus: 1,
  mentalMaxComputerBonus: 3,
  mentalMaxDegreeBonus: 1,
  physicalDoctorThreshold: 10,
  physicalDoctorChancePerPoint: 0.05,
  lowSpiritsThreshold: 10,
  lowSpiritsChancePerPoint: 0.05,
  workGrindThreshold: 4,
  workGrindPhysicalCost: 1,
  workGrindMentalCost: 1,
  workPhysicalCost: 1,
  workNormalMentalCost: 0,
  workOvertimeThreshold: 8,
  workOvertimePhysicalCost: 2,
  workOvertimeMentalCost: 2,
  studyMentalCost: 1,
  studyNormalMentalCost: 1,
  studyNormalPhysicalCost: 0,
  studyGrindThreshold: 4,
  studyGrindMentalCost: 2,
  studyGrindPhysicalCost: 0,
  studyOvertimeThreshold: 8,
  studyOvertimeMentalCost: 2,
  studyOvertimePhysicalCost: 1,
  resilienceDropThreshold: 3,
  cleanPhysicalCost: 1,
  lowCostMessMax: 50,
  securityMessMax: 90,
  globalMessMax: 99,
  hotTubMaxMessBonus: 5,
  relaxMessIncrease: 1
};

const mockCampaign: CampaignBundle = {
  id: 'advanced',
  name: 'Advanced Variant',
  version: '1.0.0',
  startingCash: 500,
  config: {
    gameRules: {
      usePhysicalMentalConditions: true,
      trackMess: true,
      spaceCapping: true,
      turnStartAtHome: true
    },
    statRules: mockStatRules,
    timeRules: {
      hoursPerTurn: 48,
      relaxCost: 6,
      relaxGain: 3,
      studySessionCost: 6,
      workSessionCost: 6,
      socializeCost: 6,
      cleaningServiceCost: 1,
      doctorPenalty: 4,
      starvationPenalty: 20
    },
    economyRules: {
      socializeLowCostCashCost: 25,
      socializeSecurityCashCost: 50,
      socializePenthouseCashCost: 75,
      cleaningServiceBasePrice: 100
    },
    eventRules: {
      willyRobberyStartWeek: 4
    }
  },
  housing: [
    { id: 'low_cost', name: 'Low-Cost Housing', baseRent: 325, isRobberyImmune: false, homeNodeId: 'node_low_cost', spaceCap: 100, lifestyleValue: 10 },
    { id: 'security', name: 'Security Apartments', baseRent: 475, isRobberyImmune: true, homeNodeId: 'node_security', spaceCap: 250, lifestyleValue: 30 },
    { id: 'penthouse', name: 'Penthouse Suite', baseRent: 850, isRobberyImmune: true, homeNodeId: 'node_security', spaceCap: 750, lifestyleValue: 50 }
  ],
  items: [
    {
      id: 'refrigerator',
      name: 'Refrigerator',
      category: 'appliance',
      basePrice: 650,
      space: 40,
      lifestyleValue: 1,
      tags: ['refrigerator']
    },
    {
      id: 'stove',
      name: 'Stove',
      category: 'appliance',
      basePrice: 490,
      space: 40,
      lifestyleValue: 1,
      tags: ['stove'],
      effects: [
        { trigger: 'on_relax', stat: 'physical', value: 1 }
      ]
    },
    {
      id: 'microwave',
      name: 'Microwave',
      category: 'appliance',
      basePrice: 220,
      space: 20,
      lifestyleValue: 2,
      tags: ['microwave'],
      effects: [
        { trigger: 'on_relax', stat: 'physical', value: 1 },
        { trigger: 'on_socialize', stat: 'social', value: 1 }
      ]
    },
    {
      id: 'stereo',
      name: 'Stereo',
      category: 'appliance',
      basePrice: 450,
      space: 20,
      lifestyleValue: 2,
      tags: ['stereo'],
      effects: [
        { trigger: 'on_socialize', stat: 'social', value: 1 }
      ]
    },
    {
      id: 'color_tv',
      name: 'Color TV',
      category: 'appliance',
      basePrice: 349,
      space: 20,
      lifestyleValue: 2,
      tags: ['color_tv'],
      effects: [
        { trigger: 'on_socialize', stat: 'social', value: 2 }
      ]
    },
    {
      id: 'hot_tub',
      name: 'Hot Tub',
      category: 'appliance',
      basePrice: 1255,
      space: 90,
      lifestyleValue: 5,
      tags: ['hot_tub'],
      effects: [
        { trigger: 'on_relax', stat: 'physical', value: 1 },
        { trigger: 'on_relax', stat: 'mental', value: 1 },
        { trigger: 'on_socialize', stat: 'social', value: 3 },
        { trigger: 'continuous', stat: 'mess_max', value: 5 }
      ]
    },
    {
      id: 'computer',
      name: 'Computer',
      category: 'appliance',
      basePrice: 1599,
      space: 40,
      lifestyleValue: 3,
      tags: ['computer'],
      effects: [
        { trigger: 'continuous', stat: 'mental_max', value: 3 }
      ]
    },
    {
      id: 'dictionary',
      name: 'Dictionary',
      category: 'book',
      basePrice: 70,
      space: 10,
      lifestyleValue: 1,
      effects: [
        { trigger: 'continuous', stat: 'mental_max', value: 1 }
      ]
    }
  ],
  synergies: [
    {
      id: 'refrigeration_storage',
      name: 'Cold Storage',
      requires: ['tag:refrigerator'],
      effects: [
        { type: 'set_food_storage', value: 6, operation: 'MAX' }
      ]
    },
    {
      id: 'computer_income',
      name: 'Freelance Coding',
      requires: ['tag:computer'],
      effects: [
        { type: 'computer_income_chance', value: 1, operation: 'MAX' }
      ]
    }
  ],
  education: [
    {
      id: 'comp_sci',
      name: 'Computer Science',
      baseTuitionFee: 300,
      lessonsRequired: 10,
      rewards: { dependability: 5, maxDependability: 5, maxExperience: 5 },
      prerequisites: []
    }
  ],
  weekends: {
    ticketWeekends: {},
    durableWeekends: {
      color_tv: { text: 'You spent the weekend binge-watching classic movies on your Color TV.' },
      stereo: { text: 'You spent the weekend listening to records on your Stereo.' }
    },
    randomWeekends: [
      { text: 'A relaxing weekend stroll in the park.', price: 'cheap' }
    ]
  },
  jobs: [],
  events: [],
  stocks: [],
  messages: {},
  map: { width: 10, height: 10, nodes: [{ id: 'node_low_cost', name: 'Home', buildingId: 'low_cost_housing', x: 0, y: 0, connections: [] }] }
};

describe('Pawned Appliances Benefits & Invariants', () => {
  let player: PlayerState;

  beforeEach(() => {
    player = {
      ...createPlayerState('p1', 'Player 1', false, 'node_low_cost', mockCampaign.config, mockCampaign.config.statRules),
      currentHousingId: 'low_cost',
      money: 1000,
      hoursRemaining: 48,
      physicalCondition: 20,
      mentalCondition: 20,
      mess: 0,
      social: 0,
      turnFlags: {},
      inventory: {
        casualClothesWeeks: 10,
        dressClothesWeeks: 0,
        businessClothesWeeks: 0,
        freshFoodUnits: 2,
        fastFoodItems: [],
        lotteryTickets: 0,
        tickets: { concert: 0, theater: 0, sports: 0, movie: 0 },
        appliances: [],
        books: [],
        pawnedItems: [],
        stocks: { tBills: 0 }
      }
    };
  });

  it('1. Relax Bonuses: Stove and Hot Tub grant physical & mental bonuses only when owned, not when pawned', () => {
    // 1A. Relax without appliances:
    // Base physical gain with food = 1 + floor(20 / 25) = 1 + 0 = 1
    // Base mental gain with food (first relax) = 2 (first bonus) + 3 - 0 (mess penalty) = 5
    const context = {
      state: { players: [player], economicIndex: 0, turn: 1, rules: mockCampaign.config.gameRules! } as any,
      rules: mockCampaign.config.gameRules!,
      campaign: mockCampaign,
      turn: 1,
      rng: new Random(12345)
    };

    const baseRelaxResult = gameReducer(player, { type: 'relax' }, context);
    expect(baseRelaxResult.updatedPlayer.physicalCondition).toBe(20 + 1);
    expect(baseRelaxResult.updatedPlayer.mentalCondition).toBe(20 + 5);

    // 1B. Player owns Stove (+1 phys) and Hot Tub (+1 phys, +1 mental)
    const equippedPlayer: PlayerState = {
      ...player,
      turnFlags: {},
      inventory: {
        ...player.inventory,
        appliances: [
          { id: 'stove', purchasePrice: 490, purchaseSource: 'socket_city' },
          { id: 'hot_tub', purchasePrice: 1255, purchaseSource: 'socket_city' }
        ]
      }
    };

    const equippedContext = {
      ...context,
      state: { ...context.state, players: [equippedPlayer] }
    };

    const equippedRelax = gameReducer(equippedPlayer, { type: 'relax' }, equippedContext);
    // Phys: base 1 + 1 (stove) + 1 (hot_tub) = +3 -> 20 + 3 = 23
    // Mental: base 5 + 1 (hot_tub) = +6 -> 20 + 6 = 26
    expect(equippedRelax.updatedPlayer.physicalCondition).toBe(23);
    expect(equippedRelax.updatedPlayer.mentalCondition).toBe(26);

    // 1C. Pawn the Stove and Hot Tub
    let pawnedPlayer = { ...equippedPlayer, turnFlags: {} };
    pawnedPlayer = gameReducer(pawnedPlayer, {
      type: 'pawn_item',
      item: pawnedPlayer.inventory.appliances[0], // Stove
      value: 200
    }, equippedContext).updatedPlayer;

    pawnedPlayer = gameReducer(pawnedPlayer, {
      type: 'pawn_item',
      item: pawnedPlayer.inventory.appliances[0], // Hot Tub
      value: 500
    }, equippedContext).updatedPlayer;

    expect(pawnedPlayer.inventory.appliances.length).toBe(0);
    expect(pawnedPlayer.inventory.pawnedItems?.length).toBe(2);

    // Relax while appliances are in pawn shop (first relax of turn):
    pawnedPlayer.turnFlags = {};
    pawnedPlayer.physicalCondition = 20;
    pawnedPlayer.mentalCondition = 20;

    const pawnedContext = {
      ...context,
      state: { ...context.state, players: [pawnedPlayer] }
    };
    const pawnedRelax = gameReducer(pawnedPlayer, { type: 'relax' }, pawnedContext);
    // Gains revert strictly to base (1 phys, 5 mental)
    expect(pawnedRelax.updatedPlayer.physicalCondition).toBe(20 + 1);
    expect(pawnedRelax.updatedPlayer.mentalCondition).toBe(20 + 5);

    // 1D. Redeem the Stove back
    const redeemContext = {
      ...context,
      state: { ...context.state, players: [pawnedPlayer] }
    };
    const stovePawnedItem = pawnedPlayer.inventory.pawnedItems!.find(p => p.itemId === 'stove')!;
    const redeemedPlayer = gameReducer(pawnedPlayer, {
      type: 'redeem_item',
      item: stovePawnedItem,
      cost: stovePawnedItem.redeemCost
    }, redeemContext).updatedPlayer;

    expect(redeemedPlayer.inventory.appliances.length).toBe(1);
    expect(redeemedPlayer.inventory.appliances[0].id).toBe('stove');

    redeemedPlayer.turnFlags = {};
    redeemedPlayer.physicalCondition = 20;
    redeemedPlayer.mentalCondition = 20;

    const redeemedRelax = gameReducer(redeemedPlayer, { type: 'relax' }, { ...context, state: { ...context.state, players: [redeemedPlayer] } });
    // Phys includes Stove again (+2 total: 1 base + 1 stove -> 22)
    // Mental is base (5 -> 25)
    expect(redeemedRelax.updatedPlayer.physicalCondition).toBe(22);
    expect(redeemedRelax.updatedPlayer.mentalCondition).toBe(25);
  });

  it('2. Socialize Bonuses: Stereo and Color TV boost socialize rewards only when owned, not when pawned', () => {
    const context = {
      state: { players: [player], economicIndex: 0, turn: 1, rules: mockCampaign.config.gameRules! } as any,
      rules: mockCampaign.config.gameRules!,
      campaign: mockCampaign,
      turn: 1,
      rng: new Random(12345)
    };

    // Equipped: Stereo (+1 social) and Color TV (+2 social) -> +3 bonus
    const equippedPlayer: PlayerState = {
      ...player,
      currentHousingId: 'penthouse', // spacious
      social: 10,
      inventory: {
        ...player.inventory,
        appliances: [
          { id: 'stereo', purchasePrice: 450, purchaseSource: 'socket_city' },
          { id: 'color_tv', purchasePrice: 349, purchaseSource: 'socket_city' }
        ]
      }
    };

    const equippedContext = { ...context, state: { ...context.state, players: [equippedPlayer] } };
    const equippedSocialResult = gameReducer(equippedPlayer, { type: 'socialize_guests' }, equippedContext);
    const equippedActionLog = Array.isArray(equippedSocialResult.actionLog) ? equippedSocialResult.actionLog[0] : equippedSocialResult.actionLog;
    const guests = equippedActionLog?.params?.guests;
    // Base Penthouse reward: guests * 3 + 3 (effects bonus)
    expect(equippedActionLog?.params?.reward).toBe((guests * 3) + 3);

    // Pawn both appliances:
    let pawnedPlayer = equippedPlayer;
    pawnedPlayer = gameReducer(pawnedPlayer, { type: 'pawn_item', item: pawnedPlayer.inventory.appliances[0], value: 200 }, equippedContext).updatedPlayer;
    pawnedPlayer = gameReducer(pawnedPlayer, { type: 'pawn_item', item: pawnedPlayer.inventory.appliances[0], value: 200 }, equippedContext).updatedPlayer;

    const pawnedSocialResult = gameReducer(pawnedPlayer, { type: 'socialize_guests' }, { ...context, state: { ...context.state, players: [pawnedPlayer] } });
    const pawnedActionLog = Array.isArray(pawnedSocialResult.actionLog) ? pawnedSocialResult.actionLog[0] : pawnedSocialResult.actionLog;
    const pawnedGuests = pawnedActionLog?.params?.guests;
    // Reward has NO extra item effects: strictly guests * 3
    expect(pawnedActionLog?.params?.reward).toBe(pawnedGuests * 3);
  });

  it('3. Food Preservation & Spoilage: Pawned Refrigerator causes food to spoil across turn maintenance', () => {
    // 3A. Turn with owned refrigerator -> Food stays fresh
    const fridgePlayer: PlayerState = {
      ...player,
      inventory: {
        ...player.inventory,
        appliances: [{ id: 'refrigerator', purchasePrice: 650, purchaseSource: 'socket_city' }],
        freshFoodUnits: 3
      }
    };

    const stateWithFridge: GameState = {
      turn: 1,
      players: [fridgePlayer],
      rules: mockCampaign.config.gameRules!,
      economicIndex: 0,
      rngState: 12345
    };

    const nextStateWithFridge = processTurnStart(stateWithFridge, mockCampaign);
    // Fresh food preserved, 1 consumed for the week -> 2 remaining
    expect(nextStateWithFridge.players[0].inventory.freshFoodUnits).toBe(2);
    // Consuming 1 fresh food unit at home generates 1 mess
    expect(nextStateWithFridge.players[0].mess).toBe(1);

    // 3B. Pawn the Refrigerator -> turn start causes all fresh food to spoil
    const context = {
      state: { players: [fridgePlayer], economicIndex: 0, turn: 1, rules: mockCampaign.config.gameRules! } as any,
      rules: mockCampaign.config.gameRules!,
      campaign: mockCampaign,
      turn: 1,
      rng: new Random(12345)
    };

    const pawnedPlayer = gameReducer(fridgePlayer, {
      type: 'pawn_item',
      item: fridgePlayer.inventory.appliances[0],
      value: 250
    }, context).updatedPlayer;

    expect(pawnedPlayer.inventory.appliances.length).toBe(0);
    expect(pawnedPlayer.inventory.freshFoodUnits).toBe(3);

    const stateWithoutFridge: GameState = {
      turn: 1,
      players: [pawnedPlayer],
      rules: mockCampaign.config.gameRules!,
      economicIndex: 0,
      rngState: 12345
    };

    const nextStateWithoutFridge = processTurnStart(stateWithoutFridge, mockCampaign);
    // All 3 fresh food units spoiled into mess! (0 food remaining, 1 base mess + 3 mess generated from spoiled food = 4)
    expect(nextStateWithoutFridge.players[0].inventory.freshFoodUnits).toBe(0);
    expect(nextStateWithoutFridge.players[0].mess).toBe(4);
  });

  it('4. Max Mental Condition: Computer grants +3 Mental Max only when owned, not when pawned', () => {
    // Base max mental
    const baseMax = calcMaxMental(player.mess || 0, player.social || 0, 0, player, mockStatRules, mockCampaign);

    // Add computer to inventory
    const computerPlayer: PlayerState = {
      ...player,
      inventory: {
        ...player.inventory,
        appliances: [{ id: 'computer', purchasePrice: 1599, purchaseSource: 'socket_city' }]
      }
    };
    const compMax = calcMaxMental(computerPlayer.mess || 0, computerPlayer.social || 0, 0, computerPlayer, mockStatRules, mockCampaign);
    expect(compMax).toBe(baseMax + 3);

    // Pawn the computer
    const pawnedComputerPlayer: PlayerState = {
      ...player,
      inventory: {
        ...player.inventory,
        appliances: [],
        pawnedItems: [{
          itemId: 'computer',
          originalPrice: 1599,
          redeemCost: 800,
          weekPawned: 1,
          ownerId: player.id
        }]
      }
    };
    const pawnedMax = calcMaxMental(pawnedComputerPlayer.mess || 0, pawnedComputerPlayer.social || 0, 0, pawnedComputerPlayer, mockStatRules, mockCampaign);
    // Max mental reverts to base without computer bonus
    expect(pawnedMax).toBe(baseMax);
  });

  it('5. Max Housing Mess: Hot Tub grants +5 Max Mess only when owned, not when pawned', () => {
    const baseMaxMess = calcMaxMess(player, mockStatRules, mockCampaign);
    expect(baseMaxMess).toBe(50); // Low Cost base

    // With Hot Tub in inventory
    const hotTubPlayer: PlayerState = {
      ...player,
      inventory: {
        ...player.inventory,
        appliances: [{ id: 'hot_tub', purchasePrice: 1255, purchaseSource: 'socket_city' }]
      }
    };
    const equippedMaxMess = calcMaxMess(hotTubPlayer, mockStatRules, mockCampaign);
    expect(equippedMaxMess).toBe(55);

    // Pawn the Hot Tub
    const pawnedHotTubPlayer: PlayerState = {
      ...player,
      inventory: {
        ...player.inventory,
        appliances: [],
        pawnedItems: [{
          itemId: 'hot_tub',
          originalPrice: 1255,
          redeemCost: 600,
          weekPawned: 1,
          ownerId: player.id
        }]
      }
    };
    const pawnedMaxMess = calcMaxMess(pawnedHotTubPlayer, mockStatRules, mockCampaign);
    expect(pawnedMaxMess).toBe(50);
  });

  it('6. Lifestyle Score: Pawned appliances do not count toward lifestyle', () => {
    const equippedPlayer: PlayerState = {
      ...player,
      inventory: {
        ...player.inventory,
        appliances: [
          { id: 'stove', purchasePrice: 490, purchaseSource: 'socket_city' }, // lifestyleValue = 1
          { id: 'computer', purchasePrice: 1599, purchaseSource: 'socket_city' } // lifestyleValue = 3
        ]
      }
    };

    // Housing lifestyle (10) + stove (1) + computer (3) = 14
    const equippedLifestyle = recalculateLifestyle(equippedPlayer, mockCampaign);
    expect(equippedLifestyle).toBe(14);

    // Pawn the computer
    const pawnedPlayer: PlayerState = {
      ...equippedPlayer,
      inventory: {
        ...equippedPlayer.inventory,
        appliances: [{ id: 'stove', purchasePrice: 490, purchaseSource: 'socket_city' }],
        pawnedItems: [{ itemId: 'computer', originalPrice: 1599, redeemCost: 800, weekPawned: 1, ownerId: player.id }]
      }
    };

    // Housing (10) + stove (1) = 11
    const pawnedLifestyle = recalculateLifestyle(pawnedPlayer, mockCampaign);
    expect(pawnedLifestyle).toBe(11);
  });

  it('7. Education / Studying: Computer reduces lessons required only when owned, not when pawned', () => {
    const degree = mockCampaign.education[0]; // 10 lessons required

    // Without computer: requires full 10 lessons
    const baseLessons = calcRequiredLessons(player, degree, mockCampaign.config.gameRules!);
    expect(baseLessons).toBe(10);

    // With computer in inventory: requires 9 lessons (1 lesson reduction)
    const computerPlayer: PlayerState = {
      ...player,
      inventory: {
        ...player.inventory,
        appliances: [{ id: 'computer', purchasePrice: 1599, purchaseSource: 'socket_city' }]
      }
    };
    const compLessons = calcRequiredLessons(computerPlayer, degree, mockCampaign.config.gameRules!);
    expect(compLessons).toBe(9);

    // Pawn the computer: required lessons reverts to 10
    const pawnedComputerPlayer: PlayerState = {
      ...player,
      inventory: {
        ...player.inventory,
        appliances: [],
        pawnedItems: [{ itemId: 'computer', originalPrice: 1599, redeemCost: 800, weekPawned: 1, ownerId: player.id }]
      }
    };
    const pawnedLessons = calcRequiredLessons(pawnedComputerPlayer, degree, mockCampaign.config.gameRules!);
    expect(pawnedLessons).toBe(10);
  });

  it('8. Weekend Durable Events: Only owned appliances trigger durable weekend events, never pawned ones', () => {
    const rng = new Random(12345);

    // Player with pawned color_tv and stereo (both have durable weekend events defined)
    const pawnedPlayer: PlayerState = {
      ...player,
      inventory: {
        ...player.inventory,
        appliances: [],
        pawnedItems: [
          { itemId: 'color_tv', originalPrice: 349, redeemCost: 175, weekPawned: 1, ownerId: player.id },
          { itemId: 'stereo', originalPrice: 450, redeemCost: 225, weekPawned: 1, ownerId: player.id }
        ]
      }
    };

    const result = processWeekend(
      pawnedPlayer,
      1,
      [],
      mockCampaign.weekends,
      rng,
      mockCampaign.config.gameRules,
      mockCampaign
    );
    // Pawned appliances must NEVER trigger their durable weekend events
    expect(result.weekendResult?.event.key).not.toBe('events.weekend.durable_color_tv');
    expect(result.weekendResult?.event.key).not.toBe('events.weekend.durable_stereo');
  });
});
