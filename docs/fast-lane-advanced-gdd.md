# Game Design Document: Fast Lane — Advanced Edition

## 1. Executive Summary & Design Vision

**Fast Lane: Advanced Edition** is an expanded, modernized game variation of the classic 1990 life simulation board game. While preserving the core competitive loop (time management, career progression, higher education, financial markets, and housing tiers), the Advanced Edition replaces abstract, opaque mechanics with granular, transparent, and interconnected simulation systems.

### Core Pillars
1. **Cause-and-Effect Health & Wellbeing**: Rather than generic weekend doctor rolls, health is governed by distinct **Physical Condition** and **Mental Condition** stats, influenced by work overtime ("Grind"), diet quality, home cleanliness, and self-care.
2. **Home Living & Domestic Dynamics**: Housing is no longer just a rent bill. Apartments accumulate **Mess**, require maintenance, and can be upgraded with appliances (including a **Hot Tub**) to host guests and enhance lifestyle.
3. **Transparent & Resilient Progression**: Hidden penalties are replaced with explicit formulas, visual board animations (such as street robbery interceptions), and "bounce-back" self-care mechanics that reward players for recovering from hardships.
4. **Data-Driven Modularity**: All rules, thresholds, bonuses, and formulas are 100% configurable via campaign JSON (`public/campaigns/advanced/config.json`) without hardcoded magic numbers.

---

## 2. Comparison: Classic 1990 vs. Advanced Edition

| Dimension | Classic 1990 / Base Edition | Advanced Edition |
| :--- | :--- | :--- |
| **Wellbeing / Health** | Single abstract `Relaxation` stat | Distinct `Physical Condition` & `Mental Condition` |
| **Victory Goals** | 4 Goals: Wealth, Happiness, Education, Career | 5 Goals: Wealth, Lifestyle, Education, Career, **Wellbeing** |
| **Turn Start Regen** | Passive recovery / relaxation decay | No passive auto-regen; stats persist exactly as managed |
| **Overtime / Work** | Flat wage payout | 3 Tiers: Normal (1–3), Grind (4–7), Overtime (8+) |
| **Academic Study** | 1 lesson per session | 3 Tiers: Normal (1–3), Academic Grind (4–7), Hyper-Accelerating (8+) |
| **Fast Food** | Neutral consumable | Fast food drains Physical condition (-1 per item) |
| **Home Environment** | Static location | Dynamic **Mess** system; requires cleaning & services |
| **Social / Entertaining**| Non-existent | **Social** stat (1–99) & "Socialize / Entertain Guests" action |
| **Appliances** | Passive score / spoilage protection | Direct active bonuses to socializing, mess caps, and recovery |
| **Moving Penalties** | Flat deposit | Moving fee scaled by current mess and durable goods owned |
| **Doctor Visits** | Random RNG event | Triggered dynamically by low physical condition; yields $+8$ bounce-back |
| **Street Robbery** | Silent text log entry | Visual board piece interception animation + modal popup |
| **Work Modalities** | Single uniform work shift | 4 Strategic Modes: Work Work, Look Busy, Face Time, Cap-Busting Innovate |

---

## 3. Core Stat Architecture & Mathematical Formulas

### 3.1. Physical Condition
Represents the player's bodily stamina, nutrition, and physical health.

- **Starting Value**: `50`
- **Initial Max Cap**: `100` (`globalMaxPhysicalCondition = 100`)
- **Initial Min Floor**: `3` (`minPhysicalCondition = 3`, `globalPhysicalMin = 1`)
- **Starting Behavior**: Does **not** start at max value (`50 < 100`).
- **Safe Decrements**: Stat reductions cannot drop the stat below its minimum floor, nor can depleted stats be artificially boosted by draining actions.
- **Action Tiers (Work & Study)**:
  - **Work Actions 1–3 (Normal)**: `-1` Physical condition, `0` Mental.
  - **Work Actions 4–7 (Grind)**: `-1` Physical condition, `-1` Mental condition.
  - **Work Actions 8+ (Overtime)**: `-2` Physical condition, `-2` Mental condition.
  - **Study Actions 1–3 (Normal)**: `0` Physical condition, `-1` Mental condition.
  - **Study Actions 4–7 (Academic Grind)**: `0` Physical condition, `-2` Mental condition.
  - **Study Actions 8+ (Hyper-Accelerating)**: `-1` Physical condition, `-2` Mental condition.
- **Other Costs & Drains**:
  - Cleaning Apartment: `-1` Physical condition.
  - Socializing / Hosting Guests: `-1` Physical condition.
  - Fast Food Consumption (Fries, Shake, Cola, Astro Chicken): `-1` Physical condition per item.
  - Starvation / Spoiled Food: Reduces `minPhysicalCondition` by `-1` (min 1) and `physicalConditionMax` by `-1` (min 10).

### 3.2. Mental Condition
Represents psychological resilience, cognitive energy, and stress tolerance.

- **Starting Value**: `51` (effectively `50` at initial evaluation due to starting mess growth deduction)
- **Initial Max Cap**: `85` (`mentalMaxBaseValue = 86`, evaluating to $86 - \text{mess\_growth}(3) = 85$)
- **Initial Min Floor**: `5` (`minMentalCondition = 5`, `globalMentalMin = 1`)
- **Starting Behavior**: Does **not** start at max value (`51 < 85`).
- **Costs & Drains**:
  - Normal Study (Actions 1–3): `-1` Mental condition.
  - Academic Grind (Actions 4–7): `-2` Mental condition.
  - Hyper-Accelerating (Actions 8+): `-2` Mental condition, `-1` Physical condition.
  - Work Grind (Actions 4–7): `-1` Mental condition.
  - Work Overtime (Actions 8+): `-2` Mental condition, `-2` Physical condition.
  - Socialize (Entertaining Guests): Base cost $= X \times \text{mess\_growth}$, reduced by appliance bonuses.

### 3.3. Dynamic MAX_MENTAL Capacity Formula
Mental capacity expands and contracts organically based on domestic order, education, appliances, and past adversity:

$$\text{MAX\_MENTAL} = \max\left(10, \min\left(100, \text{mentalMaxBaseValue} - \text{mess\_growth}(\text{mess}) + \left\lfloor\frac{\text{social}}{10}\right\rfloor + \text{bonuses}\right)\right)$$

Where **bonuses** include:
1. **Books in Inventory**: $+1$ Max Mental per book owned (up to $+3$ max).
2. **Computer Owned**: $+3$ Max Mental.
3. **Completed Degrees**: $+1$ Max Mental per completed degree.
4. **Resilience Bonus**: $+1$ permanent bonus awarded whenever Mental condition suffers an acute, single-event shock ($\ge 3$ points dropped in a single action/event, i.e. $\Delta \le -3$). Incremental small drops do not accumulate toward resilience.

### 3.4. Social Stat (1–99)
- **Range**: `1` to `99` (Starts at `9`).
- **Decay**: Degrades by `-1` at Turn Start (down to minimum `1`).
- **Synergies & Formulas**:
  - **Dynamic Max Mental & Lifestyle**: Every 10 full points grants $+1$ to `MAX_MENTAL` and $+1$ to `Lifestyle` ($\lfloor\text{social}/10\rfloor$).
  - **Mental Relaxation Recovery**: Grants $+\lfloor\text{social}/15\rfloor$ extra Mental condition recovery when relaxing at home.
  - **Employability Bonus**: Grants $+\lfloor\text{social}/15\rfloor$ flat bonus to hiring roll threshold (`calcEmployabilityScore`).
  - **Dependability Decay Buffer**: Reduces turn-start Dependability decay by $\lfloor\text{social}/25\rfloor$ (clamped so weekly reduction is never less than 1 point: $\text{dep\_loss} = \max(1, \text{baseLoss} - \lfloor\text{social}/25\rfloor)$).
  - **Face Time Synergy**: Scaled Dependability gains ($\text{Dep Gain} = 1 + \frac{\lceil\text{Social}/25\rceil}{2}$, yielding $+1.5\text{--}3.0\text{ Dep}$) and smoothly diminishing networking probability ($\text{Chance} = \max(0, \frac{100 - \text{Social}}{100})$ for $+1\text{ Social}$).

### 3.5. Lifestyle Stat Formula
Lifestyle evaluates the player's standard of living:

$$\text{Lifestyle} = \text{HousingValue} + \sum \text{DurableValues} + \sum \text{ClothingValues} - \text{mess\_growth}(\text{current\_mess}) + \left\lfloor\frac{\text{social}}{10}\right\rfloor$$

### 3.6. Wellbeing Score (Victory Goal #5)
The 5th victory goal available in setup:

$$\text{Wellbeing\_Score} = \left\lceil \frac{\text{Physical Condition} + \text{Mental Condition}}{2} \right\rceil$$

---

## 4. Housing, Mess & Cleaning System

### 4.1. Housing Tiers & Capacity Limits
- **Low-Cost Apartment**:
  - Base Rent: $\$325$ (Deposit: $\$650$)
  - Max Mess Limit: `50` (Expanded to `55` with Hot Tub)
- **Security Apartment**:
  - Base Rent: $\$475$ (Deposit: $\$950$)
  - Max Mess Limit: `90` (Expanded to `95` with Hot Tub)
- **Global Mess Bounds**: Min `0`, Max `99`. Initial Starting Mess Min: `1`.

### 4.2. Mess Generation & Growth Math
- **Starting Mess** (New Game or Moving to New Apartment):
  $$\text{START\_MESS} = 3 + \text{num\_of\_durables\_owned}$$
- **Turn-Start Mess Growth**:
  $$\text{mess\_growth}(\text{current\_mess}) = \left\lfloor 0.2 \times (\text{current\_mess} + 1) \right\rfloor + 1$$

### 4.3. Cleaning Actions
1. **Clean Action (Self-Clean)**:
   - **Cost**: 3 Hours, 1 Physical condition.
   - **Effect**: Cleans $2d3$ mess ($1d3 + 1d3$, range 2–6 mess reduction).
2. **Call Cleaning Service**:
   - **Cost**: 1 Hour.
   - **Price**: $\$100$ base (scaled dynamically by the Economic Index).
   - **Effect**: Cleans `10` mess immediately.

### 4.4. Moving & Financial Penalties
- **Moving Fee**:
  $$\text{Moving\_Fee} = \max(0, \text{current\_mess} - 10) \times \$50 + (\text{num\_of\_durables\_owned} \times \$50)$$
- **Transparent Confirmation**: The Rent Office displays the exact cost breakdown (Deposit + Moving Fee) and requires explicit confirmation before committing.
- **Rent Extension Penalty**: Approval probability is reduced by current mess:
  $$\text{ApprovalChance} = \max(1, \text{baseChance} - \text{current\_mess})$$

---

## 5. Home Entertaining: The Socialize Subsystem

The **Socialize / Entertain Guests** action allows players to invite friends over to build their Social stat and relieve mental stress.

### 5.1. Action Parameters
- **Time Cost**: 6 Hours.
- **Physical Cost**: 1 Physical condition.
- **Guests Rolled**: $X = 1d3$ (1 to 3 guests).
- **Mess Generated**: $+ (X \times \text{mess\_growth}(\text{mess}))$.
- **Cash Cost**: $X \times \$25$ (Low-Cost) or $X \times \$50$ (Security).
- **Base Mental Cost**: $X \times \text{mess\_growth}(\text{mess})$.
- **Restriction**: Action is disabled if home Mess exceeds `25`.

### 5.2. Appliance Social Bonuses
Owning appliances at home drastically enhances the quality of social gatherings:
- **Black & White TV**: $+1$ Social gain, $-1$ Mental cost
- **Color TV**: $+2$ Social gain, $-2$ Mental cost
- **Microwave**: $+1$ Social gain, $-1$ Mental cost
- **VCR** (Requires TV owned): $+1$ Social gain, $-1$ Mental cost
- **Stereo**: $+1$ Social gain, $-1$ Mental cost
- **Hot Tub**: $+3$ Social gain, $-3$ Mental cost

### 5.3. Payout & Mental Recovery
- **Net Mental Cost**: $\text{FinalMentalCost} = \text{BaseMentalCost} - \text{ApplianceBonus}$.
  - If $\text{FinalMentalCost} < 0$, the mental cost turns into a **positive mental gain** (capped at `mentalConditionMax`).
- **Full Payment**: When cash and mental conditions are sufficient, grants full reward:
  $$\text{SocialReward} = (X \text{ or } 2X) + \text{ApplianceBonus}$$
- **Partial Payment**: If resources are insufficient, drains remaining cash/mental and grants:
  $$\text{PartialReward} = \left\lfloor\frac{X \text{ or } 2X}{2}\right\rfloor + \text{ApplianceBonus}$$

---

## 6. The Hot Tub Subsystem

The **Hot Tub** is a luxury appliance that transforms domestic rest and relaxation:
- **Passive Lifestyle Boost**: $+5$ Lifestyle value.
- **Mess Capacity Expansion**: Increases apartment mess ceiling by $+5$ (Low-Cost $50 \rightarrow 55$, Security $90 \rightarrow 95$).
- **Purchase Instant Bonus**: $+5$ Mental Condition on first purchase.
- **Turn-Start Passive Regeneration**: $+1$ Physical Condition and $+1$ Mental Condition per turn.
- **Upgraded Relax Action**:
  - With Hot Tub: Yields $+2$ Physical, $+1$ extra Mental (in addition to base relax gain), and generates $+2$ Mess.

---

## 7. Nutrition, Spoilage & Starvation

Food mechanics enforce realistic consequences for hunger and spoilage.

### 7.1. Turn-Start Order of Operations
Spoilage and Starvation checks run at the very beginning of turn processing, **before** Doctor Visit or Low Spirits rolls.

### 7.2. Starvation Penalties (No Food in Inventory / Fridge)
- Drains `minPhysicalCondition` by `-1` (min 1).
- Drains `physicalConditionMax` by `-1` (min 10).
- Drops `physicalCondition` directly to `minPhysicalCondition`.
- Drops `mentalCondition` by `-10`.

### 7.3. Spoiled Food Consumption
- Drains `minPhysicalCondition` by `-1` (min 1).
- Drains `physicalConditionMax` by `-1` (min 10).
- Reduces `physicalCondition` to:
  $$\max\left(\text{MIN\_Phys}, \min\left(\text{Phys} - 5, \left\lfloor \frac{10 \times \text{Phys}}{\text{MAX\_Phys}} \right\rfloor\right)\right)$$
- Drops `mentalCondition` by `-5`.
- **Doubles** the doctor visit probability for that turn.

---

## 8. Health Events & Bounce-Back Mechanism

### 8.1. Doctor Visit Check (Physical Condition)
- **Trigger**: Active when `physicalCondition < 10` (`physicalDoctorThreshold = 10`).
- **Probability**: `5%` per point below threshold (`(10 - physicalCondition) * 0.05`).
- **Effects**:
  - Drains cash for medical consultation ($30–$200).
  - Deducts `doctorPenalty` hours (10 hrs).
  - **Bounce-Back**: When treated by the doctor, the player recovers **+8 Physical Condition** (`doctorPhysicalBounceBack = 8`).

### 8.2. Burnout & Mental Health Leave (Mental Condition)
- **Trigger**: Active when `mentalCondition < 10` (`lowSpiritsThreshold = 10`).
- **Probability**: `5%` per point below threshold (`(10 - mentalCondition) * 0.05`).
- **Effects**:
  - **No Medical Fee**: Disentangled from physical medical visits ($0 medical fees).
  - **Leave Time**: Deducts `burnoutPenalty` (10 hrs) for mandatory mental health leave.
  - **Bounce-Back**: Recovers **+8 Mental Condition** (`lowSpiritsMentalBounceBack = 8`).
  - **Notification**: Displays *"You are burnt out! You took a mental health leave."* (`events.burnout`).

### 8.3. Robbery & Food Spoilage Grace Period (`delayRobberyFoodSpoilage`)
- When a refrigerator or freezer is stolen during turn start apartment robbery:
  - **Default (`delayRobberyFoodSpoilage = false`)**: Cooling capacity drops immediately, and food in excess of active storage spoils on that same turn start.
  - **Grace Period Mode (`delayRobberyFoodSpoilage = true`)**: The player is granted a 1-week grace period to replace their refrigerator/freezer before excess food rots.

---

## 9. Street Robbery Visual Notification & Interception

When exiting high-cash locations (Bank or Black's Market), a street robbery check occurs based on cash carried.

### Visual & Interactive Flow
1. **Board Interception**: A robber game piece (`👤` with red glowing trim) spawns near the building exit and animates directly toward the player's piece.
2. **Collision FX**: Upon collision, a red pulse flash triggers on the board.
3. **Notification Modal**: A dedicated, styled modal dialog pops up explaining that a thief intercepted the player and displays the exact cash amount stolen before movement resumes.

---

## 10. Workplace Dynamics & The 4 Work Modalities

In Advanced Edition, the workplace is no longer a simple button-clicking grind. Players choose between 4 distinct shift strategies based on their current stamina, career goals, financial needs, and corporate standing.

### 10.1. Work Work (Standard Shift)
- **Role**: Maximum cash flow and steady baseline career progression.
- **Wage**: $1.0\times\text{ BaseWage}$ (full pay).
- **Stamina Costs**: $1.0\times\text{ BasePhys}$, $1.0\times\text{ BaseMental}$ (subject to Grind/Overtime action tier scaling).
- **Stat Yield**: $+1.0\text{ Dependability}$, $+1.0\text{ Experience}$ (up to standard job caps).
- **Best For**: Wealth goals, paying rent, and steady career growth.

### 10.2. Look Busy (Conservation Shift)
- **Role**: Stamina conservation and avoiding exhaustion/burnout.
- **Wage**: $1.0\times\text{ BaseWage}$ (full pay).
- **Stamina Costs**: $0.5\times\text{ BasePhys}$, $0.5\times\text{ BaseMental}$ ($0.5\times$ fatigue penalty if Physical $< 10$).
- **Stat Yield**: $+0\text{ Dependability}$, $+0\text{ Experience}$.
- **Best For**: Surviving long work weeks when physical or mental condition is depleted without forfeiting income.

### 10.3. Face Time (Networking & Reputation Repair)
- **Role**: Corporate schmoozing, emergency dependability repair, and social networking.
- **Wage**: $\$0$ ($0.0\times\text{ BaseWage}$ — unpaid office politics).
- **Stamina Costs**: $0.5\times\text{ BasePhys}$, $\text{BaseMental} \times 1.0 + 2.0$ (office politics is mentally draining).
- **Dependability Gain**:
  $$\text{Dep Gain} = 1 + \frac{\lceil\text{Social}/25\rceil}{2}$$
  - Social 1–25: $+1.5\text{ Dep}$
  - Social 26–50: $+2.0\text{ Dep}$
  - Social 51–75: $+2.5\text{ Dep}$
  - Social 76–99: $+3.0\text{ Dep}$
- **Social Networking Gain**:
  $$\text{Chance to gain } +1\text{ Social} = \max\left(0, \frac{100 - \text{CurrentSocial}}{100}\right)$$
- **Best For**: Rapidly repairing low Dependability to avoid firing or qualifying for raises without spending time socializing outside work.

### 10.4. Innovate (High-Skill Cap-Busting $2\text{d}2 - 2$)
- **Role**: Technical research, breakthrough discoveries, and career goal acceleration.
- **Prerequisite**: Requires at least 1 completed University Degree.
- **Wage**: $0.5\times\text{ BaseWage}$ earned immediately per shift.
- **Stamina Costs**:
  - Physical: $1.0\times\text{ BasePhys}$.
  - Mental: $\mathbf{\text{BaseMental} + 2.0 + \text{innovationCount}}$. *(Escalates dynamically per breakthrough, creating an organic stamina ceiling that naturally bounds over-farming).*
- **Shift Outcome Roll ($2\text{d}2 - 2$)**:
  - **$25\%$ Chance ($X=0$): $+0\text{ Dep}, +2\text{ Exp}$**
    - *If $\text{Exp} \ge \text{MaxExp}$*: Expands $\text{xpMaxBonus} \mathrel{+}= 1$ and increments `innovationCount += 1`. Current Exp remains unchanged.
    - *Else*: $\text{Exp} = \min(\text{MaxExp}, \text{Exp} + 2)$.
  - **$50\%$ Chance ($X=1$): $+1\text{ Dep}, +1\text{ Exp}$**
    - Balanced standard progression up to caps.
  - **$25\%$ Chance ($X=2$): $+2\text{ Dep}, +0\text{ Exp}$**
    - *If $\text{Dep} \ge \text{MaxDep}$*: Expands $\text{depMaxBonus} \mathrel{+}= 1$ and increments `innovationCount += 1`. Current Dep remains unchanged.
    - *Else*: $\text{Dep} = \min(\text{MaxDep}, \text{Dep} + 2)$.
- **Corporate Clout & Perks**:
  - **Raise Requirement Discount**: $\text{EffectiveRaises} = \max(0, \text{RaisesReceived} - \text{innovationCount})$.
  - **Firing Safety Buffer**: $5 + \text{innovationCount}$ (cushions low dependability before termination).
  - **Reset on Employer Change**: `innovationCount`, `depMaxBonus`, and `xpMaxBonus` reset upon changing jobs or being fired.

### 10.5. Summary Comparison Matrix

| Work Mode | Wage Rate | Phys Cost | Mental Cost | Dep Gain | Exp Gain | Social Gain | Unique Niche |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Work Work** | $1.0\times$ | $1.0\times$ | $1.0\times$ | $+1.0$ | $+1.0$ | $0$ | Maximum steady cash & baseline progression |
| **Look Busy** | $1.0\times$ | $0.5\times$ | $0.5\times$ | $0$ | $0$ | $0$ | Stamina conservation / avoiding exhaustion |
| **Face Time** | **$0.0\times$** | $0.5\times$ | $\text{Base} + 2$ | $+1.5\text{--}3.0$ | $0$ | $(100-\text{Soc})\%$ | Zero-wage reputation repair & networking |
| **Innovate** | **$0.5\times$** | $1.0\times$ | $\text{Base} + 2 + \text{Count}$ | $2\text{d}2 - 2$ | $2 - X$ | $0$ | **Cap-busting stat growth & career acceleration** |

---

## 11. Higher Education & Academic Progression

Higher education in Advanced Edition provides degree credentials, career prerequisites, max mental capacity expansions, and permanent stat boosts upon graduation.

### 11.1. Extra Credit & Course Discounts
- **Computer in Inventory**: $-1$ lesson requirement per degree.
- **Complete Book Set (Dictionary, Encyclopedia, Atlas)**: $-1$ lesson requirement per degree.
- **Stacking Limit**: Reductions stack up to $-2$ lessons total (minimum 1 lesson).

### 11.2. Percentage Tracking & Graduation Precision
- Course progress is tracked as a clean percentage ($0.0\%\text{--}100.0\%$).
- **Clean 100% Graduation Threshold**: To avoid floating-point / rounding truncation traps (e.g. 9 lessons at $11.11\%$ yielding $99.9\%$), reaching $\ge 99.0\%$ automatically rounds up to $100\%$ and triggers graduation without requiring redundant extra sessions.

### 11.3. Proportional Study on Final Lessons
- When completing the final portion of a degree where less than a full 6-hour session is needed:
  - The player only spends the exact hours needed ($\text{hoursNeeded} = \frac{100 - \text{Current}\%}{100} \times \text{TotalHours}$).
  - Time, physical, and mental costs are scaled proportionally to the fraction of the shift spent.
  - The UI dynamically displays the exact time and mental costs (e.g. `Study (1.5h) (-0.5 Mental)`), ensuring players never waste full 6-hour shifts and stamina on fractional lesson remainders.

---

## 12. Configuration Reference (`config.json`)

All Advanced Edition mechanics are governed by the campaign configuration file [public/campaigns/advanced/config.json](file:///home/yoavh/code/antigravity/fastlane/public/campaigns/advanced/config.json):

```json
{
  "name": "The Fast Lane — Advanced Edition",
  "version": "3.0.0",
  "gameRules": {
    "helpfulUI": true,
    "enableAnimations": true,
    "showItemImages": true,
    "strictEviction": true,
    "clothingDecaysAll": false,
    "bypassDoctorIfBroke": false,
    "enableRelaxationDoctor": false,
    "useHomeTimeRobbery": true,
    "usePhysicalMentalConditions": true,
    "turnStartAtHome": true,
    "trackMess": true,
    "delayRobberyFoodSpoilage": false
  },
  "statRules": {
    "startingPhysicalCondition": 50,
    "startingMentalCondition": 51,
    "minPhysicalCondition": 5,
    "maxPhysicalCondition": 100,
    "minMentalCondition": 5,
    "maxMentalCondition": 85,
    "globalMaxPhysicalCondition": 100,
    "globalMaxMentalCondition": 100,
    "initialPhysicalMax": 100,
    "mentalMaxBaseValue": 86,
    "physicalDoctorThreshold": 10,
    "physicalDoctorChancePerPoint": 0.05,
    "doctorPhysicalBounceBack": 8,
    "lowSpiritsThreshold": 10,
    "lowSpiritsChancePerPoint": 0.05,
    "lowSpiritsMentalBounceBack": 8,
    "workGrindThreshold": 4,
    "workGrindMentalCost": 1,
    "workPhysicalCost": 1,
    "studyMentalCost": 1,
    "cleanPhysicalCost": 1,
    "mentalMaxBookLimit": 3,
    "mentalMaxBookBonus": 1,
    "mentalMaxComputerBonus": 3,
    "mentalMaxDegreeBonus": 1,
    "socialBwTvBonus": 1,
    "socialColorTvBonus": 2,
    "socialMicrowaveBonus": 1,
    "socialVcrBonus": 1,
    "socialStereoBonus": 1,
    "socialHotTubBonus": 3
  }
}
```
