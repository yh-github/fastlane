# Original Game Resources & Knowledge Base

This directory contains extracted Sierra SCI resources from the original *Jones in the Fast Lane* releases:
* `floppy/` — 1990 Floppy Disk edition
* `cdrom/` — 1992 CD-ROM edition

This document records the decompiled SCI scripts investigated, the mechanics reverse-engineered from bytecode, and key differences between the original editions and modern implementations.

---

## Resource File Types Reference

The Sierra SCI (Script Creation Interpreter) format resources include:

| Extension / Prefix | Format | Description |
|---|---|---|
| `script.XXX.txt` | Text / Decompiled SCI | Disassembled / decompiled game scripts (classes, state machines, math, logic). |
| `script.XXX` | Binary | Raw compiled SCI bytecode. |
| `view.XXX.bmp` | BMP / Sprites | Spritesheet and animation views (characters, objects, animations). |
| `view.XXX` | Binary | Raw SCI view resource. |
| `pic.XXX.bmp` | BMP / Backgrounds | Static room / building background graphics. |
| `pic.XXX` | Binary | Raw SCI picture vector/raster resource. |
| `text.XXX` | Text / Strings | Text strings and message banks referenced by scripts. |
| `sound.XXX` | Audio / MIDI | Music and sound effect resources. |
| `font.XXX` / `cursor.XXX` | Binary | Font bit-patterns and mouse cursor definitions. |
| `palette.XXX` | Palette | 256-color VGA palette maps. |
| `vocab.XXX` | Binary | Parser vocabulary and class tables. |

---

## Investigated Scripts & Reverse-Engineered Mechanics

### 📈 Economy & Market Simulation

| Script | Export / Routine | Mechanics & Findings |
|---|---|---|
| [`script.107.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.107.txt) | `publiceconomicIndex of Obj`, `stepSector` | **Authentic 8-Sector Multi-Tier Simulation:**<br>• **Tier 1**: Main Macro Economy (`econ_main`).<br>• **Tier 2**: Consumer Goods (`goods`), General Investments (`investments`) (driven by Main).<br>• **Tier 3**: Commodities & Stocks (Gold, Silver, Pork Bellies, Blue Chip, Penny Stocks) (driven by Investments).<br><br>**Momentum & Fluctuation Math:**<br>• Momentum index ranges from `-3` to `+3`.<br>• Target momentum is randomly picked from `[-3 - low, 3 + high]`, where `low` and `high` are mean-reversion flags triggered by thresholds (80, 90, 130, 160).<br>• Sector roll is drawn from `[lowerRange, upperRange]`. When momentum is positive, `lowerRange = -3` and `upperRange = 3 + 2 * index`. When negative, `lowerRange = -3 + 2 * index` and `upperRange = 3`.<br>• Coupling adds \(\lfloor \text{parentIndex} / 3 \rfloor\) to sector reading.<br><br>**Market Crashes & Booms:**<br>• Major Crash: \(\text{reading} = \lfloor (\text{reading} \times 17) / 20 \rfloor\) (-15%), momentum drops by 3.<br>• Moderate Crash: \(\text{reading} = \lfloor (\text{reading} \times 18) / 20 \rfloor\) (-10%).<br>• Minor Crash: \(\text{reading} = \lfloor (\text{reading} \times 19) / 20 \rfloor\) (-5%).<br>• Boom: \(\text{reading} = \lfloor (\text{reading} \times 11) / 10 \rfloor\) (+10%), momentum jumps to `+3`.<br><br>**Sierra Bytecode Bug:**<br>• Lines 246–265 contain logic for an *upside momentum bonus* when rolling max range, but the branch was structured unreachable in the original bytecode. Unlocked via the optional rule `economicUpsideBonus`. |
| [`script.109.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.109.txt) | Pricing procedures | **Price Scaling Formula:**<br>\[ \text{pct} = 100 + \left\lfloor \frac{(\text{reading} - 100) \times 5}{3} \right\rfloor \]<br>\[ \text{price} = \max\left(1, \left\lfloor \frac{\text{basePrice} \times \text{pct}}{100} \right\rfloor\right) \]<br>Clamped between 50% floor and 250% ceiling. This translates to \(\text{basePrice} + \lfloor (\text{basePrice} \times \text{economicIndex}) / 60 \rfloor\). |
| [`script.215.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.215.txt) | `publicnewspaper of Dialog`, `proc_000e` | **Newspaper Headline Selection:**<br>• Scans all sectors to find top gainer and biggest loser.<br>• If \(|\text{loser.index}| > |\text{gainer.index}|\) and \(|\text{loser.index}| \ge 2\), prints negative headline.<br>• Else if \(|\text{gainer.index}| \ge 2\), prints positive headline.<br>• Otherwise falls back to generic city news. |

---

### 🏦 Banking, Finance & Investments

| Script | Export / Routine | Mechanics & Findings |
|---|---|---|
| [`script.204.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.204.txt) | `publicbank of Dialog` | **Monolith / Grant's Bank:**<br>• **Savings**: Earns interest weekly based on current economic reading.<br>• **Loans**: Calculates loan borrowing limit and approval chance from player liquid assets, steady income, and job tier.<br>• **Debt**: Outstanding loan principal incurs weekly interest; failure to repay can lead to collateral repossession. |
| [`script.213.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.213.txt) | `publicbroker of Dialog` | **Investment Brokerage:**<br>• Handles buying and selling of T-Bills, Gold, Silver, Pork Bellies, Blue Chip, and Penny Stocks.<br>• Prices fluctuate turn-by-turn based on Tier 3 sector readings from `script.107.txt`. |
| [`script.116.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.116.txt) | `publiclottoScript of Script` | **Lottery Tickets:**<br>• Ticket purchase and weekly lottery drawings. |

---

### 🎲 World Events & Encounters

| Script | Export / Routine | Mechanics & Findings |
|---|---|---|
| [`script.114.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.114.txt), [`script.204.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.204.txt) / [`204.scr.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/cdrom/204.scr.txt), [`script.203.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.203.txt) / [`203.scr.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/cdrom/203.scr.txt), [`script.001.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.001.txt) | `publicmuggedByMarket`, `publicmuggedByBank`, `init` | **Street Mugging (Bank / Black's Market):**<br>• **Trigger Point:** Evaluated strictly inside the building dialog's `init` method upon **entering** the Bank (`script.204.txt:L362-378`) or Black's Market (`script.203.txt:L427-442`). It never triggers while walking or standing outside without entering.<br>• **Floppy vs CD-ROM Week Gating:**<br>  - **Floppy (1990):** No week restriction at all (`willyRobberyStartWeek: 1`). Can occur starting Week 1.<br>  - **CD-ROM (1992):** Sierra added `global_0174 >= 4` (`204.scr.txt:L372-375`, `203.scr.txt:L439-442`), officially introducing a Week 4 grace period (`willyRobberyStartWeek: 4`) before street muggings can occur.<br>• **Probabilities:**<br>  - **Bank:** `(Random 0 30) == 0` \(\rightarrow\) exactly **1 in 31** (~3.23%).<br>  - **Black's Market:** `(Random 0 50) == 0` \(\rightarrow\) exactly **1 in 51** (~1.96%).<br>• **Conditions:** Player must have carried cash > 0 (`procedure_000b > 0`).<br>• **Confiscation:** Sets `global_1be` (1 = market, 2 = bank) and immediately zeroes 100% of carried cash (`cash = 0; cashHi = 0;`).<br>• **Animation Sequence:** When the player exits the building, `(room1 cue)` in `script.001.txt:L556-628` checks `global_1be`, disables controls (`User canControl: 0`), and attaches `script.114` (`muggedByBank` or `muggedByMarket`) so Willy animates running in, robbing the player on the sidewalk outside, and escaping.<br>• *Note on Terminology:* Distinct from **Home Break-In / Apartment Burglary** (weekend appliance theft in low-tier apartments). |
| [`script.232.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.232.txt) | `publicweekend of Dialog` | **Weekend Resolution:**<br>• Turn-end sequence: relaxation, leisure activities, rent/food consumption deductions, and random weekend events. |

---

### 🎓 Education, Career & Employability Systems

| Script | Export / Routine | Mechanics & Findings |
|---|---|---|
| [`script.206.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.206.txt)<br>[`206.scr.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/cdrom/206.scr.txt) | `publicemployment of Dialog`, `(method (qualify))`, `(method (turnedDown))` | **Employment Agency & Hiring Evaluation:**<br>When applying for a job, 4 mandatory checks must all pass:<br>1. **Education (`local45`)**: Holds required degrees (`hasDegree(education)` & `hasDegree(education2)`).<br>2. **Dependability (`local46`)**: \(\text{dependibility} \ge \text{job.dependibility}\) (if `job.dependibility == 10`, effective requirement is `0` / auto-pass).<br>3. **Experience (`local47`)**: \(\text{experience} \ge \text{job.experience}\).<br>4. **Employability / Hiring Roll (`local48`)**: A random roll from 1 to 100 must satisfy \(\text{roll} \le \text{Hire Chance (\%)}\).<br><br>**Unified Employability Formula:**<br>\[ \text{Hire Chance (\%)} = 30 + \left\lfloor \frac{\text{Dependability} + \text{Experience} + (8 \times \text{numDegrees}) + 10}{3} \right\rfloor \]<br>*(Special exception: Entry-level job with `indexNum == 44` / `$2c` bypasses the roll with a 100% hire rate).*<br><br>**Job Assignment on Hire:**<br>• Sets `player.minDepend = job.dependibility`.<br>• Sets `player.maxExperience = job.experience + 10` (or `+ 20` if base experience was 0).<br>• Grants `player.experience += 2`.<br>• Clamps `player.dependibility = max(10, player.dependibility)`. |
| [`script.207.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.207.txt)<br>[`207.scr.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/cdrom/207.scr.txt) | `publicuniversity of Dialog`, `UniversityDIcon`, `addCourse` | **Hi-Tech University:**<br>• **Degree Tree (11 Degrees)**: Trade School, Electronics, Pre-Engineering, Engineering, Junior College, Business Administration, Academic, Graduate School, Post-Doctoral, Research, Publishing.<br>• **Course Completion (10 Lessons)**: On graduating, immediately executes:<br>&nbsp;&nbsp;– `eduCredit += 5`<br>&nbsp;&nbsp;– `dependibility += 5`<br>&nbsp;&nbsp;– `expCredit += 5`<br>&nbsp;&nbsp;– `numDegrees += 1` (adds to `player.education` list).<br>• **`coursesDone` Flag**: Boolean flag (0 or 1), NOT a counter. Flips to `1` only when all 11 university courses are completed, triggering the message: *"Perhaps next year we will have more classes to offer to you."*<br>• **Tuition / Lesson Reduction (`extraCredits`)**: Remaining lessons required to graduate are calculated as:<br>\[ \text{Lessons Remaining} = \text{unitsToGraduate} - \text{lessonsTaken} - \text{extraCredits} \] |
| [`script.108.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.108.txt)<br>[`108.scr.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/cdrom/108.scr.txt) | `proc_014c` (called via `calle 6c` from all workplace timeClocks) | **Shift Work Execution & Stat Growth Caps:**<br>Every hour/shift worked runs stat headroom checks:<br>• **Experience Growth**: If \(\text{experience} < \text{maxExperience} + \text{expCredit}\), grants `experience += 1`.<br>• **Dependability Growth**: If \(\text{dependibility} < \text{minDepend} + 20 + \text{eduCredit}\), grants `dependibility += 1`.<br><br>**Why `expCredit` & `eduCredit` Exist:**<br>`maxExperience` and `minDepend` are ephemeral job properties overwritten on every job change (`script.206.txt`). Storing education headroom in permanent player properties `expCredit` and `eduCredit` ensures degree bonuses persist across career changes. |
| [`script.111.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.111.txt)<br>[`111.scr.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/cdrom/111.scr.txt) | `publicstartTrn of Script` | **Weekend Appliance Scan & Extra Study Credits:**<br>• Scans player inventory for educational durables (Books / Encyclopedia, Computer).<br>• Grants `extraCredits += 1` (or `xcred`), which directly reduces lessons needed to graduate in `script.207.txt`. |
| [`script.300.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.300.txt)<br>[`300.scr.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/cdrom/300.scr.txt) | Work evaluation routines | **Career Progression & Raises:**<br>• Evaluates eligibility for wage raises and job promotions based on current dependability, experience, dressed status, and completed degrees. |

---

### 🏢 Town Locations & Buildings

| Script | Export / Routine | Notes |
|---|---|---|
| [`script.200.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.200.txt) | `publiclowcost of Dialog` | Low-cost boarding house housing options. |
| [`script.201.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.201.txt) | `publicrentOffice of Dialog` | Rent office: apartment leasing, rent payments, eviction logic, security deposit management. |
| [`script.202.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.202.txt) | `publicsecurity of Dialog` | Home security system and burglary protection. |
| [`script.203.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.203.txt) | `publicmarket of Dialog` | Supermarket: buying weekly food supply (groceries) and price scaling. |
| [`script.205.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.205.txt) | `publicfactory of Dialog` | Industrial factory building and shift work. |
| [`script.208.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.208.txt) | `publicappliance of Dialog` | **Department Store:** Buying durable goods (TV, VCR, Refrigerator, Microwave, Computer, Books) to prevent food spoilage, improve happiness, or earn study credits. |
| [`script.209.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.209.txt) | `publicclothing of Dialog` | **Clothing Store:** Casual, Business, and Dress clothes purchases and wear/tear replacement. |
| [`script.210.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.210.txt) | `publicfastFood of Dialog` | **Monolith Burgers:** Buying fast food meals, burger eating, and food sickness probabilities. |
| [`script.211.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.211.txt) | `publicdiscount of Dialog` | Discount retail store purchases. |
| [`script.212.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.212.txt) | `publicpawnShop of Dialog` | **Pawn Shop:** Pawning possessions for quick cash, buyback schedules. |
| [`script.216.txt`–`script.224.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.216.txt) | Workplace dialogs | Dedicated shift-work dialogs for all 9 career locations (Discount, Fast Food, Clothing, Appliance, University, Factory, Bank, Market, Rent Office). |

---

### ⚙️ Core Engine Systems & Game Loop

| Script | Export / Routine | Notes |
|---|---|---|
| [`script.000.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.000.txt) | `publicjones of Game` | Main game supervisor, global state initialization, window management. |
| [`script.001.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.001.txt)<br>[`1.scr.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/cdrom/1.scr.txt) | `Player`, `(method (numDegrees))`, `(method (hasDegree))`, `(method (endTurn))` | **Core Player State & Lifecycle:**<br>• **`numDegrees`**: Dynamic method that iterates the `education` collection counting completed degrees (`quantity >= unitsToGraduate`).<br>• **`hasDegree(deg)`**: Checks if a specific degree ID is completed.<br>• **`endTurn`**: Weekly turn-end decay subtracting 3 Dependability: \(\text{dependibility} = \max(0, \text{dependibility} - 3)\). |
| [`script.002.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.002.txt) | `publicintroRoom of Rm` | Intro animation and opening credits. |
| [`script.101.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.101.txt) | `publicmarblePath of MarblePath` | Town board pathfinding, waypoint calculation, and travel time penalties. |
| [`script.229.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.229.txt) | `publicgoalsDefine of Dialog` | Goal selection: Wealth, Happiness, Education, Career tracking. |
| [`script.230.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.230.txt) | `publicdiploma of Dialog` | Graduation ceremony and diploma awards. |
| [`script.231.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.231.txt) | `publicinventories of Dialog` | Inventory & status screen display (wealth, goods, investments, and completed education degrees list). |
| [`script.233.txt`, `script.235.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.233.txt) | `publicselect1`, `publicselect2` | Player setup, character appearance, and game mode selection. |
| [`script.234.txt`](file:///home/yoavh/code/antigravity/fastlane/original_resources/floppy/script.234.txt) | `publicwinnerScript of Script` | Win evaluation and victory celebration screen. |

---

## Floppy vs. CD-ROM Key Discrepancies

| Feature / System | Floppy (1990) | CD-ROM (1992) | Notes |
|---|---|---|---|
| **Economy Floor (`minReading`)** | `10` (Displayed `-90`) | `70` (Displayed `-30`) | Floppy allowed prolonged crushing depressions down to `-90`. CD-ROM added guardrails keeping the floor at `-30`. |
| **Audio & Voice** | MIDI music + PC speaker / Sound Blaster SFX | Full CD-audio soundtrack + voice-acted character dialog | CD-ROM scripts reference updated speech resource tables. |
| **Pawn Shop Pricing** | Lower base buyback ratios | Adjusted valuation formulas | CD-ROM rebalanced resale values. |
| **Starting Capital / Buffer** | Strict baseline cash | Slightly adjusted starting allocations | CD-ROM eased early-game turn 1 eviction rates. |

