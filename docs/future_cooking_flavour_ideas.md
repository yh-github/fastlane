# Future Cooking Module Ideas: Recipe Flavor & Micro-Crit

> Status: **Deferred for Future Consideration**  
> Scope: Lightweight flavor & engagement enhancements for the Advanced 2000 Cooking Module without distracting from the core time/budget loop.

---

## 1. Procedural Dish Name Generator (Zero Mechanical Bloat)

Whenever the player triggers `prep_meal` (`home_cooked`, `microwave`, `cold_meal`, or `canned`), generate an appliance-aware dish title for the action log and brief inline toast/feedback:

- **Stove + Fresh (`home_cooked`)**:
  - *"Pan-Seared Herb Chicken & Roasted Veggies"*
  - *"Slow-Simmered Garlic Pasta"*
  - *"Crispy Skillet Salmon & Greens"*
  - *"Homemade Beef & Root Vegetable Stew"*
- **Microwave + Fresh (`microwave`)**:
  - *"Steamed Rice Bowl & Seasoned Veg"*
  - *"Quick Nuked Jacket Potato & Cheese"*
  - *"Express Stir-Fry Bowl"*
- **Cold Fresh (`cold_meal`)**:
  - *"Artisan Club Sandwich & Crisp Salad"*
  - *"Chilled Mezze Plate & Hummus Wrap"*
  - *"Crunchy Garden Wrap"*
- **Canned (`canned`)**:
  - *"Open-Can Tepid Mystery Beans"*
  - *"Stovetop Canned Beef & Cracker Mash"*
  - *"Room-Temp Tin Sardines"*

---

## 2. "Culinary Delight" Micro-Crit on Stove Cooking

Add a small, exciting variance roll exclusively when cooking on a Stove (`home_cooked`):
- **Trigger Chance**: ~15% via deterministic campaign RNG (`context.rng`) when executing `home_cooked`.
- **Reward**: Small `+0.5` or `+1.0` Mental boost (`"Chef's Kiss! Turned out delicious (+1 Mental)"`) + celebratory sparkle toast/icon animation.
- **Safety**: Never penalizes the player on a normal roll (pure upside), and preserves deterministic replayability via seeded `context.rng`.

---

## 3. Optional Micro-Choice: "Dish of the Week" (2-Button Prompt)

Before locking into higher complexity or heavy mini-games, consider a single optional weekly preference toggle when clicking Cook on Stove:
- **Hearty Focus** (`+0.5` extra Physical, standard Mental) vs. **Comfort Dish** (standard Physical, `+0.5` extra Mental)
- Gives a 1-click meaningful roleplay & min-max choice based on the player's immediate stat need without adding modal hops or multi-turn state.
