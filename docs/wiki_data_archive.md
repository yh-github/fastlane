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
  - **Low-Cost Housing**: Default starter housing. Rent is $325 base (adjusted by Economic Index). Subject to Wild Willy robberies. Robbery chance each turn is `1 / (Relaxation + 1)`. In the base game version, all appliances in inventory have a 25% chance of being stolen. Protecting heavy built-in appliances (Refrigerator, Freezer, Stove) is available via an optional rule (`protectBuiltInAppliances`).
  - **Security Apartments**: Rent is $475 base (adjusted by Economic Index). Completely immune to robberies. Closer to Black's Market, Bank, and Factory.
- **Rent Office Rules**:
  - Rent is due on Week 4 of each month. Paid at Rent Office (open during Week 4, when rent is due, or when employed there).
  - Rent Advance: Can pay future months (adds 4 weeks to lease). Lost if switching apartments.
  - Rent Extension: A player whose Rent is due can ask the Rent Officer for a 1-Week Extension. The first request is always approved. The chance of further approvals drops by 25% each time, down to a minimum of 25%. A player can only ask once per Turn, but there is no limit on consecutive extensions if approved. If a player ever goes into Rent Debt, future extensions are automatically denied for the rest of the game.
  - Eviction/Rent Debt: If a player fails to pay rent by the end of the month (and does not have an active extension), they enter Rent Debt. In the classic rules, players are never evicted from their apartment.
  - Optional Rule: Fast Lane Modernized adds an optional "Strict Eviction" rule where rent debt garnishes salary as usual, but if rent debt exceeds 1 month's rent a warning is given, and if rent debt exceeds 2 months' rent, Security Apartment tenants are evicted and downgraded to Low-Cost Housing.
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
- Each player has a "Relaxation" Stat that is set to 16 at the start of the game.
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
- **Pawning**: Items can be pawned for a loan. Base payout is 40% of the item's original purchase price (adjusted for Economy). Pawning an item gives -1 Happiness. The shop holds max 6 items total across all players, and duplicate item types cannot be pawned until redeemed or sold.
- **Redeeming**: Cost to redeem is 1/2 of the original purchase price (NOT affected by Economy). Item is held in reserve for 3 Weeks (including the week it was pawned). Only the player who pawned the item can redeem it. Redeeming restores the item in its original condition (retaining its original purchase source, e.g. Socket City).
- **Buying**: After 3 weeks of being unredeemed, an item becomes property of the Pawn Shop and goes up for sale. Any player can buy it for 1/2 of its original purchase price. Buying items gives no Happiness points. Buying an Appliance from the Pawn Shop flags it as a "second hand Appliance", giving it a 1/36 chance to break down each turn (same as Z-Mart), even if it was originally purchased at Socket City.

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

## 12. Career Goal

The **Career Goal** is one of four Goals a player must meet in order to win a game of Jones in the Fast Lane.

The precise goal to fulfill is determined at the beginning of the game, separately for each player. Its range is between 10 and 100.

Fulfilling a player's Career Goal requires them to increase their Career Stat, which is directly proportional to the player's Dependibility. This stat is then compared to their Career Goal to determine whether they've fulfilled it.

Dependibility is increased by Working, but is limited by several factors. The limits must be increased to allow Dependibility to increase as needed for the Career Stat.

Since Dependibility decreases each Turn, it is possible to "unfulfill" the Career Goal after it had already been fulfilled.

### Career Stat

At the start of the game, each player's Career Stat is equal to 0. It will remain 0 so long as the player does not have a Job. If the player ever loses their job, the Career Stat gets temporarily set to 0 until they can find a new Job.

Once the player acquires a Job, their Career Stat is immediately set to `1.25 * Dependibility`, and will continue tracking the Dependibility stat this way as long as the player remains employed.

As such, for a player to get 100 in their Career Stat, they would need to have 80 Dependibility.

Note that Dependibility is limited according to the parameters of the player's current Job. Only high-paying jobs allow Dependibility to increase to high levels. On the other hand, Degrees help push the limit higher than the job itself would allow.

## 13. Education Goal

The **Education Goal** is one of four Goals a player must meet in order to win a game of Jones in the Fast Lane.

The precise goal to fulfill is determined at the beginning of the game, separately for each player. Its range is between 10 and 100.

Fulfilling a player's Education Goal requires them to earn Degrees at Hi-Tech U. Each Degree adds 9 points to their Education Stat. This stat is then compared to their Education Goal to determine whether they've fulfilled it.

Since the number of Degrees a player owns cannot decrease during the game, once the Education Goal is fulfilled it will remain fulfilled.

### Education Stat

At the start of the game, each player's Education Stat is equal to 1.

A player's current Education Stat is recalculated each time they earn a new Degree at Hi-Tech U by completing a course.

Each Degree acquired adds exactly 9 points to the Education Stat.

With exactly 11 Degrees available in the game, the maximum achievable Education Stat is 1 + (11*9) = 100.

This Stat is then compared to the Education Goal to determine whether the player has accomplished that goal. For example, if the player has an Education Goal of 50 (the default), they need to earn at least 50 Education Stat points to achieve it (by completing at least 6 Degrees).

## 14. Wealth Goal

The **Wealth Goal** is one of four Goals a player must meet in order to win a game of Jones in the Fast Lane.

The precise goal to fulfill is determined at the beginning of the game, separately for each player. Its range is between 10 and 100.

Fulfilling a player's Wealth Goal is a simply function of accumulating money. To count towards the Wealth Goal, the money must be held in Cash, in the Bank, or in Stocks.

### Liquid Assets

To measure a player's progress towards fulfilling their Wealth Goal, the game calculates and tracks a special hidden Stat called "Liquid Assets".

The Liquid Assets Stat is equal to the sum of all of the following:

* All Cash currently in the player's wallet.
* All money currently deposited in the player's Bank account.
* The current total value of all Stocks owned by the player, based on their price this Turn.

This sum is recalculated constantly as the player's assets fluctuate, but the only calculation that really matters happens at the start of the player's turn, just before the game checks whether they've won.

Each $100 the player owns in Liquid Assets is worth 1 point towards their Wealth Goal. Thus, a player needs exactly $10,000 in Liquid Assets to fulfill a 100-point Wealth Goal.

Note that the Liquid Assets formula **completely ignores all Items owned by the player**, including even expensive Durables like the Computer. Thus, purchasing Items actually *decreases* the player's advancement towards the Wealth goal, since it spends liquid money on assets that don't count. This can be confusing, since the Liquid Assets stat is *not* displayed in the player's Statistics page, but "Net Worth" *is* (which does take Items into account).

This also means that owning multiple Durables of the same type (e.g. two Refrigerators) doesn't help the player *at all*, and is actually a detriment to their progress towards the Wealth Goal!

A '''Job''' is the permission to [[#Working|Work]] at a specific [[Workplace]] and receive a specific hourly [[Wage]]. Each Workplace in the game offers 2 to 9 different Jobs, usually at different Wages.

Players may apply for Jobs at the [[Employment Office]]. Each Job has three minimum requirements ([[Experience]], [[Dependibility]] and [[Degrees|Education]]) that must be met in order to be hired for that Job.

Pressing the "Work" button at a player's Workplace causes the player to spend several [[Hour]]s of their time in exchange for a proportional amount of [[Cash]], based on their current Wage.

Certain events can cause players to lose their Jobs or get a Wage cut. Players can also ask for a [[Raise]] at the Employment Office as the [[Economy]] improves. 

Players can't work at their Jobs if they don't own the required [[Uniform]] (or better).

Players can only achieve their [[Career Goal]] by getting a sufficiently high-paying Job.

== List of Jobs ==

See [[List of Jobs]].

== Getting a Job ==

At the start of the game, all players are unemployed (they have no job). In order to work and make money, each player must apply for a Job.

Jobs are acquired at the [[Employment Office]]. Players may apply for a new job at any time before the end of their turn.

To get a new Job, the player must qualify for that job. Each job has three requirements:

* '''[[Experience]]:''' Gained by [[#Working|Working]], but there is a limit to how much Experience a player can get at any Job; Better jobs allow accumulating more Experience.
* '''[[Dependibility]]:''' Gained by [[#Working|Working]], but there is a limit to how much Dependibility a player can get at any Job; Better jobs allow accumulating more Dependibility. This stat '''gradually decreases every [[Week]]'''.
* '''[[Degrees|Education]]:''' Gained by [[Hi-Tech U#Graduting|Graduating]] from courses at [[Hi-Tech U]]. Some Jobs have no Education requirements, but many Jobs require the player to hold one or two ''specific'' [[Degree]]s.

Additionally, there is a luck-based random factor that may prevent a player from getting a ''specific'' job until the end of their current turn.

If a player manages to get a new Job, they can immediately start Working at their new [[Workplace]].

== Working ==

[[File:Item WorkClock Animated.gif|thumb|The Work Clock appears each time the "Work" button is pressed.]]
Whenever the player is at their current [[Workplace]], a button labeled "Work" appears at the bottom left of the center menu.

Clicking this button attempts to trigger a "Work Session". If successful, the player will spend 6 [[Hour]]s working, and will make an amount of [[Cash]] equivalent to 8 times their [[Wage]].

If the player has fewer than 6 Hours remaining on the clock when clicking the "Work" button, they will receive less payment relative to how many Hours are left.

Players are not allowed to Work if their [[Turn]] is over. Players also can't work if they aren't wearing the [[Uniform]] required by their job.

Should the player lack sufficient [[Dependibility]] when attempting to Work, they may get [[#Getting Fired|Fired]] from their Job. This does not prevent them from getting the same Job again later, but the low Dependibility has to be rectified first.

If the player is in [[Rent Debt]], their income will be [[Garnishment|Garnished]] when they Work - taking half of the earned money to pay off part of the Debt, plus $2 as an Interest Fee.

Working increases the player's [[Dependibility]] and [[Experience]], as long as these stats have not yet reached their maximums. The maximums are different for each Job, depending primarily on the Job's requirements for these two stats.

== Wages ==

When a player is hired for a new Job, their [[Wage]] is set to the value listed at the [[Employment Office]].

The amount of money a player earns for a full 6 [[Hour]]s of [[#Working|Work]] is equal to exactly '''8 times their current [[Wage]]'''.

Working when there are fewer than 6 hours left on the clock reduces the earnings proportionally:

<math>Money \ Earned = {Current \ Wage \times 8 \times Hours \ Remaining \over 6}</math>

Different Jobs have a different "Base Wage". This value determines which jobs are more lucrative than others. However, the actual Wage for each Job is influenced by the [[Economy]], and will fluctuate up and down during the game.

The player normally keeps their original wage. Only specific player actions (like changing Jobs or [[Employment Office#Asking for a Raise|Asking for a Raise]]) or major [[Market Crash]]es can causes it to change.

== Losing a Job ==

There are two cases in which players can lose their current Job:

[[File:Notice_Fired.png|thumb|right|Notice received when fired due to a [[Market Crash]].]]
# '''Insufficient [[Dependibility]].''' This occurs if the player's Dependibility drops 5 points below the [[Required Dependibility]] for their current Job. This happens if the player has not gone to work for a while, since Dependibility increases when Working but decreases constantly every [[Week]]. Earning [[Degrees|University Degrees]] helps decrease the minimum required Dependibility for this calculation.
# '''A severe [[Market Crash]] event'''. This may occur at random at the start of any player's [[Turn]]. If this occurs, each player has a chance to lose their Job instantly (even if it happens on another player's turn). The worse the Crash, the higher the chance (up to 100% chance in the worst type of Crash).

In both cases, the player is allowed to get another Job immediately. Depending on various conditions, they may or may not be able to get the same Job they'd just lost. The only penalty for losing a Job is a loss of [[Happiness]]; Getting fired does not negatively affect future job applications.

== Unemployment ==

Players are allowed to remain unemployed if they don't currently need a job - e.g. when they have plenty of [[Cash]] and just want to spend more time [[Relaxation|Relaxing]] or [[Studying]].

However, in order to fulfill one's [[Career Goal]], no matter how high it is, the player must have a job. This is because progress on the Career Goal is set to 0 while the player is unemployed, even if their [[Dependibility]] is currently sky-high. In such a case, the player may simply take the [[Cook]] job if they don't want to bother looking for an actual job.

Being unemployed also prevents the player from getting a Bank Loan.

Note that there is no unemployment insurance in the game. The only ways to make money other than working a Job are to play the Stock Market or the Lottery, both of which are very risky.

## 15. Pawn Shop

The **Pawn Shop** is a Location where players can pawn their Durables, redeem them, and buy other players' pawned items that have been put up for sale.

Pawning an item gives the player a small amount of money - around 40% of the item's original purchase price.

For the next few Weeks, the player who pawned the item may Redeem it for 1/2 of its original purchase price.

If the item is left at the Pawn Shop for more than a few Weeks, it goes up for sale and can now be bought by any player for 1/2 of its original price.

### Opening Hours

The **Pawn Shop** is open every Week. You may pawn, redeem, and purchase items even if the turn has ended while you're in the store.

### Pawning

"Pawning" is the act of putting an item up as collateral in exchange for a small loan. If the loan is not paid back in time, the Pawn Broker becomes the permanent owner of the item. This is a way to exchange Durables for some emergency money, and gives the player the opportunity to get their item back if they can return the money quickly enough.

When selecting the "Pawn" option at the **Pawn Shop**, the game displays a list of each Durable in the player's inventory. Select a Durable from this list to offer it to the Pawn Shop.

After selecting the item, the game displays the size of the loan that would be received in exchange for it. At this point the player can still refuse the offer, keeping their item.

The base payment for any item is equal to **40% of its original purchase price**, adjusted for the current Economy.

If the player agrees to the offer, they receive the stated amount of money in Cash. The item is removed from their inventory and passed to the Pawn Shop as collateral.

Each time a player pawns an item, they receive **-1 Happiness**.

#### Item Limits

If any player has pawned an item, the Pawn Shop will refuse to accept any additional items of the same type. Even other players may not pawn the same type of item again. This persists until the item is Redeemed or sold.

For example, if a player pawns a Microwave, no player may pawn another Microwave until that first Microwave is Redeemed or sold.

Furthermore, the **Pawn Shop** can only hold 6 different items at a time, no matter who they belong to. Any attempt to pawn another item will be rejected. Pawning can only resume once at least one item has been Redeemed or sold.

### Redeeming

"Redeeming" is the act of returning the money accepted for a pawned item -- with interest -- in exchange for the pawned item.

The Pawn Shop holds a pawned item in reserve for 3 Weeks, *including* the week on which it was pawned. Only the player who pawned the item may Redeem it during those three weeks.

The cost to redeem an item is equal to **1/2 its original Purchase Price**, ***not* adjusted** by the Economy. This can occasionally be *less* than the money received for the item, if the Economy was worse when the item was purchased than when it was Pawned.

At the end of the player's Turn on the third Week after Pawning an item, the item becomes the property of the Pawn Shop. It is put up for sale, and can now be purchased by any player.

### Buying

Once an item has become property of the Pawn Shop (see above), the shop immediately puts it up for sale. Any player may now purchase the item for **1/2 of its original purchase price**. This is typically a real bargain, easily rivaling prices for similar items at the Z-Mart.

Buying items from the Pawn Shop does not give the player any Happiness points.

Buying an Appliance from the Pawn Shop flags it as a "second hand Appliance", giving it a 1/36 chance to break down each turn - the same as Appliances purchased from Z-Mart. The item is flagged even if it was pawned just a few weeks earlier right after being purchased from Socket City.

### Quotes (Pawn Broker NPC)

#### Greetings
* *Welcome to the Pawn Shop. Nothing is too hot for us to handle.*
* *Welcome to the Pawn Shop. Down on your luck? Save the story for someone who hasn't heard it.*
* *Welcome to the Pawn Shop. I may look mean on the outside, but I've got a heart of stone.*
* *Welcome to the Pawn Shop. Why crawl to anybody else?*
* *Welcome to the Pawn Shop, where we pardon your beg!*
* *Welcome to the Pawn Shop. Your first stop on the way down the corporate ladder!*
* *Welcome to the Pawn Shop. Where 'pawn' is just another word for nothing left to lose!*
* *Welcome to the Pawn Shop. Please don't beg, it scuffs the carpet.*

## Z-Mart
The '''Z-Mart''' (or '''Discount Store''') is a [[Location]] where players can buy various [[Items]] at discount prices. It is also a [[Workplace]].

At the start of each player's turn, 6 items are chosen at random to be put up for sale at the Z-Mart. The items are randomized again at the start of the next player's turn. Some of these items can be purchased at other stores, but will ''usually'' (not always!) be cheaper at the Z-Mart. Other items can only be purchased here.

[[Appliances]] bought at Z-Mart have a higher likelyhood of requiring [[Repair]].

Jobs at the Z-Mart are relatively easy to get, but the higher-paying jobs require proportionally better [[Uniform]]s.

---

## Monolith Burgers

Monolith Burgers is a Location where players can buy Fast Food and Soft Drinks. It is also a Workplace.

Fast Food is the only way to avoid Starvation until you can buy a Refrigerator, but must be bought every single Week. Soft Drinks only increase Happiness for money.

Jobs at Monolith Burgers are very easy to get, especially the Cook job which will *never* reject an application. Only the highest-paying job here requires more than Casual Clothes as a Uniform.

### Opening Hours
Open every Week. You may purchase items even if your turn has ended while you're in the store.

### Items

Purchasing at least one Fast Food item prevents Starvation at the start of the player's next Turn. The more expensive Fast Food items also provide a small bonus to Happiness; Fast Food can only give one Happiness bonus per turn, no matter how many are purchased and from what types. All purchased Fast Food items disappear from the player's inventory at the start of their next Turn.

The first Soft Drink purchased during the player's Turn provides a Happiness bonus. Additional purchases that same turn do nothing. Soft Drinks do not prevent Starvation.

| Item | Type | Base Price | Happiness |
|------|------|-----------|-----------|
| Hamburgers | Fast Food | $79 | -- |
| Cheeseburger | Fast Food | $89 | +1 |
| Astro Chicken | Fast Food | $124 | +2 |
| Fries | Fast Food | $65 | -- |
| Shakes | Soft Drink | $102 | +2 |
| Colas | Soft Drink | $69 | +1 |

Actual prices are affected by the Economy.

### Jobs

| Job | Base Wage | Req. Experience | Req. Dependability | Req. Degrees | Uniform |
|-----|-----------|----------------|-------------------|--------------|---------|
| Cook | $5 | 0 | 10 | -- | Casual Clothes |
| Clerk | $6 | 10 | 20 | -- | Casual Clothes |
| Assistant Manager | $7 | 20 | 30 | -- | Casual Clothes |
| Manager | $8 | 30 | 40 | Junior College | Dress Clothes |

Note: Cook is the only job in the game that *never* rejects an application.

### Trivia
The "Monolith Burgers" franchise was first featured in Sierra On-Line's *Space Quest III*, where it was a space diner serving bizarre alien meals. "Astro Chicken" was the name of an arcade game at that diner, central to that game's plot.

---

## Rent Office

The **Rent Office** is a Location where players can go to pay their Rent and to switch Apartments. It is also a Workplace.

Unless the player has a Job at the Rent Office, or has a Rent Extension, the Rent Office will only be open on the last Week of each Month.

Jobs at the Rent Office pay fairly well, are relatively easy to get, and do not require a Uniform, making this a good workplace in the early game.

### Opening Hours

Unlike other Locations, the Rent Office will only be open if any of these three conditions is met:

* The player has a Job at the Rent Office, in which case it will be open every Week.
* The player has a Rent Extension at the Rent Office, in which case it will be open that week.
* It is the last Week of the Month, in which case the Rent Office is open to everyone.

If none of these conditions are met, the Rent Office will be closed and inaccessible.

### Services

**NOTE:** Rent Office services are only available on the last Week of the Month; or while on Rent Extension. If the *only* reason the Rent Office is open to you this Week is because you work there, no services will be available here.

#### Pay Rent

You may pay your Rent here. Doing so will erase your entire Rent Debt until the end of the current Month.

If you have a standing Rent Debt, you can pay it all off by choosing this option.

Clicking this option again will buy you an additional rent-free month. In other words, you will not have to visit the Rent Office for one additional month. You may do this as many times as you can afford.

#### Ask for Rent Extension

You may ask the Rent Officer for a Rent Extension. This gives you one extra Week to get the necessary money to pay your Rent.

You may apply for a Rent Extension once a Turn. You may even do so on consecutive turns if you want, potentially extending your Rent payment by a whole month or more. However, the chance of your extension request being approved decreases each time you apply for one -- consecutively or otherwise.

Failure to pay the Rent by the end of the Extension results in Rent Debt, the same as if you'd never asked for an Extension at all.

If you ever have your Wages Garnished due to Rent Debt, any further attempts to get a Rent Extension **will automatically fail** until the end of the game.

#### Pay Garnishment

If you are in Rent Debt, but have managed to acquire the entire sum in Cash, you may pay off your entire debt instantly at the Rent Office.

Generally speaking, there are two reasons to do this:
* To avoid the interest fees you would otherwise pay during Garnishment.
* To immediately stop your Rent Debt from negatively affecting your Liquid Assets. This is important when you are very close to your Wealth Goal, and are trying to reach it as soon as possible.

#### Switch Apartments

You may pay to rent an Apartment of a different type than the one you own. If you live at Low-Cost Apartments, you may switch to Le Security Apartments, and vice versa.

Switching Apartments requires you to pay one month's worth of Rent for the new apartment.

Any Rent money you've already down-paid for your current Apartment is forfeited.

You will still need to pay off any Rent Debt you owe for your previous apartment, as normal.

#### Reduce Rent

If the Rent Office is currently offering the same type of Apartment you own for a lower Rent, you may reduce your rent by switching over to the other type of apartment, and then immediately switching back. This is costly in the short term, but can save a lot of money in the long term.

### Jobs

| Job | Base Wage | Req. Experience | Req. Dependability | Req. Degrees | Uniform |
|-----|-----------|----------------|-------------------|--------------|---------| 
| Groundskeeper | $7 | 10 | 20 | -- | Casual Clothes |
| Apartment Manager | $9 | 30 | 30 | Junior College | Casual Clothes |

### Quotes (Rent Officer NPC)

#### Greetings
* *Welcome to the Rent Office. Don't snivel. Just pay your rent and leave.*
* *Welcome to the Rent Office. The rent is high, but where else can you get so little for so much.*
* *Welcome to the Rent Office. We don't charge any extra rent for the cockroaches.*
* *Welcome to the Rental Office. No waterbeds, pets or velvet toreador paintings, please.*
* *Welcome to the Rental Office. Where Sunday is Double Rent Increase Day!*
* *Welcome to the Rental Office. Our closets are so roomy, you'll never want to come out!*
* *Welcome to the Rental Office. Our security apartments feature 24-hour eunuch guards!*
* *Welcome to the Rental Office. Come in and meet your slumlo...I mean, your landlord!*

#### Pay Rent
* *Thank you. See you soon.*
* *Come back again soon.*
* *I'm here for all of your renting needs.*
* *Please tell all your rich friends about m... I mean us.*
* *Thank You, but please don't call me at 4 in the morning again.*

#### Extension Approved
* *Sure, you can pay your rent next week.*
* *I already told you Yes!*

#### Extension Rejected
* *Sorry, your rent must be paid now.*
* *I'll say it again. NO!*
* *WhaddoI look like? A bank?. Get outa here!*
* *If I told you once, I've told you a thousand times. NO!!!!!*
* *Click on that button one more time and I'll break your finger.*

#### Renting Low-Cost Housing
* *Ah. Well, I expect you'll find the neighborhood quite challenging.*
* *Oh. Well, hopefully you'll still be around at rent time.*
* *Of course, that comes furnished with a disgusting old chair. Enjoy!*
* *You'll be happy to know that we just put a fresh battery in the smoke detector.*
* *Just remember, the cockroaches are more frightened of you than you are of them.*

#### Renting Security Apartment
* *Just a few rules: no pets, no children, no smoking, no parties, and no jogging in the halls.*
* *You'll love it! 24-hour security, spa, exercise room and free parking for BMWs.*
* *A wise choice. Our other building has just been condemned.*
* *Oh, good! You'll fit right in...EVERYBODY there has an attitude.*
* *We've just put in a sun deck for your slow-roasting pleasure.*

---

## Black's Market

**Black's Market** is a Location where players can buy Fresh Food, Lottery Tickets, and read the Newspaper. It is also a Workplace.

Fresh Food can only be stored in a Refrigerator, otherwise it will Spoil and make the player sick. However it can be bought in larger quantities than Fast Food, and remains in your inventory from Week to Week.

The Lottery is a way to gamble for a Cash prize. The Newspaper allows tracking events, and may reveal tips about Stock Market investments.

Jobs at Black's Market are generally very desirable. Most are easy to get, and they pay well. A Job here also allows a player to purchase Fresh Food right after Work, and Black's Market is very near to important late-game locations like the Bank and Le Security Apartments.

### Opening Hours

Black's Market is open every Week. You may purchase items even if the turn has ended while you're in the store.

### Items

Black's Market's primary sale item is Fresh Food, which can be bought in groups of 1, 2, or 4 units. So long as the player owns a Refrigerator, Fresh Food is consumed at a rate of 1 unit per Week, preventing Starvation until it runs out. A Refrigerator can store up to 6 units without Spoiling, while a Refrigerator + Freezer can store up to 12 units. Buying Fresh Food awards **+1 Happiness** per every unit purchased.

```
{{Item Infobox Template
   | image1 = [[File:Item_LotteryTickets.png]]
   | type = [[Ticket]]
   | where_to_buy = [[Black's Market]]
   | base_price = $10 (fixed price)
   | effect = The player participates in the [[Lottery]] at the start of the next [[Turn]]. More tickets equal a better chance to win, and a better chance to win higher prizes.
   | happiness = +2 for first purchase each [[Turn]]
}}
'''Lottery Tickets''' are a type of [[Ticket]].

Lottery Tickets can be purchased at [[Black's Market]] for exactly $10. This price is fixed, and does not change with the [[Economy]]. Each $10 purchase gives the player 10 Lottery Tickets.

The player receives '''+2 Happiness''' for the first batch of Lottery Tickets they buy each [[Turn]]. Additional Lottery Tickets purchased during the same turn do not provide any extra Happiness.

At the start of a player's Turn, if that player has any number of Lottery Tickets in their inventory, they get to participate in the [[Lottery]]. The number of tickets they purchased in the previous turn affects both their chance to win ''any'' prize, as well as their chance to win the larger prizes.

500 Lottery Tickets (costing $500 in total) are required to ''guarantee'' a win. However, this only guarantees a prize of $200, which is a net loss. 500 tickets give only a 20% chance of winning back the whole $500 ("breaking even"). They do however also grant a 5% chance of winning the grand prize of $5,000.

All Lottery Tickets are removed from the player's inventory at the start of each turn (after the Lottery is finished processing them). They do not carry over to subsequent turns.

[[Category:Tickets]]
```

Reading the Newspaper is the only purchase action that requires at least 1 Hour left on the clock. Each purchase of a Newspaper advances time by 1 Hour. It has no direct benefit, though it may reveal important information about the Economy and the Stock Market.

| Item | Type | Base Price | Notes |
|------|------|-----------|-------|
| Food for 1 Week | Fresh Food | $55 | +1 Happiness, only on the first purchase of Fresh Food each Turn. |
| Food for 2 Weeks | Fresh Food | $100 | +2 Happiness, only on the first purchase of Fresh Food each Turn. |
| Food for 4 Weeks | Fresh Food | $190 | +4 Happiness, only on the first purchase of Fresh Food each Turn. |
| 10 Lottery Tickets | Tickets | $10 * | +2 Happiness, only on the first purchase each Turn. |
| Newspaper | Junk | $1 * | Displays the last headline that appeared this turn. Requires at least 1 Hour left on the clock, advances time by 1 Hour each purchase. |

Actual prices of Fresh Food at Black's Market are affected by the Economy. Prices for Lottery Tickets and Newspaper are fixed and will never change.

### Jobs

| Job | Base Wage | Req. Experience | Req. Dependability | Req. Degrees | Uniform |
|-----|-----------|----------------|-------------------|--------------|---------| 
| Janitor | $5 | 10 | 10 | -- | Casual Clothes |
| Checker | $8 | 20 | 20 | -- | Casual Clothes |
| Butcher | $12 | 30 | 30 | Trade School | Casual Clothes |
| Assistant Manager | $15 | 40 | 40 | Junior College | Dress Clothes |
| Manager | $18 | 50 | 50 | Business Admin. | Business Suit |

### Quotes (Checker NPC)

#### Greetings
* *Welcome to Black's Market. Where quality and service are unheard of and you will stand in line forever.*
* *Welcome to Black's Market, where you can grow old in our checkout lines.*
* *Welcome to Black's Market. Our meats are a cut above!*
* *Welcome to Black's Market. You can't beat our eggs!*
* *Welcome to Black's Market, where every day is Double Coupon Day!*
* *Welcome to Black's Market. Look for our special on day-old sushi!*
* *Welcome to Black's Market. Open all day and night for your binging pleasure!*
* *Welcome to Black's Market. Lowest prices in town on pickled octopus!*
* *Welcome to Black's Market. Hey, check out those melons!*
* *Welcome to Black's Market. Our butcher loves to stop and chew the fat!*
* *Welcome to Black's Market. Don't bypass our artichoke hearts!*
* *Welcome to Black's Market. This time, please don't take home the shopping cart.*
* *Welcome to Black's Market, the grosser grocer!*
* *Welcome to Black's Market. Our Swiss Cheese is made from Hole Milk!*

#### Bought an Item
* *Would you like fries with that? Oops, sorry, I usedta work at Monolith Burger.*
* *Just so you know, we saw you eating those grapes in the produce section.*
* *Cookies, ice cream and soda? Any REAL food in that shopping cart?*
* *If you wanna write a check, I need 8 forms of ID and a blood sample.*
* *You had eleven items, not ten. Next time, use the right aisle.*
* *One of your eggs is broken. Better use it quickly.*
* *Price check, please...a 5-pound box of Quintuple-Stuff Sandwich Cookies!*
* *Have you tried the Deli Department's Cheezy Sweet 'n Saurkraut Salad?*
* *Thank You. See you next time*
* *Will that be paper or plastic?*
* *Have a Good day.*
* *We appreciate your business.*
* *It's clear that you are a person who knows how to shop.*
* *I'm happy to see that you're well today.*
* *Thank you for shopping at Black's Market.*
* *Next time, give peas a chance!*
* *No tipping, please!*
* *Can we help you out to your marble?*
* *Come back for all your grocery needs!*
* *Say, two more trips and you'll have enough stamps!*
* *Hope you didn't buy any of those recalled mushrooms last week!*
* *Next time, don't dent the cans and expect a discount.*
* *Your selection of food indicates you're compensating for a lack of affection.*
* *Please be more careful with the mayonnaise in Aisle 7 next time.*
* *Arugla, Raddichio and Belgian Endive? What a yuppie!*
* *I'm sorry we were out of those little corns this week.*
* *Would you like to be a checker? OK. YOU'RE A RED ONE.*
* *Look in our Italian Pet Food section for Dog Ciao!*
* *If you can find lower prices on groceries, you're playing a different game.*
* *Check out our corn...you'll love to nibble our ears.*
* *Our celery stalks at midnight.*
* *Meet our dairy department managers, Sam 'n Ella!*

---

## QT Clothing

**QT Clothing** is a Location where players can buy new Clothes. It is also a Workplace.

Clothes are required in order to Work anywhere. Certain jobs - especially high-paying jobs - require specific minimum Uniforms beyond the basic Casual Clothes. Clothes deteriorate over time, and therefore must be purchased regularly every few Months. Clothes purchased at QT Clothing cost more than those purchased at Z-Mart, but also last longer. QT Clothing is the only place to purchase a Business Suit.

Low-level Jobs at QT Clothing are generally desirable, but mid/high-level jobs are not; They pay less and require more expensive Uniforms than similar-level jobs elsewhere.

### Opening Hours

QT Clothing is open every Week. You may purchase items even if the turn has ended while you're in the store.

### Items

QT Clothing offers all manners of Clothes. All items are available every Week.

Clothes purchased at QT Clothing last longer before having to be replaced than those purchased at Z-Mart.

The more expensive types of Clothes provide a small bonus to Happiness when purchased.

| Item | Base Price | Lasts for... | Happiness |
|------|------------|--------------|-----------|
| Business Suit | $295 | 13 Weeks | +2 |
| Dress Clothes | $125 | 13 Weeks | +1 |
| Casual Clothes | $73 | 11 Weeks | -- |

Actual prices at QT Clothing are affected by the Economy.

### Work

If you have a Job at QT Clothing, you can Work here to get money.

### Jobs

| Job | Base Wage | Req. Experience | Req. Dependability | Req. Degrees | Uniform |
|-----|-----------|----------------|-------------------|--------------|---------| 
| Janitor * | $6 | 10 | 20 | -- | Casual Clothes |
| Salesperson | $8 | 30 | 30 | -- | Dress Clothes |
| Assistant Manager | $9 | 40 | 40 | Junior College | Business Suit |
| Manager | $12 | 50 | 50 | Business Administration | Business Suit |

**NOTE:** The Janitor Job at QT Clothing is only available in the CD-ROM version of the game.

### Quotes (Salesperson NPC)

#### Greetings
* *Welcome to QT Clothing. We will sell you anything, no matter how bad it looks.*
* *Welcome to QT Clothing. Meet our tailor, Howie Fitzhugh!*
* *Welcome to QT Clothing. Our ties don't bind and our belts are a cinch.*
* *Welcome to QT Clothing. We have legal briefs and law suits.*
* *Welcome to QT Clothing, open 24 hours...we never clothes!*
* *Welcome to QT Clothing. Thursday is Double Shoulder Pad Day!*
* *Welcome to QT Clothing. Wear our clothes and you'll be a QT, too!*
* *Welcome to QT Clothing. The only place in the world where you can buy just 1 pant!*
* *Welcome to QT Clothing. Try on our soothing new Medicated Tux!*

#### Bought an Item
* *My! Don't WE look nice today!*
* *It's the real you.*
* *Spiffy.*
* *Faaabulous!!!*
* *Our clothes are of the highest quality.*
* *Have a wonderful day!*
* *Lookin' good!*
* *You can't go wong at QT.*
* *Perhaps you should stock up now while the prices are so reasonable.*
* *With your figure, perhaps you should consider going to a tent maker.*
* *Oooh, you look good enough to eat!*
* *Don't you just love the new spring fashions? Tres magnifique!*
* *It's nice like that, just a tad tight around the bottom.*
* *Good choice...rayon is back in this year!*
* *Now what are you going to do about your HAIR?*
* *Don't forget to accessorize!*
* *Nice! It really accentuates those pectorals.*
* *You know, a little tummy tuck would take care of that slight pucker in back.*
* *Stop slouching and it won't crease across the torso.*
* *With a physique like yours, you could wear ANYthing!*
* *Let me mention just two little words. Lipo. Suction.*

---

## Socket City

**Socket City** is a Location where players can buy Appliances.

Appliances are Durable items, most of which give bonuses to any player who owns them. Players may also receive a Happiness bonus for purchasing an Appliance they do not own yet.

Socket City sells its Appliances at full price (compared to the discount prices at Z-Mart), but the relevant Happiness bonuses are higher. Some high-end Appliances are only available here. Appliances bought at Socket City have a lower chance to require Repair each turn.

Low-paying Jobs at Socket City are *somewhat* easy to get, but the higher-paying jobs require a Degree in Electronics. They are typically seen as a possible stepping-stone towards a cushy job at the Factory.

### Opening Hours

Socket City is open every Week. You may purchase items even if the turn has ended while you're in the store.

### Items

Socket City sells every type of Appliance except the Black & White TV. All items are available every Week.

A Happiness bonus is given for the purchase of a new Appliance, but only if the player currently owns zero of that specific Appliance. If the player purchases an Appliance but loses it (e.g. due to Wild Willy apartment robbery or Pawn Shop/Pawning), purchasing that same Appliance again *will* award Happiness.

Prices at Socket City are higher than those at Z-Mart (except for the Stereo, which is cheaper here). However, Appliances purchased here are less likely to require Repairs, and generally provide a larger Happiness bonus.

| Item | Base Price | Happiness | Notes |
|------|------------|-----------|-------|
| Refrigerator | $876 | +1 | Prevents 6 units of Fresh Food from Spoiling. Can't be stolen by Wild Willy. |
| Freezer | $513 | +2 | Together with a Refrigerator, prevents 12 units of Fresh Food from Spoiling. Can't be stolen by Wild Willy. |
| Stove | $570 | +1 | Gives **+1 Happiness** at the beginning of each turn (*not* cumulative with the Microwave). Can't be stolen by Wild Willy. |
| Color TV | $525 | +2 | Displayed at the Security Apartment. |
| VCR | $333 | +2 | Displayed at the Security Apartment. |
| Stereo | $412 | +2 | Displayed at the Security Apartment. |
| Microwave | $330 | +2 | Gives **+1 Happiness** at the beginning of each turn (*not* cumulative with the Stove). |
| Hot Tub | $1255 | +3 | Prevents the Relaxation stat from decreasing each turn. |
| Computer | $1599 | +3 | Reduces the number of Courses required to complete a Degree by -1. 1-in-7 chance each turn to make $20-$100 and receive **+3 Happiness**. |

Actual prices at Socket City are affected by the Economy.

### Actions

### Work

If you have a Job at Socket City, you can Work here to get money.

### Jobs

| Job | Base Wage | Req. Experience | Req. Dependability | Req. Degrees | Uniform |
|-----|-----------|----------------|-------------------|--------------|---------| 
| Clerk * | $6 | 10 | 20 | -- | Casual Clothes |
| Salesperson | $7 | 20 | 30 | -- | Dress Clothes |
| Electronics Repairman | $11 | 40 | 40 | Electronics | Casual Clothes |
| Manager | $14 | 40 | 40 | Electronics, Junior College | Business Suit |

**NOTE:** The Clerk Job at Socket City is only available in the CD-ROM version of the game.

### Quotes (Salesperson NPC)

#### Greetings
* *Welcome to Socket City. If you paid full price, you must've bought it here!*
* *Welcome to Socket City. You're just in time for our Pre-Arbor Day Value Fest!*
* *Welcome to Socket City. Apply for our Revolving Algorithmic Usury Credit Line!*
* *Welcome to Socket City. Our salespeople are here to help you...spend!*
* *Welcome to Socket City. Special today on useless Yuppie electronic gadgets!*
* *Welcome to Socket City. We only charge 10% over list price!*
* *Welcome to Socket City. Go ahead and TRY to talk us down.*
* *Welcome to Socket City. Next Friday is Double Commission Day!*
* *Welcome to Socket City. Come to our Moonlight Madness sale. 20% off if you wear your pajamas!*
* *Welcome to Socket City. Values direct from the factory to the jobber to the wholesaler to us to YOU!*
* *Welcome to Socket City, Home of High Pressure Sales!*
* *Welcome to Socket City, where Quality meets its match!*
* *Welcome to Socket City, where you get less for more!*
* *Welcome to Socket City, where our Service Department never sleeps, eats or bathes!*
* *Welcome to Socket City, where the customer is always ripe!*
* *Welcome to Socket City. Where everything quits working the day after the warranty expires.*

#### Bought an Item
* *Thank You very much.*
* *I'm sure that you will be very happy with your purchase.*
* *Thanks. You will have many years of trouble free service.*
* *Thank you for visiting Socket City.*
* *You sure know a deal when you see one.*
* *Come and see us again, anytime.*
* *Thank You. Let me know how you enjoy it.*
* *Perhaps I can interest you in something else.*
* *Have you seen our vacuum cleaners? They really suck!*
* *Would you like the $200 Extended Service Contract with that?*
* *You'll want the $150 Factory Extension Warranty with that, right?*
* *Can we interest you in the $300 1-Year Lifetime Replacement Guarantee?*
* *How about a $250 Extended Factory Service Warranty Replacement Guarantee Contract Agreement Deal with that?*
* *If you ever require service, you know where to go!*
* *Of course, for another $75, you could have gotten the next model up.*
* *Our free installation is only $45 today!*
* *Sorry, we only had a floor sample left, but trust me, it's in perfect condition.*
* *Remember, we offer free delivery anywhere within the game!*
* *Do you smell something burning? Oh, it's that cash in your pocket!*
* *Now that didn't hurt a bit, did it?*
* *Notice how we ignore anybody who's browsing the under-$200 items?*
* *Since you're spending, how about replacing your car stereo with an $800 Kerplunkett?*
* *Should we call the paramedics to treat your wallet for shock?*
* *Care to go double-or-nothing for that 92 inch Projection TV?*
* *Now, if I can steer you towards some of our higher-margin products...*
* *Didn't you have your eye on that complete Home Videotape Production Studio?*
* *If you're not completely satisfied, we'll be glad to give you partial credit.*
* *We're members of the Bait 'n Switch(TM) Retailer's Association!*
* *We finance 90 Days, Same as Bankruptcy!*
* *With every purchase over $5200, we're giving away free Chapter 11 Auto-Filers!*
* *Please be aware that our Extended Service Contract excludes parts and labor.*

---

## Hi-Tech U

**Hi-Tech U** (or **Hi-Tech University**) is a Location where players can Enroll and study Degrees, advancing towards their Education Goal and qualifying themselves for certain high-end Jobs. It is also a Workplace.

Getting a Degree requires players to pay a small Enrollment Fee, and then spend up to 60 Hours studying the course (not necessarily all at once). As each Degree is acquired, more Degrees become available for study. Players may enroll in up to 4 courses simultaneously, and may complete them whenever they desire.

Jobs at the University generally require players to hold certain Degrees, but they pay relatively well and give the player a good opportunity to study often. These jobs require no more than Dress Clothes as a Uniform.

### Opening Hours

Hi-Tech U is open every Week. Studying or Working at the University require at least 1 Hour remaining on the clock, but you may pay Enrollment Fees even if the turn has already ended.

### Enrolling

Before a player is allowed to study for a Degree, they must first pay their Enrollment Fees. This is done by clicking the "Enroll" button and accepting the fee. Enrollment has a base cost of **$50 per course**, adjusted to the current state of the Economy. 

Enrolling allows the player to take one course. A player may enroll multiple times in a row without choosing any course to study; The "Enroll" action simply purchases the *ability* to take one course. For example, a player may pay 5 Enrollment Fees, and only later decide which 5 courses to actually take.

Once enrolled, the player may select any of the courses available to them in the University menu. This turns the course "active", and causes the player to take their first lesson in that course. A number then appears next to the name of the course, showing how many additional Study sessions are required to complete the course and acquire the Degree.

Though Enrollment takes no time off the clock (and can be done even if the player's Turn is over), it is not possible to choose a course (and take your first lesson in it) unless you have at least 1 Hour left on the clock.

### Studying

Selecting a new course from the University menu immediately expends one "enrollment fee" paid by the player, and causes them to take the first lesson in that course. Any additional click on the same course causes the player to take another lesson.

Each time a player takes a lesson in a course, the number on the right side of the course "book" decreases by 1. When this number reaches 0, the player Graduates from the course and acquires the relevant Degree.

By default, each course takes 10 lessons to complete. This number may be reduced by owning certain Durables (see Extra Credit, below), down to a minimum of 8 lessons per course.

To take a lesson, the player must have at least 1 Hour left on the clock. Each lesson advances the clock by 6 Hours. If there are fewer than 6 hours remaining on the clock, the player still takes the entire lesson without any penalty.

If the player has multiple courses "active" at the same time, they may take lessons in any of these courses as they see fit. There is no imperative to Graduate from one course before continuing with another. There is also no time limit on completing a course - you may study and complete it whenever it's suitable for you.

#### Extra Credit

Certain Durables can decrease the number of lessons required to Graduate from any course:

* If the player owns a Computer, they require **1 fewer lesson** to Graduate.
* If the player owns an Encyclopedia, Dictionary *and* Atlas, they require **1 fewer lesson** to Graduate. This only applies if all three items are owned.

Owning all four of these Durables reduces the number of lessons required to Graduate to 8 - saving 20% of the time required to complete each course. This can be of extreme importance for players with a high Education Goal.

### Graduating

Once 10 lessons (minus Extra Credit) of a specific course have been completed, the player receives the corresponding Degree. The game signifies this by showing the player's new diploma. It then refreshes the available courses list, removing the completed course and adding any new courses unlocked by completing it.

Beyond the benefits of the Degree itself, there are several important benefits bestowed on a player **each time they Graduate**:

* The player receives **+5 Happiness**.
* The player receives **+5 Dependibility**. This bonus may push Dependibility beyond its normal maximum cap. However, Dependibility will continue to degrade each turn as normal from that point. This bonus somewhat offsets any Dependibility losses incurred by Studying instead of Working.
* The player receives a permanent **+5 Maximum Dependibility** and **+5 Maximum Experience**. They still need to Work to reach these maximums, but once that is achieved the player might be able to qualify for a better job than they could otherwise reach. Graduating from multiple courses may enable a player to go straight from a low-paying job to a high-paying job.

### Work

If you have a Job at the University, you can Work here to get money.

### Jobs

| Job | Base Wage | Req. Experience | Req. Dependability | Req. Degrees | Uniform |
|-----|-----------|----------------|-------------------|--------------|---------| 
| Janitor | $5 | 10 | 10 | -- | Casual Clothes |
| Teacher | $11 | 40 | 50 | Academic | Dress Clothes |
| Professor | $20 | 50 | 60 | Research | Dress Clothes |

### Quotes (Professor NPC)

#### Greetings
* *Welcome to Hi-Tech U. We will learn you for the future.*
* *Welcome to Hi-Tech U. We'll learn you to talk English good!*
* *Welcome to Hi-Tech U. Our Geology classes will put rocks in your head!*
* *Welcome to Hi-Tech U, where you'll never be bored of education!*
* *Welcome to Hi-Tech U. Enroll now for the third trimester!*
* *Welcome to Hi-Tech U. All our professors have tweed jackets with elbow patches!*
* *Welcome to Hi-Tech U. Our diplomas are genuine cheepskin!*
* *Welcome to Hi-Tech U. Our alumni haven't complained yet!*
* *Welcome to Hi-Tech U. Next semester is Double Credits Semester!*
* *Welcome to Hi-Tech U. When it comes to education, we will NOT be undersold!*
* *Welcome to Hi-Tech U. Already got your BA and MBA? We'll give you the third degree!*
* *Welcome to Hi-Tech U. No matriculating in the dormitories, please!*
* *Welcome to Hi-Tech U. Enroll now for our fifth quarter!*
* *Welcome to Hi-Tech U. You come in with a skull full of mush and you leave thinking like a shyster.*
* *Welcome to Hi-Tech U. Draw Kenny and YOU could win an art scholarship!*
* *Welcome to Hi-Tech U. Check out our Job Displacement Service!*
* *Welcome to Hi-Tech U. Need financial assistance? What do we look like, a bank?*
* *Welcome to Hi-Tech U, where one good term deserves another!*
* *Welcome to Hi-Tech U. The CIA recruitment center's right here on campus!*
* *Welcome to Hi-Tech U. Meet Ed Fiz, our Phys Ed instructor!*
* *Welcome to Hi-Tech U. CPA degrees or 65% x 1.2146/5ths of your money back!*
* *Welcome to Hi-Tech U. Where our campus ROTC stands for Really Obnoxious Teenage Civilians!*

---

## Employment Office

The **Employment Office** (or **ACNE Employment**) is a Location where players can apply for a new Job, or ask for a Raise in their current Job.

A player may apply for any Job in the game, but will be refused if they don't qualify for the Job they requested. Qualification requires a certain amount of Experience and Dependibility, and some Jobs also require specific University Degrees. Additionally, there is a chance for players to randomly be refused a job that they do qualify for.

If the player's current Job is listed at a higher Wage than they're already being paid, they may ask for a Raise to match the listed Wage. Qualifying for a Raise requires only sufficient Dependibility.

### Opening Hours

The **Employment Office** is open every Week. Asking for a Job or a Raise requires at least 1 Hour remaining on the clock.

### Applying for a Job

The **Employment Office** shows a list of all Workplaces in the game. Selecting a Workplace from the list displays all Jobs at that Workplace (including Jobs that the player could not possibly get with their current stats). The current Wage is displayed next to each Job.

To apply for a Job, simply select it from the list. Applying for a job advances the clock by **4 Hours**. A player may apply for multiple Jobs each turn, so long as there is still time left on the clock.

Once a player has applied for a job, the game calculates whether they qualify for that Job, based on their current Stats.

If the player has the necessary stats for the job, they receive the new Job immediately, at the listed hourly Wage. They also receive **+3 Happiness**.

If the player has insufficient Stats, the Employment Officer will reject the application and explain which stats are lacking (Experience, Dependibility, and/or Education).

Occasionally, the Employment Officer may reject the application due to "No openings". This signifies that the player does have the required stats, but has failed a random roll. If this occurs, the player will not be able to get that *particular* job if they try again during the same turn. The Job may become available during the player's next turn.

If the player is refused a job for any reason, they receive **-1 Happiness**.

**NOTE:** An application for the Cook job at Monolith Burgers will *always* be approved.

For more information about qualifying for jobs, see the articles on Jobs.

### No Openings

Whenever qualifying for a new Job (asking for a raise at your current one is different), a random number is rolled between 1 and 100 and it is compared to the player's luck score, which is derived from their Dependability and Experience and number of Degrees:

Luck = 30 + (10 + Dependability + Experience + 8 * DegreeCount) / 3

Your luck starts at 43 and can be immediately increased to 44 by taking the free job as the Monolith Cook, at the cost of 4 hours. 

If this check is the **only** reason that you did not get a job, that job gets marked *turned down* and future attempts to get the same job on the same turn will fail. This will display the dreaded prompt, "No openings." You can still try for other jobs at the same location.

However, you **can** get No Openings without getting Turned Down, because No Openings is a default response and during the first 4 weeks, the "Poor Work History" response is suppressed in the game: so if you had the experience and education but not the dependability, in the early weeks you can get a No Openings that is secretly a Poor Work History. For instance, if you do not work in the first week (e.g. you study all that week) you will only have 17 Dependability on Week 2, beneath what is needed for the Monolith Clerk job. Similarly if you job hop Cook -> Clerk -> Cook -> Z-Mart Clerk -> Cook on week 1, you will have 20 Experience but the Monolith Assistant Manager role will always deny you with No Openings because you don't have 30 Dependability.

### Asking for a Raise

If the player's current Job is listed at a higher hourly Wage than what they are currently making, the player may select that Job to ask for a Raise. Asking for a Raise advances the clock by **4 Hours**.

Qualifying for a Raise is much simpler than qualifying for a new Job, requiring only that the player's Dependibility be higher than the Required Dependibility for their current job.

If the Raise is approved, the player's Wage is immediately increased to the listed amount, and they receive **+3 Happiness**.

The Dependibility requirement for receiving a raise increases by +5 points each time the player receives a Raise, making it more difficult to get additional raises. This counter resets each time the player switches to a different Job.

**NOTE:** Applying for your current job at the same Wage you're already getting (or less) achieves nothing - but will still waste 4 Hours!

### Quotes (Employment Officer NPC)

#### Greetings
* *Welcome to ACNE Employment. Why work for the best when you can work like the rest.*
* *Welcome to ACNE Employment. We'll either find you a job, or we won't.*
* *Welcome to ACNE Employment, where your skills and our expertise add up to disappointment!*
* *Welcome to ACNE Employment, where every lost job is a blemish on your resume!*
* *Welcome to ACNE Employment. We'll get you a job no matter what it costs you!*
* *Welcome to ACNE Employment, where your resume zits in our files!*
* *Welcome to ACNE Employment. No matter how bad your skills are, we have a job to match!*

---

## Bank

The **Bank** (full name: **Pacific International Grand Gratuity Yield Bank**) is a Location where players can store their Cash, apply for a Loan, or invest in the Stock Market. It is also a Workplace.

Depositing money in the Bank is a safe way to protect your Liquid Assets against Wild Willy, though savings could get wiped out during a Market Crash.

Loans can serve as a good way to get a lot of money very quickly (e.g. for buying an expensive Appliance or paying Rent), though a good Job is necessary to get a loan of any substance. Payments must be made at the Bank itself every Month to avoid defaulting.

The Stock Market is an interesting way to accumulate money, but requires time and attention to the Economy. Sudden Market Crashes can destroy investments as well.

Jobs at the Bank pay well, and are some of the best-paying jobs in the game - but most require a substantial Education and expensive Uniform.

The Bank is one of two Locations where Wild Willy can rob the player's Cash as they leave. The other is Black's Market.

### Opening Hours

The **Bank** is open every Week, but most of its functions (with the exception of depositing/withdrawing money) require at least 1 Hour remaining on the clock.

### Bank Account

Whenever a player is at the Bank, they may deposit Cash into their Bank Account, or withdraw cash from it. This is possible even if the clock has run out of time.

Cash is deposited into one's Account in $100 portions, and is withdrawn in the same manner. There is no limit to the amount of money a Bank Account can store.

Money in the Bank Account counts towards a player's Liquid Assets, and thus counts towards the Wealth Goal. However it cannot be spent directly from the account.

There is no extra fee to deposit or withdraw money, nor to keep money in the Account for any period of time. Similarly, there is no interest accrued for money kept in a Bank Account.

Money in the Account cannot be stolen by Wild Willy. However, withdrawing a large amount of money in Cash is very risky because Wild Willy often strikes right outside the Bank itself.

Money in the Bank Account is not 100% safe. A particularly severe Market Crash can wipe out all money in the account instantly (setting it to $0). This sort of event is typically much rarer than a Wild Willy robbery, but it has a non-zero chance of happening each turn. The weaker the Economy, the riskier it is to keep money in a Bank Account.

### Loans

A Loan is an amount of money given to a player by the **Bank**, with the promise of paying it back (plus interest) over time.

Players may apply for a Loan at the Bank if there is at least 1 Hour left on the clock. Applying for a loan advances the clock by 2 Hours.

A Loan Application can be rejected by the Bank if the player's current Wage and Liquid Assets are very low. The amount of money loaned to the player also depends on these two values; The more money a player makes and the more money they have, the larger the loan they can receive.

Once a loan has been approved and the money received, the player is reminded to pay it off on the last Week of every Month, until the entire debt is cleared. Players may pay back part (or all) of the loan whenever they want, but making at least one payment before the end of the Month will avoid Defaulting on the loan. Additional payments in the same Month will delay the next payment deadline by a whole Month.

Each payment is equal to $45, but incurs an additional $5 interest fee that is paid to the Bank instead of decreasing the debt.

Each time a player Defaults on a loan, their chance to get any future Loans (and the amount of money they would get if approved) decreases permanently. However, if the player does not intend to ever get another loan, they may completely avoid paying back their current loan -- though they will lose a little bit of Happiness every Month.

The amount of money owed to the Bank counts *against* a player's Liquid Assets.

### Stock Market

The Stock Market can be accessed from the **Bank** menu by clicking the "See the Broker" option.

The Stock Market allows a player to purchase and sell Stocks. Stock prices rise and drop with some correlation to trends in the Economy, though they do not match it like Item prices and Wages. This allows players to essentially gamble on Stock prices, buying low and selling high.

Stock investments count towards a player's Liquid Assets, and cannot be completely wiped out by a Market Crash (though they can easily lose a lot of their value). This makes Stocks one the most secure way to keep *some* amount of liquid assets from disappearing instantly, especially if the stocks are bought when their price is already extremely low.

### Wild Willy

Each time a player leaves the **Bank**, there is a 1/31 chance that they will be mugged by Wild Willy.

This event cannot happen before Week #4, and will only occur if the player is carrying any amount of Cash.

Once robbed by Willy, the player's Cash is set to $0, and they lose **-3 Happiness**.

### Work

If you have a Job at the Bank, you can Work here to get money.

### Jobs

| Job | Base Wage | Req. Experience | Req. Dependability | Req. Degrees | Uniform |
|-----|-----------|----------------|-------------------|--------------|---------| 
| Janitor | $6 | 10 | 20 | -- | Casual Clothes |
| Teller | $10 | 40 | 40 | Junior College | Dress Clothes |
| Assistant Manager | $14 | 50 | 50 | Business Admin. | Business Suit |
| Manager | $19 | 60 | 60 | Business Admin. | Business Suit |
| Broker | $22 | 70 | 70 | Business Admin., Academic | Business Suit |

### Quotes (Teller NPC)

#### Greetings
* *Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. We take very little interest in you.*
* *Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. You'll always find yourself a loan here!*
* *Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. No charge for deposits!*
* *Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Tuesdays are Double Dollar Days!*
* *Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Have you gotten your free Toast Point Tongs?*
* *Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Our fixed-rate CDs spin at 1500 RPM!*
* *Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. This little P.I.G.G.Y. plays the market!*
* *Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Where we do Savings and Loans without a crisis!*
* *Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Our loan officers are real Yes-men!*
* *Welcome to the Pacific International Grand Gratuity Yield -P.I.G.G.Y.- Bank. Our San Andreas branch is in default!*

* *There is always a penalty for early withdrawal.*

---

## Factory

The **Factory** is a Location that serves only as a Workplace. It has no other functions.

Most Factory Jobs require at least some Education, particularly in Trade School and subsequent courses, Junior College, and/or Business Administration. Many of these jobs also require a Business Suit as the Uniform. However, the top jobs at the factory are the highest-paying jobs in the game.

### Opening Hours

The **Factory** is open every Week.

### Actions

### Work

If you have a Job at the Factory, you can Work here to get money.

### Jobs

| Job | Base Wage | Req. Experience | Req. Dependability | Req. Degrees | Uniform |
|-----|-----------|----------------|-------------------|--------------|---------| 
| Janitor | $7 | 10 | 20 | -- | Casual Clothes |
| Assembly Worker | $8 | 30 | 30 | Trade School | Casual Clothes |
| Secretary | $9 | 40 | 40 | Junior College | Dress Clothes |
| Machinist's Helper | $10 | 40 | 40 | Pre-Engineering | Casual Clothes |
| Executive Secretary | $18 | 50 | 50 | Business Admin. | Business Suit |
| Machinist | $19 | 50 | 50 | Engineering | Casual Clothes |
| Department Manager | $22 | 60 | 60 | Junior College + Engineering | Business Suit |
| Engineer | $23 | 60 | 60 | Junior College + Engineering | Business Suit |
| General Manager | $25 | 70 | 70 | Business Admin. + Engineering | Business Suit |

### Quotes (Receptionist NPC)

#### Greetings
* *Welcome to the Factory. We will overwork you, under pay you, and expect you to take it with a smile.*
* *Welcome to the Factory. Where else can you have this much fun and get paid for it too.*
* *Welcome to the Factory. Where the work is hard, the pay is low, and the conditions are miserable.*
* *Welcome to the Factory. Thursday is Double Workman's Compensation Day!*
* *Welcome to the Factory. We pay Top Dollar for Blue Collar!*
* *Welcome to the Factory. No sweat...no paycheck!*
* *Welcome to the Factory. Where money is our most important product.*
* *Welcome to the Factory. Please wear your safety helmet during scheduled inspections.*

## 15. Happiness Goal

The **Happiness Goal** is one of four Goals a player must meet in order to win a game of Jones in the Fast Lane.

The precise goal to fulfill is determined at the beginning of the game, separately for each player. Its range is between 10 and 100. (Note: The "10" is the minimum possible *goal* setting, not the starting stat).

Fulfilling a player's Happiness Goal requires them to accumulate an amount of points into their Happiness Stat that is equal to or greater than their Goal.

Happiness can be acquired in multiple ways, including from purchases, Relaxation, and several other actions. It can also decrease due to a variety of events, such as being robbed by Wild Willy, being refused for a Loan, or being fired from a Job.

### Happiness Stat

The player's current **Happiness Stat** is tracked for them individually using a single number. This number is increased or decreased during the game according to various events and actions.

**Important Note on Starting Values:** The Happiness *Stat* itself starts at exactly 50 at the beginning of the game. This means if you set your Happiness *Goal* to 50, you begin the game having already reached that goal! However, since Happiness is volatile and drops from things like starvation, illness, and robberies, you must maintain or increase it throughout the game to ensure it remains at or above your goal threshold by the time you achieve your other goals.

This Stat is directly compared to the Happiness Goal to determine whether the player has accomplished that goal. For example, if the player has a Happiness Goal of 50, they need exactly 50 Happiness to meet that goal.

### Increasing Happiness

**Events & Actions:**
* **Relax at your Apartment**: +2 (Only once per Turn. Additional Relaxation does not award Happiness, but increases the Relaxation Stat).
* **Get a new Job / Get a Raise**: +3
* **Get a Bank Loan**: +5
* **Get a Rent Extension**: +1
* **Get a new Degree**: +5
* **Owning a Microwave or Stove**: +1 at the start of a new Turn (not cumulative if you own both).
* **Economic Boom**: +5 (Only if the player has at least $1000 invested in the Stock Market).
* **Make money using the Computer**: +3 (1/7 chance each Turn).
* **Win the Lottery**: +5 (small/medium) or +10 ($5000 prize).

**Purchases:**
* **Appliances (Socket City)**: +1 to +3 (Only if the player does not currently own the item being purchased. Generally gives higher bonuses than Z-Mart).
* **Appliances (Z-Mart)**: +1 (Only if the player does not currently own the item being purchased).
* **Tickets (Baseball/Theatre/Concert)**: +2 (First ticket of each type purchased that Turn).
* **Fresh Food (Black's Market)**: +1 to +4 (First purchase of any Fresh Food this Turn).
* **Lottery Tickets (Black's Market)**: +2 (First purchase this Turn).
* **Clothes (QT Clothing)**: +1 (Dress Clothes), +2 (Business Suit) (Each and every purchase).
* **Fast Food & Soft Drinks (Monolith Burgers)**: +1 to +2 (First purchase of food or drink this Turn).

### Decreasing Happiness

**Events & Actions:**
* **Starvation**: -2 (When the player did not buy Fast Food and does not own any Fresh Food).
* **Doctor Visit**: -4
* **Appliance broken**: -1
* **Food Spoiled**: -2 (All spoiled), -1 (Some spoiled).
* **Market Crash**: -1 to -3 (Only to the player whose turn it is when the crash occurs).
* **Lost Job / Wage reduction due to Market Crash**: -7 / -3
* **Mugged by Wild Willy / Apartment Robbed**: -3 / -4
* **Defaulted on a Loan**: -1
* **Refused a new Job / Denied a Loan / Refused Rent Extension**: -1 to -2
* **Pawned any Item**: -1
* **Pawned a Refrigerator while owning Fresh Food**: -1 (On top of normal penalty).

**Purchases:**
* **Dog Food**: -1
* **8-Track Player**: -1
* **Works of Capote**: -2

== Market Crash ==

A '''Market Crash''' or '''Economic Crash''' is a random event that can occur at the start of any [[Turn]], if certain conditions are met. It causes damage to the [[Economy]] and can do direct damage to all players' finances as well.

A Market Crash can only occur if the economy is better than its worst possible state, and only on or after [[Week]] #8. The more players there are, the lower the chance of a Market Crash each turn.

There are three different severities of Market Crashes (Minor, Moderate, Major). Each causes a different level of impact. Each Market Crash has an equal chance to be of any severity.

All Market Crashes bias the current Economic trend downwards, and typically cause prices and [[Wage]]s to drop immediately.

In a Moderate or Major Market Crash, each player has a chance to receive a Pay Cut to their current Wage.

In a Major Market Crash only, each player has a chance to be fired from their [[Job]] immediately. A Major Crash also erases all money in the [[Bank]] deposits of ''all'' players.

On triggering a Market Crash, the player whose turn it is suffers a loss of [[Happiness]] relative to the severity of the Crash. They lose even more Happiness if they have over $1,000 in [[Stock Market]] investments. Any players who get a pay cut or lose their jobs suffer additional loss of Happiness.

== Triggering a Crash ==

[[File:Newspaper MarketCrash2.png|thumb|right|300px|This [[Newspaper]] headline indicates that a Moderate Market Crash has occurred.]]
In order for the game to trigger any '''Market Crash''', the following conditions must be true:

* It is [[Week]] #8 or greater.
* The current [[Economy|Economic Reading]] is at least 80.

If both conditions are met at the start of a player's [[Turn]], the game rolls a random number to determine whether an Economic Crash should take place. 

In the '''Floppy Disk version''', the chance to trigger a Crash is calculated by this formula:

<math>Chance \ of \ Market \ Crash = {1 \over 1 + ({20 \times Number \ of \ Players})}</math>

In the '''CD-ROM version''', the chance to trigger a Crash is calculated by this formula:

<math>Chance \ of \ Market \ Crash = {1 \over 1 + ({30 \times Number \ of \ Players})}</math>

Once a Crash is triggered, the game immediately displays the [[Newspaper]] showing a headline indicating the severity of the Crash.

== Crash Severity ==

Once a '''Market Crash''' has been triggered, the game selects the severity of the Crash completely at random.

* A Minor Market Crash affects only the economy.
* A Moderate Crash affects the economy and possibly players' [[Job]]s, resulting in firings and/or pay cuts.
* A Major Crash affects the economy but also gets all players fired. It also wipes out all [[Bank]] accounts.

Each severity of Market Crash triggers a different [[Newspaper]] headline, which appears immediately on the screen.

{| class="wikitable"
|-
! rowspan=2 | Severity
! colspan=4 | Effects
! rowspan=2 | Headline
|-
! Price Drop
! Chance to be Fired
! Pay Cuts
! Bank Wipe
|-
! Minor
| -5%
| --
| [[File:Cross.png]]
| [[File:Cross.png]]
| ''MORE S & L'S FAIL! ECONOMY SUFFERS''
|-
! Moderate
| -10%
| 50%
| [[File:Tick.png]]
| [[File:Cross.png]]
| ''SCANDAL ON WALL ST. ECONOMY DROPS! UNEMPLOYMENT RISES''
|-
! Major
| -15%
| 100%
| [[File:Cross.png]]
| [[File:Tick.png]]
| ''BANKS FALTER! SAVINGS LOST! JOBS LOST!''
|}

== Economic Effect ==

When a '''Market Crash''' of any severity strikes, it has two sudden effects on the [[Economy]].

First, the Crash causes the Economic Index (a general market trend) to sharply decline. This means that the economy suddenly becomes more likely to keep going down on subsequent turns. A Crash will cause a very strong economy to neutralize (it could go either way from here), or a neutral economy to reach the worst possible decline (staying low potentially for a long time).

Furthermore, the Crash instantly reduces all prices by a certain percentage. The size of the penalty depends on the severity of the crash:

* Minor Crash: '''-5%'''
* Moderate Crash: '''-10%'''
* Major Crash: '''-15%'''

Note that this penalty is applied after the Economic Index plunges, which means that the final price drop could be far more serious than these numbers imply.

A price drop affects the prices of all '''[[Item]]s''' at stores, the '''[[Wage]]s''' on offer at the [[Employment Office]], the '''[[Rent]]''' for available Apartments at the [[Rent Office]], the cost of '''[[Enrolling]]''' in new courses at [[Hi-Tech U]], and indirectly the value of all '''[[Stocks]]'''.

Each player's current Wage and Rent are not affected; However a severe Crash can separately reduce player Wages as described below.

== Firings and Pay Cuts ==
[[File:Notice_PayCut.png|thumb|right|This notice indicates that a player's [[Wage]] has been cut to the listed rate.]]
When a Moderate or Major Crash occurs, each player has a chance to lose their job immediately. This includes all players, not just the one whose [[Turn]] it currently is.

In a Moderate crash, the chance to be fired is 50% for each player. However any player who does not get fired will instead get a pay cut; Their hourly [[Wage]] is reduced to 80% of its current value.

[[File:Notice_Fired.png|thumb|right|This notice indicates that a player has lost their [[Job]].]]
In a Major crash, all players are fired from their jobs. There is no chance to avoid this.

The game immediately displays the "Pay Cut" / "You're Fired" notice (as applicable) for each player, rather than notifying players on their own turns.

== Bank Wipe ==

A Major '''Market Crash''' immediately erases all money in each player's [[Bank]] account.

Only money in the account is affected. Money invested in [[Stocks]] or held in [[Cash]] is not affected at all.

== Happiness Penalty ==

If a '''Market Crash''' occurs during a player's turn, that player (and only that player) loses [[Happiness]] according to the severity of the Crash, and an extra penalty if they also possess more than $1,000 in [[Stock Market]] investments.

{| class="wikitable"
|-
! rowspan=2 | Crash Severity
! colspan=2 | [[Happiness]] lost
|-
! Base
! Extra for >$1,000 in [[Stocks]]
|-
! Minor
| -1
| -1
|-
! Moderate
| -2
| -2
|-
! Major
| -3
| -5
|}

[[Category:Economy]]
[[Category:Events]]
