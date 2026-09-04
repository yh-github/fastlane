# Fragile Tests & Code Hotspots Registry

This registry tracks fragile pieces of code and tests in the codebase. Its purpose is to help developers and AI agents know **where to focus attention**, anticipate test breaks before editing, avoid redundant verification, and work safer.

---

## 1. The Tiered Testing Methodology

To prevent redundant full test runs (which take ~27 seconds each) while maintaining complete code safety:

| Tier | Command | Runtime | When to Run | Purpose |
|---|---|---|---|---|
| **Tier 0** | `git status` | ~0.05s | At start of any sequential task | If working tree is clean and previous task passed, **skip baseline tests**. |
| **Tier 1 (Inner Loop)** | `npx vitest run <file>.test.ts` or `npx vitest related <file.ts> --run` | **~0.5s - 1.5s** | During active code edits | Rapid feedback on the code directly being changed. |
| **Tier 2 (Unit Suite)** | `npm run test:unit` | **~10s** | Before completing a multi-file task | Validates all 48 vitest test files across the engine and UI without e2e overhead. |
| **Tier 3 (Delivery Gate)** | `npm test` | **~27s** | Only once before final delivery/commit | Full sanity gate: `tsc --noEmit`, `vite build`, `vitest run`, and Playwright E2E. |

---

## 2. Fragile Tests Catalog

The following tests are sensitive to changes in specific areas. Check this table **before** making changes to understand likely failure modes.

### A. Replay Regression Tests
- **File**: [`src/engine/replayRegression.test.ts`](file:///home/yoavh/code/antigravity/fastlane/src/engine/replayRegression.test.ts)
- **Mechanism**: Validates determinism using `toMatchSnapshot()` against full multi-week recorded gameplays (`test_replay.json`, `fastlane-replay-21-weeks.json`).
- **Why It's Fragile**: Any change to:
  - Game formulas (wage calculations, rent calculations, health/mess rules)
  - Action log formatting or new action log properties
  - Reducer state properties or default values
  alters the replay outcome or the snapshot schema.
- **Triage & Handling**:
  - If a change was **deliberate** (e.g. rebalancing a formula or adding an engine attribute):
    1. Inspect the snapshot diff carefully to verify only intended changes occurred.
    2. Update snapshots: `npx vitest run src/engine/replayRegression.test.ts -u`.
  - If unintentional, the diff reveals a regression in engine determinism.

### B. UI Component Exact Text & Copy Matchers
- **Files**:
  - [`src/ui/BuildingInteractions.test.tsx`](file:///home/yoavh/code/antigravity/fastlane/src/ui/BuildingInteractions.test.tsx)
  - [`src/ui/BuildingModal.test.tsx`](file:///home/yoavh/code/antigravity/fastlane/src/ui/BuildingModal.test.tsx)
  - [`src/ui/Dashboard.test.tsx`](file:///home/yoavh/code/antigravity/fastlane/src/ui/Dashboard.test.tsx)
- **Mechanism**: Tests search DOM nodes using exact text strings or regex (e.g. `'Bank'` vs `'Banking'`, `'$100'`, or `'✨ Full Hospitality (-1 💪...'`).
- **Why It's Fragile**:
  - Copy changes, dynamic pricing changes, or adding descriptive emojis can break test assertions even when the UI behaves properly.
- **Triage & Handling**:
  - Prefer using flexible regex or `data-testid` selectors.
  - When updating subtext or button copy in components like `HomeRelax.tsx`, run `npx vitest related src/ui/buildings/HomeRelax.tsx --run` immediately to catch and align tests.

### C. Translation & Localization Verification
- **File**: [`src/locales/translationInterpolation.test.tsx`](file:///home/yoavh/code/antigravity/fastlane/src/locales/translationInterpolation.test.tsx)
- **Mechanism**: Scans every key in `en.json` and `he.json`, renders components, and asserts that no raw `{{...}}` interpolation templates remain in the DOM.
- **Why It's Fragile**:
  - Adding a translation key with a parameter in code without defining both English and Hebrew keys or passing missing parameters will trigger an instant failure.
- **Triage & Handling**:
  - Always update `public/locales/en.json` and `public/locales/he.json` together.
  - Test with `npx vitest run src/locales/translationInterpolation.test.tsx`.

### D. Campaign Referential & Structural Integrity
- **File**: [`tests/campaignIntegrity.test.ts`](file:///home/yoavh/code/antigravity/fastlane/tests/campaignIntegrity.test.ts)
- **Mechanism**: Loads all 4 campaigns (`1990_classic_floppy`, `1990_classic_cdrom`, `qol_improved`, `advanced`) and runs:
  - Bidirectional map connectivity & BFS shortest-path graph reachability
  - Foreign key checks for housing &rarr; `homeNodeId`, jobs &rarr; building IDs, store inventory &rarr; item IDs
  - Education prerequisite DAG cycle detection
- **Why It's Fragile**:
  - Editing any JSON file in `public/campaigns/` (e.g. `housing.json`, `jobs.json`, `map.json`) can unintentionally orphan a node or break a reference.
- **Triage & Handling**:
  - Run `npx vitest run tests/campaignIntegrity.test.ts` whenever touching `public/campaigns/`.

### E. Domain State Invariant Fuzzing
- **File**: [`tests/stateInvariantsFuzz.test.ts`](file:///home/yoavh/code/antigravity/fastlane/tests/stateInvariantsFuzz.test.ts)
- **Mechanism**: Simulates 20 turns of autonomous AI gameplay + 12 turns of randomized fuzzing across all 4 campaigns, checking:
  - No `NaN` in any stat or money balance
  - Hours remaining bounded \([0, \text{hoursPerTurn}]\)
  - Financials (savings, loan, rent debt) \(\ge 0\)
  - Stats (happiness, dependability, conditions, mess) within legal boundaries
  - Player always on a valid map node
- **Why It's Fragile**:
  - Any unclamped stat modification (e.g. subtracting without `Math.max(0, ...)` or dividing by zero) triggers a failure across thousands of random cycles.
- **Triage & Handling**:
  - Failures in this test almost always represent genuine logic bugs. Check the logged turn number, action type, and violated invariant in the test output.

### F. Playwright Headless End-to-End Flows
- **File**: [`tests/e2e/gameplayFlows.spec.ts`](file:///home/yoavh/code/antigravity/fastlane/tests/e2e/gameplayFlows.spec.ts)
- **Mechanism**: Real browser automation navigating 3 weeks of gameplay (relaxing, weekend screens, starting new turns).
- **Why It's Fragile**:
  - Modal overlay pointer interception (e.g. "Relax Anyway", "Game Over", or event popups) will block clicks and trigger a 30-second timeout.
- **Triage & Handling**:
  - If you introduce a modal or confirmation prompt during normal turn flow, ensure `gameplayFlows.spec.ts` checks for and dismisses the modal.

---

## 3. Code Hotspots & Test Impact Matrix

When editing these production files, expect the corresponding tests to be directly affected:

| Production File | What It Controls | Directly Impacted Tests |
|---|---|---|
| `src/engine/gameReducer.ts` | Core state transitions & action dispatcher | `gameReducer.test.ts`, `replayRegression.test.ts`, `stateInvariantsFuzz.test.ts` |
| `src/engine/statMath.ts` | Formulas for stats, decay, spaces, and costs | `statMath.test.ts`, `BuildingInteractions.test.tsx`, `balanceAndBurnout.test.ts` |
| `src/engine/actions/homeActions.ts` | Relax, clean, socialize, and apartment actions | `spaceCapping.test.ts`, `pawnItemBenefits.test.ts`, `BuildingInteractions.test.tsx` |
| `src/ui/buildings/HomeRelax.tsx` | UI buttons, dynamic pricing, and hospitality subtext | `BuildingInteractions.test.tsx`, `translationInterpolation.test.tsx` |
| `public/campaigns/**/*.json` | Game content, building catalogs, maps, and jobs | `campaignIntegrity.test.ts`, `advancedBundleExhaustive.test.ts`, `dataLoader.test.ts` |
| `src/engine/aiEngine.ts` | Autonomous GOAP decision planner | `aiEngine.test.ts`, `stateInvariantsFuzz.test.ts` |
