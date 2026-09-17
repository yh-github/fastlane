import React, { useEffect, useRef, useState } from 'react';

export interface CenterWalkAnimationProps {
  characterIndex?: number;
  clothesType?: 'casual' | 'dress' | 'business' | 'none';
  isWalking: boolean;
  frameDurationMs?: number;
  pixelated?: boolean;
  removeBg?: boolean;
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

function makeBackgroundTransparent(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // If already transparent (e.g. 32-bit RGBA PNG), skip flood-fill
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return;
  }

  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];

  // Flood fill from borders to only remove external background, preserving eyes/clothes
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  const isBg = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    return (
      Math.abs(data[idx] - bgR) < 3 &&
      Math.abs(data[idx + 1] - bgG) < 3 &&
      Math.abs(data[idx + 2] - bgB) < 3
    );
  };

  for (let x = 0; x < width; x++) {
    if (isBg(x, 0) && !visited[x]) {
      visited[x] = 1;
      queue.push(x, 0);
    }
    const btmIdx = (height - 1) * width + x;
    if (isBg(x, height - 1) && !visited[btmIdx]) {
      visited[btmIdx] = 1;
      queue.push(x, height - 1);
    }
  }

  for (let y = 0; y < height; y++) {
    const lIdx = y * width;
    if (isBg(0, y) && !visited[lIdx]) {
      visited[lIdx] = 1;
      queue.push(0, y);
    }
    const rIdx = y * width + width - 1;
    if (isBg(width - 1, y) && !visited[rIdx]) {
      visited[rIdx] = 1;
      queue.push(width - 1, y);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const cx = queue[head++];
    const cy = queue[head++];

    const neighbors = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1]
    ];

    for (let i = 0; i < 4; i++) {
      const nx = neighbors[i][0];
      const ny = neighbors[i][1];
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx;
        if (!visited[nIdx] && isBg(nx, ny)) {
          visited[nIdx] = 1;
          queue.push(nx, ny);
        }
      }
    }
  }

  for (let i = 0; i < visited.length; i++) {
    if (visited[i]) {
      data[i * 4 + 3] = 0;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

export const CenterWalkAnimation: React.FC<CenterWalkAnimationProps> = ({
  characterIndex = 0,
  clothesType = 'casual',
  isWalking,
  frameDurationMs = 150,
  pixelated = true,
  removeBg = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  const clothesIdx = CLOTHES_MAP[clothesType] ?? 1;
  const imageSrc = characterIndex === 3
    ? `/assets/chars/char=${characterIndex}_clothes=${clothesIdx}.png`
    : `/assets/chars/char=${characterIndex}_clothes=${clothesIdx}.bmp`;
  const bgColor = removeBg ? 'transparent' : (CHAR_BG_COLORS[characterIndex] || '#ffffff');

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

  // Render current frame to canvas whenever frame, image, or options change
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
    ctx.imageSmoothingEnabled = !pixelated || characterIndex === 3;
    ctx.drawImage(loadedImage, sx, 0, sw, sh, 0, 0, sw, sh);

    if (removeBg) {
      try {
        makeBackgroundTransparent(ctx, sw, sh);
      } catch (e) {
        console.warn('[CenterWalkAnimation] Error making background transparent', e);
      }
    }
  }, [frameIndex, loadedImage, pixelated, removeBg, characterIndex]);

  return (
    <div
      className="center-character-stage"
      style={{ backgroundColor: bgColor }}
      data-testid="center-walk-animation"
      data-character={characterIndex}
      data-clothes={clothesType}
      data-walking={isWalking ? 'true' : 'false'}
      data-frame={frameIndex}
      data-pixelated={pixelated ? 'true' : 'false'}
      data-remove-bg={removeBg ? 'true' : 'false'}
    >
      <canvas
        ref={canvasRef}
        className={`center-character-sprite ${!pixelated || characterIndex === 3 ? 'center-character-sprite--smooth' : ''}`}
        width={49}
        height={95}
      />
    </div>
  );
};
