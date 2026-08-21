import { describe, it, expect } from 'vitest';
import {
  calcEmployabilityScore,
  calcDependabilityDecay,
  calcMaxDependability,
  calcMaxExperience,
  calcProratedWage,
  calcRobberyChance,
  calcRaiseThreshold,
  calcCareerProgress,
  calcWealthProgress,
  calcEducationProgress,
  STAT_REGISTRY,
  getStatFilterCategories
} from './statMath';

describe('statMath', () => {
  it('calcEmployabilityScore', () => {
    expect(calcEmployabilityScore(10, 10, 0)).toBe(40); // 30 + Math.floor((10 + 10 + 10 + 0) / 3) = 40
    expect(calcEmployabilityScore(20, 20, 1)).toBe(49); // 30 + Math.floor((10 + 20 + 20 + 8) / 3) = 49
    expect(calcEmployabilityScore(20, 10, 0)).toBe(43); // 30 + Math.floor((10 + 20 + 10 + 0) / 3) = 43 (Starting Employability)
    // With Social bonus: +floor(social / 15)
    expect(calcEmployabilityScore(20, 10, 0, 0, 30)).toBe(45); // 43 + 2
    expect(calcEmployabilityScore(20, 10, 0, 0, 45)).toBe(46); // 43 + 3
    expect(calcEmployabilityScore(20, 10, 0, 5, 45)).toBe(41); // 43 + 3 - 5 mistakes = 41
  });

  it('calcDependabilityDecay decays by 3, min 0 in classic', () => {
    expect(calcDependabilityDecay(10)).toBe(7);
    expect(calcDependabilityDecay(2)).toBe(0);
  });

  it('calcDependabilityDecay in advanced mode with job requirements and social offset', () => {
    // Unemployed (req=0 -> baseLoss 3): social 0 -> -3
    expect(calcDependabilityDecay(50, 0, true, 0)).toBe(47);
    // Job req 50 -> ceil(50/10) = 5 loss. With social 25 (offset 1) -> 5 - 1 = 4 loss
    expect(calcDependabilityDecay(50, 50, true, 25)).toBe(46);
    // Job req 50 -> 5 loss. With social 75 (offset 3) -> 5 - 3 = 2 loss
    expect(calcDependabilityDecay(50, 50, true, 75)).toBe(48);
    // Offset must never reduce loss below 1: Job req 10 -> base 1 loss. Social 99 (offset 3) -> min loss 1
    expect(calcDependabilityDecay(50, 10, true, 99)).toBe(49);
    // Unemployed base 3 loss. Social 99 (offset 3) -> min loss 1
    expect(calcDependabilityDecay(50, 0, true, 99)).toBe(49);
  });

  it('calcMaxDependability', () => {
    expect(calcMaxDependability(0, 0)).toBe(20);
    expect(calcMaxDependability(10, 5)).toBe(35); // 20 + 10 + 5
  });

  it('calcMaxExperience', () => {
    expect(calcMaxExperience(0, 0)).toBe(10);
    expect(calcMaxExperience(10, 5)).toBe(25); // 10 + 10 + 5
  });

  it('calcProratedWage', () => {
    expect(calcProratedWage(10, 6)).toBe(80);
    expect(calcProratedWage(10, 3)).toBe(40);
    expect(calcProratedWage(10, 1)).toBe(13); // 10 * 8 * 1 / 6 = 13.33 => 13
  });

  it('calcRobberyChance', () => {
    expect(calcRobberyChance(0)).toBe(1);
    expect(calcRobberyChance(99)).toBe(0.01);
  });

  it('calcRaiseThreshold', () => {
    expect(calcRaiseThreshold(10, 0)).toBe(10);
    expect(calcRaiseThreshold(10, 2)).toBe(20);
    expect(calcRaiseThreshold(10, 2, 1)).toBe(15); // 1 project completed discounts 1 raise
    expect(calcRaiseThreshold(10, 2, 3)).toBe(10); // 3 projects completed discounts all raises
  });

  it('calcCareerProgress', () => {
    expect(calcCareerProgress(80, true)).toBe(100);
    expect(calcCareerProgress(40, true)).toBe(50);
    expect(calcCareerProgress(80, false)).toBe(0);
  });

  it('calcWealthProgress', () => {
    expect(calcWealthProgress(10000)).toBe(100);
    expect(calcWealthProgress(5000)).toBe(50);
  });

  it('calcEducationProgress', () => {
    expect(calcEducationProgress(0)).toBe(1);
    expect(calcEducationProgress(11)).toBe(100);
  });

  it('STAT_REGISTRY and getStatFilterCategories', () => {
    expect(STAT_REGISTRY.employability.isDerived).toBe(true);
    expect(STAT_REGISTRY.employability.dependencies).toContain('dependability');
    expect(STAT_REGISTRY.employability.dependencies).toContain('experience');
    expect(STAT_REGISTRY.employability.dependencies).toContain('social');

    const employabilityCategories = getStatFilterCategories('employability');
    expect(employabilityCategories.has('dependability')).toBe(true);
    expect(employabilityCategories.has('experience')).toBe(true);
    expect(employabilityCategories.has('education')).toBe(true);
    expect(employabilityCategories.has('social')).toBe(true);

    const wealthCategories = getStatFilterCategories('wealth');
    expect(wealthCategories.has('money')).toBe(true);
    expect(wealthCategories.has('wealth')).toBe(true);
  });
});
