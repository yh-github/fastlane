# Space Capping Module Walkthrough

Implemented the **Space Capping** module (enabled for the Advanced campaign), introducing capacity limits to housing, item space footprints, clutter scaling with mess, apartment downgrade restrictions, pawn shop capacity adjustments, and the new **Penthouse Suite** housing tier.

---

## Key Changes

### 1. Game Rules & Data Definitions
- Added `spaceCapping?: boolean` to [`GameRules`](file:///home/yoavh/code/antigravity/fastlane/src/engine/rules.ts) (defaults to `false` for classic backward compatibility, set to `true` in `advanced/config.json`).
- Added optional `space?: number` to `ItemDef` and `spaceCap?: number` to `HousingDef` in [`src/engine/dataLoader.ts`](file:///home/yoavh/code/antigravity/fastlane/src/engine/dataLoader.ts).
- Added `space` attributes to all durables in [`public/campaigns/advanced/items.json`](file:///home/yoavh/code/antigravity/fastlane/public/campaigns/advanced/items.json):
  - **Dictionary**: 1 space
  - **Atlas**: 1 space
  - **Encyclopedia**: 2 space
  - **VCR**: 1 space
  - **Microwave / TV / Stereo**: 2 space
  - **Freezer**: 3 space
  - **Computer / Refrigerator / Stove**: 4 space
  - **Hot Tub**: 9 space
- Configured housing space caps in [`public/campaigns/advanced/housing.json`](file:///home/yoavh/code/antigravity/fastlane/public/campaigns/advanced/housing.json):
  - **The Streets**: 0 space
  - **Low-Cost Housing**: 10 space
  - **Security Apartments**: 25 space
  - **Penthouse Suite**: 75 space ($850/mo, +50 Lifestyle value)

### 2. Core Engine Calculations
- In [`src/engine/statMath.ts`](file:///home/yoavh/code/antigravity/fastlane/src/engine/statMath.ts):
  - `calcUsedSpace(player, campaign, includeMess)`: Calculates total space taken by appliances, books, and clutter/mess (`Math.ceil(mess / 10)`).
  - `calcHousingSpaceCap(player, campaign)`: Returns the current housing tier's space capacity.
  - Enhanced `calcMaxMess` to support the Penthouse housing tier.

### 3. Shopping & Action Reducer Constraints
- In [`src/engine/shoppingEngine.ts`](file:///home/yoavh/code/antigravity/fastlane/src/engine/shoppingEngine.ts):
  - Added space constraint validation to `buyItem`, rejecting with `{ key: 'action.error.notEnoughSpace', params: { home, item } }` when space cap would be exceeded.
- In [`src/engine/gameReducer.ts`](file:///home/yoavh/code/antigravity/fastlane/src/engine/gameReducer.ts):
  - `buy_item`: Validates space limits before purchasing items.
  - `move_apartment`: Checks if player's existing durables fit inside target housing (`calcUsedSpace(player, campaign, false) <= targetCap`). Old mess does not prevent moving down (mess is reset upon moving).
  - `pawn_item`: Removed 6-item cap when `spaceCapping` is true (allowing pawn shop to hold arbitrary items).
  - `redeem_item` & `buy_pawn_item`: Validates space capacity before returning pawned items to inventory.

### 4. UI & Translations
- In [`src/locales/en.json`](file:///home/yoavh/code/antigravity/fastlane/src/locales/en.json) & [`src/locales/he.json`](file:///home/yoavh/code/antigravity/fastlane/src/locales/he.json):
  - Added `"action.error.notEnoughSpace": "You don't have enough space in your {{home}} for {{item}}."`
  - Added `"action.error.notEnoughSpaceMove": "You have too many belongings to move into {{targetName}}."`
- In [`src/ui/BuildingInteractions.tsx`](file:///home/yoavh/code/antigravity/fastlane/src/ui/BuildingInteractions.tsx):
  - `StoreFront`: Renders `📦 X space` badges on durables and dims/disables items with informative tooltips when space is full.
  - `RentOffice`: Dynamically lists all housing tiers with capacity gauges (`📦 Capacity: X space`) and disables moving down when possessions exceed space.
- In [`src/ui/BuildingModal.tsx`](file:///home/yoavh/code/antigravity/fastlane/src/ui/BuildingModal.tsx):
  - Wired clerk speech bubbles to communicate space rejections on purchase, redemption, and lease signing.
- In [`src/ui/Dashboard.tsx`](file:///home/yoavh/code/antigravity/fastlane/src/ui/Dashboard.tsx):
  - Added `📦 Space: X/Y` badge with breakdown tooltip (durables vs clutter mess).

---

## Verification Results

### Automated Tests
- **New Test Suite**: [`src/engine/spaceCapping.test.ts`](file:///home/yoavh/code/antigravity/fastlane/src/engine/spaceCapping.test.ts) (15 tests passing):
  - Empty inventory vs appliances & books footprint
  - Mess space scaling (`Math.ceil(mess / 10)`)
  - `buyItem` space capacity limits & mess trap
  - Downgrade move restrictions (durables vs old mess reset)
  - Pawn shop redemption space validation & uncapped pawning in advanced mode
  - Penthouse suite capacity and lifestyle
- **Full Test Suite**: `npx vitest run` — **47 test files passed, 434 tests passed** (100% pass rate).
- **Vite Build**: `npx vite build` — Succeeded with zero errors.
