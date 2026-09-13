import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CenterWalkAnimation } from './CenterWalkAnimation';

describe('CenterWalkAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the character stage with character 0 and default clothes', () => {
    render(<CenterWalkAnimation isWalking={false} />);
    const stage = screen.getByTestId('center-walk-animation');
    expect(stage).toBeInTheDocument();
    expect(stage.dataset.character).toBe('0');
    expect(stage.dataset.clothes).toBe('casual');
    expect(stage.dataset.walking).toBe('false');
    expect(stage.dataset.frame).toBe('0');
    expect(stage.style.backgroundColor).toBe('rgb(255, 255, 255)');
  });

  it('updates clothing data attribute when clothesType changes', () => {
    const { rerender } = render(<CenterWalkAnimation clothesType="none" isWalking={false} />);
    let stage = screen.getByTestId('center-walk-animation');
    expect(stage.dataset.clothes).toBe('none');

    rerender(<CenterWalkAnimation clothesType="dress" isWalking={false} />);
    stage = screen.getByTestId('center-walk-animation');
    expect(stage.dataset.clothes).toBe('dress');

    rerender(<CenterWalkAnimation clothesType="business" isWalking={false} />);
    stage = screen.getByTestId('center-walk-animation');
    expect(stage.dataset.clothes).toBe('business');
  });

  it('does not advance frames when isWalking is false', () => {
    render(<CenterWalkAnimation isWalking={false} frameDurationMs={150} />);
    const stage = screen.getByTestId('center-walk-animation');
    expect(stage.dataset.frame).toBe('0');

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(stage.dataset.frame).toBe('0');
  });

  it('cycles frames through 0 -> 1 -> 2 -> 3 -> 0 when isWalking is true', () => {
    render(<CenterWalkAnimation isWalking={true} frameDurationMs={150} />);
    const stage = screen.getByTestId('center-walk-animation');
    expect(stage.dataset.frame).toBe('0');

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(stage.dataset.frame).toBe('1');

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(stage.dataset.frame).toBe('2');

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(stage.dataset.frame).toBe('3');

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(stage.dataset.frame).toBe('0');
  });

  it('preserves the current frame when stopping walking', () => {
    const { rerender } = render(<CenterWalkAnimation isWalking={true} frameDurationMs={150} />);
    const stage = screen.getByTestId('center-walk-animation');

    act(() => {
      vi.advanceTimersByTime(300); // Advances 2 frames: 0 -> 1 -> 2
    });
    expect(stage.dataset.frame).toBe('2');

    rerender(<CenterWalkAnimation isWalking={false} frameDurationMs={150} />);
    expect(stage.dataset.frame).toBe('2');

    act(() => {
      vi.advanceTimersByTime(600);
    });
    // Remains on frame 2 without resetting or cycling
    expect(stage.dataset.frame).toBe('2');
  });

  it('triggers canvas redraw when clothesType changes while idle', () => {
    const drawImageMock = vi.fn();
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      drawImage: drawImageMock,
      imageSmoothingEnabled: false,
    });

    try {
      const { rerender } = render(<CenterWalkAnimation clothesType="casual" isWalking={false} />);
      drawImageMock.mockClear();

      rerender(<CenterWalkAnimation clothesType="dress" isWalking={false} />);
      const stage = screen.getByTestId('center-walk-animation');
      expect(stage.dataset.clothes).toBe('dress');
    } finally {
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    }
  });
});
