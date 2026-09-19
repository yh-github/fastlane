// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNavigationGuard } from './useNavigationGuard';

describe('useNavigationGuard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches beforeunload and popstate listeners when enabled', () => {
    const addEventSpy = vi.spyOn(window, 'addEventListener');
    const removeEventSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useNavigationGuard({ enabled: true }));

    expect(addEventSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    expect(addEventSpy).toHaveBeenCalledWith('popstate', expect.any(Function));

    unmount();

    expect(removeEventSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    expect(removeEventSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
  });

  it('does not attach listeners when disabled', () => {
    const addEventSpy = vi.spyOn(window, 'addEventListener');

    renderHook(() => useNavigationGuard({ enabled: false }));

    expect(addEventSpy).not.toHaveBeenCalledWith('beforeunload', expect.any(Function));
    expect(addEventSpy).not.toHaveBeenCalledWith('popstate', expect.any(Function));
  });

  it('sets returnValue on beforeunload event to prevent accidental refresh', () => {
    let beforeUnloadHandler: ((e: any) => void) | undefined;
    vi.spyOn(window, 'addEventListener').mockImplementation((event: string, handler: any) => {
      if (event === 'beforeunload') {
        beforeUnloadHandler = handler;
      }
    });

    renderHook(() => useNavigationGuard({ enabled: true, confirmMessage: 'Warning test' }));

    const fakeEvent = {
      preventDefault: vi.fn(),
      returnValue: ''
    };

    expect(beforeUnloadHandler).toBeDefined();
    beforeUnloadHandler!(fakeEvent);

    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(fakeEvent.returnValue).toBe('Warning test');
  });
});
