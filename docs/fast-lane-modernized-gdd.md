# **Game Design Document: "Fast Lane: Modernized"**

## **1. Core Concept & Visuals**

A competitive, modernized "life simulator" played on a digital board game map. Players race against AI or each other to fulfill life goals while managing time, money, education, and career.

* **Visual Style:** Top-down or isometric board game map. Players see the entire board (desktop) or pan/swipe (mobile).  
* **Movement:** Real-time "click-and-walk." Travel costs Time. Players can interrupt and reroute mid-stride.

## **2. 100% Transparency System & "Familiarity"**

To solve the original's "hidden stats" frustration, mechanics are visible, but revealed progressively:

* **Familiarity Mechanic:** First-time purchases hide exact numbers (e.g., "Future you will thank you"). After repeated use, exact math is revealed on tooltips.  
* **The Resume Tab:** Displays exact "Dependability" and "Experience" numbers, weekly decay rates, and precise job requirements.  
* **Weekend Risk Forecast:** Dynamic UI panel showing event odds (e.g., *Carrying $1,000 cash = 20% Robbery Risk*).

## **3. Jobs, Items & Synergies**

* **Unique Job Perks:** Jobs offer passive benefits. (e.g., Fast-food worker gets free meals, saving time and money). High-tier jobs have limited global slots.  
* **Appliances:** Fridge prevents food rot; Freezer allows bulk-buying.  
* **Tech & Education:** A Computer + Book sets grant explicit, visible reductions in required classes.

## **4. The Lifestyle Trait System (Habits)**

Character builds emerge organically from gameplay, rather than a pre-game creation screen.

* **Procedural Unlocks:** If the random map spawns you near a burger joint, you may develop a "Junk Food" habit. You must actively choose healthy options to unlock the "Healthy" lifestyle tree.  
* **Hedonism vs. Meaning:** Hedonism (arcade, junk food) grants instant Happiness but increases overall decay. Meaning (charity, family, reading) costs upfront time/money but permanently slows decay.  
* **Micro-Habits (Delayed Gratification):** Cheap items like Sunscreen, Floss, or Calling Parents offer no immediate buff, but act as "Shields" against devastating RNG events decades (late-game turns) into the future.

## **5. Technical Architecture & Data-Driven Design**

To avoid the "Inner-Platform Effect" and support future modding/roguelike procedural generation, the game strictly separates Engine Logic from Content Data.

* **Campaign Folders:** Data is not monolithic. The game loads specific campaign folders (e.g., /campaigns/classic_1990/ vs /campaigns/modern_v2/).  
* **Hardcoded Archetypes:** The engine knows *how* a Shop or Bank works.  
* **Data Payloads:** The JSON configs tell the engine *what* the Shop sells or *what* the Job requires.

## **6. Level Editor Data Schemas**

The engine expects structured data. The Level Editor will output JSON adhering to these baseline schemas:

* **Jobs Schema Base:** id, location_id, title, base_wage, requirements (Uniform, Experience, Dependability, Degree), and a perks array (for applying standard engine modifier IDs).  
* **Items Schema Base:** id, name, type (Durable, Consumable, Junk), base_cost, durability_chance, modifiers (e.g., array of stat changes upon consumption/ownership).

## **7. The Mathematical Core & Formulas**

The core loop engine relies on the following exact formulas (replicating the classic 1990 balance for V1):

* **The Time Economy (60 Hours/Turn):**  
  * *Building Entry:* -2 Hours.  
  * *Work/Study/Relax:* -6 Hours.  
  * *Job Application:* -4 Hours.  
  * *Prorated Work:* If < 6 hours remain, pay is (Wage * 8 * HoursRemaining / 6).  
* **Stat Engines (Dependability & Experience):**  
  * *Decay:* Dependability drops **-3 points** every week.  
  * *Growth:* Working yields +1 Exp and +1 Dep (up to the current job's cap).  
  * *Education:* A degree instantly grants +5 Dependability and permanently raises Exp/Dep caps by 5.  
* **Economy Punishments:**  
  * *Rent Debt:* Missed rent garnishes 50% of all future wages + a $2 fee per shift until paid.  
  * *Market Crash:* 50% chance to be fired; surviving slashes base wage to 80%.  
* **The RNG "Luck" Formula (Job Rejection):**  
  * Even if qualified, rejection chance is rolled (1-100) against: Luck = 40 + Dependability + Experience + (8 * Number of Degrees). If the roll is > Luck, application fails.  
* **Time Debt (Caffeine):** Consuming caffeine gives +X hours *this* turn, but applies a -Y hour modifier to the *next* turn, creating a habit loop.

## **8. Win Conditions**

Levels support flexible, dynamic victory conditions defined in the config:

* **Classic Allotment:** Players distribute 100 points across Wealth, Happiness, Education, and Career before the game starts. (Note: Classic Wealth only counts liquid cash, not item net worth).  
* **Dynamic Summation:** (Modern variant) Players win by reaching a total aggregate score, allowing them to pivot strategies (e.g., abandoning Wealth to max out Happiness and Education) mid-game.

## **9. UI/UX & Tech Stack**

* **Tech Stack:** TypeScript + React (for the complex HUD, Resume, and Menus) layered over an HTML5 Canvas or PixiJS context (for the interactive map and pathfinding).  
* **Responsive Layout:**  
  * *Desktop:* Map occupies the central viewport; Dashboard (stats) top bar; Action Panel (inventory/resume) fixed to the right.  
  * *Mobile:* Map fills the screen with pan/swipe navigation. Action Panel behaves as a swipe-up bottom drawer.

## **10. Future Expansion Roadmap (V2+)**

Once the classic clone (V1) is stable, the data-driven architecture will support:

* Procedural map generation (roguelike element).  
* Expanded Life Goals (Physical well-being, Morality, Fame, Family).  
* Complex financial instruments (Passive income, real estate investments).
