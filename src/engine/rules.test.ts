import { describe, it, expect } from 'vitest';
import { requireConfig, DEFAULT_GAME_RULES, RULE_DESCRIPTIONS } from './rules';

describe('requireConfig', () => {
  it('returns the value if defined', () => {
    expect(requireConfig(10, 'testProp')).toBe(10);
    expect(requireConfig('hello', 'testProp')).toBe('hello');
    expect(requireConfig(false, 'testProp')).toBe(false);
  });

  it('throws an explicit readable error if undefined or null', () => {
    expect(() => requireConfig(undefined, 'timeRules.doctorPenalty')).toThrowError('Missing required configuration: timeRules.doctorPenalty');
    expect(() => requireConfig(null, 'timeRules.starvationPenalty')).toThrowError('Missing required configuration: timeRules.starvationPenalty');
  });
});

describe('RULE_DESCRIPTIONS & DEFAULT_GAME_RULES', () => {
  it('streetRobberyOnTurnEnd is true by default', () => {
    expect(DEFAULT_GAME_RULES.streetRobberyOnTurnEnd).toBe(true);
  });

  it('all DEFAULT_GAME_RULES have non-empty entries in RULE_DESCRIPTIONS', () => {
    for (const key of Object.keys(DEFAULT_GAME_RULES)) {
      const desc = RULE_DESCRIPTIONS[key];
      expect(desc, `Missing description for DEFAULT_GAME_RULES: ${key}`).toBeDefined();
      expect(desc.trim().length, `Empty description for DEFAULT_GAME_RULES: ${key}`).toBeGreaterThan(0);
    }
  });

  it('has descriptions for key config properties across all rule categories', () => {
    const requiredKeys = [
      'pixelatedSprites',
      'removeCharacterBg',
      'streetRobberyOnTurnEnd',
      'cleaningServiceCost',
      'socializeCost',
      'cleaningServiceBasePrice',
      'enableAdvancedStats',
      'startingSocial',
      'maxExperience',
      'maxDependability',
      'dependabilityWeeklyDecay'
    ];

    for (const key of requiredKeys) {
      expect(RULE_DESCRIPTIONS[key], `Missing description for: ${key}`).toBeDefined();
      expect(RULE_DESCRIPTIONS[key].trim().length).toBeGreaterThan(0);
    }
  });
});
