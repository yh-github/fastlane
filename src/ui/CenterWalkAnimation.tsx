import React, { useEffect, useRef, useState } from 'react';

export interface CenterWalkAnimationProps {
  characterIndex?: number;
  clothesType?: 'casual' | 'dress' | 'business' | 'none';
  isWalking: boolean;
  frameDurationMs?: number;
}

const CLOTHES_MAP: Record<string, number> = {
  none: 0,
  casual: 1,
  dress: 2,
  business: 3,
};

const CHAR_BG_COLORS: Record<number, string> = {
  0: '#ffffff',
  1: '#c0d8f8',
  2: '#f8f0a0',
  3: '#d8c8e0',
  4: '#a0f8e0',
};

export const CenterWalkAnimation: React.FC<CenterWalkAnimationProps> = ({
  characterIndex = 0,
  clothesType = 'casual',
  isWalking,
  frameDurationMs = 150,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  const clothesIdx = CLOTHES_MAP[clothesType] ?? 1;
  const imageSrc = `/assets/chars/char=${characterIndex}_clothes=${clothesIdx}.bmp`;
  const bgColor = CHAR_BG_COLORS[characterIndex] || '#ffffff';

  // Load / switch image when character or clothes change
  useEffect(() => {
    let isCancelled = false;
    const img = new Image();

    img.onload = () => {
      if (!isCancelled) {
        setLoadedImage(img);
      }
    };

    img.onerror = (e) => {
      console.warn(`[CenterWalkAnimation] Failed to load image: ${imageSrc}`, e);
    };

    img.src = imageSrc;
    if (img.complete && img.naturalWidth) {
      setLoadedImage(img);
    }

    return () => {
      isCancelled = true;
    };
  }, [imageSrc]);

  // Walk cycle frame stepper
  useEffect(() => {
    if (!isWalking) return;

    const timer = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % 4);
    }, frameDurationMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [isWalking, frameDurationMs]);

  // Render current frame to canvas whenever frame or loaded image changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loadedImage || !loadedImage.naturalWidth || !loadedImage.naturalHeight) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sw = Math.floor((loadedImage.naturalWidth - 3) / 4);
    const sh = loadedImage.naturalHeight;

    if (canvas.width !== sw || canvas.height !== sh) {
      canvas.width = sw;
      canvas.height = sh;
    }

    const sx = frameIndex * (sw + 1);

    ctx.clearRect(0, 0, sw, sh);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(loadedImage, sx, 0, sw, sh, 0, 0, sw, sh);
  }, [frameIndex, loadedImage]);

  return (
    <div
      className="center-character-stage"
      style={{ backgroundColor: bgColor }}
      data-testid="center-walk-animation"
      data-character={characterIndex}
      data-clothes={clothesType}
      data-walking={isWalking ? 'true' : 'false'}
      data-frame={frameIndex}
    >
      <canvas
        ref={canvasRef}
        className="center-character-sprite"
        width={49}
        height={95}
      />
    </div>
  );
};
