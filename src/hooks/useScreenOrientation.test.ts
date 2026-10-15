// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  canLockOrientation,
  attemptLockLandscape,
  requestFullscreenAndLockLandscape,
  isMobileOrTouchDevice,
  useIsLandscape,
  useIsPortrait,
} from './useScreenOrientation';

describe('useScreenOrientation & helpers', () => {
  const originalScreen = window.screen;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'screen', {
      value: originalScreen,
      writable: true,
      configurable: true,
    });
    window.matchMedia = originalMatchMedia;
  });

  describe('canLockOrientation', () => {
    it('returns false when screen.orientation or lock function is missing', () => {
      Object.defineProperty(window, 'screen', {
        value: {},
        writable: true,
        configurable: true,
      });
      expect(canLockOrientation()).toBe(false);
    });

    it('returns true when screen.orientation.lock is a function', () => {
      Object.defineProperty(window, 'screen', {
        value: {
          orientation: {
            lock: vi.fn(),
          },
        },
        writable: true,
        configurable: true,
      });
      expect(canLockOrientation()).toBe(true);
    });
  });

  describe('attemptLockLandscape', () => {
    it('returns false if canLockOrientation is false', async () => {
      Object.defineProperty(window, 'screen', {
        value: {},
        writable: true,
        configurable: true,
      });
      const result = await attemptLockLandscape();
      expect(result).toBe(false);
    });

    it('returns true when lock succeeds', async () => {
      const lockMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(window, 'screen', {
        value: {
          orientation: { lock: lockMock },
        },
        writable: true,
        configurable: true,
      });
      const result = await attemptLockLandscape();
      expect(result).toBe(true);
      expect(lockMock).toHaveBeenCalledWith('landscape');
    });

    it('catches error and returns false when lock rejects', async () => {
      const lockMock = vi.fn().mockRejectedValue(new Error('Not supported'));
      Object.defineProperty(window, 'screen', {
        value: {
          orientation: { lock: lockMock },
        },
        writable: true,
        configurable: true,
      });
      const result = await attemptLockLandscape();
      expect(result).toBe(false);
    });
  });

  describe('requestFullscreenAndLockLandscape', () => {
    it('requests fullscreen on documentElement and attempts lock', async () => {
      const requestFullscreenMock = vi.fn().mockResolvedValue(undefined);
      const lockMock = vi.fn().mockResolvedValue(undefined);

      document.documentElement.requestFullscreen = requestFullscreenMock;
      Object.defineProperty(window, 'screen', {
        value: {
          orientation: { lock: lockMock },
        },
        writable: true,
        configurable: true,
      });

      const result = await requestFullscreenAndLockLandscape();
      expect(requestFullscreenMock).toHaveBeenCalled();
      expect(lockMock).toHaveBeenCalledWith('landscape');
      expect(result).toBe(true);
    });

    it('handles fullscreen errors gracefully and still attempts lock', async () => {
      const requestFullscreenMock = vi.fn().mockRejectedValue(new Error('Denied'));
      const lockMock = vi.fn().mockResolvedValue(undefined);

      document.documentElement.requestFullscreen = requestFullscreenMock;
      Object.defineProperty(window, 'screen', {
        value: {
          orientation: { lock: lockMock },
        },
        writable: true,
        configurable: true,
      });

      const result = await requestFullscreenAndLockLandscape();
      expect(requestFullscreenMock).toHaveBeenCalled();
      expect(lockMock).toHaveBeenCalledWith('landscape');
      expect(result).toBe(true);
    });
  });

  describe('isMobileOrTouchDevice', () => {
    it('returns true when touch is present', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 5,
        configurable: true,
      });
      expect(isMobileOrTouchDevice()).toBe(true);
    });

    it('returns true when coarse pointer media query matches', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true,
      });
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(pointer: coarse)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })) as any;

      expect(isMobileOrTouchDevice()).toBe(true);
    });
  });

  describe('useIsLandscape and useIsPortrait', () => {
    it('detects landscape when innerWidth > innerHeight', () => {
      window.innerWidth = 800;
      window.innerHeight = 600;

      const { result } = renderHook(() => useIsLandscape());
      expect(result.current).toBe(true);
    });

    it('detects portrait when innerWidth < innerHeight', () => {
      window.innerWidth = 390;
      window.innerHeight = 844;

      const { result } = renderHook(() => useIsLandscape());
      expect(result.current).toBe(false);
    });

    it('useIsPortrait returns opposite of useIsLandscape', () => {
      window.innerWidth = 390;
      window.innerHeight = 844;

      const { result } = renderHook(() => useIsPortrait());
      expect(result.current).toBe(true);
    });

    it('updates when resize event is triggered', () => {
      window.innerWidth = 390;
      window.innerHeight = 844;

      const { result } = renderHook(() => useIsLandscape());
      expect(result.current).toBe(false);

      act(() => {
        window.innerWidth = 844;
        window.innerHeight = 390;
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current).toBe(true);
    });

    it('updates when orientationchange event is triggered', () => {
      window.innerWidth = 844;
      window.innerHeight = 390;

      const { result } = renderHook(() => useIsLandscape());
      expect(result.current).toBe(true);

      act(() => {
        window.innerWidth = 390;
        window.innerHeight = 844;
        window.dispatchEvent(new Event('orientationchange'));
      });

      expect(result.current).toBe(false);
    });
  });
});
