# Job Tags Reference & Documentation

Job tags provide thematic, mechanical modifiers to positions across the game. They allow jobs to feel distinct beyond raw wages and stat requirements.

---

## 1. Tag Summary Table

| Tag | Purpose & Theme | Mechanical Modifiers | Assigned Jobs (Advanced) |
| :--- | :--- | :--- | :--- |
| **`always_hiring`** | High-turnover entry/essential jobs. | If the applicant meets the prerequisites, hiring is 100% guaranteed without an RNG luck roll. Resets Dependability to 10 if lower. | Burger Cook, University Janitor, Factory Janitor, Bank Janitor, Black's Janitor |
| **`heavy_physical`** | Exhausting manual labor. | • +0.5 Physical cost on `work_work`<br/>• +0.25 Physical cost & -1 Dep on `look_busy`<br/>• 0.5x Experience gain<br/>• `face_time` disabled<br/>• Physical mistake & fatigue threshold doubled (20 instead of 10), Mental blunder chance halved<br/>• **Grind & Overtime shifts inflict -0.5 Max Physical** | Burger Cook, University Janitor, Factory Janitor, Bank Janitor, Black's Janitor, Groundskeeper |
| **`frontline_service`** | Direct customer-facing retail & service roles. | • +1 Social on `work_work` during normal shifts (action 1–3)<br/>• 0 Social during grind (4–7)<br/>• -1 Social during overtime (8+)<br/>• Mistakes cost +1 extra Social<br/>• **Doubled Social hiring bonus** on employability odds | Z-Mart Clerk, Burger Palace Clerk, QT Salesperson, Socket City Clerk, Socket City Salesperson, Factory Secretary, Black's Checker, Bank Teller, Apartment Manager |
| **`middle_management`** | High-pressure assistant/department leadership roles. | • +1 Mental cost on `work_work`<br/>• `look_busy` mode disabled<br/>• Grants **+0.25x Exp as Skill_Mgmt**<br/>• `face_time` grants +0.25 Skill_Mgmt | Z-Mart Asst Mgr, Burger Palace Asst Mgr, QT Asst Mgr, Black's Asst Mgr, Bank Asst Mgr, Factory Dept Mgr |
| **`executive_management`** | Top-tier store, branch, and general managers. | • Standard stamina costs (`look_busy` enabled as delegation)<br/>• Grants **+0.50x Exp as Skill_Mgmt**<br/>• `face_time` grants +0.25 Skill_Mgmt<br/>• **Requires Skill_Mgmt >= Exp_req / 10** to be hired | Z-Mart Mgr, Burger Palace Mgr, QT Mgr, Socket City Mgr, Black's Mgr, Bank Mgr, Factory General Mgr |
| **`high_downtime`** | Quiet, slow-paced jobs with substantial idle time. | • Weekly Dependability decay is **halved** while employed | Apartment Manager, Socket City Salesperson, QT Salesperson, Factory Secretary, Executive Secretary |
| **`academic_freedom`** | High-level university scholarship and research. | • Allows unique academic breakthroughs | University Professor |
| **`technical`** | Technology, electronics, and engineering roles. | • Work shifts grant +0.25x Exp as **Skill_Tech** (capped at 10)<br/>• Computer freelancing and tech innovation grant +0.25 Skill_Tech<br/>• Skill_Tech effectively adds to Dep and Exp prerequisites for tech jobs<br/>• Directly boosts employability odds for tech jobs (+1.5% per Skill_Tech) | Assembly Worker, Machinist's Helper, Machinist, Factory Engineer, Factory Dept Mgr, Factory Gen Mgr, Electronics Repairman, Socket City Mgr |

---

## 2. Design Rationale

1. **`heavy_physical`**: Manual labor wears on the body over time. Moderate baseline shifts add +0.5 Phys cost (and slacking off in `look_busy` adds +0.25 Phys and -1 Dep). Overexertion in Grind or Overtime causes cumulative wear-and-tear (-0.5 Max Physical). Fatigue spillover begins earlier (Physical < 20).
2. **`Max_Physical` Wear & Rehabilitation**:
   * Any job in **Overtime (shift 8+)** inflicts **-0.5 Max Physical** from extreme burnout.
   * On `heavy_physical` jobs, wear begins earlier in **Grind (shift 4+)**.
   * Players can rehabilitate their body by **relaxing at home with food while already at full Physical**, restoring Max Physical by half of their normal relax strength.
3. **`frontline_service`**: Smiling and interacting with the public exercises your social charm (+1 Social), but customer fatigue sets in during extreme overtime (-1 Social). Workplace blunders are public, damaging social standing. High Social doubles your hiring odds.
4. **`middle_management`**: Caught between upper management demands and supervising workers (+1 Mental stress). You cannot fake working (`look_busy` disabled), but navigating office dynamics and supervising teams builds Management Skill (+0.25 Skill_Mgmt).
5. **`executive_management`**: High-level strategic oversight with autonomous authority. Executive positions require proven leadership experience (`Skill_Mgmt >= Exp_req / 10`), can delegate work (`look_busy` enabled), and build Management Skill rapidly (+0.50 Skill_Mgmt).
6. **`high_downtime`**: Jobs where long stretches between customers/tasks allow you to maintain your work routine without burning out, halving weekly dependability decay. Ideal for students attending university.
7. **`technical`**: Technical apprenticeship roles (Assembly Worker, Machinist's Helper) now focus purely on craftsmanship without manual labor penalties, earning standard Exp and building Skill_Tech to pave the way to senior engineering roles.


