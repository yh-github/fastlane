---
description: Tiered testing methodology to eliminate redundant test runs and handle fragile code areas
---

# Testing Workflow & Fragility Rules

When making changes in this repository, follow these testing guidelines to maximize speed and prevent redundant test execution:

## 1. Zero-Redundancy Sequential Rule
- In sequential agent interactions, **DO NOT run baseline tests** if `git status` is clean and the previous turn already verified the test suite. Assume the repository is green.
- Only run a baseline check if you are investigating an existing bug report or unverified dirty working tree.

## 2. The 3-Tier Testing Pyramid
Do NOT use the monolithic `npm test` (which takes ~27 seconds due to tsc, vite build, vitest, and Playwright) for small iterative edits. Use the tiered approach:

| Tier | Command | Runtime | When to Use |
|---|---|---|---|
| **Tier 1 (Inner Loop)** | `npx vitest run <file>.test.ts`<br>`npx vitest related <file.ts> --run` | **~0.5s - 1.5s** | Run during active code editing for immediate feedback on the modified code. |
| **Tier 1.5 (Engine Fast)**| `npm run test:fast` | **~2.9s** | Run when modifying pure engine logic (runs all 32 engine test files; skips JSDOM and heavy fuzz). |
| **Tier 2 (Unit Suite)** | `npm run test:unit` | **~9.4s** | Run once after completing multi-file changes to ensure no cross-engine regressions. |
| **Tier 3 (Delivery Gate)**| `npm test` | **~27s** | Run **only once** at the very end of the task before final delivery/commit. |

## 3. Consult the Fragile Tests Registry
Before editing core engine files, UI components, or campaign data, consult [`docs/fragile_tests.md`](file:///home/yoavh/code/antigravity/fastlane/docs/fragile_tests.md):
- **Replay Regression Snapshots** (`src/engine/replayRegression.test.ts`): If you change game formulas, action logs, or player state schemas, update snapshots deliberately with `-u`.
- **UI Exact Text Matchers** (`BuildingInteractions.test.tsx`, `BuildingModal.test.tsx`): Be aware that changing button text, prices, or hospitality subtext will affect strict regex/string matchers.
- **Translation Completeness** (`src/locales/translationInterpolation.test.tsx`): If adding new keys/parameters, always update both `en.json` and `he.json`.
- **Campaign Referential Integrity** (`tests/campaignIntegrity.test.ts`): Run after editing any JSON file in `public/campaigns/`.
- **Playwright E2E** (`tests/e2e/gameplayFlows.spec.ts`): Ensure any newly added modal overlays or confirmation prompts are accounted for so clicks are not intercepted.
