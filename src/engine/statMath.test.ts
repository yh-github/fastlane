import { describe, it, expect } from 'vitest';
import {
  calcLuckScore,
  calcDependabilityDecay,
  calcMaxDependability,
  calcMaxExperience,
  calcProratedWage,
  calcRobberyChance,
  calcRaiseThreshold,
  calcCareerProgress,
  calcWealthProgress,
  calcEducationProgress,
} from './statMath';

describe('statMath', () => {
  it('calcLuckScore', () => {
    expect(calcLuckScore(10, 10, 0)).toBe(60); // 40 + 10 + 10 + 0
    expect(calcLuckScore(20, 20, 1)).toBe(88); // 40 + 20 + 20 + 8
  });

  it('calcDependabilityDecay decays by 3, min 0', () => {
    expect(calcDependabilityDecay(10)).toBe(7);
    expect(calcDependabilityDecay(2)).toBe(0);
  });

  it('calcMaxDependability', () => {
    expect(calcMaxDependability(0, 0)).toBe(20);
    expect(calcMaxDependability(10, 1)).toBe(35); // 20 + 10 + 5
  });

  it('calcMaxExperience', () => {
    expect(calcMaxExperience(0, 0)).toBe(10);
    expect(calcMaxExperience(10, 1)).toBe(25); // 10 + 10 + 5
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
});
