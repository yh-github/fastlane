import { useState, useEffect } from 'react';

/**
 * Checks if the screen orientation lock API is supported and available in this browser.
 */
export function canLockOrientation(): boolean {
  return (
    typeof screen !== 'undefined' &&
    'orientation' in screen &&
    typeof (screen.orientation as any)?.lock === 'function'
  );
}

/**
 * Attempts to programmatically lock screen orientation to landscape.
 * Returns true if successful, false if rejected or unsupported.
 */
export async function attemptLockLandscape(): Promise<boolean> {
  if (!canLockOrientation()) return false;
  try {
    await (screen.orientation as any).lock('landscape');
    return true;
  } catch {
    // Gracefully handle rejection (requires fullscreen, user gesture, or unsupported on iOS)
    return false;
  }
}

/**
 * Requests fullscreen on the root element and then attempts to lock orientation to landscape.
 * Typically invoked from a user interaction gesture (e.g. clicking a rotate button).
 */
export async function requestFullscreenAndLockLandscape(): Promise<boolean> {
  if (typeof document !== 'undefined') {
    const docEl = document.documentElement as any;
    if (docEl.requestFullscreen) {
      try {
        await docEl.requestFullscreen();
      } catch {
        // Fullscreen may not be allowed or supported
      }
    } else if (docEl.webkitRequestFullscreen) {
      try {
        await docEl.webkitRequestFullscreen();
      } catch {
        // webkitRequestFullscreen error
      }
    }
  }

  return attemptLockLandscape();
}

/**
 * Detects if the current device is likely a mobile/touch device.
 */
export function isMobileOrTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const hasTouch = 'ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  const isCoarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const isMobileUa =
    typeof navigator !== 'undefined' &&
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  return hasTouch || isCoarse || isMobileUa;
}

/**
 * Hook to detect whether the viewport is currently landscape (width > height).
 * Updates on window resize, device orientation changes, or media query triggers.
 */
export function useIsLandscape(): boolean {
  const [isLandscape, setIsLandscape] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth > window.innerHeight;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Screen Orientation API event
    if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.addEventListener === 'function') {
      screen.orientation.addEventListener('change', checkOrientation);
    }

    // Media query listener
    let mql: MediaQueryList | null = null;
    if (typeof window.matchMedia === 'function') {
      try {
        mql = window.matchMedia('(orientation: landscape)');
        if (typeof mql.addEventListener === 'function') {
          mql.addEventListener('change', checkOrientation);
        } else if (typeof (mql as any).addListener === 'function') {
          (mql as any).addListener(checkOrientation);
        }
      } catch {
        // matchMedia may not support orientation query in older engines
      }
    }

    // Initial check
    checkOrientation();

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.removeEventListener === 'function') {
        screen.orientation.removeEventListener('change', checkOrientation);
      }
      if (mql) {
        if (typeof mql.removeEventListener === 'function') {
          mql.removeEventListener('change', checkOrientation);
        } else if (typeof (mql as any).removeListener === 'function') {
          (mql as any).removeListener(checkOrientation);
        }
      }
    };
  }, []);

  return isLandscape;
}

/**
 * Hook to detect whether the viewport is currently portrait (height >= width).
 */
export function useIsPortrait(): boolean {
  const isLandscape = useIsLandscape();
  return !isLandscape;
}
