import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameLog } from './GameLog';
import type { LogEntry } from './GameLog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.defaultValue) return options.defaultValue;
      return key;
    }
  }),
}));

describe('GameLog Component', () => {
  const mockEntries: LogEntry[] = [
    { week: 1, event: { key: 'action.job.worked', params: { wagesEarned: 50 } } },
    { week: 1, event: { key: 'action.relax' } },
    { week: 2, event: { key: 'action.education.studied', params: { name: 'College' } } },
  ];

  it('renders all log entries by default', () => {
    render(<GameLog entries={mockEntries} />);
    expect(screen.getByText(/action\.job\.worked/)).toBeInTheDocument();
    expect(screen.getByText(/action\.relax/)).toBeInTheDocument();
    expect(screen.getByText(/action\.education\.studied/)).toBeInTheDocument();
  });

  it('filters log entries when activeFilter is passed', () => {
    render(<GameLog entries={mockEntries} activeFilter="education" />);
    expect(screen.queryByText(/action\.job\.worked/)).not.toBeInTheDocument();
    expect(screen.queryByText(/action\.relax/)).not.toBeInTheDocument();
    expect(screen.getByText(/action\.education\.studied/)).toBeInTheDocument();
  });

  it('triggers onSelectFilter when filter pill is clicked', () => {
    const onSelectFilter = vi.fn();
    render(<GameLog entries={mockEntries} onSelectFilter={onSelectFilter} />);

    const luckFilterBtn = screen.getByRole('button', { name: /Luck/i });
    fireEvent.click(luckFilterBtn);
    expect(onSelectFilter).toHaveBeenCalledWith('luck');
  });
});
