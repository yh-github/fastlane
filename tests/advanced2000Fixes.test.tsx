import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { loadCampaign, type CampaignBundle } from '../src/engine/dataLoader';
import { createPlayerState, createDefaultGoalAllotment } from '../src/engine/stateFactories';
import { gameReducer } from '../src/engine/gameReducer';
import { BuildingModal } from '../src/ui/BuildingModal';
import { getClerkFace } from '../src/ui/buildingModal/clerkDialogue';
import { ItemCardModal } from '../src/ui/buildings/home/DurableCardModal';
import { Dashboard } from '../src/ui/Dashboard';
import type { GameState, PlayerState } from '../src/engine/gameState';

// Mock PixiJS entirely so mapRenderer can initialize headless
vi.mock('pixi.js', () => {
  class Graphics {
    x = 0; y = 0; visible = true; scale = { set: vi.fn() };
    clear() {} rect() {} drawRect() {} drawPolygon() {}
    circle() {} fill() {} setStrokeStyle() {} stroke() {} addChild() {} on() {} moveTo() {} lineTo() {}
  }
  class Container {
    x = 0; y = 0;
    children: any[] = [ { addChild: vi.fn() } ];
    scale = { set: vi.fn() };
    addChild() {}
  }
  class Application {
    stage = new Container();
    canvas = document.createElement('canvas');
    init = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
    get renderer() { return true; }
  }
  class Text {
    anchor = { set: vi.fn() };
    x = 0; y = 0;
    text = '';
    style: any = {};
    constructor(opts?: any) {
      if (opts?.text) this.text = opts.text;
      if (opts?.style) this.style = opts.style;
    }
  }
  class Sprite {
    x = 0; y = 0; width = 0; height = 0; visible = true;
    scale = { set: vi.fn() };
    anchor = { set: vi.fn() };
    texture = { source: { scaleMode: 'nearest' } };
  }
  return {
    Application,
    Graphics,
    Container,
    Text,
    Sprite,
    Assets: {
      load: vi.fn().mockResolvedValue({ source: { scaleMode: 'nearest' } })
    }
  };
});

describe('Advanced 2000 Targeted Fixes Verification', () => {
  let campaign2000: CampaignBundle;

  beforeEach(async () => {
    campaign2000 = await loadCampaign('advanced_2000');
  });

  function setupContext(player: PlayerState, overrides?: Partial<GameState>) {
    return {
      campaign: campaign2000,
      rules: campaign2000.config.gameRules,
      state: {
        turn: 1,
        players: [player],
        economicIndex: 100,
        rules: campaign2000.config.gameRules,
        pawnShopItemsForSale: [],
        rngState: 42,
        phase: 'playing',
        ...overrides,
      } as GameState
    };
  }

  // 1. Authentic curve support for Advanced 2000
  it('Fix 1: Advanced 2000 supports authentic curve with proper park locations and authentic paths', () => {
    expect(campaign2000.config.gameRules.authenticCurvedPaths).toBe(true);
    expect(campaign2000.map.authenticNodes).toBeDefined();
    expect(campaign2000.map.authenticNodes?.['node_park_campus']).toEqual({ x: 592.5, y: 633.75 });
    expect(campaign2000.map.authenticNodes?.['node_park_east']).toEqual({ x: 1147.5, y: 592.5 });
    expect(campaign2000.map.authenticNodes?.['node_park_west']).toEqual({ x: 56.25, y: 311.25 });
    expect(campaign2000.map.edges?.length).toBe(16);
  });

  // 2. Parks look visually different from normal locations
  it('Fix 2: Parks do not register text labels on the board (tree icon / green dot only)', async () => {
    const { initMapRenderer, getBuildingLabel } = await import('../src/graphics/mapRenderer');
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 1200, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 800, configurable: true });

    const cleanup = await initMapRenderer({
      container,
      mapData: campaign2000.map,
      buildings: campaign2000.buildings,
      assetBasePath: '/campaigns/advanced_2000',
      authenticCurvedPaths: true,
      guiStyle: 'generated',
      onNodeClick: () => {}
    });

    // Regular buildings have their text labels on the board
    expect(getBuildingLabel('red_pirate')).toBe('The Red Pirate');
    expect(getBuildingLabel('hospital')).toBe('City General Hospital');

    // Parks do NOT have text labels on the board
    expect(getBuildingLabel('campus_park')).toBeUndefined();
    expect(getBuildingLabel('west_green')).toBeUndefined();
    expect(getBuildingLabel('eastside_park')).toBeUndefined();

    cleanup();
  });

  // 3. Clock & Week #X placement when authentic curve is OFF
  it('Fix 3: When authentic curve is OFF, clock uses schematic floating class avoiding campus park obstruction', async () => {
    const { GameSession } = await import('../src/ui/GameSession');
    const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_low_cost', campaign2000.config);
    const state: GameState = {
      turn: 1,
      players: [player],
      economicIndex: 100,
      rules: {
        ...campaign2000.config.gameRules,
        authenticCurvedPaths: false,
        hudLayout: 'side'
      },
      pawnShopItemsForSale: [],
      rngState: 42,
      phase: 'playing'
    };

    const { rerender } = render(
      <GameSession
        initialGameState={state}
        campaign={campaign2000}
        onQuitToTitle={() => {}}
        onGameOver={() => {}}
      />
    );

    const clock = screen.getByTestId('bottom-center-clock');
    expect(clock).toHaveClass('bottom-center-clock--schematic');
    expect(clock).not.toHaveClass('bottom-center-clock--authentic');
    // Digital badge with week number is inside the same unified clock container
    expect(clock.querySelector('#hud-clock-digital')).toHaveTextContent(/Week #1/i);
  });

  // 4. Red Pirate: Pirate emoji and ALL HANDS ON DECK only when employed
  it('Fix 4: Red Pirate uses pirate flag emoji and only shows ALL HANDS ON DECK if employed there', () => {
    expect(getClerkFace('red_pirate', 'restaurant')).toBe('🏴‍☠️');

    const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_burger', campaign2000.config);
    const redPirate = campaign2000.buildings.find(b => b.id === 'red_pirate')!;

    // Scenario A: Player does NOT work there, but it is a busy week
    const { rerender } = render(
      <BuildingModal
        player={player}
        currentBuildingId="red_pirate"
        campaign={campaign2000}
        turn={1}
        rules={campaign2000.config.gameRules}
        economicIndex={100}
        busyLocations={{ red_pirate: true }}
        onAction={async () => {}}
        onClose={() => {}}
      />
    );

    expect(screen.queryByText(/ALL HANDS ON DECK/i)).not.toBeInTheDocument();
    expect(screen.getByText('🏴‍☠️')).toBeInTheDocument();

    // Scenario B: Player works at Red Pirate as pirate_cook
    const employedPlayer = { ...player, currentJobId: 'pirate_cook' };
    rerender(
      <BuildingModal
        player={employedPlayer}
        currentBuildingId="red_pirate"
        campaign={campaign2000}
        turn={1}
        rules={campaign2000.config.gameRules}
        economicIndex={100}
        busyLocations={{ red_pirate: true }}
        onAction={async () => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/ALL HANDS ON DECK/i)).toBeInTheDocument();
  });

  // 5 & 8. Arcade mechanics and standard icons
  it('Fix 5 & 8: Arcade does not give happiness in 2000, gives Mental & Social with diminishing returns, and uses standard icons', () => {
    const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_burger', campaign2000.config);
    player.hoursRemaining = 20;
    player.money = 50;
    player.mentalCondition = 30;
    player.social = 10;
    player.happiness = 40;
    player.physicalCondition = 40;

    // Play 1: Mental +2, Social +1, NO Happiness increase
    const r1 = gameReducer(player, { type: 'play_arcade' }, setupContext(player));
    expect(r1.updatedPlayer.mentalCondition).toBe(32);
    expect(r1.updatedPlayer.social).toBe(11);
    expect(r1.updatedPlayer.happiness).toBe(40);
    expect(r1.updatedPlayer.turnFlags.arcadePlaysThisTurn).toBe(1);

    // Play 2: Mental +2, Social +1
    const r2 = gameReducer(r1.updatedPlayer, { type: 'play_arcade' }, setupContext(r1.updatedPlayer));
    expect(r2.updatedPlayer.mentalCondition).toBe(34);
    expect(r2.updatedPlayer.social).toBe(12);

    // Play 3: Diminishing returns: Mental +1, Social 0
    const r3 = gameReducer(r2.updatedPlayer, { type: 'play_arcade' }, setupContext(r2.updatedPlayer));
    expect(r3.updatedPlayer.mentalCondition).toBe(35);
    expect(r3.updatedPlayer.social).toBe(12);

    // Play 4+: Playing all day causes physical fatigue / eye strain: Physical -1
    const r4 = gameReducer(r3.updatedPlayer, { type: 'play_arcade' }, setupContext(r3.updatedPlayer));
    expect(r4.updatedPlayer.physicalCondition).toBe(39);
    expect(r4.updatedPlayer.mentalCondition).toBe(35);

    // Check UI uses standard icons and dynamic feedback
    render(
      <BuildingModal
        player={player}
        currentBuildingId="red_pirate"
        campaign={campaign2000}
        turn={1}
        rules={campaign2000.config.gameRules}
        economicIndex={100}
        onAction={async () => {}}
        onClose={() => {}}
      />
    );

    // Check standard icons on arcade corner: ⏳ -1h • 💰 -$5 • +2 🧠 • +1 👥
    expect(screen.getByText(/⏳ -1h • 💰 -\$5 • \+2 🧠 • \+1 👥/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Play Arcade \(💰 \$5\)/i })).toBeInTheDocument();
  });

  // 6. Monolith Burger items removed from Red Pirate
  it('Fix 6: Normal Monolith Burger items are removed from Red Pirate', () => {
    const redPirate = campaign2000.buildings.find(b => b.id === 'red_pirate')!;
    const itemIds = redPirate.inventory?.map(i => i.itemId) || [];
    expect(itemIds).not.toContain('hamburger');
    expect(itemIds).not.toContain('cheeseburger');
    expect(itemIds).not.toContain('fries');
    expect(itemIds).not.toContain('cola');
    expect(itemIds).toContain('scurvy_slaw');
    expect(itemIds).toContain('kraken_burger');
    expect(itemIds).toContain('grog_shake');
    expect(itemIds).toContain('drip_coffee');
  });

  // 7. Item cards do not have "+-1 on buy"
  it('Fix 7: Item cards format negative on_buy modifiers as -1 instead of +-1', () => {
    const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_burger', campaign2000.config);
    const scurvySlaw = campaign2000.items.find(i => i.id === 'scurvy_slaw')!;

    render(
      <ItemCardModal
        item={scurvySlaw}
        player={player}
        campaign={campaign2000}
        rules={campaign2000.config.gameRules}
        economicIndex={100}
        mode="shop"
        onAction={() => {}}
        onClose={() => {}}
      />
    );

    // Must NOT contain +-1
    expect(screen.queryByText(/\+-1/)).not.toBeInTheDocument();
    // Must contain clean "-1 on buy"
    expect(screen.getByText(/-1 on buy/i)).toBeInTheDocument();
  });

  // 9. Parks: No clerk face, no welcome speech bubble, standard button icons
  it('Fix 9: Parks have no clerk face, no welcome speech bubble, and buttons use standard icons', () => {
    const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_park_campus', campaign2000.config);

    render(
      <BuildingModal
        player={player}
        currentBuildingId="campus_park"
        campaign={campaign2000}
        turn={1}
        rules={campaign2000.config.gameRules}
        economicIndex={100}
        onAction={async () => {}}
        onClose={() => {}}
      />
    );

    // Park face is tree icon 🌳, not a human face 🤔
    expect(screen.getByText('🌳')).toBeInTheDocument();
    expect(screen.getByText('Campus Commons Park')).toBeInTheDocument();
    // No welcoming speech bubble
    expect(screen.queryByText(/How can I help you today/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Welcome/i)).not.toBeInTheDocument();

    // Standard button icons
    expect(screen.getByText(/⏳ -1h • \+1 💪 • \+1 🧠/i)).toBeInTheDocument();
    expect(screen.getByText(/⏳ -2h • \+1 💪 • \+1 Max 💪 • -1 🧠/i)).toBeInTheDocument();
    expect(screen.getByText(/⏳ -2h • \+1 💪 • \+2 🧠/i)).toBeInTheDocument();
  });

  // Coffee card & no "Nutrition happiness"
  it('Coffee items do not count as food/eating, do not preserve with fridge, and do not invent Nutrition happiness', () => {
    const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_burger', campaign2000.config);
    const dripCoffee = campaign2000.items.find(i => i.id === 'drip_coffee')!;
    expect(dripCoffee.category).toBe('coffee');

    const { unmount } = render(
      <ItemCardModal
        item={dripCoffee}
        player={player}
        campaign={campaign2000}
        rules={campaign2000.config.gameRules}
        economicIndex={100}
        mode="shop"
        onAction={() => {}}
        onClose={() => {}}
      />
    );

    // Header badge is ☕ COFFEE, not 🥗 FOOD
    expect(screen.getByText('☕ COFFEE')).toBeInTheDocument();
    expect(screen.queryByText('🥗 FOOD')).not.toBeInTheDocument();

    // Ownership detail shows consumed immediately
    expect(screen.getByText('☕ Consumed immediately')).toBeInTheDocument();

    // Drinks immediately / not food
    expect(screen.getByText(/Drinks immediately \(Not food\)/i)).toBeInTheDocument();

    // Must NEVER claim to be fresh food preserving with fridge
    expect(screen.queryByText(/Fresh food \(Preserves with Fridge\)/i)).not.toBeInTheDocument();

    // Must NEVER show invented "Nutrition happiness"
    expect(screen.queryByText(/Nutrition happiness/i)).not.toBeInTheDocument();

    unmount();

    // Also check fresh groceries do NOT have the invented "Nutrition happiness"
    const groceries = campaign2000.items.find(i => i.id === 'food_1week')!;
    render(
      <ItemCardModal
        item={groceries}
        player={player}
        campaign={campaign2000}
        rules={campaign2000.config.gameRules}
        economicIndex={100}
        mode="shop"
        onAction={() => {}}
        onClose={() => {}}
      />
    );
    expect(screen.queryByText(/Nutrition happiness/i)).not.toBeInTheDocument();
  });

  it('HelpfulGUI displays Caffeine tolerance and status on Dashboard and ItemCardModal', () => {
    const player = createPlayerState('p1', 'Alex', false, createDefaultGoalAllotment(), 'node_burger', campaign2000.config);
    player.caffeineTolerance = 7;
    player.turnFlags = { ...player.turnFlags, coffeeCupsThisTurn: 1 };

    // 1. Dashboard displays caffeine badge with withdrawal warning
    const { unmount } = render(
      <Dashboard
        player={player}
        gameState={{ turn: 2, rules: campaign2000.config.gameRules, economicIndex: 100 } as any}
        turn={2}
        campaign={campaign2000}
        economicIndex={100}
        economicReading={100}
        economicTrend={0}
        hoursPerTurn={60}
        onSelectLogFilter={() => {}}
        onOpenInventory={() => {}}
        onOpenGoals={() => {}}
        onOpenSettings={() => {}}
      />
    );

    expect(screen.getByText('7/10')).toBeInTheDocument();
    expect(screen.getByText('Withdrawal')).toBeInTheDocument();
    unmount();

    // 2. Coffee card in shop under helpfulUI presents tolerance, potency, detox/habit forecast, and withdrawal warning
    const dripCoffee = campaign2000.items.find(i => i.id === 'drip_coffee')!;
    render(
      <ItemCardModal
        item={dripCoffee}
        player={player}
        campaign={campaign2000}
        rules={campaign2000.config.gameRules}
        economicIndex={100}
        mode="shop"
        onAction={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/☕ Tolerance: 7\/10 \(Withdrawal • 75% 🧠 \/ 70% 💪 potency\)/i)).toBeInTheDocument();
    expect(screen.getByText(/☕ 1 cup this turn: Maintains tolerance/i)).toBeInTheDocument();
    expect(screen.getByText(/⚠️ Next Turn: -2 💪, -2 🧠/i)).toBeInTheDocument();
  });
});
