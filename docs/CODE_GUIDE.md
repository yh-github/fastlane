# Fast Lane Modernized — Codebase Architecture & Concept Guide

Welcome! This guide is the central reference for understanding how **Fast Lane Modernized** is structured. When implementing new features, tweaking game mechanics, fixing bugs, or modifying balancing, consult this document to locate which files to change and understand the execution flow.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Action & Turn Execution Pipeline](#2-action--turn-execution-pipeline)
3. [Concept-to-Code Mapping Directory](#3-concept-to-code-mapping-directory)
   - [3.1 Careers, Employment & Wages](#31-careers-employment--wages)
   - [3.2 Education, Studying & Degrees](#32-education-studying--degrees)
   - [3.3 Housing, Rent, Relocation & Eviction](#33-housing-rent-relocation--eviction)
   - [3.4 Shopping, Items, Food, Clothing & Storage Limits](#34-shopping-items-food-clothing--storage-limits)
   - [3.5 Banking, Loans, Interest & Stock Portfolio](#35-banking-loans-interest--stock-portfolio)
   - [3.6 Pawn Shop & Forfeiture System](#36-pawn-shop--forfeiture-system)
   - [3.7 Health, Physical & Mental Wellbeing, Mess & Social](#37-health-physical--mental-wellbeing-mess--social)
   - [3.8 Crime, Street Robberies & Apartment Burglary](#38-crime-street-robberies--apartment-burglary)
   - [3.9 Macroeconomy, Market Crashes & Booms](#39-macroeconomy-market-crashes--booms)
   - [3.10 Weekly Turn Lifecycle, Time Management & Weekends](#310-weekly-turn-lifecycle-time-management--weekends)
   - [3.11 Win Conditions & Score Calculations](#311-win-conditions--score-calculations)
   - [3.12 AI Opponents & Decision Making](#312-ai-opponents--decision-making)
   - [3.13 Map Graph, Pathfinding & Canvas Animations](#313-map-graph-pathfinding--canvas-animations)
   - [3.14 UI Components, Building Dialogs & Clerk NPC Dialogue](#314-ui-components-building-dialogs--clerk-npc-dialogue)
   - [3.15 Campaign Data, JSON Schemas & Rule Configs](#315-campaign-data-json-schemas--rule-configs)
4. [Step-by-Step Developer Recipes](#4-step-by-step-developer-recipes)
   - [Recipe A: Adding a New Player Action](#recipe-a-adding-a-new-player-action)
   - [Recipe B: Adding a New Building or Interactive Station](#recipe-b-adding-a-new-building-or-interactive-station)
   - [Recipe C: Adding a New Item, Appliance, or Synergy](#recipe-c-adding-a-new-item-appliance-or-synergy)
   - [Recipe D: Adding a New Turn-Start Event or Rule Modifier](#recipe-d-adding-a-new-turn-start-event-or-rule-modifier)
5. [Testing & Quality Gates](#5-testing--quality-gates)

---

## 1. High-Level Architecture

The project enforces a strict boundary between **Engine Logic**, **Campaign Data**, **UI Components**, and **Canvas Rendering**:

```
┌────────────────────────────────────────────────────────┐
│               Campaign Data (/campaigns)               │
│    JSON files: items, jobs, housing, education, map    │
└───────────────────────────┬────────────────────────────┘
                            │ (loaded via dataLoader.ts)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Engine (/src/engine)                 │
│  Pure deterministic game rules, state reducer, math    │
│  - /actions: Action handlers for player moves          │
│  - /turn: Turn start lifecycle phases                  │
│  - statMath.ts, economyEngine.ts, eventEngine.ts       │
└───────────────────────────┬────────────────────────────┘
                            │ (reactive state updates)
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│     UI Layer (/src/ui)    │ │ Graphics (/src/graphics)  │
│  React 19 Components      │ │ PixiJS Canvas Rendering   │
│  - /buildings: Modals     │ │ - mapRenderer.ts          │
│  - Dashboard, GameLog     │ │ - pathfinding.ts          │
└───────────────────────────┘ └───────────────────────────┘
```

### Core Design Rules
1. **Immutable State**: State is never mutated in place. All reducers and engine functions take current state and return a new state object.
2. **Data-Driven Logic**: Base prices, job requirements, degree requirements, map coordinates, and items reside in JSON files under `campaigns/classic_1990/` (or future campaign variants), not hardcoded in TypeScript.
3. **Deterministic Randomness**: All random decisions use the `Random` class with seed state preserved in `GameState.rngState` and recorded in `ReplayContext`.
4. **Isolated Domain Modules**: Domain rules are partitioned into focused files $\le 300$ lines.

---

## 2. Action & Turn Execution Pipeline

### Action Flow (Player Action $\rightarrow$ State Update)
```
1. User interacts with UI (e.g. clicks "Work" in JobBoard or clicks a Map Node).
2. UI calls onAction(payload) from BuildingModal / useGameEngine.
3. useGameEngine.handleAction(payload):
   a. Calls gameReducer(player, action, context) in src/engine/gameReducer.ts.
   b. gameReducer delegates to specific handler in src/engine/actions/*.
   c. Handler performs validation, applies stat/money changes, spends time, and returns updated player + actionLog.
   d. gameReducer synchronizes active item effects (recalculatePlayerEffects).
   e. useGameEngine calls calculateStatDiffsAndAnimate to trigger floating HUD animations.
   f. Log entry with stat diffs is appended to GameLog.
   g. Clerk NPC in BuildingModal reacts with contextual dialogue (computeClerkResponse).
```

### Turn Start Flow (Next Week Initialization)
```
1. Turn ends (player runs out of hours or clicks "End Turn").
2. Player animates home.
3. turnProcessor.processTurnStart(state, campaign, replay):
   a. processEconomicTurnPhase: Fluctuate economy index, evaluate market crash/boom.
   b. For each player:
      - Reset turn time clock (60 hours) and turnFlags.
      - Grow apartment mess & calculate mental condition caps.
      - Apply turn-start item effects (cooking, hot tub bonuses).
      - processMaintenanceAndDecayPhase: Winner check, weekend events, lottery, computer profit, dependability decay, apartment burglary.
      - Recalculate player active effects.
      - processHealthAndFoodPhase: Food spoilage, eating, starvation penalty, doctor check.
      - processHousingAndLoanPhase: Rent charge/debt, clothing durability decay, loan default check.
      - processPostHealthMaintenance: Appliance breakage/repairs, donations, newspaper headline.
      - processPawnExpiration: Forfeit 3-week-old pawned items to second-hand store.
   c. Check game over conditions.
4. UI displays WeekendScreen and TurnEventsQueue modal.
```

---

## 3. Concept-to-Code Mapping Directory

Use this table as a quick cheat-sheet for where to find and edit game mechanics:

| Game Concept / Mechanic | Engine Logic | UI Component | Data / Config |
| :--- | :--- | :--- | :--- |
| **Job Application / Hiring / Wages** | `src/engine/actions/jobActions.ts`<br>`src/engine/jobEngine.ts` | `src/ui/buildings/JobBoard.tsx` | `campaigns/classic_1990/jobs.json` |
| **Work Shifts / Raises / Overtime** | `src/engine/actions/jobActions.ts` | `src/ui/buildings/JobBoard.tsx` (WorkStation) | `config.json` (`timeRules`) |
| **Education / Classes / Degrees** | `src/engine/actions/educationActions.ts`<br>`src/engine/educationEngine.ts` | `src/ui/buildings/UniversityRegistry.tsx` | `campaigns/classic_1990/education.json` |
| **Housing / Rent / Eviction / Moving** | `src/engine/actions/housingActions.ts`<br>`src/engine/turn/housingAndLoanPhase.ts` | `src/ui/buildings/RentOffice.tsx` | `campaigns/classic_1990/housing.json` |
| **Home Activities (Relax / Clean / Social)** | `src/engine/actions/homeActions.ts` | `src/ui/buildings/HomeRelax.tsx` | `config.json` (`statRules`) |
| **Shopping / Purchasing Items** | `src/engine/actions/shoppingActions.ts`<br>`src/engine/shoppingEngine.ts` | `src/ui/buildings/StoreFront.tsx` | `campaigns/classic_1990/items.json` |
| **Space Limits (Appliance/Book caps)** | `src/engine/spaceCapping.ts` | `src/ui/buildings/StoreFront.tsx` | `campaigns/classic_1990/housing.json` |
| **Food Storage / Spoilage / Starvation** | `src/engine/turn/healthAndFoodPhase.ts`<br>`src/engine/eventEngine.ts` | `src/ui/Dashboard.tsx` | `config.json` (`timeRules.starvationPenalty`) |
| **Clothing Durability & Decay** | `src/engine/clothingDecay.ts`<br>`src/engine/turn/housingAndLoanPhase.ts` | `src/ui/buildings/HomeRelax.tsx`<br>`src/ui/InventoryModal.tsx` | `config.json` (`statRules`) |
| **Banking (Savings / Loans / T-Bills)** | `src/engine/actions/financeActions.ts` | `src/ui/buildings/BankInterface.tsx` | `campaigns/classic_1990/stocks.json` |
| **Stock Market (Buy/Sell/Dividends)** | `src/engine/actions/financeActions.ts`<br>`src/engine/economyEngine.ts` | `src/ui/buildings/BankInterface.tsx` | `campaigns/classic_1990/stocks.json` |
| **Pawn Shop (Pawn / Redeem / Forfeit)** | `src/engine/actions/pawnActions.ts`<br>`src/engine/turn/pawnTurnPhase.ts` | `src/ui/buildings/PawnShop.tsx` | `config.json` |
| **Health, Doctor Visits, Physical/Mental** | `src/engine/turn/healthAndFoodPhase.ts`<br>`src/engine/statMath.ts` | `src/ui/Dashboard.tsx` | `config.json` (`statRules`) |
| **Apartment Robbery (Wild Willy)** | `src/engine/eventEngine.ts`<br>`src/engine/turn/maintenanceAndDecayPhase.ts` | `src/ui/TurnEventsQueue.tsx` | `config.json` (`eventRules`) |
| **Street Robbery (Map Interception)** | `src/engine/eventEngine.ts`<br>`src/hooks/useGameEngine.ts` | `src/ui/StreetRobberyModal.tsx`<br>`src/graphics/mapRenderer.ts` | `config.json` (`eventRules`) |
| **Macroeconomy (Fluctuation, Crash, Boom)** | `src/engine/turn/economicTurnPhase.ts`<br>`src/engine/economyEngine.ts` | `src/ui/Dashboard.tsx` | `config.json` (`eventRules`) |
| **Item Synergies & Passive Effects** | `src/engine/synergyEngine.ts` | `src/ui/Dashboard.tsx` | `campaigns/classic_1990/synergies.json` |
| **Weekend Activities** | `src/engine/weekendEngine.ts` | `src/ui/WeekendScreen.tsx` | `campaigns/classic_1990/weekends.json` |
| **Win Conditions & Scoring** | `src/engine/statMath.ts`<br>`src/engine/turn/maintenanceAndDecayPhase.ts` | `src/ui/GameOverScreen.tsx` | `config.json` (`winConditions`) |
| **AI Opponent Decision Logic** | `src/engine/aiEngine.ts`<br>`src/engine/aiTranslator.ts` | `src/hooks/useGameEngine.ts` (runAi loop) | Engine heuristics |
| **Movement, Graph & Map Animation** | `src/graphics/pathfinding.ts`<br>`src/graphics/mapRenderer.ts` | `src/ui/GameMap.tsx` | `campaigns/classic_1990/map.json` |
| **Clerk NPC Dialogue & Avatars** | `src/ui/buildingModal/clerkDialogue.ts` | `src/ui/BuildingModal.tsx`<br>`src/ui/SpeechBubble.tsx` | `src/locales/en.json` (`clerkDialogs`) |

---

### 3.1 Careers, Employment & Wages
- **Files to Change**:
  - `src/engine/actions/jobActions.ts`: Handles `apply` and `work` actions, wage calculations, raise checks, fatigue penalties.
  - `src/engine/jobEngine.ts`: Helper methods for checking job qualifications (`canApplyForJob`), promotion eligibility, experience/dependability bounds.
  - `src/ui/buildings/JobBoard.tsx`: Renders the Job Board listing available jobs, interview feedback modal, and the interactive WorkStation shift buttons.
  - `campaigns/classic_1990/jobs.json`: Definitions of job titles, hourly wages, requirements (experience, dependability, degrees, dress code), and workplace node IDs.

### 3.2 Education, Studying & Degrees
- **Files to Change**:
  - `src/engine/actions/educationActions.ts`: Handles `enroll` and `study` actions, study hour costs, lesson increments, degree completion triggers.
  - `src/engine/educationEngine.ts`: Qualification checks, tuition costs, degree stat boosts calculation (`degreeExpBoost`, `degreeDepBoost`).
  - `src/ui/buildings/UniversityRegistry.tsx`: Degree catalog, enrollment buttons, study progress bars, graduation modal.
  - `campaigns/classic_1990/education.json`: Degree curriculum, lessons required, tuition costs, prerequisite degrees.

### 3.3 Housing, Rent, Relocation & Eviction
- **Files to Change**:
  - `src/engine/actions/housingActions.ts`: Handles `rent_transaction`, `move_apartment`, `pay_rent_advance`, `ask_rent_extension`.
  - `src/engine/turn/housingAndLoanPhase.ts`: Turn-start rent checks, 4-week lease cycle deductions, extension expiry, rent debt accumulation, and eviction triggers.
  - `src/ui/buildings/RentOffice.tsx`: Rent payment dialogs, landlord negotiations, apartment upgrade selections.
  - `campaigns/classic_1990/housing.json`: Base rent prices, max appliance capacities, max book limits, robbery immunity flags (`isRobberyImmune`), home node positions.

### 3.4 Shopping, Items, Food, Clothing & Storage Limits
- **Files to Change**:
  - `src/engine/actions/shoppingActions.ts`: Handles `buy` actions for appliances, clothing, food, tickets, lottery.
  - `src/engine/spaceCapping.ts`: Enforces housing inventory capacity limits (`canStoreItem`, `getStorageCapacity`).
  - `src/engine/turn/healthAndFoodPhase.ts`: Fresh food spoilage when exceeding refrigerator capacity, fast food consumption.
  - `src/ui/buildings/StoreFront.tsx`: Store inventory display, pricing with economic inflation, purchase confirmation.
  - `campaigns/classic_1990/items.json`: Item categories (`appliance`, `clothes`, `food`, `ticket`, `book`), base prices, tags, lifestyle values.

### 3.5 Banking, Loans, Interest & Stock Portfolio
- **Files to Change**:
  - `src/engine/actions/financeActions.ts`: Handles `bank_transaction` (deposit/withdraw), `take_loan`, `pay_loan`, `buy_stock`, `sell_stock`.
  - `src/engine/turn/housingAndLoanPhase.ts`: Loan payment deadline tracking (week 4 reminder, week 1 default penalties).
  - `src/engine/economyEngine.ts`: Stock price fluctuation based on economic trend, dividend payouts.
  - `src/ui/buildings/BankInterface.tsx`: Bank teller interface, loan application wizard, stock broker trading desk.
  - `campaigns/classic_1990/stocks.json`: Stock definitions (T-Bills, Blue Chip, Penny Stocks, Volatility factors).

### 3.6 Pawn Shop & Forfeiture System
- **Files to Change**:
  - `src/engine/actions/pawnActions.ts`: Handles `pawn_item`, `redeem_item`, `buy_pawn_item`.
  - `src/engine/turn/pawnTurnPhase.ts`: Checks pawned items past 3 turns and forfeits them to `pawnShopItemsForSale`.
  - `src/ui/buildings/PawnShop.tsx`: Pawn shop UI for appraisal, redemption slips, second-hand clearance rack.

### 3.7 Health, Physical & Mental Wellbeing, Mess & Social
- **Files to Change**:
  - `src/engine/turn/healthAndFoodPhase.ts`: Doctor visit triggers (forced or probabilistic based on low condition), starvation penalties.
  - `src/engine/statMath.ts`: Mess growth formula (`messGrowth`), mental condition ceilings (`calcMaxMental`), wellbeing composite score.
  - `src/engine/actions/homeActions.ts`: Relaxing at home, cleaning mess, hiring cleaning service, socializing.
  - `src/ui/buildings/HomeRelax.tsx`: Home relaxation dashboard, TV/music interactions, cleaning controls.

### 3.8 Crime, Street Robberies & Apartment Burglary
- **Files to Change**:
  - `src/engine/eventEngine.ts`: Apartment robbery calculation (`processApartmentRobbery`), street robbery calculation (`processStreetRobbery`), stolen item selection.
  - `src/engine/turn/maintenanceAndDecayPhase.ts`: Apartment burglary execution at turn start.
  - `src/hooks/useGameEngine.ts`: Street robbery interception when exiting Bank or Black Market.
  - `src/graphics/mapRenderer.ts`: `animateRobberInterception` robber sprite run-in animation.
  - `src/ui/StreetRobberyModal.tsx`: Visual alert modal when robbed on the street.

### 3.9 Macroeconomy, Market Crashes & Booms
- **Files to Change**:
  - `src/engine/turn/economicTurnPhase.ts`: Weekly random economic drift, market crash generation (minor, moderate, major), boom generation.
  - `src/engine/economyEngine.ts`: Price calculation with inflation (`calcEconomyPrice`), liquid asset evaluation (`calcLiquidAssets`).
  - `src/locales/en.json`: Newspaper headlines for crashes and booms (`newspaper.crash_major`, `newspaper.boom`, etc.).

### 3.10 Weekly Turn Lifecycle, Time Management & Weekends
- **Files to Change**:
  - `src/engine/turnProcessor.ts`: Coordinates the 6 modular turn phases.
  - `src/engine/turn/`: Directory containing each sequential phase module.
  - `src/engine/timeManager.ts`: Spending hours (`spendHours`), resetting player time clock (`resetPlayerClock`).
  - `src/engine/weekendEngine.ts`: Evaluates deterministic weekend events based on personality and activities.
  - `src/ui/WeekendScreen.tsx`: Weekend recap screen with event illustration and stat changes.
  - `src/ui/TurnEventsQueue.tsx`: Notification modal queue for turn start events.

### 3.11 Win Conditions & Scoring
- **Files to Change**:
  - `src/engine/statMath.ts`: `calcWealthProgress`, `calcEducationProgress`, `calcCareerProgress`, `calcWellbeingScore`.
  - `src/engine/turn/maintenanceAndDecayPhase.ts`: Evaluates player progress against goal targets (`goalAllotment`).
  - `src/ui/GameOverScreen.tsx`: Win declaration screen showing victory statistics.
  - `config.json`: Win condition rules and targets.

### 3.12 AI Opponents & Decision Making
- **Files to Change**:
  - `src/engine/aiEngine.ts`: Heuristic evaluation function `executeAITurn` scoring potential actions (work, study, buy food, relax).
  - `src/engine/aiTranslator.ts`: Visual simulation helpers for AI moves (`simulateActionVisuals`).
  - `src/hooks/useGameEngine.ts`: Autonomous turn execution loop in `useEffect`.

### 3.13 Map Graph, Pathfinding & Canvas Animations
- **Files to Change**:
  - `src/graphics/pathfinding.ts`: `buildAdjacencyMap`, `findShortestPath` (BFS-based shortest route between nodes).
  - `src/graphics/mapRenderer.ts`: PixiJS rendering of player tokens, walking path interpolation (`animatePlayerPath`), pulse highlights.
  - `src/ui/GameMap.tsx`: React wrapper for the PixiJS canvas.
  - `campaigns/classic_1990/map.json`: Node coordinates, connections/edges, building placement IDs.

### 3.14 UI Components, Building Dialogs & Clerk NPC Dialogue
- **Files to Change**:
  - `src/ui/BuildingModal.tsx`: Modal frame for building interactions.
  - `src/ui/buildingModal/clerkDialogue.ts`: `getClerkFace` avatar selector and `computeClerkResponse` dialogue generator.
  - `src/ui/buildings/`: Directory containing all specific building sub-components.
  - `src/ui/SpeechBubble.tsx`: Comic-style speech bubble overlay for clerk messages.
  - `src/locales/en.json`: All translation strings, building names, clerk greetings, and responses.

### 3.15 Campaign Data, JSON Schemas & Rule Configs
- **Files to Change**:
  - `src/engine/dataLoader.ts`: Schema validator and loader for campaign bundles (`loadCampaign`).
  - `src/engine/rules.ts`: Game rule presets and default options (`DEFAULT_GAME_RULES`).
  - `src/engine/stateFactories.ts`: Default player and game state initializers.
  - `campaigns/classic_1990/config.json`: Campaign metadata, time rules, stat rules, event rules.

---

## 4. Step-by-Step Developer Recipes

### Recipe A: Adding a New Player Action
1. **Define Action Type**: Add the action definition to `src/engine/actions/types.ts` in the `GameAction` union.
2. **Implement Domain Handler**:
   - Create or update the handler in `src/engine/actions/<domain>Actions.ts`.
   - Ensure the handler checks preconditions (e.g. player hours, money, location), returns error logs if invalid, and spends hours via `spendHours`.
3. **Export Handler**: Register the handler in `src/engine/actions/index.ts`.
4. **Dispatch in Reducer**: Add the `case 'your_action':` branch in `src/engine/gameReducer.ts`.
5. **Connect UI**: Call `onAction({ type: 'your_action', ...params })` from the appropriate component in `src/ui/buildings/`.
6. **Add Unit Tests**: Write unit tests in `src/engine/gameReducer.test.ts`.

### Recipe B: Adding a New Building or Interactive Station
1. **Add Building to Campaign**: Add the building entry to `campaigns/classic_1990/buildings.json` and associate a map node in `map.json`.
2. **Create UI Component**: Create `src/ui/buildings/NewBuildingInterface.tsx` implementing `InteractionProps`.
3. **Export from Barrel**: Export it from `src/ui/buildings/index.ts`.
4. **Add to Modal Switch**: Add the rendering case in `src/ui/BuildingModal.tsx` (`renderBuildingServices`).
5. **Add Clerk Avatar & Dialogue**:
   - Add avatar emoji in `src/ui/buildingModal/clerkDialogue.ts` (`getClerkFace`).
   - Add clerk dialogue keys in `src/locales/en.json` under `clerkDialogs.<building_id>`.

### Recipe C: Adding a New Item, Appliance, or Synergy
1. **Add Item Definition**: Add the item to `campaigns/classic_1990/items.json` with appropriate `category`, `basePrice`, `lifestyleValue`, and `effects`.
2. **Add Synergy (Optional)**: If item participates in a set bonus, define it in `campaigns/classic_1990/synergies.json`.
3. **Verify Passive Calculations**: If introducing new effect types, handle them in `src/engine/synergyEngine.ts` (`recalculatePlayerEffects` or `collectItemEffects`).
4. **Add Translation**: Add item name and description to `src/locales/en.json` under `item.<item_id>`.

### Recipe D: Adding a New Turn-Start Event or Rule Modifier
1. **Define Event/Rule**:
   - Add new rule flags to `GameRules` in `src/engine/rules.ts`.
   - Set default in `DEFAULT_GAME_RULES`.
2. **Implement Phase Logic**: Place the event logic in the appropriate module under `src/engine/turn/` (e.g. `maintenanceAndDecayPhase.ts` or `economicTurnPhase.ts`).
3. **Record Decisions for Replays**: Wrap any random rolls in `resolveDecision(replay, key, () => rng.next())`.
4. **Add Event Notification**: Push event object to `player.turnEvents` so it shows in `TurnEventsQueue`.
5. **Add Characterization Test**: Add test coverage in `src/engine/turnProcessor.test.ts`.

---

## 5. Testing & Quality Gates

To avoid redundant testing and maintain fast development iteration, developers and agents follow the **Tiered Testing Pyramid**. Consult [`docs/fragile_tests.md`](file:///home/yoavh/code/antigravity/fastlane/docs/fragile_tests.md) for code hotspots and fragile test catalogs.

### The 3-Tier Testing Pyramid

| Tier | Command | Runtime | When to Run | Purpose |
|---|---|---|---|---|
| **Tier 0** | `git status` | ~0.05s | Sequential start | If working tree is clean and previous task passed, **skip baseline tests**. |
| **Tier 1 (Inner Loop)** | `npx vitest run <file>.test.ts`<br>`npx vitest related <file.ts> --run` | **~0.5s - 1.5s** | Active editing | Rapid feedback on the code directly being changed. |
| **Tier 1.5 (Engine Fast)** | `npm run test:fast` | **~2.9s** | Engine edits | Runs all 32 engine test files (410+ tests); skips JSDOM UI and fuzz. |
| **Tier 2 (Unit Suite)** | `npm run test:unit` | **~9.4s** | Pre-delivery | Runs all 48 test files across the engine and UI. |
| **Tier 3 (Delivery Gate)** | `npm test` | **~27s** | Final gate | Runs full suite: `test:types`, `build`, `test:unit`, and Playwright E2E. |

```bash
# Rapid inner-loop testing for modified files
npx vitest related src/engine/statMath.ts --run

# Rapid engine verification (2.9s)
npm run test:fast

# Full unit suite (9.4s)
npm run test:unit

# Full verification gate (run once before final PR / push)
npm test
```

### Fragile Tests & Code Hotspots
Before making changes to core engine state, copy, or campaign data, review [`docs/fragile_tests.md`](file:///home/yoavh/code/antigravity/fastlane/docs/fragile_tests.md) for known sensitive tests:
- **Replay Regression** (`src/engine/replayRegression.test.ts`): Tests deterministic simulation. Update snapshots (`-u`) only on intentional balance/state changes.
- **UI Exact Text Matchers** (`BuildingInteractions.test.tsx`, `BuildingModal.test.tsx`): Strict string matchers for prices and button copy.
- **Translation Completeness** (`src/locales/translationInterpolation.test.tsx`): Verifies all keys and variables exist in both `en.json` and `he.json`.
- **Campaign Integrity** (`tests/campaignIntegrity.test.ts`): Graph connectivity and foreign keys across all campaigns.
- **State Invariants Fuzz** (`tests/stateInvariantsFuzz.test.ts`): 32+ turns of randomized fuzz testing checking for NaN or out-of-bounds stats.
- **Playwright E2E** (`tests/e2e/gameplayFlows.spec.ts`): Headless browser multi-week flow testing.

### Commit Guidelines
- Commit changes in small, self-contained atomic commits.
- Prefix commits with standard conventional prefixes: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`.
- Ensure each commit leaves the repository in a 100% passing state.
