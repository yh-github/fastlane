import { useEffect } from 'react';

interface NavigationGuardOptions {
  enabled?: boolean;
  confirmMessage?: string;
  onConfirmExit?: () => void;
}

/**
 * useNavigationGuard — Prevents accidental browser refresh, tab close,
 * or back-button navigation during active gameplay.
 */
export function useNavigationGuard({
  enabled = true,
  confirmMessage = 'Are you sure you want to leave the game? Current turn progress may be lost.',
  onConfirmExit
}: NavigationGuardOptions = {}) {
  useEffect(() => {
    if (!enabled) return;

    // 1. Prevent accidental refresh / tab close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers show standard browser prompt when returnValue is set
      e.returnValue = confirmMessage;
      return confirmMessage;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // 2. Prevent accidental browser back button / swipe back gesture
    // Push a dummy history state so the first 'back' action triggers popstate instead of exiting
    const stateKey = 'fastlane_game_active';
    try {
      window.history.pushState({ [stateKey]: true }, '');
    } catch {
      // Ignore security/sandboxed iframe history errors
    }

    const handlePopState = (_e: PopStateEvent) => {
      const shouldLeave = window.confirm(confirmMessage);
      if (shouldLeave) {
        if (onConfirmExit) {
          onConfirmExit();
        } else {
          window.history.back();
        }
      } else {
        // Push state back so subsequent back gestures continue to be guarded
        try {
          window.history.pushState({ [stateKey]: true }, '');
        } catch {
          // Ignore
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [enabled, confirmMessage, onConfirmExit]);
}
