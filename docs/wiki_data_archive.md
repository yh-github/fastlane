# Fast Lane Modernized — Wiki Data Archive

*This file contains the consolidated raw game mechanics data extracted from the Jones in the Fast Lane fandom wiki. It serves as an offline reference for the game's actual formulas and stats.*

---

## 1. Stock Market
- **Access**: Located at the Bank, under "See the Broker". Costs 2 Hours to visit (requires at least 1 Hour left on the clock). Buying/selling stocks or exiting does not consume extra time.
- **T-Bills**: Fixed price of $100. Selling incurs a 3% fee (returns $97). No price fluctuations. Completely safe from Wild Willy and Market Crashes. Counts as a Liquid Asset.
- **Fluctuating Stocks**: Fluctuate each turn between 50% and 250% of their base price. They trend with the Economic Index but are more volatile due to a three-iteration formula.
  - **Gold**: Base $413 ($206 lowest, $1032 highest)
  - **Silver**: Base $14 ($7 lowest, $35 highest)
  - **Pork Bellies**: Base $20 ($10 lowest, $50 highest)
  - **Blue Chip Stocks**: Base $49 ($24 lowest, $122 highest)
  - **Penny Stocks**: Base $7 ($3 lowest, $17 highest)
- **Newspaper**: Stock tips in the newspaper are bugged in all official game versions and do not work.

## 2. Jobs and Employment
Jobs require specific combinations of Experience (Exp), Dependability (Dep), Degrees, and Uniforms.
- **Z-Mart**:
  - Clerk: $5/hr, 10 Exp, 10 Dep, No Degree, Casual Uniform
  - Assistant Manager: $7/hr, 20 Exp, 20 Dep, No Degree, Dress Uniform
  - Manager: $8/hr, 30 Exp, 30 Dep, Junior College, Business Uniform
- **Monolith Burgers**:
  - Cook: $5/hr, 0 Exp, 10 Dep, No Degree, Casual Uniform (unaffected by personality modifier, no direct public interaction)
  - Clerk: $6/hr, 10 Exp, 20 Dep, No Degree, Casual Uniform
  - Assistant Manager: $7/hr, 20 Exp, 30 Dep, No Degree, Casual Uniform
  - Manager: $8/hr, 30 Exp, 40 Dep, Junior College, Dress Uniform
- **QT Clothing**:
  - Janitor (CD-ROM only): $6/hr, 10 Exp, 20 Dep, No Degree, Casual Uniform
  - Salesperson: $8/hr, 30 Exp, 30 Dep, No Degree, Dress Uniform
  - Assistant Manager: $9/hr, 40 Exp, 40 Dep, Junior College, Business Uniform
  - Manager: $12/hr, 50 Exp, 50 Dep, Business Admin., Business Uniform
- **Socket City**:
  - Clerk (CD-ROM only): $6/hr, 10 Exp, 20 Dep, No Degree, Casual Uniform
  - Salesperson: $7/hr, 30 Exp, 30 Dep, No Degree, Dress Uniform
  - Electronics Repairman: $11/hr, 40 Exp, 40 Dep, Electronics, Casual Uniform
  - Manager: $14/hr, 40 Exp, 40 Dep, Electronics + Junior College, Business Uniform
- **Hi-Tech U**:
  - Janitor: $5/hr, 10 Exp, 10 Dep, No Degree, Casual Uniform
  - Teacher: $11/hr, 40 Exp, 50 Dep, Academic, Dress Uniform
  - Professor: $20/hr, 50 Exp, 60 Dep, Research, Dress Uniform
- **Factory**:
  - Janitor: $7/hr, 10 Exp, 20 Dep, No Degree, Casual Uniform
  - Assembly Worker: $8/hr, 30 Exp, 30 Dep, Trade School, Casual Uniform
  - Secretary: $9/hr, 40 Exp, 40 Dep, Junior College, Dress Uniform
  - Machinist's Helper: $10/hr, 40 Exp, 40 Dep, Pre-Engineering, Casual Uniform
  - Executive Secretary: $18/hr, 50 Exp, 50 Dep, Business Admin., Business Uniform
  - Machinist: $19/hr, 50 Exp, 50 Dep, Engineering, Casual Uniform
  - Department Manager: $22/hr, 60 Exp, 60 Dep, Junior College + Engineering, Business Uniform
  - Engineer: $23/hr, 60 Exp, 60 Dep, Junior College + Engineering, Business Uniform
  - General Manager: $25/hr, 70 Exp, 70 Dep, Business Admin. + Engineering, Business Uniform
- **Bank**:
  - Janitor: $6/hr, 10 Exp, 20 Dep, No Degree, Casual Uniform
  - Teller: $10/hr, 40 Exp, 40 Dep, Junior College, Dress Uniform
  - Assistant Manager: $14/hr, 50 Exp, 50 Dep, Business Admin., Business Uniform
  - Manager: $19/hr, 60 Exp, 60 Dep, Business Admin., Business Uniform
  - Broker: $22/hr, 70 Exp, 70 Dep, Business Admin. + Academic, Business Uniform
- **Black's Market**:
  - Janitor: $6/hr, 10 Exp, 10 Dep, No Degree, Casual Uniform
  - Checker: $8/hr, 20 Exp, 20 Dep, No Degree, Casual Uniform
  - Butcher: $12/hr, 30 Exp, 30 Dep, Trade School, Casual Uniform
  - Assistant Manager: $15/hr, 40 Exp, 40 Dep, Junior College, Dress Uniform
  - Manager: $18/hr, 50 Exp, 50 Dep, Business Admin., Business Uniform
- **Rent Office**:
  - Groundskeeper: $7/hr, 10 Exp, 20 Dep, No Degree, Casual Uniform
  - Apartment Manager: $9/hr, 30 Exp, 30 Dep, Junior College, Casual Uniform

## 3. Education and Degree Flows
Classes are taken at Hi-Tech U.
- **Degree Pre-requisites & Flow**:
  - **Junior College** & **Trade School**: No prerequisites. Always available.
  - **Business Administration**: Requires Junior College.
  - **Academic**: Requires Junior College.
  - **Electronics**: Requires Trade School.
  - **Pre-Engineering**: Requires Trade School.
  - **Graduate School**: Requires Academic.
  - **Engineering**: Requires Pre-Engineering.
  - **Post-Doctoral**: Requires Graduate School.
  - **Research**: Requires Post-Doctoral.
  - **Publishing**: Requires Research.
- **Studying Mechanics**:
  - Enrollment fee: $50 base (adjusted by Economic Index). 0 hours to enroll.
  - Study Session: Costs 6 Hours (requires at least 1 Hour left on the clock).
  - Degree length: 10 lessons base.
  - Duration reduction: -1 lesson if owning Computer, -1 lesson if owning all 3 books (Encyclopedia, Dictionary, Atlas). Cumulative up to -2 lessons (minimum 8 lessons).
  - Graduation Rewards: +5 Happiness, +5 Dependability, permanent +5 Max Dependability, permanent +5 Max Experience.

## 4. Housing and Rent Mechanics
- **Housing Tiers**:
  - **Low-Cost Housing**: Default starter housing. Rent is $325 base (adjusted by Economic Index). Subject to Wild Willy robberies. Robbery chance each turn is `1 / (Relaxation + 1)`. Each stealable Durable (B&W TV, TV, VCR, Stereo) has a 25% chance of being stolen.
  - **Security Apartments**: Rent is $475 base (adjusted by Economic Index). Completely immune to robberies. Closer to Black's Market, Bank, and Factory.
- **Rent Office Rules**:
  - Rent is due on Week 4 of each month. Paid at Rent Office (only open during Week 4).
  - Rent Advance: Can pay future months (adds 4 weeks to lease). Lost if switching apartments.
  - Rent Extension: Fails to pay on Week 4 triggers a 3-week extension.
  - Eviction/Downgrade:
    - Security Apartments: Evicted and downgraded to Low-Cost Housing if unpaid after extension. Displayed durables put in storage.
    - Low-Cost Housing: Cannot be evicted, but enters Rent Debt if unpaid after extension.
  - Rent Debt: 1/2 of wages garnished during work sessions to pay off debt + a $2 interest fee per garnish. Final garnish has no interest fee.

## 5. Economy
- **Economic Index/Reading**: Reading ranges from `-30` (depression) to `90` (boom).
- **Price/Tuition/Wage Formula**: `Price = Base + (Base * Reading) / 60` (ranges from 50% to 250% of Base).
  - Pawnhouse items, Lottery tickets, and Newspaper have fixed prices.
  - Wages and rent are static once locked in, but job offers and apartment listings change with the economy.

## 6. Random Events and Mechanics
- **Street Robbery (Wild Willy)**:
  - Triggers when carrying cash and leaving the Bank (1/31 chance) or Black's Market (1/51 chance). CD-ROM: Week #4 or later only.
  - Effect: Reduces cash to $0, -3 Happiness.
- **Doctor Visit**:
  - Triggers from Starvation (25%), Spoiled Food (50%), or Relaxation at 10 (20%).
  - Effect: Clock advances 10 Hours, -4 Happiness, cash loss $30 to $200. Bypassed entirely if carrying $0 cash.
- **Starvation**:
  - Triggers at turn start if no food eaten. Clock advances 20 Hours, -2 Happiness, 25% chance of Doctor Visit.
- **Lottery**:
  - Rolls a random number `R` between 0 and 500. Won if `R < Tickets`.
  - Prizes: `R <= Tickets / 20` ($5000), `R <= Tickets / 5` ($500), else $200. Tickets are consumed.
- **Market Crash**:
  - Chance: `1 / (1 + (20 * Players))` for Floppy; `1 / (1 + (30 * Players))` for CD-ROM.
  - Minor: Economy drops, -1 Happiness (-2 if >$1000 in stocks).
  - Moderate: Economy drops, 50% chance of firing, wages cut to 80%, -2 Happiness (-4 if >$1000 in stocks).
  - Major: Economy drops, 100% fired, Bank savings wiped out (T-Bills safe), -3 Happiness (-8 if >$1000 in stocks).

## 7. Items & Stores

### Appliances
| Item | Socket City Price | Z-Mart Price | Effects / Notes |
|---|---|---|---|
| Refrigerator | $876 | $650 | Prevents 6 units of Fresh Food from Spoiling. Can't be stolen by Wild Willy. |
| Freezer | $513 | -- | Together with Refrigerator, prevents 12 units of Fresh Food from Spoiling. Can't be stolen by Wild Willy. |
| Stove | $570 | $490 | Gives +1 Happiness at start of turn (not cumulative with Microwave). Can't be stolen by Wild Willy. |
| Color TV | $525 | $349 | Displayed at Security Apartment. |
| VCR | $333 | $250 | Displayed at Security Apartment. |
| Black & White TV | -- | $110 | |
| Stereo | $412 | $450 | Displayed at Security Apartment. |
| Microwave | $330 | $220 | Gives +1 Happiness at start of turn (not cumulative with Stove). |
| Hot Tub | $1255 | -- | Prevents Relaxation stat from decreasing each turn. |
| Computer | $1599 | -- | Reduces number of Courses required to complete a Degree by -1. 1-in-7 chance each turn to make $20-$100 and receive +3 Happiness. |

### Books (Z-Mart)
| Item | Base Price | Effects / Notes |
|---|---|---|
| Encyclopedia | $475 | Owner receives +1 Extra Credit if all three books are owned simultaneously. |
| Dictionary | $70 | Owner receives +1 Extra Credit if all three books are owned simultaneously. |
| Atlas | $55 | Owner receives +1 Extra Credit if all three books are owned simultaneously. |

### Clothes
| Item | Store | Base Price | Weeks of Clothing | Happiness |
|---|---|---|---|---|
| Casual Clothes | QT Clothing | $73 | 11 | -- |
| Casual Clothes | Z-Mart | $35 | 9 | -- |
| Dress Clothes | QT Clothing | $125 | 13 | +1 |
| Dress Clothes | Z-Mart | $90 | 9 | -- |
| Business Suit | QT Clothing | $295 | 13 | +2 |

### Food
| Item | Store | Price | Effects / Notes |
|---|---|---|---|
| Hamburgers | Monolith Burgers | $79 | Fast Food |
| Cheeseburger | Monolith Burgers | $89 | Fast Food, +1 Happiness |
| Astro Chicken | Monolith Burgers | $124 | Fast Food, +2 Happiness |
| Fries | Monolith Burgers | $65 | Fast Food |
| Food for 1 Week | Black's Market | $55 | Fresh Food, +1 Happiness |
| Food for 2 Weeks | Black's Market | $100 | Fresh Food, +2 Happiness |
| Food for 4 Weeks | Black's Market | $190 | Fresh Food, +4 Happiness |

### Tickets & Junk
| Item | Store | Price | Happiness Bonus |
|---|---|---|---|
| 10 Lottery Tickets | Black's Market | $10 | +2 |
| Baseball Tickets | Z-Mart | $45 | +2 |
| Theatre Tickets | Z-Mart | $30 | +2 |
| Concert Tickets | Z-Mart | $40 | +2 |
| Colas | Monolith Burgers | $69 | +1 |
| Shakes | Monolith Burgers | $102 | +2 |
| Newspaper | Black's Market | $1 | -- |
| Dog Food | Z-Mart | $18 | -1 |
| 8-Track Player | Z-Mart | $75 | -1 |
| Works of Capote | Z-Mart | $100 | -2 |

## 8. Pawn Shop Mechanics
- **Pawning**: Items can be pawned for a loan. Base payout is 40% of the item's original purchase price (adjusted for Economy). Pawning an item gives -1 Happiness.
- **Redeeming**: Cost to redeem is 1/2 of the original purchase price (NOT affected by Economy). Item is held for 3 Weeks. Only the player who pawned the item can redeem it.
- **Buying**: After 3 weeks, any player can buy the pawned item for 1/2 of the original purchase price. Appliances are flagged as "second hand", giving them a 1/36 chance to break down each turn (same as Z-Mart).
