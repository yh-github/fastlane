import React from 'react';
import { MessIcon } from './icons/MessIcon';

export interface StatMetaInfo {
  icon: React.ReactNode;
  textIcon: string;
  label: string;
}

export function getStatMeta(
  stat: string,
  t?: (key: string, options?: any) => string
): StatMetaInfo {
  const translate = t || ((_key: string, opt?: any) => opt?.defaultValue || _key);

  switch (stat) {
    case 'money':
      return {
        icon: '$',
        textIcon: '$',
        label: translate('stats.money', { defaultValue: 'Money' })
      };
    case 'mental':
    case 'mentalCondition':
      return {
        icon: '🧠',
        textIcon: '🧠',
        label: translate('stats.mental', { defaultValue: 'Mental Condition' })
      };
    case 'mentalMax':
      return {
        icon: '🧠',
        textIcon: '🧠',
        label: translate('stats.mentalMax', { defaultValue: 'Max Mental' })
      };
    case 'physical':
    case 'physicalCondition':
      return {
        icon: '💪',
        textIcon: '💪',
        label: translate('stats.physical', { defaultValue: 'Physical Condition' })
      };
    case 'physicalMax':
      return {
        icon: '💪',
        textIcon: '💪',
        label: translate('stats.physicalMax', { defaultValue: 'Max Physical' })
      };
    case 'dependability':
      return {
        icon: '🤝',
        textIcon: '🤝',
        label: translate('stats.dependability', { defaultValue: 'Dependability' })
      };
    case 'experience':
    case 'exp':
      return {
        icon: '👌',
        textIcon: '👌',
        label: translate('stats.experience', { defaultValue: 'Experience' })
      };
    case 'skillTech':
    case 'tech':
      return {
        icon: '🔧',
        textIcon: '🔧',
        label: translate('stats.skillTech', { defaultValue: 'Tech Skill' })
      };
    case 'skillMgmt':
    case 'mgmt':
    case 'leadership':
      return {
        icon: '👔',
        textIcon: '👔',
        label: translate('stats.skillMgmt', { defaultValue: 'Leadership' })
      };
    case 'social':
      return {
        icon: '👥',
        textIcon: '👥',
        label: translate('stats.social', { defaultValue: 'Social Standing' })
      };
    case 'relaxation':
      return {
        icon: '🛌',
        textIcon: '🛌',
        label: translate('stats.relaxation', { defaultValue: 'Relaxation' })
      };
    case 'happiness':
      return {
        icon: '😊',
        textIcon: '😊',
        label: translate('stats.happiness', { defaultValue: 'Happiness' })
      };
    case 'mess':
      return {
        icon: React.createElement(MessIcon, null),
        textIcon: '🧹',
        label: translate('stats.mess', { defaultValue: 'Apartment Mess' })
      };
    case 'lifestyle':
      return {
        icon: '😎',
        textIcon: '😎',
        label: translate('stats.lifestyle', { defaultValue: 'Lifestyle' })
      };
    case 'loanDebt':
      return {
        icon: '🏦',
        textIcon: '🏦',
        label: translate('stats.loanDebt', { defaultValue: 'Loan Debt' })
      };
    case 'rentDebt':
      return {
        icon: '🏢',
        textIcon: '🏢',
        label: translate('stats.rentDebt', { defaultValue: 'Rent Debt' })
      };
    case 'time':
    case 'hours':
      return {
        icon: '⏰',
        textIcon: '⏰',
        label: translate('stats.time', { defaultValue: 'Time' })
      };
    case 'standing':
    case 'initiatives':
      return {
        icon: '🌟',
        textIcon: '🌟',
        label: translate('stats.standing', { defaultValue: 'Workplace Standing' })
      };
    case 'demerit':
    case 'mistakes':
      return {
        icon: '⚠️',
        textIcon: '⚠️',
        label: translate('stats.demerit', { defaultValue: 'Workplace Demerits' })
      };
    case 'education':
    case 'degree':
      return {
        icon: '🎓',
        textIcon: '🎓',
        label: translate('stats.education', { defaultValue: 'Education' })
      };
    default:
      return {
        icon: '',
        textIcon: '',
        label: stat
      };
  }
}
