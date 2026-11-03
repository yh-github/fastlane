import type { LogEntry } from '../ui/GameLog';
import { getStatFilterCategories } from '../engine/statMath';

export type GoalFilter =
  | 'all'
  | 'wealth'
  | 'happiness'
  | 'education'
  | 'career'
  | 'employability'
  | 'dependability'
  | 'experience'
  | 'relaxation'
  | 'money'
  | 'lifestyle'
  | 'mental'
  | 'physical'
  | 'wellbeing'
  | 'social'
  | 'skillTech'
  | 'skillMgmt'
  | 'caffeine'
  | 'time';

/**
  * getLogCategories — Maps a log entry to applicable goals and attributes.
  */
export function getLogCategories(entry: LogEntry): Set<GoalFilter> {
  const categories = new Set<GoalFilter>();
  const key = entry.event.key || '';
  const params = entry.event.params || {};

  // Dynamic explicit categories from the event itself
  if (entry.event.categories) {
    for (const cat of entry.event.categories) {
      categories.add(cat as GoalFilter);
    }
  }

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
      categories.add('employability');
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
      categories.add('employability');
      break;
  }

  // Parameter string inspection
  const p = (params || {}) as any;
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
  if (paramStr.includes('employability') || keyLower.includes('employability')) {
    categories.add('employability');
  }
  if (paramStr.includes('relaxation') || keyLower.includes('relaxation')) {
    categories.add('relaxation');
    categories.add('happiness');
  }
  if (paramStr.includes('happiness') || keyLower.includes('happiness')) {
    categories.add('happiness');
  }
  if (paramStr.includes('skilltech') || keyLower.includes('tech') || keyLower.includes('computer') || keyLower.includes('repair')) {
    categories.add('skillTech');
  }
  if (paramStr.includes('skillmgmt') || keyLower.includes('mgmt') || keyLower.includes('leadership') || keyLower.includes('initiative') || keyLower.includes('appraisal')) {
    categories.add('skillMgmt');
  }
  if (paramStr.includes('caffeine') || keyLower.includes('caffeine') || keyLower.includes('coffee')) {
    categories.add('caffeine');
  }
  if (paramStr.includes('social') || keyLower.includes('social') || keyLower.includes('porch') || keyLower.includes('guest')) {
    categories.add('social');
  }
  if (paramStr.includes('mental') || keyLower.includes('mental') || keyLower.includes('spirits')) {
    categories.add('mental');
    categories.add('wellbeing');
  }
  if (paramStr.includes('physical') || keyLower.includes('physical') || keyLower.includes('doctor') || keyLower.includes('hospital')) {
    categories.add('physical');
    categories.add('wellbeing');
  }
  if (paramStr.includes('lifestyle') || keyLower.includes('lifestyle') || keyLower.includes('appliance') || keyLower.includes('curio')) {
    categories.add('lifestyle');
  }
  if (p.hours !== undefined || p.hoursSpent !== undefined || p.hoursRemaining !== undefined || p.time !== undefined || keyLower.includes('hour') || keyLower.includes('walk') || keyLower.includes('travel')) {
    categories.add('time');
  }

  // Check array of modifications in event or params if present
  const modifications = entry.event.modifications || (p as any).modifications;
  if (Array.isArray(modifications)) {
    for (const mod of modifications) {
      if (mod?.stat) {
        categories.add(mod.stat as GoalFilter);
        if (mod.stat === 'skillTech' || mod.stat === 'tech') categories.add('skillTech');
        if (mod.stat === 'skillMgmt' || mod.stat === 'mgmt' || mod.stat === 'leadership') categories.add('skillMgmt');
        if (mod.stat === 'mental' || mod.stat === 'physical') categories.add('wellbeing');
      }
    }
  }
  // Check if money increased or decreased, or if event involves cash/money transaction
  const hasMoneyParam = p.diff?.includes('$') || 
    p.amount !== undefined || p.wagesEarned !== undefined || p.cost !== undefined || 
    p.price !== undefined || p.value !== undefined || p.profit !== undefined || 
    p.revenue !== undefined || p.repairCost !== undefined || p.loanSize !== undefined || 
    p.payment !== undefined || p.fee !== undefined || p.tuitionFee !== undefined;

  if (hasMoneyParam || categories.has('money') || key.includes('bank') || key.includes('rent') || key.includes('loan') || key.includes('pawn') || key.includes('buy') || key.includes('store') || key.includes('broker') || key.includes('robbery') || key.includes('lottery') || key.includes('doctor') || key.includes('donation') || key.includes('computerProfit') || key.includes('applianceBroke')) {
    categories.add('money');
    categories.add('wealth');
  }

  return categories;
}

export function isLogMatchingFilter(entry: LogEntry, filter: GoalFilter): boolean {
  if (filter === 'all') return true;
  const categories = getLogCategories(entry);
  const filterCategories = getStatFilterCategories(filter);
  for (const cat of categories) {
    if (filterCategories.has(cat)) return true;
  }
  return false;
}
