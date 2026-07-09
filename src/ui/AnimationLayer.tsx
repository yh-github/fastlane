import { useEffect, useState } from 'react';

export interface FloatingAnimation {
  id: string;
  type: 'item' | 'emoji' | 'text';
  content: string; // The icon, emoji, or text
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration?: number;
}

interface AnimationLayerProps {
  animations: FloatingAnimation[];
  onAnimationComplete: (id: string) => void;
}

export function AnimationLayer({ animations, onAnimationComplete }: AnimationLayerProps) {
  return (
    <div className="animation-layer">
      {animations.map(anim => (
        <AnimatedElement key={anim.id} anim={anim} onComplete={() => onAnimationComplete(anim.id)} />
      ))}
    </div>
  );
}

function AnimatedElement({ anim, onComplete }: { anim: FloatingAnimation; onComplete: () => void }) {
  const [style, setStyle] = useState({
    transform: `translate(${anim.startX}px, ${anim.startY}px) scale(0.5)`,
    opacity: 0,
    transition: 'none',
  });

  useEffect(() => {
    // 1 frame delay to allow initial position to render without transition
    const reqId = requestAnimationFrame(() => {
      setStyle({
        transform: `translate(${anim.startX}px, ${anim.startY}px) scale(1)`,
        opacity: 1,
        transition: 'none',
      });
      
      requestAnimationFrame(() => {
        setStyle({
          transform: `translate(${anim.endX}px, ${anim.endY}px) scale(1)`,
          opacity: 1,
          transition: `transform ${anim.duration || 1000}ms cubic-bezier(0.25, 1, 0.5, 1), opacity ${anim.duration || 1000}ms ease-out`,
        });
      });
    });

    const timeout = setTimeout(() => {
      setStyle(prev => ({ ...prev, opacity: 0, transition: 'opacity 300ms' }));
      setTimeout(onComplete, 300);
    }, anim.duration || 1000);

    return () => {
      cancelAnimationFrame(reqId);
      clearTimeout(timeout);
    };
  }, [anim, onComplete]);

  return (
    <div className={`animated-element animated-element--${anim.type}`} style={style}>
      {anim.content}
    </div>
  );
}
