# Future Ideas & Advanced 2000 Brainstorm

This document consolidates design ideas for **Advanced 2000** (a Y2K-era evolution of the game allowed to diverge substantially from the 1990 original) alongside modular subsystems that may be backported to **Advanced 90's** (the renamed display title for the current `advanced` campaign).

> [!NOTE]
> ### Implementation Strategy Note (For Future Execution)
> - **Campaign Naming**: Rename the display name of `advanced` to **"Advanced 90's"**, and name the new Y2K edition **"Advanced 2000"** (`advanced_2000`).
> - **Standalone Configs**: When implementing `Advanced 2000`, **copy** the configuration files (`buildings.json`, `items.json`, `jobs.json`, `education.json`, `config.json`, `map.json`, etc.) to start fresh rather than chaining deep `baseCampaign` inheritance overrides.
> - **Backporting**: Proven self-contained subsystems (such as Cooking, Coffee, Exams, and Hobbies/Habits) can later be ported back to **Advanced 90's** via rule toggles.

---

## 1. Domestic Living, Appliances & Apartment Mishaps

### 1.1. Cooking Subsystem
- Complete the home cooking module so players can actively prepare meals using raw groceries (`freshFoodUnits`) and kitchen appliances (`Stove`, `Microwave`, `Refrigerator`, `Freezer`).
- **Trade-off**: Home cooking costs **Time** and generates **Kitchen Mess**, but provides much better nutrition (`+Physical`, `+Mental`, and preserving `Max Physical`) at a lower per-meal cost than eating out.
- Can scale with cooking proficiency/habits or recipe tiers (quick microwave meals vs. full stove-cooked dinners).

### 1.2. Dishwasher
- **Role**: Kitchen automation appliance that directly reduces or eliminates the **Mess** generated after cooking (and reduces cleanup mess after hosting guests via `socialize_guests`).
- Turns home cooking from a high-maintenance chore into a smooth weekly routine.

### 1.3. Robot Cleaner (Y2K Automatic Vacuum)
- **Role**: Automatically reduces apartment **Mess** each turn (e.g., at `turn_start`) without costing player time or Physical stamina.
- **The Clutter Catch**: Does **not** work when there is too much mess (`mess > threshold`). If a party, neglected cooking dishes, or an apartment mishap pushes mess past the threshold, the robot gets stuck/overwhelmed until the player manually cleans or calls a Cleaning Service to bring mess back down.

### 1.4. Flat-Screen vs. CRT TV (Replacing B&W vs. Color TV)
- Updates the 1990 television tiers (`bw_tv` and `color_tv`) for the year 2000:
  - **CRT TV**: Cheap, heavy/bulky (takes more apartment `space`), modest lifestyle and social bonus.
  - **Flat-Screen / Plasma TV**: Expensive Y2K status symbol, compact footprint (takes less `space`), high lifestyle value and strong `+Social` / `-Mental cost` bonuses when entertaining guests.
- Other Y2K electronics can follow suit (e.g., DVD Player, MP3/CD Stereo).

### 1.5. Apartment Mishaps (Replacing Home Break-Ins)
- Replaces Wild Willy apartment break-ins (`useHomeTimeRobbery`) with domestic infrastructure hazards, especially in Low-Cost Housing:
  - **Plumbing / Burst Pipes**: Sudden spike in apartment **Mess** (which can also push mess past the Robot Cleaner's operating threshold) or water damage requiring a plumber or DIY repair.
  - **Electrical Shorts / Outages**: Damages or disables appliances (tying into `advancedMaintenance` repair mechanics) or temporarily blocks powered home actions.
  - **Pests (Roaches, Mice)**: Triggered or worsened by high **Mess** and unsealed food. Spoils unprotected food and penalizes Mental recovery at home until cleaned up or treated by an Exterminator.
- Higher housing tiers (Security Apartments, Penthouse) offer better building maintenance and immunity/protection from slumlord mishaps.

---

## 2. Food, Hospitality & Fitness Locations

### 2.1. Red Pirate (Replacing Monolith Burgers)
- **Fast Food & Arcade**: Replaces Monolith Burgers with **Red Pirate**, combining cheap, unhealthy fast food (`-Physical`, quick convenience) with an on-site **Arcade** (spend time/quarters for quick Mental/Relaxation relief and social hangouts).
- **"Busy Weeks" ("All Hands on Deck!") Mechanic**:
  - Periodic rush weeks at Red Pirate (announced via newspaper/events).
  - **For Employees**: High-pressure shifts where all hands are needed—offering bonus pay/tips or accelerated Experience/Dependability, paired with heavier Physical/Mental stamina drain and stricter attendance expectations (skipping work during a Busy Week carries a steeper Dependability penalty).
  - **For Customers**: Longer wait times or crowd effects during rush weeks.

### 2.2. Cafe / Restaurant & Coffee Subsystem
- **Healthier Dining Out**: A mid-to-high-tier dining spot serving nutritious meals that restore **Physical** and **Mental** condition without requiring kitchen appliances, groceries, or cleanup at home.
- **Coffee / Espresso Subsystem**:
  - Grants short-term energy/focus buffs (e.g., reducing stamina drain on Grind/Overtime work or study sessions, or granting a temporary time/efficiency boost).
  - **Habit & Crash Trade-off**: Over-relying on caffeine can create a coffee habit or cause next-turn fatigue/time-debt if not managed.
- **Hospitality Careers**: Barista, Line Cook, Chef, and Restaurant Manager jobs.

### 2.3. Workout & Wellness Venue (Gym / Fitness Center)
- A dedicated location (and/or park calisthenics equipment) where players can spend time and stamina to **work out**.
- **Effects**:
  - Builds and rehabilitates **Max Physical** capacity (`physicalConditionMax`) and long-term **Wellbeing** (instead of only rehabilitating Max Physical by relaxing at home when already full).
  - Relieves Mental stress (`+Mental`) and supports jobs with the `look_fit` or `heavy_physical` tags.
  - Potential membership vs. pay-per-visit options, or workout gear synergies.

---

## 3. Map Expansion, Parks, Homelessness & Street Navigation

### 3.1. Parks (Extra Map Nodes) & Homelessness
- **Parks as Extra Map Nodes**: Added as new nodes on the city map (rather than replacing existing commercial buildings).
- **Public Recreation**: Free place for any player to take a walk, jog, read, or decompress outdoors when their apartment is messy or stressful.
- **Homelessness (`street` Housing Tier)**:
  - When evicted (under `strictEviction`) or living without an apartment, resting and turn recovery require public locations:
    - **The Park**: Free resting spot on a public bench (`0` space capacity, low recovery, exposed to weather).
    - **24/7 Red Pirate Booth**: Dozing off in a corner booth over cheap coffee/fries.
    - **Hi-Tech U Library / Lounge**: Crashing in the student study hall (requires enrollment or intellect).
    - **Low-Cost Stoop**: Sleeping outside the apartment building with `0` space.

### 3.2. Predictable Street Muggings & "The Long Way Around"
- Replaces pure RNG building-exit muggings with **spatially predictable street danger**:
  - Specific street spaces or alleys on the map carry visible mugging risk (or show a shady figure loitering there).
  - **Route Choice**: Players carrying large amounts of cash (e.g., leaving the Bank or Pawn Shop) can choose to **take the long way around**—spending extra travel hours on a safer detour to avoid the dangerous space, or risking the shortcut to save time.

---

## 4. Hospital, Education, Exams & Skills Overhaul

### 4.1. Hospital (Replacing Factory)
- Replaces the 1990s industrial **Factory** with a **Hospital**, shifting the blue/white-collar manufacturing ladder into a healthcare, clinical, and medical administration career track:
  - *Entry*: Orderly, Medical Receptionist, Pharmacy Technician, EMT.
  - *Mid*: Registered Nurse (RN), Lab Technician, Medical Coordinator.
  - *Upper / Apex*: Attending Physician / Surgeon, Chief of Medicine, Hospital Administrator.
- **Synergy**: Potential healthcare perks for Hospital employees (discounted/waived Doctor visits or bonus Physical recovery).

### 4.2. Matching Degrees & Repurposing `skill_tech`
- Overhauls the University (`Hi-Tech U`) degree tree to match the Hospital and year-2000 economy.
- Repurposes or splits `skill_tech` (currently tied to Trade School → Pre-Engineering → Engineering for Factory machinists/engineers) into clinical/medical/science credentials (e.g., **Pre-Med / Nursing / Medical School / Biotech**) alongside IT/Electronics for Socket City and corporate tech roles.
- Gives the currently underutilized `Academic → Graduate → Post-Doctoral → Research → Publishing` chain concrete skill and career payoffs.

### 4.3. University Exams Subsystem
- Adds **Exams** to higher education so earning a degree isn't just clicking `Study` 10 times:
  - Studying builds course readiness/comprehension; completing a degree requires passing a mid-term or final **Exam** (where Mental condition, sleep/rest, coffee, and book ownership affect exam performance or pass thresholds).

---

## 5. Retail SALEs, Dynamic Pricing & Stock Market

### 5.1. Item-Specific SALEs & Decoupled Pricing (Replacing Discount Store & Uniform Index)
- **No Static Discount Store**: Removes the separate static discount store (`Z-Mart`) that permanently sells cheap duplicates of appliances.
- **De-coupled Item Prices**: Instead of all store prices moving up and down in lockstep with a single global `economicIndex`:
  - **Weekly Item SALEs**: Stores run rotating **SALEs** on specific items (e.g., `-25%` to `-50%` off a Dishwasher, Flat-Screen TV, or Business Suit for the week, advertised in the newspaper).
  - **Sector & Commodity Coupling**:
    - *Agricultural / Pork Bellies*: Fluctuations directly impact food prices at Red Pirate, the Cafe, and Black's Market.
    - *Precious Metals (Gold/Silver)*: Alter pawn shop payouts, appraisal values, and redemption costs.
    - *Sticky Wages vs. Inflation*: Retail prices and sales shift dynamically while base job wages remain stickier.

### 5.2. More Interesting Stock Market (Y2K Edition)
- Expands financial investments beyond passive buy-and-hold:
  - **Dot-Com / Tech Stocks**: High-momentum Y2K tech stocks with bubble rallies and crash risks.
  - **Dividends & Yield**: Blue-chip stocks or bonds paying periodic passive dividends at `turn_start`.
  - **Company / Sector Coupling**: Stock performance tied to the city's actual businesses (e.g., Red Pirate busy weeks, Hospital breakthroughs, electronics sales booms).
  - **Online Trading**: Owning a **Computer** at home allows trading stocks directly from the apartment without traveling to the Bank/Broker.

---

## 6. Lifestyle, Habits, Clothing & Career Subsystems (Cross-Edition Candidates)

### 6.1. Hobbies & Habits System
- **Emergent Habits**: Repeated player actions build positive or negative habits over time:
  - *Junk Food / Caffeine Habit* vs. *Healthy Cooking / Workout Routine*.
  - *Hedonism* (arcade, fast food: instant Mental/Happiness relief, higher long-term decay) vs. *Meaning / Hobbies* (reading, park walks, fitness, creative hobbies: upfront time investment that slows decay or boosts Max Mental/Physical).

### 6.2. Advanced Clothing System Extensions
- *Already implemented in Advanced 90's*: Selective wear & tear (`clothingDecaysAll: false`) and wardrobe location rules (`clothesSwitchingRule`).
- *Future extensions*:
  - **Job-Specific Degradation**: Manual labor or kitchen jobs degrade clothes faster than office jobs.
  - **Specialized Uniforms**: Scrubs/lab coats for Hospital roles, aprons/uniforms for service jobs.
  - **Clothing Mishaps**: Random events or apartment mishaps ruining an outfit (spilling coffee, burst pipe soaking closet).
  - **Overdressing / Granular Wardrobe**: Penalties or social interactions for overdressing; optional piece-by-piece wardrobe items.

### 6.3. Pinned Workplace & Executive Dynamics
1. **Halved Routine Dependability on Apex / Tier 3 Jobs**: Award `+0.5 Dep` instead of `+1.0` on routine `work_work` shifts for Tier 3 jobs so executives must actively use Face Time and Initiatives to offset weekly `-4` to `-5 Dep` decay.
2. **"Look Busy" Reputation Penalty on Executive Roles**: Add a `-1.0 Dep` penalty for using `look_busy` on Tier 3 (Executive Management) jobs.
3. **Holistic Career Goal Composite Score**: Replace the legacy `1.25 × Dependability` formula with a multi-pillar career evaluation:
   - **Dependability & Reliability** (max 35 pts)
   - **Job Prestige & Wardrobe Tier** (max 30 pts: Casual = 10, Dress = 20, Business Suit = 30)
   - **Domain Skills** (max 20 pts: Management & Technical/Medical proficiency)
   - **Institutional Standing** (max 15 pts: Accumulated Merits across career)
4. **Professional & Redemptive Weekend Events**:
   - **Merit-Gated Executive Summits & Conferences**: High-yield professional weekend events (`+2.0 Dep`, `+0.50 Mgmt`, networking).
   - **Demerit-Gated Redemptive Shifts**: Overtime catch-up shifts to repair poor performance and clear past incidents.
5. **Whole-Number Skill Scale**: Convert domain skills from fractional units (`0.05 – 2.50`) into intuitive whole numbers (`1 – 10` or `1 – 100`) once decoupled from 1:1 Experience/Dependability substitution.
6. **Above-Market Executive Dividends & Profit-Sharing**: Tier 3 executives receive periodic profit dividends scaled by company standing and macroeconomic health.
