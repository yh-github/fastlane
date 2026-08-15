# Economic Model & Probability Analysis

This document provides a mathematical and statistical breakdown of the 2-variable economy simulation in *The Fast Lane*, including price formulas, historical benchmark tables, Monte Carlo probability distributions, and parameter tuning.

---

## 1. Mathematical Formulation

### The 2-Variable State
The economy consists of two state variables:
1. **Trend / Index ($\tau \in [-3, +3]$)**: Represents momentum and direction.
2. **Reading ($R \in [R_{\text{min}}, 90]$)**: Represents the market price level ($R_{\text{min}} = -90$ on Floppy, $-30$ on CD-ROM/Modern).

### Price Calculation Formula
The price of items, housing rent, tuition fees, and offered job wages is calculated as:
$$\text{Price} = \text{Base} + \left\lfloor \frac{\text{Base} \times R}{60} \right\rfloor$$

#### Why the denominator is 60:
The number `60` comes directly from the original game's reverse-engineered formula (`Item Price = Base + (Base * Reading) / 60`). 
* At $R = 0$ (Baseline): $\text{Price} = \text{Base} \times 1.00$ ($100\%$)
* At $R = -30$ (CD-ROM Floor): $\text{Price} = \text{Base} + \frac{-30}{60}\text{Base} = 50\%$ of base price
* At $R = +60$ (High Boom): $\text{Price} = \text{Base} + \frac{60}{60}\text{Base} = 200\%$ of base price
* At $R = +90$ (Maximum Ceiling): $\text{Price} = \text{Base} + \frac{90}{60}\text{Base} = 250\%$ of base price
* At $R = -90$ (Floppy Absolute Depression): $\text{Price} = \text{Base} + \frac{-90}{60}\text{Base} = -50\%$ (in practice clamped or yielding extreme discounts down to bare minimum).

---

## 2. Benchmark Table (Absolute Values)

Below are the actual dollar values for key items, housing, tuition, and wages across the economic spectrum:

| Item / Entity | Base | Floor ($-30$, $50\%$) | Slump ($-15$, $75\%$) | Baseline ($0$, $100\%$) | Mid ($+20$, $133\%$) | Normal High ($+30$, $150\%$) | Booming ($+50$, $183\%$) | Crash Zone ($+60$, $200\%$) | Peak ($+90$, $250\%$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Fries** (Fast Food) | $65 | **$32** | $48 | **$65** | $86 | $97 | $119 | $130 | **$162** |
| **Low-Cost Rent** (Monthly) | $325 | **$162** | $243 | **$325** | $433 | $487 | $595 | $650 | **$812** |
| **Security Rent** (Monthly) | $475 | **$237** | $356 | **$475** | $633 | $712 | $870 | $950 | **$1,187** |
| **Refrigerator** (Socket City) | $650 | **$325** | $487 | **$650** | $866 | $975 | $1,191 | $1,300 | **$1,625** |
| **Enrollment Fee** (Hi-Tech U) | $50 | **$25** | $37 | **$50** | $66 | $75 | $91 | $100 | **$125** |
| **Computer** (Socket City) | $1,599 | **$799** | $1,199 | **$1,599** | $2,132 | $2,398 | $2,931 | $3,198 | **$3,997** |
| **Cook Wage** (Burger Palace) | $5/hr | **$2/hr** | $3/hr | **$5/hr** | $6/hr | $7/hr | $9/hr | $10/hr | **$12/hr** |
| **Butcher Wage** (Black's) | $12/hr | **$6/hr** | $9/hr | **$12/hr** | $16/hr | $18/hr | $22/hr | $24/hr | **$30/hr** |

---

## 3. Turn-by-Turn Fluctuation & Dynamics

At the start of each turn:
1. **Trend Evolution**:
   $$\Delta \tau \in \{-1, 0, +1\}$$
   * **Mean-Reversion**: If $R > 55$ and $\tau > 0$, $\Delta \tau \leftarrow \Delta \tau - 1$. If $R < -10$ and $\tau < 0$, $\Delta \tau \leftarrow \Delta \tau + 1$.
   * **Momentum Reinforcement**: If in normal range, $\tau > 0$ has a $20\%$ chance to add $+1$, and $\tau < 0$ has a $20\%$ chance to subtract $1$.
   * $\tau \leftarrow \text{clamp}(\tau + \Delta \tau, -3, +3)$.
2. **Reading Evolution**:
   $$R \leftarrow \text{clamp}(R + \tau \times \text{random}(1, 2, 3), R_{\text{min}}, 90)$$

---

## 4. Market Events (Week 8+)

### Market Crash
* **Trigger Condition**: $\text{Turn} \ge 8$ and $R \ge 60$.
* **Probability per Turn**:
  $$P(\text{Crash}) = \frac{1}{1 + (\text{marketCrashDivisor} \times N_{\text{players}})}$$
  *(Default divisor: 20 in single-player $\rightarrow P \approx 4.8\%$ per eligible turn)*
* **Effects**:
  * **Minor** ($33.3\%$): $R \leftarrow \max(R_{\text{min}}, R - 15)$, $\tau \leftarrow -2$.
  * **Moderate** ($33.3\%$): $R \leftarrow \max(R_{\text{min}}, R - 30)$, $\tau \leftarrow \text{random}(-3, -1)$, $50\%$ chance fired, surviving players receive a $20\%$ wage cut.
  * **Major** ($33.3\%$): $R \leftarrow \max(R_{\text{min}}, R - 50)$, $\tau \leftarrow \text{random}(-3, -1)$, $100\%$ fired, all bank savings wiped to $\$0$.

### Economic Boom
* **Trigger Condition**: $\text{Turn} \ge 8$, $R \ge 0$, and no crash this turn.
* **Probability per Turn**:
  $$P(\text{Boom}) = \frac{1}{1 + (\text{economicBoomDivisor} \times N_{\text{players}})}$$
  *(Default divisor: 50 in single-player $\rightarrow P \approx 2.0\%$ per turn)*
* **Effects**:
  * $R \leftarrow \min(90, R + 6)$ ($+10\%$ price bump).
  * $\tau \leftarrow \text{random}(+1, +3)$ (positive trend surge).
  * $+5$ Happiness for the active player if they own $>\$1,000$ in fluctuating stocks.

---

## 5. Statistical Simulation Results (50,000 Games)

### Single-Player 50-Turn Game Distributions

| Metric | Unconstrained (Old) | Current Tuned Model |
| :--- | :---: | :---: |
| **Low Range ($<0$)** | $47.7\%$ | **$30.8\%$** |
| **Normal Range ($0 \dots 30$)** | $16.9\%$ | **$30.8\%$** |
| **High Range ($31 \dots 60$)** | $13.7\%$ | **$26.5\%$** |
| **Extreme Danger ($\ge 60$)** | $21.8\%$ | **$11.9\%$** |
| **Median Reading** | $1.0$ | **$17.0$ ($1.28\times$ base prices)** |
| **Games with $\ge 1$ Market Crash** | $25.6\%$ (stuck at 80+) | **$27.5\%$ (~1 in 3.6 games)** |
| **Games with $\ge 1$ Economic Boom** | $61.0\%$ | **$43.9\%$ (~1 in 2.3 games)** |

### Progression by Turn Milestones
* **Turns 1–7**: Reading stays between $-5$ and $+15$. Crashes and Booms are inactive.
* **Turns 8–20**: Momentum builds; $~45\%$ of games touch a low slump ($\le -20$, median Turn 17), while $~40\%$ climb toward high prices.
* **Turns 20–50**: Natural cyclical economy with periodic boom bonuses and late-game crash hazards.
