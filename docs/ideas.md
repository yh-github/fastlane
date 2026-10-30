# Future Ideas & Campaign Brainstorming

This document tracks future feature concepts, separated into:
1. **Part 1: Advanced 2000 Brainstorm (New Y2K Edition)** — New features, buildings, and mechanics planned for the year-2000 version.
2. **Part 2: Prior Ideas (Advanced 90's Backlog)** — The original backlog items that existed prior to the Advanced 2000 brainstorm.
3. **Part 3: Cherry-Picking & Cross-Edition Matrix** — A tracking guide for which prior ideas get pulled into Advanced 2000 vs. backported to Advanced 90's.

---

# Part 1: Advanced 2000 Brainstorm (New Y2K Edition)

*Setting: Around the year 2000. Allowed to diverge substantially from the 1990 original.*

### Campaign Setup & Architecture Strategy
- **Campaign Naming**: Change the display name of `advanced` to **"Advanced 90's"** and create **"Advanced 2000"** (`advanced_2000`).
- **Standalone Configurations**: When implementing Advanced 2000, start with a fresh **copy** of config and data files (`buildings.json`, `items.json`, `jobs.json`, `education.json`, `config.json`, `map.json`, etc.) rather than deep chained inheritance overrides.
- **Portability**: Reusable systems (cooking, coffee, exams, habits) developed here can be backported to Advanced 90's via modular rule toggles.

### Domestic Living, Appliances & Maintenance
- **Robot Cleaner (Y2K Robotic Vacuum)**:
  - Automatically reduces apartment mess at turn start for 0 hours and 0 stamina.
  - *Clutter Threshold*: If mess exceeds a certain threshold (e.g., `> 20`), the robot gets stuck on clutter and will not run until the player manually cleans or calls a Cleaning Service.
- **Cooking Subsystem**:
  - Full implementation of the cooking module.
  - Active cooking with raw groceries (`freshFoodUnits`) and appliances (`Stove`, `Microwave`, `Fridge`, `Freezer`).
  - Home-cooked meals provide high-quality nutrition (`+Physical`, `+Mental`, protects `Max Physical`), but cost time and generate kitchen mess.
- **Dishwasher**:
  - Kitchen appliance that drastically reduces or eliminates mess created after cooking (and reduces cleanup mess after hosting guests via `socialize_guests`).
- **Flat-Screen vs. CRT TV**:
  - Replaces the 1990s B&W vs. Color TV tiering.
  - **CRT TV**: Cheap, bulky (higher apartment `space`), modest lifestyle/social bonus.
  - **Flat-Screen / Plasma TV**: Expensive Y2K status item, compact footprint (low `space`), high lifestyle and social benefits.
- **Apartment Mishaps (Replacing Home Break-Ins)**:
  - Replaces Wild Willy apartment burglaries with infrastructure breakdowns (especially in Low-Cost Housing):
    - **Plumbing / Leaks**: Sudden burst of mess (can disable the Robot Cleaner) requiring repairs.
    - **Electrical Shorts**: Breakers trip or appliances break down (ties into `advancedMaintenance` repair actions).
    - **Pests (Roaches/Mice)**: Spawned by high mess and unsealed food; spoils food and harms mental recovery until exterminated.
  - High-tier housing (Security Apartments, Penthouse) offers protection/immunity from slumlord mishaps.

### Locations, Food, Hospitality & Wellness
- **Red Pirate (Replacing Monolith Burgers)**:
  - Combination fast-food restaurant and **Arcade** (spend time and pocket change for a quick Mental recovery valve).
  - **"Busy Weeks" ("All Hands on Deck!")**:
    - Rush weeks announced in the newspaper.
    - *Workers*: Bonus pay/tips or higher Experience/Dependability, but heavier stamina drain and strict attendance (missing shifts costs extra Dependability).
    - *Customers*: Longer lines, slower service, or variable menu items.
- **Cafe / Restaurant**:
  - Healthier dining-out option: restores Physical and Mental condition without kitchen appliances or mess.
  - **Coffee / Espresso Subsystem**: Grants short-term stamina/efficiency buffs during work and study, with trade-offs like caffeine crashes or habit formation.
  - New service career track (Barista, Line Cook, Chef, Manager).
- **Workout & Wellness Venue (Gym / Fitness Center)**:
  - A location or park calisthenics area to actively train Physical stamina.
  - Builds and rehabilitates **Max Physical** capacity and Wellbeing without relying solely on passive full-health home rest.

### Map Expansion, Parks & Movement
- **Parks as Extra Map Nodes**:
  - Added as distinct new nodes on the city map (not replacing commercial buildings).
  - Free recreation area for walking, jogging, reading, and low-cost stress relief.
  - Street resting spot for homeless players (`street` housing tier).
- **Predictable Street Muggings & "The Long Way Around"**:
  - Replaces pure RNG street muggings on building exits.
  - Muggings are tied to specific dangerous streets/alleys on the board (with visual indicators).
  - Players carrying large sums of cash can choose to **take the long way around**—spending extra travel hours on a safe detour to avoid the hazard.

### Hospital, Education & Skills Overhaul
- **Hospital (Replacing Factory)**:
  - Replaces industrial manufacturing with a comprehensive healthcare and clinical career ladder:
    - *Entry*: Orderly, Medical Receptionist, Pharmacy Technician, EMT.
    - *Mid*: Registered Nurse (RN), Lab Technician, Medical Coordinator.
    - *Apex*: Surgeon, Attending Physician, Chief of Medicine, Hospital Administrator.
  - Synergy: Healthcare employee perks (discounted medical visits, higher physical recovery).
- **Matching Degrees & Repurposing `skill_tech`**:
  - Redesign university degrees to align with medical/science and Y2K IT.
  - Repurpose or split `skill_tech` into clinical/medical science credentials and IT/tech credentials.
  - Provide concrete career payoffs for the academic graduate/post-doctoral chains.
- **University Exams Subsystem**:
  - Completing courses requires passing mid-terms or final exams rather than simply clicking study actions.
  - Performance influenced by mental condition, sleep, books, and study readiness.

### Economy, Retail SALEs & Stock Market
- **Item-Specific SALEs & Decoupled Pricing**:
  - Replaces both the separate static discount store (`Z-Mart`) and the uniform economic index lockstep.
  - Stores feature rotating weekly **SALEs** on specific appliances, clothes, or books advertised in the newspaper.
- **More Interesting Stock Market (Y2K Edition)**:
  - **Dot-Com / Tech Stocks**: High-volatility equities with rapid rallies and crash potential.
  - **Dividends**: Passive quarterly/weekly dividend payouts on stable Blue Chip stocks.
  - **Online Trading**: Owning a home Computer allows trading stocks directly from your apartment without visiting the Bank.

---

# Part 2: Prior Ideas (Advanced 90's Backlog)

*These are the original backlog ideas preserved from the existing `ideas.md` document.*

## 1. Advanced Clothing System

For the advanced game variant, we can implement a more granular and realistic clothing system. 
The basic 1990 classic game version unconditionally degrades clothes and treats sets generically, but for an advanced version we might consider:

- **Selective Wear & Tear**: Only the set of clothing you are *actually wearing* degrades. The other sets are safe in your closet. *(Note: Basic selective wear is already implemented via `clothingDecaysAll: false`)*.
- **Job-Specific Degradation**: Some jobs ruin clothes faster (e.g., manual labor jobs degrading casual clothes quicker than an office job degrading a business suit).
- **Events**: Random events could ruin clothes (e.g., spilling coffee, tearing pants).
- **Optional Rules**: Allowing the player to explicitly choose which clothes set to wear instead of auto-equipping. *(Note: Implemented via `autoEquipBestClothes: false` and `clothesSwitchingRule`)*.
- **Specialized Clothing**: Jobs could require specific specialized clothing variations (e.g., hard hats, uniforms, scrubs).
- **Overdressing**: Penalties or unique interactions for being "overdressed" for certain jobs.
- **Granular Items**: Pick clothes piece by piece (e.g., hat, shirt, pants, shoes) instead of full "Business" or "Casual" sets.
- **Wardrobe Mechanics**: Allow switching clothes *only* at the clothing shop(s) or when at home, instead of everywhere on the map. *(Note: Implemented via `clothesSwitchingRule: "homeOnly" | "homeOrStore"`)*.

## 2. Homelessness & Street Resting Locations

For the advanced campaign with "The Streets" (`street` housing tier), resting and turn recovery requires a public location:
- **The Park / Central Square**: Free resting spot on a public bench. Low relaxation recovery, vulnerable to adverse weather and street muggings.
- **24/7 Monolith Burgers Booth**: Dozing off in a corner booth over a cheap coffee/snack.
- **Hi-Tech U Library / Lounge**: Crashing in the student study hall (requires enrollment or intellect).
- **Low-Cost Stoop**: Sleeping outside the apartment building with 0 space.

## 3. Commodity Food Pricing & Sector Coupling (Advanced Edition)

In the classic game, all store items scale uniformly with the consumer goods index (`gdsIndex`). For the Advanced Edition, we can introduce sector-specific commodity coupling:
- **Pork Bellies & Food Costs**: Spikes or dips in the agricultural / pork bellies commodity market directly impact food prices at Monolith Burgers and Black's Market.
- **Precious Metals & Pawn Valuations**: Fluctuations in Gold and Silver alter the pawn shop payout, appraisal values, and redemption costs of luxury jewelry/curios.
- **Sticky Wages vs Inflation**: Consumer retail prices fluctuate rapidly with commodity demand, while base job wages remain stickier, creating realistic cost-of-living squeezes during high-inflation economic phases.

## 4. Advanced Workplace & Career Dynamics (Pinned Ideas)

### 4.1. Halved Routine Dependability on Apex / Tier 3 Jobs
Award `+0.5 Dep` instead of `+1.0` on routine `work_work` shifts for Tier 3 jobs. Because weekly executive decay is `-4` to `-5 Dep/turn`, executives cannot coast on routine shifts alone; they must actively balance Face Time networking and high-impact Initiatives to survive contract reviews.

### 4.2. "Look Busy" Reputation Penalty on Executive Roles
Add a `-1.0 Dep` penalty for using `look_busy` on Tier 3 (Executive Management) jobs. Unlike entry-level workers who can blend into the background, an executive's absence or disengagement is immediately noticed by staff and the board.

### 4.3. Holistic Career Goal Composite Score
Replace the legacy `1.25 × Dependability` formula with a multi-pillar career progress evaluation:
- **Dependability & Reliability** (max 35 pts)
- **Job Prestige & Wardrobe Tier** (max 30 pts: Casual = 10, Dress = 20, Business Suit = 30)
- **Domain Skills** (max 20 pts: Management & Technical proficiency)
- **Institutional Standing** (max 15 pts: Accumulated Merits across career)

### 4.4. Professional & Redemptive Weekend Events
Purge generic, unearned Dependability from random weekend leisure events (movies, walks in the park). Introduce:
- **Merit-Gated Executive Summits & Conferences**: High-yield professional events (e.g. `+2.0 Dep`, `+0.50 Mgmt`, high networking).
- **Demerit-Gated Redemptive Shifts**: Overtime catch-up shifts to repair poor performance and clear past incidents.

### 4.5. Whole-Number Skill Scale (Future Skill Rebalance)
When domain skills (Management, Technical) are completely decoupled from acting as 1:1 substitutes for Experience/Dependability, convert them from fractional units (`0.05 – 2.50`) into intuitive whole numbers (e.g., `1 – 10` or `1 – 100`).

### 4.6. Above-Market Executive Dividends & Profit-Sharing
At Tier 3, instead of flat hourly wages, top executives receive quarterly profit dividends scaled by company standing and macroeconomic health.

---

# Part 3: Cherry-Picking & Cross-Edition Matrix

Use this table to decide and track which prior backlog items get pulled into **Advanced 2000**, stay in **Advanced 90's**, or apply to both:

| Backlog Concept | Advanced 90's Status | Advanced 2000 Candidate? | Notes / Cherry-Pick Recommendation |
| :--- | :--- | :--- | :--- |
| **Job-Specific Clothing Degradation** | Backlog | **Yes** | Natural fit with Hospital scrubs, Red Pirate uniforms, and manual jobs. |
| **Clothing Mishaps (Coffee/Tears)** | Backlog | **Yes** | Fits with cafe coffee mechanics and apartment mishap events. |
| **Specialized Workwear / Uniforms** | Backlog | **Yes** | Hospital scrubs/coats, Red Pirate aprons, gym attire. |
| **Granular Clothes Pieces** | Backlog | Low Priority | High UI complexity; full outfits/uniforms are likely sufficient for now. |
| **Homelessness Locations (Parks, Booths)** | Backlog | **Yes (Direct Fit)** | Integrates directly with the new Park node and 24/7 Red Pirate booth. |
| **Commodity Sector Coupling** | Backlog | **Yes (Integrated)** | Pairs with the new weekly SALEs and decoupled price mechanics. |
| **Halved Routine Dep on Tier 3 Jobs** | Backlog | **Yes** | Complements Hospital Chief of Medicine / Corporate executives. |
| **"Look Busy" Penalty on Executives** | Backlog | **Yes** | Good balance counter to high executive pay. |
| **Holistic Career Goal Score** | Backlog | **Yes (Shared)** | Replaces the 1.25x Dep formula cleanly in both Advanced editions. |
| **Professional/Redemptive Weekends** | Backlog | **Yes (Shared)** | Adds depth to the weekend card system for both editions. |
| **Whole-Number Skill Scale (1–10/100)**| Backlog | **Yes** | Great time to introduce clean whole numbers with the new Hospital/Tech skill tree. |
| **Executive Dividends / Profit-Sharing** | Backlog | **Yes** | Fits alongside dot-com / stock market mechanics in Y2K. |
