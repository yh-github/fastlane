import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { OrientationPrompt } from './OrientationPrompt';
import * as screenOrientationModule from '../hooks/useScreenOrientation';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.defaultValue) return options.defaultValue;
      return key;
    },
  }),
}));

describe('OrientationPrompt', () => {
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;

  beforeEach(() => {
    vi.restoreAllMocks();
    window.innerWidth = 800;
    window.innerHeight = 600;
  });

  afterEach(() => {
    window.innerWidth = originalWidth;
    window.innerHeight = originalHeight;
  });

  it('renders nothing when viewport is landscape', () => {
    window.innerWidth = 800;
    window.innerHeight = 600;

    render(<OrientationPrompt />);
    expect(screen.queryByTestId('orientation-prompt')).not.toBeInTheDocument();
  });

  it('renders overlay when viewport is portrait', () => {
    window.innerWidth = 390;
    window.innerHeight = 844;

    render(<OrientationPrompt />);

    const prompt = screen.getByTestId('orientation-prompt');
    expect(prompt).toBeInTheDocument();
    expect(screen.getByText(/Please Rotate Your Device/i)).toBeInTheDocument();
    expect(screen.getByText(/Fast Lane Modernized is designed for landscape mode/i)).toBeInTheDocument();
    expect(screen.getByText(/If your screen doesn’t rotate/i)).toBeInTheDocument();
  });

  it('renders when forceVisible is true even if in landscape', () => {
    window.innerWidth = 800;
    window.innerHeight = 600;

    render(<OrientationPrompt forceVisible={true} />);
    expect(screen.getByTestId('orientation-prompt')).toBeInTheDocument();
  });

  it('dismisses the prompt when clicking Continue in portrait anyway', () => {
    window.innerWidth = 390;
    window.innerHeight = 844;
    const onDismissMock = vi.fn();

    render(<OrientationPrompt onDismiss={onDismissMock} />);

    const dismissBtn = screen.getByTestId('orientation-btn-dismiss');
    expect(dismissBtn).toBeInTheDocument();

    fireEvent.click(dismissBtn);

    expect(screen.queryByTestId('orientation-prompt')).not.toBeInTheDocument();
    expect(onDismissMock).toHaveBeenCalledTimes(1);
  });

  it('shows Switch to Landscape button and triggers lock on click', async () => {
    window.innerWidth = 390;
    window.innerHeight = 844;

    vi.spyOn(screenOrientationModule, 'canLockOrientation').mockReturnValue(true);
    const lockSpy = vi.spyOn(screenOrientationModule, 'requestFullscreenAndLockLandscape').mockResolvedValue(true);

    render(<OrientationPrompt />);

    const rotateBtn = screen.getByTestId('orientation-btn-rotate');
    expect(rotateBtn).toBeInTheDocument();
    expect(rotateBtn).toHaveTextContent(/Switch to Landscape/i);

    fireEvent.click(rotateBtn);

    expect(lockSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('orientation-attempt-hint')).toBeInTheDocument();
  });

  it('automatically hides when user rotates device to landscape', () => {
    window.innerWidth = 390;
    window.innerHeight = 844;

    render(<OrientationPrompt />);
    expect(screen.getByTestId('orientation-prompt')).toBeInTheDocument();

    act(() => {
      window.innerWidth = 844;
      window.innerHeight = 390;
      window.dispatchEvent(new Event('resize'));
    });

    expect(screen.queryByTestId('orientation-prompt')).not.toBeInTheDocument();
  });
});
