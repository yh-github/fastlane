---
trigger: always_on
description: High-level map of campaign families, version isolation rules, and authoritative documentation pointers
---

# Campaign Versions & Variant Scope

*The Fast Lane* separates pure engine rules (`src/engine/`) from data-driven campaign bundles (`public/campaigns/`). Active editions are listed in `public/campaigns/campaigns.json` and organized into two inheritance families:

1. **Classic / Base Family**: `1990_classic_floppy` → `1990_classic_cdrom` → `qol_improved`
   - Never alter authentic Sierra behavior inside `1990_classic_floppy` or `1990_classic_cdrom`; gate bugfixes and QoL improvements behind optional rule toggles in `src/engine/rules.ts`.
2. **Advanced Family**: `advanced` ("Advanced 90's") → `advanced_2000` ("Advanced 2000") → `scrubs` ("Scrubs", medical edition)
   - New subsystems and overhauls live here via `config.json` rules and campaign JSON overrides.

For the full breakdown of campaign inheritance, rule toggles, and subsystem differences, consult `docs/implementation_and_variants_guide.md`. For codebase architecture and file locations, consult `docs/CODE_GUIDE.md`.
