import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
});
