import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HospitalServices } from './HospitalServices';
import { createTestPlayer } from '../../engine/testFactories';

describe('HospitalServices', () => {
  it('renders combined treatments button that opens modal with Physical and Mental cards', async () => {
    const player = createTestPlayer({
      money: 200,
      hoursRemaining: 10,
      physicalCondition: 30,
      mentalConditionMax: 65
    });
    const onAction = vi.fn().mockResolvedValue({});

    render(
      <HospitalServices
        player={player}
        onAction={onAction}
        economicIndex={0}
        rules={{ hospitalEmployeeHealthcare: true } as any}
      />
    );

    // Initial view: single combined treatments button
    const openBtn = screen.getByTestId('btn-open-treatments');
    expect(openBtn).toBeInTheDocument();
    expect(screen.queryByTestId('hospital-treatments-modal')).not.toBeInTheDocument();

    // Click to open treatments modal
    fireEvent.click(openBtn);

    // Modal is now open
    expect(screen.getByTestId('hospital-treatments-modal')).toBeInTheDocument();
    expect(screen.getByTestId('treatment-card-physical')).toBeInTheDocument();
    expect(screen.getByTestId('treatment-card-mental')).toBeInTheDocument();

    // Close via cancel button (neither)
    const cancelBtn = screen.getByTestId('btn-cancel-treatment');
    fireEvent.click(cancelBtn);
    expect(screen.queryByTestId('hospital-treatments-modal')).not.toBeInTheDocument();
    expect(onAction).not.toHaveBeenCalled();
  });

  it('closable via close button (✕) or Escape key', () => {
    const player = createTestPlayer({
      money: 200,
      hoursRemaining: 10,
      physicalCondition: 30
    });
    const onAction = vi.fn().mockResolvedValue({});

    render(
      <HospitalServices
        player={player}
        onAction={onAction}
        economicIndex={0}
      />
    );

    // Open modal
    fireEvent.click(screen.getByTestId('btn-open-treatments'));
    expect(screen.getByTestId('hospital-treatments-modal')).toBeInTheDocument();

    // Close via ✕
    fireEvent.click(screen.getByTestId('btn-close-treatments-modal'));
    expect(screen.queryByTestId('hospital-treatments-modal')).not.toBeInTheDocument();

    // Re-open and close via Escape
    fireEvent.click(screen.getByTestId('btn-open-treatments'));
    expect(screen.getByTestId('hospital-treatments-modal')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('hospital-treatments-modal')).not.toBeInTheDocument();
  });

  it('clicking Physical Treatment card button dispatches hospital_urgent_care and closes modal', async () => {
    const player = createTestPlayer({
      money: 200,
      hoursRemaining: 10,
      physicalCondition: 15
    });
    const onAction = vi.fn().mockResolvedValue({});

    render(
      <HospitalServices
        player={player}
        onAction={onAction}
        economicIndex={0}
      />
    );

    fireEvent.click(screen.getByTestId('btn-open-treatments'));
    const physBtn = screen.getByTestId('btn-treatment-physical');
    expect(physBtn).not.toBeDisabled();

    fireEvent.click(physBtn);
    expect(onAction).toHaveBeenCalledWith({ type: 'hospital_urgent_care' });
  });

  it('clicking Mental Treatment card button dispatches hospital_therapy and closes modal', async () => {
    const player = createTestPlayer({
      money: 200,
      hoursRemaining: 10,
      physicalCondition: 40,
      mentalConditionMax: 65
    });
    const onAction = vi.fn().mockResolvedValue({});

    render(
      <HospitalServices
        player={player}
        onAction={onAction}
        economicIndex={0}
      />
    );

    fireEvent.click(screen.getByTestId('btn-open-treatments'));
    const mentalBtn = screen.getByTestId('btn-treatment-mental');
    expect(mentalBtn).not.toBeDisabled();

    fireEvent.click(mentalBtn);
    expect(onAction).toHaveBeenCalledWith({ type: 'hospital_therapy' });
  });

  it('hospital cafeteria is locked for non-staff and enabled for hospital staff with $40 price', () => {
    const nonStaffPlayer = createTestPlayer({
      money: 100,
      hoursRemaining: 10,
      currentJobId: 'factory_worker'
    });
    const onAction = vi.fn().mockResolvedValue({});

    const { rerender } = render(
      <HospitalServices
        player={nonStaffPlayer}
        onAction={onAction}
        economicIndex={0}
        rules={{ hospitalEmployeeHealthcare: true } as any}
      />
    );

    // Non-staff: button is disabled
    const cafeteriaBtn = screen.getByTestId('btn-hospital-cafeteria');
    expect(cafeteriaBtn).toBeDisabled();
    expect(screen.getAllByText(/Staff Only/i).length).toBeGreaterThan(0);

    // Rerender as staff member
    const staffPlayer = createTestPlayer({
      money: 100,
      hoursRemaining: 10,
      currentJobId: 'hospital_custodian'
    });

    rerender(
      <HospitalServices
        player={staffPlayer}
        onAction={onAction}
        economicIndex={0}
        rules={{ hospitalEmployeeHealthcare: true } as any}
      />
    );

    const staffCafeteriaBtn = screen.getByTestId('btn-hospital-cafeteria');
    expect(staffCafeteriaBtn).not.toBeDisabled();
    expect(staffCafeteriaBtn).toHaveTextContent('$40');

    fireEvent.click(staffCafeteriaBtn);
    expect(onAction).toHaveBeenCalledWith({ type: 'hospital_cafeteria' });
  });

  it('keeps hospital cafeteria enabled even after eating once and opens service help modal on ? click', () => {
    const fedStaffPlayer = createTestPlayer({
      money: 100,
      hoursRemaining: 10,
      currentJobId: 'hospital_custodian',
      turnFlags: { ateHospitalCafeteriaThisTurn: true, hasEaten: true } as any
    });
    const onAction = vi.fn().mockResolvedValue({});

    render(
      <HospitalServices
        player={fedStaffPlayer}
        onAction={onAction}
        economicIndex={0}
        rules={{ hospitalEmployeeHealthcare: true } as any}
      />
    );

    const cafeteriaBtn = screen.getByTestId('btn-hospital-cafeteria');
    expect(cafeteriaBtn).not.toBeDisabled();
    fireEvent.click(cafeteriaBtn);
    expect(onAction).toHaveBeenCalledWith({ type: 'hospital_cafeteria' });

    const helpBtn = screen.getByTestId('btn-hospital-help-cafeteria');
    fireEvent.click(helpBtn);
    expect(screen.getByTestId('hospital-service-help-modal')).toBeInTheDocument();
    expect(screen.getByText(/Satisfies your weekly nutrition requirement/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('btn-close-hospital-help'));
    expect(screen.queryByTestId('hospital-service-help-modal')).not.toBeInTheDocument();
  });
});
