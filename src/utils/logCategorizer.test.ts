import { describe, it, expect } from 'vitest';
import { getLogCategories, isLogMatchingFilter } from './logCategorizer';
import type { LogEntry } from '../ui/GameLog';

describe('logCategorizer', () => {
  it('correctly categorizes work logs', () => {
    const entry: LogEntry = {
      week: 1,
      event: { key: 'action.job.worked', params: { title: 'Cook', wagesEarned: 40 } }
    };
    const categories = getLogCategories(entry);
    expect(categories.has('career')).toBe(true);
    expect(categories.has('money')).toBe(true);
    expect(categories.has('wealth')).toBe(true);
    expect(categories.has('dependability')).toBe(true);
    expect(categories.has('experience')).toBe(true);
  });

  it('correctly categorizes job application logs under luck and career', () => {
    const entry: LogEntry = {
      week: 1,
      event: { key: 'action.job.gotJob', params: { title: 'Manager' } }
    };
    expect(isLogMatchingFilter(entry, 'luck')).toBe(true);
    expect(isLogMatchingFilter(entry, 'career')).toBe(true);
  });

  it('correctly categorizes education logs', () => {
    const entry: LogEntry = {
      week: 2,
      event: { key: 'action.education.studied', params: { name: 'Junior College' } }
    };
    expect(isLogMatchingFilter(entry, 'education')).toBe(true);
  });

  it('correctly categorizes robbery logs under wealth, money, relaxation, and happiness', () => {
    const entry: LogEntry = {
      week: 3,
      event: { key: 'events.robbery.willy' }
    };
    expect(isLogMatchingFilter(entry, 'money')).toBe(true);
    expect(isLogMatchingFilter(entry, 'wealth')).toBe(true);
    expect(isLogMatchingFilter(entry, 'relaxation')).toBe(true);
  });

  it('returns true for all filter', () => {
    const entry: LogEntry = {
      week: 1,
      event: { key: 'action.relax' }
    };
    expect(isLogMatchingFilter(entry, 'all')).toBe(true);
  });
});
