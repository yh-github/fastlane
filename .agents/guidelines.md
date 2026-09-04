# Development Guidelines

## Testing & Configuration
- **Tiered Testing (No Monolithic Runs During Iteration)**: Do NOT run `npm test` (~27s) during quick editing loops. Use **Tier 1** (`npx vitest related <file>` or `npx vitest run <file>.test.ts`, ~0.5s-1.5s) for instant feedback, **Tier 2** (`npm run test:unit`, ~9.4s) before finishing, and **Tier 3** (`npm test`) only once at the end.
- **Zero Redundancy**: In sequential tasks, do NOT run baseline tests if `git status` is clean and the previous turn already verified the test suite.
- **Fragile Tests Awareness**: Consult `docs/fragile_tests.md` before modifying core engine, UI copy, or campaign data.
- **No Test Fallbacks**: NEVER change the code or add inline fallbacks (e.g. `?? default_value`) just so that tests have something to test instead of the actual code. Tests should ALWAYS test the actual code with explicit configurations. 
- **Explicit Test State**: Tests being explicit about what configurations are needed to run a module is a positive pattern (classic dependency injection).
- **Fail Fast over Wrong State**: Fallbacks are an anti-pattern as they hide missing configurations. Errors and crashes are preferred over silent wrong state due to missing configuration values.

## UI Design & Soft Disabling
- **Default to Soft Disabling**: Unless explicitly requested otherwise, game action buttons should be **softly disabled** rather than hard disabled (`disabled={true}`).
- **Definition of Soft Disabling**:
  - The button visually appears disabled/unavailable (e.g. `opacity: 0.55`, muted/grayed-out borders and background, `cursor: 'pointer'`).
  - The button remains clickable (`disabled` attribute is NOT set).
  - When clicked while conditions are unmet (insufficient money, hours, physical/mental condition, clothes, degrees, etc.), the action does not execute; instead, the player is provided with an in-world explanation explaining WHY the action cannot be performed (e.g., delivered via the SpeechBubble next to the building clerk's face or an explanation modal).
