import React from 'react';
import type { PlayerState, GameRules } from '../../engine/gameState';
import { MessIcon } from '../../ui/icons/MessIcon';

export function calculateStatDiffsAndAnimate(
  player: PlayerState,
  oldPlayer: PlayerState,
  rules: GameRules,
  triggerAnim: (type: 'item' | 'emoji' | 'text', content: React.ReactNode, options?: any) => void
): string {
  const diffStr: string[] = [];
  const moneyDiff = (player.money ?? 0) - (oldPlayer.money ?? 0);
  const hapDiff = (player.happiness ?? 0) - (oldPlayer.happiness ?? 0);
  const physDiff = (player.physicalCondition || 0) - (oldPlayer.physicalCondition || 0);
  const mentalDiff = (player.mentalCondition || 0) - (oldPlayer.mentalCondition || 0);
  const lifeDiff = (player.lifestyle || 0) - (oldPlayer.lifestyle || 0);
  const relaxDiff = (player.relaxation || 0) - (oldPlayer.relaxation || 0);
  const depDiff = (player.dependability || 0) - (oldPlayer.dependability || 0);
  const expDiff = (player.experience || 0) - (oldPlayer.experience || 0);
  const socDiff = (player.social !== undefined && oldPlayer.social !== undefined) ? player.social - oldPlayer.social : 0;
  const messDiff = (player.mess ?? 0) - (oldPlayer.mess ?? 0);
  
  if (moneyDiff !== 0) {
    diffStr.push(`${moneyDiff > 0 ? '+' : ''}$${moneyDiff}`);
    if (rules.enableAnimations) {
      if (moneyDiff < 0) {
        triggerAnim('text', `-$${Math.abs(moneyDiff)}`, { targetId: 'stat-money', customClass: 'anim-negative' });
      } else {
        triggerAnim('text', `+$${moneyDiff}`, { targetId: 'stat-money', customClass: 'anim-positive' });
      }
    }
  }
  if (hapDiff !== 0) {
    diffStr.push(`${hapDiff > 0 ? '+' : ''}${hapDiff} Happiness`);
    if (rules.enableAnimations) {
      triggerAnim('text', `${hapDiff > 0 ? '+' : ''}${hapDiff} 😊`, { targetId: 'stat-happiness', customClass: hapDiff > 0 ? 'anim-positive' : 'anim-negative' });
    }
  }
  if (physDiff !== 0) {
    diffStr.push(`${physDiff > 0 ? '+' : ''}${physDiff} Physical`);
    if (rules.enableAnimations) {
      triggerAnim('text', `${physDiff > 0 ? '+' : ''}${physDiff} 💪`, { targetId: 'stat-physical', customClass: physDiff > 0 ? 'anim-positive' : 'anim-negative' });
    }
  }
  if (mentalDiff !== 0) {
    diffStr.push(`${mentalDiff > 0 ? '+' : ''}${mentalDiff} Mental`);
    if (rules.enableAnimations) {
      triggerAnim('text', `${mentalDiff > 0 ? '+' : ''}${mentalDiff} 🧠`, { targetId: 'stat-mental', customClass: mentalDiff > 0 ? 'anim-positive' : 'anim-negative' });
    }
  }
  if (lifeDiff !== 0) {
    diffStr.push(`${lifeDiff > 0 ? '+' : ''}${lifeDiff} Lifestyle`);
    if (rules.enableAnimations) {
      const lifeIcon = (player.lifestyle || 0) > 50 ? '🧐' : '😎';
      triggerAnim('text', `${lifeDiff > 0 ? '+' : ''}${lifeDiff} ${lifeIcon}`, { targetId: 'stat-lifestyle', customClass: lifeDiff > 0 ? 'anim-positive' : 'anim-negative' });
    }
  }
  if (relaxDiff !== 0) {
    diffStr.push(`${relaxDiff > 0 ? '+' : ''}${relaxDiff} Relaxation`);
    if (rules.enableAnimations) {
      triggerAnim('text', `${relaxDiff > 0 ? '+' : ''}${relaxDiff} 🛌`, { targetId: 'stat-relaxation', customClass: relaxDiff > 0 ? 'anim-positive' : 'anim-negative' });
    }
  }
  if (depDiff !== 0) {
    diffStr.push(`${depDiff > 0 ? '+' : ''}${depDiff} Dependability`);
    if (rules.enableAnimations) {
      triggerAnim('text', `${depDiff > 0 ? '+' : ''}${depDiff} 🤝`, { targetId: 'stat-dependability', customClass: depDiff > 0 ? 'anim-positive' : 'anim-negative' });
    }
  }
  if (expDiff !== 0) {
    diffStr.push(`${expDiff > 0 ? '+' : ''}${expDiff} Experience`);
    if (rules.enableAnimations) {
      triggerAnim('text', `${expDiff > 0 ? '+' : ''}${expDiff} 👌`, { targetId: 'stat-experience', customClass: expDiff > 0 ? 'anim-positive' : 'anim-negative' });
    }
  }
  if (socDiff !== 0) {
    diffStr.push(`${socDiff > 0 ? '+' : ''}${socDiff} Social`);
    if (rules.enableAnimations) {
      triggerAnim('text', `${socDiff > 0 ? '+' : ''}${socDiff} 👥`, { targetId: 'stat-social', customClass: socDiff > 0 ? 'anim-positive' : 'anim-negative' });
    }
  }
  if (messDiff !== 0) {
    diffStr.push(`${messDiff > 0 ? '+' : ''}${messDiff} Mess`);
    if (rules.enableAnimations) {
      const homeMessBar = typeof document !== 'undefined' ? document.getElementById('home-mess-bar') : null;
      const targetId = homeMessBar ? 'home-mess-bar' : 'stat-mess';
      const sign = messDiff > 0 ? `+${messDiff}` : `${messDiff}`;
      const customClass = messDiff > 0 ? 'anim-negative' : 'anim-positive';
      triggerAnim('text', React.createElement('span', {
        style: { display: 'inline-flex', alignItems: 'center', gap: '4px' }
      }, sign, ' ', React.createElement(MessIcon, { size: '1.2em' })), { targetId, customClass });
    }
  }

  return diffStr.length > 0 ? ` (${diffStr.join(', ')})` : '';
}
