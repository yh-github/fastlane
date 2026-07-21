import type { LogEntry } from '../ui/GameLog';

export type GoalFilter =
  | 'all'
  | 'wealth'
  | 'happiness'
  | 'education'
  | 'career'
  | 'luck'
  | 'dependability'
  | 'experience'
  | 'relaxation'
  | 'money';

/**
  * getLogCategories — Maps a log entry to applicable goals and attributes.
  */
export function getLogCategories(entry: LogEntry): Set<GoalFilter> {
  const categories = new Set<GoalFilter>();
  const key = entry.event.key || '';
  const params = entry.event.params || {};

  // Key-based rules
  if (key.includes('job') || key.includes('work') || key.includes('fired') || key.includes('raise')) {
    categories.add('career');
  }

  if (key.includes('education') || key.includes('study') || key.includes('enroll') || key.includes('degree') || key.includes('graduat')) {
    categories.add('education');
  }

  if (key.includes('relax')) {
    categories.add('relaxation');
    categories.add('happiness');
  }

  if (key.includes('bank') || key.includes('loan') || key.includes('broker') || key.includes('rent') || key.includes('pawn') || key.includes('stock')) {
    categories.add('wealth');
    categories.add('money');
  }

  if (key.includes('buy') || key.includes('store') || key.includes('purchase')) {
    categories.add('wealth');
    categories.add('money');
  }

  if (key.includes('robbery') || key.includes('willy')) {
    categories.add('wealth');
    categories.add('money');
    categories.add('relaxation');
    categories.add('happiness');
  }

  if (key.includes('lottery')) {
    categories.add('luck');
    categories.add('money');
    categories.add('wealth');
    categories.add('happiness');
  }

  if (key.includes('food') || key.includes('starvation') || key.includes('eat')) {
    categories.add('happiness');
  }

  if (key.includes('doctor')) {
    categories.add('relaxation');
    categories.add('happiness');
    categories.add('money');
    categories.add('wealth');
  }

  if (key.includes('clothes')) {
    categories.add('happiness');
  }

  if (key.includes('weekend') || key.includes('ticket')) {
    categories.add('happiness');
  }

  // Specific key exact matches
  switch (key) {
    case 'action.job.worked':
      categories.add('career');
      categories.add('money');
      categories.add('wealth');
      categories.add('dependability');
      categories.add('experience');
      break;
    case 'action.job.gotJob':
    case 'action.job.rejected':
    case 'action.job.noOpenings':
      categories.add('career');
      categories.add('luck');
      categories.add('dependability');
      categories.add('experience');
      break;
    case 'action.job.raiseSuccess':
    case 'action.job.raiseDenied':
      categories.add('career');
      categories.add('dependability');
      categories.add('money');
      break;
    case 'action.education.graduated':
      categories.add('education');
      categories.add('luck');
      break;
  }

  // Parameter string inspection
  const paramStr = JSON.stringify(params).toLowerCase();
  const keyLower = key.toLowerCase();

  if (paramStr.includes('dependability') || keyLower.includes('dependability')) {
    categories.add('dependability');
    categories.add('career');
  }
  if (paramStr.includes('experience') || keyLower.includes('experience')) {
    categories.add('experience');
    categories.add('career');
  }
  if (paramStr.includes('luck') || keyLower.includes('luck')) {
    categories.add('luck');
  }
  if (paramStr.includes('relaxation') || keyLower.includes('relaxation')) {
    categories.add('relaxation');
    categories.add('happiness');
  }
  if (paramStr.includes('happiness') || keyLower.includes('happiness')) {
    categories.add('happiness');
  }
  if (paramStr.includes('money') || paramStr.includes('cash') || paramStr.includes('wages') || paramStr.includes('cost') || paramStr.includes('price') || paramStr.includes('amount') || paramStr.includes('diff')) {
    categories.add('money');
    categories.add('wealth');
  }

  return categories;
}

export function isLogMatchingFilter(entry: LogEntry, filter: GoalFilter): boolean {
  if (filter === 'all') return true;
  const categories = getLogCategories(entry);
  return categories.has(filter);
}
