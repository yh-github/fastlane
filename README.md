# Fast Lane Modernized

A modern reimagining of *Jones in the Fast Lane* — built with TypeScript, React, and PixiJS.

## Tech Stack

- **TypeScript** — Strict typing throughout
- **React 19** — UI layer (HUD, menus, overlays)
- **PixiJS** — Canvas rendering (map, sprites, animations)
- **Vite** — Build tooling and dev server

## Architecture

The project strictly separates **engine logic** from **campaign data**:

```
/src                → All application code (engine, graphics, UI)
/public/campaigns   → 100% data-driven content (JSON + sprites, NO engine code)
/public             → Global static assets (UI chrome, favicon)
```

This enables:
- **Moddability** — Copy a campaign folder, change the JSON/sprites, get a new game
- **Testability** — Engine functions are pure, campaign data is just JSON
- **No inner-platform effect** — The engine reads data, it doesn't interpret scripts

## Quick Start

```bash
npm install
npm run dev
```

## Developer & Codebase Guide

For a comprehensive guide mapping all **game concepts to specific files**, architecture diagrams, execution pipelines, and development recipes, see:
👉 **[`docs/CODE_GUIDE.md`](./docs/CODE_GUIDE.md)**

For the authoritative breakdown of the **original Sierra SCI implementation**, how Base replicates it, and how QoL Improved and the **Advanced** family (`advanced`, `advanced_2000`, `scrubs`) diverge via optional rules and campaign data, see:
👉 **[`docs/implementation_and_variants_guide.md`](./docs/implementation_and_variants_guide.md)**

## Campaign Versions

Campaigns are organized into two families (registered in [`public/campaigns/campaigns.json`](./public/campaigns/campaigns.json)):

- **Classic / Base Family**: `1990_classic_floppy` → `1990_classic_cdrom` → `qol_improved`
- **Advanced Family**: `advanced` (Advanced 90's) → `advanced_2000` (Advanced 2000) → `scrubs` (Scrubs, medical edition)

## Project Structure

| Path | Purpose |
|------|---------|
| `src/engine/` | Core game loop: domain action reducers (`src/engine/actions/`), turn lifecycle (`src/engine/turn/`), stat math, economy |
| `src/graphics/` | PixiJS canvas rendering and pathfinding |
| `src/ui/` | React components (Dashboard, Building Modals in `src/ui/buildings/`, HUD, GameLog) |
| `public/campaigns/` | Campaign JSON bundles (`1990_classic_floppy`, `1990_classic_cdrom`, `qol_improved`, `advanced`, `advanced_2000`, `scrubs`) |
| `docs/` | Game Design Documents and Developer Code Guide |

## Sprint Roadmap

1. **Sprint 1 (Current):** Engine loop — JSON parsing, time progression, stat decay/growth
2. **Sprint 2:** PixiJS map rendering, pathfinding, click-to-move
3. **Sprint 3:** Full game flow — job system, education, shopping, events
4. **Sprint 4:** Polish — UI, animations, sound, win conditions

## License

Private — All rights reserved.
