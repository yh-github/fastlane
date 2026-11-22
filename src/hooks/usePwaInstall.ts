import { useState, useEffect, useCallback } from 'react';
import { requestMediaCacheWarmup } from '../pwa/registerServiceWorker';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface NavigatorWithInstall extends Navigator {
  install?: () => Promise<void>;
  standalone?: boolean;
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia === 'function') {
    if (
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: standalone)').matches
    ) {
      return true;
    }
  }
  return Boolean((window.navigator as NavigatorWithInstall).standalone);
}

let capturedPromptEvent: BeforeInstallPromptEvent | undefined;
const promptSubscribers = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    capturedPromptEvent = event as BeforeInstallPromptEvent;
    promptSubscribers.forEach((notify) => notify());
  });

  window.addEventListener('appinstalled', () => {
    capturedPromptEvent = undefined;
    promptSubscribers.forEach((notify) => notify());
  });
}

export function usePwaInstall() {
  const supportsWebInstall =
    typeof navigator !== 'undefined' &&
    typeof (navigator as NavigatorWithInstall).install === 'function';

  const [canInstall, setCanInstall] = useState<boolean>(() => {
    if (isStandaloneMode()) return false;
    return supportsWebInstall || Boolean(capturedPromptEvent);
  });
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const syncState = () => {
      if (isStandaloneMode()) {
        setCanInstall(false);
        return;
      }
      setCanInstall(supportsWebInstall || Boolean(capturedPromptEvent));
    };

    promptSubscribers.add(syncState);
    syncState();
    return () => {
      promptSubscribers.delete(syncState);
    };
  }, [supportsWebInstall]);

  const triggerInstall = useCallback(async () => {
    if (isInstalling) return;
    setIsInstalling(true);

    try {
      const nav = navigator as NavigatorWithInstall;
      if (typeof nav.install === 'function') {
        // Call directly from the click handler to preserve transient user activation
        await nav.install();
        setCanInstall(false);
        requestMediaCacheWarmup();
      } else if (capturedPromptEvent) {
        // Save and clear the single-use event before awaiting the user's choice
        const promptEvent = capturedPromptEvent;
        capturedPromptEvent = undefined;
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          requestMediaCacheWarmup();
        }
        if (!capturedPromptEvent) {
          setCanInstall(false);
        }
      }
    } catch (error) {
      const err = error as { name?: string };
      if (err?.name !== 'AbortError') {
        console.error('[PWA] Installation could not start:', error);
      }
    } finally {
      setIsInstalling(false);
    }
  }, [isInstalling]);

  return {
    canInstall,
    isInstalling,
    triggerInstall,
  };
}
