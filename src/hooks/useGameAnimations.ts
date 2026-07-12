import { useState, useCallback } from 'react';
import type { FloatingAnimation } from '../ui/AnimationLayer';

export function useGameAnimations() {
  const [floatingAnims, setFloatingAnims] = useState<FloatingAnimation[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const triggerAnim = useCallback((type: 'item' | 'emoji' | 'text', content: string, targetId: string) => {
    const targetEl = document.getElementById(targetId);
    let endX = window.innerWidth / 2;
    let endY = window.innerHeight / 2;
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      endX = rect.left + rect.width / 2;
      endY = rect.top + rect.height / 2;
    }
    const newAnim: FloatingAnimation = {
      id: Math.random().toString(36).substring(2, 11),
      type,
      content,
      startX: window.innerWidth / 2,
      startY: window.innerHeight / 2 - 100,
      endX,
      endY,
      duration: 1200,
    };
    setFloatingAnims(prev => [...prev, newAnim]);
  }, []);

  const removeAnim = useCallback((id: string) => {
    setFloatingAnims(prev => prev.filter(a => a.id !== id));
  }, []);

  return {
    floatingAnims,
    triggerAnim,
    removeAnim,
    isAnimating,
    setIsAnimating,
  };
}
