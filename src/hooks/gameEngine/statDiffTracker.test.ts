// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateStatDiffsAndAnimate } from './statDiffTracker';
import type { PlayerState, GameRules } from '../../engine/gameState';

describe('calculateStatDiffsAndAnimate', () => {
  const defaultRules: GameRules = {
    enableAnimations: true,
    trackMess: true,
  } as unknown as GameRules;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('triggers positive animation and targets home-mess-bar when mess decreases in Home GUI', () => {
    const messBar = document.createElement('div');
    messBar.id = 'home-mess-bar';
    document.body.appendChild(messBar);

    const oldPlayer = { mess: 15 } as PlayerState;
    const newPlayer = { mess: 5 } as PlayerState;
    const triggerAnim = vi.fn();

    const diffStr = calculateStatDiffsAndAnimate(newPlayer, oldPlayer, defaultRules, triggerAnim);

    expect(diffStr).toContain('-10 Mess');
    expect(triggerAnim).toHaveBeenCalledTimes(1);
    const [animType, _content, options] = triggerAnim.mock.calls[0];

    expect(animType).toBe('text');
    expect(options.targetId).toBe('home-mess-bar');
    expect(options.customClass).toBe('anim-positive');
  });

  it('triggers negative animation and targets stat-mess when mess increases outside Home GUI', () => {
    const hudBadge = document.createElement('div');
    hudBadge.id = 'stat-mess';
    document.body.appendChild(hudBadge);

    const oldPlayer = { mess: 5 } as PlayerState;
    const newPlayer = { mess: 7 } as PlayerState;
    const triggerAnim = vi.fn();

    const diffStr = calculateStatDiffsAndAnimate(newPlayer, oldPlayer, defaultRules, triggerAnim);

    expect(diffStr).toContain('+2 Mess');
    expect(triggerAnim).toHaveBeenCalledTimes(1);
    const [animType, _content, options] = triggerAnim.mock.calls[0];

    expect(animType).toBe('text');
    expect(options.targetId).toBe('stat-mess');
    expect(options.customClass).toBe('anim-negative');
  });

  it('does not trigger animation when animations are disabled', () => {
    const rules = { ...defaultRules, enableAnimations: false };
    const oldPlayer = { mess: 10 } as PlayerState;
    const newPlayer = { mess: 0 } as PlayerState;
    const triggerAnim = vi.fn();

    const diffStr = calculateStatDiffsAndAnimate(newPlayer, oldPlayer, rules, triggerAnim);

    expect(diffStr).toContain('-10 Mess');
    expect(triggerAnim).not.toHaveBeenCalled();
  });
});
