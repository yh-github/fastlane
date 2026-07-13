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
  - Rent Extension: A player whose Rent is due can ask the Rent Officer for a 1-Week Extension. The first request is always approved. The chance of further approvals drops by 25% each time, down to a minimum of 25%. A player can only ask once per Turn, but there is no limit on consecutive extensions if approved. If a player ever goes into Rent Debt, future extensions are automatically denied for the rest of the game.
  - Eviction/Rent Debt: If a player fails to pay rent by the end of the month (and does not have an active extension), they enter Rent Debt. In the classic rules, players are never evicted from their apartment, even from Security Apartments. They may remain in Rent Debt indefinitely.
  - Optional Rule: Fast Lane Modernized adds an optional "Strict Eviction" rule where Security Apartment tenants are evicted and downgraded to Low-Cost Housing if they fail to pay rent.
  - Rent Debt Mechanics: 1/2 of wages garnished during work sessions to pay off debt + a $2 interest fee per garnish. Final garnish has no interest fee.

## 5. Economy
- **Economic Index/Reading**: Reading ranges from `-30` (depression) to `90` (boom).
- **Price/Tuition/Wage Formula**: `Price = Base + (Base * Reading) / 60` (ranges from 50% to 250% of Base).
  - Pawnhouse items, Lottery tickets, and Newspaper have fixed prices.
  - Rent offered for apartments you do not currently live in fluctuates. Once moved in, the rent is completely static.
  - Wages offered at the Employment Office fluctuate. If a player's current job is offered at a higher wage than they currently make, they may apply for it again to ask for a raise.
    - Applying for a raise wastes 4 Hours regardless of outcome.
    - Raises do NOT require an experience or education check, nor an RNG luck roll.
    - To get the raise, the player's Dependability must be greater than or equal to: `Required Dependability + (Raises Received * 5)`.
    - If successful, the wage increases immediately and the player gets +3 Happiness. If the wage offered is equal or less, the player just wastes 4 hours.

## 6. Relaxation Stat
- Each player has a "Relaxation" Stat that is set to 10 at the start of the game.
- The Relaxation stat can only be increased by Relaxing at the player's current Apartment, to a maximum of 50.
- The Relaxation Stat decreases by -1 point at the start of each Turn, unless the player own a Hot Tub (in which case the stat will not decrease at all). Relaxation can never drop below 10.

## 7. Random Events and Mechanics
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
  - Can only occur if the economy is better than its worst possible state (-30), and only on or after Week #8.
  - Chance: `1 / (1 + (20 * Players))` for Floppy; `1 / (1 + (30 * Players))` for CD-ROM.
  - Severity: 33% Minor, 33% Moderate, 33% Major.
  - All crashes bias the Economic trend downwards and instantly reduce prices (Minor: 5%, Moderate: 10%, Major: 20%).
  - **Minor**: Player whose turn it is loses Happiness (more if >$1000 in stocks).
  - **Moderate**: 50% chance for each player to be fired. If not fired, wage is cut to 80%.
  - **Major**: 100% of players fired. All Bank savings wiped out (Stocks and Cash unaffected).
- **Economic Boom**:
  - Can only occur if the economy is neutral or slightly better (>=0), and only on or after Week #8.
  - Chance: `1 / (1 + (30 * Players))` for all versions.
  - Biases the Economic trend upwards and instantly increases all prices by 10%.
  - Player whose turn it is gets +5 Happiness if they have >$1000 in stocks.

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
| Computer | $1599 | -- | Reduces Courses required for a Degree by 1. Purchasing gives +3 Happiness (first time only). 1-in-7 chance each turn to make $20-$100 and +3 Happiness. |

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
| Redeeming | Cost to redeem is 1/2 of the original purchase price (NOT affected by Economy). Item is held for 3 Weeks. Only the player who pawned the item can redeem it. |
| Buying | After 3 weeks, any player can buy the pawned item for 1/2 of the original purchase price. Appliances are flagged as "second hand", giving them a 1/36 chance to break down each turn (same as Z-Mart). |

## 9. Multiplayer Mechanics
- **Turn Structure:** The game supports up to four players in local "hot-seat" multiplayer. Each turn in the game represents one week. Players take turns sequentially to spend their hours for that week.
- **Player Order:** The player order remains fixed throughout the game, based on the initial selection of players at the start of the session. There is no dynamic turn-order mechanic.
- **Turn End:** Once all 60 Hours have been spent, the turn can end - but doesn't necessarily do so immediately. If the clock runs out while the player is still inside a Location, they may continue performing actions that do not require any time, e.g. purchasing Items or depositing money at the Bank. They may not Work, Relax, or perform any other action that costs Hours. If at any point the player leaves a Location while their time has run out, or is traveling across the board when their time runs out, their turn ends immediately. Once all players have finished their week, the weekend processing happens and a new week begins for all.
- **Competition:** Players compete to be the first to reach the predefined life goals (Wealth, Happiness, Education, and Career).

## 10. The "Jones" AI Opponent
- **Solo Play:** When playing solo (1 human player), the player competes against the AI-controlled opponent named "Jones". In multiplayer sessions with 2-4 human players, Jones typically does not participate as a competitor.
- **AI Behavior:** Jones functions as a competitive player bound by the same board game rules and time-management constraints as human players.
- **Strategic Decision-Making:** Jones is programmed with knowledge of the game's core requirements. He understands which jobs he qualifies for based on his current stats, prioritizes working, and knows when to balance other activities (like buying food and paying rent).
- **Survival Instincts:** The AI is designed to avoid losing; for example, Jones will not allow himself to starve if he can possibly avoid it.
- **Difficulty:** Jones is known as a challenging, efficient opponent who manages his progression optimally to reach the win conditions quickly.

## 11. Loans

A **Loan** is a sum of money given to the player by the Bank, with the promise to pay it back (with interest) over time.

To get a loan, the player must have at least a bit of personal wealth to back it up. Otherwise the request for a Loan can be refused by the Bank. The amount of money loaned to the player is also based on their personal wealth.

Payments must be made regularly by the end of the Month, though players can pay in advance to push the deadline back further. A player may pay back their entire loan all at once, if they wish.

Failure to pay on time results in a slight loss of Happiness, but the Bank will not attempt to collect forcibly. Instead, failing to pay one's loan debt only results in lower chance to get additional loans in the future.

### Applying for a Loan

To get a **Loan**, the player must visit the Bank and click "Apply for a Loan". Clicking this option advances the clock by 2 Hours. It does nothing if the player's Turn is already over.

Once the button is clicked, the Bank has to decide whether to approve the loan. This is done by weighing two factors against each other: The player's **Liquidity** and their **Risk Factor** (both explained below).

If a player's Liquidity is *less than or equal to* their Risk, or if the player is currently in Default on an existing loan, the loan will be rejected. This gives the player **-1 Happiness**.

If a player's Liquidity is *greater than* their Risk, the loan will be approved. The player receives a certain amount of Cash immediately (see next chapter), as well as **+5 Happiness**. The first Loan Payment is set to be due at the start of the next Month.

#### Liquidity

**Liquidity** is a rough measurement of the player's capability to pay back a Loan, based on their current financial situation and estimated wealth.

Liquidity is based entirely on the player's current Wage and their Liquid Assets. Therefore getting a better job, and/or accumulating more money, increase the chance to be approved for a loan.

`Liquidity = Current Wage + (Liquid Assets / 1000)`

#### Risk Factor

**Risk** is a rough measurement of the player's unlikelihood to pay back a loan on time, as demonstrated by their past behavior with previous Loans.

If the player has never taken a Loan before, or has paid back all previous loans without Defaulting, their Risk factor **is equal to 5**.

If the player currently *has* a loan, or has Defaulted on a loan at any point in the game, the formula is more complicated:

`Risk Factor = 5 + Times Defaulted so far + (Current Loan Debt / 100) + (1 if Current Debt > 0)`

Thus, currently *having* a loan makes it less likely to get more loan money until the debt is fully paid; whereas the more times you Default on a Loan the harder to get loans in the future altogether.

### Loan Size

The amount of Loan money given to the player changes based on their current circumstances. It is equal to their **Liquidity** minus their **Risk Factor**, multiplied by 100.

`Loan Size = $100 * (Liquidity - Risk)`

The result is reported to the player before they apply for the Loan.

### Loan Payments

At any time, the player may go to the Bank to pay back part or all of their Loan Debt.

To make a Loan Payment, the player must have at least $50 in Cash, or as much as is left in their Loan Debt (whichever is lower). Click the "Loan Payment" button to make the payment. You can do this even if the clock has already run out.

Each click of the "Loan Payment" button removes $50 from the player's Cash. $45 are deducted from their Loan Debt, while $5 are paid to the Bank as an Interest Fee.

If the player's current Loan Debt is smaller than $50, that entire amount will be paid and the Debt will be completely cleared. No Interest Fee is paid in this case.

So long as the debt is *not* fully cleared, each Loan Payment pushes the deadline for the next loan payment forward by four Weeks (one Month). Therefore, the player can make multiple Loan Payments to push the deadline forward so they don't have to worry about going to the Bank any time soon.

At the start of the player's Turn on the fourth Week of every Month, if the player has any Loan Debt remaining they receive a notice stating that their debt is "Payable". Failing to make at least one Loan Payment *by the end of that Turn* will result in the player Defaulting on their loan. This impacts their chance to get additional Loans in the future (see Risk Factor, above).

### Loan Default

If a player's loan payment is due (on the fourth Week of the Month) and they do not make any Loan Payments by the end of that same turn, they are said to have "**Defaulted**" on their Loan.

Once a player is in Default, if they keep withholding payments to the Bank they'll receive a more urgent message on the fourth Week of the coming Month indicating that they are delinquent in their payments. This message comes with a penalty of **-1 Happiness**. The player will Default *again* if they do not make a payment by the end of that same turn.

This situation continues until the player makes one Loan Payment *for each month they've missed*. If they make those payments, they are no longer considered to be in Default.

If the player is *currently* in Default, any Loan applications will automatically be rejected by the bank.

The game keeps track of the number of times a player has Defaulted since the start of the game. This counter never decreases. The number of times the player has Defaulted so far is taken into account as part of their Risk Factor. This makes it harder to get Loans in the future (even after the player has repaid all of their Debts), and reduces the amount of money the Bank is willing to pay out for each Loan, as explained in the previous chapters above.
