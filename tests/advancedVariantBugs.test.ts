import { describe, it, expect } from 'vitest';
import { loadCampaign } from '../src/engine/dataLoader';
import { calcLiquidAssets } from '../src/engine/economyEngine';
import { calcWealthProgress } from '../src/engine/statMath';
import { study } from '../src/engine/educationEngine';
import { isLogMatchingFilter } from '../src/utils/logCategorizer';
import type { PlayerState, GameRules } from '../src/engine/gameState';

describe('Advanced Variant Bugs (Integration & Regression)', () => {

  it('BUG 1: reducedDegreeStatBonus should use the rules argument, not player.rules', () => {
    // We do NOT add rules to the player object here, to mimic production state.
    const player = { 
      id: 'p1', name: 'Player', hoursRemaining: 10, 
      enrolledClasses: { 'junior_college': 7 },
      happiness: 50, dependability: 50, degreeDepBoost: 50, degreeExpBoost: 50,
      degrees: [],
      inventory: { appliances: [{id: 'computer'}], books: ['dictionary', 'encyclopedia', 'atlas'] }
    } as unknown as PlayerState;
    
    const mockDegree = {
      id: 'junior_college',
      name: 'Junior College',
      prerequisites: [],
      baseTuitionFee: 50,
      lessonsRequired: 10,
      rewards: { happiness: 5, dependability: 5, maxDepBoost: 5, maxExpBoost: 5 }
    };

    const rules: GameRules = { reducedDegreeStatBonus: true } as unknown as GameRules;
    
    // In production, the rules are passed as the 4th argument.
    const result = study(player, mockDegree, 6, rules);
    expect(result.success).toBe(true);
    // Because the rule is enabled, dependability should only increase by 2 (50 -> 52)
    // Currently, it increases by 5 because the code looks at player.rules.
    expect(result.updated.dependability).toBe(52);
  });

  it('BUG 2: QT Clothing and Socket City are missing their original items in the Advanced Campaign', async () => {
    // Load the advanced campaign which merges qol_improved + advanced delta
    const advanced = await loadCampaign('advanced');
    
    const socketCityBuilding = advanced.buildings.find(b => b.id === 'socket_city');
    const qtClothingBuilding = advanced.buildings.find(b => b.id === 'qt_clothing');

    const socketCityItems = socketCityBuilding?.inventory || [];
    const qtClothingItems = qtClothingBuilding?.inventory || [];

    // Socket City should have at least 8 items (it had 9 in base, should still have most of them)
    // Currently it only has 3 items because the others were moved to discount_and_pawn.
    expect(socketCityItems.length).toBeGreaterThan(5);

    // QT Clothing should have at least 3 items.
    // Currently it only has 1.
    expect(qtClothingItems.length).toBeGreaterThan(2);
  });

  it('BUG 3: Wealth goal progress can be negative due to loan debt', () => {
    // Wealth should never drop below 0.
    const player = {
      money: 50,
      bankSavings: 0,
      loanDebt: 5000,
      inventory: { stocks: { tBills: 0, holdings: {} } }
    } as unknown as PlayerState;

    const liquidAssets = calcLiquidAssets(player, undefined, 0, 1);
    const wealthProgress = calcWealthProgress(liquidAssets);

    // As per user feedback, wealth SHOULD be allowed to be negative if debt exceeds cash.
    expect(wealthProgress).toBeLessThan(0);
  });

  it('BUG 5: logCategorizer does not map events to lifestyle, mental, physical', () => {
    // e.g. eating food affects mental/physical, buying stuff affects lifestyle, etc.
    const logEntry = {
      id: '1', turn: 1, type: 'action', 
      event: { key: 'action.food.bought', categories: ['mental'] }, message: 'Bought food'
    } as any;
    
    // We expect a food event to map to 'mental' (as food increases mentalCondition in Advanced)
    // However, logCategorizer only knows 'happiness', 'wealth', etc.
    const result = isLogMatchingFilter(logEntry, 'mental' as any);
    expect(result).toBe(true);
  });

});
