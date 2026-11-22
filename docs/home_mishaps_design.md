# Home Mishaps (Low-Cost Housing) — Game Design & System Interactions

> **Status:** Design Document (High Priority — Next for `advanced_2000`)  
> **Scope:** `advanced_2000` (with optional rule-gated portability to `advanced` / Advanced 90's)  
> **Primary Touchpoints:** [`eventEngine.ts`](file:///home/yoavh/code/antigravity/fastlane/src/engine/eventEngine.ts), [`maintenanceAndDecayPhase.ts`](file:///home/yoavh/code/antigravity/fastlane/src/engine/turn/maintenanceAndDecayPhase.ts), [`housingMath.ts`](file:///home/yoavh/code/antigravity/fastlane/src/engine/math/housingMath.ts), [`turnProcessor.ts`](file:///home/yoavh/code/antigravity/fastlane/src/engine/turnProcessor.ts), [`buildings.json`](file:///home/yoavh/code/antigravity/fastlane/public/campaigns/advanced_2000/buildings.json#L3-L15)

---

## 1. Game-Design First Analysis: Why Home Mishaps Exist

Notice that [`advanced_2000/buildings.json`](file:///home/yoavh/code/antigravity/fastlane/public/campaigns/advanced_2000/buildings.json#L3-L15) already describes **Low-Cost Housing** as *"Subject to mishaps and high mess"* and **Le Security Apartments** as *"safe from robberies and slum mishaps"*.

### The Core Gameplay Problem in Classic & Advanced 90's
1. **The "Empty Apartment" Exploitable Safety**: Wild Willy apartment burglaries (`processApartmentRobbery` in [`eventEngine.ts`](file:///home/yoavh/code/antigravity/fastlane/src/engine/eventEngine.ts#L138-L230)) only hurt you if you own stealable (non-built-in) appliances (`stolenCount === 0` cancels the robbery silently!). A min-maxing player can camp in **Low-Cost Housing** (`low_cost`) for half the game with minimal appliances, paying low rent and suffering **zero** housing downside.
2. **Insufficient Incentive to Upgrade Early**: Upgrading to **Security Apartments** (`security`) doubles base rent and increases move fees, yet offers little tangible protection beyond stopping Wild Willy theft (which `protectBuiltInAppliances: true` already neutralizes for Stove/Fridge/Freezer) and higher `spaceCap` (`250` vs `100`).
3. **Passive Mess Tolerance**: Once a player accepts a small `mentalConditionMax` penalty, letting `mess` drift around `12–18` has limited acute danger unless they try to host guests.

### Design Objectives for Home Mishaps
- **Make Low-Cost Housing feel genuinely run-down without unfair death spirals.**
- **Reward preventative play** (cleaning mess, maintaining appliances, improving Landlord Standing, spending time at home).
- **Avoid "double jeopardy" RNG frustration** (never hit a player with both a Wild Willy burglary and a Home Mishap on the same turn).
- **Create rich cross-system counterplay** with the new Dishwasher, Robot Vacuum, Cooking, Spare Parts, and Parks.

---

## 2. The 4 Home Mishap Archetypes (Low-Cost Housing Only)

All mishaps are gated by `enableHomeMishaps: true`, restricted to `player.currentHousingId === 'low_cost'` (and never trigger in `security` or `penthouse`, or on early grace turns `< willyRobberyStartWeek`, e.g., Turn 1–3).

| Mishap | Trigger Condition | Mechanical Effect | Player Counterplay / Prevention |
| :--- | :--- | :--- | :--- |
| **1. Plumbing Leak / Burst Pipe** | Random eligible Low-Cost Housing roll (`~25%` of mishaps). | **`+12` Mess** (capped at `lowCostMessMax`), **`-2 Mental`**. | Clean immediately, hire Cleaning Service (`1h`, `` `$100` ``), or spend extra time mitigating clutter before it jams appliances. |
| **2. Electrical Short / Power Surge** | Weighted by **number of working appliances** owned (requires `>= 1` working appliance). | Breaks **1 working appliance** (`isBroken = true`, prioritized toward non-built-ins or random working appliance) + **`-1 Mental`**. | Repair via **DIY Fix** (`6h`, gains `+0.5 Skill_Tech`, boosted `+20%` by Pawn Shop **Spare Parts**) or pay Repairman (`1h`). |
| **3. Pest Infestation (Roaches / Mice)** | **Strictly State-Driven**: Eligible **only** when `mess >= 15` **AND** (`freshFoodUnits > 0` or `cannedFoodUnits > 0`). | Spoils **`1–2` `freshFoodUnits`** (if any), adds **`+4 Mess`**, inflicts **`-3 Mental`** (triggers `+1 resilienceBonus` if drop >= threshold!). | **100% Preventable!** Keep apartment `mess < 15` via DIY Clean, Cleaning Service, **Dishwasher**, or **Robot Vacuum**. |
| **4. Boiler / Hot Water Outage** | Baseline fallback (can hit even an empty starter apartment with `0` appliances and `0` mess). | **`-2 Physical`**, **`-2 Mental`** at turn start (freezing showers / drafty pipes). | Gives empty-apartment campers a real reason to upgrade to **Security Apartments** or build Landlord Standing. |

> **Why Pests Are State-Driven:** Punishing a tidy player with random roaches feels arbitrary. Making Pests strictly conditional on `mess >= 15` + food turns apartment cleanliness—and the **Dishwasher** / **Robot Vacuum**—into genuine preventative armor rather than just a passive Lifestyle/Max-Mental slider.

---

## 3. Deep System Interaction Matrix

### 3.1 Wild Willy Burglaries (`processApartmentRobbery`)
* **Unified "Low-Cost Incident Cap"**:
  * A Low-Cost Housing tenant can experience **at most 1 housing incident per turn** (either a Wild Willy burglary **OR** a Home Mishap, never both).
  * **Resolution Order**:
    1. Roll Wild Willy burglary as usual (gated by `homeTimeHistory` moving average).
    2. If **not robbed**, roll Home Mishap (`baseChance` ~`15%–20%`, reduced slightly by `homeTimeThisTurn` because being home catches leaks/shorts before they escalate).
    3. If **robbed**, skip Home Mishaps for that turn so a player is never double-punished in a single week transition.

### 3.2 Dishwasher & Robot Vacuum (Direct Ecosystem Loop)
* **Robot Vacuum (`clutter threshold = 20`)**:
  * Under normal mess growth, the Robot Vacuum keeps `mess` well below `15`, **passively preventing Pest Infestations** every week.
  * **Counterplay — Plumbing Leak Spike**: If a Plumbing Leak adds `+12 Mess` (say from `10 → 22`), it pushes `mess > 20`, **jamming the Robot Vacuum** on the following turn (`events.robotVacuumStuck`) and crossing the `15` Pest threshold until the player manually clears the flood!
  * **Counterplay — Electrical Short**: Can break the Robot Vacuum or Dishwasher itself, turning a passive luxury into an acute maintenance task.
* **Dishwasher**:
  * Eliminating kitchen mess (`0` mess on Stove/Microwave/Canned) and cutting party mess by `1/3` keeps the apartment far below the `mess >= 15` Pest trigger.

### 3.3 Space Capping (`spaceCapping: true`) & Hosting (`socialize_guests`)
* In [`housing.json`](file:///home/yoavh/code/antigravity/fastlane/public/campaigns/advanced/housing.json#L13-L16), Low-Cost Housing has **`spaceCap: 100`**, and `mess` occupies space `1:1` ([`calcUsedSpace`](file:///home/yoavh/code/antigravity/fastlane/src/engine/math/housingMath.ts#L61-L82)).
* A `+12 Mess` Plumbing Leak instantly eats `12` space:
  * If a player has `82` space of durables + `10` mess (`92 / 100`), a burst pipe spikes them to `100 / 100` (overflowing), temporarily **blocking `socialize_guests`** (`freeSpace < 10`), **blocking new appliance purchases** until cleaned, and inflating **Move-Out Fees** (`calcMovingFee` charges `` `$50` `` per mess point over `10`) if they try to flee to Security Apartments without cleaning first!

### 3.4 Cooking, Pantry & Fast Food
* **Pests** spoiling `1–2` `freshFoodUnits` punish hoarding weeks of fresh groceries inside a filthy (`mess >= 15`) Low-Cost apartment—even inside a Refrigerator or Freezer.
* **Electrical Short** breaking a **Stove** or **Microwave** forces the player into longer fallback prep (`3.0h` cold counter-thaw from a standalone Freezer, `0.5h` cold salad, or eating Canned/Red Pirate fast food) until repaired.
* Breaking a **Refrigerator** triggers the existing `delayRobberyFoodSpoilage`-style 1-turn grace period vs. immediate repair urgency. *(Design choice: Electrical Short breaking Fridge/Freezer should either grant a 1-turn grace period before spoilage, since `processPostHealthMaintenance` already runs after `processHealthAndFoodPhase`, giving the player 1 full turn to repair it before end-of-turn spoilage! Notice this matches existing `turnProcessor.ts` phase ordering cleanly.)*

### 3.5 Pawn Shop `Spare Parts`, `Skill_Tech` & Appliance Condition
* Electrical Shorts create natural demand for **Pawn Shop Rummage Bins (`spare_parts`)** (`+20%` DIY fix bonus) and reward **Electronics / Tech** players (`+2.5%` per `skillTech` + `+0.5 skillTech` on successful DIY fix).
* Socket City ("New") vs. Z-Mart ("Used") already differentiates breakdown rate (`1/51` vs `1/36`), while Electrical Shorts target Low-Cost Housing infrastructure regardless of brand—further motivating the move to **Security Apartments** before buying a `` `$1599` `` Computer or `` `$750` `` Plasma TV.

### 3.6 Rent Office & Landlord Standing (`calcLandlordStanding`)
* In [`housingMath.ts`](file:///home/yoavh/code/antigravity/fastlane/src/engine/math/housingMath.ts#L97-L207), players already build `LandlordStanding` (`0–100`) through on-time/advance rent payments, clean apartments (`mess <= 2` = `+5`), Dependability, and Social.
* **High-Standing Slumlord Relief**:
  * If `LandlordStanding >= 60` when a **Plumbing Leak** or **Boiler Outage** hits, the landlord actually responds promptly:
    * Cuts Plumbing Leak mess in half (`+6` instead of `+12`) or grants a `` `$50` `` **Rent Credit / Emergency Plumber Voucher** (`rentPaidUntilWeek` / cash offset) as a tangible mechanical reward for maintaining good tenant standing!

### 3.7 City Parks & Coffee (Escape Valve)
* When a Plumbing Leak ruins Home Relax mental recovery (`messPenalty = floor(mess / 5)`) or a Boiler Outage chips away at Physical/Mental condition, **City Parks** (`enableParkSystem`) and **Red Pirate / Arcade** act as immediate out-of-apartment recovery alternatives while the player buys time to clean or relocate.

---

## 4. Pacing & Anti-Frustration Guardrails

1. **Grace Period**: No Home Mishaps before `eventRules.willyRobberyStartWeek` (Turn 4), protecting the fragile opening weeks.
2. **Cooldown**: At least **2 turns** cooldown after a Mishap (or Burglary) before another Mishap can strike the same player (`player.turnFlags` / `lastMishapTurn` tracker).
3. **Homelessness (`street`)**: Players living on the street do not roll apartment mishaps (they have no plumbing, appliances, or boiler).
4. **No Infinite Death Loops**: None of the 4 mishaps reduce `physicalConditionMax` or `mentalConditionMax` directly (they affect current condition, mess, food, or appliance `isBroken` status), keeping recovery completely in the player's hands.

---

## 5. Open Design Questions to Finalize Before Coding

1. **Should `enableHomeMishaps` completely replace or coexist with Wild Willy burglaries?**
   * *Recommendation:* **Coexist under the Unified Low-Cost Incident Cap** (1 incident max per turn). Burglaries punish unguarded valuables; Mishaps punish neglected living conditions (`mess >= 15`) and empty-apartment camping.
2. **Should Low-Cost Appliances (Stove/Fridge/Freezer) be eligible for Electrical Shorts?**
   * *Recommendation:* **Yes** (since `processPostHealthMaintenance` runs *after* `processHealthAndFoodPhase`, breaking a Fridge/Freezer naturally gives the player 1 full turn to repair it before end-of-turn spoilage!), while leaving `protectBuiltInAppliances` focused on physical theft.
3. **Backporting to Advanced 90's**: Once tuned in `advanced_2000`, `enableHomeMishaps` should be clean to expose as an optional rule toggle for `advanced` (Advanced 90's) as well.
