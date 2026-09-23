import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
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

    // Header should show Apartment Furnishings
    expect(screen.getByText(/Apartment Furnishings/i)).toBeInTheDocument();

    // Must NOT have the verbose empty paragraph text
    expect(screen.queryByText(/Your apartment is completely unfurnished/i)).toBeNull();

    // Owned items should show with names and condition badges
    expect(screen.getByTitle(/Refrigerator \(New\) — Click to inspect/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Dictionary \(Book\) — Click to inspect/i)).toBeInTheDocument();

    // Unowned items should show as silhouettes with unowned titles
    expect(screen.getByTitle(/TV \(Unowned — Available at Socket City\/Z-Mart\)/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Stereo \(Unowned — Available at Socket City\/Z-Mart\)/i)).toBeInTheDocument();

    // Flanking action wings begin folded to prevent overwhelming clutter
    expect(screen.queryByTestId('home-wing-left')).toBeNull();
    expect(screen.queryByTestId('home-wing-right')).toBeNull();
    expect(screen.getByTestId('toggle-wing-leisure')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-wing-chores')).toBeInTheDocument();

    // Toggling leisure expands Left Wing (Relax, Host)
    fireEvent.click(screen.getByTestId('toggle-wing-leisure'));
    expect(screen.getByTestId('home-wing-left')).toBeInTheDocument();
    expect(screen.getByTestId('btn-relax')).toBeInTheDocument();

    // Toggling chores expands Right Wing (Clean, Service, Pantry)
    fireEvent.click(screen.getByTestId('toggle-wing-chores'));
    expect(screen.getByTestId('home-wing-right')).toBeInTheDocument();
    expect(screen.getByTestId('btn-clean')).toBeInTheDocument();

    // Clicking an unowned slot opens catalog / wishlist modal
    const unownedTv = screen.getByTitle(/TV \(Unowned/i);
    fireEvent.click(unownedTv);
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

  it('renders flanking wings with Leisure (Relax, Host) and Chores (Clean, Service, Pantry) without hiding Apartment Furnishings', () => {
    const onRelax = vi.fn();
    const onSocialize = vi.fn();
    const onClean = vi.fn();
    const onService = vi.fn();

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
        onRelaxClick={onRelax}
        socialParams={{ timeCost: 4, isDisabled: false, minReward: 4, maxReward: 8, minCashNeeded: 15, maxCashNeeded: 30, isHalfRewardExpected: false }}
        onSocializeClick={onSocialize}
        hoursToClean={3}
        cleanPhysGain={2}
        isCleanDisabled={false}
        cleanSubtext=""
        onCleanClick={onClean}
        cleaningServiceCost={1}
        cleaningServicePrice={100}
        isServiceDisabled={false}
        serviceSubtext=""
        onServiceClick={onService}
        hasFridge={true}
        hasFreezer={false}
      />
    );

    // Initial state: Durables showcase is visible, Space & Mess gauge is visible, wings begin folded
    expect(screen.getByText(/Apartment Furnishings/i)).toBeInTheDocument();
    expect(screen.getByText(/🧹 Mess: 5/i)).toBeInTheDocument();
    expect(screen.queryByTestId('home-wing-left')).toBeNull();
    expect(screen.queryByTestId('home-wing-right')).toBeNull();

    // Toggle Left Wing (Leisure: Relax and Host)
    fireEvent.click(screen.getByTestId('toggle-wing-leisure'));
    const leftWing = screen.getByTestId('home-wing-left');
    expect(leftWing).toBeInTheDocument();
    expect(within(leftWing).getByTestId('btn-relax')).toBeInTheDocument();
    expect(within(leftWing).getByTestId('btn-socialize')).toBeInTheDocument();

    // Click Relax executes callback
    fireEvent.click(within(leftWing).getByTestId('btn-relax'));
    expect(onRelax).toHaveBeenCalled();

    // Click Host executes callback
    fireEvent.click(within(leftWing).getByTestId('btn-socialize'));
    expect(onSocialize).toHaveBeenCalled();

    // Clicking '?' help button on Relax opens help modal
    const relaxCard = within(leftWing).getByTestId('home-card-relax');
    const relaxHelpBtn = within(relaxCard).getByRole('button', { name: 'Help & Details' });
    fireEvent.click(relaxHelpBtn);
    expect(screen.getByText(/Relax & Recharge/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Got It' }));
    expect(screen.queryByText(/Relax & Recharge/i)).toBeNull();

    // Toggle Right Wing (Chores: Clean, Service, and Pantry)
    fireEvent.click(screen.getByTestId('toggle-wing-chores'));
    const rightWing = screen.getByTestId('home-wing-right');
    expect(rightWing).toBeInTheDocument();
    expect(within(rightWing).getByTestId('btn-clean')).toBeInTheDocument();
    expect(within(rightWing).getByTestId('btn-service')).toBeInTheDocument();
    expect(within(rightWing).getByTestId('home-card-pantry')).toBeInTheDocument();

    // Click Clean executes callback
    fireEvent.click(within(rightWing).getByTestId('btn-clean'));
    expect(onClean).toHaveBeenCalled();

    // Click Service executes callback
    fireEvent.click(within(rightWing).getByTestId('btn-service'));
    expect(onService).toHaveBeenCalled();

    // Fold wing via close button
    fireEvent.click(within(rightWing).getByTestId('btn-close-wing-chores'));
    expect(screen.queryByTestId('home-wing-right')).toBeNull();

    // Apartment Furnishings was never hidden!
    expect(screen.getByText(/Apartment Furnishings/i)).toBeInTheDocument();
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

  it('opens CuriosFlankingWings on clicking curios shelf item and allows discarding', () => {
    const onAction = vi.fn();
    const curioPlayer: any = {
      ...basePlayer,
      inventory: {
        ...basePlayer.inventory,
        knickKnacks: 2,
        curios: [
          { id: 'curio_1', catalogId: 'curio_vintage_tin_robot', name: 'Vintage Tin Robot', acquiredWeek: 2, flavorText: 'A cute tin robot.' },
          { id: 'curio_2', catalogId: 'curio_brass_carriage_clock', name: 'Brass Carriage Clock', acquiredWeek: 3, flavorText: 'Ticks with steady precision.' }
        ]
      }
    };

    render(
      <HomeApartmentView
        player={curioPlayer}
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
        cleaningServiceCost={50}
        cleaningServicePrice={50}
        isServiceDisabled={false}
        serviceSubtext=""
        onServiceClick={vi.fn()}
        hasFridge={true}
        hasFreezer={false}
        onAction={onAction}
      />
    );

    // Curios card on shelf
    const curioShelfItem = screen.getByTestId('durable-card-knick_knack');
    expect(curioShelfItem).toBeInTheDocument();

    // Click to toggle wings
    fireEvent.click(curioShelfItem);

    // Wings should be visible
    expect(screen.getByTestId('curios-wing-left')).toBeInTheDocument();
    expect(screen.getByTestId('curios-wing-right')).toBeInTheDocument();

    // Check curio names and flavor
    expect(screen.getByText('Vintage Tin Robot')).toBeInTheDocument();
    expect(screen.getByText('Brass Carriage Clock')).toBeInTheDocument();
    expect(screen.getByText(/"A cute tin robot\."/i)).toBeInTheDocument();

    // Discard button
    const discardBtn = screen.getByTestId('btn-discard-curio-curio_1');
    fireEvent.click(discardBtn);
    expect(onAction).toHaveBeenCalledWith({
      type: 'discard_inventory_item',
      itemType: 'knick_knacks',
      curioId: 'curio_1'
    });

    // Close button
    const closeBtn = screen.getByTestId('btn-close-curios-wings');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('curios-wing-left')).not.toBeInTheDocument();
  });
});

