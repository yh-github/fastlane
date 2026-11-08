// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameAnimations } from './useGameAnimations';

describe('useGameAnimations hook', () => {
  it('triggers and clears floating animations on demand', () => {
    const { result } = renderHook(() => useGameAnimations());

    expect(result.current.floatingAnims).toHaveLength(0);

    act(() => {
      result.current.triggerAnim('text', '+100 💰');
      result.current.triggerAnim('emoji', '😊');
    });

    expect(result.current.floatingAnims).toHaveLength(2);
    expect(result.current.floatingAnims[0].content).toBe('+100 💰');
    expect(result.current.floatingAnims[1].content).toBe('😊');

    // Test clearFloatingAnims flushes all lingering animations immediately
    act(() => {
      result.current.clearFloatingAnims();
    });

    expect(result.current.floatingAnims).toHaveLength(0);
  });

  it('anchors in-situ floating animation to source element and floats upward', () => {
    const dummyBtn = document.createElement('button');
    dummyBtn.id = 'study-trade_school';
    dummyBtn.getBoundingClientRect = () => ({
      left: 100,
      top: 200,
      width: 80,
      height: 40,
      right: 180,
      bottom: 240,
      x: 100,
      y: 200,
      toJSON: () => {}
    });
    document.body.appendChild(dummyBtn);

    const { result } = renderHook(() => useGameAnimations());

    act(() => {
      result.current.triggerAnim('text', '💥 MISTAKE!', { sourceId: 'study-trade_school' });
    });

    expect(result.current.floatingAnims).toHaveLength(1);
    const anim = result.current.floatingAnims[0];
    // Center of dummyBtn: left(100) + width/2(40) = 140, top(200) + height/2(20) = 220
    expect(anim.startX).toBe(140);
    expect(anim.startY).toBe(220);
    expect(anim.endX).toBe(140);
    expect(anim.endY).toBe(150); // 220 - 70

    document.body.removeChild(dummyBtn);
  });
});
