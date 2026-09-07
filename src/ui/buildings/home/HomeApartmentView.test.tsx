import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeApartmentView } from './HomeApartmentView';
import { ApartmentMockupSandbox } from './ApartmentMockupSandbox';
import { createMockCampaign } from '../../../engine/testFactories';

const mockCampaign = createMockCampaign();

describe('HomeApartmentView & Mockup Sandbox', () => {
  const basePlayer: any = {
    id: 'p1',
    name: 'Player 1',
    money: 1000,
    hoursRemaining: 10,
    currentHousingId: 'low_cost',
    mess: 5,
    inventory: {
      freshFoodUnits: 2,
      fastFoodItems: [],
      appliances: [
        { id: 'refrigerator', condition: 'new', purchaseSource: 'socket_city' }
      ],
      books: ['dictionary']
    }
  };

  it('renders collectible silhouette showcase without verbose empty text paragraphs', () => {
    render(
      <HomeApartmentView
        player={basePlayer}
        campaign={mockCampaign}
        rules={{ trackMess: true, spaceCapping: true } as any}
        housingName="Low-Cost Housing"
        actionFeedback={null}
        durablesSpace={5}
        totalUsedSpace={10}
        spaceCap={10}
        freeSpace={0}
        overflow={0}
        isOvercapacity={false}
        durablesPct={50}
        messPct={50}
        currentMess={5}
        maxMessHousing={50}
        messIcon="🧹"
        messLabel="Messy"
        messBarColor="#f39c12"
        messPercentage={10}
        hoursToRelax={6}
        isRelaxDisabled={false}
        hasFood={true}
        physGain={5}
        mentalGain={10}
        scaledMess={2}
        classicGain={5}
        classicFirstBonus={0}
        onRelaxClick={vi.fn()}
        socialParams={{}}
        onSocializeClick={vi.fn()}
        hoursToClean={3}
        cleanPhysGain={2}
        isCleanDisabled={false}
        cleanSubtext=""
        onCleanClick={vi.fn()}
        cleaningServiceCost={100}
        cleaningServicePrice={100}
        isServiceDisabled={false}
        serviceSubtext=""
        onServiceClick={vi.fn()}
        hasFridge={true}
        hasFreezer={false}
      />
    );

    // Header counter should show 2 / 13 Furnished
    expect(screen.getByText(/Apartment Furnishings/i)).toBeInTheDocument();
    expect(screen.getByText(/2 \/ 13 Furnished/i)).toBeInTheDocument();

    // Must NOT have the verbose empty paragraph text
    expect(screen.queryByText(/Your apartment is completely unfurnished/i)).toBeNull();

    // Owned items should show with names and condition badges
    expect(screen.getByTitle(/Refrigerator \(New\) — Click to inspect/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Dictionary \(Book\) — Click to inspect/i)).toBeInTheDocument();

    // Unowned items should show as silhouettes with unowned titles
    expect(screen.getByTitle(/Color TV \(Unowned — Available at Socket City\/Z-Mart\)/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Stereo \(Unowned — Available at Socket City\/Z-Mart\)/i)).toBeInTheDocument();

    // Bottom docked action buttons must be present
    expect(screen.getByRole('button', { name: /Leisure/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chores/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pantry/i })).toBeInTheDocument();

    // Clicking an unowned slot opens catalog / wishlist modal
    const unownedColorTv = screen.getByTitle(/Color TV \(Unowned/i);
    fireEvent.click(unownedColorTv);
    expect(screen.getByText(/Available at Socket City/i)).toBeInTheDocument();
    expect(screen.getByText(/Not Owned/i)).toBeInTheDocument();

    // Verify the backdrop does NOT blur out the rest of the screen
    const backdrop = screen.getByTestId('durable-card-modal-backdrop');
    expect(backdrop.style.backdropFilter).toBeFalsy();

    // Close the inspection modal
    fireEvent.click(screen.getByRole('button', { name: /Back to Apartment|✕/i }));

    // Title bar and mockups sandbox button should NOT be in the view
    expect(screen.queryByRole('button', { name: /🎨 Mockups Sandbox/i })).toBeNull();
    expect(screen.queryByText(/Home Sweet Home/i)).toBeNull();
  });

  it('allows switching mockup concepts and toggling controls in ApartmentMockupSandbox', () => {
    const onClose = vi.fn();
    const onApply = vi.fn();

    render(
      <ApartmentMockupSandbox
        campaign={mockCampaign}
        onClose={onClose}
        onApplyToPlayer={onApply}
      />
    );

    // Initial concept is Concept 1: Silhouettes
    expect(screen.getByText(/Concept 1: Collectible Silhouette Slots/i)).toBeInTheDocument();

    // Switch to Concept 2: Floorplan Squares
    fireEvent.click(screen.getByText(/Concept 2: Visual Space Floorplan Squares/i));
    expect(screen.getByText(/Durables & Mess Grid/i)).toBeInTheDocument();

    // Switch to Concept 3: Room Zones
    fireEvent.click(screen.getByText(/Concept 3: Room Zones/i));
    expect(screen.getByText(/Kitchen & Dining/i)).toBeInTheDocument();
    expect(screen.getByText(/Living & Lounge/i)).toBeInTheDocument();

    // Use Quick Presets: Furnish All (New)
    fireEvent.click(screen.getByRole('button', { name: /Furnish All \(New\)/i }));

    // Apply to player
    fireEvent.click(screen.getByRole('button', { name: /Apply to Player/i }));
    expect(onApply).toHaveBeenCalled();

    // Close button
    fireEvent.click(screen.getByRole('button', { name: /Close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('switches between inline card decks without hiding Space & Mess gauge, and toggles back to furnishings', () => {
    render(
      <HomeApartmentView
        player={basePlayer}
        campaign={mockCampaign}
        rules={{ trackMess: true, spaceCapping: true, usePhysicalMentalConditions: true } as any}
        housingName="Low-Cost Housing"
        actionFeedback={null}
        durablesSpace={5}
        totalUsedSpace={10}
        spaceCap={10}
        freeSpace={0}
        overflow={0}
        isOvercapacity={false}
        durablesPct={50}
        messPct={50}
        currentMess={5}
        maxMessHousing={50}
        messIcon="🧹"
        messLabel="Messy"
        messBarColor="#f39c12"
        messPercentage={10}
        hoursToRelax={6}
        isRelaxDisabled={false}
        hasFood={true}
        physGain={5}
        mentalGain={10}
        scaledMess={2}
        classicGain={5}
        classicFirstBonus={0}
        onRelaxClick={vi.fn()}
        socialParams={{ timeCost: 4, isDisabled: false }}
        onSocializeClick={vi.fn()}
        hoursToClean={3}
        cleanPhysGain={2}
        isCleanDisabled={false}
        cleanSubtext=""
        onCleanClick={vi.fn()}
        cleaningServiceCost={100}
        cleaningServicePrice={100}
        isServiceDisabled={false}
        serviceSubtext=""
        onServiceClick={vi.fn()}
        hasFridge={true}
        hasFreezer={false}
      />
    );

    // Initial state: Durables showcase is visible, Space & Mess gauge is visible
    expect(screen.getByText(/Apartment Furnishings/i)).toBeInTheDocument();
    expect(screen.getByText(/🧹 Mess: 5/i)).toBeInTheDocument();

    // Click Leisure
    fireEvent.click(screen.getByRole('button', { name: /Leisure/i }));

    // Now Leisure deck is visible without redundant section title or back button, Mess gauge is STILL visible!
    expect(screen.getByText(/Relax & Recharge/i)).toBeInTheDocument();
    expect(screen.getByText(/🧹 Mess: 5/i)).toBeInTheDocument();
    expect(screen.queryByText(/Apartment Furnishings/i)).toBeNull();
    expect(screen.queryByText(/Leisure & Living/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /✕ Back to Furnishings/i })).toBeNull();

    // Clicking active Leisure button toggles back to furnishings
    fireEvent.click(screen.getByRole('button', { name: /Leisure/i }));
    expect(screen.getByText(/Apartment Furnishings/i)).toBeInTheDocument();
    expect(screen.queryByText(/Relax & Recharge/i)).toBeNull();

    // Click Chores
    fireEvent.click(screen.getByRole('button', { name: /Chores/i }));
    expect(screen.getByRole('heading', { name: /Clean Apartment/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Call Cleaning Service/i })).toBeInTheDocument();
    expect(screen.getByText(/🧹 Mess: 5/i)).toBeInTheDocument();
    expect(screen.queryByText(/Chores & Maintenance/i)).toBeNull();

    // Clicking active Chores button toggles back to furnishings
    fireEvent.click(screen.getByRole('button', { name: /Chores/i }));
    expect(screen.getByText(/Apartment Furnishings/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Clean Apartment/i })).toBeNull();

    // Switching directly from Pantry to Leisure
    fireEvent.click(screen.getByRole('button', { name: /Pantry/i }));
    expect(screen.getByText(/Pantry & Food Supplies/i)).toBeInTheDocument();
    expect(screen.getByText(/🧹 Mess: 5/i)).toBeInTheDocument();
    expect(screen.queryByText(/Kitchen & Pantry/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Leisure/i }));
    expect(screen.getByText(/Relax & Recharge/i)).toBeInTheDocument();
    expect(screen.queryByText(/Pantry & Food Supplies/i)).toBeNull();
    expect(screen.getByText(/🧹 Mess: 5/i)).toBeInTheDocument();
  });

  it('renders broken appliance with badge and allows executing maintenance options', () => {
    const onAction = vi.fn();
    const brokenPlayer = {
      ...basePlayer,
      inventory: {
        ...basePlayer.inventory,
        appliances: [
          { id: 'refrigerator', condition: 'used', purchaseSource: 'socket_city', isBroken: true }
        ]
      }
    };

    render(
      <HomeApartmentView
        player={brokenPlayer}
        campaign={mockCampaign}
        rules={{ trackMess: true, spaceCapping: true, advancedMaintenance: true } as any}
        housingName="Low-Cost Housing"
        actionFeedback={null}
        durablesSpace={5}
        totalUsedSpace={10}
        spaceCap={10}
        freeSpace={0}
        overflow={0}
        isOvercapacity={false}
        durablesPct={50}
        messPct={50}
        currentMess={5}
        maxMessHousing={50}
        messIcon="🧹"
        messLabel="Messy"
        messBarColor="#f39c12"
        messPercentage={10}
        hoursToRelax={6}
        isRelaxDisabled={false}
        hasFood={true}
        physGain={5}
        mentalGain={10}
        scaledMess={2}
        classicGain={5}
        classicFirstBonus={0}
        onRelaxClick={vi.fn()}
        socialParams={{}}
        onSocializeClick={vi.fn()}
        hoursToClean={3}
        cleanPhysGain={2}
        isCleanDisabled={false}
        cleanSubtext=""
        onCleanClick={vi.fn()}
        cleaningServiceCost={100}
        cleaningServicePrice={100}
        isServiceDisabled={false}
        serviceSubtext=""
        onServiceClick={vi.fn()}
        hasFridge={true}
        hasFreezer={false}
        economicIndex={0}
        onAction={onAction}
      />
    );

    // Broken badge should be visible on the card in the grid
    expect(screen.getByText(/BROKEN/i)).toBeInTheDocument();

    // Click the broken refrigerator card to open inspection modal
    const fridgeCard = screen.getByTitle(/Refrigerator \(BROKEN — Needs Repair\) — Click to maintain/i);
    fireEvent.click(fridgeCard);

    // Maintenance section and options should be present
    expect(screen.getByText(/Appliance Maintenance/i)).toBeInTheDocument();
    expect(screen.getByText(/This appliance has broken down and does not function until repaired/i)).toBeInTheDocument();

    // Verify maintenance buttons
    const diyButton = screen.getByRole('button', { name: /DIY Fix/i });
    const repairmanButton = screen.getByRole('button', { name: /Repairman/i });
    const throwOutButton = screen.getByRole('button', { name: /Throw Out/i });

    expect(diyButton).toBeInTheDocument();
    expect(repairmanButton).toBeInTheDocument();
    expect(throwOutButton).toBeInTheDocument();

    // Click DIY Fix
    fireEvent.click(diyButton);
    expect(onAction).toHaveBeenCalledWith({
      type: 'appliance_maintenance',
      applianceId: 'refrigerator',
      option: 'diy'
    });

    // Click Call Repairman
    fireEvent.click(repairmanButton);
    expect(onAction).toHaveBeenCalledWith({
      type: 'appliance_maintenance',
      applianceId: 'refrigerator',
      option: 'repairman'
    });

    // Click Throw Out
    fireEvent.click(throwOutButton);
    expect(onAction).toHaveBeenCalledWith({
      type: 'appliance_maintenance',
      applianceId: 'refrigerator',
      option: 'throw_out'
    });
  });
});
