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
/src        → All application code (engine, graphics, UI)
/campaigns  → 100% data-driven content (JSON + sprites, NO engine code)
/public     → Global static assets (UI chrome, favicon)
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

## Project Structure

| Path | Purpose |
|------|---------|
| `src/engine/` | Core game loop: stat math, time management, data loading |
| `src/graphics/` | PixiJS rendering and pathfinding |
| `src/ui/` | React components (Dashboard, ActionPanel, Tooltips) |
| `campaigns/classic_1990/` | Base game data (buildings, jobs, items, map, events) |
| `campaigns/modern_v2/` | Future expansion slot |
| `docs/` | Game Design Document |

## Sprint Roadmap

1. **Sprint 1 (Current):** Engine loop — JSON parsing, time progression, stat decay/growth
2. **Sprint 2:** PixiJS map rendering, pathfinding, click-to-move
3. **Sprint 3:** Full game flow — job system, education, shopping, events
4. **Sprint 4:** Polish — UI, animations, sound, win conditions

## License

Private — All rights reserved.
