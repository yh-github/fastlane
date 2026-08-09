import { describe, it, expect } from 'vitest';
import { requireConfig } from './rules';

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
