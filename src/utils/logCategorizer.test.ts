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

  it('correctly categorizes job application logs under employability and career', () => {
    const entry = {
      id: '1', turn: 1, type: 'action',
      event: { key: 'action.job.gotJob' }, message: 'Got job'
    } as any;
    expect(isLogMatchingFilter(entry, 'employability')).toBe(true);
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

  it('categorizes buy logs with happinessBonus under happiness, but not standard ones', () => {
    const happinessBuy: LogEntry = {
      week: 1,
      event: { key: 'action.buy', params: { itemName: 'Cheeseburger', itemId: 'cheeseburger', happinessBonus: 1 } }
    };
    const standardBuy: LogEntry = {
      week: 1,
      event: { key: 'action.buy', params: { itemName: 'Fries', itemId: 'fries' } }
    };

    expect(isLogMatchingFilter(happinessBuy, 'happiness')).toBe(true);
    expect(isLogMatchingFilter(standardBuy, 'happiness')).toBe(false);
  });

  it('matches derived stats through dependency graph (e.g. work logs match employability via dependability)', () => {
    const workEntry: LogEntry = {
      week: 1,
      event: { key: 'action.job.worked', params: { title: 'Cook', wagesEarned: 40 } }
    };
    // action.job.worked has categories ['career', 'money', 'wealth', 'dependability', 'experience']
    // Employability filter has dependencies ['employability', 'dependability', 'experience', 'education']
    expect(isLogMatchingFilter(workEntry, 'employability')).toBe(true);

    const studyEntry: LogEntry = {
      week: 2,
      event: { key: 'action.education.studied', params: { name: 'Junior College' } }
    };
    // action.education.studied has category ['education']
    // Employability filter includes 'education' dependency
    expect(isLogMatchingFilter(studyEntry, 'employability')).toBe(true);
  });

  it('correctly categorizes skillTech, skillMgmt, caffeine, social, and time logs', () => {
    const techEntry: LogEntry = {
      week: 1,
      event: { key: 'action.job.shift_tech', params: { title: 'Repair PC' }, modifications: [{ stat: 'skillTech', diff: 0.5 }] }
    };
    expect(isLogMatchingFilter(techEntry, 'skillTech')).toBe(true);

    const mgmtEntry: LogEntry = {
      week: 2,
      event: { key: 'action.job.shift_leadership', params: { title: 'Lead Team', skillMgmt: 0.25 } }
    };
    expect(isLogMatchingFilter(mgmtEntry, 'skillMgmt')).toBe(true);

    const caffeineEntry: LogEntry = {
      week: 3,
      event: { key: 'events.caffeine_withdrawal', params: { message: 'Suffering caffeine crash' } }
    };
    expect(isLogMatchingFilter(caffeineEntry, 'caffeine')).toBe(true);

    const socialEntry: LogEntry = {
      week: 4,
      event: { key: 'events.socialize_guests', params: { socialBonus: 2 } }
    };
    expect(isLogMatchingFilter(socialEntry, 'social')).toBe(true);

    const timeEntry: LogEntry = {
      week: 5,
      event: { key: 'action.travel', params: { hours: 2, hoursRemaining: 48 } }
    };
    expect(isLogMatchingFilter(timeEntry, 'time')).toBe(true);
  });
});
