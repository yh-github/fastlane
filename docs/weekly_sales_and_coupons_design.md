# Weekly Store SALEs & Newspaper Coupons — Design & Balance Analysis

> **Status:** Design Document (High Priority — Next for `advanced_2000`)  
> **Scope:** `advanced_2000` (with optional rule-gated portability to `advanced` / Advanced 90's once proven)  
> **Primary Touchpoints:** [`economicTurnPhase.ts`](file:///home/yoavh/code/antigravity/fastlane/src/engine/turn/economicTurnPhase.ts), [`shoppingActions.ts`](file:///home/yoavh/code/antigravity/fastlane/src/engine/actions/shoppingActions.ts), [`shoppingEngine.ts`](file:///home/yoavh/code/antigravity/fastlane/src/engine/shoppingEngine.ts), [`NewspaperModal.tsx`](file:///home/yoavh/code/antigravity/fastlane/src/ui/NewspaperModal.tsx), [`StoreFront.tsx`](file:///home/yoavh/code/antigravity/fastlane/src/ui/buildings/StoreFront.tsx), [`pawnActions.ts`](file:///home/yoavh/code/antigravity/fastlane/src/engine/actions/pawnActions.ts), [`PawnShop.tsx`](file:///home/yoavh/code/antigravity/fastlane/src/ui/buildings/PawnShop.tsx)

---

## 1. Design Goals & Core Distinction

In *The Fast Lane*, prices normally move in near-lockstep with the macroeconomic index (`calcEconomyPrice`). Adding **Weekly Store SALEs** and **Newspaper Coupons** breaks that uniformity, introduces tactical week-to-week shopping opportunities, and elevates the **Newspaper** (`` `$1` `` + `1h` at Black's Market, or free on crash/boom/robbery weeks) into a high-value planning tool.

| Mechanic | Visibility & Access | Acquisition | Expiration | Target Categories |
| :--- | :--- | :--- | :--- | :--- |
| **Weekly Store SALEs** (`weeklySales`) | **Public** — active on store shelves for every player whether or not they read the paper. Reading the Newspaper simply *reveals* them upfront before spending travel/entry hours. | Automatic at turn start (`processTurnStart`). | End of the current turn (new rotation next week). | Durables, Appliances, Books, Clothing across **Z-Mart**, **Socket City**, and **QT Clothing** (plus occasional grocery specials). |
| **Newspaper Coupons** (`weeklyCoupons` → `activeCoupons`) | **Private / Clipped** — **only** unlocked when a player reads/receives the Newspaper (`readNewspaperThisTurn` / `freeNewspaper`). | Clipped automatically when buying/reading the Newspaper. | **Strictly same-turn** (`turnFlags.activeCoupons` clears at `resetCommonTurnState`). Zero cross-turn hoarding or inventory bloat. | **Fast Food** (Red Pirate meals / coffee), **Clothing** (QT / Z-Mart), **Event Tickets**, and **Targeted Durables** (Socket City rebates). |

---

## 2. Proposed Rules & Data Model

### 2.1 Rule Toggles (`src/engine/rules.ts`)
- `enableWeeklySales: boolean` (default `false`; `true` in `advanced_2000`)
- `enableNewspaperCoupons: boolean` (default `false`; `true` in `advanced_2000`)

### 2.2 Global Turn State (`GameState`)
All players on a given turn see the **same** weekly circular and available coupon pool so multiplayer turns stay completely symmetric and deterministic under `resolveDecision`:

```ts
export interface WeeklyStoreSale {
  id: string;                 // e.g. 'sale_socket_city_microwave_t4'
  buildingId: string;         // 'z_mart' | 'socket_city' | 'qt_clothing' | 'blacks_market'
  itemId: string;             // Catalog item ID
  discountPercent: number;    // 20, 25, 30, or 35
  headlineKey?: string;       // Fluff flyer blurb in NewspaperModal
}

export interface WeeklyCouponOffer {
  id: string;                 // Unique coupon ID for the week
  label: string;              // e.g. "50% Off Any Red Pirate Meal"
  targetBuildingId?: string;  // Optional store filter (e.g. 'red_pirate', 'qt_clothing', 'socket_city')
  targetCategory?: string;    // 'fast_food' | 'coffee' | 'clothes' | 'appliance' | 'ticket' | 'book'
  targetItemId?: string;      // Optional specific item ID
  discountType: 'percent' | 'flat_cash';
  discountValue: number;      // e.g. 50 (50% off) or 75 ($75 instant rebate)
  maxUses: number;            // Usually 1 (single-use clip per turn)
}
```

Added to `GameState`:
- `weeklySales?: WeeklyStoreSale[]` (1–2 active store sales per turn)
- `weeklyCoupons?: WeeklyCouponOffer[]` (1–2 clippable coupons printed in that week's paper)

### 2.3 Player Turn-Scoped State (`PlayerTurnFlags`)
Added to `PlayerTurnFlags` (cleared automatically in `resetCommonTurnState`):
- `activeCoupons?: Array<WeeklyCouponOffer & { remainingUses: number }>`
  - Populated when `handleBuyAction` processes `itemId === 'newspaper'`, **or** when a free newspaper triggers (`freeNewspaper = true` from Crash/Boom/Robbery — design option: either grant coupons on all newspapers read, or only when explicitly buying/opening the paper).
  - Recommended rule: Grant `activeCoupons` whenever `readNewspaperThisTurn` becomes `true` (buying the paper or clicking *"Clip Coupons"* inside the free morning edition), so reading the paper always has a clear tactile reward.

---

## 3. Generation Logic, Pricing Rules & Stacking Safeguards

### 3.1 Weekly Rotation Deck (Preventing Stale Repeats)
- **SALEs (`1–2` items/week)**:
  - Drawn via a non-repeating shuffle window (`resolveDecision(replay, 'weekly_sales_turn_' + state.turn, ...)`):
    - **Slot 1 (Home / Tech Spotlight)**: Picks 1 durable/appliance/book from **Socket City** or **Z-Mart** (`20%–35%` off).
    - **Slot 2 (Apparel / Everyday Bargain, 60% chance)**: Picks a **QT Clothing** outfit (`20%–30%` off), a **Z-Mart** ticket/book bundle (`25%–35%` off), or **Black's Market** fresh grocery bulk discount (`20%` off).
- **Coupons (`1–2` clips/week)**:
  - Drawn alongside SALEs so the paper always prints at least 1 actionable coupon:
    - **Early-Game / Sustenance Coupon Pool**: `50%` off 1 Red Pirate fast-food meal (min `` `$1` ``), Free Drip Coffee (`100%` off 1st cup, `` `$25` `` saved), or `30%` off Casual/Dress clothes at QT Clothing.
    - **Mid/Late-Game Coupon Pool**: `` `$75` ``–`` `$100` `` instant rebate on any appliance >= `` `$300` `` at Socket City, or `2-for-1` (`50%` off) Baseball/Theatre/Concert tickets at Z-Mart.

### 3.2 Price Resolution & Discount Stacking Rule
In [`shoppingActions.ts`](file:///home/yoavh/code/antigravity/fastlane/src/engine/actions/shoppingActions.ts) (`handleBuyAction`):
1. Compute base economy-adjusted price (`adjustedPrice = calcItemPrice(..., context.economicIndex)`).
2. Check if an active `WeeklyStoreSale` applies to `(currentBuildingId, item.id)` → `salePrice`.
3. Check if the player holds an applicable `activeCoupon` with `remainingUses > 0` → `couponPrice`.
4. **No Double-Dipping (Best-Discount Rule)**:
   - Store SALEs and Coupons **do not stack** on the same purchase (`finalPrice = Math.min(salePrice, couponPrice)`).
   - If the coupon yields the lower price (or ties when the player wants to save cash), consume `1` use from `activeCoupon` (if `salePrice` is already cheaper or equal, **preserve** the player's coupon for another item!).
   - *Why no stacking?* Preventing `35%` Sale + `` `$100` `` Coupon on a `` `$220` `` Microwave avoids near-free appliances and eliminates any risk of buying below pawn value.

### 3.3 Pawn Shop Arbitrage Safeguard (`preventPawnArbitrage`)
Right now, [`PawnShop.tsx`](file:///home/yoavh/code/antigravity/fastlane/src/ui/buildings/PawnShop.tsx#L905-L907) computes pawn payout from catalog `itemDef.basePrice` (`Math.floor(calcEconomyPrice(basePrice, economicIndex) * payoutRate)`, where `payoutRate = 0.40`). And [`pawnActions.ts`](file:///home/yoavh/code/antigravity/fastlane/src/engine/actions/pawnActions.ts#L49-L55) computes `redeemCost` from `itemDef.basePrice` when `preventPawnArbitrage` is enabled.

To keep **SALEs + Coupons** 100% exploit-free:
1. Store the **actual discounted price paid** in `OwnedAppliance.purchasePrice` (and `PawnableItem.purchasePrice`).
2. Enforce the **No-Stacking Cap** so no durable discount ever exceeds `40%` off (keeping purchase price >= `60%` of catalog price, safely above the `40%` pawn payout).
3. Add a hard safeguard in `PawnShop.tsx` and `handlePawnItemAction`:
   - `cappedPawnValue = Math.min(standardPawnValue, Math.floor(item.purchasePrice * 0.85))` whenever `rules.preventPawnArbitrage` is enabled, guaranteeing pawning a sale/coupon item always returns less cash than was spent.

---

## 4. UI / UX Presentation

1. **Newspaper Modal ([`NewspaperModal.tsx`](file:///home/yoavh/code/antigravity/fastlane/src/ui/NewspaperModal.tsx) & `AuthenticNewspaperModal.tsx`)**:
   - Below the Market Watch financial column, add a two-box **Classifieds & Weekly Circular** section:
     - **🏷️ THIS WEEK'S STORE SALEs**: Lists store name, item, and `% OFF` (visible to anyone reading the paper).
     - **✂️ CLIPPED COUPONS (VALID THIS TURN ONLY)**: Perforated dashed-border coupon cards marked `"ACTIVE — EXPIRES END OF WEEK"` once clipped.
2. **StoreFront ([`StoreFront.tsx`](file:///home/yoavh/code/antigravity/fastlane/src/ui/buildings/StoreFront.tsx))**:
   - Discounted items display strikethrough original price + bold discounted price, plus compact pills:
     - `🏷️ SALE -25%` (amber)
     - `✂️ COUPON -$75` or `✂️ COUPON -50%` (emerald, shown only if player clipped the coupon).
3. **HUD / Quick Reference**:
   - Optional compact coupon count badge or tooltip in the Cash/Action bar when `activeCoupons` has unused clips, reminding players before they end their turn (`"✂️ 1 coupon expires at turn end"`).

---

## 5. Gameplay & Balance Impact Analysis

### 5.1 Newspaper ROI & Behavioral Shift
- **Current State**: In *The Fast Lane*, players mainly visit Black's Market for groceries or read the paper only when hunting stock tips (`predictiveNewspaperStockTips`) or checking early job openings (less needed once `helpfulUI` reveals jobs in Employment Office). Spending `1h` + `` `$1` `` for the Newspaper is often skipped in mid-game.
- **With SALEs & Coupons**:
  - A `1h` + `` `$1` `` Newspaper stop can yield `` `$25`–`$100` `` in coupon value plus intelligence on a `30%` Socket City appliance sale (saving `` `$150`–`$480` `` on a Computer, Hot Tub, Refrigerator, or Robot Vacuum).
  - **Time vs. Cash Trade-off**: Because Black's Market is on the east side of the board and `1h` is non-trivial under a `60h` week, players won't blindly buy the paper every turn unless they plan to shop that week — creating an authentic weekly planning loop (*"Do I have enough hours & cash this turn to detour to Black's Market for the circulars before hitting Socket City?"*).

### 5.2 Impact on Economy, Pacing & `spaceCapping`
- **Early-Game Cash Smoothing**: Fast-food (`50%` off Red Pirate), free coffee, and QT Clothing (`30%` off Dress/Casual) coupons directly relieve early-game cash crunches in `advanced_2000` (`65/65` caps + `18/28` mistake thresholds) without inflating wages.
- **Organic Goal Acceleration vs. Snowball Risk**:
  - Saving `` `$300+` `` on a Computer or Hot Tub can shave 1–2 turns off Lifestyle/Education benchmarks if timed well.
  - **Natural Counterbalance (`spaceCapping`)**: In Low-Cost Housing (`spaceCap: 100`), a player tempted by a `35%` off Stove (`40` space) or Freezer (`30` space) sale immediately runs up against apartment space constraints (`spaceCap` + mess buildup), forcing real choices between grabbing a bargain early vs. upgrading to Security Apartments (`spaceCap: 250`).
- **Z-Mart vs. Socket City Competition**:
  - Currently, Z-Mart undercuts Socket City on appliances (`used` condition, higher `1/36` break chance vs. Socket City's `1/51`). A Socket City `25%–30%` SALE or `` `$75` `` rebate briefly brings **brand-new** appliances into Z-Mart's price range, creating exciting opportunistic store-routing instead of always defaulting to Z-Mart.

### 5.3 AI Opponent Compatibility
- Because SALEs live on the store shelf (`GameState.weeklySales`) and coupons trigger automatically when reading the paper, `aiEngine.ts` can read `getEffectiveItemPrice(...)` during shopping evaluation without special-case AI scripts — AI naturally favors discounted essentials when pricing drops.

---

## 6. Open Tuning Questions Before Implementation

1. **Free Newspapers & Coupons**: Should emergency Crash/Boom/Robbery newspapers (`freeNewspaper: true`) automatically grant that week's clipped coupons, or only grant coupons when the player actively visits Black's Market (`1h` + `` `$1` ``) to buy the paper? *(Recommendation: Only grant on Black's Market purchase or add a `0h` "Buy Today's Paper" action only when not free; otherwise Crash weeks unintentionally reward a free `` `$75` `` coupon!)*
2. **Grocery Sales**: Should Black's Market bulk groceries ever go on SALE, or keep grocery prices tied strictly to the macro Consumer Goods index (`gdsIndex`) so food inflation remains predictable?
