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
});
