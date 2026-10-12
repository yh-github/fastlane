export interface StatDescriptor {
  id: string;
  labelKey: string;
  isDerived: boolean;
  dependencies: string[];
}

export const STAT_REGISTRY: Record<string, StatDescriptor> = {
  employability: {
    id: 'employability',
    labelKey: 'dashboard.employability',
    isDerived: true,
    dependencies: ['employability', 'dependability', 'experience', 'education', 'social']
  },
  wealth: {
    id: 'wealth',
    labelKey: 'dashboard.wealth',
    isDerived: true,
    dependencies: ['wealth', 'money']
  },
  career: {
    id: 'career',
    labelKey: 'dashboard.career',
    isDerived: true,
    dependencies: ['career', 'dependability', 'experience']
  },
  education: {
    id: 'education',
    labelKey: 'dashboard.education',
    isDerived: true,
    dependencies: ['education']
  },
  breakInRisk: {
    id: 'breakInRisk',
    labelKey: 'dashboard.homeRisk',
    isDerived: true,
    dependencies: ['relaxation', 'lifestyle']
  },
  happiness: {
    id: 'happiness',
    labelKey: 'dashboard.happiness',
    isDerived: false,
    dependencies: ['happiness']
  },
  dependability: {
    id: 'dependability',
    labelKey: 'dashboard.dependability',
    isDerived: false,
    dependencies: ['dependability']
  },
  experience: {
    id: 'experience',
    labelKey: 'dashboard.experience',
    isDerived: false,
    dependencies: ['experience']
  },
  relaxation: {
    id: 'relaxation',
    labelKey: 'dashboard.relaxation',
    isDerived: false,
    dependencies: ['relaxation']
  },
  money: {
    id: 'money',
    labelKey: 'dashboard.money',
    isDerived: false,
    dependencies: ['money']
  },
  lifestyle: {
    id: 'lifestyle',
    labelKey: 'stat.lifestyle',
    isDerived: false,
    dependencies: ['lifestyle']
  },
  mental: {
    id: 'mental',
    labelKey: 'stat.mentalCondition',
    isDerived: false,
    dependencies: ['mental']
  },
  physical: {
    id: 'physical',
    labelKey: 'stat.physicalCondition',
    isDerived: false,
    dependencies: ['physical']
  },
  social: {
    id: 'social',
    labelKey: 'stat.social',
    isDerived: false,
    dependencies: ['social']
  },
  wellbeing: {
    id: 'wellbeing',
    labelKey: 'dashboard.wellbeing',
    isDerived: true,
    dependencies: ['physical', 'mental']
  }
};

/**
 * Get all category strings that satisfy a given filter (including underlying dependencies).
 */
export function getStatFilterCategories(filter: string): Set<string> {
  const descriptor = STAT_REGISTRY[filter];
  if (!descriptor) return new Set([filter]);
  return new Set([filter, ...descriptor.dependencies]);
}
