import { useState, useCallback } from 'react';
import type { FloatingAnimation } from '../ui/AnimationLayer';

export interface AnimOptions {
  sourceId?: string;
  targetId?: string;
  duration?: number;
  customClass?: string;
}

export function useGameAnimations() {
  const [floatingAnims, setFloatingAnims] = useState<FloatingAnimation[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const triggerAnim = useCallback((type: 'item' | 'emoji' | 'text', content: string, options?: AnimOptions | string) => {
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2 - 100;
    let endX = window.innerWidth / 2;
    let endY = window.innerHeight / 2;
    let duration = 1200;

    let opts: AnimOptions = {};
    if (typeof options === 'string') {
      opts = { targetId: options };
    } else if (options) {
      opts = options;
    }

    if (opts.sourceId) {
      const el = document.getElementById(opts.sourceId);
      if (el) {
        const rect = el.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
      }
    }

    if (opts.targetId) {
      const el = document.getElementById(opts.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        endX = rect.left + rect.width / 2;
        endY = rect.top + rect.height / 2;
      }
    }
    
    if (opts.duration) duration = opts.duration;

    const newAnim: FloatingAnimation = {
      id: Math.random().toString(36).substring(2, 11),
      type,
      content,
      startX,
      startY,
      endX,
      endY,
      duration,
      customClass: opts.customClass,
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
