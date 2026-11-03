---
description: Rule for presenting numbers and reasonable rounding across UI and user-facing content
---

# Number Presentation & Reasonable Rounding Rule

Whenever presenting numbers (hours, stats, currency, durations, scores, percentages) in the user interface, HUD, modals, dialogues, summary cards, or logs, ALWAYS apply context-appropriate, reasonable rounding:

1. **No Raw Floating-Point Numbers**:
   - Never expose raw IEEE-754 floating-point precision to the user (e.g. `15.857142857142858h left`, `$420.000000000004`, `5.333333333333333`).
   - Use `Math.round()`, `toFixed()`, or centralized formatters before displaying numeric values.

2. **Overview & Summary Contexts**:
   - For overview screens, high-level previews, resume dialogs, and save summary cards, display whole numbers without unnecessary precision.
   - If a number has a fractional or approximate value, use an approximation prefix `~` (e.g. `~16h left` instead of `15.857142857142858h left`). Exact whole numbers should display cleanly without `~` (e.g. `36h left`).

3. **In-Game Stats & HUDs**:
   - Remaining turn time / hours: Use centralized formatters (`formatHours`, `formatQuarterHours`, or `formatApproxHoursLeft` from `src/engine/math/formatters.ts`).
   - Money and financial values: Display as integers (`Math.round()` / `Math.floor()`) or standard currency format (e.g. `$420`).
   - Percentages & progress bars: Round to whole percentages or at most 1 decimal place.

4. **Testing & Fallbacks**:
   - When writing UI unit or integration tests, ensure numeric assertions account for rounded or approximate formatting (e.g. regex matching `/(?:~)?\d+h left/i`).
