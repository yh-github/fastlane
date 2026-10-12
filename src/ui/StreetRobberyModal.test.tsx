import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { StreetRobberyModal } from './StreetRobberyModal';

describe('StreetRobberyModal', () => {
  it('renders robbery warning, loss amount, location, and dismisses on OK click', () => {
    const onClose = vi.fn();
    render(<StreetRobberyModal lostAmount={350} location="bank" onClose={onClose} />);

    expect(screen.getByText(/Street Robbery!/i)).toBeInTheDocument();
    expect(screen.getByText(/Loss: -\$350/i)).toBeInTheDocument();
    expect(screen.getByText(/bank/i)).toBeInTheDocument();

    const okBtn = screen.getByRole('button', { name: /OK/i });
    fireEvent.click(okBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders modifier pills for cash and mental condition when helpfulUI is true', () => {
    const onClose = vi.fn();
    render(
      <StreetRobberyModal
        lostAmount={200}
        location="pawn_shop"
        onClose={onClose}
        modifications={[
          { stat: 'money', diff: -200 },
          { stat: 'mentalCondition', diff: -3 },
        ]}
        isHelpfulUI={true}
      />
    );

    const pills = screen.getByTestId('stat-modifier-pills');
    expect(within(pills).getByText(/-\$200/i)).toBeInTheDocument();
    expect(within(pills).getByText(/-3 🧠/i)).toBeInTheDocument();
  });

  it('suppresses non-cash modifier pills when isHelpfulUI is false', () => {
    const onClose = vi.fn();
    render(
      <StreetRobberyModal
        lostAmount={200}
        location="pawn_shop"
        onClose={onClose}
        modifications={[
          { stat: 'money', diff: -200 },
          { stat: 'mentalCondition', diff: -3 },
        ]}
        isHelpfulUI={false}
      />
    );

    const pills = screen.getByTestId('stat-modifier-pills');
    expect(within(pills).getByText(/-\$200/i)).toBeInTheDocument();
    expect(within(pills).queryByText(/-3 🧠/i)).not.toBeInTheDocument();
  });
});

