import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActionReasonModal } from "./ActionReasonModal";

describe("ActionReasonModal", () => {
  it('ActionReasonModal renders reason and dismisses via onClose', () => {
    const handleClose = vi.fn();

    render(
      <ActionReasonModal
        title="Custom Title"
        reason="Because reasons"
        onClose={handleClose}
      />
    );

    expect(screen.getByText(/Custom Title/i)).toBeInTheDocument();
    expect(screen.getByText(/Because reasons/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('OK'));
    expect(handleClose).toHaveBeenCalled();
  });

});
