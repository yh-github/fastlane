# Job Tags Reference & Documentation

Job tags provide thematic, mechanical modifiers to positions across the game. They allow jobs to feel distinct beyond raw wages and stat requirements.

---

## 1. Tag Summary Table

| Tag | Purpose & Theme | Mechanical Modifiers | Assigned Jobs (Advanced) |
| :--- | :--- | :--- | :--- |
| **`auto_accept`** | Guaranteed entry-level survival job. | 100% hiring acceptance regardless of luck roll or requirements. Resets Dependability to 10 if lower. | Burger Cook, University Janitor, Factory Janitor, Bank Janitor, Black's Janitor |
| **`heavy_physical`** | Exhausting manual labor. | • +1 Physical cost on `work_work`<br/>• 0.5x Experience gain<br/>• `face_time` disabled<br/>• `look_busy` costs 1 Dep<br/>• Physical mistake chance doubled, Mental chance halved | All Janitors, Assembly Worker, Groundskeeper, Burger Cook, Machinist's Helper |
| **`frontline_service`** | Direct customer-facing retail & service roles. | • +1 Social on `work_work` during normal shifts (action 1–3)<br/>• 0 Social during grind (4–7)<br/>• -1 Social during overtime (8+)<br/>• Mistakes cost +1 extra Social | Z-Mart Clerk, Burger Palace Clerk, QT Salesperson, Socket City Salesperson, Black's Checker, Bank Teller |
| **`middle_management`** | High-pressure managerial positions. | • +1 Mental cost on `work_work`<br/>• +0.5 Social gain per shift<br/>• `look_busy` mode disabled | Z-Mart Asst Mgr, Burger Palace Asst Mgr, QT Asst Mgr, Black's Asst Mgr, Bank Asst Mgr, Apartment Mgr, Factory Dept Mgr |
| **`high_downtime`** | Quiet, slow-paced jobs with substantial idle time. | • Weekly Dependability decay is **halved** while employed | Apartment Manager, Socket City Salesperson, QT Salesperson, Factory Secretary |
| **`academic_freedom`** | High-level university scholarship and research. | • Allows unique academic breakthroughs | University Professor |

---

## 2. Design Rationale

1. **`heavy_physical`**: Physical labor is demanding and tires you out fast (+1 Phys cost). Because tasks are repetitive, generic professional Exp gain is slower (0.5x). Slacking off (`look_busy`) is immediately visible to supervisors (costs 1 Dep).
2. **`frontline_service`**: Smiling and interacting with the public exercises your social charm (+1 Social), but customer fatigue sets in during extreme overtime (-1 Social). Workplace blunders are public, damaging social standing.
3. **`middle_management`**: Caught between upper management demands and supervising workers (+1 Mental stress). You cannot fake working (`look_busy` disabled), but navigating team dynamics builds social authority (+0.5 Social).
4. **`high_downtime`**: Jobs where long stretches between customers/tasks allow you to maintain your work routine without burning out, halving weekly dependability decay.
