# Future Ideas

## Advanced Clothing System

For the advanced game variant, we can implement a more granular and realistic clothing system. 
The basic 1990 classic game version unconditionally degrades clothes and treats sets generically, but for an advanced version we might consider:

- **Selective Wear & Tear**: Only the set of clothing you are *actually wearing* degrades. The other sets are safe in your closet.
- **Job-Specific Degradation**: Some jobs ruin clothes faster (e.g., manual labor jobs degrading casual clothes quicker than an office job degrading a business suit).
- **Events**: Random events could ruin clothes (e.g., spilling coffee, tearing pants).
- **Optional Rules**: Allowing the player to explicitly choose which clothes set to wear instead of auto-equipping.
- **Specialized Clothing**: Jobs could require specific specialized clothing variations (e.g., hard hats, uniforms).
- **Overdressing**: Penalties or unique interactions for being "overdressed" for certain jobs.
- **Granular Items**: Pick clothes piece by piece (e.g., hat, shirt, pants, shoes) instead of full "Business" or "Casual" sets.
- **Wardrobe Mechanics**: Allow switching clothes *only* at the clothing shop(s) or when at home, instead of everywhere on the map.

## Homelessness & Street Resting Locations

For the advanced campaign with "The Streets" (`street` housing tier), resting and turn recovery requires a public location:
- **The Park / Central Square**: Free resting spot on a public bench. Low relaxation recovery, vulnerable to adverse weather and street muggings.
- **24/7 Monolith Burgers Booth**: Dozing off in a corner booth over a cheap coffee/snack.
- **Hi-Tech U Library / Lounge**: Crashing in the student study hall (requires enrollment or intellect).
- **Low-Cost Stoop**: Sleeping outside the apartment building with 0 space.

## Commodity Food Pricing & Sector Coupling (Advanced Edition)

In the classic game, all store items scale uniformly with the consumer goods index (`gdsIndex`). For the Advanced Edition, we can introduce sector-specific commodity coupling:
- **Pork Bellies & Food Costs**: Spikes or dips in the agricultural / pork bellies commodity market directly impact food prices at Monolith Burgers and Black's Market.
- **Precious Metals & Pawn Valuations**: Fluctuations in Gold and Silver alter the pawn shop payout, appraisal values, and redemption costs of luxury jewelry/curios.
- **Sticky Wages vs Inflation**: Consumer retail prices fluctuate rapidly with commodity demand, while base job wages remain stickier, creating realistic cost-of-living squeezes during high-inflation economic phases.

## Advanced Workplace & Career Dynamics (Pinned Ideas)

### 1. Halved Routine Dependability on Apex / Tier 3 Jobs
Award `+0.5 Dep` instead of `+1.0` on routine `work_work` shifts for Tier 3 jobs. Because weekly executive decay is `-4` to `-5 Dep/turn`, executives cannot coast on routine shifts alone; they must actively balance Face Time networking and high-impact Initiatives to survive contract reviews.

### 2. "Look Busy" Reputation Penalty on Executive Roles
Add a `-1.0 Dep` penalty for using `look_busy` on Tier 3 (Executive Management) jobs. Unlike entry-level workers who can blend into the background, an executive's absence or disengagement is immediately noticed by staff and the board.

### 3. Holistic Career Goal Composite Score
Replace the legacy `1.25 × Dependability` formula with a multi-pillar career progress evaluation:
- **Dependability & Reliability** (max 35 pts)
- **Job Prestige & Wardrobe Tier** (max 30 pts: Casual = 10, Dress = 20, Business Suit = 30)
- **Domain Skills** (max 20 pts: Management & Technical proficiency)
- **Institutional Standing** (max 15 pts: Accumulated Merits across career)

### 4. Professional & Redemptive Weekend Events
Purge generic, unearned Dependability from random weekend leisure events (movies, walks in the park). Introduce:
- **Merit-Gated Executive Summits & Conferences**: High-yield professional events (e.g. `+2.0 Dep`, `+0.50 Mgmt`, high networking).
- **Demerit-Gated Redemptive Shifts**: Overtime catch-up shifts to repair poor performance and clear past incidents.

### 5. Whole-Number Skill Scale (Future Skill Rebalance)
When domain skills (Management, Technical) are completely decoupled from acting as 1:1 substitutes for Experience/Dependability, convert them from fractional units (`0.05 – 2.50`) into intuitive whole numbers (e.g., `1 – 10` or `1 – 100`).

### 6. Above-Market Executive Dividends & Profit-Sharing
At Tier 3, instead of flat hourly wages, top executives receive quarterly profit dividends scaled by company standing and macroeconomic health.



