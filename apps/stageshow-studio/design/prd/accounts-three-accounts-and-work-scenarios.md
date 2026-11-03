# Design / UX: Three-account plan, Cash flow, and work scenarios (Epic 3A)

**Status:** design draft for Product to merge. Brian has not signed off on every open question. Dated October 31, 2026.  
**Author:** Design - Setasides.  
**Do not treat as live PRD until Product merges into the Addendum.**

**Where this sits:** Addendum **v28** — [Epic 3A “Three-account plan and advice”](https://docs.google.com/document/d/1NF6BP4rKXRqe1jQHByxmawtWW-m8V0RJ-rOfZDY1vnM/edit), stories **3A.1–3A.4**. Builds on Epic MM (money movement). Mockups: `/workspace/design-setasides/accounts-v2/`.

---

## Brian decisions (Oct 31, 2026)

| Decision | Detail |
|---|---|
| **Three tabs** | App tabs are **Accounts \| Plans \| Cash flow**. |
| **Who needs to work? location** | Lives on **Cash flow**, not Accounts. |
| **Fill order** | Checking covers monthly operating expenses first; excess funds set-asides; then other non-retirement savings. |
| **Money movement** | SetAsides carries out the approved net change between the user’s own accounts. |
| **Investment advice** | SetAsides **will give investment advice**. Drop “not financial advice” wording. Product scopes RIA or partner. |
| **Savings target basis** | **Dated dues:** Savings target = sum of Plans amounts due in the next **24 months**. Label: **“Covers what’s due in the next 2 years.”** |
| **One-income scenarios** | For **Only Dana** and **Only Sam**, show **both** countdown and income needed to never run out (**base case only**). |
| **Accounts total label** | Big total is labeled **Total balance** (not “What you have”). |
| **Investment income** | Show as a Money in line ($410/mo Parks, 12-month average). **Default: reinvest** — gray “Reinvested”, not in Total in or difference while both work. |
| **Count in work scenarios** | One-income and neither **automatically count** investment income. Both-work leaves it reinvested. |
| **Household toggle** | “Count investment income every month” — off by default. Hint: turn on if you live on it today, e.g. in retirement. |

---

## Product guidance (Epic 3A / v28)

- Yields as **targets**: Savings “Target 3–5%”; Long-term “Target 5%+”. Disclaimer: *“Target yields aren’t a promise. Returns can be lower, and long-term savings can lose value.”*
- Projected returns need assumptions/risks beside them.
- Keep **“Based on current IRS rules. Not tax advice.”** for retirement access only.

---

# Part A — Accounts tab

## Aim

See non-retirement money in three accounts by when it is needed, a suggested move to top them up, and read-only retirement — without work scenarios on this tab.

### 3A.1 — Your three accounts

1. Top: **Total balance** (big), then Non-retirement and Retirement subtotals.
2. **Your three accounts** in fill order, each with balance, target, blue bar, gray status:
   - **Checking** — this month’s spending. Target = 2 × (Monthly plans + Your Number). Parks: **$14,278**; balance $16,400 → $2,122 over.
   - **Savings** — **Covers what’s due in the next 2 years.** Target = dated dues next 24 months (example $40,000). Target yield 3–5%.
   - **Long-term savings** — the rest. Target yield 5%+. Past trailing rate as a separate line.
3. Shared target-yield disclaimer under the rows.
4. Bottom nav: **Accounts | Plans | Cash flow**.

**MCP:** `get_accounts` (includes `total_balance`, three roles, suggested_move).

### 3A.2 — Suggested move

- e.g. “Move $1,800 from Checking to Savings” with before/after; **Approve and move** / **I’ll move it myself**.
- Guardrail: Checking stays at or above operating target.
- Reused on Plans check-in.

**MCP:** `move_money` requires `approved_by`.

### 3A.4 — Retirement (read-only)

- Parks: 401(k) $312,000 at 59½; Roth IRA $73,400.
- “Based on current IRS rules. Not tax advice.” Never move retirement money.

---

# Part B — Cash flow tab

## Aim

Answer “Are we ahead each month?” and **“Who needs to work?”** (Epic **3A.3**) from money in vs money out.

### Cash flow — money in / out / difference

**Web**
- **Money in:** per person take-home (Parks: Dana $6,000, Sam $3,500 → **Total in $9,500**). Source: Plaid paychecks.
- **Investment income:** third Money in line — Parks **$410/mo**, 12-month average. Gray source: “Interest and dividends from Savings and Long-term savings.”
- **Default reinvest (Brian, Oct 31):** while both work, the line is gray **Reinvested** and is **not** included in Total in or the difference. Gray line under Total in: “+ $410/mo reinvested.”
- **Money out:** Monthly plans $5,500 + Your Number $1,639 = **$7,139**. Read-only here; link **Change in Plans**.
- Simple visual: two horizontal **blue** bars (in vs out), scaled to paycheck money in — not a chart-library dashboard.
- **Difference** big and bold: **$2,361 ahead** each month (unchanged under reinvest default). Gray line: extra goes to long-term savings through the suggested move on Accounts.
- **Household setting:** “Count investment income every month” toggle **off** by default. Gray hint: “Turn on if you live on it today, e.g. in retirement.”

**MCP:** `get_cash_flow` → `money_in` by person, `investment_income {monthly_avg_12m, sources[], counted}`, `money_out` = monthly_plans + your_number, `difference`.

### 3A.3 — Who needs to work? (on Cash flow)

One-income and neither **automatically count** $410/mo investment income (gray note: “Counts $410/mo of investment income.”). Both-work leaves it reinvested. Never-run-out = monthly cost − investment income — **do not** also apply a separate 4% yield (would double-count).

| Scenario | Delta | Countdown | Never run out |
|---|---|---|---|
| Both | **$2,361 ahead** | — | Reinvested; not counted |
| Only Dana | **$729 short** (7,139 − 6,000 − 410) | ~**6 years 10 months** (60,000 ÷ 729 ≈ 82.3 mo) | ~**$6,729**/mo (cost − investment income) |
| Only Sam | **$3,229 short** (7,139 − 3,500 − 410) | ~**1 year 7 months** (60,000 ÷ 3,229 ≈ 18.6 mo) | ~**$6,729**/mo |
| Neither | **$6,729 short** (7,139 − 410) | ~**9 months** (60,000 ÷ 6,729 ≈ 8.9 mo) | Then retirement today + bear/base/bull at availability |

**MCP:** `get_work_scenarios` (Cash flow; `"tab": "cash_flow"`; notes that it counts investment income).

**UI note:** “Neither works” may show the retirement forecast at availability. Whether to **fold** gap years until availability into the runway is **OQ-3A-neither** (Product recommends yes; Brian not confirmed) — call that out in the PRD only, not as a UI badge.

### Accounts — earned this year (linked)

On Savings and Long-term savings rows:
- Savings: **Earned this year: $1,528 interest (4.0%)**
- Long-term: **Earned this year: $3,392 dividends and interest**, plus separate **+$2,080 market change**
- $1,528 + $3,392 = **$4,920** ≈ $410/mo × 12

---

## Formulas (shared `lib/`)

```
monthly_cost             = monthly_plans + your_number
checking_target          = 2 * monthly_cost
savings_target           = sum(dated dues in next 24 months)   # decided
investment_income_mo     = avg(interest+dividends last 12 months) / 12   # Parks: 410
difference (both, default) = take_home_total - monthly_cost   # reinvested income excluded
gap (one-income/neither) = monthly_cost - take_home_remaining - investment_income_mo
months_covered(gap)      = long_term_balance / gap
income_never_run_out     = monthly_cost - investment_income_mo   # no separate 4% double-count
```

---

## Design rules

- Plain language. Never “waterfall” in the UI.
- Kind labels: gray text; no emoji; no pill.
- Bars: blue only. Shortfalls: gray. Gains: not green.
- Amounts: big and bold.
- Tabs: **Accounts | Plans | Cash flow**.
- Fictional Parks only — never Brian’s real finances.

---

## Open questions

| ID | Question | Recommendation |
|---|---|---|
| **OQ-3A-neither** | Fold retirement forecast / gap years into “Neither works” runway? | Product: yes. Brian: unconfirmed. |
| **OQ-3A-ria** | RIA vs partner for investment advice | Product to scope |
| **OQ-3A-income** | Attribute Plaid paychecks per person | Prefer merchant + owner; manual override |
| **OQ-3A-return** | Never-run-out basis | **Closed:** monthly cost − investment income (no separate 4% in v1) |

**Closed:** three tabs; Who needs to work on Cash flow; dated dues; one-income countdown + never-run-out; target yields; Total balance label; investment income reinvest-by-default; counted in work scenarios; household toggle; 12-month average.

---

## Mockups

| File | Tab |
|---|---|
| `accounts-v2/mockups/accounts-phone.html` | Accounts |
| `accounts-v2/mockups/accounts-desktop.html` | Accounts |
| `accounts-v2/mockups/cashflow-phone.html` | Cash flow |
| `accounts-v2/mockups/cashflow-desktop.html` | Cash flow |
| `accounts-v2/mockups/mcp-tools-spec.html` | MCP: get_accounts, move_money, get_cash_flow, get_work_scenarios |
| `accounts-v2/screenshots/*.png` | PNGs |
