function isInstalledDisplayMode(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia === 'function') {
    if (
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: standalone)').matches
    ) {
      return true;
    }
  }
  return Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

export function requestMediaCacheWarmup(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  const sendWarmup = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({ type: 'WARM_MEDIA_CACHE' });
    } catch {
      // Ignore if SW is unavailable
    }
  };

  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
      .requestIdleCallback(() => {
        void sendWarmup();
      }, { timeout: 5000 });
  } else {
    globalThis.setTimeout(() => {
      void sendWarmup();
    }, 3000);
  }
}

export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const register = async () => {
    try {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      if (isInstalledDisplayMode()) {
        requestMediaCacheWarmup();
      }
    } catch (error) {
      console.warn('[PWA] Service worker registration failed:', error);
    }
  };

  if (document.readyState === 'complete') {
    void register();
  } else {
    window.addEventListener('load', () => {
      void register();
    }, { once: true });
  }

  window.addEventListener('appinstalled', () => {
    requestMediaCacheWarmup();
  });
}
